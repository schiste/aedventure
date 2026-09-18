import type {
  CellCoord,
  HexGridBounds,
  SquareDistanceMetric,
  SquareGridBounds,
  SquareNeighborMode,
  Vector2,
} from "@aedventure/game-topology"
import {
  hexCoordInBounds,
  squareCoordInBounds,
} from "@aedventure/game-topology"
import {
  validateVisibilityEntry,
  type VisibilityEntry,
} from "@aedventure/game-visibility"

export type GameMapTopologyKind = CellCoord["kind"]
export type GameLayerKind = "terrain" | "objects" | "overlay" | "collision"
export type GameInteractionTargetKind = "entity" | "zone" | "map"
export type GameCellLinkKind = "dungeon" | "portal" | "map" | string
export type GamePrimitiveValue = string | number | boolean
export type GameMetadata = Readonly<Record<string, GamePrimitiveValue>>
export type GameCellVisibility = VisibilityEntry
export type GameEntityFootprintUnit = "cell" | "world"
export type GameEntityCollisionShape = "rect" | "ellipse"

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
} from "./presentation-policies"

export interface GameEntityFootprint {
  readonly unit: GameEntityFootprintUnit
  readonly width: number
  readonly height: number
  readonly offset?: Vector2
}

export interface GameEntityCollisionFootprint extends GameEntityFootprint {
  readonly shape?: GameEntityCollisionShape
}

export interface GameEntityInteractionRadius {
  readonly unit: GameEntityFootprintUnit
  readonly value: number
}

export type GameTopologyReference =
  | SquareGameTopologyReference
  | HexGameTopologyReference

export interface SquareGameTopologyReference {
  readonly kind: "square"
  readonly cellSize: number
  readonly origin?: Vector2
  readonly bounds?: SquareGridBounds
  readonly neighborMode?: SquareNeighborMode
  readonly distanceMetric?: SquareDistanceMetric
}

export interface HexGameTopologyReference {
  readonly kind: "hex"
  readonly radius: number
  readonly origin?: Vector2
  readonly bounds?: HexGridBounds
}

export interface GameWorld {
  readonly id: string
  readonly activeMapId?: string
  readonly maps: readonly GameMap[]
  readonly metadata?: GameMetadata
}

export interface GameMap {
  readonly id: string
  readonly label?: string
  readonly topology: GameTopologyReference
  readonly layers: readonly GameLayer[]
  readonly entities: readonly GameEntity[]
  readonly zones: readonly GameZone[]
  readonly interactions?: readonly GameInteraction[]
  readonly metadata?: GameMetadata
}

export interface GameLayer {
  readonly id: string
  readonly kind: GameLayerKind
  readonly label?: string
  readonly visible?: boolean
  readonly zIndex?: number
  readonly cells?: readonly GameCellPlacement[]
  readonly metadata?: GameMetadata
}

export interface GameCellPlacement {
  readonly coord: CellCoord
  readonly tokenId?: string
  readonly value?: GamePrimitiveValue
  readonly blocked?: boolean
  readonly links?: readonly GameCellLink[]
  readonly visibility?: GameCellVisibility
  readonly metadata?: GameMetadata
}

export interface GameCellLink {
  readonly id: string
  readonly kind: GameCellLinkKind
  readonly targetMapId: string
  readonly label?: string
  readonly targetCoord?: CellCoord
  readonly enabled?: boolean
  readonly metadata?: GameMetadata
}

export interface GameEntity {
  readonly id: string
  readonly kind: string
  readonly label?: string
  readonly coord?: CellCoord
  readonly position?: Vector2
  readonly visualFootprint?: GameEntityFootprint
  readonly collisionFootprint?: GameEntityCollisionFootprint
  readonly interactionRadius?: GameEntityInteractionRadius
  readonly renderScale?: number
  readonly layerId?: string
  readonly blocksMovement?: boolean
  readonly tags?: readonly string[]
  readonly metadata?: GameMetadata
}

export interface GameZone {
  readonly id: string
  readonly kind: string
  readonly label?: string
  readonly cells: readonly CellCoord[]
  readonly interactionIds?: readonly string[]
  readonly metadata?: GameMetadata
}

export interface GameInteraction {
  readonly id: string
  readonly kind: string
  readonly action: string
  readonly target: GameInteractionTarget
  readonly label?: string
  readonly requiredZoneId?: string
  readonly enabled?: boolean
  readonly metadata?: GameMetadata
}

export interface GameInteractionTarget {
  readonly kind: GameInteractionTargetKind
  readonly id: string
}

export interface GameWorldValidation {
  readonly valid: boolean
  readonly errors: readonly string[]
  readonly checks: readonly GameWorldValidationCheck[]
  readonly summary: string
}

export interface GameWorldValidationCheck {
  readonly id: GameWorldValidationCheckId
  readonly status: "pass" | "fail"
  readonly message: string
}

export type GameWorldValidationCheckId =
  | "world_identity"
  | "map_ids"
  | "active_map"
  | "topology"
  | "layer_ids"
  | "entity_ids"
  | "zone_ids"
  | "interaction_ids"
  | "layer_cells"
  | "cell_links"
  | "entity_coords"
  | "entity_footprints"
  | "zone_cells"
  | "cell_visibility"
  | "interaction_targets"

export function validateGameWorld(world: GameWorld): GameWorldValidation {
  const errors: string[] = []
  const checks: GameWorldValidationCheck[] = []
  const fail = (id: GameWorldValidationCheckId, message: string) => {
    errors.push(message)
    checks.push({ id, status: "fail", message })
  }
  const pass = (id: GameWorldValidationCheckId, message: string) => {
    checks.push({ id, status: "pass", message })
  }

  if (world.id.trim() === "") {
    fail("world_identity", "GameWorld id must not be empty.")
  } else {
    pass("world_identity", `GameWorld ${world.id} has an id.`)
  }

  const mapIds = collectDuplicateIds(world.maps)
  if (world.maps.length === 0) {
    fail("map_ids", "GameWorld must contain at least one map.")
  } else if (mapIds.duplicates.length > 0) {
    fail("map_ids", `Duplicate map ids: ${mapIds.duplicates.join(", ")}.`)
  } else {
    pass("map_ids", `${world.maps.length} map ids are unique.`)
  }

  if (world.activeMapId !== undefined) {
    if (mapIds.ids.has(world.activeMapId)) {
      pass("active_map", `Active map ${world.activeMapId} exists.`)
    } else {
      fail("active_map", `Active map ${world.activeMapId} does not exist.`)
    }
  }

  for (const map of world.maps) {
    validateTopology(map, fail, pass)
    validateMapIds(map, fail, pass)
    validateMapCoordinates(map, fail, pass)
    validateInteractions(map, fail, pass)
  }
  validateCellLinks(world, fail, pass)

  return {
    valid: errors.length === 0,
    errors,
    checks,
    summary:
      errors.length === 0
        ? `GameWorld ${world.id} is valid with ${world.maps.length} map(s).`
        : `GameWorld ${world.id || "(missing id)"} has ${errors.length} validation error(s).`,
  }
}

function validateCellLinks(
  world: GameWorld,
  fail: (id: GameWorldValidationCheckId, message: string) => void,
  pass: (id: GameWorldValidationCheckId, message: string) => void,
): void {
  const mapById = new Map(world.maps.map((map) => [map.id, map]))
  const errors: string[] = []

  for (const map of world.maps) {
    for (const layer of map.layers) {
      for (const cell of layer.cells ?? []) {
        const linkIds = new Set<string>()
        for (const link of cell.links ?? []) {
          const source = `${map.id}:${layer.id}:${formatCoord(cell.coord)}`
          if (link.id.trim() === "") {
            errors.push(`${source}:empty-link-id`)
          }
          if (linkIds.has(link.id)) {
            errors.push(`${source}:duplicate-link:${link.id}`)
          }
          linkIds.add(link.id)
          if (link.kind.trim() === "") {
            errors.push(`${source}:${link.id}:empty-kind`)
          }
          if (link.targetMapId.trim() === "") {
            errors.push(`${source}:${link.id}:empty-target-map`)
          }

          const targetMap = mapById.get(link.targetMapId)
          if (
            targetMap &&
            link.targetCoord &&
            !coordInTopologyBounds(link.targetCoord, targetMap.topology)
          ) {
            errors.push(
              `${source}:${link.id}:target-out-of-bounds:${formatCoord(link.targetCoord)}`,
            )
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    fail("cell_links", `Cell link errors: ${errors.join(", ")}.`)
  } else {
    pass("cell_links", `GameWorld ${world.id} cell links are structurally valid.`)
  }
}

export function coordMatchesTopology(
  coord: CellCoord,
  topology: GameTopologyReference,
): boolean {
  return coord.kind === topology.kind
}

export function coordInTopologyBounds(
  coord: CellCoord,
  topology: GameTopologyReference,
): boolean {
  if (!coordMatchesTopology(coord, topology)) return false
  return topology.kind === "square" && coord.kind === "square"
    ? squareCoordInBounds(coord, topology.bounds)
    : topology.kind === "hex" && coord.kind === "hex"
      ? hexCoordInBounds(coord, topology.bounds)
      : false
}

function validateTopology(
  map: GameMap,
  fail: (id: GameWorldValidationCheckId, message: string) => void,
  pass: (id: GameWorldValidationCheckId, message: string) => void,
): void {
  if (map.topology.kind === "square") {
    if (map.topology.cellSize <= 0) {
      fail("topology", `Map ${map.id} square topology cellSize must be positive.`)
      return
    }
    if (
      map.topology.bounds &&
      (map.topology.bounds.width <= 0 || map.topology.bounds.height <= 0)
    ) {
      fail("topology", `Map ${map.id} square topology bounds must be positive.`)
      return
    }
    pass("topology", `Map ${map.id} has a valid square topology reference.`)
    return
  }

  if (map.topology.radius <= 0) {
    fail("topology", `Map ${map.id} hex topology radius must be positive.`)
    return
  }
  if (
    map.topology.bounds &&
    (map.topology.bounds.qMin > map.topology.bounds.qMax ||
      map.topology.bounds.rMin > map.topology.bounds.rMax ||
      (map.topology.bounds.radius !== undefined && map.topology.bounds.radius < 0))
  ) {
    fail("topology", `Map ${map.id} hex topology bounds are invalid.`)
    return
  }
  pass("topology", `Map ${map.id} has a valid hex topology reference.`)
}

function validateMapIds(
  map: GameMap,
  fail: (id: GameWorldValidationCheckId, message: string) => void,
  pass: (id: GameWorldValidationCheckId, message: string) => void,
): void {
  validateUniqueIds(map.layers, "layer_ids", `Map ${map.id} layer`, fail, pass)
  validateUniqueIds(map.entities, "entity_ids", `Map ${map.id} entity`, fail, pass)
  validateUniqueIds(map.zones, "zone_ids", `Map ${map.id} zone`, fail, pass)
  validateUniqueIds(
    map.interactions ?? [],
    "interaction_ids",
    `Map ${map.id} interaction`,
    fail,
    pass,
  )
}

function validateMapCoordinates(
  map: GameMap,
  fail: (id: GameWorldValidationCheckId, message: string) => void,
  pass: (id: GameWorldValidationCheckId, message: string) => void,
): void {
  const layerCoordErrors: string[] = []
  for (const layer of map.layers) {
    for (const cell of layer.cells ?? []) {
      if (!coordInTopologyBounds(cell.coord, map.topology)) {
        layerCoordErrors.push(`${layer.id}:${formatCoord(cell.coord)}`)
      }
    }
  }
  reportCoordinateCheck(
    "layer_cells",
    layerCoordErrors,
    `Map ${map.id} layer cells match topology and bounds.`,
    "Layer cells outside topology",
    fail,
    pass,
  )

  const cellVisibilityErrors: string[] = []
  for (const layer of map.layers) {
    for (const cell of layer.cells ?? []) {
      if (!cell.visibility) continue
      const validation = validateVisibilityEntry(
        cell.visibility,
        `${layer.id}:${formatCoord(cell.coord)} visibility`,
      )
      cellVisibilityErrors.push(...validation.errors)
    }
  }
  reportCoordinateCheck(
    "cell_visibility",
    cellVisibilityErrors,
    `Map ${map.id} cell visibility metadata is valid.`,
    "Cell visibility errors",
    fail,
    pass,
  )

  const layerIds = new Set(map.layers.map((layer) => layer.id))
  const entityCoordErrors: string[] = []
  const entityFootprintErrors: string[] = []
  for (const entity of map.entities) {
    if (entity.coord && !coordInTopologyBounds(entity.coord, map.topology)) {
      entityCoordErrors.push(`${entity.id}:${formatCoord(entity.coord)}`)
    }
    if (entity.layerId && !layerIds.has(entity.layerId)) {
      entityCoordErrors.push(`${entity.id}:missing-layer:${entity.layerId}`)
    }
    entityFootprintErrors.push(...validateEntityFootprints(entity))
  }
  reportCoordinateCheck(
    "entity_coords",
    entityCoordErrors,
    `Map ${map.id} entity coordinates and layer refs are valid.`,
    "Entity coordinate/layer errors",
    fail,
    pass,
  )
  reportCoordinateCheck(
    "entity_footprints",
    entityFootprintErrors,
    `Map ${map.id} entity footprints are valid.`,
    "Entity footprint errors",
    fail,
    pass,
  )

  const zoneCoordErrors: string[] = []
  for (const zone of map.zones) {
    if (zone.cells.length === 0) {
      zoneCoordErrors.push(`${zone.id}:empty`)
    }
    for (const coord of zone.cells) {
      if (!coordInTopologyBounds(coord, map.topology)) {
        zoneCoordErrors.push(`${zone.id}:${formatCoord(coord)}`)
      }
    }
  }
  reportCoordinateCheck(
    "zone_cells",
    zoneCoordErrors,
    `Map ${map.id} zone cells match topology and bounds.`,
    "Zone cell errors",
    fail,
    pass,
  )
}

function validateInteractions(
  map: GameMap,
  fail: (id: GameWorldValidationCheckId, message: string) => void,
  pass: (id: GameWorldValidationCheckId, message: string) => void,
): void {
  const entityIds = new Set(map.entities.map((entity) => entity.id))
  const zoneIds = new Set(map.zones.map((zone) => zone.id))
  const interactionIds = new Set((map.interactions ?? []).map((interaction) => interaction.id))
  const targetErrors: string[] = []

  for (const zone of map.zones) {
    for (const interactionId of zone.interactionIds ?? []) {
      if (!interactionIds.has(interactionId)) {
        targetErrors.push(`${zone.id}:missing-interaction:${interactionId}`)
      }
    }
  }

  for (const interaction of map.interactions ?? []) {
    if (interaction.requiredZoneId && !zoneIds.has(interaction.requiredZoneId)) {
      targetErrors.push(`${interaction.id}:missing-zone:${interaction.requiredZoneId}`)
    }
    if (
      (interaction.target.kind === "entity" && !entityIds.has(interaction.target.id)) ||
      (interaction.target.kind === "zone" && !zoneIds.has(interaction.target.id)) ||
      (interaction.target.kind === "map" && interaction.target.id !== map.id)
    ) {
      targetErrors.push(
        `${interaction.id}:missing-${interaction.target.kind}:${interaction.target.id}`,
      )
    }
  }

  if (targetErrors.length > 0) {
    fail("interaction_targets", `Interaction target errors: ${targetErrors.join(", ")}.`)
  } else {
    pass("interaction_targets", `Map ${map.id} interaction targets are valid.`)
  }
}

function validateUniqueIds(
  items: readonly { readonly id: string }[],
  checkId: GameWorldValidationCheckId,
  label: string,
  fail: (id: GameWorldValidationCheckId, message: string) => void,
  pass: (id: GameWorldValidationCheckId, message: string) => void,
): void {
  const { duplicates } = collectDuplicateIds(items)
  if (duplicates.length > 0) {
    fail(checkId, `${label} ids contain duplicates: ${duplicates.join(", ")}.`)
  } else {
    pass(checkId, `${label} ids are unique.`)
  }
}

function collectDuplicateIds(
  items: readonly { readonly id: string }[],
): { ids: Set<string>; duplicates: string[] } {
  const ids = new Set<string>()
  const duplicates = new Set<string>()
  for (const item of items) {
    if (ids.has(item.id)) {
      duplicates.add(item.id)
    }
    ids.add(item.id)
  }
  return { ids, duplicates: [...duplicates] }
}

function validateEntityFootprints(entity: GameEntity): string[] {
  const errors: string[] = []
  validateFootprint(`${entity.id}:visualFootprint`, entity.visualFootprint, errors)
  validateFootprint(`${entity.id}:collisionFootprint`, entity.collisionFootprint, errors)
  if (
    entity.interactionRadius &&
    (!validFootprintUnit(entity.interactionRadius.unit) ||
      !positiveFinite(entity.interactionRadius.value))
  ) {
    errors.push(`${entity.id}:interactionRadius`)
  }
  if (entity.renderScale !== undefined && !positiveFinite(entity.renderScale)) {
    errors.push(`${entity.id}:renderScale`)
  }
  return errors
}

function validateFootprint(
  label: string,
  footprint: GameEntityFootprint | undefined,
  errors: string[],
): void {
  if (!footprint) return
  if (
    !validFootprintUnit(footprint.unit) ||
    !positiveFinite(footprint.width) ||
    !positiveFinite(footprint.height)
  ) {
    errors.push(label)
  }
}

function validFootprintUnit(unit: GameEntityFootprintUnit): boolean {
  return unit === "cell" || unit === "world"
}

function positiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

function reportCoordinateCheck(
  id: GameWorldValidationCheckId,
  errors: readonly string[],
  passMessage: string,
  failPrefix: string,
  fail: (id: GameWorldValidationCheckId, message: string) => void,
  pass: (id: GameWorldValidationCheckId, message: string) => void,
): void {
  if (errors.length > 0) {
    fail(id, `${failPrefix}: ${errors.join(", ")}.`)
  } else {
    pass(id, passMessage)
  }
}

function formatCoord(coord: CellCoord): string {
  return coord.kind === "square"
    ? `square:${coord.x}:${coord.y}`
    : `hex:${coord.q}:${coord.r}`
}

export const GAME_WORLD_PACKAGE = "@aedventure/game-world"
