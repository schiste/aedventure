import type { CellCoord } from "@aedventure/game-topology"
import type { GameCellLink, GameCellPlacement, GameEntity, GameMap } from "@aedventure/game-world"

// An Area Map is the optional middle tier between the world hex map and a dungeon
// interior: a small hex "honeycomb" sub-region. It is authored content (like a
// dungeon blueprint) but built directly as a hex GameMap (compileDungeon is
// square-only), so it renders through the existing overworld hex pipeline.

export interface AreaCellSpec {
  readonly q: number
  readonly r: number
  /** Cell feature (e.g. "entrance", "dungeon"); drives presentation + markers. */
  readonly feature?: string
  readonly label?: string
  /** Dungeon/map links surfaced when the Hero stands on this cell. */
  readonly links?: readonly GameCellLink[]
  /** A landmark/creature entity placed on this cell. */
  readonly entity?: Omit<GameEntity, "coord">
  readonly blocked?: boolean
}

export type AddAreaEntrySide =
  | "east"
  | "north_east"
  | "north_west"
  | "west"
  | "south_west"
  | "south_east"

export interface BuildAreaMapOptions {
  readonly entrySide?: AddAreaEntrySide | null
}

export interface AreaDefinition {
  readonly id: string
  readonly mapId: string
  readonly label: string
  /** Hex disk radius in CELLS (the honeycomb's ring count). */
  readonly radius: number
  /** On-screen size of each hex in pixels. Note: the renderer reads
   * `topology.radius` as the per-cell pixel radius (see visualCellRadius), so
   * this must be a screen size, not the ring count. Defaults to a readable size. */
  readonly cellPixelRadius?: number
  /** Where the Hero spawns on entry. */
  readonly entryCoord: { readonly q: number; readonly r: number }
  readonly cells?: readonly AreaCellSpec[]
}

// A local area is small (a few rings), so its hexes should read large. The camera
// fit then frames the disk to the viewport.
const DEFAULT_AREA_CELL_PIXEL_RADIUS = 48

function hexDisk(radius: number): { q: number; r: number }[] {
  const coords: { q: number; r: number }[] = []
  for (let q = -radius; q <= radius; q += 1) {
    const rMin = Math.max(-radius, -q - radius)
    const rMax = Math.min(radius, -q + radius)
    for (let r = rMin; r <= rMax; r += 1) coords.push({ q, r })
  }
  return coords
}

const coordKey = (q: number, r: number) => `${q},${r}`

export function areaEntryCoordForSide(
  radius: number,
  side: AddAreaEntrySide,
): { readonly q: number; readonly r: number } {
  const half = Math.floor(radius / 2)
  switch (side) {
    case "east":
      return { q: radius, r: -half }
    case "north_east":
      return { q: half, r: -radius }
    case "north_west":
      return { q: -half, r: -radius + half }
    case "west":
      return { q: -radius, r: half }
    case "south_west":
      return { q: -half, r: radius }
    case "south_east":
      return { q: half, r: radius - half }
  }
}

/** Build an area as a hex GameMap: a radius-N disk of walkable cells with the
 * authored special cells (entrances, dungeon links) overlaid + a Hero entity. */
export function buildAreaMap(def: AreaDefinition, options: BuildAreaMapOptions = {}): GameMap {
  const overrides = new Map((def.cells ?? []).map((cell) => [coordKey(cell.q, cell.r), cell]))
  const disk = hexDisk(def.radius)
  const entryCoord = options.entrySide
    ? areaEntryCoordForSide(def.radius, options.entrySide)
    : def.entryCoord

  const cells: GameCellPlacement[] = disk.map(({ q, r }) => {
    const override = overrides.get(coordKey(q, r))
    const coord: CellCoord = { kind: "hex", q, r }
    const dungeonCount = override?.links?.filter((link) => link.kind === "dungeon").length ?? 0
    return {
      coord,
      blocked: override?.blocked ?? false,
      links: override?.links,
      metadata: {
        terrain: "plains",
        state: "stabilized",
        feature: override?.feature ?? "none",
        label: override?.label ?? def.label,
        visibilityState: "visible",
        dungeonCount,
      },
    }
  })

  const qs = disk.map((cell) => cell.q)
  const rs = disk.map((cell) => cell.r)
  const bounds = {
    qMin: Math.min(...qs),
    qMax: Math.max(...qs),
    rMin: Math.min(...rs),
    rMax: Math.max(...rs),
    radius: def.radius,
  }

  const entities: GameEntity[] = [
    {
      id: "add.entity.hero",
      kind: "hero",
      label: "Hero",
      coord: { kind: "hex", q: entryCoord.q, r: entryCoord.r },
      tags: ["add", "hero"],
    },
    ...(def.cells ?? []).flatMap((cell) =>
      cell.entity ? [{ ...cell.entity, coord: { kind: "hex" as const, q: cell.q, r: cell.r } }] : [],
    ),
  ]

  return {
    id: def.mapId,
    label: def.label,
    // topology.radius is the per-hex PIXEL radius (visualCellRadius), not the ring
    // count — the grid extent lives in `bounds`.
    topology: {
      kind: "hex",
      radius: def.cellPixelRadius ?? DEFAULT_AREA_CELL_PIXEL_RADIUS,
      bounds,
    },
    layers: [
      { id: `${def.mapId}.terrain`, kind: "terrain", label: "Terrain", zIndex: 0, cells },
      { id: `${def.mapId}.landmarks`, kind: "objects", label: "Landmarks", zIndex: 30, cells: [] },
    ],
    entities,
    zones: [],
    interactions: [],
    metadata: {
      source: "add-area",
      mapMode: "area_hex",
      fixture: false,
      areaId: def.id,
      entrySide: options.entrySide ?? "center",
      entryCoord: `${entryCoord.q},${entryCoord.r}`,
      entryFacing: "down",
    },
  }
}
