import type {
  CatalogSnapshot,
  ConstructionOptionDef,
  CostDef,
  RequirementDef,
  SimulationSnapshot,
  StoryBeatDef,
  WorkerRequest,
  WorldActionDef,
} from "../runtime/protocol"
import {
  RESOURCE_BASSLINE,
  RESOURCE_CHORUS,
  RESOURCE_HARMONICS,
  RESOURCE_STONE,
  RESOURCE_VIBES,
  RESOURCE_WATER,
} from "./add-ids"
import {
  type AddDomainCommand,
  workerRequestForAddCommand,
} from "./command-mapping"
import { selectedStoryChoiceId, storyFlagSet } from "./story-state-readers"
import { selectAddRoleAssignmentSummaries } from "./ui-selectors"

export type AddAvailableCommandKind =
  | "story_choice"
  | "world_action"
  | "construction"
  | "recruitment"
  | "wait"
  | "base_assignment"

export interface AddAvailableCommandRelated {
  readonly beatId: string | null
  readonly optionId: string | null
  readonly actionId: string | null
  readonly constructionId: string | null
  readonly resourceIds: readonly string[]
  readonly roleId: string | null
}

export interface AddAvailableCommandTelemetry {
  readonly commandKind: AddDomainCommand["kind"]
  readonly workerType: WorkerRequest["type"]
  readonly enabled: boolean
  readonly relatedBeatId: string | null
  readonly relatedActionId: string | null
  readonly relatedResourceIds: readonly string[]
}

export interface AddAvailableCommand {
  readonly id: string
  readonly label: string
  readonly kind: AddAvailableCommandKind
  readonly enabled: boolean
  readonly disabledReason: string | null
  readonly command: AddDomainCommand
  readonly workerRequest: WorkerRequest
  readonly related: AddAvailableCommandRelated
  readonly telemetry: AddAvailableCommandTelemetry
}

export interface AddAvailableCommandsState {
  readonly authority: {
    readonly availability: "typescript_projection_pending_rust_explain"
    readonly workerRequest: "typescript_projection_to_rust_worker"
    readonly runtimeExecution: "rust_runtime"
  }
  readonly commands: readonly AddAvailableCommand[]
  readonly enabledCommands: readonly AddAvailableCommand[]
  readonly disabledCommands: readonly AddAvailableCommand[]
  readonly telemetrySummary: {
    readonly total: number
    readonly enabled: number
    readonly disabled: number
    readonly byKind: Readonly<Record<AddAvailableCommandKind, number>>
  }
}

const WAIT_COMMANDS: readonly {
  readonly id: string
  readonly label: string
  readonly seconds: number
}[] = [
  { id: "wait:60", label: "Wait 1 minute", seconds: 60 },
  { id: "wait:120", label: "Wait 2 minutes", seconds: 120 },
]

export function selectAddAvailableCommands(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): AddAvailableCommandsState {
  const commands = [
    ...storyChoiceCommands(snapshot, catalog),
    ...worldActionCommands(snapshot, catalog),
    ...constructionCommands(snapshot, catalog),
    ...recruitmentCommands(snapshot),
    ...waitCommands(),
    ...baseAssignmentCommands(snapshot, catalog),
  ]
  const enabledCommands = commands.filter((command) => command.enabled)
  const disabledCommands = commands.filter((command) => !command.enabled)

  return {
    authority: {
      availability: "typescript_projection_pending_rust_explain",
      workerRequest: "typescript_projection_to_rust_worker",
      runtimeExecution: "rust_runtime",
    },
    commands,
    enabledCommands,
    disabledCommands,
    telemetrySummary: {
      total: commands.length,
      enabled: enabledCommands.length,
      disabled: disabledCommands.length,
      byKind: commandKindCounts(commands),
    },
  }
}

function storyChoiceCommands(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddAvailableCommand[] {
  const activeBeat = activeStoryBeat(snapshot, catalog)
  if (!activeBeat || activeBeat.choices.length === 0) return []
  const selectedChoiceId = selectedStoryChoiceId(snapshot, activeBeat.id)
  return activeBeat.choices.map((choice) => {
    const enabled = selectedChoiceId === null
    return makeCommand({
      id: `story-choice:${activeBeat.id}:${choice.id}`,
      label: choice.label,
      kind: "story_choice",
      enabled,
      disabledReason: enabled ? null : "A choice has already been made for this story beat.",
      command: { kind: "choose_story_option", beatId: activeBeat.id, optionId: choice.id },
      related: {
        beatId: activeBeat.id,
        optionId: choice.id,
        actionId: null,
        constructionId: null,
        resourceIds: [],
        roleId: null,
      },
    })
  })
}

function worldActionCommands(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddAvailableCommand[] {
  return catalog.worldActions.map((action) => {
    const disabledReason = worldActionDisabledReason(snapshot, action)
    return makeCommand({
      id: `world-action:${action.id}`,
      label: action.label,
      kind: "world_action",
      enabled: disabledReason === null,
      disabledReason,
      command: { kind: "start_world_action", actionId: action.id },
      related: {
        beatId: beatIdForWorldAction(catalog, action.id),
        optionId: null,
        actionId: action.id,
        constructionId: null,
        resourceIds: [],
        roleId: null,
      },
    })
  })
}

function constructionCommands(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddAvailableCommand[] {
  return catalog.constructionOptions.map((option) => {
    const affordability = constructionAffordability(snapshot, option)
    const disabledReason =
      snapshot.activeConstruction !== null
        ? "Construction is already in progress."
        : requirementsDisabledReason(snapshot, option.requirements)
          ?? affordability.disabledReason
    return makeCommand({
      id: `construction:${option.id}`,
      label: option.label,
      kind: "construction",
      enabled: disabledReason === null,
      disabledReason,
      command: { kind: "start_construction", optionId: option.id },
      related: {
        beatId: beatIdForRelatedId(catalog, option.id),
        optionId: null,
        actionId: null,
        constructionId: option.id,
        resourceIds: affordability.resourceIds,
        roleId: null,
      },
    })
  })
}

function recruitmentCommands(snapshot: SimulationSnapshot): readonly AddAvailableCommand[] {
  const disabledReason = !snapshot.objectives.recruitmentEnabled
    ? "Recruitment opens when Survivor Cave is inside Bubble reach."
    : snapshot.resources.vibes < snapshot.recruitment.nextRecruitCost
      ? `Need ${formatAmount(snapshot.recruitment.nextRecruitCost)} Vibes.`
      : null
  return [
    makeCommand({
      id: "recruitment:survivor-cave",
      label: "Recruit survivor",
      kind: "recruitment",
      enabled: disabledReason === null,
      disabledReason,
      command: { kind: "recruit_from_survivor_cave" },
      related: {
        beatId: null,
        optionId: null,
        actionId: null,
        constructionId: null,
        resourceIds: [RESOURCE_VIBES],
        roleId: null,
      },
    }),
  ]
}

function waitCommands(): readonly AddAvailableCommand[] {
  return WAIT_COMMANDS.map((wait) =>
    makeCommand({
      id: wait.id,
      label: wait.label,
      kind: "wait",
      enabled: true,
      disabledReason: null,
      command: { kind: "tick", seconds: wait.seconds },
      related: {
        beatId: null,
        optionId: null,
        actionId: null,
        constructionId: null,
        resourceIds: [],
        roleId: null,
      },
    }),
  )
}

function baseAssignmentCommands(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddAvailableCommand[] {
  const roles = selectAddRoleAssignmentSummaries(snapshot, catalog)
  const assignHero = makeCommand({
    id: snapshot.roster.heroAssigned ? "base:hero:unassign" : "base:hero:assign",
    label: snapshot.roster.heroAssigned ? "Unassign Hero" : "Assign Hero",
    kind: "base_assignment",
    enabled: true,
    disabledReason: null,
    command: { kind: "assign_hero", assigned: !snapshot.roster.heroAssigned },
    related: {
      beatId: null,
      optionId: null,
      actionId: null,
      constructionId: null,
      resourceIds: [],
      roleId: snapshot.roster.heroRoleId,
    },
  })
  return [
    assignHero,
    ...roles.flatMap((role) => {
      const heroCommand = makeCommand({
        id: `base:hero-role:${role.id}`,
        label: `Hero to ${role.label}`,
        kind: "base_assignment",
        enabled: role.available,
        disabledReason: role.available ? null : role.lockedReason ?? "Role is not available.",
        command: { kind: "set_hero_role", roleId: role.id },
        related: relatedForRole(role.id),
      })
      const crew = Math.max(0, role.suggestedCrew)
      const crewCommand = makeCommand({
        id: `base:crew:${role.id}:${crew}`,
        label: `Staff ${role.label}`,
        kind: "base_assignment",
        enabled: role.available && role.crewAssigned !== crew,
        disabledReason: !role.available
          ? role.lockedReason ?? "Role is not available."
          : role.crewAssigned === crew
            ? `${role.label} already has the suggested crew.`
            : null,
        command: { kind: "set_role_crew", roleId: role.id, crew },
        related: relatedForRole(role.id),
      })
      return [heroCommand, crewCommand]
    }),
  ]
}

function makeCommand(input: {
  readonly id: string
  readonly label: string
  readonly kind: AddAvailableCommandKind
  readonly enabled: boolean
  readonly disabledReason: string | null
  readonly command: AddDomainCommand
  readonly related: AddAvailableCommandRelated
}): AddAvailableCommand {
  const workerRequest = workerRequestForAddCommand(input.command)
  return {
    ...input,
    workerRequest,
    telemetry: {
      commandKind: input.command.kind,
      workerType: workerRequest.type,
      enabled: input.enabled,
      relatedBeatId: input.related.beatId,
      relatedActionId: input.related.actionId,
      relatedResourceIds: input.related.resourceIds,
    },
  }
}

function worldActionDisabledReason(
  snapshot: SimulationSnapshot,
  action: WorldActionDef,
): string | null {
  if (snapshot.activeWorldAction) return "A world action is already in progress."
  if (action.heroOnly && !snapshot.roster.heroAssigned) {
    return "Assign the Hero before starting this action."
  }
  if (
    action.heroExposure === "bubble" &&
    snapshot.heroSurvival.location === "outside_bubble"
  ) {
    return "Hero must be back inside the bubble."
  }
  return requirementsDisabledReason(snapshot, action.requirements)
}

function requirementsDisabledReason(
  snapshot: SimulationSnapshot,
  requirements: readonly RequirementDef[],
): string | null {
  const failed = requirements.find((requirement) => !requirementMet(snapshot, requirement))
  if (!failed) return null
  switch (failed.kind) {
    case "flag_set":
      return `Requires ${failed.flag_id}.`
    case "flag_unset":
      return `Blocked while ${failed.flag_id} is already set.`
  }
}

function requirementMet(snapshot: SimulationSnapshot, requirement: RequirementDef): boolean {
  switch (requirement.kind) {
    case "flag_set":
      return storyFlagSet(snapshot, requirement.flag_id)
    case "flag_unset":
      return !storyFlagSet(snapshot, requirement.flag_id)
  }
}

function constructionAffordability(
  snapshot: SimulationSnapshot,
  option: ConstructionOptionDef,
): { readonly disabledReason: string | null; readonly resourceIds: readonly string[] } {
  const resources = costResourceIds(option.cost)
  if (canAffordCost(snapshot, option.cost)) return { disabledReason: null, resourceIds: resources }
  return {
    disabledReason: `Missing ${resources.map(resourceLabel).join(" and ")}.`,
    resourceIds: resources,
  }
}

function canAffordCost(snapshot: SimulationSnapshot, cost: CostDef): boolean {
  if (cost.kind === "time_only") return true
  if (cost.kind === "upfront" || cost.kind === "drain_per_worker_second") {
    return resourceValue(snapshot, cost.resource_id ?? "") >= (cost.amount ?? 0)
  }
  if (cost.kind === "upfront_bundle") {
    return (cost.costs ?? []).every((item) => resourceValue(snapshot, item.item_id) >= item.amount)
  }
  return false
}

function costResourceIds(cost: CostDef): readonly string[] {
  if (cost.kind === "time_only") return []
  if (cost.kind === "upfront" || cost.kind === "drain_per_worker_second") {
    return cost.resource_id ? [cost.resource_id] : []
  }
  return [
    ...new Set(
      (cost.costs ?? [])
        .map((item) => item.item_id)
        .filter((resourceId): resourceId is string => typeof resourceId === "string" && resourceId.length > 0),
    ),
  ]
}

function resourceValue(snapshot: SimulationSnapshot, resourceId: string): number {
  switch (resourceId) {
    case RESOURCE_BASSLINE:
      return snapshot.resources.bassline
    case RESOURCE_CHORUS:
      return snapshot.resources.chorus
    case RESOURCE_HARMONICS:
      return snapshot.resources.harmonics
    case RESOURCE_STONE:
      return snapshot.resources.stone
    case RESOURCE_WATER:
      return snapshot.resources.water
    case RESOURCE_VIBES:
      return snapshot.resources.vibes
    case "cost.skin":
      return snapshot.base.skins
    default:
      return 0
  }
}

function resourceLabel(resourceId: string): string {
  switch (resourceId) {
    case RESOURCE_BASSLINE:
      return "Bassline"
    case RESOURCE_CHORUS:
      return "Chorus"
    case RESOURCE_HARMONICS:
      return "Harmonics"
    case RESOURCE_STONE:
      return "Stone"
    case RESOURCE_WATER:
      return "Water"
    case RESOURCE_VIBES:
      return "Vibes"
    case "cost.skin":
      return "Skin"
    default:
      return resourceId
  }
}

function activeStoryBeat(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): StoryBeatDef | null {
  return catalog.storyBeats.find((beat) => beat.id === snapshot.narrative.activeBeatId) ?? null
}


function beatIdForWorldAction(catalog: CatalogSnapshot, actionId: string): string | null {
  return catalog.storyBeats.find((beat) => beat.worldActionId === actionId)?.id ?? null
}

function beatIdForRelatedId(catalog: CatalogSnapshot, id: string): string | null {
  return catalog.storyBeats.find((beat) => beat.relatedIds.includes(id))?.id ?? null
}

function relatedForRole(roleId: string): AddAvailableCommandRelated {
  return {
    beatId: null,
    optionId: null,
    actionId: null,
    constructionId: null,
    resourceIds: resourceIdsForRole(roleId),
    roleId,
  }
}

function resourceIdsForRole(roleId: string): readonly string[] {
  switch (roleId) {
    case "role.crystal_bassline":
      return [RESOURCE_BASSLINE]
    case "role.crystal_chorus":
      return [RESOURCE_CHORUS]
    case "role.crystal_harmonics":
      return [RESOURCE_HARMONICS]
    case "role.scavenge":
      return [RESOURCE_STONE]
    case "role.water":
      return [RESOURCE_WATER]
    case "role.fire_pit":
      return [RESOURCE_VIBES]
    default:
      return []
  }
}

function commandKindCounts(
  commands: readonly AddAvailableCommand[],
): Readonly<Record<AddAvailableCommandKind, number>> {
  return {
    story_choice: commands.filter((command) => command.kind === "story_choice").length,
    world_action: commands.filter((command) => command.kind === "world_action").length,
    construction: commands.filter((command) => command.kind === "construction").length,
    recruitment: commands.filter((command) => command.kind === "recruitment").length,
    wait: commands.filter((command) => command.kind === "wait").length,
    base_assignment: commands.filter((command) => command.kind === "base_assignment").length,
  }
}

function formatAmount(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(1)
}
