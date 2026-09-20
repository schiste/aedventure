import type {
  AddAvailableCommand,
  AddAvailableCommandsState,
} from "../adapters/available-commands-selectors"
import type { AddDomainCommand } from "../adapters/command-mapping"
import { ADD_CONTENT_VALIDATION_VERSION } from "../content/content-validation"
import type { AddUiState } from "../adapters/ui-selectors"
import type { CatalogSnapshot, SimulationSnapshot } from "@aedventure/add-protocol"

/** The versioned contract consumed by agents, scenario tooling, and app smoke checks. */
export const ADD_AGENT_RUNTIME_REPORT_VERSION = 1 as const
export const ADD_AGENT_RUNTIME_CONTRACT = "agent_runtime_v1" as const

export interface AddAgentRuntimeReport {
  readonly schemaVersion: typeof ADD_AGENT_RUNTIME_REPORT_VERSION
  readonly contract: typeof ADD_AGENT_RUNTIME_CONTRACT
  readonly runtime: AddAgentRuntimeReadiness
  readonly authoritative: AddAgentAuthoritativeState
  readonly derived: AddAgentDerivedState
  readonly diagnostics: AddAgentDiagnostics
}

export interface AddAgentRuntimeReadiness {
  readonly ready: boolean
  readonly source: "rust-wasm" | "headless-add-core" | "unavailable"
  readonly snapshotReceived: boolean
  readonly catalogReceived: boolean
  readonly error: string | null
}

export interface AddAgentAuthoritativeState {
  readonly entities: {
    readonly heroId: string
    readonly crewRoleIds: readonly string[]
  }
  readonly currentTime: {
    readonly seconds: number
  }
  readonly resources: readonly AddAgentResource[]
  readonly jobs: AddAgentJobs
  readonly crew: {
    readonly heroAssigned: boolean
    readonly heroRoleId: string
    readonly totalCrew: number
    readonly crewByRole: Readonly<Record<string, number>>
  }
  readonly hero: {
    readonly progress: {
      readonly drummer: { readonly level: number; readonly xp: number }
      readonly vocalist: { readonly level: number; readonly xp: number }
      readonly synth: { readonly level: number; readonly xp: number }
    }
    readonly survival: SimulationSnapshot["heroSurvival"]
    readonly inventory: Readonly<Record<string, number>>
    readonly acquiredPerks: readonly string[]
  }
  readonly story: {
    readonly activeBeatId: string | null
    readonly completedBeatIds: readonly string[]
    readonly choiceByBeat: Readonly<Record<string, string>>
    readonly qualities: Readonly<Record<string, number>>
  }
  readonly map: {
    readonly heroCell: string
    readonly discoveredCells: readonly string[]
    readonly hexCount: number
    readonly bubble: SimulationSnapshot["bubble"]
    readonly objectives: SimulationSnapshot["objectives"]
  }
  readonly catalog: AddAgentCatalogIdentity
}

export interface AddAgentResource {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly cap: number
  readonly category: string
}

export interface AddAgentJobs {
  readonly construction: {
    readonly id: string
    readonly remainingSeconds: number
    readonly totalSeconds: number
  } | null
  readonly worldAction: {
    readonly id: string
    readonly remainingSeconds: number
    readonly totalSeconds: number
  } | null
  readonly processing: readonly {
    readonly id: string
    readonly recipeId: string
    readonly stationId: string
    readonly remainingSeconds: number
    readonly totalSeconds: number
  }[]
  readonly resonance: readonly {
    readonly id: string
    readonly recipeId: string
    readonly stationId: string
    readonly remainingSeconds: number
    readonly totalSeconds: number
  }[]
  readonly expeditions: readonly {
    readonly id: string
    readonly targetId: string
    readonly remainingSeconds: number
    readonly totalSeconds: number
    readonly assignedCrew: number
    readonly risk: string
  }[]
  readonly recruitment: readonly {
    readonly id: string
    readonly remainingSeconds: number
    readonly totalSeconds: number
  }[]
  readonly combat: {
    readonly creatureId: string
    readonly locationKey: string
    readonly round: number
    readonly remainingSeconds: number
  } | null
}

export interface AddAgentCatalogIdentity {
  readonly schemaVersion: number
  readonly catalogVersion: number
  readonly contentValidationVersion: string
  readonly counts: Readonly<Record<string, number>>
  readonly contentIds: Readonly<Record<string, readonly string[]>>
}

export interface AddAgentCommand {
  readonly id: string
  readonly kind: string
  readonly label: string
  readonly enabled: boolean
  readonly whyUnavailable: string | null
  readonly command: AddDomainCommand
  readonly relatedIds: readonly string[]
}

export interface AddAgentDerivedState {
  readonly map: {
    readonly mode: string | null
    readonly availableModes: readonly string[]
    readonly topology: string | null
  }
  readonly story: {
    readonly activeBeatId: string | null
    readonly activeArc: string | null
    readonly nextAction: {
      readonly commandId: string | null
      readonly label: string
      readonly detail: string
      readonly enabled: boolean
    }
    readonly blocker: {
      readonly kind: string
      readonly label: string
      readonly detail: string
      readonly relatedIds: readonly string[]
    }
  }
  readonly availableCommands: readonly AddAgentCommand[]
  readonly enabledCommandIds: readonly string[]
  readonly blockedCommandIds: readonly string[]
  readonly blockers: readonly AddAgentBlocker[]
}

export interface AddAgentBlocker {
  readonly id: string
  readonly kind: "command_unavailable" | "story" | "runtime"
  readonly label: string
  readonly reason: string
  readonly relatedIds: readonly string[]
}

export interface AddAgentDiagnostics {
  readonly layerAuthority: {
    readonly authoritative: "rust-wasm-snapshot"
    readonly derived: "add-domain-selectors"
    readonly diagnostics: "browser-runtime-and-renderer"
  }
  readonly lastCommand: string | null
  readonly lastEvent: string
  readonly noteCount: number
  readonly warnings: readonly string[]
}

export interface CreateAddAgentRuntimeReportInput {
  readonly snapshot: SimulationSnapshot | null
  readonly catalog: CatalogSnapshot | null
  readonly availableCommands: AddAvailableCommandsState | null
  readonly ui: AddUiState | null
  readonly map: {
    readonly mode: string | null
    readonly availableModes: readonly string[]
    readonly topology: string | null
  }
  readonly runtime: {
    readonly ready: boolean
    readonly source?: AddAgentRuntimeReadiness["source"]
    readonly lastCommand: string | null
    readonly lastEvent: string
    readonly error: string | null
  }
}

export function createAddAgentRuntimeReport(
  input: CreateAddAgentRuntimeReportInput,
): AddAgentRuntimeReport {
  const snapshot = input.snapshot
  const catalog = input.catalog
  const commands = input.availableCommands?.commands.map(agentCommand) ?? []
  const enabledCommands = commands.filter((command) => command.enabled)
  const blockedCommands = commands.filter((command) => !command.enabled)
  const story = input.ui?.storyProgression
  const primaryAction = story?.primaryAction
  const primaryCommandId = primaryAction
    ? commandIdForAction(primaryAction.action, commands)
    : null
  const storyBlocker = story?.blocker ?? {
    kind: "runtime",
    label: "Runtime is not ready",
    detail: input.runtime.error ?? "Waiting for the Rust runtime snapshot.",
    relatedIds: [],
  }

  return {
    schemaVersion: ADD_AGENT_RUNTIME_REPORT_VERSION,
    contract: ADD_AGENT_RUNTIME_CONTRACT,
    runtime: {
      ready: input.runtime.ready && snapshot !== null && catalog !== null,
      source: input.runtime.source ?? "rust-wasm",
      snapshotReceived: snapshot !== null,
      catalogReceived: catalog !== null,
      error: input.runtime.error,
    },
    authoritative: snapshot && catalog
      ? authoritativeState(snapshot, catalog)
      : emptyAuthoritativeState(),
    derived: {
      map: {
        mode: input.map.mode,
        availableModes: [...input.map.availableModes],
        topology: input.map.topology,
      },
      story: {
        activeBeatId: story?.activeBeat?.id ?? snapshot?.narrative.activeBeatId ?? null,
        activeArc: story?.activeArc ?? null,
        nextAction: {
          commandId: primaryCommandId,
          label: primaryAction?.label ?? "Wait for the runtime",
          detail: primaryAction?.detail ?? input.runtime.error ?? "Runtime snapshot unavailable.",
          enabled: primaryAction?.enabled ?? false,
        },
        blocker: {
          kind: storyBlocker.kind,
          label: storyBlocker.label,
          detail: storyBlocker.detail,
          relatedIds: [...storyBlocker.relatedIds],
        },
      },
      availableCommands: commands,
      enabledCommandIds: enabledCommands.map((command) => command.id),
      blockedCommandIds: blockedCommands.map((command) => command.id),
      blockers: [
        ...blockedCommands.map((command) => ({
          id: `blocker:command:${command.id}`,
          kind: "command_unavailable" as const,
          label: command.label,
          reason: command.whyUnavailable ?? "Command is not currently available.",
          relatedIds: [...command.relatedIds],
        })),
        ...(story && story.blocker.kind !== "none"
          ? [{
              id: `blocker:story:${story.blocker.kind}`,
              kind: "story" as const,
              label: story.blocker.label,
              reason: story.blocker.detail,
              relatedIds: [...story.blocker.relatedIds],
            }]
          : []),
        ...(input.runtime.error
          ? [{
              id: "blocker:runtime:error",
              kind: "runtime" as const,
              label: "Runtime error",
              reason: input.runtime.error,
              relatedIds: [],
            }]
          : []),
      ],
    },
    diagnostics: {
      layerAuthority: {
        authoritative: "rust-wasm-snapshot",
        derived: "add-domain-selectors",
        diagnostics: "browser-runtime-and-renderer",
      },
      lastCommand: input.runtime.lastCommand,
      lastEvent: input.runtime.lastEvent,
      noteCount: snapshot?.notes.length ?? 0,
      warnings: snapshot && catalog ? [] : ["Waiting for a complete runtime snapshot and catalog."],
    },
  }
}

export function renderAddAgentRuntimeText(report: AddAgentRuntimeReport): string {
  const next = report.derived.story.nextAction
  const blocked = report.derived.blockers
  const enabled = report.derived.enabledCommandIds
  const time = report.authoritative.currentTime.seconds
  const activeBeat = report.authoritative.story.activeBeatId ?? "none"
  const lines = [
    `runtime ${report.runtime.ready ? "ready" : "not-ready"} source=${report.runtime.source}`,
    `time ${formatNumber(time)}s beat=${activeBeat}`,
    `next ${next.commandId ?? "none"} enabled=${next.enabled} ${next.label} — ${next.detail}`,
    `commands enabled=${enabled.length} blocked=${report.derived.blockedCommandIds.length}`,
  ]
  if (blocked.length > 0) {
    lines.push(`blockers ${blocked.map((item) => `${item.id}: ${item.reason}`).join(" | ")}`)
  }
  if (report.runtime.error) lines.push(`error ${report.runtime.error}`)
  return lines.join("\n")
}

/** Stable compact JSON for automation and snapshot tests. */
export function serializeAddAgentRuntimeReport(report: AddAgentRuntimeReport): string {
  return JSON.stringify(sortJsonValue(report))
}

/** Stable checkpoint identity shared by scenario reports and agent tooling. */
export function addCheckpointId(scenarioId: string, ordinal: number, after: number): string {
  const safeScenarioId = scenarioId.trim().replace(/[^a-zA-Z0-9._-]+/g, "-") || "scenario"
  return `checkpoint:${safeScenarioId}:${ordinal + 1}@${after}`
}

function authoritativeState(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): AddAgentAuthoritativeState {
  return {
    entities: {
      heroId: "entity:hero",
      crewRoleIds: catalog.roles.map((role) => `crew-role:${role.id}`).sort(),
    },
    currentTime: { seconds: round(snapshot.clockSeconds) },
    resources: catalog.resources.map((resource) => ({
      id: resource.id,
      label: resource.label,
      value: round(resourceValue(snapshot, resource.id)),
      cap: round(resourceCap(snapshot, resource.id, resource.baseCap)),
      category: resource.category,
    })),
    jobs: {
      construction: snapshot.activeConstruction
        ? {
            id: snapshot.activeConstruction.optionId,
            remainingSeconds: round(snapshot.activeConstruction.remainingWorkSeconds),
            totalSeconds: round(snapshot.activeConstruction.totalWorkSeconds),
          }
        : null,
      worldAction: snapshot.activeWorldAction
        ? {
            id: snapshot.activeWorldAction.actionId,
            remainingSeconds: round(snapshot.activeWorldAction.remainingSeconds),
            totalSeconds: round(snapshot.activeWorldAction.totalSeconds),
          }
        : null,
      processing: Object.entries(snapshot.processing?.activeJobs ?? {})
        .map(([id, job]) => ({
          id,
          recipeId: job.recipeId,
          stationId: job.stationId,
          remainingSeconds: round(job.remainingWorkSeconds),
          totalSeconds: round(job.totalWorkSeconds),
        }))
        .sort(compareId),
      resonance: Object.entries(snapshot.resonance?.activeJobs ?? {})
        .map(([id, job]) => ({
          id,
          recipeId: job.recipeId,
          stationId: job.stationId,
          remainingSeconds: round(job.remainingWorkSeconds),
          totalSeconds: round(job.totalWorkSeconds),
        }))
        .sort(compareId),
      expeditions: (snapshot.expeditions?.activeJobs ?? [])
        .map((job) => ({
          id: String(job.id),
          targetId: job.targetId,
          remainingSeconds: round(job.remainingSeconds),
          totalSeconds: round(job.durationSeconds),
          assignedCrew: job.assignedCrew,
          risk: job.risk,
        }))
        .sort(compareId),
      recruitment: (snapshot.recruitment?.pendingRecruits ?? []).map((job, index) => ({
        id: `recruitment:${index + 1}`,
        remainingSeconds: round(job.remainingSeconds),
        totalSeconds: round(job.totalSeconds),
      })),
      combat: snapshot.activeCombat
        ? {
            creatureId: snapshot.activeCombat.creatureId,
            locationKey: snapshot.activeCombat.locationKey,
            round: snapshot.activeCombat.round,
            remainingSeconds: round(snapshot.activeCombat.roundTimer),
          }
        : null,
    },
    crew: {
      heroAssigned: snapshot.roster?.heroAssigned ?? false,
      heroRoleId: snapshot.roster?.heroRoleId ?? "",
      totalCrew: snapshot.roster?.totalCrew ?? 0,
      crewByRole: sortRecord(snapshot.roster?.crewByRole ?? {}),
    },
    hero: {
      progress: {
        drummer: { level: snapshot.heroProgress?.drummerLevel ?? 0, xp: round(snapshot.heroProgress?.drummerXp ?? 0) },
        vocalist: { level: snapshot.heroProgress?.vocalistLevel ?? 0, xp: round(snapshot.heroProgress?.vocalistXp ?? 0) },
        synth: { level: snapshot.heroProgress?.synthLevel ?? 0, xp: round(snapshot.heroProgress?.synthXp ?? 0) },
      },
      survival: snapshot.heroSurvival,
      inventory: sortRecord(snapshot.inventory ?? {}),
      acquiredPerks: [...(snapshot.acquiredPerks ?? [])].sort(),
    },
    story: {
      activeBeatId: snapshot.narrative?.activeBeatId ?? null,
      completedBeatIds: [...(snapshot.narrative?.completedBeatIds ?? [])].sort(),
      choiceByBeat: sortRecord(snapshot.narrative?.choiceByBeat ?? {}),
      qualities: sortRecord(snapshot.narrative?.qualities ?? {}),
    },
    map: {
      heroCell: cellId(snapshot.heroMap ?? { q: 0, r: 0 }),
      discoveredCells: (snapshot.discoveredCells ?? []).map(cellId).sort(),
      hexCount: (snapshot.hexes ?? []).length,
      bubble: snapshot.bubble,
      objectives: snapshot.objectives,
    },
    catalog: catalogIdentity(snapshot, catalog),
  }
}

function emptyAuthoritativeState(): AddAgentAuthoritativeState {
  return {
    entities: { heroId: "entity:hero", crewRoleIds: [] },
    currentTime: { seconds: 0 },
    resources: [],
    jobs: {
      construction: null,
      worldAction: null,
      processing: [],
      resonance: [],
      expeditions: [],
      recruitment: [],
      combat: null,
    },
    crew: { heroAssigned: false, heroRoleId: "", totalCrew: 0, crewByRole: {} },
    hero: {
      progress: {
        drummer: { level: 0, xp: 0 },
        vocalist: { level: 0, xp: 0 },
        synth: { level: 0, xp: 0 },
      },
      survival: {} as SimulationSnapshot["heroSurvival"],
      inventory: {},
      acquiredPerks: [],
    },
    story: { activeBeatId: null, completedBeatIds: [], choiceByBeat: {}, qualities: {} },
    map: { heroCell: "", discoveredCells: [], hexCount: 0, bubble: {} as SimulationSnapshot["bubble"], objectives: {} as SimulationSnapshot["objectives"] },
    catalog: {
      schemaVersion: 0,
      catalogVersion: 0,
      contentValidationVersion: "unknown",
      counts: {},
      contentIds: {},
    },
  }
}

function agentCommand(command: AddAvailableCommand): AddAgentCommand {
  return {
    id: command.id,
    kind: command.kind,
    label: command.label,
    enabled: command.enabled,
    whyUnavailable: command.disabledReason,
    command: command.command,
    relatedIds: [
      command.related.beatId,
      command.related.optionId,
      command.related.actionId,
      command.related.constructionId,
      command.related.roleId,
      ...command.related.resourceIds,
    ].filter((id): id is string => id !== null),
  }
}

function commandIdForAction(
  action: AddUiState["storyProgression"]["primaryAction"]["action"],
  commands: readonly AddAgentCommand[],
): string | null {
  if (!action) return null
  return commands.find((command) => {
    switch (action.type) {
      case "choose_story_option":
        return command.command.kind === "choose_story_option" && command.command.beatId === action.beatId && command.command.optionId === action.optionId
      case "start_world_action":
        return command.command.kind === "start_world_action" && command.command.actionId === action.actionId
      case "assign_hero":
        return command.command.kind === "assign_hero" && command.command.assigned === action.assigned
      case "set_hero_role":
        return command.command.kind === "set_hero_role" && command.command.roleId === action.roleId
      case "set_role_crew":
        return command.command.kind === "set_role_crew" && command.command.roleId === action.roleId && command.command.crew === action.crew
      case "start_construction":
        return command.command.kind === "start_construction" && command.command.optionId === action.optionId
      case "tick":
        return command.command.kind === "tick" && command.command.seconds === action.seconds
      case "recruit_from_survivor_cave":
        return command.command.kind === "recruit_from_survivor_cave"
      case "preview_route_to_base":
        return false
    }
  })?.id ?? null
}

function catalogIdentity(snapshot: SimulationSnapshot, catalog: CatalogSnapshot): AddAgentCatalogIdentity {
  const families = {
    resources: catalog.resources ?? [],
    roles: catalog.roles ?? [],
    stations: catalog.stations ?? [],
    constructionOptions: catalog.constructionOptions ?? [],
    processingRecipes: catalog.processingRecipes ?? [],
    worldActions: catalog.worldActions ?? [],
    expeditionTargets: catalog.expeditionTargets ?? [],
    resonanceRecipes: catalog.resonanceRecipes ?? [],
    storyBeats: catalog.storyBeats ?? [],
    objectives: catalog.objectives ?? [],
    items: catalog.items ?? [],
    perks: catalog.perks ?? [],
    creatures: catalog.creatures ?? [],
    flags: catalog.flags ?? [],
    models: catalog.models ?? [],
    flora: catalog.flora ?? [],
    structures: catalog.structures ?? [],
    tiles: catalog.tiles ?? [],
    entitySchemas: catalog.entitySchemas ?? [],
    uiElements: catalog.uiElements ?? [],
  }
  return {
    schemaVersion: snapshot.schemaVersion,
    catalogVersion: snapshot.catalogVersion,
    contentValidationVersion: ADD_CONTENT_VALIDATION_VERSION,
    counts: Object.fromEntries(Object.entries(families).map(([key, values]) => [key, values.length])),
    contentIds: Object.fromEntries(
      Object.entries(families).map(([key, values]) => [key, values.map((value) => value.id).sort()]),
    ),
  }
}

function resourceValue(snapshot: SimulationSnapshot, id: string): number {
  switch (id) {
    case "resource.bassline": return snapshot.resources.bassline
    case "resource.chorus": return snapshot.resources.chorus
    case "resource.harmonics": return snapshot.resources.harmonics
    case "resource.stone": return snapshot.resources.stone
    case "resource.water": return snapshot.resources.water
    case "resource.vibes": return snapshot.resources.vibes
    default: return 0
  }
}

function resourceCap(snapshot: SimulationSnapshot, id: string, fallback: number): number {
  switch (id) {
    case "resource.bassline": return snapshot.resources.basslineCap
    case "resource.chorus": return snapshot.resources.chorusCap
    case "resource.harmonics": return snapshot.resources.harmonicsCap
    case "resource.stone": return snapshot.resources.stoneCap
    case "resource.water": return snapshot.resources.waterCap
    case "resource.vibes": return snapshot.resources.vibesCap
    default: return fallback
  }
}

function cellId(cell: { readonly q: number; readonly r: number }): string {
  return `${cell.q}:${cell.r}`
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")
}

function compareId(a: { readonly id: string }, b: { readonly id: string }): number {
  return a.id.localeCompare(b.id)
}

function sortRecord<T extends number | string>(record: Readonly<Record<string, T>>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)))
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJsonValue(child)]),
    )
  }
  return value
}
