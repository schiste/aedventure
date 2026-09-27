# In-game pop-in visual redesign

## Player outcome

Player-facing transient surfaces feel like part of the Aedventure homepage and world: deep field green, warm paper text, restrained amber rules, precise rectangular geometry, and serif used only for principal headings. Travel, settings, offline return, and confirmation pop-ins keep their existing information, actions, keyboard behavior, and semantic severity cues.

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
- Focused command/result artifact: `npm run agent:verify:add-ui` passed after the final CSS changes (234 add-core tests, 20 scenario tests, content/codegen, WASM, ADD TypeScript, and smoke syntax). `npm --workspace @aedventure/add-rpg run build:browser` passed.
- Player-facing evidence (if applicable): Inspected `/private/tmp/aedventure-popin-travel-desktop-final.png`, `/private/tmp/aedventure-popin-travel-mobile-final.png`, `/private/tmp/aedventure-popin-settings-desktop-final.png`, `/private/tmp/aedventure-popin-settings-mobile-final.png`, `/private/tmp/aedventure-popin-return-desktop-final.png`, and `/private/tmp/aedventure-popin-return-mobile-final.png`. Travel buttons shared one desktop row and stayed inside the mobile frame; Settings header and sections aligned at x=287 desktop and x=29 mobile; all three surfaces used a 3px corner and dark green surface. Return panel stayed within 8px of the phone viewport edges and its content remained scrollable. Escape advanced the travel warning to its acknowledgement beat. Browser console had no errors.
- Remaining risk or explicit reason: The C20 generic `ui-dialog` primitive has no current ADD call site, so its shared styling was production-built but could not be opened through an in-game route. No gameplay browser smoke suite was run because this is presentation-only; the actual travel, settings, and offline-return flows were exercised directly in Chromium.

## Likely follow-up

Continue the deliberate C01–C20 anatomy review; keep map art, cinematic media, and new gameplay behavior out of this visual pass.

## Scope guard

- Extends the existing `apps/add-rpg` game.
- Keeps gameplay mutation in Rust and authored content in its declared layer; no gameplay or content mutation is included.
- Adds no speculative shared infrastructure without a current consumer; shared visual tokens serve the three live pop-in surfaces and the existing generic dialog primitive.
- Does not turn legacy/reference material into a live dependency.
