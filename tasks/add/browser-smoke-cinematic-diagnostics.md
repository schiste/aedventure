# Opening Cinematic Smoke Diagnostics

## Player outcome

No gameplay behavior changes. When the opening fails to clear, the smoke output identifies what is visible and whether Skip attempts reached the page, so a real playback problem can be corrected from evidence.

## Authoritative layer

- Owning layer/path: ADD player-facing QA helper in scripts/app-qa-contracts.cjs.
- Authoritative state or rule: CinematicState in crates/add-core/src/state.rs; playback and Skip commands remain authoritative in the Rust simulation.
- Browser/domain/renderer consumers: the browser smoke observes the cinematic stage, Skip button, visible text, and telemetry snapshot.
- Why this boundary is correct: the helper reports browser evidence and does not change game state or duplicate cinematic rules.

## Affected content IDs

- IDs: cinematic.intro.
- Families: Cinematics.
- Legacy references consulted: none.

## Acceptance scenarios

1. Given a skippable opening cinematic, when Skip succeeds, the helper returns after two consecutive observations without the stage.
2. Given the stage does not clear before the configured deadline, when the helper fails, its error reports the number and outcome of Skip attempts, stage and button visibility, active cinematic ID and beat, and visible page text.

## Focused verification

- First command: npm run qa:contracts.
- Additional command(s): ADD_QA_TIMEOUT_SCALE=3 npm run smoke:add-rpg:built.
- Browser/screenshot/state evidence, if presentation changes: no presentation change; the smoke report and failure diagnostic text are the evidence.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: the full built ADD RPG browser smoke passed,
  including launch and cinematic dismissal.
- Focused command/result artifact: `npm run qa:contracts` passed after
  screenshot fixtures were precomputed outside the timed callback;
  `ADD_QA_TIMEOUT_SCALE=3 npm run smoke:add-rpg:built` passed; the complete
  `npm run check` passed on the current session tree.
- Player-facing evidence (if applicable): none; this is test diagnostics only.
- Remaining risk or explicit reason: the timeout diagnostic is only emitted on
  failure; this successful run verifies the normal Skip path, not the failure
  message formatting.

## Likely follow-up

If the failure diagnostic shows the Rust cinematic remains active after a successful Skip click, fix the command/snapshot flow in the owning runtime boundary. If the button cannot be clicked, repair the browser interaction or layout with the captured evidence.

## Scope guard

- Extends the existing apps/add-rpg game by improving its QA contract only.
- Keeps cinematic mutation authoritative in Rust.
- Adds no shared engine infrastructure.
- Adds no live dependency on legacy/reference material.
