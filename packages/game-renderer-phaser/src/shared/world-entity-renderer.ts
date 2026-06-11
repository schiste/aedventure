import Phaser from "phaser"

import { applyCrispWorldText } from "../renderer/text-rendering"
import type { Vector2 } from "../renderer/types"

export type WorldEntityFacing =
  | "up"
  | "right"
  | "down"
  | "left"
  | "north_east"
  | "north_west"
  | "south_east"
  | "south_west"

export interface WorldEntityAppearance {
  readonly bodyFill?: number
  readonly bodyStroke?: number
  readonly headFill?: number
  readonly accentFill?: number
  readonly shadowFill?: number
  readonly labelColor?: string
  readonly labelBackgroundColor?: string
  readonly labelStroke?: string
  readonly bodyWidth?: number
  readonly bodyHeight?: number
  readonly headSize?: number
  readonly shadowWidth?: number
  readonly shadowHeight?: number
}

export interface WorldEntityRenderState {
  readonly id: string
  readonly label: string
  readonly labelVisible?: boolean
  readonly position: Vector2
  readonly facing?: WorldEntityFacing
  readonly moving?: boolean
  readonly visible?: boolean
  readonly depthBase?: number
  readonly appearance?: WorldEntityAppearance
}

export interface WorldEntityRenderFrame {
  readonly frameCount: number
}

export interface WorldEntityRendererInfo {
  readonly source: "world_entity_renderer"
  readonly entityCount: number
  readonly visibleEntityCount: number
  readonly labelBackend: "phaser_text"
  readonly crispText: true
  readonly presentation: "procedural_labeled_entity"
  readonly interpolationHooks: "position_state_and_motion_phase"
}

const DEFAULT_APPEARANCE: Required<WorldEntityAppearance> = {
  bodyFill: 0x2f7d68,
  bodyStroke: 0x145244,
  headFill: 0xf1d0a5,
  accentFill: 0xe6a84e,
  shadowFill: 0x101815,
  labelColor: "#16221e",
  labelBackgroundColor: "rgba(255, 250, 226, 0.9)",
  labelStroke: "rgba(255, 255, 255, 0.54)",
  bodyWidth: 18,
  bodyHeight: 22,
  headSize: 12,
  shadowWidth: 24,
  shadowHeight: 8,
}

export class WorldEntityRenderer {
  private readonly entities = new Map<string, WorldEntityView>()
  private lastInfo: WorldEntityRendererInfo = emptyWorldEntityRendererInfo()

  constructor(private readonly scene: Phaser.Scene) {}

  updateEntities(
    states: readonly WorldEntityRenderState[],
    frame: WorldEntityRenderFrame,
  ): WorldEntityRendererInfo {
    const nextIds = new Set(states.map((state) => state.id))
    this.entities.forEach((entity, id) => {
      if (nextIds.has(id)) return
      entity.destroy()
      this.entities.delete(id)
    })

    let visibleEntityCount = 0
    for (const state of states) {
      let entity = this.entities.get(state.id)
      if (!entity) {
        entity = new WorldEntityView(this.scene, state)
        this.entities.set(state.id, entity)
      }
      entity.update(state, frame)
      if (state.visible !== false) visibleEntityCount += 1
    }

    this.lastInfo = {
      source: "world_entity_renderer",
      entityCount: states.length,
      visibleEntityCount,
      labelBackend: "phaser_text",
      crispText: true,
      presentation: "procedural_labeled_entity",
      interpolationHooks: "position_state_and_motion_phase",
    }
    return this.lastInfo
  }

  clear(): void {
    this.entities.forEach((entity) => entity.destroy())
    this.entities.clear()
    this.lastInfo = emptyWorldEntityRendererInfo()
  }

  getInfo(): WorldEntityRendererInfo {
    return this.lastInfo
  }
}

export function emptyWorldEntityRendererInfo(): WorldEntityRendererInfo {
  return {
    source: "world_entity_renderer",
    entityCount: 0,
    visibleEntityCount: 0,
    labelBackend: "phaser_text",
    crispText: true,
    presentation: "procedural_labeled_entity",
    interpolationHooks: "position_state_and_motion_phase",
  }
}

class WorldEntityView {
  private readonly root: Phaser.GameObjects.Container
  private readonly shadow: Phaser.GameObjects.Ellipse
  private readonly body: Phaser.GameObjects.Ellipse
  private readonly head: Phaser.GameObjects.Ellipse
  private readonly accent: Phaser.GameObjects.Triangle
  private readonly label: Phaser.GameObjects.Text
  private labelText = ""
  private appearance = DEFAULT_APPEARANCE

  constructor(
    private readonly scene: Phaser.Scene,
    state: WorldEntityRenderState,
  ) {
    this.appearance = resolveAppearance(state.appearance)
    this.root = scene.add.container(state.position.x, state.position.y)
    this.root.setName(`world-entity:${state.id}`)
    this.root.setVertexRoundMode("off")
    this.shadow = scene.add.ellipse(
      0,
      14,
      this.appearance.shadowWidth,
      this.appearance.shadowHeight,
      this.appearance.shadowFill,
      0.25,
    )
    this.body = scene.add.ellipse(
      0,
      2,
      this.appearance.bodyWidth,
      this.appearance.bodyHeight,
      this.appearance.bodyFill,
      0.98,
    )
    this.body.setStrokeStyle(1, this.appearance.bodyStroke, 0.55)
    this.head = scene.add.ellipse(
      0,
      -12,
      this.appearance.headSize,
      this.appearance.headSize,
      this.appearance.headFill,
      0.98,
    )
    this.accent = scene.add.triangle(
      0,
      0,
      0,
      -8,
      14,
      0,
      0,
      8,
      this.appearance.accentFill,
      0.96,
    )
    this.label = scene.add.text(0, -34, state.label, {
      color: this.appearance.labelColor,
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "10px",
      fontStyle: "800",
      align: "center",
      backgroundColor: this.appearance.labelBackgroundColor,
      stroke: this.appearance.labelStroke,
      strokeThickness: 2,
      padding: { x: 5, y: 2 },
    })
    applyCrispWorldText(this.label)
    this.label.setOrigin(0.5, 0.5)
    this.root.add([this.shadow, this.body, this.head, this.accent, this.label])
    this.update(state, { frameCount: 0 })
  }

  update(state: WorldEntityRenderState, frame: WorldEntityRenderFrame): void {
    const visible = state.visible !== false
    this.root.setVisible(visible)
    if (!visible) return

    const nextAppearance = resolveAppearance(state.appearance)
    if (appearanceChanged(this.appearance, nextAppearance)) {
      this.applyAppearance(nextAppearance)
    }
    if (state.label !== this.labelText) {
      this.labelText = state.label
      this.label.setText(state.label)
    }
    this.label.setVisible(state.labelVisible !== false && state.label.trim().length > 0)

    const bob = Math.sin(frame.frameCount / 5) * (state.moving ? 1.8 : 0.5)
    const accentOffset = accentOffsetForFacing(state.facing ?? "down")
    this.root.setPosition(state.position.x, state.position.y)
    this.root.setDepth(state.depthBase ?? 44)
    this.shadow.setPosition(0, 14)
    this.body.setPosition(0, 2 + bob)
    this.head.setPosition(0, -12 + bob)
    this.accent.setPosition(accentOffset.x, 1 + bob + accentOffset.y)
    this.accent.setRotation(accentOffset.rotation)
    this.label.setPosition(0, -34 + bob * 0.35)
  }

  destroy(): void {
    this.root.destroy(true)
  }

  private applyAppearance(appearance: Required<WorldEntityAppearance>): void {
    this.appearance = appearance
    this.shadow.setFillStyle(appearance.shadowFill, 0.25)
    this.shadow.setSize(appearance.shadowWidth, appearance.shadowHeight)
    this.body.setFillStyle(appearance.bodyFill, 0.98)
    this.body.setStrokeStyle(1, appearance.bodyStroke, 0.55)
    this.body.setSize(appearance.bodyWidth, appearance.bodyHeight)
    this.head.setFillStyle(appearance.headFill, 0.98)
    this.head.setSize(appearance.headSize, appearance.headSize)
    this.accent.setFillStyle(appearance.accentFill, 0.96)
  }
}

function resolveAppearance(
  appearance: WorldEntityAppearance | undefined,
): Required<WorldEntityAppearance> {
  return {
    ...DEFAULT_APPEARANCE,
    ...appearance,
  }
}

function appearanceChanged(
  current: Required<WorldEntityAppearance>,
  next: Required<WorldEntityAppearance>,
): boolean {
  return Object.keys(current).some((key) => {
    const typedKey = key as keyof Required<WorldEntityAppearance>
    return current[typedKey] !== next[typedKey]
  })
}

function accentOffsetForFacing(facing: WorldEntityFacing): {
  readonly x: number
  readonly y: number
  readonly rotation: number
} {
  if (facing === "left" || facing === "north_west" || facing === "south_west") {
    return { x: -7, y: 0, rotation: Math.PI }
  }
  if (facing === "up") return { x: 0, y: -2, rotation: -Math.PI / 2 }
  if (facing === "down") return { x: 0, y: 2, rotation: Math.PI / 2 }
  return { x: 7, y: 0, rotation: 0 }
}
