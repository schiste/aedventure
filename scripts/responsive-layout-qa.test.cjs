const assert = require("node:assert")
const { mkdirSync } = require("node:fs")
const { join } = require("node:path")
const { tmpdir } = require("node:os")
const { chromium } = require("playwright")
const { startDevelopmentServer } = require("./dev-http-host.cjs")

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 960, expectedMode: "desktop" },
  { name: "laptop", width: 1280, height: 800, expectedMode: "desktop" },
  { name: "tablet-ish", width: 900, height: 700, expectedMode: "desktop" },
  { name: "mobile", width: 390, height: 760, expectedMode: "mobile" },
  { name: "mobile-narrow", width: 360, height: 740, expectedMode: "mobile" },
]

const ARTIFACT_DIR =
  process.env.RESPONSIVE_QA_ARTIFACT_DIR ??
  join(tmpdir(), `aedventure-responsive-qa-${process.pid}`)

const RESPONSIVE_INSPECTOR = String.raw`
window.inspectResponsiveLayout = function inspectResponsiveLayout() {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  }
  const viewportArea = viewport.width * viewport.height
  const canvas = document.querySelector("#map")
  const canvasRect = rectFor(canvas)
  const visibleCanvasRect = intersectWithViewport(canvasRect, viewport)
  const textOverflow = collectTextOverflow()
  const controlOverlaps = collectControlOverlaps()
  const unreachableControls = collectUnreachableControls()

  return {
    canvas: {
      width: Math.round(canvasRect.width),
      height: Math.round(canvasRect.height),
      top: Math.round(canvasRect.top),
      visibleAreaRatio: roundTo(areaFor(visibleCanvasRect) / viewportArea, 3),
    },
    textOverflow,
    controlOverlaps,
    unreachableControls,
  }
}

function collectTextOverflow() {
  return Array.from(
    document.querySelectorAll(
      [
        "button",
        "input",
        "textarea",
        "summary",
        ".status-copy strong",
        ".lifecycle-banner strong",
        ".stage-overlay strong",
        ".stage-overlay p",
        ".generator-preview-header strong",
        ".generator-preview-detail",
        ".validation-summary",
        ".media-meta dd",
        ".meeting-hint",
        ".media-availability",
        ".chat-heading strong",
      ].join(","),
    ),
  )
    .filter(isVisible)
    .filter((element) => {
      const style = getComputedStyle(element)
      const horizontalOverflow =
        element.scrollWidth > element.clientWidth + 1 &&
        style.overflowX === "visible"
      const verticalOverflow =
        element.scrollHeight > element.clientHeight + 1 &&
        style.overflowY === "visible"

      return horizontalOverflow || verticalOverflow
    })
    .map(labelFor)
}

function collectControlOverlaps() {
  const controls = Array.from(
    document.querySelectorAll(
      [
        "button",
        "input",
        "textarea",
        "summary",
        ".status-pill",
        ".lifecycle-banner",
        ".map-tools-panel",
        ".stage-overlay:not([hidden])",
      ].join(","),
    ),
  ).filter(isVisible)
  const overlaps = []

  for (let index = 0; index < controls.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < controls.length; nextIndex += 1) {
      const first = controls[index]
      const second = controls[nextIndex]

      if (first.contains(second) || second.contains(first)) continue
      if (first.closest(".stage-overlay") && second.id === "map") continue
      if (first.closest(".map-tools-panel") === second.closest(".map-tools-panel")) {
        continue
      }

      const overlap = intersectionArea(rectFor(first), rectFor(second))
      if (overlap > 6) {
        overlaps.push(labelFor(first) + " overlaps " + labelFor(second))
      }
    }
  }

  return overlaps
}

function collectUnreachableControls() {
  return Array.from(
    document.querySelectorAll(
      [
        "#start",
        "#reset",
        "[data-map-id='lobby']",
        "[data-map-id='meeting_room']",
        "[data-map-id='lounge_cafe']",
        "#generate-map",
        "#zoom-out",
        "#zoom-reset",
        "#zoom-in",
        "#camera-follow",
        "#camera-fit",
        "#zoom-preset",
        "details[data-mobile-collapsible] summary",
      ].join(","),
    ),
  )
    .filter(isVisible)
    .filter((element) => {
      const rect = rectFor(element)
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      return rect.width < 24 || rect.height < 24 || centerX < 0 || centerY < 0
    })
    .map(labelFor)
}

function rectFor(element) {
  if (!element) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }
  const rect = element.getBoundingClientRect()
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  }
}

function intersectWithViewport(rect, viewport) {
  const left = Math.max(0, rect.left)
  const top = Math.max(0, rect.top)
  const right = Math.min(viewport.width, rect.right)
  const bottom = Math.min(viewport.height, rect.bottom)

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  }
}

function intersectionArea(first, second) {
  return areaFor({
    left: Math.max(first.left, second.left),
    top: Math.max(first.top, second.top),
    right: Math.min(first.right, second.right),
    bottom: Math.min(first.bottom, second.bottom),
    width: Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left)),
    height: Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top)),
  })
}

function areaFor(rect) {
  return Math.max(0, rect.width) * Math.max(0, rect.height)
}

function isVisible(element) {
  const closedDetails = element.closest("details:not([open])")
  if (closedDetails && element.tagName.toLowerCase() !== "summary") {
    return false
  }

  const rect = rectFor(element)
  const style = getComputedStyle(element)

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  )
}

function labelFor(element) {
  const id = element.id ? "#" + element.id : ""
  const className =
    typeof element.className === "string" && element.className.trim()
      ? "." + element.className.trim().split(/\s+/).slice(0, 2).join(".")
      : ""
  const text = (element.textContent || element.value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 44)

  return (
    element.tagName.toLowerCase() +
    id +
    className +
    (text ? ' "' + text + '"' : "")
  )
}

function roundTo(value, places) {
  const multiplier = 10 ** places
  return Math.round(value * multiplier) / multiplier
}
`

async function main() {
  mkdirSync(ARTIFACT_DIR, { recursive: true })

  const { server, url } = await startDevelopmentServer({
    hostname: "127.0.0.1",
    port: 0,
    env: {
      AEDVENTURE_DEFAULT_ROLE_KEYS: "space:member",
      AEDVENTURE_DEFAULT_PERMISSION_KEYS: [
        "room:lobby:enter",
        "chat:room:send",
        "chat:room:receive",
        "media:zone:join",
        "media:zone:publish",
        "media:zone:subscribe",
      ].join(","),
    },
  })

  let browser

  try {
    browser = await chromium.launch()

    for (const viewport of VIEWPORTS) {
      await verifyViewport(browser, url, viewport)
    }

    console.log(`Responsive QA screenshots saved to ${ARTIFACT_DIR}`)
  } finally {
    if (browser) {
      await browser.close()
    }
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

async function verifyViewport(browser, url, viewport) {
  const page = await browser.newPage({
    viewport: {
      width: viewport.width,
      height: viewport.height,
    },
  })
  const consoleErrors = []

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text())
    }
  })
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message)
  })

  try {
    await page.addInitScript(RESPONSIVE_INSPECTOR)
    await page.goto(`${url}/app`, { waitUntil: "domcontentloaded" })
    const initial = await waitForTextState(
      page,
      (state) =>
        state.map?.activeMapId === "lobby" &&
        state.lifecycle?.rendererReadiness === "ready",
    )

    assert.equal(
      initial.layout.mode,
      viewport.expectedMode,
      `${viewport.name}: responsive mode mismatch`,
    )

    await assertResponsiveLayout(page, viewport, "empty")
    await page.screenshot({
      path: join(ARTIFACT_DIR, `${viewport.name}-empty.png`),
      fullPage: true,
    })

    await page.locator("#start").click()
    const joined = await waitForTextState(
      page,
      (state) =>
        state.joined === true &&
        state.lifecycle.phase === "joined" &&
        state.players.length >= 2,
    )
    assert.equal(joined.lifecycle.stageOverlay.hidden, true)

    await waitForToastsToClear(page)
    await assertResponsiveLayout(page, viewport, "joined")
    await page.screenshot({
      path: join(ARTIFACT_DIR, `${viewport.name}-joined.png`),
      fullPage: true,
    })

    assert.deepEqual(consoleErrors, [], `${viewport.name}: browser console errors`)
  } finally {
    await page.close()
  }
}

async function assertResponsiveLayout(page, viewport, phase) {
  const report = await page.evaluate(() => window.inspectResponsiveLayout())
  const state = await renderGameToText(page)
  const label = `${viewport.name}/${phase}`

  assert.ok(
    report.canvas.width >= Math.min(320, viewport.width - 24),
    `${label}: canvas width too small: ${report.canvas.width}`,
  )
  assert.ok(
    report.canvas.height >= (viewport.expectedMode === "mobile" ? 300 : 430),
    `${label}: canvas height too small: ${report.canvas.height}`,
  )
  assert.ok(
    report.canvas.visibleAreaRatio >=
      (viewport.expectedMode === "mobile" ? 0.28 : 0.2),
    `${label}: canvas not prominent enough: ${report.canvas.visibleAreaRatio}`,
  )
  assert.equal(
    state.camera.localPlayerVisible,
    true,
    `${label}: local player should stay visible in camera view`,
  )
  if (viewport.expectedMode === "mobile") {
    assert.equal(
      state.camera.defaultZoomFactor,
      1,
      `${label}: mobile camera should use the mobile default zoom`,
    )
  }
  assertNoFindings(report.unreachableControls, `${label}: unreachable controls`)
  assertNoFindings(report.textOverflow, `${label}: text overflow`)
  assertNoFindings(report.controlOverlaps, `${label}: overlapping controls`)
}

function assertNoFindings(findings, label) {
  assert.equal(
    findings.length,
    0,
    `${label}\n${JSON.stringify(findings, null, 2)}`,
  )
}

async function waitForTextState(page, predicate, timeoutMs = 7000) {
  const startedAt = Date.now()
  let latest

  while (Date.now() - startedAt < timeoutMs) {
    latest = await renderGameToText(page)
    if (predicate(latest)) return latest
    await page.waitForTimeout(100)
  }

  assert.fail(
    `Timed out waiting for frontend state. Latest state:\n${JSON.stringify(
      latest,
      null,
      2,
    )}`,
  )
}

async function renderGameToText(page) {
  return page.evaluate(() => {
    if (typeof window.render_game_to_text !== "function") {
      throw new Error("Missing window.render_game_to_text.")
    }

    return JSON.parse(window.render_game_to_text())
  })
}

async function waitForToastsToClear(page) {
  await page.waitForFunction(
    () => document.querySelectorAll(".toast").length === 0,
    undefined,
    { timeout: 7000 },
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
