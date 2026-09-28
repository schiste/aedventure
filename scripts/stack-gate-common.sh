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

# Link every workspace package into the root `node_modules` so the bare
# `@aedventure/*` specifiers resolve for the browser bundles and the scripts
# that import them by package name.
link_workspaces() {
  mkdir -p "$ROOT_DIR/node_modules/@aedventure"
  local link
  for link in \
    "game-protocol" "game-core" "game-content" "game-topology" \
    "game-visibility" "game-world" "game-assets" "game-map" "game-input" \
    "game-renderer-phaser" \
    "add-protocol" "add-content" "add-presentation" "add-ui" \
    "add-runtime-client" \
    "office-domain" "asset-registry" "auth-wikimedia" "policy" \
    "shared-types"
  do
    ln -sfn "../../packages/$link" "$ROOT_DIR/node_modules/@aedventure/$link"
  done

  local app
  for app in add-rpg api engine-sandbox media-gateway web world-server; do
    ln -sfn "../../apps/$app" "$ROOT_DIR/node_modules/@aedventure/$app"
  done
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
