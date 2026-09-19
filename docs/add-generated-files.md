# ADD Generated Files and Write-Capable Checks

Status: implemented Phase 6 contract for the live ADD game.

> Scope note: this document covers `apps/add-rpg`, `crates/add-core`,
> `packages/add-domain`, and the ADD tooling under `scenarios/add` and
> `scripts`. Office/platform outputs and `legacy/add` follow their own
> contracts and are not generated inputs to the ADD runtime.

The machine-readable companion is [`performance/generated-files.json`](../performance/generated-files.json).
The checker is `npm run generated:check`; it is intentionally read-only.

## Where does this change belong?

| Change | Owning layer | First check |
| --- | --- | --- |
| Gameplay rule or persisted state | `crates/add-core/` | `cargo test -p add-core` |
| Authored content ID or balance | `packages/add-domain/src/content/` | `npm run content:check` |
| Browser runtime seam or presentation | `apps/add-rpg/src/` | `npm run agent:verify:add-ui` |
| Performance budget or report schema | `performance/` and `scripts/` | `npm run qa:add-rpg:performance` |
| Generated-output contract | `performance/generated-files.json` and this document | `npm run generated:check` |

Generated output is never a new gameplay authority. When an output disagrees
with its source, fix the source or generator, then regenerate and verify the
result.

## Generated outputs

| Output | Source of truth | Producer | No-drift or focused check | Tracked? |
| --- | --- | --- | --- | --- |
| `crates/add-core/src/game_data/catalog/*.rs` | `packages/add-domain/src/content/*.ts` | `npm run content:build` | `npm run content:check` | Yes |
| `scenarios/add/fixtures/content/*.json` | ADD authored content and registry | `npm run content:fixtures` | `npm run content:fixtures:check` | Yes |
| `apps/add-rpg/src/generated/wasm/add-web-bindings/` | `crates/add-web-bindings/` | `npm run wasm:build:add` | `npm run agent:verify:add-ui` | No; ignored build output |
| `apps/add-rpg/dist-app/` | `apps/add-rpg/src/` and generated WASM | `npm --workspace @aedventure/add-rpg run build:browser` | `npm run qa:add-rpg:size:built` | No; ignored build output |
| `packages/*/dist/` | TypeScript package source and project references | `tsc -b` | `npm run agent:verify:types` | No; ignored build output |
| `apps/*/dist/` | TypeScript app source and project references | `tsc -b` | `npm run agent:verify:types` | No; ignored build output |
| `target/` | Rust crates | `cargo build` or `cargo test` | `cargo test -p add-core` | No; ignored build output |
| `artifacts/agent-verification/<run-id>/` | A command invocation | `npm run agent:task` | `npm run agent:report -- --format json` | No; local evidence |

The authoritative content/codegen chain is:

```text
packages/add-domain/src/content/*.ts
  -> npm run content:build
  -> crates/add-core/src/game_data/catalog/*.rs
  -> cargo test -p add-core / npm run content:check
```

The browser chain is:

```text
crates/add-web-bindings/
  -> npm run wasm:build:add
  -> apps/add-rpg/src/generated/wasm/add-web-bindings/
  -> npm --workspace @aedventure/add-rpg run build:browser
  -> apps/add-rpg/dist-app/
```

## Write-capable checks

These commands can write generated or local evidence. Run them only with a
worktree that is allowed to receive those outputs:

| Command | Writes | Source changes expected? |
| --- | --- | --- |
| `npm run content:build` | Checked-in Rust catalogs and TypeScript build output | Yes, generated catalogs |
| `npm run content:fixtures` | Checked-in ADD content fixtures and build output | Yes, generated fixtures |
| `npm run wasm:build:add` | Ignored WASM bindings and build output | No source changes |
| `npm run build` | WASM, TypeScript, browser bundles, and build output | No source changes |
| `npm run qa:add-rpg:phase5` | Browser build output and smoke artifacts | No source changes |
| `npm run qa:add-rpg:size` | Browser build output and a size report | No source changes |
| `npm run qa:add-rpg:trace` | A trace report under `tmp/` or `AGENT_ARTIFACT_DIR` | No source changes |
| `npm run agent:task` | `artifacts/agent-verification/<run-id>/` and child build output | No source changes by policy |
| `npm run lore:render` | Lore render output | Scope-specific; see lore docs |

`npm run content:check`, `npm run content:fixtures:check`,
`npm run generated:check`, and `npm run qa:add-rpg:size:built` are the preferred
read-only/no-source-drift checks. TypeScript and content checks may still
refresh ignored `dist/` or `*.tsbuildinfo` files because the compiler is part
of the check.

## Performance evidence policy

`performance/add-budgets.json` and the committed fixture
`scenarios/add/fixtures/performance/trace-v1.ndjson` are source-controlled
contracts. Captured traces, normalized reports, screenshots, and size reports
are evidence, not source; write them to `tmp/`, `logs/`, or
`artifacts/agent-verification/<run-id>/`.

Trace records use `add-trace-v1`. Reports use stable report IDs and include the
budget ID, measured samples, status, failure hints, and the input trace or
build paths. Missing live samples are `review-required` by default and become
failures under `--strict`.

To capture a live dev trace, run `npm --workspace @aedventure/add-rpg run
dev:browser`, exercise the target flow at `http://127.0.0.1:5176/app/`, then
pass the emitted `logs/session-<id>.jsonl` to
`npm run qa:add-rpg:trace -- --trace logs/session-<id>.jsonl`. The Vite trace
sink is dev-only and retains local traces for a bounded period.

## Focused verification

```sh
npm run generated:check
npm run qa:add-rpg:trace:test
npm run qa:add-rpg:trace:fixture
npm run qa:add-rpg:size:test
npm run qa:add-rpg:performance
```

Use `npm run qa:add-rpg:size:built` when the browser has already been built.
Use `npm run qa:add-rpg:trace -- --trace <path>` to inspect a captured NDJSON
trace without booting the browser.
