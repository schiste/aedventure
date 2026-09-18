# ADD Systems Parity Audit

Date: 2026-06-04

This audit records whether ADD's data model and calculation rules are properly
represented in the new aedventure monorepo stack.

The current priority is not new storytelling events. The priority is making the
existing ADD systems authoritative, inspectable, and safe to keep building on.

## Current Local Instance

The ADD app is running locally at:

```text
http://127.0.0.1:8108/app/
```

The browser readiness probe reports:

- app: `add-rpg`
- runtime: ready
- map: ready
- first playable step: `reach-base`
- console/page errors: none

## Source Boundaries

Legacy ADD remains source material:

- `legacy/add/documentation/`
- `legacy/add/mechanics/`
- `legacy/add/content/`
- `legacy/add/lore/`

The new live system is:

- `crates/add-core/`: authoritative ADD simulation, catalog, state, commands,
  save import/export, calculations.
- `crates/add-web-bindings/`: WASM bridge for the Rust runtime.
- `apps/add-rpg/src/workers/add-runtime.worker.ts`: browser worker boundary.
- `packages/add-domain/`: snapshot adapters, UI selectors, command mapping.
- `apps/add-rpg/`: Solid UI and Phaser presentation.

Phaser and the browser UI do not own ADD gameplay calculations. They consume a
Rust/WASM snapshot and send commands back to the worker.

## Parity Matrix

| System | Status | New authoritative home | Notes |
| --- | --- | --- | --- |
| Resources: Bassline, Chorus, Harmonics, Stone, Water, Vibes | Migrated | `ResourcePools`, `ResourceDef`, `BalanceSnapshot` | Skin is stored as `base.skins`, matching its current tutorial-material role rather than a full resource pool. |
| Resource caps and storage behavior | Migrated | `ResourcePools`, `Simulation::tick_internal`, balance structs | Band caps, water cap, material caps, lifetime generated/spent are in Rust state/calculation. |
| Hero and anonymous crew staffing | Migrated | `RosterState`, roles catalog, `Simulation::set_*` | Role availability and assignment normalization happen in Rust. |
| Crystal Circle production | Migrated | `CrystalCircleState`, `Simulation::tick_internal` | Bassline/Chorus/Harmonics generation and Hero XP attribution are Rust-side. |
| Stone scavenging | Migrated | `Simulation::progress_scavenge` | Online-only, by design. |
| Water collection and base stock regen | Migrated | `Simulation::regenerate_water_stock`, `progress_water_collection` | Collection is online-only; stock regeneration is Rust-side. |
| Construction projects and Crystal upgrades | Migrated | `ConstructionOptionDef`, `ConstructionJob`, `progress_construction` | Timed jobs, staffing pause, Bassline drains, Stone upfront costs, and effects are Rust-side. |
| Stations and processing recipes | Migrated | `StationDef`, `ProcessingRecipeDef`, `ProcessingState` | One job per station, power gating, recipe effects, and processing progression are Rust-side. |
| Power, Chorus upkeep, brownouts | Migrated | `PowerState`, `refresh_power_state`, `resolve_station_power` | Balance data is exposed through the catalog. |
| Harmonics efficiency and tiers | Migrated | `PowerState`, processing effects, balance structs | Current first-pass Harmonics rules are Rust-side. |
| Bad Vibes, bunks, housing pressure | Migrated | `BaseState`, `progress_vibes`, `update_bad_vibes_state` | Current pressure model is implemented in Rust. |
| Bubble reach and terrain impedance | Migrated | `BubbleState`, `HexState`, tile catalog, `progress_bubble` | Coverage is derived from stored Bassline, terrain cost, and inertia. |
| Hex overworld map state | Migrated | `HexState`, tile/flora/structure catalog | ADD uses neutral game-world adapters for rendering, not browser-owned rules. |
| Square dungeon/base foundation | Foundation only | `apps/add-rpg/src/browser/add-map-modes.ts` | Current square maps are fixtures for renderer proof, not ADD gameplay yet. |
| Investigate/Explore onboarding actions | Migrated | `WorldActionDef`, `WorldAction`, `progress_world_action` | Online-only actions remain Rust-authoritative. |
| Intro story beat metadata and choices | Migrated | `StoryBeatDef`, `NarrativeState` | Existing onboarding beats are data/state. We are not expanding story-event content now. |
| Hero Viral Load / forced return | Migrated | `HeroSurvivalState`, survival balance, simulation methods | Survival pressure, forced return, recovery, and debuff multipliers are Rust-side. |
| Recruitment from Survivor Cave | Migrated | `RecruitmentState`, `recruit_from_survivor_cave`, `progress_recruitment` | Vibes cost, pending travel, instant first arrivals, and crew count mutation are Rust-side. |
| Save import/export | Migrated for current scope | `save.rs`, `WebRuntime::exportSave/importSave` | Current save payload is authoritative `GameState` JSON. |
| Browser autosave/offline bridge | Migrated for current scope | `apps/add-rpg/src/browser/save-runtime.ts` | Browser stores save records; Rust owns the state payload and catch-up command. |
| Full save-slot metadata, content hash, migrations, backups | Not yet | Future save system | The legacy docs define this as long-term save architecture, not first playable scope. |
| Per-system tick accumulators and event-scheduled catch-up | Partial | `Simulation::RunOfflineCatchup` | Current aggregate catch-up is enough for first playable; expeditions/RNG will require the fuller model. |
| RNG streams, expeditions, travel encounters | Not yet | Future systems | Reference-only design docs. |
| Combat, tuning/reset, crew identities, rich exploration | Not yet | Future systems | Explicitly outside current first playable scope. |

## Calculation Authority

The new Rust core owns gameplay mutation through `GameCommand`:

- `ChooseStoryOption`
- `SetHeroAssigned`
- `SetHeroRole`
- `SetRoleCrew`
- `SetStationEnabled`
- `StartWorldAction`
- `StartConstruction`
- `StartProcessing`
- `RecruitFromSurvivorCave`
- `SpendBassline`
- `Tick`
- `RunOfflineCatchup`
- `ResetRun`

The browser worker forwards these commands into `WebRuntime`. The UI and Phaser
renderer never directly mutate ADD resource totals, construction progress,
bubble state, recruitment state, survival state, or save payload internals.

## Data Authority

The current implementation catalog is `crates/add-core/src/game_data.rs`.

It covers the current playable data families:

- resources
- roles
- stations
- construction options
- processing recipes
- world actions
- story beats
- flags
- model references
- terrain, tiles, flora, structures
- entity schemas
- UI metadata
- balance values

The legacy files `object-templates.json` and `scaling-models.json` remain design
references. They are not runtime-loaded and should not be treated as missing
runtime data unless a specific mechanic enters the current playable scope.

## Drift Risks

1. `packages/add-domain/src/adapters/ui-selectors.ts` duplicates some
   presentation-side checks for blocked/enabled labels. It does not mutate game
   state, but it can drift from Rust if new requirements are added.
2. The current save JSON is versioned by `GameState.schema_version`, but there
   is not yet a full migration pipeline, content-hash check, or slot manager.
3. Offline catch-up is currently aggregate. That is acceptable while active
   offline systems are simple, but not enough for expeditions, RNG events, or
   multiple event completions with rate-changing side effects.
4. The square dungeon/base modes are renderer fixtures. They prove engine
   topology, not ADD dungeon gameplay.

## Verification Gates

Use these gates when changing ADD data or calculations:

```sh
cargo test -p add-core
npm --workspace @aedventure/add-domain run build
npm --workspace @aedventure/add-domain run test
npm run smoke:add-rpg:built
npm run check
```

The Rust test suite now includes a catalog guard for the current playable
systems and an offline catch-up guard that confirms allowed idle systems
progress while online-only world actions stay frozen.

## Conclusion

The current ADD first-playable data and calculations are properly represented in
the new aedventure stack.

What remains in legacy ADD is mostly design reference for future scope. The
important next systems work should be about improving playability and reducing
selector drift, not importing every future story/content template into runtime
prematurely.
