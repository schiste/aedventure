import type { LootTable } from "@aedventure/game-content"

// Authored content: weighted loot tables. A cell references a table id; the drop
// is resolved deterministically per location (see adapters/loot-selectors.ts).
// Client content (not codegen'd to Rust) — the sim is told the resolved item.
export const LOOT_TABLES: readonly LootTable[] = [
  {
    id: "loot.vermin",
    label: "Vermin",
    entries: [
      { itemId: "item.scrap_metal", weight: 4, min: 1, max: 2 },
      { itemId: "item.ration", weight: 1, min: 1, max: 1 },
    ],
  },
  {
    id: "loot.giant_vermin",
    label: "Giant Vermin",
    entries: [{ itemId: "item.scrap_metal", weight: 1, min: 2, max: 3 }],
  },
  {
    id: "loot.supply_crate",
    label: "Supply Crate",
    entries: [
      { itemId: "item.scrap_metal", weight: 3, min: 2, max: 4 },
      { itemId: "item.field_kit", weight: 1, min: 1, max: 1 },
    ],
  },
  {
    id: "loot.larder",
    label: "Larder",
    entries: [{ itemId: "item.ration", weight: 1, min: 1, max: 3 }],
  },
]

export function lootTableById(id: string): LootTable | undefined {
  return LOOT_TABLES.find((table) => table.id === id)
}
