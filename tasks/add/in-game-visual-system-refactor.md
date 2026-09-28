# ADD shared visual system and primitive pass

## Player outcome

The player sees one coherent ADD interface from the title screen through World, Studio, Base, Cave, story moments, Settings, travel, and offline return. The map remains the primary surface; panels are compact and decision-led. Shared controls, rows, status, metrics, disclosures, dialogs, sheets, and tokens have one implementation so future screens can evolve consistently without copying markup or CSS.

## Authoritative layer

- Owning layer/path: Shared presentation primitives and visual tokens in `packages/add-ui/src/`; ADD screen composition and interaction wiring in `apps/add-rpg/src/browser/`.
- Authoritative state or rule: None changed. Simulation state and gameplay commands remain owned by Rust and the existing runtime client.
- Browser/domain/renderer consumers: The live `apps/add-rpg` Solid browser application, including title/menu, HUD, map context, Base/Cave panels, Settings, travel, story, and return surfaces. Phaser remains authoritative for world/map rendering.
- Why this boundary is correct: This task changes presentation and component reuse only. Shared visual elements belong in the existing ADD UI package; screen-specific composition belongs in the app; map geometry and gameplay outcomes do not move into UI.

## Affected content IDs

- IDs: None.
- Families: C01-C20 visual anatomies; title/menu shell; shared app primitives and their settings/transient consumers.
- Legacy references consulted: `docs/add-creative-direction-interface.md` §§3-6, 10-11; `docs/add-capability-map.md`; `tasks/add/in-game-visual-system.md`; `tasks/add/in-game-popin-visual-redesign.md`.

## Acceptance scenarios

1. Given the title screen and a 1280x800 gameplay viewport, when the player starts a run and changes map modes, then the screen uses the same field/paper/amber/aqua tokens, title/body type roles, control states, and spacing; the map remains visually primary.
2. Given Base or Cave mode, when the context panel is open, then headings, sections, facts, metric rows, status, actions, and disclosures use shared ADD UI primitives; Base information is grouped by decision and does not render as a mosaic of equally weighted cards.
3. Given a selected tile, story moment, travel confirmation, Settings, or offline return, when its surface opens, then its frame, heading, actions, rows, severity, focus, and close behavior use shared primitives while existing copy, state, and commands remain unchanged.
4. Given a 390x844 or 320px-wide mobile viewport, when the player visits map, Base, Cave, or an overlay, then the map remains visible behind one compact bottom sheet or modal, controls meet touch size, content scrolls inside its owning region, and nothing clips or overlaps.
5. Given keyboard navigation or a disabled/blocked action, when the player reaches a control, then shared focus and state treatments remain visible and the reason for a blocked action is readable without relying on color.
6. Given a shared primitive changes, when the ADD app is rebuilt, then all current consumers receive the same updated style without a parallel Settings or app-local primitive implementation.

## Focused verification

- First command: `npm run agent:verify:add-ui`.
- Additional command(s): `npm --workspace @aedventure/add-rpg run build:browser`; `ADD_QA_TIMEOUT_SCALE=3 npm run smoke:add-rpg:built`.
- Browser/screenshot/state evidence, if presentation changes: Inspect fresh screenshots at desktop and mobile widths for title, World/selected tile, Base, Cave, Settings, travel, story, and offline return. Review bounds, panel density, text contrast, focus/disabled states, and console errors. Keep generated captures under ignored `tmp/`.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: No gameplay or simulation state changed. The final built ADD browser smoke passed progression, Studio arrival, Base/Cave, map, travel, persistence/offline/reset, the V1 interface gate, and console cleanliness. Its objective-tracker scenario is explicitly opt-in; the player preference defaults hidden.
- Focused command/result artifact: `npm run agent:verify:add-ui` and the ADD UI package tests passed after the final Base card polish (234 core tests, 20 scenarios, content/code generation, WASM, ADD types, and smoke syntax). The production ADD browser build and `ADD_QA_TIMEOUT_SCALE=3 npm run smoke:add-rpg:built` passed after that polish. The broader `ADD_QA_TIMEOUT_SCALE=3 npm run check` passed after the renderer split, including gameplay/package tests, engine/office/ADD browser smoke, strict asset budgets, Phaser renderer QA, and infrastructure checks. After the final card styling follow-up, the focused profile, package tests, browser build, built ADD smoke, and `npm run qa:add-rpg:size:built` all passed. The QA scale extends wait budgets in this constrained environment; it does not skip assertions.
- Player-facing evidence: Inspected final captures under `tmp/`: `add-rpg-mobile-smoke.png` (title), `add-rpg-smoke.png` (cinematic), `add-rpg-resonance-smoke.png` (Base), `add-rpg-survivor-cave-entry-smoke.png` (Cave), `add-rpg-settings-smoke.png`, `add-rpg-offline-return-smoke.png`, and `add-rpg-travel-dialog-smoke.png`; browser smoke also captured mobile and world/map states.
- Remaining risk or explicit reason: The browser bundle still triggers Vite's advisory for a 1.94 MB JavaScript chunk. The final built smoke and strict asset-budget report passed after the card polish. C01/C13 world rendering remains Phaser-owned, and screen-specific compositions remain app-owned while their reusable controls, rows, facts, meters, status, cards, and surfaces use shared primitives. Future licensed art direction is separate.

## Likely follow-up

Review any new player-facing component against this primitive set before adding it. Future illustration/asset production can refine the Phaser world while keeping the map-first hierarchy and semantic palette.

## Scope guard

- Extends the existing `apps/add-rpg` game.
- Keeps gameplay mutation in Rust and content authoring in its declared layer.
- Reuses the existing `packages/add-ui` consumer and current primitives; no speculative second component library.
- Does not turn legacy/reference material into a live dependency.
