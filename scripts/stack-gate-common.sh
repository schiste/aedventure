#!/usr/bin/env bash
# Shared prelude for the split target-stack gates.
#
# The repository runs two products that happen to share a TypeScript build:
# `apps/add-rpg` (the live ADD game) and the office/platform lane under
# `apps/web`, `apps/api`, `apps/world-server`, and `apps/media-gateway`. They
# were verified by one ~156-line script, which meant an ADD developer running
# the documented pre-push gate paid to build three unrelated browser bundles and
# execute two dozen office-lane test files before a single ADD check ran.
#
# The lane gates source this file for the parts that are genuinely shared: the
# workspace links, the TypeScript build, and the cross-app QA contracts. See
# `scripts/verify-add-stack.sh` and `scripts/verify-office-stack.sh`.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export ROOT_DIR

# Resolve the workspace TypeScript compiler.
#
# There is deliberately no fallback to `legacy/skyoffice-original/node_modules`.
# That fallback type-checked the live game against an unrelated project's
# compiler version, so a broken root install silently changed what "verified"
# meant instead of failing.
resolve_typescript() {
  if [[ -x "$ROOT_DIR/node_modules/.bin/tsc" ]]; then
    TSC="$ROOT_DIR/node_modules/.bin/tsc"
  else
    echo "Missing TypeScript compiler. Run npm install at the repository root." >&2
    exit 1
  fi
}

# The workspace packages are linked by npm itself.
#
# This function used to `ln -sfn` every package into `node_modules/@aedventure`.
# It was a third hand-maintained copy of the dependency graph, listed 20 of the
# 22 packages, and was wrong about that: it was missing `game-animation` and
# `game-dungeon`, and it did not list `add-ui` at all even though the app
# imports it. It only ever appeared to be needed because the gates ran from a
# checkout whose `node_modules` was produced by `npm install`, which already
# does exactly this.
#
# `package.json` declares `workspaces: ["apps/*", "packages/*"]`, so there is one
# mechanism and one place to add a package. `npm ci` is the gate's precondition;
# if the links are missing, that is an install problem and should fail as one.
#
# `scripts/check-workspace-graph.cjs` checks the two lists that remain — the
# tsconfig path map and the Vite alias map — against the real workspace
# directories, so those two cannot drift apart either.
check_workspace_graph() {
  node "$ROOT_DIR/scripts/check-workspace-graph.cjs"
}

build_typescript() {
  resolve_typescript
  "$TSC" -b "$ROOT_DIR/tsconfig.json"
}

# Cross-app QA contracts assert the *shape* of the gates (which scripts exist,
# which fragments they contain). They are shared because they describe the
# relationship between the two lanes, not either lane's behaviour.
run_cross_app_contracts() {
  echo "Running multi-app QA contract checks..."
  npm run qa:contracts
  npm run qa:multi-app
}
