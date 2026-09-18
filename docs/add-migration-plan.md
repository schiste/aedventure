# ADD Migration Plan

This document defines the target structure and migration rules for moving ADD
into `aedventure` as a first-class RPG/idle app while upgrading the shared Phaser
engine to support both square and hex maps.

## Phase 0 Baseline

Phase 0 was established before code movement.

`aedventure` baseline:

- Repository: `/Users/christophehenner/Downloads/Repositories/aedventure`
- Branch: `main`
- Remote tracking branch: `aedventure/main`
- Baseline commit: `c25f7d2afb9035d086af488cc62426f9ac54daac`
- Local status: committed work is clean and pushed; `.chau7/` is untracked
  local tool state and must stay out of git.

`ADD` baseline:

- Repository: `/Users/christophehenner/Downloads/Repositories/ADD`
- Branch: `main`
- Remote tracking branch: `origin/main`
- Local status: clean after verification.

Baseline verification commands:

```sh
# aedventure
npm run check
npm run smoke:apps
npm run qa:renderer

# ADD
cargo check
npm run check:web
npm run build:web
```

All Phase 0 baseline commands passed. The ADD web commands rebuild generated
WASM bindings, so they require write access to the ADD repository when run from
a sandboxed environment.

## Target Repository Structure

The target shape is one monorepo containing a reusable Phaser game platform and
separate domain apps.

```text
apps/
  web/
    Customer virtual office app.
    Uses square-grid rooms and office collaboration domain logic.

  add-rpg/
    ADD browser app.
    Uses ADD Rust/WASM simulation, a worker runtime, Phaser presentation,
    hex overworld maps, and future square dungeons/interiors.

  engine-sandbox/
    Development-only renderer/input/topology fixtures.
    Proves square and hex render paths without office or ADD domain coupling.

packages/
  game-assets/
    Semantic visual asset metadata, atlas manifests, footprints, z-anchors,
    occlusion metadata, interaction affordance metadata, and license metadata.

  game-topology/
    Neutral square and hex coordinate systems, projections, neighbor lookup,
    distance functions, bounds checks, and coordinate serialization.

  game-world/
    Renderer-neutral world model: maps, layers, entities, zones, interactions,
    landmarks, validation, and topology references.

  game-renderer-phaser/
    Shared Phaser renderer host, scene management, camera, entities, labels,
    interactions, effects, telemetry, square renderer, and hex renderer.

  game-input/
    Keyboard, pointer, joystick, action, run/walk, and interaction input
    primitives.

  game-protocol/
    Shared runtime message contracts for inputs, snapshots, commands,
    reconciliation, and action results where TypeScript apps need them.

  game-core/
    Neutral TypeScript deterministic simulation helpers used by the office and
    current TypeScript demo paths. ADD remains Rust-authoritative and should not
    be ported here by default.

  office-domain/
    Office maps, office interaction mapping, meeting zones, collaboration
    affordances, and office-specific visual catalog.

  add-domain/
    ADD snapshot adapters, ADD command mapping, ADD visual catalog, ADD map
    selectors, hex overworld adapters, square dungeon adapters, and UI selectors.

crates/
  add-core/
    ADD authoritative Rust simulation.

  add-web-bindings/
    WASM bindings exposing ADD runtime operations to the browser worker.

  add-web-worker/
    Rust-side worker boundary helpers where useful.

legacy/
  add/
    Temporary imported ADD repository history and source material.
    This directory is deleted only after the extracted app/crates/packages are
    verified and history preservation is no longer needed in-tree.
```

## Engine Model

The shared engine must model maps by topology rather than assuming rectangular
tile coordinates everywhere.

```ts
export type SquareCoord = {
  readonly kind: "square"
  readonly x: number
  readonly y: number
}

export type HexCoord = {
  readonly kind: "hex"
  readonly q: number
  readonly r: number
}

export type CellCoord = SquareCoord | HexCoord

export interface GridTopology<TCoord extends CellCoord> {
  readonly kind: TCoord["kind"]
  cellToWorld(coord: TCoord): { readonly x: number; readonly y: number }
  worldToCell(point: { readonly x: number; readonly y: number }): TCoord | null
  neighbors(coord: TCoord): readonly TCoord[]
  distance(a: TCoord, b: TCoord): number
}
```

Square-grid maps should continue to use Phaser tilemaps and GPU tile layers
where they fit. Hex-grid maps should use a dedicated Phaser render path rather
than pretending hex cells are square tiles.

## ADD Runtime Boundary

ADD game rules stay in Rust.

The runtime flow is:

```text
ADD DOM/Solid UI
  -> typed worker command
  -> Web Worker
  -> Rust/WASM WebRuntime
  -> ADD SimulationSnapshot
  -> add-domain adapters
  -> neutral GameWorld
  -> Phaser renderer
```

Phaser renders ADD state and collects presentation-level input. It must not own
ADD gameplay rules, resource progression, save migration, offline progression,
or command validity.

## Migration Rules

1. Keep the virtual office app working after every phase.
2. Preserve ADD Rust simulation authority.
3. Do not port ADD game rules to TypeScript unless there is a separate explicit
   architecture decision.
4. Do not make ADD import `office-domain`.
5. Do not make `office-domain` import ADD code.
6. Do not hard-code ADD hex behavior inside office renderer paths.
7. Add topology-neutral abstractions before wiring ADD-specific rendering.
8. Keep square and hex rendering paths separate internally, with shared camera,
   entity, label, interaction, effects, and telemetry modules.
9. Keep generated WASM artifacts reproducible and document any generated files
   that remain checked in.
10. Treat `legacy/add/` as source material, not a live app.
11. Migrate one boundary at a time: runtime, domain adapters, renderer, UI, QA.
12. Every migration phase must end with a clear verification command list.
13. Every platform investment must support the current ADD idle slice or be
    demonstrated by a small, exercised future-facing example. Defer speculative
    infrastructure with neither a current consumer nor a proven near-future
    seam.

## Generated WASM Runtime

The ADD browser runtime is generated from `crates/add-web-bindings` with:

```sh
node scripts/build-add-rpg-wasm.cjs
```

The script writes `apps/add-rpg/src/generated/wasm/add-web-bindings/` before
TypeScript or Vite build steps need the runtime module. The generated JS, type
declarations, and `.wasm` binary are reproducible build output and are not kept
as source-controlled product code.

## QA Contract

The final baseline must cover both product apps and shared engine fixtures.

Required gates:

```sh
npm run check
npm run smoke:apps
npm run qa:renderer
cargo check
```

The eventual `npm run check` should include or delegate to:

- office app build and smoke test
- ADD app build and smoke test
- square renderer QA
- hex renderer QA
- engine sandbox smoke test
- `cargo check` for ADD Rust crates
- WASM build for ADD browser runtime
- screenshot nonblank checks for office and ADD
- `render_game_to_text` contracts for office, ADD, and engine sandbox

ADD-specific smoke should prove:

```text
load app
-> initialize worker
-> initialize Rust/WASM runtime
-> receive catalog and snapshot
-> tick runtime
-> apply one command
-> save
-> reload/import
-> render Phaser hex map
```

## First Migration Target

The first functional ADD target inside `aedventure` was intentionally narrow.
It is now historical context; the active ADD app has progressed beyond this
bootstrap target while preserving its boundaries:

- ADD Rust core builds in the `aedventure` workspace.
- ADD WASM bindings build.
- `apps/add-rpg` initializes the worker runtime.
- The app receives a live ADD snapshot.
- A minimal UI displays resources, notes, and current objective.
- A minimal command path can apply one gameplay command.
- Phaser renders the existing ADD hex overworld.
- Save/load/offline behavior remains owned by ADD runtime code.

This target proves the architecture before larger UI or content work.

## Non-Goals For The First Migration

- Full ADD UI redesign.
- Final ADD art direction.
- Expeditions.
- Combat.
- Full dungeon gameplay.
- TypeScript rewrite of ADD simulation.
- SaaS/account/admin integration.
- Replacing ADD's product mechanics with retired placeholder RPG demo mechanics.

## Open Architecture Decisions

- Whether `apps/add-rpg` keeps SolidJS long term or uses a smaller vanilla app
  shell around Phaser and DOM panels.
- Whether `game-world` should be introduced before or during the renderer
  topology split.
- Whether `legacy/add/` is imported by subtree, unrelated-history merge, or
  source copy plus remote reference tags.
- Whether ADD checked-in WASM artifacts remain checked in after migration or are
  generated exclusively during build.
- Phase 16 decision: the placeholder `apps/rpg-idle-demo` and
  `packages/rpg-domain` are removed. `apps/engine-sandbox` owns neutral engine
  topology fixtures, while `apps/add-rpg` is the real RPG/idle application.
