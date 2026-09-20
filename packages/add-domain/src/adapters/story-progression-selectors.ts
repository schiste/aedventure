import type {
  BlockerDef,
  CatalogSnapshot,
  ConstructionOptionDef,
  CostDef,
  RequirementDef,
  SimulationSnapshot,
  StoryBeatDef,
  StoryPrimaryActionDef,
  UnlockDef,
} from "@aedventure/add-protocol"
import type { AddDomainCommand } from "./command-mapping"
import { RESOURCE_BASSLINE, ROLE_CRYSTAL_BASSLINE } from "./add-ids"
import {
  selectedStoryChoiceId,
  storyBeatCompleted,
  storyChoiceSelected,
  storyFlagSet,
} from "./story-state-readers"

const FIRST_PLAYABLE_FALLBACK_ARC = "base_onboarding"

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

export interface AddStoryCommandProjectionCommand {
  readonly id: string
  readonly label: string
  readonly enabled: boolean
  readonly disabledReason: string | null
  readonly command: AddDomainCommand
  readonly related: {
    readonly beatId: string | null
    readonly optionId: string | null
    readonly actionId: string | null
    readonly constructionId: string | null
    readonly resourceIds: readonly string[]
    readonly roleId: string | null
  }
}

export interface AddStoryCommandProjection {
  readonly commands: readonly AddStoryCommandProjectionCommand[]
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

// Deprecated compatibility export. First-playable steps are now derived from
// StoryBeatDef.progression metadata in the catalog.
export const ADD_FIRST_PLAYABLE_SCRIPT: readonly Pick<AddFirstPlayableStep, "id" | "label">[] =
  []

export function selectAddStoryProgressionState(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  commandProjection: AddStoryCommandProjection | null = null,
): AddStoryProgressionState {
  const activeBeat = selectActiveStoryBeat(snapshot, catalog)
  const firstPlayable = selectFirstPlayableSummary(snapshot, catalog, activeBeat, commandProjection)
  const allBeats = catalog.storyBeats
    .slice()
    .sort(compareStoryBeats)
    .map((beat) => storyBeatProgressionEntry(snapshot, beat, activeBeat?.id ?? null))
  const completedBeats = allBeats.filter((beat) => beat.status === "completed")
  const currentBeats = allBeats.filter((beat) => beat.status === "current")
  const upcomingBeats = allBeats.filter((beat) => beat.status === "upcoming")
  const currentChoiceState = selectCurrentChoiceState(snapshot, activeBeat)
  const primaryAction = selectStoryPrimaryAction(activeBeat, firstPlayable)
  const blocker = selectStoryProgressionBlocker(activeBeat, currentChoiceState, primaryAction, firstPlayable)
  const nextLikelyBeat = selectNextLikelyBeat(snapshot, catalog, activeBeat)
  const unlockPreview = selectUnlockPreview(catalog, firstPlayable, activeBeat, nextLikelyBeat)

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
  commandProjection: AddStoryCommandProjection | null,
): AddFirstPlayableSummary {
  const beats = firstPlayableBeats(catalog)
  const stepsWithoutActive = beats.map((beat) =>
    firstPlayableStepForBeat(snapshot, catalog, beat, activeBeat, commandProjection),
  )
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

function firstPlayableBeats(catalog: CatalogSnapshot): readonly StoryBeatDef[] {
  return catalog.storyBeats
    .filter(
      (beat) =>
        beat.progression?.track === "first_playable" ||
        (beat.arc === FIRST_PLAYABLE_FALLBACK_ARC && beat.progression !== null),
    )
    .sort(compareFirstPlayableBeats)
}

function compareFirstPlayableBeats(a: StoryBeatDef, b: StoryBeatDef): number {
  const sequence = a.sequence - b.sequence
  if (sequence !== 0) return sequence
  return a.arc.localeCompare(b.arc)
}

function firstPlayableStepForBeat(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  beat: StoryBeatDef,
  activeBeat: StoryBeatDef | null,
  commandProjection: AddStoryCommandProjection | null,
): AddFirstPlayableStep {
  const progression = beat.progression ?? null
  const actionDef = progression?.primaryAction ?? inferredPrimaryAction(beat)
  const action = actionForStoryPrimaryAction(
    snapshot,
    catalog,
    beat,
    activeBeat,
    actionDef,
    commandProjection,
  )
  return {
    id: progression?.stepId ?? beat.id,
    label: progression?.presentation?.shortLabel ?? beat.label,
    complete: firstPlayableBeatComplete(snapshot, catalog, beat, activeBeat, actionDef),
    active: false,
    detail: progression?.presentation?.playerHint ?? beat.body,
    actionLabel: action.actionLabel ?? progression?.presentation?.ctaCopy ?? null,
    action: action.action,
  }
}

function firstPlayableBeatComplete(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  beat: StoryBeatDef,
  activeBeat: StoryBeatDef | null,
  actionDef: StoryPrimaryActionDef | null,
): boolean {
  if (storyBeatCompleted(snapshot, beat.id)) return true
  if (actionDef?.kind === "preview_route_to_base") {
    return heroReachedBase(snapshot, catalog) && storyBeatCompleted(snapshot, beat.id)
  }
  if (actionDef?.kind === "none" && activeBeat?.id === beat.id) return true
  return false
}

function inferredPrimaryAction(beat: StoryBeatDef): StoryPrimaryActionDef | null {
  if (beat.worldActionId) return { kind: "world_action", actionId: beat.worldActionId }
  if (beat.choices.length > 0) return { kind: "story_choice" }
  return null
}

function actionForStoryPrimaryAction(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  beat: StoryBeatDef,
  activeBeat: StoryBeatDef | null,
  actionDef: StoryPrimaryActionDef | null,
  commandProjection: AddStoryCommandProjection | null,
): Pick<AddFirstPlayableStep, "actionLabel" | "action"> {
  if (!actionDef) return { actionLabel: null, action: null }
  switch (actionDef.kind) {
    case "story_choice":
      return activeBeat?.id === beat.id
        ? storyChoiceAction(snapshot, activeBeat, commandProjection)
        : { actionLabel: null, action: null }
    case "preview_route_to_base":
      if (!heroReachedBase(snapshot, catalog)) {
        return { actionLabel: "Preview route to Studio", action: { type: "preview_route_to_base" } }
      }
      return activeBeat?.id === beat.id
        ? storyChoiceAction(snapshot, activeBeat, commandProjection)
        : { actionLabel: null, action: null }
    case "world_action":
      return worldActionStepAction(
        snapshot,
        activeBeat,
        beat,
        storyActionString(actionDef, "actionId", "action_id") ?? beat.worldActionId,
        commandProjection,
      )
    case "construction":
      return constructionStepAction(snapshot, catalog, actionDef, commandProjection)
    case "assign_role":
      return assignRoleAction(snapshot, actionDef, commandProjection)
    case "tick":
      return tickStepAction(snapshot, beat, actionDef)
    case "recruit_from_survivor_cave":
      return recruitFromSurvivorCaveAction(snapshot, actionDef, commandProjection)
    case "none":
      return { actionLabel: null, action: null }
  }
}

function worldActionStepAction(
  snapshot: SimulationSnapshot,
  activeBeat: StoryBeatDef | null,
  beat: StoryBeatDef,
  actionId: string | null,
  commandProjection: AddStoryCommandProjection | null,
): Pick<AddFirstPlayableStep, "actionLabel" | "action"> {
  if (!actionId) return { actionLabel: null, action: null }
  if (snapshot.activeWorldAction?.actionId === actionId) {
    return {
      actionLabel: "Advance action",
      action: { type: "tick", seconds: snapshot.activeWorldAction.remainingSeconds + 0.25 },
    }
  }
  if (activeBeat?.id === beat.id) {
    const choice = storyChoiceAction(snapshot, activeBeat, commandProjection)
    if (choice.action) return choice
  }
  if (!snapshot.roster.heroAssigned) {
    const assignHero = projectedCommandAction(commandProjection, (command) =>
      command.command.kind === "assign_hero" && command.command.assigned === true,
    )
    return assignHero ?? { actionLabel: "Assign Hero", action: { type: "assign_hero", assigned: true } }
  }
  const worldAction = projectedCommandAction(commandProjection, (command) =>
    command.command.kind === "start_world_action" && command.command.actionId === actionId,
  )
  if (worldAction) return worldAction
  if (commandProjection) {
    return {
      actionLabel: null,
      action: null,
    }
  }
  return { actionLabel: beat.progression?.presentation?.ctaCopy ?? beat.label, action: { type: "start_world_action", actionId } }
}

function constructionStepAction(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  action: Extract<StoryPrimaryActionDef, { kind: "construction" }>,
  commandProjection: AddStoryCommandProjection | null,
): Pick<AddFirstPlayableStep, "actionLabel" | "action"> {
  const optionId = storyActionString(action, "optionId", "option_id")
  if (!optionId) return { actionLabel: null, action: null }
  const option = catalog.constructionOptions.find((candidate) => candidate.id === optionId)
  const constructionCommand = projectedCommand(commandProjection, (command) =>
    command.command.kind === "start_construction" && command.command.optionId === optionId,
  )
  const canStartConstructionNow =
    option !== undefined &&
    !snapshot.activeConstruction &&
    requirementsMet(snapshot, option.requirements) &&
    canAffordConstruction(snapshot, option)
  const buildRoleId = storyActionString(action, "buildRoleId", "build_role_id")
  const gatherRoleId = storyActionString(action, "gatherRoleId", "gather_role_id")
  const targetCrew = storyActionNumber(action, "crew", "crew") ?? 1
  if (snapshot.activeConstruction?.optionId === optionId) {
    if (buildRoleId && (!snapshot.roster.heroAssigned || snapshot.roster.heroRoleId !== buildRoleId)) {
      const heroRole = projectedCommandAction(commandProjection, (command) =>
        command.command.kind === "set_hero_role" && command.command.roleId === buildRoleId,
      )
      return heroRole ?? { actionLabel: "Send Hero to build", action: { type: "set_hero_role", roleId: buildRoleId } }
    }
    if (buildRoleId && roleCrew(snapshot, buildRoleId) < 1) {
      const crew = projectedCommandAction(commandProjection, (command) =>
        command.command.kind === "set_role_crew" && command.command.roleId === buildRoleId,
      )
      return crew ?? { actionLabel: "Assign build crew", action: { type: "set_role_crew", roleId: buildRoleId, crew: targetCrew } }
    }
    return {
      actionLabel: "Advance construction",
      action: { type: "tick", seconds: snapshot.activeConstruction.remainingWorkSeconds + 0.5 },
    }
  }
  const missingConstructionResources =
    option !== undefined && !canAffordConstruction(snapshot, option)
  if (option && missingConstructionResources) {
    if (gatherRoleId && (!snapshot.roster.heroAssigned || snapshot.roster.heroRoleId !== gatherRoleId)) {
      const heroRole = projectedCommandAction(commandProjection, (command) =>
        command.command.kind === "set_hero_role" && command.command.roleId === gatherRoleId,
      )
      return heroRole ?? { actionLabel: "Send Hero scavenging", action: { type: "set_hero_role", roleId: gatherRoleId } }
    }
    if (gatherRoleId && roleCrew(snapshot, gatherRoleId) < 1) {
      const crew = projectedCommandAction(commandProjection, (command) =>
        command.command.kind === "set_role_crew" && command.command.roleId === gatherRoleId,
      )
      return crew ?? { actionLabel: "Assign gather crew", action: { type: "set_role_crew", roleId: gatherRoleId, crew: targetCrew } }
    }
    return { actionLabel: "Gather resources", action: { type: "tick", seconds: storyActionWaitSeconds(action) } }
  }
  const startConstruction = projectedCommandAction(commandProjection, (command) =>
    command.command.kind === "start_construction" && command.command.optionId === optionId,
  )
  if (startConstruction) return startConstruction
  if (canStartConstructionNow) {
    return {
      actionLabel: option ? `Start ${option.label}` : "Start construction",
      action: { type: "start_construction", optionId },
    }
  }
  if (commandProjection) return { actionLabel: null, action: null }
  return {
    actionLabel: option ? `Start ${option.label}` : "Start construction",
    action: { type: "start_construction", optionId },
  }
}

function assignRoleAction(
  snapshot: SimulationSnapshot,
  action: Extract<StoryPrimaryActionDef, { kind: "assign_role" }>,
  commandProjection: AddStoryCommandProjection | null,
): Pick<AddFirstPlayableStep, "actionLabel" | "action"> {
  const roleId = storyActionString(action, "roleId", "role_id")
  if (!roleId) return { actionLabel: null, action: null }
  const assignHero = storyActionBoolean(action, "assignHero", "assign_hero") ?? false
  if (assignHero && (!snapshot.roster.heroAssigned || snapshot.roster.heroRoleId !== roleId)) {
    const heroRole = projectedCommandAction(commandProjection, (command) =>
      command.command.kind === "set_hero_role" && command.command.roleId === roleId,
    )
    return heroRole ?? { actionLabel: "Assign Hero", action: { type: "set_hero_role", roleId } }
  }
  const crew = storyActionNumber(action, "crew", "crew") ?? 1
  if (roleCrew(snapshot, roleId) < crew) {
    const crewCommand = projectedCommandAction(commandProjection, (command) =>
      command.command.kind === "set_role_crew" && command.command.roleId === roleId,
    )
    return crewCommand ?? { actionLabel: "Assign crew", action: { type: "set_role_crew", roleId, crew } }
  }
  return { actionLabel: null, action: null }
}

function recruitFromSurvivorCaveAction(
  snapshot: SimulationSnapshot,
  action: Extract<StoryPrimaryActionDef, { kind: "recruit_from_survivor_cave" }>,
  commandProjection: AddStoryCommandProjection | null,
): Pick<AddFirstPlayableStep, "actionLabel" | "action"> {
  if (!snapshot.objectives.recruitmentEnabled) {
    return { actionLabel: "Hold the field", action: { type: "tick", seconds: storyActionWaitSeconds(action) } }
  }
  if (snapshot.resources.vibes < snapshot.recruitment.nextRecruitCost) {
    const vibesRoleId = storyActionString(action, "vibesRoleId", "vibes_role_id")
    if (vibesRoleId && roleCrew(snapshot, vibesRoleId) < 1) {
      const crew = projectedCommandAction(commandProjection, (command) =>
        command.command.kind === "set_role_crew" && command.command.roleId === vibesRoleId,
      )
      return crew ?? { actionLabel: "Assign Fire Pit crew", action: { type: "set_role_crew", roleId: vibesRoleId, crew: 1 } }
    }
    return { actionLabel: "Build Vibes", action: { type: "tick", seconds: storyActionWaitSeconds(action) } }
  }
  const recruit = projectedCommandAction(commandProjection, (command) =>
    command.command.kind === "recruit_from_survivor_cave",
  )
  return recruit ?? { actionLabel: "Recruit survivor", action: { type: "recruit_from_survivor_cave" } }
}

function tickStepAction(
  snapshot: SimulationSnapshot,
  beat: StoryBeatDef,
  action: Extract<StoryPrimaryActionDef, { kind: "tick" }>,
): Pick<AddFirstPlayableStep, "actionLabel" | "action"> {
  if (tickNeedsBasslineStaff(beat) && roleCrew(snapshot, ROLE_CRYSTAL_BASSLINE) < 1) {
    return {
      actionLabel: "Staff Bassline",
      action: { type: "set_role_crew", roleId: ROLE_CRYSTAL_BASSLINE, crew: 2 },
    }
  }
  return {
    actionLabel: beat.progression?.presentation?.ctaCopy ?? "Let time pass",
    action: { type: "tick", seconds: storyActionWaitSeconds(action) },
  }
}

function tickNeedsBasslineStaff(beat: StoryBeatDef): boolean {
  return (
    beat.relatedIds.includes(RESOURCE_BASSLINE) ||
    (beat.progression?.blockers ?? []).some((blocker) =>
      blocker.relatedIds.includes(RESOURCE_BASSLINE),
    )
  )
}

function storyActionString(
  action: StoryPrimaryActionDef,
  camelKey: string,
  snakeKey: string,
): string | null {
  const record = action as unknown as Record<string, unknown>
  const value = record[camelKey] ?? record[snakeKey]
  return typeof value === "string" && value.length > 0 ? value : null
}

function storyActionNumber(
  action: StoryPrimaryActionDef,
  camelKey: string,
  snakeKey: string,
): number | null {
  const record = action as unknown as Record<string, unknown>
  const value = record[camelKey] ?? record[snakeKey]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function storyActionBoolean(
  action: StoryPrimaryActionDef,
  camelKey: string,
  snakeKey: string,
): boolean | null {
  const record = action as unknown as Record<string, unknown>
  const value = record[camelKey] ?? record[snakeKey]
  return typeof value === "boolean" ? value : null
}

function storyActionWaitSeconds(action: StoryPrimaryActionDef): number {
  return (
    storyActionNumber(action, "waitSeconds", "wait_seconds") ??
    storyActionNumber(action, "seconds", "seconds") ??
    0
  )
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
  if (storyBeatCompleted(snapshot, beatId)) return "completed"
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
  activeBeat: StoryBeatDef | null,
  firstPlayable: AddFirstPlayableSummary,
): AddStoryPrimaryAction {
  const activeStep = firstPlayable.steps.find((step) => step.active) ?? null
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
  if (choiceState.awaitingChoice && primaryAction.source !== "first_playable") {
    return {
      kind: "choice_required",
      label: "Choose a story option",
      detail: "The active story beat is waiting for the player to choose how to proceed.",
      relatedIds: activeBeat ? [activeBeat.id] : [],
    }
  }
  const activeStep = firstPlayable.steps.find((step) => step.active)
  const activeBeatBlocker = activeBeat?.progression?.blockers?.[0] ?? null
  if (activeStep && !firstPlayable.complete) {
    return {
      kind: "first_playable",
      label: activeBeatBlocker?.label ?? activeStep.label,
      detail: activeStep.detail,
      relatedIds: activeBeatBlocker?.relatedIds ?? (activeBeat ? [activeBeat.id] : []),
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
  firstPlayable: AddFirstPlayableSummary,
  activeBeat: StoryBeatDef | null,
  nextLikelyBeat: StoryBeatDef | null,
): readonly AddStoryUnlockPreview[] {
  const activeStep = firstPlayable.steps.find((step) => step.active) ?? null
  const activeProgressionBeat = activeStep
    ? firstPlayableBeats(catalog).find((beat) => (beat.progression?.stepId ?? beat.id) === activeStep.id)
    : null
  const authoredUnlocks = activeProgressionBeat?.progression?.unlocks ?? []
  if (authoredUnlocks.length > 0) return authoredUnlocks.map(unlockPreviewFromUnlock)

  const ids = new Set<string>()
  activeBeat?.relatedIds.forEach((id) => ids.add(id))
  nextLikelyBeat?.relatedIds.forEach((id) => ids.add(id))
  return [...ids].slice(0, 8).map((id) => ({
    id,
    ...relatedIdPresentation(catalog, id),
  }))
}

function unlockPreviewFromUnlock(unlock: UnlockDef): AddStoryUnlockPreview {
  return {
    id: unlock.relatedIds[0] ?? unlock.label,
    label: unlock.label,
    kind: unlock.kind,
  }
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

function canAffordConstruction(
  snapshot: SimulationSnapshot,
  option: ConstructionOptionDef,
): boolean {
  return canAffordCost(snapshot, option.cost)
}

function requirementsMet(
  snapshot: SimulationSnapshot,
  requirements: readonly RequirementDef[],
): boolean {
  return requirements.every((requirement) => {
    switch (requirement.kind) {
      case "flag_set":
        return storyFlagSet(snapshot, requirement.flag_id)
      case "flag_unset":
        return !storyFlagSet(snapshot, requirement.flag_id)
    }
  })
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
    case "cost.skin":
      return snapshot.base.skins
    default:
      return 0
  }
}

function roleCrew(snapshot: SimulationSnapshot, roleId: string): number {
  return Number(snapshot.roster.crewByRole[roleId] ?? 0)
}

function storyChoiceAction(
  snapshot: SimulationSnapshot,
  activeBeat: StoryBeatDef | null,
  commandProjection: AddStoryCommandProjection | null,
): Pick<AddFirstPlayableStep, "actionLabel" | "action"> {
  if (!activeBeat || activeBeat.choices.length === 0) {
    return { actionLabel: null, action: null }
  }
  const projectedChoice = projectedCommandAction(commandProjection, (command) =>
    command.command.kind === "choose_story_option" && command.command.beatId === activeBeat.id,
  )
  if (projectedChoice) return projectedChoice
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

function projectedCommandAction(
  projection: AddStoryCommandProjection | null,
  matches: (command: AddStoryCommandProjectionCommand) => boolean,
): Pick<AddFirstPlayableStep, "actionLabel" | "action"> | null {
  const command = projectedCommand(projection, matches)
  if (!command?.enabled) return null
  const action = firstPlayableActionFromDomainCommand(command.command)
  return action ? { actionLabel: command.label, action } : null
}

function projectedCommand(
  projection: AddStoryCommandProjection | null,
  matches: (command: AddStoryCommandProjectionCommand) => boolean,
): AddStoryCommandProjectionCommand | null {
  return projection?.commands.find(matches) ?? null
}

function firstPlayableActionFromDomainCommand(
  command: AddDomainCommand,
): AddFirstPlayableAction | null {
  switch (command.kind) {
    case "choose_story_option":
      return { type: "choose_story_option", beatId: command.beatId, optionId: command.optionId }
    case "assign_hero":
      return { type: "assign_hero", assigned: command.assigned }
    case "set_hero_role":
      return { type: "set_hero_role", roleId: command.roleId }
    case "set_role_crew":
      return { type: "set_role_crew", roleId: command.roleId, crew: command.crew }
    case "start_world_action":
      return { type: "start_world_action", actionId: command.actionId }
    case "start_construction":
      return { type: "start_construction", optionId: command.optionId }
    case "tick":
      return { type: "tick", seconds: command.seconds }
    case "recruit_from_survivor_cave":
      return { type: "recruit_from_survivor_cave" }
    default:
      return null
  }
}

function idKind(id: string): string {
  return id.includes(".") ? id.split(".")[0] : "id"
}
