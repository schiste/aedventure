#!/usr/bin/env python3
"""Render small, explicit transclusion blocks in lore Markdown.

Syntax:

    <!-- lore:include data/canon.json#present -->

The renderer replaces the marker with a generated block. It is intentionally
not a general template language: prose remains in Markdown and shared facts
live once in JSON.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LORE = ROOT / "lore"
MARKER = re.compile(
    r"<!-- lore:include (?P<path>[^# ]+)#(?P<key>[A-Za-z0-9_.-]+) -->"
    r"\n<!-- lore:generated -->.*?<!-- lore:end -->",
    re.S,
)


def value_at(data: dict, key: str):
    value = data
    for part in key.split("."):
        value = value[part]
    return value


def render_page(page: Path, write: bool) -> bool:
    original = page.read_text(encoding="utf-8")
    changed = False

    def replace(match: re.Match[str]) -> str:
        nonlocal changed
        source = (page.parent / match.group("path")).resolve()
        data = json.loads(source.read_text(encoding="utf-8"))
        value = value_at(data, match.group("key"))
        rendered = json.dumps(value, ensure_ascii=False, indent=2)
        changed = True
        return (
            f"<!-- lore:include {match.group('path')}#{match.group('key')} -->\n"
            "<!-- lore:generated -->\n"
            f"```json\n{rendered}\n```\n"
            "<!-- lore:end -->"
        )

    result = MARKER.sub(replace, original)
    if changed and write:
        page.write_text(result, encoding="utf-8")
    return changed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    pages = [p for p in LORE.rglob("*.md") if p.name != "pages-to-create.md"]
    count = sum(render_page(page, args.write) for page in pages)
    action = "rendered" if args.write else "found"
    print(f"Transclusion blocks {action}: {count}")
    return 0


if __name__ == "__main__":
    main()
