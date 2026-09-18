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


def main() -> int:
    data = load_data()
    checked, missing = markdown_links()
    errors = year_conversion_checks(data)
    conflicts = data.get("known_conflicts", [])

    print(f"Markdown links checked: {checked}")
    print(f"Broken Markdown links: {len(missing)}")
    for item in missing:
        print(f"  ERROR {item}")
    print(f"Structured conflicts recorded: {len(conflicts)}")
    for conflict in conflicts:
        print(f"  CONFLICT {conflict['id']}: {conflict['question']}")
    for error in errors:
        print(f"  ERROR {error}")

    # Conflicts are expected and visible. Broken links and malformed data fail.
    return 1 if missing or errors else 0


if __name__ == "__main__":
    sys.exit(main())
