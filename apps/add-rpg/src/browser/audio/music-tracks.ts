// The soundtrack is one supplied recording. Music intents remain useful
// for prioritizing game events, but every mood resolves to this same bed.
interface AudioMusicTrack {
  readonly id: string
  readonly label: string
  /** Mood tags documented by current game intent sources. */
  readonly moods: readonly string[]
  /** Tie-breaker when several tracks satisfy the same mood (higher wins). */
  readonly priority: number
  /** Public asset URL resolved against Vite's configured app base path. */
  readonly src: string
  /** Relative loudness 0..1 before master/music volume is applied. */
  readonly gain: number
}

export type MusicTrack = AudioMusicTrack

/**
 * A request to hear a mood (or a specific track). Sources push/replace their
 * own intent by source id and release it when done; the highest-priority
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
    id: "music.hush_afterwards",
    label: "Hush Afterwards",
    moods: [
      "ambient",
      "studio",
      "calm",
      "explore",
      "overworld",
      "night",
      "tension",
      "combat",
      "danger",
      "triumph",
      "victory",
      "uplift",
    ],
    priority: 1,
    src: import.meta.env.BASE_URL + "audio/music/hush-afterwards.mp3",
    gain: 0.6,
  },
]

export function musicTrackById(id: string): MusicTrack | undefined {
  return MUSIC_TRACKS.find((track) => track.id === id)
}

/**
 * Resolve the winning intent to an available track. The supplied soundtrack
 * is the fallback for unmatched moods and track IDs so new event types cannot
 * silence or replace the game's only music bed.
 */
export function resolveMusicSelection(
  intents: readonly MusicIntent[],
  tracks: readonly MusicTrack[] = MUSIC_TRACKS,
): MusicTrack | null {
  const fallback = tracks[0] ?? null
  if (!fallback || intents.length === 0) return fallback

  // Highest priority wins (ties resolve to the latest intent in array order).
  let winner = intents[0]
  for (const intent of intents) {
    if (intent.priority >= winner.priority) winner = intent
  }

  if (winner.trackId) {
    return tracks.find((track) => track.id === winner.trackId) ?? fallback
  }
  if (winner.mood) {
    const candidates = tracks.filter((track) => track.moods.includes(winner.mood as string))
    if (candidates.length > 0) {
      return candidates.reduce((best, track) => (track.priority > best.priority ? track : best))
    }
  }
  return fallback
}
