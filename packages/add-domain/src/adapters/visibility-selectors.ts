import {
  createHexTopology,
  serializeCellCoord,
  type HexCoord,
} from "@aedventure/game-topology"
import {
  KNOWN_FACT_POLICIES,
  createVisibilityEntry,
  createVisibilityMap,
  getVisibilityEntry,
  mergeVisibilityEntry,
  revealVisibilityRadius,
  visibilityKey,
  type MutableVisibilityMap,
  type VisibilityEntry,
  type VisibilityMap,
} from "@aedventure/game-visibility"

import type {
  CatalogSnapshot,
  HexSnapshot,
  SimulationSnapshot,
  TileDef,
} from "../runtime/protocol"
import { createAddCatalogIndexes } from "./catalog-selectors"

export const ADD_HERO_VISION_RADIUS = 1

export type AddVisibilityRevealSource =
  | "add:survivor_cave"
  | "add:runtime"
  | "add:hero"

export interface AddVisibilitySelectorsOptions {
  readonly now?: number
}

export interface AddVisibilitySummary {
  readonly visibility: VisibilityMap
  readonly baseCoord: HexCoord | null
  readonly survivorCaveCoord: HexCoord | null
  readonly heroVisionCoord: HexCoord | null
  readonly visibleCount: number
  readonly discoveredCount: number
  readonly hiddenCount: number
  readonly staleCount: number
  readonly vagueHintCount: number
}

export interface AddVagueVisibilityHint {
  readonly coord: HexCoord
  readonly label: "Unscouted region"
  readonly reason: "adjacent_to_known_cell"
}

export type AddKnownDynamicDetailState = "current" | "stale" | "hidden"
export type AddKnownTravelRisk = "studio" | "safe_field" | "fringe" | "toxic" | "unknown"
export type AddKnownTerrain = TileDef["terrain"] | "unknown"
export type AddKnownFeature = TileDef["feature"]

export interface AddKnownTileFacts {
  readonly label: string
  readonly terrain: AddKnownTerrain
  readonly feature: AddKnownFeature
  readonly state: HexSnapshot["state"]
  readonly progress: number
  readonly impedance: number
  readonly isBlocker: boolean
  readonly exactTerrainKnown: boolean
  readonly landmarkKnown: boolean
  readonly dynamicDetails: AddKnownDynamicDetailState
  readonly dynamicRiskKnown: boolean
  readonly travelRisk: AddKnownTravelRisk
  readonly dungeonCount: number
  readonly tags: readonly string[]
  readonly areaIds: readonly string[]
  readonly vagueTravelLabel: string
}

export function selectAddVisibilitySummary(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  options: AddVisibilitySelectorsOptions = {},
): AddVisibilitySummary {
  const indexes = createAddCatalogIndexes(catalog)
  const baseHex = baseHexForSnapshot(snapshot, indexes.tilesById)
  const survivorCaveHex = survivorCaveHexForSnapshot(snapshot, indexes.tilesById)
  const heroVisionHex = heroVisionHexForSnapshot(snapshot, indexes.tilesById)
  const baseCoord = baseHex ? hexCoord(baseHex) : null
  const survivorCaveCoord = survivorCaveHex ? hexCoord(survivorCaveHex) : null
  const heroVisionCoord = heroVisionHex ? hexCoord(heroVisionHex) : baseCoord
  const visibility = selectAddVisibilityMap(snapshot, catalog, options)
  const hints = selectAddVagueVisibilityHints(snapshot.hexes, visibility)
  const counts = countVisibilityStates(snapshot.hexes, visibility)

  return {
    visibility,
    baseCoord,
    survivorCaveCoord,
    heroVisionCoord,
    visibleCount: counts.visible,
    discoveredCount: counts.discovered,
    hiddenCount: counts.hidden,
    staleCount: counts.stale,
    vagueHintCount: hints.length,
  }
}

export function selectAddVisibilityMap(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  options: AddVisibilitySelectorsOptions = {},
): MutableVisibilityMap {
  const indexes = createAddCatalogIndexes(catalog)
  const coords = snapshot.hexes.map(hexCoord)
  const topology = createHexTopology({
    radius: 1,
    bounds: hexBoundsForCoords(coords),
  })
  const now = options.now ?? snapshot.clockSeconds
  let visibility: VisibilityMap = createVisibilityMap()

  const baseHex = baseHexForSnapshot(snapshot, indexes.tilesById)
  const survivorCaveHex = survivorCaveHexForSnapshot(snapshot, indexes.tilesById)
  const heroVisionHex = heroVisionHexForSnapshot(snapshot, indexes.tilesById)

  for (const coord of snapshot.discoveredCells ?? []) {
    visibility = revealKnownCoord(
      visibility,
      { kind: "hex", q: coord.q, r: coord.r },
      "discovered",
      {
        now,
        revealSource: "add:runtime",
      },
    )
  }

  if (survivorCaveHex) {
    visibility = revealKnownCoord(visibility, hexCoord(survivorCaveHex), "discovered", {
      now,
      revealSource: "add:survivor_cave",
    })
  }

  const heroCoord = heroVisionHex ? hexCoord(heroVisionHex) : baseHex ? hexCoord(baseHex) : null
  if (heroCoord) {
    visibility = revealVisibilityRadius(
      visibility,
      topology,
      [heroCoord],
      ADD_HERO_VISION_RADIUS,
      "visible",
      { now, revealSource: "add:hero" },
    )
  }

  return restrictVisibilityToSnapshotHexes(visibility, snapshot.hexes)
}

export function selectAddVagueVisibilityHints(
  hexes: readonly HexSnapshot[],
  visibility: VisibilityMap,
): readonly AddVagueVisibilityHint[] {
  const coordByKey = new Map(hexes.map((hex) => [serializeCellCoord(hexCoord(hex)), hexCoord(hex)]))
  const knownKeys = new Set(
    hexes
      .map(hexCoord)
      .filter((coord) => KNOWN_FACT_POLICIES.rememberedOrVisible(
        getVisibilityEntry(visibility, coord).state,
      ))
      .map(serializeCellCoord),
  )
  const hints: AddVagueVisibilityHint[] = []

  for (const hex of hexes) {
    const coord = hexCoord(hex)
    const key = serializeCellCoord(coord)
    if (KNOWN_FACT_POLICIES.rememberedOrVisible(getVisibilityEntry(visibility, coord).state)) {
      continue
    }
    const hasKnownNeighbor = hexNeighbors(coord).some((neighbor) =>
      knownKeys.has(serializeCellCoord(neighbor)),
    )
    if (!hasKnownNeighbor) continue
    hints.push({
      coord: coordByKey.get(key) ?? coord,
      label: "Unscouted region",
      reason: "adjacent_to_known_cell",
    })
  }

  return hints
}

export function addVisibilityForHex(
  visibility: VisibilityMap,
  hex: HexSnapshot,
): VisibilityEntry {
  return getVisibilityEntry(visibility, hexCoord(hex))
}

export function addVisibilityAllowsDungeonLinks(visibility: VisibilityEntry): boolean {
  return KNOWN_FACT_POLICIES.discoveredOrVisible(visibility.state)
}

export function addVisibilityAllowsStaticTileFacts(visibility: VisibilityEntry): boolean {
  return KNOWN_FACT_POLICIES.rememberedOrVisible(visibility.state)
}

export function addVisibilityAllowsDynamicDetails(visibility: VisibilityEntry): boolean {
  return KNOWN_FACT_POLICIES.visibleOnly(visibility.state)
}

export function addVisibilityAllowsVagueHints(visibility: VisibilityEntry): boolean {
  return visibility.state === "hidden"
}

export function selectAddKnownTileFacts(
  hex: HexSnapshot,
  tile: TileDef | undefined,
  visibility: VisibilityEntry,
  vagueHint: boolean,
): AddKnownTileFacts {
  if (!addVisibilityAllowsStaticTileFacts(visibility)) {
    return {
      label: "",
      terrain: "unknown",
      feature: "none",
      state: "inactive",
      progress: 0,
      impedance: 0,
      isBlocker: false,
      exactTerrainKnown: false,
      landmarkKnown: false,
      dynamicDetails: "hidden",
      dynamicRiskKnown: false,
      travelRisk: "unknown",
      dungeonCount: 0,
      tags: [],
      areaIds: [],
      vagueTravelLabel: vagueHint ? "Unscouted region nearby" : "Unknown region",
    }
  }

  const dynamicDetailsVisible = addVisibilityAllowsDynamicDetails(visibility)
  const feature = tile?.feature ?? "none"
  const terrain = tile?.terrain ?? "unknown"
  const state = dynamicDetailsVisible ? hex.state : "inactive"

  return {
    label: knownStaticLabel(tile),
    terrain,
    feature,
    state,
    progress: dynamicDetailsVisible ? hex.progress : 0,
    impedance: tile?.impedance ?? 0,
    isBlocker: tile?.isBlocker ?? hex.state === "blocked",
    exactTerrainKnown: terrain !== "unknown",
    landmarkKnown: feature !== "none" || (tile?.structureIds.length ?? 0) > 0,
    dynamicDetails: dynamicDetailsVisible ? "current" : "stale",
    dynamicRiskKnown: dynamicDetailsVisible,
    travelRisk: dynamicDetailsVisible ? travelRiskForCurrentFacts(feature, hex.state) : "unknown",
    dungeonCount: addVisibilityAllowsDungeonLinks(visibility) ? tile?.dungeonIds.length ?? 0 : 0,
    tags: tile?.tags ?? [],
    areaIds: addVisibilityAllowsDungeonLinks(visibility) ? tile?.areaIds ?? [] : [],
    vagueTravelLabel: dynamicDetailsVisible
      ? knownStaticLabel(tile)
      : `${knownStaticLabel(tile)}. Conditions may have changed`,
  }
}

function knownStaticLabel(tile: TileDef | undefined): string {
  if (!tile) return "Known region"
  if (tile.feature === "base") return "Studio"
  if (tile.feature === "survivor_cave") return "Survivor Cave"
  return tile.label
}

function travelRiskForCurrentFacts(
  feature: TileDef["feature"],
  state: HexSnapshot["state"],
): AddKnownTravelRisk {
  if (feature === "base") return "studio"
  if (state === "stabilized") return "safe_field"
  if (state === "converting") return "fringe"
  return "toxic"
}

function revealKnownCoord(
  visibility: VisibilityMap,
  coord: HexCoord,
  state: "discovered" | "visible",
  options: {
    readonly now: number
    readonly revealSource: AddVisibilityRevealSource
  },
): MutableVisibilityMap {
  const next = new Map(visibility)
  const key = visibilityKey(coord)
  next.set(
    key,
    mergeVisibilityEntry(
      next.get(key),
      createVisibilityEntry(state, {
        now: options.now,
        revealSource: options.revealSource,
      }),
    ),
  )
  return next
}

function baseHexForSnapshot(
  snapshot: SimulationSnapshot,
  tilesById: ReadonlyMap<string, TileDef>,
): HexSnapshot | undefined {
  return (
    snapshot.hexes.find((hex) => tilesById.get(hex.tileId)?.feature === "base") ??
    snapshot.hexes.find((hex) => hex.distance === 0)
  )
}

function survivorCaveHexForSnapshot(
  snapshot: SimulationSnapshot,
  tilesById: ReadonlyMap<string, TileDef>,
): HexSnapshot | undefined {
  return snapshot.hexes.find((hex) => tilesById.get(hex.tileId)?.feature === "survivor_cave")
}

function heroVisionHexForSnapshot(
  snapshot: SimulationSnapshot,
  tilesById: ReadonlyMap<string, TileDef>,
): HexSnapshot | undefined {
  const runtimeHeroHex = snapshot.heroMap
    ? snapshot.hexes.find(
        (hex) => hex.q === snapshot.heroMap.q && hex.r === snapshot.heroMap.r,
      )
    : undefined
  return (
    runtimeHeroHex ??
    survivorCaveHexForSnapshot(snapshot, tilesById) ??
    baseHexForSnapshot(snapshot, tilesById)
  )
}

function restrictVisibilityToSnapshotHexes(
  visibility: VisibilityMap,
  hexes: readonly HexSnapshot[],
): MutableVisibilityMap {
  const next = createVisibilityMap()
  for (const hex of hexes) {
    const coord = hexCoord(hex)
    const entry = getVisibilityEntry(visibility, coord)
    if (entry.state !== "hidden") next.set(visibilityKey(coord), entry)
  }
  return next
}

function countVisibilityStates(
  hexes: readonly HexSnapshot[],
  visibility: VisibilityMap,
): Record<VisibilityEntry["state"], number> {
  const counts: Record<VisibilityEntry["state"], number> = {
    hidden: 0,
    discovered: 0,
    visible: 0,
    stale: 0,
  }
  for (const hex of hexes) {
    counts[getVisibilityEntry(visibility, hexCoord(hex)).state] += 1
  }
  return counts
}

function hexBoundsForCoords(coords: readonly HexCoord[]) {
  if (coords.length === 0) {
    return {
      qMin: 0,
      qMax: 0,
      rMin: 0,
      rMax: 0,
      radius: 0,
    }
  }

  const qValues = coords.map((coord) => coord.q)
  const rValues = coords.map((coord) => coord.r)
  const distances = coords.map((coord) =>
    Math.max(Math.abs(coord.q), Math.abs(coord.r), Math.abs(-coord.q - coord.r)),
  )
  return {
    qMin: Math.min(...qValues),
    qMax: Math.max(...qValues),
    rMin: Math.min(...rValues),
    rMax: Math.max(...rValues),
    radius: Math.max(...distances),
  }
}

function hexNeighbors(coord: HexCoord): readonly HexCoord[] {
  return [
    { kind: "hex", q: coord.q + 1, r: coord.r },
    { kind: "hex", q: coord.q + 1, r: coord.r - 1 },
    { kind: "hex", q: coord.q, r: coord.r - 1 },
    { kind: "hex", q: coord.q - 1, r: coord.r },
    { kind: "hex", q: coord.q - 1, r: coord.r + 1 },
    { kind: "hex", q: coord.q, r: coord.r + 1 },
  ]
}

function hexCoord(hex: HexSnapshot): HexCoord {
  return { kind: "hex", q: hex.q, r: hex.r }
}
