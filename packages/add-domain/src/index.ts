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
export * from "./runtime/snapshot-delta"
export * from "./i18n"
export { EN_MESSAGES } from "./i18n/en"
export * from "./adapters/add-ids"
export * from "./adapters/available-commands-selectors"
export * from "./adapters/base-management-selectors"
export * from "./adapters/catalog-selectors"
export * from "./adapters/command-mapping"
export * from "./adapters/dungeon-doors"
export * from "./adapters/dungeon-fov"
export * from "./adapters/dungeon-locations"
export * from "./adapters/discovery-selectors"
export * from "./adapters/dungeon-objectives"
export * from "./adapters/first-playable-script"
export * from "./adapters/inventory-selectors"
export * from "./adapters/loot-selectors"
export * from "./adapters/map-scale"
export * from "./adapters/map-modes"
export * from "./adapters/map-presentation"
export * from "./adapters/offline-return-selectors"
export * from "./adapters/perk-selectors"
export * from "./adapters/renderer-policies"
export * from "./adapters/snapshot-to-world"
export * from "./adapters/story-progression-selectors"
export * from "./adapters/story-moment-selectors"
export * from "./adapters/story-content-browser-selectors"
export * from "./adapters/story-state-readers"
export * from "./adapters/tile-detail"
export * from "./adapters/ui-selectors"
export * from "./adapters/visibility-selectors"
export * from "./adapters/world-time"
