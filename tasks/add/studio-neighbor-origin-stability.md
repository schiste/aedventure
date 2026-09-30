# No map jump when arriving beside Studio

## Player outcome

The Hero can enter the hex beside the Studio without the map, landmarks, or
characters jumping away from the camera. Travel ends on the intended hex with
the existing follow-camera movement intact.

## Authoritative layer

- Owning layer/path: apps/add-rpg/src/browser/add-phaser/add-render-context.ts
- Authoritative state or rule: `add.zone.base` supplies a stable base-zone
  coordinate; Phaser uses that coordinate for the world transform regardless
  of whether Studio tile facts are currently visible.
- Browser/domain/renderer consumers: packages/add-presentation projects the
  base zone and visibility-filtered terrain; apps/add-rpg builds render
  context and positions Phaser objects.
- Why this boundary is correct: discovery remains owned by the visibility
  projection, while world-space layout remains a renderer concern. No gameplay
  mutation or content authoring changes.

## Affected content IDs

- IDs: add.zone.base, tile.base_core, add.entity.hero.
- Families: overworld hex terrain, visibility-projected tile facts, Phaser
  character and landmark positions.
- Legacy references consulted: none.

## Acceptance scenarios

1. Given a fresh run with the Hero at `hex:6,0` and Studio at `hex:0,3`, when
   the Hero follows the shortest route to `hex:1,3`, then the Studio world
   anchor remains fixed through every travel snapshot and discovery reveal.
2. During the final move from `hex:2,3` to the Studio-adjacent `hex:1,3`, when
   Studio visibility changes, then the Hero and camera screen positions remain
   continuous and the Hero finishes on `hex:1,3` without a corrective slide.


## Focused verification

- First command: `npm run agent:verify:add-ui`.
- Additional commands: `npm --workspace @aedventure/add-rpg run build:browser`;
  `ADD_QA_TIMEOUT_SCALE=3 AGENT_ARTIFACT_DIR=/private/tmp/aedventure-studio-neighbor-gate npm run smoke:add-rpg:built`.
- Browser/screenshot/state evidence: run a clean browser session from the
  Survivor Cave to hex:1,3. Start an in-page animation-frame observer before
  the movement keypress so the complete slide and 350 ms after arrival are
  sampled even while Playwright resolves the travel dialog. Check the Hero's
  screen position, camera, Studio anchor, and destination through the reveal.
  The local preview must be rebuilt from current main.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: the built smoke route started at the Survivor
  Cave, followed the shortest path, and stopped after entering the Studio-
  adjacent hex. Its in-page animation-frame observer started before the
  movement keypress and continued 350 ms after arrival. It sampled the Studio
  world anchor on every frame and bounded consecutive Hero screen-position
  changes to 90 px. The current rerun passed.
- Focused command/result artifact: `npm run agent:verify:add-ui` passed,
  including ADD core/scenario tests, content checks, WASM, types, and smoke
  syntax. `ADD_QA_TIMEOUT_SCALE=3 npm run smoke:add-rpg:built` passed.
  `RUSTC_WRAPPER= CARGO_TARGET_DIR=/private/tmp/aedventure-check-125
  ADD_QA_TIMEOUT_SCALE=3 npm run check` passed on the current session tree,
  including the ADD and Office lanes, browser smoke, renderer QA, and
  infrastructure checks.
- Player-facing evidence: visually inspected
  /private/tmp/aedventure-studio-neighbor-gate/screenshots/add-rpg-studio-adjacent-travel-smoke.png
  and the relaunched-preview replay at
  /private/tmp/aedventure-studio-adjacent/arrive-adjacent-4.png. The Studio
  anchor remained at world position (590, 380) through the reveal and the Hero
  entered hex:1,3 without the prior snap. The root preview was rebuilt from
  d889bc6 and is serving at http://127.0.0.1:8800/app/.
- Remaining risk or explicit reason: no known risk for the reported transition.
  Active-travel viewport resizing remains the follow-up below.

## Likely follow-up

Check whether viewport resizing during active travel also needs to preserve the
current camera and interpolation transform.

## Scope guard

- Extends the existing apps/add-rpg game.
- Keeps gameplay mutation in Rust and content authoring in the declared layer.
- Adds no speculative shared infrastructure.
- Does not turn legacy/reference material into a live dependency.
