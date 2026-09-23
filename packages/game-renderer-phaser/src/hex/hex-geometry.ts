import type {
  GridTopology,
  HexCoord,
  Vector2 as TopologyVector2,
} from "@aedventure/game-topology"

export function hexCellCenter(
  coord: HexCoord,
  topology: GridTopology<HexCoord>,
  origin: TopologyVector2 = { x: 0, y: 0 },
): TopologyVector2 {
  const projected = topology.cellToWorld(coord)
  return {
    x: origin.x + projected.x,
    y: origin.y + projected.y,
  }
}

export function hexCellPolygonPoints(
  center: TopologyVector2,
  radius: number,
): readonly TopologyVector2[] {
  // Pointy-top: the 30 degree offset puts vertices at the top and bottom and
  // leaves a flat, vertical edge on the left and right of every cell. The
  // layout in `hexToWorld` assumes the same orientation; changing one without
  // the other tiles cells that no longer touch.
  return Array.from({ length: 6 }, (_, side) => {
    const angle = ((60 * side + 30) * Math.PI) / 180
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    }
  })
}
