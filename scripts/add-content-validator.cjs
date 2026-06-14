const GENERATED_ID_PREFIXES = ["dungeon.", "area."]
const SYNTHETIC_IDS = ["cost.skin", "base.bunks_capacity"]

function validateAddContent(input) {
  const ctx = createValidationContext(input)

  registerCatalog(ctx, "resources", input.resources)
  registerCatalog(ctx, "roles", input.roles)
  registerCatalog(ctx, "flags", input.flags)
  registerCatalog(ctx, "flora", input.flora)
  registerCatalog(ctx, "structures", input.structures)
  registerCatalog(ctx, "tiles", input.tiles)
  registerCatalog(ctx, "stations", input.stations)
  registerCatalog(ctx, "construction", input.constructionOptions)
  registerCatalog(ctx, "world_actions", input.worldActions)
  registerCatalog(ctx, "processing_recipes", input.processingRecipes)
  registerCatalog(ctx, "story_beats", input.storyBeats)
  registerCatalog(ctx, "ui_elements", input.uiElements)
  registerCatalog(ctx, "items", input.items)
  registerCatalog(ctx, "perks", input.perks)
  registerCatalog(ctx, "creatures", input.creatures)

  registerExternalIds(ctx, "dungeons", input.dungeons, "id")
  registerExternalIds(ctx, "dungeon_maps", input.dungeons, "mapId")
  registerExternalIds(ctx, "areas", input.areas, "id")
  registerExternalIds(ctx, "area_maps", input.areas, "mapId")
  for (const id of SYNTHETIC_IDS) addKnownId(ctx, id, "synthetic")

  validateTileReferences(ctx, input.tiles)
  validateStationReferences(ctx, input.stations)
  validateActionReferences(ctx, input.constructionOptions, "construction")
  validateActionReferences(ctx, input.worldActions, "world_actions")
  validateProcessingReferences(ctx, input.processingRecipes)
  validateStory(ctx, input.storyBeats)
  validateUiReferences(ctx, input.uiElements)
  validateEntitySchemaReferences(ctx, input.entitySchemas)
  validatePerkReferences(ctx, input.perks)

  if (ctx.errors.length > 0) {
    const details = ctx.errors.map((error) => `  - ${error}`).join("\n")
    throw new Error(`[content:validate] ${ctx.errors.length} error(s):\n${details}`)
  }
}

function createValidationContext(input) {
  return {
    errors: [],
    ids: new Map(),
    catalogIds: new Map(),
    flagIds: new Set((input.flags ?? []).map((item) => item.id)),
    resourceIds: new Set((input.resources ?? []).map((item) => item.id)),
    roleIds: new Set((input.roles ?? []).map((item) => item.id)),
    floraIds: new Set((input.flora ?? []).map((item) => item.id)),
    structureIds: new Set((input.structures ?? []).map((item) => item.id)),
    tileIds: new Set((input.tiles ?? []).map((item) => item.id)),
    stationIds: new Set((input.stations ?? []).map((item) => item.id)),
    worldActionIds: new Set((input.worldActions ?? []).map((item) => item.id)),
    storyBeatIds: new Set((input.storyBeats ?? []).map((item) => item.id)),
    itemOrResourceIds: new Set([
      ...(input.items ?? []).map((item) => item.id),
      ...(input.resources ?? []).map((item) => item.id),
      "cost.skin",
    ]),
    storyChoicesByBeat: new Map(
      (input.storyBeats ?? []).map((beat) => [
        beat.id,
        new Set((beat.choices ?? []).map((choice) => choice.id)),
      ]),
    ),
  }
}

function registerCatalog(ctx, catalogName, entries = []) {
  const local = new Map()
  for (const entry of entries) {
    if (!entry?.id) {
      ctx.errors.push(`${catalogName}: entry is missing id`)
      continue
    }
    const existing = local.get(entry.id)
    if (existing) {
      ctx.errors.push(`${catalogName}: duplicate id "${entry.id}"`)
    }
    local.set(entry.id, true)
    addKnownId(ctx, entry.id, catalogName)

    if ("schemaId" in entry && entry.schemaId !== entry.id) {
      ctx.errors.push(`${catalogName}.${entry.id}: schemaId "${entry.schemaId}" must match id`)
    }
  }
  ctx.catalogIds.set(catalogName, new Set(local.keys()))
}

function registerExternalIds(ctx, catalogName, entries = [], key) {
  for (const entry of entries ?? []) {
    const id = entry?.[key]
    if (!id) continue
    addKnownId(ctx, id, catalogName)
  }
}

function addKnownId(ctx, id, source) {
  const existing = ctx.ids.get(id)
  if (!existing) {
    ctx.ids.set(id, source)
    return
  }
  if (source === "ui_elements" || existing === "ui_elements") {
    ctx.errors.push(`global ids: duplicate id "${id}" in ${existing} and ${source}`)
  }
}

function validateTileReferences(ctx, tiles = []) {
  for (const tile of tiles) {
    validateIdList(ctx, `tile ${tile.id}.floraIds`, tile.floraIds, ctx.floraIds, "flora")
    validateIdList(ctx, `tile ${tile.id}.structureIds`, tile.structureIds, ctx.structureIds, "structure")
    validateRelatedIds(ctx, `tile ${tile.id}.dungeonIds`, tile.dungeonIds)
    validateRelatedIds(ctx, `tile ${tile.id}.areaIds`, tile.areaIds)
  }
}

function validateStationReferences(ctx, stations = []) {
  for (const station of stations) {
    validateRequirements(ctx, `station ${station.id}.requirements`, station.requirements)
  }
}

function validateActionReferences(ctx, entries = [], catalogName) {
  for (const entry of entries) {
    validateCost(ctx, `${catalogName} ${entry.id}.cost`, entry.cost)
    validateRequirements(ctx, `${catalogName} ${entry.id}.requirements`, entry.requirements)
    validateEffects(ctx, `${catalogName} ${entry.id}.effects`, entry.effects)
    if (!Array.isArray(entry.effects) || entry.effects.length === 0) {
      ctx.errors.push(`${catalogName} ${entry.id}: actions must have at least one effect`)
    }
  }
}

function validateProcessingReferences(ctx, recipes = []) {
  for (const recipe of recipes) {
    requireKnown(ctx, `processing ${recipe.id}.stationId`, recipe.stationId, ctx.stationIds, "station")
    validateCost(ctx, `processing ${recipe.id}.cost`, recipe.cost)
    validateRequirements(ctx, `processing ${recipe.id}.requirements`, recipe.requirements)
    validateEffects(ctx, `processing ${recipe.id}.effects`, recipe.effects)
  }
}

function validateStory(ctx, beats = []) {
  validateStoryChoices(ctx, beats)
  validateStoryReferences(ctx, beats)
  validateStoryGraph(ctx, beats)
}

function validateStoryChoices(ctx, beats) {
  const allChoiceIds = new Map()
  for (const beat of beats) {
    const localChoiceIds = new Set()
    for (const choice of beat.choices ?? []) {
      if (!choice.id) {
        ctx.errors.push(`story ${beat.id}: choice is missing id`)
        continue
      }
      if (localChoiceIds.has(choice.id)) {
        ctx.errors.push(`story ${beat.id}: duplicate choice id "${choice.id}"`)
      }
      localChoiceIds.add(choice.id)
      const existing = allChoiceIds.get(choice.id)
      if (existing) {
        ctx.errors.push(`story choices: duplicate choice id "${choice.id}" in ${existing} and ${beat.id}`)
      }
      allChoiceIds.set(choice.id, beat.id)

      if (!choice.label || !choice.response) {
        ctx.errors.push(`story ${beat.id}: choice "${choice.id}" must include label and response`)
      }
      validateEffects(ctx, `story ${beat.id}.choice ${choice.id}.effects`, choice.effects ?? [])
    }
  }
}

function validateStoryReferences(ctx, beats) {
  for (const beat of beats) {
    if (beat.worldActionId !== null && beat.worldActionId !== undefined) {
      requireKnown(ctx, `story ${beat.id}.worldActionId`, beat.worldActionId, ctx.worldActionIds, "world action")
    }
    validateRelatedIds(ctx, `story ${beat.id}.relatedIds`, beat.relatedIds)
    validateConditionSet(ctx, `story ${beat.id}.preconditions`, beat.preconditions ?? [], beat.id)
    validateConditionSet(ctx, `story ${beat.id}.autoCompleteWhen`, beat.autoCompleteWhen ?? [], beat.id)
    validateEffects(ctx, `story ${beat.id}.onComplete`, beat.onComplete ?? [])
    validateEffects(ctx, `story ${beat.id}.onActivate`, beat.onActivate ?? [])

    const hasResolution =
      (beat.choices ?? []).length > 0 ||
      Boolean(beat.worldActionId) ||
      (beat.autoCompleteWhen ?? []).length > 0 ||
      (beat.onComplete ?? []).some((effect) => effect.kind === "complete_beat")
    if (!hasResolution && !isTerminalBeat(beat, beats)) {
      ctx.errors.push(`story ${beat.id}: non-terminal beat has no choice, worldActionId, autoCompleteWhen, or completion effect`)
    }
  }
}

function validateStoryGraph(ctx, beats) {
  const byId = new Map(beats.map((beat) => [beat.id, beat]))
  const dependencies = new Map(beats.map((beat) => [beat.id, new Set()]))
  const handoffKeysByBeat = new Map()

  for (const beat of beats) {
    for (const condition of beat.autoCompleteWhen ?? []) {
      for (const key of conditionDependencyKeys(condition)) {
        if (!handoffKeysByBeat.has(key)) handoffKeysByBeat.set(key, new Set())
        handoffKeysByBeat.get(key).add(beat.id)
      }
    }
  }

  for (const beat of beats) {
    for (const condition of beat.preconditions ?? []) {
      for (const dependencyBeatId of conditionStoryBeatDependencies(condition)) {
        if (byId.has(dependencyBeatId)) dependencies.get(beat.id).add(dependencyBeatId)
      }
      for (const key of conditionDependencyKeys(condition)) {
        for (const sourceBeatId of handoffKeysByBeat.get(key) ?? []) {
          if (sourceBeatId !== beat.id) dependencies.get(beat.id).add(sourceBeatId)
        }
      }
    }
  }

  validateStoryCycles(ctx, dependencies, byId)
  validateReachableStoryBeats(ctx, beats, dependencies)
  validateArcSequences(ctx, beats, dependencies)
}

function validateStoryCycles(ctx, dependencies, byId) {
  const visiting = new Set()
  const visited = new Set()
  const stack = []

  function visit(id) {
    if (visited.has(id)) return
    if (visiting.has(id)) {
      const start = stack.indexOf(id)
      const cycle = [...stack.slice(start), id]
      const explicitlyAllowed = cycle.every((beatId) => byId.get(beatId)?.allowCycle === true)
      if (!explicitlyAllowed) {
        ctx.errors.push(`story graph: cycle detected ${cycle.join(" -> ")}`)
      }
      return
    }
    visiting.add(id)
    stack.push(id)
    for (const dep of dependencies.get(id) ?? []) visit(dep)
    stack.pop()
    visiting.delete(id)
    visited.add(id)
  }

  for (const id of dependencies.keys()) visit(id)
}

function validateReachableStoryBeats(ctx, beats, dependencies) {
  const roots = beats.filter((beat) => (dependencies.get(beat.id)?.size ?? 0) === 0).map((beat) => beat.id)
  if (roots.length === 0 && beats.length > 0) {
    ctx.errors.push("story graph: no root beat is reachable")
    return
  }

  const forward = new Map(beats.map((beat) => [beat.id, new Set()]))
  for (const [beatId, deps] of dependencies.entries()) {
    for (const dep of deps) forward.get(dep)?.add(beatId)
  }

  const reachable = new Set()
  const stack = [...roots]
  while (stack.length > 0) {
    const id = stack.pop()
    if (reachable.has(id)) continue
    reachable.add(id)
    for (const next of forward.get(id) ?? []) stack.push(next)
  }

  for (const beat of beats) {
    if (!reachable.has(beat.id)) {
      ctx.errors.push(`story ${beat.id}: unreachable from any root beat`)
    }
  }
}

function validateArcSequences(ctx, beats, dependencies) {
  const byArc = new Map()
  for (const beat of beats) {
    if (!byArc.has(beat.arc)) byArc.set(beat.arc, [])
    byArc.get(beat.arc).push(beat)
  }

  for (const [arc, arcBeats] of byArc.entries()) {
    const sequenceIds = new Map()
    for (const beat of arcBeats) {
      if (!Number.isInteger(beat.sequence)) {
        ctx.errors.push(`story arc ${arc}: ${beat.id} has non-integer sequence ${beat.sequence}`)
      }
      const existing = sequenceIds.get(beat.sequence)
      if (existing) {
        ctx.errors.push(`story arc ${arc}: duplicate sequence ${beat.sequence} in ${existing} and ${beat.id}`)
      }
      sequenceIds.set(beat.sequence, beat.id)
    }

    const sorted = [...arcBeats].sort((a, b) => a.sequence - b.sequence)
    for (let index = 1; index < sorted.length; index += 1) {
      const beat = sorted[index]
      const earlierIds = new Set(sorted.slice(0, index).map((entry) => entry.id))
      const hasEarlierArcDependency = [...(dependencies.get(beat.id) ?? [])].some((dep) => earlierIds.has(dep))
      if (!hasEarlierArcDependency) {
        ctx.errors.push(`story arc ${arc}: ${beat.id} at sequence ${beat.sequence} is not connected to an earlier beat in the same arc`)
      }
    }
  }
}

function isTerminalBeat(beat, beats) {
  const maxSequence = Math.max(
    ...beats.filter((candidate) => candidate.arc === beat.arc).map((candidate) => candidate.sequence),
  )
  return beat.sequence === maxSequence
}

function validateUiReferences(ctx, uiElements = []) {
  for (const element of uiElements) {
    validateRelatedIds(ctx, `ui ${element.id}.relatedIds`, element.relatedIds)
    validateVisibility(ctx, `ui ${element.id}.visibility`, element.visibility)
  }
}

function validateEntitySchemaReferences(ctx, schemas = []) {
  for (const schema of schemas) {
    for (const group of ["unlocks", "blockers", "accessRules"]) {
      for (const item of schema[group] ?? []) {
        validateRelatedIds(ctx, `entity ${schema.id}.${group}`, item.relatedIds)
      }
    }
    for (const flow of schema.flows ?? []) {
      validateRelatedIds(ctx, `entity ${schema.id}.flows`, flow.relatedIds)
      if (!ctx.ids.has(flow.itemId)) {
        ctx.errors.push(`entity ${schema.id}.flow ${flow.label}.itemId: referenced id "${flow.itemId}" does not exist`)
      }
    }
  }
}

function validatePerkReferences(ctx, perks = []) {
  const perkIds = new Set(perks.map((perk) => perk.id))
  for (const perk of perks) {
    validateIdList(ctx, `perk ${perk.id}.requires`, perk.requires, perkIds, "perk")
  }
}

function validateCost(ctx, label, cost) {
  if (!cost) return
  if (cost.kind === "upfront" || cost.kind === "drain_per_worker_second") {
    requireKnown(ctx, `${label}.resource_id`, cost.resource_id, ctx.resourceIds, "resource")
  }
  if (cost.kind === "upfront_bundle") {
    for (const item of cost.costs ?? []) {
      requireKnown(ctx, `${label}.costs.item_id`, item.item_id, ctx.itemOrResourceIds, "item/resource")
    }
  }
}

function validateRequirements(ctx, label, requirements = []) {
  for (const requirement of requirements) {
    if (requirement.kind === "flag_set" || requirement.kind === "flag_unset") {
      requireKnown(ctx, `${label}.${requirement.kind}`, requirement.flag_id, ctx.flagIds, "flag")
    }
  }
}

function validateEffects(ctx, label, effects = []) {
  for (const effect of effects) {
    if (effect.kind === "set_flag") requireKnown(ctx, `${label}.set_flag`, effect.flag_id, ctx.flagIds, "flag")
    if (effect.kind === "grant_resource" || effect.kind === "spend_resource") {
      requireKnown(ctx, `${label}.${effect.kind}`, effect.resource_id, ctx.resourceIds, "resource")
    }
    if (effect.kind === "complete_beat") {
      requireKnown(ctx, `${label}.complete_beat`, effect.beat_id, ctx.storyBeatIds, "story beat")
    }
  }
}

function validateConditionSet(ctx, label, conditions = [], owningBeatId = null) {
  validateConditionList(ctx, label, conditions, owningBeatId, true)
}

function validateConditionList(ctx, label, conditions = [], owningBeatId = null, andContext = true) {
  if (!Array.isArray(conditions)) {
    ctx.errors.push(`${label}: conditions must be an array`)
    return { flagSets: new Set(), flagUnsets: new Set() }
  }

  const flagSets = new Set()
  const flagUnsets = new Set()

  for (const condition of conditions) {
    const nestedFlags = validateCondition(ctx, label, condition, owningBeatId, andContext)
    if (andContext) {
      for (const flagId of nestedFlags.flagSets) flagSets.add(flagId)
      for (const flagId of nestedFlags.flagUnsets) flagUnsets.add(flagId)
    }
  }

  if (andContext) {
    for (const flagId of flagSets) {
      if (flagUnsets.has(flagId)) {
        ctx.errors.push(`${label}: impossible flag precondition requires "${flagId}" to be both set and unset`)
      }
    }
  }

  return { flagSets, flagUnsets }
}

function validateCondition(ctx, label, condition, owningBeatId = null, andContext = true) {
  const flagSets = new Set()
  const flagUnsets = new Set()

  if (!condition || typeof condition !== "object") {
    ctx.errors.push(`${label}: condition must be an object`)
    return { flagSets, flagUnsets }
  }

  switch (condition.kind) {
    case "flag_set":
      requireKnown(ctx, `${label}.flag_set`, condition.flag_id, ctx.flagIds, "flag")
      if (andContext) flagSets.add(condition.flag_id)
      break
    case "flag_unset":
      requireKnown(ctx, `${label}.flag_unset`, condition.flag_id, ctx.flagIds, "flag")
      if (andContext) flagUnsets.add(condition.flag_id)
      break
    case "resource_at_least":
      requireKnown(ctx, `${label}.resource_at_least`, condition.resource_id, ctx.resourceIds, "resource")
      if (!Number.isFinite(condition.amount) || condition.amount < 0) {
        ctx.errors.push(`${label}: resource_at_least for "${condition.resource_id}" needs a non-negative finite amount`)
      }
      break
    case "bubble_reach_at_least":
      if (!Number.isInteger(condition.n) || condition.n < 0) {
        ctx.errors.push(`${label}: bubble_reach_at_least needs a non-negative integer`)
      }
      break
    case "clock_seconds_at_least":
      if (!Number.isFinite(condition.seconds) || condition.seconds < 0) {
        ctx.errors.push(`${label}: clock_seconds_at_least needs non-negative finite seconds`)
      }
      break
    case "beat_completed":
      requireKnown(ctx, `${label}.beat_completed`, condition.beat_id, ctx.storyBeatIds, "story beat")
      if (condition.beat_id === owningBeatId) {
        ctx.errors.push(`${label}: beat cannot require itself to be completed`)
      }
      break
    case "choice_made":
      requireKnown(ctx, `${label}.choice_made beat`, condition.beat_id, ctx.storyBeatIds, "story beat")
      if (condition.beat_id === owningBeatId) {
        ctx.errors.push(`${label}: beat cannot require its own choice before activation`)
      }
      if (!ctx.storyChoicesByBeat.get(condition.beat_id)?.has(condition.option_id)) {
        ctx.errors.push(`${label}: choice_made references missing option "${condition.option_id}" on beat "${condition.beat_id}"`)
      }
      break
    case "role_available":
      requireKnown(ctx, `${label}.role_available`, condition.role_id, ctx.roleIds, "role")
      break
    case "always":
    case "recruitment_enabled":
    case "recruited_any":
    case "hero_outside_bubble":
    case "hero_forced_return":
    case "hero_recovering":
      break
    case "all": {
      const conditions = condition.conditions ?? []
      if (!Array.isArray(conditions) || conditions.length === 0) {
        ctx.errors.push(`${label}.all: conditions must be a non-empty array`)
      }
      const nested = validateConditionList(ctx, `${label}.all`, conditions, owningBeatId, andContext)
      for (const flagId of nested.flagSets) flagSets.add(flagId)
      for (const flagId of nested.flagUnsets) flagUnsets.add(flagId)
      break
    }
    case "any": {
      const conditions = condition.conditions ?? []
      if (!Array.isArray(conditions) || conditions.length === 0) {
        ctx.errors.push(`${label}.any: conditions must be a non-empty array`)
      }
      validateConditionList(ctx, `${label}.any`, conditions, owningBeatId, false)
      break
    }
    case "not":
      validateCondition(ctx, `${label}.not`, condition.condition, owningBeatId, false)
      break
    default:
      ctx.errors.push(`${label}: unsupported condition kind "${condition.kind}"`)
  }

  return { flagSets, flagUnsets }
}

function validateVisibility(ctx, label, visibility) {
  for (const condition of [...(visibility?.allOf ?? []), ...(visibility?.anyOf ?? [])]) {
    if (condition.kind === "flag_set" || condition.kind === "flag_unset") {
      requireKnown(ctx, `${label}.${condition.kind}`, condition.flag_id, ctx.flagIds, "flag")
    }
    if (condition.kind === "resource_positive") {
      requireKnown(ctx, `${label}.resource_positive`, condition.resource_id, ctx.resourceIds, "resource")
    }
    if (condition.kind === "role_assigned" || condition.kind === "role_available") {
      requireKnown(ctx, `${label}.${condition.kind}`, condition.role_id, ctx.roleIds, "role")
    }
  }
}

function validateRelatedIds(ctx, label, ids = []) {
  for (const id of ids ?? []) {
    if (ctx.ids.has(id)) continue
    if (GENERATED_ID_PREFIXES.some((prefix) => id.startsWith(prefix))) {
      ctx.errors.push(`${label}: referenced generated id "${id}" is not registered`)
      continue
    }
    ctx.errors.push(`${label}: referenced id "${id}" does not exist`)
  }
}

function validateIdList(ctx, label, ids = [], knownIds, knownLabel) {
  for (const id of ids ?? []) {
    requireKnown(ctx, label, id, knownIds, knownLabel)
  }
}

function requireKnown(ctx, label, id, knownIds, knownLabel) {
  if (id && knownIds.has(id)) return
  ctx.errors.push(`${label}: unknown ${knownLabel} "${id}"`)
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

module.exports = { validateAddContent }
