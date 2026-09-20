import type {
  CatalogSnapshot,
  CostDef,
  SimulationSnapshot,
  StoryBeatDef,
  WorkerRequest,
} from "@aedventure/add-protocol"
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
    /** Rust evaluates the command against the authoritative simulation state. */
    readonly availability: "rust_runtime"
    readonly blockerReason: "rust_blocker_id_to_catalog"
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
    ...recruitmentCommands(snapshot, catalog),
    ...waitCommands(snapshot, catalog),
    ...baseAssignmentCommands(snapshot, catalog),
  ]
  const enabledCommands = commands.filter((command) => command.enabled)
  const disabledCommands = commands.filter((command) => !command.enabled)

  return {
    authority: {
      availability: "rust_runtime",
      blockerReason: "rust_blocker_id_to_catalog",
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
  return activeBeat.choices.map((choice) => {
    const id = `story-choice:${activeBeat.id}:${choice.id}`
    const status = commandStatus(snapshot, catalog, id, [activeBeat.id, choice.id])
    return makeCommand({
      id,
      label: choice.label,
      kind: "story_choice",
      enabled: status.enabled,
      disabledReason: status.disabledReason,
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
    const id = `world-action:${action.id}`
    const status = commandStatus(snapshot, catalog, id, [action.id])
    return makeCommand({
      id,
      label: action.label,
      kind: "world_action",
      enabled: status.enabled,
      disabledReason: status.disabledReason,
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
    const resourceIds = costResourceIds(option.cost)
    const id = `construction:${option.id}`
    const status = commandStatus(snapshot, catalog, id, [option.id, ...resourceIds])
    return makeCommand({
      id,
      label: option.label,
      kind: "construction",
      enabled: status.enabled,
      disabledReason: status.disabledReason,
      command: { kind: "start_construction", optionId: option.id },
      related: {
        beatId: beatIdForRelatedId(catalog, option.id),
        optionId: null,
        actionId: null,
        constructionId: option.id,
        resourceIds,
        roleId: null,
      },
    })
  })
}

function recruitmentCommands(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddAvailableCommand[] {
  const id = "recruitment:survivor-cave"
  const status = commandStatus(snapshot, catalog, id, ["ui.action.recruit", "tile.survivor_cave", RESOURCE_VIBES])
  return [
    makeCommand({
      id,
      label: "Recruit survivor",
      kind: "recruitment",
      enabled: status.enabled,
      disabledReason: status.disabledReason,
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

function waitCommands(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddAvailableCommand[] {
  return WAIT_COMMANDS.map((wait) => {
    const status = commandStatus(snapshot, catalog, wait.id, [])
    return makeCommand({
      id: wait.id,
      label: wait.label,
      kind: "wait",
      enabled: status.enabled,
      disabledReason: status.disabledReason,
      command: { kind: "tick", seconds: wait.seconds },
      related: {
        beatId: null,
        optionId: null,
        actionId: null,
        constructionId: null,
        resourceIds: [],
        roleId: null,
      },
    })
  })
}

function baseAssignmentCommands(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddAvailableCommand[] {
  const roles = selectAddRoleAssignmentSummaries(snapshot, catalog)
  const heroId = snapshot.roster.heroAssigned ? "base:hero:unassign" : "base:hero:assign"
  const heroStatus = commandStatus(snapshot, catalog, heroId, [])
  const assignHero = makeCommand({
    id: heroId,
    label: snapshot.roster.heroAssigned ? "Unassign Hero" : "Assign Hero",
    kind: "base_assignment",
    enabled: heroStatus.enabled,
    disabledReason: heroStatus.disabledReason,
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
      const heroId = `base:hero-role:${role.id}`
      const heroStatus = commandStatus(snapshot, catalog, heroId, [role.id])
      const heroCommand = makeCommand({
        id: heroId,
        label: `Hero to ${role.label}`,
        kind: "base_assignment",
        enabled: heroStatus.enabled,
        disabledReason: heroStatus.disabledReason,
        command: { kind: "set_hero_role", roleId: role.id },
        related: relatedForRole(role.id),
      })
      const crew = Math.max(0, role.suggestedCrew)
      const crewId = `base:crew:${role.id}:${crew}`
      const crewStatus = commandStatus(snapshot, catalog, crewId, [role.id])
      const crewCommand = makeCommand({
        id: crewId,
        label: `Staff ${role.label}`,
        kind: "base_assignment",
        enabled: crewStatus.enabled,
        disabledReason: crewStatus.disabledReason,
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

function commandStatus(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  id: string,
  relatedIds: readonly string[],
): { readonly enabled: boolean; readonly disabledReason: string | null } {
  const outcome = snapshot.commandAvailability?.[id]
  if (!outcome) {
    // Old snapshots remain displayable during a hot reload, but they do not
    // get a second TypeScript implementation of command availability.
    return { enabled: true, disabledReason: null }
  }
  return {
    enabled: outcome.accepted,
    disabledReason: outcome.accepted
      ? null
      : blockerReason(catalog, outcome.blocker, relatedIds),
  }
}

function blockerReason(
  catalog: CatalogSnapshot,
  blocker: string | null,
  relatedIds: readonly string[],
): string {
  if (!blocker) return "Command was rejected by the Rust runtime."
  const related = new Set(relatedIds)
  const definitions = [
    ...catalog.entitySchemas.flatMap((schema) => schema.blockers),
    ...catalog.storyBeats.flatMap((beat) => beat.progression?.blockers ?? []),
  ]
  const match =
    definitions.find(
      (definition) =>
        definition.kind === blocker &&
        definition.relatedIds.some((relatedId) => related.has(relatedId)),
    ) ?? definitions.find((definition) => definition.kind === blocker)
  if (match) return match.label

  if (blocker === "missing_resource") {
    const labels = relatedIds
      .map((id) => catalog.resources.find((resource) => resource.id === id)?.label)
      .filter((label): label is string => Boolean(label))
    if (labels.length > 0) return `Missing ${labels.join(" and ")}.`
  }
  if (blocker === "missing_requirement") {
    const action = catalog.worldActions.find((candidate) => related.has(candidate.id))
    if (action?.heroOnly) return "Assign the Hero before starting this action."
  }
  switch (blocker) {
    case "missing_requirement":
      return "Requirements are not met."
    case "missing_resource":
      return "A required resource is missing."
    case "missing_power":
      return "The station needs power."
    case "missing_staff":
      return "Not enough free staff."
    case "blocked_at_cap":
      return "This command is already at its cap."
    case "busy":
      return "Another command is already in progress."
    case "inaccessible":
      return "This command is not available here."
    case "out_of_bubble":
      return "The target is outside bubble reach."
    case "occluded":
      return "The target is blocked."
    case "offline_disabled":
      return "This command is unavailable offline."
    case "reach_locked":
      return "The target is not inside bubble reach yet."
    default:
      return "Command is unavailable."
  }
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
