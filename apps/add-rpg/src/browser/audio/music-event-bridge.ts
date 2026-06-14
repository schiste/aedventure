// Drives music from typed sim GameEvents (T1.2). Pure mapper + a window-event
// listener: the app dispatches each snapshot's events as `add-game-event`
// CustomEvents and the bridge turns the meaningful ones into transient musical
// "stingers" (a high-priority intent that auto-releases back to ambient). This
// keeps the sim/UI fully decoupled from the audio engine.
//
// Wiring (one line wherever snapshot.events is handled):
//   for (const e of snapshot.events)
//     window.dispatchEvent(new CustomEvent("add-game-event", { detail: e }))

import type { AddGameEvent } from "@aedventure/add-domain"

import type { MusicIntent } from "./music-tracks"
import { releaseMusic, requestMusic } from "./music-director"

/** Source id all event-driven stingers share (so a newer one replaces it). */
const EVENT_SOURCE = "event"
/** How long a stinger holds before easing back to the ambient bed. */
const STINGER_MS = 9000

/** Map a sim event to a musical intent, or null if it shouldn't move music. */
export function gameEventToMusicIntent(event: AddGameEvent): MusicIntent | null {
  switch (event.kind) {
    case "combat_resolved":
      return {
        source: EVENT_SOURCE,
        priority: 6,
        mood: event.outcome === "victory" ? "triumph" : "tension",
      }
    case "forced_return_triggered":
    case "bubble_frontier_collapsed":
      return { source: EVENT_SOURCE, priority: 6, mood: "tension" }
    case "recruitment_gate_opened":
    case "hero_leveled_up":
      return { source: EVENT_SOURCE, priority: 6, mood: "uplift" }
    default:
      return null
  }
}

let stingerTimer: ReturnType<typeof setTimeout> | undefined

function handle(event: AddGameEvent): void {
  const intent = gameEventToMusicIntent(event)
  if (!intent) return
  requestMusic(intent)
  if (stingerTimer) clearTimeout(stingerTimer)
  stingerTimer = setTimeout(() => releaseMusic(EVENT_SOURCE), STINGER_MS)
}

if (typeof window !== "undefined") {
  window.addEventListener("add-game-event", (event) => {
    const detail = (event as CustomEvent<AddGameEvent>).detail
    if (detail?.kind) handle(detail)
  })
}
