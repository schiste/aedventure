// Authored content: cinematic moments.
//
// A cinematic is an ordered list of beats the game stops to show. The beat
// carries no opinion about what a beat *is* made of: `media` names the kind and
// `assetId` names the thing, so a beat can be a video, a still, a line of type
// or nothing at all, and the player component resolves the asset. Adding a
// medium later means adding a `media` value and a branch in the renderer, not a
// second playback system.
//
// Playback is authoritative and saved: which cinematic is running, which beat
// it is on, and which have been seen. A cutscene the player sat through must
// not replay because they reloaded, and one they are halfway through must not
// restart from the top.
//
// codegen -> Rust `const CINEMATICS`.

/** What a beat is made of. The renderer switches on this. */
export type AuthoredCinematicMedia = "none" | "image" | "video" | "text"

/**
 * What ends a beat.
 * - `auto`: after `seconds`.
 * - `input`: when the player asks for the next one.
 * - `mediaEnd`: when the medium says it finished (a video's `ended`).
 *   Beats that can stall this way still honour `seconds` as a backstop, so a
 *   missing asset cannot strand the player in a cutscene.
 */
export type AuthoredCinematicAdvance = "auto" | "input" | "mediaEnd"

/** Whether a cinematic may be seen more than once. */
export type AuthoredCinematicReplay = "once" | "always"

export interface AuthoredCinematicBeatDef {
  readonly id: string
  readonly media: AuthoredCinematicMedia
  /** Asset the app resolves to a URL. Empty when `media` needs none. */
  readonly assetId: string
  /** Body copy for a `text` beat, or a caption laid over any other kind. */
  readonly copy: string
  readonly advance: AuthoredCinematicAdvance
  /** Duration for `auto`, and the backstop for `mediaEnd`. */
  readonly seconds: number
}

export interface AuthoredCinematicDef {
  readonly id: string
  readonly label: string
  /** May the player cut it short? A first-run reveal may want this false. */
  readonly skippable: boolean
  /**
   * Hold the world still while it plays.
   *
   * On by default, and it matters more than it looks: the world clock drives
   * the Hero's exposure, so a two-minute cutscene played against a running
   * clock would spend two game hours of his protection while he watched.
   */
  readonly freezeWorld: boolean
  readonly replay: AuthoredCinematicReplay
  readonly beats: readonly AuthoredCinematicBeatDef[]
}

/**
 * One sample, and it is only a sample: it exists so the pipeline has something
 * to carry end to end and so the authored shape is visible. Replace or delete
 * it when real moments arrive — nothing triggers it.
 */
export const CINEMATICS: readonly AuthoredCinematicDef[] = [
  {
    id: "cinematic.sample",
    label: "Sample moment",
    skippable: true,
    freezeWorld: true,
    replay: "once",
    beats: [
      { id: "cinematic.sample.beat.title", media: "text", assetId: "", copy: "A beat of type.", advance: "auto", seconds: 2 },
      { id: "cinematic.sample.beat.still", media: "image", assetId: "sample/still", copy: "A still, with a caption.", advance: "input", seconds: 0 },
      { id: "cinematic.sample.beat.clip", media: "video", assetId: "sample/clip", copy: "", advance: "mediaEnd", seconds: 30 },
    ],
  },
]

export function cinematicById(id: string): AuthoredCinematicDef | undefined {
  return CINEMATICS.find((cinematic) => cinematic.id === id)
}
