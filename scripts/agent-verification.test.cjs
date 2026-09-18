"use strict"

const assert = require("node:assert/strict")
const {
  classifyChangedPaths,
  normalizeTaskBrief,
  outputHints,
} = require("./agent-verification-lib.cjs")

const addAppPlan = classifyChangedPaths(["apps/add-rpg/src/browser/main.ts"])
assert.ok(addAppPlan.plan.some((check) => check.id === "add-ui-focused"))
assert.ok(!addAppPlan.plan.some((check) => check.id === "full-target-stack-gate"))

const scenarioPlan = classifyChangedPaths(["scenarios/add/offline-return.json"])
assert.ok(scenarioPlan.plan.some((check) => check.id === "add-scenario-tests"))
assert.ok(scenarioPlan.plan.some((check) => check.id === "scenario-offline-return"))
assert.ok(scenarioPlan.plan.every((check) => check.id !== "full-target-stack-gate"))

const docsPlan = classifyChangedPaths(["docs/add-capability-map.md"])
assert.ok(docsPlan.plan.some((check) => check.id === "documentation-contract"))

const readyBrief = normalizeTaskBrief(
  `# Task\n\n## Player outcome\nA player can do the thing.\n\n## Authoritative layer\n- Owning layer/path: crates/add-core/\n\n## Affected content IDs\n- IDs: none\n\n## Acceptance scenarios\n1. Given a save ...\n\n## Focused verification\n- First command: cargo test -p add-core\n\n## Likely follow-up\nNone.\n\n## Acceptance evidence (required before completion)\n- Scenario/replay artifact: artifacts/agent-verification/run/replay.json\n- Focused command/result artifact: artifacts/agent-verification/run/result.json\n- Player-facing evidence (if applicable): None\n- Remaining risk or explicit reason: None\n`,
  "/repo/tasks/add/example.md",
)
assert.equal(readyBrief.readiness, "ready")

const incompleteBrief = normalizeTaskBrief(
  "## Player outcome\n\n## Acceptance evidence (required before completion)\n- Scenario/replay artifact:\n- Focused command/result artifact: TBD\n",
  "/repo/tasks/add/incomplete.md",
)
assert.equal(incompleteBrief.readiness, "needs_evidence")
assert.deepEqual(incompleteBrief.missingEvidence, [
  "Scenario/replay artifact",
  "Focused command/result artifact",
])

const failureHints = outputHints({
  id: "scenario-offline-return",
  status: "failed",
  scenario: "scenarios/add/offline-return.json",
  sourceBoundary: "crates/add-scenario/",
  output: "No such file or directory: save fixture",
  artifacts: ["artifacts/agent-verification/run/check.log"],
})
assert.ok(failureHints.some((hint) => hint.includes("agent:scenario")))
assert.ok(failureHints.some((hint) => hint.includes("fixture")))

console.log("Agent verification contracts: OK")
