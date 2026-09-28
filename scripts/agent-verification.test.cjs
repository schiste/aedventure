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

// Authored content is the most common kind of change in a content-driven game,
// and this classifier used to be blind to it: both the content and domain
// patterns keyed on `packages/add-domain/src/content/`, a path that stopped
// existing at the add-domain split. A content edit matched nothing and fell
// through to a bare `tsc -b` — no `content:check`, no generated-catalog drift
// check, no gameplay test. Every entry below must reach real verification.
for (const contentPath of [
  "packages/add-content/src/content/story/arcs/ambient.ts",
  "packages/add-content/src/content/balance.ts",
  "packages/add-content/src/content/creatures.ts",
  "packages/add-content/src/dungeons/registry.ts",
  "scripts/build-add-content.cjs",
  "scripts/narrative-lint.cjs",
]) {
  const plan = classifyChangedPaths([contentPath])
  assert.ok(
    plan.plan.some((check) => check.id === "add-content-check"),
    `Authored content change ${contentPath} must trigger the content verification checks.`,
  )
  assert.ok(
    !plan.plan.some((check) => check.id === "root-types"),
    `Authored content change ${contentPath} must not fall through to a bare tsc -b.`,
  )
}

// The presentation/UI/protocol layer and the runtime client share one selector
// test suite. They used to be classified under a package that no longer exists.
for (const layerPath of [
  "packages/add-presentation/src/adapters/base-management-selectors.ts",
  "packages/add-protocol/src/index.ts",
  "packages/add-ui/src/format.ts",
  "packages/add-runtime-client/src/runtime/client.ts",
]) {
  const plan = classifyChangedPaths([layerPath])
  assert.ok(
    plan.plan.some((check) => check.id === "add-presentation-tests"),
    `Change ${layerPath} must trigger the ADD runtime-client test suite.`,
  )
}

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
