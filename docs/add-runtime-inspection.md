# ADD Agent-Readable Runtime Inspection

Status: implemented Phase 2 contract for the live ADD game.

> Scope note: this document belongs to the ADD gameplay lane. It describes
> inspection of the existing `apps/add-rpg` runtime and the headless
> `crates/add-core` simulation; it is not an office/platform telemetry
> contract or a replacement for the browser smoke.

## Purpose

The runtime report gives a human or AI agent one stable answer to:

> What is the game doing now, what can I do next, and why is another action
> unavailable?

It is a read-only projection. Rust still owns gameplay mutation and save
semantics. The browser does not infer the report by scraping DOM text.

## Contract

The report is versioned as:

```text
schemaVersion: 1
catalogVersion: 1
reportVersion: 1
contract: agent_runtime_v1
```

`schemaVersion` identifies the report shape, `catalogVersion` identifies the
save-facing content catalog, and `reportVersion` identifies the report
producer contract. The headless scenario runner and the browser's
`render_game_to_text().agentRuntime` expose these fields together.

Both adapters emit the same top-level shape:

| Section | Meaning | Authority |
| --- | --- | --- |
| `runtime` | Readiness, source, snapshot/catalog receipt, and runtime error | Browser lifecycle or headless runner |
| `authoritative` | Time, resources, jobs, crew/hero, story, map state, and catalog identity | Rust `GameState`/WASM `SimulationSnapshot` |
| `derived` | Map presentation mode, next action, available commands, stable command IDs, and blocker explanations | ADD domain selectors or the Rust state-report adapter |
| `diagnostics` | Last command/event, warning count, and layer ownership labels | Runtime/reporting diagnostics; never gameplay authority |

Every command includes `id`, `kind`, `label`, `enabled`,
`whyUnavailable`, the typed `command` payload, and `relatedIds`. An enabled
command has `whyUnavailable: null`. A blocked command always has a non-empty
reason in `derived.blockers`.

The report intentionally contains both the state an agent can trust and the
presentation derived from it. For example, `authoritative.map.heroCell` is
the Rust snapshot coordinate, while `derived.map.mode` is the current browser
map mode (`overworld_hex`, `base_square`, or another registered mode).

## Implementations and ownership

| Change | Owning layer | First focused verification |
| --- | --- | --- |
| State, command validity, save behavior, or a new authoritative field | `crates/add-core/` | `cargo test -p add-core` |
| Headless report, replay output, checkpoint IDs, or report assertions | `crates/add-scenario/` | `cargo test -p add-scenario` |
| Snapshot-to-report projection, labels, or browser command explanations | `packages/add-domain/src/runtime/` and `packages/add-domain/src/adapters/` | `npm --workspace @aedventure/add-domain test` |
| Browser exposure or runtime lifecycle diagnostics | `apps/add-rpg/src/browser/` | `npm run smoke:add-rpg:built` |
| Content/catalog identity | `packages/add-domain/src/content/` and generated Rust catalog | `npm run content:check` |

When a change crosses this boundary, update the authoritative Rust state
first, then the domain projection, then the browser renderer/accessor. Do not
add a second gameplay calculation to make a report look convenient.

## Stable identity rules

- Authored content IDs are the IDs from the ADD catalog and are never
  generated from labels.
- Report entity IDs use the stable `entity:hero` identity and
  `crew-role:<role-id>` identities; anonymous crew has no invented
  per-person identity.
- Command IDs use stable prefixes such as
  `story-choice:<beat>:<choice>`, `world-action:<action>`,
  `construction:<option>`, `wait:<seconds>`, and
  `base:hero:<operation>`.
- Runtime jobs use their authoritative option, station, target, or combat
  identity. Recruitment jobs use their stable queue position within the
  current state.
- Scenario checkpoints use an explicit namespaced ID when present, otherwise
  `checkpoint:<scenario>:<ordinal>@<after>`.
- JSON object keys are sorted by the JSON renderer; repeated report entries
  are emitted in stable catalog/identity order so snapshots and diffs do not
  depend on UI layout.

## Headless use

The scenario runner appends `agentRuntime` and `agentRuntimeText` to its
stable JSON output:

```sh
npm run scenario:add -- scenarios/idle-base-first-cycle.json
npm run scenario:add -- scenarios/offline-return.json
```

`agentRuntime` is the automation form. `agentRuntimeText` is the compact log
form:

```text
runtime ready source=headless-add-core
time 3642s beat=story.beat.base_loop
next world-action:... commands enabled=... blocked=...
```

The scenario failure output still reports the first divergent checkpoint and
the replayable command prefix. Use that prefix to turn an agent observation
into a committed regression scenario.

## Browser use

The live ADD app exposes the same versioned report from the current
WASM-backed snapshot:

```js
window.render_add_runtime_json() // stable JSON string
window.render_add_runtime_text() // compact text
```

`window.render_game_to_text()` also contains the report at
`state.agentRuntime` alongside the existing UI telemetry. The dedicated
accessors are preferable for automation because they omit unrelated
presentation state.

The browser smoke checks contract version, runtime readiness, catalog/time
identity, command explanations, layer authority, and both accessors.

## Focused verification

```sh
cargo fmt --all -- --check
cargo test -p add-scenario
npm --workspace @aedventure/add-domain test
npm --workspace @aedventure/add-domain run build
npm --workspace @aedventure/add-rpg run build:types
npm run smoke:add-rpg:built
npm run docs:check
```

The headless and browser adapters share the `agent_runtime_v1` schema and
stable field/ID rules. Their implementation source differs at the boundary:
the headless adapter reads `GameState`, while the browser adapter reads the
WASM `SimulationSnapshot` and the domain command projection. This keeps
Rust authoritative while allowing browser-only map mode and lifecycle
diagnostics to remain derived.
