# ADD Systems Parity Audit

Date: 2026-09-18

Status: factual implemented-versus-not-yet inventory. Update this document
when runtime state, commands, authored content, or player-facing coverage
changes; do not use it as a speculative roadmap.

This audit records whether ADD's data model and calculation rules are properly
represented in the new aedventure monorepo stack.

The current priority is not new storytelling events. The priority is making the
existing ADD systems authoritative, inspectable, and safe to keep building on.

## Verification target

When manually served, the ADD app is available at:

```text
http://127.0.0.1:8108/app/
```

The URL is the local verification convention; this document does not claim a
development server remains running between checks.

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
| Square dungeon/base maps and entry flow | Migrated for current slice | `apps/add-rpg/src/browser/add-map-modes.ts`, `packages/add-content/src/dungeons/` | Current slice has map modes, dungeon entry, objectives, doors, locations, and return flow; broader dungeon breadth remains. |
| Investigate/Explore onboarding actions | Migrated | `WorldActionDef`, `WorldAction`, `progress_world_action` | Online-only actions remain Rust-authoritative. |
| Authored story beats, choices, flags, and objective progression | Migrated for current slice | `StoryBeatDef`, `NarrativeState`, `ObjectiveState` | The current onboarding/base arc is data/state; broader story content remains content work. |
| Hero Viral Load / forced return | Migrated | `HeroSurvivalState`, survival balance, simulation methods | Survival pressure, forced return, recovery, and debuff multipliers are Rust-side. |
| Recruitment from Survivor Cave | Migrated | `RecruitmentState`, `recruit_from_survivor_cave`, `progress_recruitment` | Vibes cost, pending travel, instant first arrivals, and crew count mutation are Rust-side. |
| Hero tracks, XP, levels, and perks | Migrated for current slice | `HeroProgressState`, `acquired_perks`, `grant_track_xp`, `acquire_perk` | Track XP and perk effects are Rust-side; richer identity/build depth remains future content. |
| Expeditions and expedition reports | Migrated for current slice | `ExpeditionState`, `start_expedition`, `progress_expeditions` | Crew assignment, timed reports, rewards, wounds, clues, and dungeon leads are Rust-side and covered by ADD smoke. |
| Resonance materials, conversion, tuning, and station specialization | Migrated for current slice | `ResonanceState`, `start_resonance_recipe`, `progress_resonance` | Current materials, recipes, tuning tracks, and specialization paths are Rust-side and surfaced in Base management. |
| Dungeon doors, location clearing, combat, and return consequences | Migrated for current slice | `open_doors`, `cleared_locations`, `active_combat`, `progress_combat` | Auto-battler rounds, deterministic outcomes, loot application, XP, wounds, and forced return are implemented. |
| Inventory and item use | Migrated for current slice | `inventory`, `dropped_items`, `UseItem`, item catalog | Rust owns quantities/caps/use effects; richer itemization remains future content. |
| Deterministic RNG stream | Migrated for current slice | `GameState.rng_seed`, `Simulation::next_rng_u64` | The stream is persisted and save/reload deterministic; broader encounter generation remains incomplete. |
| Save import/export | Migrated for current scope | `save.rs`, `WebRuntime::exportSave/importSave` | Current save payload is authoritative `GameState` JSON. |
| Browser autosave/offline bridge | Migrated for current scope | `apps/add-rpg/src/browser/save-runtime.ts` | Browser stores save records; Rust owns the state payload and catch-up command. |
| Agent-readable runtime inspection | Implemented for current slice | `crates/add-scenario/src/inspection.rs`, `packages/add-domain/src/runtime/inspection.ts`, `apps/add-rpg/src/browser/main.ts` | Versioned `agent_runtime_v1` report exposes authoritative state, derived commands/blockers, stable IDs, diagnostics, and compact text/JSON accessors. |
| Player-facing visual and interaction QA | Implemented for current critical flows | `scenarios/add/browser-fixtures.json`, `scripts/add-rpg-phase5.cjs`, `apps/add-rpg/src/browser/qa-contract.ts` | Boot, idle, map, story choice, save/load, and offline return combine state/text, semantic DOM/action IDs, renderer affordances, and screenshots; reviewed image baselines remain an explicit approval step. |
| Full save-slot metadata, content hash, backups, and slot UX | Not yet | Future save system | Schema/catalog versions and migrations exist, but the full slot manager and backup contract do not. |
| Per-system tick accumulators and event-scheduled catch-up | Partial | `Simulation::RunOfflineCatchup` | Active timed systems progress, but future encounters and complex RNG chains need a fuller event/replay model. |
| Travel encounters and richer procedural exploration | Not yet | Future systems | Current dungeon/overworld flow has deterministic authored encounters and locations, not the full encounter system. |
| Crew identities and deeper strategy/RPG systems | Not yet | Future systems | Anonymous crew and current role assignment are implemented; richer identity/build strategy remains future scope. |

## Calculation Authority

The new Rust core owns gameplay mutation through `GameCommand`:

- narrative: `ChooseStoryOption`, `CompletePreArrivalRoute`
- staffing and production: `SetHeroAssigned`, `SetHeroRole`, `SetRoleCrew`,
  `SetStationEnabled`, `StartWorldAction`, `StartConstruction`,
  `StartProcessing`, `StartResonanceRecipe`, `SetStationSpecialization`
- expeditions and recruitment: `StartExpedition`, `ClearExpeditionReports`,
  `RecruitFromSurvivorCave`
- movement and dungeon/combat: `MoveHeroTo`, `OpenDoor`, `ClearLocation`,
  `Engage`, `DropItem`, `PickUpLocation`, `UseItem`, `AcquirePerk`
- time/economy/save: `SpendBassline`, `Tick`, `RunOfflineCatchup`, `ResetRun`
- development-only tuning: `SetBalanceOverride`, `ResetBalanceOverrides`

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
- expedition targets
- resonance recipes
- objectives
- flags
- model references
- terrain, tiles, flora, structures
- creatures, items, and perks
- entity schemas
- UI metadata
- balance values

Dungeon and area definitions live in `packages/add-content/src/dungeons/` and
`packages/add-content/src/areas/` because they are map/presentation content.
Encounter and loot tables are currently domain-side selectors; Rust receives
the resolved typed result and remains authoritative for applying combat and
inventory mutation.

The legacy files `object-templates.json` and `scaling-models.json` remain design
references. They are not runtime-loaded and should not be treated as missing
runtime data unless a specific mechanic enters the current playable scope.

## Drift Risks

1. `packages/add-presentation/src/adapters/ui-selectors.ts` duplicates some
   presentation-side checks for blocked/enabled labels. It does not mutate game
   state, but it can drift from Rust if new requirements are added.
2. The save model has schema/catalog versions and migrations, but not yet the
  full save-slot metadata, content-hash, backup, and slot-manager contract.
3. Offline catch-up is currently aggregate. That is acceptable for the current
  active systems, but not enough for future encounters, RNG chains, or multiple
  event completions with rate-changing side effects.
4. Encounter/loot selection is intentionally split between domain selectors and
  Rust mutation. That boundary needs an explicit contract before procedural
  encounters expand.
5. Current dungeon entry, objectives, doors, locations, combat, inventory, and
  return flow are real; the remaining risk is breadth and content depth, not a
  missing placeholder application.

## Verification Gates

Use these gates when changing ADD data or calculations:

```sh
npm run docs:check
npm run content:check
cargo test -p add-core
npm --workspace @aedventure/add-domain run build
npm --workspace @aedventure/add-domain run test
npm run agent:verify:add-ui
npm run smoke:add-rpg:built
npm run check
```

The Rust test suite now includes a catalog guard for the current playable
systems and an offline catch-up guard that confirms allowed idle systems
progress while online-only world actions stay frozen.

## Conclusion

The current live ADD data, calculations, dungeon slice, and browser flows are
represented in the new aedventure stack.

What remains incomplete is explicitly listed above and in the capability map.
Legacy ADD remains design reference for future scope. The next systems work
should improve playability and reduce selector/authority drift rather than
recreate already-working runtime systems or import every future story/content
template prematurely.
