const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const {
  TransitionRegistry,
  ChangeTracker,
  smoothStep,
  linear,
  lerp,
  clamp01,
} = require("../dist/index.js")

// The mechanism must stay engine-neutral: no app, domain, or renderer terms.
const src = fs.readFileSync(path.resolve(__dirname, "../src/index.ts"), "utf8")
for (const forbidden of [
  "ADD",
  "dungeon",
  "door",
  "Phaser",
  "office",
  "hero",
  "fog",
  "studio",
  "hex",
  "square",
]) {
  assert.ok(
    !new RegExp(`\\b${forbidden}\\b`, "i").test(src),
    `game-animation must stay neutral; found "${forbidden}"`,
  )
}

assert.equal(clamp01(-1), 0)
assert.equal(clamp01(2), 1)
assert.equal(lerp(0, 10, 0.5), 5)
assert.equal(linear(0.25), 0.25)
assert.equal(smoothStep(0), 0)
assert.equal(smoothStep(1), 1)
assert.equal(smoothStep(0.5), 0.5)

const reg = new TransitionRegistry()
assert.equal(reg.value("a:rot", 0, 42), 42, "fallback when no transition")
reg.begin("a:rot", { from: 0, to: 100, durationMs: 100, startedAt: 1000, easing: linear })
assert.equal(reg.has("a:rot"), true)
assert.equal(reg.sample("a:rot", 1000).value, 0)
assert.equal(reg.sample("a:rot", 1050).value, 50)
const end = reg.sample("a:rot", 1100)
assert.equal(end.value, 100)
assert.equal(end.done, true)
assert.equal(reg.sample("a:rot", 5000).value, 100, "clamps past the end")

reg.prune(1100)
assert.equal(reg.has("a:rot"), false, "finished transitions are pruned")
assert.equal(reg.value("a:rot", 1100, 100), 100)

reg.begin("b", { from: 0, to: 1, durationMs: 0, startedAt: 0, easing: linear })
assert.equal(reg.sample("b", 0).value, 1, "zero-duration completes immediately")
assert.equal(reg.sample("b", 0).done, true)

// Restart mid-flight from the currently-sampled value (the door-reverse case).
reg.begin("c", { from: 0, to: 10, durationMs: 100, startedAt: 0, easing: linear })
const mid = reg.value("c", 50, 0)
assert.equal(mid, 5)
reg.begin("c", { from: mid, to: 0, durationMs: 100, startedAt: 50, easing: linear })
assert.equal(reg.value("c", 50, 0), 5)
assert.equal(reg.value("c", 100, 0), 2.5)

// Reduced motion (accessibility gate): transitions complete instantly.
const rm = new TransitionRegistry({ reducedMotion: true })
assert.equal(rm.reducedMotionEnabled, true)
rm.begin("m", { from: 0, to: 100, durationMs: 1000, startedAt: 0, easing: linear })
assert.equal(rm.sample("m", 0).value, 100, "reduced motion snaps to target at once")
assert.equal(rm.sample("m", 0).done, true)

// Toggling reduced motion on completes an in-flight transition immediately.
const rm2 = new TransitionRegistry()
rm2.begin("n", { from: 0, to: 100, durationMs: 1000, startedAt: 0, easing: linear })
assert.equal(rm2.sample("n", 0).value, 0, "normal mid-flight value")
rm2.setReducedMotion(true)
assert.equal(rm2.sample("n", 0).value, 100, "reduced motion completes it in place")

const tracker = new ChangeTracker()
assert.equal(tracker.changed("k", true), true, "a new key counts as changed")
assert.equal(tracker.set("k", true), undefined, "no previous value yet")
assert.equal(tracker.changed("k", true), false)
assert.equal(tracker.changed("k", false), true)
assert.equal(tracker.set("k", false), true, "returns the prior value")
assert.equal(tracker.get("k"), false)

console.log("game-animation: all assertions passed")
