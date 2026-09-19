"use strict"

const fs = require("node:fs")
const path = require("node:path")
const zlib = require("node:zlib")
const { execFileSync } = require("node:child_process")

const ROOT = path.resolve(__dirname, "..")
const DEFAULT_BUDGETS = path.join(ROOT, "performance/add-budgets.json")

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(target))
    else files.push(target)
  }
  return files.sort()
}

function category(file) {
  if (file.endsWith(".wasm")) return "wasm"
  if (file.endsWith(".js")) return "javascript"
  if (file.endsWith(".css")) return "css"
  return "other"
}

function measureFiles(files, root, source) {
  return files.map((file) => {
    const bytes = fs.readFileSync(file)
    return {
      path: path.relative(root, file).split(path.sep).join("/"),
      source,
      category: category(file),
      bytes: bytes.length,
      gzip_bytes: zlib.gzipSync(bytes, { level: 9 }).length,
    }
  })
}

function sum(files, field, predicate = () => true) {
  return files.filter(predicate).reduce((total, file) => total + file[field], 0)
}

function metricValues(files) {
  return {
    browserJsBytes: sum(files, "bytes", (file) => file.source === "dist" && file.category === "javascript"),
    browserJsGzipBytes: sum(files, "gzip_bytes", (file) => file.source === "dist" && file.category === "javascript"),
    browserCssBytes: sum(files, "bytes", (file) => file.source === "dist" && file.category === "css"),
    browserCssGzipBytes: sum(files, "gzip_bytes", (file) => file.source === "dist" && file.category === "css"),
    wasmBytes: sum(files, "bytes", (file) => file.category === "wasm"),
    wasmGzipBytes: sum(files, "gzip_bytes", (file) => file.category === "wasm"),
    totalAssetBytes: sum(files, "bytes", (file) => file.source === "dist"),
    totalAssetGzipBytes: sum(files, "gzip_bytes", (file) => file.source === "dist"),
  }
}

function gitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim()
  } catch {
    return null
  }
}

function buildReport({ distDir, generatedWasm, budgets, strict = false }) {
  const distFiles = measureFiles(walk(distDir), ROOT, "dist")
  const distHasWasm = distFiles.some((file) => file.category === "wasm")
  const generatedFiles = distHasWasm
    ? []
    : measureFiles(walk(generatedWasm).filter((file) => file.endsWith(".wasm")), ROOT, "generated")
  const files = [...distFiles, ...generatedFiles].sort((left, right) => left.path.localeCompare(right.path))
  const metrics = metricValues(files)
  const checks = Object.entries(budgets.size).map(([id, threshold]) => {
    const value = metrics[id]
    const missing = files.length === 0 || (id.startsWith("wasm") && metrics.wasmBytes === 0)
    return {
      id,
      value,
      budget: threshold,
      status: missing ? "review-required" : value <= threshold.max ? "passed" : "failed",
      breach: !missing && value > threshold.max ? `${value} > ${threshold.max}` : null,
    }
  })
  const failed = checks.filter((check) => check.status === "failed")
  const missing = checks.filter((check) => check.status === "review-required")
  const status = failed.length > 0 ? "failed" : missing.length > 0 ? "review-required" : "passed"
  const failureHints = []
  if (failed.length) failureHints.push("Inspect the largest changed assets and the bundle split before raising a budget.")
  if (missing.length) failureHints.push("Build the ADD browser bundle and WASM output before treating size evidence as complete.")
  return {
    schema_version: 1,
    report: "add-performance-size-report-v1",
    budgets_id: budgets.id,
    commit: gitCommit(),
    status: strict && status === "review-required" ? "failed" : status,
    source: {
      browser_dist: path.relative(ROOT, distDir).split(path.sep).join("/"),
      generated_wasm: path.relative(ROOT, generatedWasm).split(path.sep).join("/"),
    },
    metrics,
    checks,
    files,
    failure_hints: strict && status === "review-required"
      ? [...failureHints, "--strict requires a built browser and WASM artifact set."]
      : failureHints,
  }
}

function writeMarkdown(report, file) {
  const lines = [
    "# ADD bundle and WASM size report",
    "",
    `- Status: **${report.status}**`,
    `- Budget contract: \`${report.budgets_id}\``,
    `- Commit: \`${report.commit ?? "unknown"}\``,
    "",
    "| Metric | Bytes | Budget | Status |",
    "| --- | ---: | ---: | --- |",
  ]
  for (const check of report.checks) {
    lines.push(`| ${check.id} | ${check.value} | ≤ ${check.budget.max} | ${check.status} |`)
  }
  lines.push("", "## Largest emitted files", "", "| File | Source | Bytes | Gzip |", "| --- | --- | ---: | ---: |")
  for (const item of [...report.files].sort((left, right) => right.bytes - left.bytes).slice(0, 12)) {
    lines.push(`| \`${item.path}\` | ${item.source} | ${item.bytes} | ${item.gzip_bytes} |`)
  }
  if (report.failure_hints.length) lines.push("", "## Hints", "", ...report.failure_hints.map((hint) => `- ${hint}`))
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${lines.join("\n")}\n`)
}

function parseArgs(argv) {
  const options = { strict: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--dist") options.dist = argv[++index]
    else if (arg === "--wasm") options.wasm = argv[++index]
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
  if (options.help) {
    console.log("Usage: node scripts/add-rpg-size-report.cjs [--dist <dir>] [--wasm <dir>] [--out <report.json>] [--strict]")
    return 0
  }
  const distDir = path.resolve(ROOT, options.dist ?? "apps/add-rpg/dist-app")
  const generatedWasm = path.resolve(ROOT, options.wasm ?? "apps/add-rpg/src/generated/wasm/add-web-bindings")
  const budgets = readJson(path.resolve(ROOT, options.budgets ?? DEFAULT_BUDGETS))
  const report = buildReport({ distDir, generatedWasm, budgets, strict: options.strict })
  const artifactDir = process.env.AGENT_ARTIFACT_DIR
    ? path.join(process.env.AGENT_ARTIFACT_DIR, "performance")
    : path.join(ROOT, "tmp")
  const out = path.resolve(ROOT, options.out ?? path.join(artifactDir, "add-rpg-size-report.json"))
  const markdown = options.markdown === "-" ? null : path.resolve(ROOT, options.markdown ?? out.replace(/\.json$/, ".md"))
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`)
  if (markdown) writeMarkdown(report, markdown)
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

module.exports = { buildReport, metricValues }
