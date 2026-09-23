import {
  createEffect,
  createMemo,
  createRoot,
  createSignal,
  Index,
  onCleanup,
  onMount,
  Show,
  untrack,
  type Accessor,
} from "solid-js"
import { createStore, reconcile, unwrap } from "solid-js/store"
import html from "solid-js/html"
import { createComponent, render } from "solid-js/web"
import {
  baseConstructionLoopSummary,
  basePlayerLoopPanel,
  baseManagementMetricRows,
  baseResourceRows,
  baseSlotPoolRows,
  baseStalledSystemRow,
  baseStationMachineSummary,
  ConstructionControls,
  Disclosure,
  type EntityRendererRegistry,
  MAX_PANEL_NESTING_DEPTH,
  EconomyForecastCard,
  expeditionActiveJobRows,
  formatAffordabilityTime,
  InventoryList,
  MapModeTabs,
  firstSentence,
  flagEntityRow,
  indexList,
  formatEconomyDuration,
  formatResource,
  formatResourceTime,
  formatSignedNumber,
  formatSignedResource,
  formatSignedResourceDelta,
  leadUiCopy,
  normalizeUiCopy,
  ObjectiveSteps,
  offlineReturnBlockerRows,
  offlineReturnHighlights,
  offlineReturnJobKindLabel,
  offlineReturnJobRows,
  offlineReturnPausedRows,
  offlineReturnResourceRows,
  PerkControls,
  resonanceMaterialCard,
  projectEntityRow,
  resourceEntityRow,
  roleEntityRow,
  selectedTileLinkRows,
  selectedTileUsefulnessRows,
  selectedTileUsefulnessSummary,
  shouldRevealCopyDetail,
  signedRateCopy,
  socialPendingArrivalRows,
  stationEntityRow,
  storyBeatEntityRow,
  tileEntityRow,
  storyBrowserBeatRows,
  storyBrowserChoiceRows,
  storyBrowserCommandRows,
  storyBrowserEligibilityRows,
  storyBrowserQualityRows,
  travelDialogActions,
  worldActionEntityRow,
  titleCase,
  SchemaContext,
  SchemaPanel,
  Stat,
  visibilityContext,
  ResourceList,
  RoleControls,
  WorldActionList,
} from "@aedventure/add-ui"
import {
  PROJECT_BUILD_FIRE_PIT,
  PROJECT_RESTORE_STUDIO,
  RESOURCE_BASSLINE,
  RESOURCE_CHORUS,
  RESOURCE_HARMONICS,
  RESOURCE_STONE,
  RESOURCE_VIBES,
  RESOURCE_WATER,
  ROLE_CONSTRUCTION,
  ROLE_CRYSTAL_BASSLINE,
  ROLE_CRYSTAL_CHORUS,
  ROLE_CRYSTAL_HARMONICS,
  ROLE_FIRE_PIT,
  ROLE_SCAVENGE,
  ROLE_WATER,
  ADD_DISCOVERY_OPEN_BASE_ACTION_ID,
  addCommandForGameInteraction,
  selectAddAvailableCommands,
  selectAddBaseManagementState,
  flagValue,
  selectAddDiscoverySummary,
  selectAddDungeonObjective,
  selectAddInventory,
  selectAddOfflineReturnSummary,
  selectAddPerkSummaries,
  selectAddUiState,
  selectAddWorldTimeForClockSeconds,
  workerRequestForAddCommand,
  applyDungeonFieldOfView,
  applyClearedLocations,
  applyDroppedItems,
  applyDungeonDoorStates,
  dungeonDoorKey,
  dungeonLocationKey,
  lootDropForLocation,
  emptyDungeonVisibility,
  addDungeonByMapId,
  addAreaByMapId,
  ADD_MAP_MODE_OPTIONS,
  STUDIO_DUNGEON_MAP_ID,
  STUDIO_GROUNDS_AREA_MAP_ID,
  addMapModeLabel,
  createAddWorldForMapMode,
  renderAddAgentRuntimeText,
  serializeAddAgentRuntimeReport,
  selectAddStoryMoment,
  selectAddStoryContentBrowserState,
  selectPreferredTileAction,
  type AddStoryMoment,
  type AddUiState,
  type AddDiscoveryActionLink,
  type AddDungeonObjectiveStep,
  type AddDiscoveryMovementEvent,
  type AddFirstPlayableAction,
  type AddMapMode,
  type AddOfflineReturnSummary,
  type AddTileAction,
  type AddTileDetailSummary,
  type AddWorldTimeSummary,
  type AddAvailableCommandsState,
  type AddStoryContentBrowserState,
  type AddBaseManagementState,
  type AddBaseManagementTabId,
  type AddAreaEntrySide,
  type CatalogSnapshot,
  type UiElementDef,
  type InkSceneSnapshot,
  type SimulationSnapshot,
  type StationSpecializationPath,
  type WorkerRequest,
} from "@aedventure/add-runtime-client"
import type { CellCoord } from "@aedventure/game-topology"
import type { GameInteraction, GameWorld } from "@aedventure/game-world"

import type { VisibilityMap } from "@aedventure/game-visibility"
import type {
  AddCharacterMoveDirection,
  AddCharacterTravelEvent,
  AddTileActivationEvent,
  AddPhaserMapInfo,
} from "./phaser-add-map"
import { AddMapController } from "./add-map-controller"
import { AddRuntimeBridge } from "./add-runtime-bridge"
import { emptyMapInfo } from "./add-phaser/add-map-telemetry"
import {
  createAddRuntimeTextState,
  type RuntimeTextState,
  type AddTelemetryTravelDialogEligibility as TravelDialogEligibility,
  type AddTelemetryTravelDialogEligibilityReason as TravelDialogEligibilityReason,
  type AddTelemetryTravelDialogKind as TravelDialogKind,
  type AddTelemetryTravelDramaState as TravelDramaState,
  type AddTelemetryTravelExperience as TravelExperience,
  type AddCurrentActionState,
  type AddInterfaceHierarchyState,
} from "./add-telemetry-presenter"
import {
  clearAutosave,
  createSaveRecord,
  formatDuration,
  formatSaveTimestamp,
  offlineCatchupSecondsFor,
  readAutosave,
  writeAutosave,
  type AddBrowserSaveRecord,
  type AddSaveSource,
} from "./save-runtime"
import {
  ADD_DUNGEON_AMBIENT_RUNTIME_SECONDS_PER_TICK,
  ADD_DUNGEON_STEP_PRESENTATION,
  ADD_TILE_TRAVEL_PRESENTATION,
  createAddClockAdvancePresentationTiming,
} from "./travel-presentation-timing"
import {
  type AddSettings,
  DEFAULT_SETTINGS,
  applyDomSettings,
  effectiveMusicVolume,
  effectiveSfxVolume,
  loadSettings,
  saveSettings,
} from "./settings/settings-state"
import {
  ADD_BROWSER_QA_CONTRACT_VERSION,
  ADD_QA_ACTION_IDS,
  ADD_QA_SELECTORS,
  addQaMapModeActionId,
} from "./qa-contract"
import { installTraceRecorder } from "./dev/trace-recorder"
import "./styles.css"

const OPENING_TRAVEL_STEP_ID = "reach-base"
const OPENING_ROUTE_ACTION_ID = "first-playable:reach-base-route"

const moduleRootDisposers: Array<() => void> = []

function createModuleMemo<T>(compute: () => T): Accessor<T> {
  let disposeRoot: (() => void) | undefined
  const memo = createRoot((dispose) => {
    disposeRoot = dispose
    return createMemo(compute)
  })
  if (disposeRoot) moduleRootDisposers.push(disposeRoot)
  return memo
}

function createModuleEffect(effect: () => void): void {
  let disposeRoot: (() => void) | undefined
  createRoot((dispose) => {
    disposeRoot = dispose
    createEffect(effect)
  })
  if (disposeRoot) moduleRootDisposers.push(disposeRoot)
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    for (const dispose of moduleRootDisposers.splice(0)) dispose()
  })
}

const FIRST_PLAYABLE_ROLE_IDS = [
  ROLE_CRYSTAL_BASSLINE,
  ROLE_SCAVENGE,
  ROLE_CONSTRUCTION,
  ROLE_FIRE_PIT,
  ROLE_WATER,
] as const

interface QuestPanelPosition {
  readonly x: number
  readonly y: number
}

type FloatingPanelId = "travel_dialog" | "offline_return" | "settings"
type FloatingPanelLastAction = "idle" | "dragging" | "dragged" | "keyboard_moved"
type KeyboardPopinRootId =
  | "shell-menu-panel"
  | "settings-view"
  | "admin-view"
  | "dev-view"
  | "travel-confirmation-dialog"
  | "offline-return-panel"

interface FloatingPanelPosition {
  readonly x: number
  readonly y: number
}

type DungeonReturnMapMode = Exclude<AddMapMode, "dungeon_square">

interface AddMapModeNavItem {
  readonly id: AddMapMode
  readonly label: string
  readonly shortLabel: string
  readonly ariaLabel: string
  readonly hidden: boolean
}

interface TravelDialogState {
  readonly kind: TravelDialogKind
  readonly event: AddCharacterTravelEvent
  readonly resolve: (accepted: boolean) => void
}

interface ClockAnimationState {
  readonly fromClockSeconds: number
  readonly toClockSeconds: number
  readonly currentClockSeconds: number
  readonly remainingMinutes: number
  readonly totalMinutes: number
  readonly durationMs: number
  readonly clockStepMs: number
  readonly reason: string
}

interface PendingOfflineReturnSummary {
  readonly before: SimulationSnapshot
  readonly elapsedSeconds: number
  readonly source: AddOfflineReturnSummary["source"]
}

interface BaseRateSnapshotResource {
  readonly id: string
  readonly label: string
  readonly netPerSecond: number
  readonly gainPerSecond: number
  readonly spendPerSecond: number
}

interface BaseRateChange {
  readonly reason: string
  readonly changedAtMs: number
  readonly summary: string
  readonly changes: readonly {
    readonly id: string
    readonly label: string
    readonly beforeNetPerSecond: number
    readonly afterNetPerSecond: number
    readonly deltaPerSecond: number
  }[]
}

type AddFocusedRegion =
  | "world"
  | "topbar"
  | "context_panel"
  | "objective_tracker"
  | "map_controls"
  | "menu"
  | "settings"
  | "admin"
  | "dev"
  | "unknown"

type BaseViewTransitionState = "idle" | "opening" | "settling"

declare global {
  interface Window {
    addSettings?: () => AddSettings
    render_game_to_text?: () => string
    render_add_runtime_text?: () => string
    render_add_runtime_json?: () => string
    advanceTime?: (milliseconds?: number) => Promise<string>
  }
}

let pendingSaveSource: AddSaveSource = "autosave"
let autosaveRestoreAttempted = false
let queuedOfflineCatchupSeconds = 0
let lastAutosaveRequestMs = 0
const initialPlayerSettings = loadSettings()
if (typeof document !== "undefined") {
  applyDomSettings(initialPlayerSettings)
}

/**
 * The simulation snapshot, held in a store rather than a signal.
 *
 * The worker sends a whole new snapshot object roughly twenty-four times a
 * second. In a signal that is a new reference every frame, so every memo
 * reading it re-ran and every value derived from it was rebuilt — whether or
 * not a single number had actually changed. That is the root of the churn the
 * interface kept showing: panels blinking, rows recreated mid-hover, and a
 * hand-written cache bolted on to hide it.
 *
 * `reconcile` diffs the incoming snapshot into the existing store instead of
 * replacing it, so only the leaves that genuinely changed notify. Reading
 * `snapshot()?.resources` tracks that path alone.
 *
 * `merge: true` diffs positionally rather than by key. The snapshot carries
 * arrays that have no `id` (notes, for one), where keyed reconciliation has
 * nothing to match on; positional diffing is also what the list components
 * want, since they render through `Index`.
 */
const [snapshotStore, setSnapshotStore] = createStore<{ value: SimulationSnapshot | null }>({
  value: null,
})
const snapshot = (): SimulationSnapshot | null => snapshotStore.value
function setSnapshot(next: SimulationSnapshot | null): void {
  if (next === null) {
    setSnapshotStore("value", null)
    return
  }
  setSnapshotStore("value", reconcile(next, { merge: true }))
}

/**
 * A detached copy of the snapshot, for the few callers that compare a "before"
 * against a later "after".
 *
 * Reconciliation is what makes the interface stop churning, but it changes one
 * rule: the store is updated in place, so holding a reference no longer freezes
 * the values it had — that same reference sees the new ones. Anything measuring
 * a delta across an await has to take a copy, not a reference. Two callers here
 * did exactly that, and only one of them had a test watching.
 */
function captureSnapshot(): SimulationSnapshot | null {
  const current = snapshot()
  return current === null ? null : (structuredClone(unwrap(current)) as SimulationSnapshot)
}

/**
 * Reconcile a derived view model the same way.
 *
 * A selector returns a fresh object every time it runs, so even a perfectly
 * fine-grained snapshot would hand the UI a new `AddUiState` on any change.
 * Reconciling the *result* means a panel reading one field re-renders only
 * when that field moves.
 */
function createReconciledMemo<T extends object>(compute: () => T | null): Accessor<T | null> {
  const [store, setStore] = createStore<{ value: T | null }>({ value: null })
  createModuleEffect(() => {
    const next = compute()
    setStore("value", next === null ? null : reconcile(next, { merge: true }))
  })
  return () => store.value
}
const [catalog, setCatalog] = createSignal<CatalogSnapshot | null>(null)
const [world, setWorld] = createSignal<GameWorld | null>(null)
const [mapMode, setMapMode] = createSignal<AddMapMode>("overworld_hex")
const [dungeonTarget, setDungeonTarget] = createSignal<string>(STUDIO_DUNGEON_MAP_ID)
const [areaTarget, setAreaTarget] = createSignal<string>(STUDIO_GROUNDS_AREA_MAP_ID)
const [areaEntrySide, setAreaEntrySide] = createSignal<AddAreaEntrySide | null>(null)
const [dungeonReturnMode, setDungeonReturnMode] =
  createSignal<DungeonReturnMapMode>("overworld_hex")
const [mapInfo, setMapInfo] = createSignal<AddPhaserMapInfo>(emptyMapInfo())
const [baseNavigationUnlocked, setBaseNavigationUnlocked] = createSignal(false)
const [autosaveRecord, setAutosaveRecord] = createSignal<AddBrowserSaveRecord | null>(readAutosave())
const [autosaveEnabled, setAutosaveEnabled] = createSignal(true)
const [savePayload, setSavePayload] = createSignal(autosaveRecord()?.payload ?? "")
const [saveStatus, setSaveStatus] = createSignal(formatSaveTimestamp(autosaveRecord()))
const [storageError, setStorageError] = createSignal<string | null>(null)
const [lastManualExportAtMs, setLastManualExportAtMs] = createSignal<number | null>(null)
const [lastImportAtMs, setLastImportAtMs] = createSignal<number | null>(null)
const [lastOfflineCatchupSeconds, setLastOfflineCatchupSeconds] = createSignal(0)
const [resetCount, setResetCount] = createSignal(0)
const [online, setOnline] = createSignal(typeof navigator === "undefined" ? true : navigator.onLine)
const [ready, setReady] = createSignal(false)
// Ambient world clock runs by default ("autoTick"). It advances the runtime in
// fixed 1-second steps; the speed multiplier only changes how often a step fires
// (every 1000/timeSpeed ms), never the step size, so 2x/4x play stays behaviorally
// identical to real time. It pauses only while the Hero crosses a tile (gated on
// travelExperience phase) so the per-hex +1h stays exact, then resumes on arrival.
const [autoTick, setAutoTick] = createSignal(true)
const [timeSpeed, setTimeSpeed] = createSignal(1)
const [playerSettings, setPlayerSettings] = createSignal<AddSettings>(initialPlayerSettings)
const [settingsOpen, setSettingsOpen] = createSignal(false)
const [adminOpen, setAdminOpen] = createSignal(false)
const [devToolsOpen, setDevToolsOpen] = createSignal(false)
const [liveTuningDashboardVisible, setLiveTuningDashboardVisible] = createSignal(false)
const [reducedMotionMode, setReducedMotionMode] = createSignal<"system" | "reduced">(
  initialPlayerSettings.reducedMotion ? "reduced" : "system",
)
const [shellMenuOpen, setShellMenuOpen] = createSignal(false)
const [discoveryPanelCollapsed, setDiscoveryPanelCollapsed] = createSignal(false)
const [mobileDiscoveryDetailOpen, setMobileDiscoveryDetailOpen] = createSignal(false)
const [firstPlayableCollapsed, setFirstPlayableCollapsed] =
  createSignal(shouldCollapseQuestPanelByDefault())
const [questPanelDragging, setQuestPanelDragging] = createSignal(false)
const [lastQuestPanelAction, setLastQuestPanelAction] =
  createSignal<"idle" | "dragging" | "dragged" | "collapsed" | "expanded" | "keyboard_moved">(
    "idle",
  )
const [focusedRegion, setFocusedRegion] = createSignal<AddFocusedRegion>("world")
const [baseManagementTab, setBaseManagementTab] =
  createSignal<AddBaseManagementTabId>("crystal")
const [baseRateChange, setBaseRateChange] = createSignal<BaseRateChange | null>(null)
const [questPanelPosition, setQuestPanelPosition] = createSignal(defaultQuestPanelPosition())
const [floatingPanelPositions, setFloatingPanelPositions] = createSignal<
  Record<FloatingPanelId, FloatingPanelPosition | null>
>({
  travel_dialog: null,
  offline_return: null,
  settings: null,
})
const [floatingPanelLastActions, setFloatingPanelLastActions] = createSignal<
  Record<FloatingPanelId, FloatingPanelLastAction>
>({
  travel_dialog: "idle",
  offline_return: "idle",
  settings: "idle",
})
const [floatingPanelDraggingId, setFloatingPanelDraggingId] =
  createSignal<FloatingPanelId | null>(null)
const [travelExperience, setTravelExperience] = createSignal<TravelExperience | null>(null)
const [baseViewTransition, setBaseViewTransition] = createSignal<BaseViewTransitionState>("idle")
const [lastDiscoveryMovement, setLastDiscoveryMovement] =
  createSignal<AddDiscoveryMovementEvent | null>(null)
const [travelDialog, setTravelDialog] = createSignal<TravelDialogState | null>(null)
const [displayClockSeconds, setDisplayClockSeconds] = createSignal<number | null>(null)
const [clockAnimation, setClockAnimation] = createSignal<ClockAnimationState | null>(null)
const [offlineReturnSummary, setOfflineReturnSummary] =
  createSignal<AddOfflineReturnSummary | null>(null)
const [lastEvent, setLastEvent] = createSignal("booting")
const [lastCommand, setLastCommand] = createSignal<string | null>(null)
const [lastDungeonEntryCommand, setLastDungeonEntryCommand] = createSignal<string | null>(null)
const [lastTileActionTarget, setLastTileActionTarget] = createSignal<string | null>(null)
const [lastError, setLastError] = createSignal<string | null>(null)

if (typeof window !== "undefined") {
  window.addSettings = () => playerSettings()
}

createModuleEffect(() => {
  const travelOpen = travelDialog() !== null
  const offlineOpen = offlineReturnSummary() !== null
  const settingsVisible = settingsOpen()
  if (!travelOpen && !offlineOpen && !settingsVisible) return
  window.requestAnimationFrame(() => {
    if (travelOpen) clampFloatingPanelToViewport("travel_dialog")
    if (offlineOpen) clampFloatingPanelToViewport("offline_return")
    if (settingsVisible) clampFloatingPanelToViewport("settings")
  })
})

const mapController = new AddMapController()
let travelClearTimer: number | undefined
let clockAnimationFrameId: number | undefined
let baseViewTransitionTimer: number | undefined
let travelDramaState: TravelDramaState = "fresh"
let lastTileActionAtMs = 0
let pendingOfflineReturnSummary: PendingOfflineReturnSummary | null = null
let questPanelDrag:
  | {
      readonly pointerId: number
      readonly startX: number
      readonly startY: number
      readonly originX: number
      readonly originY: number
      moved: boolean
    }
  | null = null
let floatingPanelDrag:
  | {
      readonly id: FloatingPanelId
      readonly pointerId: number
      readonly startX: number
      readonly startY: number
      readonly originX: number
      readonly originY: number
      moved: boolean
    }
  | null = null

// Local-mode verbose tracing (no-op in production builds). Stamps each line with
// snapshot context via the `snapshot` accessor declared above.
const traceRecorder = installTraceRecorder(() => snapshot())

const runtimeBridge = new AddRuntimeBridge({
  onTrace: traceRecorder.onTrace,
  onReady(nextSnapshot, nextCatalog) {
    setReady(true)
    setSnapshot(nextSnapshot)
    setDisplayClockSeconds(nextSnapshot.clockSeconds)
    setCatalog(nextCatalog)
    setLastEvent("ready")
    setLastError(null)
    maybeRestoreAutosaveOnBoot(nextSnapshot)
  },
  onSnapshot(nextSnapshot) {
    setSnapshot(nextSnapshot)
    if (travelExperience()?.phase === "traveling") {
      // A travel reveal owns the presentation clock; let it run to arrival.
      // Truth (nextSnapshot.clockSeconds) is recorded above and settled on arrival.
    } else {
      // Boot import, offline catch-up, autoTick, and manual advances all snap
      // the display straight to truth — no animation, no fast-forward crawl.
      cancelClockAnimation()
      setDisplayClockSeconds(nextSnapshot.clockSeconds)
    }
    setLastEvent("snapshot")
    setLastError(null)
    maybeFinalizeOfflineReturnSummary(nextSnapshot)
    const catchupStarted = maybeRunQueuedOfflineCatchup()
    if (!catchupStarted) maybeRequestAutosave()
  },
  onSave(payload) {
    setLastEvent("save")
    persistSavePayload(payload, pendingSaveSource)
  },
  onError(message) {
    setLastEvent("error")
    setLastError(message)
  },
  onEvents(events) {
    // Fan per-frame sim events onto the window bus that music-event-bridge and
    // the dev trace recorder listen on.
    for (const event of events) {
      window.dispatchEvent(new CustomEvent("add-game-event", { detail: event }))
    }
  },
})

const availableCommandsState = createReconciledMemo<AddAvailableCommandsState>(() => {
  const currentSnapshot = snapshot()
  const currentCatalog = catalog()
  return currentSnapshot && currentCatalog
    ? selectAddAvailableCommands(currentSnapshot, currentCatalog)
    : null
})
const uiState = createReconciledMemo<AddUiState>(() => {
  const currentSnapshot = snapshot()
  const currentCatalog = catalog()
  const currentCommands = availableCommandsState()
  return currentSnapshot && currentCatalog
    ? selectAddUiState(currentSnapshot, currentCatalog, currentCommands)
    : null
})
const baseManagementState = createModuleMemo<AddBaseManagementState | null>(() => {
  const currentSnapshot = snapshot()
  const currentCatalog = catalog()
  return currentSnapshot && currentCatalog
    ? selectAddBaseManagementState(currentSnapshot, currentCatalog)
    : null
})

// ---------------------------------------------------------------------------
// Contamination.
//
// Declared with the other module state and above every consumer. Placed lower
// in the file its effect ran before the state it reads had initialised, and the
// bundler turns that into a silent `undefined` rather than a TDZ error — the
// runtime never finished booting and the console said only "is not a function".
// ---------------------------------------------------------------------------

/**
 * How long the Hero can be out there before the screen is entirely red.
 *
 * Six hours during the opening, which is roughly the walk to the Studio: the
 * contamination fills as the crossing goes on and is at its worst as the field
 * comes into view. Twenty-four hours after that, because by then the Hero has
 * been outside, survived, and privately stopped believing the worst of it.
 *
 * None of this is the survival simulation. The Hero is immune and does not know
 * it, so the red is what he expects to be happening rather than what is. The
 * authoritative viral load is untouched by any of this.
 */
const CONTAMINATION_INTRO_SCALE_SECONDS = 6 * 60
const CONTAMINATION_SETTLED_SCALE_SECONDS = 24 * 60

/**
 * The first half has to be watchable, not merely present.
 *
 * It began at a whisper and climbed to 0.12 by the halfway mark, which read as
 * nothing happening for three hours and then a sudden turn. The point of the
 * first phase is that the Hero can see it getting worse, so it starts at a
 * visible floor the moment any exposure is on the clock and roughly triples
 * across that half. The second half is where it stops being watchable and
 * starts being a problem.
 */
const CONTAMINATION_LIGHT_CUE_RATIO = 0.5
const CONTAMINATION_ONSET_ALPHA = 0.1
const CONTAMINATION_LIGHT_CUE_ALPHA = 0.32
const CONTAMINATION_FULL_ALPHA = 0.82

const [contaminationSeconds, setContaminationSeconds] = createSignal(0)
let lastContaminationClock: number | null = null
let contaminationIntroCleared = false

/** Has the Hero reached the field? Before that, every hour outside counts. */
const STORY_BEAT_ENTER_THE_BUBBLE = "story.beat.enter_the_bubble"

function contaminationIntroActive(): boolean {
  return !(snapshot()?.narrative.completedBeatIds ?? []).includes(STORY_BEAT_ENTER_THE_BUBBLE)
}

/**
 * Accrue exposure from the authoritative clock rather than wall time, so it
 * tracks offline catch-up and time-speed exactly as everything else does.
 */
createModuleEffect(() => {
  const currentSnapshot = snapshot()
  if (!currentSnapshot) return
  const clock = currentSnapshot.clockSeconds
  const previous = lastContaminationClock
  lastContaminationClock = clock
  if (previous === null || clock < previous) return

  const intro = contaminationIntroActive()
  if (!intro && !contaminationIntroCleared) {
    // Reaching the field is the reveal: he steps inside, nothing has happened
    // to him, and the fear he walked in with lifts. Clearing it here is the
    // payoff for a screen that has been reddening for the whole crossing.
    contaminationIntroCleared = true
    setContaminationSeconds(0)
    return
  }

  // Crossing the wasteland is exposure in itself during the opening. After it,
  // only genuinely standing outside the field counts.
  const exposed = intro || currentSnapshot.heroSurvival.location === "outside_bubble"
  if (!exposed) return
  setContaminationSeconds((held) => held + (clock - previous))
})

function contaminationRatio(): number {
  const scale = contaminationIntroActive()
    ? CONTAMINATION_INTRO_SCALE_SECONDS
    : CONTAMINATION_SETTLED_SCALE_SECONDS
  return Math.min(1, contaminationSeconds() / scale)
}

/**
 * Light up to halfway, then climbing. A cue that rises evenly reads as a meter;
 * one that stays faint and then grows reads as something getting worse.
 */
function contaminationAlpha(ratio: number): number {
  if (ratio <= 0) return 0
  if (ratio <= CONTAMINATION_LIGHT_CUE_RATIO) {
    // Straight from the floor, so every hour out there shows on screen.
    const within = ratio / CONTAMINATION_LIGHT_CUE_RATIO
    return (
      CONTAMINATION_ONSET_ALPHA +
      within * (CONTAMINATION_LIGHT_CUE_ALPHA - CONTAMINATION_ONSET_ALPHA)
    )
  }
  const beyond = (ratio - CONTAMINATION_LIGHT_CUE_RATIO) / (1 - CONTAMINATION_LIGHT_CUE_RATIO)
  return (
    CONTAMINATION_LIGHT_CUE_ALPHA +
    Math.pow(beyond, 1.25) * (CONTAMINATION_FULL_ALPHA - CONTAMINATION_LIGHT_CUE_ALPHA)
  )
}

/** Breathing quickens as it worsens: 6s when it first shows, 2.6s at its worst. */
function contaminationBreathSeconds(ratio: number): number {
  return 6 - ratio * 3.4
}


// ---------------------------------------------------------------------------
// Schema plumbing.
//
// Declared here, directly after the derived state it reads and above every
// panel body that uses it. Further down the file it was initialised *after* the
// first render touched it, and the bundler turns that from a TDZ error into a
// silent `undefined`, which reached the player as a blank boot and
// `props.context is not a function`. Deferring the reads was not enough — the
// declaration has to precede its consumers.
// ---------------------------------------------------------------------------

/**
 * What the player can ask about, for the authored visibility conditions.
 *
 * Reconciled state feeds this, so it re-evaluates when the fields a condition
 * actually reads move, not on every frame.
 */
const schemaVisibility = createModuleMemo(() => {
  const currentSnapshot = snapshot()
  if (!currentSnapshot) return null
  return visibilityContext(
    currentSnapshot,
    (resourceId) =>
      uiState()?.resources.find((resource) => resource.id === resourceId)?.value ?? 0,
  )
})

/**
 * The first panel in this app rendered from the catalog rather than from this
 * file. Its title, its player hint and — the part that matters — whether it
 * appears at all come from `ui.panel.power`, which authored content has carried
 * all along without anything ever reading it.
 *
 * The numbers are still supplied here. The schema says whether and what it is
 * called; it does not say how to draw a rate.
 */
/**
 * How to draw each kind of entity a panel can name.
 *
 * This is the whole point of the schema path: a panel's body is its related
 * entities, so a new panel is an authored catalog entry rather than a new
 * component. Adding a *kind* means one entry here; adding a panel means none.
 */
/** Every flag the catalog knows, so an id is recognised whatever group it names. */
const schemaFlagIds = createModuleMemo(
  () => new Set((catalog()?.flags ?? []).map((flag) => flag.id)),
)

const schemaEntityRenderers: EntityRendererRegistry = {
  resource: (id) =>
    resourceEntityRow(() => uiState()?.resources.find((resource) => resource.id === id)),
  role: (id) =>
    roleEntityRow(() => uiState()?.roleAssignments.find((role) => role.id === id)),
  station: (id) =>
    stationEntityRow(() =>
      baseManagementState()?.stationMachine.cards.find((station) => station.id === id),
    ),
  // Projects are authored under two prefixes, `project.` and `construction.`,
  // and both name the same kind of thing.
  project: (id) =>
    projectEntityRow(() => uiState()?.constructionOptions.find((option) => option.id === id)),
  construction: (id) =>
    projectEntityRow(() => uiState()?.constructionOptions.find((option) => option.id === id)),
  world_action: (id) =>
    worldActionEntityRow(() =>
      uiState()?.availableWorldActions.find((action) => action.id === id),
    ),
  // `allBeats` already carries every beat with its status, so a beat named by a
  // panel is looked up rather than recomputed.
  story: (id) =>
    storyBeatEntityRow(() =>
      uiState()?.storyProgression.allBeats.find((beat) => beat.id === id),
    ),
  tile: (id) => tileEntityRow(() => catalog()?.tiles.find((tile) => tile.id === id)),
  // The catalog gives the flag its label and group; the snapshot says whether
  // it is set. `flagValue` is the same resolver the visibility conditions use,
  // so a flag drawn as a row and a flag gating a panel agree by construction.
  flag: (id) =>
    flagEntityRow(() => {
      const definition = catalog()?.flags.find((flag) => flag.id === id)
      const currentSnapshot = snapshot()
      if (!definition || !currentSnapshot) return undefined
      return {
        label: definition.label,
        group: definition.group,
        set: flagValue(currentSnapshot, id),
      }
    }),
  // Panels compose: an element may name another element, which is drawn inside
  // it with its own label, hint and visibility. The depth is what stops a cycle
  // — `ui.panel.map` names `ui.map.cave_gate`, and nothing prevents an author
  // from pointing the two at each other.
  ui: (id, context) =>
    context.depth >= MAX_PANEL_NESTING_DEPTH
      ? null
      : schemaPanel(id, undefined, context.depth + 1),
}

/**
 * A panel drawn entirely from the catalog: label, player hint, visibility, and
 * contents. Adding one is this call and nothing else — no component is written,
 * and there is none to extract later.
 */
const storyContentBrowserState = createModuleMemo<AddStoryContentBrowserState | null>(() => {
  const currentSnapshot = snapshot()
  const currentCatalog = catalog()
  const currentCommands = availableCommandsState()
  return currentSnapshot && currentCatalog && currentCommands
    ? selectAddStoryContentBrowserState(currentSnapshot, currentCatalog, currentCommands)
    : null
})
const perkProgress = createModuleMemo(() => {
  const currentSnapshot = snapshot()
  return currentSnapshot ? selectAddPerkSummaries(currentSnapshot) : null
})
const inventoryItems = createModuleMemo(() => {
  const currentSnapshot = snapshot()
  return currentSnapshot ? selectAddInventory(currentSnapshot) : []
})
const discoveryState = createModuleMemo(() => {
  const currentSnapshot = snapshot()
  const currentCatalog = catalog()
  if (!currentSnapshot || !currentCatalog) return null

  const info = mapInfo()
  const activeTile = activeTileForMapInfo(info)
  const experience = travelExperience()
  const travelPhase =
    experience?.phase ?? (info.travel.previewCell ? "preview" : "idle")
  return selectAddDiscoverySummary({
    snapshot: currentSnapshot,
    catalog: currentCatalog,
    heroCell: info.character.cell,
    selectedTile: activeTile,
    previewTile: activeTile,
    heroDungeonLinks: info.character.dungeonLinksAtCell,
    selectedDungeonLinks: info.dungeonLinks.selected,
    travel: {
      active: experience?.phase === "traveling" || info.travel.active,
      phase: travelPhase,
      previewCell: info.travel.previewCell,
      destinationLabel:
        experience?.event.destinationLabel ??
        info.travel.destinationLabel ??
        info.travel.previewLabel,
      exposureRisk:
        experience?.event.exposureRisk ??
        info.travel.exposureRisk ??
        info.travel.previewExposureRisk,
      previewAdjacent: info.travel.previewAdjacent,
      gameMinutes: info.travel.costGameMinutes,
    },
    lastMovement: lastDiscoveryMovement(),
  })
})
createModuleEffect(() => {
  if (baseNavigationUnlocked()) return
  if (mapMode() === "base_square" || heroIsAtStudio(mapInfo())) {
    setBaseNavigationUnlocked(true)
  }
})
const dungeonObjectiveState = createModuleMemo(() =>
  selectAddDungeonObjective({
    mapMode: mapMode(),
    dungeonMapId: mapMode() === "dungeon_square" ? dungeonTarget() : null,
    heroCell: mapInfo().character.cell,
  }),
)
let firstPlayableCompletionCollapseApplied = false
createModuleEffect(() => {
  const complete = uiState()?.firstPlayable.complete === true
  const objectiveOwnedByDungeon = dungeonObjectiveState() !== null
  if (!complete || objectiveOwnedByDungeon) {
    firstPlayableCompletionCollapseApplied = false
    return
  }

  if (firstPlayableCompletionCollapseApplied) return
  firstPlayableCompletionCollapseApplied = true
  if (!firstPlayableCollapsed()) {
    setFirstPlayableCollapsed(true)
    setLastQuestPanelAction("collapsed")
    window.requestAnimationFrame(() => {
      const current = questPanelPosition()
      setQuestPanelPosition(clampQuestPanelPosition(current.x, current.y))
    })
  }
})
const displayedWorldTime = createModuleMemo<AddWorldTimeSummary | null>(() => {
  const currentSnapshot = snapshot()
  const clockSeconds = displayClockSeconds() ?? currentSnapshot?.clockSeconds
  return clockSeconds === undefined || clockSeconds === null
    ? null
    : selectAddWorldTimeForClockSeconds(clockSeconds)
})

const worldActions = createModuleMemo(() => uiState()?.availableWorldActions ?? [])
const gameInteractions = createModuleMemo(() => {
  const currentWorld = world()
  const map = currentWorld?.maps.find((candidate) => candidate.id === currentWorld.activeMapId)
  return map?.interactions ?? []
})
const primaryWorldActionInteraction = createModuleMemo(() =>
  gameInteractions().find(
    (interaction) => interaction.kind === "world_action" && interaction.enabled,
  ),
)
const recruitmentInteraction = createModuleMemo(() =>
  gameInteractions().find((interaction) => interaction.action === "add.recruit_from_survivor_cave"),
)
// On the overworld, the enabled dungeon link under the Hero (for example,
// Survivor Cave) surfaces an "Enter" affordance for that local entrance.
const heroDungeonLink = createModuleMemo(() =>
  mapMode() === "overworld_hex"
    ? (mapInfo().character.dungeonLinksAtCell.find((link) => link.enabled) ?? null)
    : null,
)
const baseDungeonEntranceInteraction = createModuleMemo(() =>
  mapMode() === "base_square"
    ? (gameInteractions().find(
        (interaction) => interaction.action === "add.enter_dungeon" && interaction.enabled !== false,
      ) ?? null)
    : null,
)

// Hero pose (coord + facing), as stable strings, drives the dungeon cone FOV.
const heroDungeonCell = createModuleMemo(() =>
  mapMode() === "dungeon_square" ? mapInfo().character.cell : null,
)
const heroDungeonFacing = createModuleMemo(() =>
  mapMode() === "dungeon_square" ? mapInfo().character.facing : null,
)
// Remembered dungeon visibility, persisted across moves/turns; reset per dungeon.
let dungeonVisibility: VisibilityMap = emptyDungeonVisibility()
let dungeonVisibilityKey = ""

createModuleEffect(() => {
  const currentSnapshot = snapshot()
  const currentCatalog = catalog()
  if (!currentSnapshot || !currentCatalog) return

  const mode = mapMode()
  const target = dungeonTarget()
  let nextWorld = createAddWorldForMapMode(mode, currentSnapshot, currentCatalog, {
    dungeonMapId: target,
    areaMapId: areaTarget(),
    areaEntrySide: areaEntrySide(),
  })

  if (mode === "dungeon_square") {
    if (dungeonVisibilityKey !== target) {
      // Fresh memory each time a dungeon is entered.
      dungeonVisibility = emptyDungeonVisibility()
      dungeonVisibilityKey = target
    }
    const activeMap = nextWorld.maps.find((map) => map.id === nextWorld.activeMapId)
    if (activeMap) {
      const dungeonId = addDungeonByMapId(activeMap.id)?.id ?? activeMap.id
      // Doors are authoritative game state: overlay open/closed (which drives
      // `blocked`, gating both movement and the FOV cone) before computing FOV.
      let dungeonMap = applyDungeonDoorStates(
        activeMap,
        dungeonId,
        new Set(currentSnapshot.openDoors ?? []),
      )
      // Per-location persistence: looted containers / cleared creatures drop out.
      dungeonMap = applyClearedLocations(
        dungeonMap,
        dungeonId,
        new Set(currentSnapshot.clearedLocations ?? []),
      )
      // Dropped items appear as bump-to-pickup loot piles.
      dungeonMap = applyDroppedItems(dungeonMap, dungeonId, currentSnapshot.droppedItems ?? {})
      // The dungeon registry owns the visibility policy; "fully_lit" dungeons skip FOV.
      const usesFov =
        (addDungeonByMapId(activeMap.id)?.visibilityPolicy ?? "directional_fov") ===
        "directional_fov"
      if (usesFov) {
        const fov = applyDungeonFieldOfView(
          dungeonMap,
          heroDungeonCell(),
          heroDungeonFacing(),
          dungeonVisibility,
        )
        dungeonVisibility = fov.visibility
        dungeonMap = fov.map
      }
      nextWorld = {
        ...nextWorld,
        maps: nextWorld.maps.map((map) => (map.id === activeMap.id ? dungeonMap : map)),
      }
    }
  } else {
    dungeonVisibilityKey = ""
  }

  setWorld(nextWorld)
  mapController.renderWorld(nextWorld)
  refreshMapInfo()
})

window.render_game_to_text = () => JSON.stringify(toTextState())
window.render_add_runtime_text = () => renderAddAgentRuntimeText(toTextState().agentRuntime)
window.render_add_runtime_json = () => serializeAddAgentRuntimeReport(toTextState().agentRuntime)
window.advanceTime = async (milliseconds = 1000) => {
  const seconds = milliseconds / 1000
  await tickRuntime(seconds, { queue: true, commandLabel: `advance:${seconds.toFixed(1)}s` })
  mapController.advanceTime(milliseconds)
  refreshMapInfo()
  return JSON.stringify(toTextState())
}

type TuningDashboardModule = typeof import("./dev/tuning-dashboard")

let tuningDashboardModulePromise: Promise<TuningDashboardModule> | null = null

function loadTuningDashboardModule(): Promise<TuningDashboardModule> {
  tuningDashboardModulePromise ??= import("./dev/tuning-dashboard")
  return tuningDashboardModulePromise
}

async function setDevLiveTuningDashboardVisible(visible: boolean): Promise<void> {
  try {
    const dashboard = await loadTuningDashboardModule()
    if (!dashboard.liveTuningDashboardAvailable) {
      setLastError("Live tuning is only available in development mode.")
      return
    }
    dashboard.setTuningDashboardMounted(visible)
    setLiveTuningDashboardVisible(visible)
    setLastEvent(visible ? "live_tuning_shown" : "live_tuning_removed")
  } catch (error) {
    setLastEvent("error")
    setLastError(error instanceof Error ? error.message : "Unable to update live tuning dashboard.")
  }
}

function handleLiveTuningOverride(event: Event): void {
  const detail = (event as CustomEvent<{ readonly path?: unknown; readonly value?: unknown }>).detail
  if (typeof detail?.path !== "string" || typeof detail.value !== "number") return
  sendWorkerRequest({ type: "setBalanceOverride", path: detail.path, value: detail.value })
}

function handleLiveTuningReset(): void {
  sendWorkerRequest({ type: "resetBalanceOverrides" })
}

/**
 * Render a list that keeps its DOM when the data behind it is replaced.
 *
 * `uiState()` is a new object on every snapshot — about twenty-four times a
 * second — so a list built with `.map()` tore down and recreated every row at
 * that rate even when nothing about them had changed. Recreated DOM is visible:
 * the contextual panel blinked, and anything mid-hover or mid-transition
 * flickered with it.
 *
 * `Index` keys by position rather than by identity, which is what these lists
 * want: the array is rebuilt wholesale but its shape is stable, so each row
 * keeps its element and only the values inside it update. Keying by identity
 * (`For`) would recreate everything, because every snapshot brings new objects.
 *
 * This replaces a hand-written cache that compared a JSON signature of the
 * data. That cache was `For` rebuilt badly: it had to be told, by hand and at
 * every call site, every field the rows render, and a field left out of the
 * signature was a change the player would never see.
 */
render(() => html`<${AddRpgApp} />`, requiredElement("app"))
sendWorkerRequest({ type: "init" })

function AddRpgApp() {
  let mapElement: HTMLDivElement | undefined
  // Attribute bindings re-run their setter whenever any dependency fires, and
  // `setAttribute` writes unconditionally — so an unchanged value still counts
  // as a DOM mutation, every tick. A memo dedupes by value, so the write only
  // happens when the value really changed.
  const mapLoadingClass = createMemo(() =>
    mapInfo().ready ? "shell-state-layer loading hidden" : "shell-state-layer loading",
  )
  const mapLoadingDetail = createMemo(() =>
    ready() ? "Drawing the map" : "Starting the runtime",
  )
  // A style string, not an object: `createMemo` dedupes by value, so an
  // unchanged overlay stops writing the attribute at all. The object form was
  // a new reference every frame and had to be cached by hand.
  const dayNightStyle = createMemo(dayNightOverlayStyle)
  const toxicityStyle = createMemo(toxicityHazeStyle)
  const dayNightPhase = createMemo(() => displayedWorldTime()?.daylightPhase ?? "day")
  const dayNightSeason = createMemo(() => displayedWorldTime()?.season ?? "spring")
  const travelRisk = createMemo(() => travelRiskState())
  const statusStateMemo = createMemo(() => statusState())
  const statusLabelMemo = createMemo(() => statusLabel())
  let autoTickTimer: number | undefined
  let mapInfoTimer: number | undefined
  let autosaveTimer: number | undefined

  onMount(() => {
    if (!mapElement) return
    try {
      mapController.mount(mapElement, {
        showTravelActionMarkers: playerSettings().showTravelActionMarkers,
        onBeforeCharacterTravel: confirmFirstCharacterTravel,
        onCharacterTravel: (event) => {
          void handleCharacterTravel(event)
        },
        onTileAction: handleTileActivation,
        onDoorToggle: (coord) => {
          void handleDoorToggle(coord)
        },
        onClearLocation: (coord, lootTable) => {
          void handleClearLocation(coord, lootTable)
        },
        onPickUp: (coord) => {
          void handlePickUp(coord)
        },
      })
    } catch (error) {
      setLastEvent("error")
      setLastError(error instanceof Error ? error.message : "Unable to start the map renderer.")
      return
    }
    const currentWorld = world()
    if (currentWorld) {
      mapController.renderWorld(currentWorld)
      refreshMapInfo()
    }
    window.requestAnimationFrame(() => {
      const current = questPanelPosition()
      setQuestPanelPosition(clampQuestPanelPosition(current.x, current.y))
      clampFloatingPanelsToViewport()
    })
    mapInfoTimer = window.setInterval(refreshMapInfo, 180)
    autosaveTimer = window.setInterval(maybeRequestAutosave, 3500)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    window.addEventListener("resize", clampFloatingPanelsToViewport)
    window.addEventListener("add-tuning-override", handleLiveTuningOverride)
    window.addEventListener("add-tuning-reset", handleLiveTuningReset)
    document.addEventListener("keydown", handleGlobalKeyboardShortcuts)
  })

  onCleanup(() => {
    if (autoTickTimer !== undefined) window.clearInterval(autoTickTimer)
    if (mapInfoTimer !== undefined) window.clearInterval(mapInfoTimer)
    if (autosaveTimer !== undefined) window.clearInterval(autosaveTimer)
    if (travelClearTimer !== undefined) window.clearTimeout(travelClearTimer)
    if (baseViewTransitionTimer !== undefined) window.clearTimeout(baseViewTransitionTimer)
    cancelClockAnimation()
    window.removeEventListener("online", handleOnline)
    window.removeEventListener("offline", handleOffline)
    window.removeEventListener("resize", clampFloatingPanelsToViewport)
    window.removeEventListener("add-tuning-override", handleLiveTuningOverride)
    window.removeEventListener("add-tuning-reset", handleLiveTuningReset)
    document.removeEventListener("keydown", handleGlobalKeyboardShortcuts)
    if (liveTuningDashboardVisible()) {
      void setDevLiveTuningDashboardVisible(false)
    }
    mapController.destroy()
    runtimeBridge.dispose()
  })

  // Ambient clock: one fixed 1-second runtime step per fire, fired every
  // 1000/timeSpeed ms. Re-runs when play/pause, readiness, or speed changes,
  // recreating the interval at the new cadence (step size stays 1s for fidelity).
  createEffect(() => {
    const playing = autoTick() && ready()
    const speed = timeSpeed()
    // Overworld runs compressed (1 in-game minute / real second); dungeons run
    // ~real-time (1 in-game second / real second).
    const ambientStep =
      mapMode() === "overworld_hex" ? 1 : ADD_DUNGEON_AMBIENT_RUNTIME_SECONDS_PER_TICK
    if (autoTickTimer !== undefined) {
      window.clearInterval(autoTickTimer)
      autoTickTimer = undefined
    }
    if (!playing || speed <= 0) return
    const periodMs = Math.max(1, Math.round(1000 / speed))
    autoTickTimer = window.setInterval(() => {
      if (autoTick() && ready() && travelExperience()?.phase !== "traveling") {
        void tickRuntime(ambientStep)
      }
    }, periodMs)
  })

  return html`
    <main
      class=${() =>
        [
          "add-app-shell",
          settingsOpen() ? "settings-open" : "",
          adminOpen() ? "admin-open" : "",
          devToolsOpen() ? "dev-open" : "",
          shellMenuOpen() ? "menu-open" : "",
          reducedMotionMode() === "reduced" ? "reduce-motion" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      data-interface-hierarchy="map-decision-status-admin"
      data-qa=${ADD_QA_SELECTORS.app}
      data-qa-contract=${ADD_BROWSER_QA_CONTRACT_VERSION}
      onFocusIn=${handleShellFocusIn}
      onKeyDown=${handleShellKeyDown}
    >
      <a class="skip-link" href="#first-playable-panel">Skip to objective</a>
      <section class="world-pane" data-interface-tier="primary" aria-label="Primary game world">
        <div
          id="add-world"
          class="add-world"
          data-interface-tier="primary"
          data-visual-surface="map-stage"
          data-qa=${ADD_QA_SELECTORS.mapStage}
          ref=${(node: HTMLDivElement) => (mapElement = node)}
        >
          <div
            id="map-loading-state"
            class=${mapLoadingClass}
            data-visual-state="loading"
            role="status"
            aria-live="polite"
          >
            <span>Preparing world</span>
            <strong>${mapLoadingDetail}</strong>
            <small>Loading the simulation, visibility, and Phaser layers.</small>
          </div>
          ${() => worldErrorState()}
          <div
            class="day-night-overlay"
            data-phase=${dayNightPhase}
            data-season=${dayNightSeason}
            style=${dayNightStyle}
            aria-hidden="true"
          />
          <div
            class="toxicity-haze"
            data-risk=${travelRisk}
            style=${toxicityStyle}
            aria-hidden="true"
          />
          <div
            class=${() =>
              baseViewTransition() === "idle"
                ? "base-entry-transition hidden"
                : "base-entry-transition"}
            data-state=${() => baseViewTransition()}
            role="status"
            aria-live="polite"
          >
            <span>Studio reached</span>
            <strong>${() =>
              baseViewTransition() === "settling"
                ? "Base management ready"
                : "Opening base management"}</strong>
          </div>
          <div
            class="map-topbar"
            data-interface-tier="tertiary"
            data-visual-surface="status"
            data-qa=${ADD_QA_SELECTORS.status}
            aria-label="ADD map navigation and status"
          >
            <div class="map-mode-switcher" role="tablist" aria-label="ADD map mode">
              ${mapModeButtons}
            </div>
            <div class="status-stack" data-interface-answer="resources-time-status">
              <span class="status-pill" data-state=${statusStateMemo}>
                ${statusLabelMemo}
              </span>
              ${() => resourceStatusStrip()}
              <div
                class=${() =>
                  travelExperience()?.phase === "traveling" || clockAnimation()
                    ? "world-time-chip traveling"
                    : "world-time-chip"}
                aria-label="Game time"
              >
                <span>${() => worldTimePrimaryCopy()}</span>
                <small>${() => worldTimeSecondaryCopy()}</small>
                <i style=${() => daylightMeterStyle()} aria-hidden="true" />
              </div>
              <button
                id="time-speed-control"
                type="button"
                data-action-id=${ADD_QA_ACTION_IDS.timeToggleSpeed}
                class=${() => (autoTick() ? "time-speed-button" : "time-speed-button paused")}
                onClick=${() => cycleTimeSpeed()}
                disabled=${() => !ready()}
                aria-label=${() =>
                  autoTick()
                    ? `Time speed ${timeSpeed()} times, click to change`
                    : "Time paused, click to resume"}
              >
                ${() => timeSpeedLabel()}
              </button>
              <div class="shell-menu">
                <button
                  id="open-shell-menu"
                  type="button"
                  class="shell-menu-toggle"
                  onClick=${() => setShellMenuOpen((open) => !open)}
                  aria-controls="shell-menu-panel"
                  aria-expanded=${() => shellMenuOpen()}
                  aria-haspopup="menu"
                  aria-label=${() =>
                    shellMenuOpen() ? "Close secondary menu" : "Open secondary menu"}
                >
                  Menu
                </button>
                <div
                  id="shell-menu-panel"
                  class=${() => (shellMenuOpen() ? "shell-menu-panel open" : "shell-menu-panel")}
                  role="menu"
                  aria-label="Secondary menu"
                  aria-hidden=${() => !shellMenuOpen()}
                  onKeyDown=${(event: KeyboardEvent) =>
                    handlePopinKeyboardNavigation("shell-menu-panel", event)}
                >
                  <div class="shell-menu-header" aria-hidden="true">
                    <strong>Menu</strong>
                    <small>Player options and tools</small>
                  </div>
                  <div class="shell-menu-group" role="group" aria-label="Player">
                    <span class="shell-menu-group-label">Player</span>
                    <button
                      id="open-settings"
                      type="button"
                      data-action-id=${ADD_QA_ACTION_IDS.menuOpenSettings}
                      class="ghost-button shell-menu-action settings-menu-action"
                      role="menuitem"
                      onClick=${openSettingsView}
                      aria-controls="settings-view"
                      aria-expanded=${() => settingsOpen()}
                    >
                      <span>
                        <strong>Settings</strong>
                        <small>Sound, pacing, saves, comfort</small>
                      </span>
                      <i aria-hidden="true">Open</i>
                    </button>
                  </div>
                  <div class="shell-menu-group shell-menu-tools" role="group" aria-label="Tools">
                    <span class="shell-menu-group-label">Tools</span>
                    <button
                      id="open-admin"
                      type="button"
                      data-action-id=${ADD_QA_ACTION_IDS.menuOpenAdmin}
                      class="ghost-button shell-menu-action admin-menu-action"
                      role="menuitem"
                      onClick=${openAdminView}
                      aria-controls="admin-view"
                      aria-expanded=${() => adminOpen()}
                    >
                      <span>
                        <strong>Admin</strong>
                        <small>Run health, story, recovery</small>
                      </span>
                      <i aria-hidden="true">Manage</i>
                    </button>
                    <button
                      id="open-dev-menu"
                      type="button"
                      data-action-id=${ADD_QA_ACTION_IDS.menuOpenDeveloper}
                      class="ghost-button shell-menu-action dev-menu-action"
                      role="menuitem"
                      onClick=${openDevView}
                      aria-controls="dev-view"
                      aria-expanded=${() => devToolsOpen()}
                    >
                      <span>
                        <strong>Dev</strong>
                        <small>Runtime commands and raw data</small>
                      </span>
                      <i aria-hidden="true">Debug</i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          ${() => contextualPanel()}
          ${() => travelDialogView()}
          <section
            id="first-playable-panel"
            data-interface-tier="secondary"
            data-interface-answer="objective-progress"
            class=${() =>
              [
                "panel first-playable-panel first-playable-overlay",
                firstPlayableCollapsed() ? "collapsed" : "",
                firstPlayableArcComplete() ? "complete" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            style=${() => questPanelStyle()}
            data-dragging=${() => questPanelDragging()}
            data-last-action=${() => lastQuestPanelAction()}
            data-complete=${() => firstPlayableArcComplete()}
            data-visual-surface="objective"
            data-qa=${ADD_QA_SELECTORS.objective}
            aria-labelledby="first-playable-title"
            aria-describedby="first-playable-keyboard-help"
          >
            <div
              class="panel-heading first-playable-drag-handle"
              role="group"
              tabindex="0"
              aria-label="Objective tracker handle. Use arrow keys to move it."
              aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Enter Space"
              onPointerDown=${beginQuestPanelDrag}
              onPointerMove=${dragQuestPanel}
              onPointerUp=${endQuestPanelDrag}
              onPointerCancel=${endQuestPanelDrag}
              onKeyDown=${handleQuestPanelKeyboard}
            >
              <span id="first-playable-title">${() => objectivePanelTitle()}</span>
              <div class="panel-heading-actions">
                <span class="small-chip">
                  ${() => objectivePanelChip()}
                </span>
                <button
                  id="toggle-first-playable-panel"
                  type="button"
                  class="panel-icon-button"
                  onClick=${toggleFirstPlayablePanel}
                  aria-expanded=${() => !firstPlayableCollapsed()}
                  aria-controls="first-playable-body"
                  aria-label=${() => objectivePanelToggleLabel()}
                >
                  ${() => objectivePanelToggleText()}
                </button>
              </div>
            </div>
            ${() => objectivePanelCompactSummary()}
            <span id="first-playable-keyboard-help" class="sr-only">
              Use arrow keys while the tracker handle is focused to move this panel. Press Enter
              or Space to collapse or expand it.
            </span>
            <div
              id="first-playable-body"
              class="first-playable-body"
              hidden=${() => firstPlayableCollapsed()}
            >
              ${() => objectivePanelBody()}
            </div>
          </section>
          <div
            class="map-hud"
            data-interface-tier="tertiary"
            data-visual-surface="map-controls"
            data-qa=${ADD_QA_SELECTORS.mapControls}
            aria-label="ADD map controls"
          >
            <div class="map-camera-controls" aria-label="Map camera controls">
              <div class="map-zoom-cluster" aria-label="Map zoom">
                <button
                  id="map-zoom-out"
                  type="button"
                  data-action-id=${ADD_QA_ACTION_IDS.mapZoomOut}
                  class="map-button map-button-icon"
                  onClick=${() => zoomMap(0.9)}
                  disabled=${() => !mapInfo().ready}
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  -
                </button>
                <button
                  id="map-zoom-in"
                  type="button"
                  data-action-id=${ADD_QA_ACTION_IDS.mapZoomIn}
                  class="map-button map-button-icon"
                  onClick=${() => zoomMap(1.1)}
                  disabled=${() => !mapInfo().ready}
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div
        class=${() =>
          settingsOpen() || adminOpen() || devToolsOpen()
            ? "admin-backdrop visible"
            : "admin-backdrop"}
        onClick=${closeAdvancedViews}
        aria-hidden="true"
      />

      <section
        id="settings-view"
        data-interface-tier="settings"
        data-dragging=${() => floatingPanelDraggingId() === "settings"}
        class=${() =>
          settingsOpen() ? "settings-hex-window settings-view open" : "settings-hex-window settings-view"}
        style=${() => floatingPanelStyle("settings")}
        role="dialog"
        aria-modal="true"
        aria-label="Player settings"
        aria-hidden=${() => !settingsOpen()}
        onKeyDown=${(event: KeyboardEvent) =>
          handlePopinKeyboardNavigation("settings-view", event)}
      >
        <div class="settings-hex-inner">
          <div
            class="admin-header settings-header settings-drag-handle"
            tabindex="0"
            role="group"
            aria-label="Drag settings window. Use arrow keys to nudge it."
            onPointerDown=${(event: PointerEvent) => beginFloatingPanelDrag("settings", event)}
            onPointerMove=${(event: PointerEvent) => dragFloatingPanel("settings", event)}
            onPointerUp=${(event: PointerEvent) => endFloatingPanelDrag("settings", event)}
            onPointerCancel=${(event: PointerEvent) => endFloatingPanelDrag("settings", event)}
            onKeyDown=${(event: KeyboardEvent) => handleFloatingPanelKeyboard("settings", event)}
          >
            <div>
              <span class="settings-hex-kicker">Player preferences</span>
              <span class="admin-title">Settings</span>
              <small>Sound, pacing, saves, and interface comfort</small>
            </div>
            <button
              id="close-settings"
              type="button"
              class="ghost-button"
              data-key-action="cancel"
              aria-keyshortcuts="Escape"
              onClick=${closeSettingsView}
              aria-label="Close settings"
            >
              Close
            </button>
          </div>

          <div class="settings-hex-body">
            <section
              class="panel settings-panel settings-sound-panel keyboard-section"
              tabindex="0"
              aria-label="Sound settings section"
            >
              <div class="panel-heading">
                <span>Sound</span>
                <span class="small-chip">${() => soundStatusLabel()}</span>
              </div>
              <p class="settings-panel-note">${() => soundMixSummary()}</p>
              <div class="settings-row">
                <span>
                  <strong>Mute all</strong>
                  <small>Silence music and interface sounds without changing the mix.</small>
                </span>
                <button
                  id="settings-toggle-mute"
                  type="button"
                  class="ghost-button"
                  onClick=${() => updatePlayerSettings({ muted: !playerSettings().muted })}
                  aria-pressed=${() => playerSettings().muted}
                >
                  ${() => (playerSettings().muted ? "Muted" : "On")}
                </button>
              </div>
              ${settingsVolumeRow("Master volume", "Overall game audio level.", "masterVolume")}
              ${settingsVolumeRow("Music", "Adaptive world bed and story stingers.", "musicVolume")}
              ${settingsVolumeRow("Effects", "Interface cues and future world sounds.", "sfxVolume")}
              <div class="settings-action-row">
                <button
                  id="settings-reset-audio"
                  type="button"
                  class="ghost-button"
                  onClick=${resetAudioSettings}
                >
                  Reset sound
                </button>
              </div>
            </section>

            <section
              class="panel settings-panel keyboard-section"
              tabindex="0"
              aria-label="Play pace settings section"
            >
              <div class="panel-heading">
                <span>Play pace</span>
                <span class="small-chip">${() => (autoTick() ? `${timeSpeed()}x` : "Paused")}</span>
              </div>
              <div class="settings-row">
                <span>
                  <strong>World clock</strong>
                  <small>Let time move while you read the map.</small>
                </span>
                <button
                  id="settings-toggle-time"
                  type="button"
                  class="ghost-button"
                  onClick=${() => setAutoTick(!autoTick())}
                  aria-pressed=${() => autoTick()}
                >
                  ${() => (autoTick() ? "Live" : "Paused")}
                </button>
              </div>
              <div class="settings-row">
                <span>
                  <strong>Clock speed</strong>
                  <small>Travel still consumes exact game time.</small>
                </span>
                <button
                  id="settings-cycle-speed"
                  type="button"
                  class="ghost-button"
                  onClick=${() => cycleTimeSpeed()}
                  disabled=${() => !ready()}
                >
                  ${() => timeSpeedLabel()}
                </button>
              </div>
            </section>

            <section
              class="panel settings-panel keyboard-section"
              tabindex="0"
              aria-label="Interface settings section"
            >
              <div class="panel-heading">
                <span>Interface</span>
                <span class="small-chip">Player</span>
              </div>
              <div class="settings-row">
                <span>
                  <strong>Objective tracker</strong>
                  <small>Keep the map clear or show the full checklist.</small>
                </span>
                <button
                  id="settings-toggle-objective"
                  type="button"
                  class="ghost-button"
                  onClick=${toggleFirstPlayablePanel}
                  aria-pressed=${() => !firstPlayableCollapsed()}
                >
                  ${() => (firstPlayableCollapsed() ? "Compact" : "Expanded")}
                </button>
              </div>
              <div class="settings-row">
                <span>
                  <strong>Travel markers</strong>
                  <small>Show default Travel action icons on adjacent regions.</small>
                </span>
                <button
                  id="settings-toggle-travel-markers"
                  type="button"
                  class="ghost-button"
                  onClick=${() =>
                    updatePlayerSettings({
                      showTravelActionMarkers: !playerSettings().showTravelActionMarkers,
                    })}
                  aria-pressed=${() => playerSettings().showTravelActionMarkers}
                >
                  ${() => (playerSettings().showTravelActionMarkers ? "Shown" : "Hidden")}
                </button>
              </div>
              <div class="settings-row">
                <span>
                  <strong>Motion</strong>
                  <small>Reduce panel and map UI motion locally.</small>
                </span>
                <button
                  id="settings-toggle-motion"
                  type="button"
                  class="ghost-button"
                  onClick=${() =>
                    updatePlayerSettings({
                      reducedMotion: reducedMotionMode() !== "reduced",
                    })}
                  aria-pressed=${() => reducedMotionMode() === "reduced"}
                >
                  ${() => (reducedMotionMode() === "reduced" ? "Reduced" : "System")}
                </button>
              </div>
            </section>

            <section
              class="panel settings-panel keyboard-section"
              tabindex="0"
              aria-label="Save data settings section"
            >
              <div class="panel-heading">
                <span>Save data</span>
                <span class="small-chip">${() => (autosaveEnabled() ? "Autosave on" : "Manual")}</span>
              </div>
              <div class="settings-row">
                <span>
                  <strong>Autosave</strong>
                  <small>${() => formatSaveTimestamp(autosaveRecord())}</small>
                </span>
                <button
                  id="settings-toggle-autosave"
                  type="button"
                  class="ghost-button"
                  onClick=${() => setAutosaveEnabled(!autosaveEnabled())}
                  aria-pressed=${() => autosaveEnabled()}
                >
                  ${() => (autosaveEnabled() ? "On" : "Off")}
                </button>
              </div>
              <div class="admin-action-grid settings-save-actions">
                <button
                  id="settings-save-now"
                  type="button"
                  onClick=${() => void exportSaveNow()}
                  disabled=${() => !ready()}
                >
                  Save now
                </button>
                <button
                  id="settings-load-autosave"
                  type="button"
                  class="ghost-button"
                  onClick=${() => void loadAutosave()}
                  disabled=${() => !ready() || !autosaveRecord()}
                >
                  Load autosave
                </button>
              </div>
            </section>
          </div>
        </div>
      </section>

      <aside
        id="admin-view"
        data-interface-tier="advanced"
        class=${() => (adminOpen() ? "admin-view open" : "admin-view")}
        aria-label="ADD admin controls"
        aria-hidden=${() => !adminOpen()}
        onKeyDown=${(event: KeyboardEvent) =>
          handlePopinKeyboardNavigation("admin-view", event)}
      >
        <div class="admin-header">
          <div>
            <span class="admin-title">Admin</span>
            <small>Operational view for run health, story, resources, and recovery</small>
          </div>
          <button
            id="close-admin"
            type="button"
            class="ghost-button"
            data-key-action="cancel"
            aria-keyshortcuts="Escape"
            onClick=${closeAdminView}
            aria-label="Close admin"
          >
            Close
          </button>
        </div>

        <nav class="drawer-section-map admin-section-map" aria-label="Admin sections">
          <a href="#admin-run-status">Run</a>
          <a href="#admin-resources">Resources</a>
          <a href="#admin-story-browser" data-action-id=${ADD_QA_ACTION_IDS.storyOpenContext}>Story</a>
          <a href="#admin-recovery">Recovery</a>
          <a href="#admin-world-actions">Actions</a>
        </nav>

        <section
          id="admin-run-status"
          class="panel runtime-panel keyboard-section"
          tabindex="0"
          aria-label="Admin run status section"
        >
          <div class="panel-heading">
            <span>Run status</span>
            <button
              type="button"
              class="ghost-button"
              onClick=${() => setAutoTick(!autoTick())}
              aria-pressed=${() => autoTick()}
            >
              ${() => (autoTick() ? "Live time" : "Paused")}
            </button>
          </div>
          <dl class="runtime-list">
            <div>
              <dt>Map</dt>
              <dd>${() => mapInfo().mapId ?? "Waiting"}</dd>
            </div>
            <div>
              <dt>Save</dt>
              <dd>${() => saveStatus()}</dd>
            </div>
            <div>
              <dt>Offline</dt>
              <dd>${() => lastOfflineCopy()}</dd>
            </div>
          </dl>
        </section>

        <section
          id="admin-resources"
          class="panel keyboard-section"
          tabindex="0"
          aria-label="Admin resources section"
        >
          <div class="panel-heading">
            <span>Resources</span>
            <span class="small-chip">${() => `${uiState()?.resources.length ?? 0} tracked`}</span>
          </div>
          <div class="resource-list">
            ${resourceRows}
          </div>
        </section>

        <section
          id="admin-objective"
          class="panel keyboard-section"
          tabindex="0"
          aria-label="Admin objective section"
        >
          <div class="panel-heading">
            <span>Objective</span>
            <span class="small-chip">${() => objectiveState()}</span>
          </div>
          <p class="objective-copy">
            ${() => objectiveCopy()}
          </p>
          <p class="note-line">
            ${() => uiState()?.notes[0] ?? "Waiting for system notes."}
          </p>
        </section>

        ${() => adminStoryBrowserPanel()}

        <section
          id="admin-recovery"
          class="panel admin-recovery-panel keyboard-section"
          tabindex="0"
          aria-label="Admin run recovery section"
        >
          <div class="panel-heading">
            <span>Run recovery</span>
            <span class="small-chip">${() => (autosaveEnabled() ? "Autosave on" : "Manual save")}</span>
          </div>
          <p class="admin-panel-copy">
            Keep or restore this run without exposing the raw save file.
          </p>
          <div class="admin-action-grid">
            <button
              id="player-save-now"
              type="button"
              onClick=${() => void exportSaveNow()}
              disabled=${() => !ready()}
            >
              Save now
            </button>
            <button
              id="player-load-autosave"
              type="button"
              onClick=${() => void loadAutosave()}
              disabled=${() => !ready() || !autosaveRecord()}
            >
              Load autosave
            </button>
            <button
              id="player-clear-autosave"
              type="button"
              class="ghost-button"
              onClick=${clearBrowserAutosave}
            >
              Clear save
            </button>
          </div>
        </section>

        <section
          id="admin-world-actions"
          class="panel compact-panel keyboard-section"
          tabindex="0"
          aria-label="Admin world actions section"
        >
          <div class="panel-heading">
            <span>World actions</span>
            <span class="small-chip">${() => `${worldActions().filter((action) => action.enabled).length} ready`}</span>
          </div>
          <ul class="action-list">
            ${actionRows}
          </ul>
        </section>
      </aside>

      <aside
        id="dev-view"
        data-interface-tier="developer"
        class=${() => (devToolsOpen() ? "admin-view dev-view open" : "admin-view dev-view")}
        aria-label="Developer menu"
        aria-hidden=${() => !devToolsOpen()}
        onKeyDown=${(event: KeyboardEvent) =>
          handlePopinKeyboardNavigation("dev-view", event)}
      >
        <div class="admin-header dev-header">
          <div>
            <span class="admin-title">Dev</span>
            <small>Diagnostics, raw save tools, and deterministic runtime controls</small>
          </div>
          <button
            id="close-dev"
            type="button"
            class="ghost-button"
            data-key-action="cancel"
            aria-keyshortcuts="Escape"
            onClick=${closeDevView}
            aria-label="Close developer menu"
          >
            Close
          </button>
        </div>

        <div id="developer-tools-body" class="developer-tools-body">
          <nav class="drawer-section-map dev-section-map" aria-label="Developer sections">
            <a href="#dev-runtime-internals">Runtime</a>
            <a href="#dev-live-tuning">Tuning</a>
            <a href="#dev-commands">Commands</a>
            <a href="#dev-save-tools">Save</a>
          </nav>

          <section
            id="dev-runtime-internals"
            class="panel runtime-internals-panel keyboard-section"
            tabindex="0"
            aria-label="Developer runtime internals section"
          >
            <div class="panel-heading">
              <span>Runtime internals</span>
              <span class="small-chip">${() => (ready() ? "Ready" : "Starting")}</span>
            </div>
            <p class="admin-panel-copy">
              Developer-only state for checking the UI -> Worker -> Rust/WASM -> Snapshot boundary.
            </p>
            <dl class="runtime-list">
              <div>
                <dt>Boundary</dt>
                <dd>UI -> Worker -> Rust/WASM -> Snapshot</dd>
              </div>
              <div>
                <dt>Renderer</dt>
                <dd>${() => `${mapInfo().rendererType} / ${mapInfo().cells.total} cells`}</dd>
              </div>
              <div>
                <dt>Event</dt>
                <dd>${() => lastEvent()}</dd>
              </div>
            </dl>
          </section>

          <section
            id="dev-live-tuning"
            class="panel runtime-internals-panel keyboard-section"
            tabindex="0"
            aria-label="Developer live tuning section"
          >
            <div class="panel-heading">
              <span>Live tuning</span>
              <span class="small-chip">${() => (liveTuningDashboardVisible() ? "Visible" : "Hidden")}</span>
            </div>
            <p class="admin-panel-copy">
              Dev-only balance sliders are hidden by default. Show them only while tuning numbers, then remove the overlay from the play surface.
            </p>
            <button
              id="toggle-live-tuning"
              type="button"
              class=${() => (liveTuningDashboardVisible() ? "ghost-button danger-button" : "ghost-button")}
              onClick=${() => void setDevLiveTuningDashboardVisible(!liveTuningDashboardVisible())}
            >
              ${() => (liveTuningDashboardVisible() ? "Remove live tuning" : "Show live tuning")}
            </button>
          </section>

          <section
            id="dev-commands"
            class="panel command-panel keyboard-section"
            tabindex="0"
            aria-label="Developer commands section"
          >
            <div class="panel-heading">
              <span>Commands</span>
              <span class="small-chip">${() => lastCommand() ?? "Idle"}</span>
            </div>
            <div class="command-grid">
              <button id="tick-runtime" type="button" onClick=${() => void tickRuntime(5)} disabled=${() => !ready()}>
                Advance 5s
              </button>
              <button id="tick-runtime-fast" type="button" onClick=${() => void tickRuntime(120)} disabled=${() => !ready()}>
                Advance 2m
              </button>
              <button id="assign-hero" type="button" onClick=${() => void toggleHero()} disabled=${() => !ready()}>
                ${() => (snapshot()?.roster.heroAssigned ? "Unassign hero" : "Assign hero")}
              </button>
              <button
                type="button"
                onClick=${() => void runInteraction(primaryWorldActionInteraction())}
                disabled=${() => !Boolean(primaryWorldActionInteraction())}
              >
                ${() => primaryWorldActionInteraction()?.label ?? "World action"}
              </button>
              <button
                type="button"
                id="recruit-survivor"
                onClick=${() => void runInteraction(recruitmentInteraction())}
                disabled=${() => !Boolean(recruitmentInteraction()?.enabled)}
              >
                Recruit
              </button>
              <button id="reset-runtime" type="button" class="ghost-button" onClick=${() => void resetRuntime()} disabled=${() => !ready()}>
                Reset
              </button>
            </div>
            <div class="quick-control-group" aria-label="First playable role controls">
              ${roleQuickControls}
            </div>
            <div class="quick-control-group" aria-label="First playable construction controls">
              ${constructionQuickControls}
            </div>
            <div class="quick-control-group" aria-label="Hero perk controls">
              <p class="quick-control-heading">
                Perks
                <span class="small-chip">${() => `${perkProgress()?.pointsAvailable ?? 0} pts`}</span>
              </p>
              ${perkQuickControls}
            </div>
            <div class="quick-control-group" aria-label="Hero inventory">
              <p class="quick-control-heading">Inventory</p>
              ${inventoryRows}
            </div>
            ${() => (lastError() ? html`<p class="error-line">${lastError()}</p>` : null)}
          </section>

          <section
            id="dev-save-tools"
            class="panel run-panel keyboard-section"
            tabindex="0"
            data-qa=${ADD_QA_SELECTORS.saveTools}
            aria-label="Developer raw save section"
          >
            <div class="panel-heading">
              <span>Raw save</span>
              <button
                id="toggle-autosave"
                type="button"
                class="ghost-button"
                onClick=${() => setAutosaveEnabled(!autosaveEnabled())}
                aria-pressed=${() => autosaveEnabled()}
              >
                ${() => (autosaveEnabled() ? "Autosave" : "Manual")}
              </button>
            </div>
            <dl class="runtime-list">
              <div>
                <dt>Autosave</dt>
                <dd>${() => formatSaveTimestamp(autosaveRecord())}</dd>
              </div>
              <div>
                <dt>Offline</dt>
                <dd>${() => lastOfflineCopy()}</dd>
              </div>
            </dl>
            <textarea
              id="save-payload"
              class="save-payload"
              spellcheck="false"
              value=${() => savePayload()}
              onInput=${(event: InputEvent) => setSavePayload((event.currentTarget as HTMLTextAreaElement).value)}
              aria-label="ADD save payload"
            />
            <div class="run-grid">
              <button
                id="export-save"
                type="button"
                data-action-id=${ADD_QA_ACTION_IDS.saveExport}
                onClick=${() => void exportSaveNow()}
                disabled=${() => !ready()}
              >
                Save now
              </button>
              <button
                id="load-autosave"
                type="button"
                data-action-id=${ADD_QA_ACTION_IDS.saveLoadAutosave}
                onClick=${() => void loadAutosave()}
                disabled=${() => !ready() || !autosaveRecord()}
              >
                Load autosave
              </button>
              <button
                id="import-save"
                type="button"
                data-action-id=${ADD_QA_ACTION_IDS.saveImport}
                onClick=${() => void importSaveText()}
                disabled=${() => !ready()}
              >
                Import text
              </button>
              <button
                id="offline-catchup"
                type="button"
                data-action-id=${ADD_QA_ACTION_IDS.offlineCatchupOneHour}
                onClick=${() => void runOfflineCatchup(3600)}
                disabled=${() => !ready()}
              >
                Offline 1h
              </button>
              <button id="clear-autosave" type="button" class="ghost-button" onClick=${clearBrowserAutosave}>
                Clear save
              </button>
            </div>
            ${() => (storageError() ? html`<p class="error-line">${storageError()}</p>` : null)}
          </section>
        </div>
      </aside>
    </main>
  `
}

function openSettingsView(): void {
  setShellMenuOpen(false)
  setAdminOpen(false)
  setDevToolsOpen(false)
  setSettingsOpen(true)
  focusElementById("close-settings")
}

function updatePlayerSettings(patch: Partial<AddSettings>): void {
  const next = { ...playerSettings(), ...patch }
  setPlayerSettings(next)
  saveSettings(next)
  applyDomSettings(next)
  mapController.setShowTravelActionMarkers(next.showTravelActionMarkers)
  setReducedMotionMode(next.reducedMotion ? "reduced" : "system")
  window.dispatchEvent(new CustomEvent<AddSettings>("add-settings-changed", { detail: next }))
}

function updateSettingsVolume(
  key: "masterVolume" | "musicVolume" | "sfxVolume",
  value: number,
): void {
  const clamped = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_SETTINGS[key]
  updatePlayerSettings({ [key]: clamped } as Partial<AddSettings>)
}

function resetAudioSettings(): void {
  updatePlayerSettings({
    masterVolume: DEFAULT_SETTINGS.masterVolume,
    musicVolume: DEFAULT_SETTINGS.musicVolume,
    sfxVolume: DEFAULT_SETTINGS.sfxVolume,
    muted: DEFAULT_SETTINGS.muted,
  })
}

function settingsVolumePercent(key: "masterVolume" | "musicVolume" | "sfxVolume"): string {
  return `${Math.round(playerSettings()[key] * 100)}%`
}

function soundStatusLabel(): string {
  const settings = playerSettings()
  if (settings.muted) return "Muted"
  return `${Math.round(settings.masterVolume * 100)}% master`
}

function soundMixSummary(): string {
  const settings = playerSettings()
  if (settings.muted) return "All game music and interface sounds are muted."
  return `Music ${Math.round(effectiveMusicVolume(settings) * 100)}% · Effects ${Math.round(
    effectiveSfxVolume(settings) * 100,
  )}%`
}

function settingsVolumeRow(
  label: string,
  detail: string,
  key: "masterVolume" | "musicVolume" | "sfxVolume",
) {
  const inputId = `settings-${key.replace("Volume", "-volume").toLowerCase()}`
  return html`
    <label class="settings-row settings-volume-row" for=${inputId}>
      <span>
        <strong>${label}</strong>
        <small>${detail}</small>
      </span>
      <span class="settings-volume-control">
        <input
          id=${inputId}
          type="range"
          min="0"
          max="1"
          step="0.05"
          value=${() => playerSettings()[key]}
          onInput=${(event: Event) =>
            updateSettingsVolume(key, Number((event.currentTarget as HTMLInputElement).value))}
          aria-label=${`${label} volume`}
        />
        <strong>${() => settingsVolumePercent(key)}</strong>
      </span>
    </label>
  `
}

function openAdminView(): void {
  setShellMenuOpen(false)
  setSettingsOpen(false)
  setDevToolsOpen(false)
  setAdminOpen(true)
  focusElementById("close-admin")
}

function openDevView(): void {
  setShellMenuOpen(false)
  setSettingsOpen(false)
  setAdminOpen(false)
  setDevToolsOpen(true)
  focusElementById("close-dev")
}

function closeSettingsView(): void {
  setSettingsOpen(false)
}

function closeAdminView(): void {
  setAdminOpen(false)
}

function closeDevView(): void {
  setDevToolsOpen(false)
}

function closeAdvancedViews(): void {
  setSettingsOpen(false)
  setAdminOpen(false)
  setDevToolsOpen(false)
}

function handleShellFocusIn(event: FocusEvent): void {
  const target = event.target instanceof Element ? event.target : null
  if (!target) {
    setFocusedRegion("unknown")
    return
  }
  if (target.closest("#settings-view")) {
    setFocusedRegion("settings")
  } else if (target.closest("#admin-view")) {
    setFocusedRegion("admin")
  } else if (target.closest("#dev-view")) {
    setFocusedRegion("dev")
  } else if (target.closest("#shell-menu-panel, .shell-menu")) {
    setFocusedRegion("menu")
  } else if (target.closest("#first-playable-panel")) {
    setFocusedRegion("objective_tracker")
  } else if (
    target.closest(
      "#discovery-panel, #base-management-panel, #dungeon-context-panel, #offline-return-panel, #travel-confirmation-dialog",
    )
  ) {
    setFocusedRegion("context_panel")
  } else if (target.closest(".map-camera-controls")) {
    setFocusedRegion("map_controls")
  } else if (target.closest(".map-topbar")) {
    setFocusedRegion("topbar")
  } else if (target.closest("#add-world")) {
    setFocusedRegion("world")
  } else {
    setFocusedRegion("unknown")
  }
}

function handleShellKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented) return

  if (event.key === "Enter") {
    if (handleKeyboardConfirm(event)) return
  }

  if (event.key !== "Escape") return

  if (handleKeyboardCancel(event)) return

  if (shellMenuOpen()) {
    event.preventDefault()
    event.stopPropagation()
    setShellMenuOpen(false)
    focusElementById("open-shell-menu")
    return
  }

  if (settingsOpen() || adminOpen() || devToolsOpen()) {
    event.preventDefault()
    event.stopPropagation()
    closeAdvancedViews()
    focusElementById("open-shell-menu")
  }
}

function handleGlobalKeyboardShortcuts(event: KeyboardEvent): void {
  if (event.defaultPrevented) return
  if (!travelDialog() && !offlineReturnSummary()) return

  if (event.key === "Enter") {
    handleKeyboardConfirm(event)
    return
  }

  if (event.key === "Escape") {
    handleKeyboardCancel(event)
  }
}

function handleKeyboardConfirm(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false

  if (travelDialog()) {
    if (
      shouldLetNativeKeyboardActivationHandleInsideRoot(
        event.target,
        "travel-confirmation-dialog",
      )
    ) {
      return false
    }
    consumeKeyboardShortcut(event)
    answerTravelDialog(true)
    return true
  }

  if (offlineReturnSummary()) {
    if (
      shouldLetNativeKeyboardActivationHandleInsideRoot(
        event.target,
        "offline-return-panel",
      )
    ) {
      return false
    }
    consumeKeyboardShortcut(event)
    dismissOfflineReturnSummary()
    return true
  }

  if (shouldLetNativeKeyboardActivationHandle(event.target)) return false

  return false
}

function handleKeyboardCancel(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false

  if (travelDialog()) {
    consumeKeyboardShortcut(event)
    cancelTravelDialogFromKeyboard()
    return true
  }

  if (offlineReturnSummary()) {
    consumeKeyboardShortcut(event)
    dismissOfflineReturnSummary()
    return true
  }

  return false
}

function handlePopinKeyboardNavigation(rootId: KeyboardPopinRootId, event: KeyboardEvent): void {
  if (event.key !== "Tab") return
  const root = document.getElementById(rootId)
  if (!(root instanceof HTMLElement)) return

  const focusableElements = popinFocusableElements(root)
  if (focusableElements.length === 0) return

  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const activeIndex = activeElement ? focusableElements.indexOf(activeElement) : -1
  if (activeIndex === -1) {
    consumeKeyboardShortcut(event)
    focusableElements[event.shiftKey ? focusableElements.length - 1 : 0]?.focus()
    return
  }

  const nextIndex = activeIndex + (event.shiftKey ? -1 : 1)
  if (nextIndex >= 0 && nextIndex < focusableElements.length) return

  consumeKeyboardShortcut(event)
  focusableElements[event.shiftKey ? focusableElements.length - 1 : 0]?.focus()
}

function consumeKeyboardShortcut(event: KeyboardEvent): void {
  event.preventDefault()
  event.stopPropagation()
}

function popinFocusableElements(root: HTMLElement): readonly HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "summary",
        '[tabindex]:not([tabindex="-1"])',
      ].join(", "),
    ),
  ).filter(isVisibleKeyboardStop)
}

function isVisibleKeyboardStop(element: HTMLElement): boolean {
  if (element.closest("[hidden], [aria-hidden='true']")) return false
  const style = window.getComputedStyle(element)
  if (style.display === "none" || style.visibility === "hidden") return false
  const rect = element.getBoundingClientRect()
  return rect.width > 0 || rect.height > 0
}

function shouldLetNativeKeyboardActivationHandle(target: EventTarget | null): boolean {
  const element = target instanceof Element ? target : null
  return Boolean(
    element?.closest(
      'button, a[href], summary, input, textarea, select, [role="button"], [contenteditable="true"]',
    ),
  )
}

function shouldLetNativeKeyboardActivationHandleInsideRoot(
  target: EventTarget | null,
  rootId: string,
): boolean {
  const element = target instanceof Element ? target : null
  const root = document.getElementById(rootId)
  return Boolean(element && root?.contains(element) && shouldLetNativeKeyboardActivationHandle(target))
}

function focusElementById(id: string): void {
  window.requestAnimationFrame(() => {
    document.getElementById(id)?.focus()
  })
}

function defaultQuestPanelPosition(): QuestPanelPosition {
  if (typeof window !== "undefined" && window.innerWidth <= 520) {
    return { x: 8, y: 46 }
  }
  return { x: 12, y: 54 }
}

function shouldCollapseQuestPanelByDefault(): boolean {
  return true
}

function questPanelStyle(): Record<string, string> {
  const position = questPanelPosition()
  return {
    "--quest-panel-x": `${position.x}px`,
    "--quest-panel-y": `${position.y}px`,
  }
}

function floatingPanelStyle(id: FloatingPanelId): Record<string, string> {
  const position = floatingPanelPosition(id)
  return {
    "--floating-panel-x": `${position.x}px`,
    "--floating-panel-y": `${position.y}px`,
  }
}

function floatingPanelPosition(id: FloatingPanelId): FloatingPanelPosition {
  return floatingPanelPositions()[id] ?? defaultFloatingPanelPosition(id)
}

function floatingPanelTelemetry() {
  const travel = floatingPanelPosition("travel_dialog")
  const offline = floatingPanelPosition("offline_return")
  const settings = floatingPanelPosition("settings")
  return {
    travelDialog: {
      open: travelDialog() !== null,
      x: travel.x,
      y: travel.y,
      dragging: floatingPanelDraggingId() === "travel_dialog",
      lastAction: floatingPanelLastActions().travel_dialog,
      dragEnabled: true,
      bounded: floatingPanelWithinBounds("travel_dialog"),
      layer: "modal",
    },
    offlineReturn: {
      open: offlineReturnSummary() !== null,
      x: offline.x,
      y: offline.y,
      dragging: floatingPanelDraggingId() === "offline_return",
      lastAction: floatingPanelLastActions().offline_return,
      dragEnabled: true,
      bounded: floatingPanelWithinBounds("offline_return"),
      layer: "context",
    },
    settings: {
      open: settingsOpen(),
      x: settings.x,
      y: settings.y,
      dragging: floatingPanelDraggingId() === "settings",
      lastAction: floatingPanelLastActions().settings,
      dragEnabled: true,
      bounded: floatingPanelWithinBounds("settings"),
      layer: "modal",
    },
  } as const
}

function defaultFloatingPanelPosition(id: FloatingPanelId): FloatingPanelPosition {
  const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth || 1024
  const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight || 768
  const size = floatingPanelSize(id)

  if (id === "offline_return") {
    const gutter = viewportWidth <= 520 ? 8 : 12
    const y = viewportWidth <= 900
      ? viewportHeight - size.height / 2 - gutter
      : 54 + size.height / 2
    return clampFloatingPanelPosition(id, viewportWidth - size.width / 2 - gutter, y)
  }

  return clampFloatingPanelPosition(id, viewportWidth / 2, viewportHeight / 2)
}

function floatingPanelSize(id: FloatingPanelId): { readonly width: number; readonly height: number } {
  const element = typeof document === "undefined" ? null : document.getElementById(floatingPanelDomId(id))
  return {
    width: element?.offsetWidth ?? (id === "settings" ? 760 : 430),
    height: element?.offsetHeight ?? (id === "travel_dialog" ? 260 : id === "settings" ? 720 : 560),
  }
}

function floatingPanelDomId(id: FloatingPanelId): string {
  if (id === "travel_dialog") return "travel-confirmation-dialog"
  if (id === "settings") return "settings-view"
  return "offline-return-panel"
}

function beginFloatingPanelDrag(id: FloatingPanelId, event: PointerEvent): void {
  if (event.button !== 0) return
  const target = event.target instanceof Element ? event.target : null
  if (target?.closest("button, a, summary, input, textarea, select")) return

  event.preventDefault()
  event.stopPropagation()

  const current = floatingPanelPosition(id)
  floatingPanelDrag = {
    id,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: current.x,
    originY: current.y,
    moved: false,
  }
  setFloatingPanelDraggingId(id)
  setFloatingPanelLastAction(id, "dragging")
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)
  handle.classList.add("dragging")
}

function dragFloatingPanel(id: FloatingPanelId, event: PointerEvent): void {
  if (!floatingPanelDrag || floatingPanelDrag.id !== id || floatingPanelDrag.pointerId !== event.pointerId) return
  event.preventDefault()
  event.stopPropagation()

  const nextX = floatingPanelDrag.originX + event.clientX - floatingPanelDrag.startX
  const nextY = floatingPanelDrag.originY + event.clientY - floatingPanelDrag.startY
  if (Math.abs(nextX - floatingPanelDrag.originX) + Math.abs(nextY - floatingPanelDrag.originY) > 4) {
    floatingPanelDrag.moved = true
  }
  setFloatingPanelPosition(id, clampFloatingPanelPosition(id, nextX, nextY))
}

function endFloatingPanelDrag(id: FloatingPanelId, event: PointerEvent): void {
  if (!floatingPanelDrag || floatingPanelDrag.id !== id || floatingPanelDrag.pointerId !== event.pointerId) return
  event.preventDefault()
  event.stopPropagation()
  const handle = event.currentTarget as HTMLElement
  if (handle.hasPointerCapture(event.pointerId)) {
    handle.releasePointerCapture(event.pointerId)
  }
  handle.classList.remove("dragging")
  setFloatingPanelDraggingId(null)
  setFloatingPanelLastAction(id, floatingPanelDrag.moved ? "dragged" : "idle")
  floatingPanelDrag = null
}

function handleFloatingPanelKeyboard(id: FloatingPanelId, event: KeyboardEvent): void {
  if (event.target !== event.currentTarget) return
  const keyOffsets: Record<string, readonly [number, number]> = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  }
  const offset = keyOffsets[event.key]
  if (!offset) return

  event.preventDefault()
  event.stopPropagation()
  const step = event.shiftKey ? 48 : 16
  const current = floatingPanelPosition(id)
  setFloatingPanelPosition(
    id,
    clampFloatingPanelPosition(id, current.x + offset[0] * step, current.y + offset[1] * step),
  )
  setFloatingPanelLastAction(id, "keyboard_moved")
}

function setFloatingPanelPosition(id: FloatingPanelId, position: FloatingPanelPosition): void {
  setFloatingPanelPositions((current) => ({ ...current, [id]: position }))
}

function setFloatingPanelLastAction(id: FloatingPanelId, action: FloatingPanelLastAction): void {
  setFloatingPanelLastActions((current) => ({ ...current, [id]: action }))
}

function clampFloatingPanelPosition(
  id: FloatingPanelId,
  x: number,
  y: number,
): FloatingPanelPosition {
  const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth || 1024
  const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight || 768
  const size = floatingPanelSize(id)
  const gutter = viewportWidth <= 520 ? 8 : 12
  const topSafeArea = viewportWidth <= 520 ? 44 : 54
  const halfWidth = size.width / 2
  const halfHeight = Math.min(size.height, Math.max(120, viewportHeight - topSafeArea - gutter)) / 2
  const minX = halfWidth + gutter
  const maxX = Math.max(minX, viewportWidth - halfWidth - gutter)
  const minY = halfHeight + topSafeArea
  const maxY = Math.max(minY, viewportHeight - halfHeight - gutter)
  return {
    x: Math.round(Math.min(maxX, Math.max(minX, x))),
    y: Math.round(Math.min(maxY, Math.max(minY, y))),
  }
}

function floatingPanelWithinBounds(id: FloatingPanelId): boolean {
  const position = floatingPanelPosition(id)
  const clamped = clampFloatingPanelPosition(id, position.x, position.y)
  return Math.abs(position.x - clamped.x) <= 1 && Math.abs(position.y - clamped.y) <= 1
}

function clampFloatingPanelToViewport(id: FloatingPanelId): void {
  const position = floatingPanelPosition(id)
  setFloatingPanelPosition(id, clampFloatingPanelPosition(id, position.x, position.y))
}

function clampFloatingPanelsToViewport(): void {
  const current = floatingPanelPositions()
  setFloatingPanelPositions({
    travel_dialog: current.travel_dialog
      ? clampFloatingPanelPosition("travel_dialog", current.travel_dialog.x, current.travel_dialog.y)
      : null,
    offline_return: current.offline_return
      ? clampFloatingPanelPosition("offline_return", current.offline_return.x, current.offline_return.y)
      : null,
    settings: current.settings
      ? clampFloatingPanelPosition("settings", current.settings.x, current.settings.y)
      : null,
  })
}

function beginQuestPanelDrag(event: PointerEvent): void {
  if (event.button !== 0) return
  const target = event.target instanceof Element ? event.target : null
  if (target?.closest("button")) return

  event.preventDefault()
  event.stopPropagation()

  const current = questPanelPosition()
  questPanelDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: current.x,
    originY: current.y,
    moved: false,
  }
  setQuestPanelDragging(true)
  setLastQuestPanelAction("dragging")
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)
  handle.classList.add("dragging")
}

function dragQuestPanel(event: PointerEvent): void {
  if (!questPanelDrag || questPanelDrag.pointerId !== event.pointerId) return
  event.preventDefault()
  event.stopPropagation()
  const nextX = questPanelDrag.originX + event.clientX - questPanelDrag.startX
  const nextY = questPanelDrag.originY + event.clientY - questPanelDrag.startY
  if (Math.abs(nextX - questPanelDrag.originX) + Math.abs(nextY - questPanelDrag.originY) > 4) {
    questPanelDrag.moved = true
  }
  setQuestPanelPosition(clampQuestPanelPosition(nextX, nextY))
}

function endQuestPanelDrag(event: PointerEvent): void {
  if (!questPanelDrag || questPanelDrag.pointerId !== event.pointerId) return
  event.preventDefault()
  event.stopPropagation()
  const handle = event.currentTarget as HTMLElement
  handle.releasePointerCapture(event.pointerId)
  handle.classList.remove("dragging")
  setQuestPanelDragging(false)
  setLastQuestPanelAction(questPanelDrag.moved ? "dragged" : "idle")
  questPanelDrag = null
}

function handleQuestPanelKeyboard(event: KeyboardEvent): void {
  const keyOffsets: Record<string, readonly [number, number]> = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  }
  const offset = keyOffsets[event.key]
  if (offset) {
    event.preventDefault()
    event.stopPropagation()
    const step = event.shiftKey ? 48 : 16
    const current = questPanelPosition()
    setQuestPanelPosition(
      clampQuestPanelPosition(current.x + offset[0] * step, current.y + offset[1] * step),
    )
    setLastQuestPanelAction("keyboard_moved")
    return
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault()
    event.stopPropagation()
    toggleFirstPlayablePanel()
  }
}

function toggleFirstPlayablePanel(): void {
  const nextCollapsed = !firstPlayableCollapsed()
  setFirstPlayableCollapsed(nextCollapsed)
  setLastQuestPanelAction(nextCollapsed ? "collapsed" : "expanded")
  window.requestAnimationFrame(() => {
    const current = questPanelPosition()
    setQuestPanelPosition(clampQuestPanelPosition(current.x, current.y))
  })
}

function clampQuestPanelPosition(x: number, y: number): QuestPanelPosition {
  const panel = document.getElementById("first-playable-panel")
  const panelWidth = panel?.offsetWidth ?? 390
  const panelHeight = panel?.offsetHeight ?? (firstPlayableCollapsed() ? 82 : 360)
  const viewportWidth = window.innerWidth || 1024
  const viewportHeight = window.innerHeight || 768
  const gutter = viewportWidth <= 520 ? 10 : 12
  const topSafeArea = viewportWidth <= 520 ? 46 : 54
  const maxX = Math.max(gutter, viewportWidth - panelWidth - gutter)
  const maxY = Math.max(topSafeArea, viewportHeight - panelHeight - gutter)
  return {
    x: Math.round(Math.min(maxX, Math.max(gutter, x))),
    y: Math.round(Math.min(maxY, Math.max(topSafeArea, y))),
  }
}

function resourceRows(): unknown {
  return ResourceList({
    resources: () => uiState()?.resources.slice(0, 6) ?? [],
    format: formatResource,
  })
}

function adminStoryBrowserPanel(): unknown {
  const state = storyContentBrowserState()
  if (!state) {
    return html`
      <section
        id="admin-story-browser"
        class="panel admin-story-panel keyboard-section"
        tabindex="0"
        data-qa=${ADD_QA_SELECTORS.storyBrowser}
        data-action-id=${ADD_QA_ACTION_IDS.storyOpenContext}
        aria-label="Admin story content section"
      >
        <div class="panel-heading">
          <span>Story content</span>
          <span class="small-chip">Waiting</span>
        </div>
        <p class="admin-panel-copy">Story diagnostics will appear after the runtime snapshot loads.</p>
      </section>
    `
  }
  return html`
    <section
      id="admin-story-browser"
      class="panel admin-story-panel keyboard-section"
      tabindex="0"
      data-qa=${ADD_QA_SELECTORS.storyBrowser}
      data-action-id=${ADD_QA_ACTION_IDS.storyOpenContext}
      aria-label="Admin story content section"
    >
      <div class="panel-heading">
        <span>Story content</span>
        <span class="small-chip">${state.contentValidationVersion}</span>
      </div>
      <p class="admin-panel-copy">
        Read-only story projection. Rust owns active beat selection, completion, choices, and saved
        state; beat eligibility is a TS best-effort diagnostic mirror.
      </p>

      ${/* The opening arc's beats, with live status. This is the surface the
          element describes, so the disclosure belongs here rather than as a
          panel of its own. */ ""}
      ${schemaContext("ui.panel.narrative", "What the opening arc involves")}

      <div class="story-browser-summary" aria-label="Story content summary">
        <article>
          <span>Active</span>
          <strong>${state.activeBeat?.label ?? "None"}</strong>
          <code>${state.activeBeat?.id ?? "story.none"}</code>
        </article>
        <article>
          <span>Completed</span>
          <strong>${state.summary.completedCount}</strong>
          <code>${`${state.summary.eligibleCount} eligible`}</code>
        </article>
        <article>
          <span>Commands</span>
          <strong>${state.summary.enabledCommandCount}/${state.summary.commandCount}</strong>
          <code>enabled</code>
        </article>
        <article>
          <span>Eligibility</span>
          <strong>TS mirror</strong>
          <code>${state.authority.beatEligibility}</code>
        </article>
      </div>

      <details class="story-browser-fold" open>
        <summary>Active beat</summary>
        ${state.activeBeat
          ? html`
              <article class="story-browser-active">
                <strong>${state.activeBeat.label}</strong>
                <code>${state.activeBeat.id}</code>
                <small>
                  ${`${state.activeBeat.arc} · sequence ${state.activeBeat.sequence} · priority ${state.activeBeat.priority}`}
                </small>
              </article>
            `
          : html`<p class="story-browser-empty">No active beat selected by the runtime.</p>`}
      </details>

      <details class="story-browser-fold">
        <summary>Completed beats</summary>
        ${state.completedBeats.length > 0
          ? html`<ul class="story-browser-list">${storyBrowserBeatRows(() => state.completedBeats)}</ul>`
          : html`<p class="story-browser-empty">No completed story beats yet.</p>`}
      </details>

      <details class="story-browser-fold">
        <summary>Choices made</summary>
        ${state.choicesMade.length > 0
          ? html`<ul class="story-browser-list">${storyBrowserChoiceRows(() => state.choicesMade)}</ul>`
          : html`<p class="story-browser-empty">No story choices committed yet.</p>`}
      </details>

      <details class="story-browser-fold">
        <summary>Qualities</summary>
        ${state.qualities.length > 0
          ? html`<ul class="story-browser-list story-browser-pair-list">${storyBrowserQualityRows(() => state.qualities)}</ul>`
          : html`<p class="story-browser-empty">No narrative qualities are set.</p>`}
      </details>

      <details class="story-browser-fold" data-qa=${ADD_QA_SELECTORS.storyCommands}>
        <summary>Available commands</summary>
        <ul class="story-browser-list">${storyBrowserCommandRows(() => state.availableCommands)}</ul>
      </details>

      <details class="story-browser-fold">
        <summary>Beat eligibility · TS best-effort</summary>
        <ul class="story-browser-list story-browser-eligibility">
          ${storyBrowserEligibilityRows(() => state.beatEligibility)}
        </ul>
      </details>
    </section>
  `
}

function discoveryPhaseLabel(): string {
  switch (discoveryState()?.phase) {
    case "movement":
      return "Movement"
    case "enter_dungeon":
      return "Entrance"
    case "act":
      return "Action"
    case "choose_tile":
      return "Choice"
    default:
      return "Waiting"
  }
}

function contextualPanel(): unknown {
  if (offlineReturnSummary()) return offlineReturnPanel()
  if (mapMode() === "base_square") return baseManagementPanel()
  if (mapMode() === "dungeon_square") return dungeonContextPanel()
  return null
}

function worldErrorState(): unknown {
  if (!lastError()) return null
  return html`
    <div
      id="map-error-state"
      class="shell-state-layer error"
      data-visual-state="error"
      role="alert"
      aria-live="assertive"
    >
      <span>World state paused</span>
      <strong>Something needs attention before the run can continue.</strong>
      <small>Open Admin recovery to inspect save and runtime controls.</small>
      <button
        type="button"
        class="ghost-button"
        onClick=${() => {
          setShellMenuOpen(false)
          setAdminOpen(true)
        }}
      >
        Open recovery
      </button>
    </div>
  `
}

function discoveryPanel(): unknown {
  const link = () => heroDungeonLink()
  return html`
    <section
      id="discovery-panel"
      data-interface-tier="secondary"
      data-interface-answer="current-decision-action"
      class=${() =>
        [
          "panel discovery-panel",
          discoveryPanelCollapsed() ? "collapsed" : "",
          mobileDiscoveryDetailOpen() ? "detail-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      data-mobile-sheet-state=${() => discoveryMobileSheetState()}
      data-visual-surface="context"
      role="region"
      aria-labelledby="discovery-panel-title"
    >
      <div class="panel-heading discovery-heading">
        <span id="discovery-panel-title">Discovery</span>
        <div>
          ${() =>
            link()
            ? html`<button
                id="enter-dungeon"
                type="button"
                class="enter-dungeon-button contextual-action-button"
                aria-label=${() => `Enter ${link()?.label ?? "discovered dungeon"}`}
                onClick=${() => {
                  const currentLink = link()
                  if (currentLink) enterDungeonLink(currentLink)
                }}
              >
                Enter ${link()?.label}
              </button>`
            : null}
          <span class="small-chip">${() => discoveryPhaseLabel()}</span>
          <button
            id="toggle-discovery-panel"
            type="button"
            class="ghost-button discovery-toggle"
            onClick=${toggleDiscoveryPanel}
            aria-expanded=${() => !discoveryPanelCollapsed()}
            aria-controls="discovery-panel-body"
          >
            ${() => (discoveryPanelCollapsed() ? "Open" : "Hide")}
          </button>
          <button
            id="toggle-discovery-detail"
            type="button"
            class="ghost-button mobile-detail-toggle"
            onClick=${toggleDiscoveryDetail}
            aria-expanded=${() => mobileDiscoveryDetailOpen()}
            aria-controls="discovery-panel-body"
          >
            ${() => (mobileDiscoveryDetailOpen() ? "Action" : "Details")}
          </button>
        </div>
      </div>
      ${() => currentActionSurface()}
      ${() => discoveryPanelBody()}
    </section>
  `
}

function discoveryMobileSheetState(): "compact" | "action" | "detail" {
  if (discoveryPanelCollapsed()) return "compact"
  return mobileDiscoveryDetailOpen() ? "detail" : "action"
}

function toggleDiscoveryPanel(): void {
  const nextCollapsed = !discoveryPanelCollapsed()
  setDiscoveryPanelCollapsed(nextCollapsed)
  if (nextCollapsed) setMobileDiscoveryDetailOpen(false)
}

function toggleDiscoveryDetail(): void {
  if (discoveryPanelCollapsed()) setDiscoveryPanelCollapsed(false)
  setMobileDiscoveryDetailOpen((open) => !open)
}

function baseManagementPanel(): unknown {
  const state = baseManagementState()
  if (!state) return null
  const entrance = () => baseDungeonEntranceInteraction()
  const section = activeBaseManagementSection(state)
  const focusedSystemTab = () => ["build", "power", "social", "expeditions", "resonance", "processing"].includes(baseManagementTab())
  return html`
    <section
      id="base-management-panel"
      data-interface-tier="secondary"
      data-interface-answer="current-decision-action"
      class="panel base-management-panel"
      data-visual-surface="context"
      role="region"
      aria-labelledby="base-management-panel-title"
      data-tab=${() => baseManagementTab()}
    >
      <div class="panel-heading base-management-heading">
        <span id="base-management-panel-title">${state.title}</span>
        <div>
          ${() =>
            entrance()
            ? html`<button
                id="enter-studio-dungeon"
                type="button"
                class="enter-dungeon-button contextual-action-button"
                aria-label=${() => entrance()?.label ?? "Enter Studio dungeon"}
                onClick=${() => {
                  const currentEntrance = entrance()
                  if (currentEntrance) enterDungeonInteraction(currentEntrance)
                }}
              >
                ${entrance()?.label ?? "Enter dungeon"}
              </button>`
            : null}
          <span class="small-chip">${() => titleCase(baseManagementTab())}</span>
        </div>
      </div>
      ${() => currentActionSurface()}
      ${basePlayerLoopPanel({ state: () => state, onSelectTab: (tabId) => setBaseManagementTab(tabId as AddBaseManagementTabId), renderPlanDetail: (args) => copyDisclosure(args.id, args.summary, args.fullCopy, args.visibleCopy, args.className) })}
      ${() => baseManagementCommandStrip(state)}
      ${() => baseRateChangePanel()}
      <div class="base-management-tabs" role="tablist" aria-label="Base management sections">
        ${() => baseManagementTabButtons(state)}
      </div>
      <div class="base-management-body">
        ${() => focusedSystemTab()
          ? null
          : html`
              <article
                class="base-section-summary keyboard-section"
                data-severity=${section?.blockedReason ? "warning" : "neutral"}
                tabindex="0"
                aria-label="Base section summary"
              >
                <span>${section?.headline ?? state.subtitle}</span>
                <small>${section?.detail ?? state.nextBottleneck.detail}</small>
              </article>
            `}
        ${() => baseManagementLeadPanel(state)}
        ${() => focusedSystemTab()
          ? null
          : html`
              <div class="base-metric-grid">
                ${baseManagementMetricRows(() => section)}
              </div>
            `}
        ${() => baseManagementTabContent(state)}
      </div>
    </section>
  `
}

function baseManagementCommandStrip(state: AddBaseManagementState): unknown {
  return html`
    <article
      id="base-bottleneck-strip"
      class="base-bottleneck-strip keyboard-section"
      data-severity=${state.nextBottleneck.severity}
      tabindex="0"
      aria-label="Base bottleneck and rate watch"
    >
      <div class="base-bottleneck-primary">
        <span>Bottleneck</span>
        <strong>${state.nextBottleneck.label}</strong>
        <small title=${state.nextBottleneck.detail}>${leadUiCopy(state.nextBottleneck.detail, 58)}</small>
      </div>
      <div class="base-bottleneck-action">
        <span>Why now</span>
        <strong>${state.recommendedAction.label}</strong>
        <small title=${state.recommendedAction.detail}>${leadUiCopy(state.recommendedAction.detail, 58)}</small>
      </div>
      <div class="base-bottleneck-rates" aria-label="Current base rates">
        ${() => baseRateWatchChips(state)}
      </div>
      <span class="base-command-note">Start with the highlighted Base action, then watch rates and the 1m forecast change.</span>
    </article>
  `
}

function baseRateWatchChips(state: AddBaseManagementState): readonly unknown[] {
  const rates = state.playerLoop.rateWatch.rates.slice(0, 3)
  if (rates.length === 0) {
    return [html`<span data-direction="flat">Rates flat</span>`]
  }
  return rates.map(
    (rate) => html`
      <span data-direction=${rate.netPerSecond > 0 ? "up" : rate.netPerSecond < 0 ? "down" : "flat"}>
        ${rate.copy}
      </span>
    `,
  )
}

function dungeonContextPanel(): unknown {
  const dungeon = dungeonObjectiveState()
  const currentStep = () => currentDungeonObjectiveStep(dungeon)
  return html`
    <section
      id="dungeon-context-panel"
      data-interface-tier="secondary"
      data-interface-answer="current-decision-action"
      class="panel dungeon-context-panel"
      data-visual-surface="context"
      role="region"
      aria-labelledby="dungeon-context-panel-title"
    >
      <div class="panel-heading dungeon-context-heading">
        <span id="dungeon-context-panel-title">${dungeon?.label ?? "Dungeon"}</span>
        <button
          id="return-overworld"
          type="button"
          class="primary-action mode-primary-action return-overworld-button"
          onClick=${() => returnToOverworldFromDungeon()}
          aria-label=${() => dungeonReturnLabel()}
        >
          ${() => dungeonReturnLabel()}
        </button>
      </div>
      <article
        class="dungeon-mode-summary keyboard-section"
        tabindex="0"
        aria-label="Dungeon status summary"
      >
        <span>Dungeon status</span>
        <strong>${dungeon?.headline ?? "Explore the interior"}</strong>
        <small title=${dungeon?.detail ?? "Explore the interior and return when ready."}>
          ${leadUiCopy(dungeon?.detail ?? "Explore the interior and return when ready.", 62)}
        </small>
      </article>
      <div class="dungeon-context-grid">
        <article
          class="dungeon-context-card emphasis keyboard-section"
          tabindex="0"
          aria-label="Dungeon current objective"
        >
          <span>Current objective</span>
          <strong>${currentStep()?.label ?? dungeon?.headline ?? "Get your bearings"}</strong>
          <small title=${currentStep()?.detail ?? dungeon?.detail ?? "Inspect the room, then return when ready."}>
            ${leadUiCopy(
              currentStep()?.detail ?? dungeon?.detail ?? "Inspect the room, then return when ready.",
              62,
            )}
          </small>
        </article>
        <article
          class="dungeon-context-card keyboard-section"
          tabindex="0"
          aria-label="Dungeon discovered exits"
        >
          <span>Discovered exits</span>
          <div class="dungeon-context-list">
            ${() => dungeonExitRows(dungeon)}
          </div>
        </article>
        <article
          class="dungeon-context-card keyboard-section"
          tabindex="0"
          aria-label="Dungeon blockers"
        >
          <span>Blockers</span>
          <div class="dungeon-context-list">
            ${() => dungeonBlockerRows()}
          </div>
        </article>
        <article
          class="dungeon-context-card local-map keyboard-section"
          tabindex="0"
          aria-label="Dungeon local map state"
        >
          <span>Local map</span>
          <div class="dungeon-map-metrics">
            ${() => dungeonLocalMapMetricRows()}
          </div>
        </article>
      </div>
    </section>
  `
}

function currentDungeonObjectiveStep(
  dungeon: ReturnType<typeof dungeonObjectiveState>,
): AddDungeonObjectiveStep | null {
  return dungeon?.steps.find((step) => step.id === dungeon.currentStepId) ?? null
}

function dungeonExitRows(dungeon: ReturnType<typeof dungeonObjectiveState>): readonly unknown[] {
  const info = mapInfo()
  const exits = [
    ...(info.character.dungeonLinksAtCell ?? []),
    ...(info.dungeonLinks.selected ?? []),
  ]
  const uniqueExits = Array.from(new Map(exits.map((exit) => [exit.targetMapId ?? exit.id, exit])).values())
  return [
    html`
      <span class="dungeon-context-row available">
        <strong>${dungeon?.returnLabel ?? "Return to overworld"}</strong>
        <small>Known route back to the outside map.</small>
      </span>
    `,
    ...(uniqueExits.length > 0
      ? uniqueExits.map(
          (exit) => html`
            <span class="dungeon-context-row ${exit.enabled ? "available" : "blocked"}">
              <strong>${exit.label}</strong>
              <small>${exit.enabled ? "Discovered and usable." : "Discovered but blocked for now."}</small>
            </span>
          `,
        )
      : [
          html`
            <span class="dungeon-context-row muted">
              <strong>No additional exits found</strong>
              <small>Explore visible rooms to reveal more interior links later.</small>
            </span>
          `,
        ]),
  ]
}

function dungeonBlockerRows(): readonly unknown[] {
  const info = mapInfo()
  const rows: unknown[] = []
  const activeBlocker = info.character.blockedReason ?? info.travel.blockedReason
  if (activeBlocker) {
    rows.push(html`
      <span class="dungeon-context-row blocked">
        <strong>Movement blocked</strong>
        <small>${titleCase(activeBlocker.replaceAll("_", " "))}</small>
      </span>
    `)
  }
  if (info.visibility.hiddenCells > 0) {
    rows.push(html`
      <span class="dungeon-context-row watch">
        <strong>${info.visibility.hiddenCells} hidden cells</strong>
        <small>Line of sight is still limiting what the Hero knows.</small>
      </span>
    `)
  }
  if (info.cells.blocked > 0) {
    rows.push(html`
      <span class="dungeon-context-row watch">
        <strong>${info.cells.blocked} walls or sealed cells</strong>
        <small>These shape movement and future encounter routes.</small>
      </span>
    `)
  }
  if (rows.length === 0) {
    rows.push(html`
      <span class="dungeon-context-row available">
        <strong>No immediate blocker</strong>
        <small>The local route is currently open.</small>
      </span>
    `)
  }
  return rows
}

function dungeonLocalMapMetricRows(): readonly unknown[] {
  const info = mapInfo()
  return [
    ["Visible", `${info.visibility.visibleCells}`],
    ["Hidden", `${info.visibility.hiddenCells}`],
    ["Blocked", `${info.cells.blocked}`],
    ["Hero", info.character.cell ?? "Unknown"],
    ["Selected", info.interaction.selectedCell ?? "None"],
    ["Facing", titleCase(info.character.facing ?? "unknown")],
  ].map(
    ([label, value]) => html`
      <span>
        <small>${label}</small>
        <strong>${value}</strong>
      </span>
    `,
  )
}

/**
 * Is anything making this resource right now?
 *
 * The rate lives on the base-management projection rather than the status
 * summary, and that projection only exists once there is a base — which is
 * correct here: before the Studio nothing produces anything, so an absent
 * projection and a zero rate mean the same thing.
 */
function resourceIsProducing(resourceId: string): boolean {
  const row = baseManagementState()?.resources.find((entry) => entry.id === resourceId)
  return (row?.gainPerSecond ?? 0) > 0
}

function resourceStatusStrip(): unknown {
  const resources = uiState()?.resources ?? []
  const priorityIds = [RESOURCE_BASSLINE, RESOURCE_CHORUS, RESOURCE_STONE, RESOURCE_WATER]
  const prioritized = priorityIds
    .map((id) => resources.find((resource) => resource.id === id))
    .filter((resource): resource is AddUiState["resources"][number] => Boolean(resource))
    // A resource the player has none of and is not making is not information —
    // it is four zeroes sitting in the status bar for the whole opening, which
    // teaches that the bar is not worth reading. They appear the moment there
    // is stock or something producing.
    .filter((resource) => resource.value > 0 || resourceIsProducing(resource.id))
    .slice(0, 4)
  if (prioritized.length === 0) return null

  return html`
    <div
      id="resource-status-strip"
      class="resource-status-strip"
      data-label-mode=${() => resourceStatusLabelMode()}
      data-interface-tier="tertiary"
      role="list"
      aria-label="Key resources"
    >
      ${() =>
        prioritized.map(
          (resource) => html`
            <span
              data-resource=${resource.id}
              role="listitem"
              title=${resourceStatusTooltip(resource)}
              aria-label=${resourceStatusAriaLabel(resource)}
            >
              <small>
                <span class="resource-label-compact" aria-hidden="true">
                  ${resourceCompactLabel(resource.id, resource.label)}
                </span>
                <span class="resource-label-full">${resource.label}</span>
              </small>
              <strong>${formatResource(resource.value)}</strong>
            </span>
          `,
        )}
    </div>
  `
}

function resourceStatusLabelMode(): "expanded" | "compact" {
  return firstPlayableArcComplete() ? "compact" : "expanded"
}

function resourceStatusTooltip(resource: AddUiState["resources"][number]): string {
  const cap = resource.cap > 0 ? ` / ${formatResource(resource.cap)} cap` : ""
  const blocker = resource.blocker ? ` Blocked: ${resource.blocker}` : ""
  return `${resource.label}: ${formatResource(resource.value)}${cap}. Source: ${resource.source}. Used for: ${resource.sink}.${blocker}`
}

function resourceStatusAriaLabel(resource: AddUiState["resources"][number]): string {
  const blocker = resource.blocker ? ` Blocked: ${resource.blocker}.` : ""
  return `${resource.label}, ${formatResource(resource.value)} of ${formatResource(resource.cap)}. Source: ${resource.source}. Used for ${resource.sink}.${blocker}`
}

function resourceCompactLabel(id: string, label: string): string {
  switch (id) {
    case RESOURCE_BASSLINE:
      return "B"
    case RESOURCE_CHORUS:
      return "C"
    case RESOURCE_STONE:
      return "S"
    case RESOURCE_WATER:
      return "W"
    default:
      return label.slice(0, 1).toUpperCase()
  }
}

function storyMoment(): AddStoryMoment | null {
  const currentSnapshot = snapshot()
  const currentCatalog = catalog()
  if (!currentSnapshot || !currentCatalog) return null
  return selectAddStoryMoment(currentSnapshot, currentCatalog)
}

function copyDisclosure(
  id: string,
  summary: string,
  fullCopy: string | null | undefined,
  visibleCopy: string,
  className = "",
): unknown {
  return createComponent(Disclosure, { id, summary, fullCopy, visibleCopy, class: className })
}

// The narrative moment stays inside the unified decision surface. The primary
// CTA below owns the recommended action; alternate choices are secondary so the
// player does not see several competing "next actions" at once.
/**
 * The ink scene for the beat on screen, or null when this beat renders from
 * the authored catalog `body`. Keyed on the beat id so a scene left over from
 * a previous beat is never shown against the wrong one.
 */
function activeInkScene(): InkSceneSnapshot | null {
  const narrative = snapshot()?.narrative
  const scene = narrative?.inkScene ?? null
  if (!scene || !narrative?.activeBeatId) return null
  return scene.beatId === narrative.activeBeatId ? scene : null
}

function storyMomentBlock(): unknown {
  const moment = storyMoment()
  // Show the active beat as the always-on narrative driver: the body for every
  // beat (the current story chapter / ongoing goal), with choices only when the
  // beat is actually a decision. (Previously gated to awaitingChoice, which left
  // the surface blank for the 7 no-choice spine beats.)
  if (!moment) return null
  return html`
    <details
      id="story-context-section"
      class="context-detail-section story-context-section"
      data-action-id=${ADD_QA_ACTION_IDS.storyOpenContext}
    >
      <summary>
        <span>Story context</span>
        <small>${moment.label}</small>
      </summary>
      <div class="context-detail-body">
        <div
          class="story-moment"
          data-arc=${moment.arc}
          data-awaiting=${moment.awaitingChoice}
          aria-label=${`Story moment: ${moment.label}`}
        >
          <div class="story-moment-kicker">${moment.label}</div>
          ${activeInkScene()
            ? html`
                <div class="story-moment-ink" data-source="ink">
                  ${activeInkScene()!.lines.map(
                    (line) => html`
                      <p
                        class="story-moment-body"
                        data-speaker=${line.tags.find((tag) => tag.startsWith("speaker:"))?.slice(8) ?? ""}
                        data-mood=${line.tags.find((tag) => tag.startsWith("mood:"))?.slice(5) ?? ""}
                        title=${line.text}
                      >
                        ${line.text}
                      </p>
                    `,
                  )}
                </div>
              `
            : html`<p class="story-moment-body" title=${moment.body}>
                ${leadUiCopy(moment.body, 88)}
              </p>`}
          ${copyDisclosure(
            `story-moment-detail-${safeElementId(moment.beatId)}`,
            "Read more",
            moment.body,
            leadUiCopy(moment.body, 88),
            "story-moment-detail",
          )}
          ${activeInkScene() && activeInkScene()!.choices.length > 0
            ? html`
                <details class="story-moment-options" open>
                  <summary>Story choices</summary>
                  <div class="story-moment-choices" data-source="ink">
                    ${activeInkScene()!.choices.map(
                      (choice) => html`
                        <button
                          type="button"
                          class="story-moment-choice"
                          data-choice-id=${choice.choiceId ?? `ink:${choice.index}`}
                          data-ink-index=${String(choice.index)}
                          data-action-id=${`story-choice:${activeInkScene()!.beatId}:${choice.choiceId ?? `ink-${choice.index}`}`}
                          onClick=${() => void chooseInkChoice(activeInkScene()!.beatId, choice.index)}
                        >
                          ${choice.text}
                        </button>
                      `,
                    )}
                  </div>
                </details>
              `
            : moment.choices.length > 0
            ? html`
                <details class="story-moment-options">
                  <summary>Story choices</summary>
                  <div class="story-moment-choices">
                    ${moment.choices.map(
                      (choice) => html`
                        <button
                          type="button"
                          class="story-moment-choice"
                          data-choice-id=${choice.id}
                          data-action-id=${`story-choice:${moment.beatId}:${choice.id}`}
                          onClick=${() => void chooseStoryOption(moment.beatId, choice.id)}
                        >
                          ${choice.label}
                        </button>
                      `,
                    )}
                  </div>
                </details>
              `
            : null}
        </div>
      </div>
    </details>
  `
}

function currentActionSurface(): unknown {
  return html`
    <article
      id="current-action-surface"
      class="current-action-surface keyboard-section"
      data-qa=${ADD_QA_SELECTORS.currentAction}
      data-source=${() => currentActionState().source}
      data-kind=${() => currentActionState().kind}
      data-enabled=${() => (currentActionState().enabled ? "true" : "false")}
      tabindex="0"
      data-keyboard-section="true"
      aria-live="polite"
      aria-label="Current action"
    >
      <div class="current-action-kicker">
        <span>Current decision</span>
        <small>${() => currentActionKickerMeta()}</small>
      </div>
      <dl class="decision-brief" aria-label="Decision brief">
        <div data-question="what-should-i-do">
          <dt>Do now</dt>
          <dd title=${() => currentActionState().label}>
            ${() => leadUiCopy(currentActionState().label, 44)}
          </dd>
        </div>
        <div data-question="what-if-i-wait">
          <dt>Wait</dt>
          <dd title=${() => interfaceHierarchyState().questions.whatHappensIfIWait}>
            ${() => leadUiCopy(interfaceHierarchyState().questions.whatHappensIfIWait, 54)}
          </dd>
        </div>
        <div data-question="what-changed">
          <dt>Changed</dt>
          <dd title=${() => interfaceHierarchyState().questions.whatChanged}>
            ${() => leadUiCopy(interfaceHierarchyState().questions.whatChanged, 48)}
          </dd>
        </div>
        <div data-question="where-am-i">
          <dt>Where</dt>
          <dd title=${() => interfaceHierarchyState().questions.whereAmI}>
            ${() => leadUiCopy(interfaceHierarchyState().questions.whereAmI, 48)}
          </dd>
        </div>
      </dl>
      ${() =>
        copyDisclosure(
          "current-action-detail",
          "Why",
          currentActionState().detail,
          currentActionState().label,
          "current-action-more",
        )}
      ${() =>
        currentActionState().progressLabel
          ? html`<em
              class="current-action-progress"
              title=${() => currentActionState().progressLabel ?? ""}
            >
              ${() => leadUiCopy(currentActionState().progressLabel, 72)}
            </em>`
          : null}
      ${() =>
        currentActionState().primaryLabel
          ? html`
              <button
                id="current-action-primary"
                type="button"
                data-action-id=${() => currentActionState().actionId ?? ""}
                class="primary-action"
                data-key-action="confirm"
                aria-keyshortcuts="Enter"
                onClick=${() => void runCurrentAction()}
                disabled=${() => !currentActionState().primaryEnabled}
                aria-label=${() => currentActionPrimaryAriaLabel()}
              >
                ${() => currentActionState().primaryLabel}
              </button>
            `
          : null}
    </article>
  `
}

function currentActionKickerMeta(): string {
  const action = currentActionState()
  const parts = [action.sourceLabel, action.metaLabel].filter((part) => part.length > 0)
  return parts.join(" · ")
}

function currentActionPrimaryAriaLabel(): string {
  const action = currentActionState()
  const label = action.primaryLabel ?? "Current action"
  return action.primaryEnabled ? label : `${label} unavailable: ${action.detail}`
}

function interfaceHierarchyState(): AddInterfaceHierarchyState {
  const action = currentActionState()
  const questions = {
    whereAmI: interfaceWhereCopy(),
    whatChanged: interfaceChangedCopy(),
    whatShouldIDoNow: action.label,
    whatHappensIfIWait: interfaceWaitCopy(),
  }
  return {
    primary: {
      label: "Map",
      answer: questions.whereAmI,
    },
    secondary: {
      label: "Decision",
      answer: questions.whatShouldIDoNow,
      actionLabel: action.label,
      actionEnabled: action.enabled,
    },
    tertiary: {
      label: "Status",
      answer: interfaceStatusCopy(),
      waitForecast: questions.whatHappensIfIWait,
    },
    settings: {
      label: "Settings",
      hiddenByDefault: true,
      open: settingsOpen(),
      presentation: "hex_window",
      motion: reducedMotionMode(),
      autosave: autosaveEnabled(),
      audio: {
        muted: playerSettings().muted,
        masterVolume: playerSettings().masterVolume,
        musicVolume: playerSettings().musicVolume,
        sfxVolume: playerSettings().sfxVolume,
        effectiveMusicVolume: effectiveMusicVolume(playerSettings()),
        effectiveSfxVolume: effectiveSfxVolume(playerSettings()),
      },
      map: {
        showTravelActionMarkers: playerSettings().showTravelActionMarkers,
      },
    },
    advanced: {
      label: "Tools",
      hiddenByDefault: true,
      adminOpen: adminOpen(),
      developerOpen: devToolsOpen(),
      runtimeInternalsHiddenByDefault: true,
    },
    questions,
  }
}

function currentActionState(
  options: { readonly ignoreOfflineReturn?: boolean } = {},
): AddCurrentActionState {
  const offline = offlineReturnSummary()
  if (offline && !options.ignoreOfflineReturn) {
    return {
      source: "offline_return",
      sourceLabel: "Return review",
      label: "Review what changed",
      detail: offline.summary,
      kind: offline.source,
      enabled: true,
      primaryLabel: "Dismiss review",
      primaryEnabled: true,
      metaLabel: offline.elapsedLabel,
      progressLabel: offline.headline,
      actionId: "dismiss_offline_return",
    }
  }

  const dungeon = dungeonObjectiveState()
  if (mapMode() === "dungeon_square" && dungeon) {
    return {
      source: "dungeon_objective",
      sourceLabel: "Dungeon objective",
      label: dungeon.headline,
      detail: dungeon.detail,
      kind: dungeon.active ? "active" : "complete",
      enabled: dungeon.active,
      primaryLabel: dungeon.returnLabel,
      primaryEnabled: true,
      metaLabel: dungeon.label,
      progressLabel: objectivePanelChip(),
      actionId: "return_overworld",
    }
  }

  const firstPlayable = uiState()?.firstPlayable
  const firstStep = currentFirstPlayableStep()
  const travelLoop = travelLoopCurrentAction()
  if (travelLoop) return travelLoop

  const selectedTravel = selectedTravelCurrentAction()
  if (selectedTravel) return selectedTravel

  const baseHandoff = baseHandoffCurrentAction()
  if (baseHandoff) return baseHandoff

  const base = baseManagementState()
  if (mapMode() === "base_square" && base) {
    const executableFirstPlayableAction = currentFirstPlayableExecutableAction()
    if (
      firstPlayable &&
      !firstPlayable.complete &&
      firstStep &&
      executableFirstPlayableAction
    ) {
      const storyPrimary = uiState()?.storyProgression.primaryAction
      const label = firstStep.actionLabel ?? storyPrimary?.label ?? firstStep.label
      return {
        source: "base_loop",
        sourceLabel: "Base loop",
        label,
        detail: firstStep.action ? firstStep.detail : storyPrimary?.detail ?? firstStep.detail,
        kind: firstStep.id,
        enabled: true,
        primaryLabel: label,
        primaryEnabled: true,
        metaLabel: base.playerLoop.currentStepId.replaceAll("_", " "),
        progressLabel: firstStep.label,
        actionId: `first-playable:${firstStep.id}`,
      }
    }

    const action = base.recommendedAction
    return {
      source: "base_loop",
      sourceLabel: "Base loop",
      label: action.label,
      detail: action.detail,
      kind: action.kind,
      enabled: action.enabled,
      primaryLabel: action.enabled && action.targetId ? action.label : null,
      primaryEnabled: action.enabled && Boolean(action.targetId),
      metaLabel: base.playerLoop.currentStepId.replaceAll("_", " "),
      progressLabel: base.playerLoop.decisionHint,
      actionId: action.targetId,
    }
  }

  if (firstPlayable && !firstPlayable.complete && firstStep) {
    const routeStep =
      firstStep.id === OPENING_TRAVEL_STEP_ID
        ? openingRouteCurrentAction(firstPlayable.completedCount, firstPlayable.totalCount)
        : null
    if (routeStep) return routeStep
    return {
      source: "first_playable",
      sourceLabel: "First playable",
      label: firstStep.actionLabel ?? firstStep.label,
      detail: firstStep.detail,
      kind: firstStep.id,
      enabled: Boolean(firstStep.action),
      primaryLabel: firstStep.actionLabel,
      primaryEnabled: Boolean(firstStep.action),
      metaLabel: `${firstPlayable.completedCount}/${firstPlayable.totalCount}`,
      progressLabel: firstStep.label,
      actionId: firstStep.action ? `first-playable:${firstStep.id}` : null,
    }
  }

  const discovery = discoveryState()
  if (discovery) {
    const action = discovery.nextAction
    const link = discoveryActionLinkFor(action.actionId)
    const opensBase = action.actionId === ADD_DISCOVERY_OPEN_BASE_ACTION_ID
    return {
      source: "discovery",
      sourceLabel: "Discovery",
      label: action.label,
      detail: action.detail,
      kind: action.kind,
      enabled: action.enabled,
      primaryLabel: link || opensBase ? action.label : null,
      primaryEnabled: Boolean(link?.enabled || (opensBase && action.enabled)),
      metaLabel: discoveryPhaseLabel(),
      progressLabel: action.inputHint,
      actionId: action.actionId,
    }
  }

  return {
    source: "runtime",
    sourceLabel: "Loading",
    label: "Preparing world",
    detail: "The world state is loading. This should only take a moment.",
    kind: "boot",
    enabled: false,
    primaryLabel: null,
    primaryEnabled: false,
    metaLabel: ready() ? "Ready" : "Starting",
    progressLabel: null,
    actionId: null,
  }
}

function openingRouteCurrentAction(
  completedCount: number,
  totalCount: number,
): AddCurrentActionState | null {
  if (mapMode() !== "overworld_hex") return null
  const info = mapInfo()
  if (heroIsAtStudio(info)) return null
  const nextCell = nextOpeningRouteCell(info)
  if (!nextCell) return null
  const direction = routeDirectionLabel(info.character.cell, nextCell)
  const targetLabel = info.landmarks.baseCenter ? "The Studio" : "Base"
  return {
    source: "first_playable",
    sourceLabel: "Route objective",
    label: `Reach ${targetLabel}`,
    detail: `Move across adjacent regions toward ${targetLabel} to unlock Base management. Preview the next step, then confirm the 60-minute crossing from the travel card.`,
    kind: "route_to_studio",
    enabled: true,
    primaryLabel: "Preview route to Studio",
    primaryEnabled: true,
    metaLabel: `${completedCount}/${totalCount}`,
    progressLabel: direction ? `Next step ${direction} · 60 min crossing` : "Next step · 60 min crossing",
    actionId: OPENING_ROUTE_ACTION_ID,
  }
}

function travelLoopCurrentAction(): AddCurrentActionState | null {
  const experience = travelExperience()
  if (!experience) return null

  if (experience.phase === "traveling") {
    const minutes = Math.max(1, experience.toClockSeconds - experience.fromClockSeconds)
    return {
      source: "discovery",
      sourceLabel: "Travel",
      label: `Crossing to ${experience.event.destinationLabel}`,
      detail:
        "The Hero is spending the crossing hour now. Watch the clock, movement, and reveal halo finish together before choosing the next region.",
      kind: "traveling",
      enabled: false,
      primaryLabel: null,
      primaryEnabled: false,
      metaLabel: `${Math.round(minutes)} min`,
      progressLabel: "Hero moving · clock advancing · visibility opening",
      actionId: null,
    }
  }

  if (experience.phase === "arrived") {
    const movement = lastDiscoveryMovement()
    const baseHandoff = baseHandoffCurrentAction()
    if (baseHandoff) {
      return {
        ...baseHandoff,
        sourceLabel: "Arrival",
        detail: movement
          ? `${movementChangedCopy(movement)}. ${baseHandoff.detail}`
          : baseHandoff.detail,
	        metaLabel: "Studio reached",
	        progressLabel: movement
	          ? `Arrived at The Studio · ${movementChangedCopy(movement, { includeDestination: false })}`
	          : baseHandoff.progressLabel,
	      }
    }
    return {
      source: "discovery",
      sourceLabel: "Arrival",
      label: `Arrived at ${experience.event.destinationLabel}`,
      detail: movement
        ? movementChangedCopy(movement)
        : "The crossing is complete. Use the newly visible map edge to decide where to scout next.",
      kind: "arrived",
      enabled: true,
      primaryLabel: null,
      primaryEnabled: false,
      metaLabel: titleCase(experience.event.exposureRisk.replaceAll("_", " ")),
      progressLabel: movement ? movementChangedCopy(movement, { includeDestination: false }) : null,
      actionId: null,
    }
  }

  return null
}

function baseHandoffCurrentAction(): AddCurrentActionState | null {
  if (mapMode() !== "overworld_hex") return null
  const action = discoveryState()?.nextAction
  if (
    !action ||
    action.kind !== "open_base" ||
    action.actionId !== ADD_DISCOVERY_OPEN_BASE_ACTION_ID
  ) {
    return null
  }
  return {
    source: "discovery",
    sourceLabel: "Arrival",
    label: action.label,
    detail: `${action.detail} The Studio is now the active base anchor; opening Base will move from scouting decisions into crew, resources, power, and repairs.`,
    kind: action.kind,
    enabled: action.enabled,
    primaryLabel: action.label,
    primaryEnabled: action.enabled && baseViewTransition() === "idle",
    metaLabel: "Studio reached",
    progressLabel:
      baseViewTransition() === "idle"
        ? "Arrived at The Studio · Base management unlocked"
        : "Opening The Studio base view",
    actionId: action.actionId,
  }
}

function selectedTravelCurrentAction(): AddCurrentActionState | null {
  const discovery = discoveryState()
  const selected = discovery?.selectedTile
  if (!discovery || !selected?.travel.canTravelNow) return null

  return {
    source: "discovery",
    sourceLabel: "Travel",
    label: "Travel here",
    detail: `${selected.travel.gameMinutes} min will pass. ${selected.travel.copy}`,
    kind: "travel",
    enabled: true,
    primaryLabel: "Travel to this region",
    primaryEnabled: true,
    metaLabel: selected.label,
    progressLabel: `${selected.travel.gameMinutes} min · ${titleCase(selected.travel.risk.replaceAll("_", " "))}`,
    actionId: "travel:selected-tile",
  }
}

function returnReviewNextAction(): AddCurrentActionState {
  return currentActionState({ ignoreOfflineReturn: true })
}

function discoveryActionLinkFor(actionId: string | null): AddDiscoveryActionLink | null {
  if (!actionId) return null
  return discoveryState()?.actionLinks.find((candidate) => candidate.id === actionId) ?? null
}

function interfaceWhereCopy(): string {
  const info = mapInfo()
  if (mapMode() === "base_square") return "The Studio submap"
  if (mapMode() === "dungeon_square") {
    const objective = selectAddDungeonObjective({
      mapMode: mapMode(),
      dungeonMapId: dungeonTarget(),
      heroCell: info.character.cell,
    })
    return objective?.label ? `${objective.label} interior` : "Dungeon interior"
  }
  const currentEntrance = info.character.dungeonLinksAtCell[0]?.label
  if (currentEntrance) return `World at ${currentEntrance}`
  const selected = info.interaction.selectedLabel
  if (selected) return `World near ${selected}`
  return info.character.cell ? `World ${info.character.cell}` : addMapModeLabel(mapMode())
}

function interfaceChangedCopy(): string {
  const experience = travelExperience()
  if (experience?.phase === "traveling") return `Crossing to ${experience.event.destinationLabel} · 60m passing`
  if (experience?.phase === "arrived") {
    const movement = lastDiscoveryMovement()
    return movement
      ? movementChangedCopy(movement)
      : `Arrived at ${experience.event.destinationLabel}`
  }

  const movement = lastDiscoveryMovement()
  if (movement) return movementChangedCopy(movement)

  const selected = discoveryState()?.tileDetail?.label ?? mapInfo().interaction.selectedLabel
  if (selected) return `Selected ${selected}`

  const base = baseManagementState()
  if (base) return base.nextBottleneck.label

  return "Opening state is stable"
}

function movementChangedCopy(
  movement: AddDiscoveryMovementEvent,
  options: { readonly includeDestination?: boolean } = {},
): string {
  const includeDestination = options.includeDestination ?? true
  const revealed = movement.discoveredAfter - movement.discoveredBefore
  const toxicityDelta = movement.toxicityAfter - movement.toxicityBefore
  const parts: string[] = []
  if (includeDestination) parts.push(`Arrived at ${movement.destinationLabel}`)
  if (revealed > 0) parts.push(`${revealed} region${revealed === 1 ? "" : "s"} revealed`)
  if (toxicityDelta > 0) parts.push(`${Math.round(toxicityDelta * 100)}% toxicity`)
  if (movement.exposureRisk) {
    parts.push(titleCase(movement.exposureRisk.replaceAll("_", " ")))
  }
  return parts.length > 0 ? parts.join(" · ") : `Scouted ${movement.destinationLabel}`
}

function interfaceWaitCopy(): string {
  const base = baseManagementState()
  if (mapMode() === "base_square" && base) {
    const forecast = base.economy.waitForecasts[0]
    return forecast?.summary ?? base.economy.offlinePreview.summary
  }

  const experience = travelExperience()
  if (experience?.phase === "traveling") return "The hour is already passing"

  if (mapMode() === "dungeon_square") {
    return "Interior time is slow; base systems keep their state"
  }

  return "Clock advances; each adjacent crossing costs 60m"
}

function interfaceStatusCopy(): string {
  const resource = uiState()?.resources.find((candidate) => candidate.id === RESOURCE_BASSLINE)
  const resourceCopy = resource ? `Bassline ${formatResource(resource.value)}` : "Resources pending"
  return `${worldTimePrimaryCopy()} · ${statusLabel()} · ${resourceCopy}`
}

function baseManagementLeadPanel(state: AddBaseManagementState): unknown {
  switch (baseManagementTab()) {
    case "build":
      return baseConstructionLoopSummary(() => state)
    case "crew":
      return baseStaffingCommandPanel(state)
    case "power":
    case "processing":
      return [
        baseStationMachineSummary(() => state),
      ]
    case "social":
    case "expeditions":
    case "resonance":
      return null
    default:
      return baseEconomyOverview(state)
  }
}

function activeBaseManagementSection(state: AddBaseManagementState) {
  return state.sections.find((section) => section.id === baseManagementTab()) ?? state.sections[0]
}

function baseManagementTabButtons(state: AddBaseManagementState): readonly unknown[] {
  return state.sections.map(
    (section) => html`
      <button
        id=${`base-tab-${section.id}`}
        type="button"
        role="tab"
        data-severity=${baseTabSeverity(section)}
        class=${() => (baseManagementTab() === section.id ? "active" : "")}
        aria-selected=${() => baseManagementTab() === section.id}
        aria-label=${`${section.label}: ${section.blockedReason ?? section.detail}`}
        onClick=${() => setBaseManagementTab(section.id)}
      >
        <span>${section.label}</span>
        <small>${baseTabMeta(section)}</small>
      </button>
    `,
  )
}

function baseTabMeta(section: AddBaseManagementState["sections"][number]): string {
  if (section.blockedReason) return "Blocked"
  const warning = section.metrics.find((metric) => metric.severity === "warning")
  if (warning) return warning.value
  const danger = section.metrics.find((metric) => metric.severity === "danger")
  if (danger) return danger.value
  const good = section.metrics.find((metric) => metric.severity === "good")
  if (good) return good.value
  return section.primaryActionId ? "Action" : "Ready"
}

function baseTabSeverity(section: AddBaseManagementState["sections"][number]): string {
  if (section.blockedReason) return "warning"
  if (section.metrics.some((metric) => metric.severity === "danger")) return "danger"
  if (section.metrics.some((metric) => metric.severity === "warning")) return "warning"
  if (section.metrics.some((metric) => metric.severity === "good")) return "good"
  return "neutral"
}

function baseEconomyOverview(state: AddBaseManagementState): unknown {
  const limiting = state.economy.limitingResource
  const stalled = state.economy.stalledSystems.slice(0, 3)
  const limiterDetail = limiting
    ? limiting.timeToAffordSeconds === null
      ? "Waiting will not solve this without changing assignments."
      : `${formatEconomyDuration(limiting.timeToAffordSeconds)} at current net flow.`
    : state.nextBottleneck.detail
  return html`
    <section class="base-economy-overview" aria-label="Economy forecast">
      <article
        id="base-economy-limiter"
        class="base-economy-limiter"
        data-active=${limiting ? "true" : "false"}
      >
        <span>Current limiter</span>
        <strong>${limiting?.copy ?? "No hard resource blocker"}</strong>
        <small title=${limiterDetail}>${leadUiCopy(limiterDetail, 64)}</small>
      </article>
      <div class="base-economy-forecast-grid" aria-label="Wait forecast">
        ${() => state.economy.waitForecasts.map(baseEconomyForecastCard)}
      </div>
      ${stalled.length > 0
        ? html`
            <div class="base-stalled-list" aria-label="Stalled systems">
              ${indexList(() => stalled, (entry) => baseStalledSystemRow(entry))}
            </div>
          `
        : null}
      <article class="base-offline-preview" data-enabled=${state.economy.offlinePreview.enabled ? "true" : "false"}>
        <span>Offline preview</span>
        <small title=${state.economy.offlinePreview.summary}>
          ${leadUiCopy(state.economy.offlinePreview.summary, 72)}
        </small>
      </article>
    </section>
  `
}

function baseEconomyForecastCard(
  forecast: AddBaseManagementState["economy"]["waitForecasts"][number],
): unknown {
  return EconomyForecastCard({ forecast: () => forecast, format: formatSignedResource })
}

function baseManagementTabContent(state: AddBaseManagementState): unknown {
  switch (baseManagementTab()) {
    case "crystal":
      return baseCrystalPanel(state)
    case "build":
      return baseBuildPanel(state)
    case "power":
      return basePowerPanel(state)
    case "crew":
      return baseCrewPanel(state)
    case "social":
      return baseSocialPanel(state)
    case "expeditions":
      return baseExpeditionsPanel(state)
    case "resonance":
      return baseResonancePanel(state)
    case "processing":
      return baseProcessingPanel(state)
  }
}

function baseCrystalPanel(state: AddBaseManagementState): unknown {
  const crystalResources = state.resources.filter((resource) =>
    [RESOURCE_BASSLINE, RESOURCE_CHORUS, RESOURCE_HARMONICS].includes(resource.id),
  )
  const crystalRoles = state.roles.filter((role) =>
    [ROLE_CRYSTAL_BASSLINE, ROLE_CRYSTAL_CHORUS, ROLE_CRYSTAL_HARMONICS].includes(role.id),
  )
  return html`
    <div class="base-card-list">
      ${baseResourceRows(() => crystalResources)}
      ${baseSlotPoolRows(() => state.staffing.slotPools.filter((pool) => pool.id === "crystal_circle"))}
      ${() => baseRoleRows(crystalRoles, state)}
    </div>
  `
}

function baseBuildPanel(state: AddBaseManagementState): unknown {
  return html`
    <div class="base-card-list">
      ${() => state.buildLoop.activeJob ? baseActiveConstructionCard(state.buildLoop.activeJob) : null}
      ${() => baseConstructionCategoryGroups(state.buildLoop.groups)}
    </div>
  `
}

function basePowerPanel(state: AddBaseManagementState): unknown {
  return html`
    <div class="base-card-list">
      ${() => baseStationMachineGroups(state.stationMachine.groups)}
    </div>
  `
}

function baseCrewPanel(state: AddBaseManagementState): unknown {
  return html`
    <div class="base-card-list">
      ${baseSlotPoolRows(() => state.staffing.slotPools)}
      ${() => baseRoleRows(state.roles, state)}
    </div>
  `
}

function baseSocialPanel(state: AddBaseManagementState): unknown {
  const social = state.socialPressure
  return html`
    <div class="base-card-list social-pressure-list">
      <article class="base-social-overview" data-status=${social.status}>
        <span>Social pressure</span>
        <strong>${social.headline}</strong>
        <small>${social.detail}</small>
      </article>
      <article class="base-management-card" data-pressure=${social.housing.pressure}>
        <span>Bunks</span>
        <strong>${social.housing.occupied} / ${social.housing.capacity}</strong>
        <small>${social.housing.warning}</small>
        <div class="base-economy-line">
          <span>${social.housing.free} free</span>
          <span>${social.housing.missing} missing</span>
          <strong>${formatEconomyDuration(social.housing.overcrowdedSeconds)} crowded</strong>
        </div>
      </article>
      <article class="base-management-card" data-pressure=${social.supportForecast.status}>
        <span>Recruitment</span>
        <strong>${social.recruitment.enabled ? "Open" : "Locked"}</strong>
        <small>${social.recruitment.costProjection}</small>
        <div class="base-economy-line">
          <span>Cost ${formatResource(social.recruitment.nextCost)}</span>
          <span>${social.recruitment.pendingCount} pending</span>
          <strong>${social.recruitment.canAfford ? "Affordable" : "Building Vibes"}</strong>
        </div>
        <button
          id="base-recruit-survivor"
          type="button"
          onClick=${() => void recruitFromSurvivorCave()}
          disabled=${() => !ready() || !social.recruitment.canRecruitNow}
        >
          Recruit
        </button>
      </article>
      <article class="base-management-card" data-pressure=${social.vibes.netPerSecond < 0 ? "overcrowded" : "room"}>
        <span>Vibes</span>
        <strong>${formatResource(social.vibes.value)} / ${formatResource(social.vibes.cap)}</strong>
        <small>${social.vibes.explanation}</small>
        <div class="base-economy-line">
          <span>Gain ${formatResource(social.vibes.gainPerSecond)}/s</span>
          <span>Loss ${formatResource(social.vibes.lossPerSecond)}/s</span>
          <strong>Net ${signedRateCopy(social.vibes.netPerSecond)}</strong>
        </div>
        <small class="base-card-note">${social.vibes.lossExplanation}</small>
      </article>
      <article class="base-management-card" data-pressure=${social.supportForecast.status}>
        <span>Can we support this recruit?</span>
        <strong>${social.supportForecast.canSupport ? "Yes" : "Not yet"}</strong>
        <small>${social.supportForecast.copy}</small>
        <div class="base-economy-line">
          <span>${social.supportForecast.bunksAfterArrival} bunks after</span>
          <span>${formatResource(social.supportForecast.vibesAfterCommit)} Vibes after</span>
        </div>
        ${social.supportForecast.warning
          ? html`<small class="base-card-note warning">${social.supportForecast.warning}</small>`
          : null}
      </article>
      ${socialPendingArrivalRows(() => state)}
    </div>
  `
}

function baseExpeditionsPanel(state: AddBaseManagementState): unknown {
  const expeditions = state.expeditions
  return html`
    <div class="base-card-list expedition-list">
      <article class="base-social-overview" data-status=${expeditions.availableCrew > 0 ? "ready" : "waiting_vibes"}>
        <span>Expedition board</span>
        <strong>${expeditions.summary}</strong>
        <small>
          ${expeditions.availableCrew} free crew · ${expeditions.assignedCrew} away ·
          ${expeditions.totalClues} clues · ${expeditions.totalDungeonLeads} leads
        </small>
      </article>
      ${expeditionActiveJobRows(() => state)}
      ${() => expeditionReportRows(state)}
      ${() => expeditionTargetRows(state)}
    </div>
  `
}

function expeditionTargetRows(state: AddBaseManagementState): readonly unknown[] {
  return state.expeditions.targets.map(
    (target) => html`
      <article class="base-management-card" data-pressure=${target.enabled ? "room" : "locked"}>
        <span>Target</span>
        <strong>${target.label}</strong>
        <small>${target.playerHint}</small>
        <div class="base-economy-line">
          <span>${target.durationLabel}</span>
          <span>${target.requiredCrew} crew</span>
          <strong>${target.riskLabel}</strong>
        </div>
        <div class="base-economy-line">
          <span>${target.requiredSupportCopy}</span>
        </div>
        <small class="base-card-note">${target.expectedLootCopy}</small>
        ${target.disabledReason
          ? html`<small class="base-card-note warning">${target.disabledReason}</small>`
          : null}
        <button
          id=${`base-start-expedition-${target.id.replaceAll(".", "-")}`}
          type="button"
          onClick=${() => void startExpedition(target.id, target.requiredCrew)}
          disabled=${() => !ready() || !target.enabled}
        >
          Send crew
        </button>
      </article>
    `,
  )
}

function expeditionReportRows(state: AddBaseManagementState): readonly unknown[] {
  const reports = state.expeditions.reports.slice(0, 4)
  if (reports.length === 0) {
    return [
      html`
        <article class="base-management-card">
          <span>Returned reports</span>
          <strong>None yet</strong>
          <small>Completed expeditions will summarize materials, wounds, clues, and dungeon leads here.</small>
        </article>
      `,
    ]
  }
  return [
    ...reports.map(
      (report) => html`
        <article class="base-management-card" data-pressure=${report.risk}>
          <span>Returned report</span>
          <strong>${report.label}</strong>
          <small>${report.rewardCopy}</small>
          <div class="base-economy-line">
            <span>${report.assignedCrew} crew</span>
            <span>${report.woundCopy}</span>
            <strong>${report.clueCopy}</strong>
          </div>
        </article>
      `,
    ),
    html`
      <article class="base-management-card">
        <span>Report log</span>
        <strong>${state.expeditions.completedReportCount} saved</strong>
        <small>Clearing reports keeps this list short; totals remain saved.</small>
        <button
          id="base-clear-expedition-reports"
          type="button"
          onClick=${() => void clearExpeditionReports()}
          disabled=${() => !ready()}
        >
          Clear reports
        </button>
      </article>
    `,
  ]
}

function baseResonancePanel(state: AddBaseManagementState): unknown {
  const resonance = state.resonance
  return html`
    <div class="base-card-list resonance-list">
      <article class="base-social-overview" data-status=${resonance.recommendedRecipeId ? "ready" : "waiting_vibes"}>
        <span>Resonance loop</span>
        <strong>${resonance.summary}</strong>
        <small>
          ${resonance.activeJobCount} active · ${resonance.completedReportCount} completed ·
          Expedition support ${resonance.expeditionSupportLevel}
        </small>
      </article>
      <article class="base-management-card" data-pressure="room">
        <span>Crystal tuning</span>
        <strong>
          Bassline +${resonance.tuning.basslineBonusPercent}% ·
          Chorus +${resonance.tuning.chorusBonusPercent}% ·
          Harmonics +${resonance.tuning.harmonicsBonusPercent}%
        </strong>
        <small>Resonance recipes permanently improve the base sound economy.</small>
        <div class="base-economy-line">
          <span>Bassline Lv ${resonance.tuning.basslineLevel}</span>
          <span>Chorus Lv ${resonance.tuning.chorusLevel}</span>
          <strong>Harmonics Lv ${resonance.tuning.harmonicsLevel}</strong>
        </div>
      </article>
      ${indexList(() => resonance.materials, (material) => resonanceMaterialCard(material))}
      ${() => resonance.recipes.map(resonanceRecipeCard)}
      ${() => resonance.stationSpecializations.map(resonanceSpecializationCard)}
    </div>
  `
}

function resonanceRecipeCard(
  recipe: AddBaseManagementState["resonance"]["recipes"][number],
): unknown {
  return html`
    <article class="base-management-card" data-pressure=${recipe.enabled || recipe.inProgress ? "room" : "locked"}>
      <span>Resonance recipe</span>
      <strong>${recipe.label}</strong>
      <small>${recipe.playerHint}</small>
      <div class="base-economy-line">
        <span>${recipe.stationLabel}</span>
        <span>${formatEconomyDuration(recipe.durationSeconds)}</span>
        <strong>${recipe.effectLabel}</strong>
      </div>
      ${recipe.inProgress
        ? html`
            <div class="base-progress-track" aria-label=${`${recipe.label} resonance progress`}>
              <i style=${{ width: `${Math.round(recipe.progressPercent)}%` }} aria-hidden="true" />
            </div>
            <small class="base-card-note">
              ${formatEconomyDuration(recipe.remainingSeconds ?? 0)} remaining.
            </small>
          `
        : null}
      <small class="base-card-note">${recipe.costLabel}</small>
      ${recipe.blockedReason
        ? html`<small class="base-card-note warning">${recipe.blockedReason}</small>`
        : null}
      <button
        id=${`base-start-resonance-${safeElementId(recipe.id)}`}
        type="button"
        onClick=${() => void startResonanceRecipe(recipe.id)}
        disabled=${() => !ready() || !recipe.enabled}
      >
        Start resonance
      </button>
    </article>
  `
}

function resonanceSpecializationCard(
  station: AddBaseManagementState["resonance"]["stationSpecializations"][number],
): unknown {
  return html`
    <article class="base-management-card" data-pressure="room">
      <span>Station specialization</span>
      <strong>${station.stationLabel}</strong>
      <small>Current path: ${titleCase(station.currentPath)}</small>
      <div class="base-card-actions wide">
        ${() => station.options.map((option) => html`
          <button
            id=${`base-specialization-${safeElementId(station.stationId)}-${option.path}`}
            type="button"
            class=${option.active ? "active" : "ghost-button"}
            title=${option.detail}
            onClick=${() => void setStationSpecialization(station.stationId, option.path)}
            disabled=${() => !ready() || option.active}
          >
            ${option.label}
          </button>
        `)}
      </div>
    </article>
  `
}

function baseProcessingPanel(state: AddBaseManagementState): unknown {
  return html`
    <div class="base-card-list">
      ${() =>
        baseStationMachineGroups(
          state.stationMachine.groups.filter((group) =>
            ["field", "tuning", "workshop", "research"].includes(group.id),
          ),
        )}
    </div>
  `
}

function baseStaffingCommandPanel(state: AddBaseManagementState): unknown {
  return html`
    <article class="base-staffing-command">
      <div>
        <span>Staffing command</span>
        <strong>${state.staffing.freeCrew} free / ${state.staffing.totalCrew} crew</strong>
        <small>${state.staffing.visibleImpact.rateSummary}</small>
      </div>
      <label class="base-hero-task-selector">
        <span>Hero task</span>
        <select
          id="base-hero-task-selector"
          value=${state.staffing.heroRoleId}
          onChange=${(event: Event) => void setHeroRole((event.currentTarget as HTMLSelectElement).value)}
          disabled=${() => !ready()}
        >
          ${() => state.staffing.heroTaskOptions.map((option) => html`
            <option value=${option.roleId} disabled=${!option.available}>
              ${option.label}
            </option>
          `)}
        </select>
      </label>
      <div class="base-staffing-impact">
        <span>${state.staffing.visibleImpact.riskSummary}</span>
        <span>${state.staffing.visibleImpact.bottleneckSummary}</span>
      </div>
      <div class="base-staffing-presets" aria-label="Staffing presets">
        ${() => state.staffing.presets.map((preset) => html`
          <button
            id=${`base-staffing-preset-${preset.id}`}
            type="button"
            class=${state.staffing.currentPresetId === preset.id ? "active" : ""}
            title=${preset.disabledReason ?? preset.expectedFocus}
            onClick=${() => void applyStaffingPreset(preset.id)}
            disabled=${() => !ready() || !preset.enabled}
          >
            <strong>${preset.label}</strong>
            <small>${preset.detail}</small>
          </button>
        `)}
      </div>
    </article>
  `
}

function baseRateChangePanel(): unknown {
  const change = baseRateChange()
  if (!change) return null
  return html`
    <article id="base-rate-change" class="base-rate-change" aria-label="Rate change after staffing">
      <span>Rate change</span>
      <strong>${change.summary}</strong>
      <small>${change.reason}</small>
      <div class="base-rate-change-list">
        ${() => change.changes.map((item) => html`
          <span data-direction=${item.deltaPerSecond > 0 ? "up" : item.deltaPerSecond < 0 ? "down" : "flat"}>
            ${item.label}
            <strong>${signedRateCopy(item.deltaPerSecond)}</strong>
          </span>
        `)}
      </div>
    </article>
  `
}

function baseRoleRows(
  roles: readonly AddBaseManagementState["roles"][number][],
  state: AddBaseManagementState,
): readonly unknown[] {
  return roles.map(
    (role) => html`
      <article class="base-management-card" data-pressure=${role.slotPressure}>
        <span>${role.label}</span>
        <strong>${role.heroAssigned ? "Hero" : "Crew"} · ${role.crewAssigned}</strong>
        <small>${role.pressureCopy}</small>
        <div class="base-economy-line">
          <span>${role.outputResourceLabel ?? "Throughput"} ${signedRateCopy(role.currentNetPerSecond)}</span>
          <strong>Next worker ${signedRateCopy(role.nextWorkerDeltaPerSecond)}</strong>
        </div>
        <div class="base-card-actions">
          <button
            type="button"
            class="ghost-button"
            onClick=${() => void setHeroRole(role.id)}
            disabled=${() => !ready() || !currentBaseRole(role.id)?.available || !currentBaseRole(role.id)?.heroAllowed}
          >
            Hero
          </button>
          <button
            id=${`base-role-${slugForRole(role.id)}-minus`}
            type="button"
            onClick=${() => void adjustRoleCrew(role.id, -1)}
            disabled=${() => {
              const currentRole = currentBaseRole(role.id)
              return !ready() || !currentRole?.available || currentRole.crewAssigned <= 0
            }}
          >
            -1
          </button>
          <button
            id=${`base-role-${slugForRole(role.id)}-plus`}
            type="button"
            onClick=${() => void adjustRoleCrew(role.id, 1)}
            disabled=${() => !ready() || !canAddCrewToCurrentRole(role.id)}
          >
            +1
          </button>
        </div>
      </article>
    `,
  )
}

function currentBaseRole(roleId: string): AddBaseManagementState["roles"][number] | null {
  return baseManagementState()?.roles.find((role) => role.id === roleId) ?? null
}

function canAddCrewToCurrentRole(roleId: string): boolean {
  const state = baseManagementState()
  const role = currentBaseRole(roleId)
  return Boolean(state && role && canAddCrewToRole(role, state))
}

async function adjustRoleCrew(roleId: string, delta: number): Promise<void> {
  const role = currentBaseRole(roleId)
  if (!role) return
  await setRoleCrew(roleId, Math.max(0, role.crewAssigned + delta))
}

function canAddCrewToRole(
  role: AddBaseManagementState["roles"][number],
  state: AddBaseManagementState,
): boolean {
  if (!role.available || !role.crewAllowed || state.staffing.freeCrew <= 0) return false
  if (role.maxCrewSlots !== null && role.crewAssigned >= role.maxCrewSlots) return false
  const slotPool = state.staffing.slotPools.find((pool) => pool.id === role.slotPool)
  return role.slotPool === "base" ? true : (slotPool?.free ?? 0) > 0
}

function baseConstructionCategoryGroups(
  groups: readonly AddBaseManagementState["buildLoop"]["groups"][number][],
): readonly unknown[] {
  return groups.map((group) => html`
    <section class="base-construction-group" aria-label=${group.label}>
      <div class="base-construction-group-heading">
        <span>${group.label}</span>
      </div>
      ${() => group.projects.map(baseConstructionProjectCard)}
    </section>
  `)
}

function baseConstructionProjectCard(
  option: AddBaseManagementState["buildLoop"]["projects"][number],
): unknown {
  return html`
    <article
      class="base-construction-project"
      data-category=${option.category}
      data-enabled=${option.enabled ? "true" : "false"}
      data-risk=${option.basslineRisk.severity}
    >
      <div class="base-construction-project-heading">
        <span>${option.label}</span>
        <strong>${option.complete ? "Complete" : option.inProgress ? "Building" : option.enabled ? "Ready" : "Waiting"}</strong>
      </div>
      <div class="base-machine-tags">
        <span>${option.categoryLabel}</span>
        <span>${option.costLabel}</span>
        <span>${formatResourceTime(option.estimatedCompletionSeconds)}</span>
      </div>
      <div
        class="base-construction-progress"
        aria-label=${`${Math.round(option.progressPercent)}% complete`}
      >
        <span style=${`width: ${Math.max(0, Math.min(100, option.progressPercent))}%`}></span>
      </div>
      <div class="base-construction-detail-grid">
        <span>
          <strong>Workers</strong>
          <small>${option.assignedWorkers} / ${option.requiredWorkers} required</small>
        </span>
        <span>
          <strong>Missing resource</strong>
          <small>${option.missingResource ?? "None"}</small>
        </span>
      </div>
      <details class="base-card-details">
        <summary>Future economy</summary>
        <div>
          <span>
            <strong>Result</strong>
            <small>${option.resultPreview}</small>
          </span>
          <span>
            <strong>Economy change</strong>
            <small>${option.futureEconomyChange}</small>
          </span>
          <span>
            <strong>Bassline risk</strong>
            <small>${option.basslineRisk.copy}</small>
          </span>
        </div>
      </details>
      ${option.blockedReason && !option.complete
        ? html`<small class="base-machine-blocker">${option.blockedReason}</small>`
        : null}
      <button
        id=${`base-${constructionButtonId(option.id)}`}
        type="button"
        onClick=${() => void startConstruction(option.id)}
        disabled=${() => !ready() || !option.enabled}
      >
        Start
      </button>
    </article>
  `
}

function baseActiveConstructionCard(option: AddBaseManagementState["buildLoop"]["activeJob"]): unknown {
  if (!option) return null
  return html`
    <article class="base-construction-summary active">
      <span>Active construction</span>
      <strong>${option.label}</strong>
      <small>${Math.round(option.progressPercent)}% complete; ${formatResourceTime(option.estimatedCompletionSeconds)} remaining.</small>
      <div class="base-construction-progress">
        <span style=${`width: ${Math.max(0, Math.min(100, option.progressPercent))}%`}></span>
      </div>
      <div class="base-economy-line">
        <span>${option.assignedWorkers} builders assigned</span>
        <span>${option.missingResource ?? option.basslineRisk.copy}</span>
      </div>
    </article>
  `
}

/**
 * "What this involves" for a surface, from its catalog element.
 *
 * `relatedIds` is what a surface *concerns*, not what it is made of, so this is
 * a collapsed disclosure on the surface it describes rather than that surface's
 * body. Drawn as a body it duplicated readouts the HUD already had, and for the
 * map it produced a panel that was not a map.
 */
/**
 * Catalog-driven context, for developer surfaces only.
 *
 * `relatedIds` is authoring metadata — what a surface concerns — and reads that
 * way: a player opening it gets ids and states that repeat what the panel
 * around it already shows. It is genuinely useful for checking that the catalog
 * and the running game agree, which is a developer's question, so the only
 * mount left is inside the admin story browser. That panel is already kept away
 * from players, so the gating is structural rather than a flag that can drift.
 */
function schemaContext(elementId: string, summary?: string): unknown {
  return createComponent(SchemaContext, {
    get element() {
      return catalog()?.uiElements.find((entry) => entry.id === elementId)
    },
    // Read through a thunk, not captured. These helpers are called from panel
    // bodies that can run before the module-level memos below have
    // initialised, and the bundler turns that from a TDZ error into a silent
    // `undefined` — which surfaced as `props.context is not a function` at boot.
    context: () => schemaVisibility(),
    get renderers() {
      return schemaEntityRenderers
    },
    get flagIds() {
      return schemaFlagIds()
    },
    summary,
  })
}

function schemaPanel(
  elementId: string,
  tone?: () => "neutral" | "danger",
  depth = 0,
): unknown {
  return createComponent(SchemaPanel, {
    depth,
    get flagIds() {
      return schemaFlagIds()
    },
    // Getters, not functions. A component prop is a value read reactively, so
    // passing `() => element` hands the component the function itself — which
    // is how the first schema panel rendered nothing at all, silently.
    get element() {
      return catalog()?.uiElements.find((entry) => entry.id === elementId)
    },
    context: () => schemaVisibility(),
    qa: `schema-panel-${elementId.replaceAll(".", "-")}`,
    get renderers() {
      return schemaEntityRenderers
    },
    get tone(): "neutral" | "danger" {
      return tone?.() ?? "neutral"
    },
  })
}

function baseStationMachineGroups(
  groups: readonly AddBaseManagementState["stationMachine"]["groups"][number][],
): readonly unknown[] {
  return groups.map((group) => html`
    <section class="base-machine-group" aria-label=${group.label}>
      <div class="base-machine-group-heading">
        <span>${group.label}</span>
      </div>
      ${() => group.cards.map(baseStationMachineCard)}
    </section>
  `)
}

function baseStationMachineCard(
  card: AddBaseManagementState["stationMachine"]["cards"][number],
): unknown {
  return html`
    <article
      class="base-machine-card"
      data-status=${card.status}
      data-powered=${card.powered ? "true" : "false"}
    >
      <div class="base-machine-card-heading">
        <span>${card.label}</span>
        <strong>${machineStatusCopy(card.status)}</strong>
      </div>
      <div class="base-machine-tags">
        <span>${card.built ? "Built" : "Locked"}</span>
        <span>${card.powered ? "Powered" : card.brownedOut ? "Browned out" : card.requestedEnabled ? "Requested" : "Off"}</span>
        <span>${formatResource(card.chorusUpkeepPerSecond)} Chorus/s</span>
      </div>
      <small>${card.outputEffect}</small>
      <div class="base-machine-detail-grid">
        <span>
          <strong>Current job</strong>
          <small>${card.currentJob ? `${card.currentJob.label}, ${formatResource(card.currentJob.remainingSeconds)}s` : "No active job"}</small>
        </span>
        <span>
          <strong>Brownout priority</strong>
          <small>${card.brownoutPriorityCopy}</small>
        </span>
      </div>
      ${card.blockedReason
        ? html`<small class="base-machine-blocker">${card.blockedReason}</small>`
        : null}
      ${card.availableRecipes.length > 0
        ? html`
            <div class="base-machine-recipes">
              <span class="base-machine-recipes-heading">Available recipes</span>
              ${() => card.availableRecipes.slice(0, 3).map((recipe) => baseMachineRecipeRow(card, recipe))}
            </div>
          `
        : html`<small class="base-machine-empty">No station recipe available yet.</small>`}
      ${card.canTogglePower
        ? html`
            <button
              id=${`base-machine-toggle-${safeElementId(card.id)}`}
              type="button"
              class="ghost-button"
              onClick=${() => void setStationEnabled(card.id, !card.requestedEnabled)}
              disabled=${() => !ready() || card.locked}
            >
              ${card.requestedEnabled ? "Stop power" : "Request power"}
            </button>
          `
        : null}
    </article>
  `
}

function baseMachineRecipeRow(
  card: AddBaseManagementState["stationMachine"]["cards"][number],
  recipe: AddBaseManagementState["stationMachine"]["cards"][number]["availableRecipes"][number],
): unknown {
  const processingRecipe = stateRecipeIsProcessing(recipe.id)
  return html`
    <div class="base-machine-recipe" data-enabled=${recipe.enabled ? "true" : "false"}>
      <span>
        <strong>${recipe.label}</strong>
        <small>${recipe.inProgress ? "Running" : recipe.blockedReason ?? recipe.costLabel}</small>
      </span>
      <em>Lv ${recipe.level}/${recipe.maxLevel}</em>
      ${processingRecipe
        ? html`
            <button
              id=${`base-machine-recipe-${safeElementId(recipe.id)}`}
              type="button"
              onClick=${() => void startProcessing(recipe.id)}
              disabled=${() => !ready() || !recipe.enabled || card.locked}
            >
              Start
            </button>
          `
        : null}
    </div>
  `
}

function machineStatusCopy(status: AddBaseManagementState["stationMachine"]["cards"][number]["status"]): string {
  switch (status) {
    case "locked":
      return "Locked"
    case "browned_out":
      return "Browned out"
    case "powered":
      return "Powered"
    case "off":
      return "Off"
    case "built":
      return "Built"
  }
}

function stateRecipeIsProcessing(recipeId: string): boolean {
  return recipeId.startsWith("recipe.")
}

function baseStationRows(stations: readonly AddBaseManagementState["stations"][number][]): readonly unknown[] {
  return stations.map(
    (station) => html`
      <article class="base-management-card" data-powered=${station.powered ? "true" : "false"}>
        <span>${station.label}</span>
        <strong>${station.powered ? "Powered" : station.requestedEnabled ? "Requested" : "Off"}</strong>
        <small>${station.blockedReason ?? `${formatResource(station.upkeepPerSecond)} Chorus/s`}</small>
        <button
          id=${`base-station-${safeElementId(station.id)}`}
          type="button"
          class="ghost-button"
          onClick=${() => void setStationEnabled(station.id, !station.requestedEnabled)}
          disabled=${() => !ready() || !station.available || !station.manualPower}
        >
          ${station.requestedEnabled ? "Stop" : "Request"}
        </button>
      </article>
    `,
  )
}

function baseProcessingRows(recipes: readonly AddBaseManagementState["processing"][number][]): readonly unknown[] {
  return recipes.map(
    (recipe) => html`
      <article class="base-management-card" data-enabled=${recipe.enabled ? "true" : "false"}>
        <span>${recipe.label}</span>
        <strong>${recipe.inProgress ? `${recipe.remainingSeconds ?? 0}s` : `Lv ${recipe.level}/${recipe.maxLevel}`}</strong>
        <small>${recipe.blockedReason ?? `${recipe.stationLabel} · ${recipe.costLabel}`}</small>
        <button
          id=${`base-processing-${safeElementId(recipe.id)}`}
          type="button"
          onClick=${() => void startProcessing(recipe.id)}
          disabled=${() => !ready() || !recipe.enabled}
        >
          Start
        </button>
      </article>
    `,
  )
}

function discoveryMovementMetricCopy(): string {
  const movement = discoveryState()?.movement
  if (!movement) return "No movement yet"
  const parts: string[] = []
  if (movement.gameMinutes !== null) parts.push(`${movement.gameMinutes}m`)
  if (movement.discoveredDelta > 0) parts.push(`+${movement.discoveredDelta} revealed`)
  if (movement.toxicityDelta > 0) parts.push(`+${Math.round(movement.toxicityDelta * 100)}% toxicity`)
  if (movement.risk) parts.push(titleCase(movement.risk.replaceAll("_", " ")))
  return parts.length > 0 ? parts.join(" · ") : "Choose an adjacent tile"
}

function discoveryPanelBody(): unknown {
  if (discoveryPanelCollapsed()) return null
  return html`
    <div id="discovery-panel-body" class="discovery-panel-body">
      <div class="discovery-movement">
        <span>Route status</span>
        <small>
          ${() => discoveryState()?.movement.title ?? "Scout one step at a time"} ·
          ${() => discoveryMovementMetricCopy()}
        </small>
      </div>
      ${() => discoverySelectedTileSection()}
      ${() => discoveryConsequenceSection()}
      ${() => storyMomentBlock()}
      ${() => discoveryTileChoicesSection()}
      ${() => discoveryResourceSection()}
      ${() => discoveryActionsSection()}
    </div>
  `
}

function discoveryConsequenceSection(): unknown {
  const consequences = discoveryState()?.movementConsequences
  if (!consequences || (!consequences.active && consequences.safety.severity === "safe")) {
    return null
  }
  const forceOpen =
    consequences.safety.severity === "danger" || consequences.safety.severity === "critical"
  const detailsBody = html`
    <summary>
      <span>Consequences</span>
      <small>${consequences.safety.headline}</small>
    </summary>
    <div class="context-detail-body">
      ${() => discoveryConsequenceCard()}
    </div>
  `
  if (forceOpen) {
    return html`
      <details id="movement-consequences-section" class="context-detail-section" open>
        ${detailsBody}
      </details>
    `
  }
  return html`
    <details id="movement-consequences-section" class="context-detail-section">
      ${detailsBody}
    </details>
  `
}

function discoveryConsequenceCard(): unknown {
  const consequences = discoveryState()?.movementConsequences
  if (!consequences || (!consequences.active && consequences.safety.severity === "safe")) {
    return null
  }
  return html`
    <article
      id="movement-consequences"
      class="movement-consequences"
      data-severity=${consequences.safety.severity}
    >
      <header>
        <span>
          Movement consequences
          <strong>${consequences.safety.headline}</strong>
        </span>
        <small>${titleCase(consequences.safety.severity)}</small>
      </header>
      <div class="consequence-metrics">
        <span>
          Viral load
          <strong>${consequences.viralLoad.percent}%</strong>
          <small>${formatSignedRatioPercent(consequences.viralLoad.delta)} this step</small>
        </span>
        <span>
          Time
          <strong>${titleCase(consequences.timeOfDay.phase)}</strong>
          <small>${consequences.timeOfDay.localTime} · ${titleCase(consequences.timeOfDay.riskModifier)} risk</small>
        </span>
        <span>
          Safety
          <strong>${titleCase(consequences.safety.severity)}</strong>
          <small>${consequences.safety.detail}</small>
        </span>
      </div>
      <p>
        <span>${consequences.viralLoad.copy}</span>
        <span>${consequences.timeOfDay.copy}</span>
      </p>
      <ul class="consequence-warnings">
        ${() => discoveryConsequenceWarnings()}
      </ul>
    </article>
  `
}

function discoveryConsequenceWarnings(): readonly unknown[] {
  const consequences = discoveryState()?.movementConsequences
  const warnings =
    consequences && consequences.warnings.length > 0
      ? consequences?.warnings
      : ["Automatic return or failure thresholds are tracked here but remain a later rule gate."]
  return (warnings ?? []).map((warning) => html`<li>${warning}</li>`)
}

function discoveryTileRows(): readonly unknown[] {
  const choices = discoveryState()?.tileChoices ?? []
  if (choices.length === 0) {
    return [
      html`<article class="discovery-empty">Select a visible region or move the Hero to reveal new choices.</article>`,
    ]
  }
  return choices.map(
    (choice) => html`
      <button
        id=${`discovery-choice-${safeElementId(choice.id)}`}
        type="button"
        class="discovery-tile discovery-tile-choice"
        data-visibility=${choice.visibility}
        data-state=${choice.decisionState}
        aria-pressed=${choice.decisionState === "selected"}
        aria-label=${`${choice.label}. ${choice.copy}. ${choice.actionHint}`}
        onFocus=${() => selectDiscoveryChoice(choice.cell)}
        onClick=${() => selectDiscoveryChoice(choice.cell)}
        title=${choice.actionHint}
      >
        <span>
          ${choice.label}
          <small title=${choice.copy}>${leadUiCopy(choice.copy, 54)}</small>
        </span>
        <strong>
          ${choice.actionLabel}
          <small>${choice.dungeonCount > 0 ? `${choice.dungeonCount} link` : titleCase(choice.risk.replaceAll("_", " "))}</small>
        </strong>
      </button>
    `,
  )
}

function discoverySelectedTileSection(): unknown {
  const detail = discoveryState()?.tileDetail
  if (!detail) return null
  return html`
    <details id="selected-tile-section" class="context-detail-section" open>
      <summary>
        <span>Selected region</span>
        <small>${detail.label}</small>
      </summary>
      <div class="context-detail-body">
        ${() => discoverySelectedTileCard()}
      </div>
    </details>
  `
}

function discoverySelectedTileCard(): unknown {
  const detail = discoveryState()?.tileDetail
  const decision = discoveryState()?.selectedTile
  if (!detail) return null
  return html`
    <article
      id="selected-tile-decision"
      class="discovery-selected-tile"
      data-usefulness=${() => decision?.usefulness.level ?? "low"}
      data-actionable=${() => (detail.travel.canTravelNow ? "true" : "false")}
      data-visibility=${detail.visibility}
      data-risk=${detail.travel.risk}
    >
      <header>
        <span>
          Target region
          <strong>${detail.label}</strong>
        </span>
        <small>${selectedTileStatusLabel(detail)}</small>
      </header>
      <div class="selected-tile-command">
        <strong>${selectedTileCommandLabel(detail)}</strong>
        <span>
          ${detail.travel.gameMinutes} min · ${titleCase(detail.travel.risk.replaceAll("_", " "))}
        </span>
        <small>${selectedTileCommandHint(detail)}</small>
      </div>
      <p
        class="selected-tile-summary"
        title=${decision?.travel.copy ?? detail.travel.copy}
      >
        ${leadUiCopy(decision?.travel.copy ?? detail.travel.copy, 72)}
      </p>
      ${copyDisclosure(
        "selected-tile-travel-detail",
        "Travel detail",
        decision?.travel.copy ?? detail.travel.copy,
        leadUiCopy(decision?.travel.copy ?? detail.travel.copy, 72),
        "selected-tile-more",
      )}
      <div class="selected-tile-actions">
        ${() => selectedTileActionRows(detail)}
      </div>
      <div class="selected-tile-links">
        ${selectedTileLinkRows(() => detail)}
      </div>
      <div class="selected-tile-metrics">
        <span>
          Travel
          <strong>${detail.travel.gameMinutes}m</strong>
          <small>${detail.travel.standingHere ? "Here" : detail.travel.canTravelNow ? "Ready now" : detail.travel.adjacent ? "Readable" : "Move closer"}</small>
        </span>
        <span>
          Toxicity
          <strong>${titleCase(detail.travel.risk.replaceAll("_", " "))}</strong>
          <small title=${detail.travel.copy}>${leadUiCopy(detail.travel.copy, 42)}</small>
        </span>
        <span>
          Links
          <strong>${detail.links.length}</strong>
          <small>
            ${detail.hasSubmap ? "Submap available" : "No known submap"}
          </small>
        </span>
        <span>
          Usefulness
          <strong>${titleCase((decision?.usefulness.level ?? "low").replaceAll("_", " "))}</strong>
          <small>${selectedTileUsefulnessSummary(decision?.usefulness.reasons ?? [])}</small>
        </span>
      </div>
      <div class="selected-tile-usefulness">
        <small>Why it matters</small>
        ${selectedTileUsefulnessRows(() => decision?.usefulness.reasons ?? [])}
      </div>
      <div class="selected-tile-facts">
        <div>
          <small>Known</small>
          ${detail.facts.known.length > 0
            ? detail.facts.known.map((fact) => html`<span>${fact}</span>`)
            : html`<span>Nothing precise yet</span>`}
        </div>
        <div>
          <small>Unknown</small>
          ${detail.facts.unknown.map((fact) => html`<span>${fact}</span>`)}
        </div>
      </div>
    </article>
  `
}

function selectedTileStatusLabel(detail: AddTileDetailSummary): string {
  if (detail.visibility === "hidden") return "Unknown region"
  if (detail.hasSubmap) return "Submap link"
  if (detail.travel.standingHere) return "Current region"
  if (detail.travel.canTravelNow) return "Adjacent route"
  return "Known region"
}

function selectedTileCommandLabel(detail: AddTileDetailSummary): string {
  if (detail.travel.canTravelNow) return "Travel here"
  if (detail.travel.standingHere) return "You are here"
  return "Inspect only"
}

function selectedTileCommandHint(detail: AddTileDetailSummary): string {
  if (detail.travel.canTravelNow) return "Crossing takes 1 hour."
  if (detail.travel.standingHere) return "Pick a neighboring region."
  if (detail.travel.adjacent) return "Inspect now; travel from a neighboring region."
  return "Move closer to act."
}

function selectedTileActionRows(detail: AddTileDetailSummary): readonly unknown[] {
  const actions = [...detail.actions]
    .filter((action) => tileActionShouldRender(action) && !tileActionDuplicatesCurrentPrimary(action))
    .sort(compareTileActionPriority)
  if (actions.length === 0) {
    return [html`<span class="selected-tile-action-note">Use the decision button above.</span>`]
  }
  return actions.map((action) => {
    const opensSubmap = action.kind === "enter_submap" || action.kind === "manage_base"
    const targetLink = action.linkId
      ? detail.links.find((link) => link.id === action.linkId)
      : null
    if (opensSubmap) {
      if (!action.enabled) {
        return html`
          <span
            class="selected-tile-action-note blocked"
            data-action-kind=${action.kind}
            data-enabled="false"
            role="note"
            aria-label=${unavailableTileActionAriaLabel(
              action,
              "This link is not available from the Hero's current position.",
            )}
            title=${action.blockedReason ?? action.label}
          >
            <strong>${action.label}</strong>
            <small>${action.blockedReason ?? "This link is not available from the Hero's current position."}</small>
          </span>
        `
      }
      return html`
        <button
          id=${`tile-detail-action-${safeElementId(action.id)}`}
          data-action-id=${action.id}
          data-action-kind=${action.kind}
          data-enabled="true"
          data-target-map-mode=${targetLink?.targetMapMode ?? ""}
          data-target-map-id=${targetLink?.targetMapId ?? ""}
          type="button"
          class="secondary-action selected-tile-link-action"
          onClick=${(event: Event) => runCurrentTileDetailAction(event)}
          disabled=${() => !action.enabled}
          aria-label=${action.label}
          title=${action.blockedReason ?? action.label}
        >
          ${action.label}
        </button>
      `
    }
    if (action.kind === "travel" && action.enabled) {
      return html`
        <button
          id=${`tile-detail-action-${safeElementId(action.id)}`}
          data-action-id=${action.id}
          data-action-kind=${action.kind}
          data-enabled="true"
          type="button"
          class="secondary-action selected-tile-travel-action"
          onClick=${(event: Event) => runCurrentTileDetailAction(event)}
          aria-label=${action.label}
          title=${action.blockedReason ?? action.label}
        >
          ${action.label}
        </button>
      `
    }
    return html`
      <span
        class="selected-tile-action-note blocked"
        data-action-kind=${action.kind}
        data-enabled="false"
        role="note"
        aria-label=${unavailableTileActionAriaLabel(action, "Use the map to make this choice.")}
        title=${action.blockedReason ?? action.label}
      >
        <strong>${action.label}</strong>
        <small>${action.blockedReason ?? "Use the map to make this choice."}</small>
      </span>
    `
  })
}

function unavailableTileActionAriaLabel(action: AddTileAction, fallbackReason: string): string {
  return `${action.label} unavailable: ${action.blockedReason ?? fallbackReason}`
}

function tileActionShouldRender(action: AddTileAction): boolean {
  if (action.enabled) return true
  if (action.kind === "travel") return true
  if (action.kind === "enter_submap" || action.kind === "manage_base") return action.linkId !== null
  return false
}

function tileActionDuplicatesCurrentPrimary(action: AddTileAction): boolean {
  const current = currentActionState()
  if (action.kind === "travel" && current.actionId === "travel:selected-tile") return true
  if (action.kind === "manage_base" && current.kind === "open_base") return true
  if (action.kind === "enter_submap" && current.kind === "enter_dungeon") return true
  return false
}

function selectDiscoveryChoice(cell: string): void {
  const selected = mapController.selectCell(cell)
  if (selected) refreshMapInfo()
  openContextDetailSection("selected-tile-section")
}

function previewOpeningRouteToStudio(): void {
  const nextCell = nextOpeningRouteCell()
  if (!nextCell) return
  setLastCommand("route-preview:studio")
  selectDiscoveryChoice(nextCell)
}

function nextOpeningRouteCell(currentMapInfo: AddPhaserMapInfo = mapInfo()): string | null {
  const from = parseAddDisplayCell(currentMapInfo.character.cell)
  const baseCenter = currentMapInfo.landmarks.baseCenter
  const to = parseAddDisplayCell(baseCenter ? `hex:${baseCenter}` : null)
  if (!from || !to || from.kind !== "hex" || to.kind !== "hex") return null
  if (from.a === to.a && from.b === to.b) return null

  const neighbors = [
    { a: from.a, b: from.b - 1 },
    { a: from.a + 1, b: from.b - 1 },
    { a: from.a + 1, b: from.b },
    { a: from.a, b: from.b + 1 },
    { a: from.a - 1, b: from.b + 1 },
    { a: from.a - 1, b: from.b },
  ]
  const next = neighbors
    .map((cell) => ({ ...cell, distance: hexRouteDistance(cell, to) }))
    .sort((left, right) => left.distance - right.distance)[0]
  return next ? `hex:${next.a},${next.b}` : null
}

function hexRouteDistance(
  from: { readonly a: number; readonly b: number },
  to: { readonly a: number; readonly b: number },
): number {
  const dq = from.a - to.a
  const dr = from.b - to.b
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

function routeDirectionLabel(fromCell: string | null, toCell: string | null): string | null {
  const direction = directionBetweenAddCells(fromCell, toCell)
  switch (direction) {
    case "north_west":
      return "north-west"
    case "north_east":
      return "north-east"
    case "south_east":
      return "south-east"
    case "south_west":
      return "south-west"
    case "up":
      return "up"
    case "right":
      return "right"
    case "down":
      return "down"
    case "left":
      return "left"
    default:
      return null
  }
}

function openContextDetailSection(id: string): void {
  const section = document.getElementById(id)
  if (section instanceof HTMLDetailsElement) {
    section.open = true
    window.requestAnimationFrame(() => {
      section.scrollIntoView({ block: "nearest", behavior: "smooth" })
    })
  }
}

async function runSelectedTileTravelAction(detail: AddTileDetailSummary): Promise<void> {
  if (!detail.travel.canTravelNow || detail.travel.standingHere) return
  const direction = directionBetweenAddCells(mapInfo().character.cell, detail.cell)
  if (!direction) return
  await mapController.moveMainCharacter(direction)
  refreshMapInfo()
}

function directionBetweenAddCells(
  fromCell: string | null,
  toCell: string | null,
): AddCharacterMoveDirection | null {
  const from = parseAddDisplayCell(fromCell)
  const to = parseAddDisplayCell(toCell)
  if (!from || !to || from.kind !== to.kind) return null

  const dx = to.a - from.a
  const dy = to.b - from.b
  if (from.kind === "square") {
    if (dx === 0 && dy === -1) return "up"
    if (dx === 1 && dy === 0) return "right"
    if (dx === 0 && dy === 1) return "down"
    if (dx === -1 && dy === 0) return "left"
    return null
  }

  if (dx === 0 && dy === -1) return "north_west"
  if (dx === 1 && dy === -1) return "north_east"
  if (dx === 1 && dy === 0) return "right"
  if (dx === 0 && dy === 1) return "south_east"
  if (dx === -1 && dy === 1) return "south_west"
  if (dx === -1 && dy === 0) return "left"
  return null
}

function areaEntrySideForWorldAreaEntry(
  currentMapInfo: AddPhaserMapInfo = mapInfo(),
): AddAreaEntrySide | null {
  if (mapMode() !== "overworld_hex") return areaEntrySide()

  const studioCell =
    typeof currentMapInfo.landmarks.baseCenter === "string"
      ? `hex:${currentMapInfo.landmarks.baseCenter}`
      : null
  if (!studioCell) return null

  const lastMovement = lastDiscoveryMovement()
  if (lastMovement?.toCell === studioCell) {
    const side = areaEntrySideFromWorldCells(studioCell, lastMovement.fromCell)
    if (side) return side
  }

  const heroCell = currentMapInfo.character.cell
  if (heroCell && heroCell !== studioCell) {
    const side = areaEntrySideFromWorldCells(studioCell, heroCell)
    if (side) return side
  }

  return currentMapInfo.landmarks.survivorCave
    ? areaEntrySideFromWorldCells(studioCell, `hex:${currentMapInfo.landmarks.survivorCave}`)
    : null
}

function areaEntrySideFromWorldCells(
  targetCell: string | null,
  sourceCell: string | null,
): AddAreaEntrySide | null {
  const target = parseAddDisplayCell(targetCell)
  const source = parseAddDisplayCell(sourceCell)
  if (!target || !source || target.kind !== "hex" || source.kind !== "hex") return null

  const dq = source.a - target.a
  const dr = source.b - target.b
  if (dq === 0 && dr === 0) return null

  // Project the source vector through the same pointy-top axial layout used by
  // the renderer, then classify it against the six side normals.
  const worldX = Math.sqrt(3) * (dq + dr / 2)
  const worldY = 1.5 * dr
  const magnitude = Math.sqrt(worldX * worldX + worldY * worldY)
  if (magnitude === 0) return null

  const sides: ReadonlyArray<{
    readonly side: AddAreaEntrySide
    readonly x: number
    readonly y: number
  }> = [
    { side: "east", x: 1, y: 0 },
    { side: "north_east", x: 0.5, y: -Math.sqrt(3) / 2 },
    { side: "north_west", x: -0.5, y: -Math.sqrt(3) / 2 },
    { side: "west", x: -1, y: 0 },
    { side: "south_west", x: -0.5, y: Math.sqrt(3) / 2 },
    { side: "south_east", x: 0.5, y: Math.sqrt(3) / 2 },
  ]

  return sides.reduce(
    (best, candidate) => {
      const score = (worldX / magnitude) * candidate.x + (worldY / magnitude) * candidate.y
      return score > best.score ? { side: candidate.side, score } : best
    },
    { side: null as AddAreaEntrySide | null, score: Number.NEGATIVE_INFINITY },
  ).side
}

function parseAddDisplayCell(
  cell: string | null,
): { readonly kind: "hex" | "square"; readonly a: number; readonly b: number } | null {
  if (!cell) return null
  const match = /^(hex|square):(-?\d+),(-?\d+)$/.exec(cell)
  if (!match) return null
  return {
    kind: match[1] as "hex" | "square",
    a: Number(match[2]),
    b: Number(match[3]),
  }
}

function compareTileActionPriority(left: AddTileAction, right: AddTileAction): number {
  return tileActionPriority(left) - tileActionPriority(right)
}

function tileActionPriority(action: AddTileAction): number {
  if (action.kind === "manage_base") return 0
  if (action.kind === "enter_submap") return 1
  if (action.kind === "travel") return 2
  return 3
}

function discoveryTileChoicesSection(): unknown {
  const choices = discoveryState()?.tileChoices ?? []
  return html`
    <details id="tile-choices-section" class="context-detail-section">
      <summary>
        <span>Route focus</span>
        <small>
          ${choices.length === 0
            ? "No pinned route"
            : `${choices.length} pinned region${choices.length === 1 ? "" : "s"}`}
        </small>
      </summary>
      <div class="context-detail-body discovery-tiles">
        ${() => discoveryTileRows()}
      </div>
    </details>
  `
}

function discoveryResourceRows(): readonly unknown[] {
  const resources = discoveryState()?.resourceLinks ?? []
  const visible = resources.filter((resource) => resource.relevant)
  const rows = visible.length > 0 ? visible : resources.slice(0, 2)
  return rows.map(
    (resource) => html`
      <article class=${resource.relevant ? "discovery-resource relevant" : "discovery-resource"}>
        <span>
          ${resource.label}
          <small>${resource.copy}</small>
        </span>
        <strong>
          ${formatResource(resource.value)}${resource.target !== null ? ` / ${formatResource(resource.target)}` : ""}
        </strong>
      </article>
    `,
  )
}

function discoveryResourceSection(): unknown {
  const resources = discoveryState()?.resourceLinks ?? []
  const relevantCount = resources.filter((resource) => resource.relevant).length
  if (resources.length === 0) return null
  return html`
    <details id="resource-context-section" class="context-detail-section">
      <summary>
        <span>Why it matters</span>
        <small>${relevantCount > 0 ? `${relevantCount} blocker${relevantCount === 1 ? "" : "s"}` : "No blocker"}</small>
      </summary>
      <div class="context-detail-body discovery-resources">
        ${() => discoveryResourceRows()}
      </div>
    </details>
  `
}

function discoveryActionButtons(): readonly unknown[] {
  const primaryActionId = discoveryState()?.nextAction.actionId
  const links = (discoveryState()?.actionLinks ?? []).filter(
    (link) => link.id !== primaryActionId,
  )
  if (links.length === 0) {
    return []
  }
  return links.map(
    (link) => html`
      <button
        id=${`discovery-action-${safeElementId(link.id)}`}
        type="button"
        class="secondary-action context-link-action"
        onClick=${() => void runDiscoveryAction(link)}
        disabled=${() => !link.enabled}
        title=${link.reason ?? link.label}
      >
        ${link.label}
      </button>
    `,
  )
}

function discoveryActionsSection(): unknown {
  const links = (discoveryState()?.actionLinks ?? []).filter(
    (link) => link.id !== discoveryState()?.nextAction.actionId,
  )
  if (links.length === 0) return null
  return html`
    <details id="secondary-actions-section" class="context-detail-section">
      <summary>
        <span>More actions</span>
        <small>${links.length} option${links.length === 1 ? "" : "s"}</small>
      </summary>
      <div class="context-detail-body discovery-actions">
        ${() => discoveryActionButtons()}
      </div>
    </details>
  `
}

function objectivePanelTitle(): string {
  if (dungeonObjectiveState()) return "Dungeon objective"
  return firstPlayableArcComplete() ? "Arc complete" : "First playable"
}

function objectivePanelChip(): string {
  const dungeon = dungeonObjectiveState()
  if (dungeon) {
    const activeIndex = Math.max(
      0,
      dungeon.steps.findIndex((step) => step.status === "active"),
    )
    return `${activeIndex + 1}/${dungeon.steps.length}`
  }
  return `${uiState()?.firstPlayable.completedCount ?? 0}/${uiState()?.firstPlayable.totalCount ?? 0}`
}

function objectivePanelToggleLabel(): string {
  if (firstPlayableArcComplete()) {
    return firstPlayableCollapsed() ? "Open first arc journal" : "Close first arc journal"
  }
  const action = firstPlayableCollapsed() ? "Expand" : "Collapse"
  return `${action} objective tracker`
}

function objectivePanelToggleText(): string {
  if (firstPlayableArcComplete()) return firstPlayableCollapsed() ? "Journal" : "Close"
  return firstPlayableCollapsed() ? "Show" : "Hide"
}

function objectivePanelCompactSummary(): unknown {
  if (!firstPlayableCollapsed()) return null
  if (firstPlayableArcComplete()) return null

  const dungeon = dungeonObjectiveState()
  const action = objectivePanelPrimaryAction()
  if (dungeon) {
    const active = dungeon.steps.find((step) => step.status === "active") ?? dungeon.steps[0]
    return html`
      <div class="objective-compact-summary">
        <span>
          <small>Current</small>
          <strong>${active?.label ?? dungeon.headline}</strong>
        </span>
        <div class="progress-track compact-progress" aria-hidden="true">
          <span style=${() => ({ width: dungeonObjectiveProgressWidth() })} />
        </div>
        ${() => objectivePanelPrimaryButton(action)}
      </div>
    `
  }

  const firstPlayable = uiState()?.firstPlayable
  const current = currentFirstPlayableStep()
  return html`
    <div class="objective-compact-summary">
      <span>
        <small>Current</small>
        <strong>${current?.label ?? "First playable"}</strong>
      </span>
      <div class="progress-track compact-progress" aria-hidden="true">
        <span style=${() => ({ width: firstPlayableProgressWidth() })} />
      </div>
      <small class="objective-compact-progress">
        ${firstPlayable?.completedCount ?? 0}/${firstPlayable?.totalCount ?? 0}
      </small>
      ${() => objectivePanelPrimaryButton(action)}
    </div>
  `
}

function objectivePanelPrimaryAction(): AddCurrentActionState | null {
  const action = currentActionState()
  if (mapMode() !== "overworld_hex") return null
  if (!action.primaryLabel) return null
  return action
}

function objectivePanelPrimaryButton(
  action: AddCurrentActionState | null,
  id = "objective-primary-action",
): unknown {
  if (!action?.primaryLabel) return null
  return html`
    <button
      id=${id}
      type="button"
      data-action-id=${() => action.actionId ?? ""}
      class="objective-primary-action"
      data-key-action="confirm"
      aria-keyshortcuts="Enter"
      onClick=${() => void runCurrentAction()}
      disabled=${() => !currentActionState().primaryEnabled}
      aria-label=${() => currentActionPrimaryAriaLabel()}
    >
      ${leadUiCopy(action.primaryLabel, 28)}
    </button>
  `
}

function objectivePanelBody(): unknown {
  const dungeon = dungeonObjectiveState()
  if (dungeon) {
    return html`
      <div class="progress-track dungeon-progress" aria-hidden="true">
        <span style=${() => ({ width: dungeonObjectiveProgressWidth() })} />
      </div>
      <p class="objective-copy dungeon-objective-copy">
        <strong>${dungeon.headline}</strong>
        <span>${dungeon.detail}</span>
      </p>
      <ol class="first-playable-list dungeon-objective-list">
        ${() => dungeonObjectiveStepRows()}
      </ol>
    `
  }

  return html`
    <div class="progress-track" aria-hidden="true">
      <span style=${() => ({ width: firstPlayableProgressWidth() })} />
    </div>
    ${() => objectivePanelPrimaryButton(objectivePanelPrimaryAction(), "objective-body-primary-action")}
    <p class="objective-copy">
      ${() => firstPlayableCopy()}
    </p>
    <ol class="first-playable-list">
      ${firstPlayableStepRows}
    </ol>
  `
}

function dungeonObjectiveProgressWidth(): string {
  const dungeon = dungeonObjectiveState()
  if (!dungeon || dungeon.steps.length === 0) return "0%"
  const activeIndex = Math.max(
    0,
    dungeon.steps.findIndex((step) => step.status === "active"),
  )
  return `${Math.round(((activeIndex + 1) / dungeon.steps.length) * 100)}%`
}

function dungeonObjectiveStepRows(): readonly unknown[] {
  return (dungeonObjectiveState()?.steps ?? []).map((step: AddDungeonObjectiveStep) => {
    const stateLabel =
      step.status === "complete" ? "Done" : step.status === "active" ? "Now" : "Next"
    return html`
      <li class=${step.status === "active" ? "active" : step.status === "complete" ? "complete" : ""}>
        <span>${step.label}</span>
        <small>${stateLabel}</small>
      </li>
    `
  })
}

function currentFirstPlayableStep() {
  return uiState()?.firstPlayable.steps.find((step) => step.active) ?? null
}

function firstPlayableArcComplete(): boolean {
  return !dungeonObjectiveState() && uiState()?.firstPlayable.complete === true
}

function firstPlayableProgressWidth(): string {
  const firstPlayable = uiState()?.firstPlayable
  if (!firstPlayable || firstPlayable.totalCount <= 0) return "0%"
  return `${Math.round((firstPlayable.completedCount / firstPlayable.totalCount) * 100)}%`
}

function firstPlayableCopy(): string {
  const firstPlayable = uiState()?.firstPlayable
  if (!firstPlayable) return "Waiting for the world."
  if (firstPlayable.complete) {
    return persistenceReadyForFirstPlayable()
      ? "The first arc is complete, and save/offline behavior is ready."
      : "The first arc is complete. Save now or let the base run while away."
  }
  const current = currentFirstPlayableStep()
  if (current) {
    return `Tracking: ${current.label}. The decision panel carries the next action.`
  }
  return "Track first-arc progress here while the decision panel handles the next action."
}

function firstPlayableStepRows(): unknown {
  return ObjectiveSteps({ steps: () => uiState()?.firstPlayable.steps ?? [] })
}

function roleQuickControls(): unknown {
  return RoleControls({
    roleIds: () => FIRST_PLAYABLE_ROLE_IDS,
    roleFor: (id) => uiState()?.roleAssignments.find((candidate) => candidate.id === id),
    ready,
    shortLabel: roleShortLabel,
    elementId: slugForRole,
    onAssignHero: (id) => void setHeroRole(id),
    onAssignCrew: (id, crew) => void setRoleCrew(id, crew),
  })
}

function constructionQuickControls(): unknown {
  return ConstructionControls({
    optionIds: () => [PROJECT_RESTORE_STUDIO, PROJECT_BUILD_FIRE_PIT],
    optionFor: (id) => uiState()?.constructionOptions.find((candidate) => candidate.id === id),
    ready,
    buttonId: constructionButtonId,
    onStart: (id) => void startConstruction(id),
  })
}

function perkQuickControls(): unknown {
  return PerkControls({
    perks: () => perkProgress()?.perks ?? [],
    ready,
    elementId: safeElementId,
    onAcquire: (id) => void acquirePerk(id),
  })
}

function inventoryRows(): unknown {
  return InventoryList({
    items: inventoryItems,
    ready,
    // Items can only be dropped while in a dungeon (onto the Hero's cell).
    canDrop: () => heroDungeonCell() !== null,
    elementId: safeElementId,
    onUse: (id) => void handleUseItem(id),
    onDrop: (id) => void handleDropItem(id),
  })
}

function actionRows(): unknown {
  return WorldActionList({ actions: () => worldActions().slice(0, 5) })
}

function mapModeButtons(): unknown {
  return MapModeTabs({
    modes: mapModeNavigationItems,
    current: mapMode,
    actionId: addQaMapModeActionId,
    onSelect: switchMapModeFromTab,
  })
}

function mapModeNavigationItems(): readonly AddMapModeNavItem[] {
  return ADD_MAP_MODE_OPTIONS.map((option) => mapModeNavigationItem(option.id)).filter(
    (item) => !item.hidden,
  )
}

function mapModeNavigationItem(mode: AddMapMode): AddMapModeNavItem {
  switch (mode) {
    case "overworld_hex":
      return {
        id: mode,
        label: "World",
        shortLabel: "World",
        ariaLabel: "Open the world map",
        hidden: false,
      }
    case "area_hex": {
      const area = addAreaByMapId(areaTarget())
      const areaLabel = area?.label ?? "Studio Grounds"
      return {
        id: mode,
        label: "Studio",
        shortLabel: "Studio",
        ariaLabel: `Open ${areaLabel}`,
        hidden: !snapshot() && mapMode() !== mode,
      }
    }
    case "dungeon_square": {
      const label = dungeonNavigationLabel()
      return {
        id: mode,
        label,
        shortLabel: dungeonNavigationShortLabel(label),
        ariaLabel: `Open ${dungeonNavigationAriaLabel(label)}`,
        hidden: !dungeonNavigationAvailable(),
      }
    }
    case "base_square":
      return {
        id: mode,
        label: "Base",
        shortLabel: "Base",
        ariaLabel: "Open base management",
        hidden: !baseNavigationAvailable(),
      }
  }
}

function baseNavigationAvailable(): boolean {
  return mapMode() === "base_square" || baseNavigationUnlocked() || heroIsAtStudio()
}

function heroIsAtStudio(currentMapInfo: AddPhaserMapInfo = mapInfo()): boolean {
  const baseCenter = currentMapInfo.landmarks.baseCenter
  if (!baseCenter) return false
  return (
    currentMapInfo.character.coord === baseCenter ||
    currentMapInfo.character.cell === `hex:${baseCenter}`
  )
}

function dungeonNavigationAvailable(): boolean {
  return Boolean(
    mapMode() === "dungeon_square" ||
      heroDungeonLink() ||
      (mapMode() === "base_square" && baseDungeonEntranceInteraction()) ||
      lastDungeonEntryCommand(),
  )
}

function dungeonNavigationLabel(): string {
  const activeObjective = dungeonObjectiveState()
  const link = heroDungeonLink()
  const registered = addDungeonByMapId(dungeonTarget())
  const sourceLabel = activeObjective?.label ?? link?.label ?? registered?.label ?? "Cave"
  if (/survivor cave/i.test(sourceLabel)) return "Cave"
  if (/studio/i.test(sourceLabel)) return "Studio Dungeon"
  return sourceLabel
}

function dungeonNavigationShortLabel(label: string): string {
  if (/studio/i.test(label)) return "Studio"
  return label
}

function dungeonNavigationAriaLabel(label: string): string {
  if (label === "Cave") return "Survivor Cave"
  return label
}

// Smoothly animates the *presentation* clock toward a target. Only the explicit
// per-hex travel reveal uses this; every other authoritative change snaps the
// display directly (see onSnapshot). Driven by real elapsed time via rAF so it
// finishes exactly with the Hero and can never drift past arrival or crawl
// through a large jump.
function animatePresentationClockTo(targetClockSeconds: number, reason: string): void {
  const currentClockSeconds = displayClockSeconds()
  if (currentClockSeconds === null || targetClockSeconds <= currentClockSeconds) {
    cancelClockAnimation()
    setDisplayClockSeconds(targetClockSeconds)
    return
  }

  const timing = createAddClockAdvancePresentationTiming(
    currentClockSeconds,
    targetClockSeconds,
  )
  if (timing.visibleGameMinutes <= 0 || timing.durationMs <= 0) {
    cancelClockAnimation()
    setDisplayClockSeconds(targetClockSeconds)
    return
  }

  // Cancel any in-flight animation so a new travel restarts cleanly from the
  // current mid-interpolation value (e.g. rapid consecutive moves).
  cancelClockAnimation()
  const fromClockSeconds = currentClockSeconds
  const span = targetClockSeconds - fromClockSeconds
  const startedAtMs = performance.now()
  setClockAnimation({
    fromClockSeconds,
    toClockSeconds: targetClockSeconds,
    currentClockSeconds: fromClockSeconds,
    remainingMinutes: timing.visibleGameMinutes,
    totalMinutes: timing.visibleGameMinutes,
    durationMs: timing.durationMs,
    clockStepMs: timing.msPerVisibleMinute,
    reason,
  })

  const frame = (nowMs: number) => {
    const progress = Math.min(1, Math.max(0, (nowMs - startedAtMs) / timing.durationMs))
    const nextClockSeconds = fromClockSeconds + progress * span
    const remainingMinutes = Math.max(
      0,
      Math.round(timing.visibleGameMinutes * (1 - progress)),
    )
    setDisplayClockSeconds(nextClockSeconds)
    setClockAnimation((current) =>
      current
        ? {
            ...current,
            currentClockSeconds: nextClockSeconds,
            remainingMinutes,
          }
        : current,
    )

    if (progress >= 1) {
      setDisplayClockSeconds(targetClockSeconds)
      setClockAnimation(null)
      clockAnimationFrameId = undefined
      return
    }

    clockAnimationFrameId = requestAnimationFrame(frame)
  }

  clockAnimationFrameId = requestAnimationFrame(frame)
}

function cancelClockAnimation(): void {
  if (clockAnimationFrameId !== undefined) {
    cancelAnimationFrame(clockAnimationFrameId)
    clockAnimationFrameId = undefined
  }
  setClockAnimation(null)
}

function dayNightOverlayStyle(): string {
  const time = displayedWorldTime()
  const nightAlpha = time ? Math.min(0.58, time.nightRatio * 0.52) : 0
  const dawnAlpha =
    time?.daylightPhase === "dawn" || time?.daylightPhase === "dusk"
      ? Math.max(0.16, 0.32 * (1 - time.daylightRatio))
      : 0
  return `--night-alpha:${nightAlpha.toFixed(3)};--dawn-alpha:${dawnAlpha.toFixed(3)}`
}

function toxicityHazeStyle(): string {
  const ratio = contaminationRatio()
  const alpha = contaminationAlpha(ratio)
  // The travel risk still tints the edge, but it no longer competes with the
  // contamination for the same channel.
  const risk = currentTravelRisk()
  const riskEdge = risk === "toxic" ? 0.1 : risk === "fringe" ? 0.06 : 0
  return [
    `--toxicity-alpha:${Math.min(1, alpha + riskEdge).toFixed(3)}`,
    `--contamination-ratio:${ratio.toFixed(3)}`,
    `--contamination-breath:${contaminationBreathSeconds(ratio).toFixed(2)}s`,
  ].join(";")
}

function daylightMeterStyle(): Record<string, string> {
  const ratio = displayedWorldTime()?.daylightRatio ?? 1
  return {
    "--daylight-ratio": `${Math.max(8, Math.round(ratio * 100))}%`,
  }
}

function worldTimePrimaryCopy(): string {
  const time = displayedWorldTime()
  if (!time) return "Day 1 · --:--"
  return `Day ${time.day} · ${time.localTime}`
}

function worldTimeSecondaryCopy(): string {
  const time = displayedWorldTime()
  if (!time) return "Solar estimate pending"
  return `${time.seasonLabel} · ${titleCase(time.daylightPhase)} · ${time.sunrise}/${time.sunset}`
}

function travelRiskState(): string {
  return currentTravelRisk() ?? "none"
}

function currentTravelRisk(): string | null {
  const experience = travelExperience()
  return (
    experience?.event.exposureRisk ??
    mapInfo().travel.previewExposureRisk ??
    mapInfo().travel.exposureRisk ??
    null
  )
}

async function confirmFirstCharacterTravel(event: AddCharacterTravelEvent): Promise<boolean> {
  const eligibility = openingTravelDialogEligibilityForEvent(event, mapInfo())
  if (!eligibility.eligible) {
    if (travelDramaState !== "complete") travelDramaState = "complete"
    return true
  }

  if (travelDramaState === "declined_once") {
    const accepted = await showTravelDialog("dramatic_reprise", event)
    if (!accepted) return false
    travelDramaState = "complete"
    return true
  }

  const firstAccepted = await showTravelDialog("first_warning", event)
  if (!firstAccepted) {
    travelDramaState = "declined_once"
    await showTravelDialog("first_declined", event)
    return false
  }

  const secondAccepted = await showTravelDialog("second_warning", event)
  if (!secondAccepted) {
    travelDramaState = "declined_once"
    return false
  }

  travelDramaState = "complete"
  return true
}

function openingTravelDialogEligibilityForEvent(
  event: AddCharacterTravelEvent,
  currentMapInfo: AddPhaserMapInfo,
): TravelDialogEligibility {
  const eligibility = openingTravelDialogEligibility(currentMapInfo)
  if (!eligibility.eligible) return eligibility

  const survivorCave = currentMapInfo.landmarks.survivorCave
  const survivorCaveCell = survivorCave ? `hex:${survivorCave}` : null
  if (!survivorCaveCell || event.fromCell !== survivorCaveCell) {
    return { eligible: false, reason: "not_survivor_cave_start" }
  }
  if (event.toCell === survivorCaveCell) {
    return { eligible: false, reason: "not_leaving_survivor_cave" }
  }
  return eligibility
}

function openingTravelDialogEligibility(
  currentMapInfo: AddPhaserMapInfo = mapInfo(),
): TravelDialogEligibility {
  if (travelDramaState === "complete") {
    return { eligible: false, reason: "already_complete" }
  }

  const currentSnapshot = snapshot()
  const currentUi = uiState()
  if (!currentSnapshot || !currentUi) {
    return { eligible: false, reason: "missing_state" }
  }
  if (mapMode() !== "overworld_hex") {
    return { eligible: false, reason: "not_overworld" }
  }
  if (currentUi.firstPlayable.currentStepId !== OPENING_TRAVEL_STEP_ID) {
    return { eligible: false, reason: "not_reach_base_step" }
  }

  const survivorCave = currentMapInfo.landmarks.survivorCave
  if (!survivorCave) {
    return { eligible: false, reason: "missing_survivor_cave" }
  }
  if (
    `${currentSnapshot.heroMap.q},${currentSnapshot.heroMap.r}` !== survivorCave ||
    currentMapInfo.character.coord !== survivorCave
  ) {
    return { eligible: false, reason: "not_survivor_cave_start" }
  }

  return { eligible: true, reason: "opening_reach_base_from_survivor_cave" }
}

function showTravelDialog(
  kind: TravelDialogKind,
  event: AddCharacterTravelEvent,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    setTravelDialog({ kind, event, resolve })
    focusTravelDialogDefaultAction(kind)
  })
}

function focusTravelDialogDefaultAction(kind: TravelDialogKind): void {
  const actionId = defaultTravelDialogActionId(kind)
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.getElementById(actionId)?.focus()
    })
  })
}

function defaultTravelDialogActionId(kind: TravelDialogKind): string {
  if (kind === "first_declined") return "travel-dialog-dismiss"
  if (kind === "dramatic_reprise") return "travel-dialog-venture"
  return "travel-dialog-confirm"
}

function answerTravelDialog(accepted: boolean): void {
  const current = travelDialog()
  if (!current) return
  setTravelDialog(null)
  current.resolve(accepted)
}

function cancelTravelDialogFromKeyboard(): void {
  const current = travelDialog()
  if (!current) return
  if (current.kind === "first_declined") {
    answerTravelDialog(true)
    return
  }
  answerTravelDialog(false)
}

function travelDialogView(): unknown {
  const dialog = travelDialog()
  if (!dialog) return null

  return html`
    <div class="travel-dialog-backdrop">
      <section
        id="travel-confirmation-dialog"
        class="travel-dialog"
        style=${() => floatingPanelStyle("travel_dialog")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="travel-dialog-title"
        aria-keyshortcuts="Enter Escape"
        data-qa=${ADD_QA_SELECTORS.travelDialog}
        data-kind=${dialog.kind}
        data-dragging=${() => floatingPanelDraggingId() === "travel_dialog"}
        data-last-action=${() => floatingPanelLastActions().travel_dialog}
        onKeyDown=${(event: KeyboardEvent) =>
          handlePopinKeyboardNavigation("travel-confirmation-dialog", event)}
      >
        <div
          class="floating-panel-handle travel-dialog-handle"
          role="group"
          tabindex="0"
          aria-label="Travel dialog handle. Use arrow keys to move this pop-in."
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
          onPointerDown=${(event: PointerEvent) => beginFloatingPanelDrag("travel_dialog", event)}
          onPointerMove=${(event: PointerEvent) => dragFloatingPanel("travel_dialog", event)}
          onPointerUp=${(event: PointerEvent) => endFloatingPanelDrag("travel_dialog", event)}
          onPointerCancel=${(event: PointerEvent) => endFloatingPanelDrag("travel_dialog", event)}
          onKeyDown=${(event: KeyboardEvent) => handleFloatingPanelKeyboard("travel_dialog", event)}
        >
          <span class="travel-dialog-eyebrow">${() => travelDialogEyebrow(dialog.kind)}</span>
          <h2 id="travel-dialog-title">${() => travelDialogTitle(dialog.kind)}</h2>
        </div>
        <p
          class="travel-dialog-copy keyboard-section"
          tabindex="0"
          aria-label="Travel warning"
        >
          ${() => travelDialogCopy(dialog.kind, dialog.event)}
        </p>
        <div class="travel-dialog-actions">
          ${travelDialogActions({
            kind: () => dialog.kind,
            actionIds: {
              cancel: ADD_QA_ACTION_IDS.travelCancel,
              confirm: ADD_QA_ACTION_IDS.travelConfirm,
              dismissWarning: ADD_QA_ACTION_IDS.travelDismissWarning,
            },
            onAnswer: answerTravelDialog,
          })}
        </div>
      </section>
    </div>
  `
}

function offlineReturnPanel(): unknown {
  const summary = offlineReturnSummary()
  if (!summary) return null

  return html`
    <section
      id="offline-return-panel"
      class="offline-return-panel"
      style=${() => floatingPanelStyle("offline_return")}
      data-source=${summary.source}
      data-dragging=${() => floatingPanelDraggingId() === "offline_return"}
      data-last-action=${() => floatingPanelLastActions().offline_return}
      data-visual-surface="context"
      data-qa=${ADD_QA_SELECTORS.offlineReturn}
      role="region"
      aria-labelledby="offline-return-title"
      aria-live="polite"
      aria-keyshortcuts="Enter Escape"
      onKeyDown=${(event: KeyboardEvent) =>
        handlePopinKeyboardNavigation("offline-return-panel", event)}
    >
      <div
        class="floating-panel-handle offline-return-heading"
        role="group"
        tabindex="0"
        aria-label="Offline return panel handle. Use arrow keys to move this pop-in."
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
        onPointerDown=${(event: PointerEvent) => beginFloatingPanelDrag("offline_return", event)}
        onPointerMove=${(event: PointerEvent) => dragFloatingPanel("offline_return", event)}
        onPointerUp=${(event: PointerEvent) => endFloatingPanelDrag("offline_return", event)}
        onPointerCancel=${(event: PointerEvent) => endFloatingPanelDrag("offline_return", event)}
        onKeyDown=${(event: KeyboardEvent) => handleFloatingPanelKeyboard("offline_return", event)}
      >
        <div>
          <span>While you were away</span>
          <h2 id="offline-return-title">The base lived for ${summary.elapsedLabel}</h2>
        </div>
        <button
          id="dismiss-offline-return"
          type="button"
          class="ghost-button offline-return-dismiss"
          data-action-id=${ADD_QA_ACTION_IDS.offlineDismiss}
          data-key-action="cancel"
          aria-keyshortcuts="Escape"
          onClick=${dismissOfflineReturnSummary}
          aria-label="Dismiss offline return summary"
        >
          Close
        </button>
      </div>
      <article
        class="offline-return-hero keyboard-section"
        tabindex="0"
        aria-label="Offline return summary"
      >
        <span>${summary.source === "manual" ? "Manual catch-up" : "Autosave return"}</span>
        <strong>${summary.headline}</strong>
        <small title=${summary.summary}>${leadUiCopy(summary.summary, 76)}</small>
      </article>
      <div
        class="offline-return-highlights keyboard-section"
        tabindex="0"
        aria-label="Return highlights"
      >
        ${offlineReturnHighlights(() => summary)}
      </div>
      <article
        class="offline-return-card offline-return-next keyboard-section"
        tabindex="0"
        aria-label="Offline return next action"
      >
        <span>After dismissing</span>
        <strong>${() => returnReviewNextAction().label}</strong>
        <small title=${() => returnReviewNextAction().detail}>
          ${() => leadUiCopy(returnReviewNextAction().detail, 72)}
        </small>
        <button
          id="dismiss-offline-return-primary"
          type="button"
          class="primary-action"
          data-action-id=${ADD_QA_ACTION_IDS.offlineDismiss}
          data-key-action="confirm"
          aria-keyshortcuts="Enter"
          onClick=${dismissOfflineReturnSummary}
        >
          Continue to next action
        </button>
      </article>
      <div class="offline-return-grid">
        <article class="offline-return-card keyboard-section" tabindex="0" aria-label="Offline return gains">
          <span>Gained</span>
          <ul>${offlineReturnResourceRows(() => summary)}</ul>
        </article>
        <article class="offline-return-card keyboard-section" tabindex="0" aria-label="Offline return completed jobs">
          <span>Completed</span>
          <ul>${offlineReturnJobRows(() => summary)}</ul>
        </article>
        <article class="offline-return-card keyboard-section" tabindex="0" aria-label="Offline return recruits">
          <span>Recruits</span>
          <strong>${summary.recruitsArrived}</strong>
          <small>
            ${summary.recruitsArrived > 0
              ? "New survivors arrived."
              : "No arrivals."}
          </small>
        </article>
        <article class="offline-return-card keyboard-section" tabindex="0" aria-label="Offline return bubble changes">
          <span>Bubble</span>
          <strong>${formatSignedNumber(summary.bubble.reachDelta)} reach</strong>
          <small>${summary.bubble.summary}</small>
        </article>
        <article class="offline-return-card keyboard-section" tabindex="0" aria-label="Offline return brownouts">
          <span>Brownouts</span>
          <strong>${summary.brownout.occurred ? "Pressure" : "Stable"}</strong>
          <small>${summary.brownout.summary}</small>
        </article>
        <article class="offline-return-card offline-return-blockers keyboard-section" tabindex="0" aria-label="Offline return blockers">
          <span>Blockers</span>
          <ul>${offlineReturnBlockerRows(() => summary)}</ul>
        </article>
        <article class="offline-return-card offline-return-paused keyboard-section" tabindex="0" aria-label="Offline return unchanged systems">
          <span>Unchanged systems</span>
          <ul>${offlineReturnPausedRows(() => summary)}</ul>
        </article>
        <article class="offline-return-card offline-return-rules keyboard-section" tabindex="0" aria-label="Offline return rules">
          <span>Offline rules</span>
          <strong>Automated loops only</strong>
          <small>Manual Hero actions stay paused.</small>
          ${copyDisclosure(
            "offline-return-rules-detail",
            "Rules",
            "Passive/systemic base loops can resolve while away. Manual Hero travel, world actions, and local collection still require online input.",
            "Manual Hero actions stay paused.",
            "offline-return-rules-detail",
          )}
        </article>
      </div>
    </section>
  `
}

function dismissOfflineReturnSummary(): void {
  setOfflineReturnSummary(null)
}

function travelDialogEyebrow(kind: TravelDialogKind): string {
  if (kind === "first_declined") return "Fair enough"
  if (kind === "dramatic_reprise") return "One more thing"
  return "Before you cross"
}

function travelDialogTitle(kind: TravelDialogKind): string {
  switch (kind) {
    case "first_warning":
      return "Hmmmm..."
    case "second_warning":
      return "Really sure?"
    case "first_declined":
      return "Oh well."
    case "dramatic_reprise":
      return "That was just for dramatic effect."
  }
}

function travelDialogCopy(
  kind: TravelDialogKind,
  event: AddCharacterTravelEvent,
): string {
  switch (kind) {
    case "first_warning":
      return `The world is toxic, remember? Are you really sure you want to venture forth? It's gonna take you a solid hour to cross the region toward ${event.destinationLabel}...`
    case "second_warning":
      return "Are you really sure? It's 1 HOUR. Keep that in mind, right?"
    case "first_declined":
      return "You can stay where you are, but that won't be so fun, right?"
    case "dramatic_reprise":
      return "That was just for dramatic effect. Just venture forth."
  }
}

function openBaseManagementView(command: string, target: string = "base_square"): void {
  setLastTileActionTarget(target)
  setLastCommand(command)
  setBaseNavigationUnlocked(true)
  if (mapMode() === "base_square") {
    setBaseViewTransition("idle")
    return
  }

  clearBaseViewTransitionTimer()
  setBaseViewTransition("opening")
  baseViewTransitionTimer = window.setTimeout(() => {
    switchMapMode("base_square")
    setBaseViewTransition("settling")
    baseViewTransitionTimer = window.setTimeout(() => {
      setBaseViewTransition("idle")
      baseViewTransitionTimer = undefined
    }, 520)
  }, 160)
}

function clearBaseViewTransitionTimer(): void {
  if (baseViewTransitionTimer === undefined) return
  window.clearTimeout(baseViewTransitionTimer)
  baseViewTransitionTimer = undefined
}

function switchMapMode(nextMode: AddMapMode, options: { readonly dungeonTargetId?: string } = {}): void {
  if (nextMode === "dungeon_square" && options.dungeonTargetId) {
    setDungeonTarget(options.dungeonTargetId)
  }
  if (nextMode === "dungeon_square") {
    setDungeonReturnMode(mapMode() === "base_square" ? "base_square" : "overworld_hex")
  }
  if (nextMode === "area_hex") {
    setAreaEntrySide(areaEntrySideForWorldAreaEntry())
  }
  if (mapMode() === nextMode) return
  if (nextMode !== "base_square") {
    clearBaseViewTransitionTimer()
    setBaseViewTransition("idle")
  }
  setTravelExperience(null)
  setMapMode(nextMode)
  setLastCommand(`map:${nextMode}`)
}

function enterDungeonTarget(
  targetMapId: string,
  command: string,
  options: { readonly returnMode?: DungeonReturnMapMode } = {},
): void {
  setLastDungeonEntryCommand(command)
  setDungeonReturnMode(
    options.returnMode ?? (mapMode() === "base_square" ? "base_square" : "overworld_hex"),
  )
  setDungeonTarget(targetMapId)
  setTravelExperience(null)
  setMapMode("dungeon_square")
  setLastCommand(command)
}

function enterAreaTarget(
  areaMapId: string,
  command: string,
  options: { readonly entrySide?: AddAreaEntrySide | null } = {},
): void {
  const entrySide = options.entrySide ?? areaEntrySideForWorldAreaEntry()
  setAreaTarget(areaMapId)
  setAreaEntrySide(entrySide)
  setTravelExperience(null)
  setMapMode("area_hex")
  setLastCommand(command)
}

function switchMapModeFromTab(nextMode: AddMapMode): void {
  if (nextMode === "base_square" && !baseNavigationAvailable()) return

  if (nextMode !== "dungeon_square") {
    switchMapMode(nextMode)
    return
  }

  if (mapMode() === "dungeon_square") return

  const baseEntrance = mapMode() === "base_square" ? baseDungeonEntranceInteraction() : null
  if (baseEntrance) {
    enterDungeonInteraction(baseEntrance)
    return
  }

  const link = heroDungeonLink()
  if (link) {
    enterDungeonLink(link)
    return
  }

  switchMapMode(nextMode, { dungeonTargetId: dungeonTarget() })
}

function returnToOverworldFromDungeon(): void {
  if (mapMode() === "overworld_hex") return
  const returnMode = mapMode() === "dungeon_square" ? dungeonReturnMode() : "overworld_hex"
  setTravelExperience(null)
  setMapMode(returnMode)
  setLastCommand(
    returnMode === "base_square"
      ? "return:studio"
      : returnMode === "area_hex"
        ? "return:area"
        : "return:overworld",
  )
}

function dungeonReturnLabel(): string {
  switch (dungeonReturnMode()) {
    case "base_square":
      return "Return to The Studio"
    case "area_hex":
      return "Return to Studio Grounds"
    default:
      return "Return to World"
  }
}

function enterDungeonLink(link: AddPhaserMapInfo["character"]["dungeonLinksAtCell"][number]): void {
  if (Date.now() - lastTileActionAtMs < 120) return
  enterDungeonTarget(link.targetMapId, `hero-link-enter:${link.targetMapId}`, {
    returnMode: "overworld_hex",
  })
}

function handleTileActivation(event: AddTileActivationEvent): void {
  if (Date.now() - lastTileActionAtMs < 120) return
  const selected = mapController.selectCell(event.cell)
  if (selected) refreshMapInfo()
  const detail = discoveryState()?.tileDetail
  if (!detail || detail.cell !== event.cell) return
  const action = selectPreferredTileAction(detail)
  if (!action) return
  lastTileActionAtMs = Date.now()
  setLastTileActionTarget(action.linkId ?? event.cell)
  runTileDetailAction(detail, action)
}

function enterDungeonInteraction(interaction: GameInteraction): void {
  const targetMapId = dungeonTargetMapIdForInteraction(interaction)
  if (!targetMapId) return
  const currentMode = mapMode()
  setLastTileActionTarget(targetMapId)
  enterDungeonTarget(targetMapId, `interaction-enter:${targetMapId}`, {
    returnMode:
      currentMode === "base_square" || currentMode === "area_hex" ? currentMode : "overworld_hex",
  })
}

function dungeonTargetMapIdForInteraction(interaction: GameInteraction): string | null {
  const metadataTarget = interaction.metadata?.targetMapId
  if (typeof metadataTarget === "string" && metadataTarget.length > 0) return metadataTarget
  return interaction.target.kind === "map" && interaction.target.id.length > 0
    ? interaction.target.id
    : null
}

function runCurrentTileDetailAction(event: Event): void {
  event.preventDefault()
  event.stopPropagation()
  const button =
    event.target instanceof HTMLElement
      ? event.target.closest<HTMLButtonElement>("button[data-action-id]")
      : event.currentTarget instanceof HTMLElement
        ? event.currentTarget.closest<HTMLButtonElement>("button[data-action-id]")
        : null
  if (!button) return
  const actionId = button.dataset.actionId
  const targetMapMode = button.dataset.targetMapMode
  const targetMapId = button.dataset.targetMapId
  if (!actionId) return
  lastTileActionAtMs = Date.now()
  if (targetMapMode === "dungeon_square" && targetMapId) {
    setLastTileActionTarget(targetMapId)
    enterDungeonTarget(targetMapId, `tile-enter:${targetMapId}`)
    return
  }
  if (targetMapMode === "base_square") {
    openBaseManagementView("tile-open:base", targetMapId ?? "base_square")
    return
  }
  if (targetMapMode === "area_hex" && targetMapId) {
    setLastTileActionTarget(targetMapId)
    enterAreaTarget(targetMapId, `tile-enter-area:${targetMapId}`)
    return
  }
  if (!actionId) return
  const detail = discoveryState()?.tileDetail
  const action = detail?.actions.find((candidate) => candidate.id === actionId)
  if (!detail || !action) return
  runTileDetailAction(detail, action)
}

function runTileDetailAction(detail: AddTileDetailSummary, action: AddTileAction): void {
  if (action.kind === "travel") {
    void runSelectedTileTravelAction(detail)
    return
  }
  if (!action.enabled || !action.linkId) return
  const link = detail.links.find((candidate) => candidate.id === action.linkId)
  if (!link?.targetMapMode) return

  if (link.targetMapMode === "dungeon_square" && link.targetMapId) {
    enterDungeonTarget(link.targetMapId, `tile-enter:${link.targetMapId}`)
    return
  }

  if (link.targetMapMode === "base_square") {
    openBaseManagementView("tile-open:base")
    return
  }

  if (link.targetMapMode === "area_hex" && link.targetMapId) {
    enterAreaTarget(link.targetMapId, `tile-enter-area:${link.targetMapId}`)
  }
}

function refreshMapInfo(): void {
  setMapInfo(mapController.getInfo())
}

function zoomMap(factor: number): void {
  mapController.zoomBy(factor)
  refreshMapInfo()
}

function mapZoomReadout(): string {
  const rounded = Math.round(mapInfo().camera.zoom * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}x`
}

function resetMapCamera(): void {
  mapController.resetCamera()
  refreshMapInfo()
}

function focusMap(target: "hero" | "base" | "cave"): void {
  mapController.focusOn(target)
  refreshMapInfo()
}

function shouldShowCaveCameraAnchor(): boolean {
  if (mapMode() !== "overworld_hex") return false
  const info = mapInfo()
  const caveVisible = info.landmarks.survivorCaveVisible
  const heroAtCave =
    info.character.coord !== null &&
    info.landmarks.survivorCave !== null &&
    info.character.coord === info.landmarks.survivorCave
  return caveVisible && heroAtCave
}

function handleOnline(): void {
  setOnline(true)
}

function handleOffline(): void {
  setOnline(false)
}

function maybeRestoreAutosaveOnBoot(_initialSnapshot: SimulationSnapshot): void {
  if (autosaveRestoreAttempted) return
  autosaveRestoreAttempted = true

  const record = refreshAutosaveFromStorage()
  if (!record) {
    setSaveStatus("No autosave")
    maybeRequestAutosave()
    return
  }

  queuedOfflineCatchupSeconds = offlineCatchupSecondsFor(record)
  setSavePayload(record.payload)
  setLastCommand("load_autosave")
  setSaveStatus(
    queuedOfflineCatchupSeconds > 0
      ? `Loading autosave +${formatDuration(queuedOfflineCatchupSeconds)}`
      : "Loading autosave",
  )
  sendWorkerRequest({ type: "importSave", payload: record.payload })
}

function maybeRunQueuedOfflineCatchup(): boolean {
  if (queuedOfflineCatchupSeconds <= 0) return false

  const seconds = queuedOfflineCatchupSeconds
  queuedOfflineCatchupSeconds = 0
  prepareOfflineReturnSummary(seconds, "autosave")
  setLastOfflineCatchupSeconds(seconds)
  setLastCommand(`offline:${formatDuration(seconds)}`)
  setSaveStatus(`Catching up ${formatDuration(seconds)}`)
  sendWorkerRequest({ type: "offlineCatchup", elapsedSeconds: seconds })
  return true
}

function prepareOfflineReturnSummary(
  elapsedSeconds: number,
  source: AddOfflineReturnSummary["source"],
): void {
  const before = captureSnapshot()
  if (!before || elapsedSeconds <= 0) {
    pendingOfflineReturnSummary = null
    setOfflineReturnSummary(null)
    return
  }
  pendingOfflineReturnSummary = { before, elapsedSeconds, source }
  setOfflineReturnSummary(null)
}

function maybeFinalizeOfflineReturnSummary(after: SimulationSnapshot): void {
  const pending = pendingOfflineReturnSummary
  if (!pending) return

  const currentCatalog = catalog()
  if (!currentCatalog) return

  pendingOfflineReturnSummary = null
  setOfflineReturnSummary(
    selectAddOfflineReturnSummary(
      pending.before,
      after,
      currentCatalog,
      pending.elapsedSeconds,
      pending.source,
    ),
  )
}

function maybeRequestAutosave(): void {
  if (!ready() || !autosaveEnabled()) return
  const now = Date.now()
  if (now - lastAutosaveRequestMs < 3000) return
  lastAutosaveRequestMs = now
  void requestSave("autosave")
}

async function exportSaveNow(): Promise<void> {
  await requestSave("manual")
}

async function loadAutosave(): Promise<void> {
  const record = refreshAutosaveFromStorage()
  if (!record) {
    setStorageError("No browser autosave is available.")
    return
  }

  queuedOfflineCatchupSeconds = offlineCatchupSecondsFor(record)
  pendingOfflineReturnSummary = null
  setOfflineReturnSummary(null)
  setSavePayload(record.payload)
  setLastImportAtMs(Date.now())
  await sendAndWaitForSnapshot(() => {
    setLastCommand("load_autosave")
    setSaveStatus(
      queuedOfflineCatchupSeconds > 0
        ? `Loading autosave +${formatDuration(queuedOfflineCatchupSeconds)}`
        : "Loading autosave",
    )
    sendWorkerRequest({ type: "importSave", payload: record.payload })
  })
}

async function importSaveText(): Promise<void> {
  const payload = savePayload().trim()
  if (!payload) {
    setStorageError("Paste a save payload before importing.")
    return
  }
  try {
    JSON.parse(payload)
  } catch {
    setLastEvent("error")
    setLastError("Save payload is not valid JSON.")
    setStorageError("Save payload is not valid JSON.")
    return
  }

  queuedOfflineCatchupSeconds = 0
  pendingOfflineReturnSummary = null
  setOfflineReturnSummary(null)
  await sendAndWaitForSnapshot(() => {
    setLastCommand("import_save")
    setStorageError(null)
    sendWorkerRequest({ type: "importSave", payload })
  })

  if (!lastError()) {
    setLastImportAtMs(Date.now())
    await requestSave("import")
  }
}

async function runOfflineCatchup(seconds: number): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    prepareOfflineReturnSummary(seconds, "manual")
    setLastOfflineCatchupSeconds(seconds)
    setLastCommand(`offline:${formatDuration(seconds)}`)
    setSaveStatus(`Catching up ${formatDuration(seconds)}`)
    sendWorkerRequest({ type: "offlineCatchup", elapsedSeconds: seconds })
  })
  if (!lastError()) void requestSave("offline_catchup")
}

function clearBrowserAutosave(): void {
  try {
    clearAutosave()
    setAutosaveRecord(null)
    setSavePayload("")
    setSaveStatus("No autosave")
    setStorageError(null)
  } catch (error) {
    setStorageError(error instanceof Error ? error.message : String(error))
  }
}

async function requestSave(source: AddSaveSource): Promise<string | null> {
  if (!ready()) return runtimeBridge.latestSavePayload
  pendingSaveSource = source
  return runtimeBridge.requestSave()
}

function persistSavePayload(payload: string, source: AddSaveSource): void {
  const record = createSaveRecord(payload, snapshot(), source)
  try {
    writeAutosave(record)
    setAutosaveRecord(record)
    if (source !== "autosave" || savePayload().trim().length === 0) {
      setSavePayload(payload)
    }
    if (source === "manual") setLastManualExportAtMs(record.savedAtMs)
    if (source === "import") setLastImportAtMs(record.savedAtMs)
    setSaveStatus(`${source === "autosave" ? "Autosaved" : "Saved"} ${formatSaveTimestamp(record)}`)
    setStorageError(null)
  } catch (error) {
    setStorageError(error instanceof Error ? error.message : String(error))
  } finally {
    pendingSaveSource = "autosave"
  }
}

function refreshAutosaveFromStorage(): AddBrowserSaveRecord | null {
  const record = readAutosave()
  setAutosaveRecord(record)
  if (record) setSaveStatus(formatSaveTimestamp(record))
  return record
}

function lastOfflineCopy(): string {
  const seconds = lastOfflineCatchupSeconds()
  if (seconds <= 0) return online() ? "Ready" : "Browser offline"
  return `${formatDuration(seconds)} applied`
}

async function handleDoorToggle(coord: CellCoord): Promise<void> {
  // Doors are Rust-authoritative: send openDoor and let the new snapshot drive
  // the door overlay + FOV recompute (and the swing animation in the scene).
  const dungeonId = addDungeonByMapId(dungeonTarget())?.id ?? dungeonTarget()
  const key = dungeonDoorKey(dungeonId, coord)
  await sendAndWaitForSnapshot(() => {
    sendWorkerRequest({ type: "openDoor", key })
  })
}

async function handleClearLocation(
  coord: CellCoord,
  lootTable: string | undefined,
): Promise<void> {
  // Per-location facts are Rust-authoritative: clearLocation loots once + records
  // the cell, and the new snapshot drives the cleared-location overlay. The loot
  // is rolled from data here (deterministic per location) and sent resolved.
  const dungeonId = addDungeonByMapId(dungeonTarget())?.id ?? dungeonTarget()
  const key = dungeonLocationKey(dungeonId, coord)
  const drop = lootTable ? lootDropForLocation(lootTable, key) : undefined
  await sendAndWaitForSnapshot(() => {
    sendWorkerRequest({ type: "clearLocation", key, lootItem: drop?.itemId, lootQty: drop?.qty ?? 0 })
  })
}

async function handlePickUp(coord: CellCoord): Promise<void> {
  const dungeonId = addDungeonByMapId(dungeonTarget())?.id ?? dungeonTarget()
  const key = dungeonLocationKey(dungeonId, coord)
  await sendAndWaitForSnapshot(() => {
    sendWorkerRequest({ type: "pickUpLocation", key })
  })
}

async function handleUseItem(itemId: string): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand(`use:${itemId}`)
    sendWorkerRequest({ type: "useItem", itemId })
  })
}

async function handleDropItem(itemId: string): Promise<void> {
  // Drop one of the item onto the Hero's current dungeon cell.
  const coord = mapController.getRendererState().controlledEntity.coord
  if (!coord) return
  const dungeonId = addDungeonByMapId(dungeonTarget())?.id ?? dungeonTarget()
  const key = dungeonLocationKey(dungeonId, coord)
  await sendAndWaitForSnapshot(() => {
    sendWorkerRequest({ type: "dropItem", key, itemId, qty: 1 })
  })
}

async function handleCharacterTravel(event: AddCharacterTravelEvent): Promise<void> {
  const currentSnapshot = snapshot()
  if (!currentSnapshot) return
  // Read the "before" figures now, as values. The store is reconciled in place,
  // so `currentSnapshot` will be showing the post-travel numbers by the time the
  // journey resolves.
  const discoveredBefore = currentSnapshot.discoveredCells.length
  const toxicityBefore = currentSnapshot.heroSurvival.viralLoadRatio

  if (travelClearTimer !== undefined) {
    window.clearTimeout(travelClearTimer)
    travelClearTimer = undefined
  }

  // Overworld hex = 1 in-game hour per tile; dungeon square = ~1 in-game second.
  const travelTiming =
    mapMode() === "overworld_hex" ? ADD_TILE_TRAVEL_PRESENTATION : ADD_DUNGEON_STEP_PRESENTATION
  const fromClockSeconds = currentSnapshot.clockSeconds
  const toClockSeconds = fromClockSeconds + travelTiming.runtimeSeconds
  const startedAtMs = Date.now()
  const arrivalAtMs = startedAtMs + travelTiming.durationMs

  setTravelExperience({
    phase: "traveling",
    event,
    fromClockSeconds,
    toClockSeconds,
    fromTime: selectAddWorldTimeForClockSeconds(fromClockSeconds),
    toTime: selectAddWorldTimeForClockSeconds(toClockSeconds),
    startedAtMs,
    arrivalAtMs,
    runtimeSynced: false,
    toxicityBefore: currentSnapshot.heroSurvival.viralLoadRatio,
    toxicityAfter: null,
  })
  animatePresentationClockTo(toClockSeconds, "tile_travel")

  mapController.setTravelLocked(true)
  try {
    await Promise.all([
      tickRuntime(travelTiming.runtimeSeconds, {
        queue: true,
        commandLabel: `travel:${event.direction}`,
      }),
      waitForTravelPresentation(startedAtMs, travelTiming.durationMs),
    ])
  } finally {
    mapController.setTravelLocked(false)
    // Settle the presentation clock to the authoritative clock at arrival so the
    // tile-hour lands exactly; ambient ticking resumes from here.
    cancelClockAnimation()
    setDisplayClockSeconds(snapshot()?.clockSeconds ?? toClockSeconds)
  }

  await revealHeroDestination(event)

  const afterSnapshot = snapshot()
  if (afterSnapshot) {
    setLastDiscoveryMovement({
      fromCell: event.fromCell,
      toCell: event.toCell,
      destinationLabel: event.destinationLabel,
      exposureRisk: event.exposureRisk,
      gameMinutes: travelTiming.visibleGameMinutes,
      discoveredBefore,
      discoveredAfter: afterSnapshot.discoveredCells.length,
      toxicityBefore,
      toxicityAfter: afterSnapshot.heroSurvival.viralLoadRatio,
    })
  }
  setTravelExperience((current) =>
    current
      ? {
          ...current,
          phase: "arrived",
          runtimeSynced: true,
          toxicityAfter: afterSnapshot?.heroSurvival.viralLoadRatio ?? current.toxicityBefore,
        }
      : current,
  )

  travelClearTimer = window.setTimeout(() => {
    setTravelExperience(null)
    travelClearTimer = undefined
  }, 3600)
}

function waitForTravelPresentation(startedAtMs: number, durationMs: number): Promise<void> {
  const remainingMs = Math.max(0, startedAtMs + durationMs - Date.now())
  if (remainingMs <= 0) return Promise.resolve()
  return new Promise((resolve) => {
    window.setTimeout(resolve, remainingMs)
  })
}

async function revealHeroDestination(event: AddCharacterTravelEvent): Promise<void> {
  const toCoord = event.toCoord
  if (toCoord.kind !== "hex") return
  await sendAndWaitForSnapshot(() => {
    setLastCommand(`hero_move:${toCoord.q},${toCoord.r}`)
    sendWorkerRequest({ type: "moveHeroTo", q: toCoord.q, r: toCoord.r })
  })
}

async function tickRuntime(
  seconds: number,
  options: { readonly queue?: boolean; readonly commandLabel?: string } = {},
): Promise<void> {
  if (!ready()) return
  if (runtimeBridge.commandInFlight && !options.queue) return
  await sendAndWaitForSnapshot(() => {
    setLastCommand(options.commandLabel ?? `tick:${seconds.toFixed(1)}s`)
    sendWorkerRequest({ type: "tick", seconds })
  })
}

async function toggleHero(): Promise<void> {
  const currentSnapshot = snapshot()
  if (!currentSnapshot) return
  await sendAndWaitForSnapshot(() => {
    const assigned = !currentSnapshot.roster.heroAssigned
    setLastCommand(assigned ? "assign_hero" : "unassign_hero")
    sendWorkerRequest({ type: "assignHero", assigned })
  })
}

async function chooseStoryOption(beatId: string, optionId: string): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand("choose_story_option")
    sendWorkerRequest({ type: "chooseStoryOption", beatId, optionId })
  })
}

async function chooseInkChoice(beatId: string, index: number): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand("choose_ink_choice")
    sendWorkerRequest({ type: "chooseInkChoice", beatId, index })
  })
}

function captureBaseRateSnapshot(): readonly BaseRateSnapshotResource[] {
  const state = baseManagementState()
  return (state?.resources ?? []).map((resource) => ({
    id: resource.id,
    label: resource.label,
    netPerSecond: resource.netPerSecond,
    gainPerSecond: resource.gainPerSecond,
    spendPerSecond: resource.spendPerSecond,
  }))
}

function baseRateDeltaChanges(
  before: readonly BaseRateSnapshotResource[],
  after: readonly BaseRateSnapshotResource[],
): BaseRateChange["changes"] {
  const beforeById = new Map(before.map((resource) => [resource.id, resource]))
  return after
    .map((resource) => {
      const previous = beforeById.get(resource.id)
      const beforeNetPerSecond = previous?.netPerSecond ?? resource.netPerSecond
      const gainDelta = resource.gainPerSecond - (previous?.gainPerSecond ?? resource.gainPerSecond)
      const spendDelta = resource.spendPerSecond - (previous?.spendPerSecond ?? resource.spendPerSecond)
      const netDelta = resource.netPerSecond - beforeNetPerSecond
      const displayDelta =
        Math.abs(gainDelta) >= 0.001
          ? gainDelta
          : Math.abs(spendDelta) >= 0.001
            ? -spendDelta
            : netDelta
      return {
        id: resource.id,
        label: resource.label,
        beforeNetPerSecond,
        afterNetPerSecond: resource.netPerSecond,
        deltaPerSecond: displayDelta,
      }
    })
    .filter((change) => Math.abs(change.deltaPerSecond) >= 0.001)
    .sort((left, right) => Math.abs(right.deltaPerSecond) - Math.abs(left.deltaPerSecond))
    .slice(0, 4)
}

function recordBaseRateChange(
  before: readonly BaseRateSnapshotResource[],
  reason: string,
): void {
  const after = captureBaseRateSnapshot()
  const changes = baseRateDeltaChanges(before, after)

  setBaseRateChange({
    reason,
    changedAtMs: Date.now(),
    summary:
      changes.length > 0
        ? changes
            .map((change) => `${change.label} ${signedRateCopy(change.deltaPerSecond)}`)
            .join(" · ")
        : "No visible rate change yet",
    changes:
      changes.length > 0
        ? changes
        : after.slice(0, 3).map((resource) => ({
            id: resource.id,
            label: resource.label,
            beforeNetPerSecond: resource.netPerSecond,
            afterNetPerSecond: resource.netPerSecond,
            deltaPerSecond: 0,
      })),
  })
}

function resourceIdForRoleRateChange(roleId: string): string | null {
  switch (roleId) {
    case ROLE_CRYSTAL_BASSLINE:
      return RESOURCE_BASSLINE
    case ROLE_CRYSTAL_CHORUS:
      return RESOURCE_CHORUS
    case ROLE_CRYSTAL_HARMONICS:
      return RESOURCE_HARMONICS
    case ROLE_SCAVENGE:
      return RESOURCE_STONE
    case ROLE_WATER:
      return RESOURCE_WATER
    case ROLE_FIRE_PIT:
      return RESOURCE_VIBES
    default:
      return null
  }
}

async function waitForBaseRateChange(
  before: readonly BaseRateSnapshotResource[],
  roleId: string,
): Promise<void> {
  const resourceId = resourceIdForRoleRateChange(roleId)
  const deadline = Date.now() + 4000
  while (Date.now() < deadline && !lastError()) {
    const changes = baseRateDeltaChanges(before, captureBaseRateSnapshot())
    const changed = resourceId
      ? changes.some((change) => change.id === resourceId)
      : changes.length > 0
    if (changed) return
    const beforeVersion = runtimeBridge.currentSnapshotVersion
    await waitForSnapshotAfter(beforeVersion)
    if (runtimeBridge.currentSnapshotVersion === beforeVersion) {
      await new Promise((resolve) => window.setTimeout(resolve, 120))
    }
  }
}

function roleLabelForRateChange(roleId: string): string {
  return baseManagementState()?.roles.find((role) => role.id === roleId)?.label ?? roleId
}

async function waitForHeroRole(roleId: string): Promise<void> {
  const deadline = Date.now() + 4000
  while (Date.now() < deadline && snapshot()?.roster.heroRoleId !== roleId && !lastError()) {
    const beforeVersion = runtimeBridge.currentSnapshotVersion
    await waitForSnapshotAfter(beforeVersion)
    if (runtimeBridge.currentSnapshotVersion === beforeVersion) return
  }
}

async function waitForRoleCrew(roleId: string, crew: number): Promise<void> {
  const deadline = Date.now() + 4000
  while (
    Date.now() < deadline &&
    baseManagementState()?.roles.find((role) => role.id === roleId)?.crewAssigned !== crew &&
    !lastError()
  ) {
    const beforeVersion = runtimeBridge.currentSnapshotVersion
    await waitForSnapshotAfter(beforeVersion)
    if (runtimeBridge.currentSnapshotVersion === beforeVersion) return
  }
}

async function setHeroRole(
  roleId: string,
  options: { readonly trackRateChange?: boolean } = {},
): Promise<void> {
  const before = options.trackRateChange === false ? [] : captureBaseRateSnapshot()
  await sendAndWaitForSnapshot(() => {
    setLastCommand(`hero_role:${roleId}`)
    sendWorkerRequest({ type: "setHeroRole", roleId })
  })
  await waitForHeroRole(roleId)
  if (options.trackRateChange !== false) {
    await waitForBaseRateChange(before, roleId)
    recordBaseRateChange(before, `Hero moved to ${roleLabelForRateChange(roleId)}.`)
  }
}

async function setRoleCrew(
  roleId: string,
  crew: number,
  options: { readonly trackRateChange?: boolean } = {},
): Promise<void> {
  const before = options.trackRateChange === false ? [] : captureBaseRateSnapshot()
  await sendAndWaitForSnapshot(() => {
    setLastCommand(`crew:${roleId}:${crew}`)
    sendWorkerRequest({ type: "setRoleCrew", roleId, crew })
  })
  await waitForRoleCrew(roleId, crew)
  if (options.trackRateChange !== false) {
    await waitForBaseRateChange(before, roleId)
    recordBaseRateChange(before, `Crew changed on ${roleLabelForRateChange(roleId)}.`)
  }
}

async function setFirstPlayableRoleCrew(roleId: string, crew: number): Promise<void> {
  const before = captureBaseRateSnapshot()
  const assignments = uiState()?.roleAssignments ?? []
  for (const role of assignments) {
    if (role.id !== roleId && role.crewAssigned > 0) {
      await setRoleCrew(role.id, 0, { trackRateChange: false })
    }
  }
  await setRoleCrew(roleId, crew, { trackRateChange: false })
  recordBaseRateChange(before, `Crew moved to ${roleLabelForRateChange(roleId)}.`)
}

async function applyStaffingPreset(
  presetId: AddBaseManagementState["staffing"]["presets"][number]["id"],
): Promise<void> {
  const state = baseManagementState()
  const preset = state?.staffing.presets.find((candidate) => candidate.id === presetId)
  if (!state || !preset?.enabled) return

  const before = captureBaseRateSnapshot()
  await setHeroRole(preset.heroRoleId, { trackRateChange: false })
  for (const role of state.roles) {
    if (role.crewAssigned > 0) await setRoleCrew(role.id, 0, { trackRateChange: false })
  }
  for (const [roleId, crew] of Object.entries(preset.crewByRole)) {
    if (crew > 0) await setRoleCrew(roleId, crew, { trackRateChange: false })
  }
  setLastCommand(`staffing_preset:${preset.id}`)
  recordBaseRateChange(before, `${preset.label} preset applied.`)
}

async function startConstruction(optionId: string): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand(`construction:${optionId}`)
    sendWorkerRequest({ type: "startConstruction", optionId })
  })
}

async function setStationEnabled(stationId: string, enabled: boolean): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand(`station:${stationId}:${enabled ? "on" : "off"}`)
    sendWorkerRequest({ type: "setStationEnabled", stationId, enabled })
  })
}

async function startProcessing(recipeId: string): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand(`processing:${recipeId}`)
    sendWorkerRequest({ type: "startProcessing", recipeId })
  })
}

async function startResonanceRecipe(recipeId: string): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand(`resonance:${recipeId}`)
    sendWorkerRequest({ type: "startResonanceRecipe", recipeId })
  })
}

async function setStationSpecialization(
  stationId: string,
  path: StationSpecializationPath,
): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand(`specialization:${stationId}:${path}`)
    sendWorkerRequest({ type: "setStationSpecialization", stationId, path })
  })
}

async function startExpedition(targetId: string, assignedCrew: number): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand(`expedition:${targetId}:${assignedCrew}`)
    sendWorkerRequest({ type: "startExpedition", targetId, assignedCrew })
  })
}

async function clearExpeditionReports(): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand("expedition_reports:clear")
    sendWorkerRequest({ type: "clearExpeditionReports" })
  })
}

async function recruitFromSurvivorCave(): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand("recruit_from_survivor_cave")
    sendWorkerRequest({ type: "recruitFromSurvivorCave" })
  })
}

async function runBaseRecommendedAction(state: AddBaseManagementState): Promise<void> {
  const action = state.recommendedAction
  if (!action.enabled || !action.targetId) return
  switch (action.kind) {
    case "assign_role":
      if (!snapshot()?.roster.heroAssigned) {
        await setHeroRole(action.targetId)
        return
      }
      await setRoleCrew(
        action.targetId,
        state.roles.find((role) => role.id === action.targetId)?.suggestedCrew ?? 1,
      )
      return
    case "start_construction":
      await startConstruction(action.targetId)
      return
    case "power_station":
      await setStationEnabled(action.targetId, true)
      return
    case "start_processing":
      await startProcessing(action.targetId)
      return
    case "start_resonance_recipe":
      await startResonanceRecipe(action.targetId)
      return
    case "start_expedition": {
      const target = state.expeditions.targets.find((candidate) => candidate.id === action.targetId)
      if (target) await startExpedition(target.id, target.requiredCrew)
      return
    }
    case "recruit_survivor":
      await recruitFromSurvivorCave()
      return
    case "wait": {
      const horizonSeconds = state.economy.waitForecasts[0]?.horizonSeconds ?? 60
      await tickRuntime(horizonSeconds, { queue: true })
      return
    }
  }
}

async function runCurrentAction(): Promise<void> {
  const action = currentActionState()
  if (!action.primaryEnabled) return

  switch (action.source) {
    case "offline_return":
      dismissOfflineReturnSummary()
      return
    case "dungeon_objective":
      returnToOverworldFromDungeon()
      return
    case "base_loop": {
      if (action.actionId?.startsWith("first-playable:")) {
        await runFirstPlayableAction()
        return
      }
      const state = baseManagementState()
      if (state) await runBaseRecommendedAction(state)
      return
    }
    case "discovery": {
      if (action.kind === "open_base" && action.actionId === ADD_DISCOVERY_OPEN_BASE_ACTION_ID) {
        await completePreArrivalRoute()
        openBaseManagementView("discovery-open:base")
        return
      }
      if (action.kind === "travel" && action.actionId === "travel:selected-tile") {
        const detail = discoveryState()?.tileDetail
        if (detail) await runSelectedTileTravelAction(detail)
        return
      }
      const link = discoveryActionLinkFor(action.actionId)
      if (link) await runDiscoveryAction(link)
      return
    }
    case "first_playable":
      if (action.actionId === OPENING_ROUTE_ACTION_ID) {
        previewOpeningRouteToStudio()
        return
      }
      await runFirstPlayableAction()
      return
    case "runtime":
      return
  }
}

async function acquirePerk(perkId: string): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand(`perk:${perkId}`)
    sendWorkerRequest({ type: "acquirePerk", perkId })
  })
}

async function resetRuntime(): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand("reset")
    setResetCount((count) => count + 1)
    travelDramaState = "fresh"
    setBaseNavigationUnlocked(false)
    setTravelDialog(null)
    pendingOfflineReturnSummary = null
    setOfflineReturnSummary(null)
    setLastDiscoveryMovement(null)
    sendWorkerRequest({ type: "reset" })
  })
  if (!lastError()) await requestSave("reset")
}

async function runFirstPlayableAction(): Promise<void> {
  const action = currentFirstPlayableExecutableAction()
  if (!action) return
  await runAddAction(action)
}

function currentFirstPlayableExecutableAction(): AddFirstPlayableAction | null {
  const stepAction = currentFirstPlayableStep()?.action ?? null
  if (stepAction) return stepAction
  const primaryAction = uiState()?.storyProgression.primaryAction
  if (primaryAction?.enabled && primaryAction.action) return primaryAction.action
  return null
}

async function completePreArrivalRoute(): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand("complete_pre_arrival_route")
    sendWorkerRequest({ type: "completePreArrivalRoute" })
  })
}

async function runDiscoveryAction(link: AddDiscoveryActionLink): Promise<void> {
  if (!link.enabled) return
  if (link.kind === "dungeon_entry") {
    enterDiscoveryDungeon()
    return
  }
  if (link.action) await runAddAction(link.action)
}

function enterDiscoveryDungeon(): void {
  const entry = discoveryState()?.dungeonEntry
  if (!entry?.enabled) return
  enterDungeonTarget(entry.targetMapId, `discovery-enter:${entry.targetMapId}`, {
    returnMode: "overworld_hex",
  })
}

async function runAddAction(action: AddFirstPlayableAction): Promise<void> {
  switch (action.type) {
    case "preview_route_to_base":
      previewOpeningRouteToStudio()
      return
    case "choose_story_option":
      await chooseStoryOption(action.beatId, action.optionId)
      return
    case "assign_hero":
      await sendAndWaitForSnapshot(() => {
        setLastCommand(action.assigned ? "assign_hero" : "unassign_hero")
        sendWorkerRequest({ type: "assignHero", assigned: action.assigned })
      })
      return
    case "set_hero_role":
      await setHeroRole(action.roleId)
      return
    case "set_role_crew":
      await setFirstPlayableRoleCrew(action.roleId, action.crew)
      return
    case "start_world_action":
      await sendAndWaitForSnapshot(() => {
        setLastCommand(`world_action:${action.actionId}`)
        sendWorkerRequest({ type: "startWorldAction", actionId: action.actionId })
      })
      return
    case "start_construction":
      await startConstruction(action.optionId)
      return
    case "tick":
      await tickRuntime(action.seconds, { queue: true })
      return
    case "recruit_from_survivor_cave":
      await sendAndWaitForSnapshot(() => {
        setLastCommand("recruit_from_survivor_cave")
        sendWorkerRequest({ type: "recruitFromSurvivorCave" })
      })
  }
}

async function runInteraction(interaction: GameInteraction | undefined): Promise<void> {
  if (!interaction) return
  const command = addCommandForGameInteraction(interaction)
  if (!command) return
  const request = workerRequestForAddCommand(command)
  await sendAndWaitForSnapshot(() => {
    setLastCommand(command.kind)
    sendWorkerRequest(request)
  })
}

function sendWorkerRequest(request: WorkerRequest): void {
  if (runtimeBridge.dispatch(request)) return
  setLastError(`Command ${request.type} is not exposed by this shell yet.`)
}

async function sendAndWaitForSnapshot(send: () => void): Promise<void> {
  await runtimeBridge.sendAndWaitForSnapshot(send)
}

async function waitForSnapshotAfter(afterVersion: number): Promise<void> {
  await runtimeBridge.waitForSnapshotAfter(afterVersion)
}

function toTextState(): RuntimeTextState {
  const currentSnapshot = snapshot()
  const currentCatalog = catalog()
  const currentUi = uiState()
  const currentMapInfo = mapController.getInfo()
  const activeTile = activeTileForMapInfo(currentMapInfo)
  const currentDiscovery =
    currentSnapshot && currentCatalog
      ? selectAddDiscoverySummary({
          snapshot: currentSnapshot,
          catalog: currentCatalog,
          heroCell: currentMapInfo.character.cell,
          selectedTile: activeTile,
          previewTile: activeTile,
          heroDungeonLinks: currentMapInfo.character.dungeonLinksAtCell,
          selectedDungeonLinks: currentMapInfo.dungeonLinks.selected,
          travel: {
            active: travelExperience()?.phase === "traveling" || currentMapInfo.travel.active,
            phase:
              travelExperience()?.phase ??
              (currentMapInfo.travel.previewCell ? "preview" : "idle"),
            previewCell: currentMapInfo.travel.previewCell,
            destinationLabel:
              travelExperience()?.event.destinationLabel ??
              currentMapInfo.travel.destinationLabel ??
              currentMapInfo.travel.previewLabel,
            exposureRisk:
              travelExperience()?.event.exposureRisk ??
              currentMapInfo.travel.exposureRisk ??
              currentMapInfo.travel.previewExposureRisk,
            previewAdjacent: currentMapInfo.travel.previewAdjacent,
            gameMinutes: currentMapInfo.travel.costGameMinutes,
          },
          lastMovement: lastDiscoveryMovement(),
        })
      : null
  const currentDungeonObjective = selectAddDungeonObjective({
    mapMode: mapMode(),
    dungeonMapId: mapMode() === "dungeon_square" ? dungeonTarget() : null,
    heroCell: currentMapInfo.character.cell,
  })
  return createAddRuntimeTextState({
    snapshot: currentSnapshot,
    catalog: currentCatalog,
    ui: currentUi,
    displayedWorldTime: displayedWorldTime(),
    displayClockSeconds: displayClockSeconds(),
    clockAnimation: clockAnimation(),
    mapInfo: currentMapInfo,
    discovery: currentDiscovery,
    availableCommands: availableCommandsState(),
    baseManagement: baseManagementState(),
    baseManagementTab: baseManagementTab(),
    baseRateChange: baseRateChange(),
    dungeonObjective: currentDungeonObjective,
    mapMode: mapMode(),
    mapModeAvailable: mapModeNavigationItems().map((item) => item.id),
    dungeonTarget: mapMode() === "dungeon_square" ? dungeonTarget() : null,
    lastDungeonEntryCommand: lastDungeonEntryCommand(),
    lastTileActionTarget: lastTileActionTarget(),
    currentAction: currentActionState(),
    returnReviewNextAction: returnReviewNextAction(),
    interfaceHierarchy: interfaceHierarchyState(),
    baseViewTransition: baseViewTransition(),
    shellMenuOpen: shellMenuOpen(),
    settingsOpen: settingsOpen(),
    adminOpen: adminOpen(),
    devToolsOpen: devToolsOpen(),
    focusedRegion: focusedRegion(),
    discoveryPanelCollapsed: discoveryPanelCollapsed(),
    firstPlayableCollapsed: firstPlayableCollapsed(),
    floatingPanels: floatingPanelTelemetry(),
    questPanelPosition: questPanelPosition(),
    questPanelInteraction: {
      dragging: questPanelDragging(),
      lastAction: lastQuestPanelAction(),
      dragEnabled: true,
      keyboardMoveEnabled: true,
      collapseControlLabel: objectivePanelToggleLabel(),
    },
    runtime: {
      ready: ready(),
      autoTick: autoTick(),
      timeSpeed: timeSpeed(),
      online: online(),
      lastEvent: lastEvent(),
      lastCommand: lastCommand(),
      error: lastError(),
    },
    travel: {
      experience: travelExperience(),
      dramaState: travelDramaState,
      dialogKind: travelDialog()?.kind ?? null,
      confirmationEligibility: openingTravelDialogEligibility(currentMapInfo),
    },
    offlineReturn: offlineReturnSummary(),
    persistence: {
      autosaveEnabled: autosaveEnabled(),
      autosaveAvailable: autosaveRecord() !== null,
      lastAutosaveAtMs: autosaveRecord()?.savedAtMs ?? null,
      lastAutosaveClockSeconds: autosaveRecord()?.clockSeconds ?? null,
      lastAutosaveSource: autosaveRecord()?.source ?? null,
      lastManualExportAtMs: lastManualExportAtMs(),
      lastImportAtMs: lastImportAtMs(),
      lastOfflineCatchupSeconds: lastOfflineCatchupSeconds(),
      resetCount: resetCount(),
      savePayloadLength: savePayload().length,
      status: saveStatus(),
      storageError: storageError(),
      firstPlayablePersistenceReady: persistenceReadyForFirstPlayable(),
    },
  })
}

function activeTileForMapInfo(
  currentMapInfo: AddPhaserMapInfo,
): AddPhaserMapInfo["interaction"]["hoveredDetail"] {
  return currentMapInfo.interaction.hoveredDetail ?? currentMapInfo.interaction.selectedDetail
}

function statusState(): string {
  if (lastError()) return "error"
  return ready() ? "ready" : "booting"
}

function statusLabel(): string {
  if (lastError()) return "Runtime error"
  if (!ready()) return "Booting"
  // Ambient world clock runs by default ("Live"); the toggle pauses it ("Paused").
  return autoTick() ? "Live" : "Paused"
}

const ADD_TIME_SPEEDS: readonly number[] = [1, 2, 4]

// Single-button time control cycling: Paused -> 1x -> 2x -> 4x -> Paused.
function cycleTimeSpeed(): void {
  if (!autoTick()) {
    setTimeSpeed(1)
    setAutoTick(true)
    return
  }
  const nextSpeed = ADD_TIME_SPEEDS[ADD_TIME_SPEEDS.indexOf(timeSpeed()) + 1]
  if (nextSpeed === undefined) {
    setAutoTick(false)
    return
  }
  setTimeSpeed(nextSpeed)
}

function timeSpeedLabel(): string {
  if (!ready()) return "…"
  return autoTick() ? `▶ ${timeSpeed()}×` : "⏸ Paused"
}

function objectiveState(): string {
  const objective = uiState()?.objective
  if (!objective) return "pending"
  return objective.reachMet ? "met" : "open"
}

function objectiveCopy(): string {
  const objective = uiState()?.objective
  if (!objective) return "Waiting for objective state."
  const caveState = objective.survivorCaveInBubble ? "inside" : "outside"
  return `Reach ${objective.reachTarget}; survivor cave ${caveState} bubble at distance ${objective.survivorCaveDistance}.`
}

function persistenceReadyForFirstPlayable(): boolean {
  return (
    autosaveRecord() !== null &&
    (lastManualExportAtMs() !== null || savePayload().length > 200) &&
    lastOfflineCatchupSeconds() > 0
  )
}

function formatSignedRatioPercent(value: number): string {
  const percent = Math.round(Math.abs(value) * 1000) / 10
  return `${value >= 0 ? "+" : "-"}${percent}%`
}

function safeElementId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-")
}

function slugForRole(roleId: string): string {
  switch (roleId) {
    case ROLE_CRYSTAL_BASSLINE:
      return "bassline"
    case ROLE_CONSTRUCTION:
      return "construction"
    case ROLE_FIRE_PIT:
      return "fire-pit"
    case ROLE_SCAVENGE:
      return "scavenge"
    case ROLE_WATER:
      return "water"
    default:
      return slugForId(roleId)
  }
}

function roleShortLabel(roleId: string): string {
  switch (roleId) {
    case ROLE_CRYSTAL_BASSLINE:
      return "Bassline"
    case ROLE_CRYSTAL_CHORUS:
      return "Chorus"
    case ROLE_CRYSTAL_HARMONICS:
      return "Harmonics"
    case ROLE_CONSTRUCTION:
      return "Build"
    case ROLE_FIRE_PIT:
      return "Fire"
    case ROLE_SCAVENGE:
      return "Scavenge"
    case ROLE_WATER:
      return "Water"
    default:
      return "Role"
  }
}

function constructionButtonId(optionId: string): string {
  switch (optionId) {
    case PROJECT_RESTORE_STUDIO:
      return "start-restore-studio"
    case PROJECT_BUILD_FIRE_PIT:
      return "start-fire-pit"
    default:
      return `start-${slugForId(optionId)}`
  }
}

function slugForId(id: string): string {
  return id.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()
}

function requiredElement(id: string): HTMLElement {
  const found = document.getElementById(id)
  if (!found) throw new Error(`Missing #${id}`)
  return found
}
