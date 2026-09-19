# ADD Player-Facing Visual and Interaction QA

> Scope note: this document covers the live ADD game in `apps/add-rpg/`. The
> office/platform lane and `apps/engine-sandbox/` retain their own QA contracts;
> they are not alternate ADD player surfaces.

Phase 5 makes the existing ADD browser smoke inspectable as a repeatable
player-facing contract. The smoke remains the product check. The committed
fixture manifest adds stable names, state assertions, semantic DOM hooks, and
screenshot evidence without moving gameplay authority into the browser.

## Where does this change belong?

| Change | Owning layer | First check |
| --- | --- | --- |
| New gameplay result, save field, or availability rule | `crates/add-core/` | `cargo test -p add-core` |
| New content or story ID | `packages/add-domain/src/content/` | `npm run content:check` |
| New state/action explanation | `packages/add-domain/src/runtime/` or `src/adapters/` | `npm --workspace @aedventure/add-domain test` |
| New player-facing selector, action hook, or screenshot fixture | `apps/add-rpg/src/browser/` and `scenarios/add/browser-fixtures.json` | `npm run qa:add-rpg:phase5:built` |
| Neutral renderer behavior | `packages/game-*` plus a real consumer | `npm run qa:renderer:built` |

The browser may expose authoritative state and derived explanations for QA, but
it must not infer whether a gameplay command is available. The `data-action-id`
attributes mirror IDs from the runtime/domain projection or identify a stable
presentation control; they do not execute a second rules model.

## Fixture contract

The versioned manifest is
[`scenarios/add/browser-fixtures.json`](../scenarios/add/browser-fixtures.json).
It is validated by the multi-app QA contract and consumed by the ADD smoke.

| Fixture | Flow | State evidence | Visual surface |
| --- | --- | --- | --- |
| `add.boot` | Runtime boot | Rust/WASM readiness, snapshot/catalog delivery, map readiness, camera, hover/select | Full ADD app |
| `add.idle` | Idle clock | auto-tick, stable presentation clock, current action | Full ADD app |
| `add.map` | Map interaction | overworld hex mode, selected cell, camera, map affordance count | Full ADD app |
| `add.canonical-idle-loop` | Canonical idle loop | the live travel endpoint, Studio arrival handoff, Base availability, completed Studio restoration | Full ADD app at the Studio handoff |
| `add.story-choice` | Story-choice availability | active beat, awaiting-choice state, enabled `story-choice:` IDs, blocker explanation | Full ADD app with story browser open |
| `add.save-load` | Save/export/import | save schema/catalog versions, payload, autosave and import readiness | Developer save surface in the app |
| `add.offline-return` | Offline return | elapsed time, changed systems, blockers, next action, collapsed objective | Offline return panel |

Every fixture records the selected canonical state paths, assertion results, DOM
selector/action-ID inventory, screenshot dimensions, and a screenshot SHA-256
in `phase5-report.json`. The report is written under the agent artifact
directory when one is provided, or under `tmp/` for a direct local run.

## Stable browser hooks

Important surfaces use `data-qa` values from the `add-browser-qa-v1` contract:

```text
[data-qa=add-app]
[data-qa=map-stage]
[data-qa=status-bar]
[data-qa=objective-tracker]
[data-qa=map-controls]
[data-qa=story-browser]
[data-qa=story-commands]
[data-qa=save-tools]
[data-qa=travel-dialog]
[data-qa=offline-return]
```

Important controls expose stable `data-action-id` values, including:

```text
time.toggle-speed
map.zoom.in / map.zoom.out
map.open.<mode>
save.export / save.load-autosave / save.import
offline.catchup.1h / offline-return.dismiss
story-choice:<beat-id>:<choice-id>
```

Use these hooks in browser checks. Classes and visible copy are presentation
details and should not be the only way to find a control.

## Commands

```sh
# Build the live ADD app and run all Phase 5 fixtures.
npm run qa:add-rpg:phase5

# Run the fixture flow against an already-built ADD app.
npm run qa:add-rpg:phase5:built

# Compare the generated evidence with reviewed visual baselines.
npm run qa:add-rpg:visual -- --artifact-dir tmp

# Run the broader existing ADD player smoke directly.
npm run smoke:add-rpg

# Run renderer checks, including ADD hex/square map contracts.
npm run qa:renderer:built
```

The normal agent loop remains focused by default. Use
`npm run agent:task -- --smoke` when a changed ADD surface needs the browser,
and reserve `npm run agent:task -- --gate` for the expensive phase gate.

## Visual-diff policy

Baseline metadata lives in
[`scenarios/add/fixtures/browser/visual-baselines.json`](../scenarios/add/fixtures/browser/visual-baselines.json).
The baseline directory is intentionally empty until a human reviews the first
run. `qa:add-rpg:visual` reports that state as `review-required`; it does not
silently bless a new image.

When a reviewed image changes:

1. Run the Phase 5 fixture flow and inspect the screenshot and its state in
   `phase5-report.json`.
2. Promote only the named fixture with a concrete reason:

   ```sh
   npm run qa:add-rpg:visual -- --artifact-dir tmp \
     --update --scenario add.map \
     --reason "Map affordance moved with the camera framing update"
   ```

3. Commit the baseline PNG and metadata together with the code change. The
   metadata preserves the smoke scenario, reason, and state digest. A changed
   baseline without that evidence fails the check.

The policy intentionally separates “the state contract passed” from “the
image is approved.” A screenshot cannot make an incorrect runtime state pass,
and a state-only pass cannot hide an accidental player-facing regression.

## Failure workflow

On a state or DOM failure, use the fixture ID in the smoke output and inspect
the corresponding report entry first. It contains the first failed assertion,
the actual selected state paths, missing selector/action ID, and the screenshot
that was produced before the failure. Re-run the smallest relevant command:

```sh
npm run qa:add-rpg:phase5:built
npm run qa:add-rpg:visual -- --artifact-dir tmp
```

If the failure is gameplay state, move the rule to Rust/domain ownership and
add or update a headless scenario. If it is a player surface, update the ADD
browser hook or fixture while keeping the same authoritative state path.
