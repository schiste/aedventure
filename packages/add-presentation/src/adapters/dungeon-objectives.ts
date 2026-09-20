import type { AddMapMode } from "./map-modes"
import {
  addDungeonByMapId,
  SURVIVOR_CAVE_DUNGEON_MAP_ID,
} from "@aedventure/add-content"

export type AddDungeonObjectiveStepStatus = "active" | "next" | "complete"

export interface AddDungeonObjectiveStep {
  readonly id: string
  readonly label: string
  readonly detail: string
  readonly status: AddDungeonObjectiveStepStatus
}

export interface AddDungeonObjectiveSummary {
  readonly active: boolean
  readonly dungeonId: string
  readonly mapId: string
  readonly label: string
  readonly headline: string
  readonly detail: string
  readonly currentStepId: string
  readonly returnLabel: string
  readonly steps: readonly AddDungeonObjectiveStep[]
}

export interface AddDungeonObjectiveInput {
  readonly mapMode: AddMapMode
  readonly dungeonMapId: string | null
  readonly heroCell: string | null
}

export function selectAddDungeonObjective(
  input: AddDungeonObjectiveInput,
): AddDungeonObjectiveSummary | null {
  if (input.mapMode !== "dungeon_square" || !input.dungeonMapId) return null

  if (input.dungeonMapId === SURVIVOR_CAVE_DUNGEON_MAP_ID) {
    return survivorCaveObjective(input)
  }

  return genericDungeonObjective(input)
}

function survivorCaveObjective(input: AddDungeonObjectiveInput): AddDungeonObjectiveSummary {
  const hasLeftEntrance = input.heroCell !== null && input.heroCell !== "square:2,4"
  const currentStepId = hasLeftEntrance ? "read-cave-signs" : "survey-cave-mouth"
  return {
    active: true,
    dungeonId: "dungeon.survivor_cave",
    mapId: SURVIVOR_CAVE_DUNGEON_MAP_ID,
    label: "Survivor Cave",
    headline: "Survey the first safe threshold",
    detail:
      "This cave is the first interior space. Get your bearings, read the entrance, then return to the overworld before pushing deeper.",
    currentStepId,
    returnLabel: "Return to overworld",
    steps: [
      {
        id: "survey-cave-mouth",
        label: "Stand at the cave mouth",
        detail: "Confirm the Hero entered from the Survivor Cave landmark.",
        status: hasLeftEntrance ? "complete" : "active",
      },
      {
        id: "read-cave-signs",
        label: "Read the interior",
        detail: "Use the dungeon view to inspect walls, doors, and future encounter space.",
        status: hasLeftEntrance ? "active" : "next",
      },
      {
        id: "return-overworld",
        label: "Return outside",
        detail: "Go back to the overworld with the same runtime state intact.",
        status: "next",
      },
    ],
  }
}

function genericDungeonObjective(input: AddDungeonObjectiveInput): AddDungeonObjectiveSummary {
  const dungeon = input.dungeonMapId ? addDungeonByMapId(input.dungeonMapId) : undefined
  const label = dungeon?.label ?? "Dungeon"
  return {
    active: true,
    dungeonId: dungeon?.id ?? input.dungeonMapId ?? "unknown",
    mapId: input.dungeonMapId ?? "unknown",
    label,
    headline: `Explore ${label}`,
    detail: "Inspect the room, note exits and blockers, then return to the overworld when ready.",
    currentStepId: "inspect-entry",
    returnLabel: "Return to overworld",
    steps: [
      {
        id: "inspect-entry",
        label: "Inspect the entry",
        detail: "Use the dungeon map to understand this interior space.",
        status: "active",
      },
      {
        id: "return-overworld",
        label: "Return outside",
        detail: "Go back to the overworld without mutating simulation authority.",
        status: "next",
      },
    ],
  }
}
