"use strict"

const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const ROOT = path.resolve(__dirname, "..")
const ARTIFACT_ROOT = path.join(ROOT, "artifacts", "agent-verification")
const RESULT_SCHEMA_VERSION = 1

function normalizePath(value) {
  return String(value).split(path.sep).join("/")
}

function relativePath(value) {
  return normalizePath(path.relative(ROOT, value))
}

function safeSlug(value) {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "run"
}

function commandToString(command) {
  return command
    .map((argument) => {
      const value = String(argument)
      return /^[a-zA-Z0-9_./:@%+=,-]+$/.test(value)
        ? value
        : JSON.stringify(value)
    })
    .join(" ")
}

function unique(values) {
  return [...new Set(values)]
}

function git(args) {
  const result = spawnSync("git", ["-C", ROOT, ...args], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  })
  return {
    ...result,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  }
}

function gitText(args) {
  const result = git(args)
  return result.status === 0 ? result.stdout.trim() : ""
}

function gitRefExists(ref) {
  return Boolean(git(["rev-parse", "--verify", ref]).status === 0)
}

function gitMetadata() {
  const commit = gitText(["rev-parse", "HEAD"]) || null
  const dirty = Boolean(git(["status", "--porcelain"]).stdout.trim())
  return { commit, dirty }
}

function namesFromGit(args) {
  const result = git(args)
  if (result.status !== 0) return []
  return result.stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
}

function changedPaths({ base } = {}) {
  const names = [
    ...namesFromGit(["diff", "--name-only"]),
    ...namesFromGit(["diff", "--cached", "--name-only"]),
    ...namesFromGit(["ls-files", "--others", "--exclude-standard"]),
  ]

  if (base && gitRefExists(base)) {
    names.push(...namesFromGit(["diff", "--name-only", `${base}...HEAD`]))
  }

  return unique(names.map(normalizePath)).sort()
}

function makeRun(kind) {
  const startedAt = new Date()
  const runId = `${startedAt
    .toISOString()
    .replace(/[-:.TZ]/g, "")}-${safeSlug(kind)}-${process.pid}`
  const directory = path.join(ARTIFACT_ROOT, runId)
  fs.mkdirSync(directory, { recursive: true })
  return {
    kind,
    runId,
    directory,
    resultPath: path.join(directory, "result.json"),
    startedAt,
    startedAtMs: Date.now(),
    artifacts: [],
    nextCheckNumber: 1,
  }
}

function artifactPath(run, filename) {
  const target = path.join(run.directory, filename)
  const relative = path.relative(run.directory, target)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Artifact path escapes the run directory: ${filename}`)
  }
  fs.mkdirSync(path.dirname(target), { recursive: true })
  return target
}

function addArtifact(run, artifact) {
  run.artifacts.push({
    ...artifact,
    path: relativePath(artifact.path),
  })
}

function artifactKind(filename) {
  const lower = filename.toLowerCase()
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "screenshot"
  }
  if (lower.includes("trace") || lower.endsWith(".ndjson")) return "trace"
  if (lower.includes("replay")) return "replay-log"
  if (lower.includes("snapshot")) return "snapshot"
  if (lower.endsWith(".log")) return "log"
  return "report"
}

function collectRunArtifacts(run) {
  const files = []
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(target)
      else if (target !== run.resultPath) files.push(target)
    }
  }
  visit(run.directory)

  const existing = new Set(run.artifacts.map((artifact) => artifact.path))
  for (const file of files.sort()) {
    const relative = relativePath(file)
    if (existing.has(relative)) continue
    addArtifact(run, { kind: artifactKind(path.basename(file)), path: file })
  }
  return run.artifacts
}

function childEnvironment(run, extra = {}) {
  return {
    ...process.env,
    AGENT_RUN_ID: run.runId,
    AGENT_ARTIFACT_DIR: run.directory,
    AGENT_RESULT_DIR: run.directory,
    ...extra,
  }
}

function runCommand(run, { id, command, sourceBoundary, reason, scenario } = {}) {
  const number = String(run.nextCheckNumber++).padStart(2, "0")
  const logFile = artifactPath(run, `check-${number}-${safeSlug(id)}.log`)
  const startedAt = Date.now()
  const result = spawnSync(command[0], command.slice(1), {
    cwd: ROOT,
    env: childEnvironment(run),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  })
  const stdout = result.stdout ?? ""
  const stderr = result.stderr ?? ""
  const output = [
    `command: ${commandToString(command)}`,
    `status: ${result.status ?? "spawn-error"}`,
    "",
    "--- stdout ---",
    stdout,
    "--- stderr ---",
    stderr,
  ].join("\n")
  fs.writeFileSync(logFile, output)
  addArtifact(run, { kind: "log", path: logFile, check: id })

  const status = result.error
    ? "blocked"
    : result.status === 0
      ? "passed"
      : "failed"
  return {
    id,
    command: commandToString(command),
    commandArgs: command,
    sourceBoundary,
    reason,
    ...(scenario ? { scenario } : {}),
    status,
    exitCode: result.status,
    durationMs: Date.now() - startedAt,
    artifacts: [relativePath(logFile)],
    output,
    error: result.error ? String(result.error.message || result.error) : null,
  }
}

function addCheck(plan, check) {
  if (!plan.some((entry) => entry.id === check.id)) plan.push(check)
}

function hasPath(paths, pattern) {
  return paths.some((value) => pattern.test(value))
}

function scenarioPaths(paths) {
  return paths.filter((value) => /^scenarios\/(?:add\/)?[^/]+\.json$/.test(value))
}

/**
 * Select checks from changed paths. This function intentionally returns
 * commands already present in package.json or Cargo.toml; it does not encode
 * gameplay rules or create a second verification implementation.
 */
function classifyChangedPaths(paths) {
  const normalized = unique(paths.map(normalizePath)).sort()
  const plan = []
  const notes = []
  let recommendsGate = false

  addCheck(plan, {
    id: "working-tree-whitespace",
    command: ["git", "diff", "--check"],
    sourceBoundary: "repository diff",
    reason: "Catch whitespace errors before source-specific checks.",
  })
  addCheck(plan, {
    id: "staged-whitespace",
    command: ["git", "diff", "--cached", "--check"],
    sourceBoundary: "repository diff",
    reason: "Catch whitespace errors in staged changes too.",
  })

  if (normalized.length === 0) {
    notes.push("No changed paths detected; only cheap repository diff checks ran.")
    return { paths: normalized, plan, notes, recommendsGate }
  }

  const hasCore = hasPath(normalized, /^(crates\/add-core\/|Cargo\.toml$|Cargo\.lock$)/)
  const hasScenario = hasPath(normalized, /^(crates\/add-scenario(?:-runner)?\/|scenarios(?:\/add)?\/)/)
  const hasScenarioRunner = hasPath(normalized, /^crates\/add-scenario-runner\//)
  const hasContent = hasPath(
    normalized,
    /^(packages\/add-domain\/src\/content\/|scripts\/(build-add-content|add-content-validator|add-content-tools)\.cjs$)/,
  )
  const hasDomain = hasPath(normalized, /^packages\/add-domain\//)
  const hasAddApp = hasPath(
    normalized,
    /^(apps\/add-rpg\/|scripts\/add-rpg-smoke\.test\.cjs$|crates\/add-web-bindings\/)/,
  )
  const hasAgentTooling = hasPath(
    normalized,
    /^scripts\/agent-|^docs\/add-agent-verification-loop\.md$|^docs\/templates\/add-task-brief\.md$/,
  )
  const hasSharedEngine = hasPath(
    normalized,
    /^(packages\/game-|packages\/game[^/]*\/|apps\/engine-sandbox\/)/,
  )
  const hasOffice = hasPath(
    normalized,
    /^(apps\/(web|api|world-server|media-gateway)\/|packages\/(office-domain|protocol|policy|shared-types)\/)/,
  )
  const hasDocs = hasPath(normalized, /^(README\.md|AGENTS\.md|docs\/|.*\.md$)/)
  const hasTypeScript = hasPath(normalized, /\.(ts|tsx|js|cjs|mjs|json)$/)
  const hasRootTooling = hasPath(normalized, /^(package\.json|package-lock\.json|tsconfig\.json)$/)

  if (hasCore) {
    addCheck(plan, {
      id: "add-core-tests",
      command: ["cargo", "test", "-p", "add-core"],
      sourceBoundary: "crates/add-core/",
      reason: "Verify authoritative ADD rules, state, saves, and commands.",
    })
    recommendsGate = true
  }

  if (hasScenario) {
    addCheck(plan, {
      id: "add-scenario-tests",
      command: ["cargo", "test", "-p", "add-scenario"],
      sourceBoundary: "crates/add-scenario/",
      reason: "Verify canonical snapshots, checkpoints, replay diagnostics, and report parity.",
    })
    if (hasScenarioRunner) {
      addCheck(plan, {
        id: "add-scenario-runner-check",
        command: ["cargo", "check", "-p", "add-scenario-runner"],
        sourceBoundary: "crates/add-scenario-runner/",
        reason: "Verify the headless CLI boundary compiles.",
      })
    }
    for (const scenario of scenarioPaths(normalized)) {
      const id = `scenario-${safeSlug(path.basename(scenario, ".json"))}`
      addCheck(plan, {
        id,
        command: ["npm", "run", "agent:scenario", "--", scenario],
        sourceBoundary: scenario.startsWith("scenarios/add/") ? "scenarios/add/" : "scenarios/",
        scenario,
        reason: "Replay each changed committed scenario and preserve its command log.",
      })
    }
  }

  if (hasContent) {
    addCheck(plan, {
      id: "add-content-check",
      command: ["npm", "run", "content:check"],
      sourceBoundary: "packages/add-content/src/content/",
      reason: "Validate authored IDs, references, and generated Rust catalog output.",
    })
  }

  if (hasDomain) {
    addCheck(plan, {
      id: "add-domain-tests",
      command: ["npm", "--workspace", "@aedventure/add-runtime-client", "test"],
      sourceBoundary: "packages/add-runtime-client/",
      reason: "Verify ADD selectors, runtime reports, and domain projections.",
    })
  }

  if (hasAddApp) {
    addCheck(plan, {
      id: "add-ui-focused",
      command: ["npm", "run", "agent:verify:add-ui"],
      sourceBoundary: "apps/add-rpg/",
      reason: "Verify the live ADD app boundary without launching browser smoke by default.",
    })
  }

  if (hasSharedEngine) {
    addCheck(plan, {
      id: "shared-engine-types",
      command: ["npm", "run", "agent:verify:types"],
      sourceBoundary: "packages/game-* / apps/engine-sandbox/",
      reason: "Verify neutral engine package type boundaries before renderer QA.",
    })
    if (hasPath(normalized, /^apps\/engine-sandbox\//)) {
      addCheck(plan, {
        id: "engine-sandbox-smoke",
        command: ["npm", "run", "smoke:engine-sandbox"],
        sourceBoundary: "apps/engine-sandbox/",
        reason: "Run the smallest neutral square/hex renderer smoke for sandbox changes.",
      })
    }
    recommendsGate = true
  }

  if (hasOffice) {
    addCheck(plan, {
      id: "office-types",
      command: ["npm", "run", "agent:verify:types"],
      sourceBoundary: "office/platform lane",
      reason: "Compile office/platform TypeScript without making its product smoke part of ADD work.",
    })
  }

  if (hasAgentTooling) {
    addCheck(plan, {
      id: "agent-tooling-tests",
      command: ["npm", "run", "agent:verification:test"],
      sourceBoundary: "scripts/agent-*.cjs",
      reason: "Verify changed command classification and task-brief parsing contracts.",
    })
  }

  if (hasDocs) {
    addCheck(plan, {
      id: "documentation-contract",
      command: ["npm", "run", "docs:check"],
      sourceBoundary: "README.md / docs/",
      reason: "Verify the capability map, routing docs, task brief, and scope markers.",
    })
  }

  if (hasRootTooling || (!hasCore && !hasScenario && !hasContent && !hasDomain && !hasAddApp && !hasSharedEngine && !hasOffice && hasTypeScript)) {
    addCheck(plan, {
      id: "root-types",
      command: ["npm", "run", "agent:verify:types"],
      sourceBoundary: "root TypeScript project references",
      reason: "Compile changed TypeScript/configuration boundaries.",
    })
  }

  if (hasRootTooling || hasSharedEngine || hasCore) {
    recommendsGate = true
  }

  notes.push(
    "Focused mode skips the expensive full target-stack/browser/renderer gate. Use --smoke for ADD browser smoke or --gate at a phase boundary.",
  )
  if (recommendsGate) {
    notes.push("The changed paths are broad enough to recommend the explicit phase gate after focused checks pass.")
  }
  return { paths: normalized, plan, notes, recommendsGate }
}

function outputHints(check) {
  if (check.status === "passed") return []
  const output = check.output || ""
  const hints = []
  if (check.scenario) {
    hints.push(`Replay ${check.scenario} directly with npm run agent:scenario -- ${check.scenario}.`)
  } else if (check.sourceBoundary) {
    hints.push(`Inspect the owning boundary: ${check.sourceBoundary}.`)
  }
  if (/no such file|cannot find module|missing .*fixture|does not exist/i.test(output)) {
    hints.push("A required fixture or dependency is missing; check the referenced path before changing gameplay code.")
  }
  if (/node_modules|target directory|could not find|command not found/i.test(output)) {
    hints.push("The environment may be unprepared; install dependencies or prepare the Rust target before treating this as a product failure.")
  }
  if (check.id.includes("scenario")) {
    hints.push("Use the first divergent checkpoint and replayable command prefix in the scenario log to reduce the regression.")
  }
  if (hints.length === 0) hints.push(`Re-run the recorded command from ${check.artifacts[0] || "the result artifact"}.`)
  return unique(hints)
}

function parseMarkdownSections(markdown) {
  const sections = {}
  let current = null
  for (const line of String(markdown).split(/\r?\n/)) {
    const heading = /^##\s+(.+?)\s*$/.exec(line)
    if (heading) {
      current = heading[1]
      sections[current] = []
    } else if (current) {
      sections[current].push(line)
    }
  }
  return Object.fromEntries(
    Object.entries(sections).map(([heading, lines]) => [heading, lines.join("\n").trim()]),
  )
}

function valueIsMissing(value) {
  const normalized = String(value || "").trim()
  return !normalized || /^(tbd|todo|<[^>]+>)$/i.test(normalized)
}

function normalizeTaskBrief(markdown, taskPath) {
  const sections = parseMarkdownSections(markdown)
  const requiredHeadings = [
    "Player outcome",
    "Authoritative layer",
    "Affected content IDs",
    "Acceptance scenarios",
    "Focused verification",
    "Likely follow-up",
    "Acceptance evidence (required before completion)",
  ]
  const missingSections = requiredHeadings.filter((heading) => !(heading in sections))
  const evidence = sections["Acceptance evidence (required before completion)"] || ""
  const evidenceFields = evidence
    .split(/\r?\n/)
    .map((line) => /^-\s+([^:]+):\s*(.*)$/.exec(line))
    .filter(Boolean)
    .map((match) => ({ label: match[1].trim(), value: match[2].trim() }))
  const missingEvidence = evidenceFields
    .filter((field) => valueIsMissing(field.value))
    .map((field) => field.label)

  return {
    path: taskPath ? relativePath(taskPath) : null,
    sections: Object.keys(sections),
    missingSections,
    evidenceFields,
    missingEvidence,
    readiness:
      missingSections.length === 0 && missingEvidence.length === 0
        ? "ready"
        : "needs_evidence",
  }
}

function resolveTaskBrief(taskId) {
  const raw = String(taskId || "").trim()
  if (!raw) return null
  const candidates = []
  const direct = path.resolve(ROOT, raw)
  if (direct.startsWith(`${ROOT}${path.sep}`) || direct === ROOT) candidates.push(direct)
  const id = raw.replace(/\.md$/i, "")
  candidates.push(
    path.join(ROOT, "tasks", `${id}.md`),
    path.join(ROOT, "tasks", "add", `${id}.md`),
    path.join(ROOT, "docs", "tasks", `${id}.md`),
    path.join(ROOT, "docs", "tasks", "add", `${id}.md`),
  )
  const target = unique(candidates).find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
  return target || null
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

function finalizeRun(run, result) {
  collectRunArtifacts(run)
  const finalized = {
    schemaVersion: RESULT_SCHEMA_VERSION,
    runId: run.runId,
    kind: run.kind,
    startedAt: run.startedAt.toISOString(),
    durationMs: Date.now() - run.startedAtMs,
    ...result,
    artifacts: [
      ...run.artifacts,
      { kind: "result", path: relativePath(run.resultPath) },
    ],
  }
  writeJson(run.resultPath, finalized)
  return finalized
}

module.exports = {
  ARTIFACT_ROOT,
  ROOT,
  RESULT_SCHEMA_VERSION,
  addArtifact,
  artifactPath,
  changedPaths,
  childEnvironment,
  classifyChangedPaths,
  commandToString,
  finalizeRun,
  gitMetadata,
  makeRun,
  normalizePath,
  normalizeTaskBrief,
  outputHints,
  relativePath,
  resolveTaskBrief,
  runCommand,
  safeSlug,
  scenarioPaths,
  writeJson,
}
