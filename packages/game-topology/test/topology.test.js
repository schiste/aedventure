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
assert.deepEqual(roundVector(hex.cellToWorld(createHexCoord(1, 0))), {
  x: 115,
  y: 58.66,
})
assert.deepEqual(roundVector(hex.cellToWorld(createHexCoord(0, 1))), {
  x: 100,
  y: 67.321,
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

assert.deepEqual(roundVector(hexToWorld(createHexCoord(-1, 2), 12)), {
  x: -18,
  y: 31.177,
})
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
