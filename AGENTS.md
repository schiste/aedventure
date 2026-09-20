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

## Verification ladder

Use one of these three levels, from the smallest relevant loop to the full
target-stack gate:

Focused checks for ordinary granular work:

```sh
npm run agent:verify
```

For ADD gameplay, content, Rust, or ADD UI changes, use the explicit profile:

```sh
npm run agent:verify:add-ui
```

The ADD profile checks changed-code whitespace, authoritative Rust tests,
content/code generation, WASM, ADD types, and smoke syntax. It does not launch
the browser by default; set `AGENT_VERIFY_SMOKE=1` when browser smoke is
needed.

Gameplay verification before a commit or handoff:

```sh
npm run verify
```

This runs the WASM build, root TypeScript build, content checks, ADD core Rust
tests, and package tests.

The full gate is reserved for phase gates, clean stopping points, before push,
or broad cross-app/shared-engine changes:

```sh
npm run check
```

`npm run check` is a superset of `npm run verify`: it runs gameplay
verification first, then the target-stack, browser, renderer, and
infrastructure checks. The compatibility aliases `agent:verify:types`,
`agent:verify:gate`, and `verify:full` remain available, but the three levels
above are the documented ladder.

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
npm run agent:verify          # adaptive focused checks
npm run agent:verify:add-ui   # ADD gameplay-focused checks
npm run verify                # gameplay verification
npm run check                 # gameplay plus full target-stack gate
npm run agent:task             # focused result artifact/task tooling
npm run agent:report -- --format json
npm run agent:scenario -- scenarios/add/<id>.json
npm run agent:state -- --save <path>
npm run agent:verify:types    # narrow TypeScript compatibility profile
npm run agent:verify:gate     # gate compatibility profile
```
