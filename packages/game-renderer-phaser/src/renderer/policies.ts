import type {
  CellPresentationPolicy,
  CellVisualStyle,
  FogVisualStyle,
  GameCellPlacement,
  WorldInteractionPolicy,
} from "@aedventure/game-world"

export type {
  CellPresentationPolicy,
  CellVisualActivity,
  CellVisualMotif,
  CellVisualStyle,
  FogVisualStyle,
  FogVisualTreatment,
  TopologyNavigationInput,
  TopologyNavigationPolicy,
  WorldInteractionDetail,
  WorldInteractionPolicy,
} from "@aedventure/game-world"

export const DEFAULT_CELL_VISUAL_STYLE: CellVisualStyle = {
  fill: 0xdde7d0,
  stroke: 0xa9b1a2,
  alpha: 1,
  accent: 0x7cbf8c,
  highlight: 0xfff5d0,
  shadow: 0x1d2118,
  activity: "active",
  activityProgress: 1,
  motif: "none",
}

export const DEFAULT_FOG_VISUAL_STYLE: FogVisualStyle = {
  visible: false,
  fill: 0x000000,
  alpha: 0,
}

export const DEFAULT_CELL_PRESENTATION_POLICY: CellPresentationPolicy = {
  cellVisible: () => true,
  cellStyle: (cell) =>
    cell.blocked
      ? {
          ...DEFAULT_CELL_VISUAL_STYLE,
          fill: 0x8b6748,
          stroke: 0x59412f,
          alpha: 0.94,
          activity: "blocked",
          activityProgress: 1,
          motif: "blocked",
        }
      : DEFAULT_CELL_VISUAL_STYLE,
  fogStyle: () => DEFAULT_FOG_VISUAL_STYLE,
}

export const EMPTY_WORLD_INTERACTION_POLICY: WorldInteractionPolicy = {
  interactionForCell: () => null,
}
