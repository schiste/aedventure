const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const { chromium } = require("playwright")
const { assertNonBlankImageBuffer } = require("./app-qa-contracts.cjs")
const { startStaticAppServer } = require("./app-qa-server.cjs")

const ROOT_DIR = path.resolve(__dirname, "..")
const DIST_DIR = path.join(ROOT_DIR, "apps/engine-sandbox/dist-app")
const SCREENSHOT_PATH = path.join(ROOT_DIR, "tmp/engine-sandbox-smoke.png")

async function main() {
  const { server, url } = await startStaticAppServer({
    directory: DIST_DIR,
    basePath: "/app",
  })
  let browser
  const consoleErrors = []

  try {
    browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1180, height: 760 } })
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text())
    })
    page.on("pageerror", (error) => {
      consoleErrors.push(error.stack || error.message)
    })

    await page.goto(`${url}/app`, { waitUntil: "domcontentloaded" })
    const initial = await waitForTextState(
      page,
      (state) =>
        state.app === "engine-sandbox" &&
        state.world?.validationValid === true &&
        state.world?.mapCount === 2 &&
        state.coexistence?.sharedCanvas === true &&
        state.coexistence?.squareRendered === true &&
        state.coexistence?.hexRendered === true &&
        state.square?.topology === "square" &&
        state.hex?.topology === "hex" &&
        state.square?.entities >= 1 &&
        state.hex?.entities >= 1 &&
        state.square?.zones >= 1 &&
        state.hex?.zones >= 1 &&
        state.square?.labels >= 1 &&
        state.hex?.labels >= 1 &&
        state.square?.interactions?.length >= 1 &&
        state.hex?.interactions?.length >= 1,
      consoleErrors,
    )

    assert.equal(initial.engineBoundary.importsOfficeDomain, false)
    assert.deepEqual(initial.engineBoundary.uses, [
      "@aedventure/game-topology",
      "@aedventure/game-world",
      "@aedventure/game-renderer-phaser/hex-geometry",
    ])
    assert.match(initial.coordinateSystem, /square uses x\/y/i)
    assert.match(initial.coordinateSystem, /hex uses flat-top axial q\/r/i)

    await page.evaluate(() => window.advanceTime?.(120))
    const advanced = await renderGameToText(page)
    assert.ok(advanced.frameCount > initial.frameCount)

    await clickInteraction(page, initial.square.interactions[0])
    const squareSelected = await waitForTextState(
      page,
      (state) => state.selectedInteractionId === initial.square.interactions[0].id,
      consoleErrors,
    )
    assert.equal(squareSelected.selectedInteractionId, "interaction.square.inspect")

    await clickInteraction(page, initial.hex.interactions[0])
    const hexSelected = await waitForTextState(
      page,
      (state) => state.selectedInteractionId === initial.hex.interactions[0].id,
      consoleErrors,
    )
    assert.equal(hexSelected.selectedInteractionId, "interaction.hex.gather")

    await assertNonBlankWorldScreenshot(page)
    assert.deepEqual(consoleErrors, [])
  } finally {
    if (browser) await browser.close()
    await new Promise((resolve) => server.close(resolve))
  }
}

async function waitForTextState(page, predicate, consoleErrors = [], timeoutMs = 8000) {
  const startedAt = Date.now()
  let lastState
  let lastError

  while (Date.now() - startedAt < timeoutMs) {
    try {
      lastState = await renderGameToText(page)
      if (predicate(lastState)) return lastState
    } catch (error) {
      lastError = error
    }
    await page.waitForTimeout(100)
  }

  throw new Error(
    `Timed out waiting for engine sandbox state. Last state: ${JSON.stringify(
      lastState,
    )}. Console errors: ${JSON.stringify(consoleErrors)}. Last error: ${
      lastError?.message ?? "none"
    }`,
  )
}

async function renderGameToText(page) {
  const text = await page.evaluate(() => {
    if (typeof window.render_game_to_text !== "function") {
      throw new Error("render_game_to_text is not installed")
    }
    return window.render_game_to_text()
  })
  return JSON.parse(text)
}

async function clickInteraction(page, interaction) {
  assert.ok(interaction?.screen, "Interaction must expose a screen point.")
  const box = await page.locator("#world canvas").boundingBox()
  assert.ok(box, "Engine sandbox canvas must have a browser bounding box.")
  await page.mouse.click(box.x + interaction.screen.x, box.y + interaction.screen.y)
}

async function assertNonBlankWorldScreenshot(page) {
  fs.mkdirSync(path.dirname(SCREENSHOT_PATH), { recursive: true })
  await page.locator("#world canvas").screenshot({ path: SCREENSHOT_PATH })
  assertNonBlankImageBuffer(
    fs.readFileSync(SCREENSHOT_PATH),
    "Engine sandbox world screenshot",
    {
      minWidth: 300,
      minHeight: 220,
      minOpaqueSamples: 500,
      minUniqueColors: 8,
      minLuminanceRange: 24,
    },
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
