# Phase 0 Hard-Fork Reset Plan

> Scope note: this reset plan applies to the customer virtual-office/platform
> lane and its imported SkyOffice reference. It is not an ADD game plan.

The broader multi-phase execution plan lives in
`docs/development-rollout-plan.md`.

## 1. Purpose

Phase 0 is a hard-fork reset. It is not a feature sprint and it is not a design
polish pass.

The goal is to stop building on the risky parts of SkyOffice and rebuild the
core architecture before product features resume.

SkyOffice remains useful as a reference for:

- Phaser scene structure.
- Colyseus room concepts.
- Basic room/player/computer/whiteboard interaction ideas.
- The map-based virtual office metaphor.
- Some UI interaction patterns.

SkyOffice must not remain authoritative for:

- Authentication.
- Movement protocol.
- Media.
- Permissions.
- Persistence.
- Asset licensing.
- Deployment architecture.

## 2. Hard Line

Forking is acceptable only if the first month is mostly deletion and
replacement.

Bad path:

```text
Fork SkyOffice
Add Wikimedia OAuth
Add more rooms
Add better graphics
Keep PeerJS
Keep client-position updates
Keep bundled assets
```

Good path:

```text
Fork SkyOffice
Stabilize build
Remove risky assets
Replace auth
Replace movement protocol
Replace media layer
Add persistence
Then build product features
```

## 3. Repository Strategy

Target structure:

```text
legacy/
  skyoffice-original/

apps/
  web/
  world-server/
  api/
  media-gateway/

packages/
  protocol/
  asset-registry/
  map-engine/
  auth-wikimedia/
  shared-types/

infra/
  docker-compose.yml
```

Current status:

- `legacy/skyoffice-original/` contains the imported SkyOffice subtree.
- `apps/*` and `packages/*` are scaffolded as target destinations.
- `packages/asset-registry/` defines semantic visual asset tokens while keeping
  legacy SkyOffice art as development-only references.
- Feature work is frozen until hard-fork gates pass.

## 4. Target Architecture

Target stack principle:

- Use a Unified TypeScript Product Layer for app logic, shared protocol,
  policies, API controllers, world simulation, and UI/client code.
- Keep best-fit infrastructure where it belongs: Postgres for durable state,
  Valkey for ephemeral coordination, LiveKit/coturn for media, and S3-compatible
  object storage for assets.
- Do not describe the system as "all TypeScript"; describe it as
  "TypeScript-first product code over proven infrastructure services."

Target stack:

- Phaser 4 world renderer.
- Vanilla HTML/TypeScript overlays for simple in-world UI.
- React or Svelte remains allowed for complex admin/SaaS backoffice surfaces.
- Colyseus authoritative world server.
- Fastify API server.
- Wikimedia OAuth 2.0.
- Local PostgreSQL-backed user/session model.
- PostgreSQL durable state.
- Valkey/Redis for ephemeral coordination and queues.
- LiveKit for WebRTC SFU.
- coturn for TURN fallback.
- S3-compatible asset storage.
- Docker Compose for local full-stack boot.
- Tauri 2 desktop wrapper later, after the web MVP stabilizes.
- AGPL-3.0-or-later for new app code.
- MIT notices preserved for inherited SkyOffice code.

Client rendering notes:

- Prefer Phaser 4 `TilemapGPULayer` for orthographic static map layers that fit
  its constraints.
- Do not assume `TilemapGPULayer` solves isometric, hexagonal, dynamic, or
  multi-tileset maps.
- Phaser may improve local user experience, but server-side world/API/media
  policy remains the authority.

AI map-generation notes:

- Future AI map generation should use a strict Map Definition Interface instead
  of asking the model for Phaser code, Tiled JSON, tile buffers, or collision
  matrices.
- The backend must validate MDI output, translate semantic tokens through an
  asset dictionary, generate normalized map data, and store a draft map version.
- AI-generated zones must become server-side policy zones. The client can render
  them, but cannot directly grant media access or update authoritative collision.
- Phase 0 may define schemas, package boundaries, and fixtures for future MDI
  work, but it must not implement live prompt-to-map generation.

AI map-generation development rollout:

1. Define MDI schema and fixture examples.
2. Define append-only asset dictionary shape and license fields.
3. Build deterministic token validation before any model call.
4. Build deterministic MDI-to-normalized-map compiler.
5. Add validation reports and draft map-version persistence.
6. Add admin preview.
7. Add structured-output model integration behind a feature flag.
8. Add publish workflow, audit logging, tenant limits, and rollback.

SkyOffice is MIT-licensed upstream. New app code may be AGPL-3.0-or-later, but
reused SkyOffice code must preserve original copyright and MIT notices.

## 5. Week Plan

### Week 1: Stabilize, Cut, Audit, Freeze

Goals:

- Make baseline build reproducible.
- Keep SkyOffice only as legacy reference.
- Remove non-essential features from the target plan.
- Audit licenses.
- Freeze feature work.

Required outputs:

- Legacy build verification script.
- License audit.
- Root license policy.
- Hard-fork directory structure.
- CI target plan.
- List of code to keep, delete, or replace.

Week 1 gates:

- Build is reproducible.
- Tests/verification command exists.
- License mismatch is documented.
- Bundled asset risk is documented.
- No product features are added.

### Week 2: Auth, Persistence, Authoritative Movement

Goals:

- Replace password-only room auth.
- Add Wikimedia OAuth 2.0 flow.
- Add local users, identities, and sessions.
- Add PostgreSQL schema.
- Replace client-authoritative movement with server-authoritative movement.

Required outputs:

- `oauth_identities` table.
- `users` table.
- `sessions` table.
- `spaces`, `rooms`, `maps`, `map_versions` tables.
- Movement intent protocol.
- Server-side movement simulation.
- Collision checks.
- Speed limit checks.
- Zone permission checks.
- Room transition checks.

Week 2 gates:

- Wikimedia OAuth login works.
- Local session cookie works.
- Postgres user/session model exists.
- Client no longer sends authoritative `x/y`.
- Server validates movement.

### Week 3-4: Media, Protocol, Permissions

Goals:

- Replace PeerJS with LiveKit/coturn plan and first integration.
- Define clean client/server protocol.
- Establish minimal server-side permission enforcement.
- Move chat delivery rules server-side.

Required outputs:

- LiveKit token endpoint.
- coturn local config.
- Media room policy.
- Protocol package.
- Minimal permission resource model for runtime enforcement.
- Role mapping.
- Chat delivery policy.
- Moderation event model.

Week 3-4 gates:

- PeerJS removed from target app.
- LiveKit migration plan is committed.
- Server-issued LiveKit tokens exist.
- Protocol package owns movement/chat/media events.
- Chat delivery is server-filtered.
- Runtime permissions are server-enforced for room/zone access.
- Full role/RBAC management is deferred to the SaaS/control-plane phase.

## 6. Immediate Refactors

### 6.1 Movement

This is non-negotiable.

Legacy SkyOffice currently accepts:

```json
{ "x": 705, "y": 500, "anim": "adam_walk_down" }
```

The target client sends:

```json
{ "type": "move", "vector": { "x": 1, "y": -1 }, "direction": "right", "seq": 42 }
```

The server computes:

- New position.
- Collision.
- Speed limit.
- Zone permission.
- Proximity.
- Room transition.

The client may predict locally for feel, but the server is authoritative.

### 6.2 Auth

Legacy room-password auth must be replaced.

Target:

- Wikimedia OAuth 2.0 authorization-code flow.
- Local user table.
- Local session cookie.
- Role mapping.
- Room permissions.
- Moderation state.

Wikimedia API docs currently point app credential creation to OAuth 2.0
credentials and redirect URI registration. They also note PKCE requirements for
browser/mobile/desktop flows and secret handling requirements. See:

- https://api.wikimedia.org/wiki/Managing_API_keys
- https://api.wikimedia.org/wiki/Security

### 6.3 Media

Legacy PeerJS must not remain the final media layer.

Target:

- LiveKit.
- coturn.
- Server-issued LiveKit tokens.
- Server-controlled proximity subscriptions.

LiveKit is open source, Apache-2.0, provides a WebRTC SFU, supports JWT
authentication, TURN connectivity, Docker/Kubernetes deployment, and selective
subscription. See:

- https://github.com/livekit/livekit
- https://docs.livekit.io/concepts/authentication/

### 6.4 Persistence

Postgres is required immediately.

Tables:

- `users`
- `spaces`
- `rooms`
- `maps`
- `map_versions`
- `room_memberships`
- `roles`
- `permissions`
- `moderation_events`
- `assets`
- `oauth_identities`
- `sessions`

Colyseus manages live state. Postgres manages durable product state.

### 6.5 Chat

Legacy broadcast-to-everyone chat must be replaced with server delivery rules.

Chat modes:

- Public room chat.
- Proximity chat.
- Private zone chat.
- Moderator announcements.
- Direct messages later.

Proximity is a permission boundary, not a UI filter.

### 6.6 Assets

Bundled non-open assets must be removed from the final target app.

Required:

- Remove bundled non-open assets.
- Replace with CC0, CC-BY, or GPL-compatible assets.
- Create asset license manifest.
- Keep art separate from engine.

Legacy SkyOffice credits LimeZu assets. Those assets must be treated as
development-only until legally cleared. They are not compatible with a fully
open-source distribution if redistribution restrictions apply.

## 7. Keep / Delete / Replace

Keep:

- Phaser scene structure.
- Colyseus as realtime room layer.
- Basic room/player/computer/whiteboard concepts.
- Some UI interaction patterns.
- Map-based virtual office metaphor.

Delete or replace:

- PeerJS.
- Client-authoritative movement.
- Password-only room auth.
- Hard-coded computers/whiteboards.
- Non-open bundled assets.
- In-memory-only platform model.
- Old dependency setup.
- Deployment assumptions.

## 8. Acceptance Gates

Continue with the fork only if these are true after the first serious refactor
sprint:

- Build is reproducible.
- Tests run in CI.
- No non-open assets remain bundled in the target app.
- Wikimedia OAuth login works.
- Postgres user/session model exists.
- Client no longer sends authoritative `x/y`.
- Server validates movement.
- Chat delivery is server-filtered.
- LiveKit migration plan is committed.
- Docker Compose boots the full stack.

## 9. Feature Freeze

No new product features until the hard-fork gates pass.

Frozen work includes:

- New rooms.
- Admin features.
- Design polish.
- Enterprise meeting integrations.
- AI features.
- Broadcast mode.
- Tauri desktop packaging.
- Production AI map generation.
- Tenant customization UI.

Exceptions:

- Build verification.
- License audit.
- Auth replacement.
- Persistence.
- Movement protocol.
- Media replacement.
- Runtime permission enforcement boundary.
- CI and Docker Compose.
- Schema and documentation work that prepares future AI map generation.
