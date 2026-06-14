// The Music Director: a self-contained adaptive-music engine. It keeps a stack
// of musical *intents* (one per source), resolves the winner to a MusicTrack,
// and crossfades a procedurally-synthesized bed. Any source steers it the same
// way — call requestMusic()/releaseMusic(), or dispatch the equivalent window
// events from anywhere (story, sim-event bridge, time-of-day, an action button):
//
//   requestMusic({ source: "combat", priority: 5, mood: "tension" })
//   releaseMusic("combat")
//   window.dispatchEvent(new CustomEvent("add-music-intent",
//     { detail: { source: "story:cave", priority: 4, mood: "triumph" } }))
//
// Volume comes from the T3.1 settings store; the bed only starts after a user
// gesture (browser autoplay policy).

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
  oscillators: OscillatorNode[]
  fade: GainNode
  targetGain: number
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
  filter.frequency.value = track.filterHz

  const fade = ctx.createGain()
  fade.gain.value = 0
  filter.connect(fade)
  fade.connect(masterGain)

  const detune = track.detuneCents ?? 0
  const oscillators = track.semitones.map((semi, index) => {
    const osc = ctx.createOscillator()
    osc.type = track.waveform
    osc.frequency.value = track.rootHz * Math.pow(2, semi / 12)
    osc.detune.value = (index - (track.semitones.length - 1) / 2) * detune
    osc.connect(filter)
    osc.start()
    return osc
  })

  return { trackId: track.id, oscillators, fade, targetGain: track.gain }
}

function fadeOut(bed: ActiveBed, ctx: AudioContext): void {
  const now = ctx.currentTime
  bed.fade.gain.cancelScheduledValues(now)
  bed.fade.gain.setValueAtTime(bed.fade.gain.value, now)
  bed.fade.gain.linearRampToValueAtTime(0, now + CROSSFADE_SECONDS)
  for (const osc of bed.oscillators) {
    try {
      osc.stop(now + CROSSFADE_SECONDS + 0.05)
    } catch {
      // already stopped
    }
  }
}

function fadeIn(bed: ActiveBed, ctx: AudioContext): void {
  const now = ctx.currentTime
  bed.fade.gain.cancelScheduledValues(now)
  bed.fade.gain.setValueAtTime(0, now)
  bed.fade.gain.linearRampToValueAtTime(bed.targetGain, now + CROSSFADE_SECONDS)
}

/** Re-resolve the intent stack and crossfade if the winning track changed. */
function reconcile(): void {
  telemetry.intentCount = intents.size
  const ctx = ensureContext()
  if (!ctx || ctx.state !== "running") return

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

  // Autoplay: resume on the first user gesture, then start the baseline bed.
  const unlock = () => {
    const ctx = ensureContext()
    if (!ctx) return
    void ctx.resume().then(() => {
      telemetry.contextState = ctx.state
      reconcile()
    })
    window.removeEventListener("pointerdown", unlock)
    window.removeEventListener("keydown", unlock)
  }
  window.addEventListener("pointerdown", unlock)
  window.addEventListener("keydown", unlock)
}

if (typeof window !== "undefined") {
  attach()
}
