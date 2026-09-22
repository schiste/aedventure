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
  /** Categories the sifter matches on, e.g. "mercy", "aid", "oath". */
  readonly kinds: readonly string[]
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
    kinds: ["aid", "generosity"],
    intent: "deliberate",
    expresses: [["universalism", 1.0]],
    secrecy: "witnessed",
    impacts: [
      { scope: "Target", axis: "goodwill", tier: "major", sign: 1 },
      { scope: "Target", axis: "debt", tier: "moderate", sign: 1 },
      { scope: "ParentOf(Target)", axis: "goodwill", tier: "moderate", sign: 1 },
      // sign 0: the faction judges this by its own values, not by fiat.
      { scope: "FactionOf(Target)", axis: "alignment", tier: "moderate", sign: 0 },
      // Also read by the person it was done to. Judged by the same values, but
      // unattenuated: a faction-scope reading reaches a member at about a tenth
      // of its weight, which is why `alignment` never left `mid` for anyone.
      { scope: "Target", axis: "alignment", tier: "moderate", sign: 0 },
    ],
  },
  {
    // A gameplay act: the Hero clears a nest threatening the group.
    id: "act.clear_nearby_threat",
    label: "Clear a nearby threat",
    kinds: ["aid", "violence"],
    intent: "deliberate",
    expresses: [["security", 0.6], ["benevolence", 0.4]],
    secrecy: "public",
    impacts: [
      { scope: "Target", axis: "competence", tier: "major", sign: 1 },
      { scope: "Target", axis: "dependence", tier: "moderate", sign: 1 },
      { scope: "ParentOf(Target)", axis: "competence", tier: "moderate", sign: 1 },
      { scope: "ParentOf(Target)", axis: "dependence", tier: "minor", sign: 1 },
      { scope: "FactionOf(Target)", axis: "competence", tier: "minor", sign: 1 },
    ],
  },
  {
    id: "act.spare_a_life",
    label: "Spare a life",
    kinds: ["mercy"],
    intent: "deliberate",
    expresses: [["benevolence", 0.7], ["universalism", 0.3]],
    secrecy: "witnessed",
    impacts: [
      { scope: "Target", axis: "goodwill", tier: "severe", sign: 1 },
      { scope: "Target", axis: "debt", tier: "major", sign: 1 },
      { scope: "ParentOf(Target)", axis: "alignment", tier: "moderate", sign: 0 },
      { scope: "Target", axis: "alignment", tier: "moderate", sign: 0 },
    ],
  },
  {
    // What a spared survivor does about it later.
    id: "act.aid_the_hero",
    label: "Aid the Hero",
    kinds: ["aid"],
    intent: "deliberate",
    expresses: [["benevolence", 1.0]],
    secrecy: "witnessed",
    impacts: [
      { scope: "Target", axis: "debt", tier: "moderate", sign: -1 },
      { scope: "Target", axis: "closeness", tier: "moderate", sign: 1 },
    ],
  },
  {
    // What a wronged survivor does about it: tells their crew.
    id: "act.denounce",
    label: "Denounce the Hero",
    kinds: ["denunciation"],
    intent: "deliberate",
    expresses: [["conformity", 0.6], ["security", 0.4]],
    secrecy: "public",
    impacts: [
      { scope: "Target", axis: "integrity", tier: "moderate", sign: -1 },
      { scope: "Target", axis: "goodwill", tier: "minor", sign: -1 },
    ],
  },
  {
    id: "act.swear_an_oath",
    label: "Swear an oath",
    kinds: ["oath"],
    intent: "deliberate",
    expresses: [["tradition", 0.5], ["conformity", 0.5]],
    secrecy: "public",
    impacts: [
      { scope: "Target", axis: "closeness", tier: "minor", sign: 1 },
    ],
  },
  {
    // The counterweight: a universal norm, judged the same by everyone.
    id: "act.break_a_promise",
    label: "Break a promise",
    kinds: ["forbidden", "harm"],
    intent: "deliberate",
    expresses: [],
    // A promise is broken in private. It costs nothing until someone hears.
    secrecy: "witnessed",
    impacts: [
      { scope: "Target", axis: "integrity", tier: "major", sign: -1 },
      { scope: "Target", axis: "grievance", tier: "moderate", sign: 1 },
      { scope: "Target", axis: "goodwill", tier: "minor", sign: -1 },
      { scope: "ParentOf(Target)", axis: "integrity", tier: "minor", sign: -1 },
    ],
  },
  {
    // --- Warmth ------------------------------------------------------------
    //
    // `affection` had no act at all: a writer could gate a scene on being liked
    // and nothing in the game could ever make anyone like you. Goodwill is
    // approval and is earned by usefulness; affection is warmth, and is earned
    // by staying when there is nothing to be done.
    id: "act.sit_through_the_night",
    label: "Sit through the night with someone",
    kinds: ["aid", "comfort"],
    intent: "deliberate",
    expresses: [["benevolence", 1.0]],
    secrecy: "witnessed",
    impacts: [
      { scope: "Target", axis: "affection", tier: "major", sign: 1 },
      { scope: "Target", axis: "closeness", tier: "major", sign: 1 },
    ],
  },
  {
    // The other direction, and the only act that raises `dominance`: the Hero
    // takes something from someone in front of the people whose opinion they
    // live by.
    id: "act.mock_before_the_crew",
    label: "Humiliate someone before their crew",
    kinds: ["harm", "humiliation"],
    intent: "deliberate",
    expresses: [["power", 1.0]],
    secrecy: "public",
    impacts: [
      { scope: "Target", axis: "affection", tier: "moderate", sign: -1 },
      { scope: "Target", axis: "goodwill", tier: "moderate", sign: -1 },
      // A second, heavier source of grievance. With only one, repeating it was
      // damped by repetition before the axis ever left `mid`; different acts
      // count separately, so a pattern of different cruelties accumulates the
      // way one cruelty repeated does not.
      { scope: "Target", axis: "grievance", tier: "major", sign: 1 },
      { scope: "Target", axis: "dominance", tier: "moderate", sign: 1 },
      { scope: "Target", axis: "alignment", tier: "moderate", sign: 0 },
      { scope: "ParentOf(Target)", axis: "affection", tier: "minor", sign: -1 },
    ],
  },
  {
    // --- Standing in the order ---------------------------------------------
    //
    // `dominance` is where the Hero sits relative to the person, not whether
    // they are liked. Taking command raises it; standing down lowers it. Both
    // are needed, or the axis only ever travels one way and the low bands are
    // as unreachable as the high ones were.
    id: "act.take_the_lead",
    label: "Take command when nobody else will",
    kinds: ["leadership"],
    intent: "deliberate",
    expresses: [["power", 0.6], ["security", 0.4]],
    secrecy: "public",
    impacts: [
      { scope: "Target", axis: "dominance", tier: "major", sign: 1 },
      { scope: "Target", axis: "competence", tier: "moderate", sign: 1 },
      // `dependence` reached members only through their group before, which
      // costs it four fifths of its weight on the way down.
      { scope: "Target", axis: "dependence", tier: "major", sign: 1 },
      { scope: "ParentOf(Target)", axis: "dependence", tier: "moderate", sign: 1 },
    ],
  },
  {
    id: "act.defer_to_the_crew",
    label: "Stand down and follow",
    kinds: ["deference"],
    intent: "deliberate",
    expresses: [["conformity", 0.6], ["benevolence", 0.4]],
    secrecy: "public",
    impacts: [
      { scope: "Target", axis: "dominance", tier: "major", sign: -1 },
      { scope: "Target", axis: "belonging", tier: "moderate", sign: 1 },
      { scope: "Target", axis: "closeness", tier: "minor", sign: 1 },
    ],
  },
  {
    // --- One of us ---------------------------------------------------------
    //
    // `belonging` is whether the Hero is one of them, which is not the same as
    // being liked or being useful: it is paid in shared discomfort.
    id: "act.keep_the_watch",
    label: "Take the worst watch so others sleep",
    kinds: ["aid", "sacrifice"],
    intent: "deliberate",
    expresses: [["benevolence", 0.6], ["conformity", 0.4]],
    secrecy: "public",
    impacts: [
      { scope: "Target", axis: "belonging", tier: "major", sign: 1 },
      { scope: "Target", axis: "affection", tier: "moderate", sign: 1 },
      { scope: "ParentOf(Target)", axis: "belonging", tier: "moderate", sign: 1 },
    ],
  },
  {
    // Walking out is a `forbidden` act, so it also answers an oath: leaving is
    // how most oaths are actually broken.
    id: "act.walk_out_on_the_crew",
    label: "Walk out when they needed you",
    kinds: ["forbidden", "abandonment"],
    intent: "deliberate",
    expresses: [["self_direction", 1.0]],
    secrecy: "public",
    impacts: [
      // Major, not severe: at severe this alone put two in five characters at
      // the bottom of the axis, which is a gate that never closes rather than a
      // consequence that lands.
      { scope: "Target", axis: "belonging", tier: "major", sign: -1 },
      { scope: "Target", axis: "closeness", tier: "major", sign: -1 },
      { scope: "Target", axis: "goodwill", tier: "moderate", sign: -1 },
      { scope: "Target", axis: "grievance", tier: "moderate", sign: 1 },
      { scope: "Target", axis: "alignment", tier: "moderate", sign: 0 },
      { scope: "ParentOf(Target)", axis: "belonging", tier: "moderate", sign: -1 },
    ],
  },
  {
    // --- Being believed ----------------------------------------------------
    //
    // `integrity` had three ways down and none up: nothing in the game could
    // raise it, so a Hero who broke one promise was mistrusted for the rest of
    // the game whatever they did afterwards. That is not a hard axis, it is a
    // one-way ratchet, and it pinned four fifths of the cast at the bottom.
    //
    // §5B keeps the asymmetry that matters — negativity weights integrity
    // hardest, so one betrayal still outweighs several kept words. Recovery
    // being slow is the design; recovery being impossible was not.
    id: "act.keep_a_promise",
    label: "Keep a promise at a cost",
    kinds: ["promise_kept", "reciprocity"],
    intent: "deliberate",
    expresses: [["benevolence", 0.5], ["conformity", 0.5]],
    secrecy: "witnessed",
    impacts: [
      { scope: "Target", axis: "integrity", tier: "major", sign: 1 },
      { scope: "Target", axis: "goodwill", tier: "moderate", sign: 1 },
      { scope: "ParentOf(Target)", axis: "integrity", tier: "moderate", sign: 1 },
    ],
  },
  {
    // Owning a failure costs standing and buys back trust, which is the trade
    // that makes the axis a relationship rather than a verdict.
    id: "act.admit_a_fault",
    label: "Admit a fault openly",
    kinds: ["confession"],
    intent: "deliberate",
    expresses: [["benevolence", 0.4], ["conformity", 0.3], ["universalism", 0.3]],
    secrecy: "public",
    impacts: [
      { scope: "Target", axis: "integrity", tier: "moderate", sign: 1 },
      { scope: "Target", axis: "dominance", tier: "moderate", sign: -1 },
      { scope: "ParentOf(Target)", axis: "integrity", tier: "minor", sign: 1 },
    ],
  },
  {
    // Nobody thanks you for it, and they believe you afterwards.
    id: "act.tell_an_unwelcome_truth",
    label: "Tell an unwelcome truth",
    kinds: ["honesty"],
    intent: "deliberate",
    expresses: [["universalism", 0.6], ["self_direction", 0.4]],
    secrecy: "public",
    impacts: [
      { scope: "Target", axis: "integrity", tier: "major", sign: 1 },
      { scope: "Target", axis: "affection", tier: "minor", sign: -1 },
      { scope: "Target", axis: "alignment", tier: "moderate", sign: 0 },
    ],
  },
  {
    // The counterweight goodwill was missing: being turned away is how a
    // survivor stops thinking well of you.
    id: "act.refuse_to_help",
    label: "Refuse to help when you could",
    kinds: ["refusal", "harm"],
    intent: "deliberate",
    expresses: [["power", 0.4], ["security", 0.6]],
    secrecy: "witnessed",
    impacts: [
      { scope: "Target", axis: "goodwill", tier: "major", sign: -1 },
      { scope: "Target", axis: "grievance", tier: "moderate", sign: 1 },
      { scope: "Target", axis: "dependence", tier: "moderate", sign: -1 },
      { scope: "ParentOf(Target)", axis: "goodwill", tier: "moderate", sign: -1 },
    ],
  },
  {
    // --- Settling the ledger -----------------------------------------------
    //
    // `grievance` is a ledger axis: §5A says ledger axes never decay, they
    // "settle through acts instead". Nothing settled it, so it only ever
    // accumulated and two in five characters ended at the top of it — a grudge
    // that could be earned and never answered.
    id: "act.make_amends",
    label: "Make amends for a wrong",
    kinds: ["reparation"],
    intent: "deliberate",
    expresses: [["benevolence", 0.6], ["conformity", 0.4]],
    secrecy: "witnessed",
    impacts: [
      { scope: "Target", axis: "grievance", tier: "major", sign: -1 },
      { scope: "Target", axis: "integrity", tier: "moderate", sign: 1 },
      { scope: "ParentOf(Target)", axis: "grievance", tier: "moderate", sign: -1 },
    ],
  },
  {
    // Competence had no way down, so it was a one-way ratchet like integrity
    // was — slower, because its sources were all moderate, but as one-sided.
    // Reckless: this is a judgement about the Hero's competence, and it lands
    // harder when the failure was avoidable.
    id: "act.fail_when_it_counted",
    label: "Fail visibly when it counted",
    kinds: ["failure"],
    intent: "reckless",
    expresses: [],
    secrecy: "public",
    impacts: [
      { scope: "Target", axis: "competence", tier: "major", sign: -1 },
      { scope: "Target", axis: "dependence", tier: "moderate", sign: -1 },
      { scope: "ParentOf(Target)", axis: "competence", tier: "moderate", sign: -1 },
    ],
  },
]

// --- Acts the starter sifting patterns are written against -----------------

export const NARRATIVE_ACTS_STORY: readonly NarrativeActDef[] = []

export function narrativeActById(id: string): NarrativeActDef | undefined {
  return NARRATIVE_ACTS.find((act) => act.id === id)
}
