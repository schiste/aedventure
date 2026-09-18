#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${1:-focused}"

usage() {
  cat <<'EOF'
Usage: scripts/agent-verify.sh [focused|add-ui|types|gate|help]

Profiles:
  focused  Cheap default for granular commits. Auto-detects touched files.
  add-ui   ADD UI-focused checks: typecheck + smoke syntax, optional built smoke.
  types    Root TypeScript build only.
  gate     Full target-stack gate. Expensive; use at phase gates or before push.

Environment:
  AGENT_VERIFY_SMOKE=1  Also run npm run smoke:add-rpg:built in add-ui/focused.

Default agent workflow:
  - Use focused/add-ui before granular commits.
  - Use gate only for phase gates, broad refactors, or before push.
EOF
}

run() {
  echo "+ $*"
  "$@"
}

changed_files() {
  {
    git -C "$ROOT_DIR" diff --name-only
    git -C "$ROOT_DIR" diff --cached --name-only
    git -C "$ROOT_DIR" ls-files --others --exclude-standard
  } | sort -u
}

has_changed_match() {
  local pattern="$1"
  changed_files | grep -E "$pattern" >/dev/null
}

tsc_bin() {
  if [[ -x "$ROOT_DIR/node_modules/.bin/tsc" ]]; then
    printf '%s\n' "$ROOT_DIR/node_modules/.bin/tsc"
    return
  fi
  echo "Missing TypeScript compiler. Run npm install at the repository root." >&2
  exit 1
}

diff_check() {
  run git -C "$ROOT_DIR" diff --check
  run git -C "$ROOT_DIR" diff --cached --check
}

add_ui_checks() {
  diff_check
  run npm run wasm:build:add
  run npm --workspace @aedventure/add-rpg run build:types
  run node --check "$ROOT_DIR/scripts/add-rpg-smoke.test.cjs"

  if [[ "${AGENT_VERIFY_SMOKE:-0}" == "1" ]]; then
    run npm run smoke:add-rpg:built
  else
    echo "Skipping ADD Playwright smoke by default. Set AGENT_VERIFY_SMOKE=1 to run it."
  fi
}

types_check() {
  diff_check
  run npm run wasm:build:add
  run "$(tsc_bin)" -b "$ROOT_DIR/tsconfig.json"
}

focused_checks() {
  diff_check

  if has_changed_match '^(apps/add-rpg/|packages/add-domain/|scripts/add-rpg-smoke\.test\.cjs|crates/add-|package\.json|package-lock\.json|tsconfig\.json)'; then
    echo "Detected ADD/app-layer changes; running ADD UI focused checks."
    add_ui_checks
    return
  fi

  if has_changed_match '\.(ts|tsx|js|cjs|mjs|json)$|^(apps/|packages/|scripts/)'; then
    echo "Detected code/config changes; running root TypeScript focused checks."
    types_check
    return
  fi

  echo "No TypeScript/app changes detected; focused verification complete."
}

case "$PROFILE" in
  focused)
    focused_checks
    ;;
  add-ui)
    add_ui_checks
    ;;
  types)
    types_check
    ;;
  gate)
    run npm run check
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
