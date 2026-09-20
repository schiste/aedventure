# Hard-Fork Target Architecture

> Scope note: this target architecture is for the customer virtual-office and
> platform lane. The live ADD game remains in `apps/add-rpg` with its own Rust
> authoritative runtime and ADD architecture contract.

## 1. Target Runtime

The target architecture is a Unified TypeScript Product Layer over best-fit
infrastructure services. TypeScript should own product logic, protocol
contracts, policy decisions, and UI composition. It should not force
infrastructure choices where dedicated systems are better: LiveKit remains
Go-based media infrastructure, Postgres remains SQL durable state, and Tauri
uses Rust for a later desktop wrapper.

```text
apps/web
  Phaser 4 world renderer
  TypeScript protocol client
  vanilla HTML/TypeScript overlays for simple in-world UI
  React/Svelte remains allowed for complex admin or SaaS backoffice UI
  local input prediction only

apps/world-server
  Colyseus authoritative world server
  movement simulation
  collision
  zone permissions
  proximity
  room transitions

apps/api
  Fastify API
  Wikimedia OAuth 2.0
  local users/sessions
  roles/permissions
  durable persistence

apps/media-gateway
  LiveKit token endpoint
  media policy
  proximity subscription decisions
  coturn configuration surface

packages/protocol          # retired: unconsumed facade
  event schemas
  movement intent protocol
  chat protocol
  media protocol

packages/map-engine        # retired: unconsumed facade
  map loading
  collision model
  zones
  portals
  navigation graph

packages/auth-wikimedia
  OAuth client
  profile normalization
  group/role mapping helpers

packages/policy
  permission checks
  chat delivery policy
  media join policy later

packages/shared-types
  shared domain types

optional later wrapper
  Tauri 2 desktop shell after web MVP stabilizes
```

## 1.1 Client Rendering Strategy

The default web client should be Phaser 4 plus TypeScript.

Rendering targets:

- Orthographic office maps should prefer Phaser 4 `TilemapGPULayer` when a map
  layer uses one tileset, does not need frequent tile mutation, and fits the GPU
  layer restrictions.
- Isometric, hexagonal, highly dynamic, or multi-tileset layers should fall back
  to normal Phaser tilemap rendering or a custom renderer after profiling.
- UI overlays should start as vanilla HTML/TypeScript with Tailwind CSS v4 where
  it keeps code readable. Complex backoffice surfaces may still use React or
  Svelte if the SaaS Foundation or admin UI benefits from components, routing,
  and richer state management.

Client-side Phaser can predict movement and detect local proximity for user
experience. It must not grant room, zone, chat, or media access. Those decisions
remain server-side.

## 1.2 AI Map Generation Strategy

AI-generated maps must use a constrained semantic Map Definition Interface
rather than raw Phaser code, Tiled JSON, binary arrays, or collision matrices.

The AI generation boundary is:

```text
user prompt
  -> structured model output as MDI JSON
  -> backend MDI validation
  -> asset dictionary token-to-index translation
  -> normalized map layers, objects, zones, collisions, and semantic metadata
  -> draft map_version
  -> validation report
  -> explicit publish action
  -> Phaser client renders published compiled output
```

The model is a logical decorator. It can choose allowed semantic tokens such as
`cozy_wood`, `large_conference_table`, or `meeting_private`, but it cannot mint
new asset IDs, publish maps, create permissions, issue media credentials, or
send authoritative collision updates.

The asset dictionary is append-only and maps semantic tokens to:

- Tileset or sprite indexes.
- Object dimensions.
- Collision metadata.
- Interaction defaults.
- License status.
- AI-visible labels and descriptions.

Zones produced by AI map generation become server-side zone records. Phaser may
render or preview their bounds, but world-server/API/media-gateway policy decides
whether a player can enter, chat, or join media there.

## 2. Movement Protocol

Client sends intent:

```json
{
  "type": "move",
  "vector": { "x": 1, "y": -1 },
  "direction": "right",
  "seq": 42
}
```

Server computes:

- New position.
- Collision.
- Speed limit.
- Zone permission.
- Proximity membership.
- Room transition.

Server broadcasts state:

```json
{
  "type": "player_state",
  "playerId": "p_123",
  "x": 705,
  "y": 508,
  "anim": "adam_walk_down",
  "seqAck": 42
}
```

## 3. Auth Boundary

Wikimedia OAuth establishes external identity.

Local API creates:

- User.
- OAuth identity.
- Session.
- Roles.
- Permissions.

World server trusts only API-issued session/world tokens, never raw client
claims.

## 4. Media Boundary

The target app uses LiveKit for media.

Flow:

1. Client reports movement intent to the world server.
2. World server computes position, proximity, and zone membership.
3. World server/API decides media permission.
4. Media gateway creates a server-issued LiveKit JWT.
5. Client connects to LiveKit with that token.
6. Server policy controls which rooms/zones produce media access.

Phaser may trigger the user experience around proximity, but LiveKit access is
never opened by Phaser alone.

## 5. Persistence Boundary

Postgres owns durable state.

Colyseus owns live state only.

Valkey/Redis supports:

- Sessions/cache where appropriate.
- Pub/sub or adapters.
- Rate limits.
- Short-lived coordination.

## 6. Permission Boundary

Permissions are server-side.

The client may hide UI, but server checks decide:

- Enter room.
- Enter zone.
- Send chat.
- Receive chat.
- Join media.
- Moderate.
- Transition spaces.
- Access map/object metadata.

## 7. Desktop Boundary

Tauri 2 is a later packaging target, not a Phase 0 requirement.

Use it only after the browser MVP has stable:

- Authentication and session handling.
- World rendering and protocol client.
- Media policy flow.
- Asset loading and cache strategy.

The desktop wrapper must not introduce a second product runtime. It should wrap
the same web app and call the same backend APIs unless an explicit offline/local
feature is approved later.

## 8. Reference Notes

- Phaser 4 includes `TilemapGPULayer`, but it is WebGL-only, orthographic, and
  optimized for static single-tileset layers.
- LiveKit access tokens are JWT-based and must be generated on a backend.
- Tauri can produce small desktop apps because it uses the OS web renderer, but
  actual package size depends on platform and bundled dependencies.
