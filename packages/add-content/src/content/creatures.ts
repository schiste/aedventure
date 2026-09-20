// Authored content: combat-capable creatures. Unlike encounter and loot tables
// (resolved client-side), creatures are codegen'd into the Rust catalog so the
// sim resolves combat authoritatively (see simulation.rs `progress_combat`).
//
// `threat` (0..1) scales how dangerous a creature is — higher threat means more
// wounds on the way to victory and a greater chance of being driven to retreat.

export interface Creature {
  readonly id: string
  readonly label: string
  /** Creature hit points the Hero must grind down to win. */
  readonly hp: number
  /** Damage dealt to the Hero per round (before variance). */
  readonly attack: number
  /** Danger factor 0..1; scales wounds taken and retreat risk. */
  readonly threat: number
  /** Track XP granted to the Hero on victory. */
  readonly xpReward: number
}

export const CREATURES: readonly Creature[] = [
  { id: "rat", label: "Rat", hp: 8, attack: 1.2, threat: 0.15, xpReward: 6 },
  { id: "giant_rat", label: "Giant Rat", hp: 20, attack: 3.0, threat: 0.4, xpReward: 16 },
]

export function creatureById(id: string): Creature | undefined {
  return CREATURES.find((creature) => creature.id === id)
}
