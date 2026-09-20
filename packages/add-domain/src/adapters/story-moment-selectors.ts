import type { CatalogSnapshot, SimulationSnapshot } from "@aedventure/add-protocol"
import { selectAddStoryProgressionState } from "./story-progression-selectors"

// Projects the authoritative active story beat (selected by the Rust salience
// engine) into a presentable "moment": its body + ALL of its choices, so the UI
// can surface real agency instead of a single hardcoded option. The engine owns
// selection + effects; this is render-only.

export interface AddStoryMomentChoice {
  readonly id: string
  readonly label: string
}

export interface AddStoryMoment {
  readonly beatId: string
  readonly label: string
  readonly body: string
  readonly arc: string
  /** Choices to offer right now (empty once the player has chosen, or for beats
   * that are an ongoing goal rather than a decision). */
  readonly choices: readonly AddStoryMomentChoice[]
  /** True when this beat is a decision still awaiting the player's pick. */
  readonly awaitingChoice: boolean
}

export function selectAddStoryMoment(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): AddStoryMoment | null {
  const progression = selectAddStoryProgressionState(snapshot, catalog)
  const beat = progression.activeBeat
  if (!beat) return null

  return {
    beatId: beat.id,
    label: beat.label,
    body: beat.body,
    arc: beat.arc,
    choices: progression.currentChoiceState.awaitingChoice
      ? progression.currentChoiceState.choices.map((choice) => ({ id: choice.id, label: choice.label }))
      : [],
    awaitingChoice: progression.currentChoiceState.awaitingChoice,
  }
}
