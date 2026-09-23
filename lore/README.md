# Lore Wiki

> Canonical lore for Aedventure. This directory is a linked wiki of focused Markdown subjects, not a public player manual.

Lore is one of the game's three bricks. It owns what is true in the world and
owns nothing that runs: no balance numbers, no IDs the engine resolves, no
conditions and no effects. Authored content cites lore; lore never cites
content: the link lives in `packages/add-runtime-client/src/content/lore-refs.ts` and
is verified by `npm run lore:refs:check`, which also lists the lore subjects
the game cannot yet show. See the
[three-brick contract](../docs/lore-engine-content-bricks.md) for the
boundary and its verification commands.

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

<!-- lore:index:start -->

## In this section

- [404](404.md)
- [Canon Decision Matrix](CANON_DECISION_MATRIX.md)
- [Lore Revision V2](LORE_REVISION_v2.md)
- [Lore Todo](Lore_todo.md)
- [Structured Data](STRUCTURED_DATA.md)
- [Work Pages](WORK_PAGES.md)
- [Contradictions](contradictions.md)
- [Entities](entities.md)
- [Map](map.md)
- [Naming Conventions](naming_conventions.md)
- [Pages To Create](pages-to-create.md)
- [Progress Report](progress_report.md)
- [Reference Bible](reference_bible.md)
- [Relations](relations.md)
- [The Truth.Canon Draft](the-truth.canon-draft.md)
- [The Truth](the-truth.md)
- [Thesaurus](thesaurus.md)
- [Timeline Interactive](timeline-interactive.md)
- [Timeline](timeline.md)
- [Timeline Events](timeline_events.md)
- [Timeline Quiet Centuries](timeline_quiet_centuries.md)
- [Timeline Quiet Centuries 1 25](timeline_quiet_centuries_1-25.md)
- [Timeline Quiet Centuries 151 225](timeline_quiet_centuries_151-225.md)
- [Timeline Quiet Centuries 226 300](timeline_quiet_centuries_226-300.md)
- [Timeline Quiet Centuries 26 75](timeline_quiet_centuries_26-75.md)
- [Timeline Quiet Centuries 76 150](timeline_quiet_centuries_76-150.md)
- [Tone Guide](tone_guide.md)

### Subsections

- [Characters](characters/)
- [Creatures](creatures/)
- [Data](data/)
- [Factions](factions/)
- [Locations](locations/)
- [Schemas](schemas/)
- [Survival Groups](survival-groups/)
- [Worldbuilding](worldbuilding/)

_Generated from the lore tree: 27 page(s), 8 subsection(s)._
<!-- lore:index:end -->
