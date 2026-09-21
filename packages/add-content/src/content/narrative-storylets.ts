// Authored content: storylet sidecars. codegen -> Rust `STORYLETS`.
//
// A storylet is an ink knot written for ROLES instead of named characters. The
// caster finds entities that fit, picks the most salient storylet, and runs it
// with that cast. One knot therefore fires for any pair that fits, which is
// what makes a small amount of authored prose cover a large amount of history.
//
// Role constraints live here, not in ink conditionals, so tools can analyse
// them: `narr reach` can ask whether a storylet is castable at all.

export type RoleBand = "very_low" | "low" | "mid" | "high" | "very_high"

export interface StoryletRoleDef {
  /** Knot parameter name, in declaration order. */
  readonly name: string
  /** The axis this role is chosen on, or empty for "anyone". */
  readonly axis: string
  /** Lowest band that qualifies. */
  readonly atLeast: RoleBand
  /** Highest band that qualifies. */
  readonly atMost: RoleBand
}

export interface StoryletDef {
  readonly id: string
  /** The ink knot, which takes the roles as parameters in order. */
  readonly knot: string
  readonly roles: readonly StoryletRoleDef[]
  /** Higher outranks lower. Write the generic version low. */
  readonly baseSalience: number
  /** Game days before this storylet may be cast again. */
  readonly cooldownDays: number
  /** Extra salience when this arc has matched. */
  readonly triggerArc: string
}

export const STORYLETS: readonly StoryletDef[] = [
  {
    // The generic version: two people who both know the Hero at all.
    id: "storylet.two_survivors_talk",
    knot: "sl_two_survivors_talk",
    roles: [
      { name: "x", axis: "", atLeast: "very_low", atMost: "very_high" },
      { name: "y", axis: "", atLeast: "very_low", atMost: "very_high" },
    ],
    baseSalience: 10,
    cooldownDays: 2,
    triggerArc: "",
  },
  {
    // The specific version. It outranks the generic one when it can be cast,
    // so a player who has actually wronged someone gets the bespoke scene.
    //
    // Keyed on integrity rather than grievance: repeated identical acts decay
    // by repetition, so grievance plateaus, while a pattern of broken promises
    // drives integrity down hard. "Someone who no longer believes the Hero's
    // word" is also the more legible cast for a writer.
    id: "storylet.wronged_and_witness",
    knot: "sl_wronged_and_witness",
    roles: [
      { name: "x", axis: "integrity", atLeast: "very_low", atMost: "low" },
      { name: "y", axis: "", atLeast: "very_low", atMost: "very_high" },
    ],
    baseSalience: 40,
    cooldownDays: 5,
    triggerArc: "arc.broken_oath",
  },
]

export function storyletById(id: string): StoryletDef | undefined {
  return STORYLETS.find((storylet) => storylet.id === id)
}
