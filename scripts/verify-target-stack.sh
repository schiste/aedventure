#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Running gameplay verification..."
npm run verify

if [[ -x "$ROOT_DIR/node_modules/.bin/tsc" ]]; then
  TSC="$ROOT_DIR/node_modules/.bin/tsc"
elif [[ -x "$ROOT_DIR/legacy/skyoffice-original/node_modules/.bin/tsc" ]]; then
  TSC="$ROOT_DIR/legacy/skyoffice-original/node_modules/.bin/tsc"
else
  echo "Missing TypeScript compiler. Run npm install at the repository root." >&2
  exit 1
fi

echo "Building ADD RPG WASM runtime..."
node "$ROOT_DIR/scripts/build-add-rpg-wasm.cjs"

echo "Building target TypeScript workspace..."
"$TSC" -b "$ROOT_DIR/tsconfig.json"

mkdir -p "$ROOT_DIR/node_modules/@aedventure"
ln -sfn "../../packages/protocol" "$ROOT_DIR/node_modules/@aedventure/protocol"
ln -sfn "../../packages/game-protocol" "$ROOT_DIR/node_modules/@aedventure/game-protocol"
ln -sfn "../../packages/game-core" "$ROOT_DIR/node_modules/@aedventure/game-core"
ln -sfn "../../packages/game-content" "$ROOT_DIR/node_modules/@aedventure/game-content"
ln -sfn "../../packages/game-topology" "$ROOT_DIR/node_modules/@aedventure/game-topology"
ln -sfn "../../packages/game-visibility" "$ROOT_DIR/node_modules/@aedventure/game-visibility"
ln -sfn "../../packages/game-world" "$ROOT_DIR/node_modules/@aedventure/game-world"
ln -sfn "../../packages/add-protocol" "$ROOT_DIR/node_modules/@aedventure/add-protocol"
ln -sfn "../../packages/add-content" "$ROOT_DIR/node_modules/@aedventure/add-content"
ln -sfn "../../packages/add-presentation" "$ROOT_DIR/node_modules/@aedventure/add-presentation"
ln -sfn "../../packages/add-runtime-client" "$ROOT_DIR/node_modules/@aedventure/add-runtime-client"
ln -sfn "../../packages/map-engine" "$ROOT_DIR/node_modules/@aedventure/map-engine"
ln -sfn "../../packages/game-assets" "$ROOT_DIR/node_modules/@aedventure/game-assets"
ln -sfn "../../packages/game-map" "$ROOT_DIR/node_modules/@aedventure/game-map"
ln -sfn "../../packages/game-input" "$ROOT_DIR/node_modules/@aedventure/game-input"
ln -sfn "../../packages/game-renderer-phaser" "$ROOT_DIR/node_modules/@aedventure/game-renderer-phaser"
ln -sfn "../../packages/office-domain" "$ROOT_DIR/node_modules/@aedventure/office-domain"
ln -sfn "../../packages/asset-registry" "$ROOT_DIR/node_modules/@aedventure/asset-registry"
ln -sfn "../../packages/auth-wikimedia" "$ROOT_DIR/node_modules/@aedventure/auth-wikimedia"
ln -sfn "../../packages/policy" "$ROOT_DIR/node_modules/@aedventure/policy"
ln -sfn "../../packages/shared-types" "$ROOT_DIR/node_modules/@aedventure/shared-types"
ln -sfn "../../apps/add-rpg" "$ROOT_DIR/node_modules/@aedventure/add-rpg"
ln -sfn "../../apps/api" "$ROOT_DIR/node_modules/@aedventure/api"
ln -sfn "../../apps/engine-sandbox" "$ROOT_DIR/node_modules/@aedventure/engine-sandbox"
ln -sfn "../../apps/media-gateway" "$ROOT_DIR/node_modules/@aedventure/media-gateway"
ln -sfn "../../apps/web" "$ROOT_DIR/node_modules/@aedventure/web"
ln -sfn "../../apps/world-server" "$ROOT_DIR/node_modules/@aedventure/world-server"

echo "Running game-protocol checks..."
node "$ROOT_DIR/packages/game-protocol/test/protocol.test.js"

echo "Running game-core simulation checks..."
node "$ROOT_DIR/packages/game-core/test/simulation.test.js"

echo "Running game-topology checks..."
node "$ROOT_DIR/packages/game-topology/test/topology.test.js"

echo "Running game-visibility checks..."
node "$ROOT_DIR/packages/game-visibility/test/visibility.test.js"

echo "Running game-world checks..."
node "$ROOT_DIR/packages/game-world/test/world.test.js"

echo "Running ADD domain adapter checks..."
node "$ROOT_DIR/packages/add-runtime-client/test/adapters.test.js"

echo "Running map-engine movement checks..."
node "$ROOT_DIR/packages/map-engine/test/movement.test.js"

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

echo "Running ADD Rust cargo check..."
cargo check --manifest-path "$ROOT_DIR/Cargo.toml"

echo "Running browser app-layer checks..."
node "$ROOT_DIR/apps/web/test/customer-office-app.test.js"
node "$ROOT_DIR/apps/web/test/adapters.test.js"

echo "Running multi-app QA contract checks..."
npm run qa:multi-app

echo "Building browser frontend bundle..."
npm --workspace @aedventure/web run build:browser

echo "Building engine sandbox bundle..."
npm --workspace @aedventure/engine-sandbox run build:browser

echo "Building ADD RPG bundle..."
npm --workspace @aedventure/add-rpg run build:browser

echo "Running engine sandbox smoke..."
npm run smoke:engine-sandbox:built

echo "Running ADD RPG smoke..."
npm run smoke:add-rpg:built

echo "Running office browser smoke..."
npm run smoke:office:built

echo "Running Phaser renderer QA..."
npm run qa:renderer:built

echo "Running development HTTP host checks..."
node "$ROOT_DIR/scripts/dev-http-host.test.cjs"
node "$ROOT_DIR/scripts/dev-app-loop.test.cjs"

"$ROOT_DIR/scripts/verify-infra-config.sh"

echo "Target stack verification passed."
