const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const { chromium } = require("playwright")
const { assertNonBlankImageBuffer } = require("./app-qa-contracts.cjs")
const { startStaticAppServer } = require("./app-qa-server.cjs")
const {
  captureAddBrowserFixture,
  loadAddBrowserQaManifest,
  writeAddBrowserQaReport,
} = require("./add-rpg-phase5.cjs")

const ROOT_DIR = path.resolve(__dirname, "..")
const DIST_DIR = path.join(ROOT_DIR, "apps/add-rpg/dist-app")
const SMOKE_ARTIFACT_DIR = process.env.AGENT_ARTIFACT_DIR
  ? path.join(process.env.AGENT_ARTIFACT_DIR, "screenshots")
  : path.join(ROOT_DIR, "tmp")
const SCREENSHOT_PATH = path.join(SMOKE_ARTIFACT_DIR, "add-rpg-smoke.png")
const OFFLINE_RETURN_SCENARIO = JSON.parse(
  fs.readFileSync(path.join(ROOT_DIR, "scenarios/add/offline-return.json"), "utf8"),
)
const CANONICAL_IDLE_LOOP_SCENARIO = JSON.parse(
  fs.readFileSync(path.join(ROOT_DIR, "scenarios/add/idle-base-first-cycle.json"), "utf8"),
)
const ADD_AUTOSAVE_STORAGE_KEY = "aedventure.add-rpg.autosave.v1"
const ADD_SETTINGS_STORAGE_KEY = "add-rpg:settings:v1"
const RESET_CLOCK_TOLERANCE_SECONDS = 60
const MOBILE_PRESENTATION_VIEWPORTS = [
  { name: "mobile", width: 390, height: 760 },
  { name: "mobile-narrow", width: 360, height: 740 },
]
const V1_INTERFACE_CONTEXTS = ["discovery", "base", "dungeon", "return"]
const V1_INTERFACE_DESKTOP_PANELS = [
  "base-management-panel",
  "dungeon-context-panel",
  "offline-return-panel",
]
const ADD_BROWSER_QA_MANIFEST = loadAddBrowserQaManifest()

const v1InterfaceGate = {
  contexts: new Set(),
  desktopPanels: new Set(),
  mobileBottomSheet: false,
}

async function main() {
  const { server, url } = await startStaticAppServer({
    directory: DIST_DIR,
    basePath: "/app",
  })
  let browser
  const consoleErrors = []
  const phase5Evidence = []
  let phase5Failure = null

  try {
    const canonicalIdleLoop = await runScenario("canonical idle loop contract", () =>
      assertCanonicalIdleLoopScenario(CANONICAL_IDLE_LOOP_SCENARIO),
    )
    browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1180, height: 760 } })
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text())
    })
    page.on("pageerror", (error) => {
      consoleErrors.push(error.stack || error.message)
    })
    await page.addInitScript(({ autosaveStorageKey, settingsStorageKey }) => {
      if (window.sessionStorage.getItem("add-rpg-smoke-storage-ready") === "1") return
      window.localStorage.removeItem(autosaveStorageKey)
      window.localStorage.removeItem(settingsStorageKey)
      window.sessionStorage.setItem("add-rpg-smoke-storage-ready", "1")
    }, { autosaveStorageKey: ADD_AUTOSAVE_STORAGE_KEY, settingsStorageKey: ADD_SETTINGS_STORAGE_KEY })

    await page.goto(`${url}/app`, { waitUntil: "domcontentloaded" })
    const initial = await runScenario("boot and render text contract", () =>
      assertBootAndRenderTextContract(page, consoleErrors),
    )
    await capturePhase5Fixture(page, phase5Evidence, "add.boot", initial)
    await runScenario("admin and developer tools separation", () =>
      assertAdminDeveloperSeparation(page, consoleErrors),
    )
    const storyFixtureState = await openAdmin(page, consoleErrors)
    await page.locator('a[href="#admin-story-browser"]').click()
    await page.waitForTimeout(100)
    await page.locator('[data-qa="story-commands"]').evaluate((element) => {
      if (element instanceof HTMLDetailsElement) element.open = true
    })
    await capturePhase5Fixture(page, phase5Evidence, "add.story-choice", storyFixtureState)
    await closeAdmin(page, consoleErrors)
    await runScenario("initial visibility and known facts", () =>
      assertInitialVisibilityContract(initial),
    )
    const idle = await runScenario("ambient clock", () => assertIdleAmbientClockAdvances(page))
    await capturePhase5Fixture(page, phase5Evidence, "add.idle", idle)
    await runScenario("hero spawn placement", () => assertHeroStartsAtSurvivorCave(page, initial))
    await runScenario("Studio objective marker is label-only", () =>
      assertStudioObjectiveMarkerIsLabelOnly(page, consoleErrors),
    )
    await runScenario("survivor cave dungeon entry loop", () =>
      exerciseSurvivorCaveDungeonEntry(page, consoleErrors),
    )
    await runScenario("hidden cells and fog screenshot", async () => {
      const state = await assertHiddenMapCellsAreInvisibleToPointer(page, consoleErrors)
      assert.notEqual(state.map.interaction.selectedDetail?.visibility, "hidden")
      await assertNonBlankFogMapScreenshot(page, state)
      return state
    })
    await runScenario("mobile presentation", () => assertMobilePresentation(browser, url))
    const questHud = await runScenario("quest HUD keyboard movement and collapse", () =>
      exerciseQuestHud(page, consoleErrors),
    )
    assert.equal(questHud.shell.questPanel.collapsed, false)
    assert.ok(questHud.shell.questPanel.x !== initial.shell.questPanel.x)
    assert.ok(questHud.shell.questPanel.y !== initial.shell.questPanel.y)
    const characterMoved = await runScenario("travel dialog and hero movement", () =>
      exerciseMainCharacterMovement(page, consoleErrors),
    )
    assert.equal(characterMoved.map.character.lastMoveAccepted, true)

    const interacted = await runScenario("map interaction and camera", () =>
      interactWithMap(page, consoleErrors),
    )
    assert.ok(interacted.map.interaction.selectedHex)
    assert.ok(interacted.map.interaction.selectedLabel)
    await capturePhase5Fixture(page, phase5Evidence, "add.map", interacted)

    const switched = await runScenario("map mode switching", () =>
      exerciseMapModeSwitching(page, consoleErrors),
    )
    assert.equal(switched.mapMode.active, "overworld_hex")
    assert.equal(switched.map.topology.kind, "hex")

    const firstPlayable = await runScenario("first playable progression", () =>
      completeFirstPlayableArc(page, consoleErrors),
    )
    assertFirstPlayableComplete(firstPlayable)

    const studioArrival = await runScenario("Studio arrival unlocks Base navigation", () =>
      unlockBaseNavigationByTravelingToStudio(page, consoleErrors, canonicalIdleLoop),
    )
    assertCanonicalIdleLoopBrowserEvidence(studioArrival, canonicalIdleLoop)
    await capturePhase5Fixture(page, phase5Evidence, "add.canonical-idle-loop", studioArrival)
    await runScenario("Studio tile detail links", () =>
      exerciseStudioTileDetailLinks(page, consoleErrors),
    )
    await runScenario("base management surface", () =>
      exerciseBaseManagementSurface(page, consoleErrors),
    )

    const exported = await runScenario("persistence, offline catchup, and reset", () =>
      exerciseSaveReloadOfflineAndReset(
        page,
        firstPlayable,
        consoleErrors,
        async (fixtureId, state) => capturePhase5Fixture(page, phase5Evidence, fixtureId, state),
      ),
    )
    assert.ok(exported.payload.length > 200)
    await closeAdmin(page, consoleErrors)

    await runScenario("final screenshots", async () => {
      await assertNonBlankAppScreenshot(page)
      await assertNonBlankMapScreenshot(page)
    })
    await runScenario("V1 interface gate", () => assertV1InterfaceGateComplete())
    await runScenario("console cleanliness", () => assert.deepEqual(consoleErrors, []))
  } catch (error) {
    phase5Failure = error instanceof Error ? error.message : String(error)
    throw error
  } finally {
    try {
      writeAddBrowserQaReport({
        artifactDir: SMOKE_ARTIFACT_DIR,
        manifest: ADD_BROWSER_QA_MANIFEST,
        fixtures: phase5Evidence,
        status: phase5Failure ? "failed" : "passed",
        failure: phase5Failure,
      })
    } finally {
      if (browser) await browser.close()
      await new Promise((resolve) => server.close(resolve))
    }
  }
}

async function capturePhase5Fixture(page, evidence, fixtureId, state) {
  evidence.push(
    await captureAddBrowserFixture({
      page,
      manifest: ADD_BROWSER_QA_MANIFEST,
      fixtureId,
      state,
      artifactDir: SMOKE_ARTIFACT_DIR,
      assertNonBlankImageBuffer,
    }),
  )
}

async function runScenario(name, scenario) {
  console.log(`[add-rpg-smoke] ${name}`)
  try {
    return await scenario()
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error))
    const wrapped = new Error(`Scenario "${name}" failed: ${cause.message}`)
    wrapped.stack = cause.stack ? `${wrapped.message}\nCaused by: ${cause.stack}` : wrapped.stack
    throw wrapped
  }
}

function browserScenarioCommands(scenario) {
  const commands = scenario.commands.filter((command) => command.type !== "SaveRoundTrip")
  assert.deepEqual(
    commands.map((command) => command.type),
    ["RunOfflineCatchup"],
    "The offline browser smoke must reuse the compatible runtime command prefix from the committed scenario.",
  )
  return commands
}

function assertCanonicalIdleLoopScenario(scenario) {
  assert.equal(scenario.id, "idle-base-first-cycle")
  assert.equal(scenario.seed, "fixture-seed")

  const travelCommands = scenario.commands.filter((command) => command.type === "MoveHeroTo")
  assert.deepEqual(
    travelCommands,
    [
      { type: "MoveHeroTo", q: 5, r: 0 },
      { type: "MoveHeroTo", q: 4, r: 1 },
      { type: "MoveHeroTo", q: 3, r: 1 },
      { type: "MoveHeroTo", q: 2, r: 2 },
      { type: "MoveHeroTo", q: 1, r: 2 },
      { type: "MoveHeroTo", q: 0, r: 3 },
    ],
    "the canonical idle loop must use the open Survivor Cave -> Studio route",
  )
  assert.ok(
    !scenario.commands.some((command) => command.type === "CompletePreArrivalRoute"),
    "the canonical idle loop must not bypass travel with the test-only intro shortcut",
  )
  assert.ok(
    scenario.commands.some(
      (command) => command.type === "SetRoleCrew" && command.roleId === "role.scavenge",
    ),
    "the canonical idle loop must explicitly assign Scavenge Crew",
  )
  assert.ok(
    scenario.commands.some(
      (command) => command.type === "SetRoleCrew" && command.roleId === "role.construction",
    ),
    "the canonical idle loop must explicitly assign Construction Crew",
  )
  const offlineCommand = scenario.commands.find((command) => command.type === "RunOfflineCatchup")
  assert.deepEqual(
    offlineCommand,
    { type: "RunOfflineCatchup", seconds: 3600 },
    "the canonical idle loop must end with the one-hour offline return contract",
  )
  assert.equal(
    scenario.commands.at(-1)?.type,
    "SaveRoundTrip",
    "the canonical idle loop must prove its final save round-trip",
  )
  assert.deepEqual(
    scenario.checkpoints.map((checkpoint) => checkpoint.id),
    [
      "travel-started",
      "studio-reached",
      "base-investigation-unlocked",
      "base-explored-and-studio-unlocked",
      "crew-earned-stone",
      "studio-construction-started",
      "studio-restored",
      "online-resource-loop",
      "offline-return-earned-resources",
      "save-round-trip-stable",
    ],
    "the canonical idle loop checkpoint names are a stable browser/headless contract",
  )

  const studio = travelCommands.at(-1)
  return {
    studioCell: `hex:${studio.q},${studio.r}`,
  }
}

function assertCanonicalIdleLoopBrowserEvidence(state, contract) {
  assert.equal(state.mapMode?.active, "overworld_hex")
  assert.equal(state.map?.character?.cell, contract.studioCell)
  assert.equal(state.mapMode?.available?.includes("base_square"), true)
  assert.equal(state.snapshot?.base?.studioRestoreUnlocked, true)
  assert.equal(state.snapshot?.base?.studioRestored, true)
  assert.equal(state.ui?.firstPlayable?.complete, true)
  assert.equal(state.shell?.currentAction?.source, "discovery")
}

async function runBrowserScenarioCommand(page, command, consoleErrors) {
  switch (command.type) {
    case "RunOfflineCatchup": {
      assert.equal(
        command.seconds,
        3600,
        "The browser smoke maps the committed offline scenario's one-hour catch-up control.",
      )
      const before = await renderGameToText(page)
      await page.locator("#offline-catchup").click()
      return waitForTextState(
        page,
        (nextState) =>
          nextState.persistence?.lastOfflineCatchupSeconds >= command.seconds &&
          nextState.snapshot?.clockSeconds >= before.snapshot.clockSeconds + command.seconds - 100 &&
          nextState.ui?.firstPlayable?.persistenceReady === true &&
          nextState.offlineReturn?.elapsedSeconds >= command.seconds,
        consoleErrors,
      )
    }
    default:
      throw new Error(`Unsupported browser scenario command: ${command.type}`)
  }
}

async function assertBootAndRenderTextContract(page, consoleErrors) {
  const initial = await waitForTextState(
    page,
    (state) =>
      state.app === "add-rpg" &&
      state.runtime?.workerBoundary === "ui-worker-rust-wasm-snapshot" &&
      state.runtime?.ready === true &&
      state.runtime?.autoTick === true &&
      state.runtime?.snapshotReceived === true &&
      state.runtime?.catalogReceived === true &&
      state.shell?.framework === "solid" &&
      state.shell?.surface === "fullscreen_map_shell" &&
      state.shell?.hostsPhaserMap === true &&
      state.shell?.interfaceHierarchy?.primary?.label === "Map" &&
      state.shell?.interfaceHierarchy?.secondary?.label === "Decision" &&
      state.shell?.interfaceHierarchy?.tertiary?.label === "Status" &&
      state.shell?.interfaceHierarchy?.settings?.label === "Settings" &&
      state.shell?.interfaceHierarchy?.settings?.hiddenByDefault === true &&
      state.shell?.interfaceHierarchy?.settings?.open === false &&
      state.shell?.interfaceHierarchy?.advanced?.label === "Tools" &&
      state.shell?.interfaceHierarchy?.advanced?.hiddenByDefault === true &&
      state.shell?.interfaceHierarchy?.advanced?.adminOpen === false &&
      state.shell?.interfaceHierarchy?.advanced?.developerOpen === false &&
      state.shell?.interfaceHierarchy?.advanced?.runtimeInternalsHiddenByDefault === true &&
      state.shell?.interfaceHierarchy?.questions?.whereAmI?.length > 0 &&
      state.shell?.interfaceHierarchy?.questions?.whatChanged?.length > 0 &&
      state.shell?.interfaceHierarchy?.questions?.whatShouldIDoNow?.length > 0 &&
      state.shell?.interfaceHierarchy?.questions?.whatHappensIfIWait?.length > 0 &&
      typeof state.shell?.currentAction?.label === "string" &&
      state.shell.currentAction.label.length > 0 &&
      typeof state.shell.currentAction.detail === "string" &&
      state.shell.currentAction.detail.length > 0 &&
      typeof state.shell.currentAction.source === "string" &&
      state.shell?.shellMenuOpen === false &&
      state.shell?.settingsOpen === false &&
      state.shell?.adminOpen === false &&
      state.shell?.devToolsOpen === false &&
      typeof state.shell?.discoveryPanel?.collapsed === "boolean" &&
      state.shell?.questPanel?.collapsed === true &&
      state.shell?.questPanel?.dragEnabled === true &&
      state.shell?.questPanel?.keyboardMoveEnabled === true &&
      state.shell?.questPanel?.dragging === false &&
      state.shell?.questPanel?.lastAction === "idle" &&
      state.shell?.questPanel?.collapseControlLabel === "Expand objective tracker" &&
      state.shell?.accessibility?.keyboardNavigation === true &&
      state.shell?.accessibility?.focusVisible === true &&
      state.shell?.accessibility?.currentActionLiveRegion === "polite" &&
      state.shell?.accessibility?.contextualPanelsLabelled === true &&
      state.shell?.accessibility?.objectiveTrackerKeyboardMove === true &&
      state.shell?.accessibility?.rightRailAvoidsScrollTrap === true &&
      typeof state.shell?.accessibility?.mobileBottomSheetAvoidsScrollTrap === "boolean" &&
      Array.isArray(state.shell?.accessibility?.shortcuts) &&
      state.shell.accessibility.shortcuts.length >= 4 &&
      /^map_objective(?:_context)?_status$/.test(state.shell?.visualPolish?.surfaceSystem ?? "") &&
      state.shell?.visualPolish?.mapSurface === "full_bleed_phaser_stage" &&
      state.shell?.visualPolish?.objectiveSurface === "warm_progress_overlay" &&
      state.shell?.visualPolish?.contextSurface === "cool_decision_inspector" &&
      state.shell?.visualPolish?.statusSurface === "thin_resource_time_bar" &&
      state.shell?.visualPolish?.stateLayer === "native_loading_error_empty" &&
      state.shell?.visualPolish?.panelRhythm === "shared_spacing_border_shadow_tokens" &&
      state.shell?.visualPolish?.transitions === "cohesive_motion_with_reduced_motion_guard" &&
      state.shell?.visualPolish?.worldUiIntegration === "glass_surfaces_over_living_map" &&
      Number.isFinite(state.shell?.questPanel?.x) &&
      Number.isFinite(state.shell?.questPanel?.y) &&
      state.mapMode?.active === "overworld_hex" &&
      state.mapMode?.topology === "hex" &&
      state.map?.hostedBy === "phaser" &&
      state.map?.ready === true &&
      state.map?.validationValid === true &&
      state.map?.topology?.kind === "hex" &&
      state.map?.topology?.fixture === false &&
      state.snapshot?.hexCount > 0 &&
      initialDiscoveryShapeReady(state) &&
      typeof state.snapshot?.heroMap === "string" &&
      state.map?.cells?.total === state.snapshot.hexCount &&
      state.map?.dungeonLinks?.total > 0 &&
      state.map?.dungeonLinks?.cellsWithLinks > 0 &&
      state.map?.character?.visible === true &&
      state.map?.character?.authority === "browser_navigation_triggers_rust_time" &&
      state.map?.travel?.costGameMinutes === 60 &&
      state.map?.travel?.costRuntimeSeconds === 60 &&
      state.travel?.costGameMinutes === 60 &&
      state.travel?.costRuntimeSeconds === 60 &&
      state.travel?.confirmation?.eligible === true &&
      state.travel?.confirmation?.reason === "opening_reach_base_from_survivor_cave" &&
      state.map?.landmarks?.studioLabelVisible === true &&
      state.map?.landmarks?.survivorCaveVisible === true &&
      state.map?.authority?.rules === "rust_wasm_snapshot" &&
      state.map?.authority?.mutatesSimulation === false &&
      state.map?.interaction?.activeSource === "selection" &&
      state.map?.interaction?.activeCell === state.map?.interaction?.selectedCell &&
      state.map?.interaction?.lastInput === "none" &&
      state.map?.interaction?.markerVisible === true &&
      state.map?.interaction?.primaryMarkerVisible === false &&
      state.map?.presentation?.terrainArt === "procedural_painterly_topology" &&
      state.map?.presentation?.bubbleEffects === "animated_halo_edge" &&
      state.map?.presentation?.landmarkSprites === "procedural_sprite_stack" &&
      state.map?.presentation?.labelRendering === "high_resolution_phaser_text" &&
      state.map?.presentation?.ambience === "subtle_motes_and_topographic_scan" &&
      state.map?.presentation?.mapPrimaryAffordances?.layer ===
        "reachable_path_frontier_landmark" &&
      state.map?.presentation?.mapPrimaryAffordances?.reachableCellCount > 0 &&
      state.map?.presentation?.mapPrimaryAffordances?.frontierHintCount > 0 &&
      state.map?.presentation?.mapPrimaryAffordances?.actionMarkerCount > 0 &&
      state.map?.presentation?.mapPrimaryAffordances?.landmarkBeaconCount >= 2 &&
      state.discovery?.phase === "enter_dungeon" &&
      typeof state.discovery?.nextAction?.label === "string" &&
      state.discovery.nextAction.label.length > 0 &&
      state.discovery.nextAction.kind === "enter_dungeon" &&
      state.discovery.nextAction.enabled === true &&
      state.discovery?.dungeonEntryAvailable === true &&
      state.discovery?.dungeonEntryTarget === "add.rpg.dungeon.survivor-cave" &&
      state.discovery?.enabledActionIds?.includes("dungeon:add.rpg.dungeon.survivor-cave") &&
      state.shell?.currentAction?.actionId === "first-playable:reach-base-route" &&
      state.dungeonObjective === null &&
      state.ui?.worldTime?.day >= 1 &&
      state.ui?.worldTime?.season === "spring" &&
      state.ui?.worldTime?.source === "estimated_solar_model" &&
      typeof state.ui?.worldTime?.sunrise === "string" &&
      typeof state.ui?.worldTime?.sunset === "string" &&
      state.storyAgent?.contract === "agent_story_v1" &&
      state.storyAgent?.contentValidationVersion === "content_authoring_model_v1" &&
      state.storyAgent?.activeBeat?.id === "story.beat.road_to_base" &&
      state.storyAgent?.activeArc === "pre_arrival" &&
      state.storyAgent?.currentBlocker?.kind === "first_playable" &&
      state.storyAgent?.availableCommands?.length > 0 &&
      state.storyAgent?.commandAuthority?.availability === "rust_runtime" &&
      state.storyAgent?.commandAuthority?.runtimeExecution === "rust_runtime" &&
      state.storyAgent?.commandIds?.length === state.storyAgent.availableCommands.length &&
      state.storyAgent?.nextBeatCandidates?.length > 0 &&
      state.storyAgent?.completedArcProgress?.length > 0 &&
      typeof state.storyAgent?.answer?.whatShouldIDoNext === "string" &&
      state.storyAgent.answer.whatShouldIDoNext.length > 0 &&
      typeof state.storyAgent?.answer?.why === "string" &&
      state.storyAgent.answer.why.length > 0 &&
      state.agentRuntime?.contract === "agent_runtime_v1" &&
      state.agentRuntime?.schemaVersion === 1 &&
      state.agentRuntime?.runtime?.ready === true &&
      state.agentRuntime?.runtime?.source === "rust-wasm" &&
      state.agentRuntime?.authoritative?.currentTime?.seconds === state.snapshot.clockSeconds &&
      state.agentRuntime?.authoritative?.catalog?.catalogVersion === state.snapshot.catalogVersion &&
      state.agentRuntime?.derived?.availableCommands?.length === state.storyAgent.availableCommands.length &&
      state.agentRuntime?.derived?.availableCommands?.every((command) =>
        Object.prototype.hasOwnProperty.call(command, "whyUnavailable"),
      ) &&
      Array.isArray(state.agentRuntime?.derived?.blockers) &&
      state.agentRuntime?.diagnostics?.layerAuthority?.authoritative === "rust-wasm-snapshot" &&
      state.catalog?.resourceCount > 0 &&
      state.catalog?.tileCount > 0,
    consoleErrors,
  )

  assert.equal(initial.boundary.runtimeAuthority, "rust-wasm")
  assert.equal(initial.boundary.firstTargetApp, "apps/add-rpg")
  assert.equal(initial.runtime.error, null)
  assert.match(initial.shell.interfaceHierarchy.questions.whereAmI, /World/)
  assert.equal(initial.shell.interfaceHierarchy.secondary.actionLabel, initial.shell.currentAction.label)
  assert.equal(initial.shell.interfaceHierarchy.secondary.actionEnabled, initial.shell.currentAction.enabled)
  assert.ok(
    ["first_playable", "discovery"].includes(initial.shell.currentAction.source),
    "Initial current action should be owned by the tutorial or discovery loop.",
  )
  assert.equal(initial.shell.currentAction.source, "first_playable")
  assert.equal(initial.shell.currentAction.kind, "route_to_studio")
  assert.equal(initial.shell.currentAction.primaryLabel, "Preview route to Studio")
  assert.match(initial.shell.currentAction.detail, /unlock Base management/i)
  assert.equal(initial.ui.firstPlayable.currentAction.type, "preview_route_to_base")
  assert.equal(initial.storyAgent.activeBeat.label, "Road to Base")
  assert.equal(initial.storyAgent.primaryAction.source, "first_playable")
  assert.equal(initial.storyAgent.primaryAction.stepId, "reach-base")
  assert.equal(initial.storyAgent.primaryAction.commandId, null)
  assert.equal(initial.agentRuntime.contract, "agent_runtime_v1")
  assert.equal(initial.agentRuntime.authoritative.story.activeBeatId, "story.beat.road_to_base")
  assert.equal(initial.agentRuntime.derived.map.mode, "overworld_hex")
  assert.ok(
    initial.agentRuntime.derived.blockers.some(
      (blocker) => blocker.kind === "command_unavailable" && blocker.reason.length > 0,
    ),
    "Agent runtime report should explain unavailable commands from domain state.",
  )
  const compactAgentReport = await page.evaluate(() => {
    if (typeof window.render_add_runtime_text !== "function") {
      throw new Error("render_add_runtime_text is not installed")
    }
    return window.render_add_runtime_text()
  })
  assert.match(compactAgentReport, /runtime ready source=rust-wasm/)
  const jsonAgentReport = await page.evaluate(() => {
    if (typeof window.render_add_runtime_json !== "function") {
      throw new Error("render_add_runtime_json is not installed")
    }
    return JSON.parse(window.render_add_runtime_json())
  })
  assert.equal(jsonAgentReport.contract, "agent_runtime_v1")
  assert.equal(jsonAgentReport.authoritative.currentTime.seconds, initial.snapshot.clockSeconds)
  assert.deepEqual(jsonAgentReport.derived.enabledCommandIds, initial.agentRuntime.derived.enabledCommandIds)
  assert.ok(
    initial.storyAgent.commandIds.includes(
      "story-choice:story.beat.road_to_base:story.choice.road.follow_signal",
    ),
    "Agent story API should expose story choice command IDs.",
  )
  assert.ok(
    initial.storyAgent.availableCommands.some(
      (command) =>
        command.id === "story-choice:story.beat.road_to_base:story.choice.road.follow_signal" &&
        command.enabled === true &&
        command.workerType === "chooseStoryOption" &&
        command.relatedBeatId === "story.beat.road_to_base",
    ),
    "Agent story API should expose command metadata without scraping UI copy.",
  )
  assert.ok(
    initial.storyAgent.nextBeatCandidates.some(
      (candidate) =>
        candidate.id === "story.beat.road_to_base" &&
        candidate.status === "current" &&
        candidate.reason === "active",
    ),
    "Agent story API should expose the active beat as a next candidate.",
  )
  assert.ok(
    initial.storyAgent.completedArcProgress.some(
      (progress) =>
        progress.arc === "pre_arrival" &&
        progress.currentBeatId === "story.beat.road_to_base" &&
        progress.total >= 3,
    ),
    "Agent story API should expose arc progress.",
  )
  assert.equal(initial.shell.currentAction.primaryEnabled, true)
  assert.match(initial.shell.interfaceHierarchy.tertiary.waitForecast, /60m|Clock/)
  assertV1InterfaceContext(initial, "discovery", {
    source: ["first_playable", "discovery"],
  })
  assert.equal(await page.locator(".skip-link").count(), 1)
  assert.equal(await page.locator(".skip-link").getAttribute("href"), "#first-playable-panel")
  assert.equal(await page.locator("#current-action-surface").count(), 0)
  assert.equal(await page.locator("#discovery-panel").count(), 0)
  assert.equal(await page.locator("#first-playable-panel[aria-describedby]").count(), 1)
  assert.equal(await page.locator("#first-playable-body").isHidden(), true)
  await assertVisibleText(page, "#first-playable-panel", ["Reach the Studio", "0/11", "Show"])
  assert.equal(await page.locator(".first-playable-drag-handle[tabindex='0']").count(), 1)
  assert.equal(await page.locator("#add-world[data-visual-surface='map-stage']").count(), 1)
  assert.equal(await page.locator(".map-topbar[data-visual-surface='status']").count(), 1)
  await assertMapModeNavigationLabels(page, ["World", "Studio", "Cave"])
  assert.ok(
    !initial.mapMode.available.includes("base_square"),
    "Base navigation should stay hidden until the Hero reaches The Studio.",
  )
  await assertResourceStatusClarity(page)
  assert.equal(await page.locator("#first-playable-panel[data-visual-surface='objective']").count(), 1)
  assert.equal(await page.locator("#map-loading-state[data-visual-state='loading']").count(), 1)
  assert.equal(await page.locator(".shell-state-layer.error").count(), 0)
  assert.equal(await page.locator("#interface-hierarchy-brief").count(), 0)
  assert.equal(await page.locator("#discovery-next-action").count(), 0)
  assert.equal(await page.locator("#base-management-recommendation").count(), 0)
  assert.equal(await page.locator("#first-playable-action").count(), 0)
  await assertLayoutHierarchy(page, {
    expectedContextPanelId: null,
    expectedMapMode: "overworld_hex",
  })
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-desktop-discovery-hierarchy-smoke.png",
    "ADD RPG desktop Discovery layout hierarchy screenshot",
  )
  assert.equal(initial.snapshot.heroMap, initial.map.landmarks.survivorCave)
  assert.equal(initial.mapMode.scale.topology, "hex")
  assert.equal(initial.mapMode.scale.travelScale, "strategic")
  assert.equal(initial.mapMode.scale.timePerCellSeconds, 3600)
  assert.equal(initial.mapMode.scale.preserveAspectRatio, true)
  assert.ok(initial.ui.resourceCount > 0)
  assert.ok(initial.catalog.worldActionCount > 0)
  return initial
}

async function assertMapModeNavigationLabels(page, expectedLabels) {
  const labels = await page
    .locator(".map-mode-switcher .map-mode-label-full")
    .evaluateAll((elements) =>
      elements
        .map((element) => element.textContent?.trim() ?? "")
        .filter((label) => label.length > 0),
    )
  assert.deepEqual(labels, expectedLabels, "Map navigation should use player-facing labels.")
  assert.doesNotMatch(
    labels.join(" "),
    /\b(?:Overworld|Area|Dgn|Dungeon)\b/i,
    "Map navigation should not expose system/topology labels.",
  )
}

async function assertResourceStatusClarity(page) {
  const strip = page.locator("#resource-status-strip")
  await strip.waitFor({ state: "visible" })
  await expectResourceStripText(page, ["Bassline", "Chorus", "Stone", "Water"])

  const resources = await strip.locator("[data-resource]").evaluateAll((elements) =>
    elements.map((element) => ({
      id: element.getAttribute("data-resource") ?? "",
      title: element.getAttribute("title") ?? "",
      ariaLabel: element.getAttribute("aria-label") ?? "",
    })),
  )
  assert.ok(resources.length >= 4, "Resource strip should expose the four first-playable resources.")
  for (const resource of resources.slice(0, 4)) {
    assert.match(resource.title, /Source: .+ Used for: /, `${resource.id} should explain source and use in its tooltip.`)
    assert.match(resource.ariaLabel, /Source: .+ Used for /, `${resource.id} should explain source and use to assistive tech.`)
  }
}

async function expectResourceStripText(page, expectedLabels) {
  const text = await page.locator("#resource-status-strip").innerText()
  for (const label of expectedLabels) {
    assert.match(text, new RegExp(label, "i"), `Resource strip should include ${label}.`)
  }
}

async function assertAdminDeveloperSeparation(page, consoleErrors) {
  assert.equal(
    await page.locator("#settings-view").evaluate((element) => getComputedStyle(element).visibility),
    "hidden",
    "Closed settings window should not stay keyboard reachable off screen.",
  )
  assert.equal(
    await page.locator("#admin-view").evaluate((element) => getComputedStyle(element).visibility),
    "hidden",
    "Closed admin drawer should not stay keyboard reachable off screen.",
  )
  assert.equal(
    await page.locator("#dev-view").evaluate((element) => getComputedStyle(element).visibility),
    "hidden",
    "Closed dev drawer should not stay keyboard reachable off screen.",
  )

  const settings = await openSettings(page, consoleErrors)
  assert.equal(settings.shell.settingsOpen, true)
  assert.equal(settings.shell.adminOpen, false)
  assert.equal(settings.shell.devToolsOpen, false)
  assert.equal(settings.shell.interfaceHierarchy.settings.open, true)
  assert.equal(settings.shell.interfaceHierarchy.settings.presentation, "hex_window")
  assert.equal(settings.shell.interfaceHierarchy.settings.audio.muted, false)
  assert.equal(settings.shell.interfaceHierarchy.settings.audio.masterVolume, 0.8)
  assert.equal(settings.shell.interfaceHierarchy.settings.audio.musicVolume, 0.6)
  assert.equal(settings.shell.interfaceHierarchy.settings.audio.sfxVolume, 0.8)
  const settingsStyle = await page.locator("#settings-view").evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      clipPath: style.clipPath,
      position: style.position,
      visibility: style.visibility,
    }
  })
  assert.equal(settingsStyle.position, "fixed")
  assert.equal(settingsStyle.visibility, "visible")
  assert.match(settingsStyle.clipPath, /polygon/i, "Settings should render as a hex-shaped window.")
  await page.locator("#close-settings").focus()
  await waitForTextState(
    page,
    (state) => state.shell?.accessibility?.focusedRegion === "settings",
    consoleErrors,
  )
  await assertPopinKeyboardNavigation(page, {
    rootSelector: "#settings-view",
    textSectionSelector: ".settings-panel.keyboard-section",
    firstStopClass: "settings-drag-handle",
    label: "Settings",
  })
  const settingsText = await page.locator("#settings-view").innerText()
  ;[
    "Sound",
    "Mute all",
    "Master volume",
    "Music",
    "Effects",
    "Play pace",
    "World clock",
    "Interface",
    "Objective tracker",
    "Motion",
    "Save data",
    "Autosave",
  ].forEach((expectedText) => {
    assert.match(
      settingsText,
      new RegExp(expectedText, "i"),
      `Player Settings should include ${expectedText}.`,
    )
  })
  await page.locator("#settings-toggle-mute").click()
  const mutedSettings = await waitForTextState(
    page,
    (state) =>
      state.shell?.interfaceHierarchy?.settings?.audio?.muted === true &&
      state.shell?.interfaceHierarchy?.settings?.audio?.effectiveMusicVolume === 0 &&
      state.shell?.interfaceHierarchy?.settings?.audio?.effectiveSfxVolume === 0,
    consoleErrors,
  )
  assert.equal(mutedSettings.shell.interfaceHierarchy.settings.audio.muted, true)
  await page.locator("#settings-master-volume").evaluate((element) => {
    const input = element
    input.value = "0.35"
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await waitForTextState(
    page,
    (state) => state.shell?.interfaceHierarchy?.settings?.audio?.masterVolume === 0.35,
    consoleErrors,
  )
  await page.locator("#settings-reset-audio").click()
  await waitForTextState(
    page,
    (state) =>
      state.shell?.interfaceHierarchy?.settings?.audio?.muted === false &&
      state.shell?.interfaceHierarchy?.settings?.audio?.masterVolume === 0.8,
    consoleErrors,
  )
  assert.doesNotMatch(
    settingsText,
    /Runtime internals|Save payload|Import text|Advance 5s|Snapshot|Debug/i,
    "Player Settings should not expose developer/runtime internals.",
  )
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-settings-smoke.png",
    "ADD RPG player settings screenshot",
  )
  await page.locator("#close-settings").focus()
  await page.keyboard.press("Enter")
  await waitForTextState(
    page,
    (state) => state.shell?.settingsOpen === false,
    consoleErrors,
  )
  await page.waitForTimeout(240)

  const opened = await openAdmin(page, consoleErrors)
  assert.equal(opened.shell.adminOpen, true)
  assert.equal(opened.shell.settingsOpen, false)
  assert.equal(opened.shell.devToolsOpen, false)
  assert.equal(opened.shell.interfaceHierarchy.advanced.adminOpen, true)
  assert.equal(opened.shell.interfaceHierarchy.advanced.developerOpen, false)
  assert.equal(opened.shell.interfaceHierarchy.advanced.runtimeInternalsHiddenByDefault, true)
  await page.locator("#close-admin").focus()
  await waitForTextState(
    page,
    (state) => state.shell?.accessibility?.focusedRegion === "admin",
    consoleErrors,
  )
  await assertPopinKeyboardNavigation(page, {
    rootSelector: "#admin-view",
    textSectionSelector: "#admin-run-status.keyboard-section",
    firstStopId: "close-admin",
    label: "Admin",
  })

  const adminText = await page.locator("#admin-view").innerText()
  ;[
    "Run status",
    "Story content",
    "Beat eligibility · TS best-effort",
    "TS best-effort diagnostic mirror",
    "Available commands",
    "Qualities",
    "Run recovery",
    "World actions",
  ].forEach((expectedText) => {
    assert.match(
      adminText,
      new RegExp(expectedText, "i"),
      `Clean Admin view should include ${expectedText}.`,
    )
  })
  assert.doesNotMatch(
    adminText,
    /UI -> Worker|Snapshot|Save payload|Runtime internals|Advance 5s|Import text/i,
    "Clean Admin view should not expose runtime internals or raw save payload tools.",
  )
  assert.equal(
    await page.locator("#admin-story-browser").isVisible(),
    true,
    "Clean Admin view should expose the story/content browser.",
  )
  // `ui.panel.narrative` names the five beats of the opening arc, and the story
  // renderer draws them. Nothing in the app source lists those beats, so this
  // asserts the story kind end to end — and a schema panel that fails to render
  // does so silently, which is how the first one shipped empty while green.
  const narrativeBeatRows = await page.evaluate(() => {
    const panel = document.querySelector('[data-qa="schema-context-ui-panel-narrative"]')
    if (!panel) return null
    return {
      rows: panel.querySelectorAll('[data-entity="story"]').length,
      statuses: [...panel.querySelectorAll("[data-beat-status]")].map((row) =>
        row.getAttribute("data-beat-status"),
      ),
    }
  })
  assert.ok(narrativeBeatRows, "The catalog-driven narrative panel should be on screen.")
  assert.equal(
    narrativeBeatRows.rows,
    5,
    "The narrative panel should draw the five beats its catalog entry names.",
  )
  assert.ok(
    narrativeBeatRows.statuses.every((status) =>
      ["completed", "current", "upcoming"].includes(status),
    ),
    `Every beat row should carry a real status, got ${JSON.stringify(
      narrativeBeatRows.statuses,
    )}.`,
  )

  assert.equal(await page.locator("#save-payload").isVisible(), false)
  assert.equal(await page.locator("#dev-view").isVisible(), false)
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-admin-clean-smoke.png",
    "ADD RPG clean admin screenshot",
  )

  const revealed = await openDeveloperTools(page, consoleErrors)
  assert.equal(revealed.shell.settingsOpen, false)
  assert.equal(revealed.shell.adminOpen, false)
  assert.equal(revealed.shell.devToolsOpen, true)
  assert.equal(revealed.shell.interfaceHierarchy.advanced.adminOpen, false)
  assert.equal(revealed.shell.interfaceHierarchy.advanced.developerOpen, true)
  await page.locator("#save-payload").waitFor({ state: "visible" })
  await assertPopinKeyboardNavigation(page, {
    rootSelector: "#dev-view",
    textSectionSelector: "#dev-runtime-internals.keyboard-section",
    firstStopId: "close-dev",
    label: "Developer menu",
  })
  const devText = await page.locator("#developer-tools-body").innerText()
  assert.match(devText, /Runtime internals/i)
  assert.match(devText, /UI -> Worker -> Rust\/WASM -> Snapshot/i)
  assert.match(devText, /Import text/i)

  await page.keyboard.press("Escape")
  await waitForTextState(
    page,
    (state) =>
      state.shell?.settingsOpen === false &&
      state.shell?.adminOpen === false &&
      state.shell?.devToolsOpen === false &&
      state.shell?.accessibility?.focusedRegion === "menu",
    consoleErrors,
  )
  await page.waitForFunction(() => document.activeElement?.id === "open-shell-menu", { timeout: qaTimeout(15000) })
  assert.equal(await page.locator("#open-shell-menu").evaluate((element) => document.activeElement === element), true)
  await openAdmin(page, consoleErrors)
  await closeAdmin(page, consoleErrors)
  const closed = await renderGameToText(page)
  assert.equal(closed.shell.settingsOpen, false)
  assert.equal(closed.shell.adminOpen, false)
  assert.equal(closed.shell.devToolsOpen, false)
  assert.equal(
    await page.locator("#admin-view").evaluate((element) => getComputedStyle(element).visibility),
    "hidden",
    "Closed admin drawer should be hidden after normal close.",
  )
}

async function assertPopinKeyboardNavigation(page, options) {
  const { rootSelector, textSectionSelector, firstStopClass, firstStopId, label } = options
  await page.locator(textSectionSelector).first().waitFor({ state: "visible" })
  await page.locator(textSectionSelector).first().focus()
  let snapshot = await settlePopinFocus(page, {
    rootSelector,
    label,
    description: "a readable text section",
    refocus: () => page.locator(textSectionSelector).first().focus(),
    matches: (candidate) => candidate.activeClassName.includes("keyboard-section"),
  })
  assert.equal(
    snapshot.activeInsideRoot,
    true,
    `${label} text section should be reachable by keyboard focus.`,
  )
  assert.ok(
    snapshot.activeClassName.includes("keyboard-section"),
    `${label} should include readable text sections in the Tab order.`,
  )

  await focusPopinStop(page, rootSelector, -1)
  await settlePopinFocus(page, {
    rootSelector,
    label,
    description: "the last focus stop",
    refocus: () => focusPopinStop(page, rootSelector, -1),
    matches: (candidate) => candidate.activeIndex === candidate.stopCount - 1,
  })
  await page.keyboard.press("Tab")
  snapshot = await popinKeyboardSnapshot(page, rootSelector)
  assert.equal(snapshot.activeInsideRoot, true, `${label} Tab cycle should stay inside the pop-in.`)
  assert.equal(
    snapshot.activeIndex,
    0,
    `${label} Tab from the last stop should loop back to the first pop-in stop.`,
  )
  if (firstStopId) {
    assert.equal(
      snapshot.activeId,
      firstStopId,
      `${label} first focus stop should be ${firstStopId}.`,
    )
  } else {
    assert.ok(
      snapshot.activeClassName.includes(firstStopClass),
      `${label} first focus stop should be the expected panel/navigation start.`,
    )
  }
}

/**
 * Wait until keyboard focus has come to rest where the caller put it.
 *
 * A pop-in focuses its own control shortly after opening, and that can land
 * after a deliberate `.focus()` from the test. The keyboard assertions below
 * then read whichever element won the race, and fail for a timing reason
 * rather than a real focus regression. Re-focus until `matches` holds on two
 * samples `HOLD_MS` apart, so a late steal cannot slip in between the check
 * and the caller's next keypress.
 */
async function settlePopinFocus(page, options) {
  const { rootSelector, label, description, refocus, matches, timeoutMs = 4000 } = options
  const HOLD_MS = 150
  const startedAt = Date.now()
  let snapshot = null

  while (Date.now() - startedAt < timeoutMs) {
    snapshot = await popinKeyboardSnapshot(page, rootSelector)
    if (matches(snapshot)) {
      await page.waitForTimeout(HOLD_MS)
      const held = await popinKeyboardSnapshot(page, rootSelector)
      if (matches(held)) return held
      snapshot = held
    }
    await refocus()
    await page.waitForTimeout(100)
  }

  throw new Error(
    `${label} focus never settled on ${description} in ${rootSelector}. ` +
      `Last snapshot: ${JSON.stringify(snapshot)}`,
  )
}

async function focusPopinStop(page, rootSelector, index) {
  await page.evaluate(
    ({ rootSelector, index }) => {
      const root = document.querySelector(rootSelector)
      if (!(root instanceof HTMLElement)) throw new Error(`Missing ${rootSelector}`)
      const stops = Array.from(
        root.querySelectorAll(
          [
            "a[href]",
            "button:not([disabled])",
            "input:not([disabled])",
            "select:not([disabled])",
            "textarea:not([disabled])",
            "summary",
            "[tabindex]:not([tabindex='-1'])",
          ].join(", "),
        ),
      ).filter((element) => {
        if (!(element instanceof HTMLElement)) return false
        if (element.closest("[hidden], [aria-hidden='true']")) return false
        const style = getComputedStyle(element)
        if (style.display === "none" || style.visibility === "hidden") return false
        const rect = element.getBoundingClientRect()
        return rect.width > 0 || rect.height > 0
      })
      if (stops.length === 0) throw new Error(`No focus stops in ${rootSelector}`)
      const resolvedIndex = index < 0 ? stops.length + index : index
      stops[Math.max(0, Math.min(stops.length - 1, resolvedIndex))].focus()
    },
    { rootSelector, index },
  )
}

async function popinKeyboardSnapshot(page, rootSelector) {
  return page.evaluate((rootSelector) => {
    const root = document.querySelector(rootSelector)
    if (!(root instanceof HTMLElement)) throw new Error(`Missing ${rootSelector}`)
    const stops = Array.from(
      root.querySelectorAll(
        [
          "a[href]",
          "button:not([disabled])",
          "input:not([disabled])",
          "select:not([disabled])",
          "textarea:not([disabled])",
          "summary",
          "[tabindex]:not([tabindex='-1'])",
        ].join(", "),
      ),
    ).filter((element) => {
      if (!(element instanceof HTMLElement)) return false
      if (element.closest("[hidden], [aria-hidden='true']")) return false
      const style = getComputedStyle(element)
      if (style.display === "none" || style.visibility === "hidden") return false
      const rect = element.getBoundingClientRect()
      return rect.width > 0 || rect.height > 0
    })
    const active = document.activeElement
    return {
      activeInsideRoot: active instanceof HTMLElement && root.contains(active),
      activeIndex: stops.indexOf(active),
      activeId: active instanceof HTMLElement ? active.id : "",
      activeClassName: active instanceof HTMLElement ? active.className.toString() : "",
      stopCount: stops.length,
    }
  }, rootSelector)
}

function assertInitialVisibilityContract(initial) {
  assertInitialDiscoveryAnchors(initial)
  assert.ok(initial.map.visibility.hiddenCells > 0, "Initial overworld should contain hidden cells")
  assert.ok(initial.map.knownFacts.hiddenCells > 0)
  assert.ok(initial.map.knownFacts.exactTerrainKnownCells > 0)
  assert.ok(initial.map.knownFacts.dynamicRiskKnownCells > 0)
  assert.ok(initial.map.knownFacts.vagueTravelLabels > 0)
  assert.equal(typeof initial.map.knownFacts.sampleHiddenTravelLabel, "string")
  assert.ok(initial.map.knownFacts.sampleHiddenTravelLabel.length > 0)
  assert.ok(initial.map.knownFacts.dynamicRiskKnownCells < initial.map.cells.total)
  assert.equal(initial.map.visibility.hiddenCells, initial.map.knownFacts.hiddenCells)
  assert.ok(initial.map.visibility.visibleCells > 0)
  assert.equal(
    initial.map.visibility.discoveredCells,
    0,
    "Initial cave-radius cells should be currently visible, not stale remembered cells.",
  )
  assert.equal(initial.map.visibility.fogRendering, "phaser_visual_overlay")
  assert.equal(initial.map.visibility.affectsAuthority, false)
  assert.equal(initial.map.visibility.travelRevealPreviewActive, false)
  assert.equal(initial.map.visibility.travelRevealPreviewCells, 0)
  assert.equal(
    initial.map.visibility.hiddenCellRendering,
    "invisible_until_known_or_travel_revealed",
  )
  assert.equal(initial.map.interaction.visibilitySamples.hidden.label, "Unknown region")
  assert.equal(initial.map.interaction.visibilitySamples.hidden.knownInfoLevel, "unknown")
  assert.equal(initial.map.interaction.visibilitySamples.hidden.dungeonLinks.length, 0)
  assert.equal(initial.map.interaction.visibilitySamples.hidden.dungeonActionsVisible, false)
  assert.equal(initial.map.interaction.visibilitySamples.discovered, null)
  assert.equal(initial.map.interaction.visibilitySamples.visible.knownInfoLevel, "full_current")
  assert.ok(
    initial.map.character.dungeonLinksAtCell.length > 0,
    "The visible Survivor Cave can expose its dungeon link once discovered/visible.",
  )
  assert.equal(
    initial.map.presentation.visibilityPolish.fogEdge,
    "soft_feathered_visibility_boundary",
  )
  assert.equal(initial.map.presentation.visibilityPolish.revealEffect, "expanding_ripple")
  assert.equal(initial.map.presentation.visibilityPolish.caveMouthSilhouettes, true)
  assert.equal(
    initial.map.presentation.visibilityPolish.travelReveal,
    "progressive_in_travel_radius",
  )
  assert.equal(initial.map.presentation.visibilityPolish.authority, "visual_only")
  assert.ok(initial.map.presentation.visibilityPolish.laterModifiers.includes("day_night_radius"))
  assert.ok(initial.map.presentation.visibilityPolish.laterModifiers.includes("weather_season"))
  assert.ok(
    initial.map.presentation.visibilityPolish.laterModifiers.includes(
      "scouting_buildings_items",
    ),
  )
}

function assertFirstPlayableComplete(firstPlayable) {
  assert.equal(firstPlayable.ui.firstPlayable.complete, true)
  assert.equal(firstPlayable.snapshot.base.studioRestored, true)
  assert.equal(firstPlayable.snapshot.base.firePitBuilt, true)
  assert.equal(firstPlayable.ui.recruitmentEnabled, true)
  assert.ok(firstPlayable.snapshot.bubble.reachFromBase >= 3)
  assert.ok(firstPlayable.snapshot.recruitment.totalRecruitedThisRun >= 1)
  assert.ok(
    firstPlayable.snapshot.recruitment.pendingCount > 0 ||
      firstPlayable.snapshot.roster.totalCrew > 2,
  )
}

async function exerciseMapModeSwitching(page, consoleErrors) {
  await clickMapMode(page, "dungeon_square")
  const dungeon = await waitForTextState(
    page,
    (state) =>
      state.mapMode?.active === "dungeon_square" &&
      state.mapMode?.topology === "square" &&
      state.mapMode?.fixture === false &&
      state.map?.topology?.kind === "square" &&
      state.map?.topology?.fixture === false &&
      typeof state.map?.mapId === "string" &&
      state.map.mapId.startsWith("add.rpg.dungeon.") &&
      state.map?.cells?.total > 100 &&
      state.map?.cells?.blocked > 0 &&
      state.map?.cells?.bubbleEdge === 0 &&
      // Dungeon FOV: a wall-occluded cone limits what is lit, so some cells are
      // visible and most stay hidden until explored.
      state.map?.visibility?.visibleCells > 0 &&
      state.map?.visibility?.hiddenCells > 0 &&
      state.map?.presentation?.transitionState &&
      state.map?.presentation?.landmarkSprites === "procedural_sprite_stack",
    consoleErrors,
  )
  assert.ok(dungeon.map.cells.total !== dungeon.snapshot.hexCount)
  await assertNonBlankNamedMapScreenshot(
    page,
    "add-rpg-dungeon-map-smoke.png",
    "ADD RPG square dungeon map screenshot",
  )

  await selectMapCenter(page)
  await waitForTextState(
    page,
    (state) =>
      state.mapMode?.active === "dungeon_square" &&
      typeof state.map?.interaction?.selectedCell === "string" &&
      state.map.interaction.selectedCell.startsWith("square:"),
    consoleErrors,
  )

  assert.equal(
    await page.locator("#map-mode-base_square").count(),
    0,
    "Base map mode should stay hidden until the Hero reaches The Studio.",
  )

  await clickMapMode(page, "overworld_hex")
  return waitForTextState(
    page,
    (state) =>
      state.mapMode?.active === "overworld_hex" &&
      state.mapMode?.topology === "hex" &&
      state.map?.topology?.kind === "hex" &&
      state.map?.cells?.total === state.snapshot?.hexCount &&
      state.map?.visibility?.hiddenCells > 0,
    consoleErrors,
  )
}

async function unlockBaseNavigationByTravelingToStudio(page, consoleErrors, canonicalIdleLoop) {
  await returnToOverworld(page, consoleErrors)
  let state = await renderGameToText(page)
  const targetCell = `hex:${state.map?.landmarks?.baseCenter}`
  assert.ok(/^hex:-?\d+,-?\d+$/.test(targetCell), "Studio base center should be a hex cell.")
  assert.equal(
    targetCell,
    canonicalIdleLoop.studioCell,
    "browser Studio target must match the canonical Rust scenario endpoint",
  )
  if (state.map?.character?.cell === targetCell) {
    assert.ok(
      state.mapMode?.available?.includes("base_square"),
      "Base navigation should be available once the Hero is already at The Studio.",
    )
    await assertMapModeNavigationLabels(page, ["World", "Studio", "Cave", "Base"])
    return state
  }
  assert.ok(
    !state.mapMode?.available?.includes("base_square"),
    "Base navigation should be hidden before the Hero reaches The Studio.",
  )

  for (let step = 0; step < 14 && state.map?.character?.cell !== targetCell; step += 1) {
    const fromCell = state.map.character.cell
    const nextCell = nextHexStepToward(fromCell, targetCell)
    const keys = keyboardKeysForCellStep(fromCell, nextCell)
    await pressTravelKeys(page, keys)
    await resolveTravelDialogIfNeeded(page, consoleErrors)
    state = await waitForTextState(
      page,
      (nextState) =>
        nextState.mapMode?.active === "overworld_hex" &&
        nextState.map?.character?.cell === nextCell &&
        nextState.map.character.moving === false &&
        nextState.map.character.lastMoveAccepted === true &&
        nextState.ui?.worldTime?.animating === false,
      consoleErrors,
      10000,
    )
  }

  assert.equal(state.map.character.cell, targetCell)
  const unlocked = await waitForTextState(
    page,
    (nextState) =>
      nextState.map?.character?.cell === targetCell &&
      nextState.mapMode?.available?.includes("base_square") &&
      nextState.shell?.currentAction?.kind === "open_base" &&
      nextState.shell.currentAction.sourceLabel === "Arrival" &&
      /Arrived at The Studio/i.test(nextState.shell.currentAction.progressLabel ?? "") &&
      nextState.shell.currentAction.primaryLabel === "Open base management" &&
      nextState.shell.currentAction.primaryEnabled === true,
    consoleErrors,
  )
  assert.equal(
    unlocked.map?.presentation?.mapPrimaryAffordances?.studioArrivalEmphasisVisible,
    true,
    "Studio landmark should be visually emphasized once the Hero arrives.",
  )
  await assertMapModeNavigationLabels(page, ["World", "Studio", "Cave", "Base"])
  assert.equal(await page.locator("#map-mode-base_square").count(), 1)
  return unlocked
}

async function pressTravelKeys(page, keys) {
  for (const key of keys) await page.keyboard.down(key)
  await page.waitForTimeout(90)
  for (const key of [...keys].reverse()) await page.keyboard.up(key)
}

async function resolveTravelDialogIfNeeded(page, consoleErrors) {
  await waitForTextState(
    page,
    (state) =>
      state.travel?.confirmation?.dialogOpen === true ||
      state.travel?.active === true ||
      state.map?.character?.moving === true,
    consoleErrors,
    2000,
  )
  for (let index = 0; index < 3; index += 1) {
    const state = await renderGameToText(page)
    if (!state.travel?.confirmation?.dialogOpen) return
    const dialogKind = state.travel.confirmation.dialogKind
    const selector =
      dialogKind === "dramatic_reprise"
        ? "#travel-dialog-venture"
        : dialogKind === "first_declined"
          ? "#travel-dialog-dismiss"
          : "#travel-dialog-confirm"
    await page.locator(selector).click()
    await page.waitForTimeout(80)
  }
}

function nextHexStepToward(fromCell, toCell) {
  const from = parseSmokeCell(fromCell)
  const to = parseSmokeCell(toCell)
  if (!from || !to || from.kind !== "hex" || to.kind !== "hex") {
    throw new Error(`Expected hex route cells, got ${fromCell} -> ${toCell}`)
  }
  const neighbors = [
    { a: from.a, b: from.b - 1 },
    { a: from.a + 1, b: from.b - 1 },
    { a: from.a + 1, b: from.b },
    { a: from.a, b: from.b + 1 },
    { a: from.a - 1, b: from.b + 1 },
    { a: from.a - 1, b: from.b },
  ]
  const next = neighbors
    .map((cell) => ({
      ...cell,
      distance: hexDistance(cell, to),
    }))
    .sort((a, b) => a.distance - b.distance)[0]
  return `hex:${next.a},${next.b}`
}

function hexDistance(from, to) {
  const dq = from.a - to.a
  const dr = from.b - to.b
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

async function exerciseBaseManagementSurface(page, consoleErrors) {
  const before = await renderGameToText(page)
  assert.ok(
    before.mapMode?.available?.includes("base_square"),
    "Base management can only be opened after the Studio arrival unlock.",
  )
  await clickMapMode(page, "base_square")
  const base = await waitForTextState(
    page,
    (state) =>
      state.mapMode?.active === "base_square" &&
      state.shell?.adminOpen === false &&
      state.baseManagement?.active === true &&
      state.baseManagement?.title === "The Studio" &&
      state.baseManagement?.tabIds?.includes("crystal") &&
      state.baseManagement?.tabIds?.includes("build") &&
      state.baseManagement?.tabIds?.includes("power") &&
      state.baseManagement?.tabIds?.includes("crew") &&
      state.baseManagement?.tabIds?.includes("social") &&
      state.baseManagement?.tabIds?.includes("expeditions") &&
      state.baseManagement?.tabIds?.includes("resonance") &&
      state.baseManagement?.tabIds?.includes("processing") &&
      state.baseManagement?.resourcePressure?.some((resource) => resource.id === "resource.bassline") &&
      state.baseManagement?.resourcePressure?.every(
        (resource) =>
          typeof resource.gainPerSecond === "number" &&
          typeof resource.spendPerSecond === "number" &&
          typeof resource.netPerSecond === "number" &&
          (resource.productionZeroReason === null ||
            typeof resource.productionZeroReason === "string"),
      ) &&
      state.baseManagement?.rolePressure?.some((role) => role.id === "role.crystal_bassline") &&
      state.baseManagement?.economy?.waitForecasts?.length === 3 &&
      state.baseManagement?.economy?.waitForecasts?.some((forecast) => forecast.label === "1m") &&
      state.baseManagement?.economy?.waitForecasts?.some((forecast) => forecast.label === "5m") &&
      state.baseManagement?.economy?.waitForecasts?.some((forecast) => forecast.label === "30m") &&
      state.baseManagement?.staffing?.presets?.some((preset) => preset.id === "balanced") &&
      state.baseManagement?.staffing?.presets?.some((preset) => preset.id === "push_reach") &&
      state.baseManagement?.staffing?.presets?.some((preset) => preset.id === "gather_stone") &&
      state.baseManagement?.staffing?.presets?.some((preset) => preset.id === "recover_power") &&
      state.baseManagement?.staffing?.slotPools?.some((pool) => pool.id === "crystal_circle") &&
      state.baseManagement?.staffing?.slotPools?.some((pool) => pool.id === "fire_pit") &&
      state.baseManagement?.stationMachine?.cards?.some((card) => card.id === "station.studio") &&
      state.baseManagement?.stationMachine?.cards?.some((card) => card.id === "station.crystal_circle") &&
      state.baseManagement?.stationMachine?.cards?.some((card) => card.id === "station.fire_pit") &&
      state.baseManagement?.stationMachine?.groups?.some((group) => group.id === "studio") &&
      state.baseManagement?.stationMachine?.groups?.some((group) => group.id === "crystal") &&
      typeof state.baseManagement?.socialPressure?.headline === "string" &&
      typeof state.baseManagement?.socialPressure?.vibes?.explanation === "string" &&
      typeof state.baseManagement?.socialPressure?.housing?.warning === "string" &&
      typeof state.baseManagement?.socialPressure?.recruitment?.costProjection === "string" &&
      typeof state.baseManagement?.socialPressure?.supportForecast?.copy === "string" &&
      state.baseManagement?.expeditions?.targets?.some(
        (target) => target.id === "expedition.local_scavenge_sweep",
      ) &&
      typeof state.baseManagement?.expeditions?.summary === "string" &&
      state.baseManagement?.resonance?.recipes?.some(
        (recipe) => recipe.id === "resonance.recipe.bassline_overtone",
      ) &&
      typeof state.baseManagement?.resonance?.summary === "string" &&
      state.baseManagement?.playerLoop?.steps?.length === 8 &&
      state.baseManagement?.playerLoop?.steps?.filter((step) => step.status === "current").length === 1 &&
      typeof state.baseManagement?.playerLoop?.health?.label === "string" &&
      typeof state.baseManagement?.playerLoop?.rateWatch?.summary === "string" &&
      typeof state.baseManagement?.playerLoop?.returnPlan?.summary === "string" &&
      typeof state.baseManagement?.recommendedAction?.label === "string" &&
      typeof state.baseManagement?.nextBottleneck?.label === "string" &&
      (state.baseManagement?.rateChange === null ||
        (typeof state.baseManagement?.rateChange?.summary === "string" &&
          Array.isArray(state.baseManagement?.rateChange?.changes))),
    consoleErrors,
  )
  assert.equal(base.shell.adminOpen, false)
  assert.equal(base.shell.currentAction.source, "base_loop")
  assert.equal(base.shell.currentAction.label, base.baseManagement.recommendedAction.label)
  assertV1InterfaceContext(base, "base", { source: "base_loop" })
  assert.ok(base.baseManagement.recommendedAction.kind.length > 0)
  assert.deepEqual(
    base.baseManagement.playerLoop.steps.map((step) => step.id),
    [
      "check_health",
      "see_bottleneck",
      "act",
      "watch_rates",
      "push_growth",
      "come_back",
      "review_return",
      "decide_again",
    ],
    "Base player loop should expose the full idle decision cadence.",
  )
  assert.ok(
    ["stable", "strained", "critical"].includes(base.baseManagement.playerLoop.health.status),
    "Base player loop should expose a stable health status.",
  )
  assert.ok(
    base.baseManagement.playerLoop.rateWatch.rates.length > 0,
    "Base player loop should expose visible rates to watch after actions.",
  )
  assert.ok(
    typeof base.baseManagement.playerLoop.decisionHint === "string" &&
      base.baseManagement.playerLoop.decisionHint.length > 0,
    "Base player loop should explain how to make the next decision.",
  )
  assert.ok(base.baseManagement.resourcePressure.length >= 3)
  assert.ok(base.baseManagement.rolePressure.length >= 3)
  assert.ok(base.baseManagement.economy.waitForecasts.length, "Base economy should forecast wait outcomes.")
  assert.ok(
    base.baseManagement.economy.stalledSystems.every(
      (system) => typeof system.reason === "string" && system.reason.length > 0,
    ),
    "Every stalled base system should have a human-readable reason.",
  )
  assert.ok(
    typeof base.baseManagement.economy.offlinePreview.summary === "string" &&
      base.baseManagement.economy.offlinePreview.summary.length > 0,
    "Base economy should expose an offline preview summary.",
  )
  assert.ok(
    ["locked", "ready", "waiting_vibes", "pending_arrival", "housing_tight", "overcrowded"].includes(
      base.baseManagement.socialPressure.status,
    ),
    "Social pressure should expose a stable strategic status.",
  )
  assert.ok(
    typeof base.baseManagement.socialPressure.vibes.lossExplanation === "string" &&
      base.baseManagement.socialPressure.vibes.lossExplanation.length > 0,
    "Vibes should explain gain/loss pressure.",
  )
  assert.ok(
    typeof base.baseManagement.socialPressure.supportForecast.copy === "string" &&
      base.baseManagement.socialPressure.supportForecast.copy.length > 0,
    "Recruitment should forecast whether the base can support the recruit.",
  )
  assert.ok(
    base.baseManagement.rolePressure.some(
      (role) =>
        role.id === "role.crystal_bassline" &&
        role.slotPool === "crystal_circle" &&
        role.nextWorkerDeltaPerSecond > 0 &&
        typeof role.pressureCopy === "string",
    ),
    "Bassline staffing should expose slot pressure and next-worker impact.",
  )
  assert.ok(base.baseManagement.stationMachine.cards.length >= 7)
  assert.ok(
    base.baseManagement.stationMachine.cards.every(
      (card) =>
        typeof card.outputEffect === "string" &&
        card.outputEffect.length > 0 &&
        typeof card.brownoutPriorityCopy === "string" &&
        card.brownoutPriorityCopy.length > 0,
    ),
    "Every station machine card should explain output effect and brownout priority.",
  )
  assert.ok(
    base.baseManagement.stationMachine.cards.some(
      (card) =>
        card.id === "station.resonance_chamber" &&
        card.availableRecipeIds.includes("recipe.resonance_field_calibration"),
    ),
    "Resonance Chamber should expose its processing recipe.",
  )
  assert.ok(
    base.baseManagement.stationMachine.cards.some(
      (card) =>
        card.id === "station.crystal_circle" &&
        card.availableRecipeIds.includes("construction.slot_capacity"),
    ),
    "Crystal Circle should expose crystal upgrade work as recipes.",
  )
  assert.ok(base.baseManagement.buildLoop.projects.length >= 15)
  assert.deepEqual(
    [...base.baseManagement.buildLoop.groups.map((group) => group.id)].sort(),
    ["crystal", "housing", "repair", "station", "support"].sort(),
    "Construction loop should expose repair, crystal, station, housing, and support categories.",
  )
  ;[
    "project.expand_bunks",
    "project.safe_water_systems",
    "project.expedition_staging",
    "project.prepare_loudspeakers",
  ].forEach((projectId) => {
    assert.ok(
      base.baseManagement.buildLoop.projects.some(
        (project) =>
          project.id === projectId &&
          typeof project.resultPreview === "string" &&
          project.resultPreview.length > 0 &&
          typeof project.futureEconomyChange === "string" &&
          project.futureEconomyChange.length > 0,
      ),
      `Construction loop should expose project ${projectId} with future economy copy.`,
    )
  })

  await page.locator("#base-management-panel").waitFor({ state: "visible" })
  const panelText = await page.locator("#base-management-panel").innerText()
  ;[
    "The Studio",
    "Player loop",
    "Health",
    "Bottleneck",
    "Why now",
    "Start with the highlighted Base action",
    "Action",
    "If I wait",
    "Return",
    "Rates",
    "Check base health",
    "Make a better decision",
    "Base loop",
    "Current limiter",
    "Gain",
    "Spend",
    "Net",
    "1m",
    "5m",
    "30m",
    "Offline preview",
    "Crystal",
    "Build",
    "Power",
    "Crew",
    "Social",
    "Expeditions",
    "Resonance",
    "Processing",
  ].forEach((expectedText) => {
    assert.match(
      panelText,
      new RegExp(expectedText, "i"),
      `Base management panel should include ${expectedText}.`,
    )
  })
  assert.doesNotMatch(panelText, /Runtime|Snapshot|Debug/i)
  assert.doesNotMatch(
    panelText,
    /Road to Base|Follow the low signal|Keep moving through the ash/i,
    "Base mode should lead with base management, not overworld Discovery story copy.",
  )
  await assertLayoutHierarchy(page, {
    expectedContextPanelId: "base-management-panel",
    expectedMapMode: "base_square",
  })

  await clickVisibleElementByDomId(page, "base-tab-build")
  await waitForTextState(
    page,
    (state) => state.baseManagement?.active === true && state.baseManagement?.selectedTab === "build",
    consoleErrors,
  )
  const buildPanelText = await page.locator("#base-management-panel").innerText()
  ;[
    "Construction loop",
    "Repair",
    "Crystal",
    "Station",
    "Housing",
    "Support",
    "Expand Bunks",
    "Safer Water Systems",
    "Expedition Prep Structures",
    "Relay and Loudspeaker Prep",
    "Workers",
    "Missing resource",
    "Future economy",
  ].forEach((expectedText) => {
    assert.match(
      buildPanelText,
      new RegExp(expectedText, "i"),
      `Build panel should include ${expectedText}.`,
    )
  })
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-construction-loop-smoke.png",
    "ADD RPG construction loop surface screenshot",
  )
  await clickVisibleElementByDomId(page, "base-tab-crystal")
  await waitForTextState(
    page,
    (state) => state.baseManagement?.active === true && state.baseManagement?.selectedTab === "crystal",
    consoleErrors,
  )

  // `ui.panel.crystal` names a station, three resources, and
  // `crystal.removing_moss_unlocked` — a flag, whose id is namespaced by its
  // group rather than by its kind. Recognising it needs the catalog's flag ids,
  // not the prefix, and this is the assertion that the lookup is wired through.
  const crystalPanel = await page.evaluate(() => {
    const panel = document.querySelector('[data-qa="schema-context-ui-panel-crystal"]')
    if (!panel) return null
    const own = (selector) =>
      [...panel.querySelectorAll(selector)].filter((row) => row.closest("[data-qa]") === panel)
    return {
      stations: own('[data-entity="station"]').length,
      resources: own('[data-entity="resource"]').length,
      flags: own('[data-entity="flag"]').length,
      flagStates: own("[data-flag-set]").map((row) => row.getAttribute("data-flag-set")),
    }
  })
  assert.ok(crystalPanel, "The catalog-driven crystal panel should be on screen.")
  assert.equal(crystalPanel.stations, 1, "The crystal panel should draw the station it names.")
  assert.equal(crystalPanel.resources, 3, "The crystal panel should draw the three resources it names.")
  assert.equal(
    crystalPanel.flags,
    1,
    "The crystal panel should draw the flag it names, which no id prefix identifies as a flag.",
  )
  assert.ok(
    crystalPanel.flagStates.every((state) => state === "true" || state === "false"),
    `The flag row should report a real state, got ${JSON.stringify(crystalPanel.flagStates)}.`,
  )

  let staffingBaseline = await renderGameToText(page)
  const beforeBassline = staffingBaseline.baseManagement.rolePressure.find(
    (role) => role.id === "role.crystal_bassline",
  )
  assert.ok(beforeBassline)
  const staffingAction =
    staffingBaseline.baseManagement.staffing.freeCrew > 0
      ? { buttonId: "base-role-bassline-plus", crewDelta: 1, freeCrewDelta: -1 }
      : { buttonId: "base-role-bassline-minus", crewDelta: -1, freeCrewDelta: 1 }
  assert.ok(
    staffingAction.crewDelta > 0 || beforeBassline.crewAssigned > 0,
    "Bassline staffing smoke needs either free crew or an assigned worker to move.",
  )
  await clickVisibleElementByDomId(page, staffingAction.buttonId)
  const staffedBassline = await waitForTextState(
    page,
    (state) => {
      const role = state.baseManagement?.rolePressure?.find((candidate) => candidate.id === "role.crystal_bassline")
      return (
        state.baseManagement?.active === true &&
        role?.crewAssigned === beforeBassline.crewAssigned + staffingAction.crewDelta &&
        state.baseManagement?.staffing?.freeCrew ===
          staffingBaseline.baseManagement.staffing.freeCrew + staffingAction.freeCrewDelta &&
        Boolean(state.baseManagement?.rateChange?.changes?.length)
      )
    },
    consoleErrors,
  )
  assert.ok(
    typeof staffedBassline.baseManagement.staffing.visibleImpact.rateSummary === "string" &&
      staffedBassline.baseManagement.staffing.visibleImpact.rateSummary.length > 0,
    "Staffing impact should describe the changed economy.",
  )
  assert.ok(
    staffedBassline.baseManagement.rateChange?.changes.length > 0,
    "Crew movement should expose a visible rate delta.",
  )
  assert.match(
    await page.locator("#base-rate-change").innerText(),
    /Rate change|Bassline/i,
    "Staffing panel should show the rate change after moving crew.",
  )
  const restoreActionId =
    staffingAction.crewDelta > 0 ? "base-role-bassline-minus" : "base-role-bassline-plus"
  await clickVisibleElementByDomId(page, restoreActionId)
  await waitForTextState(
    page,
    (state) =>
      state.baseManagement?.rolePressure?.find((role) => role.id === "role.crystal_bassline")
        ?.crewAssigned === beforeBassline.crewAssigned,
    consoleErrors,
  )

  await clickVisibleElementByDomId(page, "base-tab-crew")
  await waitForTextState(
    page,
    (state) => state.baseManagement?.active === true && state.baseManagement?.selectedTab === "crew",
    consoleErrors,
  )
  const crewPanelText = await page.locator("#base-management-panel").innerText()
  ;[
    "Staffing command",
    "Hero task",
    "Balanced",
    "Push reach",
    "Gather stone",
    "Recover power",
    "Crystal slots",
    "Fire Pit seats",
  ].forEach((expectedText) => {
    assert.match(
      crewPanelText,
      new RegExp(expectedText, "i"),
      `Crew panel should include ${expectedText}.`,
    )
  })
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-staffing-management-smoke.png",
    "ADD RPG staffing management surface screenshot",
  )

  await clickVisibleElementByDomId(page, "base-tab-power")
  await waitForTextState(
    page,
    (state) => state.baseManagement?.active === true && state.baseManagement?.selectedTab === "power",
    consoleErrors,
  )
  const machinePanelText = await page.locator("#base-management-panel").innerText()
  ;[
    // "Power and Processing" is the catalog label, reaching the screen through
    // the disclosure's summary. The player hint sits inside the disclosure and
    // so is deliberately absent from visible text until it is opened; it is
    // asserted against the DOM below instead.
    "Power and Processing",
    "Station machine",
    "Crystal Circle",
    "Studio",
    "Fire Pit",
    "Resonance Chamber",
    "Mix Console",
    "Workshop",
    "Research Booth",
    "Current job",
    "Available recipes",
    "Brownout priority",
    "Chorus/s",
  ].forEach((expectedText) => {
    assert.match(
      machinePanelText,
      new RegExp(expectedText, "i"),
      `Station machine panel should include ${expectedText}.`,
    )
  })
  // `ui.panel.power` names two resources and two stations in its `relatedIds`,
  // and the panel renders them through the entity registry. Nothing in the app
  // source lists them, so this asserts the schema path end to end: a row that
  // fails to render does so silently, which is how the first version of this
  // panel shipped empty with the suite still green.
  const schemaPanelRows = await page.evaluate(() => {
    const panel = document.querySelector('[data-qa="schema-context-ui-panel-power"]')
    if (!panel) return null
    return {
      hint: panel.querySelector(".panel-note")?.textContent?.trim() ?? "",
      resources: panel.querySelectorAll('[data-entity="resource"]').length,
      stations: panel.querySelectorAll('[data-entity="station"]').length,
    }
  })
  assert.ok(schemaPanelRows, "The catalog-driven power disclosure should be on screen.")
  assert.match(
    schemaPanelRows.hint,
    /Chorus powers the base/i,
    "The disclosure should carry the element's authored player hint.",
  )
  assert.equal(
    schemaPanelRows.resources,
    2,
    "The power panel should draw the two resources its catalog entry names.",
  )
  assert.equal(
    schemaPanelRows.stations,
    2,
    "The power panel should draw the two stations its catalog entry names.",
  )

  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-station-machine-smoke.png",
    "ADD RPG station machine surface screenshot",
  )

  await clickVisibleElementByDomId(page, "base-tab-social")
  await waitForTextState(
    page,
    (state) => state.baseManagement?.active === true && state.baseManagement?.selectedTab === "social",
    consoleErrors,
  )
  const socialPanelText = await page.locator("#base-management-panel").innerText()
  ;[
    "Social pressure",
    "Bunks",
    "Recruitment",
    "Vibes",
    "Can we support this recruit",
    "Pending arrival",
    "Gain",
    "Loss",
    "Cost",
  ].forEach((expectedText) => {
    assert.match(
      socialPanelText,
      new RegExp(expectedText, "i"),
      `Social panel should include ${expectedText}.`,
    )
  })
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-social-pressure-smoke.png",
    "ADD RPG social pressure surface screenshot",
  )

  await ensureFreeExpeditionCrew(page, consoleErrors)
  await clickVisibleElementByDomId(page, "base-tab-expeditions")
  const expeditions = await waitForTextState(
    page,
    (state) =>
      state.baseManagement?.active === true &&
      state.baseManagement?.selectedTab === "expeditions" &&
      state.baseManagement?.expeditions?.targets?.some(
        (target) => target.id === "expedition.local_scavenge_sweep" && target.enabled,
      ),
    consoleErrors,
  )
  assert.equal(expeditions.baseManagement.expeditions.activeCount, 0)
  assert.ok(expeditions.baseManagement.expeditions.availableCrew >= 1)
  const expeditionPanelText = await page.locator("#base-management-panel").innerText()
  ;[
    "Expedition board",
    "Target",
    "Local Scavenge Sweep",
    "Low risk",
    "Stone",
    "Returned reports",
  ].forEach((expectedText) => {
    assert.match(
      expeditionPanelText,
      new RegExp(expectedText, "i"),
      `Expeditions panel should include ${expectedText}.`,
    )
  })
  await clickVisibleElementByDomId(page, "base-start-expedition-expedition-local_scavenge_sweep")
  const activeExpedition = await waitForTextState(
    page,
    (state) =>
      state.baseManagement?.selectedTab === "expeditions" &&
      state.baseManagement?.expeditions?.activeCount === 1 &&
      state.baseManagement?.expeditions?.activeJobs?.some(
        (job) => job.targetId === "expedition.local_scavenge_sweep",
      ),
    consoleErrors,
  )
  assert.equal(
    activeExpedition.baseManagement.expeditions.availableCrew,
    expeditions.baseManagement.expeditions.availableCrew - 1,
  )
  await page.evaluate(() => window.advanceTime?.(120000))
  const returnedExpedition = await waitForTextState(
    page,
    (state) =>
      state.baseManagement?.selectedTab === "expeditions" &&
      state.baseManagement?.expeditions?.activeCount === 0 &&
      state.baseManagement?.expeditions?.completedReportCount >= 1 &&
      state.baseManagement?.expeditions?.reports?.some(
        (report) => report.targetId === "expedition.local_scavenge_sweep",
      ),
    consoleErrors,
  )
  assert.ok(
    returnedExpedition.baseManagement.expeditions.reports.some((report) =>
      Boolean(report.rewardCopy && report.rewardCopy.length > 0),
    ),
    "Returned expedition report should describe rewards.",
  )
  assert.ok(
    returnedExpedition.baseManagement.expeditions.reports.some((report) =>
      /Echo|Signal/i.test(report.resonanceCopy),
    ),
    "Returned expedition report should describe strange material rewards.",
  )
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-expeditions-smoke.png",
    "ADD RPG expeditions surface screenshot",
  )

  await clickVisibleElementByDomId(page, "base-tab-resonance")
  const resonanceReady = await waitForTextState(
    page,
    (state) =>
      state.baseManagement?.active === true &&
      state.baseManagement?.selectedTab === "resonance" &&
      state.baseManagement?.resonance?.materials?.some(
        (material) => material.id === "echo_shards" && material.value >= 1,
      ) &&
      state.baseManagement?.resonance?.recipes?.some(
        (recipe) => recipe.id === "resonance.recipe.bassline_overtone" && recipe.enabled,
      ),
    consoleErrors,
  )
  assert.equal(resonanceReady.baseManagement.resonance.tuning.basslineLevel, 0)
  await assertVisibleText(page, "#base-management-panel", [
    "Resonance loop",
    "Strange material",
    "Crystal tuning",
    "Bassline Overtone",
    "Start resonance",
  ])
  await clickVisibleElementByDomId(
    page,
    "base-start-resonance-resonance-recipe-bassline_overtone",
  )
  await waitForTextState(
    page,
    (state) =>
      state.baseManagement?.selectedTab === "resonance" &&
      state.baseManagement?.resonance?.activeJobCount === 1 &&
      state.baseManagement?.resonance?.recipes?.some(
        (recipe) => recipe.id === "resonance.recipe.bassline_overtone" && recipe.inProgress,
      ),
    consoleErrors,
  )
  await page.evaluate(() => window.advanceTime?.(300000))
  const tunedResonance = await waitForTextState(
    page,
    (state) =>
      state.baseManagement?.selectedTab === "resonance" &&
      state.baseManagement?.resonance?.activeJobCount === 0 &&
      state.baseManagement?.resonance?.tuning?.basslineLevel >= 1,
    consoleErrors,
  )
  assert.ok(
    tunedResonance.baseManagement.resonance.tuning.basslineBonusPercent >= 6,
    "Bassline Overtone should improve Bassline tuning.",
  )
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-resonance-smoke.png",
    "ADD RPG resonance conversion surface screenshot",
  )

  for (const tab of ["build", "power", "crew", "social", "expeditions", "resonance", "processing", "crystal"]) {
    await clickVisibleElementByDomId(page, `base-tab-${tab}`)
    await waitForTextState(
      page,
      (state) =>
        state.baseManagement?.active === true &&
        state.baseManagement?.selectedTab === tab &&
        state.shell?.adminOpen === false,
      consoleErrors,
    )
  }

  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-base-management-smoke.png",
    "ADD RPG base management surface screenshot",
  )
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-desktop-base-hierarchy-smoke.png",
    "ADD RPG desktop Base layout hierarchy screenshot",
  )
  return returnToOverworld(page, consoleErrors)
}

async function ensureFreeExpeditionCrew(page, consoleErrors) {
  let state = await renderGameToText(page)
  if (freeRuntimeCrew(state) >= 1) return

  await clickVisibleElementByDomId(page, "base-tab-crew")
  state = await waitForTextState(
    page,
    (nextState) => nextState.baseManagement?.active === true && nextState.baseManagement?.selectedTab === "crew",
    consoleErrors,
  )

  const releasableRole = ["role.fire_pit", "role.crystal_bassline", "role.scavenge", "role.water"].find(
    (roleId) => roleCrewAssigned(state, roleId) > 0,
  )
  assert.ok(releasableRole, "Expedition smoke needs one assigned crew member it can release.")

  await clickVisibleElementByDomId(page, `base-role-${roleSmokeSlug(releasableRole)}-minus`)
  await waitForTextState(
    page,
    (nextState) =>
      nextState.baseManagement?.selectedTab === "crew" &&
      roleCrewAssigned(nextState, releasableRole) === roleCrewAssigned(state, releasableRole) - 1 &&
      freeRuntimeCrew(nextState) >= 1,
    consoleErrors,
  )
}

function freeRuntimeCrew(state) {
  const totalCrew = state.snapshot?.roster?.totalCrew ?? 0
  const roleCrew = Object.values(state.snapshot?.roster?.crewByRole ?? {}).reduce(
    (total, crew) => total + Number(crew ?? 0),
    0,
  )
  const expeditionCrew = (state.snapshot?.expeditions?.activeJobs ?? []).reduce(
    (total, job) => total + Number(job.assignedCrew ?? 0),
    0,
  )
  return Math.max(0, totalCrew - roleCrew - expeditionCrew)
}

function roleCrewAssigned(state, roleId) {
  return Number(state.snapshot?.roster?.crewByRole?.[roleId] ?? 0)
}

function roleSmokeSlug(roleId) {
  return roleId.replace("role.", "").replaceAll("_", "-")
}

async function assertMobilePresentation(browser, url) {
  for (const viewport of MOBILE_PRESENTATION_VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
    })
    const consoleErrors = []
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text())
    })
    page.on("pageerror", (error) => {
      consoleErrors.push(error.stack || error.message)
    })
    await page.addInitScript((storageKey) => {
      window.localStorage.removeItem(storageKey)
    }, ADD_AUTOSAVE_STORAGE_KEY)

    try {
      await page.goto(`${url}/app`, { waitUntil: "domcontentloaded" })
      await waitForTextState(
        page,
        (state) =>
          state.app === "add-rpg" &&
          state.runtime?.ready === true &&
          state.map?.ready === true &&
          state.map?.presentation?.responsiveLayout === "mobile" &&
          state.map?.presentation?.terrainArt === "procedural_painterly_topology" &&
          state.shell?.questPanel?.collapsed === true,
        consoleErrors,
      )
      await assertMobileLayoutComposition(page, viewport)
      const mobileNavigationText = await page.locator(".map-mode-switcher").innerText()
      ;["World", "Studio", "Cave"].forEach((label) => {
        assert.match(
          mobileNavigationText,
          new RegExp(label, "i"),
          `${viewport.name}: mobile map navigation should include ${label}.`,
        )
      })
      assert.doesNotMatch(
        mobileNavigationText,
        /\bBase\b/i,
        `${viewport.name}: Base navigation should stay hidden until Studio arrival.`,
      )
      assert.doesNotMatch(
        mobileNavigationText,
        /\b(?:Overworld|Area|Dgn|Dungeon)\b/i,
        `${viewport.name}: mobile map navigation should not expose system labels.`,
      )
      await assertLayoutHierarchy(page, {
        expectedContextPanelId: null,
        expectedMapMode: "overworld_hex",
        mobile: true,
      })
      await assertNonBlankNamedAppScreenshot(
        page,
        `add-rpg-${viewport.name}-smoke.png`,
        `ADD RPG ${viewport.name} app screenshot`,
      )
      if (viewport.name === "mobile") {
        await assertNonBlankNamedAppScreenshot(
          page,
          "add-rpg-mobile-bottom-sheet-hierarchy-smoke.png",
          "ADD RPG mobile bottom-sheet layout hierarchy screenshot",
        )
      }
      assert.deepEqual(consoleErrors, [])
    } finally {
      await page.close()
    }
  }
}

async function assertMobileLayoutComposition(page, viewport) {
  const metrics = await page.evaluate(() => {
    function rectFor(selector) {
      const element = document.querySelector(selector)
      if (!(element instanceof HTMLElement)) return null
      const rect = element.getBoundingClientRect()
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }
    }

    const contextPanel = document.querySelector(
      "#discovery-panel, #base-management-panel, #dungeon-context-panel, #offline-return-panel",
    )
    let context = null
    if (contextPanel instanceof HTMLElement) {
      const rect = contextPanel.getBoundingClientRect()
      context = {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight,
      topbar: rectFor(".map-topbar"),
      questPanel: rectFor("#first-playable-panel"),
      cameraControls: rectFor(".map-camera-controls"),
      currentAction: rectFor("#current-action-surface"),
      detailToggle: rectFor("#toggle-discovery-detail"),
      discoverySheetState: document
        .querySelector("#discovery-panel")
        ?.getAttribute("data-mobile-sheet-state"),
      discoveryBodyDisplay: (() => {
        const body = document.querySelector("#discovery-panel-body")
        return body instanceof HTMLElement ? window.getComputedStyle(body).display : null
      })(),
      context,
    }
  })
  const state = await renderGameToText(page)

  assert.ok(metrics.topbar, `${viewport.name}: expected compact topbar`)
  assert.equal(metrics.context, null, `${viewport.name}: overworld should not mount a contextual bottom sheet`)
  assert.ok(metrics.questPanel, `${viewport.name}: expected objective tracker`)
  assert.ok(metrics.cameraControls, `${viewport.name}: expected camera controls`)
  assert.equal(metrics.currentAction, null, `${viewport.name}: overworld should not mount a current action panel`)
  assert.equal(metrics.detailToggle, null, `${viewport.name}: discovery detail snap control should not be visible`)
  assert.equal(metrics.width, viewport.width)
  assert.equal(metrics.height, viewport.height)
  assert.equal(
    metrics.discoverySheetState,
    undefined,
    `${viewport.name}: discovery sheet state should be absent in the minimal overworld UI`,
  )
  assert.equal(
    metrics.discoveryBodyDisplay,
    null,
    `${viewport.name}: discovery supporting details should be absent in the minimal overworld UI`,
  )
  assert.equal(
    state.map.presentation.responsiveLayout,
    "mobile",
    `${viewport.name}: renderer should report mobile presentation mode`,
  )
  assert.equal(
    typeof state.map.presentation.mobileEdgeCulledLabelCount,
    "number",
    `${viewport.name}: renderer should expose mobile edge label culling telemetry`,
  )
  assert.ok(metrics.topbar.height <= 46, `${viewport.name}: topbar is too tall`)
  assert.ok(metrics.questPanel.height <= 48, `${viewport.name}: objective tracker should start as a compact chip`)
  assert.ok(
    metrics.questPanel.top >= metrics.topbar.bottom + 2,
    `${viewport.name}: objective tracker overlaps the topbar`,
  )
  assert.ok(
    metrics.cameraControls.bottom <= viewport.height - 6,
    `${viewport.name}: camera controls should stay inside the viewport`,
  )
  assert.ok(
    metrics.cameraControls.left >= 0 && metrics.cameraControls.right <= viewport.width,
    `${viewport.name}: camera controls should remain reachable`,
  )
}

async function assertLayoutHierarchy(
  page,
  { expectedContextPanelId, expectedMapMode = null, mobile = false },
) {
  const state = await renderGameToText(page)
  if (expectedMapMode) {
    assert.equal(
      state.mapMode?.active,
      expectedMapMode,
      `Expected map mode ${expectedMapMode} while checking layout hierarchy.`,
    )
  }
  assert.equal(state.shell?.adminOpen, false, "Admin should stay hidden behind Menu.")
  assert.equal(state.shell?.devToolsOpen, false, "Developer tools should not be open in primary UI.")
  assert.equal(
    /^map_objective(?:_context)?_status$/.test(state.shell?.visualPolish?.surfaceSystem ?? ""),
    true,
    "Visual polish contract should describe the current layout hierarchy.",
  )

  if (expectedContextPanelId) {
    await page.waitForFunction((panelId) => {
      const panel = document.getElementById(panelId)
      if (!(panel instanceof HTMLElement)) return false
      const style = window.getComputedStyle(panel)
      const rect = panel.getBoundingClientRect()
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0.9 &&
        rect.width > 0 &&
        rect.height > 0
      )
    }, expectedContextPanelId, { timeout: qaTimeout(15000) })
  }

  const hierarchy = await page.evaluate((expectedPanelId) => {
    const contextSelectors = [
      "#discovery-panel",
      "#base-management-panel",
      "#dungeon-context-panel",
      "#offline-return-panel",
    ]
    const debugSelectors = [
      "#toggle-developer-tools",
      "#save-payload",
      "#offline-catchup",
      "#reset-run",
      "#import-save",
      "#export-save",
    ]

    function isVisible(element) {
      if (!(element instanceof HTMLElement)) return false
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      )
    }

    function isContextPanelPresent(element) {
      if (!(element instanceof HTMLElement)) return false
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      )
    }

    function rectFor(element) {
      if (!(element instanceof HTMLElement)) return null
      const rect = element.getBoundingClientRect()
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }
    }

    function nodeHasVisibleAncestors(node) {
      let element = node.parentElement
      while (element instanceof HTMLElement) {
        const style = window.getComputedStyle(element)
        if (
          element.hidden ||
          element.getAttribute("aria-hidden") === "true" ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          Number(style.opacity) === 0
        ) {
          return false
        }
        element = element.parentElement
      }
      return true
    }

    function visibleTextFor(root) {
      if (!(root instanceof HTMLElement)) return ""
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      const parts = []
      let node = walker.nextNode()
      while (node) {
        const text = node.textContent?.trim()
        if (text && nodeHasVisibleAncestors(node)) {
          parts.push(text)
        }
        node = walker.nextNode()
      }
      return parts.join(" ")
    }

    const contextPanels = contextSelectors
      .map((selector) => document.querySelector(selector))
      .filter((element) => element instanceof HTMLElement)
      .map((element) => {
        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return {
          id: element.id,
          visible: isContextPanelPresent(element),
          surface: element.getAttribute("data-visual-surface"),
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          rect: {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
        }
      })
    const visibleContextPanelIds = contextPanels
      .filter((panel) => panel.visible)
      .map((panel) => panel.id)
    const mapHud = document.querySelector(".map-hud")
    const mapHudChildren = mapHud instanceof HTMLElement
      ? Array.from(mapHud.children).map((element) => ({
          className: element instanceof HTMLElement ? element.className : "",
          id: element instanceof HTMLElement ? element.id : "",
        }))
      : []
    const primaryText = visibleTextFor(document.querySelector("#add-world"))
    const activeContextPanel = expectedPanelId ? document.getElementById(expectedPanelId) : null
    const topbar = document.querySelector(".map-topbar")
    const visiblePrimaryActions = activeContextPanel instanceof HTMLElement
      ? Array.from(activeContextPanel.querySelectorAll(".primary-action"))
          .filter(isVisible)
          .map((element) => ({
            id: element instanceof HTMLElement ? element.id : "",
            text: element.textContent?.trim() ?? "",
          }))
      : []
    const directWorldStoryMoments = Array.from(
      document.querySelectorAll("#add-world > .story-moment"),
    )
      .filter(isVisible)
      .map((element) => ({
        text: element.textContent?.trim() ?? "",
        rect: rectFor(element),
      }))

    return {
      visibleContextPanelIds,
      contextPanels,
      visiblePrimaryActions,
      adminViewVisible: isVisible(document.querySelector("#admin-view")),
      shellMenuVisible: isVisible(document.querySelector("#open-shell-menu")),
      adminMenuActionVisible: isVisible(document.querySelector("#open-admin")),
      mapStageSurface: document.querySelector("#add-world")?.getAttribute("data-visual-surface"),
      topbarSurface: document.querySelector(".map-topbar")?.getAttribute("data-visual-surface"),
      topbarVisible: isVisible(topbar),
      topbar: rectFor(topbar),
      objectiveSurface: document.querySelector("#first-playable-panel")?.getAttribute("data-visual-surface"),
      mapHudSurface: document.querySelector(".map-hud")?.getAttribute("data-visual-surface"),
      mapHud: rectFor(mapHud),
      mapHudChildren,
      cameraControls: rectFor(document.querySelector(".map-camera-controls")),
      directWorldStoryMoments,
      visibleDebugSelectors: debugSelectors.filter((selector) => isVisible(document.querySelector(selector))),
      primaryText,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    }
  }, expectedContextPanelId)

  if (expectedContextPanelId) {
    assert.equal(
      hierarchy.visibleContextPanelIds.length,
      1,
      `Exactly one contextual panel should be visible, saw ${JSON.stringify(
        hierarchy.visibleContextPanelIds,
      )}. Panels: ${JSON.stringify(hierarchy.contextPanels)}.`,
    )
    assert.equal(
      hierarchy.visibleContextPanelIds[0],
      expectedContextPanelId,
      `Expected contextual panel ${expectedContextPanelId}, saw ${JSON.stringify(
        hierarchy.visibleContextPanelIds,
      )}.`,
    )
  } else {
    assert.deepEqual(
      hierarchy.visibleContextPanelIds,
      [],
      `No contextual panel should be visible in the minimal overworld UI. Panels: ${JSON.stringify(
        hierarchy.contextPanels,
      )}.`,
    )
  }
  assert.ok(
    hierarchy.visiblePrimaryActions.length <= 1,
    `Context panel ${expectedContextPanelId} should expose at most one primary CTA, saw ${JSON.stringify(
      hierarchy.visiblePrimaryActions,
    )}.`,
  )
  if (hierarchy.visiblePrimaryActions.length === 1) {
    const expectedPrimaryIds = {
      "discovery-panel": ["current-action-primary"],
      "base-management-panel": ["current-action-primary"],
      "dungeon-context-panel": ["return-overworld"],
      "offline-return-panel": ["dismiss-offline-return-primary"],
    }
    assert.ok(
      expectedPrimaryIds[expectedContextPanelId]?.includes(hierarchy.visiblePrimaryActions[0].id),
      `Context panel ${expectedContextPanelId} primary CTA should be the mode owner, saw ${JSON.stringify(
        hierarchy.visiblePrimaryActions,
      )}.`,
    )
    await assertClickableCenter(
      page,
      `#${expectedContextPanelId} #${hierarchy.visiblePrimaryActions[0].id}`,
    )
  }
  assert.equal(hierarchy.mapStageSurface, "map-stage")
  assert.equal(hierarchy.topbarSurface, "status")
  assert.equal(hierarchy.topbarVisible, true, "The top status/navigation bar should be visible.")
  assert.ok(hierarchy.topbar, "Top status/navigation bar should have layout bounds.")
  assert.ok(
    hierarchy.topbar.top >= -1 && hierarchy.topbar.bottom <= 58,
    `Top status/navigation bar should stay pinned to the top edge, saw ${JSON.stringify(
      hierarchy.topbar,
    )}.`,
  )
  assert.equal(hierarchy.objectiveSurface, "objective")
  assert.equal(hierarchy.mapHudSurface, "map-controls")
  assert.deepEqual(
    hierarchy.directWorldStoryMoments,
    [],
    "Story/narrative copy should live inside the contextual panel, not directly under the map header.",
  )
  assert.equal(hierarchy.adminViewVisible, false, "Admin drawer should be hidden.")
  assert.equal(hierarchy.shellMenuVisible, true, "Menu button should expose Admin access.")
  assert.equal(hierarchy.adminMenuActionVisible, false, "Admin action should stay hidden until Menu opens.")
  assert.deepEqual(
    hierarchy.visibleDebugSelectors,
    [],
    "Debug/runtime controls should not be visible in the primary UI.",
  )
  assert.doesNotMatch(
    hierarchy.primaryText,
    /Developer tools|Runtime internals|Save payload|Import text|Advance 5s|Snapshot|Debug/i,
    `Primary game world should not expose debug wording. Visible text: ${hierarchy.primaryText}`,
  )
  assert.equal(hierarchy.mapHudChildren.length, 1, "Map HUD should only contain camera controls.")
  assert.ok(
    String(hierarchy.mapHudChildren[0]?.className ?? "").includes("map-camera-controls"),
    "Bottom-left HUD should be camera-only.",
  )
  assert.ok(hierarchy.mapHud, "Map HUD should be visible.")
  assert.ok(hierarchy.cameraControls, "Camera controls should be visible.")
  assert.ok(hierarchy.mapHud.left <= 16, "Camera HUD should stay anchored to the left edge.")
  if (!mobile) {
    assert.ok(
      hierarchy.mapHud.top >= hierarchy.viewport.height * 0.82,
      "Desktop camera HUD should stay in the bottom-left region.",
    )
  }
  assert.ok(
    hierarchy.contextPanels.every(
      (panel) => !panel.visible || panel.surface === "context",
    ),
    "Visible contextual panel should use the context visual surface.",
  )
  if (mobile) {
    v1InterfaceGate.mobileBottomSheet = expectedContextPanelId !== null
  } else if (expectedContextPanelId) {
    v1InterfaceGate.desktopPanels.add(expectedContextPanelId)
  }
  return { state, hierarchy }
}

function assertV1InterfaceContext(state, context, options = {}) {
  const expectedSources = Array.isArray(options.source)
    ? options.source
    : options.source
      ? [options.source]
      : []
  const hierarchy = state.shell?.interfaceHierarchy
  const questions = hierarchy?.questions ?? {}
  const currentAction = state.shell?.currentAction

  assert.ok(
    V1_INTERFACE_CONTEXTS.includes(context),
    `Unknown V1 interface context ${context}.`,
  )
  assert.equal(
    state.shell?.adminOpen,
    false,
    `V1 ${context} state must be playable without opening Admin.`,
  )
  assert.equal(
    state.shell?.devToolsOpen,
    false,
    `V1 ${context} state must keep developer tools out of the primary UI.`,
  )
  assert.equal(
    hierarchy?.primary?.label,
    "Map",
    `V1 ${context} state must identify the primary map tier.`,
  )
  assert.equal(
    hierarchy?.secondary?.label,
    "Decision",
    `V1 ${context} state must identify the current decision tier.`,
  )
  assert.equal(
    hierarchy?.tertiary?.label,
    "Status",
    `V1 ${context} state must identify the status tier.`,
  )
  assert.equal(
    hierarchy?.advanced?.hiddenByDefault,
    true,
    `V1 ${context} state must hide advanced/admin surfaces by default.`,
  )
  ;[
    ["whereAmI", "where they are"],
    ["whatChanged", "what changed"],
    ["whatShouldIDoNow", "what to do next"],
    ["whatHappensIfIWait", "what happens if they wait"],
  ].forEach(([key, label]) => {
    assert.equal(
      typeof questions[key],
      "string",
      `V1 ${context} state should explain ${label}.`,
    )
    assert.ok(
      questions[key].trim().length > 0,
      `V1 ${context} state should not leave "${label}" blank.`,
    )
  })
  assert.equal(
    typeof currentAction?.label,
    "string",
    `V1 ${context} state must expose a current action label.`,
  )
  assert.ok(
    currentAction.label.trim().length > 0,
    `V1 ${context} state must expose a non-empty current action label.`,
  )
  assert.equal(
    typeof currentAction.detail,
    "string",
    `V1 ${context} state must expose current action detail.`,
  )
  assert.ok(
    currentAction.detail.trim().length > 0,
    `V1 ${context} state must expose non-empty current action detail.`,
  )
  if (expectedSources.length > 0) {
    assert.ok(
      expectedSources.includes(currentAction.source),
      `V1 ${context} state expected action source ${expectedSources.join(
        " or ",
      )}, saw ${currentAction.source}.`,
    )
  }
  v1InterfaceGate.contexts.add(context)
}

function assertV1InterfaceGateComplete() {
  const missingContexts = V1_INTERFACE_CONTEXTS.filter(
    (context) => !v1InterfaceGate.contexts.has(context),
  )
  const missingDesktopPanels = V1_INTERFACE_DESKTOP_PANELS.filter(
    (panelId) => !v1InterfaceGate.desktopPanels.has(panelId),
  )
  assert.deepEqual(
    missingContexts,
    [],
    "V1 Interface Gate requires Discovery, Base, Dungeon, and Return states to be playable without Admin.",
  )
  assert.deepEqual(
    missingDesktopPanels,
    [],
    "V1 Interface Gate requires stable desktop layouts for Base, Dungeon, and Return panels.",
  )
  assert.equal(
    v1InterfaceGate.mobileBottomSheet,
    false,
    "V1 Interface Gate expects the overworld mobile UI to avoid a Discovery bottom sheet.",
  )
}

function initialDiscoveryShapeReady(state) {
  const discovered = state.snapshot?.discoveredCells
  const cave = state.map?.landmarks?.survivorCave
  const base = state.map?.landmarks?.baseCenter
  return (
    Array.isArray(discovered) &&
    typeof cave === "string" &&
    typeof base === "string" &&
    discovered.length > 1 &&
    discovered.includes(cave) &&
    !discovered.includes(base)
  )
}

function assertInitialDiscoveryAnchors(state) {
  const discovered = sortedCells(state.snapshot.discoveredCells)
  const cave = parseHexCoord(state.map.landmarks.survivorCave)
  const base = parseHexCoord(state.map.landmarks.baseCenter)
  assert.ok(
    discovered.includes(state.map.landmarks.survivorCave),
    "Initial discovery should include the Survivor Cave.",
  )
  assert.ok(
    !discovered.includes(state.map.landmarks.baseCenter),
    "Initial discovery should not reveal the Studio/base hex.",
  )
  assert.ok(discovered.length > 1, "Initial discovery should include cells around the cave.")
  assert.equal(state.snapshot.discoveredCellCount, discovered.length)
  assert.ok(
    discovered.every((cell) => {
      const coord = parseHexCoord(cell)
      return hexDistance({ a: cave.q, b: cave.r }, { a: coord.q, b: coord.r }) <= 1
    }),
    "Initial discovery should be limited to the Survivor Cave radius.",
  )
  assert.equal(
    hexDistance({ a: cave.q, b: cave.r }, { a: base.q, b: base.r }),
    6,
    "The Studio should be six hexes from the Survivor Cave.",
  )
  assert.ok(
    state.map.landmarks.baseCenterWorld && state.map.landmarks.survivorCaveWorld,
    "Studio and Survivor Cave should expose world positions.",
  )
  // These two landmarks used to sit on one horizontal screen line, because the
  // flat-top projection made `r + q/2` the screen row and both work out to 3.
  // Pointy-top makes `r` the row, and they differ — restoring the old framing
  // would mean moving the Survivor Cave to r=3, which invalidates the protected
  // canonical route and the Rust assertions that lock its shape. The journey is
  // a gentle diagonal now. What still matters, and is what this guarded, is
  // that the Studio reads as a destination off to one side rather than sitting
  // on top of where the player starts.
  const landmarkDx =
    state.map.landmarks.survivorCaveWorld.x - state.map.landmarks.baseCenterWorld.x
  const landmarkDy =
    state.map.landmarks.survivorCaveWorld.y - state.map.landmarks.baseCenterWorld.y
  assert.ok(
    landmarkDx > 0 && Math.abs(landmarkDy) < Math.abs(landmarkDx),
    `The Survivor Cave should read as east of the Studio, more across than up or down. dx=${landmarkDx}, dy=${landmarkDy}.`,
  )
  assert.equal(state.map.landmarks.studioLabelVisible, true)
}

async function completeFirstPlayableArc(page, consoleErrors) {
  let state = await renderGameToText(page)
  assert.ok(state.ui?.firstPlayable, "ADD first playable telemetry should be exposed")
  assert.equal(state.ui.firstPlayable.persistenceReady, false)
  assert.ok(state.ui.resourceFlows.some((flow) => flow.id === "resource.bassline" && flow.source))
  assert.ok(
    state.ui.constructionOptions.some((option) => option.id === "project.restore_studio"),
  )
  assert.ok(
    state.ui.roleAssignments.some((role) => role.id === "role.crystal_bassline"),
  )

  for (let step = 0; step < 80; step += 1) {
    state = await renderGameToText(page)
    if (
      state.ui?.firstPlayable?.complete === true &&
      state.snapshot?.base?.studioRestored === true &&
      state.snapshot?.base?.firePitBuilt === true &&
      state.snapshot?.recruitment?.totalRecruitedThisRun >= 1
    ) {
      return waitForCompletedObjectiveChip(page, consoleErrors)
    }

    const action = state.ui?.firstPlayable?.currentAction
    if (state.shell?.currentAction?.actionId === "first-playable:reach-base-route") {
      await clickVisibleCurrentAction(page, state)
      await waitForTextState(
        page,
        (nextState) =>
          nextState.shell?.currentAction?.kind === "travel" &&
          nextState.shell.currentAction.primaryLabel === "Travel to this region" &&
          nextState.discovery?.selectedTile?.canTravelNow === true &&
          nextState.map?.presentation?.mapPrimaryAffordances?.pathTimePreviewVisible === true,
        consoleErrors,
        4000,
      )
      continue
    }

    if (
      state.shell?.currentAction?.source === "discovery" &&
      state.shell.currentAction.kind === "travel" &&
      state.shell.currentAction.actionId === "travel:selected-tile"
    ) {
      const beforeDigest = firstPlayableDigest(state)
      await clickVisibleCurrentAction(page, state)
      await resolveTravelDialogIfNeeded(page, consoleErrors)
      await waitForTextState(
        page,
        (nextState) =>
          nextState.runtime?.error === null &&
          nextState.map?.character?.moving === false &&
          nextState.ui?.worldTime?.animating === false &&
          firstPlayableDigest(nextState) !== beforeDigest,
        consoleErrors,
        12000,
      )
      continue
    }

    if (
      state.shell?.currentAction?.source === "discovery" &&
      state.shell.currentAction.kind === "arrived"
    ) {
      await waitForTextState(
        page,
        (nextState) =>
          nextState.runtime?.error === null &&
          nextState.shell?.currentAction?.kind !== "arrived",
        consoleErrors,
        5000,
      )
      continue
    }

    if (
      state.shell?.currentAction?.source === "discovery" &&
      state.shell.currentAction.kind === "open_base" &&
      state.shell.currentAction.actionId === "base:open"
    ) {
      assert.equal(state.shell.currentAction.sourceLabel, "Arrival")
      assert.match(state.shell.currentAction.progressLabel ?? "", /Arrived at The Studio/i)
      assert.equal(state.shell.currentAction.primaryLabel, "Open base management")
      assert.equal(
        state.map?.presentation?.mapPrimaryAffordances?.studioArrivalEmphasisVisible,
        true,
        "Studio landmark should be visually emphasized at the arrival handoff.",
      )
      await assertNonBlankNamedMapScreenshot(
        page,
        "add-rpg-studio-arrival-handoff-smoke.png",
        "ADD RPG Studio arrival handoff screenshot",
      )
      await clickVisibleCurrentAction(page, state)
      const openedBase = await waitForTextState(
        page,
        (nextState) =>
          nextState.runtime?.error === null &&
          nextState.mapMode?.active === "base_square" &&
          nextState.shell?.baseViewTransition !== "opening" &&
          nextState.ui?.firstPlayable?.currentStepId !== "reach-base",
        consoleErrors,
        5000,
      )
      assert.equal(openedBase.shell?.currentAction?.source, "base_loop")
      assert.ok(
        ["assign_role", "investigate-base"].includes(openedBase.shell?.currentAction?.kind),
        `Base should open onto a player-facing base action, got ${JSON.stringify(
          openedBase.shell?.currentAction,
        )}`,
      )
      assert.ok(openedBase.shell?.currentAction?.label?.length > 0)
      assert.equal(openedBase.baseManagement?.economy?.waitForecasts?.[0]?.label, "1m")
      continue
    }

    const beforeDigest = firstPlayableDigest(state)
    const beforeProgressDigest = firstPlayableProgressDigest(state)
    if (state.shell?.currentAction?.source === "base_loop") {
      const actionDisabled = await isVisibleCurrentActionDisabled(page, state)
      if (actionDisabled) {
        throw new Error(
          `Base loop action disabled before first playable completion: ${JSON.stringify(
            state.shell?.currentAction,
          )}`,
        )
      }
      const shouldAdvanceClock =
        state.shell.currentAction.kind === "wait" || action?.type === "tick"
      await clickVisibleCurrentAction(page, state)
      await waitForTextState(
        page,
        (nextState) =>
          nextState.runtime?.error === null &&
          (shouldAdvanceClock
            ? firstPlayableDigest(nextState) !== beforeDigest
            : firstPlayableProgressDigest(nextState) !== beforeProgressDigest),
        consoleErrors,
        shouldAdvanceClock ? 18000 : 8000,
      )
      continue
    }

    assert.equal(
      state.shell?.currentAction?.source,
      "first_playable",
      `The shared current action should own first-playable progression: ${JSON.stringify(
        state.shell?.currentAction,
      )}`,
    )
    assert.ok(
      action,
      `First playable should expose an action before completion: ${JSON.stringify(
        state.ui?.firstPlayable,
      )}`,
    )
    const actionDisabled = await isVisibleCurrentActionDisabled(page, state)
    if (actionDisabled) {
      const completedState = await renderGameToText(page)
      if (
        completedState.ui?.firstPlayable?.complete === true &&
        completedState.snapshot?.recruitment?.totalRecruitedThisRun >= 1
      ) {
        return waitForCompletedObjectiveChip(page, consoleErrors)
      }
      throw new Error(
        `First playable action disabled before completion: ${JSON.stringify(
          completedState.ui?.firstPlayable,
        )}`,
      )
    }
    await clickVisibleCurrentAction(page, state)
    await waitForTextState(
      page,
      (nextState) =>
        nextState.runtime?.error === null &&
        (action.type === "tick"
          ? firstPlayableDigest(nextState) !== beforeDigest
          : firstPlayableProgressDigest(nextState) !== beforeProgressDigest),
      consoleErrors,
      action.type === "tick" ? 18000 : 8000,
    )
  }

  throw new Error(
    `ADD first playable did not complete. Last state: ${JSON.stringify(
      await renderGameToText(page),
    )}`,
  )
}

async function waitForCompletedObjectiveChip(page, consoleErrors) {
  return waitForTextState(
    page,
    (state) =>
      state.ui?.firstPlayable?.complete === true &&
      state.shell?.questPanel?.collapsed === true &&
      state.shell?.questPanel?.collapseControlLabel === "Open first arc journal",
    consoleErrors,
  )
}

function firstPlayableDigest(state) {
  return JSON.stringify({
    clockSeconds: Math.round(state.snapshot?.clockSeconds ?? 0),
    ...firstPlayableProgressDigestObject(state),
  })
}

function firstPlayableProgressDigest(state) {
  return JSON.stringify(firstPlayableProgressDigestObject(state))
}

function firstPlayableProgressDigestObject(state) {
  return {
    heroMap: state.snapshot?.heroMap,
    heroAssigned: state.snapshot?.heroAssigned,
    activeWorldAction: state.snapshot?.activeWorldAction,
    resources: state.snapshot?.resources,
    base: state.snapshot?.base,
    bubble: state.snapshot?.bubble,
    recruitment: state.snapshot?.recruitment,
    roster: state.snapshot?.roster,
    activeConstruction: state.snapshot?.activeConstruction,
    activeStoryBeatId: state.ui?.activeStoryBeatId,
    firstPlayable: state.ui?.firstPlayable,
  }
}

async function exerciseSaveReloadOfflineAndReset(
  page,
  advanced,
  consoleErrors,
  captureFixture = null,
) {
  await openDeveloperTools(page, consoleErrors)
  const saved = await clickUntilTextState(
    page,
    "#export-save",
    (state) =>
      state.persistence?.autosaveAvailable === true &&
      state.persistence?.lastManualExportAtMs !== null &&
      state.persistence?.savePayloadLength > 200,
    consoleErrors,
    8,
    2200,
  )
  const payload = await page.locator("#save-payload").inputValue()
  assert.equal(typeof JSON.parse(payload), "object")
  const exportedClock = saved.snapshot.clockSeconds
  const exportedDiscoveryCount = saved.snapshot.discoveredCellCount
  const exportedDiscoveredCells = sortedCells(saved.snapshot.discoveredCells)
  const exportedHeroMap = saved.snapshot.heroMap
  const parsedPayload = JSON.parse(payload)
  assert.ok(Array.isArray(parsedPayload.discoveredCells))
  assert.equal(parsedPayload.discoveredCells.length, exportedDiscoveryCount)
  assert.deepEqual(parsedPayload.heroMap, parseHexCoord(exportedHeroMap))
  await captureFixture?.("add.save-load", saved)

  await page.evaluate(
    ({ key }) => {
      const raw = window.localStorage.getItem(key)
      if (!raw) throw new Error("Missing ADD autosave after export")
      const record = JSON.parse(raw)
      record.savedAtMs = Date.now() - 60 * 60 * 1000
      window.localStorage.setItem(key, JSON.stringify(record))
    },
    { key: ADD_AUTOSAVE_STORAGE_KEY },
  )
  await page.reload({ waitUntil: "domcontentloaded" })
  const reloaded = await waitForTextState(
    page,
    (state) =>
      state.runtime?.ready === true &&
      state.runtime?.error === null &&
      state.snapshot?.heroAssigned === advanced.snapshot.heroAssigned &&
      state.persistence?.autosaveAvailable === true &&
      state.persistence?.lastOfflineCatchupSeconds >= 3500 &&
      state.snapshot?.clockSeconds >= exportedClock + 3500 &&
      state.snapshot?.discoveredCellCount === exportedDiscoveryCount,
    consoleErrors,
    16000,
  )
  assert.ok(reloaded.snapshot.clockSeconds > exportedClock)
  assert.equal(
    reloaded.ui.worldTime.animating,
    false,
    "Offline catch-up on reload should snap the clock, not animate the jump.",
  )
  assert.ok(
    Math.abs(
      reloaded.ui.worldTime.presentationClockSeconds -
        reloaded.ui.worldTime.authoritativeClockSeconds,
    ) <= 1.1,
    "Offline catch-up should leave the presentation clock snapped to authoritative, not crawling.",
  )
  assert.deepEqual(
    sortedCells(reloaded.snapshot.discoveredCells),
    exportedDiscoveredCells,
    "Autosave reload should preserve the same discovered cells after offline catch-up.",
  )

  await openDeveloperTools(page, consoleErrors)
  await page.locator("#save-payload").fill(payload)
  await page.locator("#import-save").click()
  const imported = await waitForTextState(
    page,
    (state) =>
      state.runtime?.error === null &&
      state.persistence?.lastImportAtMs !== null &&
      state.snapshot?.clockSeconds < reloaded.snapshot.clockSeconds - 1000 &&
      state.snapshot?.discoveredCellCount === exportedDiscoveryCount &&
      state.snapshot?.heroMap === exportedHeroMap &&
      sameCells(state.snapshot?.discoveredCells, exportedDiscoveredCells),
    consoleErrors,
  )
  assert.ok(imported.persistence.lastImportAtMs)

  const offlineCommands = browserScenarioCommands(OFFLINE_RETURN_SCENARIO)
  assert.deepEqual(
    OFFLINE_RETURN_SCENARIO.commands.map((command) => command.type),
    ["RunOfflineCatchup", "SaveRoundTrip"],
    "The browser smoke and headless harness must keep the offline scenario contract aligned.",
  )
  const canonicalOfflineCommand = CANONICAL_IDLE_LOOP_SCENARIO.commands.find(
    (command) => command.type === "RunOfflineCatchup",
  )
  assert.deepEqual(
    canonicalOfflineCommand,
    { type: "RunOfflineCatchup", seconds: 3600 },
    "The canonical idle loop must reuse the same one-hour browser catch-up control.",
  )
  assert.deepEqual(
    canonicalOfflineCommand,
    offlineCommands[0],
    "The canonical idle loop and standalone offline fixture must share the browser command.",
  )
  const offlineTicked = await runBrowserScenarioCommand(
    page,
    canonicalOfflineCommand,
    consoleErrors,
  )
  assert.ok(offlineTicked.snapshot.clockSeconds > imported.snapshot.clockSeconds)
  assert.equal(offlineTicked.ui.firstPlayable.persistenceReady, true)
  assert.equal(offlineTicked.offlineReturn.source, "manual")
  await closeDeveloperTools(page, consoleErrors)
  await page.locator("#offline-return-panel").waitFor({ state: "visible" })
  const offlineReview = await renderGameToText(page)
  await captureFixture?.("add.offline-return", offlineReview)
  assertV1InterfaceContext(offlineReview, "return", { source: "offline_return" })
  assert.equal(
    offlineReview.shell?.questPanel?.collapsed,
    true,
    "Completed first-playable tracker should stay collapsed during offline return.",
  )
  assert.equal(
    offlineReview.shell?.questPanel?.collapseControlLabel,
    "Open first arc journal",
    "Completed tracker should become an optional first-arc journal.",
  )
  assert.equal(
    await page.locator("#first-playable-body").isHidden(),
    true,
    "Completed first-playable journal body should not compete with the return review.",
  )
  const completedObjectiveRect = await page.locator("#first-playable-panel").boundingBox()
  assert.ok(
    completedObjectiveRect && completedObjectiveRect.height <= 72,
    `Completed objective chip should stay compact during return review, saw ${JSON.stringify(
      completedObjectiveRect,
    )}.`,
  )
  await assertVisibleText(page, "#first-playable-panel", ["Arc complete", "11/11", "Journal"])
  assert.ok(
    Array.isArray(offlineTicked.offlineReturn.resourceDeltas),
    "Offline return should expose resource gains as an array.",
  )
  assert.ok(
    offlineTicked.offlineReturn.summary.includes("manual") ||
      offlineTicked.offlineReturn.summary.includes("online-only"),
    "Offline return should explain what did not progress.",
  )
  assert.deepEqual(
    new Set(offlineTicked.offlineReturn.didNotProgress.map((rule) => rule.id)),
    new Set([
      "manual_hero_world_actions",
      "base_stone_collection",
      "base_water_collection",
    ]),
    "Offline return should preserve the explicit online-only rule split.",
  )
  assert.equal(typeof offlineTicked.offlineReturn.bubble.summary, "string")
  assert.equal(typeof offlineTicked.offlineReturn.brownout.summary, "string")
  assert.equal(typeof offlineTicked.offlineReturn.nextAction.label, "string")
  assert.ok(
    offlineTicked.offlineReturn.review.blockerCount >= offlineTicked.offlineReturn.didNotProgress.length,
    "Offline return review should make blocker count scannable.",
  )
  assert.match(
    offlineTicked.offlineReturn.review.manualProgressionRule,
    /Automated|manual|online/i,
    "Offline return review should clarify manual-vs-offline progression rules.",
  )
  await assertLayoutHierarchy(page, {
    expectedContextPanelId: "offline-return-panel",
  })
  await assertFloatingPanelDraggable(page, {
    panelSelector: "#offline-return-panel",
    handleSelector: "#offline-return-panel .offline-return-heading",
    dx: -72,
    dy: 48,
  })
  const draggedReturnPanel = await renderGameToText(page)
  assert.equal(draggedReturnPanel.shell.popins.offlineReturn.lastAction, "dragged")
  assert.equal(draggedReturnPanel.shell.popins.offlineReturn.bounded, true)
  await assertClickableCenter(page, "#dismiss-offline-return-primary")
  await assertVisibleText(page, "#offline-return-panel", [
    "While you were away",
    "Manual catch-up",
    "Gained",
    "Completed",
    "Recruits",
    "Bubble",
    "Brownouts",
    "Blockers",
    "Unchanged systems",
    "Offline rules",
    "Automated loops only",
    "After dismissing",
    "Continue to next action",
  ])
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-offline-return-smoke.png",
    "ADD RPG offline return summary screenshot",
  )
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-offline-return-hierarchy-smoke.png",
    "ADD RPG offline return layout hierarchy screenshot",
  )
  await page.locator("#offline-return-panel .offline-return-heading").focus()
  await page.keyboard.press("Enter")
  await page.locator("#offline-return-panel").waitFor({ state: "hidden" })
  await waitForTextState(
    page,
    (state) =>
      state.offlineReturn === null &&
      state.shell?.currentAction?.source !== "offline_return" &&
      state.shell?.currentAction?.label === offlineTicked.offlineReturn.nextAction.label,
    consoleErrors,
  )

  await openDeveloperTools(page, consoleErrors)
  await page.locator("#reset-runtime").click()
  const reset = await waitForTextState(
    page,
    (state) =>
      state.runtime?.error === null &&
      state.persistence?.resetCount > 0 &&
      state.snapshot?.clockSeconds < RESET_CLOCK_TOLERANCE_SECONDS &&
      state.snapshot?.heroAssigned === false &&
      initialDiscoveryShapeReady(state) &&
      state.snapshot?.heroMap === state.map?.landmarks?.survivorCave,
    consoleErrors,
  )
  assert.equal(reset.snapshot.heroAssigned, false)
  assertInitialDiscoveryAnchors(reset)

  await page.locator("#save-payload").fill("{ invalid add save")
  assert.equal(await page.locator("#save-payload").inputValue(), "{ invalid add save")
  await page.locator("#import-save").dispatchEvent("click")
  const errored = await waitForTextState(
    page,
    (state) => typeof state.runtime?.error === "string" && state.runtime.error.length > 0,
    consoleErrors,
  )
  assert.ok(errored.runtime.error)

  await page.locator("#reset-runtime").click()
  await waitForTextState(
    page,
    (state) =>
      state.runtime?.error === null &&
      state.snapshot?.clockSeconds < RESET_CLOCK_TOLERANCE_SECONDS,
    consoleErrors,
  )
  await closeDeveloperTools(page, consoleErrors)

  return { payload }
}

async function openAdmin(page, consoleErrors) {
  const state = await renderGameToText(page)
  if (state.shell?.adminOpen === true) return state

  await page.locator("#open-shell-menu").click()
  await waitForTextState(
    page,
    (nextState) => nextState.shell?.shellMenuOpen === true,
    consoleErrors,
  )
  await page.locator("#open-admin").click()
  await page.locator("#admin-view.open").waitFor({ state: "visible" })
  return waitForTextState(
    page,
    (nextState) =>
      nextState.shell?.adminOpen === true &&
      nextState.shell?.shellMenuOpen === false &&
      nextState.shell?.devToolsOpen === false,
    consoleErrors,
  )
}

async function openSettings(page, consoleErrors) {
  const state = await renderGameToText(page)
  if (state.shell?.settingsOpen === true) return state

  await page.locator("#open-shell-menu").click()
  await waitForTextState(
    page,
    (nextState) => nextState.shell?.shellMenuOpen === true,
    consoleErrors,
  )
  const menuText = await page.locator("#shell-menu-panel").innerText()
  ;["Player", "Tools", "Settings", "Admin", "Dev"].forEach((expectedText) => {
    assert.match(menuText, new RegExp(expectedText, "i"), `Shell menu should include ${expectedText}.`)
  })
  await page.locator("#open-settings").click()
  await page.locator("#settings-view.open").waitFor({ state: "visible" })
  return waitForTextState(
    page,
    (nextState) =>
      nextState.shell?.settingsOpen === true &&
      nextState.shell?.adminOpen === false &&
      nextState.shell?.devToolsOpen === false &&
      nextState.shell?.shellMenuOpen === false,
    consoleErrors,
  )
}

async function openDeveloperTools(page, consoleErrors) {
  const state = await renderGameToText(page)
  if (state.shell?.devToolsOpen === true) return state
  if (state.shell?.settingsOpen === true) {
    await closeSettings(page, consoleErrors)
  }
  if (state.shell?.adminOpen === true) {
    await closeAdmin(page, consoleErrors)
  }

  await page.locator("#open-shell-menu").click()
  await waitForTextState(
    page,
    (nextState) => nextState.shell?.shellMenuOpen === true,
    consoleErrors,
  )
  await page.locator("#open-dev-menu").click()
  await page.locator("#dev-view.open").waitFor({ state: "visible" })
  await page.locator("#developer-tools-body").waitFor({ state: "visible" })
  await page.locator("#save-payload").waitFor({ state: "visible" })
  return waitForTextState(
    page,
    (nextState) =>
      nextState.shell?.settingsOpen === false &&
      nextState.shell?.adminOpen === false &&
      nextState.shell?.devToolsOpen === true &&
      nextState.shell?.shellMenuOpen === false &&
      nextState.shell?.interfaceHierarchy?.advanced?.developerOpen === true,
    consoleErrors,
  )
}

async function closeSettings(page, consoleErrors) {
  const state = await renderGameToText(page)
  if (state.shell?.settingsOpen !== true) return state

  await page.locator("#close-settings").click()
  const closed = await waitForTextState(
    page,
    (nextState) => nextState.shell?.settingsOpen === false,
    consoleErrors,
  )
  await page.waitForTimeout(240)
  return closed
}

async function closeAdmin(page, consoleErrors) {
  const state = await renderGameToText(page)
  if (state.shell?.adminOpen !== true) return state

  await page.locator("#close-admin").click()
  const closed = await waitForTextState(
    page,
    (nextState) => nextState.shell?.adminOpen === false && nextState.shell?.devToolsOpen === false,
    consoleErrors,
  )
  await page.waitForTimeout(240)
  return closed
}

async function closeDeveloperTools(page, consoleErrors) {
  const state = await renderGameToText(page)
  if (state.shell?.devToolsOpen !== true) return state

  await page.locator("#close-dev").click()
  const closed = await waitForTextState(
    page,
    (nextState) => nextState.shell?.devToolsOpen === false,
    consoleErrors,
  )
  await page.waitForTimeout(240)
  return closed
}

async function assertVisibleText(page, selector, fragments) {
  const locator = page.locator(selector)
  await locator.waitFor({ state: "visible" })
  const text = await locator.textContent()
  for (const fragment of fragments) {
    assert.ok(
      text?.includes(fragment),
      `Expected ${selector} to include "${fragment}", got: ${text}`,
    )
  }
}

async function clickMapMode(page, mode) {
  const locator = page.locator(`#map-mode-${mode}`)
  await locator.waitFor({ state: "attached" })
  await locator.dispatchEvent("click")
}

async function exerciseQuestHud(page, consoleErrors) {
  const handle = page.locator(".first-playable-drag-handle")
  await handle.waitFor({ state: "visible" })
  const before = await renderGameToText(page)
  assert.equal(before.shell?.questPanel?.collapsed, true)
  assert.equal(before.shell?.questPanel?.dragEnabled, true)
  assert.equal(before.shell?.questPanel?.keyboardMoveEnabled, true)
  assert.equal(before.shell?.questPanel?.dragging, false)
  assert.equal(await page.locator("#first-playable-body").isHidden(), true)
  await assertVisibleText(page, "#first-playable-panel", ["Reach the Studio", "0/11", "Show"])

  await handle.focus()
  await waitForTextState(
    page,
    (state) => state.shell?.accessibility?.focusedRegion === "objective_tracker",
    consoleErrors,
  )
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("ArrowDown")
  const keyboardMoved = await waitForTextState(
    page,
    (state) =>
      Math.abs((state.shell?.questPanel?.x ?? 0) - before.shell.questPanel.x) >= 12 &&
      Math.abs((state.shell?.questPanel?.y ?? 0) - before.shell.questPanel.y) >= 12 &&
      state.shell?.questPanel?.lastAction === "keyboard_moved" &&
      state.shell?.questPanel?.dragging === false,
    consoleErrors,
  )

  await page.locator("#toggle-first-playable-panel").click()
  await page.locator("#first-playable-body").waitFor({ state: "visible" })
  const expandedOnce = await waitForTextState(
    page,
    (state) =>
      state.shell?.questPanel?.collapsed === false &&
      state.shell.questPanel.lastAction === "expanded" &&
      state.shell.questPanel.collapseControlLabel === "Collapse objective tracker",
    consoleErrors,
  )
  assert.equal(expandedOnce.shell.questPanel.x, keyboardMoved.shell.questPanel.x)
  assert.equal(expandedOnce.shell.questPanel.y, keyboardMoved.shell.questPanel.y)
  await assertVisibleText(page, "#first-playable-body", [
    "Tracking: Reach the Studio",
    "First Glimpse",
    "Recruit Once",
  ])

  await page.locator("#toggle-first-playable-panel").click()
  await page.locator("#first-playable-body").waitFor({ state: "hidden" })
  const collapsed = await waitForTextState(
    page,
    (state) =>
      state.shell?.questPanel?.collapsed === true &&
      state.shell.questPanel.x === keyboardMoved.shell.questPanel.x &&
      state.shell.questPanel.y === keyboardMoved.shell.questPanel.y &&
      state.shell.questPanel.lastAction === "collapsed" &&
      state.shell.questPanel.collapseControlLabel === "Expand objective tracker",
    consoleErrors,
  )

  await page.locator("#toggle-first-playable-panel").click()
  await page.locator("#first-playable-body").waitFor({ state: "visible" })
  const expanded = await waitForTextState(
    page,
    (state) =>
      state.shell?.questPanel?.collapsed === false &&
      state.shell.questPanel.x === collapsed.shell.questPanel.x &&
      state.shell.questPanel.y === collapsed.shell.questPanel.y &&
      state.shell.questPanel.lastAction === "expanded" &&
      state.shell.questPanel.collapseControlLabel === "Collapse objective tracker",
    consoleErrors,
  )
  await page.locator(".first-playable-drag-handle").focus()
  return expanded
}

async function assertIdleAmbientClockAdvances(page) {
  // Idle (no input): ambient world clock runs at ~1 game-minute per real second,
  // snapping each tick (presentation tracks authoritative, never animating).
  const before = await renderGameToText(page)
  await page.waitForTimeout(2500)
  const after = await renderGameToText(page)
  const advance = after.snapshot.clockSeconds - before.snapshot.clockSeconds
  assert.ok(
    advance >= 1 && advance <= 6,
    `Idle ambient clock should advance ~1 game-min/sec (saw ${advance}s over ~2.5s).`,
  )
  assert.equal(
    after.ui.worldTime.animating,
    false,
    "Idle ambient ticks should snap the clock, not animate it.",
  )
  assert.ok(
    Math.abs(
      after.ui.worldTime.presentationClockSeconds -
        after.ui.worldTime.authoritativeClockSeconds,
    ) <= 1.1,
    "Idle presentation clock should track the authoritative clock.",
  )
}

async function assertHeroStartsAtSurvivorCave(page, state) {
  const canvas = page.locator("#add-world canvas")
  await canvas.waitFor({ state: "visible" })
  assert.equal(
    await page.locator("#map-focus-cave").count(),
    0,
    "The map HUD should stay minimal and expose zoom controls only.",
  )
  const box = await canvas.boundingBox()
  assert.ok(box, "ADD RPG Phaser canvas should have a browser box")
  const character = state.map?.character
  const camera = state.map?.camera
  assert.equal(character?.coord, state.map?.landmarks?.survivorCave)
  assert.equal(character?.cell, `hex:${state.map.landmarks.survivorCave}`)
  const cameraOrigin = {
    x: box.width / 2,
    y: box.height / 2,
  }
  const screenX = (character.x - camera.scrollX - cameraOrigin.x) * camera.zoom + cameraOrigin.x
  const screenY = (character.y - camera.scrollY - cameraOrigin.y) * camera.zoom + cameraOrigin.y
  assert.ok(
    Math.abs(screenX - box.width / 2) <= 10,
    `Survivor Cave/Hero should start horizontally centered, got ${screenX} for ${box.width}`,
  )
  assert.ok(
    Math.abs(screenY - box.height / 2) <= 10,
    `Survivor Cave/Hero should start vertically centered, got ${screenY} for ${box.height}`,
  )
}

async function characterScreenPoint(page, state) {
  const character = state.map?.character
  assert.ok(character, "ADD RPG telemetry should expose character coordinates")
  assert.ok(Number.isFinite(character.x), "ADD RPG character should expose a world x")
  assert.ok(Number.isFinite(character.y), "ADD RPG character should expose a world y")
  return worldScreenPoint(page, state, { x: character.x, y: character.y })
}

async function worldScreenPoint(page, state, worldPoint) {
  return (await worldScreenPointCandidates(page, state, worldPoint))[0]
}

async function worldScreenPointCandidates(page, state, worldPoint) {
  const canvas = page.locator("#add-world canvas")
  await canvas.waitFor({ state: "visible" })
  const box = await canvas.boundingBox()
  assert.ok(box, "ADD RPG Phaser canvas should have a browser box")
  const camera = state.map?.camera
  assert.ok(camera, "ADD RPG telemetry should expose camera coordinates")
  const cameraOrigin = {
    x: box.width / 2,
    y: box.height / 2,
  }
  return [
    {
      x: box.x + (worldPoint.x - camera.scrollX - cameraOrigin.x) * camera.zoom + cameraOrigin.x,
      y: box.y + (worldPoint.y - camera.scrollY - cameraOrigin.y) * camera.zoom + cameraOrigin.y,
    },
    {
      x: box.x + (worldPoint.x - camera.scrollX) * camera.zoom,
      y: box.y + (worldPoint.y - camera.scrollY) * camera.zoom,
    },
  ]
}

async function clickWorldPointUntilSelected(page, state, worldPoint, predicate, consoleErrors) {
  if (predicate(state)) return state
  const candidates = await worldScreenPointCandidates(page, state, worldPoint)
  let lastError
  for (const point of candidates) {
    await page.mouse.move(point.x, point.y)
    await page.mouse.click(point.x, point.y)
    try {
      return await waitForTextState(page, predicate, consoleErrors, 700)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error("No world-point candidate selected the expected cell.")
}

async function clickViewportPointUntilSelected(page, viewportPoint, predicate, consoleErrors) {
  const current = await renderGameToText(page)
  if (predicate(current)) return current
  const canvas = page.locator("#add-world canvas")
  await canvas.waitFor({ state: "visible" })
  const box = await canvas.boundingBox()
  assert.ok(box, "ADD RPG Phaser canvas should have a browser box")
  const candidates = [
    { x: box.x + viewportPoint.x, y: box.y + viewportPoint.y },
    { x: box.x + viewportPoint.x + 12, y: box.y + viewportPoint.y },
    { x: box.x + viewportPoint.x - 12, y: box.y + viewportPoint.y },
    { x: box.x + viewportPoint.x, y: box.y + viewportPoint.y + 12 },
    { x: box.x + viewportPoint.x, y: box.y + viewportPoint.y - 12 },
  ]
  let lastError
  for (const point of candidates) {
    await page.mouse.move(point.x, point.y)
    await page.mouse.click(point.x, point.y)
    try {
      return await waitForTextState(page, predicate, consoleErrors, 700)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error("No viewport-point candidate selected the expected cell.")
}

async function assertStudioObjectiveMarkerIsLabelOnly(page, consoleErrors) {
  const before = await renderGameToText(page)
  assertInitialDiscoveryAnchors(before)
  const studioCell = `hex:${before.map.landmarks.baseCenter}`

  for (let index = 0; index < 3; index += 1) {
    await page.locator("#map-zoom-out").click()
  }

  const zoomed = await waitForTextState(
    page,
    (state) =>
      state.mapMode?.active === "overworld_hex" &&
      state.map?.landmarks?.studioLabelVisible === true &&
      state.map?.landmarks?.baseCenterViewport !== null &&
      !state.snapshot?.discoveredCells?.includes(state.map.landmarks.baseCenter),
    consoleErrors,
  )

  const canvas = page.locator("#add-world canvas")
  await canvas.waitFor({ state: "visible" })
  const box = await canvas.boundingBox()
  assert.ok(box, "ADD RPG Phaser canvas should have a browser box")
  await page.mouse.click(
    box.x + zoomed.map.landmarks.baseCenterViewport.x,
    box.y + zoomed.map.landmarks.baseCenterViewport.y,
  )
  await page.waitForTimeout(120)

  const after = await renderGameToText(page)
  assert.equal(after.map.landmarks.studioLabelVisible, true)
  assert.ok(
    !after.snapshot.discoveredCells.includes(after.map.landmarks.baseCenter),
    "The distant Studio objective label must not reveal the hidden Studio hex.",
  )
  assert.notEqual(
    after.map.interaction.selectedCell,
    studioCell,
    "Clicking the distant Studio label must not select a hidden hex.",
  )
  assert.notEqual(
    after.discovery?.tileDetail?.cell,
    studioCell,
    "Clicking the distant Studio label must not expose Studio tile details.",
  )
  return after
}

async function exerciseStudioTileDetailLinks(page, consoleErrors) {
  const before = await renderGameToText(page)
  const restoreQuestPanel = before.shell?.questPanel?.collapsed === false
  if (restoreQuestPanel) {
    await page.locator("#toggle-first-playable-panel").click()
    await waitForTextState(
      page,
      (state) => state.shell?.questPanel?.collapsed === true,
      consoleErrors,
    )
  }

  try {
    for (let index = 0; index < 3; index += 1) {
      await page.locator("#map-zoom-out").click()
    }

    const zoomed = await waitForTextState(
      page,
      (state) =>
        state.mapMode?.active === "overworld_hex" &&
        typeof state.map?.landmarks?.baseCenter === "string" &&
        state.map?.landmarks?.baseCenterViewport !== null,
      consoleErrors,
    )
    const studioCell = `hex:${zoomed.map.landmarks.baseCenter}`
    const selectedStudio = await clickViewportPointUntilSelected(
      page,
      zoomed.map.landmarks.baseCenterViewport,
      (state) =>
        state.mapMode?.active === "overworld_hex" &&
        state.discovery?.tileDetail?.cell === studioCell &&
        state.discovery.tileDetail.label === "The Studio" &&
        state.discovery.tileDetail.hasSubmap === true &&
        state.discovery.tileDetail.linkCount >= 2 &&
        state.discovery.tileDetail.linkKinds.includes("base") &&
        state.discovery.tileDetail.linkKinds.includes("area") &&
        state.discovery.tileDetail.linkLabels.includes("The Studio") &&
        state.discovery.tileDetail.linkLabels.includes("Studio Grounds") &&
        state.discovery.tileDetail.targetMapModes.includes("base_square") &&
        state.discovery.tileDetail.targetMapModes.includes("area_hex") &&
        state.discovery.tileDetail.targetMapIds.includes("add.rpg.base.studio") &&
        state.discovery.tileDetail.targetMapIds.includes("add.rpg.area.studio-grounds") &&
        state.discovery.tileDetail.actionIds.includes(
          "tile-action:base:tile-link:base:studio-echo",
        ) &&
        state.discovery.tileDetail.enabledLinkIds.some((id) => id.includes("base")) &&
        state.discovery.tileDetail.actionKinds.includes("manage_base") &&
        state.discovery.tileDetail.actionKinds.includes("enter_submap") &&
        !state.discovery.tileDetail.targetMapIds.includes("add.rpg.dungeon.studio"),
      consoleErrors,
    )
    assert.ok(selectedStudio.discovery.tileDetail.linkCount >= 2)
    assert.equal(
      await page.locator("#selected-tile-decision").count(),
      0,
      "The minimal overworld UI should keep Studio tile detail out of a side panel.",
    )
    await assertNonBlankNamedAppScreenshot(
      page,
      "add-rpg-studio-selected-minimal-smoke.png",
      "ADD RPG selected Studio minimal overworld screenshot",
    )

    await clickUntilTextState(
      page,
      "#map-mode-area_hex",
      (state) =>
        state.mapMode?.active === "area_hex" &&
        state.map?.mapId === "add.rpg.area.studio-grounds" &&
        state.map?.character?.cell === "hex:4,-2" &&
        state.map?.character?.coord === "4,-2" &&
        state.map?.landmarks?.renderedCount >= 1,
      consoleErrors,
      3,
      1800,
    )
    await assertNonBlankNamedAppScreenshot(
      page,
      "add-rpg-studio-area-entry-smoke.png",
      "ADD RPG Studio area side-entry screenshot",
    )

    return await returnToOverworld(page, consoleErrors)
  } finally {
    const afterReturn = await returnToOverworld(page, consoleErrors)
    if (restoreQuestPanel && afterReturn.shell?.questPanel?.collapsed === true) {
      await page.locator("#toggle-first-playable-panel").click()
      await waitForTextState(
        page,
        (nextState) => nextState.shell?.questPanel?.collapsed === false,
        consoleErrors,
      )
    }
  }
}

async function returnToOverworld(page, consoleErrors) {
  const state = await renderGameToText(page)
  if (state.mapMode?.active === "overworld_hex") return state

  const returnButton = page.locator("#return-overworld")
  if (await returnButton.isVisible()) {
    try {
      await clickVisibleElementByDomId(page, "return-overworld")
    } catch {
      await clickVisibleElementByDomId(page, "map-mode-overworld_hex")
    }
  } else {
    await clickVisibleElementByDomId(page, "map-mode-overworld_hex")
  }
  return waitForTextState(
    page,
    (nextState) => nextState.mapMode?.active === "overworld_hex",
    consoleErrors,
  )
}

async function exerciseSurvivorCaveDungeonEntry(page, consoleErrors) {
  const before = await renderGameToText(page)
  assert.equal(before.mapMode.active, "overworld_hex")
  assert.equal(before.map.character.coord, before.map.landmarks.survivorCave)
  assert.ok(before.map.landmarks.survivorCaveViewport, "Survivor Cave viewport point should be available.")
  const canvas = page.locator("#add-world canvas")
  await canvas.waitFor({ state: "visible" })
  const box = await canvas.boundingBox()
  assert.ok(box, "ADD RPG Phaser canvas should have a browser box")
  const cavePoint = {
    x: box.x + before.map.landmarks.survivorCaveViewport.x,
    y: box.y + before.map.landmarks.survivorCaveViewport.y,
  }

  await page.mouse.move(cavePoint.x, cavePoint.y)
  const selectedCave = await waitForTextState(
    page,
    (state) =>
      state.mapMode?.active === "overworld_hex" &&
      state.map?.character?.coord === state.map?.landmarks?.survivorCave &&
      state.discovery?.phase === "enter_dungeon" &&
      state.discovery?.dungeonEntryAvailable === true &&
      state.map?.interaction?.primaryMarkerVisible === true &&
      state.map?.interaction?.activeCell === state.map?.character?.cell,
    consoleErrors,
  )
  assert.ok(
    selectedCave.map.character.dungeonLinksAtCell.some(
      (link) =>
        link.enabled === true &&
        link.label === "Survivor Cave" &&
        link.targetMapId === "add.rpg.dungeon.survivor-cave",
    ),
    "The Hero should stand on an enabled Survivor Cave dungeon link.",
  )
  assert.equal(selectedCave.discovery.phase, "enter_dungeon")
  assert.equal(selectedCave.discovery.dungeonEntryAvailable, true)

  await page.waitForTimeout(160)
  await page.mouse.click(cavePoint.x, cavePoint.y)
  const dungeon = await waitForTextState(
    page,
    (state) =>
      state.mapMode?.active === "dungeon_square" &&
      state.mapMode?.topology === "square" &&
      state.mapMode?.scale?.travelScale === "local" &&
      state.mapMode?.scale?.timePerCellSeconds === null &&
      state.map?.mapId === "add.rpg.dungeon.survivor-cave" &&
      state.map?.topology?.kind === "square" &&
      state.map?.validationValid === true &&
      state.map?.character?.cell === "square:2,4" &&
      state.map?.interaction?.lastTileActivation?.accepted === true &&
      state.map?.interaction?.lastTileActivation?.trigger === "tile_click" &&
      state.map?.interaction?.lastTileActivation?.cell === selectedCave.map.character.cell &&
      state.dungeonObjective?.active === true &&
      state.dungeonObjective?.label === "Survivor Cave" &&
      state.dungeonObjective?.mapId === "add.rpg.dungeon.survivor-cave" &&
      state.dungeonObjective?.currentStepId === "survey-cave-mouth" &&
      state.dungeonObjective?.returnAvailable === true &&
      state.dungeonContext?.active === true &&
      state.dungeonContext?.panel === "dungeon_context" &&
      state.dungeonContext?.currentObjective?.currentStepId === "survey-cave-mouth" &&
      state.dungeonContext?.returnAction?.available === true &&
      state.dungeonContext?.discoveredExits?.labels?.includes("Return to overworld") &&
      state.dungeonContext?.blockers?.hiddenCells > 0 &&
      state.dungeonContext?.localMapState?.heroCell === "square:2,4",
    consoleErrors,
  )
  assert.equal(dungeon.ui.firstPlayable.currentStepId, before.ui.firstPlayable.currentStepId)
  assertV1InterfaceContext(dungeon, "dungeon", { source: "dungeon_objective" })
  assert.ok(
    dungeon.dungeonObjective.stepStatuses.some(
      (step) => step.id === "return-overworld" && step.status === "next",
    ),
    "Dungeon objective should include a return step.",
  )
  assert.match(
    await page.locator("#first-playable-panel").innerText(),
    /Survivor Cave|safe threshold|cave/i,
    "The objective panel should switch to cave-specific dungeon copy.",
  )
  const dungeonPanelText = await page.locator("#dungeon-context-panel").innerText()
  ;[
    "Dungeon status",
    "Current objective",
    "Discovered exits",
    "Blockers",
    "Local map",
    "Return to overworld",
  ].forEach((expectedText) => {
    assert.match(
      dungeonPanelText,
      new RegExp(expectedText, "i"),
      `Dungeon context panel should include ${expectedText}.`,
    )
  })
  assert.doesNotMatch(
    dungeonPanelText,
    /Return outside/i,
    "Dungeon context panel should not duplicate the full left objective step list.",
  )
  assert.doesNotMatch(
    dungeonPanelText,
    /Road to Base|Follow the low signal|Keep moving through the ash/i,
    "Dungeon context panel should stay local to dungeon mode, not global story choices.",
  )
  await assertLayoutHierarchy(page, {
    expectedContextPanelId: "dungeon-context-panel",
    expectedMapMode: "dungeon_square",
  })
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-survivor-cave-entry-smoke.png",
    "ADD RPG Survivor Cave entry screenshot",
  )
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-dungeon-hierarchy-smoke.png",
    "ADD RPG dungeon layout hierarchy screenshot",
  )

  await clickVisibleElementByDomId(page, "return-overworld")
  const returned = await waitForTextState(
    page,
    (state) =>
      state.mapMode?.active === "overworld_hex" &&
      state.mapMode?.scale?.travelScale === "strategic" &&
      state.map?.topology?.kind === "hex" &&
      state.map?.character?.coord === before.map.character.coord &&
      state.discovery?.phase === "enter_dungeon" &&
      state.discovery?.dungeonEntryAvailable === true &&
      state.dungeonObjective === null,
    consoleErrors,
  )
  assert.equal(returned.snapshot.clockSeconds >= before.snapshot.clockSeconds, true)
  return returned
}

async function exerciseMainCharacterMovement(page, consoleErrors) {
  const before = await renderGameToText(page)
  assert.equal(before.map?.character?.visible, true)
  assert.ok(before.map?.character?.cell, "Main character should report a cell")
  assert.equal(before.travel?.confirmation?.dramaState, "fresh")
  assert.equal(before.travel?.confirmation?.eligible, true)
  assert.equal(
    before.travel?.confirmation?.reason,
    "opening_reach_base_from_survivor_cave",
  )

  const heroPoint = await characterScreenPoint(page, before)
  const travelTarget = await clickReachableTravelCandidate(page, heroPoint, consoleErrors)
  const expectedDestinationCell = travelTarget.discovery.selectedTile.cell
  assert.equal(travelTarget.shell.currentAction.primaryLabel, "Travel to this region")
  assert.equal(travelTarget.shell.currentAction.kind, "travel")
  assert.equal(travelTarget.discovery.selectedTile.travelMinutes, 60)
  assert.equal(travelTarget.map.presentation.mapPrimaryAffordances.pathTimePreviewVisible, true)

  await clickVisibleCurrentAction(page, travelTarget)
  const firstDialog = await waitForTextState(
    page,
    (state) =>
      state.travel?.confirmation?.dialogOpen === true &&
      state.travel.confirmation.dialogKind === "first_warning" &&
      state.map?.character?.cell === before.map.character.cell,
    consoleErrors,
  )
  assert.equal(firstDialog.travel.confirmation.dramaState, "fresh")
  assert.equal(firstDialog.travel.confirmation.eligible, true)
  assert.equal(
    firstDialog.travel.confirmation.reason,
    "opening_reach_base_from_survivor_cave",
  )
  assert.equal(firstDialog.shell.currentAction.primaryLabel, "Travel to this region")
  await assertFloatingPanelDraggable(page, {
    panelSelector: "#travel-confirmation-dialog",
    handleSelector: ".travel-dialog-handle",
    dx: 68,
    dy: 42,
  })
  const draggedDialog = await renderGameToText(page)
  assert.equal(draggedDialog.shell.popins.travelDialog.lastAction, "dragged")
  assert.equal(draggedDialog.shell.popins.travelDialog.bounded, true)
  await assertClickableCenter(page, "#travel-dialog-cancel")

  await page.evaluate(() => document.getElementById("objective-primary-action")?.focus())
  await page.keyboard.press("Enter")
  await waitForTextState(
    page,
    (state) =>
      state.travel?.confirmation?.dialogOpen === true &&
      state.travel.confirmation.dialogKind === "second_warning" &&
      state.map?.character?.cell === before.map.character.cell,
    consoleErrors,
  )
  await page.waitForFunction(
    () => document.activeElement?.closest("#travel-confirmation-dialog") !== null,
    undefined,
    { timeout: 1000 },
  )
  await page.keyboard.press("Escape")
  await waitForTextState(
    page,
    (state) =>
      state.travel?.confirmation?.dialogOpen === false &&
      state.travel.confirmation.dramaState === "declined_once" &&
      state.map?.character?.cell === before.map.character.cell,
    consoleErrors,
  )

  const afterDismiss = await renderGameToText(page)
  await clickVisibleCurrentAction(page, afterDismiss)
  await waitForTextState(
    page,
    (state) =>
      state.travel?.confirmation?.dialogOpen === true &&
      state.travel.confirmation.dialogKind === "dramatic_reprise" &&
      state.map?.character?.cell === before.map.character.cell,
    consoleErrors,
  )
  await page.keyboard.press("Escape")
  await waitForTextState(
    page,
    (state) =>
      state.travel?.confirmation?.dialogOpen === false &&
      state.travel.confirmation.dramaState === "declined_once" &&
      state.map?.character?.cell === before.map.character.cell,
    consoleErrors,
  )

  const afterRepriseCancel = await renderGameToText(page)
  await clickVisibleCurrentAction(page, afterRepriseCancel)
  await waitForTextState(
    page,
    (state) =>
      state.travel?.confirmation?.dialogOpen === true &&
      state.travel.confirmation.dialogKind === "dramatic_reprise" &&
      state.map?.character?.cell === before.map.character.cell,
    consoleErrors,
  )
  await page.evaluate(() => document.getElementById("objective-primary-action")?.focus())
  await page.keyboard.press("Enter")
  const minimumArrivalClockSeconds = before.snapshot.clockSeconds + 59
  const observedTravelClockTimes = new Set()
  const observedTravelRevealProgress = new Set()
  await assertTravelRevealPreview(page, consoleErrors, {
    observedTravelClockTimes,
    observedTravelRevealProgress,
  })
  const moved = await waitForTextState(
    page,
    (state) => {
      if (state.ui?.worldTime?.animating && state.ui.worldTime.localTime) {
        observedTravelClockTimes.add(state.ui.worldTime.localTime)
      }
      if (state.map?.visibility?.travelRevealPreviewActive) {
        observedTravelRevealProgress.add(state.map.visibility.travelRevealPreviewProgress)
      }
      const presentationClockSeconds =
        state.ui?.worldTime?.presentationClockSeconds ?? state.snapshot?.clockSeconds ?? 0
      const authoritativeClockSeconds =
        state.ui?.worldTime?.authoritativeClockSeconds ?? state.snapshot?.clockSeconds ?? 0
      const presentationCaughtUp =
        presentationClockSeconds >= minimumArrivalClockSeconds &&
        authoritativeClockSeconds - presentationClockSeconds <= 1.1
      return (
        typeof state.map?.character?.lastMoveDirection === "string" &&
        state.map?.character?.lastMoveAccepted === true &&
        state.map?.character?.cell === expectedDestinationCell &&
        state.map?.character?.moving === false &&
        state.snapshot?.clockSeconds >= minimumArrivalClockSeconds &&
        state.snapshot?.discoveredCellCount > before.snapshot.discoveredCellCount &&
        state.travel?.confirmation?.dramaState === "complete" &&
        state.travel?.confirmation?.dialogOpen === false &&
        state.travel?.confirmation?.eligible === false &&
        state.travel?.confirmation?.reason === "already_complete" &&
        state.ui?.worldTime?.animating === false &&
        state.map?.visibility?.travelRevealPreviewActive === false &&
        presentationCaughtUp &&
        observedTravelClockTimes.size >= 3
      )
    },
    consoleErrors,
    10000,
  )
  assert.equal(moved.travel.costGameMinutes, 60)
  assert.equal(
    await page.locator("#map-focus-cave").count(),
    0,
    "The Cave camera anchor should hide once the Hero has left the relevant cave context.",
  )
  assert.ok(
    hasNewCells(before.snapshot.discoveredCells, moved.snapshot.discoveredCells),
    "Moving the hero should reveal at least one new discovered cell.",
  )
  assert.equal(moved.travel.presentationDurationMs, moved.map.travel.presentationDurationMs)
  assert.equal(moved.travel.clockStepMs, moved.map.travel.clockStepMs)
  assert.ok(
    Math.abs(
      moved.travel.presentationDurationMs -
        moved.travel.costGameMinutes * moved.travel.clockStepMs,
    ) < 0.01,
    "Travel duration should be derived from the visible minute cadence.",
  )
  assert.ok(moved.travel.toTime, "Travel should expose an arrival time")
  assert.ok(moved.travel.exposureRisk, "Travel should expose an exposure risk")
  assert.equal(moved.map.interaction.lastInput, "keyboard")
  assert.equal(moved.map.interaction.activeSource, "selection")
  assert.equal(moved.map.interaction.activeCell, moved.map.character.cell)
  assert.equal(moved.map.interaction.selectedCell, moved.map.character.cell)
  assert.equal(moved.shell.currentAction.source, "discovery")
  assert.equal(moved.shell.currentAction.sourceLabel, "Arrival")
  assert.equal(moved.shell.currentAction.kind, "arrived")
  assert.match(
    moved.shell.interfaceHierarchy.questions.whatChanged,
    /Arrived at|region.*revealed|Toxic/i,
    "Arrival should update the Changed answer with travel results.",
  )
  assert.equal(moved.discovery.phase, "movement")
  assert.equal(typeof moved.discovery.nextAction.label, "string")
  assert.ok(moved.discovery.nextAction.label.length > 0)
  assert.ok(
    ["wait", "travel", "inspect", "enter_dungeon", "open_base", "domain_action", "blocked"].includes(
      moved.discovery.nextAction.kind,
    ),
  )
  assert.ok(
    moved.discovery.movementDiscoveredDelta > 0,
    "Discovery telemetry should report newly revealed cells after movement.",
  )
  assert.ok(
    moved.discovery.tileChoiceCount > 0,
    "Discovery telemetry should expose at least one tile choice after movement.",
  )
  assert.equal(moved.discovery.movementConsequences.active, true)
  assert.equal(typeof moved.discovery.movementConsequences.viralLoad.percent, "number")
  assert.equal(typeof moved.discovery.movementConsequences.viralLoad.delta, "number")
  assert.equal(typeof moved.discovery.movementConsequences.timeOfDay.phase, "string")
  assert.ok(
    ["safe", "watch", "danger", "critical"].includes(
      moved.discovery.movementConsequences.safety.severity,
    ),
    "Movement consequence safety severity should use the known survival scale.",
  )
  assert.equal(
    moved.discovery.movementConsequences.futureAuthority,
    "automatic_return_thresholds_later",
  )
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-movement-consequences-smoke.png",
    "ADD RPG minimal overworld movement screenshot",
  )
  assert.equal(
    await page.locator("#discovery-panel").count(),
    0,
    "Discovery panel should stay unmounted in the minimal overworld UI.",
  )
  assert.ok(
    observedTravelClockTimes.size >= 3,
    `Travel clock should show multiple minute values, saw ${Array.from(observedTravelClockTimes).join(", ")}`,
  )
  assert.ok(
    Array.from(observedTravelRevealProgress).some((progress) => progress > 0 && progress < 1),
    `Travel should visually unveil cells before arrival, saw reveal progress values ${Array.from(
      observedTravelRevealProgress,
    ).join(", ")}`,
  )
  const settledTravelClockSeconds = moved.snapshot.clockSeconds
  await page.waitForTimeout(1300)
  const afterTravelIdle = await renderGameToText(page)
  assert.equal(afterTravelIdle.runtime.autoTick, true)
  assert.equal(
    afterTravelIdle.ui.worldTime.animating,
    false,
    "Travel reveal should not leave the displayed clock animating after the crossing.",
  )
  assert.ok(
    Math.abs(
      afterTravelIdle.ui.worldTime.presentationClockSeconds -
        afterTravelIdle.ui.worldTime.authoritativeClockSeconds,
    ) <= 1.1,
    "After the crossing the presentation clock should track the authoritative clock (snapped, not drifting).",
  )
  assert.ok(
    afterTravelIdle.snapshot.clockSeconds >= settledTravelClockSeconds &&
      afterTravelIdle.snapshot.clockSeconds < settledTravelClockSeconds + 60,
    "After the crossing the clock should resume ambient ticking, not jump another tile-hour.",
  )

  const returnKeys = keyboardKeysForCellStep(moved.map.character.cell, before.map.character.cell)
  const expectedReturnDirection = directionForCellStep(
    moved.map.character.cell,
    before.map.character.cell,
  )
  for (const key of returnKeys) await page.keyboard.down(key)
  const repeatedReturnKey = repeatHeldKey(page, returnKeys[0], 28, 120)
  const returned = await waitForTextState(
    page,
    (state) =>
      state.map?.character?.lastMoveDirection === expectedReturnDirection &&
      state.map?.character?.lastMoveAccepted === true &&
      state.map?.character?.cell === before.map.character.cell &&
      state.map?.character?.moving === false &&
      state.snapshot?.clockSeconds >= moved.snapshot.clockSeconds + 59 &&
      state.travel?.runtimeSynced === true &&
      state.ui?.worldTime?.animating === false,
    consoleErrors,
    8000,
  )
  await repeatedReturnKey
  for (const key of returnKeys) await page.keyboard.up(key)
  const afterHeldReturn = await waitForTextState(
    page,
    (state) =>
      state.map?.character?.cell === returned.map.character.cell &&
      state.map?.character?.moving === false &&
      state.snapshot?.clockSeconds >= returned.snapshot.clockSeconds &&
      state.snapshot?.clockSeconds < returned.snapshot.clockSeconds + 60 &&
      state.ui?.worldTime?.animating === false,
    consoleErrors,
  )
  assert.equal(afterHeldReturn.map.character.cell, returned.map.character.cell)
  assert.equal(afterHeldReturn.map.character.moving, false)
  assert.ok(
    afterHeldReturn.snapshot.clockSeconds >= returned.snapshot.clockSeconds &&
      afterHeldReturn.snapshot.clockSeconds < returned.snapshot.clockSeconds + 60,
    "Held movement may pass ambient time but must not queue a chained tile-hour.",
  )
  assert.equal(afterHeldReturn.snapshot.discoveredCellCount, returned.snapshot.discoveredCellCount)
  assert.deepEqual(
    sortedCells(afterHeldReturn.snapshot.discoveredCells),
    sortedCells(returned.snapshot.discoveredCells),
    "Held movement should not queue a chained travel or reveal additional cells.",
  )
  assert.equal(afterHeldReturn.ui.worldTime.animating, false)
  assert.equal(returned.map.character.cell, before.map.character.cell)

  const expectedNorthWest = adjacentHexCell(returned.map.character.cell, 0, -1)
  await page.keyboard.down("ArrowUp")
  await page.keyboard.down("ArrowLeft")
  await page.waitForTimeout(90)
  await page.keyboard.up("ArrowLeft")
  await page.keyboard.up("ArrowUp")

  const upperLeft = await waitForTextState(
    page,
    (state) =>
      state.map?.character?.lastMoveDirection === "north_west" &&
      state.map?.character?.lastMoveAccepted === true &&
      state.map?.character?.cell === expectedNorthWest &&
      state.map?.interaction?.lastInput === "keyboard" &&
      state.map?.interaction?.selectedCell === expectedNorthWest &&
      state.map?.interaction?.activeCell === expectedNorthWest &&
      state.map?.character?.moving === false &&
      state.snapshot?.clockSeconds >= returned.snapshot.clockSeconds + 59,
    consoleErrors,
    8000,
  )

  return upperLeft
}

async function interactWithMap(page, consoleErrors) {
  const beforeInteraction = await renderGameToText(page)
  const heroPoint = await characterScreenPoint(page, beforeInteraction)

  await page.mouse.move(heroPoint.x, heroPoint.y)
  await waitForTextState(
    page,
    (state) =>
      state.map?.interaction?.hoveredHex !== null &&
      state.map.interaction.lastInput === "pointer",
    consoleErrors,
  )
  await page.mouse.click(heroPoint.x, heroPoint.y)
  const selected = await waitForTextState(
    page,
    (state) =>
      state.map?.interaction?.selectedHex !== null &&
      state.map.interaction.lastInput === "pointer" &&
      state.map.interaction.activeSource === "selection" &&
      state.map.interaction.activeCell === state.map.interaction.selectedCell &&
      state.map.interaction.primaryMarkerVisible === false &&
      typeof state.map.interaction.activeLabel === "string" &&
      state.discovery?.selectedTile !== null &&
      state.discovery?.tileDetail !== null &&
      state.discovery.tileDetail.hasSubmap === false &&
      state.discovery.tileDetail.linkCount === 0 &&
      state.discovery.tileDetail.visibleLinkIds.length === 0 &&
      state.discovery.selectedTile.travelMinutes === 60 &&
      state.discovery.tileDetail.primaryAction !== null &&
      Array.isArray(state.discovery.tileDetail.disabledActionReasons) &&
      Array.isArray(state.discovery.tileDetail.enabledActionIds) &&
      typeof state.discovery.selectedTile.travelRisk === "string" &&
      typeof state.discovery.selectedTile.standingHere === "boolean" &&
      Array.isArray(state.discovery.selectedTile.knownFacts) &&
      Array.isArray(state.discovery.selectedTile.unknownFacts) &&
      Number.isInteger(state.discovery.selectedTile.dungeonLinkCount) &&
      typeof state.discovery.selectedTile.usefulnessLevel === "string" &&
      state.discovery.selectedTile.usefulnessReasons.length > 0 &&
      Array.isArray(state.discovery.tileChoices) &&
      state.discovery.tileChoices.length > 0 &&
      state.discovery.tileChoices.every(
        (choice) =>
          typeof choice.actionLabel === "string" &&
          choice.actionLabel.length > 0 &&
          typeof choice.actionHint === "string" &&
          choice.actionHint.length > 0,
      ),
    consoleErrors,
  )

  const travelTarget = await clickReachableTravelCandidate(page, heroPoint, consoleErrors)
  assert.equal(travelTarget.shell.currentAction.primaryLabel, "Travel to this region")
  assert.equal(travelTarget.shell.currentAction.kind, "travel")
  assert.equal(travelTarget.discovery.selectedTile.travelMinutes, 60)
  assert.equal(travelTarget.discovery.selectedTile.canTravelNow, true)
  assert.equal(travelTarget.map.presentation.mapPrimaryAffordances.pathTimePreviewVisible, true)
  assert.equal(
    travelTarget.discovery.tileDetail.primaryAction.label,
    "Travel here",
    "Reachable travel targets should use the side-panel travel CTA as the action label.",
  )

  assert.equal(
    await page.locator("#tile-choices-section").count(),
    0,
    "Nearby tile choices should stay out of the minimal overworld UI.",
  )
  const objectivePrimaryActionCount = await page.locator(
    ".objective-primary-action:visible",
  ).count()
  assert.equal(
    objectivePrimaryActionCount,
    1,
    `The objective panel should own the single visible overworld CTA (found ${objectivePrimaryActionCount}).`,
  )
  assert.match(
    travelTarget.discovery.tileChoices.map((choice) => choice.actionLabel).join(" | "),
    /Travel here|Review selected|Compare route|Review entrance|Review arrival|Assess scout|Use selected route/i,
    "Nearby tile choices should expose a structured player-facing action label.",
  )
  assert.equal(
    await page.locator("#selected-tile-decision").count(),
    0,
    "Selected tile details should stay out of the minimal overworld UI.",
  )
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-selected-route-minimal-smoke.png",
    "ADD RPG selected route minimal screenshot",
  )

  const zoomBefore = selected.map.camera.zoom
  for (let index = 0; index < 5; index += 1) {
    await page.locator("#map-zoom-in").click()
  }
  const zoomed = await waitForTextState(
    page,
    (state) => state.map?.camera?.zoom > zoomBefore + 0.35,
    consoleErrors,
  )
  const cameraBefore = zoomed.map.camera

  await page.mouse.move(heroPoint.x, heroPoint.y)
  await page.mouse.down()
  await page.mouse.move(heroPoint.x - 90, heroPoint.y - 54, { steps: 5 })
  await page.mouse.up()

  const panned = await waitForTextState(
    page,
    (state) =>
      Math.abs((state.map?.camera?.scrollX ?? 0) - cameraBefore.scrollX) > 0.5 ||
      Math.abs((state.map?.camera?.scrollY ?? 0) - cameraBefore.scrollY) > 0.5,
    consoleErrors,
  )

  return panned
}

async function clickReachableTravelCandidate(page, heroPoint, consoleErrors) {
  const initialState = await renderGameToText(page)
  const offsets = hexNeighborScreenOffsets(initialState)
  let lastState = initialState
  const probes = []
  for (const offset of offsets) {
    const point = { x: heroPoint.x + offset.x, y: heroPoint.y + offset.y }
    await page.mouse.move(point.x, point.y)
    try {
      return await waitForTextState(
        page,
        (state) =>
          state.discovery?.selectedTile?.canTravelNow === true &&
          state.shell?.currentAction?.primaryLabel === "Travel to this region" &&
          state.map?.presentation?.mapPrimaryAffordances?.pathTimePreviewVisible === true,
        consoleErrors,
        900,
      )
    } catch {
      lastState = await renderGameToText(page)
      probes.push({
        offset,
        point,
        hoveredCell: lastState.map?.interaction?.hoveredCell ?? null,
        hoveredDetailCell: lastState.map?.interaction?.hoveredDetail?.cell ?? null,
        selectedCell: lastState.map?.interaction?.selectedCell ?? null,
        canTravelNow: lastState.discovery?.selectedTile?.canTravelNow ?? false,
        discoverySelectedCell: lastState.discovery?.selectedTile?.cell ?? null,
        discoveryTileDetailCell: lastState.discovery?.tileDetail?.cell ?? null,
        previewCell: lastState.map?.travel?.previewCell ?? null,
        pathTimePreviewVisible:
          lastState.map?.presentation?.mapPrimaryAffordances?.pathTimePreviewVisible ?? false,
      })
    }
  }

  throw new Error(
    `Expected a reachable travel target near the Hero. Last state: ${JSON.stringify({
      character: lastState.map?.character,
      camera: lastState.map?.camera,
      topology: lastState.map?.topology,
      heroPoint,
      probes,
      interaction: lastState.map?.interaction,
      currentAction: lastState.shell?.currentAction,
      selectedTile: lastState.discovery?.selectedTile,
    })}`,
  )
}

function hexNeighborScreenOffsets(state) {
  assert.equal(state.map?.topology?.kind, "hex", "Travel candidate probing requires the overworld hex topology.")
  const radius = state.map?.topology?.radius
  const zoom = state.map?.camera?.zoom
  assert.ok(Number.isFinite(radius) && radius > 0, "ADD RPG telemetry should expose the hex radius.")
  assert.ok(Number.isFinite(zoom) && zoom > 0, "ADD RPG telemetry should expose the map zoom.")

  const horizontal = 1.5 * radius * zoom
  const diagonal = (Math.sqrt(3) / 2) * radius * zoom
  const vertical = Math.sqrt(3) * radius * zoom
  return [
    { x: horizontal, y: diagonal },
    { x: horizontal, y: -diagonal },
    { x: 0, y: -vertical },
    { x: -horizontal, y: -diagonal },
    { x: -horizontal, y: diagonal },
    { x: 0, y: vertical },
  ]
}

function keyboardKeysForCellStep(fromCell, toCell) {
  const direction = directionForCellStep(fromCell, toCell)
  switch (direction) {
    case "up":
    case "north_west":
      return ["ArrowUp"]
    case "right":
      return ["ArrowRight"]
    case "down":
    case "south_east":
      return ["ArrowDown"]
    case "left":
      return ["ArrowLeft"]
    case "north_east":
      return ["ArrowUp", "ArrowRight"]
    case "south_west":
      return ["ArrowDown", "ArrowLeft"]
    default:
      throw new Error(`Unsupported reverse movement direction: ${direction}`)
  }
}

function directionForCellStep(fromCell, toCell) {
  const from = parseSmokeCell(fromCell)
  const to = parseSmokeCell(toCell)
  if (!from || !to || from.kind !== to.kind) {
    throw new Error(`Cannot derive movement direction from ${fromCell} to ${toCell}`)
  }

  const dx = to.a - from.a
  const dy = to.b - from.b
  if (from.kind === "square") {
    if (dx === 0 && dy === -1) return "up"
    if (dx === 1 && dy === 0) return "right"
    if (dx === 0 && dy === 1) return "down"
    if (dx === -1 && dy === 0) return "left"
    throw new Error(`Cells are not adjacent square cells: ${fromCell} -> ${toCell}`)
  }

  if (dx === 0 && dy === -1) return "north_west"
  if (dx === 1 && dy === -1) return "north_east"
  if (dx === 1 && dy === 0) return "right"
  if (dx === 0 && dy === 1) return "south_east"
  if (dx === -1 && dy === 1) return "south_west"
  if (dx === -1 && dy === 0) return "left"
  throw new Error(`Cells are not adjacent hex cells: ${fromCell} -> ${toCell}`)
}

function parseSmokeCell(cell) {
  const match = /^(hex|square):(-?\d+),(-?\d+)$/.exec(String(cell ?? ""))
  if (!match) return null
  return {
    kind: match[1],
    a: Number(match[2]),
    b: Number(match[3]),
  }
}

async function assertHiddenMapCellsAreInvisibleToPointer(page, consoleErrors) {
  const before = await renderGameToText(page)
  const restorePanel = before.shell?.questPanel?.collapsed === false
  if (restorePanel) {
    await page.locator("#toggle-first-playable-panel").click()
    await waitForTextState(
      page,
      (state) => state.shell?.questPanel?.collapsed === true,
      consoleErrors,
    )
  }

  const canvas = page.locator("#add-world canvas")
  await canvas.waitFor({ state: "visible" })
  const box = await canvas.boundingBox()
  assert.ok(box, "ADD RPG Phaser canvas should have a browser box")

  const candidates = [
    { x: 0.12, y: 0.50 },
    { x: 0.18, y: 0.42 },
    { x: 0.24, y: 0.62 },
    { x: 0.33, y: 0.36 },
  ]

  for (const point of candidates) {
    await page.mouse.click(box.x + box.width * point.x, box.y + box.height * point.y)
    await page.waitForTimeout(180)
    const state = await renderGameToText(page)
    if (state.map?.interaction?.selectedDetail?.visibility === "hidden") {
      assert.fail("Invisible hidden tiles should not become selected from blank map space.")
    }
  }

  const latest = await renderGameToText(page)
  if (restorePanel) {
    await page.locator("#toggle-first-playable-panel").click()
    return waitForTextState(
      page,
      (state) =>
        state.shell?.questPanel?.collapsed === false &&
        state.map?.interaction?.selectedDetail?.visibility !== "hidden",
      consoleErrors,
    )
  }
  return latest
}

async function selectMapCenter(page) {
  const canvas = page.locator("#add-world canvas")
  await canvas.waitFor({ state: "visible" })
  const box = await canvas.boundingBox()
  assert.ok(box, "ADD RPG Phaser canvas should have a browser box")
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function assertNonBlankMapScreenshot(page) {
  await assertNonBlankNamedMapScreenshot(
    page,
    "add-rpg-map-smoke.png",
    "ADD RPG Phaser map screenshot",
  )
}

async function assertNonBlankFogMapScreenshot(page, state) {
  assert.equal(state.map.visibility.fogRendering, "phaser_visual_overlay")
  assert.equal(
    state.map.visibility.hiddenCellRendering,
    "invisible_until_known_or_travel_revealed",
  )
  assert.ok(state.map.visibility.hiddenCells > 0)
  assert.ok(state.map.visibility.visibleCells > 0)
  await assertNonBlankNamedMapScreenshot(
    page,
    "add-rpg-fog-map-smoke.png",
    "ADD RPG fog overlay map screenshot",
  )
}

async function assertTravelRevealPreview(page, consoleErrors, observations = {}) {
  const { observedTravelClockTimes, observedTravelRevealProgress } = observations
  const state = await waitForTextState(
    page,
    (candidate) => {
      collectTravelAnimationObservation(
        candidate,
        observedTravelClockTimes,
        observedTravelRevealProgress,
      )
      return (
        candidate.map?.character?.moving === true &&
        candidate.map?.visibility?.travelRevealPreviewActive === true &&
        candidate.map.visibility.travelRevealPreviewCells > 0 &&
        candidate.map.visibility.travelRevealPreviewProgress > 0 &&
        candidate.map.visibility.travelRevealPreviewProgress < 1 &&
        candidate.map.visibility.travelRevealDestinationCell === candidate.map.travel.toCell
      )
    },
    consoleErrors,
    2600,
  )
  await collectTravelAnimationObservations(
    page,
    observedTravelClockTimes,
    observedTravelRevealProgress,
  )
  await assertNonBlankNamedMapScreenshot(
    page,
    "add-rpg-travel-reveal-smoke.png",
    "ADD RPG in-travel fog reveal screenshot",
  )
  return state
}

async function collectTravelAnimationObservations(
  page,
  observedTravelClockTimes,
  observedTravelRevealProgress,
) {
  if (!observedTravelClockTimes && !observedTravelRevealProgress) return
  for (let sample = 0; sample < 5; sample += 1) {
    await page.waitForTimeout(80)
    collectTravelAnimationObservation(
      await renderGameToText(page),
      observedTravelClockTimes,
      observedTravelRevealProgress,
    )
  }
}

function collectTravelAnimationObservation(
  state,
  observedTravelClockTimes,
  observedTravelRevealProgress,
) {
  if (state.ui?.worldTime?.animating && state.ui.worldTime.localTime) {
    observedTravelClockTimes?.add(state.ui.worldTime.localTime)
  }
  if (state.map?.visibility?.travelRevealPreviewActive) {
    observedTravelRevealProgress?.add(state.map.visibility.travelRevealPreviewProgress)
  }
}

async function assertNonBlankNamedMapScreenshot(page, filename, label) {
  fs.mkdirSync(path.dirname(SCREENSHOT_PATH), { recursive: true })
  const mapPath = path.join(SMOKE_ARTIFACT_DIR, filename)
  await page.locator("#add-world canvas").screenshot({ path: mapPath })
  assertNonBlankImageBuffer(
    fs.readFileSync(mapPath),
    label,
    {
      minWidth: 300,
      minHeight: 220,
      minOpaqueSamples: 500,
      minUniqueColors: 8,
      minLuminanceRange: 20,
    },
  )
}

/**
 * Wall-clock budgets are scaled by `ADD_QA_TIMEOUT_SCALE`, so a loaded machine
 * can be given more room without editing eighty-nine call sites.
 */
const QA_TIMEOUT_SCALE = (() => {
  const parsed = Number.parseFloat(process.env.ADD_QA_TIMEOUT_SCALE ?? "1")
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
})()

function qaTimeout(milliseconds) {
  return Math.round(milliseconds * QA_TIMEOUT_SCALE)
}

/**
 * The predicate gets a minimum number of looks however slow the machine is.
 *
 * Each attempt serializes the entire game state — hundreds of kilobytes, over
 * CDP, parsed again here — so the cost of one poll is unbounded and load-
 * dependent. Against a pure wall-clock deadline that produced timeouts for
 * conditions that had never actually been examined: the budget went on two or
 * three serializations and the loop gave up. Worse, the old loop tested the
 * clock *before* taking a fresh look, so it could expire holding state from
 * well before the deadline.
 *
 * Three different scenarios failed this way on runs with identical inputs, and
 * a suite that cries wolf under load is one people learn to re-run rather than
 * read.
 */
const MIN_STATE_POLLS = 8

async function waitForTextState(page, predicate, consoleErrors = [], timeoutMs = 12000) {
  const budgetMs = qaTimeout(timeoutMs)
  const startedAt = Date.now()
  let lastState
  let lastError
  let attempts = 0

  for (;;) {
    attempts += 1
    try {
      lastState = await renderGameToText(page)
      if (predicate(lastState)) return lastState
    } catch (error) {
      lastError = error
    }
    if (page.isClosed()) break
    if (Date.now() - startedAt >= budgetMs && attempts >= MIN_STATE_POLLS) break
    await page.waitForTimeout(100)
  }

  throw new Error(
    `Timed out waiting for ADD RPG state after ${attempts} attempt(s) in ${
      Date.now() - startedAt
    }ms (budget ${budgetMs}ms). Last state: ${JSON.stringify(
      lastState,
    )}. Console errors: ${JSON.stringify(consoleErrors)}. Last error: ${
      lastError?.message ?? "none"
    }`,
  )
}

async function repeatHeldKey(page, key, count, intervalMs) {
  for (let index = 0; index < count; index += 1) {
    if (page.isClosed()) return
    try {
      await page.waitForTimeout(intervalMs)
      if (page.isClosed()) return
      await page.keyboard.down(key)
    } catch (error) {
      if (
        page.isClosed() ||
        /Target page, context or browser has been closed/.test(String(error?.message ?? error))
      ) {
        return
      }
      throw error
    }
  }
}

async function clickUntilTextState(
  page,
  selector,
  predicate,
  consoleErrors = [],
  attempts = 4,
  timeoutPerAttemptMs = 1800,
) {
  let lastState
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await page.locator(selector).click()
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutPerAttemptMs) {
      lastState = await renderGameToText(page)
      if (predicate(lastState)) return lastState
      await page.waitForTimeout(120)
    }
  }

  assert.fail(
    `Timed out after ${attempts} clicks waiting for state from ${selector}. ` +
      `Console errors: ${JSON.stringify(consoleErrors)}. Last state:\n${JSON.stringify(
        lastState,
        null,
        2,
      )}`,
  )
}

async function clickVisibleElementByDomId(page, id) {
  await page.waitForFunction((targetId) => {
    const element = document.getElementById(targetId)
    if (!(element instanceof HTMLElement)) return false
    const style = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity) > 0 &&
      rect.width > 0 &&
      rect.height > 0
    )
  }, id, { timeout: qaTimeout(15000) })
  await page.evaluate((targetId) => {
    const element = document.getElementById(targetId)
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Expected #${targetId} to be an HTMLElement.`)
    }
    element.scrollIntoView({ block: "center", inline: "nearest" })
    element.click()
  }, id)
}

function visibleCurrentActionButtonId(state) {
  return state.mapMode?.active === "overworld_hex"
    ? "objective-primary-action"
    : "current-action-primary"
}

async function clickVisibleCurrentAction(page, state) {
  if (state.mapMode?.active === "overworld_hex") {
    await clickVisibleElementBySelector(
      page,
      "#objective-primary-action, #objective-body-primary-action",
    )
    return
  }
  await clickVisibleElementByDomId(page, visibleCurrentActionButtonId(state))
}

async function isVisibleCurrentActionDisabled(page, state) {
  if (state.mapMode?.active === "overworld_hex") {
    return isVisibleElementDisabledBySelector(
      page,
      "#objective-primary-action, #objective-body-primary-action",
    )
  }
  return isElementDisabledByDomId(page, visibleCurrentActionButtonId(state))
}

async function clickVisibleElementBySelector(page, selector) {
  await page.waitForFunction((targetSelector) => {
    return Array.from(document.querySelectorAll(targetSelector)).some((element) => {
      if (!(element instanceof HTMLElement)) return false
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      )
    })
  }, selector, { timeout: qaTimeout(15000) })
  await page.evaluate((targetSelector) => {
    const element = Array.from(document.querySelectorAll(targetSelector)).find((candidate) => {
      if (!(candidate instanceof HTMLElement)) return false
      const style = window.getComputedStyle(candidate)
      const rect = candidate.getBoundingClientRect()
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      )
    })
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Expected visible element for ${targetSelector}.`)
    }
    element.scrollIntoView({ block: "center", inline: "nearest" })
    element.click()
  }, selector)
}

async function isVisibleElementDisabledBySelector(page, selector) {
  await page.waitForFunction((targetSelector) => {
    return Array.from(document.querySelectorAll(targetSelector)).some((element) => {
      if (!(element instanceof HTMLElement)) return false
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      )
    })
  }, selector, { timeout: qaTimeout(15000) })
  return page.evaluate((targetSelector) => {
    const element = Array.from(document.querySelectorAll(targetSelector)).find((candidate) => {
      if (!(candidate instanceof HTMLElement)) return false
      const style = window.getComputedStyle(candidate)
      const rect = candidate.getBoundingClientRect()
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      )
    })
    return element instanceof HTMLButtonElement ? element.disabled : false
  }, selector)
}

async function assertFloatingPanelDraggable(
  page,
  { panelSelector, handleSelector, dx, dy },
) {
  await page.locator(panelSelector).waitFor({ state: "visible" })
  const panel = page.locator(panelSelector)
  const handle = page.locator(handleSelector)
  const before = await panel.boundingBox()
  const handleBox = await handle.boundingBox()
  assert.ok(before, `Expected ${panelSelector} to have a visible bounding box before dragging.`)
  assert.ok(handleBox, `Expected ${handleSelector} to have a visible drag handle.`)

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    handleBox.x + handleBox.width / 2 + dx,
    handleBox.y + handleBox.height / 2 + dy,
    { steps: 6 },
  )
  await page.mouse.up()

  const after = await panel.boundingBox()
  assert.ok(after, `Expected ${panelSelector} to have a visible bounding box after dragging.`)
  assert.ok(
    Math.abs(after.x - before.x) >= 12 || Math.abs(after.y - before.y) >= 12,
    `${panelSelector} should move after dragging. Before=${JSON.stringify(before)} After=${JSON.stringify(after)}`,
  )
  assert.ok(after.x >= -1, `${panelSelector} should not leave the left viewport edge.`)
  assert.ok(after.y >= -1, `${panelSelector} should not leave the top viewport edge.`)
  const viewport = page.viewportSize()
  if (viewport) {
    assert.ok(
      after.x + Math.min(after.width, viewport.width) <= viewport.width + 1,
      `${panelSelector} should stay horizontally reachable. After=${JSON.stringify(
        after,
      )} Viewport=${JSON.stringify(viewport)}`,
    )
    assert.ok(
      after.y + Math.min(after.height, viewport.height) <= viewport.height + 1,
      `${panelSelector} should stay vertically reachable. After=${JSON.stringify(
        after,
      )} Viewport=${JSON.stringify(viewport)}`,
    )
  }
}

async function assertClickableCenter(page, selector) {
  const result = await page.evaluate((targetSelector) => {
    const element = document.querySelector(targetSelector)
    if (!(element instanceof HTMLElement)) {
      return { ok: false, reason: `Missing ${targetSelector}` }
    }
    const rect = element.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const hit = document.elementFromPoint(x, y)
    return {
      ok: hit === element || element.contains(hit),
      reason: hit instanceof Element
        ? `Hit ${hit.id || hit.tagName}.${String(hit.className || "")}`
        : "No element at center",
      rect: {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    }
  }, selector)
  assert.ok(
    result.ok,
    `${selector} should be topmost/clickable at center. ${result.reason}. Rect=${JSON.stringify(
      result.rect,
    )}`,
  )
}

async function isElementDisabledByDomId(page, id) {
  await page.waitForFunction((targetId) => document.getElementById(targetId) !== null, id, { timeout: qaTimeout(15000) })
  return page.evaluate((targetId) => {
    const element = document.getElementById(targetId)
    return element instanceof HTMLButtonElement ? element.disabled : false
  }, id)
}

async function openDetailsSection(page, selector) {
  const details = page.locator(selector)
  await details.waitFor({ state: "attached" })
  const isOpen = await details.evaluate((node) => {
    if (!(node instanceof HTMLDetailsElement)) {
      throw new Error(`Expected ${node.id || "target"} to be a details element.`)
    }
    return node.open
  })
  if (!isOpen) {
    await details.evaluate((node) => {
      node.open = true
      node.dispatchEvent(new Event("toggle"))
    })
  }
  await page.waitForFunction((targetSelector) => {
    const node = document.querySelector(targetSelector)
    if (!(node instanceof HTMLDetailsElement)) return false
    if (!node.open) node.open = true
    return node.open === true
  }, selector, { timeout: qaTimeout(15000) })
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

function adjacentHexCell(cell, qDelta, rDelta) {
  const match = /^hex:(-?\d+),(-?\d+)$/.exec(cell)
  assert.ok(match, `Expected a hex cell string, got ${cell}`)
  return `hex:${Number(match[1]) + qDelta},${Number(match[2]) + rDelta}`
}

function sortedCells(cells) {
  return [...(cells ?? [])].sort((left, right) => String(left).localeCompare(String(right)))
}

function sameCells(left, right) {
  return JSON.stringify(sortedCells(left)) === JSON.stringify(sortedCells(right))
}

function hasNewCells(beforeCells, afterCells) {
  const before = new Set(beforeCells ?? [])
  return (afterCells ?? []).some((cell) => !before.has(cell))
}

function parseHexCoord(coord) {
  const match = /^(-?\d+),(-?\d+)$/.exec(coord)
  assert.ok(match, `Expected a hex coord string, got ${coord}`)
  return { q: Number(match[1]), r: Number(match[2]) }
}

async function assertNonBlankAppScreenshot(page) {
  fs.mkdirSync(path.dirname(SCREENSHOT_PATH), { recursive: true })
  await page.locator("#app").screenshot({ path: SCREENSHOT_PATH })
  assertNonBlankImageBuffer(
    fs.readFileSync(SCREENSHOT_PATH),
    "ADD RPG runtime app screenshot",
    {
      minWidth: 300,
      minHeight: 220,
      minOpaqueSamples: 500,
      minUniqueColors: 8,
      minLuminanceRange: 24,
    },
  )
}

async function assertNonBlankNamedAppScreenshot(page, filename, label) {
  fs.mkdirSync(path.dirname(SCREENSHOT_PATH), { recursive: true })
  const screenshotPath = path.join(SMOKE_ARTIFACT_DIR, filename)
  await page.locator("#app").screenshot({ path: screenshotPath })
  assertNonBlankImageBuffer(
    fs.readFileSync(screenshotPath),
    label,
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
