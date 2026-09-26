# Quick music mute and Studio arrival

## Player outcome

Players can silence and restore the Hush Afterwards theme from the game header without changing effects volume. Opening The Studio places the Hero at its entrance and does not carry an unfinished overworld movement or camera pan into the new map.

## Authoritative layer

- Owning layer/path: browser audio preference in apps/add-rpg/src/browser/settings/settings-state.ts; projected Studio map in packages/add-presentation/src/adapters/map-modes.ts; map-change presentation cleanup in apps/add-rpg/src/browser/add-phaser/add-world-scene.ts.
- Authoritative state or rule: persisted device setting musicMuted; projected Hero entry coordinate/facing for the Studio base map; renderer clears old-map travel and camera-pan effects on active-map changes.
- Browser/domain/renderer consumers: apps/add-rpg/src/browser/main.ts, the music director, and Phaser ADD renderer.
- Why this boundary is correct: sound preference is a browser preference, while the renderer owns transient movement/camera presentation. The Studio entry is part of the browser-facing map projection and does not alter Rust gameplay state.

## Affected content IDs

- IDs: add.rpg.base.studio, new projected entity add.entity.base.hero-entry, existing add.entity.base.exit and add.entity.base.core.
- Families: audio settings; ADD map-mode projection; Phaser map presentation.
- Legacy references consulted: none.

## Acceptance scenarios

1. Given a saved settings record from before musicMuted existed, when settings load, then music remains at the configured volume and sound effects retain their existing level.
2. Given music is playing, when the header music button is pressed, then the theme gain becomes zero, the button reports muted, and global mute/SFX volume remain unchanged; pressing it again restores the configured music level.
3. Given an overworld travel pan or movement animation is still running, when the active map changes to The Studio, then the old movement/pan stops, the camera fits the Studio map, and the Hero appears at square (5, 5) facing up beside the exit.
4. Given The Studio map is reopened after switching elsewhere, when it renders, then the same entry position and camera framing are used.

## Focused verification

- First command: npm run agent:verify:add-ui
- Additional command(s): npm --workspace @aedventure/add-rpg run build:browser
- Browser/screenshot/state evidence, if presentation changes: exercise quick mute twice and open Studio during a travel transition; inspect the game screenshot plus window.render_game_to_text() for the persisted setting, Hero coord/facing, inactive movement, and final camera center.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: ADD_QA_TIMEOUT_SCALE=3 AGENT_VERIFY_SMOKE=1 npm run agent:verify:add-ui passed, including Studio Grounds entry (add.rpg.area.studio-grounds, Hero at hex:4,-2). The resulting tmp/add-rpg-studio-area-entry-smoke.png was visually inspected; the Hero is centered in the new view.
- Focused command/result artifact: ADD_QA_TIMEOUT_SCALE=3 AGENT_VERIFY_SMOKE=1 npm run agent:verify:add-ui and npm --workspace @aedventure/add-rpg run build:browser both passed.
- Player-facing evidence: a real-browser button interaction changed effective music from 0.48 to 0 while SFX stayed at 0.64; the second click restored music to 0.48. aria-pressed changed true then false. The in-game header control is visible in the browser smoke screenshots.
- Remaining risk or explicit reason: no known functional risk. The repository ADD profile and browser smoke cover the changed renderer/UI paths; the full target-stack gate is outside this granular change's verification level.

## Likely follow-up

Review broader C01–C20 anatomy decisions separately; no additional Studio map or audio infrastructure is required by this slice.

## Scope guard

- Extends the existing apps/add-rpg game.
- Keeps Rust gameplay state unchanged; browser settings and map presentation remain in their owning layers.
- Adds no speculative shared infrastructure.
- Does not make legacy/reference material a live dependency.
