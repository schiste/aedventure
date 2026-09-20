import type { CellCoord } from "@aedventure/game-topology"
import {
  STUDIO_DUNGEON_ENTRANCE,
  STUDIO_DUNGEON_ID,
  STUDIO_DUNGEON_MAP_ID,
} from "./studio"

// How a dungeon reveals its interior: "directional_fov" = the wall-occluded
// facing cone with remembered memory; "fully_lit" = no fog of war.
export type AddDungeonVisibilityPolicy = "directional_fov" | "fully_lit"

/**
 * Single source of truth for a dungeon's routing + presentation. Adding a new
 * dungeon is one entry here (plus its blueprint/map factory) — no edits to the
 * overworld link generation.
 */
export interface AddDungeonDefinition {
  readonly id: string
  readonly label: string
  readonly mapId: string
  readonly entryCoord?: CellCoord
  readonly visibilityPolicy: AddDungeonVisibilityPolicy
  /** Whether the dungeon is currently reachable from the overworld. */
  readonly unlocked: boolean
}

export const SURVIVOR_CAVE_DUNGEON_ID = "dungeon.survivor_cave"
export const SURVIVOR_CAVE_DUNGEON_MAP_ID = "add.rpg.dungeon.survivor-cave"

export const ADD_DUNGEON_REGISTRY: readonly AddDungeonDefinition[] = [
  {
    id: SURVIVOR_CAVE_DUNGEON_ID,
    label: "Survivor Cave",
    mapId: SURVIVOR_CAVE_DUNGEON_MAP_ID,
    entryCoord: { kind: "square", x: 2, y: 4 },
    visibilityPolicy: "directional_fov",
    unlocked: true,
  },
  {
    id: STUDIO_DUNGEON_ID,
    label: "The Studio",
    mapId: STUDIO_DUNGEON_MAP_ID,
    entryCoord: STUDIO_DUNGEON_ENTRANCE,
    visibilityPolicy: "directional_fov",
    unlocked: true,
  },
]

const REGISTRY_BY_ID = new Map(ADD_DUNGEON_REGISTRY.map((def) => [def.id, def]))
const REGISTRY_BY_MAP_ID = new Map(ADD_DUNGEON_REGISTRY.map((def) => [def.mapId, def]))

export function addDungeonById(id: string): AddDungeonDefinition | undefined {
  return REGISTRY_BY_ID.get(id)
}

export function addDungeonByMapId(mapId: string): AddDungeonDefinition | undefined {
  return REGISTRY_BY_MAP_ID.get(mapId)
}

/**
 * Registry entry for a dungeon id, falling back to a derived definition for an
 * unregistered id so a tile that references it still produces a usable link.
 */
export function resolveAddDungeon(id: string): AddDungeonDefinition {
  return (
    addDungeonById(id) ?? {
      id,
      label: titleCaseDungeonId(id),
      mapId: `add.rpg.dungeon.${id.replace(/^dungeon\./, "").replace(/_/g, "-")}`,
      visibilityPolicy: "directional_fov",
      unlocked: true,
    }
  )
}

function titleCaseDungeonId(id: string): string {
  return id
    .replace(/^dungeon\./, "")
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}
