const assert = require("node:assert")
const {
  loadContent,
  printExplainGeneric,
  printGraph,
  printReverseLookup,
} = require("./add-content-tools.cjs")

const content = loadContent()
const registry = content.registry

for (const id of [
  "resource.bassline",
  "objective.restore_studio",
  "project.restore_studio",
  "structure.base",
  "encounter.studio_vermin",
  "tile.base_core",
  "story.beat.road_to_base",
]) {
  assert.ok(registry.primaryNodeById.has(id), `registry should explain ${id}`)
}

for (const [id, family] of [
  ["objective.restore_studio", "objective"],
  ["world_action.investigate_base", "world_action"],
  ["structure.base", "structure"],
  ["encounter.studio_vermin", "encounter"],
  ["tile.base_core", "tile"],
]) {
  const explanation = JSON.parse(printExplainGeneric(content, id, "json"))
  assert.equal(explanation.family, family)
  assert.ok(Array.isArray(explanation.dependants))
  assert.ok(Array.isArray(explanation.producers))
  assert.ok(Array.isArray(explanation.consumers))
  assert.ok(explanation.caps && typeof explanation.caps === "object")
}

const resourceUsers = registry.reverse.get("resource.stone") ?? []
assert.ok(resourceUsers.some((edge) => edge.from.id === "project.restore_studio"), "reverse lookup should include construction costs")
assert.ok(resourceUsers.some((edge) => edge.from.id === "objective.reach_ring_3") === false, "reverse lookup should not invent references")

const graph = JSON.parse(printGraph(content, { format: "json" }))
assert.equal(graph.schemaVersion, 1)
assert.ok(graph.nodes.some((node) => node.id === "encounter.studio_vermin"))
assert.ok(graph.edges.some((edge) => edge.from.id === "tile.base_core" && edge.to.id === "structure.base"))
assert.deepEqual(graph.story.unreachable, [])

const reverse = JSON.parse(printReverseLookup(registry, "tile.base_core", "json"))
assert.equal(reverse.target.family, "tile")
assert.ok(Array.isArray(reverse.usedBy))

const explanation = JSON.parse(printExplainGeneric(content, "objective.restore_studio", "json"))
assert.equal(explanation.family, "objective")
assert.equal(explanation.sourcePath, "packages/add-content/src/content/objectives.ts")
assert.ok(explanation.verification.includes("npm run content:check"))

const stone = JSON.parse(printExplainGeneric(content, "resource.stone", "json"))
assert.equal(stone.family, "resource")
assert.equal(stone.caps.baseCap, 1000)
assert.equal(stone.caps.behavior, "blocked_at_cap")
assert.ok(stone.dependants.some((edge) => edge.from.id === "project.restore_studio"))
assert.ok(stone.producers.some((flow) => flow.relatedIds.includes("role.scavenge")))
assert.ok(stone.consumers.some((flow) => flow.relatedIds.includes("project.restore_studio")))

const reverseStone = JSON.parse(printReverseLookup(registry, "resource.stone", "json"))
assert.deepEqual(reverseStone.dependants, reverseStone.usedBy)
assert.ok(reverseStone.dependants.length > 0)

console.log("ADD content registry/tooling tests passed.")
