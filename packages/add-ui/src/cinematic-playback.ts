// What the cinematic stage should draw, decided without touching the DOM.
//
// Kept apart from the stage component because this package emits `.tsx` as
// `.jsx`, which Node cannot require: the decisions belong somewhere the test
// suite can reach them, and they are where the bug a player would notice — a
// modal they cannot dismiss — actually lives.
import type { CinematicMedia } from "@aedventure/add-protocol"

/** One beat, flattened to what the stage needs to draw it. */
export interface CinematicBeatView {
  readonly id: string
  readonly media: CinematicMedia
  /** Name the app resolves. Empty when the medium needs none. */
  readonly assetId: string
  /** Body copy for a text beat, or a caption over any other kind. */
  readonly copy: string
}

/** The shape the selector needs from a catalog definition. */
export interface CinematicDefView {
  readonly id: string
  readonly label: string
  readonly skippable: boolean
  readonly beats: readonly CinematicBeatView[]
}

/** The shape the selector needs from saved playback. */
export interface CinematicActiveView {
  readonly cinematicId: string
  readonly beatIndex: number
}

/** Everything the stage needs, decided in one place. */
export interface CinematicPlaybackView {
  readonly beat: CinematicBeatView | null
  readonly label: string
  /** 0 when nothing is playing. */
  readonly progress: number
  readonly beatNumber: number
  readonly beatCount: number
  readonly skippable: boolean
}

const NOTHING_PLAYING: CinematicPlaybackView = {
  beat: null,
  label: "",
  progress: 0,
  beatNumber: 0,
  beatCount: 0,
  skippable: false,
}

/**
 * Resolve saved playback against the catalog.
 *
 * Every way this can be inconsistent ends as "nothing is playing" rather than a
 * thrown error or a blank modal the player cannot dismiss: the definition may
 * have left the catalog since the save was written, the beat index may point
 * past the end of a shortened cinematic, and the saved id may not be the one
 * the caller looked up. The simulation clears such playback on its next
 * advance; this makes sure the interim frame draws nothing at all.
 */
export function cinematicPlaybackView(
  def: CinematicDefView | null | undefined,
  active: CinematicActiveView | null | undefined,
): CinematicPlaybackView {
  if (!active || !def) return NOTHING_PLAYING
  if (def.id !== active.cinematicId) return NOTHING_PLAYING
  const beatCount = def.beats.length
  // No separate empty-cinematic check: an empty `beats` has nothing at index 0
  // either, so the lookup below covers it and also covers the shortened-content
  // case. One guard that cannot go stale beats two that can disagree.
  const beat = def.beats[active.beatIndex]
  if (!beat) return NOTHING_PLAYING
  return {
    beat,
    label: def.label,
    progress: Math.min(1, (active.beatIndex + 1) / beatCount),
    beatNumber: active.beatIndex + 1,
    beatCount,
    skippable: def.skippable,
  }
}
