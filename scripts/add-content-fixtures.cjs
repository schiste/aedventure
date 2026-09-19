#!/usr/bin/env node

const fs = require("node:fs")
const path = require("node:path")
const { validateAddContent } = require("./add-content-validator.cjs")
const { analyzeStoryGraph, loadContent } = require("./add-content-tools.cjs")

const ROOT = path.resolve(__dirname, "..")
const FIXTURE_DIR = path.join(ROOT, "scenarios/add/fixtures/content")
const FIXTURES = {
  "small-base": "small-base.json",
  "crew-roster": "crew-roster.json",
  map: "map.json",
  "story-state": "story-state.json",
}

function fixtureVersion(content) {
  return {
    fixtureSchemaVersion: 1,
    contentSchemaVersion: content.version.contentSchemaVersion,
    catalogVersion: content.version.catalogVersion,
    saveSchemaVersion: content.version.saveSchemaVersion,
  }
}

function makeFixtures(content) {
  const baseFlags = content.flags.filter((flag) => flag.group === "base").map((flag) => flag.id).sort()
  const baseProjects = content.constructionOptions
    .filter((option) => option.group === "base_project")
    .map((option) => option.id)
    .sort()
  const roleIds = content.roles.map((role) => role.id).sort()
  const graph = analyzeStoryGraph(content.storyBeats)
  const entryBeatId = graph.entryRoots[0] ?? content.storyBeats[0]?.id ?? null

  return {
    "small-base": {
      ...fixtureVersion(content),
      kind: "small_base",
      ids: {
        resources: content.resources.map((resource) => resource.id).sort(),
        stations: content.stations.map((station) => station.id).sort(),
        baseProjects,
        tiles: content.tiles.filter((tile) => tile.feature === "base").map((tile) => tile.id).sort(),
        structures: content.structures.filter((structure) => structure.tags.includes("base")).map((structure) => structure.id).sort(),
      },
      state: {
        flags: baseFlags,
        resources: Object.fromEntries(content.resources.map((resource) => [resource.id, { value: resource.startsAt, cap: resource.baseCap }])),
        stations: content.stations.map((station) => ({ id: station.id, requested: station.startsRequested, requirements: station.requirements })),
        activeConstruction: null,
      },
    },
    "crew-roster": {
      ...fixtureVersion(content),
      kind: "crew_roster",
      roster: {
        heroAssigned: true,
        heroRoleId: "role.crystal_bassline",
        totalCrew: 2,
        crewByRole: Object.fromEntries(roleIds.map((roleId) => [roleId, 0])),
      },
      roles: content.roles.map((role) => ({
        id: role.id,
        slotPool: role.slotPool,
        heroAllowed: role.heroAllowed,
        crewAllowed: role.crewAllowed,
        maxCrewSlots: role.maxCrewSlots,
      })),
    },
    map: {
      ...fixtureVersion(content),
      kind: "map",
      mapId: "add.rpg.hex-overworld",
      tiles: content.tiles.map((tile, index) => ({
        id: tile.id,
        coordinate: { q: index - Math.floor(content.tiles.length / 2), r: 0 },
        terrain: tile.terrain,
        feature: tile.feature,
        isBlocker: tile.isBlocker,
        floraIds: tile.floraIds,
        structureIds: tile.structureIds,
        dungeonIds: tile.dungeonIds,
        areaIds: tile.areaIds,
      })),
      landmarks: [
        ...content.dungeons.map((dungeon) => ({ id: dungeon.id, mapId: dungeon.mapId, kind: "dungeon" })),
        ...content.areas.map((area) => ({ id: area.id, mapId: area.mapId, kind: "area" })),
      ].sort((left, right) => left.id.localeCompare(right.id)),
    },
    "story-state": {
      ...fixtureVersion(content),
      kind: "story_state",
      entryBeatId,
      activeBeatId: entryBeatId,
      completedBeatIds: [],
      choiceByBeat: {},
      reachableBeatIds: [...graph.reachable].sort(),
      unreachableBeatIds: graph.unreachable,
      beats: content.storyBeats
        .map((beat) => ({ id: beat.id, arc: beat.arc, sequence: beat.sequence, relatedIds: beat.relatedIds }))
        .sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id)),
    },
  }
}

function expectedFiles(content, selected = Object.keys(FIXTURES)) {
  const fixtures = makeFixtures(content)
  return selected.map((name) => ({
    name,
    path: path.join(FIXTURE_DIR, FIXTURES[name]),
    text: `${JSON.stringify(fixtures[name], null, 2)}\n`,
  }))
}

function parseArgs(argv) {
  const selected = []
  let mode = "check"
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--write") mode = "write"
    else if (arg === "--check") mode = "check"
    else if (arg === "--fixture") {
      const name = argv[++index]
      if (!FIXTURES[name]) throw new Error(`Unknown content fixture "${name}".`)
      selected.push(name)
    } else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/add-content-fixtures.cjs [--write|--check] [--fixture <name>]")
      process.exit(0)
    } else {
      throw new Error(`Unknown option "${arg}".`)
    }
  }
  return { mode, selected: selected.length > 0 ? selected : Object.keys(FIXTURES) }
}

function main(argv) {
  const options = parseArgs(argv)
  const content = loadContent()
  validateAddContent(content)
  for (const fixture of expectedFiles(content, options.selected)) {
    if (options.mode === "write") {
      fs.mkdirSync(path.dirname(fixture.path), { recursive: true })
      fs.writeFileSync(fixture.path, fixture.text)
      console.log(`[content:fixtures] wrote ${path.relative(ROOT, fixture.path)}`)
      continue
    }
    const current = fs.existsSync(fixture.path) ? fs.readFileSync(fixture.path, "utf8") : null
    if (current !== fixture.text) {
      throw new Error(`[content:fixtures] DRIFT: ${path.relative(ROOT, fixture.path)} is stale; run \`npm run content:fixtures\`.`)
    }
    console.log(`[content:fixtures] up to date: ${path.relative(ROOT, fixture.path)}`)
  }
}

try {
  main(process.argv.slice(2))
} catch (error) {
  console.error(error?.message ?? error)
  process.exit(1)
}

module.exports = { makeFixtures }
