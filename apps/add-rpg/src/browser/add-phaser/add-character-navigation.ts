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

/**
 * Which way a bare Up or Down arrow leans when the player has not said.
 *
 * Pointy-top has no neighbour directly above or below, so Up is a genuine
 * choice between north-west and north-east. Picking a fixed one sends half of
 * all players the way they did not mean, so it follows the last horizontal
 * move instead: go right, then press Up, and you continue up-and-right. It is
 * the reading of "up" that matches where the player was already heading.
 */
let lastHorizontalLean: "east" | "west" = "east"

export function rememberHorizontalLean(direction: AddCharacterMoveDirection): void {
  if (direction === "right" || direction === "north_east" || direction === "south_east") {
    lastHorizontalLean = "east"
  } else if (direction === "left" || direction === "north_west" || direction === "south_west") {
    lastHorizontalLean = "west"
  }
}

/** Exposed for tests; the lean is presentation state, not game state. */
export function resetHorizontalLean(): void {
  lastHorizontalLean = "east"
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
    // Pointy-top: left and right are exact neighbours, and the four diagonals
    // are reachable by holding a vertical arrow with a horizontal one.
    if (up && right) return rememberAnd("north_east")
    if (up && left) return rememberAnd("north_west")
    if (down && right) return rememberAnd("south_east")
    if (down && left) return rememberAnd("south_west")
    if (keys.has("north_east")) return rememberAnd("north_east")
    if (keys.has("south_west")) return rememberAnd("south_west")
    if (right) return rememberAnd("right")
    if (left) return rememberAnd("left")
    if (up) return lastHorizontalLean === "east" ? "north_east" : "north_west"
    if (down) return lastHorizontalLean === "east" ? "south_east" : "south_west"
    return null
  }

  if (up) return "up"
  if (right || keys.has("north_east")) return "right"
  if (down) return "down"
  if (left || keys.has("south_west")) return "left"
  return null
}

function rememberAnd(direction: AddCharacterMoveDirection): AddCharacterMoveDirection {
  rememberHorizontalLean(direction)
  return direction
}
