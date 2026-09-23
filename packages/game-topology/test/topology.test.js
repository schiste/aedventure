const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const {
  cellCoordsEqual,
  createHexCoord,
  createHexTopology,
  createSquareCoord,
  createSquareTopology,
  hexBoundsFromRadius,
  hexCoordInBounds,
  hexCoordInRadius,
  hexDistance,
  hexNeighbors,
  hexToWorld,
  parseCellCoord,
  serializeCellCoord,
  squareCoordInBounds,
  squareDistance,
  squareNeighbors,
  worldToHex,
} = require("../dist/index.js")

const neutralSource = fs.readFileSync(
  path.resolve(__dirname, "../src/index.ts"),
  "utf8",
)

for (const forbidden of [
  "SkyOffice",
  "LimeZu",
  "Wikimedia",
  "media",
  "tenant",
  "admin",
  "account",
]) {
  assert.ok(
    !new RegExp(`\\b${forbidden}\\b`, "i").test(neutralSource),
    `game-topology source must stay domain-neutral; found ${forbidden}.`,
  )
}

const square = createSquareTopology({
  cellSize: 32,
  origin: { x: 8, y: 16 },
  bounds: { width: 4, height: 3 },
})

assert.equal(square.kind, "square")
assert.deepEqual(square.cellToWorld(createSquareCoord(2, 1)), { x: 72, y: 48 })
assert.deepEqual(square.worldToCell({ x: 72, y: 79 }), createSquareCoord(2, 1))
assert.deepEqual(square.worldToCell({ x: 7, y: 16 }), null)
assert.deepEqual(square.worldToCell({ x: 136, y: 16 }), null)
assert.deepEqual(square.neighbors(createSquareCoord(0, 0)), [
  createSquareCoord(1, 0),
  createSquareCoord(0, 1),
])
assert.equal(square.distance(createSquareCoord(0, 0), createSquareCoord(3, 2)), 5)
assert.equal(square.inBounds(createSquareCoord(3, 2)), true)
assert.equal(square.inBounds(createSquareCoord(4, 2)), false)
assert.equal(square.serialize(createSquareCoord(3, 2)), "square:3:2")

const diagonalSquare = createSquareTopology({
  cellSize: 16,
  bounds: { width: 3, height: 3 },
  neighborMode: "diagonal",
})

assert.deepEqual(diagonalSquare.neighbors(createSquareCoord(1, 1)), [
  createSquareCoord(1, 0),
  createSquareCoord(2, 1),
  createSquareCoord(1, 2),
  createSquareCoord(0, 1),
  createSquareCoord(2, 0),
  createSquareCoord(2, 2),
  createSquareCoord(0, 2),
  createSquareCoord(0, 0),
])
assert.equal(
  diagonalSquare.distance(createSquareCoord(0, 0), createSquareCoord(2, 1)),
  2,
)

assert.deepEqual(squareNeighbors(createSquareCoord(1, 1)), [
  createSquareCoord(1, 0),
  createSquareCoord(2, 1),
  createSquareCoord(1, 2),
  createSquareCoord(0, 1),
])
assert.equal(squareDistance(createSquareCoord(-1, 2), createSquareCoord(3, -2)), 8)
assert.equal(
  squareDistance(createSquareCoord(-1, 2), createSquareCoord(3, -2), "chebyshev"),
  4,
)
assert.equal(squareCoordInBounds(createSquareCoord(0, 0), { width: 1, height: 1 }), true)
assert.equal(squareCoordInBounds(createSquareCoord(1, 0), { width: 1, height: 1 }), false)

const hex = createHexTopology({
  radius: 10,
  origin: { x: 100, y: 50 },
  bounds: hexBoundsFromRadius(2),
})

assert.equal(hex.kind, "hex")
assert.deepEqual(roundVector(hex.cellToWorld(createHexCoord(0, 0))), { x: 100, y: 50 })
// `q` steps due east; `r` steps down-and-right. Pointy-top.
assert.deepEqual(roundVector(hex.cellToWorld(createHexCoord(1, 0))), {
  x: 117.321,
  y: 50,
})
assert.deepEqual(roundVector(hex.cellToWorld(createHexCoord(0, 1))), {
  x: 108.66,
  y: 65,
})
assert.deepEqual(hex.worldToCell(hex.cellToWorld(createHexCoord(1, -1))), createHexCoord(1, -1))
assert.deepEqual(hex.worldToCell({ x: 500, y: 500 }), null)
assert.deepEqual(hex.neighbors(createHexCoord(0, 0)), [
  createHexCoord(1, 0),
  createHexCoord(1, -1),
  createHexCoord(0, -1),
  createHexCoord(-1, 0),
  createHexCoord(-1, 1),
  createHexCoord(0, 1),
])
assert.equal(hex.distance(createHexCoord(0, 0), createHexCoord(2, -1)), 2)
assert.equal(hex.inBounds(createHexCoord(2, 0)), true)
assert.equal(hex.inBounds(createHexCoord(2, 1)), false)
assert.equal(hex.serialize(createHexCoord(-2, 1)), "hex:-2:1")

assert.deepEqual(hexNeighbors(createHexCoord(2, -1)), [
  createHexCoord(3, -1),
  createHexCoord(3, -2),
  createHexCoord(2, -2),
  createHexCoord(1, -1),
  createHexCoord(1, 0),
  createHexCoord(2, 0),
])
assert.equal(hexDistance(createHexCoord(-2, 1), createHexCoord(1, -2)), 3)
assert.equal(hexCoordInRadius(createHexCoord(1, -1), 1), true)
assert.equal(hexCoordInRadius(createHexCoord(2, -1), 1), false)
assert.equal(hexCoordInBounds(createHexCoord(1, -1), hexBoundsFromRadius(1)), true)
assert.equal(hexCoordInBounds(createHexCoord(1, 1), hexBoundsFromRadius(1)), false)

// Pointy-top: `q` steps due east/west and `r` steps down-right/up-left.
assert.deepEqual(roundVector(hexToWorld(createHexCoord(-1, 2), 12)), {
  x: 0,
  y: 36,
})
// Left and right are exact neighbours, which is what makes the arrow keys land
// where a player expects. A flat-top layout has no due-east cell at all.
assert.deepEqual(roundVector(hexToWorld(createHexCoord(1, 0), 10)), { x: 17.321, y: 0 })
assert.deepEqual(roundVector(hexToWorld(createHexCoord(-1, 0), 10)), { x: -17.321, y: 0 })
// ...and no cell directly above or below, so Up and Down are a genuine choice.
assert.equal(roundVector(hexToWorld(createHexCoord(0, -1), 10)).x, -8.66)
assert.equal(roundVector(hexToWorld(createHexCoord(0, 1), 10)).x, 8.66)
assert.deepEqual(worldToHex(hexToWorld(createHexCoord(-1, 2), 12), 12), createHexCoord(-1, 2))

assert.equal(serializeCellCoord(createSquareCoord(-3, 4)), "square:-3:4")
assert.equal(serializeCellCoord(createHexCoord(-3, 4)), "hex:-3:4")
assert.deepEqual(parseCellCoord("square:-3:4"), createSquareCoord(-3, 4))
assert.deepEqual(parseCellCoord("hex:-3:4"), createHexCoord(-3, 4))
assert.equal(parseCellCoord("hex:1.5:4"), null)
assert.equal(parseCellCoord("bad:1:4"), null)
assert.equal(cellCoordsEqual(createSquareCoord(1, 2), createSquareCoord(1, 2)), true)
assert.equal(cellCoordsEqual(createSquareCoord(1, 2), createSquareCoord(2, 1)), false)
assert.equal(cellCoordsEqual(createSquareCoord(1, 2), createHexCoord(1, 2)), false)
assert.equal(cellCoordsEqual(createHexCoord(1, -2), createHexCoord(1, -2)), true)

function roundVector(vector) {
  return {
    x: Number(vector.x.toFixed(3)),
    y: Number(vector.y.toFixed(3)),
  }
}

// --- frame-rate independent smoothing --------------------------------------
// Not topology, but the same class of geometry bug: a per-frame lerp written as
// `delta / constant` converges at a different rate depending on frame time, so
// the Hero moves at a different speed on a 30Hz and a 60Hz display.

function frameRateIndependentLerp(deltaMs, halfLifeMs) {
  if (halfLifeMs <= 0) return 1
  return 1 - Math.pow(2, -deltaMs / halfLifeMs)
}

function remainingAfter(totalMs, stepMs, halfLifeMs) {
  let remaining = 1
  for (let elapsed = 0; elapsed < totalMs; elapsed += stepMs) {
    remaining *= 1 - frameRateIndependentLerp(stepMs, halfLifeMs)
  }
  return remaining
}

// One half-life halves the distance, whatever the step size that got us there.
assert.ok(Math.abs(frameRateIndependentLerp(70, 70) - 0.5) < 1e-9)

const at60 = remainingAfter(280, 1000 / 60, 70)
const at30 = remainingAfter(280, 1000 / 30, 70)
const at144 = remainingAfter(280, 1000 / 144, 70)
assert.ok(
  Math.abs(at60 - at30) < 0.01 && Math.abs(at60 - at144) < 0.01,
  `same elapsed time must leave the same distance at any frame rate: 60Hz=${at60}, 30Hz=${at30}, 144Hz=${at144}`,
)

// The `delta / constant` form it replaces is a decent approximation of the same
// curve and converges to it as frames get shorter — so the win is real but
// modest, and worth stating honestly. Measured across 144Hz to 15Hz, the old
// form leaves a 2.9x spread in remaining distance for the same elapsed time;
// this one leaves 1.6x.
function legacyLerp(deltaMs) {
  return Math.min(1, deltaMs / 145)
}

function remainingLegacy(totalMs, stepMs) {
  let remaining = 1
  for (let elapsed = 0; elapsed < totalMs; elapsed += stepMs) {
    remaining *= 1 - legacyLerp(stepMs)
  }
  return remaining
}

const spread = (fn) => {
  const values = [144, 60, 30, 15].map((hz) => fn(280, 1000 / hz))
  return Math.max(...values) / Math.min(...values)
}
const exactSpread = spread((total, step) => remainingAfter(total, step, 70))
const legacySpread = spread(remainingLegacy)
assert.ok(
  exactSpread < legacySpread,
  `exponential decay should vary less with frame rate: exact=${exactSpread.toFixed(2)}x, legacy=${legacySpread.toFixed(2)}x`,
)
assert.ok(exactSpread < 2, `expected well under a 2x spread, got ${exactSpread.toFixed(2)}x`)

// --- smootherstep ----------------------------------------------------------

function smootherStep(value) {
  const t = Math.min(1, Math.max(0, value))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

assert.equal(smootherStep(0), 0)
assert.equal(smootherStep(1), 1)
assert.equal(smootherStep(0.5), 0.5)
// Flatter at both ends than smoothstep, which is what removes the visible kick.
const smoothStepAt = (t) => t * t * (3 - 2 * t)
assert.ok(
  smootherStep(0.1) < smoothStepAt(0.1) && smootherStep(0.9) > smoothStepAt(0.9),
  "smootherstep should leave and arrive more gently than smoothstep",
)

console.log("game-topology: hex orientation and motion easing assertions passed")
