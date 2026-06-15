import Phaser from "phaser"
import type { GameWorld } from "@aedventure/game-world"

import { AddRpgHexScene } from "./add-world-scene"
import type {
  AddCharacterMoveDirection,
  AddPhaserMapInfo,
  AddRpgPhaserMapHostOptions,
  PhaserMapRendererState,
} from "./types"

const TRACE_DEV = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV)

export class AddRpgPhaserMapHost {
  private readonly scene: AddRpgHexScene
  private readonly game: Phaser.Game

  constructor(parent: HTMLElement, options: AddRpgPhaserMapHostOptions = {}) {
    const preferredRenderer = preferredPhaserRenderer()
    try {
      const host = createPhaserGame(parent, options, preferredRenderer)
      this.scene = host.scene
      this.game = host.game
    } catch (error) {
      if (preferredRenderer === Phaser.CANVAS) throw error
      // Renderer telemetry reports the final backend; avoid surfacing a scary
      // WebGL stack when the Canvas fallback is expected to keep the map alive.
      const host = createPhaserGame(parent, options, Phaser.CANVAS)
      this.scene = host.scene
      this.game = host.game
    }
    this.publishMemoryProbe()
  }

  /** Dev-only: expose Phaser accumulator counts for the trace recorder's perf
   *  samples, via a window hook (so prod never imports the dev recorder). */
  private publishMemoryProbe(): void {
    if (!TRACE_DEV || typeof window === "undefined") return
    ;(window as unknown as { __ADD_MEM_PROBE?: () => Record<string, number> }).__ADD_MEM_PROBE =
      () => {
        const counts: Record<string, number> = {}
        try {
          counts.phaserObjects = this.scene.children.length
        } catch {
          /* scene torn down */
        }
        try {
          counts.phaserTweens = this.scene.tweens.getTweens().length
        } catch {
          /* tween manager unavailable */
        }
        return counts
      }
  }

  renderWorld(world: GameWorld): void {
    this.scene.renderWorld(world)
  }

  advanceTime(milliseconds = 16): void {
    this.scene.advanceTime(milliseconds)
  }

  zoomBy(factor: number): void {
    this.scene.zoomBy(factor)
  }

  resetCamera(): void {
    this.scene.resetCamera()
  }

  moveMainCharacter(direction: AddCharacterMoveDirection): Promise<boolean> {
    return this.scene.moveMainCharacter(direction)
  }

  selectCell(cell: string): boolean {
    return this.scene.selectCell(cell)
  }

  setTravelLocked(locked: boolean): void {
    this.scene.setTravelLocked(locked)
  }

  setShowTravelActionMarkers(show: boolean): void {
    this.scene.setShowTravelActionMarkers(show)
  }

  getInfo(): AddPhaserMapInfo {
    return this.scene.getInfo()
  }

  getRendererState(): PhaserMapRendererState {
    return this.scene.getRendererState()
  }

  /** Ease the camera to frame the Hero, Base, or survivor Cave. */
  focusOn(target: "hero" | "base" | "cave"): void {
    this.scene.focusOn(target)
  }

  destroy(): void {
    if (TRACE_DEV && typeof window !== "undefined") {
      delete (window as unknown as { __ADD_MEM_PROBE?: unknown }).__ADD_MEM_PROBE
    }
    this.game.destroy(true)
  }
}

function createPhaserGame(
  parent: HTMLElement,
  options: AddRpgPhaserMapHostOptions,
  rendererType: number,
): { readonly scene: AddRpgHexScene; readonly game: Phaser.Game } {
  const scene = new AddRpgHexScene(options)
  const game = new Phaser.Game({
    type: rendererType,
    parent,
    backgroundColor: "#e6dec2",
    transparent: true,
    width: parent.clientWidth || 720,
    height: parent.clientHeight || 520,
    render: {
      antialias: true,
      roundPixels: false,
      pixelArt: false,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      parent,
      width: parent.clientWidth || 720,
      height: parent.clientHeight || 520,
    },
    scene,
  })
  return { scene, game }
}

function preferredPhaserRenderer(): number {
  return canCreateWebGlContext() ? Phaser.WEBGL : Phaser.CANVAS
}

function canCreateWebGlContext(): boolean {
  if (typeof document === "undefined") return false
  const canvas = document.createElement("canvas")
  try {
    const context =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ??
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ??
      canvas.getContext("experimental-webgl", { failIfMajorPerformanceCaveat: false })
    return context !== null
  } catch {
    return false
  }
}
