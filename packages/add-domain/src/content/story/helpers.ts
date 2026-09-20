import type {
  BlockerDef,
  ConditionDef,
  StoryBeatDef,
  StoryPrimaryActionDef,
  UnlockDef,
} from "@aedventure/add-protocol"

export const STORY_ARC_PRE_ARRIVAL = "pre_arrival"
export const STORY_ARC_BASE_ONBOARDING = "base_onboarding"
export const STORY_ARC_AMBIENT = "ambient"

// Story beats are authored as storylets. Codegen turns this data into Rust
// catalog constants, while the Rust salience selector owns activation,
// completion, effects, and persistence.
export const storyCondition = {
  always: (): ConditionDef => ({ kind: "always" }),
  flagSet: (flag_id: string): ConditionDef => ({ kind: "flag_set", flag_id }),
  flagUnset: (flag_id: string): ConditionDef => ({ kind: "flag_unset", flag_id }),
  resourceAtLeast: (resource_id: string, amount: number): ConditionDef => ({
    kind: "resource_at_least",
    resource_id,
    amount,
  }),
  bubbleReachAtLeast: (n: number): ConditionDef => ({ kind: "bubble_reach_at_least", n }),
  clockSecondsAtLeast: (seconds: number): ConditionDef => ({
    kind: "clock_seconds_at_least",
    seconds,
  }),
  qualityAtLeast: (key: string, value: number): ConditionDef => ({
    kind: "quality_at_least",
    key,
    value,
  }),
  beatDone: (beat_id: string): ConditionDef => ({ kind: "beat_completed", beat_id }),
  choiceMade: (beat_id: string, option_id: string): ConditionDef => ({
    kind: "choice_made",
    beat_id,
    option_id,
  }),
  roleAvailable: (role_id: string): ConditionDef => ({ kind: "role_available", role_id }),
  recruitmentEnabled: (): ConditionDef => ({ kind: "recruitment_enabled" }),
  recruitedAny: (): ConditionDef => ({ kind: "recruited_any" }),
  heroOutsideBubble: (): ConditionDef => ({ kind: "hero_outside_bubble" }),
  heroForcedReturn: (): ConditionDef => ({ kind: "hero_forced_return" }),
  heroRecovering: (): ConditionDef => ({ kind: "hero_recovering" }),
  all: (conditions: readonly ConditionDef[]): ConditionDef => ({
    kind: "all",
    conditions: [...conditions],
  }),
  any: (conditions: readonly ConditionDef[]): ConditionDef => ({
    kind: "any",
    conditions: [...conditions],
  }),
  not: (condition: ConditionDef): ConditionDef => ({ kind: "not", condition }),
}

export const flagSet = storyCondition.flagSet
export const beatDone = storyCondition.beatDone
export const allOf = storyCondition.all
export const anyOf = storyCondition.any
export const not = storyCondition.not
export const NONE: ConditionDef[] = []

export function firstPlayableProgression(input: {
  readonly stepId: string
  readonly shortLabel: string
  readonly playerHint: string
  readonly ctaCopy?: string | null
  readonly primaryRiskCopy?: string | null
  readonly displayPriority: number
  readonly primaryAction?: StoryPrimaryActionDef | null
  readonly blockers?: readonly BlockerDef[]
  readonly unlocks?: readonly UnlockDef[]
}): NonNullable<StoryBeatDef["progression"]> {
  return {
    track: "first_playable",
    stepId: input.stepId,
    presentation: {
      shortLabel: input.shortLabel,
      playerHint: input.playerHint,
      ctaCopy: input.ctaCopy ?? null,
      primaryRiskCopy: input.primaryRiskCopy ?? null,
      displayPriority: input.displayPriority,
      reveal: "default",
    },
    primaryAction: input.primaryAction ?? null,
    blockers: [...(input.blockers ?? [])],
    unlocks: [...(input.unlocks ?? [])],
  }
}

export const blocker = (
  kind: BlockerDef["kind"],
  label: string,
  relatedIds: readonly string[],
): BlockerDef => ({ kind, label, relatedIds: [...relatedIds] })

export const unlock = (
  kind: UnlockDef["kind"],
  label: string,
  relatedIds: readonly string[],
): UnlockDef => ({ kind, label, relatedIds: [...relatedIds] })
