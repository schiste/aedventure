const assert = require("node:assert")
const { validateAddContent } = require("./add-content-validator.cjs")

function minimalContent(overrides = {}) {
  return {
    resources: [],
    roles: [],
    flags: [],
    flora: [],
    structures: [],
    tiles: [],
    stations: [],
    constructionOptions: [],
    worldActions: [],
    processingRecipes: [],
    storyBeats: [
      {
        id: "story.beat.root",
        label: "Root",
        body: "Root beat.",
        arc: "test",
        sequence: 0,
        worldActionId: null,
        choices: [],
        relatedIds: [],
        progression: null,
        preconditions: [],
        autoCompleteWhen: [],
        priority: 0,
        repeatable: false,
        onComplete: [],
        onActivate: [],
      },
    ],
    uiElements: [],
    entitySchemas: [],
    items: [],
    perks: [],
    creatures: [],
    objectives: [],
    encounterTables: [],
    lootTables: [],
    dungeons: [],
    areas: [],
    ...overrides,
  }
}

function withRootBeat(patch) {
  return minimalContent({
    storyBeats: [
      {
        ...minimalContent().storyBeats[0],
        ...patch,
      },
    ],
  })
}

assert.throws(
  () =>
    validateAddContent(
      withRootBeat({
        preconditions: [{ kind: "unsupported_condition" }],
      }),
    ),
  /unsupported condition kind "unsupported_condition"/,
)

assert.throws(
  () =>
    validateAddContent(
      withRootBeat({
        onActivate: [{ kind: "unsupported_effect" }],
      }),
    ),
  /unsupported effect kind "unsupported_effect"/,
)

assert.throws(
  () =>
    validateAddContent(
      withRootBeat({
        blocksUnrelatedWorldActions: "yes",
      }),
    ),
  /blocksUnrelatedWorldActions: must be a boolean/,
)

assert.throws(
  () =>
    validateAddContent(
      minimalContent({
        resources: [{ id: "resource.duplicate" }, { id: "resource.duplicate" }],
      }),
    ),
  /resources: duplicate id "resource\.duplicate"/,
)

assert.throws(
  () =>
    validateAddContent(
      minimalContent({
        resources: [{ id: "shared.id" }],
        roles: [{ id: "shared.id" }],
      }),
    ),
  /global ids: duplicate id "shared\.id"/,
)

assert.throws(
  () =>
    validateAddContent(
      minimalContent({
        storyBeats: [
          minimalContent().storyBeats[0],
          {
            ...minimalContent().storyBeats[0],
            id: "story.beat.orphan",
            label: "Orphan",
            sequence: 2,
            choices: [],
          },
        ],
      }),
    ),
  /story story\.beat\.orphan: unreachable from a declared entry beat/,
)

assert.throws(
  () =>
    validateAddContent(
      minimalContent({
        objectives: [
          {
            id: "objective.bad",
            label: "Bad",
            description: "Bad",
            sequence: 1,
            conditions: [{ kind: "resource_at_least", resource_id: "resource.missing", amount: 1 }],
            rewards: [],
          },
        ],
      }),
    ),
  /objective objective\.bad\.conditions\.resource_at_least: unknown resource "resource\.missing"/,
)

assert.throws(
  () =>
    validateAddContent(
      minimalContent({
        constructionOptions: [
          {
            id: "construction.impossible",
            cost: { kind: "time_only" },
            duration: { kind: "fixed", seconds: 1 },
            requirements: [
              { kind: "flag_set", flag_id: "flag.missing" },
              { kind: "flag_unset", flag_id: "flag.missing" },
            ],
            effects: [{ kind: "note", text: "nope" }],
          },
        ],
      }),
    ),
  /impossible action requires "flag\.missing" to be both set and unset/,
)

assert.throws(
  () =>
    validateAddContent(
      minimalContent({
        encounterTables: [{ id: "encounter.bad", entries: [{ creatureId: "creature.missing", weight: 1 }] }],
      }),
    ),
  /encounter encounter\.bad\.entries\[0\]\.creatureId: unknown creature "creature\.missing"/,
)

assert.throws(
  () =>
    validateAddContent(
      minimalContent({
        constructionOptions: [
          {
            id: "construction.bad_duration",
            cost: { kind: "time_only" },
            duration: { kind: "crystal_level_scaled", track: "resonance_calibration", base_seconds: 1, per_level_seconds: 1 },
            requirements: [],
            effects: [{ kind: "note", text: "nope" }],
          },
        ],
      }),
    ),
  /unknown crystal track "resonance_calibration"/,
)

assert.throws(
  () =>
    validateAddContent(
      minimalContent({
        dungeons: [
          { id: "dungeon.duplicate", mapId: "map.one" },
          { id: "dungeon.duplicate", mapId: "map.two" },
        ],
      }),
    ),
  /dungeons: duplicate id "dungeon\.duplicate"/,
)

assert.throws(
  () =>
    validateAddContent(
      minimalContent({
        perks: [{ id: "perk.bad", effects: [{ stat: "unknown", multiplier: 0 }] }],
      }),
    ),
  /unsupported perk stat "unknown".*must be a positive finite number/s,
)

assert.throws(
  () =>
    validateAddContent(
      minimalContent({
        creatures: [{ id: "creature.bad", hp: 1, attack: 1, threat: 2, xpReward: 1 }],
      }),
    ),
  /creature creature\.bad\.threat: must be a finite number between 0 and 1/,
)

console.log("ADD content validator tests passed.")
