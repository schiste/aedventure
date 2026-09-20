import type { StoryBeatDef } from "@aedventure/add-protocol"
import { AMBIENT_STORY_BEATS } from "./arcs/ambient"
import { BASE_ONBOARDING_STORY_BEATS } from "./arcs/base-onboarding"
import { PRE_ARRIVAL_STORY_BEATS } from "./arcs/pre-arrival"

export * from "./helpers"
export { AMBIENT_STORY_BEATS } from "./arcs/ambient"
export { BASE_ONBOARDING_STORY_BEATS } from "./arcs/base-onboarding"
export { PRE_ARRIVAL_STORY_BEATS } from "./arcs/pre-arrival"

export const STORY_BEATS: readonly StoryBeatDef[] = [
  ...PRE_ARRIVAL_STORY_BEATS,
  ...BASE_ONBOARDING_STORY_BEATS,
  ...AMBIENT_STORY_BEATS,
]
