import Phaser from "phaser"
import type { CellCoord } from "@aedventure/game-topology"
import type { GameCellPlacement } from "@aedventure/game-world"
import type { WorldInteractionPolicy } from "@aedventure/game-world"
import {
  addMapCoordKey,
  displayAddCell,
  displayAddCoord,
  dungeonLinkInfo,
  dungeonLinksForCell,
  knownFactsInfo,
  tileInteractionDetailForCoord,
  visibilityInfo,
  visibilityStateForCell,
  type AddTileInteractionDetail,
} from "@aedventure/add-domain"

import { ADD_TILE_TRAVEL_PRESENTATION } from "../travel-presentation-timing"
import {
  VISIBILITY_POLISH,
  type AddPhaserMapInfo,
  type PhaserMapRendererState,
  type RenderContext,
} from "./types"

export interface AddPhaserMapProjectionInput {
  readonly rendererState: PhaserMapRendererState
  readonly context: RenderContext | null
  readonly worldInteractionPolicy: WorldInteractionPolicy
}

export function tileInteractionVisibilitySamples(
  context: RenderContext,
): AddPhaserMapInfo["interaction"]["visibilitySamples"] {
  const samples: {
    hidden: AddTileInteractionDetail | null
    discovered: AddTileInteractionDetail | null
    visible: AddTileInteractionDetail | null
    stale: AddTileInteractionDetail | null
  } = {
    hidden: null,
    discovered: null,
    visible: null,
    stale: null,
  }

  for (const cell of context.terrainCells) {
    const visibility = visibilityStateForCell(cell)
    if (samples[visibility]) continue
    samples[visibility] = tileInteractionDetailForCoord(cell.coord, context.terrainByCoord)
  }

  return samples
}

export function hasDungeonLinks(cell: GameCellPlacement): boolean {
  return dungeonLinksForCell(cell).length > 0
}

export function dungeonLinksForCoord(
  coord: CellCoord,
  context: RenderContext,
): ReturnType<typeof dungeonLinksForCell> {
  const cell = context.terrainByCoord.get(addMapCoordKey(coord))
  return cell ? dungeonLinksForCell(cell) : []
}

export function authorityInfo(): AddPhaserMapInfo["authority"] {
  return {
    rules: "rust_wasm_snapshot",
    phaser: "visual_projection_only",
    mutatesSimulation: false,
  }
}

export function topologyInfo(context: RenderContext): AddPhaserMapInfo["topology"] {
  return {
    kind: context.topologyKind,
    mapMode: typeof context.map.metadata?.mapMode === "string" ? context.map.metadata.mapMode : null,
    fixture: context.map.metadata?.fixture === true,
    radius: context.map.topology.kind === "hex" ? context.map.topology.radius : null,
    cellSize: context.map.topology.kind === "square" ? context.map.topology.cellSize : null,
  }
}

export function rendererType(type: number): string {
  if (type === Phaser.WEBGL) return "webgl"
  if (type === Phaser.CANVAS) return "canvas"
  return "unknown"
}

export function projectAddPhaserMapInfo(
  input: AddPhaserMapProjectionInput,
): AddPhaserMapInfo {
  const { context, rendererState } = input
  if (!context) return projectEmptyContextMapInfo(rendererState)

  const hoveredDetail = rendererState.interaction.hoveredCoord
    ? tileInteractionDetailForCoord(rendererState.interaction.hoveredCoord, context.terrainByCoord)
    : null
  const selectedDetail = rendererState.interaction.selectedCoord
    ? tileInteractionDetailForCoord(rendererState.interaction.selectedCoord, context.terrainByCoord)
    : null
  const activeDetail = rendererState.interaction.activeCoord
    ? tileInteractionDetailForCoord(rendererState.interaction.activeCoord, context.terrainByCoord)
    : null
  const selectedCell = rendererState.interaction.selectedCoord
    ? context.terrainByCoord.get(addMapCoordKey(rendererState.interaction.selectedCoord))
    : undefined
  const selectedInteraction =
    rendererState.interaction.selectedCoord && selectedCell
      ? input.worldInteractionPolicy.interactionForCell(
          rendererState.interaction.selectedCoord,
          selectedCell,
        )
      : null

  return {
    hostedBy: rendererState.hostedBy,
    ready: rendererState.ready,
    renderCount: rendererState.renderCount,
    mapId: rendererState.mapId,
    validationValid: rendererState.validation.valid,
    validationSummary: rendererState.validation.summary,
    rendererType: rendererState.rendererType,
    topology: {
      kind: rendererState.topology.kind,
      mapMode: rendererState.topology.mode,
      fixture: rendererState.topology.fixture,
      radius: rendererState.topology.radius,
      cellSize: rendererState.topology.cellSize,
    },
    authority: authorityInfo(),
    cells: {
      total: context.terrainCells.length,
      inactive: context.stateCounts.inactive,
      converting: context.stateCounts.converting,
      stabilized: context.stateCounts.stabilized,
      blocked: context.stateCounts.blocked,
      bubbleEdge: rendererState.cells.emphasized,
    },
    dungeonLinks: {
      total: context.terrainCells.reduce(
        (count, cell) => count + dungeonLinksForCell(cell).length,
        0,
      ),
      cellsWithLinks: context.terrainCells.filter(hasDungeonLinks).length,
      selected: rendererState.interaction.selectedCoord
        ? dungeonLinksForCoord(rendererState.interaction.selectedCoord, context).map(dungeonLinkInfo)
        : [],
    },
    knownFacts: knownFactsInfo(context.terrainCells),
    visibility: {
      ...visibilityInfo(
        context.terrainCells,
        rendererState.visibility.revealTransitionsActive,
        rendererState.visibility.travelRevealPreview,
      ),
      hiddenCellRendering: "invisible_until_known_or_travel_revealed",
      fogRendering: "phaser_visual_overlay",
      affectsAuthority: false,
    },
    character: {
      id: rendererState.controlledEntity.id,
      label: rendererState.controlledEntity.label,
      visible: rendererState.controlledEntity.visible,
      coord: rendererState.controlledEntity.coord
        ? displayAddCoord(rendererState.controlledEntity.coord)
        : null,
      cell: rendererState.controlledEntity.coord
        ? displayAddCell(rendererState.controlledEntity.coord)
        : null,
      x: rendererState.controlledEntity.position
        ? round(rendererState.controlledEntity.position.x)
        : null,
      y: rendererState.controlledEntity.position
        ? round(rendererState.controlledEntity.position.y)
        : null,
      moving: rendererState.controlledEntity.moving,
      facing: rendererState.controlledEntity.facing,
      lastMoveDirection: rendererState.controlledEntity.lastMoveDirection,
      lastMoveAccepted: rendererState.controlledEntity.lastMoveAccepted,
      blockedReason: rendererState.controlledEntity.blockedReason,
      dungeonLinksAtCell: rendererState.controlledEntity.coord
        ? dungeonLinksForCoord(rendererState.controlledEntity.coord, context).map(dungeonLinkInfo)
        : [],
      authority: "browser_navigation_triggers_rust_time",
    },
    travel: projectAddTravelInfo(input),
    landmarks: {
      baseCenter: rendererState.landmarks.primaryAnchorCoord
        ? displayAddCoord(rendererState.landmarks.primaryAnchorCoord)
        : null,
      baseCenterWorld: rendererState.landmarks.primaryAnchorPosition
        ? {
            x: round(rendererState.landmarks.primaryAnchorPosition.x),
            y: round(rendererState.landmarks.primaryAnchorPosition.y),
          }
        : null,
      baseCenterViewport: rendererState.landmarks.primaryAnchorViewport
        ? {
            x: round(rendererState.landmarks.primaryAnchorViewport.x),
            y: round(rendererState.landmarks.primaryAnchorViewport.y),
          }
        : null,
      studioLabelVisible: rendererState.landmarks.primaryAnchorCoord !== null,
      survivorCave: rendererState.landmarks.spawnAnchorCoord
        ? displayAddCoord(rendererState.landmarks.spawnAnchorCoord)
        : null,
      survivorCaveWorld: rendererState.landmarks.spawnAnchorPosition
        ? {
            x: round(rendererState.landmarks.spawnAnchorPosition.x),
            y: round(rendererState.landmarks.spawnAnchorPosition.y),
          }
        : null,
      survivorCaveViewport: rendererState.landmarks.spawnAnchorViewport
        ? {
            x: round(rendererState.landmarks.spawnAnchorViewport.x),
            y: round(rendererState.landmarks.spawnAnchorViewport.y),
          }
        : null,
      survivorCaveVisible: rendererState.landmarks.spawnAnchorCoord !== null,
      renderedCount: rendererState.landmarks.renderedCount,
    },
    camera: rendererState.camera,
    interaction: {
      hoverEnabled: rendererState.interaction.hoverEnabled,
      selectEnabled: rendererState.interaction.selectEnabled,
      hoveredCell: rendererState.interaction.hoveredCoord
        ? displayAddCell(rendererState.interaction.hoveredCoord)
        : null,
      selectedCell: rendererState.interaction.selectedCoord
        ? displayAddCell(rendererState.interaction.selectedCoord)
        : null,
      activeCell: rendererState.interaction.activeCoord
        ? displayAddCell(rendererState.interaction.activeCoord)
        : null,
      activeSource: rendererState.interaction.activeSource,
      lastInput: rendererState.interaction.lastInput,
      dragging: rendererState.interaction.dragging,
      hoveredHex: rendererState.interaction.hoveredCoord?.kind === "hex"
        ? displayAddCoord(rendererState.interaction.hoveredCoord)
        : null,
      selectedHex: rendererState.interaction.selectedCoord?.kind === "hex"
        ? displayAddCoord(rendererState.interaction.selectedCoord)
        : null,
      activeLabel: activeDetail?.label ?? null,
      markerVisible: Boolean((rendererState.renderers.interactions?.visibleAffordanceCount ?? 0) > 0),
      primaryMarkerVisible: Boolean(
        (rendererState.renderers.interactions?.primaryMarkerCount ?? 0) > 0,
      ),
      lastTileActivation: rendererState.interaction.lastTileActivation,
      selectedLabel: selectedDetail?.label ?? selectedInteraction?.label ?? null,
      hoveredDetail,
      selectedDetail,
      visibilitySamples: tileInteractionVisibilitySamples(context),
    },
    presentation: rendererState.presentation,
  }
}

export function emptyRendererState(): PhaserMapRendererState {
  return {
    hostedBy: "phaser",
    ready: false,
    renderCount: 0,
    mapId: null,
    validation: {
      valid: false,
      summary: "Map has not rendered yet.",
    },
    rendererType: "unknown",
    topology: {
      kind: "unknown",
      mode: null,
      fixture: false,
      radius: null,
      cellSize: null,
    },
    cells: {
      total: 0,
      blocked: 0,
      emphasized: 0,
    },
    renderers: {
      cells: null,
      fog: null,
      interactions: null,
      entities: null,
    },
    controlledEntity: {
      id: "controlled.entity",
      label: "Entity",
      visible: false,
      coord: null,
      position: null,
      moving: false,
      facing: null,
      lastMoveDirection: null,
      lastMoveAccepted: null,
      blockedReason: null,
      authority: "browser_navigation_triggers_runtime",
    },
    movement: {
      active: false,
      progress: 0,
      direction: null,
      fromCoord: null,
      toCoord: null,
      blockedReason: null,
    },
    landmarks: {
      primaryAnchorCoord: null,
      primaryAnchorPosition: null,
      primaryAnchorViewport: null,
      spawnAnchorCoord: null,
      spawnAnchorPosition: null,
      spawnAnchorViewport: null,
      renderedCount: 0,
    },
    visibility: {
      revealTransitionsActive: 0,
      travelRevealPreview: {
        active: false,
        progress: 0,
        cells: new Set(),
        destinationCell: null,
        center: null,
        radius: 0,
        feather: 0,
      },
    },
    camera: {
      mode: "fit",
      zoom: 1,
      scrollX: 0,
      scrollY: 0,
    },
    interaction: {
      hoverEnabled: true,
      selectEnabled: true,
      hoveredCoord: null,
      selectedCoord: null,
      activeCoord: null,
      activeSource: "none",
      lastInput: "none",
      dragging: false,
      lastTileActivation: null,
    },
    presentation: {
      terrainArt: "procedural_painterly_topology",
      bubbleEffects: "animated_halo_edge",
      landmarkSprites: "procedural_sprite_stack",
      labelRendering: "high_resolution_phaser_text",
      ambience: "subtle_motes_and_topographic_scan",
      mapPrimaryAffordances: {
        layer: "reachable_path_frontier_landmark",
        reachableCellCount: 0,
        frontierHintCount: 0,
        pathTimePreviewVisible: false,
        actionMarkerCount: 0,
        travelActionMarkersVisible: false,
        landmarkBeaconCount: 0,
        studioArrivalEmphasisVisible: false,
      },
      visibilityPolish: VISIBILITY_POLISH,
      transitionState: "idle",
      transitionProgress: 1,
      responsiveLayout: "desktop",
      mobileEdgeCulledLabelCount: 0,
    },
  }
}

function projectEmptyContextMapInfo(rendererState: PhaserMapRendererState): AddPhaserMapInfo {
  const fallback = emptyMapInfo()
  return {
    ...fallback,
    hostedBy: rendererState.hostedBy,
    ready: rendererState.ready,
    renderCount: rendererState.renderCount,
    mapId: rendererState.mapId,
    validationValid: rendererState.validation.valid,
    validationSummary: rendererState.validation.summary,
    rendererType: rendererState.rendererType,
    topology: {
      kind: rendererState.topology.kind,
      mapMode: rendererState.topology.mode,
      fixture: rendererState.topology.fixture,
      radius: rendererState.topology.radius,
      cellSize: rendererState.topology.cellSize,
    },
    camera: rendererState.camera,
    presentation: rendererState.presentation,
  }
}

function projectAddTravelInfo(
  input: AddPhaserMapProjectionInput,
): AddPhaserMapInfo["travel"] {
  const { context, rendererState } = input
  if (!context) return emptyMapInfo().travel

  const previewCoord = rendererState.interaction.hoveredCoord ?? rendererState.interaction.selectedCoord
  const previewCell = previewCoord ? context.terrainByCoord.get(addMapCoordKey(previewCoord)) : null
  const previewDetail = previewCoord
    ? tileInteractionDetailForCoord(previewCoord, context.terrainByCoord)
    : null
  const previewInteraction =
    previewCoord && previewCell
      ? input.worldInteractionPolicy.interactionForCell(previewCoord, previewCell)
      : null
  const previewAdjacent =
    rendererState.controlledEntity.coord !== null && previewCoord !== null
      ? coordsAreAdjacentByTopology(rendererState.controlledEntity.coord, previewCoord, context)
      : false
  const destinationDetail = rendererState.movement.toCoord
    ? tileInteractionDetailForCoord(rendererState.movement.toCoord, context.terrainByCoord)
    : null

  return {
    costGameMinutes: ADD_TILE_TRAVEL_PRESENTATION.visibleGameMinutes,
    costRuntimeSeconds: ADD_TILE_TRAVEL_PRESENTATION.runtimeSeconds,
    presentationDurationMs: ADD_TILE_TRAVEL_PRESENTATION.durationMs,
    clockStepMs: ADD_TILE_TRAVEL_PRESENTATION.msPerVisibleMinute,
    active: rendererState.movement.active,
    progress: rendererState.movement.progress,
    direction: rendererState.movement.direction,
    fromCell: rendererState.movement.fromCoord
      ? displayAddCell(rendererState.movement.fromCoord)
      : null,
    toCell: rendererState.movement.toCoord ? displayAddCell(rendererState.movement.toCoord) : null,
    destinationLabel: destinationDetail?.label ?? null,
    destinationState: destinationDetail
      ? destinationDetail.state === "unknown"
        ? "inactive"
        : destinationDetail.state
      : null,
    destinationTerrain: destinationDetail?.terrain ?? null,
    exposureRisk: destinationDetail?.exposureRisk ?? null,
    previewCell: previewCoord ? displayAddCell(previewCoord) : null,
    previewLabel: previewDetail?.label ?? previewInteraction?.label ?? null,
    previewAdjacent,
    previewExposureRisk: previewCell ? previewDetail?.exposureRisk ?? "unknown" : null,
    blockedReason: rendererState.movement.blockedReason,
  }
}

function coordsAreAdjacentByTopology(
  first: CellCoord,
  second: CellCoord,
  context: RenderContext,
): boolean {
  if (first.kind !== second.kind) return false
  if (first.kind === "square" && second.kind === "square") {
    return Math.abs(first.x - second.x) + Math.abs(first.y - second.y) === 1
  }
  if (first.kind === "hex" && second.kind === "hex") {
    return context.hexTopology?.distance(first, second) === 1
  }
  return false
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

export function emptyMapInfo(): AddPhaserMapInfo {
  return {
    hostedBy: "phaser",
    ready: false,
    renderCount: 0,
    mapId: null,
    validationValid: false,
    validationSummary: "Map has not rendered yet.",
    rendererType: "unknown",
    topology: {
      kind: "unknown",
      mapMode: null,
      fixture: false,
      radius: null,
      cellSize: null,
    },
    authority: authorityInfo(),
    cells: {
      total: 0,
      inactive: 0,
      converting: 0,
      stabilized: 0,
      blocked: 0,
      bubbleEdge: 0,
    },
    dungeonLinks: {
      total: 0,
      cellsWithLinks: 0,
      selected: [],
    },
    knownFacts: {
      hiddenCells: 0,
      discoveredCells: 0,
      visibleCells: 0,
      staleCells: 0,
      exactTerrainKnownCells: 0,
      dynamicRiskKnownCells: 0,
      vagueTravelLabels: 0,
      sampleHiddenTravelLabel: null,
    },
    visibility: {
      hiddenCells: 0,
      discoveredCells: 0,
      visibleCells: 0,
      staleCells: 0,
      revealTransitionsActive: 0,
      travelRevealPreviewActive: false,
      travelRevealPreviewCells: 0,
      travelRevealPreviewProgress: 0,
      travelRevealDestinationCell: null,
      hiddenCellRendering: "invisible_until_known_or_travel_revealed",
      fogRendering: "phaser_visual_overlay",
      affectsAuthority: false,
    },
    character: {
      id: "add.entity.hero",
      label: "Hero",
      visible: false,
      coord: null,
      cell: null,
      x: null,
      y: null,
      moving: false,
      facing: null,
      lastMoveDirection: null,
      lastMoveAccepted: null,
      blockedReason: null,
      dungeonLinksAtCell: [],
      authority: "browser_navigation_triggers_rust_time",
    },
    travel: {
      costGameMinutes: ADD_TILE_TRAVEL_PRESENTATION.visibleGameMinutes,
      costRuntimeSeconds: ADD_TILE_TRAVEL_PRESENTATION.runtimeSeconds,
      presentationDurationMs: ADD_TILE_TRAVEL_PRESENTATION.durationMs,
      clockStepMs: ADD_TILE_TRAVEL_PRESENTATION.msPerVisibleMinute,
      active: false,
      progress: 0,
      direction: null,
      fromCell: null,
      toCell: null,
      destinationLabel: null,
      destinationState: null,
      destinationTerrain: null,
      exposureRisk: null,
      previewCell: null,
      previewLabel: null,
      previewAdjacent: false,
      previewExposureRisk: null,
      blockedReason: null,
    },
    landmarks: {
      baseCenter: null,
      baseCenterWorld: null,
      baseCenterViewport: null,
      studioLabelVisible: false,
      survivorCave: null,
      survivorCaveWorld: null,
      survivorCaveViewport: null,
      survivorCaveVisible: false,
      renderedCount: 0,
    },
    camera: {
      mode: "fit",
      zoom: 1,
      scrollX: 0,
      scrollY: 0,
    },
    interaction: {
      hoverEnabled: true,
      selectEnabled: true,
      hoveredCell: null,
      selectedCell: null,
      activeCell: null,
      activeSource: "none",
      lastInput: "none",
      dragging: false,
      hoveredHex: null,
      selectedHex: null,
      activeLabel: null,
      markerVisible: false,
      primaryMarkerVisible: false,
      lastTileActivation: null,
      selectedLabel: null,
      hoveredDetail: null,
      selectedDetail: null,
      visibilitySamples: {
        hidden: null,
        discovered: null,
        visible: null,
        stale: null,
      },
    },
    presentation: {
      terrainArt: "procedural_painterly_topology",
      bubbleEffects: "animated_halo_edge",
      landmarkSprites: "procedural_sprite_stack",
      labelRendering: "high_resolution_phaser_text",
      ambience: "subtle_motes_and_topographic_scan",
      mapPrimaryAffordances: {
        layer: "reachable_path_frontier_landmark",
        reachableCellCount: 0,
        frontierHintCount: 0,
        pathTimePreviewVisible: false,
        actionMarkerCount: 0,
        travelActionMarkersVisible: false,
        landmarkBeaconCount: 0,
        studioArrivalEmphasisVisible: false,
      },
      visibilityPolish: VISIBILITY_POLISH,
      transitionState: "idle",
      transitionProgress: 1,
      responsiveLayout: "desktop",
      mobileEdgeCulledLabelCount: 0,
    },
  }
}
