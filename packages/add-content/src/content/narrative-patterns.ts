// Authored content: sifting patterns. codegen -> Rust `SIFT_PATTERNS`.
//
// A pattern is a small query over the event log: two slots filled by acts of
// given kinds, on the same person, in order. When one matches, a character can
// refer to what the player actually did, by name, and say why it matters now.
//
// Matching is a rule and lives in crates/add-core/src/narrative/sift.rs. This
// file owns only which arcs the game recognises.

export interface SiftPatternDef {
  readonly id: string
  readonly label: string
  /** Act kind that opens the arc. */
  readonly firstKind: string
  /** Act kind that closes it, on the same person. */
  readonly secondKind: string
  /** Shortest gap that still reads as a separate moment, in game days. */
  readonly minGapDays: number
  /** Beyond this the arc has gone cold. 0 means it never expires. */
  readonly expiresAfterDays: number
  /**
   * Whether the second act must name the first among its causes. Mercy repaid
   * needs the link — otherwise it is only two things that happened. A broken
   * oath does not: the sequence itself is the story.
   */
  readonly requiresCause: boolean
}

export const SIFT_PATTERNS: readonly SiftPatternDef[] = [
  {
    id: "arc.mercy_repaid",
    label: "Mercy repaid",
    firstKind: "mercy",
    secondKind: "aid",
    minGapDays: 2,
    expiresAfterDays: 90,
    requiresCause: true,
  },
  {
    id: "arc.broken_oath",
    label: "Broken oath",
    firstKind: "oath",
    secondKind: "forbidden",
    minGapDays: 0,
    // A year. An oath should hang over the Hero far longer than a favour does
    // — `arc.mercy_repaid` expires after 90 days — but not forever: a pattern
    // that never expires pins its first slot in the log for good, because the
    // engine must keep every oath in case one is finally broken. That stops
    // history from ever being summarised. A year is long enough that breaking
    // an oath still lands as a betrayal of that promise, and short enough that
    // a game's early oaths eventually settle.
    expiresAfterDays: 365,
    requiresCause: false,
  },
]

export function siftPatternById(id: string): SiftPatternDef | undefined {
  return SIFT_PATTERNS.find((pattern) => pattern.id === id)
}
