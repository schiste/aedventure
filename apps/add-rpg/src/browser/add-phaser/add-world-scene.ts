import Phaser from "phaser"
import { TransitionRegistry } from "@aedventure/game-animation"
import type { CellCoord, SquareCoord, Vector2 } from "@aedventure/game-topology"
import { validateGameWorld, type GameCellPlacement, type GameEntity, type GameWorld } from "@aedventure/game-world"
import {
  GameMapCellRenderer,
  WorldCellInteractionRenderer,
  WorldEntityRenderer,
  WorldFogRenderer,
  drawHexPath,
  type WorldCellInteractionAffordance,
  type WorldCellInteractionSelection,
  type WorldCellInteractionZone,
  type WorldEntityRenderState,
} from "@aedventure/game-renderer-phaser"
import {
  addMapCoordKey,
  createAddCellPresentationPolicy,
  createAddTopologyNavigationPolicy,
  createAddWorldInteractionPolicy,
  displayAddCell,
  addCellVisualStyle,
  dungeonLinkInfo,
  mapMarkersForCell,
  presentationVisibilityStateForCell,
  tileInteractionDetailForCoord,
  type AddMapMarker,
} from "@aedventure/add-domain"

import { ADD_TILE_TRAVEL_PRESENTATION } from "../travel-presentation-timing"
import {
  characterMoveKeyForKeyboardKey,
  directionForCharacterKeys,
  entryFacingForContext,
  initialCharacterCoord,
} from "./add-character-navigation"
import { inactiveTravelRevealPreview } from "./add-fog-renderer"
import { hashCoord, setCrispText } from "./add-landmark-renderer"
import {
  dungeonLinksForCoord,
  emptyMapInfo,
  emptyRendererState,
  hasDungeonLinks,
  projectAddPhaserMapInfo,
  rendererType,
} from "./add-map-telemetry"
import {
  centerFor,
  clamp,
  createRenderContext,
  distanceBetween,
  round,
  sameCoord,
  smoothStep,
  squareCellSize,
  visualCellRadius,
} from "./add-render-context"
import {
  DEFAULT_RADIUS,
  KEY_CHORD_DELAY_MS,
  MAX_ZOOM,
  MIN_ZOOM,
  REVEAL_TRANSITION_MS,
  TRAVEL_REVEAL_HALO_FEATHER_MULTIPLIER,
  TRAVEL_REVEAL_HALO_RADIUS_MULTIPLIER,
  TRAVEL_REVEAL_TRAIL_MS,
  VISIBILITY_POLISH,
  type AddCharacterMoveDirection,
  type AddCharacterMoveKey,
  type AddCharacterTravelEvent,
  type AddPhaserMapInfo,
  type AddRpgPhaserMapHostOptions,
  type CharacterMoveStatus,
  type CharacterTravelState,
  type PhaserMapRendererState,
  type PhaserMapPresentationState,
  type RenderContext,
  type TravelRevealPreview,
} from "./types"

// How long a door takes to swing open/closed (presentation only).
const DOOR_SWING_MS = 300
const MAP_DECISION_DIRECTIONS: readonly AddCharacterMoveDirection[] = [
  "up",
  "north_east",
  "right",
  "south_east",
  "down",
  "south_west",
  "left",
  "north_west",
]

type MapPrimaryAffordanceInfo = PhaserMapPresentationState["mapPrimaryAffordances"]

interface DoorVisual {
  panel: Phaser.GameObjects.Rectangle
  coord: SquareCoord
  closedRot: number
  openRot: number
  open: boolean
}

type MobileEdgeCullObject = Phaser.GameObjects.GameObject & {
  readonly x?: number
  readonly y?: number
  readonly displayWidth?: number
  setAlpha?: (alpha: number) => Phaser.GameObjects.GameObject
  setVisible?: (visible: boolean) => Phaser.GameObjects.GameObject
}

export class AddRpgHexScene extends Phaser.Scene {
  private readonly hostOptions: AddRpgPhaserMapHostOptions
  private readonly cellPresentationPolicy = createAddCellPresentationPolicy()
  private readonly worldInteractionPolicy = createAddWorldInteractionPolicy()
  private readonly navigationPolicy = createAddTopologyNavigationPolicy()
  private cellRenderer?: GameMapCellRenderer
  private cellInteractionRenderer?: WorldCellInteractionRenderer
  private characterRenderer?: WorldEntityRenderer
  private fogRenderer?: WorldFogRenderer
  private ambienceGraphics?: Phaser.GameObjects.Graphics
  private mapCommunicationGraphics?: Phaser.GameObjects.Graphics
  private transitionGraphics?: Phaser.GameObjects.Graphics
  private landmarkObjects: Phaser.GameObjects.GameObject[] = []
  private mobileEdgeCullObjects: MobileEdgeCullObject[] = []
  private mapCommunicationObjects: Phaser.GameObjects.GameObject[] = []
  private mapPrimaryAffordanceInfo: MapPrimaryAffordanceInfo = emptyMapPrimaryAffordanceInfo()
  private actionMarkerCount = 0
  private landmarkBeaconCount = 0
  private mobileEdgeCulledLabelCount = 0
  private readonly doorVisuals = new Map<string, DoorVisual>()
  private readonly transitions = new TransitionRegistry()
  private pendingWorld?: GameWorld
  private context?: RenderContext
  private ready = false
  private renderCount = 0
  private frameCount = 0
  private cameraInitialized = false
  private hoveredCoord: CellCoord | null = null
  private selectedCoord: CellCoord | null = null
  private lastInteractionInput: "keyboard" | "pointer" | "programmatic" | "none" = "none"
  private tooltipText?: Phaser.GameObjects.Text
  private minimapGraphics?: Phaser.GameObjects.Graphics
  private lastRenderedMapId: string | null = null
  private dragging = false
  private dragMoved = false
  // When true, the camera eases to keep the Hero in view as it travels. Turned
  // off when the player pans manually; re-armed by "Center on Hero".
  private followHero = true
  private dragStartScreen: Vector2 = { x: 0, y: 0 }
  private dragStartScroll: Vector2 = { x: 0, y: 0 }
  private transitionState: "idle" | "entering" = "idle"
  private transitionProgress = 1
  private characterCoord: CellCoord | null = null
  private characterPosition: Vector2 | null = null
  private characterTarget: Vector2 | null = null
  private characterTravel: CharacterTravelState | null = null
  private characterFacing: AddCharacterMoveDirection = "down"
  private travelRuntimeLocked = false
  private travelPromptLocked = false
  private characterMoveStatus: CharacterMoveStatus = {
    direction: null,
    accepted: null,
    blockedReason: null,
  }
  private readonly heldCharacterKeys = new Set<AddCharacterMoveKey>()
  private readonly pendingCharacterKeys = new Set<AddCharacterMoveKey>()
  private pendingCharacterMoveTimer: number | null = null
  private lastRendererState: PhaserMapRendererState = emptyRendererState()
  private lastInfo: AddPhaserMapInfo = emptyMapInfo()

  constructor(options: AddRpgPhaserMapHostOptions) {
    super("add-rpg-hex-map")
    this.hostOptions = options
  }

  create(): void {
    this.cellRenderer = new GameMapCellRenderer(this)
    this.cellInteractionRenderer = new WorldCellInteractionRenderer(this)
    this.characterRenderer = new WorldEntityRenderer(this)
    this.fogRenderer = new WorldFogRenderer(this)
    this.ambienceGraphics = this.add.graphics()
    this.mapCommunicationGraphics = this.add.graphics()
    this.transitionGraphics = this.add.graphics()
    this.ambienceGraphics.setDepth(10)
    this.mapCommunicationGraphics.setDepth(29)
    this.transitionGraphics.setDepth(80)
    this.transitionGraphics.setScrollFactor(0)
    // Reused on-map tile tooltip (world-space, follows the hovered/selected cell).
    this.tooltipText = this.add.text(0, 0, "", {
      color: "#1f2a25",
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "12px",
      fontStyle: "700",
      align: "center",
      backgroundColor: "rgba(255, 250, 226, 0.92)",
      stroke: "rgba(255, 255, 255, 0.42)",
      strokeThickness: 2,
      padding: { x: 7, y: 4 },
    })
    this.tooltipText.setOrigin(0.5, 1)
    this.tooltipText.setDepth(60)
    this.tooltipText.setVisible(false)
    setCrispText(this.tooltipText)
    // Strategic minimap overlay (screen-space, overworld only).
    this.minimapGraphics = this.add.graphics()
    this.minimapGraphics.setScrollFactor(0)
    this.minimapGraphics.setDepth(75)
    this.ready = true
    this.cameras.main.setRoundPixels(false)
    this.input.on("pointermove", this.onPointerMove, this)
    this.input.on("pointerdown", this.onPointerDown, this)
    this.input.on("pointerup", this.onPointerUp, this)
    this.input.on("wheel", this.onWheel, this)
    this.input.keyboard?.on("keydown", this.onKeyDown, this)
    this.input.keyboard?.on("keyup", this.onKeyUp, this)
    this.scale.on("resize", this.onResize, this)
    this.renderPendingWorld(true)
  }

  update(_time: number, delta: number): void {
    if (!this.ready || !this.context) return
    this.frameCount += Math.max(1, Math.round(delta / 16))
    if (this.transitionState === "entering") {
      this.transitionProgress = clamp(this.transitionProgress + delta / 520, 0, 1)
      if (this.transitionProgress >= 1) this.transitionState = "idle"
    }
    this.updateMainCharacter(delta)
    this.drawAmbience(this.context)
    this.drawFog(this.context)
    this.tickDoors()
    this.updateMobileEdgeCullObjects()
    this.drawOverlay()
    this.refreshInfo()
  }

  renderWorld(world: GameWorld): void {
    this.pendingWorld = world
    this.renderPendingWorld(false)
  }

  advanceTime(milliseconds: number): void {
    this.frameCount += Math.max(1, Math.round(milliseconds / 16))
    if (this.context) this.drawFog(this.context)
    this.drawOverlay()
    this.refreshInfo()
  }

  zoomBy(factor: number): void {
    const camera = this.cameras.main
    camera.setZoom(clamp(camera.zoom * factor, MIN_ZOOM, MAX_ZOOM))
    this.refreshInfo()
  }

  resetCamera(): void {
    if (!this.context) return
    this.fitCameraToContext(this.context)
    this.refreshInfo()
  }

  async moveMainCharacter(direction: AddCharacterMoveDirection): Promise<boolean> {
    if (!this.context) {
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "map_not_ready",
      }
      this.refreshInfo()
      return false
    }

    this.syncMainCharacter(this.context, false)
    if (this.travelRuntimeLocked || this.travelPromptLocked || this.characterIsMoving()) {
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "travel_in_progress",
      }
      this.refreshInfo()
      return false
    }
    if (!this.characterCoord) {
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "no_character_coord",
      }
      this.refreshInfo()
      return false
    }

    const fromCoord = this.characterCoord
    const nextCoord = this.navigationPolicy.nextCoord(
      this.characterCoord,
      { direction },
      this.context.map.topology,
    )
    if (!nextCoord) {
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "unsupported_direction",
      }
      this.refreshInfo()
      return false
    }

    const nextCell = this.context.terrainByCoord.get(addMapCoordKey(nextCoord))
    if (!nextCell) {
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "outside_map",
      }
      this.refreshInfo()
      return false
    }
    this.selectedCoord = nextCoord
    this.hoveredCoord = null
    this.lastInteractionInput = "keyboard"
    // Bumping a closed door opens it (authoritative toggle) instead of moving;
    // the next step enters once the new snapshot marks it open.
    if (nextCell.metadata?.door === true && nextCell.metadata?.doorOpen !== true) {
      this.characterFacing = direction
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "opening_door",
      }
      this.hostOptions.onDoorToggle?.(nextCoord)
      this.drawOverlay()
      this.refreshInfo()
      return false
    }
    // Bumping an un-cleared creature/container resolves it (clear/loot) instead
    // of moving; the next step enters once the snapshot drops it.
    const nextFeature = nextCell.metadata?.feature
    if (
      (nextFeature === "creature" || nextFeature === "container") &&
      nextCell.metadata?.cleared !== true
    ) {
      this.characterFacing = direction
      this.characterMoveStatus = { direction, accepted: false, blockedReason: "clearing_location" }
      const lootTable =
        typeof nextCell.metadata?.lootTable === "string" ? nextCell.metadata.lootTable : undefined
      this.hostOptions.onClearLocation?.(nextCoord, lootTable)
      this.drawOverlay()
      this.refreshInfo()
      return false
    }
    // Bumping a dropped-item pile picks it up instead of moving.
    if (nextFeature === "dropped_items") {
      this.characterFacing = direction
      this.characterMoveStatus = { direction, accepted: false, blockedReason: "picking_up" }
      this.hostOptions.onPickUp?.(nextCoord)
      this.drawOverlay()
      this.refreshInfo()
      return false
    }
    if (!this.navigationPolicy.canEnterCell(nextCell)) {
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "blocked_tile",
      }
      this.drawOverlay()
      this.refreshInfo()
      return false
    }

    const fromPosition = this.characterPosition ?? centerFor(fromCoord, this.context)
    const toPosition = centerFor(nextCoord, this.context)
    const destinationDetail = tileInteractionDetailForCoord(nextCoord, this.context.terrainByCoord)
    const destinationInteraction = this.worldInteractionPolicy.interactionForCell(
      nextCoord,
      nextCell,
    )
    const destinationLinks = destinationDetail?.dungeonLinks ?? []
    const destinationLabel =
      destinationDetail?.label ?? destinationInteraction?.label ?? "Unknown region"
    const destinationState =
      destinationDetail?.state === "unknown" ? "inactive" : destinationDetail?.state ?? "inactive"
    const destinationTerrain = destinationDetail?.terrain ?? "unknown"
    const exposureRisk = destinationDetail?.exposureRisk ?? "unknown"
    const travelEvent: AddCharacterTravelEvent = {
      direction,
      fromCoord,
      toCoord: nextCoord,
      fromCell: displayAddCell(fromCoord),
      toCell: displayAddCell(nextCoord),
      destinationLabel,
      destinationState,
      destinationTerrain,
      exposureRisk,
      dungeonLinksAtDestination: destinationLinks,
    }

    this.travelPromptLocked = true
    let approved = true
    try {
      approved = (await this.hostOptions.onBeforeCharacterTravel?.(travelEvent)) !== false
    } finally {
      this.travelPromptLocked = false
    }
    if (!approved) {
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "travel_declined",
      }
      this.drawOverlay()
      this.refreshInfo()
      return false
    }

    this.characterCoord = nextCoord
    this.characterPosition = fromPosition
    this.characterTarget = toPosition
    this.characterTravel = {
      direction,
      fromCoord,
      toCoord: nextCoord,
      startedAtMs: this.time.now,
      durationMs: ADD_TILE_TRAVEL_PRESENTATION.durationMs,
      fromPosition,
      toPosition,
    }
    // Keep the Hero framed while travelling (unless the player is panning).
    if (this.followHero) {
      this.focusOnCoord(nextCoord, ADD_TILE_TRAVEL_PRESENTATION.durationMs)
    }
    this.characterFacing = direction
    this.characterMoveStatus = {
      direction,
      accepted: true,
      blockedReason: null,
    }
    this.drawOverlay()
    this.refreshInfo()
    this.hostOptions.onCharacterTravel?.(travelEvent)
    return true
  }

  selectCell(cell: string): boolean {
    if (!this.context) return false
    const selectedCell = this.context.terrainCells.find(
      (candidate) => displayAddCell(candidate.coord) === cell,
    )
    if (!selectedCell) return false
    this.selectedCoord = selectedCell.coord
    this.hoveredCoord = null
    this.lastInteractionInput = "programmatic"
    this.drawOverlay()
    this.refreshInfo()
    return true
  }

  setTravelLocked(locked: boolean): void {
    this.travelRuntimeLocked = locked
    this.refreshInfo()
  }

  getInfo(): AddPhaserMapInfo {
    this.refreshInfo()
    return this.lastInfo
  }

  getRendererState(): PhaserMapRendererState {
    this.refreshInfo()
    return this.lastRendererState
  }

  private renderPendingWorld(forceCameraFit: boolean): void {
    if (!this.ready || !this.pendingWorld) return

    const world = this.pendingWorld
    const validation = validateGameWorld(world)
    const map = world.maps.find((candidate) => candidate.id === world.activeMapId) ?? world.maps[0]
    if (!map || (map.topology.kind !== "hex" && map.topology.kind !== "square")) {
      this.lastRendererState = {
        ...emptyRendererState(),
        ready: this.ready,
        renderCount: this.renderCount,
        validation: {
          valid: false,
          summary: "ADD world did not contain a supported map topology.",
        },
        rendererType: rendererType(this.game.renderer.type),
      }
      this.lastInfo = projectAddPhaserMapInfo({
        rendererState: this.lastRendererState,
        context: null,
        worldInteractionPolicy: this.worldInteractionPolicy,
      })
      return
    }

    const mapChanged = this.lastRenderedMapId !== map.id
    if (mapChanged) {
      this.hoveredCoord = null
      this.selectedCoord = null
      this.characterCoord = null
      this.characterPosition = null
      this.characterTarget = null
      this.cameraInitialized = false
      this.lastRenderedMapId = map.id
      this.transitionState = "entering"
      this.transitionProgress = 0
      this.cellInteractionRenderer?.clear()
      this.characterRenderer?.clear()
      this.fogRenderer?.clear()
      this.clearMapCommunicationOverlay()
      this.doorVisuals.forEach((visual) => visual.panel.destroy())
      this.doorVisuals.clear()
      this.transitions.clear()
    }

    this.context = createRenderContext(map, this.scale.width, this.scale.height)
    this.drawTerrain(this.context)
    this.drawAmbience(this.context)
    this.drawFog(this.context)
    this.drawLandmarks(this.context)
    this.syncDoors(this.context)
    this.syncMainCharacter(this.context, mapChanged)
    this.ensureSelectedCoord(this.context)
    this.drawOverlay()
    this.renderCount += 1

    if (forceCameraFit || !this.cameraInitialized) {
      this.fitCameraToContext(this.context)
      this.cameraInitialized = true
    }

    this.refreshInfo(validation.summary, validation.valid)
  }

  private drawTerrain(context: RenderContext): void {
    this.cellRenderer?.render(context.map, {
      origin: context.origin,
      depth: 0,
      presentationPolicy: this.cellPresentationPolicy,
      layerKinds: ["terrain"],
      emphasizedCoordKeys: context.bubbleEdgeCoords,
      style: "painterly",
      renderFog: false,
    })
  }

  private drawLandmarks(context: RenderContext): void {
    this.landmarkObjects.forEach((object) => object.destroy())
    this.landmarkObjects = []
    this.mobileEdgeCullObjects = []
    this.actionMarkerCount = 0
    this.landmarkBeaconCount = 0

    for (const entity of context.map.entities) {
      if (!entity.coord || entity.coord.kind !== context.topologyKind) continue
      if (entity.kind === "hero") continue
      const cell = context.terrainByCoord.get(addMapCoordKey(entity.coord))
      if (cell && !this.cellPresentationPolicy.cellVisible(cell)) continue

      const center = centerFor(entity.coord, context)
      if (entity.kind === "creature") {
        // Live creatures only render where currently visible, never remembered.
        if (cell && presentationVisibilityStateForCell(cell) !== "visible") continue
        this.drawCreature(center, entity, squareCellSize(context))
        continue
      }
      const tags = new Set(entity.tags ?? [])
      if (tags.has("flora")) {
        this.drawFlora(center, entity)
        continue
      }
      this.drawLandmark(center, entity)
    }

    // At-a-glance tile markers (harvestable / water / entrance) for visible cells.
    for (const cell of context.terrainCells) {
      if (!this.cellPresentationPolicy.cellVisible(cell)) continue
      const markers = mapMarkersForCell(cell)
      if (markers.length > 0) this.drawCellMarkers(centerFor(cell.coord, context), markers)
    }
  }

  private drawCellMarkers(center: Vector2, markers: readonly AddMapMarker[]): void {
    const glyphs: Record<AddMapMarker["kind"], { glyph: string; color: number }> = {
      harvestable: { glyph: "❀", color: 0x2f8f4a },
      water: { glyph: "≈", color: 0x3a78c0 },
      entrance: { glyph: "", color: 0xa05f2d },
    }
    markers.forEach((marker, index) => {
      const style = glyphs[marker.kind]
      const isEntrance = marker.kind === "entrance"
      const container = this.add.container(center.x + 20, center.y - 20 + index * 15)
      const shadow = this.add.ellipse(0, 8, isEntrance ? 22 : 24, 8, 0x17140f, 0.18)
      const badge = this.add.ellipse(0, 0, isEntrance ? 25 : 24, isEntrance ? 22 : 20, 0xfffae2, 0.88)
      badge.setStrokeStyle(1.2, style.color, 0.58)
      if (isEntrance) {
        const roof = this.add.triangle(0, -5, -7, 4, 0, -6, 7, 4, style.color, 0.92)
        const doorway = this.add.rectangle(0, 2, 11, 11, 0x482715, 0.92)
        const opening = this.add.ellipse(0, 4, 6, 8, 0x17100d, 0.86)
        const threshold = this.add.line(0, 8, -5, 0, 5, 0, 0xf4c477, 0.48)
        container.add([shadow, badge, roof, doorway, opening, threshold])
        container.setDepth(31)
        this.actionMarkerCount += 1
        this.landmarkObjects.push(container)
        this.mobileEdgeCullObjects.push(container)
        return
      }
      const glyph = this.add.text(0, -1, style.glyph, {
        color: `#${style.color.toString(16).padStart(6, "0")}`,
        fontFamily: "Aptos, Segoe UI, sans-serif",
        fontSize: "12px",
        fontStyle: "800",
        stroke: "rgba(255, 255, 255, 0.42)",
        strokeThickness: 1,
      })
      glyph.setOrigin(0.5, 0.5)
      setCrispText(glyph)
      container.add([shadow, badge, glyph])
      container.setDepth(31)
      this.actionMarkerCount += 1
      this.landmarkObjects.push(container)
      this.mobileEdgeCullObjects.push(container)
    })
  }

  private drawCreature(center: Vector2, entity: GameEntity, cellSize: number): void {
    const visualFootprint = entity.visualFootprint
    const visualWidth =
      visualFootprint?.unit === "world"
        ? visualFootprint.width
        : (visualFootprint?.width ?? 1) * cellSize
    const visualHeight =
      visualFootprint?.unit === "world"
        ? visualFootprint.height
        : (visualFootprint?.height ?? 1) * cellSize
    const renderScale = entity.renderScale ?? 1
    const bodyRx = Math.max(3, visualWidth * renderScale * 0.42)
    const bodyRy = Math.max(2.4, visualHeight * renderScale * 0.32)
    const shadow = this.add.ellipse(center.x, center.y + bodyRy * 0.8, bodyRx * 1.6, bodyRy * 0.7, 0x14110c, 0.22)
    const body = this.add.ellipse(center.x, center.y, bodyRx * 2, bodyRy * 2, 0x5a5048, 0.95)
    body.setStrokeStyle(1, 0x2c261f, 0.85)
    const belly = this.add.ellipse(center.x, center.y + bodyRy * 0.35, bodyRx * 1.05, bodyRy * 0.8, 0x8a7d6c, 0.55)
    const eye = this.add.ellipse(center.x + bodyRx * 0.5, center.y - bodyRy * 0.2, 1.5, 1.5, 0x0f0b07, 0.9)
    ;[shadow, body, belly, eye].forEach((object, index) => object.setDepth(22 + index))
    this.landmarkObjects.push(shadow, body, belly, eye)
  }

  // Build/update persistent door panels from the map's door cells and start a
  // swing transition whenever a door's open state changed since the last render.
  private syncDoors(context: RenderContext): void {
    const cellSize = squareCellSize(context)
    const seen = new Set<string>()
    for (const cell of context.terrainCells) {
      if (cell.metadata?.door !== true || cell.coord.kind !== "square") continue
      const key = addMapCoordKey(cell.coord)
      seen.add(key)
      const open = cell.metadata?.doorOpen === true
      const center = centerFor(cell.coord, context)
      const geo = this.doorGeometry(cell.coord, center, cellSize, context)
      const existing = this.doorVisuals.get(key)
      if (!existing) {
        const panel = this.add.rectangle(geo.hingeX, geo.hingeY, geo.length, geo.thickness, 0x6e4a2c)
        panel.setOrigin(0, 0.5)
        panel.setStrokeStyle(2, 0x33230f, 0.9)
        panel.setDepth(22)
        panel.setRotation(open ? geo.openRot : geo.closedRot)
        this.doorVisuals.set(key, {
          panel,
          coord: cell.coord,
          closedRot: geo.closedRot,
          openRot: geo.openRot,
          open,
        })
      } else {
        existing.panel.setPosition(geo.hingeX, geo.hingeY)
        existing.panel.setSize(geo.length, geo.thickness)
        existing.closedRot = geo.closedRot
        existing.openRot = geo.openRot
        if (existing.open !== open) {
          // Swing from wherever the panel currently is to the new target angle.
          const current = this.transitions.value(
            `door:${key}`,
            this.time.now,
            existing.open ? existing.openRot : existing.closedRot,
          )
          this.transitions.begin(`door:${key}`, {
            from: current,
            to: open ? geo.openRot : geo.closedRot,
            durationMs: DOOR_SWING_MS,
            startedAt: this.time.now,
            easing: smoothStep,
          })
          existing.open = open
        }
      }
    }
    for (const [key, visual] of this.doorVisuals) {
      if (!seen.has(key)) {
        visual.panel.destroy()
        this.doorVisuals.delete(key)
        this.transitions.delete(`door:${key}`)
      }
    }
    this.tickDoors()
  }

  // Per-frame: ease each door toward its target angle and hide doors in fog.
  private tickDoors(): void {
    const now = this.time.now
    for (const [key, visual] of this.doorVisuals) {
      const targetRot = visual.open ? visual.openRot : visual.closedRot
      visual.panel.setRotation(this.transitions.value(`door:${key}`, now, targetRot))
      const cell = this.context?.terrainByCoord.get(addMapCoordKey(visual.coord))
      visual.panel.setVisible(cell ? presentationVisibilityStateForCell(cell) !== "hidden" : true)
    }
    this.transitions.prune(now)
  }

  // A door slab spans its doorway when closed and swings a quarter-turn open.
  private doorGeometry(
    coord: SquareCoord,
    center: Vector2,
    cellSize: number,
    context: RenderContext,
  ): { hingeX: number; hingeY: number; length: number; thickness: number; closedRot: number; openRot: number } {
    const isWall = (dx: number, dy: number): boolean => {
      const neighbor = context.terrainByCoord.get(
        addMapCoordKey({ kind: "square", x: coord.x + dx, y: coord.y + dy }),
      )
      return !neighbor || neighbor.blocked === true
    }
    const length = cellSize * 0.92
    const thickness = Math.max(3, cellSize * 0.16)
    const half = cellSize / 2
    // Walls north & south → passage runs E-W → slab spans N-S, hinged at the north jamb.
    if (isWall(0, -1) && isWall(0, 1)) {
      return { hingeX: center.x, hingeY: center.y - half, length, thickness, closedRot: Math.PI / 2, openRot: 0 }
    }
    // Otherwise the passage runs N-S → slab spans E-W, hinged at the west jamb.
    return { hingeX: center.x - half, hingeY: center.y, length, thickness, closedRot: 0, openRot: -Math.PI / 2 }
  }

  private syncMainCharacter(context: RenderContext, forceReset: boolean): void {
    const currentValid =
      this.characterCoord?.kind === context.topologyKind &&
      context.terrainByCoord.has(addMapCoordKey(this.characterCoord))
    if (forceReset || !currentValid) {
      this.characterCoord = initialCharacterCoord(context)
      this.characterMoveStatus = {
        direction: null,
        accepted: null,
        blockedReason: null,
      }
      const entryFacing = entryFacingForContext(context)
      if (entryFacing) this.characterFacing = entryFacing
    }

    if (!this.characterCoord) return
    const center = centerFor(this.characterCoord, context)
    if (!this.characterPosition || forceReset) {
      this.characterPosition = center
    }
    this.characterTarget = center
    this.updateMainCharacterObjects()
  }

  private updateMainCharacter(delta: number): void {
    if (!this.context) return
    this.syncMainCharacter(this.context, false)
    if (!this.characterPosition || !this.characterTarget) return

    if (this.characterTravel) {
      const rawProgress = clamp(
        (this.time.now - this.characterTravel.startedAtMs) / this.characterTravel.durationMs,
        0,
        1,
      )
      const eased = smoothStep(rawProgress)
      this.characterPosition = {
        x: Phaser.Math.Linear(
          this.characterTravel.fromPosition.x,
          this.characterTravel.toPosition.x,
          eased,
        ),
        y: Phaser.Math.Linear(
          this.characterTravel.fromPosition.y,
          this.characterTravel.toPosition.y,
          eased,
        ),
      }
      if (rawProgress >= 1) {
        this.characterPosition = this.characterTravel.toPosition
        this.characterTravel = null
      }
      this.updateMainCharacterObjects()
      return
    }

    const distance = distanceBetween(this.characterPosition, this.characterTarget)
    if (distance <= 0.25) {
      this.characterPosition = this.characterTarget
      this.updateMainCharacterObjects()
      return
    }

    const travel = Math.min(1, delta / 145)
    this.characterPosition = {
      x: Phaser.Math.Linear(this.characterPosition.x, this.characterTarget.x, travel),
      y: Phaser.Math.Linear(this.characterPosition.y, this.characterTarget.y, travel),
    }
    this.updateMainCharacterObjects()
  }

  private updateMainCharacterObjects(): void {
    if (!this.characterRenderer || !this.characterPosition) return
    this.characterRenderer.updateEntities([this.mainCharacterRenderState()], {
      frameCount: this.frameCount,
    })
  }

  private mainCharacterRenderState(): WorldEntityRenderState {
    return {
      id: "add-main-character",
      label: "Hero",
      labelVisible: this.shouldShowHeroNameplate(),
      position: this.characterPosition ?? { x: 0, y: 0 },
      facing: this.characterFacing,
      moving: this.characterIsMoving(),
      visible: true,
      depthBase: 44,
      appearance: {
        bodyFill: 0x2f7d68,
        bodyStroke: 0x145244,
        headFill: 0xf1d0a5,
        accentFill: 0xe6a84e,
        shadowFill: 0x101815,
        labelColor: "#16221e",
        labelBackgroundColor: "rgba(255, 250, 226, 0.9)",
        labelStroke: "rgba(255, 255, 255, 0.54)",
        bodyWidth: 20,
        bodyHeight: 24,
        headSize: 13,
        shadowWidth: 31,
        shadowHeight: 10,
      },
    }
  }

  private shouldShowHeroNameplate(): boolean {
    return this.context?.topologyKind === "square"
  }

  private characterIsMoving(): boolean {
    if (this.characterTravel) return true
    if (!this.characterPosition || !this.characterTarget) return false
    return distanceBetween(this.characterPosition, this.characterTarget) > 0.35
  }

  private drawFlora(center: Vector2, entity: GameEntity): void {
    const scrub = (entity.tags ?? []).includes("scrub")
    const shadow = this.add.ellipse(center.x, center.y + 8, 13, 5, 0x1d2118, 0.14)
    const trunk = this.add.rectangle(center.x, center.y + 4, 3, 10, scrub ? 0x8f5c35 : 0x6b573f, 0.72)
    const crown = this.add.ellipse(center.x, center.y - 1, scrub ? 11 : 13, scrub ? 7 : 11, scrub ? 0xa97745 : 0x5f946f, 0.78)
    const highlight = this.add.ellipse(center.x - 3, center.y - 4, 4, 3, 0xe2d7a3, 0.20)
    ;[shadow, trunk, crown, highlight].forEach((object, index) => object.setDepth(18 + index))
    this.landmarkObjects.push(shadow, trunk, crown, highlight)
  }

  private drawLandmark(center: Vector2, entity: GameEntity): void {
    const sourceId = String(entity.metadata?.sourceId ?? "")
    const isCave = sourceId.includes("cave")
    const isInteriorFeature = (entity.tags ?? []).includes("interior")
    const isBase = sourceId.includes("base") || sourceId.includes("crystal_circle")
    const isCrystal = sourceId.includes("crystal")
    const isDoor = sourceId.includes("door") || sourceId.includes("gate") || sourceId.includes("exit")
    const shouldLabel = isCave || isBase || isInteriorFeature
    const radius = isCave ? 16 : isBase ? 15 : 11
    const fill = isCave ? 0x7a3d25 : isBase ? 0x2f7d68 : 0xa05f2d
    const stroke = isCave ? 0x2b170f : isBase ? 0x114538 : 0x5f371d
    if (isCave || isBase || isInteriorFeature || isDoor || isCrystal) {
      this.drawLandmarkBeacon(center, isCave ? 0xe1a46a : isBase || isCrystal ? 0x7de5cb : 0xf0b95d, radius)
    }
    const shadow = this.add.ellipse(center.x, center.y + 14, radius * 1.75, 8, 0x1f1b14, 0.24)
    shadow.setDepth(24)
    const markerPoints = isCave
      ? [0, -radius, radius, 0, 0, radius, -radius, 0]
      : isDoor
        ? [-radius * 0.72, radius, -radius * 0.72, -radius * 0.36, 0, -radius, radius * 0.72, -radius * 0.36, radius * 0.72, radius]
        : [0, -radius, radius * 0.9, -3, radius * 0.5, radius, -radius * 0.5, radius, -radius * 0.9, -3]
    const marker = this.add.polygon(center.x, center.y, markerPoints, fill, isCave ? 1 : 0.96)
    marker.setStrokeStyle(isCave ? 2.8 : 2, stroke, isCave ? 0.96 : 0.86)
    marker.setDepth(25)
    this.landmarkObjects.push(shadow, marker)

    if (isBase || isCrystal) {
      const glow = this.add.ellipse(center.x, center.y + 1, radius * 1.65, radius * 1.2, 0x84e4d3, isBase ? 0.15 : 0.22)
      const core = this.add.polygon(center.x, center.y - 3, [0, -9, 6, 0, 0, 11, -6, 0], isBase ? 0x7de5cb : 0x88d8ff, 0.94)
      glow.setDepth(23)
      core.setDepth(26)
      core.setStrokeStyle(1.4, 0xffffff, 0.58)
      this.landmarkObjects.push(glow, core)
    } else if (isCave) {
      this.drawCaveMouthSilhouette(center, radius)
    } else if (isDoor) {
      const seam = this.add.line(center.x, center.y + 2, 0, -8, 0, 10, 0x3b2b21, 0.7)
      seam.setDepth(27)
      this.landmarkObjects.push(seam)
    }

    if (!shouldLabel) return
    const labelText = isCave
      ? "Survivor Cave"
      : isInteriorFeature
        ? entity.label ?? "Interior"
        : isBase
          ? "Studio"
          : entity.label ?? "Landmark"
    const labelSharesCharacterCell =
      isCave && this.characterCoord && entity.coord
        ? sameCoord(this.characterCoord, entity.coord)
        : false
    const labelOffsetY = labelSharesCharacterCell
      ? 48
      : isCave
        ? 42
        : 28
    const label = this.add.text(center.x, center.y + labelOffsetY, labelText, {
      color: "#1f2a25",
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: isCave ? "11px" : "12px",
      fontStyle: "800",
      align: "center",
      backgroundColor: isCave ? "rgba(255, 250, 226, 0.80)" : "rgba(255, 250, 226, 0.86)",
      stroke: "rgba(255, 255, 255, 0.42)",
      strokeThickness: 2,
      padding: { x: isCave ? 5 : 6, y: isCave ? 2 : 3 },
    })
    setCrispText(label)
    label.setShadow(0, 1, "rgba(255, 255, 255, 0.65)", 0, true, true)
    label.setOrigin(0.5, 0.5)
    label.setDepth(26)
    this.landmarkObjects.push(label)
    this.mobileEdgeCullObjects.push(label)
  }

  private drawLandmarkBeacon(center: Vector2, color: number, radius: number): void {
    const pulse = (Math.sin(this.frameCount / 22 + center.x * 0.01) + 1) / 2
    const outer = this.add.ellipse(
      center.x,
      center.y + 2,
      radius * (3.0 + pulse * 0.35),
      radius * (2.05 + pulse * 0.24),
      color,
      0.10 + pulse * 0.04,
    )
    const ring = this.add.ellipse(
      center.x,
      center.y + 2,
      radius * (2.25 + pulse * 0.18),
      radius * (1.54 + pulse * 0.12),
      color,
      0.0,
    )
    ring.setStrokeStyle(1.8, color, 0.42 + pulse * 0.14)
    outer.setDepth(22)
    ring.setDepth(22.2)
    this.landmarkBeaconCount += 1
    this.landmarkObjects.push(outer, ring)
  }

  private updateMobileEdgeCullObjects(): void {
    const isMobile = this.scale.width < 640 || this.scale.height < 520
    const camera = this.cameras.main
    let culled = 0

    for (const object of this.mobileEdgeCullObjects) {
      if (typeof object.setVisible !== "function" || typeof object.setAlpha !== "function") {
        continue
      }

      if (!isMobile) {
        object.setVisible(true)
        object.setAlpha(1)
        continue
      }

      if (typeof object.x !== "number" || typeof object.y !== "number") {
        object.setVisible(true)
        object.setAlpha(1)
        continue
      }

      const viewport = viewportPointFor(
        { x: object.x, y: object.y },
        camera,
        this.scale.width,
        this.scale.height,
      )
      const halfScreenWidth = ((object.displayWidth ?? 0) * camera.zoom) / 2
      const edgeMargin = clamp(Math.max(34, halfScreenWidth + 8), 34, 88)
      const clippedHorizontally =
        viewport.x < edgeMargin || viewport.x > this.scale.width - edgeMargin
      const clippedByTopbar = viewport.y < 44
      const clippedByMobileHud = viewport.y > this.scale.height - 350

      if (clippedHorizontally || clippedByTopbar || clippedByMobileHud) {
        object.setVisible(false)
        object.setAlpha(0)
        culled += 1
      } else {
        object.setVisible(true)
        object.setAlpha(1)
      }
    }

    this.mobileEdgeCulledLabelCount = culled
  }

  private drawCaveMouthSilhouette(center: Vector2, radius: number): void {
    const backShadow = this.add.ellipse(center.x, center.y + 6, radius * 1.55, radius * 0.86, 0x17120f, 0.42)
    const arch = this.add.polygon(
      center.x,
      center.y + 1,
      [
        -radius * 0.82,
        radius * 0.36,
        -radius * 0.62,
        -radius * 0.22,
        -radius * 0.26,
        -radius * 0.58,
        radius * 0.24,
        -radius * 0.58,
        radius * 0.62,
        -radius * 0.20,
        radius * 0.82,
        radius * 0.36,
      ],
      0x201512,
      0.88,
    )
    const mouth = this.add.ellipse(center.x, center.y + 4, radius * 1.04, radius * 0.60, 0x0b0d0c, 0.86)
    const innerFade = this.add.ellipse(center.x, center.y + 5, radius * 0.68, radius * 0.34, 0x000000, 0.54)
    const rim = this.add.arc(center.x, center.y - 1, radius * 0.86, 204, 336, false, 0xe1a46a, 0.34)
    const leftStone = this.add.ellipse(center.x - radius * 0.54, center.y + 5, radius * 0.28, radius * 0.44, 0x5b3524, 0.72)
    const rightStone = this.add.ellipse(center.x + radius * 0.52, center.y + 6, radius * 0.24, radius * 0.38, 0x6a3e29, 0.66)
    const threshold = this.add.line(center.x, center.y + radius * 0.46, -radius * 0.42, 0, radius * 0.42, 0, 0xf4c477, 0.22)
    ;[backShadow, arch, mouth, innerFade, rim, leftStone, rightStone, threshold].forEach(
      (object, index) => object.setDepth(25.5 + index * 0.08),
    )
    rim.setStrokeStyle(2.2, 0xe1a46a, 0.42)
    this.landmarkObjects.push(backShadow, arch, mouth, innerFade, rim, leftStone, rightStone, threshold)
  }

  private drawAmbience(context: RenderContext): void {
    const graphics = this.ambienceGraphics
    if (!graphics) return
    graphics.clear()
    if (context.terrainCells.length === 0) return

    const phase = this.frameCount / 42
    for (const cell of context.terrainCells) {
      if (!this.cellPresentationPolicy.cellVisible(cell)) continue
      const style = this.cellPresentationPolicy.cellStyle(cell)
      if (style.activity === "inactive" || style.activity === "blocked") continue
      const center = centerFor(cell.coord, context)
      const seed = hashCoord(cell.coord)
      const drift = Math.sin(phase + seed * 0.07)
      const alpha = 0.08 + (seed % 7) * 0.012
      graphics.fillStyle(0xf6e8ad, alpha)
      graphics.fillCircle(center.x + ((seed % 9) - 4) + drift * 1.5, center.y - 10 + ((seed % 5) - 2), 1.2)
    }

    if (context.topologyKind === "hex") {
      graphics.lineStyle(1, 0x315f63, 0.05)
      for (let offset = -120; offset < this.scale.width + 180; offset += 44) {
        graphics.lineBetween(context.origin.x + offset, context.origin.y - 240, context.origin.x + offset + 180, context.origin.y + this.scale.height + 120)
      }
    }
  }

  private drawFog(context: RenderContext): void {
    this.fogRenderer?.render(context.map, {
      origin: context.origin,
      depth: 12,
      presentationPolicy: this.cellPresentationPolicy,
      layerKinds: ["terrain"],
      nowMs: this.time.now,
      frameCount: this.frameCount,
      transitionDurationMs: REVEAL_TRANSITION_MS,
      travelRevealTrailMs: TRAVEL_REVEAL_TRAIL_MS,
      travelRevealPreview: this.travelRevealPreviewForContext(context),
      style: "soft",
    })
  }

  private travelRevealPreviewForContext(context: RenderContext): TravelRevealPreview {
    const travel = this.characterTravel
    const characterCenter = this.characterPosition
    if (!travel || !characterCenter || travel.toCoord.kind !== context.topologyKind) {
      return inactiveTravelRevealPreview()
    }

    const baseRadius = visualCellRadius(context)
    const haloRadius = baseRadius * TRAVEL_REVEAL_HALO_RADIUS_MULTIPLIER
    const haloFeather = baseRadius * TRAVEL_REVEAL_HALO_FEATHER_MULTIPLIER
    const cells = new Set<string>()
    for (const cell of context.terrainCells) {
      const cellCenter = centerFor(cell.coord, context)
      const distance = distanceBetween(characterCenter, cellCenter)
      if (distance <= haloRadius + haloFeather) cells.add(addMapCoordKey(cell.coord))
    }

    return {
      active: true,
      progress: this.currentTravelProgress(),
      cells,
      destinationCell: displayAddCell(travel.toCoord),
      center: characterCenter,
      radius: haloRadius,
      feather: haloFeather,
    }
  }

  private currentTravelProgress(): number {
    if (!this.characterTravel) return 0
    return clamp(
      (this.time.now - this.characterTravel.startedAtMs) / this.characterTravel.durationMs,
      0,
      1,
    )
  }

  private drawOverlay(): void {
    const context = this.context
    if (!context) return
    this.drawMapCommunicationOverlay(context)
    this.cellInteractionRenderer?.render(context.map, {
      origin: context.origin,
      depth: 30,
      frameCount: this.frameCount,
      presentationPolicy: this.cellPresentationPolicy,
      zones: this.interactionZoneRenderStates(context),
      affordances: this.interactionAffordanceRenderStates(context),
      selections: this.interactionSelectionRenderStates(),
    })
    this.drawTransitionOverlay()
    this.drawTileTooltip()
    this.drawMinimap()
  }

  private drawMapCommunicationOverlay(context: RenderContext): void {
    const graphics = this.mapCommunicationGraphics
    if (!graphics) return
    this.clearMapCommunicationOverlay()

    const reachableCells = this.reachableCellsForContext(context)
    const frontierCells = this.frontierHintCellsForContext(context)
    for (const cell of frontierCells) {
      this.drawFrontierHint(graphics, centerFor(cell.coord, context), context)
    }

    const previewCoord = this.activeAdjacentPreviewCoord(context, reachableCells)
    for (const cell of reachableCells) {
      this.drawReachableCellGlow(
        graphics,
        centerFor(cell.coord, context),
        context,
        Boolean(previewCoord && sameCoord(previewCoord, cell.coord)),
      )
    }

    const pathTimePreviewVisible = Boolean(previewCoord)
    if (previewCoord && this.characterPosition) {
      this.drawPathTimePreview(graphics, this.characterPosition, centerFor(previewCoord, context))
    }

    this.mapPrimaryAffordanceInfo = {
      layer: "reachable_path_frontier_landmark",
      reachableCellCount: reachableCells.length,
      frontierHintCount: frontierCells.length,
      pathTimePreviewVisible,
      actionMarkerCount: this.actionMarkerCount,
      landmarkBeaconCount: this.landmarkBeaconCount,
    }
  }

  private clearMapCommunicationOverlay(): void {
    this.mapCommunicationGraphics?.clear()
    this.mapCommunicationObjects.forEach((object) => object.destroy())
    this.mapCommunicationObjects = []
    this.mapPrimaryAffordanceInfo = {
      ...this.mapPrimaryAffordanceInfo,
      reachableCellCount: 0,
      frontierHintCount: 0,
      pathTimePreviewVisible: false,
    }
  }

  private reachableCellsForContext(context: RenderContext): readonly GameCellPlacement[] {
    if (!this.characterCoord || this.characterCoord.kind !== context.topologyKind) return []
    const cells: GameCellPlacement[] = []
    const seen = new Set<string>()
    for (const direction of MAP_DECISION_DIRECTIONS) {
      const coord = this.navigationPolicy.nextCoord(
        this.characterCoord,
        { direction },
        context.map.topology,
      )
      if (!coord) continue
      const key = addMapCoordKey(coord)
      if (seen.has(key)) continue
      seen.add(key)
      const cell = context.terrainByCoord.get(key)
      if (!cell || !this.navigationPolicy.canEnterCell(cell)) continue
      cells.push(cell)
    }
    return cells
  }

  private frontierHintCellsForContext(context: RenderContext): readonly GameCellPlacement[] {
    const frontier = new Map<string, GameCellPlacement>()
    const addHiddenNeighbors = (coord: CellCoord) => {
      if (coord.kind !== context.topologyKind) return
      for (const direction of MAP_DECISION_DIRECTIONS) {
        const next = this.navigationPolicy.nextCoord(coord, { direction }, context.map.topology)
        if (!next) continue
        const cell = context.terrainByCoord.get(addMapCoordKey(next))
        if (!cell || presentationVisibilityStateForCell(cell) !== "hidden") continue
        frontier.set(addMapCoordKey(cell.coord), cell)
      }
    }

    if (this.characterCoord) addHiddenNeighbors(this.characterCoord)
    for (const cell of context.terrainCells) {
      if (!this.cellPresentationPolicy.cellVisible(cell)) continue
      addHiddenNeighbors(cell.coord)
    }

    return [...frontier.values()].slice(0, 48)
  }

  private activeAdjacentPreviewCoord(
    context: RenderContext,
    reachableCells: readonly GameCellPlacement[],
  ): CellCoord | null {
    const activeCoord = this.hoveredCoord ?? this.selectedCoord
    if (!activeCoord) return null
    const activeKey = addMapCoordKey(activeCoord)
    const activeCell = reachableCells.find((cell) => addMapCoordKey(cell.coord) === activeKey)
    return activeCell ? activeCell.coord : null
  }

  private drawFrontierHint(
    graphics: Phaser.GameObjects.Graphics,
    center: Vector2,
    context: RenderContext,
  ): void {
    const pulse = (Math.sin(this.frameCount / 24 + center.x * 0.017 + center.y * 0.011) + 1) / 2
    if (context.topologyKind === "hex" && context.map.topology.kind === "hex") {
      drawHexPath(graphics, center, context.map.topology.radius * (0.82 + pulse * 0.04))
      graphics.fillStyle(0x111817, 0.09 + pulse * 0.035)
      graphics.fillPath()
      drawHexPath(graphics, center, context.map.topology.radius * (0.88 + pulse * 0.05))
      graphics.lineStyle(1.1, 0xd9e5bf, 0.12 + pulse * 0.10)
      graphics.strokePath()
      return
    }

    const size = squareCellSize(context)
    graphics.fillStyle(0x111817, 0.10 + pulse * 0.03)
    graphics.fillRoundedRect(center.x - size * 0.38, center.y - size * 0.38, size * 0.76, size * 0.76, 6)
    graphics.lineStyle(1.1, 0xd9e5bf, 0.12 + pulse * 0.10)
    graphics.strokeRoundedRect(center.x - size * 0.40, center.y - size * 0.40, size * 0.80, size * 0.80, 6)
  }

  private drawReachableCellGlow(
    graphics: Phaser.GameObjects.Graphics,
    center: Vector2,
    context: RenderContext,
    active: boolean,
  ): void {
    const pulse = (Math.sin(this.frameCount / 18 + center.x * 0.013 + center.y * 0.019) + 1) / 2
    const fillAlpha = active ? 0.12 + pulse * 0.04 : 0.045 + pulse * 0.018
    const lineAlpha = active ? 0.62 + pulse * 0.18 : 0.18 + pulse * 0.12
    const color = active ? 0xf0b95d : 0x78d99b

    if (context.topologyKind === "hex" && context.map.topology.kind === "hex") {
      drawHexPath(graphics, center, context.map.topology.radius - 3)
      graphics.fillStyle(color, fillAlpha)
      graphics.fillPath()
      drawHexPath(graphics, center, context.map.topology.radius + (active ? 3.2 : 1.8))
      graphics.lineStyle(active ? 2.8 : 1.25, color, lineAlpha)
      graphics.strokePath()
      return
    }

    const size = squareCellSize(context)
    const inset = active ? 2 : 5
    graphics.fillStyle(color, fillAlpha)
    graphics.fillRoundedRect(center.x - size / 2 + inset, center.y - size / 2 + inset, size - inset * 2, size - inset * 2, 7)
    graphics.lineStyle(active ? 2.4 : 1.1, color, lineAlpha)
    graphics.strokeRoundedRect(center.x - size / 2 + inset, center.y - size / 2 + inset, size - inset * 2, size - inset * 2, 7)
  }

  private drawPathTimePreview(
    graphics: Phaser.GameObjects.Graphics,
    from: Vector2,
    to: Vector2,
  ): void {
    const angle = Math.atan2(to.y - from.y, to.x - from.x)
    const mid = {
      x: Phaser.Math.Linear(from.x, to.x, 0.56),
      y: Phaser.Math.Linear(from.y, to.y, 0.56),
    }
    const pulse = (Math.sin(this.frameCount / 10) + 1) / 2

    graphics.lineStyle(9, 0x101815, 0.28)
    graphics.lineBetween(from.x, from.y, to.x, to.y)
    graphics.lineStyle(5, 0xfff1c6, 0.24 + pulse * 0.08)
    graphics.lineBetween(from.x, from.y, to.x, to.y)
    graphics.lineStyle(2.8, 0xf0b95d, 0.92)
    graphics.lineBetween(from.x, from.y, to.x, to.y)
    graphics.fillStyle(0xf0b95d, 0.12 + pulse * 0.08)
    graphics.fillEllipse(mid.x, mid.y, 24 + pulse * 6, 13 + pulse * 4)
    graphics.fillStyle(0xfff1c6, 0.92)
    graphics.fillCircle(to.x, to.y, 5.6)
    graphics.lineStyle(1.8, 0x9b5637, 0.78)
    graphics.strokeCircle(to.x, to.y, 8.6)
    graphics.fillStyle(0xf0b95d, 0.94)
    graphics.fillTriangle(
      to.x + Math.cos(angle) * 13,
      to.y + Math.sin(angle) * 13,
      to.x + Math.cos(angle + 2.42) * 8,
      to.y + Math.sin(angle + 2.42) * 8,
      to.x + Math.cos(angle - 2.42) * 8,
      to.y + Math.sin(angle - 2.42) * 8,
    )
  }

  /** Compute the cartographic scale bar: a "nice" 1/2/5 distance and its on-screen
   * pixel width at the current zoom, derived from the map's metersPerCell. Rendered
   * as a DOM overlay by the host (robust against canvas occlusion). */
  private computeScaleBar(): { readonly label: string; readonly widthPx: number } | null {
    const context = this.context
    if (!context) return null
    const metersRaw = context.map.metadata?.metersPerCell
    const metersPerCell = typeof metersRaw === "number" ? metersRaw : null
    if (!metersPerCell || metersPerCell <= 0) return null
    // World pixels spanned by one cell step, then to screen pixels via zoom.
    const a: CellCoord =
      context.topologyKind === "hex" ? { kind: "hex", q: 0, r: 0 } : { kind: "square", x: 0, y: 0 }
    const b: CellCoord =
      context.topologyKind === "hex" ? { kind: "hex", q: 1, r: 0 } : { kind: "square", x: 1, y: 0 }
    const worldStep = distanceBetween(centerFor(a, context), centerFor(b, context))
    const pxPerMeter = (worldStep * this.cameras.main.zoom) / metersPerCell
    if (!Number.isFinite(pxPerMeter) || pxPerMeter <= 0) return null
    const meters = niceScaleMeters(120 / pxPerMeter)
    return { label: formatScaleDistance(meters), widthPx: Math.round(meters * pxPerMeter) }
  }

  /** Strategic overview in the top-right: discovered cells as dots + Base/Cave/
   * Hero markers, projecting the same world coords into a small screen-space box.
   * Overworld only (dungeons are small + fully framed). */
  private drawMinimap(): void {
    const g = this.minimapGraphics
    const context = this.context
    if (!g) return
    g.clear()
    if (!context || context.topologyKind !== "hex") return
    const cells = context.terrainCells.filter((cell) =>
      this.cellPresentationPolicy.cellVisible(cell),
    )
    if (cells.length === 0) return

    const points = cells.map((cell) => ({ cell, world: centerFor(cell.coord, context) }))
    const xs = points.map((entry) => entry.world.x)
    const ys = points.map((entry) => entry.world.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const size = 156
    const inset = 8
    const pad = 12
    const boxX = this.scale.width - size - pad
    const boxY = pad
    const worldW = Math.max(1, maxX - minX)
    const worldH = Math.max(1, maxY - minY)
    const scale = Math.min((size - inset * 2) / worldW, (size - inset * 2) / worldH)
    const offX = boxX + inset + ((size - inset * 2) - worldW * scale) / 2
    const offY = boxY + inset + ((size - inset * 2) - worldH * scale) / 2
    const project = (world: Vector2) => ({
      x: offX + (world.x - minX) * scale,
      y: offY + (world.y - minY) * scale,
    })

    g.fillStyle(0x12211d, 0.74)
    g.fillRoundedRect(boxX, boxY, size, size, 8)
    g.lineStyle(1, 0x3a4b44, 0.85)
    g.strokeRoundedRect(boxX, boxY, size, size, 8)

    for (const entry of points) {
      const point = project(entry.world)
      g.fillStyle(addCellVisualStyle(entry.cell).fill, 0.9)
      g.fillCircle(point.x, point.y, 1.7)
    }
    const marker = (coord: CellCoord | null | undefined, color: number, radius: number) => {
      if (!coord) return
      const point = project(centerFor(coord, context))
      g.fillStyle(color, 1)
      g.fillCircle(point.x, point.y, radius)
    }
    marker(context.baseCoord, 0x2f7d68, 3)
    marker(context.survivorCaveCoord, 0x8a4c2f, 3)
    marker(this.characterCoord, 0xffe066, 3.2)
  }

  /** Tile facts stay in the side panel; the map keeps only silhouettes and state. */
  private drawTileTooltip(): void {
    const tip = this.tooltipText
    if (!tip) return
    tip.setVisible(false)
  }

  private drawTransitionOverlay(): void {
    const graphics = this.transitionGraphics
    if (!graphics) return
    graphics.clear()
    if (this.transitionState === "idle") return

    const remaining = 1 - this.transitionProgress
    graphics.fillStyle(0x0f1b18, 0.34 * remaining)
    graphics.fillRect(0, 0, this.scale.width, this.scale.height)
    graphics.fillStyle(0xf4dd99, 0.16 * remaining)
    graphics.fillRect(0, 0, this.scale.width, Math.max(4, this.scale.height * 0.08 * remaining))
  }

  private interactionSelectionRenderStates(): readonly WorldCellInteractionSelection[] {
    const selections: WorldCellInteractionSelection[] = []
    if (this.hoveredCoord && !sameCoord(this.hoveredCoord, this.selectedCoord)) {
      selections.push({
        coord: this.hoveredCoord,
        kind: "hover",
        color: 0xffffff,
        alpha: 0.72,
        lineWidth: 2.2,
      })
    }
    if (this.selectedCoord) {
      selections.push({
        coord: this.selectedCoord,
        kind: "selection",
        color: 0xffd26a,
        alpha: 1,
        lineWidth: 4,
      })
    }
    return selections
  }

  private interactionZoneRenderStates(
    context: RenderContext,
  ): readonly WorldCellInteractionZone[] {
    const zones: WorldCellInteractionZone[] = [...context.bubbleEdgeCoords]
      .map((key) => context.terrainByCoord.get(key))
      .filter((cell): cell is GameCellPlacement => Boolean(cell))
      .map((cell) => ({
        id: `bubble-edge:${addMapCoordKey(cell.coord)}`,
        coord: cell.coord,
        kind: "boundary",
        color: 0x63dcff,
        alpha: 0.20,
      }))
    const reachable = this.reachableCellsForContext(context)
    const activePreviewCoord = this.activeAdjacentPreviewCoord(context, reachable)
    for (const cell of reachable) {
      zones.push({
        id: `reachable:${addMapCoordKey(cell.coord)}`,
        coord: cell.coord,
        kind: "area",
        color: activePreviewCoord && sameCoord(activePreviewCoord, cell.coord) ? 0xf0b95d : 0x78d99b,
        alpha: activePreviewCoord && sameCoord(activePreviewCoord, cell.coord) ? 0.34 : 0.18,
      })
    }
    return zones
  }

  private interactionAffordanceRenderStates(
    context: RenderContext,
  ): readonly WorldCellInteractionAffordance[] {
    const affordances: WorldCellInteractionAffordance[] = []
    for (const cell of context.terrainCells) {
      if (!hasDungeonLinks(cell)) continue
      const links = dungeonLinksForCoord(cell.coord, context).map(dungeonLinkInfo)
      affordances.push({
        id: `portal:${addMapCoordKey(cell.coord)}`,
        coord: cell.coord,
        kind: "portal",
        label: links.map((link) => link.label).join(", ") || "Linked area",
        actionLabel: "Enter",
        enabled: links.some((link) => link.enabled),
        emphasis: "subtle",
      })
    }

    const primaryCoord = this.selectedCoord ?? this.hoveredCoord
    if (!primaryCoord) return affordances
    const primaryCell = context.terrainByCoord.get(addMapCoordKey(primaryCoord))
    const primaryInteraction = this.worldInteractionPolicy.interactionForCell(
      primaryCoord,
      primaryCell,
    )
    if (!primaryInteraction) return affordances

    const portal = primaryInteraction.metadata?.dungeonActionsVisible === true
    const activeReachable = this.activeAdjacentPreviewCoord(
      context,
      this.reachableCellsForContext(context),
    )
    if (!portal && activeReachable && sameCoord(activeReachable, primaryCoord)) {
      return affordances
    }
    affordances.push({
      id: `primary:${primaryInteraction.id}`,
      coord: primaryCoord,
      kind: portal ? "portal" : "inspect",
      label: primaryInteraction.label,
      actionLabel: portal ? "Enter" : "Inspect",
      enabled: primaryInteraction.enabled,
      emphasis: "primary",
      color: portal ? 0xe3a64a : 0x2f8f63,
    })
    return affordances
  }

  private fitCameraToContext(context: RenderContext): void {
    const camera = this.cameras.main
    const allCenters = context.terrainCells.map((cell) => centerFor(cell.coord, context))
    if (allCenters.length === 0) return
    const framingCells = context.terrainCells.filter((cell) =>
      this.cellPresentationPolicy.cellVisible(cell),
    )
    const framingCenters =
      framingCells.length >= 2 ? framingCells.map((cell) => centerFor(cell.coord, context)) : allCenters

    const padding =
      context.topologyKind === "hex"
        ? (context.map.topology.kind === "hex" ? context.map.topology.radius : DEFAULT_RADIUS) * 2
        : squareCellSize(context) * 1.5
    const boundsMinX = Math.min(...allCenters.map((point) => point.x)) - padding
    const boundsMaxX = Math.max(...allCenters.map((point) => point.x)) + padding
    const boundsMinY = Math.min(...allCenters.map((point) => point.y)) - padding
    const boundsMaxY = Math.max(...allCenters.map((point) => point.y)) + padding
    const frameMinX = Math.min(...framingCenters.map((point) => point.x)) - padding
    const frameMaxX = Math.max(...framingCenters.map((point) => point.x)) + padding
    const frameMinY = Math.min(...framingCenters.map((point) => point.y)) - padding
    const frameMaxY = Math.max(...framingCenters.map((point) => point.y)) + padding
    const boundsWidth = Math.max(1, boundsMaxX - boundsMinX)
    const boundsHeight = Math.max(1, boundsMaxY - boundsMinY)
    const frameWidth = Math.max(1, frameMaxX - frameMinX)
    const frameHeight = Math.max(1, frameMaxY - frameMinY)
    const maxFitZoom = context.topologyKind === "square" ? 1.92 : 1.68
    const zoom = Math.min(
      maxFitZoom,
      Math.max(0.64, Math.min(this.scale.width / frameWidth, this.scale.height / frameHeight) * 0.9),
    )
    const focusCoord = initialCharacterCoord(context) ?? context.baseCoord
    const focus = focusCoord ? centerFor(focusCoord, context) : {
      x: frameMinX + frameWidth / 2,
      y: frameMinY + frameHeight / 2,
    }
    camera.setZoom(zoom)
    const visibleWidth = this.scale.width / zoom
    const visibleHeight = this.scale.height / zoom
    camera.setBounds(
      boundsMinX - visibleWidth / 2,
      boundsMinY - visibleHeight / 2,
      boundsWidth + visibleWidth,
      boundsHeight + visibleHeight,
    )
    camera.centerOn(focus.x, focus.y)
  }

  /** Ease the camera to center a coord (no-op if off-map). Cancelled by a
   * manual pan/zoom. */
  focusOnCoord(coord: CellCoord | null | undefined, durationMs = 600): void {
    if (!coord || !this.context) return
    const target = centerFor(coord, this.context)
    this.cameras.main.pan(target.x, target.y, durationMs, "Sine.easeInOut")
  }

  /** Frame a named target. "hero" re-arms follow; "base"/"cave" are one-shot
   * looks (so a later Hero step doesn't snap the view away). */
  focusOn(target: "hero" | "base" | "cave", durationMs = 600): void {
    const context = this.context
    if (!context) return
    this.followHero = target === "hero"
    const coord =
      target === "hero"
        ? this.characterCoord
        : target === "base"
          ? context.baseCoord
          : context.survivorCaveCoord
    this.focusOnCoord(coord, durationMs)
  }

  private cancelCameraPan(): void {
    const pan = this.cameras.main.panEffect
    if (pan?.isRunning) pan.reset()
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    this.dragging = true
    this.dragMoved = false
    this.cancelCameraPan()
    this.dragStartScreen = { x: pointer.x, y: pointer.y }
    this.dragStartScroll = {
      x: this.cameras.main.scrollX,
      y: this.cameras.main.scrollY,
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.dragging) {
      const dx = pointer.x - this.dragStartScreen.x
      const dy = pointer.y - this.dragStartScreen.y
      if (Math.abs(dx) + Math.abs(dy) > 3) {
        this.dragMoved = true
        this.followHero = false // manual pan takes control
      }
      this.cameras.main.scrollX = this.dragStartScroll.x - dx / this.cameras.main.zoom
      this.cameras.main.scrollY = this.dragStartScroll.y - dy / this.cameras.main.zoom
      this.refreshInfo()
      return
    }

    const nextHover = this.coordAtPointer(pointer)
    if (sameCoord(nextHover, this.hoveredCoord)) return
    this.hoveredCoord = nextHover
    this.lastInteractionInput = "pointer"
    this.drawOverlay()
    this.refreshInfo()
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    this.dragging = false
    if (!this.dragMoved) {
      this.selectedCoord = this.coordAtPointer(pointer)
      this.lastInteractionInput = "pointer"
      this.drawOverlay()
    }
    this.refreshInfo()
  }

  private onWheel(
    pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
  ): void {
    const camera = this.cameras.main
    this.cancelCameraPan()
    const before = camera.getWorldPoint(pointer.x, pointer.y)
    camera.setZoom(clamp(camera.zoom * (deltaY > 0 ? 0.9 : 1.1), MIN_ZOOM, MAX_ZOOM))
    const after = camera.getWorldPoint(pointer.x, pointer.y)
    camera.scrollX += before.x - after.x
    camera.scrollY += before.y - after.y
    this.refreshInfo()
  }

  private onResize(): void {
    this.renderPendingWorld(true)
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = characterMoveKeyForKeyboardKey(event.key)
    if (!key) return
    event.preventDefault()

    // Shift turns the Hero in place to look around, without stepping.
    if (event.shiftKey) {
      this.characterFacing = key
      this.refreshInfo()
      return
    }

    this.heldCharacterKeys.add(key)
    if (!event.repeat) this.pendingCharacterKeys.add(key)

    if (event.repeat) {
      return
    }

    this.scheduleCharacterMove()
  }

  private onKeyUp(event: KeyboardEvent): void {
    const key = characterMoveKeyForKeyboardKey(event.key)
    if (!key) return
    event.preventDefault()
    this.heldCharacterKeys.delete(key)
  }

  private scheduleCharacterMove(): void {
    if (this.pendingCharacterMoveTimer !== null) return
    this.pendingCharacterMoveTimer = window.setTimeout(() => {
      this.pendingCharacterMoveTimer = null
      this.executeCharacterMoveFromKeys()
    }, KEY_CHORD_DELAY_MS)
  }

  private executeCharacterMoveFromKeys(): void {
    const direction = directionForCharacterKeys(
      new Set([...this.pendingCharacterKeys, ...this.heldCharacterKeys]),
      this.context?.topologyKind ?? "hex",
    )
    this.pendingCharacterKeys.clear()
    if (!direction) return
    void this.moveMainCharacter(direction)
  }

  private coordAtPointer(pointer: Phaser.Input.Pointer): CellCoord | null {
    const context = this.context
    if (!context) return null
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const localPoint = {
      x: worldPoint.x - context.origin.x,
      y: worldPoint.y - context.origin.y,
    }
    const coord =
      context.topologyKind === "hex"
        ? context.hexTopology?.worldToCell(localPoint)
        : context.squareTopology?.worldToCell(localPoint)
    if (!coord) return null
    const cell = context.terrainByCoord.get(addMapCoordKey(coord))
    return cell && this.cellPresentationPolicy.cellVisible(cell) ? coord : null
  }

  private refreshInfo(
    summary = this.lastRendererState.validation.summary,
    valid = this.lastRendererState.validation.valid,
  ): void {
    const context = this.context
    if (!context) {
      this.lastRendererState = {
        ...emptyRendererState(),
        ready: this.ready,
        renderCount: this.renderCount,
        validation: {
          valid: false,
          summary,
        },
        rendererType: rendererType(this.game.renderer.type),
      }
      this.lastInfo = {
        ...projectAddPhaserMapInfo({
          rendererState: this.lastRendererState,
          context: null,
          worldInteractionPolicy: this.worldInteractionPolicy,
        }),
        scaleBar: null,
      }
      return
    }

    this.lastRendererState = this.rendererStateForContext(context, summary, valid)
    this.lastInfo = {
      ...projectAddPhaserMapInfo({
        rendererState: this.lastRendererState,
        context,
        worldInteractionPolicy: this.worldInteractionPolicy,
      }),
      scaleBar: this.computeScaleBar(),
    }
  }

  private rendererStateForContext(
    context: RenderContext,
    summary: string,
    valid: boolean,
  ): PhaserMapRendererState {
    const camera = this.cameras.main
    const activeTravel = this.characterTravel
    const rawProgress = activeTravel
      ? clamp((this.time.now - activeTravel.startedAtMs) / activeTravel.durationMs, 0, 1)
      : 0
    const primaryAnchorPosition = context.baseCoord ? centerFor(context.baseCoord, context) : null
    const spawnAnchorPosition = context.survivorCaveCoord
      ? centerFor(context.survivorCaveCoord, context)
      : null

    return {
      hostedBy: "phaser",
      ready: this.ready,
      renderCount: this.renderCount,
      mapId: context.map.id,
      validation: {
        valid,
        summary,
      },
      rendererType: rendererType(this.game.renderer.type),
      topology: {
        kind: context.topologyKind,
        mode: typeof context.map.metadata?.mapMode === "string" ? context.map.metadata.mapMode : null,
        fixture: context.map.metadata?.fixture === true,
        radius: context.map.topology.kind === "hex" ? context.map.topology.radius : null,
        cellSize: context.map.topology.kind === "square" ? context.map.topology.cellSize : null,
      },
      cells: {
        total: context.terrainCells.length,
        blocked: context.stateCounts.blocked,
        emphasized: context.bubbleEdgeCoords.size,
      },
      renderers: {
        cells: this.cellRenderer?.getInfo() ?? null,
        fog: this.fogRenderer?.getInfo() ?? null,
        interactions: this.cellInteractionRenderer?.getInfo() ?? null,
        entities: this.characterRenderer?.getInfo() ?? null,
      },
      controlledEntity: {
        id: "add.entity.hero",
        label: "Hero",
        visible: this.characterCoord !== null && this.characterPosition !== null,
        coord: this.characterCoord,
        position: this.characterPosition,
        moving: this.characterIsMoving(),
        facing: this.characterFacing,
        lastMoveDirection: this.characterMoveStatus.direction,
        lastMoveAccepted: this.characterMoveStatus.accepted,
        blockedReason: this.characterMoveStatus.blockedReason,
        authority: "browser_navigation_triggers_runtime",
      },
      movement: {
        active: activeTravel !== null || this.travelRuntimeLocked,
        progress: round(rawProgress),
        direction: activeTravel?.direction ?? this.characterMoveStatus.direction,
        fromCoord: activeTravel?.fromCoord ?? null,
        toCoord: activeTravel?.toCoord ?? null,
        blockedReason: this.characterMoveStatus.blockedReason,
      },
      landmarks: {
        primaryAnchorCoord: context.baseCoord,
        primaryAnchorPosition,
        primaryAnchorViewport: primaryAnchorPosition
          ? viewportPointFor(primaryAnchorPosition, camera, this.scale.width, this.scale.height)
          : null,
        spawnAnchorCoord: context.survivorCaveCoord,
        spawnAnchorPosition,
        spawnAnchorViewport: spawnAnchorPosition
          ? viewportPointFor(spawnAnchorPosition, camera, this.scale.width, this.scale.height)
          : null,
        renderedCount: this.landmarkObjects.length,
      },
      visibility: {
        revealTransitionsActive: this.fogRenderer?.getInfo().revealTransitionCount ?? 0,
        travelRevealPreview: this.travelRevealPreviewForContext(context),
      },
      camera: {
        mode: this.cameraInitialized ? "interactive_pan_zoom" : "fit",
        zoom: round(camera.zoom),
        scrollX: round(camera.scrollX),
        scrollY: round(camera.scrollY),
      },
      interaction: {
        hoverEnabled: true,
        selectEnabled: true,
        hoveredCoord: this.hoveredCoord,
        selectedCoord: this.selectedCoord,
        activeCoord: this.selectedCoord ?? this.hoveredCoord,
        activeSource: this.selectedCoord ? "selection" : this.hoveredCoord ? "hover" : "none",
        lastInput: this.lastInteractionInput,
        dragging: this.dragging,
      },
      presentation: {
        terrainArt: "procedural_painterly_topology",
        bubbleEffects: "animated_halo_edge",
        landmarkSprites: "procedural_sprite_stack",
        labelRendering: "high_resolution_phaser_text",
        ambience: "subtle_motes_and_topographic_scan",
        mapPrimaryAffordances: this.mapPrimaryAffordanceInfo,
        visibilityPolish: VISIBILITY_POLISH,
        transitionState: this.transitionState,
        transitionProgress: round(this.transitionProgress),
        responsiveLayout: this.scale.width < 640 || this.scale.height < 520 ? "mobile" : "desktop",
        mobileEdgeCulledLabelCount: this.mobileEdgeCulledLabelCount,
      },
    }
  }

  private ensureSelectedCoord(context: RenderContext): void {
    if (
      this.selectedCoord &&
      context.terrainByCoord.has(addMapCoordKey(this.selectedCoord))
    ) {
      return
    }
    this.selectedCoord = context.baseCoord
  }
}

function viewportPointFor(
  worldPoint: Vector2,
  camera: Phaser.Cameras.Scene2D.Camera,
  width: number,
  height: number,
): Vector2 {
  const view = camera.worldView
  return {
    x: ((worldPoint.x - view.x) / Math.max(1, view.width)) * width,
    y: ((worldPoint.y - view.y) / Math.max(1, view.height)) * height,
  }
}

/** Round a raw metre distance to a "nice" 1/2/5 × 10ⁿ value, like a real map. */
function niceScaleMeters(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const fraction = raw / pow
  const nice = fraction >= 5 ? 5 : fraction >= 2 ? 2 : 1
  return nice * pow
}

/** Format a nice metre value as "500 m" / "2 km" (values are always 1/2/5 × 10ⁿ). */
function formatScaleDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000
    return `${Number.isInteger(km) ? km : km.toFixed(1)} km`
  }
  return `${meters} m`
}

function emptyMapPrimaryAffordanceInfo(): MapPrimaryAffordanceInfo {
  return {
    layer: "reachable_path_frontier_landmark",
    reachableCellCount: 0,
    frontierHintCount: 0,
    pathTimePreviewVisible: false,
    actionMarkerCount: 0,
    landmarkBeaconCount: 0,
  }
}
