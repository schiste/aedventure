# Lore Wiki

> Canonical lore for Aedventure. This directory is a linked wiki of focused Markdown subjects, not a public player manual.

Lore is one of the game's three bricks. It owns what is true in the world and
owns nothing that runs: no balance numbers, no IDs the engine resolves, no
conditions and no effects. Authored content cites lore; lore never cites
content. See the [three-brick contract](../docs/lore-engine-content-bricks.md)
for the boundary and its verification commands.

## Navigation

- [The Truth](the-truth.md) : Internal canon and hidden causal structure.
- [Timeline](timeline.md) : Chronology from 2026 to Year 311 AS.
- [Thesaurus](thesaurus.md) : Canonical terminology and cross-domain vocabulary.
- [Characters](characters/README.md) : People, lineages, roles and character systems.
- [Factions](factions/README.md) : Political, religious and survival communities.
- [Locations](locations/README.md) : Places, regions and settlement geography.
- [Creatures](creatures/README.md) : Fauna, threats and exceptional beings.
- [Worldbuilding](worldbuilding/README.md) : Cultural artifacts, media, science and relics.
- [Reference Bible](reference_bible.md) : Influences and tone touchstones.
- [Tone Guide](tone_guide.md) : Writing and design principles.
- [Pages to Create](pages-to-create.md)
- [Lore Backlog](Lore_todo.md) : Open questions and planned expansions.

## Canon Status

- `Canon` means established world truth.
- `Internal` means true in the authoring model but not directly exposed to players.
- `Draft` means usable but still open to revision.
- `Open Question` means deliberately unresolved.
- Contradictions must remain visible until explicitly resolved.

## Shared canon data

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

See [Structured Data](STRUCTURED_DATA.md) for the authoring rules.