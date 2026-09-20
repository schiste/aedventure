import type { EncounterTable } from "@aedventure/game-content"

// Authored content: weighted creature encounter tables. Consumed client-side to
// populate dungeon spawn slots (the sim does not simulate dungeon interiors), so
// these are not codegen'd into Rust.
export const ENCOUNTER_TABLES: readonly EncounterTable[] = [
  {
    id: "encounter.studio_vermin",
    label: "Studio Vermin",
    entries: [
      { creatureId: "rat", weight: 3, min: 1, max: 1 },
      { creatureId: "giant_rat", weight: 1, min: 1, max: 1 },
    ],
  },
]

export function encounterTableById(id: string): EncounterTable | undefined {
  return ENCOUNTER_TABLES.find((table) => table.id === id)
}
