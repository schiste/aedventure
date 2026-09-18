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
| CLI invocation and fixture generation | `crates/add-scenario-runner/` | `cargo check -p add-scenario-runner` |
| Committed player-flow fixtures | `scenarios/add/` | `npm run scenario:add -- scenarios/add/<id>.json` |
| Browser command reuse or presentation behavior | `scripts/add-rpg-smoke.test.cjs` / `apps/add-rpg/` | `npm run smoke:add-rpg:built` |

The scenario crate maps directly to the public `GameCommand` variants. It does
not implement a second simulation or duplicate gameplay formulas.

## Run a scenario

From the repository root:

```sh
npm run scenario:add -- scenarios/add/idle-base-first-cycle.json
npm run scenario:add -- scenarios/add/offline-return.json
```

The command prints stable, pretty JSON with `status`, scenario and seed
identity, command/checkpoint counts, the replay command list, and the final
canonical snapshot. Scenario-relative save paths are resolved relative to the
scenario file, so a scenario can be run from any current working directory.

To create or refresh a save fixture from a successful run:

```sh
npm run scenario:add -- scenarios/add/idle-base-first-cycle.json \
  --write-final-save scenarios/add/fixtures/saves/base-onboarding.json
```

The generated save is a normal `add-core` export and can be used as another
scenario's `initial_save`.

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

- `scenarios/add/idle-base-first-cycle.json` starts a new run, advances the
  onboarding story, starts and completes Studio construction, and verifies
  story, resources, map, survival, recruitment, and save round-trip state.
- `scenarios/add/offline-return.json` loads the committed Studio save, assigns
  the hero to Crystal Bassline, applies one hour of offline catch-up, and
  checks the returned clock, resource, story, map, survival, recruitment, and
  save state.
- `scenarios/add/fixtures/saves/base-onboarding.json` is the generated
  `add-core` save used by the offline-return scenario.

The Rust integration test in `crates/add-scenario/tests/committed_scenarios.rs`
executes both files, so deleting or invalidating a scenario fails the normal
scenario package test.

## Browser relationship

The built ADD browser smoke loads `offline-return.json` and reuses its
compatible runtime command prefix (`SetHeroRole`, then `RunOfflineCatchup`) in
the existing save/import/offline-return flow. `SaveRoundTrip` remains
harness-only because the browser smoke already performs the equivalent
export/import path and separately verifies the player-facing return review.

When adding a browser-compatible command, extend the small command bridge in
`scripts/add-rpg-smoke.test.cjs` and keep the command name/parameters sourced
from the scenario file. Do not make the scenario depend on DOM selectors.

## Focused verification

```sh
cargo test -p add-scenario
cargo check -p add-scenario-runner
npm run scenario:add -- scenarios/add/idle-base-first-cycle.json
npm run scenario:add -- scenarios/add/offline-return.json
npm run docs:check
```

For changes to the browser bridge, run the built ADD smoke after the focused
scenario checks. For changes to `add-core`, run its Rust tests first and then
both committed scenarios.
