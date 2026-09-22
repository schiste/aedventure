// The schema-driven panel. Pure decisions live in `schema.ts`, which is plain
// TypeScript so it compiles to JavaScript that node can load directly — this
// file cannot, because `jsx: "preserve"` emits `.jsx`. Keeping the two apart is
// what makes the rules that decide what a player sees testable without a DOM.
import type { UiElementDef } from "@aedventure/add-protocol"
import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { Panel, type Tone } from "./primitives"
import { isUiElementVisible, isWithinRevealTier, type RevealTier, type VisibilityContext } from "./schema"

export interface SchemaPanelProps {
  /** The catalog entry. Absent means the element is not in this build. */
  element: UiElementDef | undefined
  context: () => VisibilityContext | null
  tier?: () => RevealTier
  tone?: Tone
  aside?: JSX.Element
  qa?: string
  children: JSX.Element
}

/**
 * A panel whose title, visibility and hint come from the catalog rather than
 * from this file. The contents are still supplied — the schema says *whether*
 * and *what it is called*, not how to draw a resource.
 */
export function SchemaPanel(props: SchemaPanelProps): JSX.Element {
  const visible = (): boolean => {
    const element = props.element
    const context = props.context()
    if (!element || !context) return false
    if (!isWithinRevealTier(element, props.tier?.() ?? "default")) return false
    return isUiElementVisible(element, context)
  }
  return (
    <Show when={visible()}>
      <Panel
        id={props.element?.id.replace(/\./g, "-")}
        title={props.element?.label}
        qa={props.qa}
        tone={props.tone}
        aside={props.aside}
      >
        <Show when={props.element?.presentation?.playerHint}>
          <p class="panel-note">{props.element?.presentation?.playerHint}</p>
        </Show>
        {props.children}
      </Panel>
    </Show>
  )
}
