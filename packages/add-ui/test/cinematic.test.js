// The cinematic selector: everything the stage draws is decided here, and every
// way a save can disagree with the catalog has to end as "nothing is playing".
// A modal the player cannot dismiss is the worst outcome this system has.
const assert = require("node:assert")

const { cinematicPlaybackView } = require("../dist/cinematic-playback.js")

const beat = (id) => ({ id, media: "text", assetId: "", copy: id })
const def = {
  id: "cinematic.test",
  label: "Test moment",
  skippable: true,
  beats: [beat("one"), beat("two"), beat("three")],
}

// --- nothing playing -------------------------------------------------------

assert.strictEqual(cinematicPlaybackView(def, null).beat, null, "no playback, no stage")
assert.equal(cinematicPlaybackView(null, null).progress, 0)

// --- the save outlived its content -----------------------------------------

assert.strictEqual(
  cinematicPlaybackView(null, { cinematicId: "cinematic.removed", beatIndex: 0 }).beat,
  null,
  "a cinematic the catalog no longer has must not hold the player behind a modal",
)
assert.strictEqual(
  cinematicPlaybackView(def, { cinematicId: "cinematic.other", beatIndex: 0 }).beat,
  null,
  "the definition looked up has to be the one actually playing",
)
assert.strictEqual(
  cinematicPlaybackView(def, { cinematicId: def.id, beatIndex: 7 }).beat,
  null,
  "a beat index past the end of a shortened cinematic draws nothing",
)
assert.strictEqual(
  cinematicPlaybackView({ ...def, beats: [] }, { cinematicId: def.id, beatIndex: 0 }).beat,
  null,
  "an empty cinematic has no beat and must not divide by zero",
)
assert.equal(
  cinematicPlaybackView({ ...def, beats: [] }, { cinematicId: def.id, beatIndex: 0 }).progress,
  0,
)

// --- playing ---------------------------------------------------------------

const first = cinematicPlaybackView(def, { cinematicId: def.id, beatIndex: 0 })
assert.equal(first.beat.id, "one")
assert.equal(first.label, "Test moment")
assert.equal(first.beatNumber, 1)
assert.equal(first.beatCount, 3)
assert.ok(
  Math.abs(first.progress - 1 / 3) < 1e-9,
  "the counter is one-based, so the first of three is a third of the way",
)
assert.equal(first.skippable, true)

const last = cinematicPlaybackView(def, { cinematicId: def.id, beatIndex: 2 })
assert.equal(last.beat.id, "three")
assert.equal(last.progress, 1, "the last beat reads as finished, not as two thirds")
assert.equal(last.beatNumber, 3)

// --- skippability passes through -------------------------------------------

assert.equal(
  cinematicPlaybackView({ ...def, skippable: false }, { cinematicId: def.id, beatIndex: 0 })
    .skippable,
  false,
  "an unskippable cinematic has to say so, or the stage offers a button that does nothing",
)

console.log("add-ui cinematic: selector assertions passed")
