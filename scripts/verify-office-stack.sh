#!/usr/bin/env bash
# Office / platform lane gate.
#
# Covers the customer virtual-office lane: the shared engine packages, the
# Phaser/Colyseus office app, the API, the authoritative world server, and the
# media gateway. None of it is reachable from the ADD game.
#
# This lane is not a prerequisite for ADD gameplay work. Run
# `npm run check:add` for that.

set -euo pipefail

# shellcheck source=scripts/stack-gate-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/stack-gate-common.sh"

link_workspaces
build_typescript

echo "Running game-protocol checks..."
node "$ROOT_DIR/packages/game-protocol/test/protocol.test.js"

echo "Running game-core simulation checks..."
node "$ROOT_DIR/packages/game-core/test/simulation.test.js"
node "$ROOT_DIR/packages/game-core/test/movement.test.js"

echo "Running game-topology checks..."
node "$ROOT_DIR/packages/game-topology/test/topology.test.js"

echo "Running game-visibility checks..."
node "$ROOT_DIR/packages/game-visibility/test/visibility.test.js"

echo "Running game-world checks..."
node "$ROOT_DIR/packages/game-world/test/world.test.js"

echo "Running game-assets checks..."
node "$ROOT_DIR/packages/game-assets/test/assets.test.js"

echo "Running game-map checks..."
node "$ROOT_DIR/packages/game-map/test/map.test.js"

echo "Running game-input checks..."
node "$ROOT_DIR/packages/game-input/test/input.test.js"

echo "Running game-renderer-phaser checks..."
node "$ROOT_DIR/packages/game-renderer-phaser/test/renderer-boundary.test.js"

echo "Running asset-registry checks..."
node "$ROOT_DIR/packages/asset-registry/test/catalog.test.js"
node "$ROOT_DIR/scripts/verify-internal-assets.cjs"

echo "Running Wikimedia OAuth checks..."
node "$ROOT_DIR/packages/auth-wikimedia/test/oauth-flow.test.js"

echo "Running policy checks..."
node "$ROOT_DIR/packages/policy/test/chat-policy.test.js"

echo "Running authoritative world-server checks..."
node "$ROOT_DIR/apps/world-server/test/authoritative-world.test.js"

echo "Running API auth/session checks..."
node "$ROOT_DIR/apps/api/test/authentication.test.js"
node "$ROOT_DIR/apps/api/test/controller.test.js"
node "$ROOT_DIR/apps/api/test/postgres-store.test.js"
node "$ROOT_DIR/apps/api/test/pg-executor.test.js"
node "$ROOT_DIR/apps/api/test/wikimedia-oauth-controller.test.js"
node "$ROOT_DIR/apps/api/test/routes.test.js"
node "$ROOT_DIR/apps/api/test/fetch-routes.test.js"
node "$ROOT_DIR/apps/api/test/runtime-config.test.js"
node "$ROOT_DIR/apps/api/test/world-store.test.js"
node "$ROOT_DIR/apps/api/test/permission-store.test.js"
node "$ROOT_DIR/apps/api/test/seeded-permission-resolver.test.js"

echo "Running media-gateway checks..."
node "$ROOT_DIR/apps/media-gateway/test/media-gateway.test.js"

echo "Running browser app-layer checks..."
node "$ROOT_DIR/apps/web/test/customer-office-app.test.js"
node "$ROOT_DIR/apps/web/test/adapters.test.js"

run_cross_app_contracts

echo "Building browser frontend bundle..."
npm --workspace @aedventure/web run build:browser

echo "Building engine sandbox bundle..."
npm --workspace @aedventure/engine-sandbox run build:browser

echo "Running engine sandbox smoke..."
npm run smoke:engine-sandbox:built

echo "Running office browser smoke..."
npm run smoke:office:built

echo "Running Phaser renderer QA..."
npm run qa:renderer:built

echo "Running development HTTP host checks..."
node "$ROOT_DIR/scripts/dev-http-host.test.cjs"
node "$ROOT_DIR/scripts/dev-app-loop.test.cjs"

"$ROOT_DIR/scripts/verify-infra-config.sh"

echo "Office lane verification passed."
