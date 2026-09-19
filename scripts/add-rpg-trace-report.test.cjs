"use strict"

const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const ROOT = path.resolve(__dirname, "..")
const REPORT = path.join(__dirname, "add-rpg-trace-report.cjs")
const FIXTURE = path.join(ROOT, "scenarios/add/fixtures/performance/trace-v1.ndjson")

function run(args) {
  return spawnSync(process.execPath, [REPORT, ...args], {
    cwd: ROOT,
    encoding: "utf8",
  })
}

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aedventure-add-trace-"))
try {
  const passed = run(["--trace", FIXTURE, "--out", path.join(directory, "passed.json")])
  assert.equal(passed.status, 0, passed.stderr || passed.stdout)
  const report = JSON.parse(fs.readFileSync(path.join(directory, "passed.json"), "utf8"))
  assert.equal(report.status, "passed")
  assert.equal(report.trace_format, "add-trace-v1")
  assert.equal(report.summary.failed, 0)
  assert.ok(report.measurements.some((measurement) => measurement.id === "rust.tick.runtime"))

  const invalid = path.join(directory, "invalid.ndjson")
  fs.writeFileSync(invalid, "{\"schema_version\":999,\"format\":\"old\"}\n")
  const failed = run(["--trace", invalid, "--out", path.join(directory, "failed.json")])
  assert.equal(failed.status, 1)
  const failedReport = JSON.parse(fs.readFileSync(path.join(directory, "failed.json"), "utf8"))
  assert.equal(failedReport.status, "failed")
  assert.ok(failedReport.summary.parse_errors > 0)
} finally {
  fs.rmSync(directory, { recursive: true, force: true })
}

console.log("ADD trace report checks: OK")
