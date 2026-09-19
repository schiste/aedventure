# Customer Virtual Office Platform - Global Product and Technical Specification

> Scope note: this is the customer virtual-office/platform product
> specification. It is separate from the live ADD game and does not redefine
> the ownership or roadmap of `apps/add-rpg`.

## 1. Document Purpose

This document defines the global product and technical specification for the
Aedventure Customer Virtual Office Platform.

The platform is a multi-tenant, customizable, 2D virtual office product. It
combines a SkyOffice-derived customer application, a future SaaS Foundation
control plane, meeting-provider integrations, 2D world management, and
AI-friendly APIs.

This document is intentionally broad and detailed. It should be used as the
reference for product planning, architecture decisions, implementation phases,
technical reviews, and future agent-oriented integration work.

## 2. Finalized Project Stance

The project starts with a **hard fork reset** of the Customer Virtual Office
App architecture.

The first engineering step is to preserve SkyOffice under `legacy/`, freeze
feature work, and rebuild the target architecture under `apps/` and
`packages/`. Step 0 is not optional and should not be treated as a small
cleanup pass.

The SaaS Foundation/backoffice is still the intended long-term control plane
for:

- Tenants.
- Organizations.
- Users.
- Roles.
- Permissions.
- Subscriptions.
- Billing metadata.
- Feature flags.
- Audit logs.
- Support access.
- Tenant configuration.
- AI agent governance.

However, the immediate engineering focus is not product features. It is
replacing risky inherited architecture: client-authoritative movement,
password-only auth, PeerJS media, in-memory-only state, and bundled asset risk.

## 3. Core Product Vision

The product is a tenant-customizable virtual office where users can enter a
browser-based 2D world, move as avatars, discover colleagues, join rooms,
launch meetings, interact with objects, attend events, collaborate, and
eventually work alongside AI agents.

The long-term product should become:

> A tenant-customizable spatial work environment where humans and AI agents can
> navigate, meet, collaborate, and automate safely.

The product should feel like a real customer application, not a technical demo.
It should be configurable enough for many tenants to have different worlds,
rules, meeting providers, branding, and agent policies without requiring custom
code per tenant.

## 4. Primary Goals

The platform must eventually allow each tenant to:

1. Create and manage one or more 2D virtual office worlds.
2. Customize maps, floors, rooms, zones, portals, objects, and spawn points.
3. Use the platform LiveKit/coturn media layer for proximity and meeting
   media.
4. Bring their own Google Meet, Microsoft Teams, Zoom, or Jitsi later where a
   tenant wants external provider workflows.
5. Assign user access through tenant-aware RBAC.
6. Invite guests safely.
7. Configure branding and tenant-specific settings.
8. Track usage and cost.
9. Publish and roll back world versions.
10. Expose safe, structured APIs for AI agents.
11. Support small pilot tenants first and large tenants later.

## 5. Immediate Build Strategy

### 5.1 Start With A Hard-Fork Reset

SkyOffice is the legacy reference for:

- 2D rendering.
- Avatar movement.
- Phaser-based world interaction.
- Colyseus-based realtime state.
- Basic object interaction.
- Virtual office spatial UX.

The fork should not be treated as the target architecture.

### 5.2 Step 0 Is A Major Refactor

Step 0 exists to make the fork safe enough for product development.

Step 0 goals:

- Preserve SkyOffice history under `legacy/skyoffice-original`.
- Establish target `apps/` and `packages/` structure.
- Make the legacy build reproducible.
- Audit licensing and asset redistribution risk.
- Replace auth with Wikimedia OAuth 2.0 and local sessions.
- Add Postgres persistence.
- Replace client-authoritative movement with server-authoritative movement.
- Replace PeerJS with LiveKit/coturn.
- Define a clean protocol package.
- Establish minimal server-side permission enforcement before product features.

Step 0 non-goals:

- No product feature work.
- No admin polish.
- No enterprise meeting-provider integrations.
- No production AI agents.
- No broadcast/event infrastructure.
- No design polish on legacy architecture.

### 5.3 Asset Licensing Is A Step 0 Gate

The target app must not bundle inherited assets unless their redistribution
rights are clear and recorded. SkyOffice assets may remain under `legacy/` only
as temporary reference material while the target app is rebuilt.

Art direction and final production asset replacement can happen later, but the
license boundary cannot be deferred.

For now:

- Existing SkyOffice assets may be kept under `legacy/` for internal reference.
- Assets should be clearly marked as not cleared for commercial launch.
- No early engineering time should be spent replacing all sprites, tilesets,
  or art packs.
- Target app code must not copy or load uncleared legacy assets.
- The project must not publicly launch commercially with uncleared assets.
- Production-safe asset replacement belongs in a later commercial readiness
  phase.

Rationale:

Art replacement is important, but it is not the first technical risk. The first
technical risk is turning the SkyOffice prototype into a maintainable,
configurable, tenant-ready product foundation.

## 6. Product Boundaries

### 6.1 Customer Virtual Office App

The Customer Virtual Office App owns:

- 2D world rendering.
- Avatar movement.
- Presence.
- Realtime room state.
- Object interactions.
- Meeting-zone UX.
- Map loading.
- Spatial navigation.
- User-facing virtual office experience.
- Tenant-specific world presentation.

### 6.2 SaaS Foundation / Backoffice

The SaaS Foundation owns:

- Authentication.
- Tenant management.
- User management.
- Organization management.
- Memberships.
- RBAC.
- Permissions.
- Subscriptions.
- Billing metadata.
- Audit.
- Support access.
- Impersonation.
- Feature flags.
- API keys.
- Webhooks.
- Tenant settings.
- Usage governance.

The Virtual Office App should not reimplement these systems. It should consume
them through APIs and tokens.

### 6.3 Media And Meeting Providers

The product media layer should be controlled by the platform first.

Initial priority:

1. LiveKit for proximity media and room meetings.
2. coturn for TURN fallback.
3. Server-issued media tokens.
4. Server-controlled proximity subscriptions.
5. External provider links as a fallback.
6. Google Meet, Microsoft Teams, Zoom, and Jitsi integrations later.
7. Broadcast mode later for large events.

## 7. Target Users

### 7.1 Platform Owner

The company operating the SaaS.

Needs:

- Manage all tenants.
- Monitor usage and health.
- Configure global platform settings.
- Manage shared meeting infrastructure.
- Review audit events.
- Suspend or restore tenants.
- Support customers safely.
- Control cost exposure.

### 7.2 Tenant Owner

The owner of a customer account.

Needs:

- Configure tenant workspace.
- Manage subscription and limits.
- Configure branding.
- Configure meeting providers.
- Manage users and roles.
- Configure AI policies.
- Review usage.

### 7.3 Tenant Admin

An operational admin within a tenant.

Needs:

- Invite users.
- Assign roles.
- Manage rooms.
- Configure maps and zones.
- Moderate meetings and events.
- Manage guest access.
- Review audit logs.

### 7.4 Regular User

An employee or member of the tenant.

Needs:

- Enter the virtual office.
- Move around.
- See colleagues.
- Join rooms.
- Start meetings.
- Use chat.
- Interact with objects.
- Find people and spaces.
- Use approved AI assistants.

### 7.5 Guest

An external visitor.

Needs:

- Join a specific invited space.
- Use a temporary profile/avatar.
- Join allowed meetings.
- Avoid seeing private tenant data.

### 7.6 AI Agent

A non-human actor using structured APIs.

Needs:

- Read permitted world metadata.
- Understand rooms, zones, objects, and policies.
- Act through explicit, auditable endpoints.
- Respect RBAC and tenant policy.
- Appear as an avatar only when allowed.

## 8. Functional Modules

The platform should eventually contain the following modules.

### 8.1 Virtual Office Runtime

Responsibilities:

- Render 2D maps.
- Display avatars.
- Handle movement.
- Handle collision.
- Show nearby users.
- Enter and exit zones.
- Trigger object interactions.
- Launch meetings.
- Update presence.
- Render chat and notifications.

### 8.2 Realtime Server

Responsibilities:

- Authenticate realtime sessions.
- Maintain ephemeral player state.
- Broadcast movement updates.
- Track room membership.
- Handle object interaction events.
- Emit presence changes.
- Coordinate with Redis for multi-node scaling later.

### 8.3 World Management Backend

Responsibilities:

- Store worlds.
- Store floors.
- Store map versions.
- Store zones.
- Store objects.
- Store portals.
- Store spawn points.
- Store meeting room configuration.
- Store tenant world settings.
- Validate maps.
- Publish and roll back versions.

### 8.4 Meeting Provider Layer

Responsibilities:

- Create or resolve meeting rooms.
- Generate join URLs.
- Issue LiveKit tokens for platform-hosted media.
- Apply proximity subscription policy.
- Configure TURN access through coturn.
- Embed external providers later where applicable.
- Store external meeting metadata.
- Apply tenant meeting policies.
- Audit joins and moderation actions.
- Support future provider integrations.

### 8.5 Tenant Configuration Layer

Responsibilities:

- Tenant branding.
- World defaults.
- Meeting provider defaults.
- Guest policies.
- AI policies.
- Feature limits.
- Usage caps.

### 8.6 AI Agent Layer

Responsibilities:

- Expose semantic world APIs.
- Expose agent action APIs.
- Enforce agent permissions.
- Log agent actions.
- Provide tool manifests.
- Represent agents as visible actors when allowed.

## 9. Repository Direction After Fork

The hard fork should use this structure:

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
  map-engine/
  auth-wikimedia/
  shared-types/

infra/
  docker-compose.yml

docs/
  customer-virtual-office-platform-spec.md
```

`legacy/skyoffice-original/` is reference code. Target app code should be built
under `apps/` and shared packages should be built under `packages/`.

## 10. 2D World Domain Model

The 2D world must be structured data, not just a static game map.

High-level hierarchy:

```text
Tenant
  VirtualWorld
    WorldFloor
      WorldMap
        MapLayer
        WorldObject
        WorldZone
        WorldPortal
        SpawnPoint
```

### 10.1 VirtualWorld

A tenant-owned virtual environment.

Fields:

- `id`
- `tenant_id`
- `name`
- `slug`
- `description`
- `status`
- `visibility`
- `default_floor_id`
- `default_spawn_point_id`
- `theme_id`
- `branding_overrides`
- `settings`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `published_at`
- `archived_at`

Statuses:

- `draft`
- `published`
- `archived`
- `disabled`

Visibility modes:

- `tenant`
- `role_restricted`
- `invite_only`
- `guest_accessible`

### 10.2 WorldFloor

A logical section inside a world.

Fields:

- `id`
- `tenant_id`
- `world_id`
- `name`
- `slug`
- `order`
- `map_id`
- `default_spawn_point_id`
- `capacity`
- `settings`

Examples:

- Main Office.
- Engineering Floor.
- Sales Floor.
- Customer Lobby.
- Training Center.
- Event Hall.

### 10.3 WorldMap

A playable 2D layout.

Fields:

- `id`
- `tenant_id`
- `world_id`
- `floor_id`
- `name`
- `format`
- `width`
- `height`
- `tile_size`
- `tilesets`
- `layers`
- `objects`
- `zones`
- `portals`
- `spawn_points`
- `metadata`
- `version`
- `checksum`
- `status`

Initial format:

- Tiled JSON-compatible input.

Long-term format:

- Internal normalized JSON with import/export support.

### 10.4 MapLayer

Layer types:

- `ground`
- `walls`
- `decoration`
- `collision`
- `interactive`
- `foreground`
- `semantic`
- `debug`

Fields:

- `id`
- `map_id`
- `name`
- `type`
- `visible`
- `opacity`
- `z_index`
- `collision_enabled`
- `data`

### 10.5 Tileset

A reusable tile asset set.

Fields:

- `id`
- `tenant_id`
- `name`
- `asset_url`
- `tile_width`
- `tile_height`
- `columns`
- `metadata`
- `license_status`
- `created_at`

License statuses:

- `development_only`
- `tenant_uploaded`
- `platform_licensed`
- `commercial_cleared`
- `unknown`

Because final art replacement is deferred, the early system should track
license status and block target-app bundling of uncleared assets.

### 10.6 WorldObject

An object placed on a map.

Object types:

- `desk`
- `chair`
- `table`
- `door`
- `portal`
- `meeting_trigger`
- `whiteboard`
- `screen`
- `computer`
- `link`
- `document`
- `help_kiosk`
- `ai_station`
- `reception`
- `event_stage`
- `broadcast_screen`
- `spawn_marker`
- `custom`

Fields:

- `id`
- `tenant_id`
- `map_id`
- `type`
- `name`
- `x`
- `y`
- `width`
- `height`
- `rotation`
- `z_index`
- `sprite_asset_id`
- `collision`
- `interaction_type`
- `interaction_payload`
- `settings`
- `permissions`
- `semantic_label`
- `ai_description`
- `created_at`
- `updated_at`

AI-specific requirements:

- Important objects should have stable IDs.
- Important objects should have semantic labels.
- Important objects should have human-readable descriptions.
- Object interactions should have schemas that agents can inspect.

### 10.7 WorldZone

A behavior area on a map.

Zone types:

- `room`
- `meeting`
- `quiet`
- `broadcast_viewing`
- `private`
- `department`
- `guest`
- `spawn`
- `restricted`
- `ai_accessible`
- `no_recording`
- `social`
- `collaboration`

Fields:

- `id`
- `tenant_id`
- `map_id`
- `name`
- `type`
- `geometry`
- `capacity`
- `entry_policy`
- `exit_policy`
- `meeting_policy`
- `recording_policy`
- `ai_policy`
- `presence_policy`
- `metadata`
- `semantic_label`
- `ai_description`

Supported geometry:

- Rectangle.
- Polygon.
- Circle.
- Tile region.

### 10.8 WorldPortal

A transition from one place to another.

Portal types:

- `same_map`
- `floor_transition`
- `world_transition`
- `external_url`
- `meeting_launch`
- `event_launch`

Fields:

- `id`
- `tenant_id`
- `source_map_id`
- `source_geometry`
- `target_type`
- `target_world_id`
- `target_floor_id`
- `target_map_id`
- `target_spawn_point_id`
- `target_url`
- `permissions`
- `transition_style`

### 10.9 SpawnPoint

A starting or return location.

Spawn point types:

- `default`
- `guest`
- `role_specific`
- `event`
- `meeting_return`
- `admin`
- `ai_agent`

Fields:

- `id`
- `tenant_id`
- `map_id`
- `name`
- `type`
- `x`
- `y`
- `direction`
- `priority`
- `conditions`

## 11. World Management Requirements

### 11.1 Map Import

The platform should support importing a Tiled JSON map.

Import should:

- Parse map dimensions.
- Parse layers.
- Parse object layers.
- Parse collisions where available.
- Detect interactive objects.
- Validate asset references.
- Create a draft map version.
- Produce a validation report.

### 11.2 Map Export

The platform should support exporting:

- Original Tiled-compatible JSON where possible.
- Internal normalized JSON.
- Semantic map JSON for AI agents.

### 11.3 Map Versioning

Map versions:

- `draft`
- `pending_review`
- `published`
- `previous_published`
- `archived`

Publishing should:

- Validate the map.
- Lock the published version.
- Generate a checksum.
- Create an audit event.
- Notify active users if the world changes.
- Allow rollback.

### 11.4 Map Validation

Validation rules:

- At least one spawn point exists.
- Default spawn point is valid.
- Spawn points are not inside collision.
- Required portals have targets.
- Meeting zones have meeting policies.
- Restricted zones have access rules.
- Object IDs are unique.
- Referenced assets exist.
- Tile dimensions are valid.
- Published maps do not reference missing draft assets.
- Important AI-visible objects have semantic labels.

### 11.5 Map Editor

The full map editor is not part of Step 0, but the architecture should prepare
for it.

Future editor modes:

- View.
- Edit layout.
- Edit collision.
- Edit objects.
- Edit zones.
- Edit portals.
- Edit meeting rooms.
- Edit permissions.
- Preview as role.
- Publish.

Future editor features:

- Upload map.
- Import Tiled JSON.
- Export map.
- Place objects.
- Move objects.
- Resize zones.
- Draw collision.
- Define portals.
- Define spawn points.
- Configure meeting rooms.
- Configure room capacity.
- Configure access rules.
- Preview map.
- Validate map.
- Publish version.
- Roll back version.

### 11.6 AI Map Definition Interface

The platform should support AI-assisted map generation through a strict Map
Definition Interface, or MDI. The AI must act as a logical decorator, not as a
renderer or source of authoritative collision data.

The MDI is a constrained semantic JSON format designed for structured model
output. It should be small, human-readable, and validated before it can become a
draft map version.

Example MDI shape:

```json
{
  "room_dimensions": { "width": 12, "height": 10 },
  "style": "cozy_wood",
  "layers": {
    "floor": "wooden_parquet",
    "walls": [
      { "x": 0, "y": 0, "type": "wall_corner" },
      { "x": 1, "y": 0, "type": "wall_window" }
    ],
    "furniture": [
      { "x": 4, "y": 3, "item": "large_conference_table" },
      { "x": 4, "y": 2, "item": "office_chair", "direction": "south" },
      { "x": 9, "y": 1, "item": "coffee_machine" }
    ],
    "zones": [
      {
        "x_start": 3,
        "y_start": 2,
        "x_end": 7,
        "y_end": 5,
        "zone_type": "meeting_private"
      }
    ]
  }
}
```

MDI requirements:

- Output must be schema-validated before storage.
- The AI may only use known style, wall, furniture, object, and zone tokens.
- The AI must not output raw tile GIDs, binary arrays, Phaser objects, Tiled JSON,
  collision matrices, or LiveKit room identifiers.
- Dimensions must be bounded by tenant limits and renderer constraints.
- Object placement must be validated for bounds, overlap, spacing, collision,
  accessibility, and spawn safety.
- Zones must be converted into server-side `WorldZone` records with explicit
  policies; zones must not directly grant media access.
- The compiler must create a draft map version and validation report.

### 11.7 Asset Dictionary And Compiler

The platform should maintain an append-only asset dictionary that maps semantic
tokens to renderable assets, collision metadata, licensing metadata, and
interaction defaults.

Example dictionary shape:

```ts
export const AssetDictionary = {
  styles: {
    cozy_wood: {
      floor_token: "wooden_parquet",
      floor_index: 12,
      wall_straight: 45,
      wall_corner: 46
    }
  },
  items: {
    large_conference_table: {
      index: 201,
      width: 3,
      height: 2,
      collidable: true,
      license_status: "platform_licensed"
    },
    coffee_machine: {
      index: 305,
      width: 1,
      height: 1,
      collidable: true,
      interaction_type: "ambient_object"
    }
  }
}
```

Compiler flow:

1. Receive user prompt.
2. Call the model with structured output instructions and a compact asset
   catalog.
3. Validate the MDI against schema, tenant limits, and asset availability.
4. Translate semantic tokens to asset dictionary entries.
5. Generate normalized map layers, object records, zones, spawn candidates,
   collision data, and semantic metadata.
6. Run map validation.
7. Store a draft `map_version`.
8. Return a validation report and preview payload.
9. Publish only after explicit permission checks and validation success.

The client may render a preview from compiled output, but it must not send
`update_map_collision` or equivalent authoritative collision changes. Collision,
zones, and media policies are compiled and persisted by the backend.

### 11.8 AI Map Prompt Contract

AI map prompts should be wrapped by a server-owned system prompt with:

- A strict compiler role: output valid JSON matching the MDI schema only.
- An allowed asset catalog generated from the tenant/platform asset dictionary.
- Design rules for walking space, table clearance, walls, doors, spawn safety,
  accessibility, and logical zone placement.
- Explicit refusal/repair behavior when the prompt cannot be satisfied within
  the allowed tokens or tenant limits.

The prompt should produce semantic layout intent. It should never produce:

- Phaser scene code.
- Tiled JSON.
- SQL.
- Media-room credentials.
- Raw tile buffers.
- Permission grants.

## 12. Tenant Customization Requirements

Each tenant should eventually be able to customize the product without code
changes.

### 12.1 Branding

Configurable fields:

- Tenant logo.
- Primary color.
- Secondary color.
- Accent color.
- Default avatar theme.
- Tenant display name.
- Custom domain.
- Email templates.
- Meeting room naming pattern.

### 12.2 World Layout

Configurable fields:

- Worlds.
- Floors.
- Maps.
- Rooms.
- Zones.
- Spawn points.
- Portals.
- Objects.
- Furniture.
- Meeting areas.
- Event areas.
- Restricted areas.
- Department areas.

### 12.3 Permissions

Configurable rules:

- Who can enter each world.
- Who can enter each floor.
- Who can enter each room.
- Who can edit maps.
- Who can create meetings.
- Who can moderate meetings.
- Who can invite guests.
- Who can enable recording.
- Who can deploy AI agents.
- Who can view analytics.

### 12.4 Meeting Behavior

Configurable settings:

- Default provider.
- Embedded or external launch.
- Auto-create room.
- Persistent or ephemeral room.
- Moderator required.
- Guests allowed.
- Recording allowed.
- Transcription allowed.
- AI summary allowed.
- Max participants.
- Waiting room behavior.
- Lobby behavior.

### 12.5 AI Behavior

Configurable settings:

- Enabled agents.
- Allowed tools.
- Allowed worlds.
- Allowed zones.
- Agent visibility.
- Agent messaging.
- Agent scheduling.
- Agent meeting participation.
- Agent summarization.
- Escalation rules.

### 12.6 Usage Limits

Configurable limits:

- Max users.
- Max active users.
- Max worlds.
- Max maps.
- Max rooms.
- Max guests.
- Max storage.
- Max meeting minutes.
- Max broadcast minutes.
- Max AI actions.
- Max API calls.
- Max audit retention.

## 13. Avatar And Presence

### 13.1 Avatar Profile

Fields:

- `user_id`
- `display_name`
- `avatar_style`
- `sprite_config`
- `status`
- `timezone`
- `profile_url`
- `presence_visibility`

Customization:

- Body.
- Hair.
- Clothes.
- Accessories.
- Color palette.
- Tenant default styles.
- Optional role-specific appearance.

### 13.2 Presence States

States:

- `online`
- `away`
- `busy`
- `in_meeting`
- `presenting`
- `focus`
- `offline`
- `invisible`
- `agent_active`

Presence fields:

- `user_id`
- `tenant_id`
- `world_id`
- `floor_id`
- `zone_id`
- `x`
- `y`
- `direction`
- `status`
- `device`
- `last_activity_at`
- `meeting_state`
- `visibility`

### 13.3 Presence Privacy

Tenant policy should control:

- Whether location is visible.
- Whether guests can see users.
- Whether users can hide location.
- Whether AI agents can query location.
- Whether presence history is stored.
- Retention duration.

## 14. Realtime Architecture

The realtime layer should handle:

- Movement.
- Presence.
- Room entry and exit.
- Zone entry and exit.
- Object interactions.
- Chat events.
- Meeting state changes.
- Moderation events.

Initial likely stack:

- Phaser on the client.
- Colyseus on the realtime server.
- Redis later for multi-node coordination.
- SaaS Foundation/backend as source of truth.

### 14.1 Ephemeral State

Stored in realtime service:

- Current player positions.
- Movement direction.
- Active players.
- Active room membership.
- Temporary object interaction state.
- Current proximity group.
- Current meeting participant state.

### 14.2 Persistent State

Stored in backend/database:

- Worlds.
- Maps.
- Objects.
- Zones.
- Portals.
- Spawn points.
- User profiles.
- Roles.
- Meeting settings.
- Audit logs.
- Usage events.

### 14.3 Realtime Auth

Flow:

1. User authenticates through the platform.
2. Customer app requests a short-lived realtime token.
3. Backend issues token for a tenant/user/world scope.
4. Realtime server validates the token.
5. Realtime server checks join permission.
6. User joins the world.

Token claims:

- `tenant_id`
- `user_id`
- `session_id`
- `world_id`
- `floor_id`
- `roles`
- `permissions`
- `guest`
- `expires_at`
- `nonce`

Step 0 may use mocked auth, but interfaces should be shaped for the final flow.

## 15. Media And Meeting Architecture

### 15.1 Provider Strategy

The product should not keep SkyOffice's PeerJS media layer.

Provider priority:

1. LiveKit for the first product media layer.
2. coturn for TURN fallback.
3. Server-issued LiveKit JWTs.
4. Server-controlled proximity and room media policy.
5. External meeting links for quick compatibility.
6. Google Meet, Microsoft Teams, Zoom, and Jitsi for later tenant BYO options.
7. Broadcast mode for large rooms later.

### 15.2 MediaProvider Interface

Platform media abstraction:

```text
MediaProvider
  createRoom(input)
  getRoom(providerRoomId)
  updateRoom(providerRoomId, input)
  closeRoom(providerRoomId)
  createJoinToken(input)
  updateSubscriptionPolicy(input)
  listParticipants(providerRoomId)
  disconnectParticipant(input)
  getRecording(providerRoomId)
  getTranscript(providerRoomId)
  validateWebhook(request)
```

### 15.3 MediaRoom

Fields:

- `id`
- `tenant_id`
- `world_id`
- `zone_id`
- `name`
- `provider`
- `provider_config`
- `media_mode`
- `capacity`
- `moderation_policy`
- `recording_policy`
- `transcription_policy`
- `guest_policy`
- `ai_policy`

Media modes:

- `proximity`
- `instant`
- `scheduled`
- `persistent`
- `external_provider`
- `broadcast`
- `q_and_a`

### 15.4 LiveKit Requirements

The first media provider should support:

- Tenant-scoped room naming.
- JWT-authenticated join.
- Server-issued short-lived tokens.
- Selective subscriptions.
- Proximity-driven subscription changes.
- TURN fallback through coturn.
- Moderator configuration.
- Lobby support if configured.
- Meeting join audit events.
- Participant lifecycle events.

### 15.5 Enterprise Providers

Later providers:

- Google Meet.
- Microsoft Teams.
- Zoom.
- Jitsi.

Requirements:

- Tenant admin connection flow.
- OAuth/admin consent.
- Secure credential storage.
- Meeting creation.
- Join URL retrieval.
- Webhook handling.
- Provider error handling.
- Provider-specific policy mapping.

### 15.6 Broadcast Mode

Broadcast mode is a later phase for large rooms.

Model:

- Presenters join a realtime meeting/stage.
- Audience watches a broadcast stream.
- Moderators promote Q&A participants to a small realtime room.
- After Q&A, participants return to viewer mode.

This avoids treating 1,000 viewers as 1,000 full WebRTC meeting participants.

## 16. Chat And Messaging

Chat types:

- World chat.
- Room chat.
- Zone chat.
- Direct message.
- Meeting chat.
- Announcement.
- System message.
- AI assistant message.

Features:

- Tenant-level enable/disable.
- Retention policies.
- Moderation.
- Reactions.
- Links.
- Mentions.
- Attachments later.
- AI summarization later.
- Export later.

Permissions:

- `read:chat`
- `create:chat_messages`
- `moderate:chat`
- `export:chat`
- `delete:chat_messages`

## 17. Object Interaction System

Objects should be able to trigger actions.

Interaction types:

- Open link.
- Join meeting.
- Open document.
- Launch app.
- Display info.
- Start broadcast.
- Enter portal.
- Open whiteboard.
- Ask AI assistant.
- Trigger workflow.
- Submit form.
- Reserve room.
- Check in.

Each interaction should define:

- Required permission.
- Allowed roles.
- Cooldown.
- Audit level.
- UI behavior.
- Agent accessibility.
- Payload schema.

## 18. RBAC Requirements

The virtual office should use the SaaS Foundation RBAC model later.

Core resources:

- `worlds`
- `world_maps`
- `world_floors`
- `world_objects`
- `world_zones`
- `meeting_rooms`
- `meetings`
- `broadcasts`
- `presence`
- `chat`
- `avatars`
- `guest_access`
- `ai_agents`
- `tenant_meeting_settings`
- `world_templates`
- `usage_reports`

Actions:

- `create`
- `read`
- `update`
- `delete`
- `manage`
- `join`
- `invite`
- `moderate`
- `record`
- `export`
- `publish`
- `execute`

Example permissions:

- `read:worlds`
- `create:worlds`
- `update:world_maps`
- `publish:world_maps`
- `join:meeting_rooms`
- `moderate:meetings`
- `record:meetings`
- `manage:tenant_meeting_settings`
- `manage:ai_agents`

## 19. Admin And Backoffice Screens

### 19.1 Platform Admin Later

Screens:

- Tenant list.
- Tenant detail.
- Tenant usage.
- Tenant billing metadata.
- Tenant health.
- Tenant media usage.
- Tenant feature flags.
- Tenant support access.
- Global templates.
- Global meeting provider status.
- System logs.
- Audit logs.
- Platform users.
- Platform roles.

### 19.2 Tenant Admin Later

Screens:

- Tenant overview.
- Users.
- Roles.
- Permissions.
- Meeting settings.
- Worlds.
- World detail.
- Map library.
- Object library.
- Room management.
- Guest access.
- Broadcast/events.
- AI agents.
- Usage and cost.
- Audit logs.
- Branding.
- Integrations.

### 19.3 World Admin Later

Screens:

- World list.
- World detail.
- Floor list.
- Map editor.
- Zone editor.
- Object editor.
- Portal editor.
- Meeting room configuration.
- Access preview.
- Publish history.
- Validation report.

## 20. AI-Friendly Requirements

AI-friendliness must be designed in from the beginning, even if production AI
features ship later.

### 20.1 Principles

AI agents should:

- Use structured APIs.
- Have explicit identity.
- Be permissioned through RBAC.
- Operate within tenant policy.
- Produce audit events.
- Use stable object IDs.
- Use semantic world metadata.
- Avoid scraping the visual UI.
- Generate maps through constrained MDI drafts rather than raw renderer output.

AI agents should not:

- Have hidden superuser access.
- Bypass tenant isolation.
- Read private location data by default.
- Join meetings without policy permission.
- Summarize meetings without explicit tenant approval.
- Modify maps without high-risk permissions.
- Publish AI-generated maps without validation and explicit permission checks.

### 20.2 AgentProfile

Fields:

- `id`
- `tenant_id`
- `name`
- `description`
- `owner_user_id`
- `agent_type`
- `status`
- `permissions`
- `allowed_tools`
- `allowed_worlds`
- `allowed_zones`
- `created_at`
- `last_active_at`

Agent types:

- `personal_assistant`
- `tenant_assistant`
- `meeting_assistant`
- `reception_assistant`
- `map_assistant`
- `support_assistant`
- `automation_agent`

### 20.3 Semantic World API

Future endpoints:

```http
GET /api/virtual-office/worlds
GET /api/virtual-office/worlds/{world_id}
GET /api/virtual-office/worlds/{world_id}/semantic-map
GET /api/virtual-office/worlds/{world_id}/rooms
GET /api/virtual-office/worlds/{world_id}/objects
GET /api/virtual-office/worlds/{world_id}/zones
GET /api/virtual-office/worlds/{world_id}/navigation-graph
```

Semantic map response should include:

- Rooms.
- Zones.
- Portals.
- Objects.
- Interaction points.
- Access rules.
- Descriptions.
- Coordinates.
- Agent-readable labels.
- Navigation paths.

### 20.4 Agent Action API

Future endpoints:

```http
POST /api/agent-actions/navigate
POST /api/agent-actions/send-message
POST /api/agent-actions/schedule-meeting
POST /api/agent-actions/create-room-reservation
POST /api/agent-actions/find-user
POST /api/agent-actions/summarize-space
POST /api/agent-actions/trigger-workflow
POST /api/agent-actions/generate-map-draft
POST /api/agent-actions/validate-map-draft
```

Each action should record:

- Actor.
- Tenant.
- User or agent identity.
- Permission check.
- Input payload.
- Output payload.
- Timestamp.
- Request ID.
- Audit event.
- Result.

### 20.5 AI Tool Manifest

The platform should expose machine-readable tool manifests later.

Example:

```json
{
  "name": "virtual_office",
  "capabilities": [
    "list_worlds",
    "read_semantic_map",
    "schedule_meeting",
    "send_room_message",
    "find_available_room"
  ],
  "auth": "platform_token",
  "permission_model": "rbac",
  "audit": "required"
}
```

## 21. API Requirements

API style:

- REST initially.
- WebSocket/realtime for movement.
- Webhooks for meeting providers.
- Agent-specific APIs later.
- OpenAPI documentation.
- Stable IDs.
- Idempotency keys for mutations.
- Request IDs.
- Tenant context.

Initial future endpoint family:

```http
GET /api/virtual-office/worlds
POST /api/virtual-office/worlds
GET /api/virtual-office/worlds/{id}
PATCH /api/virtual-office/worlds/{id}
DELETE /api/virtual-office/worlds/{id}

GET /api/virtual-office/worlds/{id}/maps
POST /api/virtual-office/worlds/{id}/maps
POST /api/virtual-office/maps/{id}/publish
POST /api/virtual-office/maps/{id}/validate

GET /api/virtual-office/maps/{id}/semantic
GET /api/virtual-office/maps/{id}/navigation-graph

GET /api/virtual-office/meeting-rooms
POST /api/virtual-office/meeting-rooms
POST /api/virtual-office/meeting-rooms/{id}/join

POST /api/virtual-office/realtime-token
POST /api/virtual-office/guest-pass

GET /api/virtual-office/agents
POST /api/virtual-office/agents/{id}/actions
```

## 22. Realtime Protocol

Client events:

- `player.move`
- `player.stop`
- `player.interact`
- `player.enter_zone`
- `player.leave_zone`
- `chat.send`
- `meeting.join_request`
- `meeting.leave`
- `object.activate`

Server events:

- `world.state`
- `player.joined`
- `player.left`
- `player.moved`
- `presence.updated`
- `zone.entered`
- `zone.left`
- `object.updated`
- `meeting.started`
- `meeting.ended`
- `chat.message`
- `moderation.event`

## 23. Usage Metering

Usage should be measured from early phases.

Metrics:

- Registered users.
- Monthly active users.
- Peak concurrent users.
- Realtime connection minutes.
- Meeting join events.
- Hosted LiveKit/SFU minutes.
- TURN relay GB.
- Broadcast viewer-minutes.
- Recording minutes stored.
- AI actions.
- Map storage.
- Asset storage.
- API calls.

Usage should be visible to:

- Platform owner.
- Tenant owner.
- Tenant admin, if permitted.

## 24. Cost Model

The platform should separate costs into:

- Shared infra.
- Per-tenant fixed cost.
- Per-user variable cost.
- Usage-metered media cost.
- Usage-metered AI cost.

Initial target cost model:

```text
tenant_cogs =
  allocated_shared_infra
  + tenant_fixed
  + registered_users * user_base_cost
  + active_users * realtime_cost
  + broadcast_minutes_delivered * broadcast_rate
  + recording_minutes_stored * storage_rate
  + turn_relay_gb * relay_bandwidth_cost
  + dedicated_media_nodes
  + ai_actions * ai_action_rate
```

Media should not be unlimited by default.

Meter or cap:

- Broadcast viewer-minutes.
- Recording storage.
- Hosted LiveKit/SFU minutes.
- TURN relay traffic.
- Transcription.
- AI summaries.
- Long audit/log retention.

## 25. Security Requirements

Security baseline:

- Tenant isolation.
- RBAC enforcement.
- Short-lived realtime tokens.
- Secure meeting-provider credentials.
- Secret encryption.
- CSRF/session protection in SaaS Foundation.
- API key support later.
- Rate limits.
- Audit logs.
- Admin action logging.
- Guest restrictions.
- AI action logging.
- Webhook signature verification.

High-risk actions:

- Publishing maps.
- Changing meeting provider.
- Enabling recording.
- Inviting guests.
- Creating AI agents.
- Granting AI permissions.
- Changing RBAC roles.
- Exporting data.
- Impersonating user.
- Suspending tenant.

## 26. Privacy Requirements

Tenant privacy settings:

- Presence visibility.
- Location retention.
- Chat retention.
- Meeting recording.
- Transcription.
- AI summarization.
- Guest visibility.
- Directory visibility.
- Cross-tenant support access.
- Data export.
- Data deletion.

The platform should eventually support:

- Tenant data export.
- User deletion/anonymization.
- Guest data expiry.
- Recording retention.
- Audit retention policies.

## 27. Observability

Track:

- API latency.
- Realtime connection count.
- Realtime room count.
- Map load time.
- Client FPS.
- WebSocket disconnects.
- Meeting join success.
- LiveKit health.
- External provider bridge health.
- Provider API errors.
- TURN relay usage.
- Broadcast viewer count.
- AI action volume.
- Permission denied events.
- Tenant usage spikes.

Dashboards:

- Platform health.
- Tenant health.
- Media usage.
- Realtime usage.
- Map performance.
- AI activity.
- Cost risk.

## 28. Deployment Model

Initial deployment:

- Shared customer app frontend.
- Shared world server.
- Shared API.
- Shared Postgres.
- Shared Valkey/Redis.
- Shared object storage.
- Shared LiveKit/coturn.

Enterprise deployment options later:

- Dedicated LiveKit/coturn.
- Dedicated external meeting provider bridge.
- Dedicated realtime pool.
- Dedicated database cluster.
- Region-specific deployment.
- Private networking.

## 29. Performance Targets

Step 0 targets:

- Keep fork playable.
- Preserve current basic movement and room behavior.
- Establish maintainable structure.
- Establish basic test/build checks.

MVP targets:

- 10-100 users per tenant.
- 10-25 concurrent users per world.
- Basic meeting zones.
- Basic persisted config.

Growth targets:

- 1,000 registered users per tenant.
- 100-300 concurrent users per tenant.
- Multiple worlds.
- Provider integrations.
- Broadcast events.

Long-term targets:

- Larger enterprise tenants.
- Sharded realtime worlds.
- Dedicated media options.
- Advanced AI agents.
- Tenant-custom map editor.

## 30. Phase Plan

The operational rollout companion for this phase plan is
`docs/development-rollout-plan.md`.

### Phase 0: Hard-Fork Reset

Purpose:

Stop building on the risky SkyOffice architecture and create a clean product
foundation before feature work resumes.

Stack orientation:

- The product codebase should be TypeScript-first across protocol, policy, API,
  world-server, client, and tests.
- The infrastructure should remain best-fit rather than TypeScript-only:
  Postgres for durable state, Valkey for ephemeral coordination, LiveKit/coturn
  for realtime media, S3-compatible storage/CDN for assets, and Tauri 2 only as
  a later desktop packaging wrapper.
- Phaser 4 is the preferred browser world renderer. `TilemapGPULayer` should be
  evaluated for orthographic static layers, but the map engine must still model
  semantic maps, zones, permissions, portals, and navigation independently of
  any one renderer.

Deliverables:

- SkyOffice preserved under `legacy/skyoffice-original`.
- Target `apps/` and `packages/` structure.
- Reproducible legacy build check.
- License audit and asset manifest.
- Feature freeze.
- Wikimedia OAuth 2.0 login.
- Local user, identity, and session model.
- PostgreSQL schema for durable product state.
- Server-authoritative movement protocol.
- Server-side collision, speed, zone, proximity, and transition checks.
- Server-filtered chat delivery rules.
- LiveKit/coturn media replacement plan and first server-issued token flow.
- Clean protocol package.
- Minimal server-side permission enforcement for rooms, zones, chat, and media.
- Docker Compose plan for full-stack boot.

Acceptance criteria:

- Build is reproducible.
- Tests or verification commands run in CI.
- No non-open assets are bundled in the target app.
- Wikimedia OAuth login works.
- Postgres user/session model exists.
- Client no longer sends authoritative `x/y`.
- Server validates movement.
- Chat delivery is server-filtered.
- LiveKit migration plan is committed.
- Docker Compose boots the full stack.
- AI map generation remains documentation/schema preparation only; production
  prompt-to-map generation is not built in Phase 0.

### Phase 1: Customer Virtual Office App MVP

Purpose:

Build the first product-shaped customer app after Phase 0 gates pass.

Deliverables:

- Tenant-shaped app shell.
- Basic world loading.
- Avatar movement.
- Presence.
- Object interactions.
- LiveKit meeting/proximity zone prototype.
- Config-driven office layout.
- Basic server-enforced room and zone access using seeded or fixture-backed
  permissions.
- Basic server-side chat modes.
- Browser-first client using Phaser 4 and TypeScript.
- Simple in-world UI overlays using vanilla HTML/TypeScript and Tailwind CSS
  where useful.
- Hand-authored MDI fixture can compile into a previewable map if this does not
  delay core movement/auth/media gates.

Explicitly deferred:

- Tauri desktop packaging.
- Full SaaS/admin backoffice UI framework decision.
- Role/RBAC management workflows and role administration UI.
- SaaS Foundation role synchronization.
- Large-room broadcast UX beyond core media policy.
- Live AI prompt-to-map generation.

### Phase 2: SaaS Foundation Connection

Purpose:

Connect the app to the SaaS control plane.

Deliverables:

- Authenticated access through SaaS Foundation.
- Realtime token issuance.
- User identity bridge.
- Tenant/world ownership model.
- Role/RBAC management workflows.
- Role and permission synchronization from the control plane.
- Tenant-aware RBAC checks for entering worlds and rooms.

### Phase 3: World Persistence

Purpose:

Replace prototype state with persistent tenant-scoped world state.

Deliverables:

- Backend models for worlds, maps, zones, objects, spawn points.
- World/map/object APIs.
- Save/load world config from backend.
- Basic admin API.
- Remaining hard-coded SkyOffice state removed or isolated.
- Store asset dictionary entries needed for map compilation.
- Store draft map versions produced by importers or hand-authored MDI fixtures.

### Phase 4: Tenant Customization

Purpose:

Allow each tenant to configure its own workspace.

Deliverables:

- Tenant-specific worlds.
- Tenant branding.
- Configurable media policy.
- Later BYO meeting provider settings.
- Room permissions.
- Guest access.
- Usage limits.

### Phase 5: World Management UI

Purpose:

Give tenant admins practical world management controls.

Deliverables:

- World list.
- World detail.
- Basic map/object/zone management.
- Publish/rollback flow.
- Validation checks.
- MDI preview and validation report display for admin users.

### Phase 6: AI-Friendly APIs

Purpose:

Make the platform usable by AI agents without UI scraping.

Deliverables:

- Semantic map endpoint.
- Agent-readable rooms/zones/objects.
- Agent action API.
- Agent permission model.
- Full audit logging for agent actions.
- Tool manifest.
- AI map-generation draft API using the Map Definition Interface.
- Asset dictionary exposure for allowed semantic map tokens.
- MDI compiler and validation reports for generated maps.

Rollout gates:

- MDI JSON Schema exists with positive and negative fixture tests.
- Asset dictionary is tenant-aware, append-only, license-aware, and exposes only
  allowed semantic tokens to the model.
- Compiler converts MDI to normalized map layers, objects, zones, spawn
  candidates, collision data, and semantic metadata without client authority.
- Validation rejects out-of-bounds objects, unknown tokens, overlaps, unsafe
  spawns, inaccessible layouts, and media zones without explicit policy.
- Generated output is stored only as a draft map version.
- Publishing requires RBAC permission, validation success, and audit logging.
- Preview clients render compiled output but cannot update authoritative
  collision, zones, or media policies.

Recommended development sequence:

1. Define MDI schema and examples without any LLM call.
2. Build the asset dictionary package and token validation.
3. Build the deterministic MDI compiler using fixtures.
4. Add map validation reports.
5. Add draft map-version persistence.
6. Add admin preview UI.
7. Add model structured-output integration behind a feature flag.
8. Add tenant rate limits, audit logs, and rollback workflow.

### Phase 7: Enterprise Meeting Integrations

Purpose:

Support tenants that already use enterprise meeting platforms.

Deliverables:

- Google Meet integration.
- Microsoft Teams integration.
- Zoom integration.
- Tenant BYO meeting provider settings.

### Phase 8: Broadcast / Large Room Mode

Purpose:

Support town halls and large events efficiently.

Deliverables:

- Presenter stage.
- Broadcast viewer mode.
- Moderated Q&A promotion.
- Broadcast usage metering.

### Phase 9: Commercial Asset And Licensing Cleanup

Purpose:

Prepare for public commercial launch.

Deliverables:

- Replace or license production assets.
- Commercial-safe default tilesets.
- Commercial-safe default avatar sprites.
- Tenant asset library.
- Asset license metadata.
- Public launch art pack.

Final art direction and a public launch art pack can happen much later than
Step 0. The license quarantine itself is a Step 0 requirement.

## 31. MVP Scope

The first MVP should include:

- Refactored SkyOffice fork.
- Basic customer app route.
- Basic world loading.
- Avatar movement.
- Presence.
- Data-driven object config.
- LiveKit meeting/proximity zone concept.
- Wikimedia-authenticated user/session flow.
- Basic realtime/world token abstraction.
- Server-authoritative movement.
- Server-filtered chat.
- Basic usage events.
- Basic semantic map shape.

The first MVP should not include:

- Full SaaS billing.
- Full map editor.
- Final production art pack replacement.
- Google/Teams/Zoom integrations.
- Broadcast events.
- Production AI agents.
- Full enterprise compliance.

## 32. Risk Register

### 32.1 SkyOffice Prototype Risk

Risk:

The original SkyOffice code may have hard-coded assumptions that slow product
development.

Mitigation:

Step 0 major refactor before feature expansion.

### 32.2 Realtime Scaling Risk

Risk:

Realtime presence and movement may become expensive or unstable at high
concurrency.

Mitigation:

Start small, measure early, keep persistent state outside the realtime server,
and plan Redis/multi-node support.

### 32.3 Meeting Complexity Risk

Risk:

Native audio/video can become a large infrastructure burden.

Mitigation:

Use LiveKit/coturn with server-issued tokens first, keep media policy
server-controlled, and offer BYO Google/Teams/Zoom/Jitsi later.

### 32.4 Map Editor Scope Risk

Risk:

A full visual editor can become its own product.

Mitigation:

Start with import/config/admin workflows before building a full drag-and-drop
editor.

### 32.5 Asset Licensing Risk

Risk:

Development assets may not be safe for commercial launch.

Mitigation:

Quarantine inherited assets under `legacy/`, do not copy them into the target
app, and require a manifest entry before any target-app asset is bundled.

### 32.6 AI Safety Risk

Risk:

Agents could access sensitive user, room, or meeting data.

Mitigation:

Design agent APIs around RBAC, explicit scopes, audit events, and tenant
approval.

## 33. Definition Of Done For Full Product

The full product is complete when:

- Tenants can manage users, roles, and permissions through the control plane.
- Tenants can create and customize worlds.
- Tenants can manage maps, rooms, objects, zones, and spawn points.
- Users can enter the 2D office reliably.
- Users can join meetings through configured providers.
- Guests can be invited safely.
- Large events can use broadcast mode.
- AI agents can inspect and act through structured APIs.
- AI actions are permissioned and audited.
- Platform admins can monitor usage and cost.
- Tenant admins can configure branding and policies.
- The system supports per-tenant customization without code changes.
- The system can scale from small pilots to large tenants.
- Media costs are metered or capped.
- Security and audit requirements are met.
- Commercial assets are cleared before public launch.

## 34. Strategic Summary

The correct starting point is not the full SaaS platform. The correct starting
point is the **Customer Virtual Office App**.

The first step is not adding features. The first step is the **SkyOffice fork
and major refactor**.

After that, the product can progressively connect to the SaaS Foundation,
support tenant-custom worlds, add external meeting-provider integrations, add
world management, expose AI-friendly APIs, and eventually support broadcast
events.

The long-term product is not just a 2D office. It is a configurable spatial
work platform that tenants can shape and that AI agents can understand safely.
