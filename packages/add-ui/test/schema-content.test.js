// Deciding what a schema-driven panel draws. This is the layer that lets a
// panel exist without a component, so the rules here decide whether authored
// content appears at all.
const assert = require("node:assert")

const {
  entityKindOf,
  panelContentIds,
  renderPanelContent,
  unrenderableKinds,
} = require("../dist/schema-content.js")

const element = (id, relatedIds) => ({
  id,
  label: "Test",
  relatedIds,
  visibility: { allOf: [], anyOf: [] },
  presentation: null,
})

// --- kind derivation -------------------------------------------------------

assert.equal(entityKindOf("resource.stone"), "resource")
assert.equal(entityKindOf("story.beat.explore_base"), "story", "only the first segment is the kind")
assert.equal(entityKindOf("ui.panel.power"), "ui")
assert.equal(entityKindOf("bare"), "bare", "an id with no namespace is its own kind")

// An authored schema beats the prefix, because it was written rather than inferred.
const schemas = new Map([["resource.stone", { id: "resource.stone", entityKind: "material" }]])
assert.equal(entityKindOf("resource.stone", schemas), "material")
assert.equal(entityKindOf("resource.water", schemas), "resource", "falls back when absent")

// --- content ids -----------------------------------------------------------

assert.deepEqual(
  panelContentIds(element("ui.panel.a", ["resource.stone", "role.scavenge"])),
  ["resource.stone", "role.scavenge"],
  "authored order is preserved: relatedIds is a list someone wrote, not a set",
)

assert.deepEqual(
  panelContentIds(element("ui.panel.a", ["resource.stone", "resource.stone"])),
  ["resource.stone"],
  "a repeated id draws once",
)

// Several catalog elements list themselves among their related ids.
assert.deepEqual(
  panelContentIds(element("ui.panel.a", ["ui.panel.a", "resource.stone"])),
  ["resource.stone"],
  "a panel must not contain itself, or rendering does not terminate",
)

// --- rendering -------------------------------------------------------------

const renderers = {
  resource: (id) => `resource:${id}`,
  role: (id) => `role:${id}`,
}

assert.deepEqual(
  renderPanelContent(element("ui.panel.a", ["resource.stone", "role.scavenge"]), renderers),
  ["resource:resource.stone", "role:role.scavenge"],
)

assert.deepEqual(
  renderPanelContent(element("ui.panel.a", ["resource.stone", "station.mix"]), renderers),
  ["resource:resource.stone"],
  "a kind with no renderer is skipped, not shown as a gap: content runs ahead of the engine",
)

// A renderer that declines this particular entity is also skipped.
assert.deepEqual(
  renderPanelContent(element("ui.panel.a", ["resource.stone"]), {
    resource: () => null,
  }),
  [],
  "a renderer returning null draws nothing rather than an empty row",
)

// A developer surface can opt into seeing what is missing.
assert.deepEqual(
  renderPanelContent(element("ui.panel.a", ["station.mix"]), renderers, {
    missing: (id, kind) => `missing:${kind}:${id}`,
  }),
  ["missing:station:station.mix"],
)

// --- coverage --------------------------------------------------------------

assert.deepEqual(
  unrenderableKinds(
    element("ui.panel.a", ["resource.stone", "station.mix", "project.studio", "station.other"]),
    renderers,
  ),
  ["project", "station"],
  "reported once each and sorted, so a build check reads the same every run",
)

assert.deepEqual(
  unrenderableKinds(element("ui.panel.a", ["resource.stone"]), renderers),
  [],
)

console.log("add-ui schema-content: all assertions passed")
