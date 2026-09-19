#!/usr/bin/env node

"use strict"

const fs = require("node:fs")
const os = require("node:os")
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
  writeJson,
} = require("./agent-verification-lib.cjs")

function usage() {
  console.log(`Usage:
  npm run agent:state -- --save <path>
  npm run agent:state -- --save <path> --format text

Loads a committed ADD save through the existing Rust scenario boundary and
prints the versioned agent_runtime_v1 report without booting the browser.`)
}

function parseArguments(argumentsList) {
  let save = null
  let format = "json"
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index]
    if (argument === "--help" || argument === "-h") return { help: true }
    if (argument === "--save") {
      save = argumentsList[++index]
      if (!save) throw new Error("--save requires a path")
      continue
    }
    if (argument === "--format") {
      format = argumentsList[++index]
      if (!format || !["json", "text"].includes(format)) {
        throw new Error("--format must be json or text")
      }
      continue
    }
    throw new Error(`Unknown option: ${argument}. Use --help.`)
  }
  if (!save) throw new Error("--save is required")
  return { save, format }
}

function repositoryPath(value) {
  return path.resolve(process.cwd(), value)
}

function main() {
  const parsed = parseArguments(process.argv.slice(2))
  if (parsed.help) {
    usage()
    return 0
  }

  const savePath = repositoryPath(parsed.save)
  const run = makeRun("state-report")
  const metadata = gitMetadata()
  if (!fs.existsSync(savePath)) {
    const result = finalizeRun(run, {
      command: commandToString(["npm", "run", "agent:state", "--", ...process.argv.slice(2)]),
      commit: metadata.commit,
      dirty: metadata.dirty,
      status: "blocked",
      save: relativePath(savePath),
      report: null,
      failureHints: [
        `Missing save fixture: ${parsed.save}.`,
        "Check the save path or create a fixture with npm run agent:scenario -- <scenario> --write-final-save <path>.",
      ],
    })
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    return 2
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aedventure-agent-state-"))
  const scenarioPath = path.join(tempRoot, "state-report.json")
  const scenario = {
    id: `state-report-${path.basename(savePath, path.extname(savePath))}`,
    seed: "agent-state-report",
    initial_save: savePath,
    commands: [],
    checkpoints: [],
  }
  fs.writeFileSync(scenarioPath, `${JSON.stringify(scenario, null, 2)}\n`)

  try {
    const command = [
      "cargo",
      "run",
      "--quiet",
      "-p",
      "add-scenario-runner",
      "--",
      scenarioPath,
    ]
    const check = runCommand(run, {
      id: "state-report",
      command,
      sourceBoundary: "crates/add-scenario-runner/ and crates/add-core/",
      reason: "Read the save through the authoritative Rust state/report boundary.",
    })
    let scenarioResult = null
    let parseFailure = null
    if (check.status === "passed") {
      try {
        scenarioResult = JSON.parse(check.output.split("--- stdout ---\n")[1].split("\n--- stderr ---")[0].trim())
      } catch (error) {
        parseFailure = `The Rust state runner returned non-JSON output: ${error.message}`
      }
    }

    if (scenarioResult?.agentRuntime) {
      const reportPath = artifactPath(run, "state-report.json")
      writeJson(reportPath, scenarioResult.agentRuntime)
      run.artifacts.push({ kind: "state-report", path: relativePath(reportPath) })
    }

    const status = parseFailure ? "failed" : check.status
    const result = finalizeRun(run, {
      command: commandToString(["npm", "run", "agent:state", "--", ...process.argv.slice(2)]),
      executedCommand: commandToString(command),
      commit: metadata.commit,
      dirty: metadata.dirty,
      status,
      save: relativePath(savePath),
      checks: [{
        id: check.id,
        command: check.command,
        sourceBoundary: check.sourceBoundary,
        reason: check.reason,
        status: check.status,
        exitCode: check.exitCode,
        durationMs: check.durationMs,
        artifacts: check.artifacts,
      }],
      report: scenarioResult?.agentRuntime || null,
      reportText: scenarioResult?.agentRuntimeText || null,
      failureHints: parseFailure
        ? [parseFailure, `Inspect ${check.artifacts[0]}.`]
        : check.status !== "passed"
          ? outputHints(check)
          : !scenarioResult?.agentRuntime
            ? ["The scenario runner did not emit agentRuntime; check the Phase 2 report contract."]
            : [],
    })
    if (parsed.format === "text") {
      process.stdout.write(`${result.reportText || "No compact runtime report was emitted."}\n`)
      process.stderr.write(`Result: ${result.artifacts.find((artifact) => artifact.kind === "result")?.path}\n`)
    } else {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    }
    return status === "passed" ? 0 : status === "blocked" ? 2 : 1
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

try {
  process.exitCode = main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 2
}
