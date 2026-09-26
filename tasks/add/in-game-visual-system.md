# In-game Visual System Alignment

## Player outcome

The title-screen music control is prominent and occupies the same top-right HUD slot as the in-game music control. In play, the navigation, status, and context surfaces use the homepage's warm paper and amber colors, thin rules, rectangular geometry, and system-sans UI typography, with serif reserved for principal titles.

## Authoritative layer

- Owning layer/path: live ADD browser application, `apps/add-rpg/src/browser/main.ts` and `apps/add-rpg/src/browser/styles.css`.
- Authoritative state or rule: music preference/playback remains in the existing browser player settings and music controller; this task changes presentation and placement only.
- Browser/domain/renderer consumers: Solid-rendered title screen and ADD HUD/panels over the Phaser world.
- Why this boundary is correct: the requested outcome concerns player-facing layout and visual styling; no gameplay rule or authored content changes.

## Affected content IDs

- IDs: none.
- Families: none; presentation surfaces only (C03 status/navigation, C04 resource strip, C05 world time, C06 objective tracker, C07 selected-tile context, C08/C09 base management, C12 dungeon context, C19 settings, title-screen music control).
- Legacy references consulted: none.

## Acceptance scenarios

1. Given the title screen at desktop or mobile width, when it loads, then the full-size music control is visible at the same HUD position and with the same dimensions as during gameplay; its label remains available at narrow widths.
2. Given the player starts a game, when the map HUD appears, then the music control remains in that exact slot without shifting with variable status or resource copy, and all controls remain reachable without overlap.
3. Given the player opens a context panel or base/dungeon surface, when it renders, then panel headings, rules, borders, and status accents visibly follow the homepage type and color choices while retaining semantic discovery/base/dungeon/return colors.

## Focused verification

- First command: `npm run agent:verify:add-ui`.
- Additional command(s): Vite production build and manual browser preview at desktop and mobile dimensions.
- Browser/screenshot/state evidence, if presentation changes: title screen and in-game HUD screenshots at desktop and 320px/390px mobile widths; compare the music control bounding box between title and gameplay.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: none; this is a presentation-only change with no deterministic gameplay scenario.
- Focused command/result artifact: `npm run agent:verify:add-ui` passed: 234 add-core tests, 20 scenario tests, content/codegen, WASM, ADD TypeScript, and smoke syntax. The profile does not emit a result JSON artifact.
- Player-facing evidence (if applicable): Vite production build passed. Manual Chromium preview at 1440x900, 390x844, and 320x568 had no page errors. Title/game music bounds matched exactly at desktop (1334, 7.75, 96x30), 390px (292, 42, 92x40), and 320px (222, 42, 92x40). The 320px title no longer overlaps the music control. Screenshots were captured under `/private/tmp/aedventure-*-final.png`; preview: http://127.0.0.1:4174/app/.
- Remaining risk or explicit reason: automated browser smoke was not run because gameplay behavior did not change; manual title/game inspection covered visibility, overlap, and exact slot alignment.

## Likely follow-up

Review the remaining C01-C20 UI anatomies deliberately and track any additional homepage/game visual differences separately.

## Scope guard

- Extends the existing `apps/add-rpg` game.
- Keeps gameplay mutation in Rust and content authoring in the declared layer; no gameplay or content mutation is included.
- Adds no speculative shared infrastructure without a current consumer.
- Does not turn legacy/reference material into a live dependency.
