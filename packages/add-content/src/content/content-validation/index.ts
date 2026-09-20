import type { StoryBeatDef } from "@aedventure/add-protocol"

export const ADD_CONTENT_VALIDATION_VERSION = "content_authoring_model_v1"

export const STORY_ID_CONVENTIONS = {
  currentStableBeatPrefix: "story.beat.",
  currentStableChoicePrefix: "story.choice.",
  futureSemanticBeatExample: "story.beat.base.restore_studio",
  futureSemanticChoiceExample: "story.choice.base.restore.search_power",
  futureSemanticArcExample: "story.arc.base_onboarding",
} as const

export interface StoryAuthoringModelSummary {
  readonly validationVersion: typeof ADD_CONTENT_VALIDATION_VERSION
  readonly beatCount: number
  readonly arcIds: readonly string[]
  readonly duplicateBeatIds: readonly string[]
  readonly duplicateChoiceIds: readonly string[]
}

export function summarizeStoryAuthoringModel(
  beats: readonly StoryBeatDef[],
): StoryAuthoringModelSummary {
  return {
    validationVersion: ADD_CONTENT_VALIDATION_VERSION,
    beatCount: beats.length,
    arcIds: uniqueSorted(beats.map((beat) => beat.arc)),
    duplicateBeatIds: duplicates(beats.map((beat) => beat.id)),
    duplicateChoiceIds: duplicates(
      beats.flatMap((beat) => beat.choices.map((choice) => choice.id)),
    ),
  }
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function duplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>()
  const duplicate = new Set<string>()
  values.forEach((value) => {
    if (seen.has(value)) {
      duplicate.add(value)
    } else {
      seen.add(value)
    }
  })
  return uniqueSorted([...duplicate])
}
