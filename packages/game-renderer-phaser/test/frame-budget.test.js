const assert = require("node:assert")
// Require the module directly, not the package index (the barrel pulls in
// Phaser, which can't load under node).
const {
  evaluateFrameBudget,
  createFramePacer,
  SMOKE_FRAME_BUDGET,
} = require("../dist/renderer/frame-budget.js")

// --- evaluateFrameBudget (the perf-regression check) ---

// Frames within budget pass.
const good = evaluateFrameBudget([10, 12, 11, 13, 40], SMOKE_FRAME_BUDGET)
assert.equal(good.pass, true, "in-budget frames pass")
assert.equal(good.breaches.length, 0)

// A single big spike over the max budget fails.
const spike = evaluateFrameBudget([10, 10, 10, 300], SMOKE_FRAME_BUDGET)
assert.equal(spike.pass, false, "a 300ms spike breaches the max budget")
assert.ok(spike.breaches.some((b) => b.includes("max")), "max breach reported")

// p95 breach: 19 of 20 frames at 100ms.
const p95 = evaluateFrameBudget(
  Array.from({ length: 19 }, () => 100).concat([10]),
  { averageMs: 1000, p95Ms: 50, maxMs: 1000 },
)
assert.equal(p95.pass, false, "sustained high frames breach p95")
assert.ok(p95.breaches.some((b) => b.includes("p95")))

// Empty input passes (nothing measured).
assert.equal(evaluateFrameBudget([]).pass, true)

// --- createFramePacer (the frame-pacing option) ---

const pacer = createFramePacer(60) // ~16.67ms interval
assert.equal(pacer.shouldRender(0), true, "first frame always renders")
assert.equal(pacer.shouldRender(10), false, "10ms < interval, paced out")
assert.equal(pacer.shouldRender(20), true, "20ms >= interval, renders")

const off = createFramePacer(0) // disabled
assert.equal(off.shouldRender(0), true)
assert.equal(off.shouldRender(0.1), true, "pacing disabled renders every frame")

console.log("game-renderer-phaser frame-budget: all assertions passed")
