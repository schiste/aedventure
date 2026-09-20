# Domain-Neutral Game Engine Boundary Audit

> Scope note: this is a shared-engine boundary audit for the live ADD game and
> the separate customer virtual-office/platform lane. Office planning here is
> not the ADD roadmap; ADD remains the first live game consumer.

## Purpose

This document defines the current boundary between the reusable 2D game
foundation, the live ADD game, and the virtual-office product code. The goal is
to keep the existing `apps/add-rpg` game moving while extracting only the map,
asset, renderer, input, protocol, and simulation primitives that have a real
consumer.

`apps/add-rpg` is already the real RPG/idle application. `apps/engine-sandbox`
is the neutral renderer/topology fixture. The office app is a separate product
lane. No second placeholder RPG app should be created to prove that the engine
works.

This is a boundary audit only. No code movement is part of this phase.

## Where does this change belong?

- Put ADD rules, saves, progression, combat, and simulation state in
  `crates/add-core/`.
- Put ADD authored IDs and content graph changes in
  `packages/add-content/src/content/`.
- Put reusable topology, world, input, or renderer contracts in
  `packages/game-*` only when a current ADD or office consumer exercises them.
- Put office room, tenant, media, auth, and collaboration behavior in the
  office app/domain/server lane.
- Keep product presentation in its owning app: `apps/add-rpg/` for ADD and
  `apps/web/` for the office lane.

For the exact first command, consult the [ADD Repository Capability
Map](add-capability-map.md). Do not infer ownership from a file's current
location when the boundary table below marks it as mixed.

## Boundary Rule

Neutral engine packages may know about:

- entities, players, units, positions, vectors, directions, ticks, and snapshots
- maps, tiles, layers, zones, spawns, blocked tiles, collision, and path/occupancy
- assets, atlases, frame metadata, footprints, anchors, occlusion, variants, and
  generic interaction affordances
- renderer hosts, scenes, cameras, labels, z-ordering, effects, telemetry, and QA
- input intents such as move, run, interact, select, cancel, and pointer/touch state

Neutral engine packages must not know about:

- meetings, media calls, office rooms, lobbies, lounges, tenant admin, RBAC, or
  Wikimedia auth
- RPG quests, combat, resource production, buildings, offline progression, or
  factions
- product-specific UI copy, product lifecycle messages, or app-specific controls

Domain packages translate neutral primitives into product behavior. For example,
an office package may map a zone action to "Join meeting", while an RPG package
may map the same primitive to "Harvest node" or "Enter building".

## Classification Legend

- `engine-neutral`: reusable foundation or near-reusable with small naming fixes
- `office-domain`: virtual-office domain data, maps, assets, prompts, or behavior
- `app-ui`: browser UI shell, product copy, DOM panels, and local demo workflow
- `server/product`: platform, auth, persistence, media, policy, and deployment

## Current Code Classification

| Path | Classification | Notes |
| --- | --- | --- |
| `apps/add-rpg` | `live product app` | The current ADD idle/RPG game: Solid UI, Phaser presentation, worker runtime, saves, telemetry, and player-facing flows. Engine work must keep this app working. |
| `crates/add-core` | `game-domain authority` | Rust-authoritative ADD simulation, commands, progression, saves, and deterministic state transitions. It is not a generic engine package. |
| `packages/add-runtime-client` | `game-domain adapter/content` | Authored ADD content, validation, snapshot selectors, command mapping, and world/presentation adapters. |
| `packages/game-*` | `engine-neutral` | Shared topology, world, renderer, input, and protocol primitives when they have a concrete app consumer. |
| `apps/engine-sandbox` | `engine-neutral QA` | Development fixture for topology and renderer proof; not the product game and not the source of ADD mechanics. |
| `packages/map-engine` | `engine-neutral` | Strongest current engine package. It owns vector movement, collision, zone overlap, speed limits, and permission-gated zone entry. Keep it neutral, but eventually rename concepts around generic entity movement instead of player-only movement if strategy units share it. |
| `packages/protocol` | `engine-neutral` with social/product edges | Movement intents, snapshots, directions, run/walk, and reconciliation payloads are reusable. Chat scopes and animation naming are useful for the office but should move behind optional domain extensions before this becomes the shared protocol for RPG/idle. |
| `packages/shared-types` | `server/product` with reusable IDs | Branded IDs are useful, but `TenantId`, `SessionId`, roles, permissions, and token claims are platform concerns. A future `game-core` should define engine IDs separately from account/platform IDs. |
| `packages/asset-registry` | mixed: `engine-neutral` + `office-domain` | Contains the best next extraction target. Generic asset metadata, atlas source metadata, footprints, z-anchors, occlusion, variants, validation, and compiled map layer shapes are reusable. The starter catalog, office style tags, SkyOffice references, prompt compiler, presets, and office furniture IDs are domain data. |
| `packages/policy` | `server/product` | Chat/media policy is important for virtual office and may stay shared for collaboration apps, but it is not a neutral game engine concern. RPG/idle permissions should not depend on media/chat policy. |
| `packages/auth-wikimedia` | `server/product` | Platform auth provider integration. Keep outside engine. |
| `apps/world-server` | mixed: `engine-neutral` runtime + `server/product` room service | Uses neutral map/movement/protocol primitives but also owns room membership, permissions, chat handling, and HTTP/WebSocket runtime details. Extract simulation/tick logic later; leave room/product orchestration here for now. |
| `apps/api` | `server/product` | Identity, sessions, permissions, persistence, OAuth, and world metadata APIs. Keep outside engine. |
| `apps/media-gateway` | `server/product` | Media token and LiveKit-style policy. Office/collaboration domain, not engine. |
| `apps/web/src/browser/engine/input-controller.ts` | `engine-neutral` candidate | Keyboard/touch intent capture is reusable. Needs a package boundary and generic app bindings. |
| `apps/web/src/browser/engine/world-sync-controller.ts` | `engine-neutral` candidate | Thin realtime protocol wrapper. Good candidate for `game-protocol` or `game-sync` after the protocol boundary is cleaned up. |
| `apps/web/src/browser/client-motion-controller.ts` and `movement-*` | `engine-neutral` candidate | Client prediction, smoothing, and movement feel are reusable for local/remote entities. Need generic entity naming and package-level tests before extraction. |
| `apps/web/src/browser/renderer/*` | mixed: mostly `engine-neutral` with office leaks | Tilemap, object, avatar/entity, zone, camera, DOM label, effects, telemetry, input, physics affordance, and QA support are reusable. `office-scene.ts`, `phaser-office-renderer.ts`, scene keys, meeting/media/audio naming, tenant lighting names, and zone action types are office/product leaks. |
| `apps/web/src/browser/main.ts` | `app-ui` with extraction candidates | Product shell, state, panels, prompt-to-map flow, media controls, chat, lifecycle copy, and `render_game_to_text`. Some helpers can move later, but this file should remain the office app adapter after extraction. |
| `apps/web/src/browser/styles.css` and `apps/web/index.html` | `app-ui` | Office product surface and layout. The live ADD app must not inherit these directly. |
| `apps/web/public/assets/internal-office-*` | `office-domain` | Office-specific generated atlas/manifest. The manifest schema is reusable; the files and source catalog belong to office-domain until a generic asset bundle layer exists. |
| `scripts/build-internal-office-atlas.cjs` | `office-domain` with reusable pattern | The generation/validation pattern is useful, but this script emits office assets and hard-codes office frames. A future engine should expose atlas manifest validation; each domain should own its atlas build script. |
| `scripts/frontend-smoke.test.cjs` | `app-ui` QA | Office demo smoke. Keep, but split multi-app smoke later. |
| `scripts/renderer-qa.test.cjs` | mixed: `engine-neutral` QA + office fixtures | Renderer nonblank, camera, depth, avatar, labels, and telemetry checks are reusable. Current fixtures and labels use office maps, office zones, and office UI state. |
| `scripts/responsive-layout-qa.test.cjs` | `app-ui` QA | Office product layout QA. Future apps need their own responsive smoke or a shared helper. |
| `docs/*` | mostly `office-domain`/planning | Current docs are centered on the virtual-office product. This document starts the shared-engine planning track. |

## Current Leaks To Fix Before Extraction

### Asset Registry

`packages/asset-registry/src/index.ts` currently combines four different
concerns:

- neutral asset types and validation
- neutral compiled map layer shapes
- office asset catalog data
- office prompt/preset generation

Specific leaks:

- `VisualAssetThemeTag` includes office tags such as `neutral_office`,
  `meeting`, `lounge`, `kitchen`, and `entry`.
- `starterVisualAssetCatalog` bundles office furniture, office walls, office
  styles, and legacy SkyOffice reference metadata.
- atlas constants contain `internal.generated.office.polished_v1`,
  `tileset.internal.polished.office`, and `internal-office-atlas`.
- `PresetMapId` is `lobby | meeting_room | lounge_cafe`.
- `SemanticZoneDefinition.zoneType` is limited to `meeting_private | lobby | quiet`.
- `promptToSemanticMapDefinition` is an office meeting-room generator, not a
  generic map generator.

Target split:

- `packages/game-assets`: metadata interfaces, manifest schema, validation,
  source/license helpers, footprints, occlusion, variants, interaction
  affordances.
- `packages/game-map`: semantic map schema, compiled layer schema, map
  validation, collision layer creation, spawn validation.
- `packages/office-domain`: office catalog, office prompt compiler, office
  presets, SkyOffice reference metadata, and internal office atlas paths.

### Map Compiler

`compileSemanticMapDefinition` is close to reusable, but the surrounding schema
is office-shaped.

Specific leaks:

- `SemanticMapDefinition.roomDimensions` assumes room-like rectangular maps.
  This is fine for office rooms but too narrow for RPG regions, idle towns, and
  strategy maps.
- furniture placements use `item` names that are converted to `item.${name}`.
  A neutral compiler should accept explicit token IDs or a domain resolver.
- zone types are office-only.
- prompt compilation is mixed into the same module as deterministic compilation.

Target split:

- Neutral compiler accepts token IDs, map dimensions, layers, zones, and domain
  metadata.
- Office compiler maps user prompts like "cozy meeting room" into the neutral
  schema.
- RPG compiler can map "starter forest camp" into the same neutral schema
  without importing office assets.

### Renderer Types

`apps/web/src/browser/renderer/types.ts` is mostly reusable, but it contains
domain words that would make a second app inherit office assumptions.

Specific leaks:

- `RendererZoneKind` includes `meeting`, `private`, `portal`, `lobby`, and
  `quiet`.
- `RendererZoneAction` includes `join_meeting`, `enter_private`, and
  `enter_portal`.
- `RendererAudioInfo` explicitly says media is handled by
  `livekit_or_browser_media`.
- `RendererEffectsInfo` includes tenant lighting terminology.
- `RendererSceneManagerInfo` reports `boot_preload_office_runtime` and
  `OfficeScene`.
- `FixtureToken.asset` imports `VisualAssetFrameMetadata` from
  `@aedventure/asset-registry`, which will be wrong once asset metadata moves to
  `game-assets`.

Target split:

- `packages/game-renderer-phaser`: generic renderer types, scene names,
  telemetry, camera, labels, effects, input hit testing, and depth info.
- `packages/office-domain`: office zone kind/action mapping and office-specific
  presentation labels.
- Optional domain extension type parameters or adapter callbacks for zone action
  labels and interaction priorities.

### Interaction Candidates

World interaction candidate construction currently lives in
`apps/web/src/browser/main.ts`, which means product state and engine state are
interleaved.

Specific leaks:

- `worldInteractionCandidateForZone` uses office zone actions.
- `worldInteractionSignature` includes `meetingJoined`.
- candidate priorities rank `join_meeting` above other actions.
- UI permission state is tied to server-permitted office actions.
- object affordances are generic enough to reuse, but their labels/prompts are
  currently mixed with office UI behavior.

Target split:

- Neutral interaction candidate builder:
  - zone candidate from bounds and action metadata
  - object candidate from asset interaction metadata
  - distance, active state, marker visibility, and priority hooks
- Domain resolver:
  - office maps `meeting_private` to `join_meeting`
  - RPG maps `resource_node` to `gather`, `building` to `upgrade`, etc.
- App adapter:
  - decides whether a candidate is server-permitted and how to display it.

### `render_game_to_text`

`render_game_to_text` is valuable for automation and agent friendliness, but the
current payload is an office app payload rather than a neutral engine snapshot.

Specific leaks:

- top-level fields include `sessionStatus`, `worldStatus`, `mediaStatus`,
  office controls, lifecycle copy, room empty state, and office collaboration
  panels.
- renderer telemetry is reusable, but mixed into a product status payload.
- movement and player fields are reusable if renamed around entities/local
  controlled actor.
- meeting, media, chat, room, and prompt-to-map data are office app concerns.

Target split:

- Neutral engine telemetry:
  - map, camera, renderer, input, entities, local actor, zones, interactions,
    movement/reconciliation, performance, and capabilities.
- App telemetry:
  - office session/media/chat/lifecycle panels.
- The live ADD app should expose the same neutral engine payload plus ADD-
  specific resource, progression, and story sections.

## Extraction Order

### First Move: `game-assets`

Move only neutral asset definitions and validation first. This is lowest risk
because the data model is already strongly typed and well tested.

Move:

- `VisualAssetSource`, `TilesetDefinition`, `VisualAssetFrameMetadata`
- footprints, anchors, occlusion, variants, interaction metadata
- catalog validation helpers
- manifest schema alignment used by `verify-internal-assets`

Leave in office domain:

- starter office catalog
- office source IDs and atlas paths
- SkyOffice reference source metadata
- office token IDs and tags
- office atlas generator frames

### Second Move: `game-map`

Move compiled map primitives and validation once asset metadata has a neutral
home.

Move:

- tile layer interfaces
- compiled map interfaces
- collision layer generation
- blocked tile/spawn/zone validation
- `compileSemanticMapDefinition` after replacing implicit `item.${name}` lookup
  with a token resolver

Leave in office domain:

- prompt keyword extraction
- office prompt-to-map compiler
- lobby/meeting/lounge presets
- office zone type mapping

### Third Move: `game-renderer-phaser`

Extract renderer modules after the map/asset contracts are neutral.

Move:

- renderer host
- scene manager with generic scene keys
- tilemap/object/avatar/entity/zone/camera renderers
- DOM label overlays
- input hit testing
- renderer telemetry
- renderer QA helpers

Leave in office app/domain:

- office zone labels/actions
- meeting/media UI wiring
- office scene adapter state
- office prompt-to-map controls

### Fourth Move: `game-input` and `game-protocol`

Extract after the renderer can consume neutral maps/entities.

Move:

- keyboard/touch vector input
- run/walk intent generation
- sequence-numbered input history shape
- movement snapshots and reconciliation payloads
- generic action command shape

Leave in office app/server:

- room chat/media messages until optional domain protocol extensions exist
- OAuth/session/permission token claims

### Fifth Move: Exercise The Live ADD App

Do not add a minimal second RPG/idle app. The existing `apps/add-rpg` is the
consumer that proves whether a shared engine seam is useful.

Acceptance for this phase:

- the live ADD app continues to build and boot through its worker/WASM runtime
- the ADD smoke test exercises the changed engine seam through a player-facing
  flow
- the seam has a focused package test and a deterministic fixture
- ADD-specific rules remain in `crates/add-core` or `packages/add-runtime-client`
- the engine package does not import office or ADD domain code
- `apps/engine-sandbox` covers neutral square/hex rendering cases where a
  product flow would be unnecessarily expensive

## Package Target Shape

```txt
apps/
  virtual-office/
  engine-sandbox/
  add-rpg/

packages/
  game-assets/
  game-map/
  game-renderer-phaser/
  game-input/
  game-protocol/
  game-core/
  game-telemetry/

  office-domain/
  add-runtime-client/
```

The existing `apps/web` can stay in place during extraction, but its long-term
role should become the virtual-office app adapter. Renaming it to
`apps/virtual-office` is useful later, not in the first extraction commit.

## Acceptance Gates For Each Extraction Phase

Every extraction phase must keep:

- virtual office behavior unchanged
- no office imports from neutral packages
- no RPG imports from neutral packages
- no direct UI or server imports inside engine packages
- `npm run check` passing
- `npm run smoke:frontend` passing until multi-app smoke exists
- `npm run qa:renderer` passing
- `npm run qa:responsive` passing
- `git diff --check` clean

Keep the live ADD app as the product check:

- ADD smoke test as the real RPG/idle app check
- engine sandbox square/hex nonblank screenshot check
- import boundary checks for `office-domain`, `add-runtime-client`, and neutral engine
  packages

## Immediate Next Implementation Task

Build the first agent-observable scenario/replay seam around the live ADD app:

1. Define a stable scenario format containing a seed, initial save, commands,
   expected checkpoints, and an optional presentation assertion.
2. Run it against `crates/add-core` headlessly before involving the browser.
3. Reuse the same command sequence in `apps/add-rpg` smoke coverage.
4. Expose a compact structured state report so an agent can explain what is
   blocked and what action is available next.

Asset extraction remains valuable, but it should follow a concrete ADD feature
or renderer need. The detailed sequence for scenarios, inspection, content,
QA, and shared-engine extraction lives in
[ADD Game Development Tooling Plan](add-game-development-tooling-plan.md).
