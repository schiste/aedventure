import {
  createHexTopology,
  createSquareTopology,
  type CellCoord,
  type GridTopology,
  type HexCoord,
  type SquareCoord,
  type Vector2,
} from "@aedventure/game-topology"
import type { GameCellPlacement, GameMap } from "@aedventure/game-world"
import {
  addMapCoordKey,
  featureForCell,
  isBaseFeature,
  numberMetadata,
  stateForCell,
} from "@aedventure/add-domain"

import { DEFAULT_RADIUS, type RenderContext, type StateCounts } from "./types"

export function createRenderContext(map: GameMap, width: number, height: number): RenderContext {
  const terrainCells = terrainCellsFor(map)
  const hexTopology =
    map.topology.kind === "hex"
      ? createHexTopology({
          radius: map.topology.radius,
          bounds: map.topology.bounds,
        })
      : null
  const squareTopology =
    map.topology.kind === "square"
      ? createSquareTopology({
          cellSize: map.topology.cellSize,
          bounds: map.topology.bounds,
          neighborMode: map.topology.neighborMode,
          distanceMetric: map.topology.distanceMetric,
        })
      : null
  const origin = originForCells(terrainCells, map, hexTopology, squareTopology, width, height)
  const terrainByCoord = new Map(
    terrainCells.map((cell) => [addMapCoordKey(cell.coord), cell]),
  )
  const stateCounts = countStates(terrainCells)
  const bubbleEdgeCoords = new Set(
    terrainCells
      .filter((cell) => cell.coord.kind === "hex" && isBubbleEdgeCell(cell, map))
      .map((cell) => addMapCoordKey(cell.coord)),
  )
  const baseCell = terrainCells.find((cell) => isBaseFeature(featureForCell(cell)))
  const caveCell = terrainCells.find((cell) => featureForCell(cell) === "survivor_cave")
  const baseCoord = baseCell?.coord ?? zoneCoord(map, "add.zone.base", "base")
  const survivorCaveCoord =
    caveCell?.coord ?? zoneCoord(map, "add.zone.survivor_cave", "survivor_cave")

  return {
    map,
    topologyKind: map.topology.kind,
    hexTopology,
    squareTopology,
    origin,
    terrainCells,
    terrainByCoord,
    stateCounts,
    bubbleEdgeCoords,
    baseCoord,
    survivorCaveCoord,
  }
}

function terrainCellsFor(map: GameMap): readonly GameCellPlacement[] {
  return map.layers.find((layer) => layer.kind === "terrain")?.cells ?? []
}

function zoneCoord(map: GameMap, id: string, kind: string): CellCoord | null {
  const zone = map.zones.find((candidate) => candidate.id === id || candidate.kind === kind)
  return zone?.cells.find((coord) => coord.kind === map.topology.kind) ?? null
}

function originForCells(
  cells: readonly GameCellPlacement[],
  map: GameMap,
  hexTopology: GridTopology<HexCoord> | null,
  squareTopology: GridTopology<SquareCoord> | null,
  width: number,
  height: number,
): Vector2 {
  const baseCell = cells.find((cell) => isBaseFeature(featureForCell(cell)))
  if (baseCell?.coord.kind === "hex" && hexTopology) {
    const point = hexTopology.cellToWorld(baseCell.coord)
    return {
      x: width / 2 - point.x,
      y: height / 2 - point.y,
    }
  }
  if (baseCell?.coord.kind === "square" && squareTopology) {
    const point = squareTopology.cellToWorld(baseCell.coord)
    const offset = map.topology.kind === "square" ? map.topology.cellSize / 2 : 0
    return {
      x: width / 2 - point.x - offset,
      y: height / 2 - point.y - offset,
    }
  }

  const centers = cells
    .filter((cell) => cell.coord.kind === map.topology.kind)
    .map((cell) => {
      if (cell.coord.kind === "hex" && hexTopology) return hexTopology.cellToWorld(cell.coord)
      if (cell.coord.kind === "square" && squareTopology) {
        const topLeft = squareTopology.cellToWorld(cell.coord)
        const offset = map.topology.kind === "square" ? map.topology.cellSize / 2 : 0
        return {
          x: topLeft.x + offset,
          y: topLeft.y + offset,
        }
      }
      return { x: 0, y: 0 }
    })
  if (centers.length === 0) return { x: width / 2, y: height / 2 }

  const minX = Math.min(...centers.map((point) => point.x))
  const maxX = Math.max(...centers.map((point) => point.x))
  const minY = Math.min(...centers.map((point) => point.y))
  const maxY = Math.max(...centers.map((point) => point.y))
  return {
    x: width / 2 - (minX + maxX) / 2,
    y: height / 2 - (minY + maxY) / 2,
  }
}

function countStates(cells: readonly GameCellPlacement[]): StateCounts {
  return cells.reduce<StateCounts>(
    (counts, cell) => {
      const state = stateForCell(cell)
      return {
        inactive: counts.inactive + (state === "inactive" ? 1 : 0),
        converting: counts.converting + (state === "converting" ? 1 : 0),
        stabilized: counts.stabilized + (state === "stabilized" ? 1 : 0),
        blocked: counts.blocked + (state === "blocked" ? 1 : 0),
      }
    },
    { inactive: 0, converting: 0, stabilized: 0, blocked: 0 },
  )
}

function isBubbleEdgeCell(cell: GameCellPlacement, map: GameMap): boolean {
  const state = stateForCell(cell)
  const distance = numberMetadata(cell, "distance")
  const stabilizedRing = numberMetadata(map, "stabilizedRing")
  if (distance === undefined || stabilizedRing === undefined) return false
  return (
    (state === "stabilized" && distance === stabilizedRing) ||
    (state === "converting" && distance === stabilizedRing + 1)
  )
}

export function visualCellRadius(context: RenderContext): number {
  if (context.map.topology.kind === "hex") return context.map.topology.radius
  if (context.map.topology.kind === "square") return context.map.topology.cellSize / 2
  return DEFAULT_RADIUS
}

export function centerFor(coord: CellCoord, context: RenderContext): Vector2 {
  if (coord.kind === "square") {
    const topLeft = squareTopLeftFor(coord, context)
    const offset = squareCellSize(context) / 2
    return {
      x: topLeft.x + offset,
      y: topLeft.y + offset,
    }
  }

  if (!context.hexTopology) return context.origin
  const point = context.hexTopology.cellToWorld(coord)
  return {
    x: point.x + context.origin.x,
    y: point.y + context.origin.y,
  }
}

export function squareTopLeftFor(coord: SquareCoord, context: RenderContext): Vector2 {
  if (!context.squareTopology) return context.origin
  const point = context.squareTopology.cellToWorld(coord)
  return {
    x: point.x + context.origin.x,
    y: point.y + context.origin.y,
  }
}

export function squareCellSize(context: RenderContext): number {
  return context.map.topology.kind === "square" ? context.map.topology.cellSize : 32
}

export function distanceBetween(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function sameCoord(a: CellCoord | null, b: CellCoord | null): boolean {
  if (!a || !b || a.kind !== b.kind) return a === b
  return a.kind === "hex" && b.kind === "hex"
    ? a.q === b.q && a.r === b.r
    : a.kind === "square" && b.kind === "square" && a.x === b.x && a.y === b.y
}

export function round(value: number): number {
  return Math.round(value * 100) / 100
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function smoothStep(value: number): number {
  const clamped = clamp(value, 0, 1)
  return clamped * clamped * (3 - 2 * clamped)
}
