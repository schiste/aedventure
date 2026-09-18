# ADD Repository Capability Map

Status: checked-in operational map for the live ADD game.

> Scope note: this map is for the ADD lane. The office/platform lane has its
> own scope and verification contracts; it is not an alternate implementation
> of the ADD game.

This is the shortest route from a player outcome to the owning layer, content
family, runtime state, and first verification command. Update it when a new
command, content family, runtime boundary, smoke flow, or known gap appears.
Run `npm run docs:check` after changing this map or the routing documents.

## First route: where does this change belong?

| Change or player outcome | Authoritative layer | Start here | First focused verification |
| --- | --- | --- | --- |
| A gameplay rule, resource transition, timer, combat result, or save field | Rust simulation | `crates/add-core/src/` | `cargo test -p add-core` |
| A new story beat, objective, role, recipe, station, item, creature, perk, or balance value | Authored ADD content | `packages/add-domain/src/content/` | `npm run content:check` |
| A content graph, timeline, or content-ID investigation | Content inspection tools | `scripts/add-content-tools.cjs` | `npm run content:validate` |
| Snapshot explanation, available-action projection, command mapping, or UI copy | ADD domain adapters | `packages/add-domain/src/adapters/` | `npm run agent:verify:add-ui` |
| Player-facing panels, input dispatch, map presentation, save plumbing, or browser lifecycle | Live ADD app | `apps/add-rpg/src/` | `npm run agent:verify:add-ui` |
| Neutral square/hex topology, world, input, protocol, or renderer behavior | Shared engine | `packages/game-*` and `apps/engine-sandbox/` | `npm run agent:verify:types` then the relevant engine smoke |
| Office auth, rooms, media, tenant maps, or server policy | Office/platform lane | `apps/web/`, `apps/api/`, `apps/world-server/`, `apps/media-gateway/` | `npm run smoke:office` |
| Historical ADD or SkyOffice comparison | Legacy reference | `legacy/add/` or `legacy/skyoffice-original/` | `npm run check:legacy` when SkyOffice is involved |

Gameplay authority does not move into the browser because a UI change is
easier to make there. The browser sends typed commands and renders snapshots;
the Rust runtime owns mutation and deterministic outcomes.

## Commands and first evidence

| Capability | Command | What it proves |
| --- | --- | --- |
| Documentation contract | `npm run docs:check` | Required maps, task brief fields, routing sections, commands, and office scope notes exist |
| ADD content/code generation | `npm run content:check` | Authored content builds, validates, and matches generated Rust catalog output |
| Content graph and IDs | `npm run content:graph` | Story/content dependencies are inspectable as stable text |
| Story timeline | `npm run content:timeline` | Story arcs and sequence gates are inspectable |
| One content ID | `npm run content:explain -- <id>` | A content ID can be traced to its authored definition and dependencies |
| Rust rules/state | `cargo test -p add-core` | Simulation rules, save behavior, and deterministic calculations pass core tests |
| ADD type/content/WASM boundary | `npm run agent:verify:add-ui` | Diff checks, content generation, WASM build, ADD types, and smoke syntax pass |
| Built ADD browser flow | `npm run smoke:add-rpg:built` | The already-built ADD app passes browser/player-flow assertions |
| Build-and-smoke ADD flow | `npm run smoke:add-rpg` | ADD browser build and Playwright flow both run |
| Shared package types | `npm run agent:verify:types` | Root TypeScript project references compile after neutral-package changes |
| Neutral renderer/topology fixture | `npm run smoke:engine-sandbox` | Square and hex engine paths work without office or ADD domain imports |
| Office app flow | `npm run smoke:office` | The separate customer virtual-office lane passes its browser flow |
| Full target gate | `npm run agent:verify:gate` | The expensive cross-app, renderer, infrastructure, and smoke gate passes |

Use the cheapest command that exercises the changed authority first. Run the
full gate at phase boundaries, before publication, or after broad shared-engine
changes.

## Content families

| Family | Authored source | Runtime authority or consumer | Current status |
| --- | --- | --- | --- |
| Resources, roles, stations, construction, processing, balance | `packages/add-domain/src/content/{resources,roles,stations,construction,processing,balance}.ts` | Generated catalog plus `crates/add-core` simulation | Implemented for the current idle/base slice |
| Story arcs, choices, flags, objectives, world actions | `packages/add-domain/src/content/{story,flags,objectives,world-actions}.ts` | Generated catalog plus Rust narrative/objective state | Implemented for the current onboarding and base arc |
| Terrain, tiles, flora, structures, entity schemas, UI elements | `packages/add-domain/src/content/{tiles,flora,structures,entity-schemas,ui-elements}.ts` | Generated catalog plus map/domain projections | Implemented for current overworld and presentation contracts |
| Expedition targets and resonance recipes | `crates/add-core/src/game_data/catalog/{expeditions,resonance}.rs` | `crates/add-core` expedition/resonance state and progression | Implemented for the current expedition/resonance slice; these are currently Rust-authored catalog entries |
| Creatures, items, and perks | `packages/add-domain/src/content/{creatures,items,perks}.ts` | Rust combat, inventory, and perk state; domain selectors explain it | Implemented for the current combat/inventory slice |
| Encounter and loot tables | `packages/add-domain/src/content/{encounter-tables,loot-tables}.ts` | Domain selectors resolve a deterministic location result; Rust receives the typed result and applies mutation | Intentionally split; selection is not a second Rust rules engine |
| Dungeon and area definitions | `packages/add-domain/src/{dungeons,areas}/` | ADD map modes, dungeon objectives, and Phaser presentation | Current entry/objective foundation implemented; broader dungeon breadth remains |

When adding a content ID, keep the authored ID stable, run the content check,
and update the parity audit if its runtime status changes.

## Runtime state

The authoritative serialized model is `GameState` in
`crates/add-core/src/state.rs`. The browser-facing counterpart is
`SimulationSnapshot` in `packages/add-domain/src/runtime/protocol.ts`.

| State family | Main fields | Authority |
| --- | --- | --- |
| Time and economy | `clockSeconds`, `resources`, caps, generated/spent totals | Rust simulation |
| People and progression | `roster`, `heroProgress`, `heroSurvival`, `recruitment` | Rust simulation |
| Narrative and objectives | `narrative`, `objectives`, `notes`, transient `events` | Rust simulation; authored definitions come from content |
| Base and production | `base`, `crystalCircle`, `processing`, `stations`, `power` | Rust simulation |
| World reach | `bubble`, `hexes`, `heroMap`, `discoveredCells` | Rust simulation plus neutral map adapters for presentation |
| Expeditions and resonance | `expeditions`, `resonance` | Rust simulation |
| Dungeon/combat progress | `activeCombat`, `openDoors`, `clearedLocations`, `droppedItems` | Rust simulation; domain resolves map-facing context |
| Hero inventory and perks | `inventory`, `acquiredPerks`, persisted RNG stream | Rust simulation |
| Save compatibility | `schemaVersion`, `catalogVersion`, save import/export and migrations | Rust save layer |

The worker boundary is `apps/add-rpg/src/workers/` plus
`crates/add-web-bindings/`. Domain adapters may derive labels, projections,
and available commands, but must not mutate authoritative gameplay values.

## Smoke flows

`npm run smoke:add-rpg` and `npm run smoke:add-rpg:built` cover the live ADD
player path, including:

- boot/readiness and the `render_game_to_text` contract;
- discovery, map visibility, hero placement, movement, and map-mode changes;
- the first playable path from world discovery to Studio/Base and the Survivor
  Cave dungeon entry surface;
- idle clock progression, base management, production, expeditions, and
  resonance conversion;
- save reload, offline catch-up, reset, return review, mobile layout, stable
  screenshots, and console cleanliness.

`npm run smoke:engine-sandbox` covers neutral square/hex coexistence. The
office smoke and renderer QA belong to the separate office/shared-engine
contracts and must not be mistaken for ADD gameplay coverage.

## Known gaps

These are gaps, not reasons to create a second ADD app:

- full save-slot metadata, content hashes, backup management, and a broader
  migration/slot UX are not complete;
- offline catch-up is still an aggregate model rather than a complete
  event-scheduled replay model for future encounters and complex RNG chains;
- encounter/loot selection is domain-side and supplied to Rust as a typed
  result, so the end-to-end content authority contract needs a deliberate
  future decision before richer procedural encounters;
- the current dungeon layer proves entry, objectives, doors, locations, combat,
  inventory, and return flow, but not the full future dungeon/exploration game;
- a committed headless scenario/replay harness is planned in Phase 1 of the
  [tooling plan](add-game-development-tooling-plan.md);
- larger strategy/RPG systems and neutral engine extraction remain demand-led
  future work, with `apps/add-rpg` staying the first consumer.

The factual implemented-versus-not-yet inventory remains
[ADD Systems Parity Audit](add-systems-parity-audit.md). This map tells an
agent where to start; the parity audit tells it what is actually implemented.
