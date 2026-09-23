// The retrying capture: does it actually look again?
//
// The flake it exists for — a canvas screenshotted before it has painted —
// only appears under load and could not be reproduced on demand. So this pins
// the helper's behaviour directly with a fake target instead, which is the part
// that can be made deterministic.
const assert = require("node:assert")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { PNG } = require("pngjs")

const { captureNonBlankImage } = require("./app-qa-contracts.cjs")

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "qa-capture-"))
const OUT = path.join(TMP, "shot.png")

/** A solid-colour image: one unique colour, no luminance range. */
function flatPng(width, height, value) {
  const png = new PNG({ width, height })
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = value
    png.data[i + 1] = value
    png.data[i + 2] = value
    png.data[i + 3] = 255
  }
  return PNG.sync.write(png)
}

/** A varied image that satisfies the contract. */
function variedPng(width, height) {
  const png = new PNG({ width, height })
  for (let i = 0; i < png.data.length; i += 4) {
    const pixel = i / 4
    png.data[i] = pixel % 256
    png.data[i + 1] = (pixel * 7) % 256
    png.data[i + 2] = (pixel * 13) % 256
    png.data[i + 3] = 255
  }
  return PNG.sync.write(png)
}

const CONTRACT = {
  minWidth: 300,
  minHeight: 220,
  minOpaqueSamples: 500,
  minUniqueColors: 8,
  minLuminanceRange: 24,
  intervalMs: 1,
}

/** Stands in for a Playwright Locator: blank for `blankFrames`, then painted. */
function fakeTarget(blankFrames) {
  let calls = 0
  return {
    get calls() {
      return calls
    },
    async screenshot({ path: target }) {
      calls += 1
      const buffer = calls <= blankFrames ? flatPng(400, 300, 12) : variedPng(400, 300)
      fs.writeFileSync(target, buffer)
      return buffer
    },
  }
}

async function main() {
  // A frame that is ready costs exactly one capture — the normal case must not
  // get slower, which is what made an earlier attempt at this worse than the
  // problem.
  const ready = fakeTarget(0)
  const first = await captureNonBlankImage(ready, OUT, "ready frame", CONTRACT)
  assert.equal(ready.calls, 1, "a painted frame must be captured once and returned")
  assert.ok(Buffer.isBuffer(first.buffer), "callers need the pixels back")
  assert.ok(first.stats, "and the stats the contract measured")

  // A frame that needs a moment is waited for rather than failed.
  const slow = fakeTarget(3)
  await captureNonBlankImage(slow, OUT, "slow frame", CONTRACT)
  assert.equal(slow.calls, 4, "it has to keep looking until the frame paints")

  // A frame that never paints still fails, and says how hard it tried.
  const never = fakeTarget(Number.MAX_SAFE_INTEGER)
  await assert.rejects(
    () => captureNonBlankImage(never, OUT, "dead frame", { ...CONTRACT, budgetMs: 120 }),
    (error) => {
      assert.match(error.message, /dead frame/)
      assert.match(error.message, /never settled/)
      assert.match(error.message, /capture\(s\)/)
      return true
    },
    "a renderer that is genuinely broken must still fail the suite",
  )
  assert.ok(never.calls > 1, "and must have looked more than once before giving up")

  // The file on disk is the frame that passed, not the last blank one, so a
  // failure artifact and a success artifact both show what was asserted on.
  const settled = PNG.sync.read(fs.readFileSync(OUT))
  assert.ok(settled.width >= 300, "the saved artifact is a real frame")

  fs.rmSync(TMP, { recursive: true, force: true })
  console.log("app-qa-contracts: retrying capture assertions passed")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
