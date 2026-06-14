// App i18n bootstrap: register the English baseline, choose the initial locale
// (persisted setting > navigator detection), and keep the locale in sync with
// the settings store. Imported by the settings overlay so the catalog is ready
// before any t() renders.

import {
  EN_MESSAGES,
  availableLocales,
  detectLocale,
  registerLocale,
  setLocale,
} from "@aedventure/add-domain"

import { type AddSettings, loadSettings } from "../settings/settings-state"

let started = false

export function startI18n(): void {
  if (started) return
  started = true

  registerLocale("en", EN_MESSAGES)

  // Persisted language wins; otherwise detect from the browser.
  const saved = loadSettings().language
  const initial =
    saved && saved !== "auto" && saved !== "en" ? saved : detectLocale(availableLocales())
  setLocale(initial)

  if (typeof window !== "undefined") {
    window.addEventListener("add-settings-changed", (event) => {
      const detail = (event as CustomEvent<AddSettings>).detail
      if (detail?.language) setLocale(detail.language)
    })
  }
}

startI18n()
