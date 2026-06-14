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

console.log("ADD content validator tests passed.")
