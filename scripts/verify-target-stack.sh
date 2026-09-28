#!/usr/bin/env bash
# Full target-stack verification: both lanes.
#
# This is the phase-gate / pre-push entry point and is unchanged in behaviour —
# it still verifies everything `npm run check` always verified. The work is now
# split so that a developer working on one product can run only that lane:
#
#   scripts/verify-target-stack.sh          both lanes (default)
#   scripts/verify-target-stack.sh add      ADD game only
#   scripts/verify-target-stack.sh office   office / platform only
#
# `npm run check`, `npm run check:add`, and `npm run check:office` are the
# documented entry points for those three modes.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROFILE="${1:-all}"

case "$PROFILE" in
  add)
    exec "$SCRIPT_DIR/verify-add-stack.sh"
    ;;
  office)
    exec "$SCRIPT_DIR/verify-office-stack.sh"
    ;;
  all)
    echo "=== ADD lane ==="
    "$SCRIPT_DIR/verify-add-stack.sh"
    echo
    echo "=== Office lane ==="
    "$SCRIPT_DIR/verify-office-stack.sh"
    echo
    echo "Target stack verification passed."
    ;;
  *)
    echo "Unknown profile '$PROFILE'. Use: add | office | all" >&2
    exit 2
    ;;
esac
