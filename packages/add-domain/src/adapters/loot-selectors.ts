import { hashUnit, lootDrop } from "@aedventure/game-content"

import { lootTableById } from "@aedventure/add-content"

// Resolve a loot table to a concrete drop for a specific location. Deterministic:
// the same cell always yields the same drop (no RNG), so re-entry/reload are
// consistent and the cleared-locations set already prevents re-looting. Variety
// comes from different cells (their keys), not re-rolls.
export function lootDropForLocation(
  tableId: string,
  locationKey: string,
): { itemId: string; qty: number } | undefined {
  const table = lootTableById(tableId)
  if (!table) return undefined
  return lootDrop(table, hashUnit(locationKey), hashUnit(`${locationKey}:q`))
}
