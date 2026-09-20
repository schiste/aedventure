import type {
  GameCellPlacement,
  GameCellLink,
  GameEntity,
  GameInteraction,
  GameMap,
  GameMetadata,
  GameWorld,
  GameZone,
} from "@aedventure/game-world"
import type { VisibilityEntry } from "@aedventure/game-visibility"

import type {
  CatalogSnapshot,
  FloraDef,
  HexSnapshot,
  SimulationSnapshot,
  StructureDef,
  TileDef,
  WorldActionDef,
} from "@aedventure/add-protocol"
import { createAddCatalogIndexes } from "./catalog-selectors"
import {
  addVisibilityAllowsDungeonLinks,
  addVisibilityAllowsDynamicDetails,
  addVisibilityAllowsStaticTileFacts,
  addVisibilityForHex,
  selectAddKnownTileFacts,
  selectAddVagueVisibilityHints,
  selectAddVisibilitySummary,
  type AddVisibilitySummary,
  type AddKnownTileFacts,
} from "./visibility-selectors"
import { resolveAddDungeon } from "../dungeons/registry"

export interface AddSnapshotWorldAdapterOptions {
  readonly worldId?: string
  readonly mapId?: string
  readonly hexRadius?: number
}

const DEFAULT_WORLD_ID = "add.world"
const DEFAULT_MAP_ID = "add.map.hex-overworld"
const TERRAIN_LAYER_ID = "add.layer.terrain"
const COLLISION_LAYER_ID = "add.layer.collision"
const BUBBLE_LAYER_ID = "add.layer.bubble"
const OBJECT_LAYER_ID = "add.layer.landmarks"

export function addSnapshotToGameWorld(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  options: AddSnapshotWorldAdapterOptions = {},
): GameWorld {
  const mapId = options.mapId ?? DEFAULT_MAP_ID
  const bounds = hexBoundsFor(snapshot.hexes)
  const visibility = selectAddVisibilitySummary(snapshot, catalog)
  const terrainCells = terrainLayerCells(snapshot, catalog, { visibility })
  const collisionCells = collisionLayerCells(snapshot, catalog)
  const bubbleCells = bubbleOverlayCells(snapshot)
  const entities = landmarkEntities(snapshot, catalog, { visibility })
  const zones = bubbleZones(snapshot, catalog)
  const interactions = gameInteractions(snapshot, catalog, mapId, zones)

  const map: GameMap = {
    id: mapId,
    label: "ADD Hex Overworld",
    topology: {
      kind: "hex",
      radius: options.hexRadius ?? 32,
      bounds,
    },
    layers: [
      {
        id: TERRAIN_LAYER_ID,
        kind: "terrain",
        label: "Terrain",
        zIndex: 0,
        cells: terrainCells,
      },
      {
        id: COLLISION_LAYER_ID,
        kind: "collision",
        label: "Movement blockers",
        visible: false,
        zIndex: 10,
        cells: collisionCells,
      },
      {
        id: BUBBLE_LAYER_ID,
        kind: "overlay",
        label: "Bubble field",
        zIndex: 20,
        cells: bubbleCells,
      },
      {
        id: OBJECT_LAYER_ID,
        kind: "objects",
        label: "Landmarks",
        zIndex: 30,
        cells: [],
      },
    ],
    entities,
    zones,
    interactions,
    metadata: {
      source: "add-snapshot",
      schemaVersion: snapshot.schemaVersion,
      clockSeconds: snapshot.clockSeconds,
      activeWorldAction: snapshot.activeWorldAction?.actionId ?? "",
      activeStoryBeat: snapshot.narrative.activeBeatId ?? "",
      stabilizedRing: snapshot.bubble.stabilizedRing,
      targetRing: snapshot.bubble.targetRing,
      frontierProgress: snapshot.bubble.frontierProgress,
      fieldBudget: snapshot.bubble.fieldBudget,
      visibilityVisibleCount: visibility.visibleCount,
      visibilityDiscoveredCount: visibility.discoveredCount,
      visibilityHiddenCount: visibility.hiddenCount,
      visibilityStaleCount: visibility.staleCount,
      visibilityVagueHintCount: visibility.vagueHintCount,
    },
  }

  return {
    id: options.worldId ?? DEFAULT_WORLD_ID,
    activeMapId: mapId,
    maps: [map],
    metadata: {
      source: "add-domain",
      runtimeAuthority: "rust-wasm",
      snapshotSchemaVersion: snapshot.schemaVersion,
    },
  }
}

export function terrainLayerCells(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  options: { readonly visibility?: AddVisibilitySummary } = {},
): readonly GameCellPlacement[] {
  const indexes = createAddCatalogIndexes(catalog)
  const visibility = options.visibility ?? selectAddVisibilitySummary(snapshot, catalog)
  const vagueHintKeys = new Set(
    selectAddVagueVisibilityHints(snapshot.hexes, visibility.visibility).map((hint) =>
      hexKey(hint.coord.q, hint.coord.r),
    ),
  )
  return snapshot.hexes.map((hex) => {
    const tile = indexes.tilesById.get(hex.tileId)
    const cellVisibility = addVisibilityForHex(visibility.visibility, hex)
    const vagueHint = vagueHintKeys.has(hexKey(hex.q, hex.r))
    const knownFacts = selectAddKnownTileFacts(hex, tile, cellVisibility, vagueHint)
    const links = addVisibilityAllowsDungeonLinks(cellVisibility)
      ? dungeonLinksForTile(hex, tile)
      : []
    return {
      coord: hexCoord(hex),
      tokenId: knownFacts.exactTerrainKnown ? hex.tileId : "tile.unknown",
      blocked: tile?.isBlocker ?? hex.state === "blocked",
      ...(links.length > 0 ? { links } : {}),
      visibility: cellVisibility,
      metadata: tileMetadata(hex, cellVisibility, knownFacts, vagueHint),
    }
  })
}

export function collisionLayerCells(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly GameCellPlacement[] {
  const indexes = createAddCatalogIndexes(catalog)
  return snapshot.hexes
    .filter((hex) => indexes.tilesById.get(hex.tileId)?.isBlocker || hex.state === "blocked")
    .map((hex) => ({
      coord: hexCoord(hex),
      value: true,
      blocked: true,
      metadata: {
        tileId: hex.tileId,
        state: hex.state,
      },
    }))
}

export function bubbleOverlayCells(
  snapshot: SimulationSnapshot,
): readonly GameCellPlacement[] {
  return snapshot.hexes
    .filter((hex) => hex.state !== "inactive" && hex.state !== "blocked")
    .map((hex) => ({
      coord: hexCoord(hex),
      tokenId: `add.bubble.${hex.state}`,
      value: Math.round(hex.progress * 1000) / 1000,
      metadata: {
        state: hex.state,
        progress: hex.progress,
        distance: hex.distance,
      },
    }))
}

export function landmarkEntities(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  options: { readonly visibility?: AddVisibilitySummary } = {},
): readonly GameEntity[] {
  const indexes = createAddCatalogIndexes(catalog)
  const visibility = options.visibility ?? selectAddVisibilitySummary(snapshot, catalog)
  const heroCoord = heroMapHex(snapshot) ?? survivorCaveHexes(snapshot, catalog)[0]
  const entities: GameEntity[] = [
    {
      id: "add.entity.hero",
      kind: "hero",
      label: "Hero",
      coord: heroCoord ? hexCoord(heroCoord) : { kind: "hex", q: 0, r: 0 },
      layerId: OBJECT_LAYER_ID,
      blocksMovement: false,
      tags: ["add", "hero", snapshot.heroSurvival.location],
      metadata: {
        assigned: snapshot.roster.heroAssigned,
        location: snapshot.heroSurvival.location,
        viralLoadRatio: snapshot.heroSurvival.viralLoadRatio,
      },
    },
  ]

  for (const hex of snapshot.hexes) {
    const tile = indexes.tilesById.get(hex.tileId)
    if (!tile) continue
    const cellVisibility = addVisibilityForHex(visibility.visibility, hex)
    if (!addVisibilityAllowsStaticTileFacts(cellVisibility)) continue

    tile.floraIds.forEach((floraId) => {
      const flora = indexes.floraById.get(floraId)
      entities.push(floraEntity(hex, floraId, flora))
    })

    tile.structureIds.forEach((structureId) => {
      const structure = indexes.structuresById.get(structureId)
      entities.push(structureEntity(hex, structureId, structure, tile))
    })
  }

  return entities
}

export function bubbleZones(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly GameZone[] {
  const zones: GameZone[] = []
  const baseCells = baseHexes(snapshot, catalog).map(hexCoord)
  const stabilizedCells = snapshot.hexes
    .filter((hex) => hex.state === "stabilized")
    .map(hexCoord)
  const frontierCells = snapshot.hexes
    .filter((hex) => hex.state === "converting")
    .map(hexCoord)
  const survivorCaveCells = survivorCaveHexes(snapshot, catalog).map(hexCoord)

  pushZone(zones, {
    id: "add.zone.base",
    kind: "base",
    label: "Base",
    cells: baseCells,
  })
  pushZone(zones, {
    id: "add.zone.bubble.stabilized",
    kind: "bubble_stabilized",
    label: "Stabilized bubble",
    cells: stabilizedCells,
  })
  pushZone(zones, {
    id: "add.zone.bubble.frontier",
    kind: "bubble_frontier",
    label: "Bubble frontier",
    cells: frontierCells,
  })
  pushZone(zones, {
    id: "add.zone.survivor_cave",
    kind: "survivor_cave",
    label: "Survivor cave",
    cells: survivorCaveCells,
  })

  return zones
}

function gameInteractions(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  mapId: string,
  zones: readonly GameZone[],
): readonly GameInteraction[] {
  const zoneIds = new Set(zones.map((zone) => zone.id))
  const interactions: GameInteraction[] = catalog.worldActions.map((action) =>
    worldActionInteraction(snapshot, action, mapId, zoneIds),
  )

  if (zoneIds.has("add.zone.survivor_cave")) {
    interactions.push({
      id: "add.interaction.recruit_survivor",
      kind: "recruitment",
      action: "add.recruit_from_survivor_cave",
      label: "Recruit survivor",
      target: { kind: "zone", id: "add.zone.survivor_cave" },
      requiredZoneId: "add.zone.survivor_cave",
      enabled: snapshot.objectives.recruitmentEnabled,
      metadata: {
        commandKind: "recruit_from_survivor_cave",
      },
    })
  }

  const activeBeat = catalog.storyBeats.find(
    (beat) => beat.id === snapshot.narrative.activeBeatId,
  )
  activeBeat?.choices.forEach((choice) => {
    interactions.push({
      id: `add.interaction.story_choice.${activeBeat.id}.${choice.id}`,
      kind: "story_choice",
      action: "add.choose_story_option",
      label: choice.label,
      target: { kind: "map", id: mapId },
      enabled: true,
      metadata: {
        commandKind: "choose_story_option",
        beatId: activeBeat.id,
        optionId: choice.id,
      },
    })
  })

  interactions.push({
    id: "add.interaction.assign_hero",
    kind: "hero_assignment",
    action: "add.assign_hero",
    label: snapshot.roster.heroAssigned ? "Unassign hero" : "Assign hero",
    target: { kind: "entity", id: "add.entity.hero" },
    enabled: true,
    metadata: {
      commandKind: "assign_hero",
      assigned: !snapshot.roster.heroAssigned,
    },
  })

  return interactions
}

function worldActionInteraction(
  snapshot: SimulationSnapshot,
  action: WorldActionDef,
  mapId: string,
  zoneIds: ReadonlySet<string>,
): GameInteraction {
  const requiredZoneId = zoneIds.has("add.zone.base") ? "add.zone.base" : undefined
  return {
    id: `add.interaction.world_action.${action.id}`,
    kind: "world_action",
    action: "add.start_world_action",
    label: action.label,
    target: { kind: "map", id: mapId },
    requiredZoneId,
    enabled: worldActionEnabled(snapshot, action),
    metadata: {
      commandKind: "start_world_action",
      actionId: action.id,
      heroOnly: action.heroOnly,
      durationSeconds: action.durationSeconds,
    },
  }
}

function worldActionEnabled(
  snapshot: SimulationSnapshot,
  action: WorldActionDef,
): boolean {
  if (snapshot.activeWorldAction) return false
  if (action.heroOnly && !snapshot.roster.heroAssigned) return false
  if (
    action.heroExposure === "bubble" &&
    snapshot.heroSurvival.location === "outside_bubble"
  ) {
    return false
  }
  return true
}

function floraEntity(
  hex: HexSnapshot,
  floraId: string,
  flora: FloraDef | undefined,
): GameEntity {
  return {
    id: `add.entity.flora.${floraId}.${hex.q}.${hex.r}`,
    kind: "flora",
    label: flora?.label ?? floraId,
    coord: hexCoord(hex),
    layerId: OBJECT_LAYER_ID,
    blocksMovement: false,
    tags: ["add", "flora", flora?.kind ?? "unknown"],
    metadata: {
      sourceId: floraId,
      tileId: hex.tileId,
    },
  }
}

function structureEntity(
  hex: HexSnapshot,
  structureId: string,
  structure: StructureDef | undefined,
  tile: TileDef,
): GameEntity {
  return {
    id: `add.entity.structure.${structureId}.${hex.q}.${hex.r}`,
    kind: "landmark",
    label: structure?.label ?? tile.label,
    coord: hexCoord(hex),
    layerId: OBJECT_LAYER_ID,
    blocksMovement: tile.isBlocker,
    tags: ["add", "structure", structure?.kind ?? tile.feature],
    metadata: {
      sourceId: structureId,
      tileId: hex.tileId,
      feature: tile.feature,
    },
  }
}

function survivorCaveHexes(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly HexSnapshot[] {
  const indexes = createAddCatalogIndexes(catalog)
  return snapshot.hexes.filter((hex) => {
    const tile = indexes.tilesById.get(hex.tileId)
    return tile?.feature === "survivor_cave"
  })
}

function baseHexes(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly HexSnapshot[] {
  const indexes = createAddCatalogIndexes(catalog)
  const base = snapshot.hexes.filter((hex) => indexes.tilesById.get(hex.tileId)?.feature === "base")
  return base.length > 0 ? base : snapshot.hexes.filter((hex) => hex.distance === 0)
}

function heroMapHex(snapshot: SimulationSnapshot): HexSnapshot | undefined {
  return snapshot.heroMap
    ? snapshot.hexes.find(
        (hex) => hex.q === snapshot.heroMap.q && hex.r === snapshot.heroMap.r,
      )
    : undefined
}

function pushZone(zones: GameZone[], zone: GameZone): void {
  if (zone.cells.length > 0) zones.push(zone)
}

function tileMetadata(
  hex: HexSnapshot,
  visibility: VisibilityEntry,
  knownFacts: AddKnownTileFacts,
  vagueHint: boolean,
): GameMetadata {
  return {
    tileId: knownFacts.exactTerrainKnown ? hex.tileId : "",
    label: knownFacts.label,
    state: knownFacts.state,
    distance: hex.distance,
    progress: knownFacts.progress,
    terrain: knownFacts.terrain,
    feature: knownFacts.feature,
    impedance: knownFacts.impedance,
    isBlocker: knownFacts.isBlocker,
    exactTerrainKnown: knownFacts.exactTerrainKnown,
    landmarkKnown: knownFacts.landmarkKnown,
    dynamicDetails: knownFacts.dynamicDetails,
    dynamicRiskKnown: knownFacts.dynamicRiskKnown,
    travelRisk: knownFacts.travelRisk,
    dungeonCount: knownFacts.dungeonCount,
    tags: knownFacts.tags.join(","),
    areaIds: knownFacts.areaIds.join(","),
    vagueTravelLabel: knownFacts.vagueTravelLabel,
    visibilityState: visibility.state,
    visibilityRevealSource: visibility.revealSource ?? "",
    dynamicDetailsHidden: !addVisibilityAllowsDynamicDetails(visibility),
    vagueHint,
  }
}

function dungeonLinksForTile(
  hex: HexSnapshot,
  tile: TileDef | undefined,
): readonly GameCellLink[] {
  if (!tile || tile.dungeonIds.length === 0) return []

  return tile.dungeonIds.map((dungeonId) => {
    const dungeon = resolveAddDungeon(dungeonId)
    const reachableLandmarkEntrance = tile.feature === "survivor_cave"
    return {
      id: `add.link.${dungeonId}.${hex.q}.${hex.r}`,
      kind: "dungeon",
      targetMapId: dungeon.mapId,
      targetCoord: dungeon.entryCoord,
      label: dungeon.label,
      enabled:
        dungeon.unlocked &&
        hex.state !== "blocked" &&
        (hex.state !== "inactive" || reachableLandmarkEntrance),
      metadata: {
        dungeonId,
        homeTileId: tile.id,
        homeCoord: `${hex.q},${hex.r}`,
      },
    }
  })
}

function hexBoundsFor(hexes: readonly HexSnapshot[]) {
  if (hexes.length === 0) {
    return {
      qMin: 0,
      qMax: 0,
      rMin: 0,
      rMax: 0,
      radius: 0,
    }
  }

  const qValues = hexes.map((hex) => hex.q)
  const rValues = hexes.map((hex) => hex.r)
  const distances = hexes.map((hex) => hex.distance)
  return {
    qMin: Math.min(...qValues),
    qMax: Math.max(...qValues),
    rMin: Math.min(...rValues),
    rMax: Math.max(...rValues),
    radius: Math.max(...distances),
  }
}

function hexCoord(hex: HexSnapshot) {
  return { kind: "hex" as const, q: hex.q, r: hex.r }
}

function hexKey(q: number, r: number): string {
  return `${q},${r}`
}
