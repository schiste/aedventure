# Agent Workflow

This repository has expensive browser, WASM, and renderer checks. Do not use the full target-stack gate as the default validation step for every granular commit.

## ADD Task Brief Contract

For ADD gameplay, content, tooling, or shared-engine work, start from
`docs/templates/add-task-brief.md` and consult `docs/add-capability-map.md`.
The brief must state the player outcome, authoritative layer, affected content
IDs, acceptance scenarios, focused verification command, and likely follow-up.
Keep gameplay mutation in `crates/add-core/`, authored IDs in
`packages/add-domain/src/content/`, and player-facing behavior in the existing
`apps/add-rpg/` application. Run `npm run docs:check` when changing the
routing documentation or task template.

## Default Verification

Use the one-command focused agent verifier before ordinary granular commits:

```sh
npm run agent:task
```

The runner classifies changed paths, records the exact checks and durations,
and writes evidence under `artifacts/agent-verification/<run-id>/`. Emit the
same contract as JSON with:

```sh
npm run agent:report -- --format json
```

For ADD app/UI-only work, the runner selects the explicit ADD profile:

```sh
npm run agent:task
```

The focused loop does not launch browser or renderer QA by default. If a real
browser smoke is needed for the current UI change, opt in explicitly:

```sh
npm run agent:task -- --smoke
```

## Full Gate

Run the full gate only at phase gates, clean stopping points, before push, or
after broad cross-app/shared-engine changes:

```sh
npm run agent:task -- --gate
```

This delegates to `npm run check` and may build WASM, build browser bundles,
launch Playwright smoke tests, and run renderer QA.

## Commit Discipline

- Prefer focused checks for small commits.
- Do not repeatedly run full Playwright/renderer QA unless the change touches
  browser rendering, responsive layout, smoke contracts, or shared engine code.
- If a focused check passes but risk is higher than usual, state the remaining
  risk and run the relevant smoke only.
- Keep local agent/runtime artifacts out of commits.
- Do not stage `.chau7/`, `tmp/`, build outputs, screenshots, or local logs.

## Useful Profiles

```sh
npm run agent:task             # adaptive focused default with a result artifact
npm run agent:report -- --format json
npm run agent:scenario -- scenarios/add/<id>.json
npm run agent:state -- --save <path>
npm run agent:verify            # alias for agent:task
npm run agent:verify:add-ui   # ADD UI-focused checks
npm run agent:verify:types    # root TypeScript build
npm run agent:verify:gate     # full expensive target-stack gate
```
