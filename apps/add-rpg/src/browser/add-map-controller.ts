import type { GameWorld } from "@aedventure/game-world"

import {
  AddRpgPhaserMapHost,
  type AddPhaserMapInfo,
  type AddRpgPhaserMapHostOptions,
  type AddCharacterMoveDirection,
  type PhaserMapRendererState,
} from "./phaser-add-map"
import { emptyMapInfo, emptyRendererState } from "./add-phaser/add-map-telemetry"

/**
 * Lifecycle seam for the ADD map renderer. The app owns domain decisions and
 * callbacks; this controller owns whether Phaser exists, how it is rendered,
 * and how callers safely inspect a not-yet-mounted map.
 */
export class AddMapController {
  private host: AddRpgPhaserMapHost | null = null

  get mounted(): boolean {
    return this.host !== null
  }

  mount(parent: HTMLElement, options: AddRpgPhaserMapHostOptions): void {
    this.host?.destroy()
    this.host = new AddRpgPhaserMapHost(parent, options)
  }

  renderWorld(world: GameWorld): void {
    this.host?.renderWorld(world)
  }

  advanceTime(milliseconds: number): void {
    this.host?.advanceTime(milliseconds)
  }

  zoomBy(factor: number): void {
    this.host?.zoomBy(factor)
  }

  resetCamera(): void {
    this.host?.resetCamera()
  }

  focusOn(target: "hero" | "base" | "cave"): void {
    this.host?.focusOn(target)
  }

  moveMainCharacter(direction: AddCharacterMoveDirection): Promise<boolean> {
    return this.host?.moveMainCharacter(direction) ?? Promise.resolve(false)
  }

  selectCell(cell: string): boolean {
    return this.host?.selectCell(cell) ?? false
  }

  setTravelLocked(locked: boolean): void {
    this.host?.setTravelLocked(locked)
  }

  setShowTravelActionMarkers(show: boolean): void {
    this.host?.setShowTravelActionMarkers(show)
  }

  getInfo(): AddPhaserMapInfo {
    return this.host?.getInfo() ?? emptyMapInfo()
  }

  getRendererState(): PhaserMapRendererState {
    return this.host?.getRendererState() ?? emptyRendererState()
  }

  destroy(): void {
    this.host?.destroy()
    this.host = null
  }
}
