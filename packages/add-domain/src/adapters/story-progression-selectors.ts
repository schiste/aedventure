import type { CatalogSnapshot, SimulationSnapshot, StoryBeatDef } from "../runtime/protocol"
import {
  PROJECT_BUILD_FIRE_PIT,
  PROJECT_RESTORE_STUDIO,
  ROLE_CONSTRUCTION,
  ROLE_CRYSTAL_BASSLINE,
  ROLE_FIRE_PIT,
  ROLE_SCAVENGE,
  WORLD_ACTION_EXPLORE_BASE,
  WORLD_ACTION_INVESTIGATE_BASE,
} from "./add-ids"

const PRE_ARRIVAL_STORY_BEATS = new Set([
  "story.beat.road_to_base",
  "story.beat.first_glimpse",
  "story.beat.enter_the_bubble",
])

export type AddFirstPlayableAction =
  | { readonly type: "choose_story_option"; readonly beatId: string; readonly optionId: string }
  | { readonly type: "preview_route_to_base" }
  | { readonly type: "assign_hero"; readonly assigned: boolean }
  | { readonly type: "set_hero_role"; readonly roleId: string }
  | { readonly type: "set_role_crew"; readonly roleId: string; readonly crew: number }
  | { readonly type: "start_world_action"; readonly actionId: string }
  | { readonly type: "start_construction"; readonly optionId: string }
  | { readonly type: "tick"; readonly seconds: number }
  | { readonly type: "recruit_from_survivor_cave" }

export interface AddFirstPlayableStep {
  readonly id: string
  readonly label: string
  readonly complete: boolean
  readonly active: boolean
  readonly detail: string
  readonly actionLabel: string | null
  readonly action: AddFirstPlayableAction | null
}

export interface AddFirstPlayableSummary {
  readonly complete: boolean
  readonly completedCount: number
  readonly totalCount: number
  readonly currentStepId: string | null
  readonly steps: readonly AddFirstPlayableStep[]
}

export type AddStoryBeatProgressionStatus = "completed" | "current" | "upcoming"

export interface AddStoryBeatProgressionEntry {
  readonly id: string
  readonly label: string
  readonly arc: string
  readonly sequence: number
  readonly status: AddStoryBeatProgressionStatus
  readonly awaitingChoice: boolean
  readonly selectedChoiceId: string | null
  readonly worldActionId: string | null
  readonly relatedIds: readonly string[]
}

export type AddStoryPrimaryActionSource =
  | "story_choice"
  | "world_action"
  | "first_playable"
  | "complete"
  | "none"

export interface AddStoryPrimaryAction {
  readonly source: AddStoryPrimaryActionSource
  readonly label: string
  readonly detail: string
  readonly enabled: boolean
  readonly action: AddFirstPlayableAction | null
  readonly beatId: string | null
  readonly stepId: string | null
}

export interface AddStoryProgressionBlocker {
  readonly kind: "choice_required" | "action_required" | "first_playable" | "complete" | "none"
  readonly label: string
  readonly detail: string
  readonly relatedIds: readonly string[]
}

export interface AddStoryUnlockPreview {
  readonly id: string
  readonly label: string
  readonly kind: string
}

export interface AddStoryChoiceState {
  readonly beatId: string | null
  readonly awaitingChoice: boolean
  readonly selectedChoiceId: string | null
  readonly choices: readonly {
    readonly id: string
    readonly label: string
    readonly selected: boolean
  }[]
}

export interface AddStoryProgressionTelemetrySummary {
  readonly activeBeatId: string | null
  readonly activeArc: string | null
  readonly completedBeatIds: readonly string[]
  readonly currentBeatIds: readonly string[]
  readonly upcomingBeatIds: readonly string[]
  readonly nextLikelyBeatId: string | null
  readonly primaryActionSource: AddStoryPrimaryActionSource
  readonly primaryActionEnabled: boolean
  readonly blockerKind: AddStoryProgressionBlocker["kind"]
  readonly firstPlayableStepId: string | null
  readonly firstPlayableComplete: boolean
  readonly awaitingChoice: boolean
}

export interface AddStoryProgressionState {
  readonly activeBeat: StoryBeatDef | null
  readonly activeArc: string | null
  readonly completedBeats: readonly AddStoryBeatProgressionEntry[]
  readonly currentBeats: readonly AddStoryBeatProgressionEntry[]
  readonly upcomingBeats: readonly AddStoryBeatProgressionEntry[]
  readonly allBeats: readonly AddStoryBeatProgressionEntry[]
  readonly primaryAction: AddStoryPrimaryAction
  readonly blocker: AddStoryProgressionBlocker
  readonly unlockPreview: readonly AddStoryUnlockPreview[]
  readonly currentChoiceState: AddStoryChoiceState
  readonly nextLikelyBeat: StoryBeatDef | null
  readonly firstPlayable: AddFirstPlayableSummary
  readonly telemetrySummary: AddStoryProgressionTelemetrySummary
}

interface AddFirstPlayableContext {
  readonly snapshot: SimulationSnapshot
  readonly catalog: CatalogSnapshot
  readonly activeBeat: StoryBeatDef | null
}

type AddFirstPlayableStepResult = Omit<AddFirstPlayableStep, "id" | "label" | "active">

interface AddFirstPlayableScriptStep {
  readonly id: string
  readonly label: string
  readonly evaluate: (context: AddFirstPlayableContext) => AddFirstPlayableStepResult
}

const FIRST_PLAYABLE_SCRIPT: readonly AddFirstPlayableScriptStep[] = [
  {
    id: "reach-base",
    label: "Reach the Base",
    evaluate: ({ snapshot, catalog, activeBeat }) => preArrivalStep(snapshot, catalog, activeBeat),
  },
  {
    id: "assign-hero-crew",
    label: "Assign Hero and crew",
    evaluate: ({ snapshot }) => heroAndCrewStep(snapshot),
  },
  {
    id: "investigate-base",
    label: "Investigate the Base",
    evaluate: ({ snapshot, activeBeat }) => investigateStep(snapshot, activeBeat),
  },
  {
    id: "explore-base",
    label: "Explore deeper",
    evaluate: ({ snapshot, activeBeat }) => exploreStep(snapshot, activeBeat),
  },
  {
    id: "generate-resources",
    label: "Generate first resources",
    evaluate: ({ snapshot }) => generateResourcesStep(snapshot),
  },
  {
    id: "restore-studio",
    label: "Restore the Studio",
    evaluate: ({ snapshot }) => restoreStudioStep(snapshot),
  },
  {
    id: "build-fire-pit",
    label: "Build the Fire Pit",
    evaluate: ({ snapshot }) => buildFirePitStep(snapshot),
  },
  {
    id: "bubble-reach",
    label: "Understand bubble reach",
    evaluate: ({ snapshot }) => bubbleReachStep(snapshot),
  },
  {
    id: "unlock-recruitment",
    label: "Unlock recruitment",
    evaluate: ({ snapshot }) => unlockRecruitmentStep(snapshot),
  },
  {
    id: "recruit-once",
    label: "Recruit once",
    evaluate: ({ snapshot }) => recruitOnceStep(snapshot),
  },
]

export const ADD_FIRST_PLAYABLE_SCRIPT: readonly Pick<
  AddFirstPlayableScriptStep,
  "id" | "label"
>[] = FIRST_PLAYABLE_SCRIPT.map(({ id, label }) => ({ id, label }))

export function selectAddStoryProgressionState(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): AddStoryProgressionState {
  const activeBeat = selectActiveStoryBeat(snapshot, catalog)
  const firstPlayable = selectFirstPlayableSummary(snapshot, catalog, activeBeat)
  const allBeats = catalog.storyBeats
    .slice()
    .sort(compareStoryBeats)
    .map((beat) => storyBeatProgressionEntry(snapshot, beat, activeBeat?.id ?? null))
  const completedBeats = allBeats.filter((beat) => beat.status === "completed")
  const currentBeats = allBeats.filter((beat) => beat.status === "current")
  const upcomingBeats = allBeats.filter((beat) => beat.status === "upcoming")
  const currentChoiceState = selectCurrentChoiceState(snapshot, activeBeat)
  const primaryAction = selectStoryPrimaryAction(snapshot, activeBeat, firstPlayable)
  const blocker = selectStoryProgressionBlocker(activeBeat, currentChoiceState, primaryAction, firstPlayable)
  const nextLikelyBeat = selectNextLikelyBeat(snapshot, catalog, activeBeat)
  const unlockPreview = selectUnlockPreview(catalog, activeBeat, nextLikelyBeat)

  return {
    activeBeat,
    activeArc: activeBeat?.arc ?? null,
    completedBeats,
    currentBeats,
    upcomingBeats,
    allBeats,
    primaryAction,
    blocker,
    unlockPreview,
    currentChoiceState,
    nextLikelyBeat,
    firstPlayable,
    telemetrySummary: {
      activeBeatId: activeBeat?.id ?? null,
      activeArc: activeBeat?.arc ?? null,
      completedBeatIds: completedBeats.map((beat) => beat.id),
      currentBeatIds: currentBeats.map((beat) => beat.id),
      upcomingBeatIds: upcomingBeats.map((beat) => beat.id),
      nextLikelyBeatId: nextLikelyBeat?.id ?? null,
      primaryActionSource: primaryAction.source,
      primaryActionEnabled: primaryAction.enabled,
      blockerKind: blocker.kind,
      firstPlayableStepId: firstPlayable.currentStepId,
      firstPlayableComplete: firstPlayable.complete,
      awaitingChoice: currentChoiceState.awaitingChoice,
    },
  }
}

function selectFirstPlayableSummary(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  activeBeat: StoryBeatDef | null,
): AddFirstPlayableSummary {
  const context: AddFirstPlayableContext = {
    snapshot,
    catalog,
    activeBeat,
  }
  const stepsWithoutActive = FIRST_PLAYABLE_SCRIPT.map((scriptStep) => ({
    id: scriptStep.id,
    label: scriptStep.label,
    ...scriptStep.evaluate(context),
  }))
  const currentStepId = stepsWithoutActive.find((step) => !step.complete)?.id ?? null
  const steps = stepsWithoutActive.map((step) => ({
    ...step,
    active: step.id === currentStepId,
  }))
  return {
    complete: currentStepId === null,
    completedCount: steps.filter((step) => step.complete).length,
    totalCount: steps.length,
    currentStepId,
    steps,
  }
}

function selectActiveStoryBeat(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): StoryBeatDef | null {
  const activeBeatId = snapshot.narrative.activeBeatId
  if (!activeBeatId) return null
  return catalog.storyBeats.find((beat) => beat.id === activeBeatId) ?? null
}

function compareStoryBeats(a: StoryBeatDef, b: StoryBeatDef): number {
  const arc = a.arc.localeCompare(b.arc)
  if (arc !== 0) return arc
  return a.sequence - b.sequence
}

function storyBeatProgressionEntry(
  snapshot: SimulationSnapshot,
  beat: StoryBeatDef,
  activeBeatId: string | null,
): AddStoryBeatProgressionEntry {
  const selectedChoiceId = selectedStoryChoiceId(snapshot, beat.id)
  return {
    id: beat.id,
    label: beat.label,
    arc: beat.arc,
    sequence: beat.sequence,
    status: storyBeatStatus(snapshot, beat.id, activeBeatId),
    awaitingChoice: beat.choices.length > 0 && selectedChoiceId === null && activeBeatId === beat.id,
    selectedChoiceId,
    worldActionId: beat.worldActionId,
    relatedIds: beat.relatedIds,
  }
}

function storyBeatStatus(
  snapshot: SimulationSnapshot,
  beatId: string,
  activeBeatId: string | null,
): AddStoryBeatProgressionStatus {
  if (snapshot.narrative.completedBeatIds.includes(beatId)) return "completed"
  if (beatId === activeBeatId) return "current"
  return "upcoming"
}

function selectCurrentChoiceState(
  snapshot: SimulationSnapshot,
  activeBeat: StoryBeatDef | null,
): AddStoryChoiceState {
  if (!activeBeat) {
    return {
      beatId: null,
      awaitingChoice: false,
      selectedChoiceId: null,
      choices: [],
    }
  }
  const selectedChoiceId = selectedStoryChoiceId(snapshot, activeBeat.id)
  return {
    beatId: activeBeat.id,
    awaitingChoice: activeBeat.choices.length > 0 && selectedChoiceId === null,
    selectedChoiceId,
    choices: activeBeat.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      selected: choice.id === selectedChoiceId,
    })),
  }
}

function selectStoryPrimaryAction(
  snapshot: SimulationSnapshot,
  activeBeat: StoryBeatDef | null,
  firstPlayable: AddFirstPlayableSummary,
): AddStoryPrimaryAction {
  const activeStep = firstPlayable.steps.find((step) => step.active) ?? null
  const choiceAction = storyChoiceAction(snapshot, activeBeat)
  if (choiceAction.action) {
    return {
      source: "story_choice",
      label: choiceAction.actionLabel ?? "Choose",
      detail: activeBeat?.body ?? "Choose how this story beat should resolve.",
      enabled: true,
      action: choiceAction.action,
      beatId: activeBeat?.id ?? null,
      stepId: activeStep?.id ?? null,
    }
  }
  if (activeBeat?.worldActionId) {
    return {
      source: "world_action",
      label: `Start ${activeBeat.label}`,
      detail: activeBeat.body,
      enabled: true,
      action: { type: "start_world_action", actionId: activeBeat.worldActionId },
      beatId: activeBeat.id,
      stepId: activeStep?.id ?? null,
    }
  }
  if (activeStep?.action) {
    return {
      source: "first_playable",
      label: activeStep.actionLabel ?? activeStep.label,
      detail: activeStep.detail,
      enabled: true,
      action: activeStep.action,
      beatId: activeBeat?.id ?? null,
      stepId: activeStep.id,
    }
  }
  if (firstPlayable.complete) {
    return {
      source: "complete",
      label: "First playable arc complete",
      detail: "The opening arc is complete; base, discovery, and dungeon systems can now lead independently.",
      enabled: false,
      action: null,
      beatId: activeBeat?.id ?? null,
      stepId: null,
    }
  }
  return {
    source: "none",
    label: activeBeat?.label ?? "No active story beat",
    detail: activeBeat?.body ?? "The story engine is waiting for world state to change.",
    enabled: false,
    action: null,
    beatId: activeBeat?.id ?? null,
    stepId: activeStep?.id ?? null,
  }
}

function selectStoryProgressionBlocker(
  activeBeat: StoryBeatDef | null,
  choiceState: AddStoryChoiceState,
  primaryAction: AddStoryPrimaryAction,
  firstPlayable: AddFirstPlayableSummary,
): AddStoryProgressionBlocker {
  if (choiceState.awaitingChoice) {
    return {
      kind: "choice_required",
      label: "Choose a story option",
      detail: "The active story beat is waiting for the player to choose how to proceed.",
      relatedIds: activeBeat ? [activeBeat.id] : [],
    }
  }
  if (activeBeat?.worldActionId) {
    return {
      kind: "action_required",
      label: "Run the linked world action",
      detail: `${activeBeat.label} progresses through ${activeBeat.worldActionId}.`,
      relatedIds: [activeBeat.id, activeBeat.worldActionId],
    }
  }
  const activeStep = firstPlayable.steps.find((step) => step.active)
  if (activeStep && !firstPlayable.complete) {
    return {
      kind: "first_playable",
      label: activeStep.label,
      detail: activeStep.detail,
      relatedIds: activeBeat ? [activeBeat.id] : [],
    }
  }
  if (primaryAction.source === "complete") {
    return {
      kind: "complete",
      label: "Opening arc complete",
      detail: primaryAction.detail,
      relatedIds: [],
    }
  }
  return {
    kind: "none",
    label: "No blocker",
    detail: "No story progression blocker is currently projected.",
    relatedIds: [],
  }
}

function selectNextLikelyBeat(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  activeBeat: StoryBeatDef | null,
): StoryBeatDef | null {
  const completed = new Set(snapshot.narrative.completedBeatIds)
  const sorted = catalog.storyBeats.slice().sort(compareStoryBeats)
  if (activeBeat) {
    const nextInArc = sorted.find(
      (beat) =>
        beat.arc === activeBeat.arc &&
        beat.sequence > activeBeat.sequence &&
        beat.id !== activeBeat.id &&
        !completed.has(beat.id),
    )
    if (nextInArc) return nextInArc
  }
  return sorted.find((beat) => beat.id !== activeBeat?.id && !completed.has(beat.id)) ?? null
}

function selectUnlockPreview(
  catalog: CatalogSnapshot,
  activeBeat: StoryBeatDef | null,
  nextLikelyBeat: StoryBeatDef | null,
): readonly AddStoryUnlockPreview[] {
  const ids = new Set<string>()
  activeBeat?.relatedIds.forEach((id) => ids.add(id))
  nextLikelyBeat?.relatedIds.forEach((id) => ids.add(id))
  return [...ids].slice(0, 8).map((id) => ({
    id,
    ...relatedIdPresentation(catalog, id),
  }))
}

function relatedIdPresentation(
  catalog: CatalogSnapshot,
  id: string,
): Pick<AddStoryUnlockPreview, "label" | "kind"> {
  const collections: Array<readonly { readonly id: string; readonly label?: string }[]> = [
    catalog.resources,
    catalog.roles,
    catalog.stations,
    catalog.constructionOptions,
    catalog.processingRecipes,
    catalog.worldActions,
    catalog.storyBeats,
    catalog.flags,
    catalog.flora,
    catalog.structures,
    catalog.tiles,
    catalog.entitySchemas,
    catalog.uiElements,
  ]
  for (const collection of collections) {
    const found = collection.find((entry) => entry.id === id)
    if (found) return { label: found.label ?? id, kind: idKind(id) }
  }
  return { label: id, kind: idKind(id) }
}

function idKind(id: string): string {
  return id.includes(".") ? id.split(".")[0] : "id"
}

function selectedStoryChoiceId(snapshot: SimulationSnapshot, beatId: string): string | null {
  const choiceByBeat = snapshot.narrative.choiceByBeat as
    | Record<string, string>
    | Map<string, string>
    | undefined
  if (!choiceByBeat) return null
  if (typeof (choiceByBeat as Map<string, string>).get === "function") {
    return (choiceByBeat as Map<string, string>).get(beatId) ?? null
  }
  return (choiceByBeat as Record<string, string>)[beatId] ?? null
}

function preArrivalStep(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  activeBeat: StoryBeatDef | null,
): AddFirstPlayableStepResult {
  const reachedBase = heroReachedBase(snapshot, catalog)
  const complete = reachedBase || !activeBeat || !PRE_ARRIVAL_STORY_BEATS.has(activeBeat.id)
  return {
    complete,
    detail: complete
      ? "The Hero has reached The Studio. Base management can now open from here."
      : "Move across adjacent regions toward The Studio. Each crossing takes 60 minutes; reaching the Studio unlocks Base management.",
    actionLabel: complete ? null : "Preview route to Studio",
    action: complete ? null : { type: "preview_route_to_base" },
  }
}

function heroReachedBase(snapshot: SimulationSnapshot, catalog: CatalogSnapshot): boolean {
  const baseTileIds = new Set(
    catalog.tiles
      .filter((tile) => tile.feature === "base" || tile.tags.includes("base"))
      .map((tile) => tile.id),
  )
  if (baseTileIds.size === 0) return false
  return snapshot.hexes.some(
    (hex) =>
      hex.q === snapshot.heroMap.q &&
      hex.r === snapshot.heroMap.r &&
      baseTileIds.has(hex.tileId),
  )
}

function heroAndCrewStep(snapshot: SimulationSnapshot): AddFirstPlayableStepResult {
  const heroBusy = Boolean(snapshot.activeWorldAction)
  const crewReady =
    roleCrew(snapshot, ROLE_CRYSTAL_BASSLINE) > 0 ||
    roleCrew(snapshot, ROLE_SCAVENGE) > 0 ||
    snapshot.base.tutorialInvestigated
  const complete = (snapshot.roster.heroAssigned || heroBusy) && crewReady
  if (!snapshot.roster.heroAssigned && !heroBusy) {
    return {
      complete,
      detail: "Put the Hero on duty so the Base can start producing and acting.",
      actionLabel: "Assign Hero",
      action: { type: "assign_hero", assigned: true },
    }
  }
  if (roleCrew(snapshot, ROLE_CRYSTAL_BASSLINE) < 1) {
    return {
      complete,
      detail: "Put at least one crew member on Bassline to make the bubble visible.",
      actionLabel: "Assign Bassline crew",
      action: { type: "set_role_crew", roleId: ROLE_CRYSTAL_BASSLINE, crew: 1 },
    }
  }
  return {
    complete,
    detail: "Hero and crew are contributing to the first loop.",
    actionLabel: null,
    action: null,
  }
}

function investigateStep(
  snapshot: SimulationSnapshot,
  activeBeat: StoryBeatDef | null,
): AddFirstPlayableStepResult {
  const complete = snapshot.base.tutorialInvestigated
  return {
    complete,
    detail: complete
      ? "The first sweep identified what can still run."
      : "Choose how to investigate, then send the Hero through the first sweep.",
    ...worldActionStepAction(snapshot, activeBeat, WORLD_ACTION_INVESTIGATE_BASE, "Start Investigate Base"),
  }
}

function exploreStep(
  snapshot: SimulationSnapshot,
  activeBeat: StoryBeatDef | null,
): AddFirstPlayableStepResult {
  const complete = snapshot.base.tutorialExplored
  return {
    complete,
    detail: complete
      ? "Studio restoration, water, and moss cleanup are unlocked."
      : "Explore the ruin to unlock the first repair projects.",
    ...worldActionStepAction(snapshot, activeBeat, WORLD_ACTION_EXPLORE_BASE, "Start Explore Base"),
  }
}

function generateResourcesStep(snapshot: SimulationSnapshot): AddFirstPlayableStepResult {
  const complete = snapshot.resources.stone >= 600 && snapshot.resources.bassline > 0
  if (snapshot.resources.stone < 600) {
    if (snapshot.roster.heroRoleId !== ROLE_SCAVENGE || !snapshot.roster.heroAssigned) {
      return {
        complete,
        detail: "Gather Stone for the Studio and keep Bassline visible for bubble reach.",
        actionLabel: "Send Hero scavenging",
        action: { type: "set_hero_role", roleId: ROLE_SCAVENGE },
      }
    }
    if (roleCrew(snapshot, ROLE_SCAVENGE) < 1) {
      return {
        complete,
        detail: "Crew scavenging makes the first construction costs readable quickly.",
        actionLabel: "Assign Scavenge crew",
        action: { type: "set_role_crew", roleId: ROLE_SCAVENGE, crew: 2 },
      }
    }
    return {
      complete,
      detail: `Stone ${formatAmount(snapshot.resources.stone)} / 600 for Studio restoration.`,
      actionLabel: "Gather resources",
      action: { type: "tick", seconds: 8 },
    }
  }
  if (snapshot.resources.bassline <= 0) {
    return {
      complete,
      detail: "Bassline is the visible pressure behind bubble reach.",
      actionLabel: "Generate Bassline",
      action: { type: "tick", seconds: 8 },
    }
  }
  return {
    complete,
    detail: "The Base has enough Stone and Bassline to make the next choice meaningful.",
    actionLabel: null,
    action: null,
  }
}

function restoreStudioStep(snapshot: SimulationSnapshot): AddFirstPlayableStepResult {
  return constructionStep(
    snapshot,
    "Restore the Studio",
    snapshot.base.studioRestored,
    PROJECT_RESTORE_STUDIO,
    "Start Studio restoration",
    "The Studio opens Chorus and turns the Base into a real home.",
  )
}

function buildFirePitStep(snapshot: SimulationSnapshot): AddFirstPlayableStepResult {
  return constructionStep(
    snapshot,
    "Build the Fire Pit",
    snapshot.base.firePitBuilt,
    PROJECT_BUILD_FIRE_PIT,
    "Start Fire Pit",
    "The Fire Pit creates Vibes, which make recruitment possible.",
  )
}

function bubbleReachStep(snapshot: SimulationSnapshot): AddFirstPlayableStepResult {
  const complete = snapshot.objectives.reachObjectiveMet
  if (!complete && snapshot.roster.heroRoleId !== ROLE_CRYSTAL_BASSLINE) {
    return {
      complete,
      detail: `Reach ${snapshot.bubble.reachFromBase} / ${snapshot.objectives.reachObjectiveTarget}; Bassline expands the field.`,
      actionLabel: "Send Hero to Bassline",
      action: { type: "set_hero_role", roleId: ROLE_CRYSTAL_BASSLINE },
    }
  }
  if (!complete && roleCrew(snapshot, ROLE_CRYSTAL_BASSLINE) < 2) {
    if (roleCrew(snapshot, ROLE_SCAVENGE) > 0) {
      return {
        complete,
        detail: "Move the scavenging crew back to Bassline so the bubble can expand.",
        actionLabel: "Free Bassline crew",
        action: { type: "set_role_crew", roleId: ROLE_SCAVENGE, crew: 0 },
      }
    }
    if (roleCrew(snapshot, ROLE_CONSTRUCTION) > 0) {
      return {
        complete,
        detail: "Move builders back to Bassline so the bubble can expand.",
        actionLabel: "Free Bassline crew",
        action: { type: "set_role_crew", roleId: ROLE_CONSTRUCTION, crew: 0 },
      }
    }
    return {
      complete,
      detail: "More Bassline staff make bubble reach climb faster.",
      actionLabel: "Assign Bassline crew",
      action: { type: "set_role_crew", roleId: ROLE_CRYSTAL_BASSLINE, crew: 2 },
    }
  }
  return {
    complete,
    detail: complete
      ? "The bubble reached the first target ring."
      : `Reach ${snapshot.bubble.reachFromBase} / ${snapshot.objectives.reachObjectiveTarget}; field budget ${formatAmount(snapshot.bubble.fieldBudget)}.`,
    actionLabel: complete ? null : "Let the bubble expand",
    action: complete ? null : { type: "tick", seconds: 120 },
  }
}

function unlockRecruitmentStep(snapshot: SimulationSnapshot): AddFirstPlayableStepResult {
  const complete = snapshot.objectives.recruitmentEnabled
  return {
    complete,
    detail: complete
      ? "The Survivor Cave is close enough to recruit from."
      : `Recruitment opens when the bubble closes the cave gap. Current reach ${snapshot.bubble.reachFromBase}; cave distance ${snapshot.objectives.survivorCaveDistance}.`,
    actionLabel: complete ? null : "Hold the field",
    action: complete ? null : { type: "tick", seconds: 120 },
  }
}

function recruitOnceStep(snapshot: SimulationSnapshot): AddFirstPlayableStepResult {
  const complete =
    snapshot.recruitment.totalRecruitedThisRun > 0 || snapshot.roster.totalCrew > 2
  if (!complete && !snapshot.objectives.recruitmentEnabled) {
    return {
      complete,
      detail: "Recruitment is waiting on bubble reach.",
      actionLabel: null,
      action: null,
    }
  }
  if (!complete && snapshot.resources.vibes < snapshot.recruitment.nextRecruitCost) {
    if (snapshot.base.firePitBuilt && roleCrew(snapshot, ROLE_FIRE_PIT) < 1) {
      if (roleCrew(snapshot, ROLE_CRYSTAL_BASSLINE) > 1) {
        return {
          complete,
          detail: "Free one crew member from Bassline so the Fire Pit can start producing Vibes.",
          actionLabel: "Free Fire Pit crew",
          action: { type: "set_role_crew", roleId: ROLE_CRYSTAL_BASSLINE, crew: 1 },
        }
      }
      if (roleCrew(snapshot, ROLE_SCAVENGE) > 0) {
        return {
          complete,
          detail: "Move a scavenger into Fire Pit duty to start the recruitment loop.",
          actionLabel: "Free Fire Pit crew",
          action: { type: "set_role_crew", roleId: ROLE_SCAVENGE, crew: 0 },
        }
      }
      if (roleCrew(snapshot, ROLE_CONSTRUCTION) > 0) {
        return {
          complete,
          detail: "Move a builder into Fire Pit duty to start the recruitment loop.",
          actionLabel: "Free Fire Pit crew",
          action: { type: "set_role_crew", roleId: ROLE_CONSTRUCTION, crew: 0 },
        }
      }
      return {
        complete,
        detail: `Need ${formatAmount(snapshot.recruitment.nextRecruitCost)} Vibes for the first recruit.`,
        actionLabel: "Assign Fire Pit crew",
        action: { type: "set_role_crew", roleId: ROLE_FIRE_PIT, crew: 1 },
      }
    }
    return {
      complete,
      detail: `Vibes ${formatAmount(snapshot.resources.vibes)} / ${formatAmount(snapshot.recruitment.nextRecruitCost)} for the first recruit.`,
      actionLabel: "Build Vibes",
      action: { type: "tick", seconds: 120 },
    }
  }
  if (!complete) {
    return {
      complete,
      detail: "The cave is in reach and Vibes can pay the first recruitment cost.",
      actionLabel: "Recruit survivor",
      action: { type: "recruit_from_survivor_cave" },
    }
  }
  return {
    complete,
    detail: "The first recruit is committed and the run has opened into growth.",
    actionLabel: null,
    action: null,
  }
}

function worldActionStepAction(
  snapshot: SimulationSnapshot,
  activeBeat: StoryBeatDef | null,
  actionId: string,
  startLabel: string,
): Pick<AddFirstPlayableStep, "actionLabel" | "action"> {
  if (snapshot.activeWorldAction?.actionId === actionId) {
    return {
      actionLabel: "Advance action",
      action: { type: "tick", seconds: snapshot.activeWorldAction.remainingSeconds + 0.25 },
    }
  }
  const choice = storyChoiceAction(snapshot, activeBeat)
  if (activeBeat?.worldActionId === actionId && choice.action) return choice
  if (!snapshot.roster.heroAssigned) {
    return {
      actionLabel: "Assign Hero",
      action: { type: "assign_hero", assigned: true },
    }
  }
  return {
    actionLabel: startLabel,
    action: { type: "start_world_action", actionId },
  }
}

function storyChoiceAction(
  snapshot: SimulationSnapshot,
  activeBeat: StoryBeatDef | null,
): Pick<AddFirstPlayableStep, "actionLabel" | "action"> {
  if (!activeBeat || activeBeat.choices.length === 0) {
    return { actionLabel: null, action: null }
  }
  if (storyChoiceSelected(snapshot, activeBeat.id)) {
    return { actionLabel: null, action: null }
  }
  const firstChoice = activeBeat.choices[0]
  return {
    actionLabel: firstChoice.label,
    action: {
      type: "choose_story_option",
      beatId: activeBeat.id,
      optionId: firstChoice.id,
    },
  }
}

function constructionStep(
  snapshot: SimulationSnapshot,
  label: string,
  complete: boolean,
  optionId: string,
  startLabel: string,
  copy: string,
): AddFirstPlayableStepResult {
  if (complete) {
    return {
      complete,
      detail: `${label} is complete.`,
      actionLabel: null,
      action: null,
    }
  }
  if (snapshot.activeConstruction?.optionId === optionId) {
    if (snapshot.roster.heroRoleId !== ROLE_CONSTRUCTION || !snapshot.roster.heroAssigned) {
      return {
        complete,
        detail: copy,
        actionLabel: "Send Hero to build",
        action: { type: "set_hero_role", roleId: ROLE_CONSTRUCTION },
      }
    }
    if (!roleHasWorker(snapshot, ROLE_CONSTRUCTION)) {
      return {
        complete,
        detail: copy,
        actionLabel: "Assign build crew",
        action: { type: "set_role_crew", roleId: ROLE_CONSTRUCTION, crew: 2 },
      }
    }
    return {
      complete,
      detail: `${copy} Remaining ${formatAmount(snapshot.activeConstruction.remainingWorkSeconds)}s.`,
      actionLabel: "Advance construction",
      action: { type: "tick", seconds: snapshot.activeConstruction.remainingWorkSeconds + 0.5 },
    }
  }
  return {
    complete,
    detail: copy,
    actionLabel: startLabel,
    action: { type: "start_construction", optionId },
  }
}

function roleCrew(snapshot: SimulationSnapshot, roleId: string): number {
  const crewByRole = snapshot.roster.crewByRole as
    | Record<string, number>
    | Map<string, number>
    | undefined
  if (!crewByRole) return 0
  if (typeof (crewByRole as Map<string, number>).get === "function") {
    return Number((crewByRole as Map<string, number>).get(roleId) ?? 0)
  }
  return Number((crewByRole as Record<string, number>)[roleId] ?? 0)
}

function roleHasWorker(snapshot: SimulationSnapshot, roleId: string): boolean {
  return (
    roleCrew(snapshot, roleId) > 0 ||
    (snapshot.roster.heroAssigned && snapshot.roster.heroRoleId === roleId)
  )
}

function storyChoiceSelected(snapshot: SimulationSnapshot, beatId: string): boolean {
  const choiceByBeat = snapshot.narrative.choiceByBeat as
    | Record<string, string>
    | Map<string, string>
    | undefined
  if (!choiceByBeat) return false
  if (typeof (choiceByBeat as Map<string, string>).has === "function") {
    return (choiceByBeat as Map<string, string>).has(beatId)
  }
  return Boolean((choiceByBeat as Record<string, string>)[beatId])
}

function formatAmount(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(1)
}
