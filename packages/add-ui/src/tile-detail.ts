// The selected-tile card: what is here, and what it is good for.
import type { AddTileDetailSummary } from "@aedventure/add-presentation"
import html from "solid-js/html"

import { indexList, showWhen } from "./control-flow"
import { titleCase } from "./format"

/** Routing is the fallback use: every reachable tile is at least a step. */
const DEFAULT_USEFULNESS = "Useful for routing."

export function selectedTileUsefulnessSummary(reasons: readonly string[]): string {
  return reasons[0] ?? DEFAULT_USEFULNESS
}

export function selectedTileUsefulnessRows(reasons: () => readonly string[]): unknown {
  return indexList(
    () => (reasons().length > 0 ? reasons() : [DEFAULT_USEFULNESS]),
    (reason) => html`<span>${() => reason()}</span>`,
  )
}

export function selectedTileLinkRows(detail: () => AddTileDetailSummary): unknown {
  return [
    showWhen(
      () => detail().links.length === 0,
      () =>
        html`<span class="selected-tile-empty-link">
          No building, base, or dungeon submap is known here.
        </span>`,
    ),
    indexList(
      () => detail().links,
      (link) => html`
        <article class="selected-tile-link" data-kind=${() => link().kind}>
          <span>
            ${() => link().label}
            <small>${() => (link().enabled ? "Available" : link().blockedReason ?? "Locked")}</small>
          </span>
          <strong>${() => titleCase(link().kind.replaceAll("_", " "))}</strong>
        </article>
      `,
    ),
  ]
}
