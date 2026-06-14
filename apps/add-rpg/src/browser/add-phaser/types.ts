import type { CellCoord, GridTopology, HexCoord, SquareCoord, Vector2 } from "@aedventure/game-topology"
import type { GameCellPlacement, GameMap } from "@aedventure/game-world"
import type {
  GameMapCellRenderInfo,
  WorldFogRendererInfo,
  WorldCellInteractionRendererInfo,
  WorldEntityRendererInfo,
} from "@aedventure/game-renderer-phaser"
import type {
  AddCellState,
  AddDungeonLinkInfo,
  AddKnownFactsInfo,
  AddMapVisibilityInfo,
  AddTerrain,
  AddTileInteractionDetail,
  AddTravelExposureRisk,
  AddVisibilityRenderState,
} from "@aedventure/add-domain"

export type PhaserMapTopologyKind = "hex" | "square"
export type AddTopologyKind = PhaserMapTopologyKind
export type AddCharacterMoveDirection =
  | "up"
  | "right"
  | "down"
  | "left"
  | "north_east"
  | "north_west"
  | "south_east"
  | "south_west"
export type AddCharacterMoveKey = "up" | "right" | "down" | "left" | "north_east" | "south_west"

export interface AddCharacterTravelEvent {
  readonly direction: AddCharacterMoveDirection
  readonly fromCoord: CellCoord
  readonly toCoord: CellCoord
  readonly fromCell: string
  readonly toCell: string
  readonly destinationLabel: string
  readonly destinationState: AddCellState
  readonly destinationTerrain: AddTerrain
  readonly exposureRisk: AddTravelExposureRisk
  readonly dungeonLinksAtDestination: readonly AddDungeonLinkInfo[]
}

export interface AddRpgPhaserMapHostOptions {
  readonly onBeforeCharacterTravel?: (event: AddCharacterTravelEvent) => boolean | Promise<boolean>
  readonly onCharacterTravel?: (event: AddCharacterTravelEvent) => void
  /** Bumping a closed door requests it be opened (authoritative toggle). */
  readonly onDoorToggle?: (coord: CellCoord) => void
  /** Bumping an un-cleared creature/container resolves it (clear/loot, once).
   * `lootTable` is the table id to roll for the drop (resolved by the host). */
  readonly onClearLocation?: (coord: CellCoord, lootTable: string | undefined) => void
  /** Bumping a dropped-item pile picks it up. */
  readonly onPickUp?: (coord: CellCoord) => void
}

export interface PhaserMapPresentationState {
  readonly terrainArt: "procedural_painterly_topology"
  readonly bubbleEffects: "animated_halo_edge"
  readonly landmarkSprites: "procedural_sprite_stack"
  readonly labelRendering: "high_resolution_phaser_text"
  readonly ambience: "subtle_motes_and_topographic_scan"
  readonly mapPrimaryAffordances: {
    readonly layer: "reachable_path_frontier_landmark"
    readonly reachableCellCount: number
    readonly frontierHintCount: number
    readonly pathTimePreviewVisible: boolean
    readonly actionMarkerCount: number
    readonly landmarkBeaconCount: number
    readonly studioArrivalEmphasisVisible: boolean
  }
  readonly visibilityPolish: {
    readonly fogEdge: "soft_feathered_visibility_boundary"
    readonly revealEffect: "expanding_ripple"
    readonly caveMouthSilhouettes: true
    readonly travelReveal: "progressive_in_travel_radius"
    readonly authority: "visual_only"
    readonly laterModifiers: readonly [
      "day_night_radius",
      "weather_season",
      "scouting_buildings_items",
    ]
  }
  readonly transitionState: "idle" | "entering"
  readonly transitionProgress: number
  readonly responsiveLayout: "desktop" | "mobile"
  readonly mobileEdgeCulledLabelCount: number
}

/**
 * Raw renderer facts exposed by the Phaser scene before ADD-specific telemetry
 * projection. Keep this shape centered on coordinates, counters, camera state,
 * and renderer subsystem info rather than product labels or dungeon rules.
 */
export interface PhaserMapRendererState {
  readonly hostedBy: "phaser"
  readonly ready: boolean
  readonly renderCount: number
  readonly mapId: string | null
  readonly validation: {
    readonly valid: boolean
    readonly summary: string
  }
  readonly rendererType: string
  readonly topology: {
    readonly kind: PhaserMapTopologyKind | "unknown"
    readonly mode: string | null
    readonly fixture: boolean
    readonly radius: number | null
    readonly cellSize: number | null
  }
  readonly cells: {
    readonly total: number
    readonly blocked: number
    readonly emphasized: number
  }
  readonly renderers: {
    readonly cells: GameMapCellRenderInfo | null
    readonly fog: WorldFogRendererInfo | null
    readonly interactions: WorldCellInteractionRendererInfo | null
    readonly entities: WorldEntityRendererInfo | null
  }
  readonly controlledEntity: {
    readonly id: string
    readonly label: string
    readonly visible: boolean
    readonly coord: CellCoord | null
    readonly position: Vector2 | null
    readonly moving: boolean
    readonly facing: string | null
    readonly lastMoveDirection: string | null
    readonly lastMoveAccepted: boolean | null
    readonly blockedReason: string | null
    readonly authority: "browser_navigation_triggers_runtime"
  }
  readonly movement: {
    readonly active: boolean
    readonly progress: number
    readonly direction: string | null
    readonly fromCoord: CellCoord | null
    readonly toCoord: CellCoord | null
    readonly blockedReason: string | null
  }
  readonly landmarks: {
    readonly primaryAnchorCoord: CellCoord | null
    readonly primaryAnchorPosition: Vector2 | null
    readonly primaryAnchorViewport: Vector2 | null
    readonly spawnAnchorCoord: CellCoord | null
    readonly spawnAnchorPosition: Vector2 | null
    readonly spawnAnchorViewport: Vector2 | null
    readonly renderedCount: number
  }
  readonly visibility: {
    readonly revealTransitionsActive: number
    readonly travelRevealPreview: TravelRevealPreview
  }
  readonly camera: {
    readonly mode: "fit" | "interactive_pan_zoom"
    readonly zoom: number
    readonly scrollX: number
    readonly scrollY: number
  }
  readonly interaction: {
    readonly hoverEnabled: true
    readonly selectEnabled: true
    readonly hoveredCoord: CellCoord | null
    readonly selectedCoord: CellCoord | null
    readonly activeCoord: CellCoord | null
    readonly activeSource: "hover" | "selection" | "none"
    readonly lastInput: "keyboard" | "pointer" | "programmatic" | "none"
    readonly dragging: boolean
  }
  readonly presentation: PhaserMapPresentationState
}

/**
 * ADD-facing map telemetry projected from `PhaserMapRendererState` plus ADD
 * domain selectors. This is the stable shape consumed by render_game_to_text.
 */
export interface AddPhaserMapInfo {
  readonly hostedBy: "phaser"
  readonly ready: boolean
  readonly renderCount: number
  readonly mapId: string | null
  readonly validationValid: boolean
  readonly validationSummary: string
  readonly rendererType: string
  readonly topology: {
    readonly kind: AddTopologyKind | "unknown"
    readonly mapMode: string | null
    readonly fixture: boolean
    readonly radius: number | null
    readonly cellSize: number | null
  }
  readonly authority: {
    readonly rules: "rust_wasm_snapshot"
    readonly phaser: "visual_projection_only"
    readonly mutatesSimulation: false
  }
  readonly cells: {
    readonly total: number
    readonly inactive: number
    readonly converting: number
    readonly stabilized: number
    readonly blocked: number
    readonly bubbleEdge: number
  }
  readonly dungeonLinks: {
    readonly total: number
    readonly cellsWithLinks: number
    readonly selected: readonly AddDungeonLinkInfo[]
  }
  readonly knownFacts: AddKnownFactsInfo
  readonly visibility: AddMapVisibilityInfo & {
    readonly hiddenCellRendering: "invisible_until_known_or_travel_revealed"
    readonly fogRendering: "phaser_visual_overlay"
    readonly affectsAuthority: false
  }
  readonly character: {
    readonly id: string
    readonly label: string
    readonly visible: boolean
    readonly coord: string | null
    readonly cell: string | null
    readonly x: number | null
    readonly y: number | null
    readonly moving: boolean
    readonly facing: string | null
    readonly lastMoveDirection: string | null
    readonly lastMoveAccepted: boolean | null
    readonly blockedReason: string | null
    readonly dungeonLinksAtCell: readonly AddDungeonLinkInfo[]
    readonly authority: "browser_navigation_triggers_rust_time"
  }
  readonly travel: {
    readonly costGameMinutes: number
    readonly costRuntimeSeconds: number
    readonly presentationDurationMs: number
    readonly clockStepMs: number
    readonly active: boolean
    readonly progress: number
    readonly direction: string | null
    readonly fromCell: string | null
    readonly toCell: string | null
    readonly destinationLabel: string | null
    readonly destinationState: AddCellState | null
    readonly destinationTerrain: AddTerrain | null
    readonly exposureRisk: AddTravelExposureRisk | null
    readonly previewCell: string | null
    readonly previewLabel: string | null
    readonly previewAdjacent: boolean
    readonly previewExposureRisk: AddTravelExposureRisk | null
    readonly blockedReason: string | null
  }
  readonly landmarks: {
    readonly baseCenter: string | null
    readonly baseCenterWorld: Vector2 | null
    readonly baseCenterViewport: Vector2 | null
    readonly studioLabelVisible: boolean
    readonly survivorCave: string | null
    readonly survivorCaveWorld: Vector2 | null
    readonly survivorCaveViewport: Vector2 | null
    readonly survivorCaveVisible: boolean
    readonly renderedCount: number
  }
  readonly camera: {
    readonly mode: "fit" | "interactive_pan_zoom"
    readonly zoom: number
    readonly scrollX: number
    readonly scrollY: number
  }
  readonly interaction: {
    readonly hoverEnabled: true
    readonly selectEnabled: true
    readonly hoveredCell: string | null
    readonly selectedCell: string | null
    readonly activeCell: string | null
    readonly activeSource: "hover" | "selection" | "none"
    readonly lastInput: "keyboard" | "pointer" | "programmatic" | "none"
    readonly dragging: boolean
    readonly hoveredHex: string | null
    readonly selectedHex: string | null
    readonly activeLabel: string | null
    readonly markerVisible: boolean
    readonly primaryMarkerVisible: boolean
    readonly selectedLabel: string | null
    readonly hoveredDetail: AddTileInteractionDetail | null
    readonly selectedDetail: AddTileInteractionDetail | null
    readonly visibilitySamples: {
      readonly hidden: AddTileInteractionDetail | null
      readonly discovered: AddTileInteractionDetail | null
      readonly visible: AddTileInteractionDetail | null
      readonly stale: AddTileInteractionDetail | null
    }
  }
  readonly presentation: PhaserMapPresentationState
  /** Cartographic scale bar for the current zoom: a "nice" distance label and its
   * on-screen pixel width. Null when the map defines no real-world scale. */
  readonly scaleBar?: { readonly label: string; readonly widthPx: number } | null
}

export interface RenderContext {
  readonly map: GameMap
  readonly topologyKind: AddTopologyKind
  readonly hexTopology: GridTopology<HexCoord> | null
  readonly squareTopology: GridTopology<SquareCoord> | null
  readonly origin: Vector2
  readonly terrainCells: readonly GameCellPlacement[]
  readonly terrainByCoord: ReadonlyMap<string, GameCellPlacement>
  readonly stateCounts: StateCounts
  readonly bubbleEdgeCoords: ReadonlySet<string>
  readonly baseCoord: CellCoord | null
  readonly survivorCaveCoord: CellCoord | null
}

export interface CharacterMoveStatus {
  readonly direction: string | null
  readonly accepted: boolean | null
  readonly blockedReason: string | null
}

export interface CharacterTravelState {
  readonly direction: AddCharacterMoveDirection
  readonly fromCoord: CellCoord
  readonly toCoord: CellCoord
  readonly startedAtMs: number
  readonly durationMs: number
  readonly fromPosition: Vector2
  readonly toPosition: Vector2
}

export interface StateCounts {
  readonly inactive: number
  readonly converting: number
  readonly stabilized: number
  readonly blocked: number
}

export interface TravelRevealPreview {
  readonly active: boolean
  readonly progress: number
  readonly cells: ReadonlySet<string>
  readonly destinationCell: string | null
  readonly center: Vector2 | null
  readonly radius: number
  readonly feather: number
}

export const DEFAULT_RADIUS = 28
export const MIN_ZOOM = 0.55
export const MAX_ZOOM = 2.2
export const KEY_CHORD_DELAY_MS = 55
export const REVEAL_TRANSITION_MS = 1180
export const TRAVEL_REVEAL_TRAIL_MS = 620
export const TRAVEL_REVEAL_HALO_RADIUS_MULTIPLIER = 1.95
export const TRAVEL_REVEAL_HALO_FEATHER_MULTIPLIER = 0.90
export const VISIBILITY_POLISH: AddPhaserMapInfo["presentation"]["visibilityPolish"] = {
  fogEdge: "soft_feathered_visibility_boundary",
  revealEffect: "expanding_ripple",
  caveMouthSilhouettes: true,
  travelReveal: "progressive_in_travel_radius",
  authority: "visual_only",
  laterModifiers: ["day_night_radius", "weather_season", "scouting_buildings_items"],
}
