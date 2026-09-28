#!/usr/bin/env bash
# ADD game lane gate.
#
# This is the gate an ADD developer runs. It covers `apps/add-rpg`,
# `crates/add-*`, and `packages/add-*` only — no office browser bundles, no
# unrelated API or world-server test files.
#
# The Rust step runs `cargo test --workspace`, not `cargo check`. That is
# load-bearing: `crates/add-scenario` holds the only deterministic multi-step
# playthroughs in the repository, including
# `committed_idle_loop_scenario_matches_the_core_contract`, which is the
# contract `README.md` names as the definition of a complete gameplay change.
# Under `cargo check` that crate was compiled and never executed, so a genuine
# regression in the critical path stayed red on `main` undetected.
#
# `scripts/multi-app-qa-contracts.test.cjs` asserts the `cargo test` line below,
# so the regression cannot be reintroduced silently.

set -euo pipefail

# shellcheck source=scripts/stack-gate-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/stack-gate-common.sh"

echo "Running gameplay verification..."
npm run verify

check_workspace_graph
build_typescript

echo "Building ADD RPG WASM runtime..."
node "$ROOT_DIR/scripts/build-add-rpg-wasm.cjs"

echo "Running ADD domain adapter checks..."
node "$ROOT_DIR/packages/add-runtime-client/test/adapters.test.js"

echo "Running ADD Rust tests..."
# `--workspace` rather than `-p add-core`: the scenario, replay, and
# runtime-inspection crates are part of the ADD lane and must stay executable.
cargo test --workspace --manifest-path "$ROOT_DIR/Cargo.toml"

run_cross_app_contracts

echo "Building ADD RPG bundle..."
npm --workspace @aedventure/add-rpg run build:browser

echo "Testing the ADD RPG pure helpers..."
# These live in `main.ts` until recently, which meant a unit test of
# `hexRouteDistance` required booting the whole app. Now that they are modules,
# the test is plain node against the build output the step above just produced.
node "$ROOT_DIR/apps/add-rpg/test/add-cells.test.js"

echo "Running ADD RPG smoke..."
npm run smoke:add-rpg:built

echo "Checking ADD RPG frame budgets against a real browser..."
# The `phaser.*` budgets in performance/add-budgets.json were previously only
# ever compared against literal numbers in a hand-written trace fixture, so they
# could not fail on a regression and no gate ran them. This measures real frame
# cadence in the built app in Chromium and exits non-zero on a breach. It reuses
# the bundle the smoke just exercised, so it costs no extra build.
npm run qa:add-rpg:perf

echo "Checking ADD RPG asset budgets..."
# The WASM had been over its budget on main for some time and nobody saw it,
# because this check existed but nothing ran it.
npm run qa:add-rpg:size:built

echo "ADD lane verification passed."
