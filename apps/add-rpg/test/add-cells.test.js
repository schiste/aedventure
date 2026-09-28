// Tests for the pure helpers lifted out of `main.ts`.
//
// They are here because the functions were not reachable from a test before:
// `main.ts` reads fifty-odd Solid signals and boots the whole app, so a unit
// test of `hexRouteDistance` would have meant booting a browser to check a
// subtraction. Plain node scripts with `node:assert`, matching the style of
// `packages/add-ui/test`.
const assert = require("node:assert")

const {
  parseAddDisplayCell,
  hexRouteDistance,
  directionBetweenAddCells,
  nextHexToward,
} = require("../dist/browser/add-cells.js")
const { slugForId, safeElementId } = require("../dist/browser/element-ids.js")

// --- parsing --------------------------------------------------------------

assert.deepEqual(parseAddDisplayCell("hex:6,0"), { kind: "hex", a: 6, b: 0 })
assert.deepEqual(parseAddDisplayCell("square:-1,3"), { kind: "square", a: -1, b: 3 })

// A loose parse would make these NaN, and NaN compares false against everything,
// so it would flow silently into a distance or a direction instead of failing.
for (const bad of [null, "", "hex:", "hex:abc", "hex:1", "hex:1,2,3", "1,2", "hexx:1,2"]) {
  assert.equal(
    parseAddDisplayCell(bad),
    null,
    `${JSON.stringify(bad)} must not parse rather than becoming NaN`,
  )
}

// --- distance -------------------------------------------------------------

assert.equal(hexRouteDistance({ a: 6, b: 0 }, { a: 6, b: 0 }), 0)
assert.equal(hexRouteDistance({ a: 6, b: 0 }, { a: 0, b: 3 }), 6)
assert.equal(hexRouteDistance({ a: 0, b: 3 }, { a: 6, b: 0 }), 6, "symmetric")
// The cube sum, which is why this is not a Manhattan distance.
assert.equal(hexRouteDistance({ a: 0, b: 0 }, { a: 1, b: -1 }), 1)

// --- direction ------------------------------------------------------------

// All six hex neighbours.
assert.equal(directionBetweenAddCells("hex:0,0", "hex:0,-1"), "north_west")
assert.equal(directionBetweenAddCells("hex:0,0", "hex:1,-1"), "north_east")
assert.equal(directionBetweenAddCells("hex:0,0", "hex:1,0"), "right")
assert.equal(directionBetweenAddCells("hex:0,0", "hex:0,1"), "south_east")
assert.equal(directionBetweenAddCells("hex:0,0", "hex:-1,1"), "south_west")
assert.equal(directionBetweenAddCells("hex:0,0", "hex:-1,0"), "left")

// A square grid has four, so the diagonals have no direction.
assert.equal(directionBetweenAddCells("square:0,0", "square:0,-1"), "up")
assert.equal(directionBetweenAddCells("square:0,0", "square:1,0"), "right")
assert.equal(directionBetweenAddCells("square:0,0", "square:0,1"), "down")
assert.equal(directionBetweenAddCells("square:0,0", "square:-1,0"), "left")
assert.equal(directionBetweenAddCells("square:0,0", "square:1,1"), null, "square has no diagonal")

// Not adjacent: the engine rejects multi-hex moves, so this must not supply one.
assert.equal(directionBetweenAddCells("hex:0,0", "hex:0,0"), null, "standing still")
assert.equal(directionBetweenAddCells("hex:0,0", "hex:0,2"), null, "two hexes away")
assert.equal(directionBetweenAddCells("hex:0,0", "square:1,0"), null, "mismatched kinds")
assert.equal(directionBetweenAddCells(null, "hex:1,0"), null)
assert.equal(directionBetweenAddCells("hex:0,0", "garbage"), null)

// --- next step ------------------------------------------------------------

// The Survivor Cave to the Studio walk: six steps, each adjacent, each strictly
// closer. This is the route the browser sends, and the reason the engine can now
// reject a multi-hex move without breaking the app.
{
  const from = { a: 6, b: 0 }
  const to = { a: 0, b: 3 }
  let current = from
  const visited = []
  for (let step = 0; step < 6; step += 1) {
    const next = nextHexToward(current, to)
    assert.ok(next, `step ${step} should have a next hex`)
    const distance = hexRouteDistance(next, to)
    assert.ok(
      distance < hexRouteDistance(current, to),
      `step ${step} must make progress: ${hexRouteDistance(current, to)} -> ${distance}`,
    )
    visited.push(`${next.a},${next.b}`)
    current = next
  }
  assert.deepEqual(current, to, `should arrive exactly; walked ${visited.join(" -> ")}`)
  assert.equal(new Set(visited).size, 6, "and should not revisit a hex")
}

console.log("add-rpg pure helpers: all assertions passed")
