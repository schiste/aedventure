const assert = require("node:assert")
const {
  addCommandForGameInteraction,
  addVisibilityAllowsDungeonLinks,
  addVisibilityAllowsDynamicDetails,
  addVisibilityAllowsVagueHints,
  addSnapshotToGameWorld,
  ADD_TRAVEL_GAME_MINUTES_PER_TILE,
  ADD_TRAVEL_RUNTIME_SECONDS_PER_TILE,
  createAddCatalogIndexes,
  createAddCellPresentationPolicy,
  createAddTopologyNavigationPolicy,
  createAddWorldInteractionPolicy,
  selectAddAvailableCommands,
  createAddAgentRuntimeReport,
  renderAddAgentRuntimeText,
  serializeAddAgentRuntimeReport,
  addCheckpointId,
  selectAddVisibilitySummary,
  selectAddDiscoverySummary,
  selectAddTile,
  selectPreferredTileAction,
  selectTileActionAffordances,
  selectAddFirstPlayableSummary,
  selectAddStoryProgressionState,
  selectAddUiState,
  selectAddWorldTimeForClockSeconds,
  tileInteractionDetailForCoord,
  addMapCoordKey,
  workerRequestForAddCommand,
} = require("../dist/index.js")
const { validateGameWorld } = require("../../game-world/dist/index.js")

const catalog = createCatalogFixture()
const snapshot = createSnapshotFixture()

const indexes = createAddCatalogIndexes(catalog)
assert.equal(indexes.tilesById.get("tile.base_core").label, "Base Core")
assert.equal(indexes.structuresById.get("structure.cave").kind, "cave")
assert.equal(selectAddTile(catalog, "tile.mountain_wall").isBlocker, true)

const world = addSnapshotToGameWorld(snapshot, catalog, {
  worldId: "test.add.world",
  mapId: "test.add.hex",
  hexRadius: 24,
})
const validation = validateGameWorld(world)
assert.equal(validation.valid, true, validation.errors.join("\n"))

assert.equal(world.id, "test.add.world")
assert.equal(world.activeMapId, "test.add.hex")
assert.equal(world.metadata.runtimeAuthority, "rust-wasm")

const map = world.maps[0]
assert.equal(map.topology.kind, "hex")
assert.equal(map.topology.radius, 24)
assert.deepEqual(map.topology.bounds, {
  qMin: -1,
  qMax: 2,
  rMin: -1,
  rMax: 1,
  radius: 2,
})

const terrain = map.layers.find((layer) => layer.id === "add.layer.terrain")
const collision = map.layers.find((layer) => layer.id === "add.layer.collision")
const bubble = map.layers.find((layer) => layer.id === "add.layer.bubble")
assert.equal(terrain.cells.length, snapshot.hexes.length)
const survivorCaveCell = terrain.cells.find((cell) => cell.tokenId === "tile.survivor_cave")
assert.equal(survivorCaveCell.visibility.state, "visible")
assert.equal(survivorCaveCell.metadata.dynamicDetailsHidden, false)
assert.equal(survivorCaveCell.metadata.dynamicDetails, "current")
assert.equal(survivorCaveCell.metadata.travelRisk, "safe_field")
assert.equal(survivorCaveCell.metadata.label, "Survivor Cave")
assert.equal(survivorCaveCell.links.length, 1)
assert.equal(survivorCaveCell.links[0].kind, "dungeon")
assert.equal(survivorCaveCell.links[0].targetMapId, "add.rpg.dungeon.survivor-cave")
assert.deepEqual(survivorCaveCell.links[0].targetCoord, {
  kind: "square",
  x: 2,
  y: 4,
})
assert.equal(survivorCaveCell.metadata.dungeonCount, 1)
const baseCell = terrain.cells.find((cell) => cell.tokenId === "tile.base_core")
assert.equal(baseCell.visibility.state, "discovered")
assert.equal(baseCell.metadata.dynamicDetails, "stale")
assert.equal(baseCell.metadata.travelRisk, "unknown")
assert.equal(baseCell.metadata.label, "Studio")
const hiddenDungeonCell = terrain.cells.find(
  (cell) => cell.coord.q === -1 && cell.coord.r === 0,
)
assert.equal(hiddenDungeonCell.visibility.state, "hidden")
assert.equal(hiddenDungeonCell.tokenId, "tile.unknown")
assert.equal(hiddenDungeonCell.links, undefined)
assert.equal(hiddenDungeonCell.metadata.tileId, "")
assert.equal(hiddenDungeonCell.metadata.label, "")
assert.equal(hiddenDungeonCell.metadata.terrain, "unknown")
assert.equal(hiddenDungeonCell.metadata.feature, "none")
assert.equal(hiddenDungeonCell.metadata.dungeonCount, 0)
assert.equal(hiddenDungeonCell.metadata.dynamicDetails, "hidden")
assert.equal(hiddenDungeonCell.metadata.dynamicRiskKnown, false)
assert.equal(hiddenDungeonCell.metadata.travelRisk, "unknown")
assert.equal(hiddenDungeonCell.metadata.vagueTravelLabel, "Unscouted region nearby")
assert.equal(hiddenDungeonCell.metadata.vagueHint, true)
const cellPresentationPolicy = createAddCellPresentationPolicy()
assert.equal(cellPresentationPolicy.cellVisible(hiddenDungeonCell), false)
assert.equal(cellPresentationPolicy.cellVisible(baseCell), true)
assert.equal(cellPresentationPolicy.cellStyle(baseCell).fill, 0xdedbbf)
assert.equal(cellPresentationPolicy.cellStyle(baseCell).activity, "inactive")
assert.equal(cellPresentationPolicy.cellStyle(survivorCaveCell).motif, "none")
assert.equal(cellPresentationPolicy.fogStyle(baseCell).visible, true)
const terrainByCoord = new Map(terrain.cells.map((cell) => [addMapCoordKey(cell.coord), cell]))
const baseTileDetail = tileInteractionDetailForCoord(baseCell.coord, terrainByCoord)
const remoteBaseDiscovery = selectAddDiscoverySummary({
  snapshot,
  catalog,
  heroCell: "hex:2,-1",
  selectedTile: baseTileDetail,
  previewTile: baseTileDetail,
  heroDungeonLinks: [],
  selectedDungeonLinks: [],
  travel: {
    active: false,
    phase: "idle",
    previewCell: null,
    destinationLabel: null,
    exposureRisk: null,
    previewAdjacent: false,
    gameMinutes: 60,
  },
  lastMovement: null,
})
assert.equal(remoteBaseDiscovery.tileDetail.links.find((link) => link.kind === "base").enabled, false)
assert.match(
  remoteBaseDiscovery.tileDetail.links.find((link) => link.kind === "base").blockedReason,
  /Reach The Studio/,
)
const arrivedBaseDiscovery = selectAddDiscoverySummary({
  snapshot,
  catalog,
  heroCell: "hex:0,0",
  selectedTile: baseTileDetail,
  previewTile: baseTileDetail,
  heroDungeonLinks: [],
  selectedDungeonLinks: [],
  travel: {
    active: false,
    phase: "idle",
    previewCell: null,
    destinationLabel: null,
    exposureRisk: null,
    previewAdjacent: false,
    gameMinutes: 60,
  },
  lastMovement: {
    fromCell: "hex:1,-1",
    toCell: "hex:0,0",
    destinationLabel: "The Studio",
    exposureRisk: "studio",
    gameMinutes: 60,
    discoveredBefore: 3,
    discoveredAfter: 5,
    toxicityBefore: 0.1,
    toxicityAfter: 0.1,
  },
})
assert.equal(arrivedBaseDiscovery.nextAction.kind, "open_base")
assert.equal(arrivedBaseDiscovery.nextAction.actionId, "base:open")
assert.equal(selectPreferredTileAction(remoteBaseDiscovery.tileDetail), null)
assert.deepEqual(
  selectTileActionAffordances(remoteBaseDiscovery.tileDetail).map((action) => ({
    kind: action.kind,
    enabled: action.enabled,
  })),
  [
    { kind: "base", enabled: false },
    { kind: "travel", enabled: false },
  ],
)
assert.equal(selectPreferredTileAction(arrivedBaseDiscovery.tileDetail)?.kind, "manage_base")
assert.deepEqual(
  selectTileActionAffordances(arrivedBaseDiscovery.tileDetail).map((action) => ({
    kind: action.kind,
    enabled: action.enabled,
  })),
  [{ kind: "base", enabled: true }],
)
const worldInteractionPolicy = createAddWorldInteractionPolicy()
const hiddenInteraction = worldInteractionPolicy.interactionForCell(
  hiddenDungeonCell.coord,
  hiddenDungeonCell,
)
assert.equal(hiddenInteraction.label, "Unknown region")
assert.equal(hiddenInteraction.metadata.dungeonLinkCount, 0)
const caveInteraction = worldInteractionPolicy.interactionForCell(
  survivorCaveCell.coord,
  survivorCaveCell,
)
assert.equal(caveInteraction.metadata.dungeonActionsVisible, true)
assert.equal(caveInteraction.metadata.dungeonLinkCount, 1)
const caveTileDetail = tileInteractionDetailForCoord(survivorCaveCell.coord, terrainByCoord)
const caveDiscovery = selectAddDiscoverySummary({
  snapshot,
  catalog,
  heroCell: "hex:2,-1",
  selectedTile: caveTileDetail,
  previewTile: caveTileDetail,
  heroDungeonLinks: caveTileDetail.dungeonLinks,
  selectedDungeonLinks: caveTileDetail.dungeonLinks,
  travel: {
    active: false,
    phase: "idle",
    previewCell: null,
    destinationLabel: null,
    exposureRisk: null,
    previewAdjacent: false,
    gameMinutes: 60,
  },
  lastMovement: null,
})
assert.equal(selectPreferredTileAction(caveDiscovery.tileDetail)?.kind, "enter_submap")
assert.deepEqual(
  selectTileActionAffordances(caveDiscovery.tileDetail).map((action) => ({
    kind: action.kind,
    actionLabel: action.actionLabel,
    enabled: action.enabled,
  })),
  [{ kind: "dungeon", actionLabel: "Enter", enabled: true }],
)
const navigationPolicy = createAddTopologyNavigationPolicy()
assert.deepEqual(
  navigationPolicy.nextCoord(survivorCaveCell.coord, { direction: "left" }, map.topology),
  { kind: "hex", q: 1, r: -1 },
)
assert.equal(navigationPolicy.canEnterCell(hiddenDungeonCell), true)
const visibilitySummary = selectAddVisibilitySummary(snapshot, catalog)
assert.equal(visibilitySummary.visibleCount, 3)
assert.equal(visibilitySummary.discoveredCount, 1)
assert.equal(visibilitySummary.hiddenCount, 2)
assert.equal(visibilitySummary.vagueHintCount, 2)
assert.equal(addVisibilityAllowsDungeonLinks({ state: "hidden" }), false)
assert.equal(addVisibilityAllowsDungeonLinks({ state: "discovered" }), true)
assert.equal(addVisibilityAllowsDynamicDetails({ state: "stale" }), false)
assert.equal(addVisibilityAllowsDynamicDetails({ state: "visible" }), true)
assert.equal(addVisibilityAllowsVagueHints({ state: "hidden" }), true)
assert.equal(collision.cells.length, 1)
assert.equal(collision.cells[0].coord.q, -1)
assert.equal(bubble.cells.length, 3)

const heroEntity = map.entities.find((entity) => entity.id === "add.entity.hero")
assert.equal(heroEntity?.coord.q, 2)
assert.equal(heroEntity?.coord.r, -1)
assert.ok(
  map.entities.some(
    (entity) =>
      entity.id === "add.entity.structure.structure.crystal_circle.0.0" &&
      entity.kind === "landmark",
  ),
)
assert.ok(
  map.entities.some(
    (entity) =>
      entity.id === "add.entity.structure.structure.cave.2.-1" &&
      entity.label === "Survivor Cave",
  ),
)
assert.ok(
  map.entities.some(
    (entity) => entity.id === "add.entity.flora.flora.reeds.1.-1",
  ),
)

const zonesById = new Map(map.zones.map((zone) => [zone.id, zone]))
assert.equal(zonesById.get("add.zone.base").cells.length, 1)
assert.equal(zonesById.get("add.zone.bubble.stabilized").cells.length, 2)
assert.equal(zonesById.get("add.zone.bubble.frontier").cells.length, 1)
assert.equal(zonesById.get("add.zone.survivor_cave").cells.length, 1)

const interactionsById = new Map(map.interactions.map((interaction) => [interaction.id, interaction]))
const explore = interactionsById.get(
  "add.interaction.world_action.world_action.explore_base",
)
assert.equal(explore.enabled, true)
assert.equal(explore.requiredZoneId, "add.zone.base")
assert.deepEqual(addCommandForGameInteraction(explore), {
  kind: "start_world_action",
  actionId: "world_action.explore_base",
})
assert.deepEqual(workerRequestForAddCommand(addCommandForGameInteraction(explore)), {
  type: "startWorldAction",
  actionId: "world_action.explore_base",
})

const storyChoice = interactionsById.get(
  "add.interaction.story_choice.story.beat.road_to_base.accept",
)
assert.deepEqual(workerRequestForAddCommand(addCommandForGameInteraction(storyChoice)), {
  type: "chooseStoryOption",
  beatId: "story.beat.road_to_base",
  optionId: "accept",
})

const assignHero = interactionsById.get("add.interaction.assign_hero")
assert.deepEqual(workerRequestForAddCommand(addCommandForGameInteraction(assignHero)), {
  type: "assignHero",
  assigned: true,
})

const recruit = interactionsById.get("add.interaction.recruit_survivor")
assert.equal(recruit.enabled, true)
assert.deepEqual(workerRequestForAddCommand(addCommandForGameInteraction(recruit)), {
  type: "recruitFromSurvivorCave",
})

const ui = selectAddUiState(snapshot, catalog)
assert.equal(ui.worldTime.day, 1)
assert.equal(ui.worldTime.referenceDate, "2025-03-20")
assert.equal(ui.worldTime.localTime, "07:12")
assert.equal(ui.worldTime.season, "spring")
assert.equal(ui.worldTime.daylightPhase, "day")
assert.equal(ui.worldTime.source, "estimated_solar_model")
assert.ok(ui.worldTime.sunriseMinute > 300)
assert.ok(ui.worldTime.sunsetMinute > ui.worldTime.sunriseMinute)
assert.equal(ADD_TRAVEL_GAME_MINUTES_PER_TILE, 60)
assert.equal(ADD_TRAVEL_RUNTIME_SECONDS_PER_TILE, 60)
assert.equal(
  selectAddWorldTimeForClockSeconds(snapshot.clockSeconds + ADD_TRAVEL_RUNTIME_SECONDS_PER_TILE)
    .localTime,
  "08:12",
)
assert.equal(ui.resources.find((resource) => resource.id === "resource.bassline").value, 12)
assert.equal(ui.resources.find((resource) => resource.id === "resource.bassline").cap, 100)
assert.equal(ui.objective.recruitmentEnabled, true)
assert.equal(ui.activeStoryBeat.id, "story.beat.road_to_base")
assert.equal(
  ui.availableWorldActions.find((action) => action.id === "world_action.explore_base").enabled,
  true,
)
assert.equal(
  ui.availableWorldActions.find((action) => action.id === "world_action.hero_only").enabled,
  false,
)
const firstPlayable = selectAddFirstPlayableSummary(snapshot, catalog)
assert.equal(firstPlayable.totalCount, 1)
assert.equal(firstPlayable.currentStepId, "reach-base")
assert.equal(firstPlayable.steps[0].action.type, "preview_route_to_base")
assert.equal(firstPlayable.steps[0].label, "Reach the Studio")
assert.deepEqual(ui.firstPlayable, firstPlayable)
const storyProgression = selectAddStoryProgressionState(snapshot, catalog)
assert.equal(storyProgression.activeBeat.id, "story.beat.road_to_base")
assert.equal(storyProgression.activeArc, "intro")
assert.deepEqual(
  storyProgression.currentBeats.map((beat) => beat.id),
  ["story.beat.road_to_base"],
)
assert.equal(storyProgression.currentChoiceState.awaitingChoice, true)
assert.equal(storyProgression.primaryAction.source, "first_playable")
assert.equal(storyProgression.primaryAction.action.type, "preview_route_to_base")
assert.deepEqual(storyProgression.firstPlayable, firstPlayable)
assert.equal(storyProgression.telemetrySummary.activeBeatId, "story.beat.road_to_base")
assert.equal(ui.storyProgression.telemetrySummary.primaryActionSource, "first_playable")

const availableCommands = selectAddAvailableCommands(snapshot, catalog)
assert.ok(availableCommands.commands.every((command) => command.workerRequest?.type))
assert.equal(availableCommands.telemetrySummary.total, availableCommands.commands.length)
assert.equal(availableCommands.enabledCommands.every((command) => command.enabled), true)
assert.equal(availableCommands.disabledCommands.every((command) => !command.enabled), true)
assert.ok(
  availableCommands.commands.some(
    (command) =>
      command.kind === "story_choice" &&
      command.workerRequest.type === "chooseStoryOption" &&
      command.related.beatId === "story.beat.road_to_base",
  ),
)

const agentRuntime = createAddAgentRuntimeReport({
  snapshot,
  catalog,
  availableCommands,
  ui,
  map: {
    mode: "overworld_hex",
    availableModes: ["overworld_hex", "base_square"],
    topology: "hex",
  },
  runtime: {
    ready: true,
    source: "rust-wasm",
    lastCommand: null,
    lastEvent: "ready",
    error: null,
  },
})
assert.equal(agentRuntime.contract, "agent_runtime_v1")
assert.equal(agentRuntime.schemaVersion, 1)
assert.equal(agentRuntime.runtime.ready, true)
assert.equal(agentRuntime.authoritative.entities.heroId, "entity:hero")
assert.ok(agentRuntime.authoritative.entities.crewRoleIds.includes("crew-role:role.crystal_bassline"))
assert.equal(agentRuntime.authoritative.currentTime.seconds, snapshot.clockSeconds)
assert.equal(agentRuntime.authoritative.map.heroCell, "2:-1")
assert.equal(agentRuntime.derived.map.mode, "overworld_hex")
assert.equal(agentRuntime.derived.availableCommands.length, availableCommands.commands.length)
assert.ok(agentRuntime.derived.blockers.some((blocker) => blocker.kind === "command_unavailable"))
assert.ok(agentRuntime.derived.availableCommands.every((command) => "whyUnavailable" in command))
assert.match(renderAddAgentRuntimeText(agentRuntime), /runtime ready source=rust-wasm/)
assert.equal(JSON.parse(serializeAddAgentRuntimeReport(agentRuntime)).contract, "agent_runtime_v1")
assert.equal(addCheckpointId("idle-base-first-cycle", 0, 0), "checkpoint:idle-base-first-cycle:1@0")
assert.ok(
  availableCommands.commands.some(
    (command) =>
      command.kind === "world_action" &&
      command.workerRequest.type === "startWorldAction" &&
      command.related.actionId === "world_action.explore_base",
  ),
)
const constructionCommand = availableCommands.commands.find(
  (command) => command.id === "construction:project.restore_studio",
)
assert.equal(constructionCommand.kind, "construction")
assert.equal(constructionCommand.enabled, false)
assert.equal(constructionCommand.workerRequest.type, "startConstruction")
assert.match(constructionCommand.disabledReason, /Stone/)
const exploreBaseCommand = availableCommands.commands.find(
  (command) => command.id === "world-action:world_action.explore_base",
)
const heroOnlyCommand = availableCommands.commands.find(
  (command) => command.id === "world-action:world_action.hero_only",
)
assert.equal(exploreBaseCommand.enabled, true)
assert.equal(heroOnlyCommand.enabled, false)
assert.equal(
  heroOnlyCommand.disabledReason,
  "Assign the Hero before starting this action.",
)
assert.ok(
  availableCommands.commands.some(
    (command) =>
      command.kind === "recruitment" &&
      command.workerRequest.type === "recruitFromSurvivorCave" &&
      command.related.resourceIds.includes("resource.vibes"),
  ),
)
assert.ok(
  availableCommands.commands.some(
    (command) =>
      command.kind === "wait" &&
      command.workerRequest.type === "tick" &&
      command.workerRequest.seconds === 60,
  ),
)
assert.ok(
  availableCommands.commands.some(
    (command) =>
      command.kind === "base_assignment" &&
      command.workerRequest.type === "assignHero",
  ),
)
assert.ok(
  availableCommands.commands.some(
    (command) =>
      command.kind === "base_assignment" &&
      command.workerRequest.type === "setRoleCrew" &&
      command.related.roleId === "role.crystal_bassline",
  ),
)

function createCatalogFixture() {
  return {
    resources: [
      resource("resource.bassline", "Bassline", "band", 100),
      resource("resource.chorus", "Chorus", "band", 50),
      resource("resource.harmonics", "Harmonics", "band", 30),
      resource("resource.stone", "Stone", "material", 10),
      resource("resource.water", "Water", "material", 20),
      resource("resource.vibes", "Vibes", "run_scoped_pool", 10),
    ],
    roles: [
      {
        id: "role.crystal_bassline",
        schemaId: "role.crystal_bassline",
        label: "Bassline",
        slotPool: "crystal_circle",
        heroAllowed: true,
        crewAllowed: true,
        maxCrewSlots: 2,
        uiSection: "crystal",
        uiOrder: 1,
      },
    ],
    stations: [],
    constructionOptions: [
      {
        id: "project.restore_studio",
        schemaId: "project.restore_studio",
        label: "Restore Studio",
        group: "base_project",
        cost: {
          kind: "upfront",
          resource_id: "resource.stone",
          amount: 3,
        },
        duration: {
          kind: "fixed",
          seconds: 30,
        },
        requirements: [],
        effects: [],
        uiOrder: 1,
      },
    ],
    processingRecipes: [],
    worldActions: [
      worldAction("world_action.explore_base", "Explore base", false),
      worldAction("world_action.hero_only", "Hero-only run", true),
    ],
    storyBeats: [
      {
        id: "story.beat.road_to_base",
        schemaId: "story.beat.road_to_base",
        label: "Road to Base",
        body: "Choose how to enter.",
        arc: "intro",
        sequence: 1,
        worldActionId: null,
        choices: [{ id: "accept", label: "Enter", response: "You step forward." }],
        relatedIds: [],
        progression: {
          track: "first_playable",
          stepId: "reach-base",
          presentation: {
            shortLabel: "Reach the Studio",
            playerHint: "Travel from the Survivor Cave to the Studio.",
            ctaCopy: "Preview route to Studio",
            primaryRiskCopy: null,
            displayPriority: 1000,
            reveal: "default",
          },
          primaryAction: { kind: "preview_route_to_base" },
          blockers: [],
          unlocks: [],
        },
      },
    ],
    flags: [],
    models: [],
    flora: [
      {
        id: "flora.reeds",
        schemaId: "flora.reeds",
        label: "Reeds",
        kind: "reeds",
        tags: ["harvestable"],
      },
    ],
    structures: [
      {
        id: "structure.crystal_circle",
        schemaId: "structure.crystal_circle",
        label: "Crystal Circle",
        kind: "crystal_circle",
        tags: ["base"],
      },
      {
        id: "structure.cave",
        schemaId: "structure.cave",
        label: "Survivor Cave",
        kind: "cave",
        tags: ["landmark", "recruitment_source"],
      },
    ],
    tiles: [
      tile("tile.base_core", "Base Core", "plains", "base", false, [], [
        "structure.crystal_circle",
      ]),
      tile("tile.river_shallows", "River Shallows", "river", "none", false, [
        "flora.reeds",
      ]),
      tile("tile.mountain_wall", "Mountain Wall", "mountain", "none", true),
      tile(
        "tile.forgotten_gate",
        "Forgotten Gate",
        "ridge",
        "none",
        false,
        [],
        [],
        ["dungeon.forgotten_gate"],
      ),
      tile(
        "tile.survivor_cave",
        "Survivor Cave",
        "plains",
        "survivor_cave",
        false,
        [],
        ["structure.cave"],
        ["dungeon.survivor_cave"],
      ),
      tile("tile.plains_open", "Open Plains", "plains", "none", false),
    ],
    entitySchemas: [],
    uiElements: [],
    balance: {},
  }
}

function createSnapshotFixture() {
  return {
    schemaVersion: 1,
    clockSeconds: 42,
    resources: {
      bassline: 12,
      basslineCap: 100,
      chorus: 4,
      chorusCap: 50,
      harmonics: 2,
      harmonicsCap: 30,
      stone: 0,
      stoneCap: 10,
      baseStoneStock: 0,
      water: 6,
      waterCap: 20,
      baseWaterStock: 2,
      vibes: 1,
      vibesCap: 10,
      lifetimeGenerated: 20,
      lifetimeSpent: 8,
    },
    roster: {
      heroAssigned: false,
      heroRoleId: "role.crystal_bassline",
      totalCrew: 0,
      crewByRole: {},
    },
    heroProgress: {},
    heroSurvival: {
      sustain: 1,
      viralLoadRatio: 0.1,
      location: "studio",
    },
    narrative: {
      activeBeatId: "story.beat.road_to_base",
      completedBeatIds: [],
      choiceByBeat: {},
    },
    crystalCircle: {},
    processing: {},
    base: {},
    power: {},
    stations: {},
    recruitment: {},
    bubble: {
      stabilizedHexes: 2,
      reachFromBase: 0,
      fieldBudget: 0,
      stabilizedRing: 0,
      frontierProgress: 0,
      targetRing: 0,
    },
    objectives: {
      reachObjectiveTarget: 2,
      reachObjectiveMet: true,
      survivorCaveDistance: 2,
      recruitmentRangeTiles: 2,
      recruitmentEnabled: true,
      survivorCaveInBubble: true,
    },
    discoveredCells: [
      { q: 0, r: 0 },
      { q: 1, r: -1 },
      { q: 2, r: -1 },
    ],
    heroMap: { q: 2, r: -1 },
    hexes: [
      hex(0, 0, 0, "tile.base_core", "stabilized", 1),
      hex(1, -1, 1, "tile.river_shallows", "converting", 0.4),
      hex(-1, 1, 1, "tile.mountain_wall", "blocked", 0),
      hex(2, -1, 2, "tile.survivor_cave", "stabilized", 1),
      hex(1, 0, 1, "tile.plains_open", "inactive", 0),
      hex(-1, 0, 1, "tile.forgotten_gate", "inactive", 0),
    ],
    activeConstruction: null,
    activeWorldAction: null,
    notes: ["Fixture snapshot"],
  }
}

function resource(id, label, category, baseCap) {
  return {
    id,
    schemaId: id,
    label,
    category,
    baseCap,
    capBehavior: "overflow_lost",
    startsAt: 0,
  }
}

function worldAction(id, label, heroOnly) {
  return {
    id,
    schemaId: id,
    label,
    durationSeconds: 15,
    heroOnly,
    offlineProgress: true,
    heroExposure: "studio",
    returnToBubbleSeconds: 0,
    returnToStudioSeconds: 0,
    requirements: [],
    effects: [],
    uiOrder: 1,
  }
}

function tile(
  id,
  label,
  terrain,
  feature,
  isBlocker,
  floraIds = [],
  structureIds = [],
  dungeonIds = [],
) {
  return {
    id,
    schemaId: id,
    label,
    terrain,
    feature,
    impedance: isBlocker ? 99 : 1,
    isBlocker,
    tags: isBlocker ? ["blocker"] : ["open_ground"],
    floraIds,
    structureIds,
    dungeonIds,
    buildingCapacity: isBlocker ? 0 : 1,
  }
}

function hex(q, r, distance, tileId, state, progress) {
  return {
    q,
    r,
    distance,
    tileId,
    state,
    progress,
  }
}
