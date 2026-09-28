// The interface's vocabulary: the handful of shapes every panel is built from.
//
// Written in JSX rather than `solid-js/html` template literals. The templates
// are untyped strings — a misspelled prop or tag is found by a player, not by
// the compiler — and they force every interpolation inside a list to be written
// as a thunk, with nothing to catch it when it is not. JSX compiles to the same
// direct-DOM output, ahead of time, and is checked.
//
// These take `children` and presentation decisions, never game state. Anything
// that needs to know what a resource is belongs a layer up.
import type { JSX } from "solid-js"
import { Show, type Accessor } from "solid-js"

import { normalizeUiCopy, shouldRevealCopyDetail } from "./format"

type ReactiveElement = JSX.Element | Accessor<JSX.Element>

export type Tone =
  | "neutral"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted"

export interface PanelProps {
  title?: string
  /** Sits opposite the title: a count, a clock, a close button. */
  aside?: ReactiveElement
  tone?: Tone
  /** Stable hooks the QA suite selects on. */
  id?: string
  qa?: string
  collapsed?: boolean
  children: ReactiveElement
}

/** A titled surface. The unit every part of the HUD is made of. */
export function Panel(props: PanelProps): JSX.Element {
  return (
    <section
      id={props.id}
      class="ui-surface panel"
      data-tone={props.tone ?? "neutral"}
      data-qa={props.qa}
      data-collapsed={props.collapsed ? "true" : undefined}
    >
      <Show when={props.title}>
        <header class="ui-panel-heading panel-heading">
          <h2 class="ui-panel-title panel-title">{props.title}</h2>
          <Show when={resolve(props.aside)}>
            <div class="ui-panel-aside panel-aside">{resolve(props.aside)}</div>
          </Show>
        </header>
      </Show>
      <div class="ui-panel-body panel-body">{resolve(props.children)}</div>
    </section>
  )
}

export interface RowProps {
  /** The thing itself. */
  label: ReactiveElement
  /** Why it is the way it is: a cost, a blocker, a rate. */
  detail?: ReactiveElement
  /** The number, or the control. */
  trailing?: ReactiveElement
  tone?: Tone | (() => Tone)
  muted?: boolean
  entity?: string
  terrain?: string | (() => string)
  beatStatus?: string | (() => string)
  flagSet?: boolean | (() => boolean)
  id?: string
  className?: string | (() => string)
}

function resolve<T>(value: T | (() => T) | undefined): T | undefined {
  return typeof value === "function" ? (value as () => T)() : value
}

/** Label, an explanation underneath, and something on the right. */
export function Row(props: RowProps): JSX.Element {
  return (
    <article
      id={props.id}
      class={"ui-row " + (resolve(props.className) ?? "")}
      data-tone={resolve(props.tone) ?? "neutral"}
      data-muted={props.muted ? "true" : undefined}
      data-entity={props.entity}
      data-terrain={resolve(props.terrain)}
      data-beat-status={resolve(props.beatStatus)}
      data-flag-set={props.flagSet === undefined ? undefined : resolve(props.flagSet) ? "true" : "false"}
    >
      <span class="ui-row-label">
        {resolve(props.label)}
        <Show when={resolve(props.detail)}>
          <small class="ui-row-detail">{resolve(props.detail)}</small>
        </Show>
      </span>
      <Show when={resolve(props.trailing)}>
        <div class="ui-row-trailing">{resolve(props.trailing)}</div>
      </Show>
    </article>
  )
}

export interface StatProps {
  label: ReactiveElement
  value: ReactiveElement
  /** Where the value is heading, when that is worth showing. */
  delta?: ReactiveElement
  tone?: Tone | (() => Tone)
  severity?: string | (() => string)
  className?: string
}

/** One number, named. */
export function Stat(props: StatProps): JSX.Element {
  return (
    <div
      class={"ui-stat " + (props.className ?? "")}
      data-tone={resolve(props.tone) ?? "neutral"}
      data-severity={resolve(props.severity)}
    >
      <span class="ui-stat-label">{resolve(props.label)}</span>
      <strong class="ui-stat-value">{resolve(props.value)}</strong>
      <Show when={resolve(props.delta)}>
        <small class="ui-stat-delta">{resolve(props.delta)}</small>
      </Show>
    </div>
  )
}

export interface ChipProps {
  label: ReactiveElement
  value: ReactiveElement
  compactLabel?: ReactiveElement
  tone?: Tone | (() => Tone)
  className?: string | (() => string)
  id?: string
  dataResource?: string
  role?: JSX.HTMLAttributes<HTMLSpanElement>["role"]
  ariaLabel?: string | (() => string)
  title?: string | (() => string)
}

/** Compact label/value readout used by the status HUD and other dense surfaces. */
export function Chip(props: ChipProps): JSX.Element {
  return (
    <span
      id={props.id}
      class={"ui-chip " + (resolve(props.className) ?? "")}
      data-tone={resolve(props.tone) ?? "neutral"}
      data-resource={props.dataResource}
      role={props.role}
      aria-label={resolve(props.ariaLabel)}
      title={resolve(props.title)}
    >
      <span class="ui-chip-label">
        <Show
          when={resolve(props.compactLabel)}
          fallback={resolve(props.label)}
        >
          <span class="ui-chip-label-compact">{resolve(props.compactLabel)}</span>
          <span class="ui-chip-label-full">{resolve(props.label)}</span>
        </Show>
      </span>
      <strong class="ui-chip-value">{resolve(props.value)}</strong>
    </span>
  )
}

export interface ButtonProps {
  children: ReactiveElement
  onClick: () => void
  disabled?: boolean | (() => boolean)
  busy?: boolean | (() => boolean)
  pressed?: boolean | (() => boolean)
  variant?: "primary" | "secondary" | "ghost" | "danger"
  className?: string | (() => string)
  id?: string
  actionId?: string | (() => string)
  ariaLabel?: string | (() => string)
  title?: string | (() => string)
}

/** Always `type="button"`: none of these live in a form, and the default submits. */
export function Button(props: ButtonProps): JSX.Element {
  return (
    <button
      id={props.id}
      type="button"
      class={"ui-button " + (resolve(props.className) ?? "")}
      data-variant={props.variant ?? "secondary"}
      data-action-id={resolve(props.actionId)}
      aria-label={resolve(props.ariaLabel)}
      aria-pressed={resolve(props.pressed)}
      aria-busy={resolve(props.busy) ? "true" : undefined}
      title={resolve(props.title)}
      disabled={Boolean(resolve(props.disabled) || resolve(props.busy))}
      onClick={() => props.onClick()}
    >
      {resolve(props.children)}
    </button>
  )
}

export interface StatusProps {
  children: ReactiveElement
  tone?: Tone | (() => Tone)
  state?: string | (() => string)
  className?: string
  label?: string
}

/** Compact state label with a shared tone. */
export function Status(props: StatusProps): JSX.Element {
  return (
    <span
      class={"ui-status " + (props.className ?? "")}
      data-tone={resolve(props.tone) ?? "neutral"}
      data-state={resolve(props.state)}
      aria-label={resolve(props.label)}
    >
      {resolve(props.children)}
    </span>
  )
}

export interface SectionProps {
  title?: string
  aside?: ReactiveElement
  children: ReactiveElement
}

/** A ruled grouping within a larger panel. */
export function Section(props: SectionProps): JSX.Element {
  return (
    <section class="ui-section">
      <Show when={props.title || resolve(props.aside)}>
        <header class="ui-section-heading">
          <Show when={props.title}>
            <h3 class="ui-section-title">{props.title}</h3>
          </Show>
          <Show when={resolve(props.aside)}>{resolve(props.aside)}</Show>
        </header>
      </Show>
      {resolve(props.children)}
    </section>
  )
}

export interface MeterProps {
  value: number | (() => number)
  max?: number | (() => number)
  label: string | (() => string)
  tone?: Tone | (() => Tone)
  className?: string
}

/** A bounded progress value with shared visual and assistive semantics. */
export function Meter(props: MeterProps): JSX.Element {
  const max = () => {
    const candidate = resolve(props.max)
    return typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0
      ? candidate
      : 1
  }
  const value = () => {
    const candidate = resolve(props.value)
    return typeof candidate === "number" && Number.isFinite(candidate)
      ? Math.min(max(), Math.max(0, candidate))
      : 0
  }
  const percent = () => (value() / max()) * 100
  return (
    <div
      class={"ui-meter " + (props.className ?? "")}
      data-tone={resolve(props.tone) ?? "accent"}
      role="progressbar"
      aria-label={resolve(props.label)}
      aria-valuemin="0"
      aria-valuemax={max()}
      aria-valuenow={value()}
    >
      <span style={{ width: percent() + "%" }} />
    </div>
  )
}

export interface TimeReadoutProps {
  label: string
  value: ReactiveElement
  detail?: ReactiveElement
  progress: number | (() => number)
  active?: boolean | (() => boolean)
  className?: string | (() => string)
}

/** Shared clock readout with an accessible daylight progress meter. */
export function TimeReadout(props: TimeReadoutProps): JSX.Element {
  return (
    <div
      class={"ui-time-readout " + (resolve(props.className) ?? "")}
      role="group"
      aria-label={props.label}
      data-active={resolve(props.active) ? "true" : undefined}
    >
      <span class="ui-time-readout-value">{resolve(props.value)}</span>
      <Show when={resolve(props.detail)}>
        <small class="ui-time-readout-detail">{resolve(props.detail)}</small>
      </Show>
      <Meter
        className="ui-time-readout-meter"
        value={props.progress}
        max={1}
        label="Daylight level"
        tone="accent"
      />
    </div>
  )
}

export interface CalloutProps {
  tone: Exclude<Tone, "neutral" | "muted">
  label?: string
  children: ReactiveElement
}

/** A reason or warning kept distinct from ordinary panel content. */
export function Callout(props: CalloutProps): JSX.Element {
  return (
    <aside
      class="ui-callout"
      data-tone={props.tone}
      role={props.tone === "danger" ? "alert" : "note"}
      aria-label={resolve(props.label)}
    >
      {resolve(props.children)}
    </aside>
  )
}

export interface SheetProps {
  open: boolean
  title?: string
  onDismiss?: () => void
  id?: string
  qa?: string
  children: ReactiveElement
}

/**
 * A surface that slides in over the interface: the mobile context sheet, and
 * anything else that is present without being modal. `Show` keeps it out of the
 * DOM entirely while closed rather than hiding it, so nothing inside it is
 * focusable or announced.
 */
export function Sheet(props: SheetProps): JSX.Element {
  return (
    <Show when={props.open}>
      <aside id={props.id} class="ui-sheet" data-qa={props.qa} role="complementary" aria-label={props.title}>
        <Show when={props.title}>
          <header class="ui-sheet-heading">
            <h2>{props.title}</h2>
            <Show when={props.onDismiss}>
              <Button variant="ghost" ariaLabel="Dismiss" onClick={() => props.onDismiss?.()}>
                ×
              </Button>
            </Show>
          </header>
        </Show>
        <div class="ui-sheet-body">{resolve(props.children)}</div>
      </aside>
    </Show>
  )
}

export interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  /** Confirm/cancel and friends. */
  actions?: ReactiveElement
  id?: string
  qa?: string
  children: ReactiveElement
}

/**
 * Modal. Unlike `Sheet` this takes the interface over, so it carries the
 * labelling that says so and closes on Escape.
 */
export function Dialog(props: DialogProps): JSX.Element {
  const titleId = (): string => `${props.id ?? "dialog"}-title`
  return (
    <Show when={props.open}>
      <div class="ui-dialog-scrim" onClick={() => props.onClose()}>
        <div
          id={props.id}
          class="ui-dialog"
          data-qa={props.qa}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId()}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Escape") props.onClose()
          }}
        >
          <header class="ui-dialog-heading">
            <h2 id={titleId()}>{props.title}</h2>
            <Button variant="ghost" ariaLabel="Close" onClick={() => props.onClose()}>
              ×
            </Button>
          </header>
          <div class="ui-dialog-body">{resolve(props.children)}</div>
          <Show when={resolve(props.actions)}>
            <footer class="ui-dialog-actions">{resolve(props.actions)}</footer>
          </Show>
        </div>
      </div>
    </Show>
  )
}

/** Nothing to show, said deliberately rather than by rendering an empty list. */
export function Empty(props: { children: ReactiveElement }): JSX.Element {
  return (
    <p class="ui-empty quick-control-empty">
      <small>{resolve(props.children)}</small>
    </p>
  )
}

export interface DisclosureProps {
  id: string
  /** The always-visible label on the toggle. */
  summary: string
  /** The long form. */
  fullCopy: string | null | undefined
  /** What the player can already see, which decides whether this renders. */
  visibleCopy: string
  class?: string
}

/**
 * A `<details>` that exists only when the full copy says meaningfully more than
 * what is already on screen — otherwise the player gets a control that opens to
 * repeat what they just read.
 */
export function Disclosure(props: DisclosureProps): JSX.Element {
  return (
    <Show when={shouldRevealCopyDetail(props.fullCopy, props.visibleCopy)}>
      <details id={props.id} class={`copy-detail ${props.class ?? ""}`.trim()}>
        <summary>{props.summary}</summary>
        <p>{normalizeUiCopy(props.fullCopy)}</p>
      </details>
    </Show>
  )
}
