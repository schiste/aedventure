import type { GameMap } from "@aedventure/game-world"
import type { BuildAreaMapOptions } from "./build-area-map"

import {
  STUDIO_GROUNDS_AREA_ID,
  STUDIO_GROUNDS_AREA_MAP_ID,
  studioGroundsAreaMap,
} from "./studio-grounds"

export type AddAreaVisibilityPolicy = "directional_fov" | "fully_lit"

// Single source of truth for an area's routing + presentation (mirrors the
// dungeon registry). Adding an area is one entry here + its build factory.
export interface AddAreaDefinition {
  readonly id: string
  readonly label: string
  readonly mapId: string
  readonly visibilityPolicy: AddAreaVisibilityPolicy
  readonly build: (options?: BuildAreaMapOptions) => GameMap
}

export const ADD_AREA_REGISTRY: readonly AddAreaDefinition[] = [
  {
    id: STUDIO_GROUNDS_AREA_ID,
    label: "Studio Grounds",
    mapId: STUDIO_GROUNDS_AREA_MAP_ID,
    visibilityPolicy: "fully_lit",
    build: studioGroundsAreaMap,
  },
]

const BY_ID = new Map(ADD_AREA_REGISTRY.map((def) => [def.id, def]))
const BY_MAP_ID = new Map(ADD_AREA_REGISTRY.map((def) => [def.mapId, def]))

export function addAreaById(id: string): AddAreaDefinition | undefined {
  return BY_ID.get(id)
}

export function addAreaByMapId(mapId: string): AddAreaDefinition | undefined {
  return BY_MAP_ID.get(mapId)
}

export const DEFAULT_AREA_MAP_ID = STUDIO_GROUNDS_AREA_MAP_ID
