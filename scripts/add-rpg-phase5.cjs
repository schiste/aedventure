"use strict"

const assert = require("node:assert")
const crypto = require("node:crypto")
const fs = require("node:fs")
const path = require("node:path")

const ROOT_DIR = path.resolve(__dirname, "..")
const MANIFEST_PATH = path.join(ROOT_DIR, "scenarios/add/browser-fixtures.json")

function loadAddBrowserQaManifest() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"))
  validateAddBrowserQaManifest(manifest)
  return manifest
}

function validateAddBrowserQaManifest(manifest) {
  assert.equal(manifest.schema_version, 1, "ADD browser QA manifest schema must be version 1.")
  assert.equal(manifest.id, "add-player-facing-qa-v1")
  assert.equal(manifest.app, "add-rpg")
  assert.equal(manifest.contract_version, "add-browser-qa-v1")
  assert.ok(manifest.selectors && typeof manifest.selectors === "object")
  assert.ok(manifest.action_ids && typeof manifest.action_ids === "object")
  assert.ok(Array.isArray(manifest.fixtures) && manifest.fixtures.length === 7)

  const ids = new Set()
  for (const fixture of manifest.fixtures) {
    assert.ok(fixture.id && !ids.has(fixture.id), `Duplicate ADD browser fixture: ${fixture.id}`)
    ids.add(fixture.id)
    assert.ok(fixture.flow, `${fixture.id} must declare a flow.`)
    assert.ok(fixture.smoke_scenario, `${fixture.id} must map to an existing smoke scenario.`)
    assert.ok(manifest.selectors[fixture.surface], `${fixture.id} has an unknown screenshot surface.`)
    assert.ok(Array.isArray(fixture.selectors) && fixture.selectors.length > 0)
    fixture.selectors.forEach((selectorId) => {
      assert.ok(manifest.selectors[selectorId], `${fixture.id} references unknown selector ${selectorId}.`)
    })
    assert.ok(Array.isArray(fixture.assertions) && fixture.assertions.length > 0)
    assert.ok(Array.isArray(fixture.state_paths) && fixture.state_paths.length > 0)
    assert.ok(fixture.screenshot && /^[a-z0-9-]+\.png$/.test(fixture.screenshot))
    for (const actionId of fixture.required_action_ids ?? []) {
      assert.ok(manifest.action_ids[actionId], `${fixture.id} references unknown action ${actionId}.`)
    }
  }

  const expectedIds = [
    "add.boot",
    "add.idle",
    "add.map",
    "add.canonical-idle-loop",
    "add.story-choice",
    "add.save-load",
    "add.offline-return",
  ]
  assert.deepEqual(
    manifest.fixtures.map((fixture) => fixture.id),
    expectedIds,
    "ADD browser fixture order is part of the stable report contract.",
  )
}

function fixtureById(manifest, fixtureId) {
  const fixture = manifest.fixtures.find((candidate) => candidate.id === fixtureId)
  assert.ok(fixture, `Unknown ADD browser fixture: ${fixtureId}`)
  return fixture
}

function readStatePath(state, statePath) {
  return statePath.split(".").reduce((value, segment) => {
    if (value === null || value === undefined) return undefined
    return value[segment]
  }, state)
}

function assertFixtureState(state, fixture) {
  const checks = []
  for (const assertion of fixture.assertions) {
    const actual = readStatePath(state, assertion.path)
    let passed = true
    let expectation = ""

    if (Object.prototype.hasOwnProperty.call(assertion, "equals")) {
      passed = JSON.stringify(actual) === JSON.stringify(assertion.equals)
      expectation = `equals ${JSON.stringify(assertion.equals)}`
    } else if (Object.prototype.hasOwnProperty.call(assertion, "not_equals")) {
      passed = JSON.stringify(actual) !== JSON.stringify(assertion.not_equals)
      expectation = `does not equal ${JSON.stringify(assertion.not_equals)}`
    } else if (assertion.type) {
      passed = assertion.type === "array"
        ? Array.isArray(actual)
        : assertion.type === "null"
          ? actual === null
          : typeof actual === assertion.type
      expectation = `type ${assertion.type}`
    } else if (Object.prototype.hasOwnProperty.call(assertion, "gte")) {
      passed = typeof actual === "number" && actual >= assertion.gte
      expectation = `>= ${assertion.gte}`
    } else if (Object.prototype.hasOwnProperty.call(assertion, "lte")) {
      passed = typeof actual === "number" && actual <= assertion.lte
      expectation = `<= ${assertion.lte}`
    } else if (assertion.containsPrefix) {
      passed = Array.isArray(actual) && actual.some((value) => String(value).startsWith(assertion.containsPrefix))
      expectation = `an array containing a value prefixed by ${assertion.containsPrefix}`
    } else {
      throw new Error(`Unsupported Phase 5 assertion in ${fixture.id}: ${JSON.stringify(assertion)}`)
    }

    checks.push({
      path: assertion.path,
      expectation,
      actual: canonicalize(actual),
      passed,
    })
    assert.ok(
      passed,
      `Phase 5 fixture ${fixture.id} state assertion failed at ${assertion.path}: expected ${expectation}, got ${JSON.stringify(actual)}.`,
    )
  }
  return checks
}

async function assertFixtureDom(page, manifest, fixture) {
  const selectors = Object.fromEntries(
    fixture.selectors.map((selectorId) => [selectorId, manifest.selectors[selectorId]]),
  )
  const requiredActionIds = (fixture.required_action_ids ?? []).map(
    (actionId) => manifest.action_ids[actionId],
  )
  const requiredActionPrefixes = fixture.required_action_prefixes ?? []
  return page.evaluate(
    ({ selectors, requiredActionIds, requiredActionPrefixes }) => {
      const selectorResults = Object.fromEntries(
        Object.entries(selectors).map(([id, selector]) => {
          const element = document.querySelector(selector)
          return [id, { selector, present: element !== null }]
        }),
      )
      const actionElements = Array.from(document.querySelectorAll("[data-action-id]"))
      const actionIds = actionElements
        .map((element) => element.getAttribute("data-action-id"))
        .filter((value) => value)
      const actionResults = {
        exact: Object.fromEntries(
          requiredActionIds.map((id) => [id, actionIds.includes(id)]),
        ),
        prefixes: Object.fromEntries(
          requiredActionPrefixes.map((prefix) => [
            prefix,
            actionIds.some((id) => id.startsWith(prefix)),
          ]),
        ),
      }
      return { selectorResults, actionResults, actionIds: [...new Set(actionIds)].sort() }
    },
    { selectors, requiredActionIds, requiredActionPrefixes },
  ).then((dom) => {
    for (const result of Object.values(dom.selectorResults)) {
      assert.ok(result.present, `Phase 5 fixture ${fixture.id} is missing selector ${result.selector}.`)
    }
    for (const [actionId, present] of Object.entries(dom.actionResults.exact)) {
      assert.ok(present, `Phase 5 fixture ${fixture.id} is missing action ID ${actionId}.`)
    }
    for (const [prefix, present] of Object.entries(dom.actionResults.prefixes)) {
      assert.ok(present, `Phase 5 fixture ${fixture.id} is missing action ID prefix ${prefix}.`)
    }
    return dom
  })
}

function projectFixtureState(state, fixture) {
  return Object.fromEntries(
    [...fixture.state_paths]
      .sort()
      .map((statePath) => [statePath, canonicalize(readStatePath(state, statePath))]),
  )
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    )
  }
  return value
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex")
}

function assertAddRendererPhase5Contract(state, label = "ADD renderer") {
  assert.equal(state.app, "add-rpg", `${label}: expected the live ADD app.`)
  assert.equal(state.map?.hostedBy, "phaser", `${label}: ADD map must be hosted by Phaser.`)
  assert.equal(state.map?.ready, true, `${label}: map renderer must be ready.`)
  assert.equal(state.map?.validationValid, true, `${label}: map validation must be valid.`)
  assert.equal(
    state.map?.camera?.mode,
    "interactive_pan_zoom",
    `${label}: camera must expose the interactive pan/zoom mode.`,
  )
  assert.ok(
    typeof state.map?.camera?.zoom === "number" && state.map.camera.zoom > 0,
    `${label}: camera must expose a positive zoom.`,
  )
  assert.equal(state.map?.interaction?.hoverEnabled, true, `${label}: map hover must be enabled.`)
  assert.equal(state.map?.interaction?.selectEnabled, true, `${label}: map selection must be enabled.`)

  const affordances = state.map?.presentation?.mapPrimaryAffordances
  assert.ok(affordances, `${label}: map affordance telemetry is required.`)
  assert.equal(typeof affordances.actionMarkerCount, "number")
  assert.equal(typeof affordances.reachableCellCount, "number")
  assert.equal(typeof affordances.pathTimePreviewVisible, "boolean")
  assert.equal(typeof affordances.travelActionMarkersVisible, "boolean")
  assert.equal(typeof affordances.landmarkBeaconCount, "number")

  return {
    label,
    mapReady: state.map.ready,
    topology: state.map.topology.kind,
    camera: state.map.camera,
    interaction: {
      hoverEnabled: state.map.interaction.hoverEnabled,
      selectEnabled: state.map.interaction.selectEnabled,
    },
    affordances,
  }
}

async function captureAddBrowserFixture({
  page,
  manifest,
  fixtureId,
  state,
  artifactDir,
  assertNonBlankImageBuffer,
}) {
  const fixture = fixtureById(manifest, fixtureId)
  const sourceState = state ?? await page.evaluate(() => {
    if (typeof window.render_game_to_text !== "function") {
      throw new Error("render_game_to_text is not installed")
    }
    return JSON.parse(window.render_game_to_text())
  })
  const stateAssertions = assertFixtureState(sourceState, fixture)
  const dom = await assertFixtureDom(page, manifest, fixture)
  const screenshotPath = path.join(artifactDir, manifest.artifact.screenshot_directory, fixture.screenshot)
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true })
  const screenshotSelector = manifest.selectors[fixture.surface]
  const buffer = await page.locator(screenshotSelector).screenshot({ path: screenshotPath })
  const screenshotStats = assertNonBlankImageBuffer(
    buffer,
    `ADD Phase 5 ${fixture.id} screenshot`,
    {
      minWidth: 300,
      minHeight: 220,
      minOpaqueSamples: 500,
      minUniqueColors: 8,
      minLuminanceRange: 24,
    },
  )

  return {
    id: fixture.id,
    flow: fixture.flow,
    smoke_scenario: fixture.smoke_scenario,
    state: projectFixtureState(sourceState, fixture),
    state_digest: digest(projectFixtureState(sourceState, fixture)),
    state_assertions: stateAssertions,
    dom,
    screenshot: {
      path: path.relative(artifactDir, screenshotPath).split(path.sep).join("/"),
      sha256: sha256File(screenshotPath),
      stats: screenshotStats,
    },
  }
}

function writeAddBrowserQaReport({ artifactDir, manifest, fixtures, status = "passed", failure = null }) {
  fs.mkdirSync(artifactDir, { recursive: true })
  const report = {
    schema_version: 1,
    contract_version: manifest.contract_version,
    app: manifest.app,
    status,
    fixture_ids: manifest.fixtures.map((fixture) => fixture.id),
    fixtures,
    failure,
  }
  const reportPath = path.join(artifactDir, manifest.artifact.report)
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  return reportPath
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")
}

module.exports = {
  MANIFEST_PATH,
  assertFixtureDom,
  assertFixtureState,
  assertAddRendererPhase5Contract,
  canonicalize,
  captureAddBrowserFixture,
  digest,
  fixtureById,
  loadAddBrowserQaManifest,
  projectFixtureState,
  sha256File,
  validateAddBrowserQaManifest,
  writeAddBrowserQaReport,
}
