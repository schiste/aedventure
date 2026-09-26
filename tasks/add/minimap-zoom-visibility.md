# ADD minimap zoom visibility

## Player outcome

The strategic minimap remains visible at a stable screen position and size while the player zooms or pans the world map.

## Authoritative layer

- Owning layer/path: `apps/add-rpg/src/browser/add-phaser/add-world-scene.ts`
- Authoritative state or rule: presentation projection of known map cells plus Base, Cave, and Hero coordinates; the Rust snapshot remains gameplay authority.
- Browser/domain/renderer consumers: the ADD Phaser world scene and its current minimap overlay.
- Why this boundary is correct: camera-space composition is a renderer concern; the fix does not change visibility rules or simulation state.

## Affected content IDs

- IDs: none.
- Families: world map tiles and map landmarks.
- Legacy references consulted: none.

## Acceptance scenarios

1. Given the hex overworld with known cells, when camera zoom is at its minimum, fitted default, or maximum, then the entire minimap frame and its markers remain inside the viewport at the same screen-space inset and dimensions.
2. Given the minimap is visible, when the player pans or moves the Hero, then the minimap stays anchored and its projected known cells and Hero marker update.
3. Given a square dungeon map, when it renders, then the overworld minimap remains absent.

## Focused verification

- First command: `ADD_QA_TIMEOUT_SCALE=3 AGENT_VERIFY_SMOKE=1 npm run agent:verify:add-ui`
- Additional command(s): `npm --workspace @aedventure/add-rpg run build:browser`
- Browser/screenshot/state evidence, if presentation changes: inspect at minimum, fitted, and maximum zoom plus a narrow viewport; confirm the canvas console is clean.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: none; this presentation-only change does not mutate simulation state.
- Focused command/result artifact: ADD UI profile passed in broker session 95. It ran 234 core tests, 20 scenario tests, content/codegen, WASM, types, and built browser smoke. The browser build also passed.
- Player-facing evidence: inspected `/private/tmp/aedventure-minimap-client-default2/shot-0.png` at 1280x720 and camera zoom 1.68. Chrome DevTools captures at desktop zoom 0.55 and 2.2, and mobile 390x844, showed the same 156x156 minimap position below the top bar. Square Cave mode showed no minimap. No console errors were reported.
- Remaining risk or explicit reason: no committed pixel baseline; the smoke and captured visual states were used for acceptance.

## Likely follow-up

None expected for visibility. A separate design task can decide whether minimap markers should become interactive.

## Scope guard

- Extends the existing `apps/add-rpg` game.
- Keeps gameplay mutation in Rust and content authoring in the declared layer.
- Adds no speculative shared infrastructure.
- Does not turn legacy/reference material into a live dependency.
