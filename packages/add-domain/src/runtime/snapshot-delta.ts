import type { SimulationSnapshot, SnapshotDelta } from '@aedventure/add-protocol'

/**
 * Compute the top-level sections of `next` that differ from `prev`.
 *
 * Comparison is per top-level key by recursive structural equality, so a changed
 * section is emitted whole. This runs on the worker thread, off the UI thread —
 * the cost buys a smaller `postMessage` payload (e.g. the ~91-cell `hexes` array
 * is omitted on the many ticks it doesn't change).
 *
 * Invariant: `mergeSnapshotDelta(prev, diffSnapshot(prev, next))` deep-equals
 * `next`. Keys are never removed because the snapshot schema is fixed.
 */
export function diffSnapshot(
  prev: SimulationSnapshot,
  next: SimulationSnapshot,
): SnapshotDelta {
  const changed: Record<string, unknown> = {}
  for (const key of Object.keys(next) as (keyof SimulationSnapshot)[]) {
    if (!structurallyEqual(prev[key], next[key])) {
      changed[key as string] = next[key]
    }
  }
  return changed as SnapshotDelta
}

/**
 * Apply a delta over a base snapshot, returning a new full snapshot. Shallow
 * merge at the top level: each changed section replaces the previous one.
 */
export function mergeSnapshotDelta(
  base: SimulationSnapshot,
  changed: SnapshotDelta,
): SimulationSnapshot {
  return { ...base, ...changed }
}

/**
 * Recursive structural equality over the JSON-compatible value shapes the
 * snapshot contains: primitives, arrays, and plain objects. A recursive walk
 * also sidesteps `JSON.stringify` throwing on any `BigInt`.
 *
 * On a type mismatch the values are reported unequal, so the section is included
 * in the delta — diffs may over-include but never under-include.
 */
function structurallyEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((value, index) => structurallyEqual(value, b[index]))
  }

  if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as Record<string, unknown>)
    const bKeys = Object.keys(b as Record<string, unknown>)
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every((key) =>
      structurallyEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
    )
  }

  return false
}
