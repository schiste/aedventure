// The shared text rules for turning a game id into something a player reads.
//
// These used to be five separate `titleCase` copies across the ADD packages,
// and they disagreed: the same `survivor_cave` came out as "Survivor_cave" in
// one panel and "Survivor Cave" in another, so which one a player saw depended
// on which panel happened to draw it. One definition, one answer, checked
// without a browser.
//
// It lives in add-presentation because add-ui already depends on this package
// (for `flagValue` among others), so re-exporting from there needs no new edge
// and cannot cycle. `apps/add-rpg` imports it from add-ui and is unaffected.

/**
 * Turn a game id or slug into a player-facing label.
 *
 * Underscores and runs of whitespace are the same thing to a reader, so both
 * collapse to a single space and every word is capitalised. Hyphens are left
 * alone on purpose: no authored ADD id uses one as a separator, and rewriting
 * them would silently change labels other panels already show.
 *
 * A missing id renders as an empty label rather than throwing. Callers pass ids
 * straight out of snapshots, and an absent one should read as nothing instead of
 * taking down the panel that draws it.
 */
export function titleCase(value: string | null | undefined): string {
  if (!value) return ""
  return value
    .split(/[_\s]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
