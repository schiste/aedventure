// The formatters, which used to be untestable because they lived inside the
// app's render file.
const assert = require("node:assert")

const {
  firstSentence,
  formatEconomyDuration,
  formatResource,
  formatResourceTime,
  formatSignedNumber,
  formatSignedResource,
  leadUiCopy,
  normalizeUiCopy,
  shouldRevealCopyDetail,
  signedRateCopy,
  titleCase,
} = require("../dist/format.js")

// --- numbers ---------------------------------------------------------------

assert.equal(formatResource(12), "12", "whole numbers stay whole")
assert.equal(formatResource(12.34), "12.3")
assert.equal(formatResource(0), "0")

assert.equal(formatSignedResource(3), "+3")
assert.equal(formatSignedResource(-3), "-3")
assert.equal(formatSignedResource(0), "+0", "zero reads as a non-loss")

assert.equal(formatSignedNumber(0), "0", "signed *numbers* show bare zero, unlike resources")
assert.equal(formatSignedNumber(5), "+5")
assert.equal(formatSignedNumber(-5), "-5")

// A rate too small to act on is named, not rounded to a misleading "0.0/s".
assert.equal(signedRateCopy(0), "steady")
assert.equal(signedRateCopy(0.0009), "steady")
assert.equal(signedRateCopy(0.002), "+0.0/s")
assert.equal(signedRateCopy(-1.5), "-1.5/s")

// --- durations -------------------------------------------------------------

assert.equal(formatEconomyDuration(0), "now")
assert.equal(formatEconomyDuration(-5), "now")
assert.equal(formatEconomyDuration(Number.POSITIVE_INFINITY), "blocked")
assert.equal(formatEconomyDuration(Number.NaN), "blocked")
assert.equal(formatEconomyDuration(1.2), "2s", "rounds up: a player told 1s should not still be waiting")
assert.equal(formatEconomyDuration(59), "59s")
assert.equal(formatEconomyDuration(60), "1m")
assert.equal(formatEconomyDuration(3600), "1h")
assert.equal(formatEconomyDuration(3660), "1h 1m")
assert.equal(formatEconomyDuration(7200), "2h", "a round number of hours drops the minutes")

assert.equal(formatResourceTime(null), "stable", "null is nothing moving, not zero time")
assert.equal(formatResourceTime(90), "2m")

// --- copy ------------------------------------------------------------------

assert.equal(titleCase(""), "")
assert.equal(titleCase("stone"), "Stone")
assert.equal(titleCase("Stone"), "Stone")

assert.equal(normalizeUiCopy(null), "")
assert.equal(normalizeUiCopy("  a   b \n c "), "a b c")

assert.equal(firstSentence("One. Two."), "One.")
assert.equal(firstSentence("No terminator here"), "No terminator here")

assert.equal(leadUiCopy("short"), "short", "copy that fits is left alone")

// Prefers a whole sentence over a mid-phrase cut.
const twoSentences = "The field is holding for now. Everything past it is static and worse."
assert.equal(leadUiCopy(twoSentences, 40), "The field is holding for now.")

// Falls back to a clause boundary when no sentence fits.
assert.equal(
  leadUiCopy("the loudspeakers are ready; the crew is not", 40),
  "the loudspeakers are ready",
)

// Last resort: cut on a word boundary and mark the elision.
const long = leadUiCopy("a".repeat(30) + " " + "b".repeat(60), 40)
assert.ok(long.endsWith("..."), `expected an elision, got ${long}`)
assert.ok(long.length <= 40, `expected at most 40 characters, got ${long.length}`)

// A first sentence too short to be informative is not preferred.
const curt = leadUiCopy("Go. " + "then a much longer clause that will not fit at all".repeat(2), 40)
assert.notEqual(curt, "Go.", "an 18-character floor keeps useless fragments out")

assert.equal(shouldRevealCopyDetail("the same", "the same"), false)
assert.equal(shouldRevealCopyDetail("a much longer string than the visible one", "short"), true)
assert.equal(
  shouldRevealCopyDetail("short plus", "short"),
  false,
  "a few more characters is not worth a disclosure control",
)

console.log("add-ui format: all assertions passed")
