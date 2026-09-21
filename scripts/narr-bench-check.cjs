#!/usr/bin/env node
// Measure the narrative system at scale and judge it against the §10 budgets.
//
//   node scripts/narr-bench-check.cjs               # human report
//   node scripts/narr-bench-check.cjs --json        # machine-readable
//   node scripts/narr-bench-check.cjs --events 5000 # smaller run
//
// The budgets live in performance/add-budgets.json; the Rust bench only
// measures. Keeping the numbers in one place is what stops the gate from
// drifting away from the figures it claims to enforce.

const fs = require("node:fs")
const path = require("node:path")
const { execFileSync } = require("node:child_process")

const ROOT = path.resolve(__dirname, "..")
const BUDGETS = path.join(ROOT, "performance/add-budgets.json")
const JSON_OUT = process.argv.includes("--json")

function requestedEvents() {
  const index = process.argv.indexOf("--events")
  if (index === -1) return null
  const value = Number.parseInt(process.argv[index + 1], 10)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("--events needs a positive number")
  }
  return value
}

function measure(events) {
  const args = ["run", "--quiet", "--release", "-p", "add-scenario-runner", "--", "bench"]
  if (events) args.push("--events", String(events))
  const stdout = execFileSync("cargo", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  })
  return JSON.parse(stdout.slice(stdout.indexOf("{")))
}

function main() {
  const budgets = JSON.parse(fs.readFileSync(BUDGETS, "utf8")).narrative
  if (!budgets) throw new Error("performance/add-budgets.json has no `narrative` section")

  const events = requestedEvents() ?? budgets.scale.events
  const report = measure(events)
  const statistic = budgets.statistic === "min" ? "minUs" : "p95Us"

  const rows = []
  for (const measurement of report.measurements) {
    // A measurement with no samples reports zero, which would satisfy any
    // budget without measuring anything. Treat it as a broken benchmark rather
    // than a pass — the same vacuous-success trap as a test that asserts over
    // an empty collection.
    if (!measurement.samples) {
      throw new Error(`benchmark produced no samples for \`${measurement.operation}\``)
    }
    const budget = budgets.operations[measurement.operation]?.max ?? null
    const observed = measurement[statistic]
    rows.push({
      operation: measurement.operation,
      observed,
      budget,
      // An operation with no budget is reported, never gated: §10 sets figures
      // for some operations and not others, and inventing the rest would be
      // enforcing a number nobody chose.
      withinBudget: budget === null ? null : observed <= budget,
    })
  }

  const breaches = rows.filter((row) => row.withinBudget === false)
  const result = {
    contract: "add_narr_bench_check_v1",
    ok: breaches.length === 0,
    events: report.events,
    entities: report.entities,
    statistic: budgets.statistic,
    rows,
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log("ADD Narrative Budgets")
    console.log(`Scale: ${report.events} events, ${report.entities} entities (${budgets.statistic})`)
    for (const row of rows) {
      const budget = row.budget === null ? "no budget" : `${row.budget} us`
      const verdict = row.withinBudget === null ? "   -" : row.withinBudget ? "  OK" : "OVER"
      console.log(`  ${verdict}  ${row.operation.padEnd(20)} ${row.observed.toFixed(2).padStart(12)} us  (${budget})`)
    }
    for (const row of breaches) {
      console.error(
        `  BREACH ${row.operation}: ${row.observed.toFixed(2)} us exceeds the ${row.budget} us budget`,
      )
    }
  }

  if (breaches.length > 0) process.exit(1)
}

try {
  main()
} catch (error) {
  console.error(error?.message ?? error)
  process.exit(1)
}
