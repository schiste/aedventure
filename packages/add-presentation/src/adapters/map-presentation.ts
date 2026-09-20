import type { CellCoord, HexCoord } from "@aedventure/game-topology"
import type { GameCellLink, GameCellPlacement, GameMap } from "@aedventure/game-world"

export type AddCellState = "inactive" | "converting" | "stabilized" | "blocked"
export type AddTerrain =
  | "plains"
  | "river"
  | "scrub"
  | "ridge"
  | "mountain"
  | "dungeon_floor"
  | "dungeon_wall"
  | "base_floor"
  | "base_wall"
  | "unknown"
export type AddFeature = "none" | "base" | "survivor_cave" | string
export type AddTravelExposureRisk = "studio" | "safe_field" | "fringe" | "toxic" | "unknown"
export type AddVisibilityRenderState = "hidden" | "discovered" | "visible" | "stale"
export type AddTileKnownInfoLevel = "unknown" | "known_static" | "full_current"
export type AddTileInteractionState = AddCellState | "unknown"

export interface AddDungeonLinkInfo {
  readonly id: string
  readonly kind: string
  readonly label: string
  readonly targetMapId: string
  readonly targetCoord: string | null
  readonly enabled: boolean
}

export interface AddTileInteractionDetail {
  readonly cell: string
  readonly label: string
  readonly visibility: AddVisibilityRenderState
  readonly knownInfoLevel: AddTileKnownInfoLevel
  readonly terrain: AddTerrain
  readonly feature: AddFeature
  readonly state: AddTileInteractionState
  readonly exposureRisk: AddTravelExposureRisk
  readonly dungeonActionsVisible: boolean
  readonly dungeonLinks: readonly AddDungeonLinkInfo[]
  readonly areaIds: readonly string[]
  readonly travelCopy: string
}

export interface AddKnownFactsInfo {
  readonly hiddenCells: number
  readonly discoveredCells: number
  readonly visibleCells: number
  readonly staleCells: number
  readonly exactTerrainKnownCells: number
  readonly dynamicRiskKnownCells: number
  readonly vagueTravelLabels: number
  readonly sampleHiddenTravelLabel: string | null
}

export interface AddTravelRevealPreviewInfo {
  readonly active: boolean
  readonly cells: ReadonlySet<string>
  readonly progress: number
  readonly destinationCell: string | null
}

export interface AddMapVisibilityInfo {
  readonly hiddenCells: number
  readonly discoveredCells: number
  readonly visibleCells: number
  readonly staleCells: number
  readonly revealTransitionsActive: number
  readonly travelRevealPreviewActive: boolean
  readonly travelRevealPreviewCells: number
  readonly travelRevealPreviewProgress: number
  readonly travelRevealDestinationCell: string | null
}

interface VisibilityCounts {
  readonly hidden: number
  readonly discovered: number
  readonly visible: number
  readonly stale: number
}

export function stateForCell(cell: GameCellPlacement): AddCellState {
  const value = cell.metadata?.state
  return value === "inactive" ||
    value === "converting" ||
    value === "stabilized" ||
    value === "blocked"
    ? value
    : cell.blocked
      ? "blocked"
      : "inactive"
}

export function terrainForCell(cell: GameCellPlacement): AddTerrain {
  const value = cell.metadata?.terrain
  return value === "plains" ||
    value === "river" ||
    value === "scrub" ||
    value === "ridge" ||
    value === "mountain" ||
    value === "dungeon_floor" ||
    value === "dungeon_wall" ||
    value === "base_floor" ||
    value === "base_wall"
    ? value
    : "unknown"
}

export function featureForCell(cell: GameCellPlacement): AddFeature {
  const value = cell.metadata?.feature
  return typeof value === "string" ? value : "none"
}

export function progressForCell(cell: GameCellPlacement): number {
  return clamp(numberMetadata(cell, "progress") ?? 0, 0, 1)
}

export type AddMapMarkerKind = "harvestable" | "water" | "entrance"

export interface AddMapMarker {
  readonly kind: AddMapMarkerKind
  readonly label: string
}

/** At-a-glance markers for a cell: surfaces tile facts that aren't already drawn
 * as landmarks (base/cave render as blobs already). Reads projected `tags` +
 * `dungeonCount`; empty for unknown/hidden cells (no tags projected). */
export function mapMarkersForCell(cell: GameCellPlacement): readonly AddMapMarker[] {
  const markers: AddMapMarker[] = []
  const raw = stringMetadata(cell, "tags")
  const tags = raw ? raw.split(",") : []
  if (tags.includes("harvestable")) markers.push({ kind: "harvestable", label: "Harvestable" })
  if (tags.includes("water_source")) markers.push({ kind: "water", label: "Water source" })
  const rawAreaIds = stringMetadata(cell, "areaIds")
  const hasAreaSubmap = Boolean(rawAreaIds && rawAreaIds.split(",").some(Boolean))
  if ((numberMetadata(cell, "dungeonCount") ?? 0) > 0 || hasAreaSubmap) {
    markers.push({ kind: "entrance", label: "Entrance" })
  }
  return markers
}

export function exposureRiskForCell(cell: GameCellPlacement): AddTravelExposureRisk {
  const knownRisk = stringMetadata(cell, "travelRisk")
  if (
    knownRisk === "studio" ||
    knownRisk === "safe_field" ||
    knownRisk === "fringe" ||
    knownRisk === "toxic" ||
    knownRisk === "unknown"
  ) {
    return knownRisk
  }
  const feature = featureForCell(cell)
  const state = stateForCell(cell)
  if (isBaseFeature(feature)) return "studio"
  if (state === "stabilized") return "safe_field"
  if (state === "converting") return "fringe"
  return "toxic"
}

export function tileInteractionDetailForCoord(
  coord: CellCoord,
  terrainByCoord: ReadonlyMap<string, GameCellPlacement>,
): AddTileInteractionDetail | null {
  const cell = terrainByCoord.get(addMapCoordKey(coord))
  if (!cell) return null

  const visibility = visibilityStateForCell(cell)
  if (visibility === "hidden") {
    return {
      cell: displayAddCell(coord),
      label: "Unknown region",
      visibility,
      knownInfoLevel: "unknown",
      terrain: "unknown",
      feature: "none",
      state: "unknown",
      exposureRisk: "unknown",
      dungeonActionsVisible: false,
      dungeonLinks: [],
      areaIds: [],
      travelCopy: "Unknown region. Adjacent travel is possible, but terrain and entrances are unknown.",
    }
  }

  const terrain = terrainForCell(cell)
  const feature = featureForCell(cell)
  const state = visibility === "visible" ? stateForCell(cell) : "unknown"
  const exposureRisk = visibility === "visible" ? exposureRiskForCell(cell) : "unknown"
  const knownInfoLevel: AddTileKnownInfoLevel =
    visibility === "visible" ? "full_current" : "known_static"
  const baseLabel = knownTileLabel(cell)
  const staticLabel =
    terrain === "unknown" ? baseLabel : `${baseLabel} · ${titleCase(terrain)}`
  const currentLabel =
    state === "unknown" ? staticLabel : `${baseLabel} · ${titleCase(state)} ${titleCase(terrain)}`
  const dungeonLinks = dungeonLinksForCell(cell).map(dungeonLinkInfo)
  const labelWithLinks =
    dungeonLinks.length === 0
      ? currentLabel
      : `${currentLabel} -> ${dungeonLinks.map((link) => link.label).join(", ")}`

  return {
    cell: displayAddCell(coord),
    label: labelWithLinks,
    visibility,
    knownInfoLevel,
    terrain,
    feature,
    state,
    exposureRisk,
    dungeonActionsVisible: dungeonLinks.length > 0,
    dungeonLinks,
    areaIds: (() => {
      const raw = cell.metadata?.areaIds
      return typeof raw === "string" && raw.length > 0 ? raw.split(",") : []
    })(),
    travelCopy:
      visibility === "visible"
        ? `${currentLabel}. Current conditions are known.`
        : `${staticLabel}. Current risk and activity may have changed.`,
  }
}

export function knownTileLabel(cell: GameCellPlacement): string {
  const knownLabel = stringMetadata(cell, "label")
  if (knownLabel) return knownLabel
  const feature = featureForCell(cell)
  if (feature === "base") return "Studio"
  if (feature === "base_core") return "Base Core"
  if (feature === "survivor_cave") return "Survivor Cave"
  if (feature !== "none") return titleCase(feature)
  const terrain = terrainForCell(cell)
  return terrain === "unknown" ? "Known region" : `${titleCase(terrain)} region`
}

export function knownFactsInfo(cells: readonly GameCellPlacement[]): AddKnownFactsInfo {
  let hiddenCells = 0
  let discoveredCells = 0
  let visibleCells = 0
  let staleCells = 0
  let exactTerrainKnownCells = 0
  let dynamicRiskKnownCells = 0
  let vagueTravelLabels = 0
  let sampleHiddenTravelLabel: string | null = null

  for (const cell of cells) {
    const visibilityState = stringMetadata(cell, "visibilityState")
    if (visibilityState === "hidden") hiddenCells += 1
    if (visibilityState === "discovered") discoveredCells += 1
    if (visibilityState === "visible") visibleCells += 1
    if (visibilityState === "stale") staleCells += 1
    if (cell.metadata?.exactTerrainKnown === true) exactTerrainKnownCells += 1
    if (cell.metadata?.dynamicRiskKnown === true) dynamicRiskKnownCells += 1

    const vagueLabel = stringMetadata(cell, "vagueTravelLabel")
    if (vagueLabel && visibilityState === "hidden") {
      vagueTravelLabels += 1
      if (!sampleHiddenTravelLabel) sampleHiddenTravelLabel = vagueLabel
    }
  }

  return {
    hiddenCells,
    discoveredCells,
    visibleCells,
    staleCells,
    exactTerrainKnownCells,
    dynamicRiskKnownCells,
    vagueTravelLabels,
    sampleHiddenTravelLabel,
  }
}

export function visibilityInfo(
  cells: readonly GameCellPlacement[],
  revealTransitionsActive: number,
  travelRevealPreview: AddTravelRevealPreviewInfo,
): AddMapVisibilityInfo {
  const counts = visibilityCounts(cells)
  return {
    hiddenCells: counts.hidden,
    discoveredCells: counts.discovered,
    visibleCells: counts.visible,
    staleCells: counts.stale,
    revealTransitionsActive,
    travelRevealPreviewActive: travelRevealPreview.active,
    travelRevealPreviewCells: travelRevealPreview.cells.size,
    travelRevealPreviewProgress: round(travelRevealPreview.progress),
    travelRevealDestinationCell: travelRevealPreview.destinationCell,
  }
}

export function visibilityStateForCell(cell: GameCellPlacement): AddVisibilityRenderState {
  const value = stringMetadata(cell, "visibilityState")
  return value === "visible" ||
    value === "discovered" ||
    value === "stale" ||
    value === "hidden"
    ? value
    : "hidden"
}

export function presentationVisibilityStateForCell(
  cell: GameCellPlacement,
): AddVisibilityRenderState {
  if (!cellHasVisibilityMetadata(cell)) return "visible"
  return visibilityStateForCell(cell)
}

export function cellIsKnownForPresentation(cell: GameCellPlacement): boolean {
  if (!cellHasVisibilityMetadata(cell)) return true
  return visibilityStateForCell(cell) !== "hidden"
}

export function cellHasVisibilityMetadata(cell: GameCellPlacement): boolean {
  return stringMetadata(cell, "visibilityState") !== undefined
}

export function dungeonLinksForCell(cell: GameCellPlacement): readonly GameCellLink[] {
  const visibility = visibilityStateForCell(cell)
  if (visibility !== "discovered" && visibility !== "visible") return []
  return (cell.links ?? []).filter((link) => link.kind === "dungeon")
}

export function dungeonLinkInfo(link: GameCellLink): AddDungeonLinkInfo {
  return {
    id: link.id,
    kind: link.kind,
    label: link.label ?? link.id,
    targetMapId: link.targetMapId,
    targetCoord: link.targetCoord ? displayAddCell(link.targetCoord) : null,
    enabled: link.enabled ?? true,
  }
}

export function addMapCoordKey(coord: CellCoord): string {
  return coord.kind === "hex" ? `hex:${coord.q}:${coord.r}` : `square:${coord.x}:${coord.y}`
}

export function displayAddCell(coord: CellCoord): string {
  return `${coord.kind}:${displayAddCoord(coord)}`
}

export function displayAddCoord(coord: CellCoord): string {
  return coord.kind === "hex" ? serializeHex(coord) : `${coord.x},${coord.y}`
}

export function isBaseFeature(feature: AddFeature): boolean {
  return feature === "base" || feature === "base_core"
}

export function numberMetadata(
  item: Pick<GameCellPlacement | GameMap, "metadata">,
  key: string,
): number | undefined {
  const value = item.metadata?.[key]
  return typeof value === "number" ? value : undefined
}

export function stringMetadata(
  item: Pick<GameCellPlacement | GameMap, "metadata">,
  key: string,
): string | undefined {
  const value = item.metadata?.[key]
  return typeof value === "string" ? value : undefined
}

function visibilityCounts(cells: readonly GameCellPlacement[]): VisibilityCounts {
  return cells.reduce<VisibilityCounts>(
    (counts, cell) => {
      const state = visibilityStateForCell(cell)
      return {
        hidden: counts.hidden + (state === "hidden" ? 1 : 0),
        discovered: counts.discovered + (state === "discovered" ? 1 : 0),
        visible: counts.visible + (state === "visible" ? 1 : 0),
        stale: counts.stale + (state === "stale" ? 1 : 0),
      }
    },
    { hidden: 0, discovered: 0, visible: 0, stale: 0 },
  )
}

function serializeHex(coord: HexCoord): string {
  return `${coord.q},${coord.r}`
}

function titleCase(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1).replace("_", " ")}`
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
