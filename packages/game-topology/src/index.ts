export interface Vector2 {
  readonly x: number
  readonly y: number
}

export interface Rectangle {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface SquareCoord {
  readonly kind: "square"
  readonly x: number
  readonly y: number
}

export interface HexCoord {
  readonly kind: "hex"
  readonly q: number
  readonly r: number
}

export type CellCoord = SquareCoord | HexCoord

export interface GridTopology<TCoord extends CellCoord> {
  readonly kind: TCoord["kind"]
  cellToWorld(coord: TCoord): Vector2
  worldToCell(point: Vector2): TCoord | null
  neighbors(coord: TCoord): readonly TCoord[]
  distance(a: TCoord, b: TCoord): number
  inBounds(coord: TCoord): boolean
  serialize(coord: TCoord): string
}

export type SquareNeighborMode = "cardinal" | "diagonal"
export type SquareDistanceMetric = "manhattan" | "chebyshev"

export interface SquareGridBounds {
  readonly width: number
  readonly height: number
}

export interface SquareTopologyOptions {
  readonly cellSize: number
  readonly origin?: Vector2
  readonly bounds?: SquareGridBounds
  readonly neighborMode?: SquareNeighborMode
  readonly distanceMetric?: SquareDistanceMetric
}

export interface HexGridBounds {
  readonly qMin: number
  readonly qMax: number
  readonly rMin: number
  readonly rMax: number
  readonly radius?: number
}

export interface HexTopologyOptions {
  readonly radius: number
  readonly origin?: Vector2
  readonly bounds?: HexGridBounds
}

export function createSquareCoord(x: number, y: number): SquareCoord {
  return { kind: "square", x, y }
}

export function createHexCoord(q: number, r: number): HexCoord {
  return { kind: "hex", q, r }
}

export function createSquareTopology(
  options: SquareTopologyOptions,
): GridTopology<SquareCoord> {
  const origin = options.origin ?? { x: 0, y: 0 }
  const neighborMode = options.neighborMode ?? "cardinal"
  const distanceMetric =
    options.distanceMetric ?? (neighborMode === "diagonal" ? "chebyshev" : "manhattan")

  return {
    kind: "square",
    cellToWorld(coord) {
      return {
        x: origin.x + coord.x * options.cellSize,
        y: origin.y + coord.y * options.cellSize,
      }
    },
    worldToCell(point) {
      const coord = createSquareCoord(
        Math.floor((point.x - origin.x) / options.cellSize),
        Math.floor((point.y - origin.y) / options.cellSize),
      )
      return squareCoordInBounds(coord, options.bounds) ? coord : null
    },
    neighbors(coord) {
      return squareNeighbors(coord, neighborMode).filter((neighbor) =>
        squareCoordInBounds(neighbor, options.bounds),
      )
    },
    distance(a, b) {
      return squareDistance(a, b, distanceMetric)
    },
    inBounds(coord) {
      return squareCoordInBounds(coord, options.bounds)
    },
    serialize(coord) {
      return serializeCellCoord(coord)
    },
  }
}

export function createHexTopology(
  options: HexTopologyOptions,
): GridTopology<HexCoord> {
  const origin = options.origin ?? { x: 0, y: 0 }

  return {
    kind: "hex",
    cellToWorld(coord) {
      const projected = hexToWorld(coord, options.radius)
      return {
        x: origin.x + projected.x,
        y: origin.y + projected.y,
      }
    },
    worldToCell(point) {
      const coord = worldToHex(
        { x: point.x - origin.x, y: point.y - origin.y },
        options.radius,
      )
      return hexCoordInBounds(coord, options.bounds) ? coord : null
    },
    neighbors(coord) {
      return hexNeighbors(coord).filter((neighbor) =>
        hexCoordInBounds(neighbor, options.bounds),
      )
    },
    distance(a, b) {
      return hexDistance(a, b)
    },
    inBounds(coord) {
      return hexCoordInBounds(coord, options.bounds)
    },
    serialize(coord) {
      return serializeCellCoord(coord)
    },
  }
}

export function squareNeighbors(
  coord: SquareCoord,
  mode: SquareNeighborMode = "cardinal",
): readonly SquareCoord[] {
  const cardinal = [
    createSquareCoord(coord.x, coord.y - 1),
    createSquareCoord(coord.x + 1, coord.y),
    createSquareCoord(coord.x, coord.y + 1),
    createSquareCoord(coord.x - 1, coord.y),
  ]

  if (mode === "cardinal") return cardinal

  return [
    ...cardinal,
    createSquareCoord(coord.x + 1, coord.y - 1),
    createSquareCoord(coord.x + 1, coord.y + 1),
    createSquareCoord(coord.x - 1, coord.y + 1),
    createSquareCoord(coord.x - 1, coord.y - 1),
  ]
}

export function squareDistance(
  a: SquareCoord,
  b: SquareCoord,
  metric: SquareDistanceMetric = "manhattan",
): number {
  const dx = Math.abs(a.x - b.x)
  const dy = Math.abs(a.y - b.y)
  return metric === "chebyshev" ? Math.max(dx, dy) : dx + dy
}

export function squareCoordInBounds(
  coord: SquareCoord,
  bounds?: SquareGridBounds,
): boolean {
  if (!Number.isInteger(coord.x) || !Number.isInteger(coord.y)) return false
  if (!bounds) return true
  return coord.x >= 0 && coord.y >= 0 && coord.x < bounds.width && coord.y < bounds.height
}

export function hexNeighbors(coord: HexCoord): readonly HexCoord[] {
  return [
    createHexCoord(coord.q + 1, coord.r),
    createHexCoord(coord.q + 1, coord.r - 1),
    createHexCoord(coord.q, coord.r - 1),
    createHexCoord(coord.q - 1, coord.r),
    createHexCoord(coord.q - 1, coord.r + 1),
    createHexCoord(coord.q, coord.r + 1),
  ]
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const aS = -a.q - a.r
  const bS = -b.q - b.r
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(aS - bS))
}

export function hexBoundsFromRadius(radius: number): HexGridBounds {
  return {
    qMin: -radius,
    qMax: radius,
    rMin: -radius,
    rMax: radius,
    radius,
  }
}

export function hexCoordInBounds(coord: HexCoord, bounds?: HexGridBounds): boolean {
  if (!Number.isInteger(coord.q) || !Number.isInteger(coord.r)) return false
  if (!bounds) return true
  return (
    coord.q >= bounds.qMin &&
    coord.q <= bounds.qMax &&
    coord.r >= bounds.rMin &&
    coord.r <= bounds.rMax &&
    (bounds.radius === undefined || hexCoordInRadius(coord, bounds.radius))
  )
}

export function hexCoordInRadius(coord: HexCoord, radius: number): boolean {
  return hexDistance(createHexCoord(0, 0), coord) <= radius
}

export function hexToWorld(coord: HexCoord, radius: number): Vector2 {
  return {
    x: radius * 1.5 * coord.q,
    y: radius * Math.sqrt(3) * (coord.r + coord.q / 2),
  }
}

export function worldToHex(point: Vector2, radius: number): HexCoord {
  const q = (2 / 3 * point.x) / radius
  const r = (-point.x / 3 + Math.sqrt(3) / 3 * point.y) / radius
  return roundAxial(q, r)
}

export function serializeCellCoord(coord: CellCoord): string {
  return coord.kind === "square"
    ? `square:${coord.x}:${coord.y}`
    : `hex:${coord.q}:${coord.r}`
}

export function parseCellCoord(serialized: string): CellCoord | null {
  const parts = serialized.split(":")
  if (parts.length !== 3) return null
  const first = Number(parts[1])
  const second = Number(parts[2])
  if (!Number.isInteger(first) || !Number.isInteger(second)) return null

  if (parts[0] === "square") return createSquareCoord(first, second)
  if (parts[0] === "hex") return createHexCoord(first, second)
  return null
}

export function cellCoordsEqual(a: CellCoord, b: CellCoord): boolean {
  if (a.kind !== b.kind) return false
  return a.kind === "square" && b.kind === "square"
    ? a.x === b.x && a.y === b.y
    : a.kind === "hex" && b.kind === "hex" && a.q === b.q && a.r === b.r
}

function roundAxial(q: number, r: number): HexCoord {
  let roundedQ = Math.round(q)
  let roundedR = Math.round(r)
  let roundedS = Math.round(-q - r)

  const qDiff = Math.abs(roundedQ - q)
  const rDiff = Math.abs(roundedR - r)
  const sDiff = Math.abs(roundedS - (-q - r))

  if (qDiff > rDiff && qDiff > sDiff) {
    roundedQ = -roundedR - roundedS
  } else if (rDiff > sDiff) {
    roundedR = -roundedQ - roundedS
  } else {
    roundedS = -roundedQ - roundedR
  }

  return createHexCoord(roundedQ, roundedR)
}

export const GAME_TOPOLOGY_PACKAGE = "@aedventure/game-topology"
