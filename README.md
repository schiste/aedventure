# Aedventure

Aedventure is the canonical repository for the live ADD idle/RPG game. The playable
game already exists and is the primary active product lane: the current slice
includes an idle-game loop, Rust-authoritative simulation, a Web Worker/WASM
boundary, Solid UI, Phaser presentation, authored content, saves, offline
catch-up, and a playable hex overworld. The long-term direction can grow into
a strategy/RPG game without moving gameplay authority into the browser shell.

This is not a blank engine repository and `apps/add-rpg` is not a placeholder
demo. New work should extend and finish the existing game, using the shared
engine only where the current game benefits from it.

The former standalone `ADD` repository is legacy/reference material. Its
imported history remains under `legacy/add/`; new ADD work belongs in this
repository.

The monorepo also contains a separate office/platform lane. The office
materials below are not the active ADD game, and they are not evidence that ADD
still needs to be built from scratch. They remain in the repository because
the shared engine and the office application are maintained alongside the
game.

The repository also retains the hard-fork plan and implementation workspace for
the separate Aedventure Customer Virtual Office App. That office/platform work
is not a prerequisite for the live ADD game.

SkyOffice is not the product architecture. SkyOffice is a temporary legacy
source reference that must be reduced, replaced, and rebuilt into a clean
architecture before product feature work resumes.

## Current Product Reality

| Area | Current role | Source of truth |
| --- | --- | --- |
| `apps/add-rpg/` | Live ADD browser game: Solid UI, Phaser world, runtime client, saves, telemetry, and development tools | Player-facing application and app-level presentation behavior |
| `crates/add-core/` | Live ADD gameplay runtime | Rust simulation, commands, progression, offline catch-up, saves, migrations, and deterministic rules |
| `crates/add-web-bindings/` | Live browser boundary | WASM bindings consumed by the ADD worker |
| `packages/add-domain/` | Live ADD content and translation layer | Authored content, validation, selectors, command mapping, and world/presentation adapters |
| `packages/game-*` | Shared engine primitives | Neutral topology, world, renderer, input, and protocol contracts used when an app consumes them |
| `apps/engine-sandbox/` | Engine fixture and QA surface | Square/hex renderer and topology proof, not a second product game |
| `apps/web/`, `apps/api/`, `apps/world-server/`, `apps/media-gateway/` | Office/platform lane | Customer virtual-office product planning and infrastructure |
| `legacy/add/` | Historical ADD reference | Imported source and design material only; never the live app |

The current game is deliberately incomplete: combat, richer exploration,
full dungeon gameplay, deeper save-slot metadata, and broader strategy/RPG
systems remain future work. “Incomplete” means the existing game needs more
features; it does not mean the app or its engine foundations are merely
scaffolding.

## Start With The Existing Game

For gameplay work, begin with the live ADD path:

1. Put authoritative rules and state transitions in `crates/add-core/`.
2. Author content in `packages/add-domain/src/content/` and run the content
   validation/code-generation path documented in
   [ADD Content Authoring and Codegen](docs/add-content-authoring.md).
3. Put player-facing presentation and command dispatch in `apps/add-rpg/`.
4. Add or generalize `packages/game-*` only when the current ADD app (or the
   office app) has a concrete consumer and an exercised test.
5. Treat `legacy/add/` as reference material, not an implementation target.

The protected first gameplay loop is
`travel -> reach Studio -> unlock Base -> assign crew -> earn resources ->
construct -> leave offline -> return`. Its headless contract is
[`scenarios/add/idle-base-first-cycle.json`](scenarios/add/idle-base-first-cycle.json):
the Rust runner checks ten ordered snapshot checkpoints and a save round-trip.
The built browser smoke reads the same scenario for the Studio endpoint and
offline command, and captures `add.canonical-idle-loop` evidence. Gameplay
changes are not complete until the Rust scenario and the relevant browser
smoke both pass.

## Where Does This Change Belong?

Use the [ADD Repository Capability Map](docs/add-capability-map.md) when a task
crosses a boundary. The short routing rule is:

| If the change affects... | Put it in... | First check |
| --- | --- | --- |
| Gameplay rules, state, progression, combat, or saves | `crates/add-core/` | `cargo test -p add-core` |
| Authored IDs, story, objectives, recipes, creatures, items, perks, or balance | `packages/add-domain/src/content/` | `npm run content:check` |
| Snapshot projections, available actions, or command mapping | `packages/add-domain/src/adapters/` | `npm run agent:verify:add-ui` |
| Agent-readable runtime state, action availability, blockers, or stable report IDs | `packages/add-domain/src/runtime/` plus `crates/add-scenario/src/inspection.rs` | `npm --workspace @aedventure/add-domain test` and `cargo test -p add-scenario` |
| Player-facing ADD UI, input, map presentation, or browser lifecycle | `apps/add-rpg/` | `npm run agent:verify:add-ui` |
| Neutral topology/renderer behavior with a real consumer | `packages/game-*` or `apps/engine-sandbox/` | `npm run agent:verify:types` plus the relevant smoke |

The standard brief is [ADD Task Brief](docs/templates/add-task-brief.md). It
records the player outcome, authority, affected content IDs, acceptance
scenarios, focused verification, and likely follow-up before implementation.

Useful focused checks:

```sh
npm run agent:task
npm run agent:report -- --format json
npm run agent:scenario -- scenarios/add/idle-base-first-cycle.json
npm run agent:state -- --save scenarios/add/fixtures/saves/base-onboarding.json
npm run scenario:add -- scenarios/add/idle-base-first-cycle.json
npm run scenario:add -- scenarios/add/offline-return.json
npm run content:check
npm run content:graph -- --reverse resource.stone
npm run content:explain -- objective.restore_studio
npm run content:fixtures:check
npm --workspace @aedventure/add-domain test
npm run agent:verify:add-ui
npm run agent:task -- --smoke
npm run qa:add-rpg:phase5
npm run qa:add-rpg:visual -- --artifact-dir tmp
npm run qa:add-rpg:trace:fixture
npm run qa:add-rpg:size:built
npm run qa:add-rpg:performance
npm run generated:check
npm --workspace @aedventure/add-rpg run dev:browser
```

The focused loop writes machine-readable evidence under
`artifacts/agent-verification/<run-id>/` and does not launch the browser or
renderer gate by default. Use `npm run agent:task -- --smoke` when the
player-facing ADD surface needs explicit browser verification. The full gate
is reserved for phase boundaries, broad engine changes, and pre-push
verification; see [AGENTS.md](AGENTS.md).

## Canonical Documentation

- [ADD Canonical Architecture and Code Audit](docs/add-canonical-architecture.md)
- [ADD Repository Capability Map](docs/add-capability-map.md)
- [ADD Task Brief Template](docs/templates/add-task-brief.md)
- [ADD Migration and Runtime Boundary](docs/add-migration-plan.md)
- [ADD Systems Parity Audit](docs/add-systems-parity-audit.md)
- [ADD Game Development Tooling Plan](docs/add-game-development-tooling-plan.md)
- [ADD Deterministic Scenario and Replay Harness](docs/add-scenario-harness.md)
- [ADD Agent-Readable Runtime Inspection](docs/add-runtime-inspection.md)
- [ADD One-Command Agent Verification Loop](docs/add-agent-verification-loop.md)
- [ADD Player-Facing Visual and Interaction QA](docs/add-player-facing-qa.md)
- [ADD Browser Runtime Seams](docs/add-browser-runtime-seams.md)
- [ADD Generated Files and Write-Capable Checks](docs/add-generated-files.md)
- [ADD Content Authoring and Codegen](docs/add-content-authoring.md)
- [Story and Content Engine Contract](docs/story-content-engine.md)
- [Domain-Neutral Engine Boundary](docs/engine-boundary.md)
- [Global Product and Technical Specification](docs/customer-virtual-office-platform-spec.md)
- [Development Rollout Plan](docs/development-rollout-plan.md)
- [Phase 0 Refactor Plan](docs/phase-0-refactor-plan.md)
- [SkyOffice Fork Maintenance](docs/skyoffice-fork-maintenance.md)
- [Phase 0 Baseline Verification](docs/phase-0-baseline-verification.md)
- [Initial License Audit](docs/license-audit.md)

## Source Layout

The entries below the ADD lane are office/platform or legacy/reference scope.
Their use of words such as “future” describes that separate lane and never the
status of `apps/add-rpg`.

- `apps/add-rpg/` - canonical ADD browser app and presentation shell.
- `crates/add-core/` - authoritative ADD simulation, saves, migrations, and
  gameplay rules.
- `crates/add-web-bindings/` - browser-facing Rust/WASM bindings.
- `packages/add-domain/` - authored ADD content and snapshot/map/UI adapters.
- `packages/game-*` - reusable topology, world, renderer, content, input, and
  protocol primitives.
- `legacy/add/` - imported ADD source/history; not a live application.
- `legacy/skyoffice-original/` - SkyOffice fork imported with upstream Git
  history preserved as a subtree. This is reference code, not the target app.
- `apps/web/` - browser-first customer app-layer orchestrator with a Phaser 4
  world renderer and HTML/TypeScript overlays.
- `apps/world-server/` - future Colyseus authoritative world server.
- `apps/api/` - API foundation with Wikimedia OAuth, sessions, seeded runtime
  permission enforcement, and persistence boundaries. Full RBAC management comes
  later via the SaaS/control-plane phase.
- `apps/media-gateway/` - LiveKit token service and media policy layer.
- `packages/protocol/` - future client/server protocol definitions.
- `packages/map-engine/` - future map parsing, collision, zones, and navigation.
- `packages/auth-wikimedia/` - future Wikimedia OAuth 2.0 integration.
- `packages/policy/` - server-side permission and delivery policy decisions.
- `packages/shared-types/` - future shared application types.
- `infra/` - future Docker Compose and deployment scaffolding.
- `assets/ASSET_MANIFEST.md` - required manifest for any target-app assets.
- `docs/` - product, architecture, and phase planning documents.

## Platform Investment Rule

The platform exists to make the current ADD idle slice easier to ship while
keeping future strategy/RPG layers possible. Every platform investment must
either support the current idle slice or be demonstrated by a small,
exercised future-facing example. Infrastructure with neither a current
consumer nor a proven near-future seam is deferred.

For the ADD lane, this means the existing playable app remains the driver of
platform work. A neutral abstraction is valuable when it makes a real ADD
feature easier to implement, test, inspect, or extend toward the future
strategy/RPG layers. A generic abstraction without a current consumer stays
out of the critical path.

## Office/Platform Lane

> Scope note: this section documents the separate customer virtual-office and
> platform lane. It is not the ADD game roadmap, and its future app/server
> entries do not describe `apps/add-rpg`.

The following sections document the separate customer virtual-office track.
They are retained for the shared repository and should not be read as the ADD
game roadmap.

## Starting Position

1. Preserve SkyOffice history.
2. Move SkyOffice under `legacy/`.
3. Freeze feature work.
4. Make the build reproducible.
5. Audit and remove incompatible bundled assets.
6. Replace auth with Wikimedia OAuth 2.0 plus local users/sessions.
7. Replace client-authoritative movement with server-authoritative movement.
8. Add Postgres persistence immediately.
9. Replace PeerJS media with LiveKit/coturn.
10. Define a clean protocol before adding product features.

## Early Non-Goals

- Rebuilding the SaaS Foundation from scratch.
- Building the full map editor immediately.
- Adding rooms, admin features, or design polish on the legacy architecture.
- Keeping PeerJS as the final media layer.
- Implementing production AI agents in Step 0.
- Implementing enterprise Google Meet, Teams, or Zoom integrations in Step 0.
- Building a large-scale broadcast system before the core protocol and
  persistence layers are clean.
- Building a Tauri desktop wrapper before the browser MVP is stable.

## Stack Orientation

The target is a TypeScript-first product layer, not an all-TypeScript runtime.
Application logic, protocol contracts, policies, API boundaries, world
simulation, and client code should stay in TypeScript where practical. Durable
state, media, cache, and desktop packaging use the best-fit tools already in the
plan: Postgres, Valkey, LiveKit/coturn, S3-compatible storage, and eventually
Tauri.

## Phase 0 Baseline Check

Run the target stack verification with:

```bash
scripts/verify-target-stack.sh
```

This builds the new TypeScript workspace and runs checks for:

- protocol message validation
- map-engine movement, collision, and zone permissions
- policy chat delivery and permission checks
- authoritative world-server movement
- API Wikimedia sign-in, sessions, and world-token issuance
- world-server admission from API-issued world-token claims
- media-gateway media policy and token claim issuance
- dependency-free local HTTP host mounting browser, API, world, and media
  handlers
- local shared-infra configuration shape

## Local App-Layer HTTP Host

Run:

```bash
npm run dev:http
```

This builds the target workspace, then starts a dependency-free Node HTTP host
for local smoke testing:

- Vite-built playable local browser demo is served under `/app`.
- The local office map is rendered by Phaser 4 from `/dev/fixture-map`; the
  asset-registry semantic catalog remains the source of truth for tile IDs.
- Local-only dev sign-in is mounted under `/dev/sign-in`.
- Local fixture-map data is mounted under `/dev/fixture-map`.
- API routes are mounted under `/api`.
- World transport routes are mounted under `/world`.
- Media gateway routes are mounted under `/media`.
- The host uses the same standard Fetch handlers covered by the target stack
  verification.
- The target verification also runs a full local app-layer smoke flow across
  `/dev`, `/api`, `/world`, and `/media`.
- Stop and restart `npm run dev:http` after server-side changes; the running
  Node process keeps its loaded world/API/media modules in memory.

Run the imported SkyOffice baseline verification with:

```bash
scripts/verify-skyoffice-baseline.sh
```

After dependencies are already installed, use:

```bash
SKIP_INSTALL=1 scripts/verify-skyoffice-baseline.sh
```

This script verifies the legacy SkyOffice baseline only. The new app stack
must get its own CI checks as it is created.
