// The rules that decide what a player is shown.
//
// These are the first tests in this repo below the screenshot level. Until the
// interface was split into components taking props, there was nothing to test
// smaller than a whole browser: every check was "render the game and compare
// pixels", which catches *that* something broke and never *what*.
const assert = require("node:assert")

const {
  evaluateVisibilityCondition,
  isUiElementVisible,
  isWithinRevealTier,
  orderUiElements,
} = require("../dist/schema.js")

/** A snapshot with only the fields the visibility conditions read. */
function snapshotFixture(overrides = {}) {
  return {
    heroSurvival: {
      viralLoadRatio: 0,
      location: "studio",
      returnJourneySeconds: 0,
      echoScars: 0,
      ...(overrides.heroSurvival ?? {}),
    },
    roster: { heroAssigned: false, heroRoleId: "", totalCrew: 0, crewByRole: {}, ...(overrides.roster ?? {}) },
    recruitment: { totalRecruitedThisRun: 0, pendingRecruits: [], ...(overrides.recruitment ?? {}) },
    objectives: { recruitmentEnabled: false, ...(overrides.objectives ?? {}) },
    power: { brownoutActive: false, ...(overrides.power ?? {}) },
  }
}

function contextFixture(overrides = {}) {
  return {
    snapshot: snapshotFixture(overrides.snapshot ?? {}),
    flag: overrides.flag ?? (() => false),
    resourceAmount: overrides.resourceAmount ?? (() => 0),
  }
}

// --- individual conditions -------------------------------------------------

assert.equal(evaluateVisibilityCondition({ kind: "always" }, contextFixture()), true)

assert.equal(
  evaluateVisibilityCondition(
    { kind: "flag_set", flag_id: "base.studio_restored" },
    contextFixture({ flag: (id) => id === "base.studio_restored" }),
  ),
  true,
  "flag_set reads the resolver it was given",
)
assert.equal(
  evaluateVisibilityCondition(
    { kind: "flag_unset", flag_id: "base.studio_restored" },
    contextFixture({ flag: (id) => id === "base.studio_restored" }),
  ),
  false,
  "flag_unset is the negation, not a separate lookup",
)

assert.equal(
  evaluateVisibilityCondition(
    { kind: "resource_positive", resource_id: "resource.stone" },
    contextFixture({ resourceAmount: (id) => (id === "resource.stone" ? 4 : 0) }),
  ),
  true,
)
assert.equal(
  evaluateVisibilityCondition(
    { kind: "resource_positive", resource_id: "resource.stone" },
    contextFixture({ resourceAmount: () => 0 }),
  ),
  false,
  "zero is not positive",
)

assert.equal(
  evaluateVisibilityCondition(
    { kind: "hero_outside_bubble" },
    contextFixture({ snapshot: { heroSurvival: { location: "outside_bubble" } } }),
  ),
  true,
)
assert.equal(
  evaluateVisibilityCondition(
    { kind: "hero_outside_bubble" },
    contextFixture({ snapshot: { heroSurvival: { location: "bubble" } } }),
  ),
  false,
  "inside the field is not outside the bubble, even though both are away from the Studio",
)

assert.equal(
  evaluateVisibilityCondition(
    { kind: "role_assigned", role_id: "role.scavenge" },
    contextFixture({ snapshot: { roster: { heroAssigned: true, heroRoleId: "role.scavenge" } } }),
  ),
  true,
)
assert.equal(
  evaluateVisibilityCondition(
    { kind: "role_assigned", role_id: "role.scavenge" },
    contextFixture({ snapshot: { roster: { heroAssigned: false, heroRoleId: "role.scavenge" } } }),
  ),
  false,
  "holding the role while unassigned does not count as assigned",
)

// An element authored against a condition this build has never heard of must
// hide, not show: content can run ahead of the engine.
assert.equal(evaluateVisibilityCondition({ kind: "not_a_real_condition" }, contextFixture()), false)

// --- allOf / anyOf ---------------------------------------------------------

const element = (visibility, presentation = null) => ({
  id: "ui.panel.test",
  label: "Test",
  relatedIds: [],
  visibility,
  presentation,
})

assert.equal(
  isUiElementVisible(element({ allOf: [], anyOf: [] }), contextFixture()),
  true,
  "an element that asks for nothing is visible",
)
assert.equal(
  isUiElementVisible(
    element({ allOf: [{ kind: "always" }, { kind: "brownout_active" }], anyOf: [] }),
    contextFixture(),
  ),
  false,
  "allOf needs every condition",
)
assert.equal(
  isUiElementVisible(
    element({ allOf: [], anyOf: [{ kind: "brownout_active" }, { kind: "always" }] }),
    contextFixture(),
  ),
  true,
  "anyOf needs only one",
)
assert.equal(
  isUiElementVisible(
    element({ allOf: [{ kind: "always" }], anyOf: [{ kind: "brownout_active" }] }),
    contextFixture(),
  ),
  false,
  "a satisfied allOf does not excuse a failed anyOf",
)

// --- reveal tiers ----------------------------------------------------------

assert.equal(isWithinRevealTier(element({ allOf: [], anyOf: [] }), "default"), true)
assert.equal(
  isWithinRevealTier(element({ allOf: [], anyOf: [] }, { reveal: "debug", displayPriority: 0 }), "default"),
  false,
  "debug elements stay hidden at the default tier",
)
assert.equal(
  isWithinRevealTier(element({ allOf: [], anyOf: [] }, { reveal: "advanced", displayPriority: 0 }), "debug"),
  true,
  "a higher tier includes everything below it",
)

// --- ordering --------------------------------------------------------------

const ordered = orderUiElements([
  { ...element({ allOf: [], anyOf: [] }, { displayPriority: 20, reveal: "default" }), label: "Third" },
  { ...element({ allOf: [], anyOf: [] }, { displayPriority: 10, reveal: "default" }), label: "First" },
  { ...element({ allOf: [], anyOf: [] }, { displayPriority: 20, reveal: "default" }), label: "Second" },
])
assert.deepEqual(
  ordered.map((entry) => entry.label),
  ["First", "Second", "Third"],
  "priority first, then label so equal priorities do not shuffle between frames",
)

const originals = [
  { ...element({ allOf: [], anyOf: [] }, { displayPriority: 2, reveal: "default" }), label: "B" },
  { ...element({ allOf: [], anyOf: [] }, { displayPriority: 1, reveal: "default" }), label: "A" },
]
orderUiElements(originals)
assert.equal(originals[0].label, "B", "ordering must not mutate the catalog it was handed")

console.log("add-ui schema: all assertions passed")
