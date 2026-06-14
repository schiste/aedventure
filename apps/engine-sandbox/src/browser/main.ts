import {
  createHexCoord,
  createHexTopology,
  createSquareCoord,
  createSquareTopology,
  hexBoundsFromRadius,
  hexDistance,
  type CellCoord,
  type GridTopology,
  type HexCoord,
  type SquareCoord,
  type Vector2,
} from "@aedventure/game-topology"
import { hexCellPolygonPoints } from "@aedventure/game-renderer-phaser/hex-geometry"
import {
  validateGameWorld,
  type GameEntity,
  type GameInteraction,
  type GameMap,
  type GameWorld,
  type GameZone,
} from "@aedventure/game-world"
import "./styles.css"

type FixtureKind = "square" | "hex"

interface FixtureRuntime<TCoord extends CellCoord> {
  readonly kind: FixtureKind
  readonly map: GameMap
  readonly topology: GridTopology<TCoord>
}

interface PaneLayout {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly title: string
  readonly subtitle: string
}

interface RenderedInteraction {
  readonly id: string
  readonly mapId: string
  readonly label: string
  readonly action: string
  readonly screen: Vector2
  readonly radius: number
}

interface SandboxTextState {
  readonly app: "engine-sandbox"
  readonly coordinateSystem: string
  readonly engineBoundary: {
    readonly domain: "neutral-engine-fixture"
    readonly renderer: "canvas-topology-fixture"
    readonly uses: readonly string[]
    readonly importsOfficeDomain: false
  }
  readonly world: {
    readonly id: string
    readonly activeMapId: string
    readonly mapCount: number
    readonly validationValid: boolean
    readonly validationSummary: string
  }
  readonly coexistence: {
    readonly sharedCanvas: boolean
    readonly squareRendered: boolean
    readonly hexRendered: boolean
    readonly topologyKinds: readonly FixtureKind[]
  }
  readonly square: TopologyTextSummary
  readonly hex: TopologyTextSummary
  readonly selectedInteractionId: string | null
  readonly hoveredInteractionId: string | null
  readonly viewport: {
    readonly width: number
    readonly height: number
    readonly devicePixelRatio: number
  }
  readonly frameCount: number
}

interface TopologyTextSummary {
  readonly mapId: string
  readonly topology: FixtureKind
  readonly cells: number
  readonly blockedCells: number
  readonly entities: number
  readonly zones: number
  readonly labels: number
  readonly interactions: readonly RenderedInteraction[]
}

declare global {
  interface Window {
    render_game_to_text?: () => string
    advanceTime?: (ms?: number) => Promise<string>
  }
}

const SQUARE_SIZE = 48
const HEX_RADIUS = 27
const SQUARE_MAP_ID = "sandbox.square"
const HEX_MAP_ID = "sandbox.hex"

const canvas = requireElement<HTMLCanvasElement>("#sandbox-canvas")
const validationStatus = document.querySelector<HTMLElement>("#validation-status")
const interactionStatus = document.querySelector<HTMLElement>("#interaction-status")
const context = requireCanvasContext(canvas)

const squareMap = createSquareFixtureMap()
const hexMap = createHexFixtureMap()
const world: GameWorld = {
  id: "engine-sandbox-world",
  activeMapId: SQUARE_MAP_ID,
  maps: [squareMap, hexMap],
  metadata: {
    purpose: "topology-fixture",
  },
}
const validation = validateGameWorld(world)

const squareRuntime: FixtureRuntime<SquareCoord> = {
  kind: "square",
  map: squareMap,
  topology: createSquareTopology({
    cellSize: SQUARE_SIZE,
    bounds: { width: 6, height: 4 },
    neighborMode: "diagonal",
    distanceMetric: "chebyshev",
  }),
}
const hexRuntime: FixtureRuntime<HexCoord> = {
  kind: "hex",
  map: hexMap,
  topology: createHexTopology({
    radius: HEX_RADIUS,
    bounds: hexBoundsFromRadius(2),
  }),
}

let frameCount = 0
let lastRenderedInteractions: RenderedInteraction[] = []
let selectedInteractionId: string | null = null
let hoveredInteractionId: string | null = null
let viewportWidth = 0
let viewportHeight = 0
let dpr = 1

if (validationStatus) {
  validationStatus.textContent = validation.valid ? "World model valid" : "World model invalid"
}

canvas.addEventListener("pointermove", (event) => {
  const point = pointerToCanvasPoint(event)
  hoveredInteractionId = findInteractionAt(point)?.id ?? null
  canvas.style.cursor = hoveredInteractionId ? "pointer" : "default"
  render()
})

canvas.addEventListener("pointerleave", () => {
  hoveredInteractionId = null
  canvas.style.cursor = "default"
  render()
})

canvas.addEventListener("click", (event) => {
  const point = pointerToCanvasPoint(event)
  const interaction = findInteractionAt(point)
  if (!interaction) return

  selectedInteractionId = interaction.id
  if (interactionStatus) {
    interactionStatus.textContent = `${interaction.label} selected.`
  }
  render()
})

window.addEventListener("resize", () => {
  resizeCanvas()
})

window.render_game_to_text = () => JSON.stringify(createTextState())
window.advanceTime = async (ms = 16) => {
  frameCount += Math.max(1, Math.ceil(ms / 16))
  render()
  return window.render_game_to_text ? window.render_game_to_text() : "{}"
}

resizeCanvas()

function createSquareFixtureMap(): GameMap {
  const floorCells: { coord: SquareCoord; tokenId: string }[] = []
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 6; x += 1) {
      floorCells.push({
        coord: createSquareCoord(x, y),
        tokenId: (x + y) % 2 === 0 ? "sandbox.square.floor.light" : "sandbox.square.floor.dark",
      })
    }
  }

  const blocked = [
    createSquareCoord(1, 1),
    createSquareCoord(2, 1),
    createSquareCoord(4, 2),
  ]

  return {
    id: SQUARE_MAP_ID,
    label: "Square Room",
    topology: {
      kind: "square",
      cellSize: SQUARE_SIZE,
      bounds: { width: 6, height: 4 },
      neighborMode: "diagonal",
      distanceMetric: "chebyshev",
    },
    layers: [
      {
        id: "square.floor",
        kind: "terrain",
        label: "Floor",
        cells: floorCells,
      },
      {
        id: "square.objects",
        kind: "objects",
        label: "Objects",
        cells: blocked.map((coord) => ({
          coord,
          tokenId: "sandbox.square.table",
          blocked: true,
        })),
      },
    ],
    entities: [
      {
        id: "entity.square.guide",
        kind: "avatar",
        label: "Square Guide",
        coord: createSquareCoord(3, 2),
        layerId: "square.objects",
        blocksMovement: true,
        tags: ["fixture", "local"],
      },
    ],
    zones: [
      {
        id: "zone.square.workbench",
        kind: "workbench",
        label: "Workbench Zone",
        cells: [createSquareCoord(0, 2), createSquareCoord(1, 2), createSquareCoord(2, 2)],
        interactionIds: ["interaction.square.inspect"],
      },
    ],
    interactions: [
      {
        id: "interaction.square.inspect",
        kind: "inspect",
        action: "inspect-square-zone",
        label: "Inspect square",
        target: {
          kind: "zone",
          id: "zone.square.workbench",
        },
        requiredZoneId: "zone.square.workbench",
        enabled: true,
      },
    ],
  }
}

function createHexFixtureMap(): GameMap {
  const radius = 2
  const floorCells: { coord: HexCoord; tokenId: string }[] = []
  for (let q = -radius; q <= radius; q += 1) {
    for (let r = -radius; r <= radius; r += 1) {
      const coord = createHexCoord(q, r)
      if (hexDistance(createHexCoord(0, 0), coord) > radius) continue
      floorCells.push({
        coord,
        tokenId: (Math.abs(q) + Math.abs(r)) % 2 === 0 ? "sandbox.hex.grass" : "sandbox.hex.path",
      })
    }
  }

  return {
    id: HEX_MAP_ID,
    label: "Hex Field",
    topology: {
      kind: "hex",
      radius: HEX_RADIUS,
      bounds: hexBoundsFromRadius(radius),
    },
    layers: [
      {
        id: "hex.floor",
        kind: "terrain",
        label: "Terrain",
        cells: floorCells,
      },
      {
        id: "hex.objects",
        kind: "objects",
        label: "Objects",
        cells: [
          {
            coord: createHexCoord(1, -1),
            tokenId: "sandbox.hex.crystal",
            blocked: true,
          },
          {
            coord: createHexCoord(-1, 1),
            tokenId: "sandbox.hex.sapling",
            blocked: false,
          },
        ],
      },
    ],
    entities: [
      {
        id: "entity.hex.scout",
        kind: "avatar",
        label: "Scout",
        coord: createHexCoord(0, 0),
        layerId: "hex.objects",
        blocksMovement: true,
        tags: ["fixture", "remote"],
      },
    ],
    zones: [
      {
        id: "zone.hex.node",
        kind: "resource-node",
        label: "Resource Node",
        cells: [createHexCoord(0, 0), createHexCoord(1, -1), createHexCoord(1, 0)],
        interactionIds: ["interaction.hex.gather"],
      },
    ],
    interactions: [
      {
        id: "interaction.hex.gather",
        kind: "gather",
        action: "gather-hex-node",
        label: "Gather",
        target: {
          kind: "zone",
          id: "zone.hex.node",
        },
        requiredZoneId: "zone.hex.node",
        enabled: true,
      },
    ],
  }
}

function resizeCanvas(): void {
  const rect = canvas.getBoundingClientRect()
  dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))
  viewportWidth = Math.max(320, Math.floor(rect.width))
  viewportHeight = Math.max(360, Math.floor(rect.height))
  canvas.width = Math.floor(viewportWidth * dpr)
  canvas.height = Math.floor(viewportHeight * dpr)
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  render()
}

function render(): void {
  frameCount += 1
  lastRenderedInteractions = []

  context.save()
  context.clearRect(0, 0, viewportWidth, viewportHeight)
  context.fillStyle = "#f8f5ec"
  context.fillRect(0, 0, viewportWidth, viewportHeight)

  const { squarePane, hexPane } = computePanes()
  drawPane(squarePane, "#466f8f")
  drawPane(hexPane, "#a05f2d")
  renderSquareFixture(squarePane)
  renderHexFixture(hexPane)
  drawFooterGuide()
  context.restore()
}

function computePanes(): { squarePane: PaneLayout; hexPane: PaneLayout } {
  const padding = viewportWidth < 760 ? 18 : 28
  const gap = viewportWidth < 760 ? 18 : 28
  const compact = viewportWidth < 760

  if (compact) {
    const paneHeight = (viewportHeight - padding * 2 - gap) / 2
    return {
      squarePane: {
        x: padding,
        y: padding,
        width: viewportWidth - padding * 2,
        height: paneHeight,
        title: "Square topology",
        subtitle: "Grid rooms, tactical dungeons, office maps",
      },
      hexPane: {
        x: padding,
        y: padding + paneHeight + gap,
        width: viewportWidth - padding * 2,
        height: paneHeight,
        title: "Hex topology",
        subtitle: "Strategy maps, regions, world traversal",
      },
    }
  }

  const paneWidth = (viewportWidth - padding * 2 - gap) / 2
  const paneHeight = viewportHeight - padding * 2
  return {
    squarePane: {
      x: padding,
      y: padding,
      width: paneWidth,
      height: paneHeight,
      title: "Square topology",
      subtitle: "Grid rooms, tactical dungeons, office maps",
    },
    hexPane: {
      x: padding + paneWidth + gap,
      y: padding,
      width: paneWidth,
      height: paneHeight,
      title: "Hex topology",
      subtitle: "Strategy maps, regions, world traversal",
    },
  }
}

function drawPane(pane: PaneLayout, accent: string): void {
  roundedRect(context, pane.x, pane.y, pane.width, pane.height, 10)
  context.fillStyle = "#fffdf7"
  context.fill()
  context.strokeStyle = "#ded6c8"
  context.lineWidth = 1
  context.stroke()

  context.fillStyle = accent
  context.font = "800 18px Inter, system-ui, sans-serif"
  context.textBaseline = "top"
  context.fillText(pane.title, pane.x + 20, pane.y + 18)

  context.fillStyle = "#6b756f"
  context.font = "500 12px Inter, system-ui, sans-serif"
  context.fillText(pane.subtitle, pane.x + 20, pane.y + 42)
}

function renderSquareFixture(pane: PaneLayout): void {
  const origin = {
    x: pane.x + Math.max(24, (pane.width - 6 * SQUARE_SIZE) / 2),
    y: pane.y + Math.max(82, (pane.height - 4 * SQUARE_SIZE) / 2 + 24),
  }

  const zoneCells = new Set(
    squareMap.zones.flatMap((zone) => zone.cells.map((coord) => serializeCoord(coord))),
  )
  const blockedCells = new Set(
    squareMap.layers.flatMap((layer) =>
      (layer.cells ?? [])
        .filter((cell) => cell.blocked)
        .map((cell) => serializeCoord(cell.coord)),
    ),
  )

  for (const cell of squareMap.layers[0]?.cells ?? []) {
    if (cell.coord.kind !== "square") continue
    const point = squareCellPoint(cell.coord, origin)
    context.fillStyle =
      cell.tokenId === "sandbox.square.floor.light" ? "#dfe8df" : "#d5e1d9"
    context.fillRect(point.x, point.y, SQUARE_SIZE, SQUARE_SIZE)
    if (zoneCells.has(serializeCoord(cell.coord))) {
      context.fillStyle = "rgba(43, 116, 102, 0.2)"
      context.fillRect(point.x + 3, point.y + 3, SQUARE_SIZE - 6, SQUARE_SIZE - 6)
    }
    context.strokeStyle = "#aebdb1"
    context.lineWidth = 1
    context.strokeRect(point.x + 0.5, point.y + 0.5, SQUARE_SIZE, SQUARE_SIZE)
  }

  for (const cell of squareMap.layers[1]?.cells ?? []) {
    if (cell.coord.kind !== "square") continue
    const point = squareCellPoint(cell.coord, origin)
    drawShadow(point.x + 8, point.y + 12, SQUARE_SIZE - 16, SQUARE_SIZE - 15)
    roundedRect(context, point.x + 8, point.y + 10, SQUARE_SIZE - 16, SQUARE_SIZE - 18, 6)
    context.fillStyle = blockedCells.has(serializeCoord(cell.coord)) ? "#6e5c47" : "#82705a"
    context.fill()
    context.fillStyle = "rgba(255, 255, 255, 0.22)"
    context.fillRect(point.x + 12, point.y + 14, SQUARE_SIZE - 24, 4)
  }

  for (const zone of squareMap.zones) {
    drawZoneLabel(zone, origin, "square")
  }

  for (const entity of squareMap.entities) {
    drawEntity(entity, origin, "square", "#315f7e")
  }

  for (const interaction of squareMap.interactions ?? []) {
    drawInteraction(interaction, squareMap, origin, "square")
  }
}

function renderHexFixture(pane: PaneLayout): void {
  const origin = {
    x: pane.x + pane.width / 2,
    y: pane.y + pane.height / 2 + 22,
  }

  const zoneCells = new Set(
    hexMap.zones.flatMap((zone) => zone.cells.map((coord) => serializeCoord(coord))),
  )
  const blockedCells = new Set(
    hexMap.layers.flatMap((layer) =>
      (layer.cells ?? [])
        .filter((cell) => cell.blocked)
        .map((cell) => serializeCoord(cell.coord)),
    ),
  )

  for (const cell of hexMap.layers[0]?.cells ?? []) {
    if (cell.coord.kind !== "hex") continue
    const center = hexCellPoint(cell.coord, origin)
    drawHex(center, HEX_RADIUS)
    context.fillStyle = cell.tokenId === "sandbox.hex.grass" ? "#dde6ce" : "#eadfc5"
    context.fill()
    if (zoneCells.has(serializeCoord(cell.coord))) {
      drawHex(center, HEX_RADIUS - 4)
      context.fillStyle = "rgba(160, 95, 45, 0.18)"
      context.fill()
    }
    drawHex(center, HEX_RADIUS)
    context.strokeStyle = "#b9ad99"
    context.lineWidth = 1
    context.stroke()
  }

  for (const cell of hexMap.layers[1]?.cells ?? []) {
    if (cell.coord.kind !== "hex") continue
    const center = hexCellPoint(cell.coord, origin)
    if (cell.tokenId === "sandbox.hex.crystal") {
      drawShadow(center.x - 12, center.y + 11, 24, 9)
      context.beginPath()
      context.moveTo(center.x, center.y - 20)
      context.lineTo(center.x + 14, center.y + 4)
      context.lineTo(center.x + 4, center.y + 21)
      context.lineTo(center.x - 13, center.y + 6)
      context.closePath()
      context.fillStyle = "#6d91b2"
      context.fill()
      context.strokeStyle = "#315f7e"
      context.stroke()
    } else {
      drawShadow(center.x - 11, center.y + 10, 22, 8)
      context.fillStyle = "#577d45"
      context.beginPath()
      context.arc(center.x, center.y - 5, 12, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = "#755d3c"
      context.fillRect(center.x - 3, center.y + 3, 6, 16)
    }
  }

  for (const zone of hexMap.zones) {
    drawZoneLabel(zone, origin, "hex")
  }

  for (const entity of hexMap.entities) {
    drawEntity(entity, origin, "hex", "#9a5d28")
  }

  for (const interaction of hexMap.interactions ?? []) {
    drawInteraction(interaction, hexMap, origin, "hex")
  }
}

function drawZoneLabel(zone: GameZone, origin: Vector2, kind: FixtureKind): void {
  const center = zoneCentroid(zone, origin, kind)
  drawLabel(zone.label ?? zone.id, center.x, center.y - 42, "#31443d")
}

function drawEntity(
  entity: GameEntity,
  origin: Vector2,
  kind: FixtureKind,
  color: string,
): void {
  if (!entity.coord) return

  const point = coordCenter(entity.coord, origin, kind)
  drawShadow(point.x - 13, point.y + 16, 26, 9)
  context.beginPath()
  context.arc(point.x, point.y + 4, 17, 0, Math.PI * 2)
  context.fillStyle = color
  context.fill()
  context.lineWidth = 3
  context.strokeStyle = "#fffdf7"
  context.stroke()
  context.fillStyle = "#fffdf7"
  context.beginPath()
  context.arc(point.x - 5, point.y, 2.5, 0, Math.PI * 2)
  context.arc(point.x + 5, point.y, 2.5, 0, Math.PI * 2)
  context.fill()
  drawLabel(entity.label ?? entity.id, point.x, point.y + 28, "#18201d")
}

function drawInteraction(
  interaction: GameInteraction,
  map: GameMap,
  origin: Vector2,
  kind: FixtureKind,
): void {
  const point = interactionPoint(interaction, map, origin, kind)
  if (!point) return

  const radius = 17
  const isSelected = selectedInteractionId === interaction.id
  const isHovered = hoveredInteractionId === interaction.id
  drawShadow(point.x - radius, point.y + radius - 4, radius * 2, 7)

  context.beginPath()
  context.arc(point.x, point.y, radius, 0, Math.PI * 2)
  context.fillStyle = isSelected ? "#194c3e" : isHovered ? "#2f7b62" : "#fffdf7"
  context.fill()
  context.lineWidth = isSelected || isHovered ? 3 : 2
  context.strokeStyle = isSelected || isHovered ? "#194c3e" : "#356f5a"
  context.stroke()

  context.fillStyle = isSelected || isHovered ? "#fffdf7" : "#194c3e"
  context.font = "900 14px Inter, system-ui, sans-serif"
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillText("E", point.x, point.y + 0.5)

  drawLabel(
    interaction.label ?? interaction.id,
    point.x,
    point.y + (kind === "hex" ? 64 : 36),
    "#194c3e",
  )

  lastRenderedInteractions.push({
    id: interaction.id,
    mapId: map.id,
    label: interaction.label ?? interaction.id,
    action: interaction.action,
    screen: point,
    radius,
  })
}

function interactionPoint(
  interaction: GameInteraction,
  map: GameMap,
  origin: Vector2,
  kind: FixtureKind,
): Vector2 | null {
  if (interaction.target.kind === "zone") {
    const zone = map.zones.find((candidate) => candidate.id === interaction.target.id)
    return zone ? zoneCentroid(zone, origin, kind) : null
  }
  if (interaction.target.kind === "entity") {
    const entity = map.entities.find((candidate) => candidate.id === interaction.target.id)
    return entity?.coord ? coordCenter(entity.coord, origin, kind) : null
  }
  return { x: origin.x, y: origin.y }
}

function zoneCentroid(zone: GameZone, origin: Vector2, kind: FixtureKind): Vector2 {
  const centers = zone.cells.map((coord) => coordCenter(coord, origin, kind))
  const total = centers.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y,
    }),
    { x: 0, y: 0 },
  )
  return {
    x: total.x / centers.length,
    y: total.y / centers.length,
  }
}

function coordCenter(coord: CellCoord, origin: Vector2, kind: FixtureKind): Vector2 {
  if (kind === "square" && coord.kind === "square") {
    const topLeft = squareCellPoint(coord, origin)
    return {
      x: topLeft.x + SQUARE_SIZE / 2,
      y: topLeft.y + SQUARE_SIZE / 2,
    }
  }
  if (kind === "hex" && coord.kind === "hex") {
    return hexCellPoint(coord, origin)
  }
  return origin
}

function squareCellPoint(coord: SquareCoord, origin: Vector2): Vector2 {
  const projected = squareRuntime.topology.cellToWorld(coord)
  return {
    x: origin.x + projected.x,
    y: origin.y + projected.y,
  }
}

function hexCellPoint(coord: HexCoord, origin: Vector2): Vector2 {
  const projected = hexRuntime.topology.cellToWorld(coord)
  return {
    x: origin.x + projected.x,
    y: origin.y + projected.y,
  }
}

function drawLabel(text: string, x: number, y: number, color: string): void {
  context.font = "700 12px Inter, system-ui, sans-serif"
  context.textAlign = "center"
  context.textBaseline = "middle"
  const width = Math.ceil(context.measureText(text).width) + 16
  const height = 22
  roundedRect(context, x - width / 2, y - height / 2, width, height, 11)
  context.fillStyle = "rgba(255, 253, 247, 0.92)"
  context.fill()
  context.strokeStyle = "rgba(49, 68, 61, 0.16)"
  context.lineWidth = 1
  context.stroke()
  context.fillStyle = color
  context.fillText(text, x, y + 0.5)
}

function drawFooterGuide(): void {
  if (validation.valid) return

  context.fillStyle = "#7f2b20"
  context.font = "800 14px Inter, system-ui, sans-serif"
  context.textAlign = "left"
  context.textBaseline = "bottom"
  context.fillText(validation.summary, 18, viewportHeight - 18)
}

function drawShadow(x: number, y: number, width: number, height: number): void {
  context.save()
  context.fillStyle = "rgba(31, 27, 20, 0.16)"
  roundedRect(context, x, y, width, height, height / 2)
  context.fill()
  context.restore()
}

function drawHex(center: Vector2, radius: number): void {
  context.beginPath()
  hexCellPolygonPoints(center, radius).forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y)
    } else {
      context.lineTo(point.x, point.y)
    }
  })
  context.closePath()
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + safeRadius, y)
  ctx.lineTo(x + width - safeRadius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  ctx.lineTo(x + width, y + height - safeRadius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  ctx.lineTo(x + safeRadius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  ctx.lineTo(x, y + safeRadius)
  ctx.quadraticCurveTo(x, y, x + safeRadius, y)
  ctx.closePath()
}

function requireElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector)
  if (!element) {
    throw new Error(`Engine sandbox element ${selector} is missing.`)
  }
  return element
}

function requireCanvasContext(element: HTMLCanvasElement): CanvasRenderingContext2D {
  const nextContext = element.getContext("2d", { alpha: false })
  if (!nextContext) {
    throw new Error("Engine sandbox requires a 2D canvas context.")
  }
  return nextContext
}

function pointerToCanvasPoint(event: MouseEvent | PointerEvent): Vector2 {
  const rect = canvas.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

function findInteractionAt(point: Vector2): RenderedInteraction | null {
  return (
    lastRenderedInteractions.find((interaction) => {
      const dx = point.x - interaction.screen.x
      const dy = point.y - interaction.screen.y
      return Math.hypot(dx, dy) <= interaction.radius + 6
    }) ?? null
  )
}

function createTextState(): SandboxTextState {
  const squareBlockedCells = squareMap.layers.flatMap((layer) =>
    (layer.cells ?? []).filter((cell) => cell.blocked),
  )
  const hexBlockedCells = hexMap.layers.flatMap((layer) =>
    (layer.cells ?? []).filter((cell) => cell.blocked),
  )

  return {
    app: "engine-sandbox",
    coordinateSystem:
      "origin top-left, x right, y down; square uses x/y cells; hex uses flat-top axial q/r cells",
    engineBoundary: {
      domain: "neutral-engine-fixture",
      renderer: "canvas-topology-fixture",
      uses: [
        "@aedventure/game-topology",
        "@aedventure/game-world",
        "@aedventure/game-renderer-phaser/hex-geometry",
      ],
      importsOfficeDomain: false,
    },
    world: {
      id: world.id,
      activeMapId: world.activeMapId ?? "",
      mapCount: world.maps.length,
      validationValid: validation.valid,
      validationSummary: validation.summary,
    },
    coexistence: {
      sharedCanvas: true,
      squareRendered: true,
      hexRendered: true,
      topologyKinds: ["square", "hex"],
    },
    square: {
      mapId: squareMap.id,
      topology: "square",
      cells: countCells(squareMap),
      blockedCells: squareBlockedCells.length,
      entities: squareMap.entities.length,
      zones: squareMap.zones.length,
      labels: squareMap.entities.length + squareMap.zones.length + (squareMap.interactions?.length ?? 0),
      interactions: lastRenderedInteractions.filter(
        (interaction) => interaction.mapId === SQUARE_MAP_ID,
      ),
    },
    hex: {
      mapId: hexMap.id,
      topology: "hex",
      cells: countCells(hexMap),
      blockedCells: hexBlockedCells.length,
      entities: hexMap.entities.length,
      zones: hexMap.zones.length,
      labels: hexMap.entities.length + hexMap.zones.length + (hexMap.interactions?.length ?? 0),
      interactions: lastRenderedInteractions.filter(
        (interaction) => interaction.mapId === HEX_MAP_ID,
      ),
    },
    selectedInteractionId,
    hoveredInteractionId,
    viewport: {
      width: viewportWidth,
      height: viewportHeight,
      devicePixelRatio: dpr,
    },
    frameCount,
  }
}

function countCells(map: GameMap): number {
  return map.layers.reduce((total, layer) => total + (layer.cells?.length ?? 0), 0)
}

function serializeCoord(coord: CellCoord): string {
  return coord.kind === "square"
    ? `square:${coord.x}:${coord.y}`
    : `hex:${coord.q}:${coord.r}`
}
