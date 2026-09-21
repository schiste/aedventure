// Authored content: what each act does, and where. codegen -> Rust `NARRATIVE_ACTS`.
//
// Acts carry TIERS, never numbers. The engine's impact pipeline turns a tier
// into a final amount using the negativity, intent, cost, need, repetition and
// inheritance factors; see crates/add-core/src/narrative/log.rs. Writers pick
// an act and a tier; they never write arithmetic.
//
// `scope` names where an impact lands, resolved against the act's target at
// runtime:
//   Target            the person it was done to
//   ParentOf(Target)  their immediate group
//   FactionOf(Target) the faction at the top of their chain
// An explicit entity id also works, for acts aimed at a named group.

export type ActScope = "Target" | "ParentOf(Target)" | "FactionOf(Target)" | (string & {})

export type ActIntent = "deliberate" | "cruel" | "reckless" | "coerced" | "accidental"

export type ActTier = "trivial" | "minor" | "moderate" | "major" | "severe" | "defining"

export interface ActImpactDef {
  readonly scope: ActScope
  /** One of the eleven raw axes. */
  readonly axis: string
  readonly tier: ActTier
  /** +1 raises the axis, -1 lowers it. */
  readonly sign: number
}

export interface NarrativeActDef {
  readonly id: string
  readonly label: string
  readonly intent: ActIntent
  /**
   * Values this act expresses, weights summing to 1. An impact with `sign: 0`
   * takes its sign and strength from how each observer reads them, so one act
   * reads as virtue to one group and betrayal to another.
   */
  readonly expresses: readonly (readonly [string, number])[]
  /**
   * Default visibility. `witnessed` is the honest default: the target knows,
   * and so does whoever the engine reports as present. `public` means the
   * whole affected scope hears at once; `secret` means nobody does, and the
   * act changes nothing until it leaks.
   */
  readonly secrecy: "public" | "witnessed" | "secret"
  readonly impacts: readonly ActImpactDef[]
}

export const NARRATIVE_ACTS: readonly NarrativeActDef[] = [
  {
    // A dialogue act: the Hero gives away water they cannot spare.
    id: "act.share_scarce_water",
    label: "Share scarce water",
    intent: "deliberate",
    expresses: [["universalism", 1.0]],
    secrecy: "witnessed",
    impacts: [
      { scope: "Target", axis: "goodwill", tier: "major", sign: 1 },
      { scope: "Target", axis: "debt", tier: "moderate", sign: 1 },
      { scope: "ParentOf(Target)", axis: "goodwill", tier: "moderate", sign: 1 },
      // sign 0: the faction judges this by its own values, not by fiat.
      { scope: "FactionOf(Target)", axis: "alignment", tier: "moderate", sign: 0 },
    ],
  },
  {
    // A gameplay act: the Hero clears a nest threatening the group.
    id: "act.clear_nearby_threat",
    label: "Clear a nearby threat",
    intent: "deliberate",
    expresses: [["security", 0.6], ["benevolence", 0.4]],
    secrecy: "public",
    impacts: [
      { scope: "Target", axis: "competence", tier: "moderate", sign: 1 },
      { scope: "ParentOf(Target)", axis: "competence", tier: "moderate", sign: 1 },
      { scope: "ParentOf(Target)", axis: "dependence", tier: "minor", sign: 1 },
      { scope: "FactionOf(Target)", axis: "competence", tier: "minor", sign: 1 },
    ],
  },
  {
    // The counterweight: a universal norm, judged the same by everyone.
    id: "act.break_a_promise",
    label: "Break a promise",
    intent: "deliberate",
    expresses: [],
    // A promise is broken in private. It costs nothing until someone hears.
    secrecy: "witnessed",
    impacts: [
      { scope: "Target", axis: "integrity", tier: "major", sign: -1 },
      { scope: "Target", axis: "grievance", tier: "moderate", sign: 1 },
      { scope: "ParentOf(Target)", axis: "integrity", tier: "minor", sign: -1 },
    ],
  },
]

export function narrativeActById(id: string): NarrativeActDef | undefined {
  return NARRATIVE_ACTS.find((act) => act.id === id)
}
