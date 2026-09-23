const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const { loadAddBrowserQaManifest } = require("./add-rpg-phase5.cjs")

const ROOT_DIR = path.resolve(__dirname, "..")
const RETIRED_RPG_DEMO_FRAGMENTS = [
  "apps/rpg-idle-demo",
  "packages/rpg-domain",
  "rpg-idle-demo-smoke",
  "@aedventure/rpg-idle-demo",
  "@aedventure/rpg-domain",
]

function main() {
  const packageJson = readJson("package.json")
  const packageLock = readText("package-lock.json")
  const verifyTargetStack = readText("scripts/verify-target-stack.sh")
  const agentVerify = readText("scripts/agent-verify.sh")
  const agentGuide = readText("AGENTS.md")
  const addMain = readText("apps/add-rpg/src/browser/main.ts")

  assert.equal(
    packageJson.scripts.check,
    "scripts/verify-target-stack.sh",
    "npm run check must remain the full target-stack verification gate.",
  )
  assertScript(packageJson, "smoke:office", "scripts/frontend-smoke.test.cjs")
  assertScript(packageJson, "smoke:engine-sandbox", "@aedventure/engine-sandbox")
  assertScript(packageJson, "smoke:add-rpg", "@aedventure/add-rpg")
  assertScript(packageJson, "smoke:office:built", "scripts/frontend-smoke.test.cjs")
  assertScript(packageJson, "smoke:engine-sandbox:built", "scripts/engine-sandbox-smoke.test.cjs")
  assertScript(packageJson, "smoke:add-rpg:built", "scripts/add-rpg-smoke.test.cjs")
  assertScript(packageJson, "smoke:apps", "smoke:add-rpg")
  assertScript(packageJson, "smoke:apps", "smoke:engine-sandbox")
  assertScript(packageJson, "qa:renderer", "scripts/renderer-qa.test.cjs")
  assertScript(packageJson, "qa:add-rpg:phase5", "scripts/add-rpg-smoke.test.cjs")
  assertScript(packageJson, "qa:add-rpg:phase5:built", "scripts/add-rpg-smoke.test.cjs")
  assertScript(packageJson, "qa:add-rpg:visual", "scripts/add-rpg-visual-diff.cjs")
  assertScript(packageJson, "qa:multi-app", "scripts/multi-app-qa-contracts.test.cjs")
  assertScript(packageJson, "agent:verify", "scripts/agent-task.cjs")
  assertScript(packageJson, "agent:verify:add-ui", "scripts/agent-verify.sh add-ui")
  assertScript(packageJson, "agent:verify:types", "scripts/agent-verify.sh types")
  assertScript(packageJson, "agent:verify:gate", "scripts/agent-verify.sh gate")
  assertRetiredFragmentsAbsent("package.json", JSON.stringify(packageJson, null, 2))
  assertRetiredFragmentsAbsent("package-lock.json", packageLock)

  assertStackStep(verifyTargetStack, "node \"$ROOT_DIR/scripts/build-add-rpg-wasm.cjs\"")
  assertStackStep(verifyTargetStack, "cargo check --manifest-path \"$ROOT_DIR/Cargo.toml\"")
  assertStackStep(verifyTargetStack, "npm run qa:multi-app")
  assertStackStep(verifyTargetStack, "npm --workspace @aedventure/web run build:browser")
  assertStackStep(verifyTargetStack, "npm --workspace @aedventure/engine-sandbox run build:browser")
  assertStackStep(verifyTargetStack, "npm --workspace @aedventure/add-rpg run build:browser")
  assertStackStep(verifyTargetStack, "npm run smoke:engine-sandbox:built")
  assertStackStep(verifyTargetStack, "npm run smoke:add-rpg:built")
  assertStackStep(verifyTargetStack, "npm run smoke:office:built")
  assertStackStep(verifyTargetStack, "npm run qa:renderer:built")
  assertRetiredFragmentsAbsent("scripts/verify-target-stack.sh", verifyTargetStack)
  assertAgentVerificationContract(agentVerify, agentGuide)

  assertScreenshotContract("scripts/frontend-smoke.test.cjs", [
    "office map screenshot",
  ])
  assertScreenshotContract("scripts/engine-sandbox-smoke.test.cjs", [
    "engine-sandbox-smoke.png",
    "squareRendered",
    "hexRendered",
  ])
  assertScreenshotContract("scripts/add-rpg-smoke.test.cjs", [
    "add-rpg-map-smoke.png",
    "add-rpg-dungeon-map-smoke.png",
    "mapMode?.topology === \"square\"",
    "mapMode?.topology === \"hex\"",
    "captureAddBrowserFixture",
    "writeAddBrowserQaReport",
  ])
  ;["data-qa", "data-action-id", "ADD_BROWSER_QA_CONTRACT_VERSION"].forEach((fragment) => {
    assert.ok(addMain.includes(fragment), `Expected ADD browser source to include ${fragment}.`)
  })
  assertScreenshotContract("scripts/renderer-qa.test.cjs", [
    "topologyChecks",
    "add-rpg-hex-renderer-fixture-canvas.png",
    "add-rpg-square-renderer-fixture-canvas.png",
    "Renderer QA must include a nonblank hex topology render.",
    "Renderer QA must include a nonblank square topology render.",
  ])
  assertRetiredPathMissing("apps/rpg-idle-demo")
  assertRetiredPathMissing("packages/rpg-domain")
  assertRetiredPathMissing("scripts/rpg-idle-demo-smoke.test.cjs")

  const browserQaManifest = loadAddBrowserQaManifest()
  assert.deepEqual(
    browserQaManifest.fixtures.map((fixture) => fixture.id),
    [
      "add.boot",
      "add.idle",
      "add.map",
      "add.canonical-idle-loop",
      "add.story-choice",
      "add.save-load",
      "add.offline-return",
    ],
  )

  console.log("Multi-app QA contract checks passed.")
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath))
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8")
}

function assertScript(packageJson, scriptName, expectedFragment) {
  assert.ok(
    packageJson.scripts[scriptName]?.includes(expectedFragment),
    `Expected package script ${scriptName} to include ${expectedFragment}.`,
  )
}

function assertStackStep(scriptText, expectedFragment) {
  assert.ok(
    scriptText.includes(expectedFragment),
    `Expected verify-target-stack.sh to include ${expectedFragment}.`,
  )
}

/**
 * The two ways a suite may satisfy the non-blank screenshot contract.
 *
 * `captureNonBlankImage` retries the capture and calls `assertNonBlankImageBuffer`
 * itself, so naming either one keeps the guarantee this contract exists for:
 * a screenshot in these suites is never taken without being checked.
 */
const NON_BLANK_SCREENSHOT_CHECKS = ["assertNonBlankImageBuffer", "captureNonBlankImage"]

function assertScreenshotContract(relativePath, expectedFragments) {
  const scriptText = readText(relativePath)
  assert.ok(
    NON_BLANK_SCREENSHOT_CHECKS.some((check) => scriptText.includes(check)),
    `Expected ${relativePath} to check its screenshots with one of ${NON_BLANK_SCREENSHOT_CHECKS.join(
      " or ",
    )}.`,
  )
  expectedFragments.forEach((fragment) => {
    assert.ok(
      scriptText.includes(fragment),
      `Expected ${relativePath} to include ${fragment}.`,
    )
  })
}

function assertRetiredPathMissing(relativePath) {
  assert.equal(
    fs.existsSync(path.join(ROOT_DIR, relativePath)),
    false,
    `Retired placeholder RPG path must stay removed: ${relativePath}.`,
  )
}

function assertRetiredFragmentsAbsent(label, text) {
  RETIRED_RPG_DEMO_FRAGMENTS.forEach((fragment) => {
    assert.equal(
      text.includes(fragment),
      false,
      `${label} must not reference retired placeholder RPG fragment ${fragment}.`,
    )
  })
}

function assertAgentVerificationContract(scriptText, guideText) {
  ;[
    "focused_checks",
    "add_ui_checks",
    "AGENT_VERIFY_SMOKE",
    "npm run check",
  ].forEach((fragment) => {
    assert.ok(
      scriptText.includes(fragment),
      `Expected scripts/agent-verify.sh to include ${fragment}.`,
    )
  })

  ;[
    "npm run agent:verify",
    "npm run agent:verify:add-ui",
    "npm run agent:verify:gate",
    "Do not use the full target-stack gate as the default",
  ].forEach((fragment) => {
    assert.ok(
      guideText.includes(fragment),
      `Expected AGENTS.md to document ${fragment}.`,
    )
  })
}

main()
