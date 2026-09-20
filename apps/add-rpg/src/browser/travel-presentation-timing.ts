import {
  ADD_GAME_MINUTES_PER_RUNTIME_SECOND,
  ADD_TRAVEL_GAME_MINUTES_PER_TILE,
  ADD_TRAVEL_RUNTIME_SECONDS_PER_TILE,
} from "@aedventure/add-runtime-client"

export interface AddTravelPresentationTiming {
  readonly visibleGameMinutes: number
  readonly runtimeSeconds: number
  readonly durationMs: number
  readonly msPerVisibleMinute: number
  readonly runtimeSecondsPerVisibleMinute: number
}

export const ADD_TRAVEL_PRESENTATION_MS_PER_VISIBLE_MINUTE = 30

export const ADD_TILE_TRAVEL_PRESENTATION = createAddTravelPresentationTiming(
  ADD_TRAVEL_GAME_MINUTES_PER_TILE,
  ADD_TRAVEL_RUNTIME_SECONDS_PER_TILE,
)

// Dungeons run ~real-time: a ~1m square is one in-game second to cross, and
// ambient time also flows at one in-game second per real second — 1/60 of the
// overworld's compressed pace. clockSeconds are in-game minutes, so one in-game
// second is 1/60 of a runtime second.
export const ADD_DUNGEON_GAME_SECONDS_PER_TILE = 1
export const ADD_DUNGEON_RUNTIME_SECONDS_PER_TILE =
  ADD_DUNGEON_GAME_SECONDS_PER_TILE / (60 * ADD_GAME_MINUTES_PER_RUNTIME_SECOND)
export const ADD_DUNGEON_AMBIENT_RUNTIME_SECONDS_PER_TICK =
  ADD_DUNGEON_RUNTIME_SECONDS_PER_TILE

// Same on-screen crossing as a tile move (keeps the hero synced with the
// renderer), but it only advances the clock by ~one in-game second.
export const ADD_DUNGEON_STEP_PRESENTATION: AddTravelPresentationTiming = {
  visibleGameMinutes: 0,
  runtimeSeconds: ADD_DUNGEON_RUNTIME_SECONDS_PER_TILE,
  durationMs: ADD_TILE_TRAVEL_PRESENTATION.durationMs,
  msPerVisibleMinute: ADD_TRAVEL_PRESENTATION_MS_PER_VISIBLE_MINUTE,
  runtimeSecondsPerVisibleMinute: 1,
}

export function createAddClockAdvancePresentationTiming(
  fromClockSeconds: number,
  toClockSeconds: number,
): AddTravelPresentationTiming {
  const fromVisibleMinute = Math.floor(
    Math.max(0, fromClockSeconds) * ADD_GAME_MINUTES_PER_RUNTIME_SECOND,
  )
  const toVisibleMinute = Math.floor(
    Math.max(0, toClockSeconds) * ADD_GAME_MINUTES_PER_RUNTIME_SECOND,
  )
  const visibleGameMinutes = Math.max(0, toVisibleMinute - fromVisibleMinute)
  return createAddTravelPresentationTiming(
    visibleGameMinutes,
    Math.max(0, toClockSeconds - fromClockSeconds),
  )
}

function createAddTravelPresentationTiming(
  visibleGameMinutes: number,
  runtimeSeconds: number,
): AddTravelPresentationTiming {
  return {
    visibleGameMinutes,
    runtimeSeconds,
    durationMs: visibleGameMinutes * ADD_TRAVEL_PRESENTATION_MS_PER_VISIBLE_MINUTE,
    msPerVisibleMinute: ADD_TRAVEL_PRESENTATION_MS_PER_VISIBLE_MINUTE,
    runtimeSecondsPerVisibleMinute:
      ADD_GAME_MINUTES_PER_RUNTIME_SECOND <= 0
        ? 1
        : 1 / ADD_GAME_MINUTES_PER_RUNTIME_SECOND,
  }
}
