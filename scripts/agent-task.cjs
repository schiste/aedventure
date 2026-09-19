#!/usr/bin/env node

"use strict"

const fs = require("node:fs")
const path = require("node:path")
const {
  changedPaths,
  classifyChangedPaths,
  commandToString,
  finalizeRun,
  gitMetadata,
  makeRun,
  normalizeTaskBrief,
  outputHints,
  relativePath,
  resolveTaskBrief,
  runCommand,
} = require("./agent-verification-lib.cjs")

function usage() {
  console.log(`Usage:
  npm run agent:task
  npm run agent:task -- --describe <task-id>
  npm run agent:task -- --smoke
  npm run agent:task -- --gate
  npm run agent:report -- --format json

Focused mode selects the cheapest checks from changed paths. --smoke adds the
ADD browser build and smoke explicitly. --gate runs the expensive target-stack
gate instead of the focused plan. --base <ref> changes the comparison base.`)
}

function parseArguments(argumentsList) {
  const options = {
    format: "text",
    smoke: false,
    gate: false,
    report: false,
    base: process.env.AGENT_VERIFY_BASE || "aethyme/integration",
    describe: null,
  }

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index]
    switch (argument) {
      case "--help":
      case "-h":
        options.help = true
        break
      case "--smoke":
      case "--browser-smoke":
        options.smoke = true
        break
      case "--gate":
        options.gate = true
        break
      case "--report":
        options.report = true
        break
      case "--describe":
        options.describe = argumentsList[++index]
        if (!options.describe) throw new Error("--describe requires a task ID or Markdown path")
        break
      case "--base":
        options.base = argumentsList[++index]
        if (!options.base) throw new Error("--base requires a Git ref")
        break
      case "--format":
        options.format = argumentsList[++index]
        if (!options.format || !["text", "json"].includes(options.format)) {
          throw new Error("--format must be text or json")
        }
        break
      default:
        throw new Error(`Unknown option: ${argument}. Use --help.`)
    }
  }
  return options
}

function invocation(argumentsList) {
  return commandToString(["npm", "run", "agent:task", "--", ...argumentsList])
}

function printVerification(result, format) {
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    return
  }
  console.log(`Agent verification: ${result.status}`)
  console.log(`Mode: ${result.mode}`)
  console.log(`Commit: ${result.commit || "unknown"}${result.dirty ? " (dirty)" : ""}`)
  console.log(`Changed paths: ${result.changedPaths.length || "none"}`)
  for (const check of result.checks) {
    console.log(`  ${check.status.padEnd(7)} ${check.id} (${check.durationMs}ms)`)
    if (check.status !== "passed") {
      console.log(`           log: ${check.artifacts[0] || "not written"}`)
    }
  }
  for (const note of result.notes || []) console.log(`Note: ${note}`)
  for (const hint of result.failureHints || []) console.log(`Hint: ${hint}`)
  console.log(`Result: ${result.artifacts.find((artifact) => artifact.kind === "result")?.path}`)
}

function printTask(result, format) {
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    return
  }
  console.log(`Task description: ${result.taskId}`)
  console.log(`Status: ${result.status}`)
  if (result.taskPath) console.log(`Brief: ${result.taskPath}`)
  if (result.task?.sections?.length) console.log(`Sections: ${result.task.sections.join(", ")}`)
  for (const missing of result.task?.missingSections || []) {
    console.log(`Missing section: ${missing}`)
  }
  for (const missing of result.task?.missingEvidence || []) {
    console.log(`Missing acceptance evidence: ${missing}`)
  }
  for (const hint of result.failureHints || []) console.log(`Hint: ${hint}`)
  console.log(`Result: ${result.artifacts.find((artifact) => artifact.kind === "result")?.path}`)
}

function describeTask(taskId, format, argumentsList) {
  const run = makeRun("task-description")
  const taskPath = resolveTaskBrief(taskId)
  const metadata = gitMetadata()
  const command = invocation(argumentsList)
  if (!taskPath) {
    const result = finalizeRun(run, {
      command,
      commit: metadata.commit,
      dirty: metadata.dirty,
      status: "blocked",
      taskId,
      taskPath: null,
      task: null,
      failureHints: [
        `Task brief not found for ${taskId}. Create tasks/add/${taskId}.md from docs/templates/add-task-brief.md.`,
        "A task is not ready until its acceptance scenarios and acceptance evidence fields are concrete.",
      ],
    })
    printTask(result, format)
    return 2
  }

  const markdown = fs.readFileSync(taskPath, "utf8")
  const task = normalizeTaskBrief(markdown, taskPath)
  const ready = task.readiness === "ready"
  const result = finalizeRun(run, {
    command,
    commit: metadata.commit,
    dirty: metadata.dirty,
    status: ready ? "passed" : "blocked",
    taskId,
    taskPath: relativePath(taskPath),
    task,
    failureHints: ready
      ? []
      : [
          "Fill every missing task section and acceptance-evidence field before marking the task complete.",
        ],
  })
  printTask(result, format)
  return ready ? 0 : 2
}

function runVerification(options, argumentsList) {
  const run = makeRun(options.gate ? "phase-gate" : "focused")
  const metadata = gitMetadata()
  const paths = changedPaths({ base: options.base })
  const classified = classifyChangedPaths(paths)
  let checks = []
  let notes = [...classified.notes]
  let mode = "focused"

  if (options.gate) {
    mode = "gate"
    checks = [
      runCommand(run, {
        id: "full-target-stack-gate",
        command: ["npm", "run", "agent:verify:gate"],
        sourceBoundary: "repository target-stack gate",
        reason: "Explicit phase gate requested; this is intentionally expensive.",
      }),
    ]
    notes = ["The full target-stack gate was explicitly requested."]
  } else {
    const plan = [...classified.plan]
    if (options.smoke) {
      plan.push({
        id: "add-browser-smoke",
        command: ["npm", "run", "smoke:add-rpg"],
        sourceBoundary: "apps/add-rpg/ browser smoke",
        reason: "Explicit browser smoke override requested.",
      })
      notes.push("The ADD browser build and smoke were explicitly enabled with --smoke.")
    }
    checks = plan.map((check) => runCommand(run, check))
  }

  const failureHints = checks.flatMap(outputHints)
  const status = checks.some((check) => check.status === "blocked")
    ? "blocked"
    : checks.some((check) => check.status === "failed")
      ? "failed"
      : "passed"
  if (status === "passed" && classified.recommendsGate && !options.gate) {
    notes.push("Focused checks passed; run npm run agent:task -- --gate before publication or a phase handoff.")
  }

  const result = finalizeRun(run, {
    command: invocation(argumentsList),
    commit: metadata.commit,
    dirty: metadata.dirty,
    base: options.base,
    mode,
    status,
    changedPaths: paths,
    checks: checks.map(({ output, error, commandArgs, ...check }) => check),
    failureHints,
    notes,
    artifacts: run.artifacts,
  })
  printVerification(result, options.format)
  return status === "passed" ? 0 : status === "blocked" ? 2 : 1
}

function main() {
  try {
    const argumentsList = process.argv.slice(2)
    const options = parseArguments(argumentsList)
    if (options.help) {
      usage()
      return 0
    }
    if (options.describe) return describeTask(options.describe, options.format, argumentsList)
    return runVerification(options, argumentsList)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    console.error("Use npm run agent:task -- --help for usage.")
    return 2
  }
}

process.exitCode = main()
