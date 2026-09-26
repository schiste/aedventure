// The music director tracks prioritized game intents and plays the supplied
// soundtrack. Sources can request or release an intent from anywhere:
//
//   requestMusic({ source: "combat", priority: 5, mood: "tension" })
//   releaseMusic("combat")
//
// Music uses the same recording for every intent. Playback honors the settings
// volume, tries autoplay at page load, and resumes on first interaction if the
// browser blocks audible autoplay.

import {
  type AddSettings,
  effectiveMusicVolume,
  loadSettings,
} from "../settings/settings-state"
import {
  BASE_MUSIC_INTENT,
  type MusicIntent,
  type MusicTrack,
  resolveMusicSelection,
} from "./music-tracks"

const CROSSFADE_SECONDS = 2.5

interface ActiveBed {
  trackId: string
  media: HTMLAudioElement
  mediaSource: MediaElementAudioSourceNode
  filter: BiquadFilterNode
  fade: GainNode
  targetGain: number
  playAttempt: Promise<boolean> | null
}

interface MusicTelemetry {
  currentTrackId: string | null
  trackChanges: number
  crossfades: number
  contextState: string
  intentCount: number
}

// Intent stack keyed by source; the baseline is always present.
const intents = new Map<string, MusicIntent>([[BASE_MUSIC_INTENT.source, BASE_MUSIC_INTENT]])

let context: AudioContext | null = null
let masterGain: GainNode | null = null
let current: ActiveBed | null = null
let musicVolume = effectiveMusicVolume(loadSettings())
const telemetry: MusicTelemetry = {
  currentTrackId: null,
  trackChanges: 0,
  crossfades: 0,
  contextState: "uninitialized",
  intentCount: 1,
}

function ensureContext(): AudioContext | null {
  if (context) return context
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  context = new Ctor()
  masterGain = context.createGain()
  masterGain.gain.value = musicVolume
  masterGain.connect(context.destination)
  telemetry.contextState = context.state
  return context
}

function buildBed(track: MusicTrack): ActiveBed | null {
  const ctx = ensureContext()
  if (!ctx || !masterGain) return null

  const filter = ctx.createBiquadFilter()
  filter.type = "lowpass"
  filter.frequency.value = 20_000

  const fade = ctx.createGain()
  fade.gain.value = 0
  filter.connect(fade)
  fade.connect(masterGain)

  const media = new Audio(track.src)
  media.loop = true
  media.preload = "auto"
  const mediaSource = ctx.createMediaElementSource(media)
  mediaSource.connect(filter)
  const bed = {
    trackId: track.id,
    media,
    mediaSource,
    filter,
    fade,
    targetGain: track.gain,
    playAttempt: null,
  }
  // Start synchronously from the first gesture before AudioContext resume.
  void playBed(bed)
  return bed
}

function playBed(bed: ActiveBed): Promise<boolean> {
  if (bed.playAttempt) return bed.playAttempt
  if (!bed.media.paused) return Promise.resolve(true)
  let attempt: Promise<boolean>
  attempt = bed.media.play().then(
    () => true,
    () => false,
  ).finally(() => {
    if (bed.playAttempt === attempt) bed.playAttempt = null
  })
  bed.playAttempt = attempt
  return attempt
}

function fadeOut(bed: ActiveBed, ctx: AudioContext): void {
  const now = ctx.currentTime
  bed.fade.gain.cancelScheduledValues(now)
  bed.fade.gain.setValueAtTime(bed.fade.gain.value, now)
  bed.fade.gain.linearRampToValueAtTime(0, now + CROSSFADE_SECONDS)
  window.setTimeout(() => {
    bed.media.pause()
    bed.media.currentTime = 0
    bed.mediaSource.disconnect()
    bed.filter.disconnect()
    bed.fade.disconnect()
  }, (CROSSFADE_SECONDS + 0.1) * 1000)
}

function fadeIn(bed: ActiveBed, ctx: AudioContext): void {
  const now = ctx.currentTime
  bed.fade.gain.cancelScheduledValues(now)
  bed.fade.gain.setValueAtTime(0, now)
  bed.fade.gain.linearRampToValueAtTime(bed.targetGain, now + CROSSFADE_SECONDS)
}

/** Re-resolve the intent stack and crossfade if the winning track changed. */
function reconcile(allowSuspendedContext = false): void {
  telemetry.intentCount = intents.size
  const ctx = ensureContext()
  if (!ctx || (!allowSuspendedContext && ctx.state !== "running")) return

  const next = resolveMusicSelection([...intents.values()])
  const nextId = next?.id ?? null
  if (nextId === (current?.trackId ?? null)) return

  if (current) {
    fadeOut(current, ctx)
    telemetry.crossfades += 1
  }
  current = next ? buildBed(next) : null
  if (current) fadeIn(current, ctx)
  telemetry.currentTrackId = nextId
  telemetry.trackChanges += 1
}

/** Push or replace this source's musical intent, then re-resolve. */
export function requestMusic(intent: MusicIntent): void {
  intents.set(intent.source, intent)
  reconcile()
}

/** Drop a source's intent (e.g. combat ended), then re-resolve. */
export function releaseMusic(source: string): void {
  if (source === BASE_MUSIC_INTENT.source) return
  intents.delete(source)
  reconcile()
}

export function getMusicTelemetry(): MusicTelemetry {
  return { ...telemetry, contextState: context?.state ?? "uninitialized" }
}

function setVolume(settings: AddSettings): void {
  musicVolume = effectiveMusicVolume(settings)
  if (context && masterGain) {
    const now = context.currentTime
    masterGain.gain.cancelScheduledValues(now)
    masterGain.gain.linearRampToValueAtTime(musicVolume, now + 0.15)
  }
}

// --- Wiring: settings, time-of-day, generic intents, autoplay unlock ---

function attach(): void {
  window.addEventListener("add-settings-changed", (event) => {
    const detail = (event as CustomEvent<AddSettings>).detail
    if (detail) setVolume(detail)
  })

  window.addEventListener("add-music-intent", (event) => {
    const detail = (event as CustomEvent<MusicIntent>).detail
    if (detail?.source) requestMusic(detail)
  })

  window.addEventListener("add-music-release", (event) => {
    const detail = (event as CustomEvent<{ source: string }>).detail
    if (detail?.source) releaseMusic(detail.source)
  })

  // Time-of-day driver: the app dispatches the in-game day fraction (0..1);
  // night swaps the ambient bed. A low priority so events/story override it.
  window.addEventListener("add-game-clock", (event) => {
    const fraction = (event as CustomEvent<{ dayFraction: number }>).detail?.dayFraction
    if (typeof fraction !== "number") return
    const isNight = fraction < 0.25 || fraction >= 0.8
    if (isNight) {
      requestMusic({ source: "time", priority: 1, mood: "night" })
    } else {
      releaseMusic("time")
    }
  })

  const removeUnlockListeners = () => {
    window.removeEventListener("pointerdown", unlock)
    window.removeEventListener("keydown", unlock)
  }

  const completeResume = (ctx: AudioContext) => {
    telemetry.contextState = ctx.state
    if (ctx.state !== "running") return
    reconcile()
    const resumedBed = current
    if (!resumedBed) return
    void playBed(resumedBed).then((started) => {
      if (started && ctx.state === "running" && current === resumedBed) {
        removeUnlockListeners()
      }
    })
  }

  // Keep an autoplay attempt from the initial page load. If the browser blocks
  // it, the bed remains available and the first user gesture retries play()
  // synchronously before asking AudioContext to resume.
  const attemptAutoplay = () => {
    if (musicVolume <= 0) return
    const ctx = ensureContext()
    if (!ctx) return
    reconcile(true)
    void ctx
      .resume()
      .then(() => completeResume(ctx))
      .catch(() => {
        telemetry.contextState = ctx.state
      })
  }

  // Autoplay fallback. The user gesture handler remains installed until the
  // context actually runs, so a failed load-time attempt cannot consume it.
  const unlock = () => {
    const ctx = ensureContext()
    if (!ctx) return
    reconcile(true)
    if (current) void playBed(current)
    void ctx
      .resume()
      .then(() => completeResume(ctx))
      .catch(() => {
        telemetry.contextState = ctx.state
      })
  }

  window.addEventListener("pointerdown", unlock)
  window.addEventListener("keydown", unlock)
  attemptAutoplay()
}

if (typeof window !== "undefined") {
  attach()
}
