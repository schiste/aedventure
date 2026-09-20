import type { CatalogSnapshot, ResourceDef, SimulationSnapshot } from "../runtime/protocol"

export interface AddOfflineReturnResourceDelta {
  readonly id: string
  readonly label: string
  readonly before: number
  readonly after: number
  readonly delta: number
}

export interface AddOfflineReturnCompletedJob {
  readonly id: string
  readonly label: string
  readonly kind: "construction" | "processing" | "expedition" | "resonance"
}

export interface AddOfflineReturnPausedRule {
  readonly id: string
  readonly label: string
  readonly detail: string
}

export interface AddOfflineReturnSummary {
  readonly source: "autosave" | "manual"
  readonly elapsedSeconds: number
  readonly elapsedLabel: string
  readonly headline: string
  readonly summary: string
  readonly resourcesGained: readonly AddOfflineReturnResourceDelta[]
  readonly jobsCompleted: readonly AddOfflineReturnCompletedJob[]
  readonly recruitsArrived: number
  readonly bubble: {
    readonly reachDelta: number
    readonly fieldBudgetDelta: number
    readonly stabilizedHexesDelta: number
    readonly summary: string
  }
  readonly brownout: {
    readonly occurred: boolean
    readonly affectedStations: readonly string[]
    readonly summary: string
  }
  readonly didNotProgress: readonly AddOfflineReturnPausedRule[]
}

export function selectAddOfflineReturnSummary(
  before: SimulationSnapshot,
  after: SimulationSnapshot,
  catalog: CatalogSnapshot,
  elapsedSeconds: number,
  source: AddOfflineReturnSummary["source"] = "manual",
): AddOfflineReturnSummary {
  const resourcesGained = catalog.resources
    .map((resource) => offlineResourceDelta(before, after, resource))
    .filter((resource) => resource.delta > 0.001)
  const jobsCompleted = [
    ...completedConstructionJobs(before, after, catalog),
    ...completedProcessingJobs(before, after, catalog),
    ...completedResonanceJobs(before, after, catalog),
    ...completedExpeditionJobs(before, after, catalog),
  ]
  const recruitsArrived = Math.max(
    0,
    after.recruitment.totalRecruitedThisRun - before.recruitment.totalRecruitedThisRun,
  )
  const bubble = offlineBubbleDelta(before, after)
  const brownout = offlineBrownoutSummary(before, after, catalog)
  const didNotProgress = offlinePausedRules(before, after)
  const headline = offlineHeadline(resourcesGained.length, jobsCompleted.length, recruitsArrived, bubble)
  return {
    source,
    elapsedSeconds,
    elapsedLabel: formatOfflineDuration(elapsedSeconds),
    headline,
    summary: offlineSummary(
      resourcesGained.length,
      jobsCompleted.length,
      recruitsArrived,
      bubble,
      didNotProgress.length,
    ),
    resourcesGained,
    jobsCompleted,
    recruitsArrived,
    bubble,
    brownout,
    didNotProgress,
  }
}

function offlineResourceDelta(
  before: SimulationSnapshot,
  after: SimulationSnapshot,
  resource: ResourceDef,
): AddOfflineReturnResourceDelta {
  const beforeValue = resourceValue(before, resource.id)
  const afterValue = resourceValue(after, resource.id)
  return {
    id: resource.id,
    label: resource.label,
    before: round2(beforeValue),
    after: round2(afterValue),
    delta: round2(afterValue - beforeValue),
  }
}

function completedConstructionJobs(
  before: SimulationSnapshot,
  after: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddOfflineReturnCompletedJob[] {
  const beforeJob = before.activeConstruction
  if (!beforeJob) return []
  const sameJobStillRunning = after.activeConstruction?.optionId === beforeJob.optionId
  if (sameJobStillRunning) return []
  const option = catalog.constructionOptions.find((candidate) => candidate.id === beforeJob.optionId)
  return [{
    id: beforeJob.optionId,
    label: option?.label ?? beforeJob.optionId,
    kind: "construction",
  }]
}

function completedProcessingJobs(
  before: SimulationSnapshot,
  after: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddOfflineReturnCompletedJob[] {
  return Object.values(before.processing.activeJobs).flatMap((job) => {
    const sameJobStillRunning = after.processing.activeJobs[job.stationId]?.recipeId === job.recipeId
    if (sameJobStillRunning) return []
    const recipe = catalog.processingRecipes.find((candidate) => candidate.id === job.recipeId)
    return [{
      id: job.recipeId,
      label: recipe?.label ?? job.recipeId,
      kind: "processing" as const,
    }]
  })
}

function completedExpeditionJobs(
  before: SimulationSnapshot,
  after: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddOfflineReturnCompletedJob[] {
  const afterActiveIds = new Set(after.expeditions.activeJobs.map((job) => job.id))
  return before.expeditions.activeJobs.flatMap((job) => {
    if (afterActiveIds.has(job.id)) return []
    const target = catalog.expeditionTargets.find((candidate) => candidate.id === job.targetId)
    return [{
      id: `expedition:${job.id}`,
      label: target?.label ?? job.targetId,
      kind: "expedition" as const,
    }]
  })
}

function completedResonanceJobs(
  before: SimulationSnapshot,
  after: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddOfflineReturnCompletedJob[] {
  return Object.values(before.resonance.activeJobs).flatMap((job) => {
    const sameJobStillRunning = after.resonance.activeJobs[job.stationId]?.recipeId === job.recipeId
    if (sameJobStillRunning) return []
    const recipe = catalog.resonanceRecipes.find((candidate) => candidate.id === job.recipeId)
    return [{
      id: job.recipeId,
      label: recipe?.label ?? job.recipeId,
      kind: "resonance" as const,
    }]
  })
}

function offlineBubbleDelta(
  before: SimulationSnapshot,
  after: SimulationSnapshot,
): AddOfflineReturnSummary["bubble"] {
  const reachDelta = after.bubble.reachFromBase - before.bubble.reachFromBase
  const fieldBudgetDelta = after.bubble.fieldBudget - before.bubble.fieldBudget
  const stabilizedHexesDelta = after.bubble.stabilizedHexes - before.bubble.stabilizedHexes
  return {
    reachDelta,
    fieldBudgetDelta: round2(fieldBudgetDelta),
    stabilizedHexesDelta,
    summary:
      reachDelta > 0 || stabilizedHexesDelta > 0
        ? `Reach ${signedNumber(reachDelta)}, ${signedNumber(stabilizedHexesDelta)} stabilized cells.`
        : `Reach held at ${after.bubble.reachFromBase}; field budget ${round2(after.bubble.fieldBudget)}.`,
  }
}

function offlineBrownoutSummary(
  before: SimulationSnapshot,
  after: SimulationSnapshot,
  catalog: CatalogSnapshot,
): AddOfflineReturnSummary["brownout"] {
  const affectedStationIds = catalog.stations
    .filter((station) => {
      const beforeStation = before.stations[station.id]
      const afterStation = after.stations[station.id]
      return Boolean(
        (beforeStation?.requestedEnabled && !beforeStation.isPowered) ||
          (afterStation?.requestedEnabled && !afterStation.isPowered),
      )
    })
    .map((station) => station.label)
  const occurred = before.power.brownoutActive || after.power.brownoutActive || affectedStationIds.length > 0
  return {
    occurred,
    affectedStations: affectedStationIds,
    summary: occurred
      ? affectedStationIds.length > 0
        ? `Brownout pressure affected ${affectedStationIds.join(", ")}.`
        : "Brownout pressure was present during the offline window."
      : "No brownout was present when you returned.",
  }
}

function offlinePausedRules(
  before: SimulationSnapshot,
  after: SimulationSnapshot,
): readonly AddOfflineReturnPausedRule[] {
  return [
    {
      id: "manual_hero_world_actions",
      label: "Manual Hero/world actions",
      detail: before.activeWorldAction
        ? `Paused at ${round2(after.activeWorldAction?.remainingSeconds ?? before.activeWorldAction.remainingSeconds)}s remaining; world actions need online input.`
        : "No manual Hero/world action advanced; those remain online-only by rule.",
    },
    {
      id: "base_stone_collection",
      label: "Base Stone collection",
      detail: "Scavenge is intentionally online-only right now, so base Stone stock did not progress offline.",
    },
    {
      id: "base_water_collection",
      label: "Base Water collection",
      detail: "Water collection is intentionally online-only right now, even when Water crew are assigned.",
    },
  ]
}

function offlineHeadline(
  resourceCount: number,
  jobCount: number,
  recruitsArrived: number,
  bubble: AddOfflineReturnSummary["bubble"],
): string {
  const parts = [
    resourceCount > 0 ? `${resourceCount} resources changed` : null,
    jobCount > 0 ? `${jobCount} jobs completed` : null,
    recruitsArrived > 0 ? `${recruitsArrived} recruits arrived` : null,
    bubble.reachDelta > 0 ? "bubble expanded" : null,
  ].filter((part): part is string => part !== null)
  return parts.length > 0
    ? `The base lived while you were away: ${parts.join(", ")}.`
    : "The base held steady while you were away."
}

function offlineSummary(
  resourceCount: number,
  jobCount: number,
  recruitsArrived: number,
  bubble: AddOfflineReturnSummary["bubble"],
  pausedCount: number,
): string {
  const progressParts = [
    resourceCount > 0 ? `${resourceCount} resource pools gained stock` : null,
    jobCount > 0 ? `${jobCount} background jobs finished` : null,
    recruitsArrived > 0 ? `${recruitsArrived} recruits arrived` : null,
    bubble.reachDelta > 0 || bubble.stabilizedHexesDelta > 0 ? "the bubble pushed outward" : null,
  ].filter((part): part is string => part !== null)
  const progressCopy =
    progressParts.length > 0
      ? progressParts.join("; ")
      : "automated systems stayed steady without a major visible change"
  return `${progressCopy}. ${pausedCount} manual or online-only loops were held by design.`
}

function resourceValue(snapshot: SimulationSnapshot, resourceId: string): number {
  switch (resourceId) {
    case "resource.bassline":
      return snapshot.resources.bassline
    case "resource.chorus":
      return snapshot.resources.chorus
    case "resource.harmonics":
      return snapshot.resources.harmonics
    case "resource.stone":
      return snapshot.resources.stone
    case "resource.water":
      return snapshot.resources.water
    case "resource.vibes":
      return snapshot.resources.vibes
    default:
      return 0
  }
}

function formatOfflineDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

function signedNumber(value: number): string {
  if (value === 0) return "0"
  return value > 0 ? `+${value}` : `${value}`
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
