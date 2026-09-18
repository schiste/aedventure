# Structured lore data

The prose remains in Markdown, but facts that must agree across pages belong in
`lore/data/` and are referenced explicitly from there.

## Current data

- [`data/canon.json`](data/canon.json) contains the calendar anchor, present-day
  candidates, game-start candidate and unresolved conflicts.

The file is intentionally conservative: a conflict is recorded as a conflict,
not silently resolved by whichever page was edited last.

## Transclusion

A Markdown page may include one structured value:

```markdown
<!-- lore:include data/canon.json#present -->
<!-- lore:generated -->
```json
{
  "id": "present-day",
  "as_year": 311,
  "ce_year": 2345,
  "status": "canonical",
  "sources": [
    "timeline.md",
    "LORE_REVISION_v2.md",
    "timeline_quiet_centuries_226-300.md"
  ]
}
```
<!-- lore:end -->
```

Render or check the blocks with:

```sh
python3 tools/lore_render.py --write
python3 tools/lore_check.py
```

The renderer only owns the `generated` block. Prose around it stays human
editable. The checker verifies Markdown links and calendar conversions; it
reports known canon conflicts without pretending they are solved.

## Editorial rule

When a date, population, identity or relationship appears on a second page,
move the shared fact to `lore/data/`, give it an identifier, and transclude it.
If the fact is disputed, add a record to `known_conflicts` first. Never resolve
a conflict merely to make the validator green.
