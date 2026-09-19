#!/usr/bin/env node

const path = require("node:path")
const { validateAddContent } = require("./add-content-validator.cjs")
const {
  buildRegistry,
  catalogSummary,
  edgeSummary,
  loadContent: loadAuthoredContent,
  nodeSummary,
} = require("./add-content-registry.cjs")

const ROOT = path.resolve(__dirname, "..")

function loadContent() {
  const content = loadAuthoredContent(ROOT)
  return { ...content, registry: buildRegistry(content, ROOT) }
}

function analyzeStoryGraph(beats) {
  const byId = new Map(beats.map((beat) => [beat.id, beat]))
  const incoming = new Map(beats.map((beat) => [beat.id, []]))
  const outgoing = new Map(beats.map((beat) => [beat.id, []]))
  const handoffKeysByBeat = new Map()
  const edgeKeys = new Set()

  for (const beat of beats) {
    for (const condition of beat.autoCompleteWhen ?? []) {
      for (const key of conditionDependencyKeys(condition)) {
        if (!handoffKeysByBeat.has(key)) handoffKeysByBeat.set(key, new Set())
        handoffKeysByBeat.get(key).add(beat.id)
      }
    }
  }

  const addEdge = (from, to, reason) => {
    if (!byId.has(from) || !byId.has(to) || from === to) return
    const key = `${from}:${to}:${reason}`
    if (edgeKeys.has(key)) return
    edgeKeys.add(key)
    const edge = { from, to, reason }
    incoming.get(to).push(edge)
    outgoing.get(from).push(edge)
  }

  for (const beat of beats) {
    for (const condition of beat.preconditions ?? []) {
      for (const dependencyBeatId of conditionStoryBeatDependencies(condition)) {
        addEdge(dependencyBeatId, beat.id, `requires:${formatCondition(condition)}`)
      }
      for (const key of conditionDependencyKeys(condition)) {
        for (const sourceBeatId of handoffKeysByBeat.get(key) ?? []) {
          addEdge(sourceBeatId, beat.id, `handoff:${formatCondition(condition)}`)
        }
      }
    }
    for (const effect of [
      ...(beat.onActivate ?? []),
      ...(beat.onComplete ?? []),
      ...(beat.choices ?? []).flatMap((choice) => choice.effects ?? []),
    ]) {
      if (effect.kind === "complete_beat") addEdge(beat.id, effect.beat_id, "effect:complete_beat")
    }
  }

  const roots = beats
    .filter((beat) => incoming.get(beat.id).length === 0)
    .map((beat) => beat.id)
    .sort()
  const minimumSequenceByArc = new Map()
  for (const beat of beats) {
    const minimum = minimumSequenceByArc.get(beat.arc)
    if (minimum === undefined || beat.sequence < minimum) minimumSequenceByArc.set(beat.arc, beat.sequence)
  }
  const entryRoots = beats
    .filter((beat) => roots.includes(beat.id) && beat.sequence === minimumSequenceByArc.get(beat.arc))
    .map((beat) => beat.id)
    .sort()
  const reachable = new Set()
  const stack = [...entryRoots]
  while (stack.length > 0) {
    const id = stack.pop()
    if (reachable.has(id)) continue
    reachable.add(id)
    for (const edge of outgoing.get(id) ?? []) stack.push(edge.to)
  }

  const unreachable = beats
    .filter((beat) => !reachable.has(beat.id))
    .map((beat) => beat.id)
    .sort()

  return { byId, incoming, outgoing, roots, entryRoots, reachable, unreachable }
}

function printGraph(content, options = {}) {
  const { registry } = content
  if (options.reverse) return printReverseLookup(registry, options.reverse, options.format)
  const graph = analyzeStoryGraph(content.storyBeats)
  if (options.format === "json") {
    return JSON.stringify(
      {
        schemaVersion: 1,
        catalogs: catalogSummary(registry),
        nodes: registry.nodes.map(nodeSummary),
        edges: registry.edges.map(edgeSummary),
        story: { roots: graph.roots, entryRoots: graph.entryRoots, unreachable: graph.unreachable },
      },
      null,
      2,
    )
  }
  const lines = [
    "ADD Content Dependency Graph",
    "",
    "Catalogs:",
    ...catalogSummary(registry).map(
      (catalog) => `  ${catalog.family}: ${catalog.count} (${catalog.sourcePath}${catalog.rustPath ? ` -> ${catalog.rustPath}` : " -> client-only"})`,
    ),
    "",
    `Nodes: ${registry.nodes.length}`,
    `Edges: ${registry.edges.length}`,
    "",
    "Edges:",
  ]
  if (registry.edges.length === 0) lines.push("  none")
  else for (const edge of registry.edges) lines.push(`  ${edge.from.family}:${edge.from.id} -> ${edge.to.family}:${edge.to.id} [${edge.path}]`)
  lines.push(
    "",
    "Story reachability:",
    `  roots: ${graph.roots.join(", ") || "none"}`,
    `  declared entry roots: ${graph.entryRoots.join(", ") || "none"}`,
    `  unreachable: ${graph.unreachable.join(", ") || "none"}`,
  )
  return lines.join("\n")
}

function printReverseLookup(registry, id, format = "text") {
  const target = registry.primaryNodeById.get(id)
  if (!target) throw new Error(`Unknown content id "${id}".`)
  const usedBy = (registry.reverse.get(id) ?? []).map(edgeSummary)
  if (format === "json") {
    return JSON.stringify({ schemaVersion: 1, target: nodeSummary(target), usedBy }, null, 2)
  }
  const lines = [
    `ADD Content Reverse Lookup: ${id}`,
    `Family: ${target.family}`,
    `Source: ${target.sourcePath}`,
    "",
    "Used by:",
  ]
  if (usedBy.length === 0) lines.push("  none")
  else for (const edge of usedBy) lines.push(`  ${edge.from.family}:${edge.from.id} (${edge.path})`)
  return lines.join("\n")
}

function printTimeline(content, format = "text") {
  const graph = analyzeStoryGraph(content.storyBeats)
  const byArc = new Map()
  for (const beat of content.storyBeats) {
    if (!byArc.has(beat.arc)) byArc.set(beat.arc, [])
    byArc.get(beat.arc).push(beat)
  }

  const arcs = [...byArc.entries()].sort(([, a], [, b]) => {
    const aMin = Math.min(...a.map((beat) => beat.sequence))
    const bMin = Math.min(...b.map((beat) => beat.sequence))
    return aMin - bMin || a[0].arc?.localeCompare?.(b[0].arc ?? "") || 0
  })

  if (format === "json") {
    return JSON.stringify(
      {
        schemaVersion: 1,
        arcs: arcs.map(([arc, beats]) => ({
          arc,
          beats: [...beats]
            .sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id))
            .map((beat) => ({
              id: beat.id,
              sequence: beat.sequence,
              gates: graph.incoming.get(beat.id).map((edge) => edge.from).sort(),
              resolution: resolutionSummary(beat),
              action: formatPrimaryAction(beat.progression?.primaryAction),
            })),
        })),
      },
      null,
      2,
    )
  }

  const lines = ["ADD Story Arc Timeline"]
  for (const [arc, beats] of arcs) {
    lines.push("", `${arc}:`)
    for (const beat of [...beats].sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id))) {
      const deps = graph.incoming.get(beat.id).map((edge) => edge.from)
      lines.push(`  ${String(beat.sequence).padStart(3, "0")} ${beat.label} (${beat.id})`)
      lines.push(`      gate: ${deps.length > 0 ? deps.join(", ") : "root"}`)
      lines.push(`      resolves: ${resolutionSummary(beat)}`)
      lines.push(`      action: ${formatPrimaryAction(beat.progression?.primaryAction)}`)
    }
  }
  return lines.join("\n")
}

function printValidation(content, options = {}) {
  validateAddContent(content)

  const graph = analyzeStoryGraph(content.storyBeats)
  const report = {
    schemaVersion: 1,
    status: "ok",
    contentVersion: content.version,
    catalogs: catalogSummary(content.registry),
    story: {
      beatCount: content.storyBeats.length,
      roots: graph.roots,
      entryRoots: graph.entryRoots,
      unreachable: graph.unreachable,
    },
    dependencyGraph: {
      nodeCount: content.registry.nodes.length,
      edgeCount: content.registry.edges.length,
    },
  }
  if (options.format === "json") return JSON.stringify(report, null, 2)
  const lines = [
    "ADD Content Validation",
    "Status: OK",
    `Content schema: ${content.version.contentSchemaVersion}`,
    `Catalog version: ${content.version.catalogVersion}`,
    `Save schema: ${content.version.saveSchemaVersion}`,
    `Catalog entries: ${content.registry.nodes.length}`,
    `Dependency edges: ${content.registry.edges.length}`,
    `Story beats: ${content.storyBeats.length}`,
    `Entry roots: ${graph.entryRoots.length > 0 ? graph.entryRoots.join(", ") : "none"}`,
    `Unreachable story beats: ${graph.unreachable.length > 0 ? graph.unreachable.join(", ") : "none"}`,
  ]
  return lines.join("\n")
}

function printExplainGeneric(content, id, format = "text") {
  const target = content.registry.primaryNodeById.get(id)
  if (!target) throw new Error(`Unknown content id "${id}".`)
  const incoming = (content.registry.reverse.get(id) ?? []).map(edgeSummary)
  const outgoing = content.registry.edges
    .filter((edge) => edge.from.key === target.key)
    .map(edgeSummary)
  const explanation = {
    schemaVersion: 1,
    id,
    family: target.family,
    sourcePath: target.sourcePath,
    rustPath: target.rustPath,
    generated: target.generated,
    definition: target.entry,
    references: outgoing,
    usedBy: incoming,
    verification: ["npm run content:check", `npm run content:graph -- --reverse ${id}`],
  }
  if (format === "json") return JSON.stringify(explanation, null, 2)
  const lines = [
    `ADD Content Explanation: ${id}`,
    `Family: ${target.family}`,
    `Authored source: ${target.sourcePath}`,
    `Rust consumer: ${target.rustPath ?? "client/domain only (no Rust codegen)"}`,
    `Generated: ${target.generated ? "yes" : "no"}`,
    "",
    "Definition:",
    ...JSON.stringify(target.entry, null, 2).split("\n").map((line) => `  ${line}`),
    "",
    "References:",
    ...(outgoing.length > 0
      ? outgoing.map((edge) => `  - ${edge.to.family}:${edge.to.id} (${edge.path})`)
      : ["  none"]),
    "",
    "Used by:",
    ...(incoming.length > 0
      ? incoming.map((edge) => `  - ${edge.from.family}:${edge.from.id} (${edge.path})`)
      : ["  none"]),
    "",
    "Verification:",
    "  - npm run content:check",
    `  - npm run content:graph -- --reverse ${id}`,
  ]
  return lines.join("\n")
}

function resolutionSummary(beat) {
  const parts = []
  if ((beat.choices ?? []).length > 0) parts.push(`${beat.choices.length} choice(s)`)
  if (beat.worldActionId) parts.push(`world action ${beat.worldActionId}`)
  if ((beat.autoCompleteWhen ?? []).length > 0) parts.push("auto-complete")
  if ((beat.onComplete ?? []).some((effect) => effect.kind === "complete_beat")) parts.push("complete_beat effect")
  return parts.join(", ") || "terminal/manual"
}

function formatPrimaryAction(action) {
  if (!action) return "none"
  switch (action.kind) {
    case "world_action":
      return `world action ${action.actionId}`
    case "construction":
      return `construction ${action.optionId}`
    case "recruit_from_survivor_cave":
      return "recruit from Survivor Cave"
    case "tick":
      return `wait ${action.seconds}s`
    case "story_choice":
      return "story choice"
    case "preview_route_to_base":
      return "preview route to base"
    case "none":
      return "none"
    default:
      return action.kind
  }
}

function formatCondition(condition) {
  switch (condition.kind) {
    case "always":
      return "always"
    case "flag_set":
      return `flag set ${condition.flag_id}`
    case "flag_unset":
      return `flag unset ${condition.flag_id}`
    case "resource_at_least":
      return `${condition.resource_id} >= ${condition.amount}`
    case "bubble_reach_at_least":
      return `bubble reach >= ${condition.n}`
    case "clock_seconds_at_least":
      return `clock >= ${condition.seconds}s`
    case "quality_at_least":
      return `quality ${condition.key} >= ${condition.value}`
    case "beat_completed":
      return `beat completed ${condition.beat_id}`
    case "choice_made":
      return `choice made ${condition.beat_id}:${condition.option_id}`
    case "role_available":
      return `role available ${condition.role_id}`
    case "recruitment_enabled":
      return "recruitment enabled"
    case "recruited_any":
      return "any recruit exists"
    case "hero_outside_bubble":
      return "hero outside bubble"
    case "hero_forced_return":
      return "hero forced return active"
    case "hero_recovering":
      return "hero recovering"
    case "all":
      return `all(${(condition.conditions ?? []).map(formatCondition).join("; ")})`
    case "any":
      return `any(${(condition.conditions ?? []).map(formatCondition).join("; ")})`
    case "not":
      return `not(${formatCondition(condition.condition)})`
    default:
      return condition.kind
  }
}

function conditionDependencyKeys(condition) {
  if (!condition || typeof condition !== "object") return []
  if (condition.kind === "all" || condition.kind === "any") {
    const conditions = Array.isArray(condition.conditions) ? condition.conditions : []
    return [...new Set(conditions.flatMap(conditionDependencyKeys))]
  }
  if (condition.kind === "not") return []
  const key = conditionDependencyKey(condition)
  return key ? [key] : []
}

function conditionStoryBeatDependencies(condition) {
  if (!condition || typeof condition !== "object") return []
  if (condition.kind === "beat_completed" || condition.kind === "choice_made") {
    return [condition.beat_id]
  }
  if (condition.kind === "all" || condition.kind === "any") {
    const conditions = Array.isArray(condition.conditions) ? condition.conditions : []
    return [...new Set(conditions.flatMap(conditionStoryBeatDependencies))]
  }
  return []
}

function conditionDependencyKey(condition) {
  switch (condition.kind) {
    case "flag_set":
    case "flag_unset":
      return `${condition.kind}:${condition.flag_id}`
    case "recruitment_enabled":
    case "recruited_any":
    case "hero_outside_bubble":
    case "hero_forced_return":
    case "hero_recovering":
      return condition.kind
    case "bubble_reach_at_least":
      return `${condition.kind}:${condition.n}`
    case "resource_at_least":
      return `${condition.kind}:${condition.resource_id}:${condition.amount}`
    case "quality_at_least":
      return `${condition.kind}:${condition.key}:${condition.value}`
    case "role_available":
      return `${condition.kind}:${condition.role_id}`
    case "clock_seconds_at_least":
      return `${condition.kind}:${condition.seconds}`
    default:
      return null
  }
}

function usage() {
  return [
    "Usage: node scripts/add-content-tools.cjs <graph|validate|timeline|explain> [id] [options]",
    "",
    "Commands:",
    "  graph [--reverse <id>] [--format json]  Inspect all content dependencies or reverse lookup.",
    "  validate [--format json]               Validate IDs, references, effects, actions, and reachability.",
    "  timeline [--format json]               Print story beats grouped by arc and sequence.",
    "  explain <content-id> [--format json]   Explain any content item and its users.",
  ].join("\n")
}

function parseOptions(argv) {
  const positionals = []
  let format = "text"
  let reverse = null
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--format") {
      format = argv[++index]
      if (!["text", "json"].includes(format)) throw new Error(`Unsupported content tooling format "${format}".`)
    } else if (arg === "--reverse" || arg === "--id") {
      reverse = argv[++index]
      if (!reverse) throw new Error(`${arg} requires a content id.`)
    } else if (!arg.startsWith("--")) {
      positionals.push(arg)
    } else {
      throw new Error(`Unknown option "${arg}".`)
    }
  }
  return { positionals, format, reverse }
}

function main(argv) {
  const [command, ...rest] = argv
  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(usage())
    return
  }

  const options = parseOptions(rest)
  const content = loadContent()
  if (command === "graph") {
    console.log(printGraph(content, options))
    return
  }
  if (command === "validate") {
    console.log(printValidation(content, options))
    return
  }
  if (command === "timeline") {
    console.log(printTimeline(content, options.format))
    return
  }
  if (command === "explain") {
    const id = options.positionals[0]
    if (!id) throw new Error("content:explain requires a content id.")
    console.log(printExplainGeneric(content, id, options.format))
    return
  }

  throw new Error(`Unknown content tooling command "${command}".\n\n${usage()}`)
}

if (require.main === module) {
  try {
    main(process.argv.slice(2))
  } catch (error) {
    console.error(error?.message ?? error)
    process.exit(1)
  }
}

module.exports = { analyzeStoryGraph, loadContent, printGraph, printExplainGeneric, printReverseLookup, printValidation }
