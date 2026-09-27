# ADD Task Brief

## Player outcome

The objective tracker remains hidden by default as configured by the player. Renderer QA can opt in through Player Settings when it needs to exercise the tracker control in a topology fixture.

## Authoritative layer

- Owning layer/path: scripts/renderer-qa.test.cjs; player preference is owned by apps/add-rpg/src/browser/settings/settings-state.ts.
- Authoritative state or rule: showObjectiveTracker defaults to false and changes only through Player Settings.
- Browser/domain/renderer consumers: the ADD browser shell renders the setting and optional objective panel; the renderer QA fixture uses the panel control after opting in.
- Why this boundary is correct: the test should follow the visible player path and preserve the authored default rather than force hidden UI to become visible.

## Affected content IDs

- IDs: none.
- Families: ADD player settings; objective tracker browser QA.
- Legacy references consulted: none.

## Acceptance scenarios

1. Given fresh player settings, when the renderer topology fixture starts, then the objective tracker is hidden.
2. Given that hidden default, when the fixture needs to test the tracker control, then it enables the option in Player Settings before interacting with the panel.

## Focused verification

- First command: npm run qa:renderer:built, after the browser build.
- Additional command(s): npm run check before publication.
- Browser/screenshot/state evidence, if presentation changes: renderer QA topology screenshots and the objective tracker’s visible state.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: none; renderer QA is browser driven.
- Focused command/result artifact: ADD_QA_TIMEOUT_SCALE=3 AGENT_ARTIFACT_DIR=/private/tmp/aedventure-renderer-fixture npm run qa:renderer:built passed; renderer report and topology captures were written to the Playwright artifact directory.
- Player-facing evidence: visually inspected add-rpg-hex-renderer-fixture-canvas.png from the renderer QA artifact directory; the map rendered and the opt-in objective tracker appeared as expected.
- Remaining risk or explicit reason: this change only corrects the renderer fixture setup; no gameplay or runtime code changed.

## Likely follow-up

Keep the renderer fixtures aligned with player-visible settings if future optional map overlays gain opt-in defaults.

## Scope guard

- Extends the existing apps/add-rpg game.
- Keeps gameplay mutation in Rust and content authoring in the declared layer.
- Adds no speculative shared infrastructure.
- Does not turn legacy/reference material into a live dependency.
