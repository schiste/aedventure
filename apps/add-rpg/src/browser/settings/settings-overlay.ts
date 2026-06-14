// Self-mounting settings overlay. Activated by a module-script tag in
// index.html (no coupling to main.ts), it renders a gear launcher + panel into
// its own root appended to <body>, and drives the global settings store.
//
// Consumers (audio gain, input keybinds, i18n) read the current settings via
// `getCurrentSettings()` / the `add-settings-changed` window event, so they can
// subscribe without this module importing them.

import { createSignal } from "solid-js"
import html from "solid-js/html"
import { render } from "solid-js/web"

import { PSEUDO_LOCALE, onLocaleChange, t } from "@aedventure/add-domain"

import "./settings.css"
import "../i18n/boot" // registers the catalog + sets the initial locale
import {
  type AddSettings,
  type ColorBlindMode,
  DEFAULT_SETTINGS,
  applyDomSettings,
  loadSettings,
  saveSettings,
} from "./settings-state"

const [settings, setSettings] = createSignal<AddSettings>(loadSettings())
const [open, setOpen] = createSignal(false)

// Re-render labels when the locale changes. `tr` reads the tick inside a
// reactive scope so Solid re-evaluates every label on a locale switch.
const [localeTick, setLocaleTick] = createSignal(0)
onLocaleChange(() => setLocaleTick((n) => n + 1))
function tr(key: string): string {
  localeTick()
  return t(key)
}

// Apply persisted render preferences immediately on boot.
applyDomSettings(settings())

/** Current settings snapshot for non-Solid consumers (audio/input/i18n). */
export function getCurrentSettings(): AddSettings {
  return settings()
}

declare global {
  interface Window {
    addSettings?: () => AddSettings
  }
}
window.addSettings = getCurrentSettings

function update(patch: Partial<AddSettings>): void {
  const next = { ...settings(), ...patch }
  setSettings(next)
  saveSettings(next)
  applyDomSettings(next)
  // Notify decoupled consumers (audio gain, input, i18n) of the change.
  window.dispatchEvent(new CustomEvent<AddSettings>("add-settings-changed", { detail: next }))
}

const COLOR_BLIND_OPTIONS: readonly ColorBlindMode[] = [
  "none",
  "protanopia",
  "deuteranopia",
  "tritanopia",
]

// "en" is the baseline; the pseudo-locale flips every translated string so
// untranslated/hardcoded text stands out (a translation QA aid).
const LANGUAGE_OPTIONS = ["en", PSEUDO_LOCALE] as const
const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  [PSEUDO_LOCALE]: "Pseudo (QA)",
}

function pct(value: number): string {
  return `${Math.round(value * 100)}`
}

function SettingsOverlay() {
  return html`
    <button
      class="add-settings-button"
      type="button"
      aria-label=${() => tr("settings.open")}
      title=${() => tr("settings.title")}
      onClick=${() => setOpen(true)}
    >
      ⚙
    </button>
    ${() =>
      open()
        ? html`
            <div
              class="add-settings-scrim"
              role="dialog"
              aria-modal="true"
              aria-label="Settings"
              onClick=${(event: MouseEvent) => {
                if (event.target === event.currentTarget) setOpen(false)
              }}
            >
              <div class="add-settings-panel">
                <h2>${() => tr("settings.title")}</h2>

                <div class="add-settings-section">${() => tr("settings.section.audio")}</div>
                ${volumeRow("settings.master", "masterVolume")}
                ${volumeRow("settings.music", "musicVolume")}
                ${volumeRow("settings.sfx", "sfxVolume")}

                <div class="add-settings-section">
                  ${() => tr("settings.section.accessibility")}
                </div>
                <div class="add-settings-row">
                  <label for="add-set-reduced">${() => tr("settings.reducedMotion")}</label>
                  <input
                    id="add-set-reduced"
                    type="checkbox"
                    checked=${() => settings().reducedMotion}
                    onChange=${(event: Event) =>
                      update({ reducedMotion: (event.target as HTMLInputElement).checked })}
                  />
                </div>
                <div class="add-settings-row">
                  <label for="add-set-cb">${() => tr("settings.colorBlind")}</label>
                  <select
                    id="add-set-cb"
                    onChange=${(event: Event) =>
                      update({
                        colorBlindMode: (event.target as HTMLSelectElement).value as ColorBlindMode,
                      })}
                  >
                    ${COLOR_BLIND_OPTIONS.map(
                      (mode) => html`
                        <option value=${mode} selected=${() => settings().colorBlindMode === mode}>
                          ${() => tr(`colorBlind.${mode}`)}
                        </option>
                      `,
                    )}
                  </select>
                </div>
                <div class="add-settings-row">
                  <label for="add-set-scale">${() => tr("settings.textSize")}</label>
                  <input
                    id="add-set-scale"
                    type="range"
                    min="0.85"
                    max="1.5"
                    step="0.05"
                    value=${() => settings().textScale}
                    onInput=${(event: Event) =>
                      update({ textScale: Number((event.target as HTMLInputElement).value) })}
                  />
                  <span class="add-settings-value">${() => pct(settings().textScale)}%</span>
                </div>

                <div class="add-settings-section">${() => tr("settings.section.language")}</div>
                <div class="add-settings-row">
                  <label for="add-set-lang">${() => tr("settings.language")}</label>
                  <select
                    id="add-set-lang"
                    onChange=${(event: Event) =>
                      update({ language: (event.target as HTMLSelectElement).value })}
                  >
                    ${LANGUAGE_OPTIONS.map(
                      (lang) => html`
                        <option value=${lang} selected=${() => settings().language === lang}>
                          ${LANGUAGE_LABELS[lang] ?? lang}
                        </option>
                      `,
                    )}
                  </select>
                </div>

                <p class="add-settings-note">${() => tr("settings.note")}</p>

                <div class="add-settings-actions">
                  <button
                    type="button"
                    onClick=${() => update({ ...DEFAULT_SETTINGS })}
                  >
                    ${() => tr("settings.reset")}
                  </button>
                  <button type="button" onClick=${() => setOpen(false)}>
                    ${() => tr("settings.done")}
                  </button>
                </div>
              </div>
            </div>
          `
        : null}
  `
}

function volumeRow(labelKey: string, key: "masterVolume" | "musicVolume" | "sfxVolume") {
  const inputId = `add-set-${key}`
  return html`
    <div class="add-settings-row">
      <label for=${inputId}>${() => tr(labelKey)}</label>
      <input
        id=${inputId}
        type="range"
        min="0"
        max="1"
        step="0.05"
        value=${() => settings()[key]}
        onInput=${(event: Event) =>
          update({ [key]: Number((event.target as HTMLInputElement).value) } as Partial<AddSettings>)}
      />
      <span class="add-settings-value">${() => pct(settings()[key])}</span>
    </div>
  `
}

function mount(): void {
  const existing = document.getElementById("add-settings-root")
  if (existing) return
  const container = document.createElement("div")
  container.id = "add-settings-root"
  document.body.appendChild(container)
  render(SettingsOverlay, container)
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true })
  } else {
    mount()
  }
}
