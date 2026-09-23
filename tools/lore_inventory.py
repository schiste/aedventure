#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
LORE = ROOT / 'lore'
OUT = LORE / 'pages-to-create.md'
pattern = re.compile(r"\]\(([^)#]+\.md)\)")
missing = {}

for page in sorted(LORE.rglob('*.md')):
    if page == OUT or '.vitepress' in page.parts:
        continue
    for href in pattern.findall(page.read_text(encoding='utf-8', errors='replace')):
        target = (page.parent / href).resolve()
        if target.is_relative_to(LORE) and not target.exists():
            missing.setdefault(target.relative_to(LORE).as_posix(), set()).add(
                page.relative_to(LORE).as_posix()
            )

lines = [
    '# Pages to Create',
    '',
    '> Generated from internal Markdown links. Red links remain intentional until authored.',
    '',
    f'**Open pages: {len(missing)}**',
    '',
]
for section in sorted({item.split('/')[0] for item in missing}):
    lines += [f'## {section}', '']
    for rel in sorted(item for item in missing if item.split('/')[0] == section):
        lines += [f'- [ ] [{rel}]({rel})']
        lines += [f'  Referenced by: `{ref}`' for ref in sorted(missing[rel])]
        lines += ['']

OUT.write_text('\n'.join(lines).rstrip() + '\n', encoding='utf-8')
print(f'Generated {len(missing)} missing pages')
