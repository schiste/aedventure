import type {
  CatalogSnapshot,
  ConditionDef,
  SimulationSnapshot,
  StoryBeatDef,
} from "@aedventure/add-protocol"
import { ADD_CONTENT_VALIDATION_VERSION } from "@aedventure/add-content"
import {
  type AddAvailableCommand,
  type AddAvailableCommandsState,
  selectAddAvailableCommands,
} from "./available-commands-selectors"
import { selectAddStoryProgressionState } from "./story-progression-selectors"
import {
  selectedStoryChoiceId,
  storyBeatCompleted,
  storyFlagSet,
  storyQualityEntries,
  storyQualityValue,
} from "./story-state-readers"
import { selectAddResourceSummaries, selectAddRoleAssignmentSummaries } from "./ui-selectors"

export interface AddStoryBrowserBeatRef {
  readonly id: string
  readonly label: string
  readonly arc: string
  readonly sequence: number
  readonly priority: number
  readonly repeatable: boolean
}

export interface AddStoryBrowserChoice {
  readonly beatId: string
  readonly beatLabel: string
  readonly optionId: string
  readonly optionLabel: string
}

export interface AddStoryBrowserQuality {
  readonly key: string
  readonly value: number
}

export interface AddStoryBrowserCommand {
  readonly id: string
  readonly label: string
  readonly kind: AddAvailableCommand["kind"]
  readonly enabled: boolean
  readonly disabledReason: string | null
  readonly workerType: AddAvailableCommand["workerRequest"]["type"]
  readonly relatedBeatId: string | null
  readonly relatedActionId: string | null
}

export interface AddStoryConditionEvaluation {
  readonly kind: string
  readonly label: string
  readonly passed: boolean
  readonly detail: string
  readonly source: "typescript_best_effort"
  readonly children?: readonly AddStoryConditionEvaluation[]
}

export interface AddStoryBeatEligibility {
  readonly authority: "typescript_best_effort"
  readonly beat: AddStoryBrowserBeatRef
  readonly active: boolean
  readonly completed: boolean
  readonly eligible: boolean
  readonly autoCompleteReady: boolean
  readonly reason: string
  readonly preconditions: readonly AddStoryConditionEvaluation[]
  readonly autoCompleteWhen: readonly AddStoryConditionEvaluation[]
}

export interface AddStoryContentBrowserState {
  readonly contract: "add_story_content_browser_v1"
  readonly authority: {
    readonly storyState: "rust_runtime"
    readonly choices: "rust_runtime"
    readonly commands: "typescript_projection_to_rust_worker"
    readonly beatEligibility: "typescript_best_effort"
  }
  readonly contentValidationVersion: string
  readonly activeBeat: AddStoryBrowserBeatRef | null
  readonly completedBeats: readonly AddStoryBrowserBeatRef[]
  readonly choicesMade: readonly AddStoryBrowserChoice[]
  readonly qualities: readonly AddStoryBrowserQuality[]
  readonly availableCommands: readonly AddStoryBrowserCommand[]
  readonly beatEligibility: readonly AddStoryBeatEligibility[]
  readonly summary: {
    readonly activeBeatId: string | null
    readonly completedCount: number
    readonly eligibleCount: number
    readonly blockedCount: number
    readonly commandCount: number
    readonly enabledCommandCount: number
  }
}

interface ConditionEvaluationContext {
  readonly resources: ReadonlyMap<string, number>
  readonly roles: ReadonlyMap<string, boolean>
}

export function selectAddStoryContentBrowserState(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  availableCommands: AddAvailableCommandsState = selectAddAvailableCommands(snapshot, catalog),
): AddStoryContentBrowserState {
  const progression = selectAddStoryProgressionState(snapshot, catalog, availableCommands)
  const conditionContext = createConditionEvaluationContext(snapshot, catalog)
  const beatEligibility = catalog.storyBeats
    .slice()
    .sort(compareStoryBeats)
    .map((beat) => storyBeatEligibility(snapshot, beat, conditionContext))

  return {
    contract: "add_story_content_browser_v1",
    authority: {
      storyState: "rust_runtime",
      choices: "rust_runtime",
      commands: "typescript_projection_to_rust_worker",
      beatEligibility: "typescript_best_effort",
    },
    contentValidationVersion: ADD_CONTENT_VALIDATION_VERSION,
    activeBeat: progression.activeBeat ? beatRef(progression.activeBeat) : null,
    completedBeats: progression.completedBeats.map((beat) => ({
      id: beat.id,
      label: beat.label,
      arc: beat.arc,
      sequence: beat.sequence,
      priority: 0,
      repeatable: false,
    })),
    choicesMade: storyChoicesMade(snapshot, catalog),
    qualities: storyQualityEntries(snapshot),
    availableCommands: availableCommands.commands.map(commandRef),
    beatEligibility,
    summary: {
      activeBeatId: progression.activeBeat?.id ?? null,
      completedCount: progression.completedBeats.length,
      eligibleCount: beatEligibility.filter((beat) => beat.eligible).length,
      blockedCount: beatEligibility.filter((beat) => !beat.eligible && !beat.completed).length,
      commandCount: availableCommands.commands.length,
      enabledCommandCount: availableCommands.enabledCommands.length,
    },
  }
}

function storyBeatEligibility(
  snapshot: SimulationSnapshot,
  beat: StoryBeatDef,
  context: ConditionEvaluationContext,
): AddStoryBeatEligibility {
  const active = snapshot.narrative.activeBeatId === beat.id
  const completed = storyBeatCompleted(snapshot, beat.id)
  const preconditions = (beat.preconditions ?? []).map((condition) =>
    evaluateCondition(snapshot, condition, context),
  )
  const autoCompleteWhen = (beat.autoCompleteWhen ?? []).map((condition) =>
    evaluateCondition(snapshot, condition, context),
  )
  const preconditionsPassed = preconditions.every((condition) => condition.passed)
  const blockedByCompletion = completed && !beat.repeatable
  const eligible = !blockedByCompletion && preconditionsPassed
  const autoCompleteReady = autoCompleteWhen.length > 0 && autoCompleteWhen.every((condition) => condition.passed)

  return {
    authority: "typescript_best_effort",
    beat: beatRef(beat),
    active,
    completed,
    eligible,
    autoCompleteReady,
    reason: eligibilityReason({
      active,
      completed,
      repeatable: Boolean(beat.repeatable),
      eligible,
      preconditions,
      autoCompleteReady,
    }),
    preconditions,
    autoCompleteWhen,
  }
}

function eligibilityReason(input: {
  readonly active: boolean
  readonly completed: boolean
  readonly repeatable: boolean
  readonly eligible: boolean
  readonly preconditions: readonly AddStoryConditionEvaluation[]
  readonly autoCompleteReady: boolean
}): string {
  if (input.active) return "Active beat selected by Rust; eligibility details are a TS best-effort mirror."
  if (input.completed && !input.repeatable) return "Completed and non-repeatable."
  const firstBlocked = input.preconditions.find((condition) => !condition.passed)
  if (firstBlocked) return firstBlocked.detail
  if (input.autoCompleteReady) return "Eligible, and its completion condition is already satisfied."
  if (input.eligible) return "Eligible; runtime priority and sequence decide whether it becomes active."
  return "Not eligible under the current snapshot."
}

function evaluateCondition(
  snapshot: SimulationSnapshot,
  condition: ConditionDef,
  context: ConditionEvaluationContext,
): AddStoryConditionEvaluation {
  switch (condition.kind) {
    case "always":
      return conditionResult(condition.kind, "Always", true, "Always passes.")
    case "flag_set": {
      const passed = storyFlagSet(snapshot, condition.flag_id)
      return conditionResult(
        condition.kind,
        `Flag set: ${condition.flag_id}`,
        passed,
        passed ? `${condition.flag_id} is set.` : `${condition.flag_id} is not set.`,
      )
    }
    case "flag_unset": {
      const passed = !storyFlagSet(snapshot, condition.flag_id)
      return conditionResult(
        condition.kind,
        `Flag unset: ${condition.flag_id}`,
        passed,
        passed ? `${condition.flag_id} is unset.` : `${condition.flag_id} is already set.`,
      )
    }
    case "resource_at_least": {
      const value = context.resources.get(condition.resource_id) ?? 0
      const passed = value >= condition.amount
      return conditionResult(
        condition.kind,
        `${condition.resource_id} >= ${condition.amount}`,
        passed,
        passed
          ? `${condition.resource_id} is ${formatAmount(value)}.`
          : `${condition.resource_id} is ${formatAmount(value)}, below ${formatAmount(condition.amount)}.`,
      )
    }
    case "bubble_reach_at_least": {
      const passed = snapshot.bubble.reachFromBase >= condition.n
      return conditionResult(
        condition.kind,
        `Bubble reach >= ${condition.n}`,
        passed,
        `Bubble reach is ${snapshot.bubble.reachFromBase}.`,
      )
    }
    case "clock_seconds_at_least": {
      const passed = snapshot.clockSeconds >= condition.seconds
      return conditionResult(
        condition.kind,
        `Clock >= ${condition.seconds}s`,
        passed,
        `Clock is ${Math.floor(snapshot.clockSeconds)}s.`,
      )
    }
    case "quality_at_least": {
      const value = storyQualityValue(snapshot, condition.key)
      const passed = value >= condition.value
      return conditionResult(
        condition.kind,
        `${condition.key} >= ${condition.value}`,
        passed,
        `${condition.key} is ${value}.`,
      )
    }
    case "beat_completed": {
      const passed = storyBeatCompleted(snapshot, condition.beat_id)
      return conditionResult(
        condition.kind,
        `Beat completed: ${condition.beat_id}`,
        passed,
        passed ? `${condition.beat_id} is complete.` : `${condition.beat_id} is not complete.`,
      )
    }
    case "choice_made": {
      const selected = selectedStoryChoiceId(snapshot, condition.beat_id)
      const passed = selected === condition.option_id
      return conditionResult(
        condition.kind,
        `Choice made: ${condition.option_id}`,
        passed,
        selected
          ? `${condition.beat_id} selected ${selected}.`
          : `${condition.beat_id} has no selected choice.`,
      )
    }
    case "role_available": {
      const passed = context.roles.get(condition.role_id) ?? false
      return conditionResult(
        condition.kind,
        `Role available: ${condition.role_id}`,
        passed,
        passed ? `${condition.role_id} is available.` : `${condition.role_id} is locked.`,
      )
    }
    case "recruitment_enabled": {
      const passed = snapshot.objectives.recruitmentEnabled
      return conditionResult(
        condition.kind,
        "Recruitment enabled",
        passed,
        passed ? "Recruitment is enabled." : "Recruitment is not enabled.",
      )
    }
    case "recruited_any": {
      const passed = snapshot.recruitment.totalRecruitedThisRun > 0
      return conditionResult(
        condition.kind,
        "Any recruit joined",
        passed,
        passed ? "At least one recruit joined this run." : "No recruit has joined this run.",
      )
    }
    case "hero_outside_bubble": {
      const passed = snapshot.heroSurvival.location === "outside_bubble"
      return conditionResult(
        condition.kind,
        "Hero outside bubble",
        passed,
        `Hero location is ${snapshot.heroSurvival.location}.`,
      )
    }
    case "hero_forced_return": {
      const passed = snapshot.heroSurvival.forcedReturn !== null
      return conditionResult(
        condition.kind,
        "Hero forced return active",
        passed,
        passed
          ? `Forced return phase is ${snapshot.heroSurvival.forcedReturn?.phase}.`
          : "Forced return is not active.",
      )
    }
    case "hero_recovering": {
      const phase = snapshot.heroSurvival.forcedReturn?.phase ?? null
      const passed = phase === "recover_at_studio"
      return conditionResult(
        condition.kind,
        "Hero recovering at Studio",
        passed,
        phase ? `Forced return phase is ${phase}.` : "Hero is not recovering.",
      )
    }
    case "all": {
      const children = condition.conditions.map((child) => evaluateCondition(snapshot, child, context))
      const failedCount = children.filter((child) => !child.passed).length
      const passed = children.every((child) => child.passed)
      return conditionResult(
        condition.kind,
        "All nested conditions",
        passed,
        passed ? "All nested conditions pass." : `${failedCount} nested condition(s) blocked.`,
        children,
      )
    }
    case "any": {
      const children = condition.conditions.map((child) => evaluateCondition(snapshot, child, context))
      const passedCount = children.filter((child) => child.passed).length
      const passed = children.some((child) => child.passed)
      return conditionResult(
        condition.kind,
        "Any nested condition",
        passed,
        passed ? `${passedCount} nested condition(s) pass.` : "No nested condition passes.",
        children,
      )
    }
    case "not": {
      const child = evaluateCondition(snapshot, condition.condition, context)
      const passed = !child.passed
      return conditionResult(
        condition.kind,
        `Not: ${child.label}`,
        passed,
        passed ? `Nested condition is false: ${child.detail}` : `Nested condition is true: ${child.detail}`,
        [child],
      )
    }
  }
}

function conditionResult(
  kind: string,
  label: string,
  passed: boolean,
  detail: string,
  children?: readonly AddStoryConditionEvaluation[],
): AddStoryConditionEvaluation {
  return children
    ? { kind, label, passed, detail, source: "typescript_best_effort", children }
    : { kind, label, passed, detail, source: "typescript_best_effort" }
}

function storyChoicesMade(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddStoryBrowserChoice[] {
  return catalog.storyBeats
    .map((beat) => {
      const optionId = selectedStoryChoiceId(snapshot, beat.id)
      if (!optionId) return null
      const option = beat.choices.find((choice) => choice.id === optionId)
      return {
        beatId: beat.id,
        beatLabel: beat.label,
        optionId,
        optionLabel: option?.label ?? optionId,
      }
    })
    .filter((choice): choice is AddStoryBrowserChoice => choice !== null)
}

function createConditionEvaluationContext(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): ConditionEvaluationContext {
  return {
    resources: new Map(
      selectAddResourceSummaries(snapshot, catalog).map((resource) => [resource.id, resource.value]),
    ),
    roles: new Map(
      selectAddRoleAssignmentSummaries(snapshot, catalog).map((role) => [role.id, role.available]),
    ),
  }
}

function commandRef(command: AddAvailableCommand): AddStoryBrowserCommand {
  return {
    id: command.id,
    label: command.label,
    kind: command.kind,
    enabled: command.enabled,
    disabledReason: command.disabledReason,
    workerType: command.workerRequest.type,
    relatedBeatId: command.related.beatId,
    relatedActionId: command.related.actionId,
  }
}

function beatRef(beat: StoryBeatDef): AddStoryBrowserBeatRef {
  return {
    id: beat.id,
    label: beat.label,
    arc: beat.arc,
    sequence: beat.sequence,
    priority: beat.priority ?? 0,
    repeatable: Boolean(beat.repeatable),
  }
}

function compareStoryBeats(a: StoryBeatDef, b: StoryBeatDef): number {
  return a.arc.localeCompare(b.arc) || a.sequence - b.sequence || a.id.localeCompare(b.id)
}

function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
