/**
 * Turning content ids into DOM ids and short labels.
 *
 * Also lifted out of `main.ts` for the reason described in `add-cells.ts`: pure
 * functions of a string, so testable without a browser, and previously not
 * tested because they were unreachable without one.
 *
 * Two id shapes, and the difference matters:
 *
 * - `slugForId` produces a lowercase, dash-separated, trimmed slug. It is used
 *   where the result must be stable and readable: a button id, a stored key.
 * - `safeElementId` only replaces characters that cannot appear in an id. It
 *   preserves case, because some callers round-trip the value back to a lookup
 *   that is case-sensitive.
 *
 * Collapsing them would be the tidier-looking refactor and would be wrong.
 */

/** Lowercase, dash-separated, no leading or trailing dash. Stable and readable. */
export function slugForId(id: string): string {
  return id.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()
}

/**
 * Only replaces characters that are illegal in an id. Case is preserved.
 *
 * The distinction from `slugForId` is why this is not a call to it: an id read
 * back out of the DOM has to match what was written, and lowercasing here would
 * break any lookup that compares against the original casing.
 */
export function safeElementId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-")
}
