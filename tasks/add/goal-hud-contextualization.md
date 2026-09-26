# ADD Task Brief: Hide the Goal HUD

## Player outcome

The map opens without a floating goal checklist competing with the world. Players can reveal the tracker from Settings if they want it.

## Authoritative layer

- Owning layer/path: `apps/add-rpg/src/browser/settings/settings-state.ts` for the device-level visibility preference; `apps/add-rpg/src/browser/main.ts` for rendering.
- Authoritative state or rule: `showObjectiveTracker` controls only whether the goal overlay is shown. Objective and dungeon progression remain authoritative in the Rust/WASM snapshot.
- Browser/domain/renderer consumers: the Solid browser shell hides or shows the objective panel; runtime text reports its visibility.
- Why this boundary is correct: showing an interface element is a player preference, not gameplay state. No objective, story, or simulation rules change.

## Affected content IDs

- IDs: none.
- Families: none; the display references existing first-playable and dungeon objective state.
- Legacy references consulted: the current `first-playable-panel`, compact objective tracker, and dungeon objective overlay.

## Acceptance scenarios

1. Given fresh or older settings without an explicit visibility preference, when the game opens, then the objective tracker is hidden and its runtime report says `visible: false`.
2. Given the tracker is hidden, when the player chooses Show in Settings, then the panel appears and the preference is saved; choosing Hide removes it again.
3. Given the tracker is hidden, when the first-playable route or dungeon objective changes, then objective progression and current-action behavior continue normally.

## Focused verification

- First command: `npm run agent:verify:add-ui`.
- Additional command(s): web-game Playwright client on the local app plus a focused show/hide/persistence browser check.
- Browser/screenshot/state evidence, if presentation changes: desktop and mobile gameplay screenshots with the default hidden state, plus runtime `questPanel.visible` and settings toggle evidence.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: headless Chromium verified hidden-by-default, show/hide, and reload persistence; current route action remained available.
- Focused command/result artifact: `npm run agent:verify:add-ui` passed (core/scenario tests, content checks, WASM, ADD types, smoke syntax); `npm --workspace @aedventure/add-rpg run build:browser` passed.
- Player-facing evidence (if applicable): visually inspected `/private/tmp/aedv-goal-hud-desktop.png` (1440x900) and `/private/tmp/aedv-goal-hud-mobile.png` (390x844); both show no tracker, and runtime reports `questPanel.visible: false`.
- Remaining risk or explicit reason: the shared `scripts/add-rpg-smoke.test.cjs` currently asserts the old visible-by-default state and is held by a stale session's uncommitted WIP lease, so the broad browser smoke was not run or edited. No gameplay/content IDs changed.

## Likely follow-up

Replace the generic tracker with small cues attached to meaningful objects and story moments, such as route landmarks, arrivals, and interactions. Keep that follow-up contextual to the live world instead of restoring a permanent floating checklist.

## Scope guard

- Extends the existing `apps/add-rpg` game.
- Keeps gameplay mutation in Rust and content authoring in their declared layers; this UI visibility preference does not mutate gameplay.
- Adds no speculative shared infrastructure without a current consumer.
- Adds no legacy or reference material as a live dependency.
