#!/usr/bin/env node

"use strict"

const fs = require("node:fs")
const path = require("node:path")
const {
  artifactPath,
  commandToString,
  finalizeRun,
  gitMetadata,
  makeRun,
  outputHints,
  relativePath,
  runCommand,
  safeSlug,
  writeJson,
} = require("./agent-verification-lib.cjs")

function usage() {
  console.log(`Usage:
  npm run agent:scenario -- scenarios/add/<scenario>.json
  npm run agent:scenario -- scenarios/add/<scenario>.json --write-final-save <path>

Runs the existing Rust ADD scenario runner and records its canonical report,
replay commands, final snapshot, and command log under artifacts/agent-verification/.`)
}

function parseArguments(argumentsList) {
  let scenario = null
  let finalSave = null
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index]
    if (argument === "--help" || argument === "-h") return { help: true }
    if (argument === "--write-final-save") {
      finalSave = argumentsList[++index]
      if (!finalSave) throw new Error("--write-final-save requires a path")
      continue
    }
    if (argument.startsWith("-")) throw new Error(`Unknown option: ${argument}. Use --help.`)
    if (scenario) throw new Error("Only one scenario path may be provided")
    scenario = argument
  }
  if (!scenario) throw new Error("A scenario path is required")
  return { scenario, finalSave }
}

function resolveRepositoryPath(value) {
  const absolute = path.resolve(process.cwd(), value)
  return absolute
}

function main() {
  const parsed = parseArguments(process.argv.slice(2))
  if (parsed.help) {
    usage()
    return 0
  }

  const scenarioPath = resolveRepositoryPath(parsed.scenario)
  const run = makeRun(`scenario-${safeSlug(path.basename(scenarioPath, ".json"))}`)
  if (!fs.existsSync(scenarioPath)) {
    const metadata = gitMetadata()
    const result = finalizeRun(run, {
      command: `npm run agent:scenario -- ${commandToString(process.argv.slice(2))}`,
      commit: metadata.commit,
      dirty: metadata.dirty,
      status: "blocked",
      scenario: relativePath(scenarioPath),
      scenarioResult: null,
      failureHints: [
        `Missing scenario fixture: ${parsed.scenario}.`,
        "Create or restore the committed scenario before changing the runner.",
      ],
    })
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    return 2
  }

  const command = [
    "cargo",
    "run",
    "--quiet",
    "-p",
    "add-scenario-runner",
    "--",
    scenarioPath,
  ]
  if (parsed.finalSave) command.push("--write-final-save", resolveRepositoryPath(parsed.finalSave))

  const check = runCommand(run, {
    id: "scenario-replay",
    command,
    sourceBoundary: "crates/add-scenario-runner/",
    scenario: relativePath(scenarioPath),
    reason: "Run the deterministic ADD scenario without booting the browser.",
  })
  let scenarioResult = null
  let parseFailure = null
  if (check.status === "passed") {
    try {
      scenarioResult = JSON.parse(check.output.split("--- stdout ---\n")[1].split("\n--- stderr ---")[0].trim())
      const reportPath = artifactPath(run, "scenario-result.json")
      writeJson(reportPath, scenarioResult)
      run.artifacts.push({ kind: "scenario-report", path: relativePath(reportPath) })

      if (scenarioResult.finalSnapshot) {
        const snapshotPath = artifactPath(run, "snapshot.json")
        writeJson(snapshotPath, scenarioResult.finalSnapshot)
        run.artifacts.push({ kind: "snapshot", path: relativePath(snapshotPath) })
      }
      if (scenarioResult.replayCommands) {
        const replayPath = artifactPath(run, "replay.json")
        writeJson(replayPath, {
          scenario: relativePath(scenarioPath),
          seed: scenarioResult.seed,
          commands: scenarioResult.replayCommands,
        })
        run.artifacts.push({ kind: "replay-log", path: relativePath(replayPath) })
      }
    } catch (error) {
      parseFailure = `The Rust scenario runner returned non-JSON output: ${error.message}`
    }
  }

  if (parseFailure) {
    check.status = "failed"
    check.error = parseFailure
  }
  const metadata = gitMetadata()
  const status = check.status === "passed" && !parseFailure ? "passed" : check.status
  const result = finalizeRun(run, {
    command: `npm run agent:scenario -- ${commandToString(process.argv.slice(2))}`,
    executedCommand: commandToString(command),
    commit: metadata.commit,
    dirty: metadata.dirty,
    status,
    scenario: relativePath(scenarioPath),
    checks: [{
      id: check.id,
      command: check.command,
      sourceBoundary: check.sourceBoundary,
      scenario: check.scenario,
      reason: check.reason,
      status: check.status,
      exitCode: check.exitCode,
      durationMs: check.durationMs,
      artifacts: check.artifacts,
    }],
    scenarioResult,
    failureHints: parseFailure
      ? [parseFailure, `Inspect ${check.artifacts[0]}.`]
      : outputHints(check),
    notes: ["Scenario output is authoritative Rust state; browser presentation is verified by the explicit ADD smoke command."],
  })
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  return status === "passed" ? 0 : status === "blocked" ? 2 : 1
}

try {
  process.exitCode = main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 2
}
