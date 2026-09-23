#!/usr/bin/env python3
"""Prepare a lossless, navigable Quartz tree from the canonical lore tree.

The canonical Markdown and JSON stay under ``lore/``.  This script only writes
``lore-quartz/content`` and may merge a README into its sibling index there so
Quartz does not expose two pages for one directory.
"""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "lore"
DEST = ROOT / "lore-quartz" / "content"
DATA = SOURCE / "data"
ENTITY = re.compile(r'<EntityCard\s+id="([^"]+)"\s*/>')


def load(name: str, key: str) -> list[dict]:
    path = DATA / name
    if not path.exists():
        return []
    value = json.loads(path.read_text(encoding="utf-8")).get(key, [])
    return value if isinstance(value, list) else []


def heading(text: str, fallback: str) -> str:
    return next(
        (line[2:].strip() for line in text.splitlines() if line.startswith("# ")),
        fallback.replace("_", " ").replace("-", " ").title(),
    )


def metadata(relative: Path, text: str, entities: list[dict]) -> str:
    """Add Quartz-only metadata without changing canonical Markdown."""
    if text.startswith("---\n"):
        return text
    entity = next((item for item in entities if item.get("page") == relative.as_posix()), None)
    tags = ["lore"]
    if relative.parts:
        section = relative.parts[0] if len(relative.parts) > 1 else relative.stem
        tags.append(section.replace("_", "-"))
    if entity:
        tags.extend(
            [
                f"status/{entity.get('status', 'unknown')}",
                f"type/{entity.get('type', 'unknown')}",
            ]
        )
    lines = ["---", f"title: {json.dumps(heading(text, relative.stem), ensure_ascii=False)}", "tags:"]
    lines.extend(f"  - {tag}" for tag in dict.fromkeys(tags))
    if entity:
        lines.extend(
            [
                f"status: {entity.get('status', 'unknown')}",
                f"entity-type: {entity.get('type', 'unknown')}",
                f"entity-id: {entity.get('id', '')}",
            ]
        )
    return "\n".join(lines + ["---", "", text.lstrip()])


def normalize_quartz_links(relative: Path, text: str, sources: dict[Path, Path]) -> str:
    """Rewrite existing Markdown targets to canonical Quartz paths."""
    pattern = re.compile(r"(\]\()([^)#]+)(#[^)]+)?(\))")

    def replace(match: re.Match[str]) -> str:
        target = match.group(2)
        anchor = match.group(3) or ""
        if target.startswith(("http://", "https://", "mailto:", "data:", "/")):
            return match.group(0)
        if not target.endswith(".md") and not target.endswith("/"):
            return match.group(0)
        candidate = (SOURCE / relative.parent / target).resolve()
        try:
            resolved = candidate.relative_to(SOURCE)
        except ValueError:
            return match.group(0)
        if resolved.is_dir():
            resolved = resolved / "index.md"
        if resolved.name == "README.md" and resolved.parent / "index.md" in sources:
            resolved = resolved.parent / "index.md"
        if resolved not in sources:
            return match.group(0)
        return f"]({resolved.as_posix()}{anchor})"

    return pattern.sub(replace, text)


def entity_card(entity_id: str, entities: list[dict]) -> str:
    entity = next((item for item in entities if item.get("id") == entity_id), None)
    if not entity:
        return f"> **Unknown entity:** `{entity_id}`"
    return "\n".join(
        [
            "::: { .lore-card }",
            f"**{entity.get('name', entity_id)}**  ",
            f"Status: `{entity.get('status', 'unknown')}`  ",
            f"Type: `{entity.get('type', 'unknown')}`  ",
            f"Origin: `{entity.get('origin_location', 'unknown')}`  ",
            f"Initial population: `{entity.get('initial_population', 'unknown')}`",
            ":::",
        ]
    )


def timeline(events: list[dict]) -> str:
    rows = ["| Event | Date | AS | Status |", "|---|---|---:|---|"]

    def sort_key(item: dict) -> float:
        value = item.get("as")
        return float(value) if isinstance(value, (int, float)) else 9999.0

    for event in sorted(events, key=sort_key):
        rows.append(
            f"| {event.get('name', event.get('id'))} | {event.get('ce', '') or 'unknown'} | "
            f"{event.get('as', '') if event.get('as') is not None else 'unknown'} | `{event.get('status', 'unknown')}` |"
        )
    return "\n".join(rows)


def claims(items: list[dict]) -> str:
    sections = []
    for item in items:
        sections.append(
            "\n".join(
                [
                    f"### `{item.get('id')}`",
                    f"- Subject: `{item.get('subject')}`",
                    f"- Predicate: `{item.get('predicate')}`",
                    f"- Status: `{item.get('status', 'unknown')}`",
                    f"- Object: `{json.dumps(item.get('object'), ensure_ascii=False)}`",
                    f"- Sources: {', '.join(f'`{source}`' for source in item.get('sources', []))}",
                ]
            )
        )
    return "\n\n".join(sections) or "No structured claims available."


def relations(items: list[dict]) -> str:
    rows = ["| Subject | Relation | Object |", "|---|---|---|"]
    for item in items:
        rows.append(
            f"| `{item.get('subject')}` | `{item.get('predicate')}` | `{item.get('object')}` |"
        )
    return "\n".join(rows)


def structured_entity_catalog(entities: list[dict]) -> str:
    rows = [
        "## Structured entities",
        "",
        "These entries are generated from `lore/data/entities.json`. They are not new canon.",
        "",
        "| Name | Type | Status | Page |",
        "|---|---|---|---|",
    ]
    for item in entities:
        page = item.get("page", "")
        rows.append(
            f"| {item.get('name', item.get('id'))} | `{item.get('type', 'unknown')}` | "
            f"`{item.get('status', 'unknown')}` | [{page}]({page}) |"
        )
    return "\n".join(rows)


def render(
    relative: Path,
    text: str,
    entities: list[dict],
    events: list[dict],
    claim_items: list[dict],
    relation_items: list[dict],
) -> str:
    text = ENTITY.sub(lambda match: entity_card(match.group(1), entities), text)
    text = text.replace("<TimelineView />", timeline(events))
    text = text.replace("<ClaimsPanel />", claims(claim_items))
    text = text.replace("<RelationsGraph />", relations(relation_items))
    text = text.replace(
        "<LoreMap />",
        "The map view is derived from the structured locations and relations below. "
        "No external map service is required.\n\n" + relations(relation_items),
    )
    text = re.sub(r"<MermaidDiagram[^>]*/>", "_Diagram represented by the surrounding structured data._", text)

    path = relative.as_posix()
    if path == "entities.md":
        text += "\n\n" + structured_entity_catalog(entities) + "\n"
    elif path == "timeline-interactive.md" and "| Event | Date | AS | Status |" not in text:
        text += "\n\n## Canonical timeline\n\n" + timeline(events) + "\n"
    elif path == "relations.md" and "| Subject | Relation | Object |" not in text:
        text += "\n\n## Structured relations\n\n" + relations(relation_items) + "\n"
    elif path == "contradictions.md" and "### `" not in text:
        text += "\n\n## Structured claims and disagreements\n\n" + claims(claim_items) + "\n"
    text = re.sub(r"\(([^)#]+?)/README\.md\)", r"(\1/)", text)
    text = text.replace("(README.md)", "(./)")
    return text


def without_title(text: str) -> str:
    """Keep README prose while avoiding a duplicate H1 in the merged index."""
    lines = text.splitlines()
    for index, line in enumerate(lines):
        if line.startswith("# "):
            return "\n".join(lines[:index] + lines[index + 1 :]).strip()
    return text.strip()


def main() -> int:
    entities = load("entities.json", "entities")
    events = load("events.json", "events")
    claim_items = load("claims.json", "claims")
    relation_items = load("relations.json", "relations")

    if DEST.exists():
        shutil.rmtree(DEST)
    DEST.mkdir(parents=True)

    sources = {
        source.relative_to(SOURCE): source
        for source in SOURCE.rglob("*.md")
        if ".vitepress" not in source.parts
    }
    merged = 0
    copied = 0
    for relative, source in sorted(sources.items()):
        if relative.name == "README.md" and relative.parent / "index.md" in sources:
            continue
        target = DEST / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        raw = source.read_text(encoding="utf-8", errors="replace")
        if relative.name == "index.md":
            readme = sources.get(relative.parent / "README.md")
            if readme:
                editorial = without_title(readme.read_text(encoding="utf-8", errors="replace"))
                index_body = without_title(raw)
                index_body = index_body.replace("[Editorial overview](README.md)", "")
                raw = "# " + heading(raw, relative.parent.name) + "\n\n" + editorial + "\n\n" + index_body
                merged += 1
        raw = normalize_quartz_links(relative, raw, sources)
        rendered = render(relative, raw, entities, events, claim_items, relation_items)
        target.write_text(metadata(relative, rendered, entities), encoding="utf-8")
        copied += 1

    print(f"Prepared {copied} Markdown files for Quartz ({merged} README files merged into indexes)")
    print(f"Structured records: {len(entities)} entities, {len(events)} events, {len(claim_items)} claims, {len(relation_items)} relations")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
