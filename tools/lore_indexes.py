#!/usr/bin/env python3
"""Generate navigable Markdown indexes for every lore directory.

README.md remains the editorial overview. VitePress-facing index.md files are
maintained automatically, and existing generated blocks are replaced only
between their markers.
"""
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
LORE = ROOT / "lore"
START = "<!-- lore:index:start -->"
END = "<!-- lore:index:end -->"


def title_for(path: Path) -> str:
    if path == LORE:
        return "Aedventure Lore"
    return path.name.replace("_", " ").replace("-", " ").title()


def generated_block(directory: Path, include_overview: bool) -> str:
    pages = sorted(
        p for p in directory.glob("*.md")
        if p.name.lower() not in {"readme.md", "index.md"}
    )
    children = sorted(p for p in directory.iterdir() if p.is_dir() and p.name != ".vitepress")

    lines = [START, "", "## In this section", ""]
    if include_overview and (directory / "README.md").exists():
        lines += ["[Editorial overview](README.md)", ""]

    if pages:
        for page in pages:
            label = page.stem.replace("_", " ").replace("-", " ").title()
            lines.append(f"- [{label}]({page.name})")
    else:
        lines.append("- No direct pages yet.")

    if children:
        lines += ["", "### Subsections", ""]
        for child in children:
            label = child.name.replace("_", " ").replace("-", " ").title()
            lines.append(f"- [{label}]({child.name}/)")

    lines += [
        "",
        f"_Generated from the lore tree: {len(pages)} page(s), {len(children)} subsection(s)._",
        END,
    ]
    return "\n".join(lines)


def update_index(index: Path, directory: Path, include_overview: bool) -> bool:
    existing = index.read_text(encoding="utf-8") if index.exists() else ""
    block = generated_block(directory, include_overview)
    pattern = re.compile(re.escape(START) + r".*?" + re.escape(END), re.DOTALL)

    if existing:
        if pattern.search(existing):
            updated = pattern.sub(block, existing)
        else:
            updated = existing.rstrip() + "\n\n" + block + "\n"
    else:
        updated = f"# {title_for(directory)}\n\n{block}\n"

    if updated == existing:
        return False
    index.write_text(updated, encoding="utf-8")
    return True


def main() -> int:
    changed = 0
    created = 0
    directories = [LORE] + sorted(
        p for p in LORE.rglob("*") if p.is_dir() and ".vitepress" not in p.parts
    )

    for directory in directories:
        vitepress_index = directory / "index.md"
        if not vitepress_index.exists():
            created += 1
        if update_index(vitepress_index, directory, include_overview=True):
            changed += 1

        editorial_index = directory / "README.md"
        if editorial_index.exists() and update_index(editorial_index, directory, include_overview=False):
            changed += 1

    print(f"Updated {changed} lore indexes; created {created} missing VitePress indexes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
