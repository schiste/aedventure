#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${1:-focused}"

usage() {
  cat <<'EOF'
Usage: scripts/agent-verify.sh [focused|add-ui|types|gate|help]

Profiles:
  focused  Cheap default for granular commits. Auto-detects touched files.
  add-ui   ADD gameplay-focused checks: Rust/content/WASM/types, optional smoke.
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

changed_code_paths() {
  while IFS= read -r path; do
    case "$path" in
      *.cjs|*.css|*.h|*.hpp|*.html|*.js|*.json|*.mjs|*.rs|*.sh|*.sql|*.toml|*.ts|*.tsx|*.yaml|*.yml|\
      Cargo.lock|Cargo.toml|package-lock.json|package.json|tsconfig.json|tsconfig.*.json)
        printf '%s\n' "$path"
        ;;
    esac
  done < <(changed_files)
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
  local -a paths=()
  local path
  while IFS= read -r path; do
    [[ -n "$path" ]] && paths+=("$path")
  done < <(changed_code_paths)
  if (( ${#paths[@]} == 0 )); then
    echo "No changed code paths; skipping whitespace check."
    return
  fi
  run git -C "$ROOT_DIR" diff --check -- "${paths[@]}"
  run git -C "$ROOT_DIR" diff --cached --check -- "${paths[@]}"
}

add_ui_checks() {
  diff_check
  run cargo test -p add-core
  # Cheap, and it is the contract `README.md` calls the definition of a complete
  # gameplay change. It is here because a content or balance edit can move a
  # checkpoint, and nothing else in this profile would notice.
  run cargo test -p add-scenario
  run npm run content:check
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
  # Authored content counts as ADD work. `packages/add-content/` used to be
  # missing from this list, so a content edit fell through to the second branch
  # and got `tsc -b` alone — no content validation, no generated-catalog drift
  # check, no gameplay test.
  if has_changed_match '^(apps/add-rpg/|packages/add-(content|presentation|protocol|ui|runtime-client)/|scripts/add-rpg-smoke\.test\.cjs|scripts/(build-add-content|add-content-|narrative-lint)|crates/add-|package\.json|package-lock\.json|tsconfig\.json)'; then
    echo "Detected ADD/app-layer changes; running ADD gameplay-focused checks."
    add_ui_checks
    return
  fi

  if has_changed_match '\.(ts|tsx|js|cjs|mjs|json)$|^(apps/|packages/|scripts/)'; then
    echo "Detected code/config changes; running root TypeScript focused checks."
    types_check
    return
  fi

  diff_check
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
