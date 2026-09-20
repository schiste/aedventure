# ADD Content Authoring and Codegen

> Scope note: this document covers the live ADD game content lane. The
> office/platform lane and `legacy/add/` are outside this workflow.

This is the authoring map for adding or changing a game content item. TypeScript
is the authored source; Rust remains the authority for gameplay mutation and
save behavior. An author should be able to finish the content contract before
opening `apps/add-rpg`.

## Where does this change belong?

| Change | Authoritative layer | First verification |
| --- | --- | --- |
| A resource, role, station, action, objective, story beat, tile, structure, creature, item, perk, or balance value | `packages/add-content/src/content/` | `npm run content:check` |
| An encounter or loot table used to seed a domain-side dungeon/map result | `packages/add-content/src/content/` | `npm run content:check` and `npm run content:tools:test` |
| A rule, effect implementation, save field, migration, or state transition | `crates/add-core/` | `cargo test -p add-core` |
| A snapshot projection or player-facing explanation | `packages/add-presentation/src/adapters/` | `npm run agent:verify:add-ui` |
| Browser controls or presentation | `apps/add-rpg/` | `npm run agent:verify:add-ui` |

Do not duplicate Rust rules in a content module or UI. If an authored field
cannot be represented by the existing Rust contract, change the Rust/domain
contract first and add a focused test before adding the content item.

## Authoring-to-runtime path

Every row below names the source file, the validator/reference boundary, the
generated Rust catalog when one exists, and the current consumer. The IDs in
the source are the IDs an agent should use in task briefs, scenarios, runtime
inspection, snapshots, and telemetry.

| Content family | TypeScript source | Validation/reference checks | Rust/codegen output | Consumer |
| --- | --- | --- | --- | --- |
| Resources | `packages/add-content/src/content/resources.ts` | IDs, schema IDs, numeric caps, cost/effect references | `crates/add-core/src/game_data/catalog/resources.rs` | `add-core` economy and snapshot catalog |
| Roles | `packages/add-content/src/content/roles.ts` | IDs and role references | `crates/add-core/src/game_data/catalog/roles.rs` | roster and staffing simulation |
| Flags | `packages/add-content/src/content/flags.ts` | IDs and all flag requirements/effects | `crates/add-core/src/game_data/catalog/flags.rs` | story, actions, and save state |
| Flora, structures, and map tiles | `packages/add-content/src/content/{flora,structures,tiles}.ts` | tile flora/structure, dungeon, and area references | `crates/add-core/src/game_data/catalog/tiles.rs` | map generation and presentation |
| Stations | `packages/add-content/src/content/stations.ts` | requirements and station IDs | `crates/add-core/src/game_data/catalog/stations.rs` | power, production, and UI catalog |
| Construction options and world actions | `packages/add-content/src/content/{construction,world-actions}.ts` | costs, duration, requirements, effects, impossible-action checks | `crates/add-core/src/game_data/catalog/actions.rs` | authoritative command execution |
| Processing recipes | `packages/add-content/src/content/processing.ts` | station, costs, tracks, requirements, and effects | `crates/add-core/src/game_data/catalog/actions.rs` | authoritative processing execution |
| Story arcs, beats, and choices | `packages/add-content/src/content/story/` | choice IDs, conditions, effects, graph reachability, progression actions | `crates/add-core/src/game_data/catalog/story_beats.rs` | Rust storylet selection and narrative snapshot |
| Objectives | `packages/add-content/src/content/objectives.ts` | sequence uniqueness, conditions, effects, and references | `crates/add-core/src/game_data/catalog/objectives.rs` | Rust objective progression |
| UI/entity metadata | `packages/add-content/src/content/{ui-elements,entity-schemas}.ts` | related IDs, visibility, flow, and schema ownership | `crates/add-core/src/game_data/catalog/{ui_elements,entity_schemas}.rs` | domain explanations and runtime catalog |
| Items, perks, and creatures | `packages/add-content/src/content/{items,perks,creatures}.ts` | IDs, perk prerequisites, item effects, numeric combat values | `crates/add-core/src/game_data/catalog/{items,perks,creatures}.rs` | inventory, combat, and progression |
| Encounter tables | `packages/add-content/src/content/encounter-tables.ts` | creature IDs, positive weights, quantity ranges | Client/domain only; no Rust codegen | deterministic dungeon spawn selection |
| Loot tables | `packages/add-content/src/content/loot-tables.ts` | item IDs, positive weights, quantity ranges | Client/domain only; no Rust codegen | deterministic loot selection before typed Rust mutation |
| Dungeon and area registry | `packages/add-runtime-client/src/{dungeons,areas}/` | IDs and map routing references | Client/domain only; map factories remain authored code | map modes and Phaser presentation |
| Content/save version | `packages/add-content/src/content/content-version.ts` | generated version and Rust migration coupling | `crates/add-core/src/game_data/catalog/version.rs` | `GameState` schema/catalog compatibility |

Expedition targets, resonance recipes, and their current Rust-only catalog
entries remain in `crates/add-core/src/game_data/catalog/`; they are not silently
re-authored in the TypeScript lane. If that boundary changes, update this table
and the capability map together.

## Add one content item

1. Choose the owning family in the table and keep the ID stable and semantic.
2. Search the ID with `npm run content:graph -- --reverse <id>` before editing.
   This shows all existing users and prevents accidental orphaning.
3. Add every required cross-family reference in the TypeScript source. The
   validator reports duplicate IDs, missing references, invalid effects,
   impossible flag requirements, and unreachable story beats.
4. Run `npm run content:check`. It builds the domain, runs validator and graph
   regression tests, checks the save/catalog version contract, rejects generated
   Rust drift, and checks the committed fixtures.
5. Use `npm run content:explain -- <id>` and
   `npm run content:explain -- <id> --json` to inspect the authored item,
   its generated Rust path, references, reverse dependants, resource
   producers/consumers/caps, and next checks.
   Use `npm run content:explain -- --reverse <id> --json` when only the
   "what uses this ID?" view is needed.
6. Only then update adapters or `apps/add-rpg` if the new item needs a player
   presentation. Add a scenario or snapshot when the item changes gameplay.

The focused inspection commands are deterministic and do not boot the browser:

```sh
npm run content:validate
npm run content:graph
npm run content:graph -- --reverse resource.stone
npm run content:explain -- objective.restore_studio
npm run content:explain -- tile.base_core --json
npm run content:timeline -- --format json
npm run content:fixtures
npm run content:fixtures:check
```

## Fixtures and ID identity

`npm run content:fixtures` generates the checked-in authoring fixtures in
`scenarios/add/fixtures/content/`:

- `small-base.json` — resources, stations, base projects, flags, and base tile;
- `crew-roster.json` — role IDs and the starter roster shape;
- `map.json` — tile IDs, deterministic coordinates, flora/structure links, and
  dungeon/area landmarks;
- `story-state.json` — entry/active beat, reachable beat IDs, and story gates.

Fixtures are derived from the same registry as the graph and are checked by
`npm run content:check`; they are authoring/inspection fixtures, not a second
gameplay rules engine. Gameplay saves remain under
`scenarios/add/fixtures/saves/` and are consumed by the Rust scenario runner.

The registry exposes each ID with its authored source, generated Rust path (or
explicit client-only status), and dependency edges. The same stable IDs are
therefore available to authored TypeScript, generated Rust catalogs, scenario
snapshots, runtime inspection, and telemetry without scraping UI labels.

## Version contract

`content-version.ts` contains three independent meanings:

- `contentSchemaVersion` — the shape of the authoring contract;
- `catalogVersion` — the save-facing identity of content definitions;
- `saveSchemaVersion` — the serialized `GameState` shape expected by Rust.

When an authored change affects the meaning of persisted content, bump
`catalogVersion` and document the compatibility decision. When the serialized
save shape changes, update `saveSchemaVersion` together with the Rust migration
and round-trip test. `content:check` rejects a generated version file or Rust
migration that disagrees with the authored contract.
