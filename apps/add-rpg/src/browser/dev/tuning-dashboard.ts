// Dev-only live-tuning dashboard. A floating panel of balance sliders; moving
// one dispatches an `add-tuning-override` window event (a Reset dispatches
// `add-tuning-reset`). It never imports the sim client, so it's decoupled and
// dev-gated — the app forwards these events to the runtime:
//
//   window.addEventListener("add-tuning-override",
//     (e) => client.setBalanceOverride(e.detail.path, e.detail.value))
//   window.addEventListener("add-tuning-reset", () => client.resetBalanceOverrides())
//
// Guarded by import.meta.env.DEV so it never mounts (or matters) in prod.

import { createSignal } from "solid-js"
import html from "solid-js/html"
import { render } from "solid-js/web"

interface Knob {
  readonly path: string
  readonly label: string
  readonly min: number
  readonly max: number
  readonly step: number
  readonly def: number
}

// Curated high-value knobs; paths match crates/add-core/src/tuning.rs + balance.ts.
const KNOBS: readonly Knob[] = [
  { path: "combat.baseAttack", label: "Combat · base attack", min: 0, max: 20, step: 0.5, def: 3 },
  { path: "combat.baseHp", label: "Combat · base HP", min: 5, max: 80, step: 1, def: 24 },
  { path: "combat.damageVariance", label: "Combat · variance", min: 0, max: 0.5, step: 0.01, def: 0.15 },
  { path: "progression.xp0", label: "XP · first level", min: 10, max: 200, step: 5, def: 50 },
  { path: "progression.xpGrowth", label: "XP · growth", min: 1, max: 2, step: 0.01, def: 1.28 },
  { path: "progression.xpPerExpedition", label: "XP · per expedition", min: 0, max: 100, step: 1, def: 25 },
  { path: "bubble.holdSeconds", label: "Bubble · hold seconds", min: 0, max: 60, step: 1, def: 10 },
  { path: "survival.recoveryTimeSeconds1To0", label: "Survival · recovery s", min: 30, max: 600, step: 10, def: 240 },
]

const DEV = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV)

function emitOverride(path: string, value: number): void {
  window.dispatchEvent(new CustomEvent("add-tuning-override", { detail: { path, value } }))
}

function emitReset(): void {
  window.dispatchEvent(new CustomEvent("add-tuning-reset", {}))
}

function TuningDashboard() {
  const [open, setOpen] = createSignal(false)
  return html`
    <button
      class="add-tuning-button"
      type="button"
      title="Live tuning (dev)"
      onClick=${() => setOpen((value) => !value)}
    >
      🎚
    </button>
    ${() =>
      open()
        ? html`
            <div class="add-tuning-panel">
              <header>Live tuning <small>(dev only)</small></header>
              ${KNOBS.map((knob) => {
                const [value, setValue] = createSignal(knob.def)
                return html`
                  <div class="add-tuning-row">
                    <label>${knob.label}</label>
                    <input
                      type="range"
                      min=${knob.min}
                      max=${knob.max}
                      step=${knob.step}
                      value=${knob.def}
                      onInput=${(event: Event) => {
                        const next = Number((event.target as HTMLInputElement).value)
                        setValue(next)
                        emitOverride(knob.path, next)
                      }}
                    />
                    <span>${() => value()}</span>
                  </div>
                `
              })}
              <button type="button" class="add-tuning-reset" onClick=${emitReset}>
                Reset all overrides
              </button>
            </div>
          `
        : null}
  `
}

const STYLE = `
.add-tuning-button{position:fixed;right:12px;bottom:60px;z-index:9000;width:40px;height:40px;border-radius:50%;
  border:1px solid rgba(255,255,255,.25);background:rgba(40,20,20,.85);color:#ffd;font-size:18px;cursor:pointer}
.add-tuning-panel{position:fixed;right:12px;bottom:108px;z-index:9001;width:min(360px,92vw);max-height:70vh;overflow:auto;
  background:#1a141a;color:#eee;border:1px solid rgba(255,210,120,.3);border-radius:10px;padding:14px;font:12px/1.4 system-ui,sans-serif}
.add-tuning-panel header{font-size:14px;margin-bottom:8px}
.add-tuning-panel header small{opacity:.6}
.add-tuning-row{display:grid;grid-template-columns:1fr 1.2fr 3ch;gap:8px;align-items:center;padding:4px 0}
.add-tuning-row span{text-align:right;font-variant-numeric:tabular-nums;opacity:.85}
.add-tuning-reset{margin-top:10px;width:100%;padding:6px;border-radius:6px;border:1px solid rgba(255,255,255,.2);
  background:rgba(60,40,40,.9);color:#eee;cursor:pointer}
`

let disposeDashboard: (() => void) | null = null

export function mountTuningDashboard(): void {
  if (document.getElementById("add-tuning-root")) return
  const style = document.createElement("style")
  style.id = "add-tuning-style"
  style.textContent = STYLE
  document.head.appendChild(style)
  const container = document.createElement("div")
  container.id = "add-tuning-root"
  document.body.appendChild(container)
  disposeDashboard = render(TuningDashboard, container)
}

export function unmountTuningDashboard(): void {
  disposeDashboard?.()
  disposeDashboard = null
  document.getElementById("add-tuning-root")?.remove()
  document.getElementById("add-tuning-style")?.remove()
}

export const liveTuningDashboardAvailable = DEV

export function setTuningDashboardMounted(visible: boolean): void {
  if (!DEV) return
  if (visible) {
    mountTuningDashboard()
  } else {
    unmountTuningDashboard()
  }
}
