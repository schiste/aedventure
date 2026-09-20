import type { CellCoord } from "@aedventure/game-topology"
import type { GameCellPlacement, GameEntity, GameMap, GameMetadata } from "@aedventure/game-world"

// Generalizes the door-key pattern (see dungeon-doors.ts) to any "resolved"
// location: a looted container or a cleared creature. The authoritative set
// `clearedLocations` (snapshot), keyed `${mapId}:${x}:${y}`, is overlaid onto the
// compiled dungeon map: cleared interactive cells lose their loot + become a
// looted/corpse marker (so they stop being bump targets), and the matching
// creature/container entities are dropped so they stop rendering.

const CLEARABLE_FEATURES = new Set(["creature", "container"])
const CLEARABLE_ENTITY_KINDS = new Set(["creature", "container"])

/** Stable identity for an interactive cell: `${mapId}:${x}:${y}`. */
export function dungeonLocationKey(mapId: string, coord: CellCoord): string {
  return coord.kind === "square"
    ? `${mapId}:${coord.x}:${coord.y}`
    : `${mapId}:${coord.q}:${coord.r}`
}

function clearableFeature(cell: GameCellPlacement): string | null {
  const feature = cell.metadata?.feature
  return typeof feature === "string" && CLEARABLE_FEATURES.has(feature) ? feature : null
}

/**
 * Overlay authoritative cleared-location state onto a compiled dungeon map.
 * Returns a new map (cloned only where it changes). Run beside
 * `applyDungeonDoorStates` when building the dungeon map for render.
 */
export function applyClearedLocations(
  map: GameMap,
  mapId: string,
  clearedKeys: ReadonlySet<string>,
): GameMap {
  if (clearedKeys.size === 0) return map

  let layersChanged = false
  const layers = map.layers.map((layer) => {
    if (!layer.cells) return layer
    let changed = false
    const cells = layer.cells.map((cell) => {
      const feature = clearableFeature(cell)
      if (!feature || !clearedKeys.has(dungeonLocationKey(mapId, cell.coord))) return cell
      changed = true
      layersChanged = true
      return clearedCell(cell, feature)
    })
    return changed ? { ...layer, cells } : layer
  })

  const entities = map.entities.filter((entity) => !isClearedEntity(entity, mapId, clearedKeys))
  const entitiesChanged = entities.length !== map.entities.length
  if (!layersChanged && !entitiesChanged) return map
  return {
    ...map,
    layers: layersChanged ? layers : map.layers,
    entities: entitiesChanged ? entities : map.entities,
  }
}

function clearedCell(cell: GameCellPlacement, feature: string): GameCellPlacement {
  const { lootItem: _lootItem, lootQty: _lootQty, ...rest } = cell.metadata ?? {}
  const metadata: GameMetadata = {
    ...rest,
    feature: feature === "container" ? "container_looted" : "corpse",
    cleared: true,
  }
  return { ...cell, metadata }
}

function isClearedEntity(
  entity: GameEntity,
  mapId: string,
  clearedKeys: ReadonlySet<string>,
): boolean {
  if (!entity.coord || !CLEARABLE_ENTITY_KINDS.has(entity.kind)) return false
  return clearedKeys.has(dungeonLocationKey(mapId, entity.coord))
}

/** Parse the `${id}:${x}:${y}` suffix of a location key into a square coord for
 * keys belonging to `id` (the `${q}:${r}` hex form is not used in dungeons). */
function parseSquareLocationKey(id: string, key: string): { x: number; y: number } | null {
  const prefix = `${id}:`
  if (!key.startsWith(prefix)) return null
  const parts = key.slice(prefix.length).split(":")
  if (parts.length !== 2) return null
  const x = Number(parts[0])
  const y = Number(parts[1])
  return Number.isInteger(x) && Number.isInteger(y) ? { x, y } : null
}

/**
 * Overlay dropped-item piles onto a compiled dungeon map. Unlike the cleared
 * overlay (which transforms authored cells), this INJECTS state: each location
 * with a non-empty pile gets its cell retagged `dropped_items` (a bump-to-pickup
 * target) and a `loot` entity appended so it renders (via drawLandmark).
 */
export function applyDroppedItems(
  map: GameMap,
  mapId: string,
  dropped: Readonly<Record<string, Readonly<Record<string, number>>>>,
): GameMap {
  const piles = new Map<string, { x: number; y: number; count: number }>()
  for (const [key, items] of Object.entries(dropped)) {
    const coord = parseSquareLocationKey(mapId, key)
    if (!coord) continue
    const count = Object.values(items).reduce((sum, qty) => sum + qty, 0)
    if (count > 0) piles.set(`${coord.x}:${coord.y}`, { ...coord, count })
  }
  if (piles.size === 0) return map

  let layersChanged = false
  const layers = map.layers.map((layer) => {
    if (!layer.cells) return layer
    let changed = false
    const cells = layer.cells.map((cell) => {
      if (cell.coord.kind !== "square") return cell
      const pile = piles.get(`${cell.coord.x}:${cell.coord.y}`)
      if (!pile) return cell
      changed = true
      layersChanged = true
      const metadata: GameMetadata = {
        ...(cell.metadata ?? {}),
        feature: "dropped_items",
        droppedCount: pile.count,
      }
      return { ...cell, metadata }
    })
    return changed ? { ...layer, cells } : layer
  })

  const loot: GameEntity[] = [...piles.values()].map((pile) => ({
    id: `${mapId}.dropped.${pile.x}.${pile.y}`,
    kind: "loot",
    label: pile.count === 1 ? "Dropped item" : `Dropped items (${pile.count})`,
    coord: { kind: "square", x: pile.x, y: pile.y },
    visualFootprint: { unit: "cell", width: 0.45, height: 0.45 },
  }))

  return {
    ...map,
    layers: layersChanged ? layers : map.layers,
    entities: [...map.entities, ...loot],
  }
}
