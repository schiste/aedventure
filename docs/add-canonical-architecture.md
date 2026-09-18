# ADD Canonical Architecture and Code Audit

Status: canonical working agreement for ADD inside `aedventure`.

> The architecture described here is already used by the live `apps/add-rpg`
> game. This is an implementation and extension contract, not a plan to create
> a future placeholder app. The game is intentionally incomplete, but its
> current idle loop, content pipeline, runtime boundary, saves, and Phaser
> presentation are real and should be extended in place.

## Product direction

ADD starts as an idle game: the player assigns people, advances deterministic
systems, returns after offline time, and makes a small number of meaningful
decisions. The architecture deliberately leaves room for a later strategy/RPG
layer, but that future is not permission to build unused infrastructure today.

The repository is divided into four responsibilities:

```text
Solid/DOM + Phaser presentation
        ↓ typed worker commands and projections
Web Worker
        ↓ WASM bindings
Rust ADD simulation
        ↓ snapshots, events, catalogs
add-domain adapters and authored content
        ↓ neutral map/world primitives
shared game packages
```

Rust owns gameplay authority: command validity, progression, resources,
offline catch-up, saves, migrations, and deterministic state transitions. The
browser owns presentation, input collection, persistence plumbing, and
explanations of authoritative state. TypeScript must not reimplement ADD rules
just to make a control look convenient.

The next tooling and documentation sequence for accelerating this live app is
tracked in [ADD Game Development Tooling Plan](add-game-development-tooling-plan.md).

## Where does this change belong?

Use this routing section before opening a new package or adding a second
authority. The fuller command/content/state inventory lives in the [ADD
Repository Capability Map](add-capability-map.md), and implementation tasks
should use the [ADD Task Brief Template](templates/add-task-brief.md).

| Change | Owning layer | Keep out of | First verification |
| --- | --- | --- | --- |
| Gameplay rules, state transitions, progression, combat, or save fields | `crates/add-core/` | Solid, Phaser, and domain selectors | `cargo test -p add-core` |
| New authored IDs, story, objectives, recipes, creatures, items, perks, or balance | `packages/add-domain/src/content/` | UI conditionals and ad hoc Rust constants | `npm run content:check` |
| Snapshot projections, command mapping, labels, and available actions | `packages/add-domain/src/adapters/` | A second gameplay calculation | `npm run agent:verify:add-ui` |
| Player-facing panels, input, map modes, browser persistence, or telemetry | `apps/add-rpg/` | Neutral packages and legacy code | `npm run agent:verify:add-ui` |
| Neutral topology/world/renderer behavior with a real consumer | `packages/game-*` or `apps/engine-sandbox/` | ADD- or office-specific rules | `npm run agent:verify:types` plus the relevant smoke |

When a change crosses rows, name every affected layer in the task brief and
verify the authoritative row first. `legacy/add/` is reference material, not a
runtime dependency.

## Repository ownership

| Area | Authority | Role |
| --- | --- | --- |
| `apps/add-rpg` | presentation | Solid shell, Phaser world, worker client, audio, settings, telemetry |
| `crates/add-core` | gameplay | deterministic simulation, state, commands, saves, migrations |
| `crates/add-web-bindings` | boundary | browser-callable WASM API |
| `packages/add-domain` | translation/content | authored TS content, validation, snapshot selectors, world/presentation adapters |
| `packages/game-world` | neutral contract | renderer-neutral maps, cells, entities, interactions, and policy types |
| `packages/game-renderer-phaser` | presentation infrastructure | Phaser host and rendering implementations |
| `legacy/add` | historical reference | imported source and design material only |

## Audit findings and decisions

### Fixed in this audit

1. The lockfile omitted the `game-animation` and `game-content` workspace
   records. `npm ci` now reproduces the workspace instead of relying on a
   developer’s existing install.
2. Root `verify`, root `build`, and focused TypeScript/ADD checks now generate
   the required content and WASM artifacts before compiling the worker.
3. Renderer policy interfaces now live in `game-world`, the neutral package
   both the domain adapters and renderer already consume. `add-domain` no
   longer depends on `game-renderer-phaser`, reversing the previous layering
   direction.
4. The content generator now invokes `rustfmt` with Rust 2024, matching the
   workspace and keeping generated catalogs compatible with `cargo fmt`.
5. The unused `add-web-worker` Rust placeholder was removed. The current
   worker boundary is the TypeScript worker calling the Rust/WASM bindings;
   another crate will be added only with a concrete consumer.

### Intentional retained seams

- `packages/protocol` and `packages/map-engine` are thin compatibility facades.
  They have no active application consumers, but their documentation explicitly
  describes a migration window. They should be removed in a separate migration
  change after downstream imports are confirmed, not opportunistically during
  an ADD gameplay change.
- `apps/add-rpg/src/browser/main.ts` is still a large presentation orchestrator.
  It is the main maintainability hotspot, but splitting it safely requires
  extracting coherent panel/state modules rather than scattering more helpers.
  The next refactor should target runtime lifecycle, panel composition, and
  floating-window interaction as separate seams.
- `scripts/build-add-content.cjs` is intentionally declarative and repetitive:
  it is the schema/code-generation boundary between authored TS and Rust. Its
  size is generator metadata, not duplicated runtime rules.
- The repository no longer carries an unconsumed Rust worker scaffold. Future
  platform seams need a current consumer or an exercised near-term example.

## SOLID/DRY assessment

- **Single responsibility:** Rust simulation and the browser shell are already
  separated. The remaining violation is the ADD browser shell’s size, not a
  second gameplay authority.
- **Open/closed:** content catalogs and typed commands provide extension seams;
  new content should be authored in `packages/add-domain/src/content` and
  generated into Rust rather than adding switch branches in the UI.
- **Substitutability/interface segregation:** neutral world and policy types
  are now independent of Phaser. Renderer-specific implementations can consume
  them without making domain packages know the renderer.
- **Dependency inversion:** ADD depends on neutral world/topology contracts;
  the renderer depends on those contracts. The Rust/WASM boundary remains the
  only gameplay authority.
- **DRY:** snapshot selectors and content generation centralize repeated
  interpretation. Avoid copying formulas from Rust into UI selectors; selectors
  may format or explain snapshot values, not derive alternate rules.

## Bloat assessment

The active source tree is approximately 111k lines across apps, packages,
crates, and scripts. The largest hotspots are `apps/add-rpg/src/browser/main.ts`
(about 8.3k lines), `apps/web/src/browser/main.ts` (about 6.9k), the generated
ADD content catalog, `crates/add-core/src/simulation.rs` (about 4.6k), and the
browser smoke scripts. These are not all removable bloat: the simulation and
content catalog carry the current game’s breadth, while the smoke scripts
encode executable contracts. The browser shell is the clearest refactoring
target.

The current ADD production bundle is also large enough to keep visible: the
last gate produced an approximately 1.88 MB JavaScript bundle and 1.06 MB WASM
asset before compression. This is a delivery/performance concern, not a reason
to delete platform abstractions. Future work should lazy-load development
tools and split non-startup panels only when a measured startup or download
budget requires it.

## Verification baseline

The audit verified:

- `npm ci --no-audit --no-fund`
- `npm run verify`
- `npm run qa:multi-app`
- `npm run check` (target stack, browser builds, Playwright smoke, renderer QA,
  and infrastructure checks)
- all 100 `add-core` Rust tests
- all workspace package tests
- TypeScript compilation, content validation, and Rust/WASM generation

The gate still reports the known Vite chunk-size warnings for the office and
ADD bundles; those are recorded performance follow-up, not ignored failures.
