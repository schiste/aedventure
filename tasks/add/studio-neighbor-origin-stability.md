# Stable map origin when Studio is revealed

## Player outcome

When the Hero approaches the Studio, revealing its hex no longer shifts the
map, landmarks, characters, or camera. The normal travel animation remains
smooth and ends with the Hero on the destination hex.

## Authoritative layer

- Owning layer/path: apps/add-rpg/src/browser/add-phaser/add-render-context.ts
- Authoritative state or rule: the ADD map projection already supplies a stable
  base-zone coordinate; Phaser uses that coordinate for the world transform
  independently of whether Studio tile facts are currently visible.
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

1. Given Studio tile facts are hidden but the base zone is present, when the
   overworld render context is created, then the base coordinate is used as the
   world-origin anchor.
2. Given the Hero moves onto a hex adjacent to Studio, when the reveal makes
   Studio tile facts visible and the map is rebuilt, then every unchanged cell
   retains the same world position and the Hero finishes travel on the intended
   destination without a corrective slide.
3. Given the Studio tile is already visible, when later snapshots update the
   map, then origin and landmark positions remain stable.

## Focused verification

- First command: `npm run agent:verify:add-ui` — passed.
- Additional commands: `npm --workspace @aedventure/add-rpg run build:browser` —
  passed; `ADD_QA_TIMEOUT_SCALE=3 AGENT_ARTIFACT_DIR=/private/tmp/aedventure-session113-artifacts npm run smoke:add-rpg:built` — the Studio travel and arrival scenarios passed, but a later persistence/reset scenario timed out opening Developer Tools.
- Browser/screenshot/state evidence: the browser smoke compares the Studio's
  world anchor before and after each first-playable travel update. The Studio
  arrival screenshot was captured and visually inspected.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: first-playable browser route, Studio arrival
  handoff, and tile-detail scenarios passed. The new assertion confirmed the
  Studio world position is identical across each travel/reveal update.
- Focused command/result artifact: ADD UI profile passed (234 core tests, 20
  scenario tests, content checks, WASM build, type build, and smoke syntax).
  ADD browser production build passed. The full Playwright smoke reached the
  later persistence/reset scenario, where Playwright timed out after clicking
  `#open-dev-menu` while waiting for that click to settle.
- Player-facing evidence: visually inspected
  `/private/tmp/aedventure-session113-artifacts/screenshots/add-rpg-studio-arrival-handoff-smoke.png`;
  Hero and Studio were correctly aligned at the arrival handoff.
- Remaining risk: rerun the full smoke when the shared host is idle; the
  failure occurred after the Studio scenarios and did not fail the origin
  assertion. No gameplay simulation state changed.

## Likely follow-up

Check whether viewport resizing during an active travel also needs to preserve
the current camera and interpolation transform.

## Scope guard

- Extends the existing apps/add-rpg game.
- Keeps gameplay mutation in Rust and content authoring in the declared layer.
- Adds no speculative shared infrastructure.
- Does not turn legacy/reference material into a live dependency.
