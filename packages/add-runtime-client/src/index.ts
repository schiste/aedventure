import type { GameWorld } from "@aedventure/game-world"

export interface AddDomainBoundary {
  readonly source: "add-domain"
  readonly runtimeAuthority: "rust-wasm"
  readonly firstTargetApp: "apps/add-rpg"
}

export interface AddWorldProjection {
  readonly boundary: AddDomainBoundary
  readonly world: GameWorld
}

export const ADD_DOMAIN_BOUNDARY: AddDomainBoundary = {
  source: "add-domain",
  runtimeAuthority: "rust-wasm",
  firstTargetApp: "apps/add-rpg",
}

export * from "./runtime/client"
export * from "./runtime/inspection"
export * from "@aedventure/add-protocol"
export * from "@aedventure/add-content"
export * from "@aedventure/add-presentation"
export * from "./runtime/snapshot-delta"
export * from "./i18n"
export { EN_MESSAGES } from "./i18n/en"
