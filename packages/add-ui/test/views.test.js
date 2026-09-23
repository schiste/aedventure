// Decision logic inside the extracted views. Rendering still needs a browser,
// but the choices these make — which reason to show, what "no time" means —
// do not, and they are where the bugs a player would notice actually live.
const assert = require("node:assert")

const { formatAffordabilityTime } = require("../dist/base-management.js")
const { selectedTileUsefulnessSummary } = require("../dist/tile-detail.js")
const { beatEligibilityLabel } = require("../dist/story-browser.js")
const { offlineReturnJobKindLabel } = require("../dist/offline-return.js")

// --- affordability ---------------------------------------------------------
// Three different states that a naive formatter would collapse into "0s".

assert.equal(
  formatAffordabilityTime(null),
  "ready",
  "nothing to wait for is not the same as no time left",
)
assert.equal(
  formatAffordabilityTime({ timeToAffordSeconds: null }),
  "blocked",
  "null seconds means it will never arrive, not that it has arrived",
)
assert.equal(formatAffordabilityTime({ timeToAffordSeconds: 0 }), "now")
assert.equal(formatAffordabilityTime({ timeToAffordSeconds: 125 }), "3m")

// --- tile usefulness -------------------------------------------------------

assert.equal(
  selectedTileUsefulnessSummary([]),
  "Useful for routing.",
  "every reachable tile is at least a step, so there is always something to say",
)
assert.equal(
  selectedTileUsefulnessSummary(["Stone here.", "Water nearby."]),
  "Stone here.",
  "the first reason is the headline; the rest are detail",
)

// --- beat eligibility ------------------------------------------------------
// Active and completed are both "not blocked", but only one is happening now,
// and a beat can be both completed and eligible again if it is repeatable.

assert.equal(beatEligibilityLabel({ active: true, completed: false, eligible: true }), "Active")
assert.equal(
  beatEligibilityLabel({ active: true, completed: true, eligible: true }),
  "Active",
  "active wins over done: it is what is on screen",
)
assert.equal(beatEligibilityLabel({ active: false, completed: true, eligible: true }), "Done")
assert.equal(beatEligibilityLabel({ active: false, completed: false, eligible: true }), "Eligible")
assert.equal(beatEligibilityLabel({ active: false, completed: false, eligible: false }), "Blocked")

// --- offline job kinds -----------------------------------------------------
// Each kind gets its own verb, because "finished" is wrong for an expedition.

assert.equal(offlineReturnJobKindLabel("construction"), "Construction finished")
assert.equal(offlineReturnJobKindLabel("processing"), "Processing finished")
assert.equal(offlineReturnJobKindLabel("expedition"), "Expedition returned")
assert.equal(offlineReturnJobKindLabel("resonance"), "Resonance tuned")

console.log("add-ui views: all assertions passed")

// --- story beat status -----------------------------------------------------
// Four states that a naive "done / not done" would collapse into two.

const { storyBeatStatusCopy, storyBeatTone } = require("../dist/entity-rows.js")

const beat = (over) => ({
  label: "Explore",
  arc: "base_onboarding",
  status: "upcoming",
  awaitingChoice: false,
  worldActionId: null,
  ...over,
})

assert.equal(storyBeatStatusCopy(beat({ status: "completed" })), "Done")

// A current beat waiting on the player is the only actionable row on the panel.
assert.equal(
  storyBeatStatusCopy(beat({ status: "current", awaitingChoice: true })),
  "Waiting on you",
)
assert.equal(
  storyBeatStatusCopy(beat({ status: "current", worldActionId: "world_action.explore_base" })),
  "Ready to act",
  "a current beat with a world action is something to do, not something to watch",
)
assert.equal(
  storyBeatStatusCopy(beat({ status: "current" })),
  "In progress",
  "current with neither a choice nor an action is genuinely just running",
)

// Waiting on the player beats having an action: the choice blocks the action.
assert.equal(
  storyBeatStatusCopy(
    beat({ status: "current", awaitingChoice: true, worldActionId: "world_action.explore_base" }),
  ),
  "Waiting on you",
)

// An upcoming beat names its arc rather than guessing what comes next, because
// beat selection is emergent and nothing has promised an order yet.
assert.equal(storyBeatStatusCopy(beat({ status: "upcoming" })), "base_onboarding")

assert.equal(storyBeatTone(beat({ status: "completed" })), "muted")
assert.equal(storyBeatTone(beat({ status: "current" })), "accent")
assert.equal(storyBeatTone(beat({ status: "upcoming" })), "neutral")

console.log("add-ui story beat rows: all assertions passed")
