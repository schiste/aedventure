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
assert.equal(entityKindOf("resource.stone", { schemasById: schemas }), "material")
assert.equal(
  entityKindOf("resource.water", { schemasById: schemas }),
  "resource",
  "falls back when absent",
)

// Flags are namespaced by group, not by kind, so the prefix names the part of
// the game they belong to rather than what they are. Without the lookup a flag
// renderer would need registering once per group, and again whenever content
// added another.
const flagIds = new Set(["crystal.removing_moss_unlocked", "base.studio_restored"])
assert.equal(entityKindOf("crystal.removing_moss_unlocked", { flagIds }), "flag")
assert.equal(entityKindOf("base.studio_restored", { flagIds }), "flag")
assert.equal(
  entityKindOf("crystal.removing_moss_unlocked"),
  "crystal",
  "without the lookup the group prefix is all there is to go on",
)
assert.equal(
  entityKindOf("resource.stone", { flagIds }),
  "resource",
  "an id that is not a flag is unaffected",
)

// A schema is more specific than "it is a flag", so it still wins.
assert.equal(
  entityKindOf("base.studio_restored", {
    flagIds,
    schemasById: new Map([["base.studio_restored", { entityKind: "milestone" }]]),
  }),
  "milestone",
)

// Routed through a render, the flag renderer is picked over the group one.
assert.deepEqual(
  renderPanelContent(
    element("ui.panel.a", ["crystal.removing_moss_unlocked"]),
    { flag: (id) => `flag:${id}`, crystal: (id) => `crystal:${id}` },
    { flagIds },
  ),
  ["flag:crystal.removing_moss_unlocked"],
)

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

// --- nesting depth ---------------------------------------------------------
// Elements name other elements, so panels compose through the same mechanism.
// Dropping self-references is not enough: A can name B which names A.

const depthsSeen = []
renderPanelContent(element("ui.panel.a", ["resource.stone"]), {
  resource: (id, context) => {
    depthsSeen.push(context.depth)
    return id
  },
})
assert.deepEqual(depthsSeen, [0], "a root panel renders at depth zero")

const nestedDepths = []
renderPanelContent(
  element("ui.panel.a", ["resource.stone"]),
  {
    resource: (id, context) => {
      nestedDepths.push(context.depth)
      return id
    },
  },
  { depth: 3 },
)
assert.deepEqual(nestedDepths, [3], "a nested panel passes its depth to its renderers")

// A renderer that recurses must be able to stop, and the depth is what lets it.
const { MAX_PANEL_NESTING_DEPTH } = require("../dist/schema-content.js")
assert.ok(MAX_PANEL_NESTING_DEPTH >= 1, "nesting one level deep has to be possible")

const cyclic = { a: element("ui.a", ["ui.b"]), b: element("ui.b", ["ui.a"]) }
let renders = 0
const renderUi = (id, context) => {
  renders += 1
  if (context.depth >= MAX_PANEL_NESTING_DEPTH) return null
  const next = id === "ui.a" ? cyclic.b : cyclic.a
  return renderPanelContent(next, { ui: renderUi }, { depth: context.depth + 1 })
}
renderPanelContent(cyclic.a, { ui: renderUi })
assert.ok(
  renders <= MAX_PANEL_NESTING_DEPTH + 1,
  `a cycle must terminate; rendered ${renders} times`,
)

console.log("add-ui schema-content: all assertions passed")
