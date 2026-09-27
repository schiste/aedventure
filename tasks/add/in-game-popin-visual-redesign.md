# In-game pop-in visual redesign

## Player outcome

Player-facing transient surfaces feel like part of the Aedventure homepage and world: deep field green, warm paper text, restrained amber rules, precise rectangular geometry with the shared modest 8px UI radius, and serif used only for principal headings. Travel, settings, offline return, and confirmation pop-ins keep their existing information, actions, keyboard behavior, and semantic severity cues.

## Authoritative layer

- Owning layer/path: Live ADD browser presentation in `apps/add-rpg/src/browser/styles.css`.
- Authoritative state or rule: Existing travel, settings, offline-return, and confirmation state in the browser app; this task changes presentation only.
- Browser/domain/renderer consumers: Solid-rendered pop-ins over the Phaser world or title/game shell.
- Why this boundary is correct: The work changes player-facing visual hierarchy and responsive styling, not gameplay rules, content, or authoritative state.

## Affected content IDs

- IDs: none.
- Families: C16 travel dialog, C17 offline return, C19 settings, and the existing C20 generic dialog primitive (style only; no active ADD caller), plus shared browser overlay styles.
- Legacy references consulted: `docs/add-creative-direction-interface.md` §§3.1–3.3, 5.2, 6.1–6.2, 11.2, 11.6; `docs/add-capability-map.md`; `tasks/add/in-game-visual-system.md`.

## Acceptance scenarios

1. Given a travel confirmation opens, when it overlays the map, then it uses the homepage’s green surface, paper text, amber rule, rectangular frame, serif title, legible consequence copy, and clearly ranked actions.
2. Given the player opens Settings, when the pop-in appears, then its outer frame and section hierarchy use the shared treatment while all existing controls, focus visibility, keyboard navigation, and responsive layout remain usable. Any ADD caller mounting the generic C20 dialog receives the same shared frame.
3. Given an offline return summary appears, when the player reviews it, then the heading, return accent, facts, blockers, and next action use the shared surface language without turning each fact into a rounded card.
4. Given a reduced-motion preference or a narrow viewport, when a pop-in opens, then motion is minimized and the frame and controls remain visible without clipping or overlap.

## Focused verification

- First command: `npm run agent:verify:add-ui`.
- Additional command(s): `npm --workspace @aedventure/add-rpg run build:browser`; inspect travel, settings, and offline return in Chromium at desktop/mobile sizes; check visible bounds and console output.
- Browser/screenshot/state evidence, if presentation changes: Desktop 1280×800 and mobile 390×844 screenshots for travel confirmation, Settings, and offline return; inspect bounds, scroll regions, keyboard transition, and console errors.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: No simulation changes. Browser sequence: start a new run and skip the intro; select the adjacent hex and open Travel; open Settings from the menu; open Developer tools, trigger `Offline 1h`, then close Developer tools to inspect the player-facing return panel.
- Focused command/result artifact: `npm run agent:verify:add-ui` passed the focused Rust, content/codegen, WASM, ADD TypeScript, and smoke-syntax checks (234 core tests and 20 scenario tests). Its smoke-enabled run used the prior browser build and stopped in Studio-adjacent travel. The rebuilt browser smoke exposed that the Studio route moved to the next keypress before world-time animation settled, so its wait now requires both Hero movement and world-time animation to finish. After that adjustment, `ADD_QA_TIMEOUT_SCALE=3 npm run smoke:add-rpg:built` passed the full browser suite, including Studio continuity, Settings radius, mobile layouts, and console cleanliness. `npm --workspace @aedventure/add-rpg run build:browser` passed after the final CSS change; the full target-stack gate will run again in the pre-push hook.
- Player-facing evidence (if applicable): After the radius correction, inspected the current browser smoke captures `tmp/add-rpg-travel-dialog-smoke.png`, `tmp/add-rpg-settings-smoke.png`, `tmp/add-rpg-offline-return-smoke.png`, `tmp/add-rpg-studio-adjacent-travel-smoke.png`, and `tmp/add-rpg-travel-reveal-smoke.png`. The browser suite also exercised the travel confirmation at desktop and mobile widths; the Settings assertion verified the shared 8px radius. Earlier direct captures at 1280×800 and 390×844 verified the panel contents, scrolling, and mobile bounds before the radius token was aligned. Escape advanced the travel warning to its acknowledgement beat. Browser console had no errors.
- Remaining risk or explicit reason: The C20 generic `ui-dialog` primitive has no current ADD call site, so its shared styling was production-built but could not be opened through an in-game route. The Studio-adjacent smoke now waits for movement and world-time animation to settle, and saves a screenshot plus the last game state if movement is ever missed. No gameplay state changed.

## Likely follow-up

Continue the deliberate C01–C20 anatomy review; keep map art, cinematic media, and new gameplay behavior out of this visual pass.

## Scope guard

- Extends the existing `apps/add-rpg` game.
- Keeps gameplay mutation in Rust and authored content in its declared layer; no gameplay or content mutation is included.
- Adds no speculative shared infrastructure without a current consumer; shared visual tokens serve the three live pop-in surfaces and the existing generic dialog primitive.
- Does not turn legacy/reference material into a live dependency.
