// "What this involves": a surface's related entities, with their live state.
//
// This is the honest product use of `ui_elements.relatedIds`, and it is not the
// one the first version of the schema path assumed.
//
// `relatedIds` is cross-reference metadata — what a surface *concerns* — rather
// than a manifest of the rows to draw. The data says so plainly once read as a
// whole: `ui.panel.map` relates to `tile.survivor_cave` and `resource.bassline`,
// but a map panel is not made of a tile row and a resource row; those are the
// landmark it shows and the resource its reach depends on. `ui.panel.run`
// relates to all six resources, which would simply duplicate the resource
// readout the HUD already has. The content validator treats the field as
// referential integrity and claims nothing more.
//
// Rendered as a panel body, that produces duplication and, for the map, a panel
// that is not the thing it is named after. Rendered as a disclosure on the
// surface it describes, the same data answers a question the interface could
// not previously answer: what does this part of the game depend on, and how do
// those things stand right now.
//
// The mechanism is unchanged, and so is the payoff: authoring a related id
// makes it appear here, with no component written.
import type { EntitySchemaDef, UiElementDef } from "@aedventure/add-protocol"
import type { JSX } from "solid-js"
import { Show } from "solid-js"

import { isUiElementVisible, isWithinRevealTier, type RevealTier, type VisibilityContext } from "./schema"
import { panelContentIds, renderPanelContent, type EntityRendererRegistry } from "./schema-content"

export interface SchemaContextProps {
  element: UiElementDef | undefined
  context: () => VisibilityContext | null
  renderers: EntityRendererRegistry
  schemasById?: ReadonlyMap<string, EntitySchemaDef>
  flagIds?: ReadonlySet<string>
  tier?: () => RevealTier
  /** The label on the toggle. Defaults to what the element is called. */
  summary?: string
  depth?: number
}

/**
 * Collapsed by default, and absent entirely when the element names nothing or
 * its own visibility conditions say it does not apply. A disclosure that opens
 * onto nothing is worse than no disclosure.
 */
export function SchemaContext(props: SchemaContextProps): JSX.Element {
  const applies = (): boolean => {
    const element = props.element
    const context = props.context()
    if (!element || !context) return false
    if (panelContentIds(element).length === 0) return false
    if (!isWithinRevealTier(element, props.tier?.() ?? "default")) return false
    return isUiElementVisible(element, context)
  }
  const elementId = (): string => props.element?.id.replaceAll(".", "-") ?? "element"
  return (
    <Show when={applies() ? props.element : undefined}>
      {(element) => (
        <details
          id={`schema-context-${elementId()}`}
          class="copy-detail schema-context"
          data-qa={`schema-context-${elementId()}`}
        >
          <summary>{props.summary ?? `What ${element().label} involves`}</summary>
          <Show when={element().presentation?.playerHint}>
            <p class="panel-note">{element().presentation?.playerHint}</p>
          </Show>
          <div class="schema-context-rows">
            {
              renderPanelContent(element(), props.renderers, {
                schemasById: props.schemasById,
                flagIds: props.flagIds,
                depth: props.depth ?? 0,
              }) as unknown as JSX.Element
            }
          </div>
        </details>
      )}
    </Show>
  )
}
