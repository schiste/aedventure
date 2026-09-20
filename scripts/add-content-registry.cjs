const path = require("node:path")

const ROOT = path.resolve(__dirname, "..")

/**
 * The registry is the inspection/tooling view of authored content. It does
 * not become a second runtime catalog: every entry is loaded from the
 * add-domain build output and carries its authored source and Rust consumer.
 */
const CATALOG_SPECS = [
  spec("resources", "resource", "content/resources.js", "RESOURCES", "packages/add-content/src/content/resources.ts", "crates/add-core/src/game_data/catalog/resources.rs"),
  spec("roles", "role", "content/roles.js", "ROLES", "packages/add-content/src/content/roles.ts", "crates/add-core/src/game_data/catalog/roles.rs"),
  spec("flags", "flag", "content/flags.js", "FLAGS", "packages/add-content/src/content/flags.ts", "crates/add-core/src/game_data/catalog/flags.rs"),
  spec("flora", "flora", "content/flora.js", "FLORA", "packages/add-content/src/content/flora.ts", "crates/add-core/src/game_data/catalog/tiles.rs"),
  spec("structures", "structure", "content/structures.js", "STRUCTURES", "packages/add-content/src/content/structures.ts", "crates/add-core/src/game_data/catalog/tiles.rs"),
  spec("tiles", "tile", "content/tiles.js", "TILES", "packages/add-content/src/content/tiles.ts", "crates/add-core/src/game_data/catalog/tiles.rs"),
  spec("stations", "station", "content/stations.js", "STATIONS", "packages/add-content/src/content/stations.ts", "crates/add-core/src/game_data/catalog/stations.rs"),
  spec("constructionOptions", "construction", "content/construction.js", "CONSTRUCTION_OPTIONS", "packages/add-content/src/content/construction.ts", "crates/add-core/src/game_data/catalog/actions.rs"),
  spec("worldActions", "world_action", "content/world-actions.js", "WORLD_ACTIONS", "packages/add-content/src/content/world-actions.ts", "crates/add-core/src/game_data/catalog/actions.rs"),
  spec("processingRecipes", "processing_recipe", "content/processing.js", "PROCESSING_RECIPES", "packages/add-content/src/content/processing.ts", "crates/add-core/src/game_data/catalog/actions.rs"),
  spec("storyBeats", "story_beat", "content/story.js", "STORY_BEATS", "packages/add-content/src/content/story/index.ts", "crates/add-core/src/game_data/catalog/story_beats.rs"),
  spec("objectives", "objective", "content/objectives.js", "OBJECTIVES", "packages/add-content/src/content/objectives.ts", "crates/add-core/src/game_data/catalog/objectives.rs"),
  spec("uiElements", "ui_element", "content/ui-elements.js", "UI_ELEMENTS", "packages/add-content/src/content/ui-elements.ts", "crates/add-core/src/game_data/catalog/ui_elements.rs"),
  spec("entitySchemas", "entity_schema", "content/entity-schemas.js", "ENTITY_SCHEMAS", "packages/add-content/src/content/entity-schemas.ts", "crates/add-core/src/game_data/catalog/entity_schemas.rs", { identity: false }),
  spec("items", "item", "content/items.js", "ITEMS", "packages/add-content/src/content/items.ts", "crates/add-core/src/game_data/catalog/items.rs"),
  spec("perks", "perk", "content/perks.js", "PERKS", "packages/add-content/src/content/perks.ts", "crates/add-core/src/game_data/catalog/perks.rs"),
  spec("narrativeEntities", "narrative_entity", "content/narrative-entities.js", "NARRATIVE_ENTITIES", "packages/add-content/src/content/narrative-entities.ts", "crates/add-core/src/game_data/catalog/narrative_entities.rs"),
  spec("narrativeActs", "narrative_act", "content/narrative-acts.js", "NARRATIVE_ACTS", "packages/add-content/src/content/narrative-acts.ts", "crates/add-core/src/game_data/catalog/narrative_acts.rs"),
  spec("creatures", "creature", "content/creatures.js", "CREATURES", "packages/add-content/src/content/creatures.ts", "crates/add-core/src/game_data/catalog/creatures.rs"),
  spec("encounterTables", "encounter", "content/encounter-tables.js", "ENCOUNTER_TABLES", "packages/add-content/src/content/encounter-tables.ts", null, { generated: false }),
  spec("lootTables", "loot_table", "content/loot-tables.js", "LOOT_TABLES", "packages/add-content/src/content/loot-tables.ts", null, { generated: false }),
  spec("dungeons", "dungeon", "dungeons/registry.js", "ADD_DUNGEON_REGISTRY", "packages/add-content/src/dungeons/registry.ts", null, { generated: false }),
  spec("areas", "area", "areas/registry.js", "ADD_AREA_REGISTRY", "packages/add-content/src/areas/registry.ts", null, { generated: false }),
]

function spec(key, family, distPath, exportName, sourcePath, rustPath, options = {}) {
  return {
    key,
    family,
    distPath,
    exportName,
    sourcePath,
    rustPath,
    generated: rustPath !== null && options.generated !== false,
    identity: options.identity !== false,
  }
}

function loadContent(root = ROOT) {
  const requireDist = (relativePath) => {
    try {
      return require(path.join(root, "packages/add-content/dist", relativePath))
    } catch (error) {
      if (error?.code === "MODULE_NOT_FOUND") {
        throw new Error(
          "ADD content dist files are missing. Run `npm --workspace @aedventure/add-content run build` first.",
        )
      }
      throw error
    }
  }

  const content = {}
  for (const entry of CATALOG_SPECS) {
    content[entry.key] = requireDist(entry.distPath)[entry.exportName]
  }
  content.version = requireDist("content/content-version.js").ADD_CONTENT_VERSION
  return content
}

function buildRegistry(content, root = ROOT) {
  const catalogs = CATALOG_SPECS.map((catalog) => ({
    ...catalog,
    entries: Array.isArray(content[catalog.key]) ? content[catalog.key] : [],
  }))
  const nodes = []

  for (const catalog of catalogs) {
    for (const [index, entry] of catalog.entries.entries()) {
      if (!entry || typeof entry.id !== "string" || entry.id.length === 0) continue
      nodes.push({
        key: `${catalog.family}:${entry.id}`,
        id: entry.id,
        family: catalog.family,
        sourcePath: catalog.sourcePath,
        rustPath: catalog.rustPath,
        generated: catalog.generated,
        identity: catalog.identity,
        catalogKey: catalog.key,
        index,
        entry,
      })

      if (catalog.key === "storyBeats") {
        for (const [choiceIndex, choice] of (entry.choices ?? []).entries()) {
          if (!choice || typeof choice.id !== "string" || choice.id.length === 0) continue
          nodes.push({
            key: `story_choice:${choice.id}`,
            id: choice.id,
            family: "story_choice",
            sourcePath: catalog.sourcePath,
            rustPath: catalog.rustPath,
            generated: catalog.generated,
            identity: true,
            catalogKey: catalog.key,
            index: choiceIndex,
            parentId: entry.id,
            entry: choice,
          })
        }
      }
    }
  }

  const nodesById = new Map()
  for (const node of nodes) {
    if (!nodesById.has(node.id)) nodesById.set(node.id, [])
    nodesById.get(node.id).push(node)
  }

  const primaryNodeById = new Map()
  for (const [id, matches] of nodesById.entries()) {
    primaryNodeById.set(
      id,
      [...matches].sort((left, right) => {
        return Number(right.identity) - Number(left.identity) || left.family.localeCompare(right.family)
      })[0],
    )
  }

  const knownIds = new Set([...nodesById.keys()])
  const edges = []
  for (const node of nodes) {
    const references = collectReferences(node.entry, knownIds, node.id)
    for (const reference of references) {
      const target = primaryNodeById.get(reference.id)
      if (!target) continue
      edges.push({
        from: node,
        to: target,
        path: reference.path,
      })
    }
  }

  edges.sort((left, right) =>
    `${left.from.key}:${left.to.key}:${left.path}`.localeCompare(
      `${right.from.key}:${right.to.key}:${right.path}`,
    ),
  )

  const reverse = new Map()
  for (const edge of edges) {
    if (!reverse.has(edge.to.id)) reverse.set(edge.to.id, [])
    reverse.get(edge.to.id).push(edge)
  }

  return {
    root,
    catalogs,
    nodes: nodes.sort((left, right) => left.key.localeCompare(right.key)),
    nodesById,
    primaryNodeById,
    knownIds,
    edges,
    reverse,
  }
}

function collectReferences(value, knownIds, ownerId, currentPath = "$", references = []) {
  if (typeof value === "string") {
    if (value !== ownerId && knownIds.has(value)) {
      references.push({ id: value, path: currentPath })
    }
    return references
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectReferences(item, knownIds, ownerId, `${currentPath}[${index}]`, references))
    return references
  }
  if (!value || typeof value !== "object") return references

  for (const [key, child] of Object.entries(value)) {
    if (currentPath === "$" && (key === "id" || key === "schemaId")) continue
    collectReferences(child, knownIds, ownerId, `${currentPath}.${key}`, references)
  }
  return references
}

function nodeSummary(node) {
  return {
    id: node.id,
    family: node.family,
    sourcePath: node.sourcePath,
    rustPath: node.rustPath,
    generated: node.generated,
    catalogKey: node.catalogKey,
    ...(node.parentId ? { parentId: node.parentId } : {}),
  }
}

function edgeSummary(edge) {
  return {
    from: nodeSummary(edge.from),
    to: nodeSummary(edge.to),
    path: edge.path,
  }
}

function catalogSummary(registry) {
  return registry.catalogs.map((catalog) => ({
    key: catalog.key,
    family: catalog.family,
    count: catalog.entries.length,
    sourcePath: catalog.sourcePath,
    rustPath: catalog.rustPath,
    generated: catalog.generated,
  }))
}

module.exports = {
  CATALOG_SPECS,
  ROOT,
  buildRegistry,
  catalogSummary,
  edgeSummary,
  loadContent,
  nodeSummary,
}
