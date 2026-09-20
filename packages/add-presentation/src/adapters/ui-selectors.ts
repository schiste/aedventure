import type {
  CatalogSnapshot,
  ConstructionOptionDef,
  CostDef,
  RequirementDef,
  ResourceDef,
  RoleDef,
  SimulationSnapshot,
  StoryBeatDef,
  WorldActionDef,
} from "@aedventure/add-protocol"
import {
  PROJECT_BUILD_FIRE_PIT,
  PROJECT_RESTORE_STUDIO,
  RESOURCE_BASSLINE,
  RESOURCE_CHORUS,
  RESOURCE_HARMONICS,
  RESOURCE_STONE,
  RESOURCE_VIBES,
  RESOURCE_WATER,
  ROLE_CONSTRUCTION,
  ROLE_CRYSTAL_BASSLINE,
  ROLE_CRYSTAL_CHORUS,
  ROLE_CRYSTAL_HARMONICS,
  ROLE_FIRE_PIT,
  ROLE_SCAVENGE,
  ROLE_WATER,
} from "./add-ids"
import type { AddFirstPlayableSummary } from "./first-playable-script"
import {
  type AddStoryCommandProjection,
  selectAddStoryProgressionState,
  type AddStoryProgressionState,
} from "./story-progression-selectors"
import { selectAddWorldTime, type AddWorldTimeSummary } from "./world-time"

export {
  selectAddFirstPlayableSummary,
  type AddFirstPlayableAction,
  type AddFirstPlayableStep,
  type AddFirstPlayableSummary,
} from "./first-playable-script"
export {
  selectAddStoryProgressionState,
  type AddStoryProgressionState,
} from "./story-progression-selectors"

export interface AddResourceSummary {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly cap: number
  readonly category: ResourceDef["category"]
  readonly source: string
  readonly sink: string
  readonly blocker: string | null
}

export interface AddObjectiveSummary {
  readonly reachTarget: number
  readonly reachMet: boolean
  readonly survivorCaveDistance: number
  readonly recruitmentEnabled: boolean
  readonly survivorCaveInBubble: boolean
}

export interface AddWorldActionSummary {
  readonly id: string
  readonly label: string
  readonly enabled: boolean
  readonly durationSeconds: number
  readonly heroOnly: boolean
  readonly blockedReason: string | null
}

export interface AddRoleAssignmentSummary {
  readonly id: string
  readonly label: string
  readonly available: boolean
  readonly heroAssigned: boolean
  readonly crewAssigned: number
  readonly suggestedCrew: number
  readonly lockedReason: string | null
}

export interface AddConstructionSummary {
  readonly id: string
  readonly label: string
  readonly complete: boolean
  readonly enabled: boolean
  readonly inProgress: boolean
  readonly remainingSeconds: number | null
  readonly costLabel: string
  readonly blockedReason: string | null
}

export interface AddUiState {
  readonly worldTime: AddWorldTimeSummary
  readonly resources: readonly AddResourceSummary[]
  readonly objective: AddObjectiveSummary
  readonly storyProgression: AddStoryProgressionState
  readonly activeStoryBeat: StoryBeatDef | null
  readonly availableWorldActions: readonly AddWorldActionSummary[]
  readonly roleAssignments: readonly AddRoleAssignmentSummary[]
  readonly constructionOptions: readonly AddConstructionSummary[]
  readonly firstPlayable: AddFirstPlayableSummary
  readonly notes: readonly string[]
}

export function selectAddUiState(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  commandProjection: AddStoryCommandProjection | null = null,
): AddUiState {
  const storyProgression = selectAddStoryProgressionState(snapshot, catalog, commandProjection)
  return {
    worldTime: selectAddWorldTime(snapshot),
    resources: selectAddResourceSummaries(snapshot, catalog),
    objective: selectAddObjectiveSummary(snapshot),
    storyProgression,
    activeStoryBeat: storyProgression.activeBeat,
    availableWorldActions: selectAddWorldActionSummaries(snapshot, catalog),
    roleAssignments: selectAddRoleAssignmentSummaries(snapshot, catalog),
    constructionOptions: selectAddConstructionSummaries(snapshot, catalog),
    firstPlayable: storyProgression.firstPlayable,
    notes: snapshot.notes,
  }
}

export function selectAddResourceSummaries(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddResourceSummary[] {
  return catalog.resources.map((resource) => ({
    id: resource.id,
    label: resource.label,
    value: resourceValue(snapshot, resource.id),
    cap: resourceCap(snapshot, resource.id, resource.baseCap),
    category: resource.category,
    ...resourceFlowCopy(snapshot, resource.id),
  }))
}

export function selectAddObjectiveSummary(
  snapshot: SimulationSnapshot,
): AddObjectiveSummary {
  return {
    reachTarget: snapshot.objectives.reachObjectiveTarget,
    reachMet: snapshot.objectives.reachObjectiveMet,
    survivorCaveDistance: snapshot.objectives.survivorCaveDistance,
    recruitmentEnabled: snapshot.objectives.recruitmentEnabled,
    survivorCaveInBubble: snapshot.objectives.survivorCaveInBubble,
  }
}

export function selectActiveStoryBeat(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): StoryBeatDef | null {
  const activeBeatId = snapshot.narrative.activeBeatId
  if (!activeBeatId) return null
  return catalog.storyBeats.find((beat) => beat.id === activeBeatId) ?? null
}

export function selectAddWorldActionSummaries(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddWorldActionSummary[] {
  return catalog.worldActions.map((action) => ({
    id: action.id,
    label: action.label,
    durationSeconds: action.durationSeconds,
    heroOnly: action.heroOnly,
    enabled: worldActionBlockedReason(snapshot, action) === null,
    blockedReason: worldActionBlockedReason(snapshot, action),
  }))
}

export function selectAddRoleAssignmentSummaries(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddRoleAssignmentSummary[] {
  return catalog.roles.map((role) => {
    const available = roleAvailable(snapshot, role.id)
    return {
      id: role.id,
      label: role.label,
      available,
      heroAssigned: snapshot.roster.heroAssigned && snapshot.roster.heroRoleId === role.id,
      crewAssigned: roleCrew(snapshot, role.id),
      suggestedCrew: suggestedCrewForRole(snapshot, role),
      lockedReason: available ? null : roleLockedReason(snapshot, role.id),
    }
  })
}

export function selectAddConstructionSummaries(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddConstructionSummary[] {
  return catalog.constructionOptions.map((option) => constructionSummary(snapshot, option))
}

function worldActionBlockedReason(
  snapshot: SimulationSnapshot,
  action: WorldActionDef,
): string | null {
  if (snapshot.activeWorldAction) return "Another world action is already running."
  if (action.heroOnly && !snapshot.roster.heroAssigned) return "Assign the Hero first."
  if (
    action.heroExposure === "bubble" &&
    snapshot.heroSurvival.location === "outside_bubble"
  ) {
    return "Hero must be back inside the bubble."
  }
  return null
}

function roleAvailable(snapshot: SimulationSnapshot, roleId: string): boolean {
  switch (roleId) {
    case ROLE_CRYSTAL_CHORUS:
      return snapshot.base.studioRestored
    case ROLE_CRYSTAL_HARMONICS:
      return snapshot.base.resonanceChamberBuilt
    case ROLE_FIRE_PIT:
      return snapshot.base.firePitBuilt
    default:
      return true
  }
}

function roleCrew(snapshot: SimulationSnapshot, roleId: string): number {
  return Number(snapshot.roster.crewByRole[roleId] ?? 0)
}

function roleLockedReason(snapshot: SimulationSnapshot, roleId: string): string | null {
  switch (roleId) {
    case ROLE_CRYSTAL_CHORUS:
      return snapshot.base.studioRestored ? null : "Restore the Studio to unlock Chorus."
    case ROLE_CRYSTAL_HARMONICS:
      return snapshot.base.resonanceChamberBuilt
        ? null
        : "Build the Resonance Chamber to unlock Harmonics."
    case ROLE_FIRE_PIT:
      return snapshot.base.firePitBuilt ? null : "Build the Fire Pit to staff Vibes."
    default:
      return null
  }
}

function suggestedCrewForRole(snapshot: SimulationSnapshot, role: RoleDef): number {
  if (!roleAvailable(snapshot, role.id)) return 0
  if (role.id === ROLE_FIRE_PIT) return snapshot.base.firePitBuilt ? 1 : 0
  if (role.id === ROLE_SCAVENGE) return Math.min(2, snapshot.roster.totalCrew)
  if (role.id === ROLE_CONSTRUCTION) return Math.min(2, snapshot.roster.totalCrew)
  if (role.id === ROLE_CRYSTAL_BASSLINE) return Math.min(2, snapshot.roster.totalCrew)
  if (role.id === ROLE_WATER) return snapshot.base.waterCollectionUnlocked ? 1 : 0
  return Math.min(role.maxCrewSlots ?? snapshot.roster.totalCrew, snapshot.roster.totalCrew)
}

function constructionSummary(
  snapshot: SimulationSnapshot,
  option: ConstructionOptionDef,
): AddConstructionSummary {
  const complete = constructionComplete(snapshot, option.id)
  const inProgress = snapshot.activeConstruction?.optionId === option.id
  const requirementBlocker = constructionRequirementBlocker(snapshot, option)
  const affordabilityBlocker = constructionAffordabilityBlocker(snapshot, option)
  const busyBlocker =
    snapshot.activeConstruction && !inProgress ? "Another project is already in progress." : null
  const blockedReason = complete
    ? "Complete."
    : busyBlocker ?? requirementBlocker ?? affordabilityBlocker
  return {
    id: option.id,
    label: option.label,
    complete,
    enabled: !complete && !inProgress && blockedReason === null,
    inProgress,
    remainingSeconds: inProgress ? snapshot.activeConstruction?.remainingWorkSeconds ?? null : null,
    costLabel: costLabel(option.cost),
    blockedReason,
  }
}

function constructionComplete(snapshot: SimulationSnapshot, optionId: string): boolean {
  switch (optionId) {
    case PROJECT_RESTORE_STUDIO:
      return snapshot.base.studioRestored
    case PROJECT_BUILD_FIRE_PIT:
      return snapshot.base.firePitBuilt
    case "project.build_resonance_chamber":
      return snapshot.base.resonanceChamberBuilt
    case "project.build_mix_console":
      return snapshot.base.mixConsoleBuilt
    case "project.build_workshop":
      return snapshot.base.workshopBuilt
    case "project.build_research_booth":
      return snapshot.base.researchBoothBuilt
    case "construction.removing_moss":
      return snapshot.crystalCircle.removingMossCompleted
    default:
      return false
  }
}

function constructionRequirementBlocker(
  snapshot: SimulationSnapshot,
  option: ConstructionOptionDef,
): string | null {
  if (requirementsMet(snapshot, option.requirements)) return null
  if (option.id === PROJECT_RESTORE_STUDIO) return "Explore the Base to unlock Studio restoration."
  return "Requirements are not met yet."
}

function constructionAffordabilityBlocker(
  snapshot: SimulationSnapshot,
  option: ConstructionOptionDef,
): string | null {
  switch (option.cost.kind) {
    case "upfront": {
      const amount = option.cost.amount ?? 0
      const resourceId = option.cost.resource_id
      if (!resourceId || resourceValue(snapshot, resourceId) >= amount) return null
      return `Need ${formatAmount(amount)} ${resourceName(resourceId)}.`
    }
    case "upfront_bundle": {
      const missing = option.cost.costs?.find(
        (cost) => resourceValue(snapshot, costItemResourceId(cost)) < cost.amount,
      )
      return missing
        ? `Need ${formatAmount(missing.amount)} ${resourceName(costItemResourceId(missing))}.`
        : null
    }
    default:
      return null
  }
}

function requirementsMet(
  snapshot: SimulationSnapshot,
  requirements: readonly RequirementDef[],
): boolean {
  return requirements.every((requirement) => {
    switch (requirement.kind) {
      case "flag_set":
        return flagValue(snapshot, requirement.flag_id)
      case "flag_unset":
        return !flagValue(snapshot, requirement.flag_id)
    }
  })
}

function flagValue(snapshot: SimulationSnapshot, flagId: string): boolean {
  switch (flagId) {
    case "flag.base.studio_restore_unlocked":
    case "base.studio_restore_unlocked":
      return snapshot.base.studioRestoreUnlocked
    case "flag.base.studio_restored":
    case "base.studio_restored":
      return snapshot.base.studioRestored
    case "flag.base.fire_pit_built":
    case "base.fire_pit_built":
      return snapshot.base.firePitBuilt
    case "flag.base.resonance_chamber_built":
    case "base.resonance_chamber_built":
      return snapshot.base.resonanceChamberBuilt
    case "flag.base.mix_console_built":
    case "base.mix_console_built":
      return snapshot.base.mixConsoleBuilt
    case "flag.base.workshop_built":
    case "base.workshop_built":
      return snapshot.base.workshopBuilt
    case "flag.base.research_booth_built":
    case "base.research_booth_built":
      return snapshot.base.researchBoothBuilt
    case "flag.base.tutorial_investigated":
    case "base.tutorial_investigated":
      return snapshot.base.tutorialInvestigated
    case "flag.base.tutorial_explored":
    case "base.tutorial_explored":
      return snapshot.base.tutorialExplored
    case "flag.base.water_collection_unlocked":
    case "base.water_collection_unlocked":
      return snapshot.base.waterCollectionUnlocked
    case "flag.crystal.removing_moss_unlocked":
    case "crystal.removing_moss_unlocked":
      return snapshot.crystalCircle.removingMossUnlocked
    case "flag.crystal.removing_moss_completed":
    case "crystal.removing_moss_completed":
      return snapshot.crystalCircle.removingMossCompleted
    default:
      return false
  }
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

function resourceFlowCopy(
  snapshot: SimulationSnapshot,
  resourceId: string,
): Pick<AddResourceSummary, "source" | "sink" | "blocker"> {
  switch (resourceId) {
    case RESOURCE_BASSLINE:
      return {
        source: "Crystal Bassline staff",
        sink: "Bubble field budget and crystal upgrades",
        blocker:
          snapshot.resources.bassline >= snapshot.resources.basslineCap
            ? "Storage is full."
            : null,
      }
    case RESOURCE_CHORUS:
      return {
        source: "Studio-restored Chorus staff",
        sink: "Life support and powered stations",
        blocker: snapshot.base.studioRestored ? null : "Restore the Studio to unlock Chorus.",
      }
    case RESOURCE_HARMONICS:
      return {
        source: "Resonance Harmonics staff",
        sink: "Efficiency tiers and brownout resilience",
        blocker: snapshot.base.resonanceChamberBuilt
          ? null
          : "Build the Resonance Chamber to unlock Harmonics.",
      }
    case RESOURCE_STONE:
      return {
        source: "Scavenge role",
        sink: "Studio, Fire Pit, and base construction",
        blocker:
          snapshot.resources.stone >= snapshot.resources.stoneCap ? "Storage is full." : null,
      }
    case RESOURCE_WATER:
      return {
        source: "Water role after Base exploration",
        sink: "Processing and field polish projects",
        blocker: snapshot.base.waterCollectionUnlocked
          ? null
          : "Explore the Base to unlock water collection.",
      }
    case RESOURCE_VIBES:
      return {
        source: "Built Fire Pit and Fire Pit crew",
        sink: "Recruitment and overcrowding pressure",
        blocker: snapshot.base.firePitBuilt ? null : "Build the Fire Pit to generate Vibes.",
      }
    default:
      return {
        source: "Runtime economy",
        sink: "Base progression",
        blocker: null,
      }
  }
}

function costLabel(cost: CostDef): string {
  switch (cost.kind) {
    case "upfront":
      return `${formatAmount(cost.amount ?? 0)} ${resourceName(cost.resource_id ?? "")}`
    case "upfront_bundle":
      return (
        cost.costs
          ?.map((item) => `${formatAmount(item.amount)} ${resourceName(costItemResourceId(item))}`)
          .join(", ") ?? "Bundled cost"
      )
    case "drain_per_worker_second":
      return `${formatAmount(cost.amount ?? 0)} ${resourceName(cost.resource_id ?? "")} / worker sec`
    case "time_only":
      return "Time only"
  }
}

function costItemResourceId(item: { readonly item_id?: string; readonly itemId?: string }): string {
  return item.item_id ?? item.itemId ?? ""
}

function resourceName(resourceId: string): string {
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
    default:
      return resourceId
  }
}

function formatAmount(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

function resourceCap(
  snapshot: SimulationSnapshot,
  resourceId: string,
  fallbackCap: number,
): number {
  switch (resourceId) {
    case "resource.bassline":
      return snapshot.resources.basslineCap
    case "resource.chorus":
      return snapshot.resources.chorusCap
    case "resource.harmonics":
      return snapshot.resources.harmonicsCap
    case "resource.stone":
      return snapshot.resources.stoneCap
    case "resource.water":
      return snapshot.resources.waterCap
    case "resource.vibes":
      return snapshot.resources.vibesCap
    default:
      return fallbackCap
  }
}
