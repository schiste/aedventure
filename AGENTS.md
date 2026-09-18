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

Use the focused agent verifier before ordinary granular commits:

```sh
npm run agent:verify
```

For ADD app/UI-only work, use the explicit ADD profile:

```sh
npm run agent:verify:add-ui
```

The ADD profile runs focused checks:

- `git diff --check`
- ADD content and Rust/WASM generation
- `npm --workspace @aedventure/add-rpg run build:types`
- `node --check scripts/add-rpg-smoke.test.cjs`

If a real browser smoke is needed for the current UI change, opt in:

```sh
AGENT_VERIFY_SMOKE=1 npm run agent:verify:add-ui
```

## Full Gate

Run the full gate only at phase gates, clean stopping points, before push, or
after broad cross-app/shared-engine changes:

```sh
npm run agent:verify:gate
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
npm run agent:verify          # adaptive focused default
npm run agent:verify:add-ui   # ADD UI-focused checks
npm run agent:verify:types    # root TypeScript build
npm run agent:verify:gate     # full expensive target-stack gate
```
