# ADD Game Development Tooling Plan

Status: active execution plan for accelerating the live ADD game. Phases 0, 1,
and 2 are implemented and checked by their focused contracts plus
`npm run docs:check`.

## Purpose

`apps/add-rpg` is already the real playable ADD idle/RPG application. This
plan describes the tooling and documentation needed to help humans and AI
agents extend that game quickly without guessing, duplicating rules, or
building a second architecture beside it.

The plan is deliberately game-first:

- player-facing ADD features remain the reason to build tooling;
- tooling observes and verifies the existing game instead of replacing it;
- shared engine work is extracted from proven ADD needs;
- future strategy/RPG systems use the same authoritative runtime and command
  model rather than requiring a rewrite.

## Existing foundation

The repository already has meaningful pieces of the desired environment:

| Capability | Existing location | Current role |
| --- | --- | --- |
| Authoritative deterministic simulation | `crates/add-core/` | Commands, progression, resources, offline catch-up, saves, migrations, and Rust tests |
| Browser runtime boundary | `crates/add-web-bindings/`, `apps/add-rpg/src/workers/` | WASM runtime behind a typed worker protocol |
| Authored content and code generation | `packages/add-domain/src/content/`, `scripts/build-add-content.cjs` | TypeScript authoring with generated Rust catalogs |
| Deterministic scenarios and replay | `crates/add-scenario/`, `crates/add-scenario-runner/`, `scenarios/add/` | Headless command logs, canonical snapshots, checkpoints, save round-trips, and committed idle/offline fixtures |
| Agent-readable runtime inspection | `packages/add-domain/src/runtime/inspection.ts`, `crates/add-scenario/src/inspection.rs`, `apps/add-rpg/src/browser/` | Versioned authoritative/derived/diagnostic reports, stable IDs, blocker explanations, and text/JSON accessors |
| Domain projections | `packages/add-domain/src/adapters/` | Snapshot selectors, command mapping, map/world adapters, and explanations |
| Player-facing app | `apps/add-rpg/src/browser/` | Solid UI, Phaser map, saves, settings, telemetry, and development tools |
| Content inspection | `npm run content:validate`, `content:graph`, `content:timeline`, `content:explain` | Deterministic text output for humans and agents |
| Repository capability map | `docs/add-capability-map.md` | Owning layers, content families, runtime state, smoke flows, and known gaps |
| Standard task brief | `docs/templates/add-task-brief.md` | Player outcome, authority, content IDs, scenarios, verification, and follow-up |
| Focused verification | `npm run agent:verify:add-ui` | Cheap ADD-focused build/type/content checks |
| Product smoke | `npm run smoke:add-rpg` | Browser build and ADD flow verification |
| Shared-engine fixtures | `apps/engine-sandbox/`, `packages/game-*` | Neutral topology/rendering proof where it is useful |
| Brokered parallel work | Aethyme sessions/worktrees | Isolated agent changes and reviewed integration |

The goal is to connect and finish these pieces, not to discard them.

## Guiding contract for agents

Every useful agent task should support this loop:

```text
inspect authoritative state
        ↓
choose a typed command or code change
        ↓
run a deterministic scenario/check
        ↓
compare state, behavior, and presentation evidence
        ↓
report success, failure, or the next blocker
```

An agent should not need to infer game rules from DOM text, screenshots, or a
large browser file. The repository should make the authoritative state,
available actions, expected invariants, and verification commands explicit.

## Delivery principles

1. **Extend the live app.** A feature is complete only when it works through
   the ADD runtime and its player-facing app path.
2. **One authority per rule.** Rust mutates gameplay state; authored content
   defines data; domain adapters explain snapshots; the browser renders and
   dispatches commands.
3. **Determinism before autonomy.** Seeds, command logs, snapshots, and stable
   output are more valuable than an agent that can click around unreliably.
4. **Text before pixels, pixels before polish.** Agents need structured state
   first, visual assertions second, and aesthetic evaluation only where it
   materially affects the feature.
5. **Small, composable tools.** Prefer commands that work independently and
   produce files an agent can cite, diff, and rerun.
6. **Evidence at the boundary.** Every engine extraction must be exercised by
   the live ADD app or by a focused neutral fixture with an explicit reason.
7. **No speculative platform tax.** Defer generic multiplayer, editor, AI
   director, and service infrastructure until a current feature requires them.

## Workstreams and staged deliverables

### Phase 0 — Make the map of the system executable (implemented)

Goal: eliminate orientation time for every contributor and agent.

Deliverables:

- Keep the root README as the product compass: live ADD game first, office
  lane separate, legacy reference only.
- Add a short “where does this change belong?” section to the ADD architecture
  docs whenever a new boundary appears; the current sections live in the ADD
  architecture, migration, engine-boundary, and story-content contracts.
- Maintain the checked-in repository capability map covering commands,
  content families, runtime state, smoke flows, and known gaps.
- Standardize task briefs with: player outcome, authoritative layer, affected
  content IDs, acceptance scenarios, focused verification, and likely follow-up.
- Keep `docs/add-systems-parity-audit.md` as the factual “implemented vs not
  yet” inventory.

Exit criteria:

- An agent can identify the owning layer and first verification command from
  the README and architecture docs.
- Documentation consistently describes `apps/add-rpg` as the existing playable
  ADD application, not a future or placeholder product.
- Office/platform documents carry an explicit scope note.

### Phase 1 — Deterministic scenario and replay harness (implemented)

Goal: test gameplay without booting the browser and make bugs reproducible.

Planned scenario shape:

```json
{
  "id": "idle-base-first-cycle",
  "seed": "fixture-seed",
  "initial_save": "fixtures/saves/base-onboarding.json",
  "commands": [
    { "type": "Tick", "seconds": 60 },
    { "type": "StartConstruction", "id": "..." }
  ],
  "checkpoints": [
    { "after": 1, "state": { "resource": "..." } }
  ]
}
```

Implemented deliverables:

- `add-scenario-runner` runs a scenario file against `crates/add-core`; the
  scenario owns its human-readable seed, optional relative initial save, and
  typed command sequence.
- Canonical snapshots remove transient events, normalize derived save-boundary
  state, sort JSON objects, and round floating-point noise for stable output.
- Checkpoints support exact values, partial objects, and `equals`, `atLeast`,
  `atMost`, and `contains` predicates. Committed scenarios cover resources,
  construction jobs, story, recruitment, survival, map state, offline return,
  and save round-trips.
- Failures print the first divergent checkpoint/path plus a replayable command
  prefix. `--write-final-save` supports fixture generation and investigation.
- `scenarios/add/idle-base-first-cycle.json` covers the current idle/base loop;
  `scenarios/add/offline-return.json` covers a one-hour offline return from a
  committed save fixture.
- The built ADD browser smoke consumes the offline scenario's compatible
  `RunOfflineCatchup` command so browser and headless checks share the command
  ID and parameter.

Exit criteria:

- A gameplay bug can be reproduced from a committed scenario without a
  browser.
- Rust tests and scenario tests agree on the same command/state contract.
- The ADD browser smoke can reuse at least one scenario command sequence.

See [ADD Deterministic Scenario and Replay Harness](add-scenario-harness.md)
for the file contract, commands, failure format, and extension rules.

### Phase 2 — Agent-readable runtime inspection (implemented)

Goal: let an agent understand what the game is doing and what it can do next.

Implemented deliverables:

- A versioned structured state report containing runtime readiness, current
  time, resources, jobs, crew/hero state, active story, map mode, available
  commands, blockers, and content/catalog version.
- Stable IDs for entities, content, commands, and checkpoints.
- Explicit “why unavailable?” explanations from Rust/domain state rather than
  UI guesses.
- A compact text renderer for logs and a JSON renderer for automation.
- A distinction between authoritative state, derived presentation, and
  diagnostics.
- `agent_runtime_v1` is emitted by both the headless scenario runner and the
  live ADD browser. The headless report reads `GameState`; the browser report
  reads the WASM snapshot and domain command projection.
- `window.render_add_runtime_json()` and
  `window.render_add_runtime_text()` expose the browser report without DOM
  scraping, while `render_game_to_text()` includes it at `agentRuntime`.
- Scenario output includes stable checkpoint IDs, `agentRuntime`, and
  `agentRuntimeText`; the committed idle/offline tests assert the contract.

Exit criteria:

- An agent can answer “what can I do next and why?” without scraping the DOM.
- The report is stable enough to snapshot-test.
- `apps/add-rpg` exposes the same report used by headless checks wherever
  possible.

See [ADD Agent-Readable Runtime Inspection](add-runtime-inspection.md) for the
field contract, ownership rules, stable IDs, browser accessors, and focused
verification.

### Phase 3 — One-command agent verification loop

Goal: reduce every small task to a predictable inspect/change/check cycle.

Planned command family (names are proposals until implemented):

```sh
npm run agent:task -- --describe <task-id>
npm run agent:scenario -- scenarios/add/<scenario>.json
npm run agent:state -- --save <path>
npm run agent:verify:add-ui
npm run agent:report -- --format json
```

Deliverables:

- A focused runner that chooses the cheapest relevant checks from changed
  paths, with an explicit override for browser smoke.
- Machine-readable result files containing command, commit, duration, status,
  artifacts, and failure hints.
- Artifact conventions for snapshots, replay logs, screenshots, and traces.
- A clean distinction between focused checks and the expensive phase gate.
- A task template that requires acceptance evidence before a task is complete.

Exit criteria:

- A new agent can run one documented command and receive actionable output.
- Failed checks point to a scenario, source boundary, or missing fixture.
- The normal granular loop does not require the full browser/renderer gate.

### Phase 4 — Content and world authoring acceleration

Goal: make new game content safe and fast to author without moving rules into
the UI.

Deliverables:

- Finish content validation for duplicate IDs, missing references, unreachable
  story beats, invalid effects, impossible actions, and catalog drift.
- Add explainers for resources, objectives, actions, structures, encounters,
  map tiles, and story beats—not only story nodes.
- Add a content dependency graph with reverse lookup: “what uses this ID?”
- Add fixture generators for a small base, crew roster, map, and story state.
- Document the authoring-to-Rust-codegen path beside each content family.
- Add schema/version checks for content changes that affect saves.

Exit criteria:

- An agent can add a content item and discover all required references and
  verification commands before touching the UI.
- Content errors fail before code generation or browser boot.
- The same IDs are visible in authored TS, generated Rust, snapshots, and
  telemetry.

### Phase 5 — Player-facing visual and interaction QA

Goal: verify the game that players see without making screenshots the only
source of truth.

Deliverables:

- Stable ADD browser fixtures for boot, idle progression, map interaction,
  story choice, save/load, and offline return.
- Semantic selectors and action IDs for important controls.
- A text/state assertion plus a screenshot assertion for each critical flow.
- Renderer checks for map readiness, nonblank output, camera state, map mode,
  and interaction affordances.
- A small visual-diff policy: when an image changes, require a reason and
  preserve the scenario/state evidence that produced it.

Exit criteria:

- Agents can verify a feature through both authoritative state and the player
  surface.
- Visual failures identify the scenario and state that produced the image.
- The existing ADD smoke remains the product check; engine-sandbox remains the
  cheap neutral renderer check.

### Phase 6 — Performance and maintainability feedback

Goal: keep the fast development loop fast as the game grows.

Deliverables:

- Trace budgets for Rust tick, offline catch-up, worker messaging, snapshot
  projection, map build, Phaser render, and startup.
- A stable trace format with threshold checks and regression summaries.
- Bundle and WASM size reports at phase gates.
- A decomposition plan for `apps/add-rpg/src/browser/main.ts` based on actual
  runtime seams: lifecycle, panels, command dispatch, map mode, and dev tools.
- Documentation for generated files and which checks may write them.

Exit criteria:

- Performance regressions identify the stage and budget that moved.
- The browser shell can be split incrementally without creating a second
  gameplay authority.
- Agents can tell environment failures (missing dependencies or write access)
  from product/test failures.

### Phase 7 — Demand-driven shared-engine extraction

Goal: generalize proven seams for future strategy/RPG layers and the office
lane without slowing current ADD work.

Order:

1. Extract or stabilize neutral asset/map contracts when an ADD feature needs
   them.
2. Extract neutral renderer/input/protocol seams after a live ADD scenario
   exercises them.
3. Keep `apps/engine-sandbox` as a small square/hex fixture suite.
4. Preserve `crates/add-core` as the ADD gameplay authority; do not port rules
   into a generic TypeScript simulation for convenience.
5. Add future strategy/RPG systems as commands, state, content, and scenarios
   before adding specialized presentation.

Exit criteria:

- Shared packages have real consumers and focused tests.
- ADD and office domains depend on neutral contracts rather than each other.
- The current ADD feature loop is no slower to run or understand than before
  extraction.

## Priority order

### P0 — Immediately valuable

- Keep the README and scope markers truthful.
- Build the headless deterministic scenario/replay harness.
- Define the agent-readable state/action report.
- Turn the current idle loop into the first committed scenario suite.

### P1 — Unlocks sustained feature velocity

- Add the one-command agent verification/report loop.
- Expand content graph/explain/validation tooling.
- Add stable ADD browser fixtures and semantic interaction IDs.
- Split the largest `apps/add-rpg` orchestration seams only when scenarios
  protect behavior.

### P2 — Scale and future expansion

- Add performance budgets and trace regression reports.
- Extract shared engine packages from proven ADD use cases.
- Add strategy/RPG-specific command families, world state, and scenarios.
- Add richer visual/content authoring tools only after deterministic contracts
  are stable.

## Explicit non-goals for this tooling phase

- Building a generic AI game-master service.
- Replacing the playable ADD app with an engine demo.
- Porting ADD simulation rules into TypeScript because they are easier for an
  agent to call.
- Building multiplayer infrastructure for the idle loop before the game needs
  it.
- Building a full map/editor product before the neutral schemas and validators
  are proven.
- Treating generated screenshots, logs, or local broker state as source code.

## Definition of done

The environment is accelerating the game when an agent can:

1. Read the task brief and identify the authoritative layer.
2. Inspect current state and available actions from structured output.
3. Make a small change without reimplementing a rule in the wrong layer.
4. Run a deterministic scenario and receive a minimal diff on failure.
5. Verify the relevant player-facing flow when presentation changed.
6. Produce a report that another agent or human can replay.

That is the standard for the next engine/tooling changes: more leverage for
the live ADD game, less ceremony around speculative infrastructure.
