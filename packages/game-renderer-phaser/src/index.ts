export {
  PhaserTileWorldRenderer,
  PhaserTileWorldRenderer as RendererHost,
} from "./shared/renderer-host"
export type { RendererHostOptions } from "./shared/renderer-host"
export { TileWorldScene } from "./renderer/tile-world-scene"
export { RendererSceneManager } from "./renderer/renderer-scene-manager"
export {
  type FrameBudget,
  type FrameBudgetResult,
  SMOKE_FRAME_BUDGET,
  createFramePacer,
  evaluateFrameBudget,
} from "./renderer/frame-budget"
export {
  SquareTilemapRenderer,
  SquareTilemapRenderer as TilemapRenderer,
} from "./square/square-tilemap-renderer"
export { ObjectRenderer } from "./renderer/object-renderer"
export { AvatarRenderer, EntityRenderer } from "./shared/entity-renderer"
export {
  WorldEntityRenderer,
  emptyWorldEntityRendererInfo,
  type WorldEntityAppearance,
  type WorldEntityFacing,
  type WorldEntityRenderFrame,
  type WorldEntityRendererInfo,
  type WorldEntityRenderState,
} from "./shared/world-entity-renderer"
export {
  WorldCellInteractionRenderer,
  emptyWorldCellInteractionRendererInfo,
  type WorldCellInteractionAffordance,
  type WorldCellInteractionAffordanceEmphasis,
  type WorldCellInteractionAffordanceKind,
  type WorldCellInteractionRendererInfo,
  type WorldCellInteractionRenderOptions,
  type WorldCellInteractionSelection,
  type WorldCellInteractionSelectionKind,
  type WorldCellInteractionZone,
  type WorldCellInteractionZoneKind,
} from "./shared/world-cell-interaction-renderer"
export {
  WorldFogRenderer,
  emptyWorldFogRendererInfo,
  type WorldFogRendererInfo,
  type WorldFogRenderOptions,
  type WorldFogTravelRevealPreview,
} from "./shared/world-fog-renderer"
export { ZoneRenderer } from "./shared/zone-renderer"
export { CameraController } from "./shared/camera-controller"
export { DomWorldOverlayRenderer } from "./renderer/dom-world-overlay-renderer"
export { InteractionRenderer } from "./renderer/interaction-renderer"
export { RendererTelemetry } from "./shared/telemetry"
export {
  GameMapCellRenderer,
  emptyGameMapCellRenderInfo,
  type GameMapCellRenderInfo,
  type GameMapCellRenderOptions,
} from "./shared/game-map-cell-renderer"
export { validateFixtureMapForRenderer } from "./renderer/map-render-validation"
export {
  DepthDebugOverlay,
  DevToolsOverlay,
  DomInteractionOverlayRenderer,
} from "./shared/overlays"
export {
  HexCellRenderer,
  drawHexPath,
  emptyHexCellRenderInfo,
  type HexCellPalette,
  type HexCellRenderInfo,
  type HexCellRenderOptions,
} from "./hex/hex-cell-renderer"
export { hexCellCenter, hexCellPolygonPoints } from "./hex/hex-geometry"
export {
  HexZoneRenderer,
  emptyHexZoneRenderInfo,
  type HexZoneRenderInfo,
  type HexZoneRenderOptions,
} from "./hex/hex-zone-renderer"
export {
  HexLandmarkRenderer,
  emptyHexLandmarkRenderInfo,
  type HexLandmarkRenderInfo,
  type HexLandmarkRenderOptions,
} from "./hex/hex-landmark-renderer"

export * from "./renderer/types"
export {
  DEFAULT_CELL_PRESENTATION_POLICY,
  DEFAULT_CELL_VISUAL_STYLE,
  DEFAULT_FOG_VISUAL_STYLE,
  EMPTY_WORLD_INTERACTION_POLICY,
} from "./renderer/policies"
export type {
  CellPresentationPolicy,
  CellVisualActivity,
  CellVisualMotif,
  CellVisualStyle,
  FogVisualStyle,
  FogVisualTreatment,
  TopologyNavigationInput,
  TopologyNavigationPolicy,
  WorldInteractionDetail,
  WorldInteractionPolicy,
} from "@aedventure/game-world"
