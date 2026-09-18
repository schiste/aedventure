# Development Rollout Plan

> Scope note: this is the customer virtual-office/platform rollout plan. It is
> not the ADD game roadmap, and its statement that the browser app is not yet
> product-shaped applies to the office lane only. The live ADD game is
> documented in [ADD Canonical Architecture and Code Audit](add-canonical-architecture.md)
> and [ADD Systems Parity Audit](add-systems-parity-audit.md).

This document turns the product specification into an execution plan. It is the
operational companion to the global spec and Phase 0 hard-fork plan.

## 1. Rollout Principles

- Ship in narrow, verified slices with granular commits.
- Keep the browser app first. Desktop packaging, broadcast mode, and enterprise
  meeting integrations come later.
- Keep product logic TypeScript-first, while using best-fit infrastructure for
  persistence, media, cache, and asset storage.
- Treat the server as authoritative for identity, movement, permissions, chat,
  collisions, zones, media access, and map publication.
- Focus the next implementation phase on the customer app layer. Full role/RBAC
  management, role administration UI, and SaaS control-plane synchronization are
  deferred to later phases.
- Add AI map generation only after deterministic schemas, compilers, validators,
  persistence, and preview workflows exist without an LLM.
- Do not add product polish on top of legacy SkyOffice architecture.

## 2. Workstreams

### Runtime Foundation

Owns:

- Workspace build and verification.
- Package boundaries.
- Docker Compose shared services.
- CI readiness.
- Release checks.

Current state:

- Target TypeScript workspace exists.
- Target verification script exists.
- Local shared-infra skeleton exists.
- Legacy SkyOffice baseline check exists.

Next gates:

- Add CI wiring for `scripts/verify-target-stack.sh`.
- Add app runtime entrypoints only after API/world/web servers are real.
- Add Dockerfiles after each app has a stable start command.

### Identity And Control Plane

Owns:

- Wikimedia OAuth.
- Local users, sessions, OAuth identities.
- Session and world-token issuance.
- Later SaaS Foundation identity bridge.
- Later tenant ownership and role management.

Current state:

- Wikimedia OAuth flow helper exists.
- API OAuth controller exists.
- Session model exists.
- World tokens derive roles and permissions server-side.

Next gates:

- Wire Fastify runtime.
- Wire real Postgres `pg` pool.
- Add OAuth state store backed by Valkey or signed server-side session storage.
- Keep role/RBAC administration deferred until the SaaS Foundation bridge phase.

### World And Realtime

Owns:

- Authoritative movement.
- Colyseus room controller.
- World admission.
- Proximity.
- Chat delivery policy.
- Room transitions.

Current state:

- Movement intent protocol exists.
- Server-authoritative simulation exists.
- World token admission exists.
- Server-filtered chat policy exists.

Next gates:

- Replace any remaining legacy client-position assumptions in the target app.
- Persist room/map lookup before live room boot.
- Add proximity media decisions from world state.
- Add load tests after the first browser MVP.

### Media

Owns:

- LiveKit token issuance.
- coturn configuration.
- Media zones.
- Proximity subscriptions.
- Large-room strategy later.

Current state:

- Media gateway policy foundation exists.
- Local LiveKit/coturn infra skeleton exists.

Next gates:

- Wire media gateway to API/world permission decisions.
- Generate real LiveKit JWTs using backend-held secrets.
- Keep Jitsi/Google Meet/Teams/Zoom integrations deferred until core media flow
  is stable.

### Durable World Data

Owns:

- Spaces.
- Rooms.
- Maps.
- Map versions.
- Asset dictionary.
- Visual asset registry and semantic token IDs.
- Minimal permission resolution needed for runtime world admission.
- Moderation/audit events.

Current state:

- Postgres schema exists.
- Postgres API store adapter exists.
- World map store boundary exists.
- Persistent RBAC store boundary exists.
- Starter visual asset registry exists with SkyOffice assets marked as
  development-only references.

Next gates:

- Add concrete DB migrations runner.
- Add repository tests for tenant isolation.
- Replace reference-only visual tokens with approved target assets before
  bundling art in the customer app.
- Add audit events for map publishing and AI generation later.
- Do not build RBAC management workflows until the control-plane phase.

### Browser Client

Owns:

- Phaser 4 renderer.
- TypeScript protocol client.
- Vanilla HTML/TypeScript in-world overlays.
- Tailwind CSS v4 where useful.
- Optional React/Svelte only for complex admin/backoffice surfaces.
- Target-approved visual asset loading through the shared asset registry.

Current state:

- The office browser app is intentionally not yet product-shaped.

Next gates:

- Build a minimal browser MVP that connects to API/world-server.
- Render a fixture map.
- Use semantic visual tokens rather than hard-coded legacy asset paths.
- Send movement intents only.
- Receive authoritative player state.
- Join media only with server-issued tokens.
- Use fixture or seeded permissions for the app-layer MVP; do not build role
  management UI here.

### AI Map Generation

Owns:

- Map Definition Interface.
- Asset dictionary.
- Token-to-index compiler.
- Map validation reports.
- Draft map versions.
- Admin preview.
- Structured-output model integration.

Current state:

- Architecture and phase rollout are documented.
- Starter semantic visual asset catalog exists.
- Production prompt-to-map generation is frozen until later phases.

Next gates:

- Define MDI JSON Schema and fixtures.
- Build deterministic compiler without model calls using semantic visual tokens.
- Validate generated collision, zones, and spawn safety.
- Store compiled output as draft map versions.
- Add model calls behind a tenant feature flag.

## 3. Phase Rollout

### Phase 0: Hard-Fork Reset

Status:

- In progress, mostly foundation work.

Allowed work:

- Build verification.
- Legacy preservation.
- Protocol replacement.
- Auth replacement.
- Persistence boundaries.
- Runtime permission enforcement boundary.
- Media replacement foundation.
- Infra skeleton.
- AI map-generation schema planning only.

Exit gates:

- Target stack verification passes.
- Legacy baseline verification passes.
- World tokens are server-derived.
- Movement is intent-based and server-authoritative.
- Chat delivery is server-filtered.
- Postgres persistence boundaries exist.
- LiveKit/coturn migration path is committed.
- No production feature work is added to legacy architecture.

### Phase 1: Browser Customer App MVP

Goal:

Build the first usable customer virtual office app on the refactored stack.

Scope:

- Browser-first Phaser 4 client.
- Login/session flow.
- World-server connection.
- Map fixture rendering.
- Server-authoritative movement.
- Presence.
- Basic chat.
- Basic media zone prototype.
- Simple HTML/TypeScript overlays.
- Fixture or seeded access rules sufficient to exercise world admission, chat,
  and media zones.

Out of scope:

- Tauri desktop wrapper.
- Full backoffice.
- Role/RBAC management UI.
- SaaS Foundation role synchronization.
- Live AI map generation.
- Broadcast mode.
- Enterprise meeting integrations.

Exit gates:

- A user can log in, enter a world, move, see another user, chat according to
  server policy, and join a media zone with a server-issued token.
- The client never submits authoritative position, collision, roles, or
  permissions.
- Access can be seeded or fixture-backed as long as server-side enforcement is
  preserved.

### Phase 2: SaaS Foundation Bridge

Goal:

Connect the customer app to tenant/user/role management from the control plane.

Scope:

- Tenant identity bridge.
- SaaS Foundation user mapping.
- Role and permission synchronization.
- Role/RBAC management workflows.
- Role administration UI or integration with the SaaS Foundation backoffice.
- Tenant/world ownership.
- Admin access boundary.

Exit gates:

- Tenant users can be authorized into the customer app through the control
  plane.
- World-token issuance uses resolved tenant permissions.
- Tenant isolation tests exist.

### Phase 3: Persistent Worlds

Goal:

Replace fixture and hard-coded world state with tenant-scoped durable data.

Scope:

- World, floor, room, map, object, zone, portal, and spawn APIs.
- Map version persistence.
- Asset dictionary persistence.
- Validation reports.
- Audit events for high-risk map changes.

Exit gates:

- Worlds load from Postgres.
- Published map versions are immutable.
- Draft map changes do not affect live rooms until published.
- Rollback path exists.

### Phase 4: Tenant Customization

Goal:

Allow tenants to customize workspace behavior and branding without code.

Scope:

- Tenant-specific worlds.
- Branding.
- Room and zone permissions.
- Guest access.
- Media policy settings.
- Usage limits.

Exit gates:

- Tenant admins can configure basic workspace behavior without developer
  changes.
- RBAC protects customization actions.
- Changes are audited.

### Phase 5: World Management UI

Goal:

Give tenant admins practical visual management tools.

Scope:

- World list/detail.
- Map/object/zone management.
- Validation report view.
- Publish/rollback flow.
- MDI preview for hand-authored or imported drafts.

Exit gates:

- Admins can inspect and validate map drafts.
- Publishing requires permission and passes validation.
- The UI does not bypass backend validation.

### Phase 6: AI Map Generation And Agent APIs

Goal:

Enable AI agents and prompt-to-map generation safely.

Scope:

- MDI schema.
- Asset dictionary exposure.
- Deterministic compiler.
- Validation reports.
- Draft map-generation API.
- Structured-output model integration behind feature flags.
- Agent action audit logs.

Development order:

1. Schema and fixtures.
2. Asset dictionary validation.
3. Deterministic compiler.
4. Map validation reports.
5. Draft persistence.
6. Admin preview.
7. Model integration behind feature flag.
8. Tenant limits, audit, rollback, and abuse controls.

Exit gates:

- Unknown tokens are rejected.
- Invalid layouts are rejected.
- Model output cannot publish maps directly.
- Generated maps are drafts until an authorized publish action.
- Clients cannot update authoritative collision, zones, permissions, or media
  policies.

### Phase 7: Enterprise Meeting Integrations

Goal:

Support tenants that already use Google Meet, Teams, or Zoom.

Scope:

- Provider settings.
- Meeting launch policies.
- Provider-specific permission mapping.
- Audit and token handling.

Exit gates:

- Integrations are tenant-configurable.
- Provider credentials are encrypted.
- LiveKit remains the default built-in media path.

### Phase 8: Broadcast And Large Rooms

Goal:

Support town halls and large events without making every viewer a full meeting
participant.

Scope:

- Presenter stage.
- Broadcast viewer mode.
- Moderated Q&A promotion.
- Temporary small-room interactions.
- Usage metering.

Exit gates:

- Viewers consume broadcast-style media efficiently.
- Q&A promotion is moderated and audited.
- Broadcast mode does not weaken room permissions.

### Phase 9: Commercial Asset Cleanup

Goal:

Prepare for public commercial/open-source launch.

Scope:

- Commercial-safe default tilesets.
- Commercial-safe avatars.
- Tenant asset library.
- License manifest enforcement.
- Public launch art pack.

Exit gates:

- Target app bundles only cleared assets.
- Asset dictionary includes license status.
- Uncleared legacy assets remain quarantined.

## 4. Release Process

Every feature slice should follow this order:

1. Update or add focused tests/fixtures.
2. Implement the smallest useful boundary.
3. Run `scripts/verify-target-stack.sh`.
4. Run `SKIP_INSTALL=1 scripts/verify-skyoffice-baseline.sh` when touching
   fork boundaries, build tooling, or shared assumptions.
5. Commit with a narrow message.
6. Keep unrelated refactors out of the slice.

Feature flags are required for:

- AI model calls.
- Tauri packaging.
- Broadcast mode.
- Enterprise meeting integrations.
- Any tenant-facing beta admin UI.

## 5. Promotion Rules

Local-only:

- Works with fixtures and in-memory adapters.
- No tenant data.
- No external provider credentials.

Internal preview:

- Uses Postgres/Valkey/LiveKit locally or in a dev environment.
- Has audit logs for high-risk actions.
- Is behind feature flags.

Tenant beta:

- Has RBAC enforcement.
- Has rollback for map changes.
- Has basic observability.
- Has documented limits.

Production:

- Has tenant isolation tests.
- Has backup/restore expectations.
- Has secret management.
- Has cost controls for media and AI usage.
- Has asset license checks.

## 6. Stop Conditions

Stop and reassess before continuing if:

- Client-side code becomes authoritative for movement, collision, permissions, or
  media access.
- AI output is used without schema validation.
- Map publishing can skip RBAC or validation.
- Legacy SkyOffice code becomes the production architecture again.
- A feature requires production asset licensing decisions before the planned
  asset cleanup phase.
