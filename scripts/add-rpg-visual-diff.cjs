#!/usr/bin/env node

"use strict"

const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const {
  fixtureById,
  loadAddBrowserQaManifest,
  sha256File,
} = require("./add-rpg-phase5.cjs")

const ROOT_DIR = path.resolve(__dirname, "..")
const BASELINE_METADATA_PATH = path.join(
  ROOT_DIR,
  "scenarios/add/fixtures/browser/visual-baselines.json",
)

function usage() {
  console.log(`Usage:
  npm run qa:add-rpg:visual -- --artifact-dir <path>
  npm run qa:add-rpg:visual -- --update --scenario <fixture-id> --reason "<reason>"

Missing baselines are reported as review-required. A changed baseline fails
until it is deliberately promoted with a fixture, reason, and state evidence.`)
}

function parseArguments(argv) {
  const options = {
    artifactDir: process.env.AGENT_ARTIFACT_DIR
      ? path.join(process.env.AGENT_ARTIFACT_DIR, "screenshots")
      : path.join(ROOT_DIR, "tmp"),
    update: false,
    scenario: null,
    reason: null,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === "--help" || argument === "-h") options.help = true
    else if (argument === "--update") options.update = true
    else if (argument === "--artifact-dir") options.artifactDir = argv[++index]
    else if (argument === "--scenario") options.scenario = argv[++index]
    else if (argument === "--reason") options.reason = argv[++index]
    else throw new Error(`Unknown option ${argument}. Use --help.`)
  }
  return options
}

function readJson(filePath, label) {
  assert.ok(fs.existsSync(filePath), `Missing ${label}: ${filePath}`)
  return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv)
  if (options.help) {
    usage()
    return 0
  }
  const manifest = loadAddBrowserQaManifest()
  const metadata = readJson(BASELINE_METADATA_PATH, "ADD visual-baselines metadata")
  assert.equal(metadata.schema_version, 1)
  assert.equal(metadata.policy.require_reason_on_update, true)
  assert.equal(metadata.policy.require_scenario_evidence, true)
  const reportPath = path.join(options.artifactDir, manifest.artifact.report)
  const report = readJson(reportPath, "ADD Phase 5 report")
  assert.equal(report.contract_version, manifest.contract_version)
  assert.equal(
    report.status,
    "passed",
    "The Phase 5 state/screenshot report must pass before visual comparison.",
  )
  if (options.update) return updateBaseline({ options, manifest, metadata, report })
  if (options.scenario || options.reason) {
    throw new Error("--scenario and --reason are only valid with --update.")
  }
  return checkBaselines({ options, metadata, report })
}

function checkBaselines({ options, metadata, report }) {
  const checks = report.fixtures.map((evidence) => {
    const actualPath = path.join(options.artifactDir, evidence.screenshot.path)
    assert.ok(fs.existsSync(actualPath), `Missing Phase 5 screenshot for ${evidence.id}: ${actualPath}`)
    const baseline = metadata.baselines[evidence.id]
    if (!baseline) {
      return {
        fixture_id: evidence.id,
        status: "unbaselined",
        actual_sha256: sha256File(actualPath),
        state_digest: evidence.state_digest,
        state: evidence.state,
        action: "Review and promote with --update --scenario <id> --reason <text>.",
      }
    }
    const baselinePath = path.join(ROOT_DIR, metadata.policy.baseline_directory, baseline.file)
    assert.ok(fs.existsSync(baselinePath), `Baseline metadata points to a missing image: ${baselinePath}`)
    const actualSha = sha256File(actualPath)
    const baselineSha = sha256File(baselinePath)
    return {
      fixture_id: evidence.id,
      status: actualSha === baselineSha ? "unchanged" : "changed",
      actual_sha256: actualSha,
      baseline_sha256: baselineSha,
      state_digest: evidence.state_digest,
      state: evidence.state,
      baseline_reason: baseline.reason,
      baseline_scenario: baseline.scenario,
      baseline_file: baseline.file,
    }
  })
  const changed = checks.filter((check) => check.status === "changed")
  const result = {
    schema_version: 1,
    status: changed.length > 0
      ? "failed"
      : checks.some((check) => check.status === "unbaselined")
        ? "review-required"
        : "passed",
    report: path.relative(ROOT_DIR, path.join(options.artifactDir, "phase5-report.json")).split(path.sep).join("/"),
    checks,
    failure_hint: changed.length > 0
      ? "A visual baseline changed. Use --update with a specific reason after reviewing the stored state evidence."
      : null,
  }
  console.log(JSON.stringify(result, null, 2))
  return changed.length > 0 ? 1 : 0
}

function updateBaseline({ options, manifest, metadata, report }) {
  assert.ok(options.scenario, "--update requires --scenario <fixture-id>.")
  assert.ok(
    options.reason && options.reason.trim().length >= 8,
    "--update requires a specific --reason of at least 8 characters.",
  )
  const fixture = fixtureById(manifest, options.scenario)
  const evidence = report.fixtures.find((candidate) => candidate.id === fixture.id)
  assert.ok(evidence, `Phase 5 report does not contain fixture ${fixture.id}.`)
  const actualPath = path.join(options.artifactDir, evidence.screenshot.path)
  assert.ok(fs.existsSync(actualPath), `Missing Phase 5 screenshot for ${fixture.id}: ${actualPath}`)
  const directory = path.join(ROOT_DIR, metadata.policy.baseline_directory)
  fs.mkdirSync(directory, { recursive: true })
  const file = `${fixture.id.replace(/[^a-z0-9]+/gi, "-")}.png`
  const baselinePath = path.join(directory, file)
  fs.copyFileSync(actualPath, baselinePath)
  metadata.baselines[fixture.id] = {
    file,
    sha256: sha256File(baselinePath),
    scenario: fixture.smoke_scenario,
    reason: options.reason.trim(),
    state_digest: evidence.state_digest,
  }
  fs.writeFileSync(BASELINE_METADATA_PATH, `${JSON.stringify(metadata, null, 2)}\n`)
  console.log(JSON.stringify({
    schema_version: 1,
    status: "updated",
    fixture_id: fixture.id,
    file: path.join(metadata.policy.baseline_directory, file).split(path.sep).join("/"),
    reason: options.reason.trim(),
    scenario: fixture.smoke_scenario,
    state_digest: evidence.state_digest,
  }, null, 2))
  return 0
}

try {
  process.exitCode = main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
