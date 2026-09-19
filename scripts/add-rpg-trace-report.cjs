"use strict"

const fs = require("node:fs")
const path = require("node:path")
const { execFileSync } = require("node:child_process")

const ROOT = path.resolve(__dirname, "..")
const DEFAULT_BUDGETS = path.join(ROOT, "performance/add-budgets.json")

const TRACE_BUDGETS = [
  ["startup.dom-interactive", "startup", "domInteractiveMs", "startup", "domInteractiveMs"],
  ["startup.first-contentful-paint", "startup", "firstContentfulPaintMs", "startup", "firstContentfulPaintMs"],
  ["startup.runtime-ready", "startup", "readyMs", "startup-ready", "readyMs"],
  ["rust.tick.runtime", "rust_tick", "runtimeMs", "event:tick", "runtimeMs"],
  ["rust.tick.worker", "rust_tick", "workerMs", "event:tick", "workerMs"],
  ["offline.catchup.runtime", "offline_catchup", "runtimeMs", "event:offlineCatchup", "runtimeMs"],
  ["offline.catchup.worker", "offline_catchup", "workerMs", "event:offlineCatchup", "workerMs"],
  ["worker.messaging.latency", "worker_messaging", "latencyMs", "event:any", "latencyMs"],
  ["worker.messaging.to-worker", "worker_messaging", "toWorkerMs", "event:any", "toWorkerMs"],
  ["worker.messaging.from-worker", "worker_messaging", "fromWorkerMs", "event:any", "fromWorkerMs"],
  ["worker.messaging.queue-depth", "worker_messaging", "queueDepth", "event:any", "queueDepth"],
  ["snapshots.build", "snapshots", "snapshotMs", "event:any", "snapshotMs"],
  ["snapshots.diff", "snapshots", "diffMs", "event:any", "diffMs"],
  ["map.build", "map_build", "mapBuildMs", "perf.sample", "mapBuildMs"],
  ["phaser.frame-p95", "phaser", "frameMsP95", "perf.sample", "frameMsP95"],
  ["phaser.frame-max", "phaser", "frameMsMax", "perf.sample", "frameMsMax"],
  ["phaser.update-p95", "phaser", "phaserUpdateP95Ms", "perf.sample", "phaserUpdateP95Ms"],
  ["phaser.loop-lag-max", "phaser", "loopLagMaxMs", "perf.sample", "loopLagMaxMs"],
]

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

function round(value) {
  return Math.round(value * 100) / 100
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 0) return null
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]
}

function statistics(values) {
  if (values.length === 0) return null
  return {
    count: values.length,
    min: round(Math.min(...values)),
    average: round(values.reduce((total, value) => total + value, 0) / values.length),
    p50: round(percentile(values, 0.5)),
    p95: round(percentile(values, 0.95)),
    max: round(Math.max(...values)),
  }
}

function parseTrace(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean)
  const records = []
  const errors = []
  for (const [index, line] of lines.entries()) {
    try {
      const record = JSON.parse(line)
      if (record.schema_version !== 1 || record.format !== "add-trace-v1") {
        errors.push(`line ${index + 1}: expected add-trace-v1 schema_version 1`)
        continue
      }
      records.push(record)
    } catch (error) {
      errors.push(`line ${index + 1}: invalid JSON (${error.message})`)
    }
  }
  return { records, errors }
}

function valuesFor(records, source, field) {
  return records
    .filter((record) => {
      if (source === "startup") return record.dir === "perf" && record.kind === "startup"
      if (source === "startup-ready") return record.dir === "perf" && record.kind === "startup-ready"
      if (source === "perf.sample") return record.dir === "perf" && record.kind === "sample" && record.hidden !== true
      // Boot transport is judged by startup-ready; keep it out of steady-state
      // worker messaging so WASM initialization cannot hide gameplay regressions.
      if (source === "event:any") return record.dir === "event" && record.kind !== "ready"
      if (source.startsWith("event:")) {
        return record.dir === "event" && record.request === source.slice("event:".length)
      }
      return false
    })
    .map((record) => record[field])
    .filter((value) => typeof value === "number" && Number.isFinite(value))
}

function traceBudgetEntries(budgets) {
  return TRACE_BUDGETS.map(([id, stage, metric, source, field]) => ({
    id,
    stage,
    metric,
    source,
    field,
    threshold: budgets.trace[stage][metric],
  }))
}

function evaluateTrace({ records, parseErrors = [], budgets, sourceTrace, strict = false }) {
  const measurements = traceBudgetEntries(budgets).map((budget) => {
    const values = valuesFor(records, budget.source, budget.field)
    const stats = statistics(values)
    const breaches = []
    if (stats && budget.threshold.p95 !== undefined && stats.p95 > budget.threshold.p95) {
      breaches.push(`p95 ${stats.p95} > ${budget.threshold.p95}`)
    }
    if (stats && budget.threshold.max !== undefined && stats.max > budget.threshold.max) {
      breaches.push(`max ${stats.max} > ${budget.threshold.max}`)
    }
    return {
      id: budget.id,
      stage: budget.stage,
      metric: budget.metric,
      source: budget.source,
      samples: values.length,
      stats,
      budget: budget.threshold,
      status: !stats ? "review-required" : breaches.length ? "failed" : "passed",
      breaches,
    }
  })

  const failed = measurements.filter((measurement) => measurement.status === "failed")
  const missing = measurements.filter((measurement) => measurement.status === "review-required")
  const parseFailure = parseErrors.length > 0
  const status = parseFailure || failed.length > 0
    ? "failed"
    : missing.length > 0
      ? "review-required"
      : "passed"
  const failureHints = []
  if (parseFailure) failureHints.push("Repair invalid or mixed-version trace lines before comparing budgets.")
  for (const measurement of failed) {
    failureHints.push(`${measurement.id} breached its ${measurement.stage} budget; inspect the recorded trace around its samples.`)
  }
  if (missing.length > 0) {
    failureHints.push("Capture the missing stage in a dev-browser trace, or use --strict when a complete trace is required.")
  }

  return {
    schema_version: 1,
    report: "add-performance-trace-report-v1",
    trace_format: budgets.trace_format,
    budgets_id: budgets.id,
    source_trace: sourceTrace,
    session: records.find((record) => record.dir === "session")?.session ?? null,
    commit: records.find((record) => record.dir === "session")?.sha ?? null,
    status,
    summary: {
      records: records.length,
      passed: measurements.filter((measurement) => measurement.status === "passed").length,
      failed: failed.length,
      review_required: missing.length,
      parse_errors: parseErrors.length,
    },
    measurements,
    parse_errors: parseErrors,
    failure_hints: failureHints,
    strict_missing_samples: strict,
  }
}

function gitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim()
  } catch {
    return null
  }
}

function writeReport(report, outPath, markdownPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`)
  if (!markdownPath) return
  const lines = [
    `# ADD performance trace report`,
    "",
    `- Status: **${report.status}**`,
    `- Trace format: \`${report.trace_format}\``,
    `- Budget contract: \`${report.budgets_id}\``,
    `- Records: ${report.summary.records}`,
    "",
    "| Check | Samples | p95 | Max | Budget | Status |",
    "| --- | ---: | ---: | ---: | --- | --- |",
  ]
  for (const measurement of report.measurements) {
    const stats = measurement.stats ?? {}
    const threshold = measurement.budget.p95 !== undefined
      ? `p95 ≤ ${measurement.budget.p95}`
      : `max ≤ ${measurement.budget.max}`
    lines.push(`| ${measurement.id} | ${measurement.samples} | ${stats.p95 ?? "—"} | ${stats.max ?? "—"} | ${threshold} | ${measurement.status} |`)
  }
  if (report.failure_hints.length) {
    lines.push("", "## Hints", "", ...report.failure_hints.map((hint) => `- ${hint}`))
  }
  fs.mkdirSync(path.dirname(markdownPath), { recursive: true })
  fs.writeFileSync(markdownPath, `${lines.join("\n")}\n`)
}

function parseArgs(argv) {
  const options = { strict: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--trace") options.trace = argv[++index]
    else if (arg === "--out") options.out = argv[++index]
    else if (arg === "--markdown") options.markdown = argv[++index]
    else if (arg === "--budgets") options.budgets = argv[++index]
    else if (arg === "--strict") options.strict = true
    else if (arg === "--help" || arg === "-h") options.help = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return options
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv)
  if (options.help || !options.trace) {
    console.log("Usage: node scripts/add-rpg-trace-report.cjs --trace <session.jsonl> [--out <report.json>] [--markdown <report.md>] [--strict]")
    return options.help ? 0 : 2
  }
  const tracePath = path.resolve(ROOT, options.trace)
  const budgetsPath = path.resolve(ROOT, options.budgets ?? DEFAULT_BUDGETS)
  const artifactDir = process.env.AGENT_ARTIFACT_DIR
    ? path.join(process.env.AGENT_ARTIFACT_DIR, "performance")
    : path.join(ROOT, "tmp")
  const outPath = path.resolve(ROOT, options.out ?? path.join(artifactDir, "add-rpg-trace-report.json"))
  const markdownPath = options.markdown === "-"
    ? null
    : path.resolve(ROOT, options.markdown ?? outPath.replace(/\.json$/, ".md"))
  const budgets = readJson(budgetsPath)
  const parsed = parseTrace(tracePath)
  const report = evaluateTrace({
    records: parsed.records,
    parseErrors: parsed.errors,
    budgets,
    sourceTrace: path.relative(ROOT, tracePath).split(path.sep).join("/"),
    strict: options.strict,
  })
  report.commit = report.commit ?? gitCommit()
  if (options.strict && report.summary.review_required > 0 && report.status === "review-required") {
    report.status = "failed"
    report.failure_hints.push("--strict requires every configured performance stage to have samples.")
  }
  writeReport(report, outPath, markdownPath)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  return report.status === "failed" ? 1 : 0
}

if (require.main === module) {
  try {
    process.exitCode = main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  evaluateTrace,
  parseTrace,
  statistics,
  traceBudgetEntries,
  valuesFor,
}
