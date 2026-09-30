#!/usr/bin/env python3
"""Validate the ADD lore graph and the structured canon data.

This is deliberately dependency-free. It reports conflicts; it never silently
rewrites canon. Markdown transclusion is handled by lore_render.py.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LORE = ROOT / "lore"
DATA = LORE / "data" / "canon.json"


def load_data() -> dict:
    return json.loads(DATA.read_text(encoding="utf-8"))


def markdown_links() -> tuple[int, list[str]]:
    checked = 0
    missing: list[str] = []
    pattern = re.compile(r"\]\(([^)]+)\)")
    inventory_text = (LORE / "pages-to-create.md").read_text(encoding="utf-8")
    inventory = set(re.findall(r"\]\(([^)]+\.md)\)", inventory_text))
    for page in LORE.rglob("*.md"):
        if page.name == "pages-to-create.md":
            continue
        text = page.read_text(encoding="utf-8", errors="replace")

        for raw in pattern.findall(text):
            href = raw.split("#", 1)[0].strip("<>")
            if not href or "://" in href or not href.endswith(".md"):
                continue
            checked += 1
            target = (page.parent / href).resolve()
            if not target.exists():
                target_rel = str(target.relative_to(LORE)) if target.is_relative_to(LORE) else ""
                if target_rel not in inventory:
                    missing.append(f"{page.relative_to(ROOT)} -> {href}")
    return checked, missing


def year_conversion_checks(data: dict) -> list[str]:
    errors: list[str] = []
    calendar = data["calendar"]
    base = calendar["year_one_ce"] - 1
    for name in ("present", "game_start"):
        item = data[name]
        expected = base + item["as_year"]
        if item.get("ce_year") != expected:
            errors.append(
                f"{name}: {item.get('as_year')} AS should map to {expected} CE, "
                f"not {item.get('ce_year')} CE"
            )
    return errors


STRUCTURED_FILES = (
    LORE / "data" / "calendar.json",
    LORE / "data" / "sources.json",
    LORE / "data" / "entities" / "survival_groups.json",
    LORE / "data" / "events.json",
    LORE / "data" / "claims.json",
    LORE / "data" / "relations.json",
)


def structured_checks() -> tuple[int, list[str]]:
    errors: list[str] = []
    ids: set[str] = set()
    source_ids: set[str] = set()
    records = 0
    loaded: dict[Path, dict] = {}
    for path in STRUCTURED_FILES:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            loaded[path] = data
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"{path.relative_to(ROOT)}: invalid JSON ({exc})")
    sources_path = LORE / "data" / "sources.json"
    for source in loaded.get(sources_path, {}).get("sources", []):
        if source.get("id"):
            source_ids.add(source["id"])
        source_page = source.get("path")
        if source_page and not (LORE / source_page).exists():
            errors.append(f"missing source page: {source_page}")
    groups_path = LORE / "data" / "entities" / "survival_groups.json"
    events_path = LORE / "data" / "events.json"
    claims_path = LORE / "data" / "claims.json"
    event_ids = {
        event["id"]
        for event in loaded.get(events_path, {}).get("events", [])
        if isinstance(event, dict) and event.get("id")
    }
    claim_ids = {
        claim["id"]
        for claim in loaded.get(claims_path, {}).get("claims", [])
        if isinstance(claim, dict) and claim.get("id")
    }
    for group in loaded.get(groups_path, {}).get("groups", []):
        page = group.get("page")
        if page and not (LORE / page).exists():
            errors.append(f"missing survival-group page: {page}")
        origin_period = group.get("origin_period", {})
        event_refs = []
        if isinstance(origin_period, dict):
            event_refs.extend((origin_period.get("start"), origin_period.get("end")))
        founding_events = group.get("founding_events", [])
        if isinstance(founding_events, list):
            event_refs.extend(founding_events)
        for event_ref in event_refs:
            if event_ref is not None and (
                not isinstance(event_ref, str) or event_ref not in event_ids
            ):
                errors.append(
                    f"unknown event reference in {group.get('id', 'survival group')}: {event_ref}"
                )
        observations = group.get("observations", [])
        if isinstance(observations, list):
            for claim_ref in observations:
                if claim_ref is not None and (
                    not isinstance(claim_ref, str) or claim_ref not in claim_ids
                ):
                    errors.append(
                        f"unknown claim reference in {group.get('id', 'survival group')}: {claim_ref}"
                    )
    for path, data in loaded.items():
        collections = [value for value in data.values() if isinstance(value, list)]
        for collection in collections:
            for record in collection:
                records += 1
                record_id = record.get("id") if isinstance(record, dict) else None
                if record_id:
                    if record_id in ids:
                        errors.append(f"duplicate structured id: {record_id}")
                    ids.add(record_id)
                if isinstance(record, dict):
                    for source in record.get("sources", []):
                        if not isinstance(source, str):
                            errors.append(f"{path.relative_to(ROOT)}: non-string source reference")
                        elif source not in source_ids:
                            errors.append(f"unknown source reference: {source}")
    return records, errors


def main() -> int:
    data = load_data()
    checked, missing = markdown_links()
    errors = year_conversion_checks(data)
    structured_records, structured_errors = structured_checks()
    errors.extend(structured_errors)
    conflicts = data.get("known_conflicts", [])

    print(f"Markdown links checked: {checked}")
    print(f"Broken Markdown links: {len(missing)}")
    for item in missing:
        print(f"  ERROR {item}")
    print(f"Structured records checked: {structured_records}")
    print(f"Structured conflicts recorded: {len(conflicts)}")
    for conflict in conflicts:
        print(f"  CONFLICT {conflict['id']}: {conflict['question']}")
    for error in errors:
        print(f"  ERROR {error}")

    # Conflicts are expected and visible. Broken links and malformed data fail.
    return 1 if missing or errors else 0


if __name__ == "__main__":
    sys.exit(main())
