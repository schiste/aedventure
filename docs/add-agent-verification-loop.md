# ADD One-Command Agent Verification Loop

Status: implemented Phase 3 tooling for the live ADD game.

> Scope note: this loop owns ADD gameplay, content, and repository checks. It
> is not the office/platform test runner and it does not replace the full
> target-stack or renderer gates.

## Purpose and ownership

The normal agent loop is deliberately small:

```text
read the brief and runtime report
        ↓
make a focused change
        ↓
        npm run agent:verify
        ↓
replay the recorded scenario or inspect the result artifact
```

`agent:verify` chooses checks from changed paths. It calls existing Cargo and
npm contracts; it does not implement gameplay rules or create a second
simulation. Rust remains authoritative for ADD state, the content package
remains authoritative for authored IDs, and `apps/add-rpg` remains the live
player-facing app.

## Command family

Run these from the repository root:

```sh
# Describe a brief resolved from tasks/, docs/tasks/, or an explicit Markdown path.
npm run agent:task -- --describe <task-id>

# Run one deterministic scenario and save its report, snapshot, and replay log.
npm run agent:scenario -- scenarios/add/<scenario>.json

# Inspect a save through the headless agent_runtime_v1 report.
npm run agent:state -- --save scenarios/add/fixtures/saves/base-onboarding.json

# Run the focused changed-path loop.
npm run agent:verify

# Run the ADD gameplay-focused profile, including Rust and content checks.
npm run agent:verify:add-ui

# Run gameplay verification across the non-browser build/test surfaces.
npm run verify

# Run gameplay verification followed by the full target-stack gate.
npm run check

# Emit the same focused result as machine-readable JSON on stdout.
npm run agent:report -- --format json

# Explicitly add the ADD browser smoke when the player surface matters.
AGENT_VERIFY_SMOKE=1 npm run agent:verify:add-ui
```

The documented verification ladder has three levels:

- `npm run agent:verify` is the focused, changed-path-aware loop.
- `npm run verify` is gameplay verification: WASM, TypeScript, content,
  `cargo test -p add-core`, and package tests.
- `npm run check` runs `npm run verify` first, then the full target-stack,
  browser, renderer, and infrastructure checks.

`agent:verify:types` and `agent:verify:gate` remain compatibility profiles
for callers that need those names. `agent:task` remains available for task
brief resolution and focused result/artifact tooling; it is not a fourth
verification level.

`--base <git-ref>` changes the comparison base. By default the runner uses
`aethyme/integration` when that ref exists, and also includes staged, unstaged,
and untracked paths in the worktree.

The result file is the canonical machine-readable output. When a caller needs
JSON-only stdout rather than npm's normal lifecycle banner, use
`npm --silent run agent:report -- --format json`.

## Focused path selection

The runner always performs cheap whitespace checks. It then adds only the
checks owned by changed boundaries:

| Changed path | Focused checks | Not run by default |
| --- | --- | --- |
| `crates/add-core/` | `cargo test -p add-core` | Full browser/renderer gate |
| `crates/add-scenario/`, `scenarios/add/` | Scenario crate tests and changed scenario replay | Full browser smoke |
| `packages/add-domain/` | ADD domain tests; content checks for authored content | Full renderer QA |
| `apps/add-rpg/`, ADD WASM/browser bridge | `npm run agent:verify:add-ui` | Browser smoke unless `AGENT_VERIFY_SMOKE=1` |
| `packages/game-*`, `apps/engine-sandbox/` | Type checks and the smallest relevant engine fixture smoke | Full cross-app gate |
| Office/platform paths | Root type checks only | ADD gameplay checks |
| `README.md`, `docs/`, task briefs | `npm run docs:check` | Product/browser checks |
| Runner scripts and package configuration | Runner contracts and/or root type checks | Full gate unless `--gate` |

When a change is broad, the result says that the phase gate is recommended;
focused mode still stays focused. This keeps a small task from paying the
browser and renderer cost while making the remaining risk explicit.

## Result contract and failure workflow

Every run creates a directory under:

```text
artifacts/agent-verification/<run-id>/
  result.json
  check-01-<check-id>.log
  check-02-<check-id>.log
  ...
```

The directory is ignored by Git. `result.json` is version 1 of the local
automation contract and includes:

- `command`: the exact user-facing command;
- `commit` and `dirty`: the Git identity used for the run;
- `durationMs` and per-check durations;
- `status`: `passed`, `failed`, or `blocked`;
- `changedPaths`, selected checks, source boundaries, and exit codes;
- `artifacts`: result, logs, reports, snapshots, replay logs, screenshots,
  and traces found in the run directory; and
- `failureHints`: a next action pointing to the owning source boundary, the
  scenario to replay, or a missing fixture/dependency.

The runner passes `AGENT_RUN_ID`, `AGENT_ARTIFACT_DIR`, and
`AGENT_RESULT_DIR` to child commands. Tools that produce additional evidence
should write it there so the result can reference it:

| Artifact | Convention |
| --- | --- |
| Canonical state | `snapshot.json` or `snapshots/<name>.json` |
| Reproduction commands | `replay.json` or `replays/<name>.json` |
| Player surface | `screenshots/<name>.png` |
| Runtime/performance diagnostics | `traces/<name>.json` or `.ndjson` |
| Check output | `check-<number>-<id>.log` |

`agent:scenario` additionally extracts the Rust report into
`scenario-result.json`, `snapshot.json`, and `replay.json`. A failed scenario
keeps the Rust runner's first divergent checkpoint and replayable command
prefix in its check log. `agent:state` stores the same
`agent_runtime_v1` report used by headless checks and prints either its JSON
wrapper or compact text form.

## Task brief completion evidence

Store implementation briefs under `tasks/`, `tasks/add/`, `docs/tasks/`, or
`docs/tasks/add/`, or pass an explicit Markdown path to `--describe`. Start
from [the ADD Task Brief template](templates/add-task-brief.md). A task is not
complete until its brief has concrete:

- player outcome and authoritative layer;
- affected stable content IDs;
- deterministic acceptance scenarios;
- focused verification commands; and
- acceptance evidence paths for the scenario/replay, focused result, player
  surface when applicable, and remaining risk/explicit non-applicability.

`agent:task -- --describe <task-id>` reports missing sections or empty
evidence fields and exits non-zero, which makes an incomplete brief visible to
automation before handoff.

## Focused verification

```sh
npm run agent:verification:test
npm run agent:report -- --format json
npm run docs:check
```

Run `AGENT_VERIFY_SMOKE=1 npm run agent:verify:add-ui` when a change affects
the player-facing ADD surface and needs browser verification. Run `npm run
check` for phase boundaries, broad shared-engine changes, and publication;
the normal granular loop does not require the full browser/renderer gate.
