import type { CellCoord } from "@aedventure/game-topology"

import type {
  GameCellPlacement,
  GameMetadata,
  GameTopologyReference,
} from "./index"

export interface CellVisualStyle {
  readonly fill: number
  readonly stroke: number
  readonly alpha: number
  readonly accent: number
  readonly highlight: number
  readonly shadow: number
  readonly activity: CellVisualActivity
  readonly activityProgress: number
  readonly motif: CellVisualMotif
}

export type CellVisualActivity = "inactive" | "active" | "transitioning" | "blocked"
export type CellVisualMotif =
  | "none"
  | "water"
  | "vegetation"
  | "ridge"
  | "peak"
  | "floor"
  | "wall"
  | "blocked"

export interface FogVisualStyle {
  readonly visible: boolean
  readonly fill: number
  readonly alpha: number
  readonly feather?: number
  readonly treatment?: FogVisualTreatment
  readonly state?: string
}

export type FogVisualTreatment = "none" | "concealed" | "remembered"

export interface CellPresentationPolicy {
  cellVisible(cell: GameCellPlacement): boolean
  cellStyle(cell: GameCellPlacement): CellVisualStyle
  fogStyle(cell: GameCellPlacement): FogVisualStyle
}

export interface WorldInteractionDetail {
  readonly id: string
  readonly label: string
  readonly prompt?: string
  readonly action?: string
  readonly enabled: boolean
  readonly metadata?: GameMetadata
}

export interface WorldInteractionPolicy {
  interactionForCell(
    coord: CellCoord,
    cell: GameCellPlacement | undefined,
  ): WorldInteractionDetail | null
}

export interface TopologyNavigationInput {
  readonly direction: string
  readonly vector?: {
    readonly x: number
    readonly y: number
  }
  readonly mode?: string
}

export interface TopologyNavigationPolicy {
  nextCoord(
    coord: CellCoord,
    input: TopologyNavigationInput,
    topology: GameTopologyReference,
  ): CellCoord | null
  canEnterCell(cell: GameCellPlacement): boolean
}
