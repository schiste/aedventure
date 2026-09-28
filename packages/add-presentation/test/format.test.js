// One titleCase for the whole ADD surface.
//
// This function was previously reimplemented five times with three different
// rules, so the same content id rendered differently depending on which panel
// happened to draw it. The canonical definition is in
// `packages/add-presentation/src/format.ts`.
const assert = require("node:assert")

const { titleCase } = require("../dist/format.js")

// An id and its spaced form are the same name to a player.
assert.equal(titleCase("survivor_cave"), "Survivor Cave", "underscores are word breaks")
assert.equal(titleCase("survivor cave"), "Survivor Cave", "and so is whitespace")

// Every word is capitalised, not just the first.
assert.equal(titleCase("already Capitalised"), "Already Capitalised")

// Nothing in, nothing out.
assert.equal(titleCase(""), "")
assert.equal(titleCase(null), "", "a missing id is an empty label, not a crash")
assert.equal(titleCase(undefined), "", "a missing id is an empty label, not a crash")

// Hyphens are not separators: no authored ADD id uses one, and rewriting them
// would change labels other panels already show.
assert.equal(titleCase("a-b"), "A-b")

// Digits survive and stay attached to their word.
assert.equal(titleCase("tile 12"), "Tile 12")

// Runs of separators collapse instead of leaving a hole in the label.
assert.equal(titleCase("survivor__cave"), "Survivor Cave")
assert.equal(titleCase("  survivor   cave  "), "Survivor Cave")

// A single leading character still capitalises, which is what the old add-ui
// copy did for inputs with no separator.
assert.equal(titleCase("stone"), "Stone")
assert.equal(titleCase("Stone"), "Stone")

console.log("add-presentation format: all assertions passed")
