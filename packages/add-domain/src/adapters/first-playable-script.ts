import type { CatalogSnapshot, SimulationSnapshot } from "@aedventure/add-protocol"
import { selectAddStoryProgressionState } from "./story-progression-selectors"

export type {
  AddFirstPlayableAction,
  AddFirstPlayableStep,
  AddFirstPlayableSummary,
} from "./story-progression-selectors"

export function selectAddFirstPlayableSummary(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
) {
  return selectAddStoryProgressionState(snapshot, catalog).firstPlayable
}
