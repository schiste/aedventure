const assert = require("node:assert")
const path = require("node:path")

const ROOT = path.resolve(__dirname, "..")
const { validateContentCatalog } = require(path.join(ROOT, "../game-content/dist/index.js"))
const { ITEMS } = require(path.join(ROOT, "dist/content/items.js"))
const { PERKS } = require(path.join(ROOT, "dist/content/perks.js"))
const { ENCOUNTER_TABLES } = require(path.join(ROOT, "dist/content/encounter-tables.js"))

// Each greenfield catalog has non-empty, unique ids.
for (const [kind, entries] of [
  ["item", ITEMS],
  ["perk", PERKS],
  ["encounter", ENCOUNTER_TABLES],
]) {
  const result = validateContentCatalog({ kind, entries })
  assert.ok(result.valid, `${kind} catalog invalid: ${result.errors.join("; ")}`)
}

// Perk `requires` must reference known perks.
const perkIds = new Set(PERKS.map((perk) => perk.id))
for (const perk of PERKS) {
  for (const req of perk.requires ?? []) {
    assert.ok(perkIds.has(req), `perk ${perk.id} requires unknown perk "${req}"`)
  }
}

// Encounter tables: non-empty, positive weights, creature ids present.
for (const table of ENCOUNTER_TABLES) {
  assert.ok(table.entries.length > 0, `encounter ${table.id} has no entries`)
  for (const entry of table.entries) {
    assert.ok(entry.creatureId, `encounter ${table.id} has an entry with no creatureId`)
    assert.ok(entry.weight > 0, `encounter ${table.id} entry ${entry.creatureId} has non-positive weight`)
  }
}

// Loot tables: valid + drop only known items, with sane quantity ranges.
const { LOOT_TABLES } = require(path.join(ROOT, "dist/content/loot-tables.js"))
assert.ok(validateContentCatalog({ kind: "loot", entries: LOOT_TABLES }).valid, "loot ids must be unique")
const itemIds = new Set(ITEMS.map((item) => item.id))
for (const table of LOOT_TABLES) {
  assert.ok(table.entries.length > 0, `loot ${table.id} has no entries`)
  for (const entry of table.entries) {
    assert.ok(itemIds.has(entry.itemId), `loot ${table.id} drops unknown item "${entry.itemId}"`)
    assert.ok(entry.weight > 0, `loot ${table.id} entry ${entry.itemId} has non-positive weight`)
    if (entry.min != null && entry.max != null) {
      assert.ok(entry.max >= entry.min, `loot ${table.id} entry ${entry.itemId} has max < min`)
    }
  }
}

console.log("add-content: all assertions passed")
