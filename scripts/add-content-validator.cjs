const GENERATED_ID_PREFIXES = ["dungeon.", "area."]
const SYNTHETIC_IDS = ["cost.skin", "base.bunks_capacity"]
const CRYSTAL_TRACKS = new Set(["slot_capacity", "output", "storage", "field_polish", "resonance_calibration", "mix_calibration", "workshop_tooling"])
const DURATION_TRACKS = new Set(["slot_capacity", "output", "storage", "field_polish"])
const PROCESSING_TRACKS = new Set([
  "resonance_calibration",
  "mix_calibration",
  "workshop_tooling",
  "workshop_water_condensers",
  "research_chorus_routing",
  "research_harmonic_study",
])

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
}

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
  registerCatalog(ctx, "objectives", input.objectives)
  registerCatalog(ctx, "ui_elements", input.uiElements)
  registerCatalog(ctx, "items", input.items)
  registerCatalog(ctx, "perks", input.perks)
  registerCatalog(ctx, "creatures", input.creatures)
  registerCatalog(ctx, "encounters", input.encounterTables)
  registerCatalog(ctx, "loot_tables", input.lootTables)
  registerStoryChoiceIds(ctx, input.storyBeats)

  registerExternalIds(ctx, "dungeons", input.dungeons, "id")
  registerExternalIds(ctx, "dungeon_maps", input.dungeons, "mapId")
  registerExternalIds(ctx, "areas", input.areas, "id")
  registerExternalIds(ctx, "narrative_acts", input.narrativeActs, "id")
  registerExternalIds(ctx, "narrative_entities", input.narrativeEntities, "id")
  registerExternalIds(ctx, "area_maps", input.areas, "mapId")
  for (const id of SYNTHETIC_IDS) addKnownId(ctx, id, "synthetic")

  validateTileReferences(ctx, input.tiles)
  validateStationReferences(ctx, input.stations)
  validateActionReferences(ctx, input.constructionOptions, "construction")
  validateActionReferences(ctx, input.worldActions, "world_actions")
  validateProcessingReferences(ctx, input.processingRecipes)
  validateStory(ctx, input.storyBeats)
  validateObjectiveReferences(ctx, input.objectives)
  validateEncounterReferences(ctx, input.encounterTables)
  validateLootReferences(ctx, input.lootTables)
  validateItemReferences(ctx, input.items)
  validateUiReferences(ctx, input.uiElements)
  validateSchemaIds(ctx, input.entitySchemas)
  validateEntitySchemaReferences(ctx, input.entitySchemas)
  validatePerkReferences(ctx, input.perks)
  validateCreatureReferences(ctx, input.creatures)

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
    constructionIds: new Set((input.constructionOptions ?? []).map((item) => item.id)),
    worldActionIds: new Set((input.worldActions ?? []).map((item) => item.id)),
    storyBeatIds: new Set((input.storyBeats ?? []).map((item) => item.id)),
    objectiveIds: new Set((input.objectives ?? []).map((item) => item.id)),
    creatureIds: new Set((input.creatures ?? []).map((item) => item.id)),
    itemIds: new Set((input.items ?? []).map((item) => item.id)),
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
    if (!isContentId(entry?.id)) {
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
  const local = new Set()
  for (const entry of entries ?? []) {
    const id = entry?.[key]
    if (!isContentId(id)) continue
    if (local.has(id)) ctx.errors.push(`${catalogName}: duplicate ${key} "${id}"`)
    local.add(id)
    addKnownId(ctx, id, catalogName)
  }
}

function registerStoryChoiceIds(ctx, beats = []) {
  for (const beat of beats) {
    for (const choice of beat.choices ?? []) {
      if (isContentId(choice?.id)) addKnownId(ctx, choice.id, "story_choices")
    }
  }
}

function isContentId(id) {
  return typeof id === "string" && id.trim() !== ""
}

function addKnownId(ctx, id, source) {
  const existing = ctx.ids.get(id)
  if (!existing) {
    ctx.ids.set(id, source)
    return
  }
  if (existing !== source) {
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
    if (!entry || typeof entry !== "object") continue
    if (catalogName !== "world_actions" && !entry.cost) {
      ctx.errors.push(`${catalogName} ${entry.id}: actions must define a cost`)
    }
    if (catalogName !== "world_actions") {
      validateCost(ctx, `${catalogName} ${entry.id}.cost`, entry.cost)
      validateDuration(ctx, `${catalogName} ${entry.id}.duration`, entry.duration)
    }
    validateRequirements(ctx, `${catalogName} ${entry.id}.requirements`, entry.requirements)
    validateEffects(ctx, `${catalogName} ${entry.id}.effects`, entry.effects)
    if (!Array.isArray(entry.effects) || entry.effects.length === 0) {
      ctx.errors.push(`${catalogName} ${entry.id}: actions must have at least one effect`)
    }

    if (catalogName === "world_actions") {
      validateNonNegativeNumber(ctx, `${catalogName} ${entry.id}.durationSeconds`, entry.durationSeconds)
      validateNonNegativeNumber(ctx, `${catalogName} ${entry.id}.returnToBubbleSeconds`, entry.returnToBubbleSeconds)
      validateNonNegativeNumber(ctx, `${catalogName} ${entry.id}.returnToStudioSeconds`, entry.returnToStudioSeconds)
      if (typeof entry.heroOnly !== "boolean") {
        ctx.errors.push(`${catalogName} ${entry.id}.heroOnly: must be a boolean`)
      }
      if (typeof entry.offlineProgress !== "boolean") {
        ctx.errors.push(`${catalogName} ${entry.id}.offlineProgress: must be a boolean`)
      }
    }
  }
}

function validateProcessingReferences(ctx, recipes = []) {
  for (const recipe of recipes) {
    if (!recipe.cost) {
      ctx.errors.push(`processing ${recipe.id}: recipes must define a cost`)
    }
    requireKnown(ctx, `processing ${recipe.id}.stationId`, recipe.stationId, ctx.stationIds, "station")
    validateCost(ctx, `processing ${recipe.id}.cost`, recipe.cost)
    validateDuration(ctx, `processing ${recipe.id}.duration`, recipe.duration)
    validateRequirements(ctx, `processing ${recipe.id}.requirements`, recipe.requirements)
    validateEffects(ctx, `processing ${recipe.id}.effects`, recipe.effects)
    if (!Number.isInteger(recipe.maxLevel) || recipe.maxLevel < 1) {
      ctx.errors.push(`processing ${recipe.id}.maxLevel: must be a positive integer`)
    }
  }
}

function validateDuration(ctx, label, duration) {
  if (!duration || typeof duration !== "object") {
    ctx.errors.push(`${label}: duration must be an object`)
    return
  }
  switch (duration.kind) {
    case "time_only":
      ctx.errors.push(`${label}: unsupported duration kind "time_only"`)
      break
    case "fixed":
      if (!isFiniteNumber(duration.seconds) || duration.seconds <= 0) {
        ctx.errors.push(`${label}: fixed duration needs positive finite seconds`)
      }
      break
    case "crystal_level_scaled":
      if (!DURATION_TRACKS.has(duration.track)) {
        ctx.errors.push(`${label}: unknown crystal track "${duration.track}"`)
      }
      if (!isFiniteNumber(duration.base_seconds) || duration.base_seconds <= 0) {
        ctx.errors.push(`${label}: base_seconds needs positive finite seconds`)
      }
      if (!isFiniteNumber(duration.per_level_seconds) || duration.per_level_seconds < 0) {
        ctx.errors.push(`${label}: per_level_seconds needs non-negative finite seconds`)
      }
      break
    default:
      ctx.errors.push(`${label}: unsupported duration kind "${duration.kind}"`)
  }
}

function validateNonNegativeNumber(ctx, label, value) {
  if (!isFiniteNumber(value) || value < 0) {
    ctx.errors.push(`${label}: must be a non-negative finite number`)
  }
}

function validateObjectiveReferences(ctx, objectives = []) {
  const sequences = new Map()
  for (const objective of objectives) {
    if (!Number.isInteger(objective.sequence) || objective.sequence < 1) {
      ctx.errors.push(`objective ${objective.id}.sequence: must be a positive integer`)
    }
    if (sequences.has(objective.sequence)) {
      ctx.errors.push(
        `objectives: duplicate sequence ${objective.sequence} in ${sequences.get(objective.sequence)} and ${objective.id}`,
      )
    }
    sequences.set(objective.sequence, objective.id)
    validateConditionSet(ctx, `objective ${objective.id}.conditions`, objective.conditions ?? [], objective.id)
    validateEffects(ctx, `objective ${objective.id}.rewards`, objective.rewards ?? [])
    if (!Array.isArray(objective.conditions) || objective.conditions.length === 0) {
      ctx.errors.push(`objective ${objective.id}: must define at least one condition`)
    }
  }
}

function validateEncounterReferences(ctx, tables = []) {
  for (const table of tables) {
    if (!Array.isArray(table.entries) || table.entries.length === 0) {
      ctx.errors.push(`encounter ${table.id}: must define at least one entry`)
      continue
    }
    for (const [index, entry] of table.entries.entries()) {
      const label = `encounter ${table.id}.entries[${index}]`
      if (!entry || typeof entry !== "object") {
        ctx.errors.push(`${label}: entry must be an object`)
        continue
      }
      requireKnown(ctx, `${label}.creatureId`, entry.creatureId, ctx.creatureIds, "creature")
      validatePositiveNumber(ctx, `${label}.weight`, entry.weight)
      validateQuantityRange(ctx, label, entry.min, entry.max)
    }
  }
}

function validateLootReferences(ctx, tables = []) {
  for (const table of tables) {
    if (!Array.isArray(table.entries) || table.entries.length === 0) {
      ctx.errors.push(`loot table ${table.id}: must define at least one entry`)
      continue
    }
    for (const [index, entry] of table.entries.entries()) {
      const label = `loot table ${table.id}.entries[${index}]`
      if (!entry || typeof entry !== "object") {
        ctx.errors.push(`${label}: entry must be an object`)
        continue
      }
      requireKnown(ctx, `${label}.itemId`, entry.itemId, ctx.itemIds, "item")
      validatePositiveNumber(ctx, `${label}.weight`, entry.weight)
      validateQuantityRange(ctx, label, entry.min, entry.max)
    }
  }
}

function validateQuantityRange(ctx, label, min, max) {
  if (min !== undefined && (!Number.isInteger(min) || min < 1)) {
    ctx.errors.push(`${label}.min: must be a positive integer when present`)
  }
  if (max !== undefined && (!Number.isInteger(max) || max < 1)) {
    ctx.errors.push(`${label}.max: must be a positive integer when present`)
  }
  if (min !== undefined && max !== undefined && max < min) {
    ctx.errors.push(`${label}: max must be greater than or equal to min`)
  }
}

function validatePositiveNumber(ctx, label, value) {
  if (!isFiniteNumber(value) || value <= 0) {
    ctx.errors.push(`${label}: must be a positive finite number`)
  }
}

function validateItemReferences(ctx, items = []) {
  for (const item of items) {
    if (!item || typeof item !== "object") continue
    if (item.stackable !== undefined && typeof item.stackable !== "boolean") {
      ctx.errors.push(`item ${item.id}.stackable: must be a boolean when present`)
    }
    if (item.maxStack !== undefined && (!Number.isInteger(item.maxStack) || item.maxStack < 1)) {
      ctx.errors.push(`item ${item.id}.maxStack: must be a positive integer when present`)
    }
    if (!item.useEffect) continue
    if (typeof item.useEffect !== "object") {
      ctx.errors.push(`item ${item.id}.useEffect: must be an object when present`)
      continue
    }
    if (item.useEffect.kind !== "restore_survival") {
      ctx.errors.push(`item ${item.id}.useEffect: unsupported effect kind "${item.useEffect.kind}"`)
    }
    validateNonNegativeNumber(ctx, `item ${item.id}.useEffect.amount`, item.useEffect.amount)
    if (item.useEffect.amount > 1) {
      ctx.errors.push(`item ${item.id}.useEffect.amount: restore_survival cannot exceed 1`)
    }
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
      if (!isContentId(choice?.id)) {
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
    validateStoryProgression(ctx, beat)
    if (
      beat.blocksUnrelatedWorldActions !== undefined &&
      typeof beat.blocksUnrelatedWorldActions !== "boolean"
    ) {
      ctx.errors.push(`story ${beat.id}.blocksUnrelatedWorldActions: must be a boolean when present`)
    }
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

function validateStoryProgression(ctx, beat) {
  const progression = beat.progression
  if (!progression) return

  for (const item of [...(progression.blockers ?? []), ...(progression.unlocks ?? [])]) {
    validateRelatedIds(ctx, `story ${beat.id}.progression.relatedIds`, item.relatedIds)
  }

  const action = progression.primaryAction
  if (!action) return
  switch (action.kind) {
    case "world_action":
      requireKnown(ctx, `story ${beat.id}.progression.primaryAction`, action.actionId, ctx.worldActionIds, "world action")
      break
    case "construction":
      requireKnown(ctx, `story ${beat.id}.progression.primaryAction`, action.optionId, ctx.constructionIds, "construction option")
      if (action.gatherRoleId) requireKnown(ctx, `story ${beat.id}.progression.primaryAction.gatherRoleId`, action.gatherRoleId, ctx.roleIds, "role")
      if (action.buildRoleId) requireKnown(ctx, `story ${beat.id}.progression.primaryAction.buildRoleId`, action.buildRoleId, ctx.roleIds, "role")
      validateNonNegativeNumber(ctx, `story ${beat.id}.progression.primaryAction.waitSeconds`, action.waitSeconds)
      break
    case "assign_role":
      requireKnown(ctx, `story ${beat.id}.progression.primaryAction.roleId`, action.roleId, ctx.roleIds, "role")
      if (action.crew !== null && action.crew !== undefined && (!Number.isInteger(action.crew) || action.crew < 0)) {
        ctx.errors.push(`story ${beat.id}.progression.primaryAction.crew: must be a non-negative integer or null`)
      }
      if (typeof action.assignHero !== "boolean") {
        ctx.errors.push(`story ${beat.id}.progression.primaryAction.assignHero: must be a boolean`)
      }
      break
    case "tick":
      validatePositiveNumber(ctx, `story ${beat.id}.progression.primaryAction.seconds`, action.seconds)
      break
    case "recruit_from_survivor_cave":
      if (action.vibesRoleId) requireKnown(ctx, `story ${beat.id}.progression.primaryAction.vibesRoleId`, action.vibesRoleId, ctx.roleIds, "role")
      validateNonNegativeNumber(ctx, `story ${beat.id}.progression.primaryAction.waitSeconds`, action.waitSeconds)
      break
    case "story_choice":
    case "preview_route_to_base":
    case "none":
      break
    default:
      ctx.errors.push(`story ${beat.id}.progression.primaryAction: unsupported action kind "${action.kind}"`)
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
    for (const effect of [
      ...(beat.onActivate ?? []),
      ...(beat.onComplete ?? []),
      ...(beat.choices ?? []).flatMap((choice) => choice.effects ?? []),
    ]) {
      if (effect.kind === "complete_beat" && byId.has(effect.beat_id) && effect.beat_id !== beat.id) {
        dependencies.get(effect.beat_id).add(beat.id)
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
  const minimumSequenceByArc = new Map()
  for (const beat of beats) {
    const minimum = minimumSequenceByArc.get(beat.arc)
    if (minimum === undefined || beat.sequence < minimum) minimumSequenceByArc.set(beat.arc, beat.sequence)
  }
  const roots = beats.filter((beat) => (dependencies.get(beat.id)?.size ?? 0) === 0)
  const entryRoots = roots
    .filter((beat) => beat.sequence === minimumSequenceByArc.get(beat.arc))
    .map((beat) => beat.id)
  if (entryRoots.length === 0 && beats.length > 0) {
    ctx.errors.push("story graph: no declared entry beat is reachable")
    return
  }

  const forward = new Map(beats.map((beat) => [beat.id, new Set()]))
  for (const [beatId, deps] of dependencies.entries()) {
    for (const dep of deps) forward.get(dep)?.add(beatId)
  }

  const reachable = new Set()
  const stack = [...entryRoots]
  while (stack.length > 0) {
    const id = stack.pop()
    if (reachable.has(id)) continue
    reachable.add(id)
    for (const next of forward.get(id) ?? []) stack.push(next)
  }

  for (const beat of beats) {
    if (!reachable.has(beat.id)) {
      ctx.errors.push(
        `story ${beat.id}: unreachable from a declared entry beat (an arc entry must be the lowest sequence in its arc)`,
      )
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
    if (!ctx.ids.has(schema.id)) {
      ctx.errors.push(`entity ${schema.id}: schema id does not identify a known content item`)
    }
    validateVisibility(ctx, `entity ${schema.id}.visibility`, schema.visibility)
    if (schema.power) {
      requireKnown(ctx, `entity ${schema.id}.power.resourceId`, schema.power.resourceId, ctx.resourceIds, "resource")
    }
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
    if (!perk || typeof perk !== "object") continue
    validateIdList(ctx, `perk ${perk.id}.requires`, perk.requires, perkIds, "perk")
    if (perk.effects !== undefined && perk.effects !== null && !Array.isArray(perk.effects)) {
      ctx.errors.push(`perk ${perk.id}.effects: must be an array when present`)
      continue
    }
    for (const [index, effect] of (perk.effects ?? []).entries()) {
      const label = `perk ${perk.id}.effects[${index}]`
      if (!effect || typeof effect !== "object") {
        ctx.errors.push(`${label}: effect must be an object`)
        continue
      }
      if (!["scavenge_yield", "construction_speed", "crystal_output", "hero_recovery"].includes(effect.stat)) {
        ctx.errors.push(`${label}.stat: unsupported perk stat "${effect.stat}"`)
      }
      if (!isFiniteNumber(effect.multiplier) || effect.multiplier <= 0) {
        ctx.errors.push(`${label}.multiplier: must be a positive finite number`)
      }
    }
  }
}

function validateCreatureReferences(ctx, creatures = []) {
  for (const creature of creatures) {
    if (!creature || typeof creature !== "object") continue
    for (const field of ["hp", "attack", "xpReward"]) {
      if (creature[field] !== undefined) validatePositiveNumber(ctx, `creature ${creature.id}.${field}`, creature[field])
    }
    if (creature.threat !== undefined && (!isFiniteNumber(creature.threat) || creature.threat < 0 || creature.threat > 1)) {
      ctx.errors.push(`creature ${creature.id}.threat: must be a finite number between 0 and 1`)
    }
  }
}

function validateSchemaIds(ctx, schemas = []) {
  const ids = new Set()
  for (const schema of schemas) {
    if (!isContentId(schema?.id)) continue
    if (ids.has(schema.id)) ctx.errors.push(`entity_schemas: duplicate id "${schema.id}"`)
    ids.add(schema.id)
  }
}

function validateCost(ctx, label, cost) {
  if (!cost) return
  if (!cost || typeof cost !== "object") {
    ctx.errors.push(`${label}: cost must be an object`)
    return
  }
  if (cost.kind === "upfront" || cost.kind === "drain_per_worker_second") {
    requireKnown(ctx, `${label}.resource_id`, cost.resource_id, ctx.resourceIds, "resource")
    validatePositiveNumber(ctx, `${label}.amount`, cost.amount)
  }
  if (cost.kind === "upfront_bundle") {
    if (!Array.isArray(cost.costs) || cost.costs.length === 0) {
      ctx.errors.push(`${label}.costs: upfront_bundle must contain at least one cost`)
    }
    for (const item of Array.isArray(cost.costs) ? cost.costs : []) {
      if (!item || typeof item !== "object") {
        ctx.errors.push(`${label}.costs: each cost must be an object`)
        continue
      }
      requireKnown(ctx, `${label}.costs.item_id`, item.item_id, ctx.itemOrResourceIds, "item/resource")
      validatePositiveNumber(ctx, `${label}.costs.${item.item_id}.amount`, item.amount)
    }
  } else if (cost.kind === "time_only") {
    return
  } else if (!["upfront", "drain_per_worker_second"].includes(cost.kind)) {
    ctx.errors.push(`${label}: unsupported cost kind "${cost.kind}"`)
  }
}

function validateRequirements(ctx, label, requirements = []) {
  if (!Array.isArray(requirements)) {
    ctx.errors.push(`${label}: requirements must be an array`)
    return
  }
  const flagSets = new Set()
  const flagUnsets = new Set()
  for (const requirement of requirements) {
    if (!requirement || typeof requirement !== "object") {
      ctx.errors.push(`${label}: requirement must be an object`)
      continue
    }
    if (requirement.kind === "flag_set" || requirement.kind === "flag_unset") {
      requireKnown(ctx, `${label}.${requirement.kind}`, requirement.flag_id, ctx.flagIds, "flag")
      const target = requirement.kind === "flag_set" ? flagSets : flagUnsets
      if (target.has(requirement.flag_id)) {
        ctx.errors.push(`${label}: duplicate ${requirement.kind} requirement for "${requirement.flag_id}"`)
      }
      target.add(requirement.flag_id)
    } else {
      ctx.errors.push(`${label}: unsupported requirement kind "${requirement.kind}"`)
    }
  }
  for (const flagId of flagSets) {
    if (flagUnsets.has(flagId)) {
      ctx.errors.push(`${label}: impossible action requires "${flagId}" to be both set and unset`)
    }
  }
}

function validateEffects(ctx, label, effects = []) {
  if (!Array.isArray(effects)) {
    ctx.errors.push(`${label}: effects must be an array`)
    return
  }
  for (const effect of effects) {
    if (!effect || typeof effect !== "object") {
      ctx.errors.push(`${label}: effect must be an object`)
      continue
    }

    switch (effect.kind) {
      case "set_flag":
        requireKnown(ctx, `${label}.set_flag`, effect.flag_id, ctx.flagIds, "flag")
        if (typeof effect.value !== "boolean") ctx.errors.push(`${label}.set_flag: value must be boolean`)
        break
      case "grant_resource":
      case "spend_resource":
        requireKnown(ctx, `${label}.${effect.kind}`, effect.resource_id, ctx.resourceIds, "resource")
        validatePositiveNumber(ctx, `${label}.${effect.kind}.amount`, effect.amount)
        break
      case "complete_beat":
        requireKnown(ctx, `${label}.complete_beat`, effect.beat_id, ctx.storyBeatIds, "story beat")
        break
      case "add_bunks":
      case "add_skins":
        if (!Number.isInteger(effect.amount) || effect.amount === 0) {
          ctx.errors.push(`${label}.${effect.kind}: amount must be a non-zero integer`)
        }
        break
      case "increment_crystal_track":
        if (!CRYSTAL_TRACKS.has(effect.track)) ctx.errors.push(`${label}.increment_crystal_track: unknown track "${effect.track}"`)
        if (!Number.isInteger(effect.amount) || effect.amount === 0) ctx.errors.push(`${label}.increment_crystal_track.amount: must be a non-zero integer`)
        break
      case "increment_processing_track":
        if (!PROCESSING_TRACKS.has(effect.track)) ctx.errors.push(`${label}.increment_processing_track: unknown track "${effect.track}"`)
        if (!Number.isInteger(effect.amount) || effect.amount === 0) ctx.errors.push(`${label}.increment_processing_track.amount: must be a non-zero integer`)
        break
      case "set_quality":
        if (typeof effect.key !== "string" || effect.key.trim() === "") ctx.errors.push(`${label}.set_quality.key: must be a non-empty string`)
        if (!Number.isInteger(effect.value)) ctx.errors.push(`${label}.set_quality.value: must be an integer`)
        break
      case "add_quality":
        if (typeof effect.key !== "string" || effect.key.trim() === "") ctx.errors.push(`${label}.add_quality.key: must be a non-empty string`)
        if (!Number.isInteger(effect.amount) || effect.amount === 0) ctx.errors.push(`${label}.add_quality.amount: must be a non-zero integer`)
        break
      case "note":
        if (typeof effect.text !== "string" || effect.text.trim() === "") ctx.errors.push(`${label}.note.text: must be a non-empty string`)
        break
      case "emit_act": {
        // The act and its target must exist, or the effect fires at runtime
        // into a log nobody can explain: `narr explain` would name an act that
        // is not in the catalog.
        if (typeof effect.act_id !== "string" || !ctx.ids.has(effect.act_id)) {
          ctx.errors.push(`${label}.emit_act.act_id: unknown act "${effect.act_id}"`)
        }
        if (effect.target !== undefined && !ctx.ids.has(effect.target)) {
          ctx.errors.push(`${label}.emit_act.target: unknown entity "${effect.target}"`)
        }
        break
      }
      default:
        ctx.errors.push(`${label}: unsupported effect kind "${effect.kind}"`)
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
    if (!condition || typeof condition !== "object") {
      ctx.errors.push(`${label}: visibility condition must be an object`)
      continue
    }
    if (condition.kind === "flag_set" || condition.kind === "flag_unset") {
      requireKnown(ctx, `${label}.${condition.kind}`, condition.flag_id, ctx.flagIds, "flag")
    }
    if (condition.kind === "resource_positive") {
      requireKnown(ctx, `${label}.resource_positive`, condition.resource_id, ctx.resourceIds, "resource")
    }
    if (condition.kind === "role_assigned" || condition.kind === "role_available") {
      requireKnown(ctx, `${label}.${condition.kind}`, condition.role_id, ctx.roleIds, "role")
    }
    if (!["always", "flag_set", "flag_unset", "resource_positive", "viral_load_positive", "hero_outside_bubble", "hero_forced_return", "hero_recovering", "echo_scars_positive", "role_assigned", "role_available", "recruitment_enabled", "recruitment_disabled", "pending_recruits", "recruited_any", "brownout_active"].includes(condition.kind)) {
      ctx.errors.push(`${label}: unsupported visibility condition kind "${condition.kind}"`)
    }
  }
}

function validateRelatedIds(ctx, label, ids = []) {
  if (ids === undefined || ids === null) return
  if (!Array.isArray(ids)) {
    ctx.errors.push(`${label}: related ids must be an array`)
    return
  }
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
  if (ids === undefined || ids === null) return
  if (!Array.isArray(ids)) {
    ctx.errors.push(`${label}: ids must be an array`)
    return
  }
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
