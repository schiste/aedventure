// Player settings: persisted to localStorage, separate from the sim save (these
// are device/UX preferences, not game state). Pure logic here (type, defaults,
// load/save, DOM application) so it is unit-testable without a browser; the
// reactive overlay lives in settings-overlay.ts.

export type ColorBlindMode = "none" | "protanopia" | "deuteranopia" | "tritanopia"

export interface AddSettings {
  /** Master output level 0..1, scales music + sfx. */
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  /** Temporarily silence all non-realtime game audio without losing volume levels. */
  muted: boolean
  /** Suppress non-essential motion/animation. */
  reducedMotion: boolean
  /** Daltonization filter applied to the whole app. */
  colorBlindMode: ColorBlindMode
  /** Root font scale 0.85..1.5 (drives rem-based sizing). */
  textScale: number
  /** UI language tag (consumed once i18n lands). */
  language: string
  /** action id -> key name overrides (consumed by the input layer). */
  keybinds: Record<string, string>
}

export const SETTINGS_STORAGE_KEY = "add-rpg:settings:v1"

export const DEFAULT_SETTINGS: AddSettings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  muted: false,
  reducedMotion: false,
  colorBlindMode: "none",
  textScale: 1,
  language: "en",
  keybinds: {},
}

const COLOR_BLIND_MODES: readonly ColorBlindMode[] = [
  "none",
  "protanopia",
  "deuteranopia",
  "tritanopia",
]

function clamp(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

/**
 * Merge stored settings over defaults, tolerating missing/invalid keys (forward
 * and backward compatible) and clamping ranges. Never throws — bad data falls
 * back to defaults.
 */
export function normalizeSettings(raw: unknown): AddSettings {
  const input = (raw ?? {}) as Partial<AddSettings>
  const colorBlindMode = COLOR_BLIND_MODES.includes(input.colorBlindMode as ColorBlindMode)
    ? (input.colorBlindMode as ColorBlindMode)
    : DEFAULT_SETTINGS.colorBlindMode
  return {
    masterVolume: clamp(input.masterVolume as number, 0, 1, DEFAULT_SETTINGS.masterVolume),
    musicVolume: clamp(input.musicVolume as number, 0, 1, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: clamp(input.sfxVolume as number, 0, 1, DEFAULT_SETTINGS.sfxVolume),
    muted: typeof input.muted === "boolean" ? input.muted : DEFAULT_SETTINGS.muted,
    reducedMotion:
      typeof input.reducedMotion === "boolean"
        ? input.reducedMotion
        : DEFAULT_SETTINGS.reducedMotion,
    colorBlindMode,
    textScale: clamp(input.textScale as number, 0.85, 1.5, DEFAULT_SETTINGS.textScale),
    language: typeof input.language === "string" ? input.language : DEFAULT_SETTINGS.language,
    keybinds:
      input.keybinds && typeof input.keybinds === "object"
        ? { ...input.keybinds }
        : { ...DEFAULT_SETTINGS.keybinds },
  }
}

export function loadSettings(
  storage: Pick<Storage, "getItem"> = window.localStorage,
): AddSettings {
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY)
    return normalizeSettings(raw ? JSON.parse(raw) : null)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(
  settings: AddSettings,
  storage: Pick<Storage, "setItem"> = window.localStorage,
): void {
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable (private mode / quota) — settings stay in memory.
  }
}

/** Effective SFX/music gain after the master multiplier. */
export function effectiveSfxVolume(settings: AddSettings): number {
  return settings.muted ? 0 : settings.masterVolume * settings.sfxVolume
}

export function effectiveMusicVolume(settings: AddSettings): number {
  return settings.muted ? 0 : settings.masterVolume * settings.musicVolume
}

/**
 * Apply the render-affecting settings to the document root. These take effect
 * immediately and globally (the whole app inherits them) via data-attributes
 * and CSS custom properties styled in settings.css.
 */
export function applyDomSettings(
  settings: AddSettings,
  root: HTMLElement = document.documentElement,
): void {
  root.dataset.reducedMotion = settings.reducedMotion ? "true" : "false"
  root.dataset.colorBlind = settings.colorBlindMode
  root.style.setProperty("--text-scale", String(settings.textScale))
  // Scale rem-based sizing without disturbing the default 16px baseline reference.
  root.style.fontSize = `${Math.round(settings.textScale * 100)}%`
}
