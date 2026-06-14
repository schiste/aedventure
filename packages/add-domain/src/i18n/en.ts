import type { Messages } from "./index"

// English baseline catalog. The single source of prose for keyed strings; other
// locales (and the generated pseudo-locale) resolve against this. Player-facing
// strings migrate here key-by-key — start with the settings overlay, then UI
// panels and content labels.
export const EN_MESSAGES: Messages = {
  // Settings overlay (first migrated surface)
  "settings.title": "Settings",
  "settings.section.audio": "Audio",
  "settings.section.accessibility": "Accessibility",
  "settings.section.language": "Language",
  "settings.master": "Master",
  "settings.music": "Music",
  "settings.sfx": "Sound effects",
  "settings.reducedMotion": "Reduced motion",
  "settings.colorBlind": "Color-blind mode",
  "settings.textSize": "Text size",
  "settings.language": "Language",
  "settings.reset": "Reset to defaults",
  "settings.done": "Done",
  "settings.note":
    "Motion, color, and text settings apply instantly. Volume and language take effect as the audio and localization systems adopt them.",
  "settings.open": "Open settings",

  // Color-blind options
  "colorBlind.none": "none",
  "colorBlind.protanopia": "protanopia",
  "colorBlind.deuteranopia": "deuteranopia",
  "colorBlind.tritanopia": "tritanopia",

  // Plural example (CLDR categories under one key)
  "recruits.arrived.one": "{count} recruit arrived.",
  "recruits.arrived.other": "{count} recruits arrived.",
}
