import type { Item } from "@aedventure/game-content"

// Authored content: inventory/loot items. The content generator emits these
// definitions into the Rust catalog consumed by the authoritative simulation.
export const ITEMS: readonly Item[] = [
  { id: "item.scrap_metal", label: "Scrap Metal", stackable: true, maxStack: 99, tags: ["material", "salvage"] },
  { id: "item.ration", label: "Ration", stackable: true, maxStack: 20, useEffect: { kind: "restore_survival", amount: 0.3 }, tags: ["consumable", "food"] },
  { id: "item.echo_shard", label: "Echo Shard", stackable: true, maxStack: 50, tags: ["crystal", "crafting"] },
  { id: "item.field_kit", label: "Field Kit", stackable: false, maxStack: 1, useEffect: { kind: "restore_survival", amount: 0.6 }, tags: ["tool"] },
]

export function itemById(id: string): Item | undefined {
  return ITEMS.find((item) => item.id === id)
}
