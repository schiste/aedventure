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
 * The opening recollection.
 *
 * DRAFT, written to be rewritten. Every fact here is drawn from canon; the
 * phrasing is not canon and the voice is a first pass.
 *
 * The canon pages are deliberately not named here: content may cite lore only
 * through `content/lore-refs.ts` (see `docs/lore-engine-content-bricks.md`),
 * and that registry only knows the content families `content:explain` resolves
 * — cinematics are not one of them yet. Registering the family would let this
 * draft carry its sources properly, and is worth doing before the beats become
 * real shots.
 *
 * It is a memory, not exposition: the Hero going back over the life they are
 * walking away from, and it stops at the decision rather than the journey.
 * Beats are `text` so the pipeline carries it today; each one is a shot that
 * wants an image or a clip, which is a change of `media` and `assetId` and
 * nothing else.
 *
 * Three things canon says the player must NOT know yet, and none of these
 * beats say: whether the Hero is Resilient, whether Studio Echo still stands,
 * and whether any Crystal is there. The ending is commitment, not discovery.
 */
export const CINEMATICS: readonly AuthoredCinematicDef[] = [
  {
    // The engine's fixture, not a moment. It is the only definition exercising
    // all three advance kinds, which is what the playback tests need, and
    // nothing triggers it. Keep it authored alongside the real cinematics so
    // those tests break when the shape changes rather than when content does.
    id: "cinematic.sample",
    label: "Engine fixture",
    skippable: true,
    freezeWorld: true,
    replay: "once",
    beats: [
      { id: "cinematic.sample.beat.title", media: "text", assetId: "", copy: "A beat of type.", advance: "auto", seconds: 2 },
      { id: "cinematic.sample.beat.still", media: "image", assetId: "sample/still", copy: "A still, with a caption.", advance: "input", seconds: 0 },
      { id: "cinematic.sample.beat.clip", media: "video", assetId: "sample/clip", copy: "", advance: "mediaEnd", seconds: 30 },
    ],
  },
  {
    id: "cinematic.intro",
    label: "Before the surface",
    // The opening should not be cuttable on a first run, but a player who has
    // seen it and starts over has earned the skip. `once` plus `skippable`
    // gives that: it only ever plays through in full the first time.
    skippable: true,
    freezeWorld: true,
    replay: "once",
    beats: [
      { id: "cinematic.intro.beat.year", media: "text", assetId: "", copy: "311 years after the Silence.", advance: "auto", seconds: 3 },
      { id: "cinematic.intro.beat.caves", media: "text", assetId: "", copy: "Two thousand people live in the Grottes de la Bresme. You are one of them. It is not a shelter. It is a home, and it is full.", advance: "auto", seconds: 5 },
      { id: "cinematic.intro.beat.depth", media: "text", assetId: "", copy: "You know the place by depth. The Entrance Hall at five metres. La Salle Piaf at twenty, where the records are kept. The Sanctuary at forty-five, where you sleep.", advance: "auto", seconds: 6 },
      { id: "cinematic.intro.beat.drums", media: "text", assetId: "", copy: "The drums never stop. Children learn the rotations before they learn why. Down here, silence is not peace. Silence is a symptom.", advance: "auto", seconds: 5 },
      { id: "cinematic.intro.beat.name", media: "text", assetId: "", copy: "Your name is Lindquist. People are careful with it. The Lindquists take the dangerous missions, and the Lindquists talk about the Studio.", advance: "auto", seconds: 5 },
      { id: "cinematic.intro.beat.kaylee", media: "text", assetId: "", copy: "It started with Kaylee Jo, who walked in from outside looking for a party and stayed to find the records. What she promised at the end of it, the family has repeated ever since.", advance: "auto", seconds: 6 },
      { id: "cinematic.intro.beat.pressure", media: "text", assetId: "", copy: "The caves cannot hold more of you. The Council knows it. There is no safe way to make room.", advance: "auto", seconds: 4 },
      { id: "cinematic.intro.beat.lead", media: "text", assetId: "", copy: "So when an old Lindquist map matched a place nobody has walked to, the argument stopped being about faith. It became about space.", advance: "auto", seconds: 5 },
      { id: "cinematic.intro.beat.council", media: "text", assetId: "", copy: "Sylvain Marchand authorised it. Reconnaissance. Not a promise.", advance: "auto", seconds: 4 },
      { id: "cinematic.intro.beat.three", media: "text", assetId: "", copy: "Three of you go. Julien wants it to be true. Marie wants it proven. You want to know whether any of it ever meant anything.", advance: "auto", seconds: 6 },
      { id: "cinematic.intro.beat.rules", media: "text", assetId: "", copy: "The rules are read out twice, because everyone knows what a family story can do to good discipline. Verify. Record. Turn back before four hours. If anyone shows symptoms, abandon it.", advance: "auto", seconds: 7 },
      { id: "cinematic.intro.beat.farewell", media: "text", assetId: "", copy: "You say goodbye in the quarters. Inspection at the Entrance Hall. Then the old quarry passages, going up.", advance: "auto", seconds: 5 },
      // The last beat waits: the threshold is the player's to cross.
      { id: "cinematic.intro.beat.threshold", media: "text", assetId: "", copy: "The last door you know is behind you.", advance: "input", seconds: 0 },
    ],
  },
]

export function cinematicById(id: string): AuthoredCinematicDef | undefined {
  return CINEMATICS.find((cinematic) => cinematic.id === id)
}
