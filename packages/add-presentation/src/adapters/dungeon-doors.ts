import type { CellCoord } from "@aedventure/game-topology"
import type { GameCellPlacement, GameMap, GameMetadata } from "@aedventure/game-world"

// Doors are authored in a blueprint with `metadata.door === true` (a passable
// floor cell). Their open/closed state is authoritative game state (the Rust
// snapshot's `openDoors`), applied here onto the compiled map: a closed door is
// `blocked` (which gates BOTH movement and the FOV cone, since opacity == blocked)
// and a stale/`door_closed` feature; an open door is passable and `door_open`.

/** Stable identity for a door cell: `${dungeonId}:${x}:${y}`. */
export function dungeonDoorKey(dungeonId: string, coord: CellCoord): string {
  return coord.kind === "square"
    ? `${dungeonId}:${coord.x}:${coord.y}`
    : `${dungeonId}:${coord.q}:${coord.r}`
}

/** True when a compiled cell was authored as a door. */
export function isDoorCell(cell: GameCellPlacement): boolean {
  return cell.metadata?.door === true
}

/**
 * Overlay authoritative door open/closed state onto a compiled dungeon map.
 * Returns a new map (cells cloned only where they change) with each door cell's
 * `blocked` + `metadata.doorOpen`/`feature` reflecting `openKeys`. Runs BEFORE
 * the FOV pass so the cone sees the updated opacity.
 */
export function applyDungeonDoorStates(
  map: GameMap,
  dungeonId: string,
  openKeys: ReadonlySet<string>,
): GameMap {
  let changed = false
  const layers = map.layers.map((layer) => {
    if (!layer.cells) return layer
    let layerChanged = false
    const cells = layer.cells.map((cell) => {
      if (!isDoorCell(cell)) return cell
      layerChanged = true
      changed = true
      return withDoorState(cell, openKeys.has(dungeonDoorKey(dungeonId, cell.coord)))
    })
    return layerChanged ? { ...layer, cells } : layer
  })
  return changed ? { ...map, layers } : map
}

function withDoorState(cell: GameCellPlacement, open: boolean): GameCellPlacement {
  const metadata: GameMetadata = {
    ...(cell.metadata ?? {}),
    doorOpen: open,
    feature: open ? "door_open" : "door_closed",
  }
  return { ...cell, blocked: !open, metadata }
}
