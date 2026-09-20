# ADD Deterministic Scenario and Replay Harness

Status: implemented Phase 1 tooling for the live ADD game.

> Scope note: this harness belongs to the ADD gameplay lane. It drives
> `crates/add-core` without booting `apps/add-rpg`; it is not an office test
> runner or a replacement for the browser smoke.

## Purpose and ownership

Use this harness when a gameplay bug, balance regression, save issue, or idle
loop transition must be reproduced without a browser. The owning layers are:

| Change | Owner | First verification |
| --- | --- | --- |
| Gameplay rules, state, saves, or command semantics | `crates/add-core/` | `cargo test -p add-core` |
| Scenario format, replay diagnostics, canonical comparison | `crates/add-scenario/` | `cargo test -p add-scenario` |
| CLI invocation and fixture generation | `crates/add-core/src/bin/scenario.rs` | `cargo run -p add-core --bin scenario -- <scenario.json>` |
| Committed player-flow fixtures | `scenarios/` | `npm run scenario:add -- scenarios/<id>.json` |
| Browser command reuse or presentation behavior | `scripts/add-rpg-smoke.test.cjs` / `apps/add-rpg/` | `npm run smoke:add-rpg:built` |

The scenario crate maps directly to the public `GameCommand` variants. It does
not implement a second simulation or duplicate gameplay formulas.

## Run a scenario

From the repository root:

```sh
cargo run -p add-core --bin scenario -- scenarios/idle-base-first-cycle.json
cargo run -p add-core --bin scenario -- scenarios/offline-return.json
```

The command prints stable, pretty JSON with `status`, scenario and seed
identity, command/checkpoint counts, stable checkpoint IDs, the replay command
list, the final canonical snapshot, and the `agentRuntime` /
`agentRuntimeText` report. Scenario-relative save paths are resolved relative
to the scenario file, so a scenario can be run from any current working
directory.

To create or refresh a save fixture from a successful run:

```sh
npm run scenario:add -- scenarios/add/idle-base-first-cycle.json \
  --write-final-save scenarios/add/fixtures/saves/base-onboarding.json
```

The generated save is a normal `add-core` export and can be used as another
scenario's `initial_save`.

The fixtures under `scenarios/` are the direct Phase 1 command paths. The
equivalent `scenarios/add/` fixtures remain available to the browser smoke and
the compatibility `npm run scenario:add` workflow.

## File contract

Each scenario has a stable identity, a human-readable seed, an optional save,
an ordered command log, and checkpoints:

```json
{
  "id": "idle-base-first-cycle",
  "seed": "fixture-seed",
  "initial_save": "fixtures/saves/base-onboarding.json",
  "commands": [
    { "type": "Tick", "seconds": 60 },
    { "type": "StartConstruction", "id": "project.restore_studio" },
    { "type": "SaveRoundTrip" }
  ],
  "checkpoints": [
    {
      "id": "construction-started",
      "after": 2,
      "state": {
        "activeConstruction": { "optionId": "project.restore_studio" },
        "resources": { "stone": { "atLeast": 0 } }
      }
    }
  ]
}
```

`after` is the number of commands already applied. `after: 0` checks the
initial state; `after: 2` checks after the second command. Checkpoints must be
ordered and their `state` must be a JSON object. An expected object is a
recursive partial match, so a checkpoint can assert only the fields relevant to
its player outcome.

Supported checkpoint predicates are:

- `{ "equals": value }`
- `{ "atLeast": number }`
- `{ "atMost": number }`
- `{ "contains": value }` for an array member or string substring

Commands use PascalCase names matching `GameCommand`; fields accept the
canonical camelCase spelling and the common snake_case aliases. `SaveRoundTrip`
is the one harness-only command: it exports/imports the save through the same
core API and asserts that the canonical snapshot does not change.

## Determinism and snapshots

The human-readable seed is converted with stable FNV-1a 64-bit hashing and
overrides the starting state's RNG seed. The canonical snapshot:

- rehydrates through `Simulation::from_state`, the same derived-state boundary
  used by save import;
- excludes transient `events`;
- recursively sorts JSON object keys;
- rounds floating-point values to six decimal places; and
- emits stable JSON suitable for logs, diffs, and CI artifacts.

This deliberately compares the state a save can reproduce, rather than a
transient derived field that exists only between commands.

## Failure and replay workflow

On a checkpoint mismatch, the runner exits non-zero and reports:

1. the first divergent checkpoint and its `after` count;
2. the first JSON path that differs;
3. expected and actual values; and
4. the replayable command prefix through that checkpoint.

Save round-trip mismatches report the same before/after snapshots and command
prefix. Copy the printed `replayable command log` into a reduced scenario,
keep the same `seed` and `initial_save`, and add a checkpoint at the failing
boundary. This is the preferred bug-report artifact.

## Committed scenarios

- `scenarios/add/idle-base-first-cycle.json` is the canonical idle gameplay
  contract: it travels the six open hexes from the Survivor Cave `(6,0)` to
  the Studio `(0,3)`, completes the authored arrival and Base onboarding
  beats, assigns Scavenge and Construction Crew, earns Stone, starts and
  completes Studio restoration, earns Bassline online, applies one hour of
  offline catch-up, and verifies ten ordered snapshot checkpoints plus a save
  round-trip. It deliberately does not use `CompletePreArrivalRoute`, which
  remains a test-only shortcut for focused core tests.
- `scenarios/add/offline-return.json` loads the committed Studio save with the
  hero already assigned to Crystal Bassline, applies one hour of offline
  catch-up, and checks the returned clock, resource, story, map, survival,
  recruitment, and save state.
- `scenarios/add/fixtures/saves/base-onboarding.json` is the generated
  `add-core` save used by the offline-return scenario.

The Rust integration test in `crates/add-scenario/tests/committed_scenarios.rs`
executes both files, so deleting or invalidating a scenario fails the normal
scenario package test.

## Browser relationship

The built ADD browser smoke reads the canonical idle scenario and uses it as a
contract for the Studio endpoint, Base unlock, and the final one-hour
`RunOfflineCatchup` command. It captures `add.canonical-idle-loop` at the
player-facing Studio handoff, then reuses the same offline command in the
return flow. The standalone `offline-return.json` remains a focused save
fixture and must stay command-compatible with that browser action.
`SaveRoundTrip` remains harness-only because the browser smoke already performs
the equivalent export/import path and separately verifies the player-facing
return review.

When adding a browser-compatible command, extend the small command bridge in
`scripts/add-rpg-smoke.test.cjs` and keep the command name/parameters sourced
from the scenario file. Do not make the scenario depend on DOM selectors.

The headless result and the browser expose the shared `agent_runtime_v1`
inspection contract. See [ADD Agent-Readable Runtime Inspection](add-runtime-inspection.md)
for the report sections, stable IDs, compact text form, JSON form, and
authoritative-versus-derived boundary.

## Focused verification

```sh
cargo test -p add-scenario
cargo run -p add-core --bin scenario -- scenarios/idle-base-first-cycle.json
cargo check -p add-scenario-runner
npm run scenario:add -- scenarios/offline-return.json
npm run docs:check
```

For changes to the browser bridge, run the built ADD smoke after the focused
scenario checks. For changes to `add-core`, run its Rust tests first and then
both committed scenarios.
