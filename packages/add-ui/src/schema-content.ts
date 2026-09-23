// Panel *contents* from the catalog, not just the panel's shell.
//
// `SchemaPanel` already took a panel's label, hint and visibility from
// `ui_elements`. Its body was still hand-written, so every new panel still
// meant new code — which is the thing that makes the interface, rather than the
// engine, decide how much game there can be.
//
// The missing piece was already authored. Every element carries `relatedIds`:
// `ui.panel.power` names two resources and two stations, `ui.panel.crystal`
// names its resources and roles. That is a declaration of what the panel is
// about. Given one renderer per kind of thing, a panel's body is just its
// related entities drawn in the order they were authored.
//
// So authoring an element with related ids now produces a working panel. No
// component is written, and none has to be extracted later.
import type { EntitySchemaDef, UiElementDef } from "@aedventure/add-protocol"

/**
 * How deep inside nested panels a renderer is being called.
 *
 * Elements may name other elements — `ui.panel.map` names `ui.map.cave_gate` —
 * so panels compose through the same mechanism as everything else. That makes
 * cycles possible: dropping self-references is not enough, because A can name B
 * which names A. The depth is the guard, and it is passed rather than tracked
 * globally so a renderer can decide for itself how far to go.
 */
export interface EntityRenderContext {
  readonly depth: number
}

/** How to draw one entity. Returns nothing when this build cannot draw it. */
export type EntityRenderer = (id: string, context: EntityRenderContext) => unknown

/** Keyed by entity kind: "resource", "role", "station", "ui", and so on. */
export type EntityRendererRegistry = Readonly<Record<string, EntityRenderer | undefined>>

/**
 * The kind of thing an id names.
 *
 * Ids are namespaced by kind — `resource.stone`, `story.beat.explore_base` —
 * so the prefix is the discriminator. An entity schema is preferred when one
 * exists, because it is authored rather than inferred, but only about a
 * quarter of referenced entities have one, so the prefix has to carry the rest.
 */
export function entityKindOf(
  id: string,
  schemasById?: ReadonlyMap<string, EntitySchemaDef>,
): string {
  const schema = schemasById?.get(id)
  if (schema) return schema.entityKind
  const separator = id.indexOf(".")
  return separator === -1 ? id : id.slice(0, separator)
}

/**
 * The ids a panel should draw, in authored order and without repeats.
 *
 * Order is meaningful — `relatedIds` is a list an author wrote, not a set — and
 * an id naming the panel itself is dropped, because several elements list
 * themselves among their related ids and a panel that contains itself does not
 * terminate.
 */
export function panelContentIds(element: UiElementDef): readonly string[] {
  const seen = new Set<string>([element.id])
  const ids: string[] = []
  for (const id of element.relatedIds) {
    if (seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

/**
 * Draw a panel's related entities.
 *
 * An id whose kind has no renderer is skipped rather than shown as a gap:
 * authored content runs ahead of the engine, and a row saying nothing is worse
 * than no row. `missing` exists so a developer surface can opt into seeing
 * them; the game passes nothing.
 */
export function renderPanelContent(
  element: UiElementDef,
  renderers: EntityRendererRegistry,
  options?: {
    schemasById?: ReadonlyMap<string, EntitySchemaDef>
    missing?: (id: string, kind: string) => unknown
    /** How deep this panel already is. Nested panels pass `depth + 1`. */
    depth?: number
  },
): readonly unknown[] {
  const context: EntityRenderContext = { depth: options?.depth ?? 0 }
  const drawn: unknown[] = []
  for (const id of panelContentIds(element)) {
    const kind = entityKindOf(id, options?.schemasById)
    const renderer = renderers[kind]
    const rendered = renderer ? renderer(id, context) : options?.missing?.(id, kind)
    if (rendered !== undefined && rendered !== null) drawn.push(rendered)
  }
  return drawn
}

/** How many levels of nested panel are drawn before nesting stops. */
export const MAX_PANEL_NESTING_DEPTH = 2

/**
 * Which kinds a panel needs before it can be drawn in full.
 *
 * Useful when deciding whether a schema-driven panel is worth showing at all,
 * and for a build-time check that authored content has not outrun the
 * renderers the app provides.
 */
export function unrenderableKinds(
  element: UiElementDef,
  renderers: EntityRendererRegistry,
  schemasById?: ReadonlyMap<string, EntitySchemaDef>,
): readonly string[] {
  const missing = new Set<string>()
  for (const id of panelContentIds(element)) {
    const kind = entityKindOf(id, schemasById)
    if (!renderers[kind]) missing.add(kind)
  }
  return [...missing].sort()
}
