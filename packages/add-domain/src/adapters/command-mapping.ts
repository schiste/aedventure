import type { GameInteraction } from "@aedventure/game-world"

import type { StationSpecializationPath, WorkerRequest } from "../runtime/protocol"

export type AddDomainCommand =
  | { readonly kind: "tick"; readonly seconds: number }
  | { readonly kind: "start_world_action"; readonly actionId: string }
  | { readonly kind: "choose_story_option"; readonly beatId: string; readonly optionId: string }
  | { readonly kind: "complete_pre_arrival_route" }
  | { readonly kind: "assign_hero"; readonly assigned: boolean }
  | { readonly kind: "set_hero_role"; readonly roleId: string }
  | { readonly kind: "set_role_crew"; readonly roleId: string; readonly crew: number }
  | { readonly kind: "set_station_enabled"; readonly stationId: string; readonly enabled: boolean }
  | { readonly kind: "start_construction"; readonly optionId: string }
  | { readonly kind: "start_processing"; readonly recipeId: string }
  | { readonly kind: "start_resonance_recipe"; readonly recipeId: string }
  | {
      readonly kind: "set_station_specialization"
      readonly stationId: string
      readonly path: StationSpecializationPath
    }
  | { readonly kind: "start_expedition"; readonly targetId: string; readonly assignedCrew: number }
  | { readonly kind: "clear_expedition_reports" }
  | { readonly kind: "recruit_from_survivor_cave" }

export function workerRequestForAddCommand(command: AddDomainCommand): WorkerRequest {
  switch (command.kind) {
    case "tick":
      return { type: "tick", seconds: command.seconds }
    case "start_world_action":
      return { type: "startWorldAction", actionId: command.actionId }
    case "choose_story_option":
      return {
        type: "chooseStoryOption",
        beatId: command.beatId,
        optionId: command.optionId,
      }
    case "complete_pre_arrival_route":
      return { type: "completePreArrivalRoute" }
    case "assign_hero":
      return { type: "assignHero", assigned: command.assigned }
    case "set_hero_role":
      return { type: "setHeroRole", roleId: command.roleId }
    case "set_role_crew":
      return { type: "setRoleCrew", roleId: command.roleId, crew: command.crew }
    case "set_station_enabled":
      return {
        type: "setStationEnabled",
        stationId: command.stationId,
        enabled: command.enabled,
      }
    case "start_construction":
      return { type: "startConstruction", optionId: command.optionId }
    case "start_processing":
      return { type: "startProcessing", recipeId: command.recipeId }
    case "start_resonance_recipe":
      return { type: "startResonanceRecipe", recipeId: command.recipeId }
    case "set_station_specialization":
      return {
        type: "setStationSpecialization",
        stationId: command.stationId,
        path: command.path,
      }
    case "start_expedition":
      return {
        type: "startExpedition",
        targetId: command.targetId,
        assignedCrew: command.assignedCrew,
      }
    case "clear_expedition_reports":
      return { type: "clearExpeditionReports" }
    case "recruit_from_survivor_cave":
      return { type: "recruitFromSurvivorCave" }
  }
}

export function addCommandForGameInteraction(
  interaction: GameInteraction,
): AddDomainCommand | null {
  switch (interaction.action) {
    case "add.tick": {
      const seconds = numberMetadata(interaction, "seconds")
      return seconds !== undefined ? { kind: "tick", seconds } : null
    }
    case "add.start_world_action": {
      const actionId = stringMetadata(interaction, "actionId")
      return actionId ? { kind: "start_world_action", actionId } : null
    }
    case "add.choose_story_option": {
      const beatId = stringMetadata(interaction, "beatId")
      const optionId = stringMetadata(interaction, "optionId")
      return beatId && optionId
        ? { kind: "choose_story_option", beatId, optionId }
        : null
    }
    case "add.assign_hero": {
      const assigned = booleanMetadata(interaction, "assigned")
      return assigned === undefined ? null : { kind: "assign_hero", assigned }
    }
    case "add.set_hero_role": {
      const roleId = stringMetadata(interaction, "roleId")
      return roleId ? { kind: "set_hero_role", roleId } : null
    }
    case "add.set_role_crew": {
      const roleId = stringMetadata(interaction, "roleId")
      const crew = numberMetadata(interaction, "crew")
      return roleId && crew !== undefined ? { kind: "set_role_crew", roleId, crew } : null
    }
    case "add.start_construction": {
      const optionId = stringMetadata(interaction, "optionId")
      return optionId ? { kind: "start_construction", optionId } : null
    }
    case "add.recruit_from_survivor_cave":
      return { kind: "recruit_from_survivor_cave" }
    default:
      return null
  }
}

function stringMetadata(
  interaction: GameInteraction,
  key: string,
): string | undefined {
  const value = interaction.metadata?.[key]
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function booleanMetadata(
  interaction: GameInteraction,
  key: string,
): boolean | undefined {
  const value = interaction.metadata?.[key]
  return typeof value === "boolean" ? value : undefined
}

function numberMetadata(
  interaction: GameInteraction,
  key: string,
): number | undefined {
  const value = interaction.metadata?.[key]
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}
