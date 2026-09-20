import type { CellCoord } from "@aedventure/game-topology"
import { addMapCoordKey, stateForCell } from "@aedventure/add-runtime-client"

import type {
  AddCharacterMoveDirection,
  AddCharacterMoveKey,
  AddTopologyKind,
  RenderContext,
} from "./types"

export const CHARACTER_MOVE_DIRECTIONS: ReadonlySet<AddCharacterMoveDirection> = new Set([
  "up",
  "right",
  "down",
  "left",
  "north_east",
  "north_west",
  "south_east",
  "south_west",
])

export function entryFacingForContext(context: RenderContext): AddCharacterMoveDirection | null {
  const value = context.map.metadata?.entryFacing
  return typeof value === "string" &&
    CHARACTER_MOVE_DIRECTIONS.has(value as AddCharacterMoveDirection)
    ? (value as AddCharacterMoveDirection)
    : null
}

export function initialCharacterCoord(context: RenderContext): CellCoord | null {
  const hero = context.map.entities.find((entity) => entity.kind === "hero" && entity.coord)
  if (
    hero?.coord &&
    hero.coord.kind === context.topologyKind &&
    context.terrainByCoord.has(addMapCoordKey(hero.coord))
  ) {
    return hero.coord
  }
  if (context.baseCoord && context.terrainByCoord.has(addMapCoordKey(context.baseCoord))) {
    return context.baseCoord
  }
  return (
    context.terrainCells.find((cell) => !cell.blocked && stateForCell(cell) !== "blocked")
      ?.coord ?? null
  )
}

export function coordsAreAdjacent(a: CellCoord, b: CellCoord, context: RenderContext): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === "hex" && b.kind === "hex" && context.hexTopology) {
    return context.hexTopology.distance(a, b) === 1
  }
  if (a.kind === "square" && b.kind === "square" && context.squareTopology) {
    return context.squareTopology.distance(a, b) === 1
  }
  return false
}

export function characterMoveKeyForKeyboardKey(key: string): AddCharacterMoveKey | null {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "up"
    case "ArrowRight":
    case "d":
    case "D":
      return "right"
    case "ArrowDown":
    case "s":
    case "S":
      return "down"
    case "ArrowLeft":
    case "a":
    case "A":
      return "left"
    case "e":
    case "E":
      return "north_east"
    case "q":
    case "Q":
      return "south_west"
    default:
      return null
  }
}

export function directionForCharacterKeys(
  keys: ReadonlySet<AddCharacterMoveKey>,
  topologyKind: AddTopologyKind,
): AddCharacterMoveDirection | null {
  const up = keys.has("up")
  const right = keys.has("right")
  const down = keys.has("down")
  const left = keys.has("left")

  if (topologyKind === "hex") {
    if (up && right) return "north_east"
    if (up && left) return "north_west"
    if (down && right) return "south_east"
    if (down && left) return "south_west"
    if (keys.has("north_east")) return "north_east"
    if (keys.has("south_west")) return "south_west"
    if (right) return "right"
    if (left) return "left"
    if (up) return "north_west"
    if (down) return "south_east"
    return null
  }

  if (up) return "up"
  if (right || keys.has("north_east")) return "right"
  if (down) return "down"
  if (left || keys.has("south_west")) return "left"
  return null
}
