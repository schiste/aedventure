const fs = require("node:fs")
const path = require("node:path")

const ROOT = path.resolve(__dirname, "..")

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required repository document: ${relativePath}`)
  }
  return fs.readFileSync(absolutePath, "utf8")
}

function requireText(text, fragment, label) {
  if (!text.includes(fragment)) {
    throw new Error(`${label} is missing required text: ${fragment}`)
  }
}

function requireHeading(text, heading, label) {
  requireText(text, heading, `${label} heading`)
}

const readme = read("README.md")
const architecture = read("docs/add-canonical-architecture.md")
const migration = read("docs/add-migration-plan.md")
const engineBoundary = read("docs/engine-boundary.md")
const storyContract = read("docs/story-content-engine.md")
const capabilityMap = read("docs/add-capability-map.md")
const scenarioHarness = read("docs/add-scenario-harness.md")
const runtimeInspection = read("docs/add-runtime-inspection.md")
const taskBrief = read("docs/templates/add-task-brief.md")
const parityAudit = read("docs/add-systems-parity-audit.md")
const packageJson = JSON.parse(read("package.json"))

for (const fragment of [
  "live ADD idle/RPG game",
  "apps/add-rpg/",
  "Office/Platform Lane",
  "legacy/add/",
  "docs/add-capability-map.md",
  "docs/add-scenario-harness.md",
  "docs/add-runtime-inspection.md",
  "docs/templates/add-task-brief.md",
  "npm run agent:verify:add-ui",
]) {
  requireText(readme, fragment, "README")
}

requireHeading(architecture, "## Where does this change belong?", "ADD architecture")
requireHeading(migration, "## Where does this change belong?", "ADD migration")
requireHeading(engineBoundary, "## Where does this change belong?", "engine boundary")
requireHeading(storyContract, "## Where does this change belong?", "story contract")
requireHeading(scenarioHarness, "## Purpose and ownership", "ADD scenario harness")
requireHeading(scenarioHarness, "## Focused verification", "ADD scenario harness")
requireHeading(runtimeInspection, "## Contract", "ADD runtime inspection")
requireHeading(runtimeInspection, "## Stable identity rules", "ADD runtime inspection")
requireHeading(runtimeInspection, "## Focused verification", "ADD runtime inspection")
requireText(runtimeInspection, "agent_runtime_v1", "ADD runtime inspection")

for (const heading of [
  "## First route: where does this change belong?",
  "## Commands and first evidence",
  "## Content families",
  "## Runtime state",
  "## Smoke flows",
  "## Known gaps",
]) {
  requireHeading(capabilityMap, heading, "ADD capability map")
}

for (const field of [
  "## Player outcome",
  "## Authoritative layer",
  "## Affected content IDs",
  "## Acceptance scenarios",
  "## Focused verification",
  "## Likely follow-up",
]) {
  requireHeading(taskBrief, field, "ADD task brief")
}

requireText(
  parityAudit,
  "factual implemented-versus-not-yet inventory",
  "ADD parity audit",
)

for (const command of [
  "docs:check",
  "content:check",
  "content:graph",
  "content:timeline",
  "content:explain",
  "agent:verify:add-ui",
  "scenario:add",
  "agent:verify:types",
  "agent:verify:gate",
  "smoke:add-rpg",
  "smoke:add-rpg:built",
  "smoke:engine-sandbox",
  "smoke:office",
  "check:legacy",
]) {
  if (!packageJson.scripts[command]) {
    throw new Error(`package.json is missing required capability command: ${command}`)
  }
}

const officeScopeDocuments = [
  "docs/ai-map-readiness.md",
  "docs/avatar-atlas-import-path.md",
  "docs/customer-virtual-office-platform-spec.md",
  "docs/development-rollout-plan.md",
  "docs/hard-fork-architecture.md",
  "docs/license-audit.md",
  "docs/phase-0-baseline-verification.md",
  "docs/phase-0-refactor-plan.md",
  "docs/renderer-performance-budget.md",
  "docs/skyoffice-fork-maintenance.md",
]

for (const relativePath of officeScopeDocuments) {
  requireText(read(relativePath), "> Scope note:", `${relativePath} scope note`)
}

const documentationFiles = [
  "README.md",
  ...fs
    .readdirSync(path.join(ROOT, "docs"))
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => path.join("docs", fileName)),
]

const misleadingPatterns = [
  /`?apps\/add-rpg`?\s+(?:is|remains)\s+(?:a\s+)?(?:future|placeholder)/i,
  /(?:future|placeholder)\s+(?:app|application|demo)\s+.*`?apps\/add-rpg`?/i,
]

for (const relativePath of documentationFiles) {
  const lines = read(relativePath).split("\n")
  for (const [index, line] of lines.entries()) {
    if (misleadingPatterns.some((pattern) => pattern.test(line))) {
      throw new Error(
        `${relativePath}:${index + 1} describes apps/add-rpg as future/placeholder: ${line.trim()}`,
      )
    }
  }
}

console.log("ADD capability and documentation contract: OK")
