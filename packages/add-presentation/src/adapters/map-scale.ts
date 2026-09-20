import type { AddMapMode } from "./map-modes"

export type AddMapTravelScale = "strategic" | "local" | "interior"

export interface AddMapScaleSummary {
  readonly topology: "hex" | "square" | "unknown"
  readonly travelScale: AddMapTravelScale
  readonly cellSizePx: number | null
  readonly timePerCellSeconds: number | null
  /** Real-world distance one cell spans, in metres. Powers the on-screen scale
   * bar. Overworld is anchored to its 1-hex-per-game-hour rule. */
  readonly metersPerCell: number | null
  readonly preserveAspectRatio: true
  readonly movementRule: string
}

export function selectAddMapScaleForMode(mode: AddMapMode): AddMapScaleSummary {
  switch (mode) {
    case "overworld_hex":
      return {
        topology: "hex",
        travelScale: "strategic",
        cellSizePx: 56,
        timePerCellSeconds: 3600,
        metersPerCell: 3000,
        preserveAspectRatio: true,
        movementRule: "one_overworld_hex_crossing_costs_one_game_hour",
      }
    case "base_square":
      return {
        topology: "square",
        travelScale: "interior",
        cellSizePx: 34,
        timePerCellSeconds: null,
        metersPerCell: 1,
        preserveAspectRatio: true,
        movementRule: "base_submap_cells_do_not_use_the_overworld_one_hour_rule",
      }
    case "dungeon_square":
      return {
        topology: "square",
        travelScale: "local",
        cellSizePx: 34,
        timePerCellSeconds: null,
        metersPerCell: 1,
        preserveAspectRatio: true,
        movementRule: "dungeon_submap_cells_use_local_exploration_timing_later",
      }
    case "area_hex":
      return {
        topology: "hex",
        travelScale: "local",
        cellSizePx: 48,
        timePerCellSeconds: null,
        metersPerCell: 300,
        preserveAspectRatio: true,
        movementRule: "area_submap_hex_cells_use_local_exploration_timing",
      }
  }
}
