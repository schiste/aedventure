import type { AddCharacterMoveDirection } from "./add-phaser/types"

/**
 * Parsing and geometry for the app's display-cell strings.
 *
 * These lived in `main.ts`, which is 8,659 lines and reads fifty-odd signals.
 * They are pure functions of their arguments -- no signal, no DOM, no clock --
 * so they could have been tested without a browser, and were not. Moving them
 * here is the one part of the `main.ts` decomposition that needs no plumbing:
 * everything that reads app state stays where it is, and the arithmetic leaves.
 *
 * A display cell is `hex:q,r` or `square:x,y`, and it is the only wire format
 * between the map telemetry, the selectors and the DOM. The parser is therefore
 * the boundary where a malformed string becomes `null` rather than a NaN
 * coordinate that quietly sorts to the wrong place.
 */

export interface ParsedDisplayCell {
  readonly kind: "hex" | "square"
  readonly a: number
  readonly b: number
}

/**
 * Read a `hex:q,r` or `square:x,y` cell.
 *
 * Returns `null` for anything else, including `null`, an empty string, a
 * malformed pair, and a cell of a different kind than the caller expected. The
 * strict `^(hex|square):(-?\d+),(-?\d+)$` is deliberate: a loose parse would
 * turn `"hex:abc"` into NaN coordinates, and NaN compares false against
 * everything, so it would flow silently into a direction or a distance.
 */
export function parseAddDisplayCell(cell: string | null): ParsedDisplayCell | null {
  if (!cell) return null
  const match = /^(hex|square):(-?\d+),(-?\d+)$/.exec(cell)
  if (!match) return null
  return {
    kind: match[1] as "hex" | "square",
    a: Number(match[2]),
    b: Number(match[3]),
  }
}

/**
 * Hex distance between two cells, in hexes.
 *
 * The same cube-distance formula as `topology::axial_distance` on the Rust side.
 * It is duplicated rather than shared because the browser needs it per frame to
 * pick the next step toward a target, and a call across the WASM boundary per
 * frame to save one subtraction is not a trade worth making. The Rust unit test
 * `axial_distance_does_not_overflow_at_the_extremes_of_i8` covers the overflow
 * case; this takes plain numbers, so it cannot overflow.
 */
export function hexRouteDistance(
  from: { readonly a: number; readonly b: number },
  to: { readonly a: number; readonly b: number },
): number {
  const dq = from.a - to.a
  const dr = from.b - to.b
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

/**
 * The one adjacent step from `fromCell` toward `toCell`, or `null`.
 *
 * Returns `null` unless the cells are adjacent, so a caller cannot use this to
 * jump: a destination two hexes away has no direction, which is the same rule
 * the engine now enforces in `move_hero_to`. Square grids have four neighbours
 * and hex grids six, so the two are separate tables rather than one with the
 * diagonals filtered out.
 */
export function directionBetweenAddCells(
  fromCell: string | null,
  toCell: string | null,
): AddCharacterMoveDirection | null {
  const from = parseAddDisplayCell(fromCell)
  const to = parseAddDisplayCell(toCell)
  if (!from || !to || from.kind !== to.kind) return null

  const dx = to.a - from.a
  const dy = to.b - from.b
  if (from.kind === "square") {
    if (dx === 0 && dy === -1) return "up"
    if (dx === 1 && dy === 0) return "right"
    if (dx === 0 && dy === 1) return "down"
    if (dx === -1 && dy === 0) return "left"
    return null
  }

  if (dx === 0 && dy === -1) return "north_west"
  if (dx === 1 && dy === -1) return "north_east"
  if (dx === 1 && dy === 0) return "right"
  if (dx === 0 && dy === 1) return "south_east"
  if (dx === -1 && dy === 1) return "south_west"
  if (dx === -1 && dy === 0) return "left"
  return null
}

/**
 * The next hex on the shortest route from `from` toward `to`.
 *
 * Picks the neighbour whose distance to the target is smallest, which is the
 * standard greedy step. It is only optimal for a straight line, and for anything
 * else it still makes progress and never backtracks, which is all the caller
 * needs -- it re-asks every step.
 */
export function nextHexToward(
  from: { readonly a: number; readonly b: number },
  to: { readonly a: number; readonly b: number },
): { readonly a: number; readonly b: number } | null {
  const neighbors = [
    { a: from.a, b: from.b - 1 },
    { a: from.a + 1, b: from.b - 1 },
    { a: from.a + 1, b: from.b },
    { a: from.a, b: from.b + 1 },
    { a: from.a - 1, b: from.b + 1 },
    { a: from.a - 1, b: from.b },
  ]
  let best: { a: number; b: number; distance: number } | null = null
  for (const cell of neighbors) {
    const distance = hexRouteDistance(cell, to)
    if (!best || distance < best.distance) best = { ...cell, distance }
  }
  return best ? { a: best.a, b: best.b } : null
}
