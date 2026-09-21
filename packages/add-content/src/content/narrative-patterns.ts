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
    expiresAfterDays: 0,
    requiresCause: false,
  },
]

export function siftPatternById(id: string): SiftPatternDef | undefined {
  return SIFT_PATTERNS.find((pattern) => pattern.id === id)
}
