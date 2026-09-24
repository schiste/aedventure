const assert = require("node:assert")
const { PNG } = require("pngjs")

const SHARED_RENDERER_PACKAGE = "@aedventure/game-renderer-phaser"
const SHARED_ENGINE_PACKAGES = [
  "@aedventure/game-core",
  "@aedventure/game-assets",
  "@aedventure/game-map",
  "@aedventure/game-input",
  SHARED_RENDERER_PACKAGE,
]

function assertOfficeRenderGameContract(state) {
  assertCommonRenderGameContract(state, {
    app: "customer-virtual-office",
    domain: "@aedventure/office-domain",
  })
  assert.equal(typeof state.lifecycle?.rendererReadiness, "string")
  assert.equal(typeof state.layout?.mode, "string")
  assert.equal(typeof state.world?.joined, "boolean")
  assert.equal(typeof state.media?.tokenIssued, "boolean")
  assert.equal(typeof state.meeting?.panelState, "string")
  assert.equal(state.map?.renderer, "phaser")
  assert.equal(typeof state.map?.activeMapId, "string")
  assert.equal(state.mapValidation?.valid, true)
  assert.ok(Array.isArray(state.players), "Office app must expose players.")
}

function assertCommonRenderGameContract(state, options) {
  assert.equal(state.app, options.app)
  assert.match(
    state.coordinateSystem ?? "",
    /origin top-left.*x right.*y down/i,
    `${options.app} must expose an agent-readable coordinate system.`,
  )
  assert.equal(state.engineBoundary?.domain, options.domain)
  assert.equal(state.engineBoundary?.renderer, SHARED_RENDERER_PACKAGE)
  assert.deepEqual(state.engineBoundary?.uses, SHARED_ENGINE_PACKAGES)
  assert.equal(typeof state.engineBoundary?.importsOfficeDomain, "boolean")
  assert.equal(state.renderer?.requestedRenderer, "webgl")
  assert.equal(state.renderer?.mapValidation?.valid, true)
  assert.equal(typeof state.renderer?.performance, "object")
  assert.equal(typeof state.renderer?.viewport, "object")
}

function assertNonBlankImageBuffer(buffer, label, options = {}) {
  const image = PNG.sync.read(buffer)
  const stride = Math.max(
    4,
    Math.floor((image.width * image.height) / (options.sampleTarget ?? 20000)) * 4,
  )
  const colors = new Set()
  let minLuma = 255
  let maxLuma = 0
  let opaqueSamples = 0

  for (let offset = 0; offset < image.data.length; offset += stride) {
    const red = image.data[offset]
    const green = image.data[offset + 1]
    const blue = image.data[offset + 2]
    const alpha = image.data[offset + 3]

    if (alpha < (options.minAlpha ?? 16)) continue

    opaqueSamples += 1
    minLuma = Math.min(minLuma, red, green, blue)
    maxLuma = Math.max(maxLuma, red, green, blue)
    if (colors.size < 96) {
      colors.add(`${red >> 4}:${green >> 4}:${blue >> 4}`)
    }
  }

  const stats = {
    width: image.width,
    height: image.height,
    opaqueSamples,
    sampledUniqueColors: colors.size,
    luminanceRange: maxLuma - minLuma,
  }

  assert.ok(
    stats.width >= (options.minWidth ?? 300),
    `${label}: expected width >= ${options.minWidth ?? 300}, got ${stats.width}.`,
  )
  assert.ok(
    stats.height >= (options.minHeight ?? 220),
    `${label}: expected height >= ${options.minHeight ?? 220}, got ${stats.height}.`,
  )
  assert.ok(
    stats.opaqueSamples >= (options.minOpaqueSamples ?? 500),
    `${label}: expected enough opaque samples, got ${stats.opaqueSamples}.`,
  )
  assert.ok(
    stats.sampledUniqueColors >= (options.minUniqueColors ?? 4),
    `${label}: expected varied colors, got ${stats.sampledUniqueColors}.`,
  )
  assert.ok(
    stats.luminanceRange >= (options.minLuminanceRange ?? 24),
    `${label}: expected visible contrast, got ${stats.luminanceRange}.`,
  )

  return stats
}

/**
 * Screenshot a target until the image satisfies the non-blank contract.
 *
 * The suites used to capture once and assert immediately. A canvas has no
 * obligation to have drawn by then, and under load it frequently has not — the
 * engine sandbox failed a push gate with "expected varied colors, got 6",
 * which is a half-painted frame rather than a broken renderer. Asserting on
 * rendered pixels at one arbitrary instant is the defect; retrying the capture
 * is the fix.
 *
 * Costs nothing in the normal case: the first capture passes and returns. Only
 * a frame that is not ready yet pays for another look.
 *
 * `target` is anything with a `screenshot()` — a Page or a Locator.
 * Returns `{ buffer, stats }` for the frame that satisfied the contract.
 */
async function captureNonBlankImage(target, screenshotPath, label, options = {}) {
  const { budgetMs = 8000, intervalMs = 150, ...contract } = options
  const startedAt = Date.now()
  let attempts = 0
  let lastError

  for (;;) {
    attempts += 1
    const buffer = await target.screenshot({ path: screenshotPath })
    try {
      // Both are wanted downstream: the stats for reporting, the buffer for
      // further pixel contracts such as the fog palette check.
      return { buffer, stats: assertNonBlankImageBuffer(buffer, label, contract) }
    } catch (error) {
      lastError = error
    }
    if (Date.now() - startedAt >= budgetMs) break
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  lastError.message = `${lastError.message} (after ${attempts} capture(s) over ${
    Date.now() - startedAt
  }ms — the frame never settled)`
  throw lastError
}

/**
 * Get past the title screen, the way a player does.
 *
 * Every load lands here now, and it is a modal that intercepts pointer events
 * — so a suite that skips it spends its whole budget clicking at the menu.
 * "New game" is the route a player takes to reach the map, and it resets the
 * run, which is what a QA scenario wants anyway.
 *
 * Tolerant: a build without the screen, or a run already past it, shows
 * nothing and that is not a failure.
 */
async function dismissStartScreen(page, { timeoutMs = 20000 } = {}) {
  await page.waitForFunction(
    () => typeof window.render_game_to_text === "function",
    undefined,
    { timeout: timeoutMs },
  )

  const deadline = Date.now() + timeoutMs
  let clearRuns = 0
  while (Date.now() < deadline) {
    if (page.isClosed()) return
    const begin = page.locator("#start-new-game")
    if (await begin.count()) {
      try {
        await begin.click({ timeout: Math.min(2000, timeoutMs) })
      } catch {
        // The screen can close between the count and the click.
      }
    }
    // Two clear looks, for the same reason the cinematic helper wants them:
    // a screen that has not rendered yet is not a screen that is gone.
    clearRuns = (await page.locator("#start-screen").count()) ? 0 : clearRuns + 1
    if (clearRuns >= 2) return
    await page.waitForTimeout(150)
  }
  throw new Error("The title screen never cleared; every later scenario would be blocked by it.")
}

/**
 * Get past the opening cinematic, the way a player does.
 *
 * A fresh run opens on `cinematic.intro`, a modal over the whole interface, so
 * without this every scenario after boot is clicking at a dialog. Skipping is
 * what the Skip button is for — this is the same route a returning player
 * takes, not a test-only back door.
 *
 * Two details that matter, both learned the hard way:
 * - it waits for the runtime first, because the intro is requested when the
 *   first snapshot lands, so a check straight after `goto` finds nothing and
 *   the modal then opens behind it;
 * - it wants two clear looks in a row, so a stage that has not opened yet is
 *   never mistaken for one that is already gone.
 *
 * A run that has already seen the opening shows no stage; that is not a failure.
 */
async function dismissOpeningCinematic(page, { timeoutMs = 20000 } = {}) {
  await page.waitForFunction(
    () => typeof window.render_game_to_text === "function",
    undefined,
    { timeout: timeoutMs },
  )

  const deadline = Date.now() + timeoutMs
  let clearRuns = 0
  while (Date.now() < deadline) {
    if (page.isClosed()) return
    const skip = page.locator("#cinematic-skip")
    if (await skip.count()) {
      try {
        await skip.click({ timeout: Math.min(2000, timeoutMs) })
      } catch {
        // The stage can finish between the count and the click.
      }
    }
    clearRuns = (await page.locator("#cinematic-stage").count()) ? 0 : clearRuns + 1
    if (clearRuns >= 2) return
    await page.waitForTimeout(150)
  }
  throw new Error(
    "The opening cinematic never cleared; every later scenario would be blocked by it.",
  )
}

module.exports = {
  dismissOpeningCinematic,
  dismissStartScreen,
  SHARED_ENGINE_PACKAGES,
  assertNonBlankImageBuffer,
  assertOfficeRenderGameContract,
  captureNonBlankImage,
}
