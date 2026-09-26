# Recover title-screen save choice and context-panel stability

## Player outcome

On a fresh page load, the player can choose whether to start a new run or load
the saved run. Live context panels remain visible and steady while runtime state
updates, and Settings reports the rectangular shape it actually uses.

## Authoritative layer

- Owning layer/path: `apps/add-rpg/src/browser/main.ts`,
  `apps/add-rpg/src/browser/add-telemetry-presenter.ts`,
  `apps/add-rpg/src/browser/styles.css`, and the ADD browser smoke contract.
- Authoritative state or rule: Rust remains authoritative for simulation and
  save imports. The browser reads the local autosave for display and imports it
  only after the player chooses Load.
- Browser/domain/renderer consumers: the existing title-screen actions,
  runtime bridge, live context panels, Settings telemetry, and browser smoke.
- Why this boundary is correct: these changes govern browser startup and
  presentation; they do not alter simulation rules, save schema, or content.

## Affected content IDs

- IDs: none.
- Families: browser save/load flow, Settings presentation metadata, Discovery,
  Base, Dungeon, and offline-return panels.
- Legacy references consulted: none.

## Acceptance scenarios

1. Given a stored autosave, when the page opens, then the title screen stays
   open without importing the save or running its offline catch-up; choosing
   New starts fresh, while choosing Load imports the stored save and its
   catch-up.
2. Given a live context panel, when its runtime state refreshes, then it remains
   visible without an entrance animation replay. Settings telemetry says
   `rectangular_window`, and the rendered panel has no clip path and an 8px
   radius.
3. Given fresh settings, the objective tracker stays hidden on desktop and
   mobile until the player enables it in Settings; the smoke enables it only
   for its drag, collapse, and progression checks.

## Focused verification

- First command: `npm run agent:verify:add-ui`.
- Additional command(s): `ADD_QA_TIMEOUT_SCALE=3 node
  scripts/add-rpg-smoke.test.cjs` against the built app.
- Browser/screenshot/state evidence, if presentation changes: run the
  develop-web-game Playwright client through title-screen load/new-game flows
  and inspect the gameplay and Settings screenshots.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: none; simulation authority and scenario fixtures
  are unchanged.
- Focused command/result artifact: `npm run agent:verify:add-ui` passed via
  Aethyme's session executor; 234 core tests and 20 scenario tests passed, as
  did content validation, WASM build, TypeScript, and smoke syntax.
- Player-facing evidence: the built Playwright smoke passed with
  `ADD_QA_TIMEOUT_SCALE=3`, including New, explicit Load with offline catch-up,
  hidden-by-default tracker, Settings opt-in, and mobile layout. Screenshots
  were visually inspected from `/private/tmp/aedventure-session109-artifacts/screenshots`.
- Remaining risk: none identified in the covered browser flows.

## Likely follow-up

Continue connecting HUD cues to world objects and story moments as a separate
design task. Broad dependency upgrades from the stale worktree remain outside
this recovery.

## Scope guard

- Extends the existing `apps/add-rpg` game.
- Leaves gameplay mutation in Rust and content IDs unchanged.
- Adds no speculative shared infrastructure or legacy dependencies.
