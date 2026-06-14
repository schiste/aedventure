#!/usr/bin/env node

const path = require("node:path")

const ROOT = path.resolve(__dirname, "..")

function loadContent() {
  const requireDist = (relativePath) => {
    try {
      return require(path.join(ROOT, "packages/add-domain/dist", relativePath))
    } catch (error) {
      if (error?.code === "MODULE_NOT_FOUND") {
        throw new Error(
          "ADD content dist files are missing. Run `npm --workspace @aedventure/add-domain run build` first.",
        )
      }
      throw error
    }
  }

  return {
    resources: requireDist("content/resources.js").RESOURCES,
    roles: requireDist("content/roles.js").ROLES,
    flags: requireDist("content/flags.js").FLAGS,
    flora: requireDist("content/flora.js").FLORA,
    structures: requireDist("content/structures.js").STRUCTURES,
    tiles: requireDist("content/tiles.js").TILES,
    stations: requireDist("content/stations.js").STATIONS,
    constructionOptions: requireDist("content/construction.js").CONSTRUCTION_OPTIONS,
    worldActions: requireDist("content/world-actions.js").WORLD_ACTIONS,
    processingRecipes: requireDist("content/processing.js").PROCESSING_RECIPES,
    storyBeats: requireDist("content/story.js").STORY_BEATS,
    uiElements: requireDist("content/ui-elements.js").UI_ELEMENTS,
    entitySchemas: requireDist("content/entity-schemas.js").ENTITY_SCHEMAS,
    items: requireDist("content/items.js").ITEMS,
    perks: requireDist("content/perks.js").PERKS,
    creatures: requireDist("content/creatures.js").CREATURES,
    dungeons: requireDist("dungeons/registry.js").ADD_DUNGEON_REGISTRY,
    areas: requireDist("areas/registry.js").ADD_AREA_REGISTRY,
  }
}

function buildIdIndex(content) {
  const sections = [
    ["resource", content.resources],
    ["role", content.roles],
    ["flag", content.flags],
    ["flora", content.flora],
    ["structure", content.structures],
    ["tile", content.tiles],
    ["station", content.stations],
    ["construction", content.constructionOptions],
    ["world_action", content.worldActions],
    ["processing_recipe", content.processingRecipes],
    ["story_beat", content.storyBeats],
    ["ui_element", content.uiElements],
    ["entity_schema", content.entitySchemas],
    ["item", content.items],
    ["perk", content.perks],
    ["creature", content.creatures],
    ["dungeon", content.dungeons],
    ["area", content.areas],
  ]
  const byId = new Map()
  for (const [kind, entries] of sections) {
    for (const entry of entries ?? []) {
      const id = entry?.id
      if (!id) continue
      if (!byId.has(id)) byId.set(id, [])
      byId.get(id).push(kind)
    }
  }
  return byId
}

function analyzeStoryGraph(beats) {
  const byId = new Map(beats.map((beat) => [beat.id, beat]))
  const incoming = new Map(beats.map((beat) => [beat.id, []]))
  const outgoing = new Map(beats.map((beat) => [beat.id, []]))
  const handoffKeysByBeat = new Map()

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
  }

  const roots = beats
    .filter((beat) => incoming.get(beat.id).length === 0)
    .map((beat) => beat.id)
    .sort()
  const reachable = new Set()
  const stack = [...roots]
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

  return { byId, incoming, outgoing, roots, reachable, unreachable }
}

function printGraph(content) {
  const graph = analyzeStoryGraph(content.storyBeats)
  const lines = [
    "ADD Content Dependency Graph",
    `Story beats: ${content.storyBeats.length}`,
    `Roots: ${graph.roots.length > 0 ? graph.roots.join(", ") : "none"}`,
    "",
    "Edges:",
  ]
  const edges = [...graph.outgoing.values()]
    .flat()
    .sort((a, b) => `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`))
  if (edges.length === 0) {
    lines.push("  none")
  } else {
    for (const edge of edges) {
      lines.push(`  ${edge.from} -> ${edge.to} [${edge.reason}]`)
    }
  }

  lines.push("", "Unreachable Story Beats:")
  if (graph.unreachable.length === 0) {
    lines.push("  none")
  } else {
    for (const id of graph.unreachable) lines.push(`  ${id}`)
  }

  return lines.join("\n")
}

function printTimeline(content) {
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

function printValidation(content) {
  const { validateAddContent } = require(path.join(__dirname, "add-content-validator.cjs"))
  validateAddContent(content)

  const graph = analyzeStoryGraph(content.storyBeats)
  const lines = [
    "ADD Content Validation",
    "Status: OK",
    `Story beats: ${content.storyBeats.length}`,
    `Root beats: ${graph.roots.length > 0 ? graph.roots.join(", ") : "none"}`,
    `Unreachable story beats: ${graph.unreachable.length > 0 ? graph.unreachable.join(", ") : "none"}`,
  ]
  return lines.join("\n")
}

function printExplain(content, id) {
  const graph = analyzeStoryGraph(content.storyBeats)
  const idIndex = buildIdIndex(content)
  const beat = graph.byId.get(id)
  if (!beat) {
    const known = idIndex.get(id)
    if (known) {
      return [
        `ADD Content Explanation: ${id}`,
        `Kind: ${known.join(", ")}`,
        "Detailed explanations are currently implemented for story beats.",
      ].join("\n")
    }
    throw new Error(`Unknown content id "${id}".`)
  }

  const incoming = graph.incoming.get(beat.id) ?? []
  const outgoing = graph.outgoing.get(beat.id) ?? []
  const lines = [
    `ADD Beat Explanation: ${beat.id}`,
    `Label: ${beat.label}`,
    `Arc: ${beat.arc}`,
    `Sequence: ${beat.sequence}`,
    `Priority: ${beat.priority ?? 0}`,
    `Repeatable: ${Boolean(beat.repeatable)}`,
    `World action: ${beat.worldActionId ?? "none"}`,
    `Primary action: ${formatPrimaryAction(beat.progression?.primaryAction)}`,
    "",
    "Body:",
    `  ${beat.body || "(empty)"}`,
    "",
    "Incoming dependencies:",
    ...formatEdgeList(incoming, "from"),
    "",
    "Outgoing dependencies:",
    ...formatEdgeList(outgoing, "to"),
    "",
    "Preconditions:",
    ...formatList(beat.preconditions ?? [], formatCondition),
    "",
    "Auto-complete when:",
    ...formatList(beat.autoCompleteWhen ?? [], formatCondition),
    "",
    "Choices:",
    ...formatChoices(beat.choices ?? []),
    "",
    "On activate effects:",
    ...formatList(beat.onActivate ?? [], formatEffect),
    "",
    "On complete effects:",
    ...formatList(beat.onComplete ?? [], formatEffect),
    "",
    "Progression:",
    ...formatProgression(beat.progression),
    "",
    "Related IDs:",
    ...formatRelatedIds(beat.relatedIds ?? [], idIndex),
  ]
  return lines.join("\n")
}

function formatEdgeList(edges, side) {
  if (edges.length === 0) return ["  none"]
  return edges
    .slice()
    .sort((a, b) => (side === "from" ? a.from.localeCompare(b.from) : a.to.localeCompare(b.to)))
    .map((edge) => `  ${side === "from" ? edge.from : edge.to} [${edge.reason}]`)
}

function formatList(items, formatter) {
  if (!items || items.length === 0) return ["  none"]
  return items.map((item) => `  - ${formatter(item)}`)
}

function formatChoices(choices) {
  if (choices.length === 0) return ["  none"]
  const lines = []
  for (const choice of choices) {
    lines.push(`  - ${choice.label} (${choice.id})`)
    lines.push(`    response: ${choice.response}`)
    lines.push(`    effects: ${(choice.effects ?? []).map(formatEffect).join("; ") || "none"}`)
  }
  return lines
}

function formatProgression(progression) {
  if (!progression) return ["  none"]
  const lines = [
    `  track: ${progression.track}`,
    `  step: ${progression.stepId}`,
    `  short label: ${progression.presentation?.shortLabel ?? "none"}`,
    `  hint: ${progression.presentation?.playerHint ?? "none"}`,
    `  cta: ${progression.presentation?.ctaCopy ?? "none"}`,
    `  primary risk: ${progression.presentation?.primaryRiskCopy ?? "none"}`,
  ]
  lines.push("  blockers:")
  lines.push(...formatBlockersOrUnlocks(progression.blockers ?? []))
  lines.push("  unlocks:")
  lines.push(...formatBlockersOrUnlocks(progression.unlocks ?? []))
  return lines
}

function formatBlockersOrUnlocks(items) {
  if (items.length === 0) return ["    none"]
  return items.map((item) => `    - ${item.kind}: ${item.label} (${(item.relatedIds ?? []).join(", ") || "no related ids"})`)
}

function formatRelatedIds(ids, idIndex) {
  if (ids.length === 0) return ["  none"]
  return ids.map((id) => `  - ${id} (${(idIndex.get(id) ?? ["unknown"]).join(", ")})`)
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

function formatEffect(effect) {
  switch (effect.kind) {
    case "set_flag":
      return `set flag ${effect.flag_id}=${effect.value}`
    case "add_bunks":
      return `add bunks ${effect.amount}`
    case "add_skins":
      return `add skins ${effect.amount}`
    case "increment_crystal_track":
      return `increment crystal ${effect.track} by ${effect.amount}`
    case "increment_processing_track":
      return `increment processing ${effect.track} by ${effect.amount}`
    case "grant_resource":
      return `grant ${effect.amount} ${effect.resource_id}`
    case "spend_resource":
      return `spend ${effect.amount} ${effect.resource_id}`
    case "set_quality":
      return `set quality ${effect.key}=${effect.value}`
    case "add_quality":
      return `add quality ${effect.key} += ${effect.amount}`
    case "complete_beat":
      return `complete beat ${effect.beat_id}`
    case "note":
      return `note "${effect.text}"`
    default:
      return effect.kind
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
    "Usage: node scripts/add-content-tools.cjs <graph|validate|timeline|explain> [id]",
    "",
    "Commands:",
    "  graph                 Print story dependency graph and unreachable report.",
    "  validate              Validate ADD content and print reachability summary.",
    "  timeline              Print story beats grouped by arc and sequence.",
    "  explain <content-id>  Explain a story beat and its dependencies.",
  ].join("\n")
}

function main(argv) {
  const [command, id] = argv
  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(usage())
    return
  }

  const content = loadContent()
  if (command === "graph") {
    console.log(printGraph(content))
    return
  }
  if (command === "validate") {
    console.log(printValidation(content))
    return
  }
  if (command === "timeline") {
    console.log(printTimeline(content))
    return
  }
  if (command === "explain") {
    if (!id) throw new Error("content:explain requires a content id.")
    console.log(printExplain(content, id))
    return
  }

  throw new Error(`Unknown content tooling command "${command}".\n\n${usage()}`)
}

try {
  main(process.argv.slice(2))
} catch (error) {
  console.error(error?.message ?? error)
  process.exit(1)
}
