// Authored content: the quest objective chain. Each objective completes when all
// its `conditions` hold (the unified Condition vocabulary, evaluated in the
// sim), firing `rewards` (EffectDef) once. A salience selector activates the
// lowest-`sequence` incomplete objective — the same pattern as storylets — which
// generalizes the former single hardcoded "reach ring 3" milestone.
//
// Conditions/rewards are authored as kind-tagged objects (matching the codegen
// CONDITION / EFFECTS descriptors) and codegen'd into the Rust catalog.

interface AuthoredTagged {
  readonly kind: string
  readonly [field: string]: unknown
}

export interface ObjectiveDef {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly sequence: number
  readonly conditions: readonly AuthoredTagged[]
  readonly rewards: readonly AuthoredTagged[]
}

export const OBJECTIVES: readonly ObjectiveDef[] = [
  {
    id: "objective.restore_studio",
    label: "Restore the Studio",
    description: "Repair the Studio so it can anchor the base.",
    sequence: 1,
    conditions: [{ kind: "flag_set", flag_id: "base.studio_restored" }],
    rewards: [{ kind: "note", text: "Objective complete: the Studio stands again." }],
  },
  {
    id: "objective.build_fire_pit",
    label: "Build the Fire Pit",
    description: "Raise morale by lighting the Fire Pit.",
    sequence: 2,
    conditions: [{ kind: "flag_set", flag_id: "base.fire_pit_built" }],
    rewards: [{ kind: "note", text: "Objective complete: the Fire Pit is lit." }],
  },
  {
    id: "objective.reach_ring_3",
    label: "Expand the Bubble to Ring 3",
    description: "Stabilize the field out to the third ring, within reach of the Survivor Cave.",
    sequence: 3,
    conditions: [{ kind: "bubble_reach_at_least", n: 3 }],
    rewards: [
      { kind: "note", text: "Objective complete: the bubble reaches the cave's range." },
      { kind: "grant_resource", resource_id: "resource.vibes", amount: 25 },
    ],
  },
  {
    id: "objective.first_recruit",
    label: "Recruit a Survivor",
    description: "Bring the first survivor home from the cave.",
    sequence: 4,
    conditions: [{ kind: "recruited_any" }],
    rewards: [{ kind: "note", text: "Objective complete: you are no longer alone." }],
  },
]

export function objectiveById(id: string): ObjectiveDef | undefined {
  return OBJECTIVES.find((objective) => objective.id === id)
}
