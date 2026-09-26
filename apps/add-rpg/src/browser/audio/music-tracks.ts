// Music as a first-class, abstracted entity. A MusicTrack is a named
// procedural bed or supplied audio asset tagged with the moods it serves.
// Callers express a musical intent; the director resolves it to a track and
// crossfades. This file holds the data model, registry, and pure resolver.

export type Waveform = "sine" | "triangle" | "sawtooth" | "square"

interface MusicTrackBase {
  readonly id: string
  readonly label: string
  /** Mood tags this track can satisfy (matched against intent.mood). */
  readonly moods: readonly string[]
  /** Tie-breaker when several tracks satisfy the same mood (higher wins). */
  readonly priority: number
  /** Relative loudness 0..1 before master/music volume is applied. */
  readonly gain: number
}

export interface SynthMusicTrack extends MusicTrackBase {
  readonly type: "synth"
  /** Root pitch in Hz; `semitones` voices a pad/chord above it. */
  readonly rootHz: number
  readonly semitones: readonly number[]
  readonly waveform: Waveform
  /** Low-pass cutoff (Hz) shaping the bed's brightness. */
  readonly filterHz: number
  /** Subtle detune (cents) spread across voices for movement. */
  readonly detuneCents?: number
}

export interface AudioMusicTrack extends MusicTrackBase {
  readonly type: "audio"
  /** Public asset URL resolved against Vite's configured app base path. */
  readonly src: string
}

export type MusicTrack = SynthMusicTrack | AudioMusicTrack

/**
 * A request to hear a mood (or a specific track). Sources push/replace their
 * own intent by `source` id and release it when done; the highest-priority
 * active intent wins.
 */
export interface MusicIntent {
  readonly source: string
  readonly priority: number
  readonly mood?: string
  readonly trackId?: string
}

/** Always-present baseline so the world is never silent. */
export const BASE_MUSIC_INTENT: MusicIntent = {
  source: "base",
  priority: 0,
  mood: "ambient",
}

export const MUSIC_TRACKS: readonly MusicTrack[] = [
  {
    type: "audio",
    id: "music.hush_afterwards",
    label: "Hush Afterwards",
    moods: ["ambient"],
    priority: 2,
    src: import.meta.env.BASE_URL + "audio/music/hush-afterwards.mp3",
    gain: 0.6,
  },
  {
    type: "synth",
    id: "music.studio_calm",
    label: "Studio Calm",
    moods: ["ambient", "studio", "calm"],
    priority: 1,
    rootHz: 130.81, // C3
    semitones: [0, 7, 12, 16],
    waveform: "sine",
    filterHz: 900,
    gain: 0.5,
    detuneCents: 4,
  },
  {
    type: "synth",
    id: "music.frontier",
    label: "Frontier",
    moods: ["ambient", "explore", "overworld"],
    priority: 1,
    rootHz: 146.83, // D3
    semitones: [0, 5, 7, 14],
    waveform: "triangle",
    filterHz: 1200,
    gain: 0.45,
    detuneCents: 6,
  },
  {
    type: "synth",
    id: "music.night",
    label: "Night Watch",
    moods: ["night"],
    priority: 2,
    rootHz: 110.0, // A2
    semitones: [0, 3, 7, 10],
    waveform: "sine",
    filterHz: 700,
    gain: 0.42,
    detuneCents: 5,
  },
  {
    type: "synth",
    id: "music.tension",
    label: "Tension",
    moods: ["tension", "combat", "danger"],
    priority: 5,
    rootHz: 98.0, // G2
    semitones: [0, 1, 6, 13],
    waveform: "sawtooth",
    filterHz: 1100,
    gain: 0.4,
    detuneCents: 9,
  },
  {
    type: "synth",
    id: "music.triumph",
    label: "Triumph",
    moods: ["triumph", "victory", "uplift"],
    priority: 6,
    rootHz: 174.61, // F3
    semitones: [0, 4, 7, 12],
    waveform: "triangle",
    filterHz: 1600,
    gain: 0.5,
    detuneCents: 4,
  },
]

export function musicTrackById(id: string): MusicTrack | undefined {
  return MUSIC_TRACKS.find((track) => track.id === id)
}

/**
 * Resolve the active intents to the track that should be playing.
 *
 * Highest-priority intent wins (ties resolve to the most recently added, i.e.
 * later in the array). A `trackId` intent selects that track directly; a `mood`
 * intent selects the highest-`priority` track tagged with that mood. Returns
 * null if nothing matches (silence).
 */
export function resolveMusicSelection(
  intents: readonly MusicIntent[],
  tracks: readonly MusicTrack[] = MUSIC_TRACKS,
): MusicTrack | null {
  if (intents.length === 0) return null

  // Highest priority, tie-broken by latest (array order).
  let winner = intents[0]
  for (const intent of intents) {
    if (intent.priority >= winner.priority) winner = intent
  }

  if (winner.trackId) {
    return tracks.find((track) => track.id === winner.trackId) ?? null
  }
  if (winner.mood) {
    const candidates = tracks.filter((track) => track.moods.includes(winner.mood as string))
    if (candidates.length === 0) return null
    return candidates.reduce((best, track) => (track.priority > best.priority ? track : best))
  }
  return null
}
