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
import { Show } from "solid-js"

import { normalizeUiCopy, shouldRevealCopyDetail } from "./format"

export type Tone = "neutral" | "accent" | "danger" | "muted"

export interface PanelProps {
  title?: string
  /** Sits opposite the title: a count, a clock, a close button. */
  aside?: JSX.Element
  tone?: Tone
  /** Stable hooks the QA suite selects on. */
  id?: string
  qa?: string
  collapsed?: boolean
  children: JSX.Element
}

/** A titled surface. The unit every part of the HUD is made of. */
export function Panel(props: PanelProps): JSX.Element {
  return (
    <section
      id={props.id}
      class="panel"
      data-tone={props.tone ?? "neutral"}
      data-qa={props.qa}
      data-collapsed={props.collapsed ? "true" : undefined}
    >
      <Show when={props.title}>
        <header class="panel-heading">
          <h2 class="panel-title">{props.title}</h2>
          <Show when={props.aside}>
            <div class="panel-aside">{props.aside}</div>
          </Show>
        </header>
      </Show>
      <div class="panel-body">{props.children}</div>
    </section>
  )
}

export interface RowProps {
  /** The thing itself. */
  label: JSX.Element
  /** Why it is the way it is: a cost, a blocker, a rate. */
  detail?: JSX.Element
  /** The number, or the control. */
  trailing?: JSX.Element
  tone?: Tone
  muted?: boolean
  id?: string
}

/** Label, an explanation underneath, and something on the right. */
export function Row(props: RowProps): JSX.Element {
  return (
    <article
      id={props.id}
      class="ui-row"
      data-tone={props.tone ?? "neutral"}
      data-muted={props.muted ? "true" : undefined}
    >
      <span class="ui-row-label">
        {props.label}
        <Show when={props.detail}>
          <small class="ui-row-detail">{props.detail}</small>
        </Show>
      </span>
      <Show when={props.trailing}>
        <div class="ui-row-trailing">{props.trailing}</div>
      </Show>
    </article>
  )
}

export interface StatProps {
  label: string
  value: JSX.Element
  /** Where the value is heading, when that is worth showing. */
  delta?: JSX.Element
  tone?: Tone
}

/** One number, named. */
export function Stat(props: StatProps): JSX.Element {
  return (
    <div class="ui-stat" data-tone={props.tone ?? "neutral"}>
      <span class="ui-stat-label">{props.label}</span>
      <strong class="ui-stat-value">{props.value}</strong>
      <Show when={props.delta}>
        <small class="ui-stat-delta">{props.delta}</small>
      </Show>
    </div>
  )
}

export interface ButtonProps {
  children: JSX.Element
  onClick: () => void
  disabled?: boolean
  variant?: "primary" | "ghost"
  id?: string
  actionId?: string
  ariaLabel?: string
  title?: string
}

/** Always `type="button"`: none of these live in a form, and the default submits. */
export function Button(props: ButtonProps): JSX.Element {
  return (
    <button
      id={props.id}
      type="button"
      class={props.variant === "ghost" ? "ghost-button" : "ui-button"}
      data-action-id={props.actionId}
      aria-label={props.ariaLabel}
      title={props.title}
      disabled={props.disabled}
      onClick={() => props.onClick()}
    >
      {props.children}
    </button>
  )
}

export interface SheetProps {
  open: boolean
  title?: string
  onDismiss?: () => void
  id?: string
  qa?: string
  children: JSX.Element
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
      <aside id={props.id} class="ui-sheet" data-qa={props.qa} role="complementary">
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
        <div class="ui-sheet-body">{props.children}</div>
      </aside>
    </Show>
  )
}

export interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  /** Confirm/cancel and friends. */
  actions?: JSX.Element
  id?: string
  qa?: string
  children: JSX.Element
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
          <div class="ui-dialog-body">{props.children}</div>
          <Show when={props.actions}>
            <footer class="ui-dialog-actions">{props.actions}</footer>
          </Show>
        </div>
      </div>
    </Show>
  )
}

/** Nothing to show, said deliberately rather than by rendering an empty list. */
export function Empty(props: { children: JSX.Element }): JSX.Element {
  return (
    <p class="quick-control-empty">
      <small>{props.children}</small>
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
