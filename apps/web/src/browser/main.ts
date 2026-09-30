import {
  PhaserOfficeRenderer,
  type AvatarAnimationAction,
  type AvatarEmoteId,
  type AvatarVisualFacing,
  type RenderedPlayer,
  type RendererCameraFollowMotion,
  type RendererCameraState,
  type RendererDevToolOverlayId,
  type RendererDevToolOverlayState,
  type RendererEffectsInfo,
  type RendererEffectsOptions,
  type RendererPerformanceInfo,
  type RendererWorldInteractionAction,
  type RendererWorldInteractionCandidate,
  type RendererWorldInteractionInfo,
  type RendererWorldInteractionPermissionState,
  type RendererZonePresentationOverride,
  type RendererZoomPresetId,
} from "./phaser-office-renderer"
import { validateFixtureMapForRenderer } from "@aedventure/game-renderer-phaser"
import {
  CLIENT_INPUT_HISTORY_LIMIT,
  CLIENT_MOVEMENT_FRAME_MS,
  CLIENT_PREDICTION_MAX_STEP_MS,
  createClientMovementPrediction,
  initialMovementPredictionState,
  movementPredictionCorrectionPx,
  movementPredictionMatches,
  replayMovementPredictions,
  trimMovementPredictionHistory,
  type ClientMovementPrediction,
  type MovementPredictionState,
} from "./movement-prediction"
import {
  ClientMotionController,
  type ClientMotionIntent,
  type ClientMotionSnapshot,
} from "./client-motion-controller"
import {
  DEFAULT_MOVEMENT_FEEL,
  DEFAULT_MOVEMENT_FEEL_PRESET_ID,
  MOVEMENT_FEEL_CONTROLS,
  MOVEMENT_FEEL_PRESETS,
  clampMovementFeelValue,
  formatMovementFeelValue,
  isMovementFeelPresetId,
  isMovementFeelTuningKey,
  movementFeelPresetForId,
  movementFeelPresetIdForTuning,
  movementCollisionBodySize,
  movementCollisionSlideOptions,
  normalizeMovementFeel,
  type MovementFeelPresetId,
  type MovementFeelTuning,
  type MovementFeelTuningKey,
} from "./movement-feel"
import {
  eventTargetConsumesGameInput,
  gameInputTelemetry,
  InputController,
  joystickInputFromPointer,
  keyboardGameInputActionForKey,
  keyboardMovementDirectionForKey,
  movementControlIntentFromDataset,
  sequenceMoveIntent,
  type MovementControlIntent,
  type RawMovementIntent,
} from "@aedventure/game-input"
import { WorldSyncController } from "./engine/world-sync-controller"
import {
  movementVectorForDirection,
  type Direction,
  type MovementMode,
  type MovementVector,
} from "@aedventure/game-protocol"
import {
  compileDeterministicPromptMap,
  compilePresetMap,
  presetMapSummaries,
  starterVisualAssetCatalog,
  type DeterministicPromptMapResult,
  type PresetMapId,
  type PresetMapResult,
  type PromptMapValidation,
} from "@aedventure/asset-registry"
import type { VisualAssetFrameMetadata } from "@aedventure/game-assets"

type StatusState = "idle" | "pending" | "ready" | "blocked"
type ToastTone = "info" | "success" | "warning" | "error"
type MapSwitcherId = PresetMapId | "generated"
type AvatarId = "ember" | "cobalt" | "moss" | "violet"
type DepthFixtureCaseId =
  | "table_player_behind"
  | "table_player_front"
  | "wall_player_behind"
type RendererReadiness = "loading" | "ready" | "failed"
type DevToolFixtureId =
  | PresetMapId
  | "generated"
  | "depth_table_player_behind"
  | "depth_table_player_front"
  | "depth_wall_player_behind"
  | "avatar_fixture"
  | "avatar_preview_gallery"
  | "zone_fixture"
  | "stress_20x15"
  | "stress_50x40"
  | "stress_100x80"
type StageOverlayState =
  | "loading"
  | "empty"
  | "reloading"
  | "recovery"
  | "error"
  | "hidden"
type LifecyclePhase =
  | "empty"
  | "joining"
  | "joined"
  | "leaving"
  | "map_reloading"
  | "recovering"
type MovementRejectedReason =
  | "invalid_message"
  | "collision"
  | "speed_limit"
  | "zone_permission"
  | "unknown_player"

interface Vector2 {
  readonly x: number
  readonly y: number
}

interface FixtureMap {
  readonly definition: {
    readonly style: string
  }
  readonly compiled: {
    readonly width: number
    readonly height: number
    readonly tileSize: number
    readonly blockedTiles: readonly Vector2[]
    readonly layers: {
      readonly floor: TileLayer
      readonly walls: TileLayer
      readonly objects: TileLayer
    }
    readonly collisionLayers?: {
      readonly movement: {
        readonly name: "movement"
        readonly width: number
        readonly height: number
        readonly blocked: readonly (readonly boolean[])[]
        readonly blockedTiles: readonly Vector2[]
      }
    }
    readonly zones: readonly FixtureZone[]
  }
  readonly spawnPoints: readonly {
    readonly id: string
    readonly position: Vector2
  }[]
  readonly catalog: {
    readonly tokens: readonly FixtureToken[]
  }
}

interface TileLayer {
  readonly gids: readonly (readonly number[])[]
}

interface FixtureToken {
  readonly id: string
  readonly kind: "floor" | "wall" | "item" | "avatar"
  readonly provisionalGid: number
  readonly widthTiles: number
  readonly heightTiles: number
  readonly asset?: VisualAssetFrameMetadata
}

interface FixtureZone {
  readonly id: string
  readonly xStart: number
  readonly yStart: number
  readonly xEnd: number
  readonly yEnd: number
  readonly zoneType: string
}

interface WorldEvent {
  readonly type: "broadcast" | "send"
  readonly exceptClientId?: string
  readonly clientIds?: readonly string[]
  readonly message: ServerMessage
}

type ServerMessage =
  | {
      readonly type: "player_state"
      readonly playerId: string
      readonly x: number
      readonly y: number
      readonly direction: Direction
      readonly seqAck?: number
      readonly serverTime?: number
      readonly requestedVector?: MovementVector
      readonly appliedVector?: MovementVector
      readonly collisionSlide?: boolean
      readonly collisionSlideAxis?: "x" | "y" | "corner"
      readonly collisionSlideDistancePx?: number
      readonly movementMode?: MovementMode
      readonly speedPxPerSecond?: number
    }
  | {
      readonly type: "world_snapshot"
      readonly roomId: string
      readonly tick: number
      readonly tickMs: number
      readonly serverTime: number
      readonly inputStats: {
        readonly authority: "server_authoritative_fixed_tick"
        readonly inputCoalescing: "latest_intent_per_client_per_tick"
        readonly queuedClientCount: number
        readonly processedMoveCount: number
        readonly droppedMoveCount: number
        readonly maxQueueDepth: number
        readonly latestInputAgeMs?: number
      }
      readonly players: readonly {
        readonly playerId: string
        readonly userId?: string
        readonly x: number
        readonly y: number
        readonly direction: Direction
        readonly zoneIds: readonly string[]
        readonly lastSeqAck: number
        readonly movementMode?: MovementMode
      }[]
    }
  | {
      readonly type: "chat_delivered"
      readonly body: string
      readonly recipientPlayerIds: readonly string[]
    }
  | {
      readonly type: "movement_rejected"
      readonly playerId: string
      readonly reason: MovementRejectedReason
      readonly x: number
      readonly y: number
      readonly seqAck: number
      readonly serverTime?: number
      readonly requestedVector?: MovementVector
      readonly appliedVector?: MovementVector
      readonly collisionSlide?: boolean
      readonly collisionSlideAxis?: "x" | "y" | "corner"
      readonly collisionSlideDistancePx?: number
      readonly movementMode?: MovementMode
      readonly speedPxPerSecond?: number
    }
  | {
      readonly type: "protocol_error"
      readonly code?: string
      readonly message: string
    }
  | {
      readonly reason?: string
    }

interface PlayerSnapshot {
  readonly playerId: string
  readonly userId?: string
  readonly position?: Vector2
  readonly x?: number
  readonly y?: number
  readonly direction?: Direction
  readonly movementMode?: MovementMode
  readonly cameraMotion?: RendererCameraFollowMotion
  readonly rejected?: boolean
  readonly snapshotTick?: number
  readonly snapshotServerTime?: number
  readonly snapshotReceivedAtMs?: number
}

interface AppState {
  sessionId?: string
  playerId: string
  clientId: string
  seq: number
  position: Vector2
  direction: Direction
  profile: {
    displayName: string
    avatarId: AvatarId
  }
  joined: boolean
  companion: {
    playerId: string
    clientId: string
    displayName: string
    avatarId: AvatarId
    position: Vector2
    direction: Direction
    joined: boolean
  }
  fixtureMap?: FixtureMap
  players: Map<string, RenderedPlayer>
  snapshotPlayerIds: string[]
  movementPrediction: MovementPredictionState
  lifecycle: {
    phase: LifecyclePhase
    message: string
    publicMessage: string
    detail?: string
    lastRecoveryReason?: string
  }
  rendererReadiness: RendererReadiness
  activeZone?: FixtureZone
  worldInteractionInfo: RendererWorldInteractionInfo
  worldInteractionSignature?: string
  meetingJoined: boolean
  meetingZoneId?: string
  mediaRequestPending: boolean
  mediaSession?: MediaSession
  mediaUnavailableMessage?: string
  mediaUnavailableDetail?: string
  micEnabled: boolean
  cameraEnabled: boolean
  mapGeneration: MapGenerationState
  generatedRoom?: GeneratedRoomState
  generatedPreview?: GeneratedMapPreviewState
  devTools: DevToolsAppState
  movementFeel: MovementFeelTuning
  serverProtocolMismatch?: ServerProtocolMismatchState
  lastMediaRoom?: string
  lastChatBody?: string
  lastMovementRejection?: {
    readonly reason: MovementRejectedReason
    readonly atMs: number
  }
  pendingAction: Promise<void>
}

interface MovementReconciliationResult {
  readonly acknowledged: ClientMovementPrediction
  readonly authoritativePosition: Vector2
  readonly replayTarget: Vector2
  readonly replayCount: number
  readonly rejected: boolean
}

interface ChatRecord {
  readonly id: string
  readonly body: string
  readonly recipientCount: number
}

interface MovementDebugRecord {
  readonly atMs: number
  readonly label: string
  readonly detail: string
}

interface ServerProtocolMismatchState {
  readonly kind: "movement_vector_telemetry_missing"
  readonly detectedAtMs: number
  readonly lastSeqAck?: number
}

interface MapGenerationState {
  readonly source: "preset" | "generated"
  readonly mapId: MapSwitcherId
  readonly label: string
  readonly prompt: string
  readonly keywords: readonly string[]
  readonly validation?: PromptMapValidation
  readonly preview?: GeneratedMapPreviewState
}

interface GeneratedRoomState {
  readonly fixtureMap: FixtureMap
  readonly mapGeneration: MapGenerationState
}

interface GeneratedMapPreviewState {
  readonly mode: "preflight" | "invalid" | "applied"
  readonly mdiSchema: "semantic_map_definition"
  readonly rendererAgnostic: true
  readonly compilerOutputs: readonly ["render_layers", "collision_layers", "zones"]
  readonly previewFingerprint: string
  readonly appliedFingerprint?: string
  readonly previewMatchesRendered: boolean
  readonly rendererPreflight: {
    readonly valid: boolean
    readonly errors: readonly string[]
    readonly visualFootprintCount: number
  }
}

interface DevToolsAppState {
  readonly gated: boolean
  enabled: boolean
  activeFixtureId?: DevToolFixtureId
  lastAction?: string
  overlays: RendererDevToolOverlayState
}

interface DepthFixtureCaseResult {
  readonly id: DepthFixtureCaseId
  readonly expectedLayerAtSample: "avatar" | "object"
  readonly sample: Vector2
  readonly sampleViewport: Vector2
  readonly playerPosition: Vector2
  readonly occluderTokenId: string
}

interface AvatarFixtureResult {
  readonly playerIds: readonly string[]
  readonly avatarIds: readonly AvatarId[]
  readonly directions: readonly Direction[]
}

interface AvatarPreviewGalleryResult {
  readonly playerIds: readonly string[]
  readonly avatarIds: readonly AvatarId[]
  readonly actions: readonly AvatarAnimationAction[]
  readonly visualFacings: readonly AvatarVisualFacing[]
  readonly serverDirections: readonly Direction[]
  readonly rows: number
  readonly columns: number
}

interface ZoneFixtureResult {
  readonly zoneIds: readonly string[]
  readonly zoneTypes: readonly string[]
}

interface BigMapBenchmarkSample {
  readonly pass: number
  readonly size: "20x15" | "50x40" | "100x80"
  readonly performance: RendererPerformanceInfo
  readonly staticTileCount: number
  readonly objectCount: number
  readonly mapRenderDurationMs: number
  readonly proof: BigMapBenchmarkSampleProof
}

interface BigMapBenchmarkResult {
  readonly samples: readonly BigMapBenchmarkSample[]
  readonly gameInstanceIds: readonly number[]
  readonly repeatedLargeMapDisplayObjectDelta: number
  readonly repeatedLargeMapTextureDelta: number
  readonly repeatedLargeMapCreatedSpriteDelta: number
  readonly repeatedLargeMapCreatedTextureDelta: number
  readonly proof: BigMapBenchmarkProof
}

interface BigMapBenchmarkSampleProof {
  readonly tileBatching: boolean
  readonly staticLayerBaking: boolean
  readonly viewportCullingAccounted: boolean
  readonly viewportCullingActive: boolean
  readonly objectPoolingActive: boolean
  readonly objectPoolReuseObserved: boolean
  readonly textureReuseObserved: boolean
}

interface BigMapBenchmarkProof {
  readonly passed: boolean
  readonly benchmarkMapsCovered: boolean
  readonly tileBatching: boolean
  readonly staticLayerBaking: boolean
  readonly viewportCulling: boolean
  readonly objectPooling: boolean
  readonly textureReuse: boolean
  readonly noMapSwitchLeaks: boolean
}

interface InvalidMapAttemptResult {
  readonly accepted: boolean
  readonly error?: string
  readonly before: {
    readonly activeMapId?: string
    readonly mapRenderCount: number
    readonly renderFingerprint: string
  }
  readonly after: {
    readonly activeMapId?: string
    readonly mapRenderCount: number
    readonly renderFingerprint: string
  }
}

type MediaTokenResponse =
  | {
      readonly status: "issued"
      readonly liveKitUrl: string
      readonly token: string
      readonly room: string
      readonly canPublish: boolean
      readonly canSubscribe: boolean
      readonly participantPlayerIds: readonly string[]
      readonly expiresAt: string
    }
  | {
      readonly status: "denied"
      readonly reason?: string
    }

interface MediaSession {
  readonly liveKitUrl: string
  readonly token: string
  readonly room: string
  readonly canPublish: boolean
  readonly canSubscribe: boolean
  readonly participantPlayerIds: readonly string[]
  readonly expiresAt: string
}

const MOVE_REPEAT_MS = CLIENT_MOVEMENT_FRAME_MS
const MOVEMENT_REJECTION_FEEDBACK_MS = 900
const TOAST_TTL_MS = 4200
const MAX_TOASTS = 3
const MAX_CHAT_MESSAGES = 5
const MAX_RECENT_EVENTS = 8
const DEFAULT_MAP_PROMPT =
  "cozy 10-person meeting room with wooden walls, plants, and a coffee bar"
const DEFAULT_DISPLAY_NAME = "Browser Ada"
const DEFAULT_AVATAR_ID: AvatarId = "ember"
const MOBILE_LAYOUT_QUERY = "(max-width: 760px)"
const JOYSTICK_DEADZONE_RATIO = 0.18
const JOYSTICK_DEFAULT_RADIUS_PX = 54
const JOYSTICK_MIN_MAGNITUDE = 0.08
const avatarIds: readonly AvatarId[] = ["ember", "cobalt", "moss", "violet"]
const avatarPreviewActions: readonly AvatarAnimationAction[] = [
  "idle",
  "walk",
  "run",
  "turn",
]
const avatarPreviewFacings: readonly AvatarVisualFacing[] = [
  "up",
  "upRight",
  "right",
  "downRight",
  "down",
  "downLeft",
  "left",
  "upLeft",
]
const DEV_TOOL_FIXTURES: readonly DevToolFixtureId[] = [
  "lobby",
  "meeting_room",
  "lounge_cafe",
  "generated",
  "depth_table_player_behind",
  "depth_table_player_front",
  "depth_wall_player_behind",
  "avatar_fixture",
  "avatar_preview_gallery",
  "zone_fixture",
  "stress_20x15",
  "stress_50x40",
  "stress_100x80",
]
const DEV_TOOL_OVERLAY_IDS: readonly RendererDevToolOverlayId[] = [
  "grid",
  "collision",
  "zones",
  "depth",
  "objectFootprints",
  "spriteBounds",
  "camera",
]
const DEV_TOOL_OVERLAY_LABELS: Record<RendererDevToolOverlayId, string> = {
  grid: "Grid",
  collision: "Collision",
  zones: "Zone bounds",
  depth: "Depth anchors",
  objectFootprints: "Object footprints",
  spriteBounds: "Sprite bounds",
  camera: "Camera info",
}
const WORLD_INTERACTION_OBJECT_RADIUS_TILES = 1.35

const state: AppState = {
  sessionId: undefined,
  playerId: "player-1",
  clientId: `browser-${Math.floor(Math.random() * 100000)}`,
  seq: 1,
  position: { x: 96, y: 64 },
  direction: "down",
  profile: {
    displayName: DEFAULT_DISPLAY_NAME,
    avatarId: DEFAULT_AVATAR_ID,
  },
  joined: false,
  companion: {
    playerId: "player-2",
    clientId: `companion-${Math.floor(Math.random() * 100000)}`,
    displayName: "Grace",
    avatarId: "cobalt",
    position: { x: 96, y: 96 },
    direction: "down",
    joined: false,
  },
  fixtureMap: undefined,
  players: new Map(),
  snapshotPlayerIds: [],
  movementPrediction: initialMovementPredictionState(),
  lifecycle: {
    phase: "empty",
    message: "Room empty",
    publicMessage: "Room empty",
    detail: undefined,
  },
  rendererReadiness: "loading",
  activeZone: undefined,
  worldInteractionInfo: emptyWorldInteractionInfo(),
  worldInteractionSignature: undefined,
  meetingJoined: false,
  meetingZoneId: undefined,
  mediaRequestPending: false,
  mediaSession: undefined,
  mediaUnavailableMessage: undefined,
  mediaUnavailableDetail: undefined,
  micEnabled: false,
  cameraEnabled: false,
  mapGeneration: {
    source: "preset",
    mapId: "lobby",
    label: "Lobby",
    prompt: "Lobby",
    keywords: ["lobby"],
    validation: undefined,
  },
  generatedRoom: undefined,
  generatedPreview: undefined,
  devTools: initialDevToolsState(),
  movementFeel: DEFAULT_MOVEMENT_FEEL,
  serverProtocolMismatch: undefined,
  lastMediaRoom: undefined,
  lastChatBody: undefined,
  lastMovementRejection: undefined,
  pendingAction: Promise.resolve(),
}
const inputController = new InputController(state.movementFeel, {
  joystickDefaultRadiusPx: JOYSTICK_DEFAULT_RADIUS_PX,
  joystickDeadzoneRatio: JOYSTICK_DEADZONE_RATIO,
})
let movementTimerId: number | undefined
const clientMotion = new ClientMotionController(state.movementFeel)
const worldSync = new WorldSyncController((events) =>
  applyEvents(events as readonly WorldEvent[]),
)
const recentEvents: string[] = []
const chatMessages: ChatRecord[] = []
const movementDebugRecords: MovementDebugRecord[] = []
const toasts = new Map<string, number>()
let movementFeelSyncTimerId: number | undefined

const elements = {
  start: mustQuery<HTMLButtonElement>("#start"),
  reset: mustQuery<HTMLButtonElement>("#reset"),
  map: mustQuery<HTMLElement>("#map"),
  stageOverlay: mustQuery<HTMLElement>("#stage-overlay"),
  stageOverlayKicker: mustQuery<HTMLElement>("#stage-overlay-kicker"),
  stageOverlayTitle: mustQuery<HTMLElement>("#stage-overlay-title"),
  stageOverlayBody: mustQuery<HTMLElement>("#stage-overlay-body"),
  sessionStatus: mustQuery<HTMLElement>("#session-status"),
  sessionPill: mustQuery<HTMLElement>("#session-pill"),
  worldStatus: mustQuery<HTMLElement>("#world-status"),
  worldPill: mustQuery<HTMLElement>("#world-pill"),
  lifecycleBanner: mustQuery<HTMLElement>("#lifecycle-banner"),
  lifecycleStatus: mustQuery<HTMLElement>("#lifecycle-status"),
  displayName: mustQuery<HTMLInputElement>("#demo-display-name"),
  avatarButtons: [
    ...document.querySelectorAll<HTMLButtonElement>("[data-avatar-id]"),
  ],
  mapSwitcherButtons: [
    ...document.querySelectorAll<HTMLButtonElement>("[data-map-id]"),
  ],
  promptExampleButtons: [
    ...document.querySelectorAll<HTMLButtonElement>("[data-prompt-example]"),
  ],
  mapGeneratorForm: mustQuery<HTMLFormElement>("#map-generator-form"),
  mapPrompt: mustQuery<HTMLTextAreaElement>("#map-prompt"),
  generateMap: mustQuery<HTMLButtonElement>("#generate-map"),
  generatedMapAvailability: mustQuery<HTMLElement>("#generated-map-availability"),
  generatedPreview: mustQuery<HTMLElement>("#generated-preview"),
  generatedPreviewDetail: mustQuery<HTMLElement>("#generated-preview-detail"),
  mapGenerationStatus: mustQuery<HTMLElement>("#map-generation-status"),
  validationBlocked: mustQuery<HTMLElement>("#validation-blocked"),
  validationSpawns: mustQuery<HTMLElement>("#validation-spawns"),
  validationZones: mustQuery<HTMLElement>("#validation-zones"),
  validationSummary: mustQuery<HTMLElement>("#validation-summary"),
  mediaStatus: mustQuery<HTMLElement>("#media-status"),
  mediaPill: mustQuery<HTMLElement>("#media-pill"),
  chatForm: mustQuery<HTMLFormElement>("#chat-form"),
  chatBody: mustQuery<HTMLInputElement>("#chat-body"),
  chatStatus: mustQuery<HTMLElement>("#chat-status"),
  chatMessages: mustQuery<HTMLOListElement>("#chat-messages"),
  toastRegion: mustQuery<HTMLElement>("#toast-region"),
  meetingPanel: mustQuery<HTMLElement>("#meeting-panel"),
  meetingStatus: mustQuery<HTMLElement>("#meeting-status"),
  meetingHint: mustQuery<HTMLElement>("#meeting-hint"),
  joinMeeting: mustQuery<HTMLButtonElement>("#join-meeting"),
  leaveMeeting: mustQuery<HTMLButtonElement>("#leave-meeting"),
  worldActionPanel: mustQuery<HTMLElement>("#world-action-panel"),
  worldActionStatus: mustQuery<HTMLElement>("#world-action-status"),
  worldActionHint: mustQuery<HTMLElement>("#world-action-hint"),
  worldActionShortcut: mustQuery<HTMLElement>("#world-action-shortcut"),
  worldActionPrimary: mustQuery<HTMLButtonElement>("#world-action-primary"),
  mediaPanel: mustQuery<HTMLElement>("#media-panel"),
  mediaPanelStatus: mustQuery<HTMLElement>("#media-panel-status"),
  mediaAvailability: mustQuery<HTMLElement>("#media-availability"),
  mediaRoom: mustQuery<HTMLElement>("#media-room"),
  mediaEndpoint: mustQuery<HTMLElement>("#media-endpoint"),
  mediaParticipants: mustQuery<HTMLElement>("#media-participants"),
  mediaTokenStatus: mustQuery<HTMLElement>("#media-token-status"),
  localPreview: mustQuery<HTMLElement>("#local-preview"),
  previewAvatar: mustQuery<HTMLElement>(".preview-avatar"),
  previewStatus: mustQuery<HTMLElement>("#preview-status"),
  toggleMic: mustQuery<HTMLButtonElement>("#toggle-mic"),
  toggleCamera: mustQuery<HTMLButtonElement>("#toggle-camera"),
  cameraFollow: mustQuery<HTMLButtonElement>("#camera-follow"),
  cameraFit: mustQuery<HTMLButtonElement>("#camera-fit"),
  zoomPreset: mustQuery<HTMLSelectElement>("#zoom-preset"),
  zoomOut: mustQuery<HTMLButtonElement>("#zoom-out"),
  zoomReset: mustQuery<HTMLButtonElement>("#zoom-reset"),
  zoomIn: mustQuery<HTMLButtonElement>("#zoom-in"),
  runToggle: mustQuery<HTMLButtonElement>("#run-toggle"),
  joystick: mustQuery<HTMLElement>("#analog-joystick"),
  joystickKnob: mustQuery<HTMLElement>("#joystick-knob"),
  joystickStatus: mustQuery<HTMLElement>("#joystick-status"),
  movementDebugLog: mustQuery<HTMLOListElement>("#movement-debug-log"),
  movementDebugCopy: mustQuery<HTMLButtonElement>("#movement-debug-copy"),
  movementFeelPanel: mustQuery<HTMLDetailsElement>("#movement-feel-panel"),
  movementFeelSummary: mustQuery<HTMLElement>("#movement-feel-summary"),
  movementFeelPresets: mustQuery<HTMLElement>("#movement-feel-presets"),
  movementFeelControls: mustQuery<HTMLElement>("#movement-feel-controls"),
  movementFeelReset: mustQuery<HTMLButtonElement>("#movement-feel-reset"),
  rendererDevMenu: mustQuery<HTMLElement>("#renderer-dev-menu"),
  rendererDevMenuStatus: mustQuery<HTMLElement>("#renderer-dev-menu-status"),
  rendererDevOverlayControls: mustQuery<HTMLElement>(
    "#renderer-dev-overlay-controls",
  ),
  rendererDevFixture: mustQuery<HTMLSelectElement>("#renderer-dev-fixture"),
  mobileCollapsibleSections: [
    ...document.querySelectorAll<HTMLDetailsElement>("[data-mobile-collapsible]"),
  ],
}
const renderer = new PhaserOfficeRenderer(elements.map)
renderer.setWorldInteractionActivationHandler((candidateId) => {
  queueAction(() => runWorldActionByCandidateId(candidateId))
})
const mobileLayoutQuery = window.matchMedia(MOBILE_LAYOUT_QUERY)
syncRendererDevTools()
installDevToolsKeyboardShortcuts()
installRendererDevMenu()

elements.start.addEventListener("click", () => queueAction(() => startDemo()))
elements.reset.addEventListener("click", () => queueAction(() => resetDemo()))
elements.displayName.addEventListener("input", () => {
  state.profile.displayName = elements.displayName.value
  renderIdentityControls()
  seedLocalRenderedPlayer()
  renderPlayers()
  renderMediaPanel()
})
elements.displayName.addEventListener("blur", () => {
  elements.displayName.value = displayNameForLocalProfile()
  state.profile.displayName = elements.displayName.value
  renderIdentityControls()
  seedLocalRenderedPlayer()
  renderPlayers()
  renderMediaPanel()
})
elements.avatarButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const avatarId = button.dataset.avatarId
    if (!isAvatarId(avatarId)) return
    state.profile.avatarId = avatarId
    renderIdentityControls()
    seedLocalRenderedPlayer()
    renderPlayers()
    renderMediaPanel()
  })
})
elements.mapSwitcherButtons.forEach((button) => {
  button.addEventListener("click", () =>
    queueAction(() => switchMap(button.dataset.mapId as MapSwitcherId)),
  )
})
elements.promptExampleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const prompt = button.dataset.promptExample
    if (!prompt) return
    elements.mapPrompt.value = prompt
    elements.mapPrompt.focus()
  })
})
elements.mapGeneratorForm.addEventListener("submit", (event) => {
  event.preventDefault()
  queueAction(() => generateMapFromPrompt())
})
elements.joinMeeting.addEventListener("click", () => queueAction(() => joinMeeting()))
elements.leaveMeeting.addEventListener("click", () => queueAction(() => leaveMeeting()))
elements.worldActionPrimary.addEventListener("click", () =>
  queueAction(() => runPrimaryWorldAction()),
)
elements.toggleMic.addEventListener("click", () => toggleMic())
elements.toggleCamera.addEventListener("click", () => toggleCamera())
elements.runToggle.addEventListener("click", () => {
  inputController.toggleRun()
  renderMovementModeControl()
  requestMoveFromHeldInput()
})
document
  .querySelectorAll<HTMLButtonElement>("[data-move-x][data-move-y][data-facing]")
  .forEach((button) => installMovementControlButton(button))
installAnalogJoystick()
elements.movementDebugCopy.addEventListener("click", () => {
  void copyMovementDebugLog()
})
installMovementFeelPanel()
elements.chatForm.addEventListener("submit", (event) => {
  event.preventDefault()
  queueAction(() => sendChat(elements.chatBody.value))
})
elements.zoomOut.addEventListener("click", () => {
  renderer.zoomOut()
  renderCameraControls(renderer.getCameraState())
})
elements.zoomReset.addEventListener("click", () => {
  renderer.resetZoom()
  renderCameraControls(renderer.getCameraState())
})
elements.zoomIn.addEventListener("click", () => {
  renderer.zoomIn()
  renderCameraControls(renderer.getCameraState())
})
elements.cameraFollow.addEventListener("click", () => {
  renderCameraControls(renderer.setCameraMode("follow_player"))
})
elements.cameraFit.addEventListener("click", () => {
  renderCameraControls(renderer.setCameraMode("fit_room"))
})
elements.zoomPreset.addEventListener("change", () => {
  const zoomPreset = elements.zoomPreset.value
  if (!isRendererZoomPresetId(zoomPreset) || zoomPreset === "custom") return
  renderCameraControls(renderer.setZoomPreset(zoomPreset))
})
document.addEventListener("keydown", (event) => {
  if (eventTargetConsumesGameInput(event.target)) return

  const action = keyboardGameInputActionForKey(event.key)
  if (action?.type === "interact") {
    if (
      !event.repeat &&
      state.worldInteractionInfo.state === "available" &&
      primaryWorldActionCandidate()?.serverPermitted
    ) {
      event.preventDefault()
      logMovementDebug("interact", "pressed E for primary world action")
      queueAction(() => runPrimaryWorldAction())
    }
    return
  }

  if (action?.type === "run") {
    if (!inputController.snapshot().shiftRunning) {
      inputController.setShiftRunning(true)
      renderMovementModeControl()
      requestMoveFromHeldInput()
    }
    return
  }

  const direction = keyboardMovementDirectionForKey(event.key)
  if (!direction) return

  event.preventDefault()
  if (event.repeat) {
    logMovementDebug("key-repeat", `${event.key} ignored`)
    return
  }

  logMovementDebug("key-down", `${event.key} -> ${direction}`)
  pressDirection(direction)
})
document.addEventListener("keyup", (event) => {
  if (eventTargetConsumesGameInput(event.target)) return

  const action = keyboardGameInputActionForKey(event.key)
  if (action?.type === "run") {
    inputController.setShiftRunning(false)
    renderMovementModeControl()
    requestMoveFromHeldInput()
    return
  }

  const direction = keyboardMovementDirectionForKey(event.key)
  if (!direction) return

  event.preventDefault()
  logMovementDebug("key-up", `${event.key} -> ${direction}`)
  releaseDirection(direction)
})
window.addEventListener("blur", () => {
  logMovementDebug("blur", "cleared held movement")
  stopHeldMovement()
})
mobileLayoutQuery.addEventListener("change", () => syncResponsiveToolSections())

switchToPresetMap("lobby", { announce: false })
  .then(() => applyInitialDevFixture())
  .catch((error: unknown) => {
    setRendererReadiness("failed")
    setLifecycleStatus(
      "recovering",
      "Unable to load office",
      "The office map could not be prepared. Refresh the page or try again shortly.",
      technicalErrorDetail(error),
    )
    publishToast("The office could not load. Try again shortly.", "error")
    renderPlayers()
  })
void renderer.advanceTime().then(
  () => setRendererReadiness("ready"),
  (error: unknown) => {
    setRendererReadiness("failed")
    setLifecycleStatus(
      "recovering",
      "Renderer unavailable",
      "The office view could not start. Refresh the page or try again shortly.",
      technicalErrorDetail(error),
    )
    publishToast("The office view could not start.", "error")
  },
)
renderCameraControls(renderer.getCameraState())
renderMeetingControls()
renderMediaPanel()
renderMapGenerationResult()
renderMapSwitcher()
renderIdentityControls()
renderMovementModeControl()
renderLifecycleStatus()
syncResponsiveToolSections()
startClientMotionLoop()

async function startDemo(): Promise<void> {
  elements.start.disabled = true
  elements.start.textContent = "Joining..."
  setLifecycleStatus("joining", "Joining room")
  setConnectionStatus("session", "pending", "Connecting")
  setConnectionStatus("world", "pending", "Joining")
  setConnectionStatus("media", "idle", "Media off")

  try {
    if (state.joined) {
      elements.start.textContent = "In office"
      setLifecycleStatus("joined", roomOccupancyLabel())
      publishToast("Already in the office", "info")
      return
    }

    if (!state.fixtureMap) {
      await switchToPresetMap("lobby", { announce: false })
    }
    if (state.fixtureMap) {
      await configureDevWorldGeometry(state.fixtureMap)
    }

    const session = await signInDevUser(
      "wikimedia-browser-user",
      displayNameForLocalProfile(),
    )
    state.sessionId = session.sessionId
    setConnectionStatus("session", "ready", "Connected")
    publishToast(`Signed in as ${session.username}`, "success")

    const token = await issueWorldToken(state.sessionId)
    const joined = await joinWorld({
      clientId: state.clientId,
      token: token.token,
      playerId: state.playerId,
      spawn: state.position,
      roomId: "room-lobby",
      avatarId: state.profile.avatarId,
    })

    if (joined.status !== "joined") {
      throw new Error(`World admission failed: ${joined.reason}`)
    }

    state.position = playerSnapshotPosition(joined.player)
    state.direction = joined.player.direction ?? "down"
    resetClientMotion(state.position, state.direction)
    worldSync.connect(state.clientId)
    upsertRenderedPlayer(joined.player)
    renderPlayers()
    state.joined = true
    elements.reset.disabled = false
    setConnectionStatus("world", "ready", "In lobby")
    setLifecycleStatus("joined", "Only you in room")
    publishToast("Entered the office", "success")

    await joinCompanion()
    const synced = await syncWorldSnapshot()
    if (!synced) return
    await move(movementVectorForDirection("right"), "right")
    if (!state.joined) return
    await sendChat(elements.chatBody.value)
    if (!state.joined) return
    elements.start.textContent = "In office"
    renderMeetingControls()
  } catch (error: unknown) {
    elements.start.textContent = "Enter office"
    setLifecycleStatus(
      state.joined ? "joined" : "empty",
      state.joined ? roomOccupancyLabel() : roomReadyLabel(),
    )
    setConnectionStatus(
      "session",
      state.sessionId ? "ready" : "blocked",
      state.sessionId ? "Connected" : "Failed",
    )
    setConnectionStatus(
      "world",
      state.joined ? "ready" : "blocked",
      state.joined ? "In lobby" : "Join failed",
    )
    setLifecycleStatus(
      state.joined ? "joined" : "empty",
      state.joined ? roomOccupancyLabel() : roomReadyLabel(),
      state.joined
        ? undefined
        : "The office could not be joined. Check the local server and try again.",
      technicalErrorDetail(error),
    )
    publishToast("Could not join the office. Try again shortly.", "error")
  } finally {
    elements.start.disabled = state.joined
    elements.reset.disabled = !state.joined
  }
}

async function signInDevUser(subject: string, username: string) {
  return postJson<{ sessionId: string; username: string }>("/dev/sign-in", {
    subject,
    username,
  })
}

async function issueWorldToken(sessionId: string) {
  return postJson<{ token: string }>("/api/world-token", {
    sessionId,
    roomId: "room-lobby",
  })
}

async function joinWorld(input: Record<string, unknown>) {
  return postJson<{
    status: "joined" | "denied"
    reason?: string
    player: PlayerSnapshot
  }>("/world/join", input)
}

async function joinCompanion(): Promise<void> {
  const companionSession = await signInDevUser(
    "wikimedia-browser-companion",
    state.companion.displayName,
  )
  const companionToken = await issueWorldToken(companionSession.sessionId)
  const joined = await joinWorld({
    clientId: state.companion.clientId,
    token: companionToken.token,
    playerId: state.companion.playerId,
    spawn: state.companion.position,
    roomId: "room-lobby",
    avatarId: state.companion.avatarId,
  })

  if (joined.status !== "joined") {
    throw new Error(`Companion admission failed: ${joined.reason}`)
  }

  state.companion.joined = true
  state.companion.position = playerSnapshotPosition(joined.player)
  state.companion.direction = joined.player.direction ?? "down"
  upsertRenderedPlayer(joined.player)
  renderPlayers()
  recordEvent("Added Grace as a local companion")
}

async function syncWorldSnapshot(): Promise<boolean> {
  if (!state.joined) return false

  let snapshot: {
    status: "ok" | "denied"
    reason?: string
    players: readonly PlayerSnapshot[]
  }

  try {
    snapshot = await postJson<{
      status: "ok" | "denied"
      reason?: string
      players: readonly PlayerSnapshot[]
    }>("/world/snapshot", {
      clientId: state.clientId,
    })
  } catch (error: unknown) {
    if (isRecoverableWorldError(error)) {
      recoverFromWorldLoss("unknown_client")
      return false
    }
    throw error
  }

  if (snapshot.status !== "ok") {
    if (snapshot.reason === "unknown_client") {
      recoverFromWorldLoss("unknown_client")
      return false
    }
    throw new Error(`World snapshot failed: ${snapshot.reason}`)
  }

  applyWorldSnapshot(snapshot.players)
  recordEvent(`Synced ${snapshot.players.length} player(s) from world snapshot`)
  return true
}

function applyWorldSnapshot(players: readonly PlayerSnapshot[]): void {
  state.snapshotPlayerIds = players.map((player) => player.playerId)
  state.movementPrediction.active = undefined
  state.movementPrediction.pending = []
  state.movementPrediction.lastAckSeq = undefined
  state.movementPrediction.lastReplayCount = 0
  state.movementPrediction.lastReplayCorrectionPx = undefined
  state.movementPrediction.lastReplayTarget = undefined

  const local = players.find((player) => player.playerId === state.playerId)
  if (local) {
    state.position = playerSnapshotPosition(local)
    state.direction = local.direction ?? state.direction
    clientMotion.reconcile(state.position, { force: true })
  }

  const companion = players.find(
    (player) => player.playerId === state.companion.playerId,
  )
  state.companion.joined = Boolean(companion)

  if (companion) {
    state.companion.position = playerSnapshotPosition(companion)
    state.companion.direction = companion.direction ?? state.companion.direction
  }

  state.players.clear()
  players.forEach(upsertRenderedPlayer)
  if (players.length === 0) {
    state.joined = false
    state.companion.joined = false
    setConnectionStatus("world", "idle", "Room empty")
    setLifecycleStatus("empty", "Room empty")
    seedLocalRenderedPlayer()
  } else {
    setLifecycleStatus("joined", roomOccupancyLabel(players.length))
  }
  renderPlayers()
  updateActiveZoneFromPosition()
}

function playerSnapshotPosition(player: PlayerSnapshot): Vector2 {
  return {
    x: player.position?.x ?? player.x ?? 0,
    y: player.position?.y ?? player.y ?? 0,
  }
}

async function resetDemo(
  options: {
    readonly announce?: boolean
    readonly lifecyclePhase?: LifecyclePhase
    readonly lifecycleMessage?: string
  } = {},
): Promise<void> {
  const announce = options.announce !== false

  elements.reset.disabled = true
  elements.start.disabled = true
  if (state.joined || state.companion.joined) {
    setLifecycleStatus("leaving", "Leaving room")
  }

  if (state.companion.joined) {
    await leaveWorldSafely(state.companion.clientId, state.companion.displayName)
  }

  if (state.joined) {
    await leaveWorldSafely(state.clientId, displayNameForLocalProfile())
  }

  state.sessionId = undefined
  state.seq = 1
  state.direction = "down"
  state.movementPrediction = initialMovementPredictionState()
  state.joined = false
  state.companion.joined = false
  state.companion.direction = "down"
  state.snapshotPlayerIds = []
  state.activeZone = undefined
  state.worldInteractionInfo = emptyWorldInteractionInfo()
  state.worldInteractionSignature = undefined
  state.meetingJoined = false
  state.meetingZoneId = undefined
  state.mediaRequestPending = false
  clearMediaSession()
  state.lastChatBody = undefined
  state.lastMovementRejection = undefined
  state.serverProtocolMismatch = undefined
  worldSync.disconnect()
  state.players.clear()
  chatMessages.length = 0
  renderChatMessages()
  stopHeldMovement()
  inputController.setRunToggled(false)
  renderMovementModeControl()
  setConnectionStatus("session", "idle", "Disconnected")
  setConnectionStatus("world", "idle", "Outside room")
  setConnectionStatus("media", "idle", "Media off")
  setLifecycleStatus(
    options.lifecyclePhase ?? "empty",
    options.lifecycleMessage ?? "Room empty",
  )
  renderMediaPanel()
  renderWorldActionPanel()
  elements.start.textContent = "Enter office"
  elements.start.disabled = false
  elements.reset.disabled = true

  if (state.fixtureMap) {
    state.position = fixtureSpawnPosition(state.fixtureMap, "default")
    state.companion.position = fixtureSpawnPosition(state.fixtureMap, "guest")
  }

  resetClientMotion(state.position, state.direction)
  seedLocalRenderedPlayer()
  renderPlayers()
  updateActiveZoneFromPosition()
  if (announce) {
    publishToast("Left the office", "info")
  }
}

async function leaveWorld(clientId: string): Promise<void> {
  await postJson("/world/leave", {
    clientId,
  })
}

async function leaveWorldSafely(clientId: string, label: string): Promise<void> {
  try {
    await leaveWorld(clientId)
  } catch (error: unknown) {
    recordEvent(`${label} leave skipped: ${errorMessage(error)}`)
  }
}

function startClientMotionLoop(): void {
  const frame = (nowMs: number) => {
    stepClientMotionFrame(nowMs)
    window.requestAnimationFrame(frame)
  }

  window.requestAnimationFrame(frame)
}

function stepClientMotionFrame(nowMs: number): void {
  if (!state.joined || !state.fixtureMap) return

  const result = clientMotion.step({
    nowMs,
    intent: activeHeldMovementIntent(),
    map: collisionMapForFixtureMap(state.fixtureMap),
    playerSize: movementCollisionBodySize(state.movementFeel),
  })

  if (!result.changed) return
  renderLocalPlayerFromMotion(result.snapshot)
}

function primeClientMotionIntent(intent: ClientMotionIntent): void {
  if (!state.joined || !state.fixtureMap) return

  const result = clientMotion.step({
    nowMs: performance.now(),
    intent,
    map: collisionMapForFixtureMap(state.fixtureMap),
    playerSize: movementCollisionBodySize(state.movementFeel),
  })

  if (!result.changed) return
  renderLocalPlayerFromMotion(result.snapshot)
}

function renderLocalPlayerFromMotion(snapshot: ClientMotionSnapshot): void {
  const player = state.players.get(state.playerId)
  if (!player) return

  state.players.set(state.playerId, {
    ...player,
    position: snapshot.position,
    direction: snapshot.direction,
    movementMode: snapshot.movementMode,
    cameraMotion: cameraMotionFromSnapshot(snapshot),
  })
  renderPlayers({ refreshCameraControls: false })
  updateActiveZoneFromPosition()
}

function resetClientMotion(position: Vector2, direction: Direction): void {
  clientMotion.reset(position, direction)
}

async function move(
  vector: MovementVector,
  direction: Direction,
  movementMode: MovementMode = "walk",
): Promise<void> {
  if (!state.joined) return

  const seq = state.seq
  logMovementDebug(
    "send",
    `seq=${seq} vector=${formatMovementVector(vector)} facing=${direction} mode=${movementMode} pos=${formatMovementVector(state.position)}`,
  )
  const prediction = beginClientMovementPrediction(
    vector,
    direction,
    movementMode,
    seq,
  )
  state.seq += 1
  const message = sequenceMoveIntent(seq, {
    type: "move",
    vector,
    direction,
    movementMode,
    source: "programmatic",
  })

  if (worldSync.send(state.clientId, message)) {
    logMovementDebug("realtime-send", `seq=${seq} transport=websocket`)
    return
  }

  let body: { events: readonly WorldEvent[] }
  try {
    body = await postJson<{ events: readonly WorldEvent[] }>("/world/message", {
      clientId: state.clientId,
      message,
    })
  } catch (error: unknown) {
    if (isRecoverableWorldError(error)) {
      logMovementDebug("recover", `seq=${seq} reason=unknown_client`)
      recoverFromWorldLoss("unknown_client")
      return
    }
    abandonClientMovementPrediction(prediction)
    logMovementDebug("error", `seq=${seq} ${errorMessage(error)}`)
    throw error
  }
  logMovementDebug("response", `seq=${seq} events=${body.events?.length ?? 0}`)
  applyEvents(body.events ?? [])
}

function beginClientMovementPrediction(
  vector: MovementVector,
  direction: Direction,
  movementMode: MovementMode,
  seq: number,
): ClientMovementPrediction | undefined {
  if (!state.fixtureMap) return undefined

  const prediction = createClientMovementPrediction({
    seq,
    vector,
    direction,
    movementMode,
    from: movementPredictionBasePosition(),
    map: collisionMapForFixtureMap(state.fixtureMap),
    lastSentAtMs: state.movementPrediction.lastSentAtMs,
    nowMs: Date.now(),
    playerSize: movementCollisionBodySize(state.movementFeel),
    collisionSlide: movementCollisionSlideOptions(state.movementFeel),
    speedPxPerSecond: state.movementFeel.walkSpeedPxPerSecond,
    runSpeedPxPerSecond: state.movementFeel.runSpeedPxPerSecond,
  })

  state.movementPrediction.pending = trimMovementPredictionHistory([
    ...state.movementPrediction.pending,
    prediction,
  ])
  state.movementPrediction.active = state.movementPrediction.pending.at(-1)
  state.movementPrediction.last = prediction
  state.movementPrediction.lastSentAtMs = prediction.startedAtMs
  state.movementPrediction.lastCorrectionPx = undefined
  logMovementDebug(
    "predict",
    `seq=${seq} mode=${prediction.movementMode} speed=${prediction.speedPxPerSecond} requested=${formatMovementVector(prediction.requestedVector)} applied=${formatMovementVector(prediction.appliedVector)} from=${formatMovementVector(prediction.from)} target=${formatMovementVector(prediction.target)} pending=${state.movementPrediction.pending.length} slide=${prediction.collisionSlide} slideAxis=${prediction.collisionSlideAxis ?? "-"} slideDistance=${formatMovementNumber(prediction.collisionSlideDistancePx)}`,
  )

  if (prediction.blockedLocally) {
    state.movementPrediction.totalClientBlocked += 1
    state.movementPrediction.lastOutcome = "client_blocked"
    applyClientMovementBlock(prediction)
    return prediction
  }

  state.movementPrediction.totalPredicted += 1
  state.movementPrediction.lastOutcome = "predicted"
  upsertRenderedPlayer({
    playerId: state.playerId,
    position: prediction.target,
    direction,
    movementMode,
  })
  renderPlayers()
  return prediction
}

function movementPredictionBasePosition(): Vector2 {
  return state.movementPrediction.pending.at(-1)?.target ?? state.position
}

function applyClientMovementBlock(prediction: ClientMovementPrediction): void {
  const showFeedback = shouldShowMovementRejectionFeedback("collision")
  state.direction = prediction.direction
  upsertRenderedPlayer({
    playerId: state.playerId,
    position: prediction.from,
    direction: prediction.direction,
    movementMode: prediction.movementMode,
    rejected: showFeedback,
  })
  renderPlayers()

  if (showFeedback) {
    publishToast(movementRejectionLabel("collision"), "info")
  }
}

function abandonClientMovementPrediction(
  prediction: ClientMovementPrediction | undefined,
): void {
  if (!prediction) return

  const pending = state.movementPrediction.pending.filter(
    (candidate) => candidate.seq !== prediction.seq,
  )
  if (pending.length === state.movementPrediction.pending.length) return

  state.movementPrediction.pending = pending
  state.movementPrediction.active = pending.at(-1)
  state.movementPrediction.totalCorrected += 1
  state.movementPrediction.lastOutcome = "corrected"
  state.movementPrediction.lastCorrectionPx = movementPredictionCorrectionPx(
    prediction,
    state.position,
  )
  clientMotion.reconcile(state.position, { force: true })
  upsertRenderedPlayer({
    playerId: state.playerId,
    position: state.position,
    direction: state.direction,
    movementMode: prediction.movementMode,
  })
  renderPlayers()
}

function installMovementControlButton(button: HTMLButtonElement): void {
  const intent = movementIntentForControlButton(button)
  if (!intent) return

  button.addEventListener("pointerdown", (event) => {
    if (!state.joined) return

    event.preventDefault()
    button.setPointerCapture(event.pointerId)
    logMovementDebug(
      "pad-down",
      `id=${event.pointerId} vector=${formatMovementVector(intent.vector)} facing=${intent.direction}`,
    )
    pressMovementControl({
      ...intent,
      id: event.pointerId,
    })
    button.dataset.active = "true"
  })
  button.addEventListener("pointerup", (event) => {
    event.preventDefault()
    logMovementDebug("pad-up", `id=${event.pointerId}`)
    releaseMovementControl(event.pointerId)
  })
  button.addEventListener("pointercancel", (event) => {
    logMovementDebug("pad-cancel", `id=${event.pointerId}`)
    releaseMovementControl(event.pointerId)
  })
  button.addEventListener("lostpointercapture", (event) => {
    logMovementDebug("pad-lost", `id=${event.pointerId}`)
    releaseMovementControl(event.pointerId)
  })
  button.addEventListener("click", (event) => {
    event.preventDefault()
    if (event.detail === 0) {
      logMovementDebug(
        "pad-click",
        `vector=${formatMovementVector(intent.vector)} facing=${intent.direction} mode=${activeMovementMode()}`,
      )
      requestMove(intent.vector, intent.direction, activeMovementMode())
    }
  })
}

function installAnalogJoystick(): void {
  elements.joystick.addEventListener("pointerdown", (event) => {
    if (!state.joined) return

    event.preventDefault()
    elements.joystick.setPointerCapture(event.pointerId)
    inputController.setJoystickPointer(event.pointerId)
    updateJoystickFromPointer(event, "down")
  })
  elements.joystick.addEventListener("pointermove", (event) => {
    if (inputController.joystickPointerId() !== event.pointerId) return

    event.preventDefault()
    updateJoystickFromPointer(event, "move")
  })
  elements.joystick.addEventListener("pointerup", (event) => {
    if (inputController.joystickPointerId() !== event.pointerId) return

    event.preventDefault()
    releaseJoystick("up", event.pointerId)
  })
  elements.joystick.addEventListener("pointercancel", (event) => {
    if (inputController.joystickPointerId() !== event.pointerId) return

    releaseJoystick("cancel", event.pointerId)
  })
  elements.joystick.addEventListener("lostpointercapture", (event) => {
    if (inputController.joystickPointerId() !== event.pointerId) return

    releaseJoystick("lost", event.pointerId)
  })
  renderJoystickControl()
}

function updateJoystickFromPointer(
  event: PointerEvent,
  phase: "down" | "move",
): void {
  const surface = elements.joystick.querySelector<HTMLElement>(".joystick-surface")
  if (!surface) return

  const joystick = joystickInputFromPointer({
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
    surfaceRect: surface.getBoundingClientRect(),
    deadzoneRatio: JOYSTICK_DEADZONE_RATIO,
    previousDirection: inputController.snapshot().joystick.direction,
    minMagnitude: JOYSTICK_MIN_MAGNITUDE,
  })
  inputController.updateJoystick(joystick)
  renderJoystickControl()
  logMovementDebug(
    `joystick-${phase}`,
    `id=${event.pointerId} vector=${formatMovementVector(joystick.vector)} magnitude=${formatMovementNumber(joystick.magnitude)} facing=${joystick.direction ?? "-"}`,
  )

  if (hasHeldMovementInput()) {
    startHeldMovement()
    requestMoveFromHeldInput()
  } else {
    stopHeldMovementTimer()
  }
}

function releaseJoystick(reason: "up" | "cancel" | "lost" | "reset", id?: number): void {
  const previousVector = inputController.releaseJoystick()
  renderJoystickControl()
  logMovementDebug(
    "joystick-release",
    `reason=${reason} id=${id ?? "-"} previous=${formatMovementVector(previousVector)}`,
  )

  if (!hasHeldMovementInput()) {
    stopHeldMovementTimer()
    requestMovementStop(`joystick-${reason}`)
  }
}

function renderJoystickControl(): void {
  const joystick = inputController.snapshot().joystick

  elements.joystick.dataset.active = joystick.active ? "true" : "false"
  elements.joystickKnob.style.setProperty("--joystick-x", `${joystick.knob.x}px`)
  elements.joystickKnob.style.setProperty("--joystick-y", `${joystick.knob.y}px`)
  elements.joystickStatus.textContent = joystick.active
    ? `${Math.round(joystick.magnitude * 100)}% ${joystick.direction ?? "move"}`
    : "Drag to move"
}

function movementIntentForControlButton(
  button: HTMLButtonElement,
): Omit<MovementControlIntent, "id"> | undefined {
  return movementControlIntentFromDataset({
    moveX: button.dataset.moveX,
    moveY: button.dataset.moveY,
    facing: button.dataset.facing,
  })
}

function pressDirection(direction: Direction): void {
  inputController.pressDirection(direction)
  startHeldMovement()
  requestMoveFromHeldInput()
}

function releaseDirection(direction: Direction): void {
  inputController.releaseDirection(direction)

  if (!hasHeldMovementInput()) {
    stopHeldMovementTimer()
    requestMovementStop("key-release")
  }
}

function pressMovementControl(intent: MovementControlIntent): void {
  inputController.pressControl(intent)
  startHeldMovement()
  requestMoveFromHeldInput()
}

function releaseMovementControl(id: number): void {
  const intent = inputController.releaseControl(id)
  const button = intent
    ? document.querySelector<HTMLButtonElement>(
        `[data-move-x="${intent.vector.x}"][data-move-y="${intent.vector.y}"][data-facing="${intent.direction}"]`,
      )
    : undefined
  if (button) {
    delete button.dataset.active
  }

  if (!hasHeldMovementInput()) {
    stopHeldMovementTimer()
    requestMovementStop("pad-release")
  }
}

function startHeldMovement(): void {
  if (movementTimerId !== undefined) return

  movementTimerId = window.setInterval(() => {
    requestMoveFromHeldInput()
  }, MOVE_REPEAT_MS)
}

function stopHeldMovement(): void {
  inputController.clearHeldInput()
  document
    .querySelectorAll<HTMLElement>("[data-move-x][data-move-y][data-facing]")
    .forEach((button) => {
      delete button.dataset.active
    })
  stopHeldMovementTimer()
  renderJoystickControl()
  renderMovementModeControl()
}

function stopHeldMovementTimer(): void {
  if (movementTimerId !== undefined) {
    window.clearInterval(movementTimerId)
    movementTimerId = undefined
  }
}

function hasHeldMovementInput(): boolean {
  return inputController.hasHeldInput()
}

function activeHeldDirection(): Direction | undefined {
  return inputController.activeHeldDirection()
}

function activeMovementMode(): MovementMode {
  return inputController.activeMovementMode()
}

function renderMovementModeControl(): void {
  const running = activeMovementMode() === "run"
  elements.runToggle.setAttribute("aria-pressed", String(running))
}

function installMovementFeelPanel(): void {
  elements.movementFeelPanel.hidden = !state.devTools.gated
  if (!state.devTools.gated) return

  elements.movementFeelPresets.replaceChildren(
    ...MOVEMENT_FEEL_PRESETS.map(createMovementFeelPresetButton),
  )
  elements.movementFeelControls.replaceChildren(
    ...MOVEMENT_FEEL_CONTROLS.map(createMovementFeelControl),
  )
  elements.movementFeelPresets.addEventListener("click", (event) => {
    const button = event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>("[data-feel-preset]")
      : undefined
    const presetId = button?.dataset.feelPreset
    if (!presetId || !isMovementFeelPresetId(presetId)) return

    applyMovementFeelPreset(presetId)
  })
  elements.movementFeelControls.addEventListener("input", (event) => {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) return

    const key = input.dataset.feelKey
    if (!key || !isMovementFeelTuningKey(key)) return

    applyMovementFeelValue(key, Number(input.value))
  })
  elements.movementFeelReset.addEventListener("click", () => {
    applyMovementFeelPreset(DEFAULT_MOVEMENT_FEEL_PRESET_ID)
  })
  applyMovementFeel(state.movementFeel)
}

function createMovementFeelPresetButton(
  preset: (typeof MOVEMENT_FEEL_PRESETS)[number],
): HTMLButtonElement {
  const button = document.createElement("button")
  button.type = "button"
  button.dataset.feelPreset = preset.id
  button.textContent = preset.label
  button.title = preset.summary
  return button
}

function createMovementFeelControl(control: (typeof MOVEMENT_FEEL_CONTROLS)[number]): HTMLElement {
  const field = document.createElement("label")
  field.className = "movement-feel-control"
  field.dataset.feelControl = control.key

  const header = document.createElement("span")
  header.className = "movement-feel-control-header"

  const label = document.createElement("strong")
  label.textContent = control.label

  const output = document.createElement("output")
  output.dataset.feelOutput = control.key

  header.append(label, output)

  const range = document.createElement("input")
  range.type = "range"
  range.min = String(control.min)
  range.max = String(control.max)
  range.step = String(control.step)
  range.dataset.feelKey = control.key
  range.dataset.feelRange = control.key

  const help = document.createElement("small")
  help.textContent = control.help

  field.append(header, range, help)
  return field
}

function applyMovementFeelValue(
  key: MovementFeelTuningKey,
  value: number,
): void {
  const nextFeel = normalizeMovementFeel({
    ...state.movementFeel,
    [key]: clampMovementFeelValue(key, value),
  })
  applyMovementFeel(nextFeel)
  logMovementDebug(
    "feel",
    `${key}=${formatMovementFeelValue(key, nextFeel[key])}`,
  )
}

function applyMovementFeelPreset(presetId: MovementFeelPresetId): void {
  const preset = movementFeelPresetForId(presetId)
  applyMovementFeel(preset.values)
  logMovementDebug("feel-preset", `${preset.id}: ${preset.summary}`)
}

function applyMovementFeel(nextFeel: MovementFeelTuning): void {
  state.movementFeel = normalizeMovementFeel(nextFeel)
  inputController.setVectorShaping(state.movementFeel)
  clientMotion.setFeel(state.movementFeel)
  renderMovementFeelPanel()
  scheduleDevelopmentMovementFeelSync()
}

function renderMovementFeelPanel(): void {
  elements.movementFeelPanel.hidden = !state.devTools.gated
  if (!state.devTools.gated) return

  const presetId = movementFeelPresetIdForTuning(state.movementFeel)
  const activePreset = presetId === "custom"
    ? undefined
    : movementFeelPresetForId(presetId)
  elements.movementFeelSummary.textContent = activePreset
    ? activePreset.summary
    : "Custom client prediction + visual feel"
  MOVEMENT_FEEL_PRESETS.forEach((preset) => {
    const button = elements.movementFeelPresets.querySelector<HTMLButtonElement>(
      `[data-feel-preset="${preset.id}"]`,
    )
    if (!button) return

    const active = preset.id === presetId
    button.setAttribute("aria-pressed", String(active))
    button.dataset.active = String(active)
  })
  MOVEMENT_FEEL_CONTROLS.forEach((control) => {
    const value = state.movementFeel[control.key]
    const range = elements.movementFeelControls.querySelector<HTMLInputElement>(
      `[data-feel-range="${control.key}"]`,
    )
    const output = elements.movementFeelControls.querySelector<HTMLOutputElement>(
      `[data-feel-output="${control.key}"]`,
    )

    if (range && document.activeElement !== range) {
      range.value = String(value)
    }
    if (output) {
      output.value = formatMovementFeelValue(control.key, value)
    }
  })
}

function scheduleDevelopmentMovementFeelSync(): void {
  if (!state.devTools.gated) return

  if (movementFeelSyncTimerId !== undefined) {
    window.clearTimeout(movementFeelSyncTimerId)
  }

  movementFeelSyncTimerId = window.setTimeout(() => {
    movementFeelSyncTimerId = undefined
    void syncDevelopmentMovementFeel(state.movementFeel)
  }, 120)
}

async function syncDevelopmentMovementFeel(feel: MovementFeelTuning): Promise<void> {
  try {
    const body = await postJson<{
      readonly status: "ok"
      readonly playerSize: { readonly width: number; readonly height: number }
    }>("/dev/world-movement", {
      walkSpeedPxPerSecond: feel.walkSpeedPxPerSecond,
      runSpeedPxPerSecond: feel.runSpeedPxPerSecond,
      collisionBodyRadiusPx: feel.collisionBodyRadiusPx,
      collisionSlideMaxNudgePx: feel.collisionSlideMaxNudgePx,
    })
    logMovementDebug(
      "feel-sync",
      `server body=${formatMovementNumber(body.playerSize.width)}x${formatMovementNumber(body.playerSize.height)}`,
    )
  } catch (error: unknown) {
    logMovementDebug("feel-sync", `skipped ${errorMessage(error)}`)
  }
}

function activeHeldMovementIntent(): RawMovementIntent | undefined {
  return inputController.activeHeldIntent()
}

function requestMoveFromHeldInput(): void {
  const intent = activeHeldMovementIntent()
  if (!intent) {
    logMovementDebug("intent", "none")
    return
  }
  const input = inputController.snapshot()
  logMovementDebug(
    "intent",
    `vector=${formatMovementVector(intent.rawVector)} shaped=${formatMovementVector(intent.vector)} facing=${intent.direction} mode=${intent.movementMode} keys=${input.pressedDirections.join("+") || "-"} pads=${input.pressedControls.length} joystick=${input.joystick.active ? formatMovementVector(input.joystick.vector) : "-"}`,
  )
  requestMove(intent.vector, intent.direction, intent.movementMode)
}

function requestMovementStop(source: string): void {
  if (!state.joined || !worldSync.canStream(state.clientId)) return

  const direction = inputController.lastDirectionOr(state.direction)
  const movementMode = activeMovementMode()
  const seq = state.seq
  state.seq += 1
  const message = sequenceMoveIntent(seq, {
    type: "move",
    vector: { x: 0, y: 0 },
    direction,
    movementMode,
    source: inputSourceForStop(source),
  })

  logMovementDebug(
    "realtime-stop",
    `seq=${seq} source=${source} facing=${direction} mode=${movementMode} pos=${formatMovementVector(state.position)}`,
  )
  if (!worldSync.send(state.clientId, message)) return

  clientMotion.reconcile(state.position)
}

function inputSourceForStop(
  source: string,
): "keyboard" | "dpad" | "joystick" {
  if (source.startsWith("joystick")) return "joystick"
  if (source.startsWith("pad")) return "dpad"
  return "keyboard"
}

function activeJoystickIntent():
  | {
      readonly vector: MovementVector
      readonly direction: Direction
      readonly source: "joystick"
    }
  | undefined {
  return inputController.activeJoystickIntent()
}

function requestMove(
  vector: MovementVector,
  direction: Direction,
  movementMode: MovementMode,
): void {
  if (!state.joined) {
    logMovementDebug(
      "ignore",
      `not_joined vector=${formatMovementVector(vector)} facing=${direction} mode=${movementMode}`,
    )
    return
  }
  primeClientMotionIntent({ vector, direction, movementMode })
  if (worldSync.canStream(state.clientId)) {
    inputController.markRequestStarted(direction)
    void move(vector, direction, movementMode).catch((error: unknown) => {
      recordEvent(`Movement failed: ${technicalErrorDetail(error)}`)
      publishToast(friendlyActionError(error), "error")
    })
    return
  }

  if (inputController.isInFlight()) {
    inputController.queuePendingIntent({
      type: "move",
      vector,
      direction,
      movementMode,
      source: "programmatic",
    })
    logMovementDebug(
      "queue",
      `in_flight vector=${formatMovementVector(vector)} facing=${direction} mode=${movementMode}`,
    )
    return
  }

  inputController.setInFlight(true)
  inputController.markRequestStarted(direction)
  void move(vector, direction, movementMode)
    .catch((error: unknown) => {
      recordEvent(`Movement failed: ${technicalErrorDetail(error)}`)
      publishToast(friendlyActionError(error), "error")
    })
    .finally(() => {
      inputController.setInFlight(false)
      const pendingIntent = inputController.consumePendingIntent()
      if (pendingIntent) {
        logMovementDebug(
          "dequeue",
          `vector=${formatMovementVector(pendingIntent.vector)} facing=${pendingIntent.direction} mode=${pendingIntent.movementMode}`,
        )
        requestMove(
          pendingIntent.vector,
          pendingIntent.direction,
          pendingIntent.movementMode,
        )
      }
    })
}

async function sendChat(body: string): Promise<void> {
  if (!state.joined || !body.trim()) return

  let response: { events: readonly WorldEvent[] }
  try {
    response = await postJson<{ events: readonly WorldEvent[] }>("/world/message", {
      clientId: state.clientId,
      message: {
        type: "chat_send",
        scope: "room",
        body,
        seq: state.seq,
      },
    })
  } catch (error: unknown) {
    if (isRecoverableWorldError(error)) {
      recoverFromWorldLoss("unknown_client")
      return
    }
    throw error
  }
  state.seq += 1
  applyEvents(response.events ?? [])
}

async function joinMeeting(): Promise<void> {
  if (!state.joined) {
    publishToast("Join the world before starting meeting media", "warning")
    return
  }

  const zone = state.activeZone

  if (!zone || !isMeetingZone(zone)) {
    publishToast("Move into a meeting zone before joining media", "warning")
    return
  }

  if (!worldActionPermitted("join_meeting", zone.id)) {
    publishToast("The server has not permitted this meeting action yet.", "warning")
    return
  }

  elements.joinMeeting.disabled = true
  state.mediaRequestPending = true
  clearMediaUnavailable()
  setConnectionStatus("media", "pending", "Requesting media")
  renderMeetingControls()
  renderMediaPanel()

  try {
    const media = await postMediaToken({
      playerId: state.playerId,
      mode: "zone",
      zoneId: zone.id,
      publish: true,
      subscribe: true,
    })

    if (media.status === "issued") {
      setConnectionStatus("media", "ready", "In call")
      state.meetingJoined = true
      state.meetingZoneId = zone.id
      state.mediaSession = {
        liveKitUrl: media.liveKitUrl,
        token: media.token,
        room: media.room,
        canPublish: media.canPublish,
        canSubscribe: media.canSubscribe,
        participantPlayerIds: media.participantPlayerIds,
        expiresAt: media.expiresAt,
      }
      state.lastMediaRoom = media.room
      publishToast(`Joined ${zoneDisplayName(zone)}`, "success")
    } else {
      if (media.reason === "unknown_player") {
        recoverFromWorldLoss("unknown_client")
        return
      }
      setConnectionStatus("media", "blocked", "Media blocked")
      state.meetingJoined = false
      state.meetingZoneId = undefined
      clearMediaSession()
      setMediaUnavailable(
        "Call access is not available for this zone right now.",
        media.reason,
      )
    }
  } catch (error: unknown) {
    setConnectionStatus("media", "blocked", "Media unavailable")
    state.meetingJoined = false
    state.meetingZoneId = undefined
    clearMediaSession()
    setMediaUnavailable(
      "Call media is unavailable. You can keep using the room.",
      technicalErrorDetail(error),
    )
  } finally {
    state.mediaRequestPending = false
    syncWorldInteractionLayer()
    renderZonePresentation()
    renderMeetingControls()
    renderMediaPanel()
  }
}

async function leaveMeeting(): Promise<void> {
  leaveMeetingLocally("Left meeting")
}

function leaveMeetingLocally(message: string): void {
  state.meetingJoined = false
  state.meetingZoneId = undefined
  clearMediaSession()
  setConnectionStatus("media", "idle", "Media off")
  syncWorldInteractionLayer()
  renderZonePresentation()
  renderMeetingControls()
  renderMediaPanel()
  publishToast(message, "info")
}

async function switchMap(mapId: MapSwitcherId): Promise<void> {
  if (mapId === "generated") {
    if (!state.generatedRoom) {
      publishToast("Generate a room before opening it", "info")
      renderMapSwitcher()
      return
    }

    await switchToFixtureMap(
      state.generatedRoom.fixtureMap,
      state.generatedRoom.mapGeneration,
    )
    publishToast("Opened generated room", "success")
    return
  }

  await switchToPresetMap(mapId, { announce: true })
}

async function switchToPresetMap(
  presetId: PresetMapId,
  options: { readonly announce?: boolean } = {},
): Promise<void> {
  const preset = compilePresetMap(presetId)
  const fixtureMap = fixtureMapFromCompiledMap(preset)

  await switchToFixtureMap(fixtureMap, {
    source: "preset",
    mapId: preset.id,
    label: preset.label,
    prompt: preset.label,
    keywords: [preset.id],
    validation: preset.validation,
  })

  if (options.announce !== false) {
    publishToast(`Switched to ${preset.label}`, "success")
  }
}

async function generateMapFromPrompt(): Promise<void> {
  const prompt = elements.mapPrompt.value.trim() || DEFAULT_MAP_PROMPT
  elements.generateMap.disabled = true
  elements.generateMap.textContent = state.generatedRoom
    ? "Regenerating..."
    : "Generating..."
  setGeneratorPreviewState(
    "working",
    state.generatedRoom ? "Regenerating room..." : "Generating room...",
    "Compiling the prompt into a playable room and resetting the local world.",
  )
  setLifecycleStatus("map_reloading", "Generating room")

  try {
    const generated = compileDeterministicPromptMap(prompt)
    const fixtureMap = fixtureMapFromCompiledMap(generated)
    const preview = generatedPreviewForFixtureMap(fixtureMap, "preflight")
    const mapGeneration = {
      source: "generated" as const,
      mapId: "generated" as const,
      label: "Generated room",
      prompt,
      keywords: generated.keywords,
      validation: generated.validation,
      preview,
    }
    state.generatedPreview = preview
    renderMapGenerationResult()

    if (!generated.validation.valid || !preview.rendererPreflight.valid) {
      state.generatedPreview = {
        ...preview,
        mode: "invalid",
      }
      publishToast(
        generated.validation.errors[0] ??
          preview.rendererPreflight.errors[0] ??
          "Generated map is invalid",
        "warning",
      )
      renderMapGenerationResult()
      return
    }

    state.generatedRoom = {
      fixtureMap,
      mapGeneration,
    }

    await switchToFixtureMap(fixtureMap, mapGeneration)

    publishToast("Generated room ready", "success")
  } finally {
    elements.generateMap.disabled = false
    elements.generateMap.textContent = state.generatedRoom
      ? "Regenerate room"
      : "Generate room"
    renderMapSwitcher()
  }
}

function generatedPreviewForFixtureMap(
  fixtureMap: FixtureMap,
  mode: GeneratedMapPreviewState["mode"],
  appliedFingerprint?: string,
): GeneratedMapPreviewState {
  const rendererPreflight = validateFixtureMapForRenderer(fixtureMap)
  const previewFingerprint = rendererPreflight.renderFingerprint

  return {
    mode,
    mdiSchema: "semantic_map_definition",
    rendererAgnostic: true,
    compilerOutputs: ["render_layers", "collision_layers", "zones"],
    previewFingerprint,
    appliedFingerprint,
    previewMatchesRendered: appliedFingerprint
      ? previewFingerprint === appliedFingerprint
      : false,
    rendererPreflight: {
      valid: rendererPreflight.valid,
      errors: rendererPreflight.errors,
      visualFootprintCount: rendererPreflight.visualFootprintCount,
    },
  }
}

function validFixtureValidation(fixtureMap: FixtureMap): PromptMapValidation {
  return {
    valid: true,
    errors: [],
    checks: [
      {
        id: "blocked_tiles",
        status: "pass",
        message: `${fixtureMap.compiled.blockedTiles.length} blocked movement tiles are in bounds.`,
      },
      {
        id: "spawn_clearance",
        status: "pass",
        message: `${fixtureMap.spawnPoints.length} entry spots are clear and inside the room.`,
      },
      {
        id: "zone_bounds",
        status: "pass",
        message: `${fixtureMap.compiled.zones.length} interaction zones are inside the room bounds.`,
      },
    ],
    summary: "Fixture map preflight passed for smoke automation.",
    blockedTileCount: fixtureMap.compiled.blockedTiles.length,
    spawnCount: fixtureMap.spawnPoints.length,
    zoneCount: fixtureMap.compiled.zones.length,
    spawnIds: fixtureMap.spawnPoints.map((spawn) => spawn.id),
    zoneIds: fixtureMap.compiled.zones.map((zone) => zone.id),
  }
}

async function switchToFixtureMap(
  fixtureMap: FixtureMap,
  mapGeneration: MapGenerationState,
): Promise<void> {
  await beginRoomTransition()
  setLifecycleStatus(
    "map_reloading",
    `Reloading ${mapGeneration.label}`,
    "Preparing the room layout and resetting local room state.",
  )
  try {
    await resetDemo({
      announce: false,
      lifecyclePhase: "map_reloading",
      lifecycleMessage: `Reloading ${mapGeneration.label}`,
    })
    await configureDevWorldGeometry(fixtureMap)
    applyFixtureMap(fixtureMap, mapGeneration)
    await finishRoomTransition()
    if (mapGeneration.source === "generated" && state.generatedRoom) {
      const appliedPreview = generatedPreviewForFixtureMap(
        fixtureMap,
        "applied",
        renderer.getMapValidationInfo().renderFingerprint,
      )
      state.generatedPreview = appliedPreview
      state.generatedRoom = {
        fixtureMap,
        mapGeneration: {
          ...mapGeneration,
          preview: appliedPreview,
        },
      }
      state.mapGeneration = {
        ...state.mapGeneration,
        preview: appliedPreview,
      }
      renderMapGenerationResult()
    }
    setLifecycleStatus("empty", roomReadyLabel(mapGeneration.label))
    renderMapSwitcher()
  } catch (error: unknown) {
    delete elements.map.dataset.transition
    setLifecycleStatus(
      "recovering",
      "Map reload failed",
      "The room could not be prepared. Try switching rooms again.",
      technicalErrorDetail(error),
    )
    throw error
  }
}

async function beginRoomTransition(): Promise<void> {
  elements.map.dataset.transition = "switching"
  await delay(90)
}

async function finishRoomTransition(): Promise<void> {
  await renderer.advanceTime()
  elements.map.dataset.transition = "entering"
  window.setTimeout(() => {
    if (elements.map.dataset.transition === "entering") {
      delete elements.map.dataset.transition
    }
  }, 260)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function applyFixtureMap(
  fixtureMap: FixtureMap,
  mapGeneration: MapGenerationState,
): void {
  state.fixtureMap = fixtureMap
  state.mapGeneration = mapGeneration
  state.movementPrediction = initialMovementPredictionState()
  state.worldInteractionInfo = emptyWorldInteractionInfo()
  state.worldInteractionSignature = undefined
  if (state.devTools.gated) {
    state.devTools.activeFixtureId = devFixtureIdForMapGeneration(mapGeneration)
  }
  state.position = fixtureSpawnPosition(fixtureMap, "default")
  resetClientMotion(state.position, state.direction)
  state.companion.position = fixtureSpawnPosition(fixtureMap, "guest")
  seedLocalRenderedPlayer()
  syncRendererDevTools()
  renderer.renderMap(fixtureMap)
  renderPlayers()
  updateActiveZoneFromPosition()
  renderMapGenerationResult()
}

function devFixtureIdForMapGeneration(
  mapGeneration: MapGenerationState,
): DevToolFixtureId {
  return mapGeneration.mapId === "generated" ? "generated" : mapGeneration.mapId
}

function fixtureMapFromCompiledMap(
  compiledMap: Pick<
    DeterministicPromptMapResult | PresetMapResult,
    "definition" | "compiled" | "spawnPoints"
  >,
): FixtureMap {
  const referencedTokenIds = new Set(compiledMap.compiled.referencedTokenIds)

  return {
    definition: compiledMap.definition,
    compiled: compiledMap.compiled,
    spawnPoints: compiledMap.spawnPoints,
    catalog: {
      tokens: starterVisualAssetCatalog.tokens
        .filter((token) => referencedTokenIds.has(token.id))
        .map((token) => ({
          id: token.id,
          kind: token.kind,
          provisionalGid: token.provisionalGid,
          widthTiles: token.widthTiles,
          heightTiles: token.heightTiles,
          asset: token.asset,
        })),
    },
  }
}

async function renderLargeStaticMapForSmoke(
  dimensions: { readonly width?: number; readonly height?: number } = {},
): Promise<void> {
  const width = Math.min(128, Math.max(12, Math.round(dimensions.width ?? 96)))
  const height = Math.min(128, Math.max(10, Math.round(dimensions.height ?? 72)))
  const fixtureMap = largeStaticFixtureMap(width, height)

  await configureDevWorldGeometry(fixtureMap)
  applyFixtureMap(fixtureMap, {
    source: "generated",
    mapId: "generated",
    label: "Renderer stress map",
    prompt: "Large generated static map renderer smoke",
    keywords: ["large", "renderer", "stress"],
    validation: validFixtureValidation(fixtureMap),
  })
}

async function runBigMapBenchmarkForSmoke(): Promise<BigMapBenchmarkResult> {
  const benchmarkMaps = [
    { size: "20x15", width: 20, height: 15 },
    { size: "50x40", width: 50, height: 40 },
    { size: "100x80", width: 100, height: 80 },
  ] as const
  const samples: BigMapBenchmarkSample[] = []

  for (let pass = 1; pass <= 2; pass += 1) {
    for (const benchmarkMap of benchmarkMaps) {
      await renderLargeStaticMapForSmoke(benchmarkMap)
      await renderer.advanceTime()
      const performance = renderer.getPerformanceInfo()
      samples.push({
        pass,
        size: benchmarkMap.size,
        performance,
        staticTileCount: renderer.getCapabilityInfo().tilemap.staticTileCount,
        objectCount: renderer.getCapabilityInfo().depth.objectCount,
        mapRenderDurationMs: performance.runtime.lastMapRenderDurationMs,
        proof: bigMapBenchmarkSampleProof(benchmarkMap.size, performance),
      })
    }
  }

  const firstLargeMap = samples.find(
    (sample) => sample.pass === 1 && sample.size === "100x80",
  )
  const secondLargeMap = samples.find(
    (sample) => sample.pass === 2 && sample.size === "100x80",
  )

  return {
    samples,
    gameInstanceIds: [
      ...new Set(
        samples.map((sample) => sample.performance.lifecycle.gameInstanceId),
      ),
    ],
    repeatedLargeMapDisplayObjectDelta:
      (secondLargeMap?.performance.runtime.displayObjectCount ?? 0) -
      (firstLargeMap?.performance.runtime.displayObjectCount ?? 0),
    repeatedLargeMapTextureDelta:
      (secondLargeMap?.performance.runtime.textureCount ?? 0) -
      (firstLargeMap?.performance.runtime.textureCount ?? 0),
    repeatedLargeMapCreatedSpriteDelta:
      (secondLargeMap?.performance.pooling.createdSpriteCount ?? 0) -
      (firstLargeMap?.performance.pooling.createdSpriteCount ?? 0),
    repeatedLargeMapCreatedTextureDelta:
      (secondLargeMap?.performance.pooling.createdTextureCount ?? 0) -
      (firstLargeMap?.performance.pooling.createdTextureCount ?? 0),
    proof: bigMapBenchmarkProof(samples, firstLargeMap, secondLargeMap),
  }
}

function bigMapBenchmarkSampleProof(
  size: BigMapBenchmarkSample["size"],
  performance: RendererPerformanceInfo,
): BigMapBenchmarkSampleProof {
  const largeMap = size === "50x40" || size === "100x80"

  return {
    tileBatching:
      performance.proofs.tileBatching.compatible &&
      performance.proofs.tileBatching.staticGpuLayerCount === 2 &&
      performance.proofs.tileBatching.staticCpuLayerCount === 0,
    staticLayerBaking:
      performance.proofs.staticLayerBaking.enabled &&
      performance.proofs.staticLayerBaking.mode === "single_render_texture" &&
      performance.proofs.staticLayerBaking.sourceLayerCount === 2 &&
      performance.proofs.staticLayerBaking.bakedLayerCount === 1 &&
      performance.proofs.staticLayerBaking.displayObjectReduction >= 1,
    viewportCullingAccounted: performance.proofs.viewportCulling.active,
    viewportCullingActive:
      !largeMap || performance.proofs.viewportCulling.culledObjectSpriteCount > 0,
    objectPoolingActive:
      performance.proofs.objectPooling.active &&
      performance.proofs.objectPooling.createdSpriteCount > 0,
    objectPoolReuseObserved:
      performance.lifecycle.mapRenderCount <= 1 ||
      performance.proofs.objectPooling.reuseObserved,
    textureReuseObserved:
      performance.lifecycle.mapRenderCount <= 1 ||
      performance.proofs.textureReuse.reuseObserved,
  }
}

function bigMapBenchmarkProof(
  samples: readonly BigMapBenchmarkSample[],
  firstLargeMap: BigMapBenchmarkSample | undefined,
  secondLargeMap: BigMapBenchmarkSample | undefined,
): BigMapBenchmarkProof {
  const benchmarkMapsCovered =
    new Set(samples.map((sample) => sample.size)).size === 3 &&
    samples.length === 6
  const repeatedLargeMapDisplayObjectDelta =
    (secondLargeMap?.performance.runtime.displayObjectCount ?? 0) -
    (firstLargeMap?.performance.runtime.displayObjectCount ?? 0)
  const repeatedLargeMapTextureDelta =
    (secondLargeMap?.performance.runtime.textureCount ?? 0) -
    (firstLargeMap?.performance.runtime.textureCount ?? 0)
  const repeatedLargeMapCreatedSpriteDelta =
    (secondLargeMap?.performance.pooling.createdSpriteCount ?? 0) -
    (firstLargeMap?.performance.pooling.createdSpriteCount ?? 0)
  const repeatedLargeMapCreatedTextureDelta =
    (secondLargeMap?.performance.pooling.createdTextureCount ?? 0) -
    (firstLargeMap?.performance.pooling.createdTextureCount ?? 0)
  const tileBatching = samples.every((sample) => sample.proof.tileBatching)
  const staticLayerBaking = samples.every(
    (sample) => sample.proof.staticLayerBaking,
  )
  const viewportCulling = samples.every(
    (sample) =>
      sample.proof.viewportCullingAccounted &&
      sample.proof.viewportCullingActive,
  )
  const objectPooling =
    samples.every((sample) => sample.proof.objectPoolingActive) &&
    (secondLargeMap?.proof.objectPoolReuseObserved ?? false) &&
    repeatedLargeMapCreatedSpriteDelta === 0
  const textureReuse =
    samples.every((sample) => sample.proof.textureReuseObserved) &&
    repeatedLargeMapCreatedTextureDelta === 0
  const noMapSwitchLeaks =
    repeatedLargeMapDisplayObjectDelta <= 2 &&
    repeatedLargeMapTextureDelta <= 0 &&
    repeatedLargeMapCreatedSpriteDelta === 0 &&
    repeatedLargeMapCreatedTextureDelta === 0

  return {
    passed:
      benchmarkMapsCovered &&
      tileBatching &&
      staticLayerBaking &&
      viewportCulling &&
      objectPooling &&
      textureReuse &&
      noMapSwitchLeaks,
    benchmarkMapsCovered,
    tileBatching,
    staticLayerBaking,
    viewportCulling,
    objectPooling,
    textureReuse,
    noMapSwitchLeaks,
  }
}

async function attemptInvalidMapForSmoke(): Promise<InvalidMapAttemptResult> {
  const before = {
    activeMapId: state.mapGeneration.mapId,
    mapRenderCount: renderer.getPerformanceInfo().lifecycle.mapRenderCount,
    renderFingerprint: renderer.getMapValidationInfo().renderFingerprint,
  }
  const invalidMap = invalidVisualFootprintFixtureMap()
  const preflight = renderer.preflightMap(invalidMap)
  const accepted = preflight.valid
  const error = preflight.valid
    ? undefined
    : `Renderer map preflight failed before Phaser mutation: ${preflight.errors.join(" ")}`

  await renderer.advanceTime()

  return {
    accepted,
    error,
    before,
    after: {
      activeMapId: state.mapGeneration.mapId,
      mapRenderCount: renderer.getPerformanceInfo().lifecycle.mapRenderCount,
      renderFingerprint: renderer.getMapValidationInfo().renderFingerprint,
    },
  }
}

async function renderDepthFixtureCaseForSmoke(
  caseId: DepthFixtureCaseId,
): Promise<DepthFixtureCaseResult> {
  const depthCase = depthFixtureCase(caseId)

  worldSync.disconnect()
  state.profile.avatarId = "cobalt"
  state.profile.displayName = "Depth Ada"
  await configureDevWorldGeometry(depthCase.fixtureMap)
  applyFixtureMap(depthCase.fixtureMap, {
    source: "generated",
    mapId: "generated",
    label: `Depth case: ${caseId}`,
    prompt: `Renderer depth smoke ${caseId}`,
    keywords: ["renderer", "depth", caseId],
    validation: validFixtureValidation(depthCase.fixtureMap),
  })
  state.joined = true
  state.position = depthCase.playerPosition
  state.direction = "down"
  resetClientMotion(state.position, state.direction)
  state.players.clear()
  seedLocalRenderedPlayer()
  const depthPlayer = state.players.get(state.playerId)
  if (depthPlayer) {
    state.players.set(state.playerId, {
      ...depthPlayer,
      entryAnimation: "none",
    })
  }
  renderPlayers()
  renderer.setCameraMode("fit_room")
  await renderer.advanceTime()

  return {
    id: caseId,
    expectedLayerAtSample: depthCase.expectedLayerAtSample,
    sample: depthCase.sample,
    sampleViewport: renderer.projectWorldToViewport(depthCase.sample),
    playerPosition: depthCase.playerPosition,
    occluderTokenId: depthCase.occluderTokenId,
  }
}

async function renderAvatarFixtureCaseForSmoke(): Promise<AvatarFixtureResult> {
  const fixtureMap = avatarFixtureMap()
  const players: readonly RenderedPlayer[] = [
    {
      playerId: "avatar-ember",
      name: "Ember Ada",
      avatarId: "ember",
      position: tileCenter(3, 3, fixtureMap.compiled.tileSize),
      direction: "down",
      local: true,
    },
    {
      playerId: "avatar-cobalt",
      name: "Cobalt Grace",
      avatarId: "cobalt",
      position: tileCenter(6, 3, fixtureMap.compiled.tileSize),
      direction: "right",
      local: false,
      emoteId: "wave",
    },
    {
      playerId: "avatar-moss",
      name: "Moss Lin",
      avatarId: "moss",
      position: tileCenter(3, 6, fixtureMap.compiled.tileSize),
      direction: "left",
      local: false,
    },
    {
      playerId: "avatar-violet",
      name: "Violet Kim",
      avatarId: "violet",
      position: tileCenter(6, 6, fixtureMap.compiled.tileSize),
      direction: "up",
      local: false,
    },
  ]

  worldSync.disconnect()
  await configureDevWorldGeometry(fixtureMap)
  applyFixtureMap(fixtureMap, {
    source: "generated",
    mapId: "generated",
    label: "Avatar fixture",
    prompt: "Renderer avatar system fixture",
    keywords: ["renderer", "avatar"],
    validation: validFixtureValidation(fixtureMap),
  })
  state.joined = true
  state.position = players[0].position
  state.direction = players[0].direction
  resetClientMotion(state.position, state.direction)
  state.profile.avatarId = "ember"
  state.profile.displayName = "Ember Ada"
  state.players.clear()
  players.forEach((player) => state.players.set(player.playerId, player))
  renderPlayers()
  await renderer.advanceTime()

  return {
    playerIds: players.map((player) => player.playerId),
    avatarIds: players.map((player) => player.avatarId as AvatarId),
    directions: players.map((player) => player.direction),
  }
}

async function renderAvatarPreviewGalleryForSmoke(): Promise<AvatarPreviewGalleryResult> {
  const fixtureMap = avatarPreviewGalleryFixtureMap()
  const players = avatarPreviewGalleryPlayers(fixtureMap)

  worldSync.disconnect()
  await configureDevWorldGeometry(fixtureMap)
  applyFixtureMap(fixtureMap, {
    source: "generated",
    mapId: "generated",
    label: "Avatar preview gallery",
    prompt: "Renderer avatar animation preview gallery",
    keywords: ["renderer", "avatar", "preview"],
    validation: validFixtureValidation(fixtureMap),
  })
  state.joined = true
  state.position = players[0].position
  state.direction = players[0].direction
  resetClientMotion(state.position, state.direction)
  setLifecycleStatus("joined", "Avatar preview gallery")
  state.profile.avatarId = "ember"
  state.profile.displayName = "Ember idle up"
  state.players.clear()
  players.forEach((player) => state.players.set(player.playerId, player))
  renderPlayers()
  await renderer.advanceTime()
  renderer.setCameraMode("fit_room")
  await renderer.advanceTime()

  return {
    playerIds: players.map((player) => player.playerId),
    avatarIds,
    actions: avatarPreviewActions,
    visualFacings: avatarPreviewFacings,
    serverDirections: avatarPreviewFacings.map(serverDirectionForVisualFacing),
    rows: avatarIds.length * avatarPreviewActions.length,
    columns: avatarPreviewFacings.length,
  }
}

async function moveAvatarFixturePlayerForSmoke(
  playerId: string,
  position: Vector2,
  direction: Direction,
): Promise<void> {
  const player = state.players.get(playerId)
  if (!player) throw new Error(`Missing avatar fixture player ${playerId}.`)

  state.players.set(playerId, {
    ...player,
    position,
    direction,
    emoteId: undefined,
  })
  renderPlayers()
  await renderer.advanceTime()
}

async function renderZoneFixtureCaseForSmoke(): Promise<ZoneFixtureResult> {
  const fixtureMap = zoneFixtureMap()

  worldSync.disconnect()
  await configureDevWorldGeometry(fixtureMap)
  applyFixtureMap(fixtureMap, {
    source: "generated",
    mapId: "generated",
    label: "Zone fixture",
    prompt: "Renderer zone presentation fixture",
    keywords: ["renderer", "zone"],
    validation: validFixtureValidation(fixtureMap),
  })
  state.joined = true
  state.position = fixtureSpawnPosition(fixtureMap, "default")
  state.direction = "down"
  resetClientMotion(state.position, state.direction)
  await admitLocalPlayerForSmoke(state.position)
  state.players.clear()
  seedLocalRenderedPlayer()
  renderPlayers()
  updateActiveZoneFromPosition()
  await renderer.advanceTime()

  return {
    zoneIds: fixtureMap.compiled.zones.map((zone) => zone.id),
    zoneTypes: fixtureMap.compiled.zones.map((zone) => zone.zoneType),
  }
}

async function moveLocalPlayerForSmoke(position: Vector2): Promise<void> {
  if (state.joined) {
    await admitLocalPlayerForSmoke(position)
  }
  state.position = position
  clientMotion.reconcile(position, { force: true })
  upsertRenderedPlayer({
    playerId: state.playerId,
    position,
    direction: state.direction,
  })
  renderPlayers()
  updateActiveZoneFromPosition()
  await renderer.advanceTime()
}

async function admitLocalPlayerForSmoke(position: Vector2): Promise<void> {
  if (!state.sessionId) {
    const session = await signInDevUser(
      "wikimedia-renderer-smoke-user",
      displayNameForLocalProfile(),
    )
    state.sessionId = session.sessionId
  }

  await leaveWorldSafely(state.clientId, displayNameForLocalProfile())
  const token = await issueWorldToken(state.sessionId)
  const joined = await joinWorld({
    clientId: state.clientId,
    token: token.token,
    playerId: state.playerId,
    spawn: position,
    roomId: "room-lobby",
    avatarId: state.profile.avatarId,
  })

  if (joined.status !== "joined") {
    throw new Error(`Smoke world admission failed: ${joined.reason}`)
  }

  state.joined = true
  state.position = playerSnapshotPosition(joined.player)
  state.direction = joined.player.direction ?? state.direction
  state.worldInteractionSignature = undefined
}

async function requestMoveForSmoke(
  vector: MovementVector,
  direction: Direction,
  movementMode: MovementMode = "walk",
): Promise<void> {
  if (!state.joined) {
    throw new Error("Cannot request a smoke movement before joining the world.")
  }

  await move(vector, direction, movementMode)
  await renderer.advanceTime()
}

function depthFixtureCase(caseId: DepthFixtureCaseId): {
  readonly fixtureMap: FixtureMap
  readonly expectedLayerAtSample: "avatar" | "object"
  readonly sample: Vector2
  readonly playerPosition: Vector2
  readonly occluderTokenId: string
} {
  const tableCase = caseId.startsWith("table")
  const playerPosition =
    caseId === "table_player_front"
      ? { x: 144, y: 162 }
      : { x: 144, y: 148 }
  const sample =
    caseId === "table_player_front"
      ? { x: 144, y: 158 }
      : { x: 144, y: 144 }
  const occluderTokenId = tableCase
    ? "item.large_conference_table"
    : "wall.wood.straight"

  return {
    fixtureMap: depthFixtureMap({
      table: tableCase,
      playerPosition,
      occluderTokenId,
    }),
    expectedLayerAtSample: caseId === "table_player_front" ? "avatar" : "object",
    sample,
    playerPosition,
    occluderTokenId,
  }
}

function avatarFixtureMap(): FixtureMap {
  const width = 12
  const height = 10
  const tileSize = starterVisualAssetCatalog.tileSize
  const floorToken = visualTokenById("floor.wood_parquet")
  const wallToken = visualTokenById("wall.neutral.straight")
  const cornerToken = visualTokenById("wall.neutral.corner")
  const floor = gridOf(width, height, floorToken.provisionalGid)
  const walls = gridOf(width, height, 0)
  const objects = gridOf(width, height, 0)
  const blockedTiles: Vector2[] = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1
      if (!edge) continue

      const corner =
        (x === 0 || x === width - 1) && (y === 0 || y === height - 1)
      walls[y][x] = corner ? cornerToken.provisionalGid : wallToken.provisionalGid
      blockedTiles.push({ x, y })
    }
  }

  return {
    definition: {
      style: "cozy_wood",
    },
    compiled: {
      width,
      height,
      tileSize,
      blockedTiles,
      layers: {
        floor: { gids: floor },
        walls: { gids: walls },
        objects: { gids: objects },
      },
      zones: [],
    },
    spawnPoints: [
      {
        id: "default",
        position: tileCenter(3, 3, tileSize),
      },
      {
        id: "guest",
        position: tileCenter(6, 3, tileSize),
      },
    ],
    catalog: {
      tokens: [floorToken, wallToken, cornerToken],
    },
  }
}

function avatarPreviewGalleryFixtureMap(): FixtureMap {
  const width = 31
  const height = 27
  const tileSize = starterVisualAssetCatalog.tileSize
  const floorToken = visualTokenById("floor.soft_carpet")
  const wallToken = visualTokenById("wall.neutral.straight")
  const cornerToken = visualTokenById("wall.neutral.corner")
  const floor = gridOf(width, height, floorToken.provisionalGid)
  const walls = gridOf(width, height, 0)
  const objects = gridOf(width, height, 0)
  const blockedTiles: Vector2[] = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1
      if (!edge) continue

      const corner =
        (x === 0 || x === width - 1) && (y === 0 || y === height - 1)
      walls[y][x] = corner ? cornerToken.provisionalGid : wallToken.provisionalGid
      blockedTiles.push({ x, y })
    }
  }

  return {
    definition: {
      style: "avatar_preview",
    },
    compiled: {
      width,
      height,
      tileSize,
      blockedTiles,
      layers: {
        floor: { gids: floor },
        walls: { gids: walls },
        objects: { gids: objects },
      },
      zones: [],
    },
    spawnPoints: [
      {
        id: "default",
        position: tileCenter(3, 2, tileSize),
      },
    ],
    catalog: {
      tokens: [floorToken, wallToken, cornerToken],
    },
  }
}

function avatarPreviewGalleryPlayers(
  fixtureMap: FixtureMap,
): readonly RenderedPlayer[] {
  const tileSize = fixtureMap.compiled.tileSize
  const startX = tileSize * 2.5
  const startY = tileSize * 2.75
  const columnGap = tileSize * 3.82
  const rowGap = tileSize * 1.5

  return avatarIds.flatMap((avatarId, avatarIndex) =>
    avatarPreviewActions.flatMap((action, actionIndex) => {
      const rowIndex = avatarIndex * avatarPreviewActions.length + actionIndex

      return avatarPreviewFacings.map((visualFacing, facingIndex) => ({
        playerId: `avatar-preview-${avatarId}-${action}-${visualFacing}`,
        name: `${avatarInitial(avatarId)} ${avatarActionLabel(action)} ${avatarFacingLabel(visualFacing)}`,
        avatarId,
        position: {
          x: startX + facingIndex * columnGap,
          y: startY + rowIndex * rowGap,
        },
        direction: serverDirectionForVisualFacing(visualFacing),
        animationPreview: {
          action,
          visualFacing,
        },
        local: avatarIndex === 0 && actionIndex === 0 && facingIndex === 0,
        entryAnimation: "none" as const,
      }))
    }),
  )
}

function zoneFixtureMap(): FixtureMap {
  const width = 14
  const height = 10
  const tileSize = starterVisualAssetCatalog.tileSize
  const floorToken = visualTokenById("floor.polished_concrete")
  const wallToken = visualTokenById("wall.glass.straight")
  const cornerToken = visualTokenById("wall.glass.corner")
  const doorToken = visualTokenById("item.door_single")
  const floor = gridOf(width, height, floorToken.provisionalGid)
  const walls = gridOf(width, height, 0)
  const objects = gridOf(width, height, 0)
  const blockedTiles: Vector2[] = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1
      if (!edge) continue

      const corner =
        (x === 0 || x === width - 1) && (y === 0 || y === height - 1)
      walls[y][x] = corner ? cornerToken.provisionalGid : wallToken.provisionalGid
      blockedTiles.push({ x, y })
    }
  }

  objects[7][2] = doorToken.provisionalGid

  return {
    definition: {
      style: "clean_glass",
    },
    compiled: {
      width,
      height,
      tileSize,
      blockedTiles,
      layers: {
        floor: { gids: floor },
        walls: { gids: walls },
        objects: { gids: objects },
      },
      zones: [
        {
          id: "meeting-zone",
          xStart: 2,
          yStart: 2,
          xEnd: 5,
          yEnd: 5,
          zoneType: "meeting_private",
        },
        {
          id: "private-zone",
          xStart: 7,
          yStart: 2,
          xEnd: 11,
          yEnd: 5,
          zoneType: "private",
        },
        {
          id: "portal-door",
          xStart: 2,
          yStart: 6,
          xEnd: 5,
          yEnd: 8,
          zoneType: "portal",
        },
        {
          id: "quiet-zone",
          xStart: 7,
          yStart: 6,
          xEnd: 12,
          yEnd: 8,
          zoneType: "quiet",
        },
      ],
    },
    spawnPoints: [
      {
        id: "default",
        position: tileCenter(3, 3, tileSize),
      },
      {
        id: "guest",
        position: tileCenter(9, 3, tileSize),
      },
    ],
    catalog: {
      tokens: [floorToken, wallToken, cornerToken, doorToken],
    },
  }
}

function depthFixtureMap(options: {
  readonly table: boolean
  readonly playerPosition: Vector2
  readonly occluderTokenId: string
}): FixtureMap {
  const width = 10
  const height = 8
  const tileSize = starterVisualAssetCatalog.tileSize
  const floorToken = visualTokenById("floor.wood_parquet")
  const occluderToken = visualTokenById(options.occluderTokenId)
  const floor = gridOf(width, height, floorToken.provisionalGid)
  const walls = gridOf(width, height, 0)
  const objects = gridOf(width, height, 0)
  const blockedTiles: Vector2[] = []

  if (options.table) {
    objects[3][3] = occluderToken.provisionalGid
    for (let y = 3; y < 5; y += 1) {
      for (let x = 3; x < 6; x += 1) {
        blockedTiles.push({ x, y })
      }
    }
  } else {
    walls[4][4] = occluderToken.provisionalGid
    blockedTiles.push({ x: 4, y: 4 })
  }

  return {
    definition: {
      style: "cozy_wood",
    },
    compiled: {
      width,
      height,
      tileSize,
      blockedTiles,
      layers: {
        floor: { gids: floor },
        walls: { gids: walls },
        objects: { gids: objects },
      },
      zones: [],
    },
    spawnPoints: [
      {
        id: "default",
        position: options.playerPosition,
      },
      {
        id: "guest",
        position: { x: options.playerPosition.x + 48, y: options.playerPosition.y },
      },
    ],
    catalog: {
      tokens: [floorToken, occluderToken],
    },
  }
}

function largeStaticFixtureMap(width: number, height: number): FixtureMap {
  const tileSize = starterVisualAssetCatalog.tileSize
  const floorToken = visualTokenById("floor.wood_parquet")
  const wallToken = visualTokenById("wall.wood.straight")
  const cornerToken = visualTokenById("wall.wood.corner")
  const plantToken = visualTokenById("item.plant_potted")
  const chairToken = visualTokenById("item.office_chair")
  const floor = gridOf(width, height, floorToken.provisionalGid)
  const walls = gridOf(width, height, 0)
  const objects = gridOf(width, height, 0)
  const blockedTiles: Vector2[] = []
  const spawnTiles = new Set([
    `${Math.floor(width / 2)},${Math.floor(height / 2)}`,
    `${Math.floor(width / 2) + 2},${Math.floor(height / 2)}`,
  ])

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1
      if (!edge) continue

      const corner =
        (x === 0 || x === width - 1) && (y === 0 || y === height - 1)
      walls[y][x] = corner ? cornerToken.provisionalGid : wallToken.provisionalGid
      blockedTiles.push({ x, y })
    }
  }

  for (let y = 3; y < height - 3; y += 6) {
    for (let x = 3; x < width - 3; x += 8) {
      if (spawnTiles.has(`${x},${y}`)) continue

      const token = (x + y) % 2 === 0 ? plantToken : chairToken
      objects[y][x] = token.provisionalGid
      blockedTiles.push({ x, y })
    }
  }

  return {
    definition: {
      style: "cozy_wood",
    },
    compiled: {
      width,
      height,
      tileSize,
      blockedTiles,
      layers: {
        floor: { gids: floor },
        walls: { gids: walls },
        objects: { gids: objects },
      },
      zones: [
        {
          id: "stress-zone",
          xStart: 4,
          yStart: 4,
          xEnd: Math.max(5, width - 4),
          yEnd: Math.max(5, height - 4),
          zoneType: "meeting_private",
        },
      ],
    },
    spawnPoints: [
      {
        id: "default",
        position: tileCenter(Math.floor(width / 2), Math.floor(height / 2), tileSize),
      },
      {
        id: "guest",
        position: tileCenter(
          Math.floor(width / 2) + 2,
          Math.floor(height / 2),
          tileSize,
        ),
      },
    ],
    catalog: {
      tokens: [floorToken, wallToken, cornerToken, plantToken, chairToken],
    },
  }
}

function invalidVisualFootprintFixtureMap(): FixtureMap {
  const generated = compileDeterministicPromptMap(DEFAULT_MAP_PROMPT)
  const fixtureMap = fixtureMapFromCompiledMap(generated)
  const tableToken = visualTokenById("item.large_conference_table")
  const objects = fixtureMap.compiled.layers.objects.gids.map((row) => [...row])
  const invalidX = fixtureMap.compiled.width - 1
  const invalidY = fixtureMap.compiled.height - 1

  objects[invalidY][invalidX] = tableToken.provisionalGid

  return {
    ...fixtureMap,
    compiled: {
      ...fixtureMap.compiled,
      layers: {
        ...fixtureMap.compiled.layers,
        objects: {
          ...fixtureMap.compiled.layers.objects,
          gids: objects,
        },
      },
    },
    catalog: {
      tokens: fixtureMap.catalog.tokens.some((token) => token.id === tableToken.id)
        ? fixtureMap.catalog.tokens
        : [...fixtureMap.catalog.tokens, tableToken],
    },
  }
}

function visualTokenById(id: string): FixtureToken {
  const token = starterVisualAssetCatalog.tokens.find(
    (candidate) => candidate.id === id,
  )

  if (!token) throw new Error(`Missing visual token ${id}.`)

  return {
    id: token.id,
    kind: token.kind,
    provisionalGid: token.provisionalGid,
    widthTiles: token.widthTiles,
    heightTiles: token.heightTiles,
    asset: token.asset,
  }
}

function gridOf(width: number, height: number, gid: number): number[][] {
  return Array.from({ length: height }, () => Array(width).fill(gid))
}

function tileCenter(x: number, y: number, tileSize: number): Vector2 {
  return {
    x: x * tileSize + tileSize / 2,
    y: y * tileSize + tileSize / 2,
  }
}

function collisionMapForFixtureMap(fixtureMap: FixtureMap) {
  return {
    width: fixtureMap.compiled.width * fixtureMap.compiled.tileSize,
    height: fixtureMap.compiled.height * fixtureMap.compiled.tileSize,
    tileSize: fixtureMap.compiled.tileSize,
    blockedTiles: fixtureMap.compiled.blockedTiles,
  }
}

async function configureDevWorldGeometry(fixtureMap: FixtureMap): Promise<void> {
  await postJson("/dev/world-geometry", {
    map: collisionMapForFixtureMap(fixtureMap),
    zones: fixtureMap.compiled.zones.map((zone) => ({
      id: zone.id,
      bounds: {
        x: zone.xStart * fixtureMap.compiled.tileSize,
        y: zone.yStart * fixtureMap.compiled.tileSize,
        width: (zone.xEnd - zone.xStart) * fixtureMap.compiled.tileSize,
        height: (zone.yEnd - zone.yStart) * fixtureMap.compiled.tileSize,
      },
    })),
  })
}

function applyEvents(events: readonly WorldEvent[]): void {
  events
    .filter((event) => eventVisibleToClient(event))
    .forEach((event) => applyServerMessage(event.message))
}

function applyServerMessage(message: ServerMessage): void {
  if ("type" in message && message.type === "player_state") {
    const position = { x: message.x, y: message.y }
    const localPlayerMoved = message.playerId === state.playerId

    if (localPlayerMoved) {
      observeServerMovementProtocol(message)
      const reconciliation = reconcileClientMovementPrediction(
        position,
        message.seqAck,
        false,
      )
      state.position = position
      state.direction = message.direction
      clientMotion.reconcile(reconciliation?.replayTarget ?? position)
      state.lastMovementRejection = undefined
      logMovementDebug(
        "server",
        `seq=${message.seqAck ?? "-"} pos=${formatMovementVector(position)} facing=${message.direction} ${formatServerMovementTelemetry(message)}`,
      )
    }

    if (message.playerId === state.companion.playerId) {
      state.companion.position = position
      state.companion.direction = message.direction
    }

    upsertRenderedPlayer({
      playerId: message.playerId,
      position,
      direction: message.direction,
      movementMode: message.movementMode,
    })
    renderPlayers()
    if (localPlayerMoved) {
      updateActiveZoneFromPosition()
    }
    recordEvent(`Moved ${message.direction} to ${Math.round(message.x)}, ${Math.round(message.y)}`)
    return
  }

  if ("type" in message && message.type === "movement_rejected") {
    applyMovementRejection(message)
    return
  }

  if ("type" in message && message.type === "world_snapshot") {
    applyRealtimeWorldSnapshot(message)
    return
  }

  if ("type" in message && message.type === "chat_delivered") {
    state.lastChatBody = message.body
    addChatMessage(message.body, message.recipientPlayerIds.length)
    return
  }

  if ("type" in message && message.type === "protocol_error") {
    if (isRecoverableProtocolError(message)) {
      recoverFromWorldLoss("unknown_client")
      return
    }
    recordEvent(`Protocol warning: ${message.message}`)
    publishToast("The room could not apply that update.", "warning")
    return
  }

  if ("reason" in message && message.reason) {
    recordEvent(`Server rejected message: ${message.reason}`)
    publishToast("The room could not apply that action.", "warning")
  }
}

function eventVisibleToClient(event: WorldEvent): boolean {
  if (event.type === "broadcast") return event.exceptClientId !== state.clientId
  return Array.isArray(event.clientIds) && event.clientIds.includes(state.clientId)
}

function reconcileClientMovementPrediction(
  authoritativePosition: Vector2,
  seqAck: number | undefined,
  rejected: boolean,
): MovementReconciliationResult | undefined {
  const pending = state.movementPrediction.pending
  const ackIndex =
    seqAck === undefined
      ? pending.length - 1
      : pending.findIndex((prediction) => prediction.seq === seqAck)

  if (ackIndex < 0) {
    if (seqAck !== undefined && seqAck > (state.movementPrediction.lastAckSeq ?? -1)) {
      const supersededPredictions = pending.filter(
        (prediction) => prediction.seq <= seqAck,
      )
      const unacknowledged = pending.filter(
        (prediction) => prediction.seq > seqAck,
      )
      const replay = replayPendingMovementPredictions(
        authoritativePosition,
        unacknowledged,
      )
      const replayCorrectionPx = vectorDistancePx(
        authoritativePosition,
        replay.target,
      )

      state.movementPrediction.pending = replay.predictions
      state.movementPrediction.active = replay.predictions.at(-1)
      state.movementPrediction.last = supersededPredictions.at(-1) ??
        state.movementPrediction.last
      state.movementPrediction.lastAckSeq = seqAck
      state.movementPrediction.lastReplayCount = replay.predictions.length
      state.movementPrediction.totalReplayed += replay.predictions.length
      state.movementPrediction.lastReplayCorrectionPx = Number(
        replayCorrectionPx.toFixed(2),
      )
      state.movementPrediction.lastReplayTarget = replay.target
      if (supersededPredictions.length > 0) {
        state.movementPrediction.lastOutcome = "server_superseded"
      }
      const acknowledged = supersededPredictions.at(-1)
      if (acknowledged) {
        state.movementPrediction.lastCorrectionPx = Number(
          movementPredictionCorrectionPx(
            acknowledged,
            authoritativePosition,
          ).toFixed(2),
        )
        logMovementDebug(
          "reconcile",
          `seq=${seqAck} superseded prediction=${acknowledged.seq} correction=${state.movementPrediction.lastCorrectionPx} replay=${replay.predictions.length} pending=${formatPredictionSeqs(replay.predictions)}`,
        )
        return {
          acknowledged,
          authoritativePosition,
          replayTarget: replay.target,
          replayCount: replay.predictions.length,
          rejected,
        }
      }
      logMovementDebug(
        "reconcile",
        `seq=${seqAck} acknowledged without prediction superseded=${formatPredictionSeqs(supersededPredictions)} replay=${replay.predictions.length} pending=${formatPredictionSeqs(replay.predictions)}`,
      )
    }
    return undefined
  }

  const acknowledged = pending[ackIndex]
  const unacknowledged = pending.slice(ackIndex + 1)
  const correctionPx = movementPredictionCorrectionPx(
    acknowledged,
    authoritativePosition,
  )
  const replay = replayPendingMovementPredictions(
    authoritativePosition,
    unacknowledged,
  )
  const replayCorrectionPx = vectorDistancePx(
    authoritativePosition,
    replay.target,
  )

  state.movementPrediction.pending = replay.predictions
  state.movementPrediction.active = replay.predictions.at(-1)
  state.movementPrediction.last = acknowledged
  state.movementPrediction.lastAckSeq = acknowledged.seq
  state.movementPrediction.lastCorrectionPx = Number(correctionPx.toFixed(2))
  state.movementPrediction.lastReplayCount = replay.predictions.length
  state.movementPrediction.totalReplayed += replay.predictions.length
  state.movementPrediction.lastReplayCorrectionPx = Number(
    replayCorrectionPx.toFixed(2),
  )
  state.movementPrediction.lastReplayTarget = replay.target

  if (rejected) {
    state.movementPrediction.totalServerRejected += 1
    state.movementPrediction.lastOutcome = "server_rejected"
    logMovementDebug(
      "reconcile",
      `seq=${acknowledged.seq} rejected correction=${state.movementPrediction.lastCorrectionPx} replay=${replay.predictions.length} pending=${formatPredictionSeqs(replay.predictions)}`,
    )
    return {
      acknowledged,
      authoritativePosition,
      replayTarget: replay.target,
      replayCount: replay.predictions.length,
      rejected,
    }
  }

  if (movementPredictionMatches(acknowledged, authoritativePosition)) {
    state.movementPrediction.totalConfirmed += 1
    state.movementPrediction.lastOutcome = "confirmed"
    logMovementDebug(
      "reconcile",
      `seq=${acknowledged.seq} confirmed correction=${state.movementPrediction.lastCorrectionPx} replay=${replay.predictions.length} pending=${formatPredictionSeqs(replay.predictions)}`,
    )
    return {
      acknowledged,
      authoritativePosition,
      replayTarget: replay.target,
      replayCount: replay.predictions.length,
      rejected,
    }
  }

  state.movementPrediction.totalCorrected += 1
  state.movementPrediction.lastOutcome = "corrected"
  logMovementDebug(
    "reconcile",
    `seq=${acknowledged.seq} corrected correction=${state.movementPrediction.lastCorrectionPx} replay=${replay.predictions.length} pending=${formatPredictionSeqs(replay.predictions)}`,
  )
  return {
    acknowledged,
    authoritativePosition,
    replayTarget: replay.target,
    replayCount: replay.predictions.length,
    rejected,
  }
}

function replayPendingMovementPredictions(
  authoritativePosition: Vector2,
  pending: readonly ClientMovementPrediction[],
): {
  readonly predictions: ClientMovementPrediction[]
  readonly target: Vector2
} {
  if (pending.length === 0) {
    return {
      predictions: [],
      target: authoritativePosition,
    }
  }

  if (!state.fixtureMap) {
    const predictions = trimMovementPredictionHistory(pending)
    return {
      predictions,
      target: predictions.at(-1)?.target ?? authoritativePosition,
    }
  }

  return replayMovementPredictions({
    from: authoritativePosition,
    predictions: pending,
    map: collisionMapForFixtureMap(state.fixtureMap),
    playerSize: movementCollisionBodySize(state.movementFeel),
    collisionSlide: movementCollisionSlideOptions(state.movementFeel),
  })
}

function vectorDistancePx(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function formatPredictionSeqs(
  predictions: readonly ClientMovementPrediction[],
): string {
  return predictions.map((prediction) => prediction.seq).join(",") || "-"
}

function seedLocalRenderedPlayer(): void {
  const motion = clientMotion.snapshot()

  upsertRenderedPlayer({
    playerId: state.playerId,
    position: clientMotion.renderedPosition(state.position),
    direction: clientMotion.renderedDirection(state.direction),
    movementMode: clientMotion.renderedMovementMode("walk"),
    cameraMotion: cameraMotionFromSnapshot(motion),
  })
}

function upsertRenderedPlayer(player: PlayerSnapshot): void {
  const snapshotPosition = playerSnapshotPosition(player)
  const local = player.playerId === state.playerId
  const position = local
    ? clientMotion.renderedPosition(snapshotPosition)
    : snapshotPosition
  const direction = local
    ? clientMotion.renderedDirection(player.direction ?? "down")
    : player.direction ?? "down"
  const movementMode = local
    ? clientMotion.renderedMovementMode(player.movementMode ?? "walk")
    : player.movementMode ?? "walk"

  state.players.set(player.playerId, {
    playerId: player.playerId,
    name: displayNameForPlayer(player),
    avatarId: avatarIdForPlayer(player),
    position,
    direction,
    movementMode,
    cameraMotion: local
      ? player.cameraMotion ?? cameraMotionFromSnapshot(clientMotion.snapshot())
      : undefined,
    snapshotTick: player.snapshotTick,
    snapshotServerTime: player.snapshotServerTime,
    snapshotReceivedAtMs: player.snapshotReceivedAtMs,
    local,
    rejected: player.rejected,
  })
}

function cameraMotionFromSnapshot(
  snapshot: ClientMotionSnapshot,
): RendererCameraFollowMotion {
  return {
    velocity: snapshot.velocity,
    speedPxPerSecond: snapshot.speedPxPerSecond,
    inputActive: snapshot.inputActive,
    correcting: snapshot.correcting,
    movementMode: snapshot.movementMode,
  }
}

function renderPlayers(
  options: { readonly refreshCameraControls?: boolean } = {},
): void {
  const players = [...state.players.values()]
  renderer.updatePlayers(players)
  if (options.refreshCameraControls !== false) {
    renderCameraControls(renderer.getCameraState())
  }

  players.forEach((player) => {
    if (!player.rejected) return
    state.players.set(player.playerId, {
      ...player,
      rejected: false,
    })
  })
}

function displayNameForPlayer(player: Pick<PlayerSnapshot, "playerId" | "userId">): string {
  if (player.playerId === state.playerId) return displayNameForLocalProfile()
  if (player.playerId === state.companion.playerId) return state.companion.displayName
  if (player.userId) return titleCaseName(player.userId)
  return titleCaseName(player.playerId)
}

function avatarIdForPlayer(player: Pick<PlayerSnapshot, "playerId">): AvatarId {
  if (player.playerId === state.playerId) return state.profile.avatarId
  if (player.playerId === state.companion.playerId) return state.companion.avatarId
  return "moss"
}

function applyMovementRejection(
  message: Extract<ServerMessage, { type: "movement_rejected" }>,
): void {
  const position = { x: message.x, y: message.y }
  const direction =
    message.playerId === state.playerId
      ? inputController.lastDirectionOr(state.direction)
      : message.playerId === state.companion.playerId
        ? state.companion.direction
        : "down"
  const showFeedback = shouldShowMovementRejectionFeedback(message.reason)

  if (message.playerId === state.playerId) {
    observeServerMovementProtocol(message)
    const reconciliation = reconcileClientMovementPrediction(
      position,
      message.seqAck,
      true,
    )
    state.position = position
    state.direction = direction
    clientMotion.reconcile(reconciliation?.replayTarget ?? position, {
      rejected: !reconciliation || reconciliation.replayCount === 0,
    })
    logMovementDebug(
      "rejected",
      `seq=${message.seqAck ?? "-"} reason=${message.reason} pos=${formatMovementVector(position)} ${formatServerMovementTelemetry(message)}`,
    )
  }

  if (message.playerId === state.companion.playerId) {
    state.companion.position = position
    state.companion.direction = direction
  }

  upsertRenderedPlayer({
    playerId: message.playerId,
    position,
    direction,
    movementMode: message.movementMode,
    rejected: showFeedback,
  })
  renderPlayers()
  if (message.playerId === state.playerId) {
    updateActiveZoneFromPosition()
  }

  if (showFeedback) {
    publishToast(
      movementRejectionLabel(message.reason),
      message.reason === "collision" ? "info" : "warning",
    )
  }
}

function applyRealtimeWorldSnapshot(
  message: Extract<ServerMessage, { type: "world_snapshot" }>,
): void {
  const snapshotIds = new Set(message.players.map((player) => player.playerId))
  const snapshotReceivedAtMs = performance.now()
  state.snapshotPlayerIds = [...snapshotIds]
  state.companion.joined = snapshotIds.has(state.companion.playerId)

  for (const player of message.players) {
    const position = { x: player.x, y: player.y }
    const localPlayer = player.playerId === state.playerId

    if (localPlayer) {
      const reconciliation =
        player.lastSeqAck > (state.movementPrediction.lastAckSeq ?? -1)
          ? reconcileClientMovementPrediction(position, player.lastSeqAck, false)
          : undefined

      state.position = position
      state.direction = player.direction
      if (reconciliation) {
        clientMotion.reconcile(reconciliation.replayTarget)
      }
    }

    if (player.playerId === state.companion.playerId) {
      state.companion.position = position
      state.companion.direction = player.direction
    }

    upsertRenderedPlayer({
      playerId: player.playerId,
      userId: player.userId,
      position,
      direction: player.direction,
      movementMode: player.movementMode,
      snapshotTick: message.tick,
      snapshotServerTime: message.serverTime,
      snapshotReceivedAtMs,
    })
  }

  for (const playerId of state.players.keys()) {
    if (!snapshotIds.has(playerId)) {
      state.players.delete(playerId)
    }
  }

  renderPlayers()
  updateActiveZoneFromPosition()
}

function shouldShowMovementRejectionFeedback(
  reason: MovementRejectedReason,
): boolean {
  const nowMs = Date.now()
  const previous = state.lastMovementRejection
  const changedReason = previous?.reason !== reason
  const outsideCooldown =
    previous === undefined || nowMs - previous.atMs >= MOVEMENT_REJECTION_FEEDBACK_MS

  if (!changedReason && !outsideCooldown) return false

  state.lastMovementRejection = {
    reason,
    atMs: nowMs,
  }
  return true
}

function movementRejectionLabel(reason: MovementRejectedReason): string {
  switch (reason) {
    case "collision":
      return "Bumped into wall or furniture"
    case "zone_permission":
      return "This zone is not open yet"
    case "speed_limit":
      return "Step held back to match server pace"
    case "unknown_player":
      return "Rejoin needed before moving"
    case "invalid_message":
      return "Move request could not be used"
  }
}

function renderCameraControls(camera: RendererCameraState): void {
  elements.zoomReset.textContent = `${Math.round(camera.zoomFactor * 100)}%`
  elements.zoomOut.disabled = !camera.canZoomOut
  elements.zoomIn.disabled = !camera.canZoomIn
  elements.cameraFollow.setAttribute(
    "aria-pressed",
    String(camera.mode === "follow_player"),
  )
  elements.cameraFit.setAttribute(
    "aria-pressed",
    String(camera.mode === "fit_room"),
  )
  elements.zoomPreset.value = camera.zoomPreset
}

function isRendererZoomPresetId(
  zoomPreset: string,
): zoomPreset is RendererZoomPresetId {
  return ["room", "standard", "near", "focus", "custom"].includes(zoomPreset)
}

function renderMapSwitcher(): void {
  const activeMapId = state.mapGeneration.mapId

  elements.mapSwitcherButtons.forEach((button) => {
    const mapId = button.dataset.mapId as MapSwitcherId | undefined
    const pressed = mapId === activeMapId
    const generatedDisabled = mapId === "generated" && !state.generatedRoom

    button.disabled = generatedDisabled
    button.setAttribute("aria-pressed", String(pressed))
    button.setAttribute("aria-disabled", String(generatedDisabled))
  })

  elements.generatedMapAvailability.textContent =
    activeMapId === "generated"
      ? "Current room"
      : state.generatedRoom
        ? "Ready to open"
        : "Create one first"
}

function renderIdentityControls(): void {
  const displayName = displayNameForLocalProfile()

  elements.avatarButtons.forEach((button) => {
    const pressed = button.dataset.avatarId === state.profile.avatarId
    button.setAttribute("aria-pressed", String(pressed))
  })
  elements.previewAvatar.textContent = initialsForName(displayName)
  elements.localPreview.dataset.avatarId = state.profile.avatarId
}

function setLifecycleStatus(
  phase: LifecyclePhase,
  message: string,
  publicMessage?: string,
  detail?: string,
  recoveryReason?: string,
): void {
  state.lifecycle = {
    phase,
    message,
    publicMessage: publicMessage ?? lifecyclePublicMessage(phase, message),
    detail,
    lastRecoveryReason: recoveryReason,
  }
  renderLifecycleStatus()
}

function renderLifecycleStatus(): void {
  elements.lifecycleBanner.dataset.state = state.lifecycle.phase
  elements.lifecycleStatus.textContent = state.lifecycle.publicMessage
  renderStageOverlay()
}

function setRendererReadiness(readiness: RendererReadiness): void {
  state.rendererReadiness = readiness
  elements.map.dataset.loading = String(readiness === "loading")
  renderStageOverlay()
}

function lifecyclePublicMessage(
  phase: LifecyclePhase,
  message: string,
): string {
  switch (phase) {
    case "empty":
      return message.includes("ready") ? message : roomReadyLabel()
    case "joining":
      return "Entering office..."
    case "joined":
      return message
    case "leaving":
      return "Leaving office..."
    case "map_reloading":
      return "Preparing room..."
    case "recovering":
      return "Rejoin needed"
  }
}

interface StageOverlayContent {
  readonly state: StageOverlayState
  readonly kicker: string
  readonly title: string
  readonly body: string
  readonly hidden: boolean
}

function renderStageOverlay(): void {
  const content = stageOverlayContent()

  elements.stageOverlay.hidden = content.hidden
  elements.stageOverlay.dataset.state = content.state
  elements.stageOverlayKicker.textContent = content.kicker
  elements.stageOverlayTitle.textContent = content.title
  elements.stageOverlayBody.textContent = content.body
}

function stageOverlayContent(): StageOverlayContent {
  if (state.rendererReadiness === "loading") {
    return {
      state: "loading",
      kicker: "Starting renderer",
      title: "Preparing office",
      body: "The map is loading. Controls will be ready shortly.",
      hidden: false,
    }
  }

  if (state.rendererReadiness === "failed") {
    return {
      state: "error",
      kicker: "Office view",
      title: "Renderer unavailable",
      body: "Refresh the page or try again shortly.",
      hidden: false,
    }
  }

  switch (state.lifecycle.phase) {
    case "joining":
      return {
        state: "loading",
        kicker: "Joining room",
        title: "Entering office",
        body: "Creating your local session and joining the shared room.",
        hidden: false,
      }
    case "leaving":
      return {
        state: "reloading",
        kicker: "Leaving room",
        title: "Closing session",
        body: "Clearing live room state and returning to the room preview.",
        hidden: false,
      }
    case "map_reloading":
      return {
        state: "reloading",
        kicker: "Room update",
        title: state.lifecycle.publicMessage,
        body: "The map and local room state are being prepared.",
        hidden: false,
      }
    case "recovering":
      return {
        state: "recovery",
        kicker: "Room recovery",
        title: state.lifecycle.publicMessage,
        body: "The live room state changed. Rejoin to continue from the current map.",
        hidden: false,
      }
    case "empty":
      return {
        state: "empty",
        kicker: "Room ready",
        title: state.lifecycle.publicMessage,
        body: "Enter the office when you are ready. The room is idle.",
        hidden: false,
      }
    case "joined":
      return {
        state: "hidden",
        kicker: "",
        title: "",
        body: "",
        hidden: true,
      }
  }
}

function syncResponsiveToolSections(): void {
  const mobile = mobileLayoutQuery.matches

  elements.mobileCollapsibleSections.forEach((section) => {
    section.open = !mobile && !section.classList.contains("compact-tool")
  })
}

function renderMapGenerationResult(): void {
  const activeGenerated = state.mapGeneration.source === "generated"
  const previewMap = activeGenerated
    ? state.mapGeneration
    : state.generatedRoom?.mapGeneration
  const validation = previewMap?.validation
  const preview = previewMap?.preview ?? state.generatedPreview

  if (!previewMap || !validation) {
    setGeneratorPreviewState(
      "empty",
      "No generated room yet",
      "Pick an example or describe a room, then generate a playable map.",
    )
    elements.validationBlocked.textContent = "0"
    elements.validationSpawns.textContent = "0"
    elements.validationZones.textContent = "0"
    elements.validationSummary.textContent = "Custom room checks will appear here."
    return
  }

  const previewState = validation.valid ? "ready" : "review"
  const status = activeGenerated
    ? validation.valid
      ? `Generated ${generationLabel(previewMap.keywords)}`
      : "Generated map needs review"
    : previewMap
      ? "Generated room saved"
      : "No generated room yet"
  const detail = activeGenerated
    ? generatedRoomDetail(previewMap)
    : previewMap
      ? `Saved from: "${previewMap.prompt}"`
      : "Pick an example or describe a room, then generate a playable map."

  setGeneratorPreviewState(
    preview?.mode === "applied" && preview.previewMatchesRendered
      ? "ready"
      : previewState,
    status,
    preview ? `${detail} - ${previewDetail(preview)}` : detail,
  )
  elements.validationBlocked.textContent = `${validation.blockedTileCount} tiles`
  elements.validationSpawns.textContent = validation.valid
    ? `${validation.spawnCount} ready`
    : "Check"
  elements.validationZones.textContent = validation.valid
    ? `${validation.zoneCount} ready`
    : "Check"
  elements.validationSummary.textContent = validationHumanSummary(validation)
}

function updateActiveZoneFromPosition(): void {
  const position = clientMotion.renderedPosition(state.position)
  const zone = state.fixtureMap
    ? zoneContainingPoint(
        state.fixtureMap.compiled.zones,
        position,
        state.fixtureMap.compiled.tileSize,
      )
    : undefined
  const previousZoneId = state.activeZone?.id
  const nextZoneId = zone?.id

  state.activeZone = zone
  syncWorldInteractionLayer()
  renderZonePresentation()
  if (!activeMeetingZone() && !state.mediaSession) {
    state.micEnabled = false
    state.cameraEnabled = false
  }

  if (previousZoneId !== nextZoneId) {
    if (state.mediaUnavailableMessage) {
      clearMediaUnavailable()
    }
    if (zone) {
      recordEvent(`Entered ${zoneDisplayName(zone)}`)
      if (state.joined && isMeetingZone(zone)) {
        publishToast(`Call available in ${zoneDisplayName(zone)}`, "info")
      }
    } else {
      recordEvent("Left meeting zone")
    }
  }

  if (state.meetingJoined && state.meetingZoneId !== nextZoneId) {
    leaveMeetingLocally("Left meeting zone")
    return
  }

  renderMeetingControls()
  renderMediaPanel()
}

function renderZonePresentation(): void {
  const activeZoneIds = state.activeZone ? [state.activeZone.id] : []
  const availableActionZoneIds = state.worldInteractionInfo.candidates
    .filter(
      (candidate) =>
        candidate.kind === "zone" &&
        candidate.active &&
        candidate.serverPermitted,
    )
    .map((candidate) => candidate.targetId)
  const joinedZoneIds = state.meetingJoined && state.meetingZoneId
    ? [state.meetingZoneId]
    : []

  renderer.setZoneInteractionState({
    activeZoneIds,
    availableActionZoneIds,
    joinedZoneIds,
    presentations:
      state.fixtureMap?.compiled.zones.map(zonePresentationForRenderer) ?? [],
  })
}

function zonePresentationForRenderer(
  zone: FixtureZone,
): RendererZonePresentationOverride {
  const action = zoneWorldAction(zone)
  const raw = `${zone.zoneType} ${zone.id}`.toLowerCase()
  const base = {
    zoneId: zone.id,
    kind: rendererZoneKind(zone),
    label: zoneActionLabel(action, zone),
    availableAction: action,
    feedback: rendererZoneFeedback(action, raw),
    glyph: rendererZoneGlyph(action),
  }

  if (action === "join_meeting") {
    return {
      ...base,
      color: 0x2f8f63,
      textColor: "#0f4f38",
      tone: "meeting",
      prompt: "Join call",
    }
  }
  if (action === "enter_private") {
    return {
      ...base,
      color: 0x755aa5,
      textColor: "#44305f",
      tone: "private",
      prompt: "Private",
    }
  }
  if (action === "enter_portal") {
    return {
      ...base,
      color: 0x316f9f,
      textColor: "#1d4260",
      tone: "portal",
      prompt: "Enter",
    }
  }
  if (raw.includes("quiet")) {
    return {
      ...base,
      color: 0xa66f19,
      textColor: "#6b440d",
      tone: "quiet",
      prompt: zoneDisplayName(zone),
    }
  }

  return {
    ...base,
    color: 0x2f7c83,
    textColor: "#1e5f55",
    tone: "lobby",
    prompt: zoneDisplayName(zone),
  }
}

function objectInteractionPresentation(
  action: RendererWorldInteractionAction,
): RendererZonePresentationOverride {
  if (action === "open_door") {
    return {
      zoneId: "object",
      color: 0x316f9f,
      textColor: "#1d4260",
      glyph: "Door",
      tone: "door",
      prompt: "Open door",
    }
  }

  return {
    zoneId: "object",
    color: 0x2f8f63,
    textColor: "#0f4f38",
    glyph: "Use",
    tone: "object",
  }
}

function rendererZoneKind(zone: FixtureZone): string {
  const raw = `${zone.zoneType} ${zone.id}`.toLowerCase()

  if (raw.includes("meeting")) return "meeting"
  if (raw.includes("portal") || raw.includes("door")) return "portal"
  if (raw.includes("private")) return "private"
  if (raw.includes("quiet")) return "quiet"
  if (raw.includes("lobby")) return "lobby"
  return "generic"
}

function rendererZoneFeedback(
  action: RendererWorldInteractionAction | undefined,
  raw: string,
): string {
  if (action === "join_meeting") return "meeting_ready"
  if (action === "enter_private") return "private_access_available"
  if (action === "enter_portal") return "portal_ready"
  if (raw.includes("private")) return "private_boundary"
  return "none"
}

function rendererZoneGlyph(
  action: RendererWorldInteractionAction | undefined,
): string {
  if (action === "join_meeting") return "Call"
  if (action === "enter_private") return "Lock"
  if (action === "enter_portal") return "Door"
  return "Go"
}

function zoneActionLabel(
  action: RendererWorldInteractionAction | undefined,
  zone: FixtureZone,
): string {
  if (action === "join_meeting") return "Join call"
  if (action === "enter_private") return "Private access"
  if (action === "enter_portal") return "Door ready"
  return zoneDisplayName(zone)
}

function syncWorldInteractionLayer(): void {
  const candidates = worldInteractionCandidates()
  const signature = worldInteractionSignature(candidates)
  const activeCandidateIds = candidates
    .filter((candidate) => candidate.active)
    .map((candidate) => candidate.id)

  if (signature === state.worldInteractionSignature) {
    renderWorldInteractionInfo(state.worldInteractionInfo)
    return
  }

  state.worldInteractionSignature = signature

  if (activeCandidateIds.length === 0) {
    renderWorldInteractionInfo(worldInteractionInfoFromCandidates(candidates))
    return
  }

  const pendingInfo = worldInteractionInfoFromCandidates(
    candidates.map((candidate) =>
      candidate.active
        ? {
            ...candidate,
            permission: state.joined ? "pending" : "denied",
            permissionReason: state.joined ? undefined : "not_joined",
            markerVisible: state.joined,
          }
        : candidate,
    ),
  )
  renderWorldInteractionInfo(pendingInfo)

  if (!state.joined) return

  void resolveWorldInteractionPermissions(signature, candidates)
}

async function resolveWorldInteractionPermissions(
  signature: string,
  candidates: readonly RendererWorldInteractionCandidate[],
): Promise<void> {
  try {
    const response = await postJson<WorldActionPermissionResponse>(
      "/dev/world-action-permissions",
      {
        playerId: state.playerId,
        candidates: candidates
          .filter((candidate) => candidate.active)
          .map((candidate) => ({
            id: candidate.id,
            kind: candidate.kind,
            targetId: candidate.targetId,
            action: candidate.action,
            bounds: candidate.bounds,
          })),
      },
    )

    if (signature !== state.worldInteractionSignature) return

    const permitted = new Set(response.permittedCandidateIds)
    const deniedReasons = new Map(
      response.deniedCandidates.map((candidate) => [
        candidate.id,
        candidate.reason,
      ]),
    )
    const resolved = candidates.map((candidate) => {
      if (!candidate.active) return candidate

      const allowed = permitted.has(candidate.id)
      const permission: RendererWorldInteractionPermissionState = allowed
        ? "permitted"
        : "denied"
      return {
        ...candidate,
        permission,
        serverPermitted: allowed,
        permissionReason: allowed
          ? undefined
          : deniedReasons.get(candidate.id) ?? "server_denied",
        markerVisible: allowed,
      }
    })

    renderWorldInteractionInfo(
      worldInteractionInfoFromCandidates(resolved, "dev_world_action_policy"),
    )
  } catch {
    if (signature !== state.worldInteractionSignature) return
    renderWorldInteractionInfo(
      worldInteractionInfoFromCandidates(
        candidates.map((candidate) => ({
          ...candidate,
          permission: candidate.active ? "denied" : candidate.permission,
          serverPermitted: false,
          permissionReason: candidate.active
            ? "permission_service_unavailable"
            : candidate.permissionReason,
          markerVisible: false,
        })),
        "unavailable",
      ),
    )
  }
}

function renderWorldInteractionInfo(info: RendererWorldInteractionInfo): void {
  state.worldInteractionInfo = info
  renderer.setWorldInteractions(info)
  renderZonePresentation()
  renderMeetingControls()
  renderMediaPanel()
  renderWorldActionPanel()
}

function worldInteractionCandidates(): readonly RendererWorldInteractionCandidate[] {
  if (!state.fixtureMap) return []

  const position = clientMotion.renderedPosition(state.position)
  const zoneCandidates = state.fixtureMap.compiled.zones
    .map((zone) => worldInteractionCandidateForZone(zone, position))
    .filter(
      (
        candidate,
      ): candidate is RendererWorldInteractionCandidate => candidate !== undefined,
    )
  const objectCandidates = worldInteractionCandidatesForObjects(
    state.fixtureMap,
    position,
  )

  return [...zoneCandidates, ...objectCandidates]
}

function worldInteractionCandidateForZone(
  zone: FixtureZone,
  position: Vector2,
): RendererWorldInteractionCandidate | undefined {
  const action = zoneWorldAction(zone)
  if (!action || !state.fixtureMap) return undefined

  const tileSize = state.fixtureMap.compiled.tileSize
  const bounds = {
    x: zone.xStart * tileSize,
    y: zone.yStart * tileSize,
    width: (zone.xEnd - zone.xStart) * tileSize,
    height: (zone.yEnd - zone.yStart) * tileSize,
  }
  const active = pointInBounds(position, bounds)

  return {
    id: `zone:${zone.id}:${action}`,
    kind: "zone",
    targetId: zone.id,
    action,
    label: zoneDisplayName(zone),
    prompt: zoneActionPrompt(action, zone),
    bounds,
    active,
    distancePx: distanceToBoundsCenter(position, bounds),
    permission: active ? "pending" : "denied",
    serverPermitted: false,
    permissionReason: active ? undefined : "not_nearby",
    markerVisible: false,
    presentation: zonePresentationForRenderer(zone),
  }
}

function worldInteractionCandidatesForObjects(
  fixtureMap: FixtureMap,
  position: Vector2,
): readonly RendererWorldInteractionCandidate[] {
  const tokensByGid = new Map(
    fixtureMap.catalog.tokens.map((token) => [token.provisionalGid, token]),
  )
  const candidates: RendererWorldInteractionCandidate[] = []
  const tileSize = fixtureMap.compiled.tileSize

  fixtureMap.compiled.layers.objects.gids.forEach((row, y) => {
    row.forEach((gid, x) => {
      if (gid <= 0) return

      const token = tokensByGid.get(gid)
      if (!token) return

      const interaction = objectWorldInteraction(token)
      if (!interaction) return

      const interactionRadius =
        tileSize * (interaction.radiusTiles ?? WORLD_INTERACTION_OBJECT_RADIUS_TILES)
      const bounds = {
        x: x * tileSize,
        y: y * tileSize,
        width: token.widthTiles * tileSize,
        height: token.heightTiles * tileSize,
      }
      const active = pointInExpandedBounds(position, bounds, interactionRadius)
      const distancePx = distanceToBoundsCenter(position, bounds)

      candidates.push({
        id: `object:${token.id}:${x},${y}:${interaction.action}`,
        kind: "object",
        targetId: `${token.id}:${x},${y}`,
        action: interaction.action,
        label: interaction.label,
        prompt: interaction.prompt,
        bounds,
        active,
        distancePx,
        permission: active ? "pending" : "denied",
        serverPermitted: false,
        permissionReason: active ? undefined : "not_nearby",
        markerVisible: false,
        presentation: objectInteractionPresentation(interaction.action),
      })
    })
  })

  return candidates.sort(
    (left, right) => (left.distancePx ?? 0) - (right.distancePx ?? 0),
  )
}

function worldInteractionInfoFromCandidates(
  candidates: readonly RendererWorldInteractionCandidate[],
  permissionSource: RendererWorldInteractionInfo["permissionSource"] = "unavailable",
): RendererWorldInteractionInfo {
  const activeCandidates = candidates.filter((candidate) => candidate.active)
  const permittedCandidates = activeCandidates.filter(
    (candidate) => candidate.serverPermitted,
  )
  const deniedCandidates = activeCandidates.filter(
    (candidate) => candidate.permission === "denied",
  )
  const pendingCandidates = activeCandidates.filter(
    (candidate) => candidate.permission === "pending",
  )
  const primary = primaryWorldInteractionCandidate(activeCandidates)
  const stateName: RendererWorldInteractionInfo["state"] =
    activeCandidates.length === 0
      ? "idle"
      : pendingCandidates.length > 0
        ? "pending"
        : permittedCandidates.length > 0
          ? "available"
          : "denied"

  return {
    source: "server_permitted_world_interactions",
    authority: "server_permitted_actions_only",
    permissionSource,
    state: stateName,
    primaryCandidateId: primary?.id,
    activeCandidateIds: activeCandidates.map((candidate) => candidate.id),
    permittedCandidateIds: permittedCandidates.map((candidate) => candidate.id),
    deniedCandidateIds: deniedCandidates.map((candidate) => candidate.id),
    candidates,
  }
}

function primaryWorldInteractionCandidate(
  candidates: readonly RendererWorldInteractionCandidate[],
): RendererWorldInteractionCandidate | undefined {
  return [...candidates].sort((left, right) => {
    const permissionDelta =
      worldInteractionPermissionPriority(right.permission) -
      worldInteractionPermissionPriority(left.permission)
    if (permissionDelta !== 0) return permissionDelta

    const actionDelta =
      worldInteractionActionPriority(right.action) -
      worldInteractionActionPriority(left.action)
    if (actionDelta !== 0) return actionDelta

    return (left.distancePx ?? 0) - (right.distancePx ?? 0)
  })[0]
}

function worldInteractionPermissionPriority(
  permission: RendererWorldInteractionPermissionState,
): number {
  switch (permission) {
    case "permitted":
      return 3
    case "pending":
      return 2
    case "denied":
      return 1
  }
}

function worldInteractionActionPriority(
  action: RendererWorldInteractionAction,
): number {
  switch (action) {
    case "join_meeting":
      return 70
    case "enter_portal":
      return 60
    case "open_door":
      return 55
    case "enter_private":
      return 50
    case "use_object":
      return 30
    default:
      return 10
  }
}

function worldInteractionSignature(
  candidates: readonly RendererWorldInteractionCandidate[],
): string {
  const activeCandidates = candidates
    .filter((candidate) => candidate.active)
    .map((candidate) => candidate.id)
    .sort()
    .join("|")

  return [
    state.joined ? "joined" : "outside",
    state.meetingJoined ? "in-call" : "no-call",
    state.activeZone?.id ?? "no-zone",
    activeCandidates,
  ].join(":")
}

function emptyWorldInteractionInfo(): RendererWorldInteractionInfo {
  return {
    source: "server_permitted_world_interactions",
    authority: "server_permitted_actions_only",
    permissionSource: "unavailable",
    state: "idle",
    activeCandidateIds: [],
    permittedCandidateIds: [],
    deniedCandidateIds: [],
    candidates: [],
  }
}

function worldActionPermitted(
  action: RendererWorldInteractionAction,
  targetId: string,
): boolean {
  return state.worldInteractionInfo.candidates.some(
    (candidate) =>
      candidate.action === action &&
      candidate.targetId === targetId &&
      candidate.active &&
      candidate.serverPermitted,
  )
}

function renderWorldActionPanel(): void {
  const info = state.worldInteractionInfo
  const primary = primaryWorldActionCandidate()

  elements.worldActionPanel.dataset.state = info.state
  elements.worldActionPanel.dataset.action = primary?.action ?? "none"
  elements.worldActionStatus.textContent = worldActionStatusLabel(info, primary)
  elements.worldActionHint.textContent = worldActionHintLabel(info, primary)
  elements.worldActionShortcut.hidden = !primary
  elements.worldActionShortcut.dataset.state = primary?.serverPermitted
    ? "available"
    : info.state
  elements.worldActionShortcut.textContent = worldActionShortcutLabel(info, primary)
  elements.worldActionPrimary.disabled =
    !primary || !primary.serverPermitted || info.state !== "available"
  elements.worldActionPrimary.textContent = primary
    ? worldActionButtonLabel(primary)
    : "No action"
}

async function runPrimaryWorldAction(): Promise<void> {
  await runWorldAction(primaryWorldActionCandidate())
}

async function runWorldActionByCandidateId(candidateId: string): Promise<void> {
  const info = state.worldInteractionInfo
  const candidate = info.candidates.find(
    (candidate) => candidate.id === candidateId,
  )

  await runWorldAction(candidate)
}

async function runWorldAction(
  candidate: RendererWorldInteractionCandidate | undefined,
): Promise<void> {
  if (!candidate || !candidate.serverPermitted) {
    publishToast("No server-approved world action is available here.", "warning")
    return
  }

  switch (candidate.action) {
    case "join_meeting":
      await joinMeeting()
      return
    case "enter_private":
      recordEvent(`Entered ${candidate.label}`)
      publishToast(`Access granted: ${candidate.label}`, "success")
      return
    case "enter_portal":
      recordEvent(`Used ${candidate.label}`)
      publishToast(`Portal ready: ${candidate.label}`, "success")
      return
    case "open_door":
      recordEvent(`Opened ${candidate.label}`)
      publishToast(`Door opened: ${candidate.label}`, "success")
      return
    case "use_object":
      recordEvent(`Used ${candidate.label}`)
      publishToast(`${candidate.label} ready`, "info")
      return
  }
}

function primaryWorldActionCandidate(): RendererWorldInteractionCandidate | undefined {
  const info = state.worldInteractionInfo

  return info.primaryCandidateId
    ? info.candidates.find((candidate) => candidate.id === info.primaryCandidateId)
    : undefined
}

function worldActionStatusLabel(
  info: RendererWorldInteractionInfo,
  primary: RendererWorldInteractionCandidate | undefined,
): string {
  if (!primary) return "No action available"
  if (info.state === "pending") return "Checking permission"
  if (primary.serverPermitted) return primary.prompt
  return "Action unavailable"
}

function worldActionHintLabel(
  info: RendererWorldInteractionInfo,
  primary: RendererWorldInteractionCandidate | undefined,
): string {
  if (!primary) {
    return "Walk near doors, zones, or shared objects to see available actions."
  }
  if (info.state === "pending") {
    return "The local world server is deciding whether this action is allowed."
  }
  if (primary.serverPermitted) {
    if (primary.action === "enter_private") {
      return "Private area access is granted here. Press E or tap the marker to continue."
    }
    if (primary.action === "enter_portal" || primary.action === "open_door") {
      return "Door access is ready. Press E or tap the marker to use it."
    }
    return "Press E or tap the marker to use the server-approved action."
  }
  if (primary.permissionReason === "not_joined") {
    return "Enter the office before using world actions."
  }
  if (primary.permissionReason === "permission_service_unavailable") {
    return "World permissions are unavailable. Rejoin when the server is ready."
  }
  return "The server did not permit this action from your current state."
}

function worldActionShortcutLabel(
  info: RendererWorldInteractionInfo,
  primary: RendererWorldInteractionCandidate | undefined,
): string {
  if (!primary) return ""
  if (info.state === "pending") return "Checking access"
  if (!primary.serverPermitted) return "Server locked"
  return "E / Tap"
}

function worldActionButtonLabel(
  candidate: RendererWorldInteractionCandidate,
): string {
  switch (candidate.action) {
    case "join_meeting":
      return "Join call"
    case "enter_private":
      return "Enter area"
    case "enter_portal":
      return "Use portal"
    case "open_door":
      return "Open door"
    case "use_object":
      return "Use"
    default:
      return candidate.label || "Use"
  }
}

function zoneWorldAction(
  zone: FixtureZone,
): RendererWorldInteractionAction | undefined {
  const raw = `${zone.zoneType} ${zone.id}`.toLowerCase()

  if (raw.includes("meeting")) return "join_meeting"
  if (raw.includes("portal") || raw.includes("door")) return "enter_portal"
  if (raw.includes("private")) return "enter_private"
  return undefined
}

function zoneActionPrompt(
  action: RendererWorldInteractionAction,
  zone: FixtureZone,
): string {
  if (action === "join_meeting") return `Join ${zoneDisplayName(zone)} call`
  if (action === "enter_private") return `Enter ${zoneDisplayName(zone)}`
  if (action === "enter_portal") return `Use ${zoneDisplayName(zone)}`
  return zoneDisplayName(zone)
}

function objectWorldInteraction(
  token: FixtureToken,
): {
  readonly action: RendererWorldInteractionAction
  readonly label: string
  readonly prompt: string
  readonly radiusTiles?: number
} | undefined {
  const assetInteraction = token.asset?.interaction
  if (assetInteraction && assetInteraction.affordance !== "none") {
    return {
      action:
        assetInteraction.affordance === "open" ? "open_door" : "use_object",
      label: assetInteraction.label ?? objectInteractionLabel(token.id),
      prompt: assetInteraction.prompt ?? objectInteractionPrompt(token.id),
      radiusTiles: assetInteraction.radiusTiles,
    }
  }

  const tokenId = token.id
  const raw = tokenId.toLowerCase()

  if (raw.includes("door")) {
    return { action: "open_door", label: "Door", prompt: "Open door" }
  }
  if (raw.includes("coffee")) {
    return {
      action: "use_object",
      label: "Coffee bar",
      prompt: "Use coffee bar",
    }
  }
  if (raw.includes("couch") || raw.includes("sofa")) {
    return {
      action: "use_object",
      label: "Couch",
      prompt: "Use couch",
    }
  }
  if (raw.includes("table")) {
    return {
      action: "use_object",
      label: "Table",
      prompt: "Use table",
    }
  }
  return undefined
}

function objectInteractionLabel(tokenId: string): string {
  const raw = tokenId.toLowerCase()
  if (raw.includes("door")) return "Door"
  if (raw.includes("coffee")) return "Coffee bar"
  if (raw.includes("couch") || raw.includes("sofa")) return "Couch"
  if (raw.includes("chair")) return "Chair"
  if (raw.includes("whiteboard")) return "Whiteboard"
  if (raw.includes("desk")) return "Work desk"
  if (raw.includes("bookshelf")) return "Bookshelf"
  if (raw.includes("lamp")) return "Floor lamp"
  if (raw.includes("table")) return "Table"
  return "Object"
}

function objectInteractionPrompt(tokenId: string): string {
  const label = objectInteractionLabel(tokenId)
  if (label === "Door") return "Open door"
  if (label === "Chair" || label === "Couch") return `Use ${label.toLowerCase()}`
  return `Use ${label.toLowerCase()}`
}

function pointInBounds(position: Vector2, bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }): boolean {
  return (
    position.x >= bounds.x &&
    position.x < bounds.x + bounds.width &&
    position.y >= bounds.y &&
    position.y < bounds.y + bounds.height
  )
}

function pointInExpandedBounds(
  position: Vector2,
  bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  margin: number,
): boolean {
  return (
    position.x >= bounds.x - margin &&
    position.x < bounds.x + bounds.width + margin &&
    position.y >= bounds.y - margin &&
    position.y < bounds.y + bounds.height + margin
  )
}

function distanceToBoundsCenter(
  position: Vector2,
  bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): number {
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  return Math.hypot(position.x - centerX, position.y - centerY)
}

interface WorldActionPermissionResponse {
  readonly status: "ok"
  readonly source: "dev_world_action_policy"
  readonly permittedCandidateIds: readonly string[]
  readonly deniedCandidates: readonly {
    readonly id: string
    readonly reason: string
  }[]
}

function setGeneratorPreviewState(
  stateName: "empty" | "working" | "ready" | "review",
  status: string,
  detail: string,
): void {
  elements.generatedPreview.dataset.state = stateName
  elements.mapGenerationStatus.textContent = status
  elements.generatedPreviewDetail.textContent = detail
}

function generatedRoomDetail(mapGeneration: MapGenerationState): string {
  const features = generatedFeatureLabels(mapGeneration.keywords)

  return `Prompt: "${mapGeneration.prompt}" - Features: ${features}`
}

function previewDetail(preview: GeneratedMapPreviewState): string {
  if (preview.mode === "applied" && preview.previewMatchesRendered) {
    return "Preview matches the rendered room."
  }
  if (!preview.rendererPreflight.valid) {
    return `Preview blocked before rendering: ${preview.rendererPreflight.errors.join(" ")}`
  }
  return "Preview passed renderer preflight."
}

function generatedFeatureLabels(keywords: readonly string[]): string {
  const featureLabels: string[] = []
  const hasKeyword = (keyword: string) => keywords.includes(keyword)

  if (hasKeyword("cozy")) featureLabels.push("cozy")
  if (hasKeyword("wood")) featureLabels.push("wood walls")
  if (hasKeyword("coffee") && hasKeyword("bar")) {
    featureLabels.push("coffee bar")
  } else if (hasKeyword("coffee")) {
    featureLabels.push("coffee")
  }
  if (hasKeyword("plant")) featureLabels.push("plants")
  if (hasKeyword("couch")) featureLabels.push("couch")
  if (hasKeyword("door")) featureLabels.push("door")

  return featureLabels.length > 0 ? featureLabels.slice(0, 4).join(", ") : "workspace"
}

function validationHumanSummary(validation: PromptMapValidation): string {
  if (!validation.valid) {
    return `Needs review: ${validation.errors.join(" ")}`
  }

  if (validation.checks.length > 0) {
    const orderedCheckIds: PromptMapValidation["checks"][number]["id"][] = [
      "spawn_clearance",
      "zone_bounds",
      "collision_layer",
    ]
    const messageById = new Map(
      validation.checks
        .filter((check) => check.status === "pass")
        .map((check) => [check.id, check.message]),
    )

    return orderedCheckIds
      .map((id) => messageById.get(id))
      .filter((message): message is string => Boolean(message))
      .join(" ")
  }

  const spawnCopy =
    validation.spawnCount === 1
      ? "1 entry spot is clear"
      : `${validation.spawnCount} entry spots are clear`
  const zoneCopy =
    validation.zoneCount === 1
      ? "1 call area is ready"
      : `${validation.zoneCount} call areas are ready`

  return `${spawnCopy}, ${zoneCopy}, and walls/furniture are blocking movement correctly.`
}

function generationLabel(keywords: readonly string[]): string {
  const seats = keywords.find((keyword) => keyword.endsWith("-person")) ?? "meeting"
  const roomType = keywords.includes("meeting") ? "meeting room" : "room"

  return `${seats} ${roomType}`
}

function zoneContainingPoint(
  zones: readonly FixtureZone[],
  position: Vector2,
  tileSize: number,
): FixtureZone | undefined {
  return zones.find((zone) => {
    const left = zone.xStart * tileSize
    const top = zone.yStart * tileSize
    const right = zone.xEnd * tileSize
    const bottom = zone.yEnd * tileSize

    return (
      position.x >= left &&
      position.x < right &&
      position.y >= top &&
      position.y < bottom
    )
  })
}

function activeMeetingZone(): FixtureZone | undefined {
  return state.joined && state.activeZone && isMeetingZone(state.activeZone)
    ? state.activeZone
    : undefined
}

function meetingHintLabel(zone: FixtureZone | undefined): string {
  if (!state.joined) {
    return "Enter the office, then walk into a marked meeting area."
  }
  if (state.mediaRequestPending) {
    return "Asking the server for access to this zone call."
  }
  if (state.meetingJoined) {
    return "Call connected. Leaving the zone clears the local call state."
  }
  if (zone) {
    return "Call available here. Prepare mic/camera, then join when ready."
  }
  return "Walk into a highlighted meeting area to unlock call controls."
}

function mediaAvailabilityLabel(zone: FixtureZone | undefined): string {
  if (state.mediaRequestPending) {
    return "Checking server permission for this meeting zone."
  }
  if (state.mediaSession) {
    return "Server access granted. Device controls affect this call session."
  }
  if (state.mediaUnavailableMessage) {
    return state.mediaUnavailableMessage
  }
  if (zone) {
    return `Available because you are in ${zoneDisplayName(zone)}.`
  }
  return "Walk into a meeting zone to prepare mic and camera."
}

function canUseDeviceControls(): boolean {
  if (state.mediaRequestPending) return false
  if (state.mediaSession) return state.mediaSession.canPublish
  if (state.mediaUnavailableMessage) return false
  return Boolean(activeMeetingZone())
}

function renderMeetingControls(): void {
  const zone = state.activeZone
  const availableZone = activeMeetingZone()
  const canJoinMeeting =
    Boolean(availableZone) &&
    !state.mediaRequestPending &&
    (availableZone
      ? worldActionPermitted("join_meeting", availableZone.id)
      : false)

  elements.meetingPanel.dataset.state = state.mediaRequestPending
    ? "pending"
    : state.meetingJoined
      ? "joined"
      : availableZone
        ? "available"
        : "outside"
  elements.meetingStatus.textContent = state.mediaRequestPending
    ? "Requesting call access"
    : state.meetingJoined
      ? `In ${meetingZoneLabel(state.meetingZoneId, zone)} call`
      : availableZone
        ? `Inside ${zoneDisplayName(availableZone)}`
        : "Outside meeting zone"
  elements.meetingHint.textContent = meetingHintLabel(availableZone)
  elements.joinMeeting.disabled = !canJoinMeeting || state.meetingJoined
  elements.joinMeeting.textContent = state.meetingJoined
    ? "In call"
    : state.mediaRequestPending
      ? "Joining..."
      : "Join call"
  elements.leaveMeeting.disabled = !state.meetingJoined
  elements.leaveMeeting.textContent = "Leave call"
}

function toggleMic(): void {
  if (!canUseDeviceControls()) {
    publishToast("Walk into a meeting zone before changing mic state", "warning")
    return
  }

  state.micEnabled = !state.micEnabled
  renderMediaPanel()
  publishToast(state.micEnabled ? "Mic ready" : "Mic muted", "info")
}

function toggleCamera(): void {
  if (!canUseDeviceControls()) {
    publishToast("Walk into a meeting zone before changing camera state", "warning")
    return
  }

  state.cameraEnabled = !state.cameraEnabled
  renderMediaPanel()
  publishToast(state.cameraEnabled ? "Camera ready" : "Camera off", "info")
}

function clearMediaSession(): void {
  state.mediaSession = undefined
  state.micEnabled = false
  state.cameraEnabled = false
  state.lastMediaRoom = undefined
  clearMediaUnavailable()
}

function clearMediaUnavailable(): void {
  state.mediaUnavailableMessage = undefined
  state.mediaUnavailableDetail = undefined
}

function setMediaUnavailable(message: string, detail?: string): void {
  state.mediaUnavailableMessage = message
  state.mediaUnavailableDetail = detail
  setConnectionStatus("media", "blocked", "Media unavailable")
  publishToast(message, "warning")
  renderMediaPanel()
}

function renderMediaPanel(): void {
  const session = state.mediaSession
  const availableZone = activeMeetingZone()
  const devicesAvailable = canUseDeviceControls()
  const tokenState = state.mediaRequestPending
    ? "Requesting access"
    : session
      ? "Access granted"
      : state.mediaUnavailableMessage
        ? "Unavailable"
      : availableZone
        ? `Available because you are in ${zoneDisplayName(availableZone)}`
        : "Enter a meeting zone"
  const panelState = state.mediaRequestPending
    ? "pending"
    : session
      ? "ready"
      : state.mediaUnavailableMessage
        ? "blocked"
      : availableZone
        ? "available"
        : "idle"

  elements.mediaPanel.dataset.state = panelState
  elements.mediaPanelStatus.textContent = state.mediaRequestPending
    ? "Requesting access"
    : session
      ? "Connected"
      : state.mediaUnavailableMessage
        ? "Unavailable"
      : availableZone
        ? "Available in zone"
        : "Inactive"
  elements.mediaAvailability.textContent = mediaAvailabilityLabel(availableZone)
  elements.mediaRoom.textContent =
    session?.room ??
    (availableZone
      ? zoneDisplayName(availableZone)
      : state.mediaUnavailableMessage
        ? "Unavailable"
        : "Not joined")
  elements.mediaEndpoint.textContent =
    session?.liveKitUrl ??
    (state.mediaUnavailableMessage
      ? "Try again from this zone"
      : availableZone
        ? "Ready after Join"
        : "Not joined")
  elements.mediaParticipants.textContent = session
    ? String(session.participantPlayerIds.length)
    : availableZone
      ? "Join to see"
      : "0"
  elements.mediaTokenStatus.textContent = session?.expiresAt
    ? `${tokenState}, ${formatMediaExpiry(session.expiresAt)}`
    : tokenState

  elements.toggleMic.disabled = !devicesAvailable
  elements.toggleMic.textContent = state.micEnabled
    ? session
      ? "Mic on"
      : "Mic ready"
    : "Mic muted"
  elements.toggleMic.setAttribute("aria-pressed", String(state.micEnabled))
  elements.toggleCamera.disabled = !devicesAvailable
  elements.toggleCamera.textContent = state.cameraEnabled
    ? session
      ? "Camera on"
      : "Camera ready"
    : "Camera off"
  elements.toggleCamera.setAttribute("aria-pressed", String(state.cameraEnabled))

  elements.localPreview.dataset.camera = state.cameraEnabled ? "on" : "off"
  elements.localPreview.dataset.avatarId = state.profile.avatarId
  elements.previewAvatar.textContent = initialsForName(displayNameForLocalProfile())
  elements.previewStatus.textContent = session
    ? state.cameraEnabled
      ? "Camera on"
      : state.micEnabled
        ? "Mic on"
        : "Muted"
    : state.mediaRequestPending
      ? "Requesting access"
      : state.mediaUnavailableMessage
        ? "Call unavailable"
      : availableZone
        ? state.cameraEnabled
          ? "Camera ready"
          : state.micEnabled
            ? "Mic ready"
            : "Devices ready"
        : "Enter zone"
}

function recoverFromWorldLoss(reason: string): void {
  const alreadyRecovering = state.lifecycle.phase === "recovering"

  stopHeldMovement()
  state.seq = 1
  state.movementPrediction = initialMovementPredictionState()
  state.joined = false
  state.companion.joined = false
  state.companion.direction = "down"
  state.snapshotPlayerIds = []
  state.activeZone = undefined
  state.worldInteractionInfo = emptyWorldInteractionInfo()
  state.worldInteractionSignature = undefined
  state.meetingJoined = false
  state.meetingZoneId = undefined
  state.mediaRequestPending = false
  state.lastMovementRejection = undefined
  worldSync.disconnect()
  clearMediaSession()
  chatMessages.length = 0
  renderChatMessages()
  state.players.clear()

  if (state.fixtureMap) {
    state.position = fixtureSpawnPosition(state.fixtureMap, "default")
    state.companion.position = fixtureSpawnPosition(state.fixtureMap, "guest")
  }

  state.direction = "down"
  resetClientMotion(state.position, state.direction)
  seedLocalRenderedPlayer()
  renderPlayers()
  renderZonePresentation()
  syncWorldInteractionLayer()
  setConnectionStatus(
    "session",
    state.sessionId ? "ready" : "idle",
    state.sessionId ? "Connected" : "Disconnected",
  )
  setConnectionStatus("world", "blocked", "Rejoin required")
  setConnectionStatus("media", "idle", "Media off")
  setLifecycleStatus(
    "recovering",
    "World restarted, rejoin needed",
    "Rejoin needed",
    `World session recovery requested: ${reason}`,
    reason,
  )
  elements.start.textContent = "Rejoin office"
  elements.start.disabled = false
  elements.reset.disabled = true
  renderMeetingControls()
  renderMediaPanel()

  if (!alreadyRecovering) {
    publishToast("World server restarted. Rejoin to continue.", "warning")
  }
}

function roomReadyLabel(label = state.mapGeneration.label): string {
  return `${label} ready, room empty`
}

function roomOccupancyLabel(totalPlayers = state.players.size): string {
  if (totalPlayers <= 0) return "Room empty"
  if (totalPlayers === 1) return "Only you in room"
  return `${totalPlayers} users in room`
}

function isMeetingZone(zone: FixtureZone): boolean {
  return zone.zoneType.includes("meeting")
}

function hasZoneActionAffordance(zone: FixtureZone): boolean {
  const raw = `${zone.zoneType} ${zone.id}`.toLowerCase()

  return (
    isMeetingZone(zone) ||
    raw.includes("private") ||
    raw.includes("portal") ||
    raw.includes("door")
  )
}

function meetingZoneLabel(zoneId: string | undefined, currentZone: FixtureZone | undefined): string {
  if (currentZone && currentZone.id === zoneId) return zoneDisplayName(currentZone)
  return zoneId ? titleCaseName(zoneId) : "meeting"
}

function zoneDisplayName(zone: FixtureZone): string {
  return titleCaseName(zone.id)
}

function formatMediaExpiry(expiresAt: string): string {
  const expires = new Date(expiresAt)

  if (Number.isNaN(expires.getTime())) return "expires soon"

  return `expires ${expires.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

function setConnectionStatus(
  target: "session" | "world" | "media",
  stateValue: StatusState,
  label: string,
): void {
  const status =
    target === "session"
      ? elements.sessionStatus
      : target === "world"
        ? elements.worldStatus
        : elements.mediaStatus
  const pill =
    target === "session"
      ? elements.sessionPill
      : target === "world"
        ? elements.worldPill
        : elements.mediaPill

  status.textContent = label
  pill.dataset.state = stateValue
}

function addChatMessage(body: string, recipientCount: number): void {
  renderer.playWorldAudioCue("chat_notification")
  chatMessages.unshift({
    id: `chat-${Date.now()}-${chatMessages.length}`,
    body,
    recipientCount,
  })
  chatMessages.splice(MAX_CHAT_MESSAGES)
  renderChatMessages()
  recordEvent(`Chat delivered to ${recipientCount} recipient(s)`)
}

function renderChatMessages(): void {
  elements.chatMessages.replaceChildren(
    ...chatMessages.map((message) => {
      const item = document.createElement("li")
      const body = document.createElement("span")
      const meta = document.createElement("small")

      body.textContent = message.body
      meta.textContent = `${message.recipientCount} recipient${
        message.recipientCount === 1 ? "" : "s"
      }`
      item.append(body, meta)
      return item
    }),
  )
  elements.chatStatus.textContent =
    chatMessages.length === 0
      ? "No messages yet"
      : `${chatMessages.length} recent message${chatMessages.length === 1 ? "" : "s"}`
}

function publishToast(message: string, tone: ToastTone = "info"): void {
  recordEvent(message)

  const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const toast = document.createElement("div")
  toast.className = `toast toast-${tone}`
  toast.dataset.toastId = id
  toast.textContent = message
  elements.toastRegion.prepend(toast)

  toasts.set(
    id,
    window.setTimeout(() => removeToast(id), TOAST_TTL_MS),
  )

  while (elements.toastRegion.childElementCount > MAX_TOASTS) {
    const last = elements.toastRegion.lastElementChild as HTMLElement | null
    if (!last?.dataset.toastId) break
    removeToast(last.dataset.toastId)
  }
}

function removeToast(id: string): void {
  const timer = toasts.get(id)
  if (timer !== undefined) {
    window.clearTimeout(timer)
    toasts.delete(id)
  }
  elements.toastRegion
    .querySelector<HTMLElement>(`[data-toast-id="${id}"]`)
    ?.remove()
}

function recordEvent(message: string): void {
  recentEvents.unshift(message)
  recentEvents.splice(MAX_RECENT_EVENTS)
}

function logMovementDebug(label: string, detail: string): void {
  movementDebugRecords.unshift({
    atMs: Date.now(),
    label,
    detail,
  })
  movementDebugRecords.splice(80)
  renderMovementDebugLog()
}

function renderMovementDebugLog(): void {
  elements.movementDebugLog.replaceChildren(
    ...movementDebugRecords.map((record) => {
      const item = document.createElement("li")
      item.textContent = movementDebugLine(record)
      return item
    }),
  )
}

async function copyMovementDebugLog(): Promise<void> {
  const text = movementDebugRecords.map(movementDebugLine).join("\n")

  try {
    await navigator.clipboard.writeText(text)
    elements.movementDebugCopy.textContent = "Copied"
  } catch {
    elements.movementDebugCopy.textContent = "Select"
    elements.movementDebugLog.focus()
  } finally {
    window.setTimeout(() => {
      elements.movementDebugCopy.textContent = "Copy"
    }, 1200)
  }
}

function movementDebugLine(record: MovementDebugRecord): string {
  return `${new Date(record.atMs).toLocaleTimeString()} ${record.label}: ${record.detail}`
}

function formatMovementVector(vector: Vector2 | MovementVector): string {
  return `${formatMovementNumber(vector.x)},${formatMovementNumber(vector.y)}`
}

function formatServerMovementTelemetry(
  message: {
    readonly requestedVector?: MovementVector
    readonly appliedVector?: MovementVector
    readonly collisionSlide?: boolean
    readonly collisionSlideAxis?: "x" | "y" | "corner"
    readonly collisionSlideDistancePx?: number
    readonly movementMode?: MovementMode
    readonly speedPxPerSecond?: number
  },
): string {
  const requested = message.requestedVector
    ? formatMovementVector(message.requestedVector)
    : "legacy/missing"
  const applied = message.appliedVector
    ? formatMovementVector(message.appliedVector)
    : "legacy/missing"
  const slide = message.collisionSlide ?? "legacy/missing"
  const slideAxis = message.collisionSlideAxis ?? "-"
  const slideDistance =
    message.collisionSlideDistancePx !== undefined
      ? formatMovementNumber(message.collisionSlideDistancePx)
      : "-"
  const mode = message.movementMode ?? "legacy/missing"
  const speed = message.speedPxPerSecond ?? "legacy/missing"

  return `serverMode=${mode} serverSpeed=${speed} serverRequested=${requested} serverApplied=${applied} serverSlide=${slide} serverSlideAxis=${slideAxis} serverSlideDistance=${slideDistance}`
}

function observeServerMovementProtocol(message: {
  readonly seqAck?: number
  readonly requestedVector?: MovementVector
  readonly appliedVector?: MovementVector
  readonly collisionSlide?: boolean
}): void {
  if (hasServerMovementTelemetry(message)) {
    if (state.serverProtocolMismatch) {
      state.serverProtocolMismatch = undefined
      setConnectionStatus("world", "ready", "In room")
      logMovementDebug("protocol", "server movement telemetry restored")
    }
    return
  }

  const firstMismatch = !state.serverProtocolMismatch
  state.serverProtocolMismatch = {
    kind: "movement_vector_telemetry_missing",
    detectedAtMs: Date.now(),
    lastSeqAck: message.seqAck,
  }
  setConnectionStatus("world", "blocked", "Update server")

  if (!firstMismatch) return

  logMovementDebug(
    "protocol",
    "server vector telemetry missing; stop and restart npm run office:dev:http",
  )
  publishToast("World server is outdated. Restart npm run office:dev:http.", "warning")
}

function hasServerMovementTelemetry(message: {
  readonly requestedVector?: MovementVector
  readonly appliedVector?: MovementVector
  readonly collisionSlide?: boolean
}): boolean {
  return (
    message.requestedVector !== undefined &&
    message.appliedVector !== undefined &&
    typeof message.collisionSlide === "boolean"
  )
}

function formatMovementNumber(value: number): string {
  return Number(value.toFixed(3)).toString()
}

function titleCaseName(value: string): string {
  return value
    .replace(/^wikimedia-/, "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ")
}

function displayNameForLocalProfile(): string {
  const trimmed = state.profile.displayName.trim().replace(/\s+/g, " ")
  return trimmed ? trimmed.slice(0, 24) : DEFAULT_DISPLAY_NAME
}

function initialsForName(value: string): string {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const initials =
    parts.length >= 2
      ? `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`
      : value.slice(0, 2)

  return initials.toUpperCase() || "BA"
}

function isAvatarId(value: string | undefined): value is AvatarId {
  return avatarIds.includes(value as AvatarId)
}

function avatarLabel(avatarId: AvatarId): string {
  switch (avatarId) {
    case "ember":
      return "Ember"
    case "cobalt":
      return "Cobalt"
    case "moss":
      return "Moss"
    case "violet":
      return "Violet"
  }
}

function avatarInitial(avatarId: AvatarId): string {
  return avatarLabel(avatarId)[0] ?? "A"
}

function avatarActionLabel(action: AvatarAnimationAction): string {
  switch (action) {
    case "idle":
      return "idle"
    case "walk":
      return "walk"
    case "run":
      return "run"
    case "turn":
      return "turn"
  }
}

function avatarFacingLabel(visualFacing: AvatarVisualFacing): string {
  switch (visualFacing) {
    case "up":
      return "U"
    case "upRight":
      return "UR"
    case "right":
      return "R"
    case "downRight":
      return "DR"
    case "down":
      return "D"
    case "downLeft":
      return "DL"
    case "left":
      return "L"
    case "upLeft":
      return "UL"
  }
}

function serverDirectionForVisualFacing(
  visualFacing: AvatarVisualFacing,
): Direction {
  if (visualFacing === "up" || visualFacing === "upLeft") return "up"
  if (visualFacing === "right" || visualFacing === "upRight") return "right"
  if (visualFacing === "left" || visualFacing === "downLeft") return "left"
  return "down"
}

function fixtureSpawnPosition(fixtureMap: FixtureMap, spawnId: string): Vector2 {
  const spawn = fixtureMap.spawnPoints.find((candidate) => candidate.id === spawnId)
  return spawn ? spawn.position : state.position
}

class HttpJsonError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
    readonly path: string,
  ) {
    super(reason)
    this.name = "HttpJsonError"
  }
}

async function postJson<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const parsed = await parseJsonResponse(response)

  if (!response.ok) {
    throw new HttpJsonError(
      response.status,
      parsed.reason ?? `HTTP ${response.status}`,
      path,
    )
  }

  return parsed as T
}

async function parseJsonResponse(response: Response): Promise<{ reason?: string }> {
  try {
    return (await response.json()) as { reason?: string }
  } catch {
    return {}
  }
}

function isRecoverableWorldError(error: unknown): boolean {
  return (
    error instanceof HttpJsonError &&
    (error.reason === "unknown_client" ||
      error.reason === "unknown_player" ||
      error.reason.includes("not admitted"))
  )
}

function isRecoverableProtocolError(
  message: Extract<ServerMessage, { type: "protocol_error" }>,
): boolean {
  return message.message.includes("not admitted")
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error"
}

function technicalErrorDetail(error: unknown): string {
  if (error instanceof HttpJsonError) {
    return `${error.path} returned ${error.status}: ${error.reason}`
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }
  return "Unknown error"
}

function friendlyActionError(error: unknown): string {
  if (error instanceof HttpJsonError) {
    if (error.path.includes("world-geometry")) {
      return "The room could not be prepared. Try switching rooms again."
    }
    if (error.path.includes("world")) {
      return "The room action could not be completed. Rejoin if it continues."
    }
    if (error.path.includes("media")) {
      return "Call media is unavailable. You can keep using the room."
    }
    if (error.status >= 500) {
      return "The local server could not complete that action."
    }
  }

  if (error instanceof TypeError) {
    return "The local server is unavailable. Check that the demo stack is running."
  }

  return "That office action could not be completed."
}

async function postMediaToken(body: Record<string, unknown>): Promise<MediaTokenResponse> {
  const response = await fetch("/media/media-token", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const parsed = (await response.json()) as { status?: string; reason?: string }

  if (parsed.status === "denied") {
    return {
      status: "denied",
      reason: parsed.reason,
    }
  }

  if (!response.ok) {
    throw new Error(parsed.reason ?? `HTTP ${response.status}`)
  }

  const issued = parsed as {
    readonly status?: string
    readonly liveKitUrl?: unknown
    readonly token?: unknown
    readonly room?: unknown
    readonly canPublish?: unknown
    readonly canSubscribe?: unknown
    readonly participantPlayerIds?: unknown
    readonly expiresAt?: unknown
  }

  if (issued.status === "issued" && typeof issued.room === "string") {
    return {
      status: "issued",
      liveKitUrl:
        typeof issued.liveKitUrl === "string" ? issued.liveKitUrl : "unknown",
      token: typeof issued.token === "string" ? issued.token : "",
      room: issued.room,
      canPublish: issued.canPublish === true,
      canSubscribe: issued.canSubscribe === true,
      participantPlayerIds: Array.isArray(issued.participantPlayerIds)
        ? issued.participantPlayerIds.filter(
            (playerId): playerId is string => typeof playerId === "string",
          )
        : [],
      expiresAt:
        typeof issued.expiresAt === "string"
          ? issued.expiresAt
          : new Date(Date.now()).toISOString(),
    }
  }

  throw new Error("Invalid media token response")
}

function queueAction(action: () => Promise<void>): Promise<void> {
  state.pendingAction = state.pendingAction
    .then(action)
    .catch((error: unknown) => {
      recordEvent(`Action failed: ${technicalErrorDetail(error)}`)
      publishToast(friendlyActionError(error), "error")
    })
  return state.pendingAction
}

function initialDevToolsState(): DevToolsAppState {
  const gated = devToolsGateEnabled()
  const params = currentSearchParams()
  const overlays = DEV_TOOL_OVERLAY_IDS.reduce(
    (result, overlayId) => ({
      ...result,
      [overlayId]: gated && params.get(devToolQueryParam(overlayId)) === "1",
    }),
    {} as RendererDevToolOverlayState,
  )

  return {
    gated,
    enabled: gated && params.get("devtools") !== "0",
    activeFixtureId: "lobby",
    lastAction: gated ? "Developer tools enabled" : undefined,
    overlays,
  }
}

function syncRendererDevTools(): void {
  renderer.setDevToolsState({
    gated: state.devTools.gated,
    enabled: state.devTools.enabled,
    overlays: state.devTools.overlays,
    fixtureSelector: {
      enabled: state.devTools.gated,
      activeFixtureId: state.devTools.activeFixtureId,
      availableFixtureIds: DEV_TOOL_FIXTURES,
    },
  })
  renderRendererDevMenu()
}

function installRendererDevMenu(): void {
  elements.rendererDevMenu.hidden = !state.devTools.gated
  if (!state.devTools.gated) return

  elements.rendererDevOverlayControls.replaceChildren(
    ...DEV_TOOL_OVERLAY_IDS.map(createRendererDevOverlayToggle),
  )
  elements.rendererDevFixture.replaceChildren(
    ...DEV_TOOL_FIXTURES.map(createRendererDevFixtureOption),
  )
  elements.rendererDevOverlayControls.addEventListener("change", (event) => {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) return

    const overlayId = devToolOverlayFromString(input.dataset.devOverlayId)
    if (!overlayId) return

    setDevToolOverlay(overlayId, input.checked)
  })
  elements.rendererDevFixture.addEventListener("change", () => {
    const fixtureId = devToolFixtureFromParam(elements.rendererDevFixture.value)
    if (!fixtureId) return

    queueAction(() => selectDevFixture(fixtureId))
  })
  renderRendererDevMenu()
}

function createRendererDevOverlayToggle(
  overlayId: RendererDevToolOverlayId,
): HTMLElement {
  const label = document.createElement("label")
  label.className = "renderer-dev-overlay-toggle"

  const input = document.createElement("input")
  input.type = "checkbox"
  input.dataset.devOverlayId = overlayId
  input.dataset.devOverlayControl = overlayId

  const text = document.createElement("span")
  text.textContent = DEV_TOOL_OVERLAY_LABELS[overlayId]

  label.append(input, text)
  return label
}

function createRendererDevFixtureOption(fixtureId: DevToolFixtureId): HTMLOptionElement {
  const option = document.createElement("option")
  option.value = fixtureId
  option.textContent = devToolFixtureLabel(fixtureId)
  return option
}

function renderRendererDevMenu(): void {
  elements.rendererDevMenu.hidden = !state.devTools.gated
  if (!state.devTools.gated) return

  elements.rendererDevMenuStatus.textContent = state.devTools.enabled
    ? "Overlays on"
    : "Overlays paused"
  DEV_TOOL_OVERLAY_IDS.forEach((overlayId) => {
    const input = elements.rendererDevOverlayControls.querySelector<HTMLInputElement>(
      `[data-dev-overlay-control="${overlayId}"]`,
    )
    if (input) {
      input.checked = state.devTools.overlays[overlayId]
    }
  })
  elements.rendererDevFixture.value = state.devTools.activeFixtureId ?? "lobby"
}

function installDevToolsKeyboardShortcuts(): void {
  document.addEventListener(
    "keydown",
    (event) => {
      if (!state.devTools.gated || !event.altKey || !event.shiftKey) return

      const key = event.key.toLowerCase()
      let handled = true

      switch (key) {
        case "t":
          state.devTools.enabled = !state.devTools.enabled
          state.devTools.lastAction = state.devTools.enabled
            ? "Enabled renderer developer tools"
            : "Disabled renderer developer tools"
          syncRendererDevTools()
          break
        case "g":
          toggleDevToolOverlay("grid")
          break
        case "c":
          toggleDevToolOverlay("collision")
          break
        case "z":
          toggleDevToolOverlay("zones")
          break
        case "d":
          toggleDevToolOverlay("depth")
          break
        case "o":
          toggleDevToolOverlay("objectFootprints")
          break
        case "b":
          toggleDevToolOverlay("spriteBounds")
          break
        case "r":
          toggleDevToolOverlay("camera")
          break
        case "f":
          queueAction(() => selectRelativeDevFixture(1))
          break
        case "v":
          queueAction(() => selectRelativeDevFixture(-1))
          break
        default:
          handled = false
      }

      if (!handled) return
      event.preventDefault()
      event.stopImmediatePropagation()
    },
    { capture: true },
  )
}

function toggleDevToolOverlay(overlayId: RendererDevToolOverlayId): void {
  setDevToolOverlay(overlayId, !state.devTools.overlays[overlayId])
}

function setDevToolOverlay(
  overlayId: RendererDevToolOverlayId,
  enabled: boolean,
): void {
  state.devTools.enabled = true
  state.devTools.overlays = {
    ...state.devTools.overlays,
    [overlayId]: enabled,
  }
  state.devTools.lastAction = `${enabled ? "Enabled" : "Disabled"} ${overlayId} overlay`
  syncRendererDevTools()
}

async function applyInitialDevFixture(): Promise<void> {
  syncRendererDevTools()
  if (!state.devTools.gated) return

  const fixtureId = devToolFixtureFromParam(currentSearchParams().get("devFixture"))
  if (!fixtureId || fixtureId === "lobby") return
  await selectDevFixture(fixtureId)
}

async function selectRelativeDevFixture(offset: number): Promise<void> {
  const activeFixtureId = state.devTools.activeFixtureId ?? "lobby"
  const activeIndex = DEV_TOOL_FIXTURES.indexOf(activeFixtureId)
  const nextIndex =
    (Math.max(0, activeIndex) + offset + DEV_TOOL_FIXTURES.length) %
    DEV_TOOL_FIXTURES.length

  await selectDevFixture(DEV_TOOL_FIXTURES[nextIndex])
}

async function selectDevFixture(fixtureId: DevToolFixtureId): Promise<void> {
  if (!state.devTools.gated) return

  state.devTools.enabled = true
  state.devTools.activeFixtureId = fixtureId
  state.devTools.lastAction = `Selected fixture ${fixtureId}`
  syncRendererDevTools()

  switch (fixtureId) {
    case "lobby":
    case "meeting_room":
    case "lounge_cafe":
      await switchToPresetMap(fixtureId, { announce: false })
      break
    case "generated":
      await switchToGeneratedDevFixture()
      break
    case "depth_table_player_behind":
      await renderDepthFixtureCaseForSmoke("table_player_behind")
      break
    case "depth_table_player_front":
      await renderDepthFixtureCaseForSmoke("table_player_front")
      break
    case "depth_wall_player_behind":
      await renderDepthFixtureCaseForSmoke("wall_player_behind")
      break
    case "avatar_fixture":
      await renderAvatarFixtureCaseForSmoke()
      break
    case "avatar_preview_gallery":
      await renderAvatarPreviewGalleryForSmoke()
      break
    case "zone_fixture":
      await renderZoneFixtureCaseForSmoke()
      break
    case "stress_20x15":
      await renderLargeStaticMapForSmoke({ width: 20, height: 15 })
      break
    case "stress_50x40":
      await renderLargeStaticMapForSmoke({ width: 50, height: 40 })
      break
    case "stress_100x80":
      await renderLargeStaticMapForSmoke({ width: 100, height: 80 })
      break
  }

  state.devTools.activeFixtureId = fixtureId
  syncRendererDevTools()
  await renderer.advanceTime()
}

async function switchToGeneratedDevFixture(): Promise<void> {
  if (!state.generatedRoom) {
    const generated = compileDeterministicPromptMap(DEFAULT_MAP_PROMPT)
    const fixtureMap = fixtureMapFromCompiledMap(generated)
    const preview = generatedPreviewForFixtureMap(fixtureMap, "preflight")
    const mapGeneration = {
      source: "generated" as const,
      mapId: "generated" as const,
      label: "Generated room",
      prompt: DEFAULT_MAP_PROMPT,
      keywords: generated.keywords,
      validation: generated.validation,
      preview,
    }
    state.generatedPreview = preview
    state.generatedRoom = {
      fixtureMap,
      mapGeneration,
    }
  }

  await switchToFixtureMap(
    state.generatedRoom.fixtureMap,
    state.generatedRoom.mapGeneration,
  )
}

function devToolsGateEnabled(): boolean {
  if (!localAutomationHost()) return false

  const params = currentSearchParams()
  return (
    params.get("devtools") === "1" ||
    window.localStorage.getItem("aedventure.devtools") === "1"
  )
}

function currentSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search)
}

function devToolQueryParam(overlayId: RendererDevToolOverlayId): string {
  switch (overlayId) {
    case "grid":
      return "devGrid"
    case "collision":
      return "devCollision"
    case "zones":
      return "devZones"
    case "depth":
      return "devDepth"
    case "objectFootprints":
      return "devObjectFootprints"
    case "spriteBounds":
      return "devSpriteBounds"
    case "camera":
      return "devCamera"
  }
}

function devToolFixtureFromParam(value: string | null): DevToolFixtureId | undefined {
  if (!value) return undefined
  return DEV_TOOL_FIXTURES.includes(value as DevToolFixtureId)
    ? (value as DevToolFixtureId)
    : undefined
}

function devToolOverlayFromString(
  value: string | undefined,
): RendererDevToolOverlayId | undefined {
  if (!value) return undefined
  return DEV_TOOL_OVERLAY_IDS.includes(value as RendererDevToolOverlayId)
    ? (value as RendererDevToolOverlayId)
    : undefined
}

function devToolFixtureLabel(fixtureId: DevToolFixtureId): string {
  switch (fixtureId) {
    case "lobby":
      return "Lobby"
    case "meeting_room":
      return "Meeting room"
    case "lounge_cafe":
      return "Lounge/cafe"
    case "generated":
      return "Generated room"
    case "depth_table_player_behind":
      return "Depth: table behind"
    case "depth_table_player_front":
      return "Depth: table front"
    case "depth_wall_player_behind":
      return "Depth: wall behind"
    case "avatar_fixture":
      return "Avatar fixture"
    case "avatar_preview_gallery":
      return "Avatar preview"
    case "zone_fixture":
      return "Zone fixture"
    case "stress_20x15":
      return "Stress 20x15"
    case "stress_50x40":
      return "Stress 50x40"
    case "stress_100x80":
      return "Stress 100x80"
  }
}

function movementPredictionTextState() {
  const prediction = state.movementPrediction
  const playerSize = movementCollisionBodySize(state.movementFeel)

  return {
    mode: "client_prediction_server_reconciliation",
    reconciliationModel: "rewind_replay_blend",
    historyModel: "sequence_numbered_input_history",
    authoritativeSource: "player_state_or_world_snapshot_ack",
    visualCorrectionModel: "blend_remaining_error_after_replay",
    maxStepMs: CLIENT_PREDICTION_MAX_STEP_MS,
    historyLimit: CLIENT_INPUT_HISTORY_LIMIT,
    collisionBody: {
      radiusPx: state.movementFeel.collisionBodyRadiusPx,
      width: Number(playerSize.width.toFixed(2)),
      height: Number(playerSize.height.toFixed(2)),
      slideMaxNudgePx: state.movementFeel.collisionSlideMaxNudgePx,
    },
    active: Boolean(prediction.active),
    seq: prediction.active?.seq,
    pendingCount: prediction.pending.length,
    pendingSeqs: prediction.pending.map((pending) => pending.seq),
    historySeqs: prediction.pending.map((pending) => pending.seq),
    pendingWindowSize: prediction.pending.length,
    direction: prediction.active?.direction,
    movementMode: prediction.active?.movementMode,
    lastSeq: prediction.last?.seq,
    lastAckSeq: prediction.lastAckSeq,
    lastDirection: prediction.last?.direction,
    lastMovementMode: prediction.last?.movementMode,
    requestedVector: prediction.active
      ? roundedVector(prediction.active.requestedVector)
      : undefined,
    lastRequestedVector: prediction.last
      ? roundedVector(prediction.last.requestedVector)
      : undefined,
    appliedVector: prediction.active
      ? roundedVector(prediction.active.appliedVector)
      : undefined,
    lastAppliedVector: prediction.last
      ? roundedVector(prediction.last.appliedVector)
      : undefined,
    collisionSlide: prediction.active?.collisionSlide ?? false,
    collisionSlideAxis: prediction.active?.collisionSlideAxis,
    collisionSlideDistancePx: prediction.active?.collisionSlideDistancePx,
    lastCollisionSlide: prediction.last?.collisionSlide ?? false,
    lastCollisionSlideAxis: prediction.last?.collisionSlideAxis,
    lastCollisionSlideDistancePx: prediction.last?.collisionSlideDistancePx,
    blockedLocally: prediction.active?.blockedLocally ?? false,
    lastBlockedLocally: prediction.last?.blockedLocally ?? false,
    from: prediction.active
      ? roundedVector(prediction.active.from)
      : undefined,
    attempted: prediction.active
      ? roundedVector(prediction.active.attempted)
      : undefined,
    target: prediction.active
      ? roundedVector(prediction.active.target)
      : undefined,
    deltaMs: prediction.active
      ? Math.round(prediction.active.deltaMs)
      : undefined,
    distance: prediction.active
      ? Number(prediction.active.distance.toFixed(2))
      : undefined,
    speedPxPerSecond: prediction.active?.speedPxPerSecond,
    lastSpeedPxPerSecond: prediction.last?.speedPxPerSecond,
    lastOutcome: prediction.lastOutcome,
    totalPredicted: prediction.totalPredicted,
    totalConfirmed: prediction.totalConfirmed,
    totalCorrected: prediction.totalCorrected,
    totalClientBlocked: prediction.totalClientBlocked,
    totalServerRejected: prediction.totalServerRejected,
    totalReplayed: prediction.totalReplayed,
    lastReplayCount: prediction.lastReplayCount,
    lastCorrectionPx: prediction.lastCorrectionPx,
    lastReplayCorrectionPx: prediction.lastReplayCorrectionPx,
    lastReplayTarget: prediction.lastReplayTarget
      ? roundedVector(prediction.lastReplayTarget)
      : undefined,
  }
}

function clientMotionTextState() {
  const motion = clientMotion.snapshot()

  return {
    mode: "continuous_local_motion",
    active: motion.active,
    inputActive: motion.inputActive,
    correcting: motion.correcting,
    x: Number(motion.position.x.toFixed(3)),
    y: Number(motion.position.y.toFixed(3)),
    velocity: roundedVector(motion.velocity),
    speedPxPerSecond: motion.speedPxPerSecond,
    targetSpeedPxPerSecond: motion.targetSpeedPxPerSecond,
    direction: motion.direction,
    movementMode: motion.movementMode,
    lastFrameDeltaMs: motion.lastFrameDeltaMs,
    correctionPx: motion.correctionPx,
    feel: movementFeelTextState(),
  }
}

function movementFeelTextState() {
  const activePresetId = movementFeelPresetIdForTuning(state.movementFeel)

  return {
    source: "client_runtime_tuning",
    panelVisible: !elements.movementFeelPanel.hidden,
    activePresetId,
    activePresetLabel:
      activePresetId === "custom"
        ? "Custom"
        : movementFeelPresetForId(activePresetId).label,
    presets: MOVEMENT_FEEL_PRESETS.map((preset) => ({
      id: preset.id,
      label: preset.label,
      summary: preset.summary,
      active: preset.id === activePresetId,
      values: {
        ...preset.values,
      },
    })),
    controls: MOVEMENT_FEEL_CONTROLS.map((control) => ({
      key: control.key,
      label: control.label,
      value: state.movementFeel[control.key],
      min: control.min,
      max: control.max,
      step: control.step,
      unit: control.unit,
    })),
    values: {
      ...state.movementFeel,
    },
    defaults: {
      ...DEFAULT_MOVEMENT_FEEL,
    },
  }
}

function joystickTextState() {
  const joystick = inputController.snapshot().joystick

  return {
    available: true,
    primary: true,
    active: joystick.active,
    pointerId: joystick.pointerId,
    vector: roundedVector(joystick.vector),
    direction: joystick.direction,
    magnitude: joystick.magnitude,
    knob: roundedVector(joystick.knob),
    radiusPx: Number(joystick.radiusPx.toFixed(1)),
    deadzonePx: Number(joystick.deadzonePx.toFixed(1)),
    deadzoneRatio: JOYSTICK_DEADZONE_RATIO,
    minMagnitude: JOYSTICK_MIN_MAGNITUDE,
    dpadFallback: true,
  }
}

function roundedVector(position: Vector2): Vector2 {
  return {
    x: Number(position.x.toFixed(3)),
    y: Number(position.y.toFixed(3)),
  }
}

function rendererVisualPolishTextState(
  performance: RendererPerformanceInfo,
  worldInteractionInfo: RendererWorldInteractionInfo,
  effects: RendererEffectsInfo,
) {
  const reducedMotionMatches = prefersReducedMotion()
  const ambientParticleCount =
    effects.objectCounts.coffeeSteamEmitters +
    effects.objectCounts.plantMoteEmitters +
    effects.objectCounts.portalShimmerEmitters +
    effects.objectCounts.actionZoneActivationEmitters +
    effects.objectCounts.entryTransitionEmitters

  return {
    source: "renderer_visual_polish",
    markerEffectMode:
      worldInteractionInfo.presentation?.markerEffectMode ?? "none",
    markerStyle: worldInteractionInfo.presentation?.markerStyle ?? "none",
    objectShadowCount: performance.pooling.activeShadowCount,
    pooledObjectShadowCount: performance.pooling.pooledShadowCount,
    ambientMotionCount:
      performance.pooling.ambientMotionSpriteCount + ambientParticleCount,
    ambientMotionBreakdown: {
      objectSprites: performance.pooling.ambientMotionSpriteCount,
      particleEmitters: ambientParticleCount,
    },
    transitionState: roomTransitionState(),
    transitionOwner: "map_dataset_transition",
    reducedMotionBehavior: {
      policy: "prefers_reduced_motion_css_guard",
      query: "(prefers-reduced-motion: reduce)",
      matches: reducedMotionMatches,
      mapTransition: reducedMotionMatches ? "disabled_by_css" : "enabled",
      ambientMotion: "subtle_visual_only",
    },
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== "function") return false

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function roomTransitionState(): "idle" | "switching" | "entering" {
  const transition = elements.map.dataset.transition

  return transition === "switching" || transition === "entering"
    ? transition
    : "idle"
}

function renderDemoToText(): string {
  const overlay = stageOverlayContent()
  const realtime = worldSync.snapshot()
  const input = inputController.snapshot()
  const rendererCapability = renderer.getCapabilityInfo()
  const rendererPerformance = rendererCapability.performance
  const rendererViewport = renderer.getViewportState()
  const worldInteractions = renderer.getWorldInteractionInfo()
  const visualPolish = rendererVisualPolishTextState(
    rendererPerformance,
    worldInteractions,
    rendererCapability.effects,
  )

  return JSON.stringify({
    app: "customer-virtual-office",
    coordinateSystem: "pixel origin top-left, x right, y down",
    engineBoundary: {
      domain: "@aedventure/office-domain",
      renderer: "@aedventure/game-renderer-phaser",
      uses: [
        "@aedventure/game-core",
        "@aedventure/game-assets",
        "@aedventure/game-map",
        "@aedventure/game-input",
        "@aedventure/game-renderer-phaser",
      ],
      importsOfficeDomain: true,
    },
    joined: state.joined,
    sessionStatus: elements.sessionStatus.textContent,
    worldStatus: elements.worldStatus.textContent,
    mediaStatus: elements.mediaStatus.textContent,
    controls: {
      joinDisabled: elements.start.disabled,
      resetDisabled: elements.reset.disabled,
      joinLabel: elements.start.textContent,
    },
    world: {
      status: elements.worldStatus.textContent,
      joined: state.joined,
      playerCount: state.players.size,
      snapshotPlayerIds: state.snapshotPlayerIds,
    },
    lifecycle: {
      phase: state.lifecycle.phase,
      message: state.lifecycle.message,
      publicMessage: state.lifecycle.publicMessage,
      detail: state.lifecycle.detail,
      lastRecoveryReason: state.lifecycle.lastRecoveryReason,
      rendererReadiness: state.rendererReadiness,
      stageOverlay: {
        state: overlay.state,
        hidden: overlay.hidden,
        title: overlay.title,
        body: overlay.body,
      },
      roomEmpty: !state.joined && state.snapshotPlayerIds.length === 0,
      occupancy: state.joined ? state.players.size : 0,
    },
    player: {
      id: state.playerId,
      clientId: state.clientId,
      name: displayNameForLocalProfile(),
      avatarId: state.profile.avatarId,
      x: Math.round(state.position.x),
      y: Math.round(state.position.y),
      visualX: Math.round(clientMotion.renderedPosition(state.position).x),
      visualY: Math.round(clientMotion.renderedPosition(state.position).y),
      direction: state.direction,
      visualDirection: clientMotion.renderedDirection(state.direction),
    },
    companion: {
      id: state.companion.playerId,
      name: state.companion.displayName,
      avatarId: state.companion.avatarId,
      joined: state.companion.joined,
      x: Math.round(state.companion.position.x),
      y: Math.round(state.companion.position.y),
      direction: state.companion.direction,
    },
    players: [...state.players.values()].map((player) => ({
      id: player.playerId,
      name: player.name,
      avatarId: player.avatarId,
      x: Math.round(player.position.x),
      y: Math.round(player.position.y),
      direction: player.direction,
      movementMode: player.movementMode ?? "walk",
      local: player.local,
      emoteId: player.emoteId,
    })),
    snapshotPlayerIds: state.snapshotPlayerIds,
    movement: {
      heldDirection: activeHeldDirection(),
      heldVector: activeHeldMovementIntent()?.vector,
      pendingVector: input.pendingIntent?.vector,
      pendingDirection: input.pendingIntent?.direction,
      pendingMovementMode: input.pendingIntent?.movementMode,
      movementMode: activeMovementMode(),
      runToggled: input.runToggled,
      shiftRunning: input.shiftRunning,
      inFlight: input.inFlight,
      lastRejectedReason: state.lastMovementRejection?.reason,
      serverProtocolMismatch: state.serverProtocolMismatch,
      repeatMs: MOVE_REPEAT_MS,
      rejectionFeedbackMs: MOVEMENT_REJECTION_FEEDBACK_MS,
      realtime,
      simulation: {
        mode: realtime.status === "open"
          ? "websocket_fixed_tick_snapshot_stream"
          : "http_request_response_fallback",
        authority: "server_authoritative",
        serverTickModel: "fixed_tick",
        inputTransport: realtime.status === "open"
          ? "websocket_intent_stream"
          : "http_request_response",
        inputCoalescing:
          realtime.inputStats?.inputCoalescing ??
          "latest_intent_per_client_per_tick",
        clientReconciliation: "rewind_replay_blend",
        remoteInterpolation: "snapshot_buffer_delay",
        inputHz: Number((1000 / MOVE_REPEAT_MS).toFixed(1)),
        clientInputMs: MOVE_REPEAT_MS,
        serverTickMs: realtime.serverTickMs,
        serverHz: realtime.serverTickHz,
        snapshotCount: realtime.snapshotCount,
        lastSnapshotTick: realtime.lastSnapshotTick,
        lastSnapshotServerTime: realtime.lastSnapshotServerTime,
        lastSnapshotReceivedAtMs: realtime.lastSnapshotReceivedAtMs,
        latestSnapshotAgeMs: realtime.latestSnapshotAgeMs,
        snapshotCadenceMs: realtime.snapshotCadenceMs,
        snapshotCadenceTargetMs: realtime.snapshotCadenceTargetMs,
        snapshotJitterMs: realtime.snapshotJitterMs,
        droppedSnapshotCount: realtime.droppedSnapshotCount,
        bufferedSnapshotCount: realtime.bufferedSnapshotCount,
        bufferedSnapshotWindowMs: realtime.bufferedSnapshotWindowMs,
        latestSnapshotPlayerCount: realtime.latestSnapshotPlayerCount,
        inputStats: realtime.inputStats,
      },
      motion: clientMotionTextState(),
      feel: movementFeelTextState(),
      input: gameInputTelemetry(input, { repeatMs: MOVE_REPEAT_MS }),
      joystick: joystickTextState(),
      prediction: movementPredictionTextState(),
      debugLog: movementDebugRecords.map(movementDebugLine),
    },
    meeting: {
      activeZoneId: state.activeZone?.id,
      activeZoneType: state.activeZone?.zoneType,
      status: elements.meetingStatus.textContent,
      hint: elements.meetingHint.textContent,
      panelState: elements.meetingPanel.dataset.state,
      joined: state.meetingJoined,
      zoneId: state.meetingZoneId,
      joinDisabled: elements.joinMeeting.disabled,
      joinLabel: elements.joinMeeting.textContent,
      leaveDisabled: elements.leaveMeeting.disabled,
      leaveLabel: elements.leaveMeeting.textContent,
    },
    media: {
      panelStatus: elements.mediaPanelStatus.textContent,
      availability: elements.mediaAvailability.textContent,
      tokenIssued: Boolean(state.mediaSession),
      tokenStatus: elements.mediaTokenStatus.textContent,
      room: state.mediaSession?.room,
      liveKitUrl: state.mediaSession?.liveKitUrl,
      canPublish: state.mediaSession?.canPublish,
      canSubscribe: state.mediaSession?.canSubscribe,
      participantPlayerIds: state.mediaSession?.participantPlayerIds ?? [],
      unavailableMessage: state.mediaUnavailableMessage,
      unavailableDetail: state.mediaUnavailableDetail,
      mic: state.micEnabled ? "on" : "off",
      camera: state.cameraEnabled ? "on" : "off",
      micDisabled: elements.toggleMic.disabled,
      cameraDisabled: elements.toggleCamera.disabled,
      micLabel: elements.toggleMic.textContent,
      cameraLabel: elements.toggleCamera.textContent,
      previewStatus: elements.previewStatus.textContent,
    },
    layout: {
      mode: mobileLayoutQuery.matches ? "mobile" : "desktop",
      collapsibleSections: elements.mobileCollapsibleSections.map((section) => ({
        label: section.querySelector("summary")?.textContent?.trim() ?? "",
        open: section.open,
      })),
    },
    renderer: {
      ...rendererCapability,
      viewport: rendererViewport,
      visualPolish,
    },
    engine: engineArchitectureTextState(),
    devTools: {
      gated: state.devTools.gated,
      enabled: state.devTools.enabled,
      activeFixtureId: state.devTools.activeFixtureId,
      availableFixtureIds: DEV_TOOL_FIXTURES,
      lastAction: state.devTools.lastAction,
      overlays: state.devTools.overlays,
      feelPanel: {
        visible: !elements.movementFeelPanel.hidden,
        presetCount: elements.movementFeelPresets.querySelectorAll(
          "[data-feel-preset]",
        ).length,
        activePresetId: movementFeelPresetIdForTuning(state.movementFeel),
        controlCount: elements.movementFeelControls.querySelectorAll(
          "[data-feel-control]",
        ).length,
      },
      menu: {
        visible: !elements.rendererDevMenu.hidden,
        status: elements.rendererDevMenuStatus.textContent,
        overlayControlCount: elements.rendererDevOverlayControls.querySelectorAll(
          "[data-dev-overlay-control]",
        ).length,
        checkedOverlayIds: [
          ...elements.rendererDevOverlayControls.querySelectorAll<HTMLInputElement>(
            "[data-dev-overlay-control]:checked",
          ),
        ].map((input) => input.dataset.devOverlayId),
        fixtureSelectorVisible: !elements.rendererDevFixture.hidden,
        fixtureOptionCount: elements.rendererDevFixture.options.length,
        selectedFixtureId: elements.rendererDevFixture.value,
      },
      renderer: renderer.getDevToolsInfo(),
      primaryUiControlsExposed: document.querySelectorAll("[data-devtools-control]")
        .length,
    },
    effects: renderer.getEffectsInfo(),
    audio: renderer.getAudioInfo(),
    mapValidation: renderer.getMapValidationInfo(),
    performance: rendererPerformance,
    avatars: renderer.getAvatarInfo(),
    zones: renderer.getZoneInfo(),
    worldInteractions,
    camera: renderer.getCameraState(),
    viewport: rendererViewport,
    map: state.fixtureMap
      ? {
          renderer: "phaser",
          source: state.mapGeneration.source,
          activeMapId: state.mapGeneration.mapId,
          label: state.mapGeneration.label,
          availableMaps: [
            ...presetMapSummaries.map((preset) => ({
              id: preset.id,
              label: preset.label,
              disabled: false,
            })),
            {
              id: "generated",
              label: "Generated room",
              disabled: !state.generatedRoom,
            },
          ],
          generatedAvailable: Boolean(state.generatedRoom),
          generatedPreviewStatus: elements.mapGenerationStatus.textContent,
          generatedPreviewDetail: elements.generatedPreviewDetail.textContent,
          generatedPreview: state.mapGeneration.preview ?? state.generatedPreview,
          aiReadiness: {
            mdiSchema: "semantic_map_definition",
            rendererAgnostic: true,
            compilerOutputs: ["render_layers", "collision_layers", "zones"],
            previewMatchesRendered:
              state.mapGeneration.preview?.previewMatchesRendered ?? false,
          },
          validationSummary: elements.validationSummary.textContent,
          prompt: state.mapGeneration.prompt,
          keywords: state.mapGeneration.keywords,
          style: state.fixtureMap.definition.style,
          width: state.fixtureMap.compiled.width,
          height: state.fixtureMap.compiled.height,
          tileSize: state.fixtureMap.compiled.tileSize,
          blockedTileCount: state.fixtureMap.compiled.blockedTiles.length,
          zones: state.fixtureMap.compiled.zones.map((zone) => zone.id),
          validation: state.mapGeneration.validation
            ? {
                valid: state.mapGeneration.validation.valid,
                errors: state.mapGeneration.validation.errors,
                summary: state.mapGeneration.validation.summary,
                checks: state.mapGeneration.validation.checks,
                blockedTileCount: state.mapGeneration.validation.blockedTileCount,
                spawnCount: state.mapGeneration.validation.spawnCount,
                zoneCount: state.mapGeneration.validation.zoneCount,
                spawnIds: state.mapGeneration.validation.spawnIds,
                zoneIds: state.mapGeneration.validation.zoneIds,
              }
            : undefined,
        }
      : undefined,
    lastChatBody: state.lastChatBody,
    lastMediaRoom: state.lastMediaRoom,
    chat: {
      status: elements.chatStatus.textContent,
      messages: chatMessages.map((message) => ({
        body: message.body,
        recipientCount: message.recipientCount,
      })),
    },
    toasts: [...elements.toastRegion.querySelectorAll<HTMLElement>(".toast")].map(
      (toast) => toast.textContent,
    ),
    recentEvents: recentEvents.slice(0, 6),
  })
}

function engineArchitectureTextState() {
  return {
    source: "browser_engine_runtime",
    renderer: {
      host: "RendererHost",
      sceneManager: "RendererSceneManager",
      scene: "TileWorldScene",
      scenes: ["RendererLoadingScene", "TileWorldScene"],
      plannedScenes: [
        "LobbyScene",
        "AvatarPreviewScene",
        "GeneratedRoomPreviewScene",
        "MapEditorScene",
        "RoomTransitionScene",
      ],
      modules: [
        "TilemapRenderer",
        "ObjectRenderer",
        "AvatarRenderer",
        "ZoneRenderer",
        "InteractionRenderer",
        "AdvancedInputPlugin",
        "PhysicsAffordanceSystem",
        "DepthEffectsLayer",
        "TilemapFeatureSystem",
        "WorldAudioSystem",
        "CameraController",
        "DevToolsOverlay",
      ],
    },
    controllers: {
      input: "InputController",
      worldSync: "WorldSyncController",
      interactions: "WorldInteractionLayer",
    },
    boundaries: {
      phaserIsolatedBehindRendererHost: true,
      sceneLifecycleOwnedByRenderer: true,
      phaserInputOwnsRendererHitTesting: true,
      phaserPhysicsIsVisualOnly: true,
      phaserDepthEffectsAreVisualOnly: true,
      phaserTilemapFeaturesAreRendererOnly: true,
      phaserAudioIsWorldUiOnly: true,
      inputStateOwnedOutsideDomEvents: true,
      realtimeTransportOwnedByWorldSync: true,
      worldActionsRequireServerPermission: true,
    },
  }
}

function mustQuery<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector)
  if (!element) throw new Error(`Missing required element ${selector}`)
  return element
}

declare global {
  interface Window {
    render_game_to_text: () => string
    advanceTime: (ms?: number) => Promise<void>
    __aedventureRendererDevTools?: {
      setOverlay: (
        overlayId: RendererDevToolOverlayId,
        enabled: boolean,
      ) => Promise<void>
      selectFixture: (fixtureId: DevToolFixtureId) => Promise<void>
      state: () => unknown
    }
    __aedventureMovementFeel?: {
      setValue: (key: MovementFeelTuningKey, value: number) => unknown
      setPreset: (presetId: MovementFeelPresetId) => unknown
      reset: () => unknown
      state: () => unknown
    }
    __aedventureRendererTest?: {
      renderLargeStaticMap: (dimensions?: {
        readonly width?: number
        readonly height?: number
      }) => Promise<void>
      runBigMapBenchmark: () => Promise<BigMapBenchmarkResult>
      attemptInvalidMap: () => Promise<InvalidMapAttemptResult>
      renderDepthFixtureCase: (
        caseId: DepthFixtureCaseId,
      ) => Promise<DepthFixtureCaseResult>
      renderAvatarFixtureCase: () => Promise<AvatarFixtureResult>
      renderAvatarPreviewGallery: () => Promise<AvatarPreviewGalleryResult>
      moveAvatarFixturePlayer: (
        playerId: string,
        position: Vector2,
        direction: Direction,
      ) => Promise<void>
      triggerAvatarEmote: (
        playerId: string,
        emoteId: AvatarEmoteId,
      ) => Promise<void>
      renderZoneFixtureCase: () => Promise<ZoneFixtureResult>
      moveLocalPlayer: (position: Vector2) => Promise<void>
      requestMove: (
        vector: MovementVector,
        direction: Direction,
        movementMode?: MovementMode,
      ) => Promise<void>
      projectWorldToViewport: (point: Vector2) => {
        readonly x: number
        readonly y: number
      }
      setZoneDebugOverlay: (enabled: boolean) => Promise<void>
      setRendererEffects: (options: RendererEffectsOptions) => Promise<void>
    }
  }
}

window.render_game_to_text = renderDemoToText
window.advanceTime = async () => {
  await state.pendingAction
  await renderer.advanceTime()
}

if (localAutomationHost()) {
  window.__aedventureRendererDevTools = {
    setOverlay: async (overlayId, enabled) => {
      if (!state.devTools.gated || !DEV_TOOL_OVERLAY_IDS.includes(overlayId)) {
        return
      }
      setDevToolOverlay(overlayId, enabled)
      await renderer.advanceTime()
    },
    selectFixture: async (fixtureId) => {
      if (!state.devTools.gated || !DEV_TOOL_FIXTURES.includes(fixtureId)) {
        return
      }
      await selectDevFixture(fixtureId)
    },
    state: () => JSON.parse(renderDemoToText()).devTools,
  }
}

if (localAutomationHost()) {
  window.__aedventureMovementFeel = {
    setPreset: (presetId) => {
      if (state.devTools.gated && isMovementFeelPresetId(presetId)) {
        applyMovementFeelPreset(presetId)
      }
      return movementFeelTextState()
    },
    setValue: (key, value) => {
      if (!state.devTools.gated || !isMovementFeelTuningKey(key)) {
        return movementFeelTextState()
      }

      applyMovementFeelValue(key, value)
      return movementFeelTextState()
    },
    reset: () => {
      if (state.devTools.gated) {
        applyMovementFeelPreset(DEFAULT_MOVEMENT_FEEL_PRESET_ID)
      }
      return movementFeelTextState()
    },
    state: movementFeelTextState,
  }
}

if (localAutomationHost()) {
  window.__aedventureRendererTest = {
    renderLargeStaticMap: renderLargeStaticMapForSmoke,
    runBigMapBenchmark: runBigMapBenchmarkForSmoke,
    attemptInvalidMap: attemptInvalidMapForSmoke,
    renderDepthFixtureCase: renderDepthFixtureCaseForSmoke,
    renderAvatarFixtureCase: renderAvatarFixtureCaseForSmoke,
    renderAvatarPreviewGallery: renderAvatarPreviewGalleryForSmoke,
    moveAvatarFixturePlayer: moveAvatarFixturePlayerForSmoke,
    triggerAvatarEmote: async (playerId, emoteId) => {
      renderer.triggerAvatarEmote(playerId, emoteId)
      await renderer.advanceTime()
    },
    renderZoneFixtureCase: renderZoneFixtureCaseForSmoke,
    moveLocalPlayer: moveLocalPlayerForSmoke,
    requestMove: requestMoveForSmoke,
    projectWorldToViewport: (point) => renderer.projectWorldToViewport(point),
    setZoneDebugOverlay: async (enabled) => {
      renderer.setZoneDebugOverlayEnabled(enabled)
      await renderer.advanceTime()
    },
    setRendererEffects: async (options) => {
      renderer.setEffectsOptions(options)
      await renderer.advanceTime()
    },
  }
}

function localAutomationHost(): boolean {
  return ["127.0.0.1", "localhost", "::1"].includes(window.location.hostname)
}

export {}
