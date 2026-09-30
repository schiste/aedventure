# ADD Primary Product Focus and Office Archive

## Player outcome

Starting the repository's normal local build and preview opens the existing ADD
game. The former office app is clearly labeled as an archive and is available
only through an explicit preview command.

## Authoritative layer

- Owning layer/path: root package scripts, `apps/add-rpg/`, `apps/web/`,
  `scripts/dev-http-host.cjs`, `README.md`, and `AGENTS.md`.
- Authoritative state or rule: no gameplay state changes; the root build and
  preview scripts select the primary app.
- Browser/domain/renderer consumers: the ADD browser app is the default local
  preview; the office browser app remains an opt-in archive preview.
- Why this boundary is correct: product focus is expressed at repository
  entrypoints and workflow guidance, while each app retains its own source.

## Affected content IDs

- IDs: none.
- Families: none; no authored game content changes.
- Legacy references consulted: `apps/web/`, `docs/engine-boundary.md`, and
  the office/platform planning documents.

## Acceptance scenarios

1. Given the repository root, when a developer runs `npm run build` and
   `npm run dev:http`, then the built ADD game is served at
   `http://127.0.0.1:8787/app/`.
2. Given an explicit archive preview request, when a developer runs
   `npm run office:dev:http`, then the preserved office app and local service
   routes are served at `http://127.0.0.1:8788/app`.
3. Given a new task without an explicit office revival request, then
   repository guidance routes new product work to ADD.

## Focused verification

- First command: `npm run build`.
- Additional command: `npm run docs:check`.
- Browser/screenshot/state evidence: request the default preview URL and
  confirm it serves the ADD title screen; office preview is checked only when
  archive changes require it.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: none; no gameplay transition changed.
- Focused command/result artifact: `npm run build`, `npm run office:build`,
  `npm run docs:check`, and `git diff --check` passed. The full pre-push
  `ADD_QA_TIMEOUT_SCALE=3 npm run check` passed, including ADD browser smoke,
  performance/size gates, office maintenance, and renderer QA.
- Player-facing evidence: `http://127.0.0.1:8800/app/` returned HTTP 200 and
  the page title is ADD RPG; the game screen itself did not change.
- Remaining risk or explicit reason: the full browser smoke exercised the ADD
  bundle through its QA host; the root preview process was checked by HTTP and
  page title only. The source archive and its CI maintenance lane remain.

## Likely follow-up

If the office product is explicitly revived, decide whether to reactivate its
roadmap and CI gate. Physical deletion or migration of the archived source is
outside this task.

## Scope guard

- Extends the existing `apps/add-rpg/` app as the default entry.
- Does not change gameplay mutation or authored content.
- Adds no shared engine infrastructure.
- Keeps the office app and its services out of the live ADD dependency path.
