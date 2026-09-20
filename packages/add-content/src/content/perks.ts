import type { Perk } from "@aedventure/game-content"

// Authored content: hero perks/traits. `requires` references other perk ids;
// `effects` multiply a named sim stat (scavenge_yield | construction_speed |
// crystal_output | hero_recovery). codegen -> Rust `const PERKS`; the sim reads
// effects, the UI reads label/description directly from this module.
export const PERKS: readonly Perk[] = [
  { id: "perk.scavenger", label: "Scavenger", description: "Salvage yields more scrap from ruins.", effects: [{ stat: "scavenge_yield", multiplier: 1.25 }], tags: ["economy"] },
  { id: "perk.steady_hands", label: "Steady Hands", description: "Construction and repairs complete faster.", effects: [{ stat: "construction_speed", multiplier: 1.15 }], tags: ["construction"] },
  { id: "perk.crystal_attuned", label: "Crystal Attuned", description: "Crystal stations generate more while staffed.", requires: ["perk.steady_hands"], effects: [{ stat: "crystal_output", multiplier: 1.15 }], tags: ["crystal"] },
  { id: "perk.field_medic", label: "Field Medic", description: "The Hero recovers from exposure faster.", effects: [{ stat: "hero_recovery", multiplier: 1.3 }], tags: ["survival"] },
]

export function perkById(id: string): Perk | undefined {
  return PERKS.find((perk) => perk.id === id)
}
