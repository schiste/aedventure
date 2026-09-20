import type { CellCoord } from "@aedventure/game-topology"
import { coordInTopologyBounds, type GameCellPlacement } from "@aedventure/game-world"
import type {
  CellPresentationPolicy,
  CellVisualActivity,
  CellVisualMotif,
  CellVisualStyle,
  FogVisualStyle,
  TopologyNavigationInput,
  TopologyNavigationPolicy,
  WorldInteractionDetail,
  WorldInteractionPolicy,
} from "@aedventure/game-world"

import {
  addMapCoordKey,
  cellIsKnownForPresentation,
  dungeonLinksForCell,
  exposureRiskForCell,
  presentationVisibilityStateForCell,
  progressForCell,
  stateForCell,
  terrainForCell,
  tileInteractionDetailForCoord,
} from "./map-presentation"

export function createAddCellPresentationPolicy(): CellPresentationPolicy {
  return {
    cellVisible: cellIsKnownForPresentation,
    cellStyle: addCellVisualStyle,
    fogStyle: addFogVisualStyle,
  }
}

export function createAddWorldInteractionPolicy(): WorldInteractionPolicy {
  return {
    interactionForCell(coord, cell) {
      if (!cell) return null
      return addWorldInteractionForCell(coord, cell)
    },
  }
}

export function createAddTopologyNavigationPolicy(): TopologyNavigationPolicy {
  return {
    nextCoord: addNextCoord,
    canEnterCell: (cell) => !cell.blocked && stateForCell(cell) !== "blocked",
  }
}

export function addCellVisualStyle(cell: GameCellPlacement): CellVisualStyle {
  const terrain = terrainForCell(cell)
  const state = stateForCell(cell)
  const activity = activityForState(state)
  const activityProgress =
    state === "converting" ? progressForCell(cell) : activity === "inactive" ? 0 : 1
  const motif = motifForTerrain(terrain, state)
  if (terrain === "unknown") {
    return {
      fill: 0x74786e,
      stroke: 0x4d514a,
      alpha: 0.42,
      accent: 0xa5a88f,
      highlight: 0xc3c8a9,
      shadow: 0x1a1d17,
      activity,
      activityProgress,
      motif,
    }
  }
  if (state === "blocked") {
    if (terrain === "dungeon_wall") {
      return {
        fill: 0x4b453d,
        stroke: 0x2f2a25,
        alpha: 0.96,
        accent: 0x9a7651,
        highlight: 0x6b5f50,
        shadow: 0x17130f,
        activity,
        activityProgress,
        motif,
      }
    }
    if (terrain === "base_wall") {
      return {
        fill: 0x53605b,
        stroke: 0x33413d,
        alpha: 0.96,
        accent: 0x9bb7a4,
        highlight: 0x748177,
        shadow: 0x18211f,
        activity,
        activityProgress,
        motif,
      }
    }
    return {
      fill: 0x7b6048,
      stroke: 0x59412f,
      alpha: 0.94,
      accent: 0xb58a5c,
      highlight: 0xa18467,
      shadow: 0x25180f,
      activity,
      activityProgress,
      motif,
    }
  }

  const fill =
    terrain === "river"
      ? 0x8eb8c5
      : terrain === "scrub"
        ? 0xc3b886
        : terrain === "ridge"
          ? 0xb8ad94
          : terrain === "mountain"
            ? 0x967d63
            : terrain === "dungeon_floor"
              ? 0xa89b85
              : terrain === "base_floor"
                ? 0xb9c3b4
                : 0xdedbbf
  const accent =
    terrain === "river"
      ? 0x5fb9d0
      : terrain === "scrub"
        ? 0xa58d4b
        : terrain === "ridge"
          ? 0x8c7660
          : terrain === "mountain"
            ? 0xded7c4
            : terrain === "dungeon_floor"
              ? 0xc8b889
              : terrain === "base_floor"
                ? 0x78b89a
                : 0x7cbf8c

  return {
    fill,
    stroke:
      terrain === "dungeon_floor"
        ? 0x6f6252
        : terrain === "base_floor"
          ? 0x748177
          : state === "inactive"
            ? 0x8a8c78
            : 0x5e715f,
    alpha: state === "inactive" ? 0.58 : 0.95,
    accent,
    highlight: 0xfff5d0,
    shadow: 0x1d2118,
    activity,
    activityProgress,
    motif,
  }
}

function activityForState(state: ReturnType<typeof stateForCell>): CellVisualActivity {
  if (state === "blocked") return "blocked"
  if (state === "inactive") return "inactive"
  if (state === "converting") return "transitioning"
  return "active"
}

function motifForTerrain(
  terrain: ReturnType<typeof terrainForCell>,
  state: ReturnType<typeof stateForCell>,
): CellVisualMotif {
  if (terrain === "river") return "water"
  if (terrain === "scrub") return "vegetation"
  if (terrain === "ridge") return "ridge"
  if (terrain === "mountain") return "peak"
  if (terrain === "dungeon_wall" || terrain === "base_wall") return "wall"
  if (terrain === "dungeon_floor" || terrain === "base_floor") return "floor"
  return state === "blocked" ? "blocked" : "none"
}

export function addFogVisualStyle(cell: GameCellPlacement): FogVisualStyle {
  const visibility = presentationVisibilityStateForCell(cell)
  if (visibility === "visible") {
    return {
      visible: false,
      fill: 0x000000,
      alpha: 0,
      treatment: "none",
      state: visibility,
    }
  }
  if (visibility === "hidden") {
    return {
      visible: false,
      fill: 0x101417,
      alpha: 0.82,
      feather: 0.22,
      treatment: "concealed",
      state: visibility,
    }
  }
  return {
    visible: true,
    fill: visibility === "stale" ? 0x1f2630 : 0x1b211f,
    alpha: visibility === "stale" ? 0.42 : 0.30,
    feather: 0.16,
    treatment: "remembered",
    state: visibility,
  }
}

export function addWorldInteractionForCell(
  coord: CellCoord,
  cell: GameCellPlacement,
): WorldInteractionDetail | null {
  const detail = tileInteractionDetailForCoord(
    coord,
    new Map([[addMapCoordKey(coord), cell]]),
  )
  if (!detail) return null

  return {
    id: `cell:${detail.cell}`,
    label: detail.label,
    prompt: detail.travelCopy,
    action: detail.dungeonActionsVisible ? "enter_linked_cell" : "inspect_cell",
    enabled: true,
    metadata: {
      visibility: detail.visibility,
      knownInfoLevel: detail.knownInfoLevel,
      terrain: detail.terrain,
      state: detail.state,
      exposureRisk: detail.exposureRisk,
      dungeonActionsVisible: detail.dungeonActionsVisible,
      dungeonLinkCount: detail.dungeonLinks.length,
      visibleDungeonLinkCount: dungeonLinksForCell(cell).length,
      currentExposureRisk: exposureRiskForCell(cell),
    },
  }
}

function addNextCoord(
  coord: CellCoord,
  input: TopologyNavigationInput,
  topology: Parameters<TopologyNavigationPolicy["nextCoord"]>[2],
): CellCoord | null {
  if (coord.kind !== topology.kind) return null
  const direction = input.direction
  const next =
    coord.kind === "square"
      ? addSquareNextCoord(coord, direction)
      : addHexNextCoord(coord, direction)
  return next && coordInTopologyBounds(next, topology) ? next : null
}

function addSquareNextCoord(coord: Extract<CellCoord, { kind: "square" }>, direction: string) {
  if (direction === "up" || direction === "north_west") {
    return { kind: "square" as const, x: coord.x, y: coord.y - 1 }
  }
  if (direction === "right" || direction === "north_east") {
    return { kind: "square" as const, x: coord.x + 1, y: coord.y }
  }
  if (direction === "down" || direction === "south_east") {
    return { kind: "square" as const, x: coord.x, y: coord.y + 1 }
  }
  if (direction === "left" || direction === "south_west") {
    return { kind: "square" as const, x: coord.x - 1, y: coord.y }
  }
  return null
}

function addHexNextCoord(coord: Extract<CellCoord, { kind: "hex" }>, direction: string) {
  if (direction === "up" || direction === "north_west") {
    return { kind: "hex" as const, q: coord.q, r: coord.r - 1 }
  }
  if (direction === "north_east") {
    return { kind: "hex" as const, q: coord.q + 1, r: coord.r - 1 }
  }
  if (direction === "right") {
    return { kind: "hex" as const, q: coord.q + 1, r: coord.r }
  }
  if (direction === "down" || direction === "south_east") {
    return { kind: "hex" as const, q: coord.q, r: coord.r + 1 }
  }
  if (direction === "south_west") {
    return { kind: "hex" as const, q: coord.q - 1, r: coord.r + 1 }
  }
  if (direction === "left") {
    return { kind: "hex" as const, q: coord.q - 1, r: coord.r }
  }
  return null
}
