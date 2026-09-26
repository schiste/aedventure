# C07 — Selected-tile context panel

## Player outcome

When the player selects a world tile, a compact bottom-right panel identifies the tile, its known terrain and exposure, the available action, its cost, and its destination. The map stays the primary surface.

## Authoritative layer

- Owning layer/path: Live ADD app presentation in `apps/add-rpg/src/browser/main.ts` and `apps/add-rpg/src/browser/styles.css`.
- Authoritative state or rule: `discoveryState().tileDetail`, derived by ADD presentation selectors; existing tile actions continue through the map controller.
- Browser/domain/renderer consumers: Browser reads the selected tile projection and renders it over the Phaser map.
- Why this boundary is correct: This adds a player-facing projection only. It introduces no gameplay mutation or duplicate tile rule.

## Affected content IDs

- IDs: none.
- Families: selected tile detail and tile action projections.
- Legacy references consulted: `docs/add-creative-direction-interface.md` §§5.1, 5.5, 5.7, 6.2; `docs/add-capability-map.md`.

## Acceptance scenarios

1. Given a visible tile is selected on World, when its projection is available, then the bottom-right panel shows its label, terrain, exposure, available action, travel cost/result, and destination.
2. Given an action is blocked or its destination cannot be entered from the Hero's position, when the panel renders, then it shows the existing blocker reason and does not present a working action.
3. Given no tile detail is selected, or the player changes into Base or Cave mode, when the context updates, then the tile panel is absent and the mode-specific context remains visible.
4. Given an enabled panel action is activated, when the event reaches the app, then the existing tile action handler performs it for the currently selected tile.

## Focused verification

- First command: `npm run agent:verify:add-ui`.
- Additional command(s): `npm --workspace @aedventure/add-rpg run build:browser`; `ADD_QA_TIMEOUT_SCALE=3 npm run smoke:add-rpg:built`.
- Browser/screenshot/state evidence, if presentation changes: ADD built smoke screenshots plus a 390×760 selected-tile viewport capture.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: none — this is a presentation-only projection; no simulation command or replay changed.
- Focused command/result artifact: `artifacts/agent-verification/20260926062359538-focused-69277/result.json` (passed; includes ADD UI profile and documentation contract).
- Player-facing evidence (if applicable): `tmp/add-rpg-selected-route-minimal-smoke.png` (desktop); `output/playwright/c07-selected-tile-mobile.png` (390×760 mobile sheet).
- Remaining risk or explicit reason: No simulation artifact applies; the existing tile projection and map-controller actions remain authoritative.

## Likely follow-up

Review the C01–C20 anatomies deliberately; keep any changes to map art or terrain authoring in separate tasks.

## Scope guard

- Extends the existing `apps/add-rpg` game.
- Keeps gameplay mutation in Rust and content authoring in their declared layers.
- Adds no shared infrastructure without a current consumer.
- Uses the existing live tile projection and does not make legacy/reference material a runtime dependency.
