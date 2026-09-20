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
| A new story beat, objective, role, recipe, station, item, creature, perk, or balance value | Authored ADD content | `packages/add-domain/src/content/` and [content authoring map](add-content-authoring.md) | `npm run content:check` |
| A content graph, reverse lookup, explainer, fixture, or content-ID investigation | Content inspection tools | `scripts/add-content-registry.cjs`, `scripts/add-content-tools.cjs`, `scripts/add-content-fixtures.cjs` | `npm run content:validate` |
| Snapshot explanation, available-action projection, command mapping, or UI copy | ADD domain adapters | `packages/add-domain/src/adapters/` | `npm run agent:verify:add-ui` |
| Agent-readable state, available commands, blocker reasons, or stable report IDs | ADD runtime inspection contract | `packages/add-domain/src/runtime/inspection.ts` and `crates/add-scenario/src/inspection.rs` | `npm --workspace @aedventure/add-domain test` and `cargo test -p add-scenario` |
| Player-facing panels, input dispatch, map presentation, save plumbing, or browser lifecycle | Live ADD app | `apps/add-rpg/src/` | `npm run agent:verify:add-ui` |
| Browser fixture, semantic selector/action ID, screenshot evidence, or renderer-affordance check | ADD player-facing QA contract | `scenarios/add/browser-fixtures.json`, `scripts/add-rpg-phase5.cjs`, and `apps/add-rpg/src/browser/qa-contract.ts` | `npm run qa:add-rpg:phase5:built` |
| A world fact, character history, place, faction, name, or canon status | Lore brick | `lore/` and the [three-brick contract](lore-engine-content-bricks.md) | `npm run lore:check` |
| Narrative standing, acts, knowledge, rumor, sifting, or storylet casting | Rust simulation | `crates/add-core/src/narrative/` and the [narrative plan](add-narrative-system-plan.md) | `cargo test -p add-core` (planned) |
| A narrative entity, act, relationship state, sifting pattern, storylet sidecar, or `.ink` scene | Authored ADD content | `packages/add-domain/src/content/narrative/` and `packages/add-domain/narrative/story/` | `npm run content:check` (planned) |
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
| Changed-path agent loop | `npm run agent:verify` | Chooses the cheapest focused checks from changed paths and writes an actionable result artifact |
| Machine-readable verification report | `npm run agent:report -- --format json` | Writes/emits the focused result contract with commit, duration, checks, artifacts, and failure hints |
| Task brief readiness | `npm run agent:task -- --describe <task-id>` | Resolves a brief and rejects missing acceptance scenarios or completion evidence |
| ADD content/code generation | `npm run content:check` | Authored content builds, validates, and matches generated Rust catalog output |
| Content graph and IDs | `npm run content:graph` or `npm run content:graph -- --reverse <id>` | All content dependencies and reverse users are inspectable as stable text/JSON |
| Story timeline | `npm run content:timeline` | Story arcs and sequence gates are inspectable |
| One content ID | `npm run content:explain -- <id>` | Resources, objectives, actions, structures, encounters, tiles, story beats, and every other registered ID expose their definition, source, references, and users |
| Content fixtures | `npm run content:fixtures:check` | Small-base, crew-roster, map, and story-state authoring fixtures match current IDs |
| Content/save versions | `npm run content:version:check` | Authored content/save versions agree with generated Rust and save migrations |
| Rust rules/state | `cargo test -p add-core` | Simulation rules, save behavior, and deterministic calculations pass core tests |
| Gameplay verification | `npm run verify` | WASM, TypeScript, content/code generation, ADD core Rust tests, and package tests pass |
| Headless ADD scenario/replay | `npm run scenario:add -- scenarios/add/<id>.json` | A committed seed/save/command log runs without the browser and checks canonical state checkpoints |
| Agent scenario artifact | `npm run agent:scenario -- scenarios/add/<id>.json` | Runs the same Rust scenario and records the report, normalized snapshot, replay log, and command output |
| Agent save inspection | `npm run agent:state -- --save <path>` | Reads a save through Rust and returns the versioned `agent_runtime_v1` report |
| Agent-readable runtime report | `npm --workspace @aedventure/add-domain test` and `cargo test -p add-scenario` | The versioned authoritative/derived/diagnostic report, stable IDs, blocker reasons, and headless/browser parity checks |
| ADD type/content/WASM boundary | `npm run agent:verify:add-ui` | Diff checks, content generation, WASM build, ADD types, and smoke syntax pass |
| Built ADD browser flow | `npm run smoke:add-rpg:built` | The already-built ADD app passes browser/player-flow assertions |
| Build-and-smoke ADD flow | `npm run smoke:add-rpg` | ADD browser build and Playwright flow both run |
| Player-facing Phase 5 fixtures | `npm run qa:add-rpg:phase5` or `npm run qa:add-rpg:phase5:built` | Boot, idle, map, story choice, save/load, and offline-return state, DOM, action-ID, renderer, and screenshot evidence pass together |
| Controlled ADD visual diff | `npm run qa:add-rpg:visual -- --artifact-dir tmp` | Screenshot baselines are compared with scenario/state evidence; missing baselines require deliberate review |
| ADD trace budget/regression report | `npm run qa:add-rpg:trace -- --trace <path>` or `npm run qa:add-rpg:trace:fixture` | Versioned `add-trace-v1` NDJSON is normalized against Rust, worker, snapshot, map, Phaser, and startup budgets |
| ADD bundle/WASM size report | `npm run qa:add-rpg:size:built` or `npm run qa:add-rpg:size` | Browser JavaScript/CSS, WASM, compressed, and total asset sizes are checked against `performance/add-budgets.json` |
| ADD browser runtime seams | [`ADD Browser Runtime Seams`](add-browser-runtime-seams.md) | Worker lifecycle/dispatch and Phaser lifecycle have explicit owners and extraction rules |
| Generated-file/write-capability contract | `npm run generated:check` | Generated sources, producers, ignored outputs, and write-capable checks stay documented and machine-readable |
| Shared package types | `npm run agent:verify:types` | Root TypeScript project references compile after neutral-package changes |
| Neutral renderer/topology fixture | `npm run smoke:engine-sandbox` | Square and hex engine paths work without office or ADD domain imports |
| Office app flow | `npm run smoke:office` | The separate customer virtual-office lane passes its browser flow |
| Full target gate | `npm run check` | Gameplay verification plus the expensive cross-app, renderer, infrastructure, and smoke gate passes |

Use the cheapest command that exercises the changed authority first. Run the
full gate at phase boundaries, before publication, or after broad shared-engine
changes.

## Agent verification loop

The focused runner classifies staged, unstaged, untracked, and
integration-relative paths. It does not launch browser or renderer QA unless
explicitly requested:

| Mode | Command | Scope |
| --- | --- | --- |
| Focused | `npm run agent:verify` | Cheapest relevant checks for the current diff |
| Gameplay | `npm run verify` | Complete non-browser gameplay/build verification |
| Gate | `npm run check` | Gameplay verification plus the full target-stack, browser, renderer, and infrastructure gate |

Use `AGENT_VERIFY_SMOKE=1 npm run agent:verify:add-ui` when browser evidence is
needed for a player-facing ADD change. Results and child logs live under the ignored
`artifacts/agent-verification/<run-id>/` directory. The detailed result
schema, artifact naming, task evidence rules, and failure workflow are in
[ADD One-Command Agent Verification Loop](add-agent-verification-loop.md).

## Content families

| Family | Authored source | Runtime authority or consumer | Current status |
| --- | --- | --- | --- |
| Resources, roles, stations, construction, processing, balance | `packages/add-domain/src/content/{resources,roles,stations,construction,processing,balance}.ts` | [Authoring/codegen path](add-content-authoring.md#authoring-to-runtime-path); generated catalog plus `crates/add-core` simulation | Implemented for the current idle/base slice |
| Story arcs, choices, flags, objectives, world actions | `packages/add-domain/src/content/{story,flags,objectives,world-actions}.ts` | [Authoring/codegen path](add-content-authoring.md#authoring-to-runtime-path); generated catalog plus Rust narrative/objective state | Implemented for the current onboarding and base arc |
| Terrain, tiles, flora, structures, entity schemas, UI elements | `packages/add-domain/src/content/{tiles,flora,structures,entity-schemas,ui-elements}.ts` | [Authoring/codegen path](add-content-authoring.md#authoring-to-runtime-path); generated catalog plus map/domain projections | Implemented for current overworld and presentation contracts |
| Expedition targets and resonance recipes | `crates/add-core/src/game_data/catalog/{expeditions,resonance}.rs` | `crates/add-core` expedition/resonance state and progression | Implemented for the current expedition/resonance slice; these are currently Rust-authored catalog entries |
| Creatures, items, and perks | `packages/add-domain/src/content/{creatures,items,perks}.ts` | [Authoring/codegen path](add-content-authoring.md#authoring-to-runtime-path); Rust combat, inventory, and perk state; domain selectors explain it | Implemented for the current combat/inventory slice |
| Encounter and loot tables | `packages/add-domain/src/content/{encounter-tables,loot-tables}.ts` | [Authoring/codegen path](add-content-authoring.md#authoring-to-runtime-path); domain selectors resolve a deterministic location result; Rust receives the typed result and applies mutation | Intentionally split; selection is not a second Rust rules engine |
| Dungeon and area definitions | `packages/add-domain/src/{dungeons,areas}/` | ADD map modes, dungeon objectives, and Phaser presentation | Current entry/objective foundation implemented; broader dungeon breadth remains |

When adding a content ID, follow [ADD Content Authoring and Codegen](add-content-authoring.md),
keep the authored ID stable, run `npm run content:check`, inspect its reverse
lookup, and update the parity audit if its runtime status changes.

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
| Agent-readable runtime inspection | `agent_runtime_v1`: authoritative state, derived actions/blockers, runtime readiness, diagnostics | Rust headless report plus ADD domain/browser adapter |

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

The headless gameplay path lives in `crates/add-core/src/bin/scenario.rs`,
backed by `crates/add-scenario/`. Run the committed idle and offline-return
scenarios with the commands in the [scenario/replay harness guide](add-scenario-harness.md).
The live browser exposes the same inspection contract through
`window.render_add_runtime_json()` and
`window.render_add_runtime_text()`; the full browser telemetry object also
contains `state.agentRuntime`.
The browser smoke reuses the offline scenario's `RunOfflineCatchup` command;
`SaveRoundTrip` remains a harness operation because the browser already
exercises its equivalent through export/import.

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
- the Phase 5 browser contract covers the critical player-facing flows, while
  broader scenario breadth, richer browser command coverage, and reviewed
  image baselines remain follow-up work;
- Phase 6 reports have a committed format, budget contract, and fixture, but
  long-lived device/browser baselines still need to be captured and reviewed
  as the live app grows;
- larger strategy/RPG systems and neutral engine extraction remain demand-led
  future work, with `apps/add-rpg` staying the first consumer;
- the lore brick has no machine-checked link to authored content: no content
  definition names a lore subject and no lore page names a content ID, so the
  `loreRef` field and `lore:refs:check` described in the
  [three-brick contract](lore-engine-content-bricks.md) are still planned;
- the narrative system (standing, acts, values, knowledge, rumor, sifting,
  storylet casting, ink) is specified and planned but not implemented; there is
  no persistent event log and no named-NPC entity graph today. See the
  [narrative plan](add-narrative-system-plan.md) for the milestone order and
  its two runtime prerequisites.

The factual implemented-versus-not-yet inventory remains
[ADD Systems Parity Audit](add-systems-parity-audit.md). This map tells an
agent where to start; the parity audit tells it what is actually implemented.
