import type { SimulationSnapshot } from "@aedventure/add-protocol"
import { ITEMS } from "@aedventure/add-content"

// Projects the Hero inventory for the UI: held items (quantity > 0) with their
// label and stack cap. Quantities come from the snapshot; defs from the catalog.
export interface AddInventoryEntry {
  readonly id: string
  readonly label: string
  readonly quantity: number
  readonly maxStack: number | null
  readonly usable: boolean
}

export function selectAddInventory(snapshot: SimulationSnapshot): readonly AddInventoryEntry[] {
  const inventory = snapshot.inventory ?? {}
  return ITEMS.map((item) => ({
    id: item.id,
    label: item.label,
    quantity: inventory[item.id] ?? 0,
    maxStack: item.maxStack ?? null,
    usable: item.useEffect != null,
  })).filter((entry) => entry.quantity > 0)
}
