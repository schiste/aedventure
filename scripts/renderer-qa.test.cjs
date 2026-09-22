const assert = require("node:assert")
const { mkdirSync, writeFileSync } = require("node:fs")
const { join } = require("node:path")
const { tmpdir } = require("node:os")
const { chromium } = require("playwright")
const { PNG } = require("pngjs")
const {
  assertNonBlankImageBuffer,
  assertOfficeRenderGameContract,
} = require("./app-qa-contracts.cjs")
const { startStaticAppServer } = require("./app-qa-server.cjs")
const { startDevelopmentServer } = require("./dev-http-host.cjs")
const { assertAddRendererPhase5Contract } = require("./add-rpg-phase5.cjs")

const ARTIFACT_DIR =
  process.env.RENDERER_QA_ARTIFACT_DIR ?? join(tmpdir(), `aedventure-renderer-qa-${process.pid}`)
const ENGINE_SANDBOX_APP_DIST_DIR = join(__dirname, "../apps/engine-sandbox/dist-app")
const ADD_APP_DIST_DIR = join(__dirname, "../apps/add-rpg/dist-app")
const ADD_TOPOLOGY_QA_FIXTURE_FILES = {
  hex: "add-rpg-hex-renderer-fixture-canvas.png",
  square: "add-rpg-square-renderer-fixture-canvas.png",
}

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 960, expectedMode: "desktop" },
  { name: "mobile", width: 390, height: 760, expectedMode: "mobile" },
]

const DEPTH_CASES = [
  "table_player_behind",
  "table_player_front",
  "wall_player_behind",
]
const AVATAR_VISUAL_FACINGS = [
  "up",
  "upRight",
  "right",
  "downRight",
  "down",
  "downLeft",
  "left",
  "upLeft",
]

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
    const report = {
      artifactDir: ARTIFACT_DIR,
      rendererSnapshots: [],
      frameCadence: [],
      screenshots: [],
      depthCases: [],
      textLabels: [],
      devTools: [],
      mapSwitchLeak: undefined,
      avatarFacingChecks: [],
      avatarFrameProgression: undefined,
      avatarTextureLeak: undefined,
      advancedInput: undefined,
      physicsAffordances: undefined,
      depthEffects: undefined,
      tilemapFeatures: undefined,
      audio: undefined,
      engineSandboxFixtures: [],
      topologyChecks: [],
      addPlayerFacing: [],
    }

    await verifyRendererRuntime(browser, url, report)
    await verifyResponsiveScreenshots(browser, url, report)
    await verifyDevTools(browser, url, report)
    await verifyEngineSandboxFixtures(browser, report)
    await verifyAddRendererTopologyFixtures(browser, report)

    writeFileSync(
      join(ARTIFACT_DIR, "renderer-qa-report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    )
    console.log(`Renderer QA artifacts saved to ${ARTIFACT_DIR}`)
  } finally {
    if (browser) {
      await browser.close()
    }
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

async function verifyRendererRuntime(browser, url, report) {
  const page = await newQaPage(browser, { width: 1440, height: 960 })

  try {
    await page.goto(`${url}/app`, { waitUntil: "domcontentloaded" })
    const initial = await waitForTextState(
      page,
      (state) =>
        state.map?.activeMapId === "lobby" &&
        state.lifecycle?.rendererReadiness === "ready" &&
        rendererReadyForQa(state),
    )
    assertOfficeRenderGameContract(initial)
    assertRendererSnapshot(initial)
    report.textLabels.push(await assertDomAvatarLabels(page, initial, "initial-lobby"))
    report.rendererSnapshots.push(snapshotForReport("initial-lobby", initial))
    report.screenshots.push(
      await captureCanvas(page, "desktop-lobby-canvas.png"),
    )
    report.advancedInput = await verifyAdvancedInput(page, initial)
    report.physicsAffordances = verifyPhysicsAffordances(initial)
    report.depthEffects = verifyDepthEffects(initial)
    report.tilemapFeatures = verifyTilemapFeatures(initial)
    report.audio = verifyAudioSystem(initial)

    const baselineCadence = await measureFrameCadence(page)
    report.frameCadence.push({
      label: "initial-lobby",
      ...baselineCadence,
      budget: assertFrameCadence(initial.renderer.performance, baselineCadence),
    })

    await page.locator("#start").click()
    const joined = await waitForTextState(
      page,
      (state) =>
        state.joined === true &&
        state.lifecycle?.phase === "joined" &&
        state.players.length >= 2 &&
        rendererReadyForQa(state),
    )
    assertOfficeRenderGameContract(joined)
    assertRendererSnapshot(joined)
    report.textLabels.push(await assertDomAvatarLabels(page, joined, "joined-lobby"))
    assert.ok(joined.renderer.depth.playerCount >= 2)
    report.rendererSnapshots.push(snapshotForReport("joined-lobby", joined))
    report.screenshots.push(
      await captureCanvas(page, "desktop-joined-canvas.png"),
    )

    const benchmark = await runMapSwitchLeakCheck(page)
    report.mapSwitchLeak = benchmark
    const stress = await waitForTextState(
      page,
      (state) =>
        state.map?.label === "Renderer stress map" &&
        state.map.width === 100 &&
        state.map.height === 80 &&
        state.renderer.performance.pooling.activeSpriteCount > 0 &&
        rendererReadyForQa(state),
      9000,
    )
    assertRendererSnapshot(stress)
    report.rendererSnapshots.push(snapshotForReport("stress-map", stress))
    report.screenshots.push(await captureCanvas(page, "stress-map-canvas.png"))

    const stressCadence = await measureFrameCadence(page)
    report.frameCadence.push({
      label: "stress-map",
      ...stressCadence,
      budget: assertFrameCadence(stress.renderer.performance, stressCadence),
    })

    for (const caseId of DEPTH_CASES) {
      const depthCase = await page.evaluate(async (id) => {
        if (!window.__aedventureRendererTest?.renderDepthFixtureCase) {
          throw new Error("Missing renderer depth fixture API.")
        }

        return window.__aedventureRendererTest.renderDepthFixtureCase(id)
      }, caseId)
      await page.evaluate(() => window.advanceTime())

      const state = await waitForTextState(
        page,
        (current) =>
          current.map?.label === `Depth case: ${caseId}` &&
          current.renderer.depth.playerCount === 1 &&
          current.renderer.depth.objectCount >= 1 &&
          rendererReadyForQa(current),
        9000,
      )
      assertRendererSnapshot(state)
      assertDepthOrdering(state, depthCase)
      const screenshot = await captureCanvas(
        page,
        `depth-${caseId}-canvas.png`,
      )
      const depthStats = await assertDepthScreenshot(page, state, depthCase)
      report.depthCases.push({
        caseId,
        expectedLayerAtSample: depthCase.expectedLayerAtSample,
        occluderTokenId: depthCase.occluderTokenId,
        screenshot,
        depthStats,
      })
    }

    const gallery = await page.evaluate(async () => {
      if (!window.__aedventureRendererTest?.renderAvatarPreviewGallery) {
        throw new Error("Missing avatar preview gallery API.")
      }

      return window.__aedventureRendererTest.renderAvatarPreviewGallery()
    })
    await page.evaluate(() => window.advanceTime())

    const galleryState = await waitForTextState(
      page,
      (state) =>
        state.map?.label === "Avatar preview gallery" &&
        state.avatars.players.length === 128 &&
        state.renderer.depth.playerCount >= 128 &&
        state.avatars.players.some(
          (player) =>
            player.animation.action === "run" &&
            player.animation.visualFacing === "downRight",
        ) &&
        rendererReadyForQa(state),
      9000,
    )
    assertRendererSnapshot(galleryState)
    assert.equal(gallery.rows, 16)
    assert.equal(gallery.columns, 8)
    assert.deepEqual(gallery.actions, ["idle", "walk", "run", "turn"])
    assert.equal(gallery.playerIds.length, 128)
    report.rendererSnapshots.push(
      snapshotForReport("avatar-preview-gallery", galleryState),
    )
    const galleryScreenshot = await captureCanvasWithBuffer(
      page,
      "avatar-preview-gallery-canvas.png",
    )
    report.screenshots.push(galleryScreenshot.screenshot)
    report.avatarFacingChecks = assertAvatarFacingScreenshot(
      galleryScreenshot.buffer,
      galleryState,
    )
    const progressedGalleryState = await waitForProgressedAvatarGallery(page)
    report.avatarFrameProgression = assertAvatarFrameProgression(
      galleryState,
      progressedGalleryState,
    )
    report.avatarTextureLeak = await runAvatarTextureLeakCheck(
      page,
      progressedGalleryState,
    )
  } finally {
    assertNoConsoleErrors(page, "desktop renderer runtime")
    await page.close()
  }
}

async function verifyAdvancedInput(page, initialState) {
  const objectTarget = initialState.renderer.depth.objects.find(
    (object) => object.layer === "object",
  )
  assert.ok(objectTarget, "Expected at least one object target for input QA.")

  const zoneTarget = initialState.zones.zones.find(
    (zone) => zone.kind === "lobby" || zone.kind === "meeting",
  )
  assert.ok(zoneTarget, "Expected at least one semantic zone for input QA.")

  const canvas = page.locator("canvas").first()
  const canvasBox = await canvas.boundingBox()
  assert.ok(canvasBox, "Expected Phaser canvas bounding box.")

  const objectViewportPoint = await projectWorldToViewport(page, {
    x: objectTarget.bounds.x + objectTarget.bounds.width / 2,
    y: objectTarget.bounds.y + objectTarget.bounds.height / 2,
  })
  await page.mouse.move(
    canvasBox.x + objectViewportPoint.x,
    canvasBox.y + objectViewportPoint.y,
  )
  const hoveredObject = await waitForTextState(
    page,
    (state) =>
      state.renderer.input.hitTesting.hoveredObjectId === objectTarget.id &&
      state.renderer.input.cursor.current === "grab",
  )
  assert.equal(hoveredObject.renderer.input.cursor.hoverTargetKind, "object")

  await page.mouse.down()
  const selectedObject = await waitForTextState(
    page,
    (state) =>
      state.renderer.input.selection.selectedObjectId === objectTarget.id &&
      state.renderer.input.gesture.last === "select_object",
  )
  await page.mouse.move(
    canvasBox.x + objectViewportPoint.x + 18,
    canvasBox.y + objectViewportPoint.y + 4,
  )
  const draggingObject = await waitForTextState(
    page,
    (state) =>
      state.renderer.input.drag.active === true &&
      state.renderer.input.drag.targetId === objectTarget.id,
  )
  await page.mouse.up()
  const draggedObject = await waitForTextState(
    page,
    (state) =>
      state.renderer.input.drag.active === false &&
      state.renderer.input.selection.selectedObjectId === objectTarget.id &&
      state.renderer.input.gesture.last === "drag",
  )

  const zoneHoverPoint = clearZoneHoverPoint(
    zoneTarget,
    initialState.renderer.depth.objects,
  )
  const zoneViewportPoint = await projectWorldToViewport(page, zoneHoverPoint)
  await page.mouse.move(
    canvasBox.x + zoneViewportPoint.x,
    canvasBox.y + zoneViewportPoint.y,
  )
  const hoveredZone = await waitForTextState(
    page,
    (state) =>
      state.renderer.input.hitTesting.hoveredZoneId === zoneTarget.id &&
      state.zones.hoveredZoneId === zoneTarget.id,
  )

  return {
    source: "renderer_advanced_input_qa",
    objectTargetId: objectTarget.id,
    objectTokenId: objectTarget.tokenId,
    hoveredObjectCursor: hoveredObject.renderer.input.cursor.current,
    selectedObjectId: selectedObject.renderer.input.selection.selectedObjectId,
    dragTargetId: draggingObject.renderer.input.drag.targetId,
    dragDistancePx: draggedObject.renderer.input.gesture.distancePx,
    zoneTargetId: zoneTarget.id,
    zoneHoverPoint,
    hoveredZoneId: hoveredZone.renderer.input.hitTesting.hoveredZoneId,
  }
}

function clearZoneHoverPoint(zone, objects) {
  const bounds = zone.bounds
  const candidates = []

  for (
    let y = bounds.y + 16;
    y < bounds.y + bounds.height - 8;
    y += 16
  ) {
    for (
      let x = bounds.x + 16;
      x < bounds.x + bounds.width - 8;
      x += 16
    ) {
      candidates.push({ x, y })
    }
  }

  candidates.push({
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  })

  const objectBounds = objects
    .filter((object) => object.layer === "object")
    .map((object) => object.bounds)

  return (
    candidates.find((point) =>
      objectBounds.every((bounds) => !pointInExpandedBounds(point, bounds, 8)),
    ) ?? candidates[candidates.length - 1]
  )
}

function pointInExpandedBounds(point, bounds, marginPx) {
  return (
    point.x >= bounds.x - marginPx &&
    point.x < bounds.x + bounds.width + marginPx &&
    point.y >= bounds.y - marginPx &&
    point.y < bounds.y + bounds.height + marginPx
  )
}

function verifyPhysicsAffordances(state) {
  const physics = state.renderer.physics
  assert.equal(physics.source, "phaser_arcade_physics")
  assert.equal(physics.authority, "visual_probes_only")
  assert.equal(physics.enabled, true)
  assert.equal(physics.engine, "arcade")
  assert.equal(physics.config.gravity, "none")
  assert.equal(physics.config.simulationAffectsGameplay, false)
  assert.equal(
    physics.serverAuthorityBoundary,
    "movement_collision_permissions_remain_server_authoritative",
  )
  assert.ok(physics.features.includes("arcade_sensor_bodies"))
  assert.ok(physics.features.includes("visual_collision_probes"))
  assert.ok(physics.features.includes("editor_placement_preview"))
  assert.ok(physics.features.includes("local_affordance_feedback"))
  assert.ok(physics.sensors.objectSensorCount >= 1)
  assert.ok(physics.sensors.zoneSensorCount >= 1)
  assert.equal(
    physics.sensors.staticBodyCount,
    physics.sensors.objectSensorCount + physics.sensors.zoneSensorCount,
  )
  assert.equal(physics.sensors.dynamicProbeCount, 2)
  assert.equal(physics.placementPreview.active, true)
  assert.equal(physics.placementPreview.state, "blocked")
  assert.ok(physics.placementPreview.overlappingObjectIds.length >= 1)
  assert.ok(["none", "near_zone", "visual_blocked"].includes(
    physics.localProbe.affordance,
  ))

  return {
    source: "renderer_physics_affordance_qa",
    engine: physics.engine,
    authority: physics.authority,
    objectSensorCount: physics.sensors.objectSensorCount,
    zoneSensorCount: physics.sensors.zoneSensorCount,
    staticBodyCount: physics.sensors.staticBodyCount,
    dynamicProbeCount: physics.sensors.dynamicProbeCount,
    localProbeAffordance: physics.localProbe.affordance,
    localProbeZones: physics.localProbe.overlappingZoneIds,
    placementPreviewState: physics.placementPreview.state,
    placementPreviewOverlaps: physics.placementPreview.overlappingObjectIds,
  }
}

function verifyDepthEffects(state) {
  const depthEffects = state.renderer.depthEffects

  assert.equal(depthEffects.source, "phaser_depth_effects")
  assert.equal(depthEffects.authority, "visual_only")
  assert.equal(depthEffects.enabled, true)
  assert.ok(depthEffects.features.includes("geometry_masks"))
  assert.ok(depthEffects.features.includes("foreground_blend_modes"))
  assert.ok(depthEffects.features.includes("glass_transparency"))
  assert.ok(depthEffects.features.includes("zone_fog_masks"))
  assert.ok(depthEffects.features.includes("label_occlusion"))
  assert.ok(depthEffects.masks.geometryMaskCount >= 1)
  assert.ok(depthEffects.masks.zoneFogMaskCount >= 1)
  assert.ok(depthEffects.masks.labelMaskCount >= 1)
  assert.ok(depthEffects.blendModes.foregroundSpriteCount >= 1)
  assert.ok(depthEffects.blendModes.glassForegroundCount >= 1)
  assert.ok(depthEffects.blendModes.transparentForegroundCount >= 1)
  assert.ok(depthEffects.blendModes.appliedBlendModes.includes("screen"))
  assert.equal(depthEffects.fog.blendMode, "multiply")
  assert.ok(depthEffects.fog.activeFogOverlayCount >= 1)
  assert.equal(
    depthEffects.labels.policy,
    "local_visible_remote_foreground_labels_dimmed",
  )
  assert.ok(Array.isArray(depthEffects.labels.occludedPlayerIds))

  return {
    source: "renderer_depth_effects_qa",
    authority: depthEffects.authority,
    features: depthEffects.features,
    masks: depthEffects.masks,
    blendModes: depthEffects.blendModes,
    fog: depthEffects.fog,
    labels: depthEffects.labels,
  }
}

function verifyTilemapFeatures(state) {
  const features = state.renderer.tilemap.features

  assert.equal(features.source, "phaser_tilemap_runtime_features")
  assert.equal(features.authority, "renderer_editor_affordances_only")
  assert.equal(features.enabled, true)
  assert.ok(features.features.includes("tile_metadata"))
  assert.ok(features.features.includes("tile_collision_properties"))
  assert.ok(features.features.includes("tile_index_callbacks"))
  assert.ok(features.features.includes("tile_location_callbacks"))
  assert.ok(features.features.includes("animated_tile_overlays"))
  assert.ok(features.features.includes("layered_editor_metadata"))
  assert.equal(features.metadata.propertySchemaVersion, 1)
  assert.ok(features.metadata.tilePropertyCount >= 1)
  assert.equal(
    features.metadata.tilePropertyCount,
    features.metadata.semanticTilePropertyCount,
  )
  assert.ok(features.metadata.editorPropertyCount >= 1)
  assert.ok(features.metadata.layerNames.includes("floor"))
  assert.ok(features.metadata.layerNames.includes("walls"))
  assert.ok(features.collision.propertyCollisionTileCount >= 1)
  assert.ok(features.collision.propertyCollisionLayerNames.includes("walls"))
  assert.equal(
    features.collision.serverAuthorityBoundary,
    "compiled_collision_layers_remain_authoritative",
  )
  assert.ok(features.callbacks.tileIndexCallbackCount >= 1)
  assert.ok(features.callbacks.tileLocationCallbackCount >= 1)
  assert.ok(features.callbacks.callbackLayerNames.includes("walls"))
  assert.ok(features.callbacks.callbackLayerNames.includes("floor"))
  assert.ok(features.callbacks.registeredSemanticIds.length >= 1)
  assert.equal(features.callbacks.invocationCount, 0)
  assert.ok(features.animation.animatedTileCount >= 1)
  assert.equal(
    features.animation.animatedTileCount,
    features.animation.animatedOverlayCount,
  )
  assert.ok(features.animation.animatedSemanticIds.some((id) =>
    id.includes("glass")
  ))
  assert.equal(features.animation.clock, "phaser_tweens")
  assert.equal(features.animation.deterministic, false)
  assert.ok(features.editor.selectableTileCount >= 1)
  assert.ok(features.editor.tenantCustomizableTileCount >= 1)
  assert.equal(features.editor.layeredInspectorReady, true)

  return {
    source: "renderer_tilemap_features_qa",
    authority: features.authority,
    metadata: features.metadata,
    collision: features.collision,
    callbacks: features.callbacks,
    animation: features.animation,
    editor: features.editor,
  }
}

function verifyAudioSystem(state) {
  const audio = state.renderer.audio

  assertAudioContract(audio)
  assert.equal(audio.assets.registeredCueCount, 6)
  assert.ok(
    audio.cues.playCountByCue.map_transition >= 1,
    "Expected map render to attempt the transition cue.",
  )
  assert.ok(
    audio.cues.attemptedPlayCount >= 1,
    "Expected at least one world UI audio cue attempt.",
  )
  assert.equal(audio.routing.realtimeStreamsHandledOutsidePhaser, true)
  assert.equal(audio.policy.maxConcurrentUiSounds, 6)

  return {
    source: "renderer_world_ui_audio_qa",
    manager: audio.manager,
    assets: audio.assets,
    cues: {
      attemptedPlayCount: audio.cues.attemptedPlayCount,
      successfulPlayCount: audio.cues.successfulPlayCount,
      blockedByLockCount: audio.cues.blockedByLockCount,
      skippedUnavailableCount: audio.cues.skippedUnavailableCount,
      playCountByCue: audio.cues.playCountByCue,
      lastCueId: audio.cues.lastCueId,
    },
    routing: audio.routing,
    policy: audio.policy,
  }
}

function assertAudioContract(audio) {
  assert.equal(audio?.source, "phaser_sound_manager")
  assert.equal(audio?.authority, "world_ui_audio_only")
  assert.equal(audio?.enabled, true)
  assert.ok(
    ["web_audio", "html5_audio", "no_audio", "unknown"].includes(
      audio.manager?.type,
    ),
    `Expected known Phaser sound manager type, got ${audio?.manager?.type}.`,
  )
  assert.equal(typeof audio.manager.locked, "boolean")
  assert.equal(typeof audio.manager.muted, "boolean")
  assert.equal(typeof audio.manager.volume, "number")
  assert.equal(typeof audio.manager.pauseOnBlur, "boolean")
  assert.equal(audio.assets.strategy, "generated_wav_data_uri")
  assert.equal(audio.assets.registeredCueCount, 6)
  assert.equal(typeof audio.assets.decodedCueCount, "number")
  assert.equal(typeof audio.assets.pendingCueCount, "number")
  assert.equal(typeof audio.assets.failedCueCount, "number")
  assert.deepEqual(audio.assets.generatedCueIds, [
    "footstep",
    "door_open",
    "zone_enter",
    "blocked_movement",
    "chat_notification",
    "map_transition",
  ])
  assert.deepEqual(audio.cues.supportedCueIds, audio.assets.generatedCueIds)
  assert.deepEqual(audio.cues.eventBindings, [
    "local_player_step",
    "portal_or_door_available",
    "zone_entered",
    "movement_rejected",
    "chat_delivered",
    "map_rendered",
  ])
  audio.assets.generatedCueIds.forEach((cueId) => {
    assert.equal(
      typeof audio.cues.playCountByCue[cueId],
      "number",
      `Expected play telemetry for cue ${cueId}.`,
    )
  })
  assert.equal(typeof audio.cues.attemptedPlayCount, "number")
  assert.equal(typeof audio.cues.successfulPlayCount, "number")
  assert.equal(typeof audio.cues.blockedByLockCount, "number")
  assert.equal(typeof audio.cues.skippedUnavailableCount, "number")
  assert.equal(audio.routing.realtimeStreamsHandledOutsidePhaser, true)
  assert.equal(audio.routing.realtimeStreamLayer, "external_browser_runtime")
  assert.equal(audio.routing.spatialWorldUiOnly, true)
  assert.equal(audio.policy.autoplay, "play_after_unlock_else_track_attempt")
  assert.equal(typeof audio.policy.footstepThrottleMs, "number")
  assert.equal(audio.policy.maxConcurrentUiSounds, 6)
}

function assertTextRenderingContract(text) {
  assert.equal(text?.source, "renderer_text_quality")
  assert.equal(text.policy, "antialiased_text_pixel_art_world")
  assert.equal(text.worldTextResolution, 6)
  assert.equal(text.worldTextTextureFilter, "linear")
  assert.deepEqual(text.worldTextBackends, [
    "dom_overlay",
    "phaser_text_fallback",
  ])
  assert.equal(text.canvasCssImageRendering, "auto")
  assert.equal(text.canvasCssAntialiasingAllowed, true)
  assert.ok(
    !["pixelated", "crisp-edges"].includes(text.canvasCssImageRendering),
    `Expected canvas CSS to allow antialiased text, got ${text.canvasCssImageRendering}.`,
  )
  assert.equal(typeof text.domFontSmoothing, "string")
  assert.deepEqual(text.textObjectClasses, [
    "avatar_labels",
    "emote_text",
    "zone_labels",
    "action_markers",
    "debug_overlays",
  ])
  assert.equal(text.pixelArtSpritesRemainTextureFiltered, true)
}

async function verifyResponsiveScreenshots(browser, url, report) {
  for (const viewport of VIEWPORTS) {
    const page = await newQaPage(browser, {
      width: viewport.width,
      height: viewport.height,
    })

    try {
      await page.goto(`${url}/app`, { waitUntil: "domcontentloaded" })
      const initial = await waitForTextState(
        page,
        (state) =>
          state.map?.activeMapId === "lobby" &&
          state.lifecycle?.rendererReadiness === "ready" &&
          rendererReadyForQa(state),
      )
      assert.equal(initial.layout.mode, viewport.expectedMode)
      assert.equal(initial.camera.localPlayerVisible, true)
      assertRendererSnapshot(initial)
      report.textLabels.push(
        await assertDomAvatarLabels(page, initial, `${viewport.name}-responsive`),
      )

      const screenshotPath = join(
        ARTIFACT_DIR,
        `${viewport.name}-responsive-page.png`,
      )
      await page.screenshot({ path: screenshotPath, fullPage: true })
      report.screenshots.push({
        label: `${viewport.name}-responsive-page`,
        path: screenshotPath,
      })
      report.screenshots.push(
        await captureCanvas(page, `${viewport.name}-responsive-canvas.png`),
      )
    } finally {
      assertNoConsoleErrors(page, `${viewport.name} responsive renderer`)
      await page.close()
    }
  }
}

async function verifyDevTools(browser, url, report) {
  const page = await newQaPage(browser, { width: 1280, height: 900 })

  try {
    await page.goto(
      `${url}/app?devtools=1&devGrid=1&devCollision=1&devZones=1&devDepth=1&devObjectFootprints=1&devSpriteBounds=1&devCamera=1&devFixture=zone_fixture`,
      { waitUntil: "domcontentloaded" },
    )
    const initial = await waitForTextState(
      page,
      (state) =>
        state.devTools?.gated === true &&
        state.devTools?.enabled === true &&
        state.devTools?.activeFixtureId === "zone_fixture" &&
        state.map?.label === "Zone fixture" &&
        state.devTools.renderer?.overlays?.grid === true &&
        state.devTools.renderer?.overlays?.collision === true &&
        state.devTools.renderer?.overlays?.zones === true &&
        state.devTools.renderer?.overlays?.depth === true &&
        state.devTools.renderer?.overlays?.objectFootprints === true &&
        state.devTools.renderer?.overlays?.spriteBounds === true &&
        state.devTools.renderer?.overlays?.camera === true,
      9000,
    )

    assert.equal(initial.devTools.primaryUiControlsExposed, 0)
    assert.equal(initial.devTools.menu.visible, true)
    assert.equal(initial.devTools.menu.overlayControlCount, 7)
    assert.equal(initial.devTools.menu.fixtureOptionCount, 13)
    assert.equal(initial.devTools.menu.selectedFixtureId, "zone_fixture")
    assert.deepEqual(
      initial.devTools.menu.checkedOverlayIds.sort(),
      [
        "camera",
        "collision",
        "depth",
        "grid",
        "objectFootprints",
        "spriteBounds",
        "zones",
      ].sort(),
    )
    assert.equal(initial.devTools.feelPanel.visible, true)
    assert.equal(initial.devTools.feelPanel.presetCount, 5)
    assert.equal(initial.devTools.feelPanel.activePresetId, "default")
    assert.equal(initial.devTools.feelPanel.controlCount, 13)
    assert.equal(initial.movement.feel.panelVisible, true)
    assert.equal(initial.movement.feel.activePresetId, "default")
    assert.deepEqual(
      initial.movement.feel.presets.map((preset) => preset.id),
      ["default", "snappy", "smooth", "heavy", "mobile"],
    )
    assert.equal(
      initial.movement.feel.values.turnResponseTimeConstantMs,
      18,
    )
    assert.equal(initial.movement.feel.values.collisionBodyRadiusPx, 7.5)
    assert.equal(initial.movement.prediction.collisionBody.radiusPx, 7.5)
    assert.equal(initial.zones.debugOverlayEnabled, true)
    assert.equal(initial.renderer.depth.debugOverlayEnabled, true)
    report.textLabels.push(
      await assertDomInteractionLabels(
        page,
        initial,
        "devtools-zone-interaction",
        "Join call",
      ),
    )
    assert.ok(initial.devTools.renderer.overlayObjectCounts.gridLineCount > 0)
    assert.ok(initial.devTools.renderer.overlayObjectCounts.blockedTileCount > 0)
    assert.ok(initial.devTools.renderer.overlayObjectCounts.zoneBoundsCount > 0)
    assert.ok(initial.devTools.renderer.overlayObjectCounts.depthAnchorCount > 0)
    assert.ok(
      initial.devTools.renderer.overlayObjectCounts.objectFootprintCount > 0,
    )
    assert.ok(initial.devTools.renderer.overlayObjectCounts.spriteBoundsCount > 0)
    assert.equal(initial.devTools.renderer.cameraReadout.mode, initial.camera.mode)
    assert.ok(
      initial.devTools.renderer.fixtureSelector.availableFixtureIds.includes(
        "stress_100x80",
      ),
    )
    assert.ok(
      initial.devTools.renderer.fixtureSelector.availableFixtureIds.includes(
        "avatar_preview_gallery",
      ),
    )
    assert.deepEqual(
      await page.locator("[data-devtools-control]").count(),
      0,
      "Expected no product-facing developer controls.",
    )
    report.devTools.push({
      label: "query-param-gated",
      activeFixtureId: initial.devTools.activeFixtureId,
      overlays: initial.devTools.overlays,
      overlayObjectCounts: initial.devTools.renderer.overlayObjectCounts,
    })
    const devToolsPagePath = join(ARTIFACT_DIR, "devtools-page.png")
    await page.screenshot({ path: devToolsPagePath, fullPage: true })
    report.screenshots.push({
      label: "devtools-page",
      path: devToolsPagePath,
    })
    report.screenshots.push(await captureCanvas(page, "devtools-zone-canvas.png"))

    await page.locator('[data-feel-preset="smooth"]').click()
    const smoothFeel = await waitForTextState(
      page,
      (state) =>
        state.movement?.feel?.activePresetId === "smooth" &&
        state.devTools?.feelPanel?.activePresetId === "smooth" &&
        state.movement?.feel?.values?.turnResponseTimeConstantMs === 34 &&
        state.movement?.motion?.feel?.values?.activeCorrectionTimeConstantMs ===
          260,
    )
    assert.equal(smoothFeel.movement.feel.activePresetLabel, "Smooth")
    assert.ok(
      smoothFeel.movement.debugLog.some((entry) =>
        /feel-preset: smooth/.test(entry),
      ),
      "Expected movement trace to record smooth preset selection.",
    )

    await page.locator('[data-feel-range="turnResponseTimeConstantMs"]').fill("9")
    const tunedFeel = await waitForTextState(
      page,
      (state) =>
        state.movement?.feel?.activePresetId === "custom" &&
        state.movement?.feel?.values?.turnResponseTimeConstantMs === 9 &&
        state.movement?.motion?.feel?.values?.turnResponseTimeConstantMs === 9,
    )
    assert.equal(
      tunedFeel.movement.feel.values.turnResponseTimeConstantMs,
      9,
    )
    assert.ok(
      tunedFeel.movement.debugLog.some((entry) =>
        /feel: turnResponseTimeConstantMs=9ms/.test(entry),
      ),
      "Expected movement trace to record live feel tuning.",
    )
    const apiTunedFeel = await page.evaluate(() => {
      if (!window.__aedventureMovementFeel?.setValue) {
        throw new Error("Missing movement feel dev API.")
      }

      return window.__aedventureMovementFeel.setValue(
        "collisionSlideSpeedScale",
        0.65,
      )
    })
    assert.equal(apiTunedFeel.values.collisionSlideSpeedScale, 0.65)
    const bodyTunedFeel = await page.evaluate(() => {
      if (!window.__aedventureMovementFeel?.setValue) {
        throw new Error("Missing movement feel dev API.")
      }

      return window.__aedventureMovementFeel.setValue(
        "collisionBodyRadiusPx",
        7,
      )
    })
    assert.equal(bodyTunedFeel.values.collisionBodyRadiusPx, 7)
    const mobilePreset = await page.evaluate(() => {
      if (!window.__aedventureMovementFeel?.setPreset) {
        throw new Error("Missing movement feel preset dev API.")
      }

      return window.__aedventureMovementFeel.setPreset("mobile")
    })
    assert.equal(mobilePreset.activePresetId, "mobile")
    assert.equal(mobilePreset.values.runSpeedPxPerSecond, 138)
    assert.equal(mobilePreset.values.analogCurveExponent, 0.75)
    report.devTools.push({
      label: "movement-feel-tuning",
      presetIds: smoothFeel.movement.feel.presets.map((preset) => preset.id),
      selectedPresetId: mobilePreset.activePresetId,
      turnResponseTimeConstantMs:
        tunedFeel.movement.feel.values.turnResponseTimeConstantMs,
      collisionSlideSpeedScale: apiTunedFeel.values.collisionSlideSpeedScale,
      collisionBodyRadiusPx: bodyTunedFeel.values.collisionBodyRadiusPx,
    })

    await page.keyboard.press("Alt+Shift+C")
    const collisionOff = await waitForTextState(
      page,
      (state) =>
        state.devTools?.overlays?.collision === false &&
        state.devTools.renderer?.overlays?.collision === false &&
        !state.devTools.menu.checkedOverlayIds.includes("collision"),
    )
    assert.equal(collisionOff.devTools.enabled, true)
    report.devTools.push({
      label: "keyboard-collision-toggle",
      activeFixtureId: collisionOff.devTools.activeFixtureId,
      overlays: collisionOff.devTools.overlays,
    })

    await page.locator('[data-dev-overlay-control="objectFootprints"]').uncheck()
    const footprintOff = await waitForTextState(
      page,
      (state) =>
        state.devTools?.overlays?.objectFootprints === false &&
        state.devTools.renderer?.overlays?.objectFootprints === false &&
        !state.devTools.menu.checkedOverlayIds.includes("objectFootprints"),
    )
    assert.equal(footprintOff.devTools.menu.visible, true)
    report.devTools.push({
      label: "menu-object-footprint-toggle",
      overlays: footprintOff.devTools.overlays,
      checkedOverlayIds: footprintOff.devTools.menu.checkedOverlayIds,
    })

    await page.keyboard.press("Alt+Shift+F")
    const nextFixture = await waitForTextState(
      page,
      (state) =>
        state.devTools?.activeFixtureId === "stress_20x15" &&
        state.map?.label === "Renderer stress map" &&
        state.map?.width === 20 &&
        state.map?.height === 15,
      9000,
    )
    assert.equal(nextFixture.devTools.renderer.fixtureSelector.activeFixtureId, "stress_20x15")
    report.devTools.push({
      label: "keyboard-fixture-next",
      activeFixtureId: nextFixture.devTools.activeFixtureId,
      map: {
        label: nextFixture.map.label,
        width: nextFixture.map.width,
        height: nextFixture.map.height,
      },
    })
    report.screenshots.push(await captureCanvas(page, "devtools-stress-canvas.png"))
  } finally {
    assertNoConsoleErrors(page, "developer renderer tools")
    await page.close()
  }
}

async function verifyEngineSandboxFixtures(browser, report) {
  const { server, url } = await startStaticAppServer({
    directory: ENGINE_SANDBOX_APP_DIST_DIR,
    basePath: "/app",
  })
  const page = await newQaPage(browser, { width: 1180, height: 760 })

  try {
    await page.goto(`${url}/app`, { waitUntil: "domcontentloaded" })
    const state = await waitForTextState(
      page,
      (current) =>
        current.app === "engine-sandbox" &&
        current.world?.validationValid === true &&
        current.world?.mapCount === 2 &&
        current.coexistence?.sharedCanvas === true &&
        current.coexistence?.squareRendered === true &&
        current.coexistence?.hexRendered === true &&
        current.square?.topology === "square" &&
        current.hex?.topology === "hex" &&
        current.square?.cells > 0 &&
        current.hex?.cells > 0,
      9000,
    )

    await page.evaluate(() => {
      const canvas = document.querySelector("#world canvas")
      if (canvas instanceof HTMLCanvasElement) {
        canvas.style.transition = "none"
      }
    })

    const path = join(ARTIFACT_DIR, "engine-sandbox-topology-fixture-canvas.png")
    const buffer = await page.locator("#world canvas").screenshot({ path })
    const stats = assertNonBlankImageBuffer(
      buffer,
      "engine sandbox topology fixture canvas",
      {
        minWidth: 300,
        minHeight: 220,
        minUniqueColors: 8,
        minLuminanceRange: 24,
      },
    )

    report.engineSandboxFixtures.push({
      app: state.app,
      domain: state.engineBoundary.domain,
      renderer: state.engineBoundary.renderer,
      importsOfficeDomain: state.engineBoundary.importsOfficeDomain,
      sharedPackages: state.engineBoundary.uses,
      mapCount: state.world.mapCount,
      topologyKinds: state.coexistence.topologyKinds,
      square: {
        mapId: state.square.mapId,
        cells: state.square.cells,
        entities: state.square.entities,
        zones: state.square.zones,
        interactions: state.square.interactions.length,
      },
      hex: {
        mapId: state.hex.mapId,
        cells: state.hex.cells,
        entities: state.hex.entities,
        zones: state.hex.zones,
        interactions: state.hex.interactions.length,
      },
      screenshot: {
        label: "engine-sandbox-topology-fixture-canvas",
        path,
        stats,
      },
    })
  } finally {
    assertNoConsoleErrors(page, "engine sandbox topology fixture")
    await page.close()
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

async function verifyAddRendererTopologyFixtures(browser, report) {
  const { server, url } = await startStaticAppServer({
    directory: ADD_APP_DIST_DIR,
    basePath: "/app",
  })
  const page = await newQaPage(browser, { width: 1180, height: 760 })

  try {
    await page.goto(`${url}/app`, { waitUntil: "domcontentloaded" })
    const hexState = await waitForTextState(
      page,
      (state) =>
        state.app === "add-rpg" &&
        state.runtime?.ready === true &&
        state.runtime?.snapshotReceived === true &&
        state.mapMode?.active === "overworld_hex" &&
        state.mapMode?.topology === "hex" &&
        state.map?.hostedBy === "phaser" &&
        state.map?.ready === true &&
        state.map?.validationValid === true &&
        state.map?.topology?.kind === "hex" &&
        state.map?.cells?.total === state.snapshot?.hexCount &&
        state.map?.knownFacts?.hiddenCells > 0 &&
        state.map?.knownFacts?.dynamicRiskKnownCells > 0 &&
        state.map?.visibility?.hiddenCells === state.map.knownFacts.hiddenCells &&
        state.map?.visibility?.visibleCells > 0 &&
        state.map?.visibility?.discoveredCells >= 0 &&
        state.map?.visibility?.hiddenCellRendering ===
          "invisible_until_known_or_travel_revealed" &&
        state.map?.visibility?.fogRendering === "phaser_visual_overlay" &&
        state.map?.visibility?.affectsAuthority === false &&
        state.map?.visibility?.travelRevealPreviewActive === false &&
        state.map?.presentation?.visibilityPolish?.fogEdge ===
          "soft_feathered_visibility_boundary" &&
        state.map?.presentation?.visibilityPolish?.revealEffect === "expanding_ripple" &&
        state.map?.presentation?.visibilityPolish?.caveMouthSilhouettes === true &&
        state.map?.presentation?.visibilityPolish?.travelReveal ===
          "progressive_in_travel_radius" &&
        state.map?.presentation?.visibilityPolish?.authority === "visual_only" &&
        state.map?.interaction?.visibilitySamples?.hidden?.label === "Unknown region" &&
        state.map.interaction.visibilitySamples.hidden.dungeonLinks.length === 0 &&
        state.map.interaction.visibilitySamples.hidden.dungeonActionsVisible === false &&
        (state.map.interaction.visibilitySamples.discovered === null ||
          state.map.interaction.visibilitySamples.discovered.knownInfoLevel === "known_static") &&
        state.map.interaction.visibilitySamples.visible.knownInfoLevel === "full_current",
      16000,
    )
    report.addPlayerFacing.push(
      assertAddRendererPhase5Contract(hexState, "ADD hex player-facing renderer"),
    )
    assert.equal(
      await page.locator('[data-qa="map-stage"]').count(),
      1,
      "ADD renderer QA requires the stable map-stage selector.",
    )
    assert.equal(
      await page.locator('[data-qa="map-controls"]').count(),
      1,
      "ADD renderer QA requires the stable map-controls selector.",
    )
    await page.locator("#toggle-first-playable-panel").click({ timeout: 2500 })
    await page.waitForTimeout(180)
    report.topologyChecks.push(
      await captureAddTopologyCanvas(page, hexState, "hex", "overworld_hex"),
    )

    await page.waitForSelector("#map-mode-dungeon_square")
    await page.evaluate(() => {
      const dungeonButton = document.getElementById("map-mode-dungeon_square")
      if (!(dungeonButton instanceof HTMLButtonElement)) {
        throw new Error("Missing dungeon square map mode button.")
      }
      dungeonButton.click()
    })
    const squareState = await waitForTextState(
      page,
      (state) =>
        state.app === "add-rpg" &&
        state.mapMode?.active === "dungeon_square" &&
        state.mapMode?.topology === "square" &&
        state.map?.hostedBy === "phaser" &&
        state.map?.ready === true &&
        state.map?.validationValid === true &&
        state.map?.topology?.kind === "square" &&
        state.map?.topology?.fixture === false &&
        ["add.rpg.dungeon.studio", "add.rpg.dungeon.survivor-cave"].includes(
          state.map?.mapId,
        ) &&
        state.map?.cells?.total > 100 &&
        state.map?.cells?.blocked > 0 &&
        state.map?.landmarks?.renderedCount > 0,
      12000,
    )
    report.addPlayerFacing.push(
      assertAddRendererPhase5Contract(squareState, "ADD square player-facing renderer"),
    )
    report.topologyChecks.push(
      await captureAddTopologyCanvas(
        page,
        squareState,
        "square",
        "dungeon_square",
      ),
    )

    const coveredTopologies = new Set(
      report.topologyChecks.map((check) => check.topology),
    )
    assert.ok(
      coveredTopologies.has("hex"),
      "Renderer QA must include a nonblank hex topology render.",
    )
    assert.ok(
      coveredTopologies.has("square"),
      "Renderer QA must include a nonblank square topology render.",
    )
  } finally {
    assertNoConsoleErrors(page, "ADD renderer topology fixtures")
    await page.close()
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

async function captureAddTopologyCanvas(page, state, topology, mode) {
  const path = join(ARTIFACT_DIR, ADD_TOPOLOGY_QA_FIXTURE_FILES[topology])
  const buffer = await page.locator("#add-world canvas").screenshot({ path })
  const stats = assertNonBlankImageBuffer(
    buffer,
    `ADD RPG ${topology} renderer fixture canvas`,
    {
      minWidth: 300,
      minHeight: 220,
      minOpaqueSamples: 500,
      minUniqueColors: 8,
      minLuminanceRange: 20,
    },
  )
  const fogPalette =
    topology === "hex" ? assertAddFogPalette(buffer, "ADD RPG hex fog canvas") : null

  return {
    app: state.app,
    renderer: state.map.hostedBy,
    mode,
    topology,
    mapId: state.map.mapId,
    fixture: state.map.topology.fixture,
    cells: state.map.cells,
    visibility: state.map.visibility,
    visibilityPolish: state.map.presentation.visibilityPolish,
    interactionSamples: state.map.interaction.visibilitySamples,
    fogPalette,
    landmarks: state.map.landmarks,
    authority: state.map.authority,
    screenshot: {
      label: `add-rpg-${topology}-renderer-fixture-canvas`,
      path,
      stats,
    },
  }
}

function assertAddFogPalette(buffer, label) {
  const image = PNG.sync.read(buffer)
  let opaquePixels = 0
  let darkFogPixels = 0
  let mutedKnownPixels = 0
  let brightVisiblePixels = 0

  for (let y = 0; y < image.height; y += 2) {
    for (let x = 0; x < image.width; x += 2) {
      const offset = (image.width * y + x) << 2
      const red = image.data[offset]
      const green = image.data[offset + 1]
      const blue = image.data[offset + 2]
      const alpha = image.data[offset + 3]
      if (alpha < 90) continue
      opaquePixels += 1

      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
      const maxChannel = Math.max(red, green, blue)
      const minChannel = Math.min(red, green, blue)
      const channelSpread = maxChannel - minChannel

      if (luminance < 54) {
        darkFogPixels += 1
      } else if (luminance >= 54 && luminance < 128 && channelSpread < 72) {
        mutedKnownPixels += 1
      } else if (luminance >= 150 && red >= 120 && green >= 120) {
        brightVisiblePixels += 1
      }
    }
  }

  assert.ok(opaquePixels > 500, `${label}: expected enough opaque canvas pixels.`)
  assert.ok(darkFogPixels > 120, `${label}: expected dark hidden fog pixels.`)
  assert.ok(mutedKnownPixels > 80, `${label}: expected muted discovered/stale terrain pixels.`)
  assert.ok(brightVisiblePixels > 80, `${label}: expected bright visible terrain pixels.`)

  return {
    opaquePixels,
    darkFogPixels,
    mutedKnownPixels,
    brightVisiblePixels,
  }
}

async function assertDomAvatarLabels(page, state, label) {
  const visiblePlayers = state.avatars.players.filter(
    (player) => player.labelVisible,
  )
  const visibleZones = state.zones.zones.filter((zone) => zone.labelVisible)
  assert.ok(
    visiblePlayers.length >= 1,
    `${label}: expected at least one visible avatar label in renderer state.`,
  )

  await page.waitForFunction(
    () => document.querySelectorAll(".world-dom-label").length > 0,
    undefined,
    { timeout: 5000 },
  )
  await page.waitForTimeout(260)

  const dom = await page.evaluate(() => {
    const map = document.querySelector("#map")
    const canvas = document.querySelector("#map canvas")
    const host = document.querySelector(".phaser-world-host")
    const overlay = document.querySelector(".world-dom-label-overlay")
    const mapRect = map?.getBoundingClientRect()
    const canvasRect = canvas?.getBoundingClientRect()
    const hostRect = host?.getBoundingClientRect()
    const overlayRect = overlay?.getBoundingClientRect()
    const nodes = [...document.querySelectorAll(".world-dom-label")].map(
      (node) => {
        const element = node
        const rect = element.getBoundingClientRect()
        const style = window.getComputedStyle(element)

        return {
          text: element.textContent,
          className: element.className,
          opacity: Number.parseFloat(style.opacity || "0"),
          transform: style.transform,
          leftPx: Number.parseFloat(style.left || "0"),
          topPx: Number.parseFloat(style.top || "0"),
          fontSizePx: Number.parseFloat(style.fontSize || "0"),
          lineHeightPx: Number.parseFloat(style.lineHeight || "0"),
          width: rect.width,
          height: rect.height,
          x: rect.x,
          y: rect.y,
          textRendering: style.textRendering,
        }
      },
    )

    return {
      mapRect: mapRect
        ? { x: mapRect.x, y: mapRect.y, width: mapRect.width, height: mapRect.height }
        : undefined,
      canvasRect: canvasRect
        ? { x: canvasRect.x, y: canvasRect.y, width: canvasRect.width, height: canvasRect.height }
        : undefined,
      hostRect: hostRect
        ? { x: hostRect.x, y: hostRect.y, width: hostRect.width, height: hostRect.height }
        : undefined,
      overlayRect: overlayRect
        ? { x: overlayRect.x, y: overlayRect.y, width: overlayRect.width, height: overlayRect.height }
        : undefined,
      nodes,
    }
  })

  assert.ok(dom.mapRect, `${label}: expected #map bounds for DOM label QA.`)
  assert.ok(dom.canvasRect, `${label}: expected Phaser canvas bounds for DOM label QA.`)
  assert.ok(dom.hostRect, `${label}: expected Phaser host bounds for DOM label QA.`)
  assert.ok(dom.overlayRect, `${label}: expected DOM label overlay bounds.`)
  assert.ok(
    Math.abs(dom.overlayRect.x - dom.canvasRect.x) <= 2 &&
      Math.abs(dom.overlayRect.y - dom.canvasRect.y) <= 2 &&
      Math.abs(dom.overlayRect.width - dom.canvasRect.width) <= 2 &&
      Math.abs(dom.overlayRect.height - dom.canvasRect.height) <= 2,
    `${label}: expected DOM label overlay to match Phaser canvas bounds.`,
  )

  const visibleDomLabels = dom.nodes.filter((node) => node.opacity > 0.05)
  const visibleAvatarLabels = visibleDomLabels.filter((node) =>
    node.className.includes("world-dom-avatar-label"),
  )
  const visibleZoneLabels = visibleDomLabels.filter((node) =>
    node.className.includes("world-dom-zone-label"),
  )
  assert.ok(
    visibleDomLabels.length >= 1,
    `${label}: expected at least one visible DOM avatar label.`,
  )
  assert.ok(
    visibleAvatarLabels.length >= 1,
    `${label}: expected at least one visible DOM avatar label.`,
  )
  if (visibleZones.length > 0) {
    assert.ok(
      visibleZoneLabels.length >= 1,
      `${label}: expected visible zone labels to use the DOM overlay.`,
    )
  }

  visibleDomLabels.forEach((node) => {
    const isZoneLabel = node.className.includes("world-dom-zone-label")
    assert.equal(node.transform, "none", `${label}: label text should not be transform-scaled.`)
    assert.ok(
      Number.isInteger(node.leftPx) && Number.isInteger(node.topPx),
      `${label}: label ${node.text} should be positioned on whole CSS pixels.`,
    )
    assert.ok(
      node.fontSizePx >= 10 && node.lineHeightPx >= node.fontSizePx,
      `${label}: label ${node.text} should use native readable font metrics.`,
    )
    assert.ok(
      node.width >= (isZoneLabel ? 32 : 44) &&
        node.height >= (isZoneLabel ? 14 : 18),
      `${label}: label ${node.text} should have measurable native DOM bounds.`,
    )
    assert.ok(
      node.x >= dom.mapRect.x - 8 &&
        node.y >= dom.mapRect.y - 8 &&
        node.x + node.width <= dom.mapRect.x + dom.mapRect.width + 8 &&
        node.y + node.height <= dom.mapRect.y + dom.mapRect.height + 8,
      `${label}: label ${node.text} should stay inside the map viewport.`,
    )
  })

  return {
    label,
    backend: "dom_overlay",
    nodeCount: dom.nodes.length,
    visibleNodeCount: visibleDomLabels.length,
    avatarNodeCount: visibleAvatarLabels.length,
    zoneNodeCount: visibleZoneLabels.length,
    avatarFontSizePx: visibleAvatarLabels[0].fontSizePx,
    zoneFontSizePx: visibleZoneLabels[0]?.fontSizePx,
    textRendering: visibleDomLabels[0].textRendering,
    wholePixelPositioning: true,
    transformScaled: false,
  }
}

async function assertDomInteractionLabels(page, state, label, expectedPrompt) {
  assert.ok(
    state.worldInteractions.activeCandidateIds.length >= 1,
    `${label}: expected at least one active world interaction candidate.`,
  )

  await page.waitForFunction(
    (prompt) =>
      [...document.querySelectorAll(".world-dom-interaction-card")].some(
        (card) =>
          card.querySelector(".world-dom-interaction-prompt")?.textContent === prompt,
      ),
    expectedPrompt,
    { timeout: 5000 },
  )

  const dom = await page.evaluate((prompt) => {
    const readNode = (element) => {
      if (!element) return undefined
      const rect = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)

      return {
        text: element.textContent,
        leftPx: Number.parseFloat(style.left || "0"),
        topPx: Number.parseFloat(style.top || "0"),
        transform: style.transform,
        fontSizePx: Number.parseFloat(style.fontSize || "0"),
        lineHeightPx: Number.parseFloat(style.lineHeight || "0"),
        width: rect.width,
        height: rect.height,
        opacity: Number.parseFloat(style.opacity || "0"),
      }
    }
    const card = [...document.querySelectorAll(".world-dom-interaction-card")]
      .find((candidate) =>
        candidate.querySelector(".world-dom-interaction-prompt")?.textContent === prompt,
      )

    return {
      card: readNode(card),
      active: card?.classList.contains("is-active") ?? false,
      selected: card?.classList.contains("is-selected") ?? false,
      tone: card?.getAttribute("data-action-tone"),
      action: card?.getAttribute("data-action"),
      interactionKind: card?.getAttribute("data-interaction-kind"),
      actionFlow: card?.getAttribute("data-action-flow"),
      prompt: readNode(card?.querySelector(".world-dom-interaction-prompt")),
      key: readNode(card?.querySelector(".world-dom-interaction-key")),
      kind: readNode(card?.querySelector(".world-dom-interaction-kind")),
    }
  }, expectedPrompt)

  assert.ok(dom.prompt, `${label}: expected DOM interaction prompt ${expectedPrompt}.`)
  assert.ok(dom.key, `${label}: expected DOM interaction key label E / Tap.`)
  assert.ok(dom.kind, `${label}: expected DOM interaction action kind label.`)
  assert.ok(dom.card, `${label}: expected DOM interaction card.`)
  assert.equal(dom.key.text, "E / Tap", `${label}: expected unified keyboard/touch affordance.`)
  assert.ok(dom.kind.text.length >= 2, `${label}: expected non-empty action kind label.`)
  assert.ok(dom.tone, `${label}: expected DOM interaction tone metadata.`)
  assert.ok(dom.action, `${label}: expected DOM interaction action metadata.`)
  assert.ok(["zone", "object"].includes(dom.interactionKind), `${label}: expected DOM interaction kind metadata.`)
  assert.equal(dom.actionFlow, "ready", `${label}: expected ready action flow metadata.`)
  assert.ok(dom.active, `${label}: expected primary interaction card to expose active state.`)
  assert.equal(dom.card.transform, "none", `${label}: interaction card should not be transform-scaled.`)
  assert.ok(
    Number.isInteger(dom.card.leftPx) && Number.isInteger(dom.card.topPx),
    `${label}: interaction card should be positioned on whole CSS pixels.`,
  )
  assert.ok(
    dom.card.width >= 82 && dom.card.height >= 28 && dom.card.opacity > 0,
    `${label}: interaction card should have visible DOM bounds.`,
  )

  for (const node of [dom.prompt, dom.key, dom.kind]) {
    assert.equal(node.transform, "none", `${label}: interaction text should not be transform-scaled.`)
    assert.ok(
      node.fontSizePx >= 9 && node.lineHeightPx >= node.fontSizePx,
      `${label}: interaction text should use readable native font metrics.`,
    )
    assert.ok(
      node.width >= 16 && node.height >= 11 && node.opacity > 0,
      `${label}: interaction text should have visible DOM bounds.`,
    )
  }

  return {
    label,
    backend: "dom_overlay",
    prompt: expectedPrompt,
    key: "E / Tap",
    kind: dom.kind.text,
    tone: dom.tone,
    promptFontSizePx: dom.prompt.fontSizePx,
    keyFontSizePx: dom.key.fontSizePx,
    wholePixelPositioning: true,
    transformScaled: false,
  }
}

async function newQaPage(browser, viewport) {
  const page = await browser.newPage({ viewport })
  const consoleErrors = []

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text())
    }
  })
  page.on("pageerror", (error) => {
    consoleErrors.push(error.stack || error.message)
  })
  page.rendererQaConsoleErrors = consoleErrors

  return page
}

function assertNoConsoleErrors(page, label) {
  assert.equal(
    page.rendererQaConsoleErrors.length,
    0,
    `${label}: browser console errors\n${JSON.stringify(
      page.rendererQaConsoleErrors,
      null,
      2,
    )}`,
  )
}

async function runMapSwitchLeakCheck(page) {
  const benchmark = await page.evaluate(async () => {
    if (!window.__aedventureRendererTest?.runBigMapBenchmark) {
      throw new Error("Missing renderer benchmark API.")
    }

    return window.__aedventureRendererTest.runBigMapBenchmark()
  })

  assert.deepEqual(benchmark.gameInstanceIds, [benchmark.gameInstanceIds[0]])
  assert.equal(benchmark.gameInstanceIds.length, 1)
  assert.deepEqual(
    benchmark.samples.map((sample) => `${sample.pass}:${sample.size}`),
    [
      "1:20x15",
      "1:50x40",
      "1:100x80",
      "2:20x15",
      "2:50x40",
      "2:100x80",
    ],
  )
  assert.ok(
    benchmark.repeatedLargeMapDisplayObjectDelta <= 2,
    `Expected repeated large-map display objects to stay bounded, got ${benchmark.repeatedLargeMapDisplayObjectDelta}.`,
  )
  assert.ok(
    benchmark.repeatedLargeMapTextureDelta <= 0,
    `Expected repeated large-map texture count not to grow, got ${benchmark.repeatedLargeMapTextureDelta}.`,
  )
  assert.equal(
    benchmark.repeatedLargeMapCreatedSpriteDelta,
    0,
    "Expected repeated large-map switch not to allocate more object sprites.",
  )
  assert.equal(
    benchmark.repeatedLargeMapCreatedTextureDelta,
    0,
    "Expected repeated large-map switch not to allocate more object textures.",
  )
  assert.deepEqual(benchmark.proof, {
    passed: true,
    benchmarkMapsCovered: true,
    tileBatching: true,
    staticLayerBaking: true,
    viewportCulling: true,
    objectPooling: true,
    textureReuse: true,
    noMapSwitchLeaks: true,
  })

  benchmark.samples.forEach((sample) => {
    assertRendererPerformance(sample.performance)
    assert.ok(sample.staticTileCount >= 20 * 15)
    assert.ok(sample.objectCount > 0)
    assert.ok(sample.mapRenderDurationMs >= 0)
    assert.equal(sample.performance.lifecycle.phaserGameReused, true)
    assert.equal(sample.proof.tileBatching, true)
    assert.equal(sample.proof.staticLayerBaking, true)
    assert.equal(sample.proof.viewportCullingAccounted, true)
    assert.equal(sample.proof.viewportCullingActive, true)
    assert.equal(sample.proof.objectPoolingActive, true)
    assert.equal(sample.proof.objectPoolReuseObserved, true)
    assert.equal(sample.proof.textureReuseObserved, true)
  })

  return {
    sampleCount: benchmark.samples.length,
    gameInstanceIds: benchmark.gameInstanceIds,
    repeatedLargeMapDisplayObjectDelta:
      benchmark.repeatedLargeMapDisplayObjectDelta,
    repeatedLargeMapTextureDelta: benchmark.repeatedLargeMapTextureDelta,
    repeatedLargeMapCreatedSpriteDelta:
      benchmark.repeatedLargeMapCreatedSpriteDelta,
    repeatedLargeMapCreatedTextureDelta:
      benchmark.repeatedLargeMapCreatedTextureDelta,
    proof: benchmark.proof,
    samples: benchmark.samples.map((sample) => ({
      pass: sample.pass,
      size: sample.size,
      staticTileCount: sample.staticTileCount,
      objectCount: sample.objectCount,
      mapRenderDurationMs: sample.mapRenderDurationMs,
      displayObjectCount: sample.performance.runtime.displayObjectCount,
      textureCount: sample.performance.runtime.textureCount,
      tileBatching: sample.proof.tileBatching,
      staticLayerBaking: sample.proof.staticLayerBaking,
      viewportCulling: {
        visible:
          sample.performance.proofs.viewportCulling.visibleObjectSpriteCount,
        culled: sample.performance.proofs.viewportCulling.culledObjectSpriteCount,
        ratio: sample.performance.proofs.viewportCulling.culledRatio,
      },
      objectPooling: sample.proof.objectPoolReuseObserved,
      textureReuse: sample.proof.textureReuseObserved,
    })),
  }
}

async function waitForProgressedAvatarGallery(page) {
  await page.waitForTimeout(850)

  return waitForTextState(
    page,
    (state) => {
      const runSample = avatarPreviewPlayer(
        state,
        "ember",
        "run",
        "downRight",
      )
      const walkSample = avatarPreviewPlayer(
        state,
        "cobalt",
        "walk",
        "upRight",
      )
      const idleSample = avatarPreviewPlayer(
        state,
        "moss",
        "idle",
        "downLeft",
      )
      const turnSample = avatarPreviewPlayer(
        state,
        "violet",
        "turn",
        "left",
      )

      return state.map?.label === "Avatar preview gallery" &&
        runSample?.animation.frameProgression.rawFrameIndex >= 2 &&
        walkSample?.animation.frameProgression.rawFrameIndex >= 2 &&
        idleSample?.animation.frameProgression.rawFrameIndex >= 1 &&
        turnSample?.animation.frameProgression.rawFrameIndex >= 1
    },
    9000,
  )
}

function assertAvatarFrameProgression(beforeState, afterState) {
  const samples = [
    ["ember", "run", "downRight"],
    ["cobalt", "walk", "upRight"],
    ["moss", "idle", "downLeft"],
    ["violet", "turn", "left"],
  ].map(([avatarId, action, visualFacing]) => {
    const before = avatarPreviewPlayer(beforeState, avatarId, action, visualFacing)
    const after = avatarPreviewPlayer(afterState, avatarId, action, visualFacing)

    assert.ok(
      before,
      `Missing initial avatar frame sample ${avatarId}/${action}/${visualFacing}.`,
    )
    assert.ok(
      after,
      `Missing progressed avatar frame sample ${avatarId}/${action}/${visualFacing}.`,
    )

    const beforeProgression = before.animation.frameProgression
    const afterProgression = after.animation.frameProgression

    assert.equal(beforeProgression.source, "phaser_animation_manager")
    assert.equal(afterProgression.source, "phaser_animation_manager")
    assert.equal(afterProgression.frameCount, after.animation.sprite.frameCount)
    assert.equal(afterProgression.loop, after.animation.sprite.loop)
    if (after.animation.sprite.loop) {
      assert.ok(
        afterProgression.elapsedMs > beforeProgression.elapsedMs,
        `Expected elapsed frame time to advance for ${after.playerId}.`,
      )
      assert.ok(
        afterProgression.rawFrameIndex > beforeProgression.rawFrameIndex,
        `Expected raw frame index to advance for ${after.playerId}.`,
      )
    } else {
      assert.ok(
        afterProgression.rawFrameIndex >= 1,
        `Expected non-looping pose clip to reach an animated frame for ${after.playerId}.`,
      )
    }
    assert.ok(
      afterProgression.currentFrameIndex >= 0 &&
        afterProgression.currentFrameIndex < afterProgression.frameCount,
      `Expected bounded current frame index for ${after.playerId}.`,
    )
    assert.ok(
      after.animation.frameKey.endsWith(
        `/${String(afterProgression.currentFrameIndex).padStart(2, "0")}`,
      ),
      `Expected frame key to match progression telemetry for ${after.playerId}.`,
    )
    assert.equal(
      after.animation.expressiveness.stateMachine,
      "explicit_idle_walk_run_turn",
    )
    assert.equal(
      after.animation.expressiveness.locomotionBlend,
      "phase_preserved_walk_run",
    )
    assert.equal(
      after.animation.expressiveness.visualFacingQa,
      "avatar_preview_gallery_8_way",
    )
    if (action === "run") {
      assert.equal(after.animation.expressiveness.walkRunBlendWeight, 1)
      assert.equal(after.animation.expressiveness.phaseContinuity, true)
    }
    if (action === "walk") {
      assert.ok(
        after.animation.expressiveness.walkRunBlendWeight > 0 &&
          after.animation.expressiveness.walkRunBlendWeight < 1,
        `Expected walk blend weight between idle and run, got ${JSON.stringify(after.animation.expressiveness)}.`,
      )
      assert.equal(after.animation.expressiveness.phaseContinuity, true)
    }
    if (action === "turn") {
      assert.equal(
        after.animation.expressiveness.turnPoseMode,
        "anticipation_arc_recovery",
      )
      assert.equal(after.animation.expressiveness.turnPoseActive, true)
      assert.ok(
        after.animation.expressiveness.turnPoseProgress >= 0 &&
          after.animation.expressiveness.turnPoseProgress <= 1,
        `Expected bounded turn pose progress, got ${JSON.stringify(after.animation.expressiveness)}.`,
      )
    }

    return {
      playerId: after.playerId,
      action,
      visualFacing,
      before: compactFrameProgression(beforeProgression),
      after: compactFrameProgression(afterProgression),
      frameKey: after.animation.frameKey,
      textureKey: after.animation.textureKey,
      nativeAnimation: {
        key: after.animation.nativeAnimation.key,
        registered: after.animation.nativeAnimation.registered,
        playing: after.animation.nativeAnimation.playing,
        progress: after.animation.nativeAnimation.progress,
      },
      expressiveness: after.animation.expressiveness,
    }
  })

  return {
    source: "avatar_animation_frame_progression",
    sampleCount: samples.length,
    samples,
  }
}

async function runAvatarTextureLeakCheck(page, galleryState) {
  const firstFullGallery = await waitForFullAvatarFrameCache(page)
  const firstTextureCount =
    firstFullGallery.renderer.performance.runtime.textureCount
  const firstAvatarTextureCount = uniqueAvatarTextureCount(firstFullGallery)

  await dispatchRendererTestCommand(page, "renderLargeStaticMap", {
    width: 20,
    height: 15,
  })
  const mapState = await waitForTextState(
    page,
    (state) =>
      state.map?.label === "Renderer stress map" &&
      state.map.width === 20 &&
      state.map.height === 15 &&
      rendererReadyForQa(state),
    9000,
  )

  await dispatchRendererTestCommand(page, "renderAvatarPreviewGallery")
  const secondFullGallery = await waitForFullAvatarFrameCache(page)

  await dispatchRendererTestCommand(page, "renderAvatarPreviewGallery")
  const thirdFullGallery = await waitForFullAvatarFrameCache(page)

  const secondTextureCount =
    secondFullGallery.renderer.performance.runtime.textureCount
  const thirdTextureCount =
    thirdFullGallery.renderer.performance.runtime.textureCount
  const expectedVisibleAvatarTextureCount = 128

  assert.equal(
    uniqueAvatarTextureCount(galleryState),
    expectedVisibleAvatarTextureCount,
    "Expected avatar gallery to expose one visible texture per preview avatar.",
  )
  assert.equal(
    firstAvatarTextureCount,
    expectedVisibleAvatarTextureCount,
    "Expected fully-cycled gallery to keep one current texture per preview avatar.",
  )
  assert.equal(
    uniqueAvatarTextureCount(secondFullGallery),
    expectedVisibleAvatarTextureCount,
    "Expected avatar texture keys to remain bounded after map switch.",
  )
  assert.equal(
    uniqueAvatarTextureCount(thirdFullGallery),
    expectedVisibleAvatarTextureCount,
    "Expected avatar texture keys to remain bounded after avatar switch.",
  )
  assert.ok(
    secondTextureCount <= firstTextureCount + 4,
    `Expected map -> avatar switch texture count to stay bounded, got ${firstTextureCount} -> ${secondTextureCount}.`,
  )
  assert.ok(
    thirdTextureCount <= secondTextureCount,
    `Expected repeated avatar gallery texture count not to grow, got ${secondTextureCount} -> ${thirdTextureCount}.`,
  )

  return {
    source: "avatar_texture_switch_leak_check",
    fullyCycledGalleryTextureCount: firstTextureCount,
    intermediateMapTextureCount:
      mapState.renderer.performance.runtime.textureCount,
    secondGalleryTextureCount: secondTextureCount,
    thirdGalleryTextureCount: thirdTextureCount,
    mapToAvatarTextureDelta: secondTextureCount - firstTextureCount,
    repeatedAvatarTextureDelta: thirdTextureCount - secondTextureCount,
    visibleAvatarTextureCount: expectedVisibleAvatarTextureCount,
    firstAvatarTextureCount,
    secondAvatarTextureCount: uniqueAvatarTextureCount(secondFullGallery),
    thirdAvatarTextureCount: uniqueAvatarTextureCount(thirdFullGallery),
  }
}

async function dispatchRendererTestCommand(page, commandName, ...args) {
  await page.evaluate(
    ({ commandName, args }) => {
      const api = window.__aedventureRendererTest
      const command = api?.[commandName]

      if (typeof command !== "function") {
        throw new Error(`Missing renderer test API: ${commandName}`)
      }

      void Promise.resolve(command(...args)).catch((error) => {
        console.error(error instanceof Error ? error.stack : String(error))
      })
    },
    { commandName, args },
  )
}

async function projectWorldToViewport(page, point) {
  return page.evaluate((worldPoint) => {
    const api = window.__aedventureRendererTest
    if (typeof api?.projectWorldToViewport !== "function") {
      throw new Error("Missing renderer projectWorldToViewport test API.")
    }

    return api.projectWorldToViewport(worldPoint)
  }, point)
}

async function waitForFullAvatarFrameCache(page) {
  await page.waitForTimeout(2300)

  return waitForTextState(
    page,
    (state) =>
      state.map?.label === "Avatar preview gallery" &&
      state.avatars.players.length === 128 &&
      rendererReadyForQa(state),
    9000,
  )
}

function uniqueAvatarTextureCount(state) {
  return new Set(
    state.avatars.players.map((player) => player.animation.textureKey),
  ).size
}

function avatarPreviewPlayer(state, avatarId, action, visualFacing) {
  return state.avatars?.players?.find(
    (player) =>
      player.playerId ===
      `avatar-preview-${avatarId}-${action}-${visualFacing}`,
  )
}

function compactFrameProgression(progression) {
  return {
    source: progression.source,
    elapsedMs: progression.elapsedMs,
    rawFrameIndex: progression.rawFrameIndex,
    currentFrameIndex: progression.currentFrameIndex,
    frameCount: progression.frameCount,
    normalizedCycleProgress: progression.normalizedCycleProgress,
  }
}

function assertRendererSnapshot(state) {
  assert.equal(state.renderer.requestedRenderer, "webgl")
  assert.equal(state.renderer.actualRenderer, "webgl")
  assert.equal(state.renderer.webgl.available, true)
  assert.equal(state.renderer.webgl.contextLost, false)
  assert.equal(state.renderer.webgl.recoveryReady, true)
  assert.ok(state.renderer.webgl.maxTextureSize >= 1024)
  assert.equal(state.renderer.scenes.source, "phaser_scene_manager")
  assert.equal(state.renderer.scenes.bootSceneKey, "RendererLoadingScene")
  assert.equal(state.renderer.scenes.worldSceneKey, "TileWorldScene")
  assert.ok(state.renderer.scenes.activeSceneKeys.includes("TileWorldScene"))
  assert.ok(
    state.renderer.scenes.registeredSceneKeys.includes("RendererLoadingScene"),
  )
  assert.ok(state.renderer.scenes.registeredSceneKeys.includes("TileWorldScene"))
  assert.ok(
    state.renderer.scenes.plannedSceneKeys.includes(
      "GeneratedRoomPreviewScene",
    ),
  )
  assert.ok(
    state.renderer.scenes.scenes.some(
      (scene) => scene.key === "TileWorldScene" && scene.status === "active",
    ),
  )
  assert.equal(state.renderer.input.source, "phaser_input_plugin")
  assert.equal(state.renderer.input.authority, "renderer_visual_selection_only")
  assert.equal(state.renderer.input.enabled, true)
  assert.ok(
    state.renderer.input.features.includes("semantic_zone_hit_testing"),
  )
  assert.ok(state.renderer.input.features.includes("object_hit_areas"))
  assert.ok(state.renderer.input.features.includes("drag_targets"))
  assert.ok(state.renderer.input.features.includes("touch_gestures"))
  assert.equal(typeof state.renderer.input.hitTesting.zoneTargetCount, "number")
  assert.equal(typeof state.renderer.input.hitTesting.objectTargetCount, "number")
  assert.equal(
    typeof state.renderer.input.selection.selectableObjectCount,
    "number",
  )
  assert.equal(state.renderer.input.drag.enabled, true)
  assert.equal(state.renderer.input.touch.multiPointerEnabled, true)
  assert.equal(state.renderer.physics.source, "phaser_arcade_physics")
  assert.equal(state.renderer.physics.authority, "visual_probes_only")
  assert.equal(state.renderer.physics.enabled, true)
  assert.equal(state.renderer.physics.engine, "arcade")
  assert.equal(state.renderer.physics.matterEnabled, false)
  assert.equal(state.renderer.physics.config.simulationAffectsGameplay, false)
  assert.equal(typeof state.renderer.physics.sensors.objectSensorCount, "number")
  assert.equal(typeof state.renderer.physics.sensors.zoneSensorCount, "number")
  assert.equal(typeof state.renderer.physics.sensors.staticBodyCount, "number")
  assert.equal(state.renderer.physics.sensors.dynamicProbeCount, 2)
  assert.equal(typeof state.renderer.physics.localProbe.active, "boolean")
  assert.ok(Array.isArray(state.renderer.physics.localProbe.overlappingObjectIds))
  assert.ok(Array.isArray(state.renderer.physics.localProbe.overlappingZoneIds))
  assert.ok(Array.isArray(
    state.renderer.physics.placementPreview.overlappingObjectIds,
  ))
  assertAudioContract(state.renderer.audio)
  assertAudioContract(state.audio)
  assertTextRenderingContract(state.renderer.text)
  assert.equal(state.renderer.depthEffects.source, "phaser_depth_effects")
  assert.equal(state.renderer.depthEffects.authority, "visual_only")
  assert.equal(state.renderer.depthEffects.enabled, true)
  assert.ok(state.renderer.depthEffects.features.includes("geometry_masks"))
  assert.ok(
    state.renderer.depthEffects.features.includes("foreground_blend_modes"),
  )
  assert.ok(state.renderer.depthEffects.features.includes("label_occlusion"))
  assert.equal(
    typeof state.renderer.depthEffects.masks.geometryMaskCount,
    "number",
  )
  assert.equal(
    typeof state.renderer.depthEffects.blendModes.foregroundSpriteCount,
    "number",
  )
  assert.equal(
    typeof state.renderer.depthEffects.labels.occlusionCandidateCount,
    "number",
  )
  assert.equal(state.renderer.assets.primarySource, "internal_atlas")
  assert.equal(state.renderer.assets.atlasLoaded, true)
  assert.equal(
    state.renderer.assets.loader.source,
    "phaser_loader_asset_pack",
  )
  assert.equal(state.renderer.assets.loader.progress.complete, true)
  assert.equal(state.renderer.assets.loader.progress.failedFiles, 0)
  assert.ok(state.renderer.assets.loader.loadedSections.includes("core-office"))
  assert.ok(
    state.renderer.assets.loader.cache.jsonKeys.includes(
      "aedventure.office.atlas.manifest",
    ),
  )
  assert.ok(
    state.renderer.assets.loader.cache.textureKeys.includes(
      "aedventure.office.atlas.image",
    ),
  )
  assert.equal(state.renderer.assets.metadata.sourceLicenseValidated, true)
  assert.equal(state.renderer.assets.metadata.atlasBuildValidated, true)
  assert.ok(state.renderer.assets.metadata.collisionFootprintCount >= 26)
  assert.ok(state.renderer.assets.metadata.shadowFootprintCount >= 28)
  assert.ok(state.renderer.assets.metadata.interactionAffordanceCount >= 12)
  assert.ok(state.renderer.assets.metadata.occlusionSplitCount >= 6)
  assert.equal(state.renderer.tilemap.staticGpuLayerCount, 2)
  assert.equal(state.renderer.tilemap.objectLayerMode, "sprites")
  assert.equal(state.renderer.tilemap.staticLayerBake.enabled, true)
  assert.equal(
    state.renderer.tilemap.staticLayerBake.mode,
    "single_render_texture",
  )
  assert.equal(state.renderer.tilemap.staticLayerBake.sourceLayerCount, 2)
  assert.equal(state.renderer.tilemap.staticLayerBake.bakedLayerCount, 1)
  assert.ok(state.renderer.tilemap.staticLayerBake.displayObjectReduction >= 1)
  assert.equal(
    state.renderer.tilemap.features.source,
    "phaser_tilemap_runtime_features",
  )
  assert.equal(
    state.renderer.tilemap.features.authority,
    "renderer_editor_affordances_only",
  )
  assert.equal(typeof state.renderer.tilemap.features.enabled, "boolean")
  assert.ok(
    state.renderer.tilemap.features.features.includes("tile_metadata"),
  )
  assert.equal(
    typeof state.renderer.tilemap.features.metadata.tilePropertyCount,
    "number",
  )
  assert.equal(
    typeof state.renderer.tilemap.features.collision.propertyCollisionTileCount,
    "number",
  )
  assert.equal(
    typeof state.renderer.tilemap.features.callbacks.tileIndexCallbackCount,
    "number",
  )
  assert.equal(
    typeof state.renderer.tilemap.features.animation.animatedTileCount,
    "number",
  )
  assert.ok(
    state.renderer.effects.applied.customWebglPipelines.includes(
      "ShaderQuad:aedventure_room_lighting",
    ),
    "Expected custom WebGL room-lighting shader pipeline.",
  )
  assert.equal(
    state.renderer.effects.applied.shaderPass,
    "custom_room_lighting_shader",
  )
  assert.equal(state.renderer.effects.applied.zoneGlow, "custom_zone_glow_shader")
  assert.ok(
    state.renderer.effects.applied.particleEffects.includes(
      "room_entry_transition",
    ),
    "Expected room-entry particles in renderer snapshot.",
  )
  assert.equal(state.renderer.effects.objectCounts.shaderPasses, 1)
  assert.equal(state.renderer.effects.objectCounts.shaderObjects, 1)
  assert.ok(state.renderer.effects.objectCounts.particleEmitters >= 1)
  assert.equal(state.renderer.effects.objectCounts.particleTextures, 1)
  assert.ok(state.renderer.effects.objectCounts.particleAliveBudget <= 96)
  assert.equal(state.renderer.effects.capability.shadersAvailable, true)
  assert.equal(state.renderer.effects.capability.particlesAvailable, true)
  assert.equal(
    state.renderer.visualPolish.source,
    "renderer_visual_polish",
  )
  assert.equal(
    state.renderer.visualPolish.markerEffectMode,
    "layered_pin_pulse_shadow",
  )
  assert.equal(
    state.renderer.visualPolish.markerStyle,
    "action_marker_cards",
  )
  assert.equal(
    state.renderer.visualPolish.objectShadowCount,
    state.renderer.performance.pooling.activeShadowCount,
  )
  if (state.map?.label === "Renderer stress map") {
    assert.ok(
      state.renderer.visualPolish.objectShadowCount > 0,
      "Expected renderer stress map to include polished object shadows.",
    )
  }
  assert.equal(
    state.renderer.visualPolish.pooledObjectShadowCount,
    state.renderer.performance.pooling.pooledShadowCount,
  )
  assert.equal(
    state.renderer.visualPolish.ambientMotionBreakdown.objectSprites,
    state.renderer.performance.pooling.ambientMotionSpriteCount,
  )
  assert.equal(
    state.renderer.visualPolish.ambientMotionBreakdown.particleEmitters,
    state.renderer.effects.objectCounts.coffeeSteamEmitters +
      state.renderer.effects.objectCounts.plantMoteEmitters +
      state.renderer.effects.objectCounts.portalShimmerEmitters +
      state.renderer.effects.objectCounts.actionZoneActivationEmitters +
      state.renderer.effects.objectCounts.entryTransitionEmitters,
  )
  assert.equal(
    state.renderer.visualPolish.ambientMotionCount,
    state.renderer.visualPolish.ambientMotionBreakdown.objectSprites +
      state.renderer.visualPolish.ambientMotionBreakdown.particleEmitters,
  )
  assert.ok(
    state.renderer.visualPolish.ambientMotionCount > 0,
    "Expected subtle ambient object motion to be active.",
  )
  if (state.map?.label === "Renderer stress map") {
    assert.ok(
      state.renderer.visualPolish.ambientMotionBreakdown.objectSprites > 0,
      "Expected renderer stress map to include ambient object motion.",
    )
  }
  assert.ok(
    ["idle", "switching", "entering"].includes(
      state.renderer.visualPolish.transitionState,
    ),
  )
  assert.equal(
    state.renderer.visualPolish.transitionOwner,
    "map_dataset_transition",
  )
  assert.equal(
    state.renderer.visualPolish.reducedMotionBehavior.policy,
    "prefers_reduced_motion_css_guard",
  )
  assert.equal(
    state.renderer.visualPolish.reducedMotionBehavior.query,
    "(prefers-reduced-motion: reduce)",
  )
  assert.equal(
    typeof state.renderer.visualPolish.reducedMotionBehavior.matches,
    "boolean",
  )
  assert.ok(
    ["enabled", "disabled_by_css"].includes(
      state.renderer.visualPolish.reducedMotionBehavior.mapTransition,
    ),
  )
  assert.equal(
    state.renderer.visualPolish.reducedMotionBehavior.ambientMotion,
    "subtle_visual_only",
  )
  assert.equal(
    state.worldInteractions.presentation.objectSelectionMode,
    "hover_select_target_outline",
  )
  assert.equal(
    state.worldInteractions.presentation.doorPortalFeedback,
    "directional_beacon_and_bounds",
  )
  assert.equal(
    state.worldInteractions.presentation.actionFlow,
    "approach_permission_confirm_execute",
  )
  assert.equal(
    state.worldInteractions.presentation.touchAffordance,
    "large_marker_hit_area_dom_prompt",
  )
  assert.equal(state.camera.secondary.source, "phaser_camera_manager")
  assert.ok(state.camera.secondary.totalCameraCount >= 2)
  const overviewExpected =
    state.camera.viewportWidth >= 540 && state.camera.viewportHeight >= 360
  if (overviewExpected) {
    assert.equal(state.camera.secondary.mode, "main_plus_overview")
    assert.ok(state.camera.secondary.visibleCameraCount >= 2)
    assert.ok(
      state.camera.secondary.secondaryCameras.some(
        (camera) =>
          camera.id === "overview-minimap" &&
          camera.role === "minimap_overview" &&
          camera.active &&
          camera.renderTarget === "same_scene_overlay",
      ),
      "Expected active overview minimap secondary camera.",
    )
  } else {
    assert.equal(state.camera.secondary.mode, "main_only")
  }
  assert.equal(state.renderer.mapValidation.valid, true)
  assert.equal(state.renderer.mapValidation.mutationSafe, true)
  assert.equal(state.renderer.performance.runtime.textureCount > 0, true)
  assert.equal(state.renderer.performance.runtime.displayObjectCount > 0, true)
  assert.equal(typeof state.renderer.depth.objectCount, "number")
  assert.equal(typeof state.renderer.depth.playerCount, "number")
  assert.equal(state.avatars.spriteAtlas.atlasImport.source, "avatar_atlas_manifest")
  assert.equal(
    state.avatars.spriteAtlas.atlasImport.activeSource,
    "runtime_generated_fallback",
  )
  assert.equal(state.avatars.spriteAtlas.atlasImport.contractValidated, true)
  assert.equal(state.avatars.spriteAtlas.atlasImport.unexpectedFrameCount, 0)
  assert.equal(state.avatars.spriteAtlas.atlasImport.duplicateSemanticFrameCount, 0)
  assert.equal(state.avatars.spriteAtlas.atlasImport.duplicateAtlasFrameCount, 0)
  assert.deepEqual(
    state.avatars.spriteAtlas.atlasImport.stateCoverage.map((entry) => [
      entry.action,
      entry.expectedFrameCount,
      entry.complete,
    ]),
    [
      ["idle", 64, true],
      ["walk", 96, true],
      ["run", 128, true],
      ["turn", 64, true],
    ],
  )
  assert.equal(
    state.avatars.animationPipeline.atlasContract.activationPolicy,
    "real_manifest_must_validate_else_runtime_generated_fallback",
  )
  assert.equal(
    state.avatars.animationPipeline.stateMachine,
    "explicit_idle_walk_run_turn",
  )
  assert.equal(
    state.avatars.animationPipeline.locomotionBlend,
    "phase_preserved_walk_run",
  )
  assert.equal(
    state.avatars.animationPipeline.turnPoseMode,
    "anticipation_arc_recovery",
  )
  assert.equal(
    state.avatars.animationPipeline.visualFacingQa,
    "avatar_preview_gallery_8_way",
  )
  assert.equal(
    state.avatars.animationPipeline.previewFixtureCoverage.qaTool,
    "avatar_preview_gallery",
  )
  assert.equal(state.avatars.animationPipeline.previewFixtureCoverage.complete, true)
  assertRendererPerformance(state.renderer.performance)
}

function rendererReadyForQa(state) {
  return (
    state.renderer?.assets?.primarySource === "internal_atlas" &&
    state.renderer.assets.atlasLoaded === true &&
    state.renderer.assets.fallbackTokenCount === 0 &&
    state.renderer.mapValidation?.valid === true
  )
}

function assertRendererPerformance(performance) {
  assert.equal(performance.source, "renderer_runtime")
  assert.equal(performance.target.targetFps, 60)
  assert.equal(performance.target.minimumAcceptableFps, 45)
  assert.equal(performance.target.targetFrameBudgetMs, 16.67)
  assert.equal(performance.target.minimumFrameBudgetMs, 22.22)
  assert.equal(performance.target.smokeAverageBudgetMs, 50)
  assert.equal(performance.target.smokeP95BudgetMs, 90)
  assert.equal(performance.target.smokeMaxBudgetMs, 250)
  assert.deepEqual(performance.target.benchmarkMaps, [
    "20x15",
    "50x40",
    "100x80",
  ])
  assert.equal(performance.lifecycle.phaserGameReused, true)
  assert.equal(typeof performance.lifecycle.mapRenderCount, "number")
  assert.equal(typeof performance.lifecycle.mapSwitchCount, "number")
  assert.equal(typeof performance.runtime.lastMapRenderDurationMs, "number")
  assert.equal(typeof performance.runtime.displayObjectCount, "number")
  assert.equal(typeof performance.runtime.textureCount, "number")
  assert.equal(typeof performance.pooling.activeSpriteCount, "number")
  assert.equal(typeof performance.pooling.visibleSpriteCount, "number")
  assert.equal(typeof performance.pooling.culledSpriteCount, "number")
  assert.equal(typeof performance.pooling.activeShadowCount, "number")
  assert.equal(typeof performance.pooling.pooledShadowCount, "number")
  assert.equal(typeof performance.pooling.ambientMotionSpriteCount, "number")
  assert.match(performance.proofs.mapSize, /^\d+x\d+$/)
  assert.equal(typeof performance.proofs.tileBatching.compatible, "boolean")
  assert.equal(typeof performance.proofs.staticLayerBaking.enabled, "boolean")
  assert.equal(
    typeof performance.proofs.staticLayerBaking.displayObjectReduction,
    "number",
  )
  assert.equal(typeof performance.proofs.viewportCulling.active, "boolean")
  assert.equal(typeof performance.proofs.viewportCulling.culledRatio, "number")
  assert.equal(typeof performance.proofs.objectPooling.reuseObserved, "boolean")
  assert.equal(typeof performance.proofs.textureReuse.reuseObserved, "boolean")
}

function snapshotForReport(label, state) {
  return {
    label,
    activeMapId: state.map?.activeMapId,
    renderer: {
      actualRenderer: state.renderer.actualRenderer,
      phaserVersion: state.renderer.phaserVersion,
      canvas: state.renderer.canvas,
      webgl: {
        available: state.renderer.webgl.available,
        maxTextures: state.renderer.webgl.maxTextures,
        maxTextureSize: state.renderer.webgl.maxTextureSize,
        drawingBufferWidth: state.renderer.webgl.drawingBufferWidth,
        drawingBufferHeight: state.renderer.webgl.drawingBufferHeight,
      },
      tilemap: {
        staticGpuLayerCount: state.renderer.tilemap.staticGpuLayerCount,
        staticTileCount: state.renderer.tilemap.staticTileCount,
        staticLayerBake: state.renderer.tilemap.staticLayerBake,
        features: state.renderer.tilemap.features,
      },
      depth: {
        objectCount: state.renderer.depth.objectCount,
        foregroundObjectCount: state.renderer.depth.foregroundObjectCount,
        playerCount: state.renderer.depth.playerCount,
      },
      performance: {
        displayObjectCount: state.renderer.performance.runtime.displayObjectCount,
        textureCount: state.renderer.performance.runtime.textureCount,
        mapRenderCount: state.renderer.performance.lifecycle.mapRenderCount,
        mapSwitchCount: state.renderer.performance.lifecycle.mapSwitchCount,
      },
      effects: {
        customWebglPipelines:
          state.renderer.effects.applied.customWebglPipelines,
        shaderPass: state.renderer.effects.applied.shaderPass,
        shaderPasses: state.renderer.effects.objectCounts.shaderPasses,
        particleEffects: state.renderer.effects.applied.particleEffects,
        particleEmitters: state.renderer.effects.objectCounts.particleEmitters,
        particleAliveBudget:
          state.renderer.effects.objectCounts.particleAliveBudget,
      },
      visualPolish: state.renderer.visualPolish,
      scenes: {
        activeSceneKeys: state.renderer.scenes.activeSceneKeys,
        registeredSceneKeys: state.renderer.scenes.registeredSceneKeys,
        plannedSceneKeys: state.renderer.scenes.plannedSceneKeys,
      },
      input: {
        features: state.renderer.input.features,
        cursor: state.renderer.input.cursor,
        hitTesting: state.renderer.input.hitTesting,
        selection: state.renderer.input.selection,
        gesture: state.renderer.input.gesture,
      },
      physics: {
        engine: state.renderer.physics.engine,
        authority: state.renderer.physics.authority,
        sensors: state.renderer.physics.sensors,
        localProbe: state.renderer.physics.localProbe,
        placementPreview: state.renderer.physics.placementPreview,
      },
      audio: state.renderer.audio,
      text: state.renderer.text,
      depthEffects: {
        masks: state.renderer.depthEffects.masks,
        blendModes: state.renderer.depthEffects.blendModes,
        fog: state.renderer.depthEffects.fog,
        labels: state.renderer.depthEffects.labels,
      },
      cameras: state.camera.secondary,
      mapValidation: state.renderer.mapValidation,
    },
    avatarAtlasImport: {
      manifestPath: state.avatars.spriteAtlas.atlasImport.manifestPath,
      imagePath: state.avatars.spriteAtlas.atlasImport.imagePath,
      activeSource: state.avatars.spriteAtlas.atlasImport.activeSource,
      fallbackActive: state.avatars.spriteAtlas.atlasImport.fallbackActive,
      expectedFrameCount:
        state.avatars.spriteAtlas.atlasImport.expectedFrameCount,
    },
  }
}

async function captureCanvas(page, filename) {
  const { screenshot } = await captureCanvasWithBuffer(page, filename)

  return screenshot
}

async function captureCanvasWithBuffer(page, filename) {
  const path = join(ARTIFACT_DIR, filename)
  const buffer = await page.locator("#map canvas").screenshot({ path })
  const stats = analyzeCanvasImage(buffer)

  assert.ok(
    stats.opaquePixelRatio >= 0.75,
    `${filename}: expected mostly opaque canvas pixels, got ${stats.opaquePixelRatio}.`,
  )
  assert.ok(
    stats.luminanceRange >= 25,
    `${filename}: expected visible canvas contrast, got range ${stats.luminanceRange}.`,
  )
  assert.ok(
    stats.sampledUniqueColors >= 12,
    `${filename}: expected nonblank varied canvas, got ${stats.sampledUniqueColors} sampled colors.`,
  )

  return {
    buffer,
    screenshot: {
      label: filename.replace(/\.png$/, ""),
      path,
      stats,
    },
  }
}

function assertAvatarFacingScreenshot(buffer, state) {
  const image = PNG.sync.read(buffer)
  const checks = AVATAR_VISUAL_FACINGS.map((visualFacing) => {
    const player = avatarPreviewPlayer(state, "ember", "idle", visualFacing)
    assert.ok(player, `Missing avatar preview player for ${visualFacing}.`)

    const point = projectWorldToImagePoint(state, player.currentPosition, image)
    const crop = cropImage(
      image,
      Math.round(point.x - 13),
      Math.round(point.y - 24),
      26,
      30,
    )
    const cropPath = join(
      ARTIFACT_DIR,
      `avatar-facing-${visualFacing}-crop.png`,
    )
    writeFileSync(cropPath, PNG.sync.write(crop))

    const stats = avatarCropStats(crop)
    assert.ok(
      stats.avatarLikePixelCount >= 70,
      `Expected visible avatar pixels for ${visualFacing}, got ${JSON.stringify(stats)}.`,
    )
    assert.ok(
      stats.sampledUniqueColors >= 4,
      `Expected varied avatar crop colors for ${visualFacing}, got ${JSON.stringify(stats)}.`,
    )
    assert.ok(
      stats.luminanceRange >= 18,
      `Expected readable avatar crop contrast for ${visualFacing}, got ${JSON.stringify(stats)}.`,
    )

    return {
      visualFacing,
      playerId: player.playerId,
      point,
      cropPath,
      stats,
    }
  })
  const uniqueFingerprints = new Set(checks.map((check) => check.stats.fingerprint))

  assert.ok(
    uniqueFingerprints.size >= 6,
    `Expected 8-way facing crops to produce distinct silhouettes, got ${uniqueFingerprints.size}.`,
  )

  return checks
}

function projectWorldToImagePoint(state, position, image) {
  const canvasWidth = state.renderer.canvas.width || image.width
  const canvasHeight = state.renderer.canvas.height || image.height
  const scaleX = image.width / canvasWidth
  const scaleY = image.height / canvasHeight

  return {
    x: Math.round(
      (position.x - state.camera.worldView.x) * state.camera.effectiveZoom *
        scaleX,
    ),
    y: Math.round(
      (position.y - state.camera.worldView.y) * state.camera.effectiveZoom *
        scaleY,
    ),
  }
}

function cropImage(image, x, y, width, height) {
  const crop = new PNG({ width, height })

  for (let cropY = 0; cropY < height; cropY += 1) {
    for (let cropX = 0; cropX < width; cropX += 1) {
      const sourceX = Math.min(image.width - 1, Math.max(0, x + cropX))
      const sourceY = Math.min(image.height - 1, Math.max(0, y + cropY))
      const sourceOffset = (image.width * sourceY + sourceX) << 2
      const targetOffset = (width * cropY + cropX) << 2

      crop.data[targetOffset] = image.data[sourceOffset]
      crop.data[targetOffset + 1] = image.data[sourceOffset + 1]
      crop.data[targetOffset + 2] = image.data[sourceOffset + 2]
      crop.data[targetOffset + 3] = image.data[sourceOffset + 3]
    }
  }

  return crop
}

function avatarCropStats(image) {
  const background = {
    red: image.data[0],
    green: image.data[1],
    blue: image.data[2],
  }
  let avatarLikePixelCount = 0
  let minLuminance = 255
  let maxLuminance = 0
  const sampledColors = new Set()

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (image.width * y + x) << 2
      const red = image.data[offset]
      const green = image.data[offset + 1]
      const blue = image.data[offset + 2]
      const distance = Math.hypot(
        red - background.red,
        green - background.green,
        blue - background.blue,
      )

      if (distance < 35) continue

      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
      avatarLikePixelCount += 1
      minLuminance = Math.min(minLuminance, luminance)
      maxLuminance = Math.max(maxLuminance, luminance)
      sampledColors.add(
        `${Math.round(red / 16)}:${Math.round(green / 16)}:${Math.round(
          blue / 16,
        )}`,
      )
    }
  }

  return {
    width: image.width,
    height: image.height,
    avatarLikePixelCount,
    sampledUniqueColors: sampledColors.size,
    luminanceRange: roundTo(maxLuminance - minLuminance, 2),
    fingerprint: [...sampledColors].sort().join("|"),
  }
}

function analyzeCanvasImage(buffer) {
  const image = PNG.sync.read(buffer)
  const totalPixels = image.width * image.height
  let opaquePixels = 0
  let minLuminance = 255
  let maxLuminance = 0
  let luminanceTotal = 0
  const sampledColors = new Set()

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (image.width * y + x) << 2
      const alpha = image.data[offset + 3]
      if (alpha < 32) continue

      const red = image.data[offset]
      const green = image.data[offset + 1]
      const blue = image.data[offset + 2]
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue

      opaquePixels += 1
      minLuminance = Math.min(minLuminance, luminance)
      maxLuminance = Math.max(maxLuminance, luminance)
      luminanceTotal += luminance

      if (x % 12 === 0 && y % 12 === 0) {
        sampledColors.add(
          `${Math.round(red / 8)}:${Math.round(green / 8)}:${Math.round(
            blue / 8,
          )}`,
        )
      }
    }
  }

  return {
    width: image.width,
    height: image.height,
    opaquePixelRatio: roundTo(opaquePixels / totalPixels, 4),
    luminanceRange: roundTo(maxLuminance - minLuminance, 2),
    averageLuminance: roundTo(luminanceTotal / Math.max(1, opaquePixels), 2),
    sampledUniqueColors: sampledColors.size,
  }
}

async function measureFrameCadence(page, sampleCount = 40) {
  return page.evaluate(async (count) => {
    const round = (value, places) => {
      const multiplier = 10 ** places
      return Math.round(value * multiplier) / multiplier
    }
    const samples = []
    let previous = performance.now()

    for (let index = 0; index < count; index += 1) {
      await new Promise((resolve) => window.requestAnimationFrame(resolve))
      const current = performance.now()
      samples.push(current - previous)
      previous = current
    }

    const sorted = [...samples].sort((first, second) => first - second)
    const percentileIndex = Math.min(
      sorted.length - 1,
      Math.ceil(sorted.length * 0.95) - 1,
    )

    return {
      samples: samples.length,
      averageMs: round(
        samples.reduce((total, sample) => total + sample, 0) / samples.length,
        2,
      ),
      p95Ms: round(sorted[percentileIndex], 2),
      maxMs: round(Math.max(...samples), 2),
    }
  }, sampleCount)
}

function assertFrameCadence(performance, cadence) {
  const strictTiming = process.env.STRICT_RENDERER_TIMING === "1"
  const withinTarget =
    cadence.averageMs < performance.target.smokeAverageBudgetMs &&
    cadence.p95Ms < performance.target.smokeP95BudgetMs &&
    cadence.maxMs < performance.target.smokeMaxBudgetMs

  if (strictTiming) {
    assert.ok(
      cadence.averageMs < performance.target.smokeAverageBudgetMs,
      `Expected average frame cadence below ${performance.target.smokeAverageBudgetMs}ms, got ${cadence.averageMs}ms.`,
    )
    assert.ok(
      cadence.p95Ms < performance.target.smokeP95BudgetMs,
      `Expected p95 frame cadence below ${performance.target.smokeP95BudgetMs}ms, got ${cadence.p95Ms}ms.`,
    )
    assert.ok(
      cadence.maxMs < performance.target.smokeMaxBudgetMs,
      `Expected max frame cadence below ${performance.target.smokeMaxBudgetMs}ms, got ${cadence.maxMs}ms.`,
    )
  } else if (!withinTarget) {
    const hardAverageBudgetMs = performance.target.smokeAverageBudgetMs * 4
    const hardP95BudgetMs = performance.target.smokeP95BudgetMs * 4
    const hardMaxBudgetMs = performance.target.smokeMaxBudgetMs * 4

    assert.ok(
      cadence.averageMs < hardAverageBudgetMs,
      `Expected average frame cadence below constrained-runner hard budget ${hardAverageBudgetMs}ms, got ${cadence.averageMs}ms.`,
    )
    assert.ok(
      cadence.p95Ms < hardP95BudgetMs,
      `Expected p95 frame cadence below constrained-runner hard budget ${hardP95BudgetMs}ms, got ${cadence.p95Ms}ms.`,
    )
    assert.ok(
      cadence.maxMs < hardMaxBudgetMs,
      `Expected max frame cadence below constrained-runner hard budget ${hardMaxBudgetMs}ms, got ${cadence.maxMs}ms.`,
    )
  }

  return {
    status: withinTarget ? "within_target" : "constrained_runner_warning",
    strictTiming,
    target: {
      averageMs: performance.target.smokeAverageBudgetMs,
      p95Ms: performance.target.smokeP95BudgetMs,
      maxMs: performance.target.smokeMaxBudgetMs,
    },
  }
}

function assertDepthOrdering(state, depthCase) {
  const player = state.renderer.depth.players.find((candidate) => candidate.local)
  const object = state.renderer.depth.objects.find(
    (candidate) => candidate.tokenId === depthCase.occluderTokenId,
  )

  assert.ok(player, `Expected local player depth info for ${depthCase.id}.`)
  assert.ok(object, `Expected occluder depth info for ${depthCase.id}.`)

  if (depthCase.expectedLayerAtSample === "object") {
    assert.ok(
      player.depth < object.depth,
      `Expected ${depthCase.id} player depth ${player.depth} behind object depth ${object.depth}.`,
    )
  } else {
    assert.ok(
      player.depth > object.depth,
      `Expected ${depthCase.id} player depth ${player.depth} in front of object depth ${object.depth}.`,
    )
  }
}

async function assertDepthScreenshot(page, state, depthCase) {
  const buffer = await page.locator("#map canvas").screenshot()
  const image = PNG.sync.read(buffer)
  const point = depthSamplePoint(state, depthCase, image)
  const stats = pixelStats(image, point.x, point.y, 12)

  if (depthCase.expectedLayerAtSample === "avatar") {
    assert.ok(
      stats.avatarPixels >= 12,
      `Expected avatar-colored pixels for ${depthCase.id}, got ${JSON.stringify(
        stats,
      )}.`,
    )
    return { samplePoint: point, ...stats }
  }

  assert.ok(
    stats.warmObjectPixels >= 12 && stats.warmObjectPixels > stats.avatarPixels,
    `Expected object-colored pixels for ${depthCase.id}, got ${JSON.stringify(
      stats,
    )}.`,
  )
  return { samplePoint: point, ...stats }
}

function depthSamplePoint(state, depthCase, image) {
  const fixturePoint = clampCanvasPoint(depthCase.sampleViewport, image)
  if (pointWithinCanvas(depthCase.sampleViewport, image)) {
    return { ...fixturePoint, source: "fixture_projection" }
  }

  const player = state.renderer.depth.players.find((candidate) => candidate.local)
  const object = state.renderer.depth.objects.find(
    (candidate) => candidate.tokenId === depthCase.occluderTokenId,
  )
  const bounds =
    depthCase.expectedLayerAtSample === "avatar" ? player?.labelBounds : object?.bounds

  if (!bounds) {
    return { ...fixturePoint, source: "fixture_projection_clamped" }
  }

  return {
    ...clampCanvasPoint(
      worldToViewportPoint(
        {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2,
        },
        state.camera,
      ),
      image,
    ),
    source: "camera_bounds_projection",
  }
}

function worldToViewportPoint(point, camera) {
  return {
    x: (point.x - camera.worldView.x) * camera.effectiveZoom,
    y: (point.y - camera.worldView.y) * camera.effectiveZoom,
  }
}

function pointWithinCanvas(point, image) {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < image.width &&
    point.y < image.height
  )
}

function pixelStats(image, centerX, centerY, radius) {
  let avatarPixels = 0
  let warmObjectPixels = 0
  let opaquePixels = 0

  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue

      const offset = (image.width * y + x) << 2
      const color = {
        red: image.data[offset],
        green: image.data[offset + 1],
        blue: image.data[offset + 2],
        alpha: image.data[offset + 3],
      }

      if (color.alpha > 180) {
        opaquePixels += 1
      }
      if (isCobaltAvatarPixel(color)) {
        avatarPixels += 1
      }
      if (isWarmObjectPixel(color)) {
        warmObjectPixels += 1
      }
    }
  }

  return {
    avatarPixels,
    warmObjectPixels,
    opaquePixels,
  }
}

function isCobaltAvatarPixel(color) {
  return (
    color.alpha > 180 &&
    color.blue > 105 &&
    color.blue - color.red > 40 &&
    color.blue >= color.green + 8
  )
}

function isWarmObjectPixel(color) {
  return (
    color.alpha > 180 &&
    color.red > 55 &&
    color.green > 25 &&
    color.red >= color.blue + 20 &&
    color.green >= color.blue - 12 &&
    !isCobaltAvatarPixel(color)
  )
}

function clampCanvasPoint(point, image) {
  return {
    x: Math.max(0, Math.min(image.width - 1, Math.round(point.x))),
    y: Math.max(0, Math.min(image.height - 1, Math.round(point.y))),
  }
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
    `Timed out waiting for renderer QA state matching ${predicatePreview(
      predicate,
    )}. Latest state:\n${JSON.stringify(
      latest,
      null,
      2,
    )}`,
  )
}

function predicatePreview(predicate) {
  return predicate
    .toString()
    .replace(/\s+/g, " ")
    .slice(0, 260)
}

async function renderGameToText(page) {
  return page.evaluate(() => {
    if (typeof window.render_game_to_text !== "function") {
      throw new Error("Missing window.render_game_to_text.")
    }

    return JSON.parse(window.render_game_to_text())
  })
}

function roundTo(value, places) {
  const multiplier = 10 ** places
  return Math.round(value * multiplier) / multiplier
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
