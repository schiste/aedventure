import {
  compileDungeon,
  dungeonEntranceCoord,
  type DungeonBlueprint,
  type DungeonCellSpec,
  type DungeonRoomSpec,
} from "@aedventure/game-dungeon"
import { resolveEncounterSpawns } from "@aedventure/game-content"
import type { CellCoord } from "@aedventure/game-topology"
import type { GameMap } from "@aedventure/game-world"

import { encounterTableById } from "../content/encounter-tables"

// The Studio is the first concrete dungeon: the ground floor of an old Champagne
// dairy-farm main building. Its layout is authored once as a reusable blueprint
// (see @aedventure/game-dungeon) and compiled to a neutral GameMap. Both the
// restored and ruined variants share the SAME footprint/grid and differ only by
// legend (clean fittings vs. rubble), so the dungeon reflects `studio_restored`.

export const STUDIO_DUNGEON_ID = "dungeon.studio"
export const STUDIO_DUNGEON_MAP_ID = "add.rpg.dungeon.studio"
const OVERWORLD_MAP_ID = "add.rpg.hex-overworld"

const EXIT_LINK = {
  idSuffix: "overworld",
  kind: "map" as const,
  targetMapId: OVERWORLD_MAP_ID,
  label: "Back to the overworld",
  targetCoord: { kind: "hex" as const, q: 0, r: 0 },
}

// Shared structure (identical in both variants).
const WALL: DungeonCellSpec = { kind: "wall" }
const FLOOR: DungeonCellSpec = { kind: "floor" }
const ENTRANCE: DungeonCellSpec = {
  kind: "floor",
  entrance: true,
  feature: "entrance",
  link: EXIT_LINK,
}
const ARCHWAY: DungeonCellSpec = { kind: "floor", feature: "archway" }
// A door: passable floor whose open/closed state is authoritative (Rust snapshot
// `openDoors`). `applyDungeonDoorStates` flips `blocked` from the live state, which
// gates both movement and the FOV cone. Starts closed.
const DOOR: DungeonCellSpec = { kind: "floor", feature: "door", metadata: { door: true } }
const STAIRS_UP: DungeonCellSpec = {
  kind: "floor",
  feature: "stairs",
  entity: { idSuffix: "stairs-up", label: "Up to the Loft", kind: "stairs", sourceId: "stairs_up", tags: ["interior"] },
}
const STAIRS_DOWN: DungeonCellSpec = {
  kind: "floor",
  feature: "stairs",
  entity: { idSuffix: "stairs-down", label: "Down to the Cellars", kind: "stairs", sourceId: "stairs_down", tags: ["interior"] },
}
const RUBBLE_WALL: DungeonCellSpec = {
  kind: "wall",
  feature: "rubble",
  tokenId: "add.dungeon.rubble",
}
// Creatures the Studio's encounter table can place (id -> presentation + the
// loot table rolled when cleared).
const STUDIO_CREATURES: Record<
  string,
  { readonly label: string; readonly size: number; readonly lootTable: string }
> = {
  rat: { label: "Rat", size: 0.35, lootTable: "loot.vermin" },
  giant_rat: { label: "Giant Rat", size: 0.6, lootTable: "loot.giant_vermin" },
}

// A sub-tile creature cell for a given creature id. compileDungeon gives each
// occurrence a unique id. `feature: "creature"` + a `lootTable` make it a
// bump-to-clear target whose drop is resolved from data (see loot-selectors.ts).
function creatureCell(creatureId: string): DungeonCellSpec {
  const creature =
    STUDIO_CREATURES[creatureId] ?? { label: creatureId, size: 0.4, lootTable: "loot.vermin" }
  return {
    kind: "floor",
    feature: "creature",
    entity: {
      idSuffix: creatureId,
      label: creature.label,
      kind: "creature",
      visualFootprint: { unit: "cell", width: creature.size, height: creature.size },
      sourceId: creatureId,
    },
    metadata: { lootTable: creature.lootTable },
  }
}

// A bump-to-loot container. Renders as a landmark; clearing it rolls its loot
// table once and persists (cleared_locations).
function containerCell(idSuffix: string, label: string, lootTable: string): DungeonCellSpec {
  return {
    kind: "floor",
    feature: "container",
    entity: {
      idSuffix,
      label,
      kind: "container",
      visualFootprint: { unit: "cell", width: 0.55, height: 0.55 },
      sourceId: "container",
    },
    metadata: { lootTable },
  }
}

// The ruined Studio's three vermin spawn slots are filled deterministically from
// the studio_vermin encounter table (3:1 rats:giant -> rat, rat, giant rat).
const STUDIO_VERMIN_TABLE = encounterTableById("encounter.studio_vermin") ?? {
  id: "encounter.studio_vermin",
  entries: [],
}
const STUDIO_VERMIN: readonly DungeonCellSpec[] = resolveEncounterSpawns(STUDIO_VERMIN_TABLE, 3).map(
  (spawn) => creatureCell(spawn.creatureId),
)

// Ground-floor plan. N is "up" (the way the Hero enters). Legend:
//   # wall   . floor   > entrance(foyer)   = archway   ^ up stairs   v down stairs
//   1/2/3 studio fittings   K kitchen hearth   D dining table
//   r rat (ruined only)     ~ collapsed spot (floor when restored, rubble when ruined)
const BUILDING_GRID = [
  "######################",
  "#.....#..#......u....#",
  "#..3..+..#.....K.....#",
  "#.....#..#..r....~...#",
  "#.....#..#...........#",
  "#######..######+######",
  "#.....#..#..c........#",
  "#..2..+..#...~.......#",
  "#..s..#..#.....D.....#",
  "#.~...#..#........t..#",
  "#######..#...........#",
  "#.....#..#####.=.#####",
  "#..1..+..#.^v........#",
  "#...~.#..+...........#",
  "##########...........#",
  "###############>######",
]

const STUDIO_ROOMS: readonly DungeonRoomSpec[] = [
  { id: `${STUDIO_DUNGEON_MAP_ID}.foyer`, label: "Foyer", kind: "room", rect: { x: 10, y: 12, width: 11, height: 3 } },
  { id: `${STUDIO_DUNGEON_MAP_ID}.dining-room`, label: "Dining Room", kind: "room", rect: { x: 10, y: 6, width: 11, height: 5 } },
  { id: `${STUDIO_DUNGEON_MAP_ID}.kitchen`, label: "Kitchen", kind: "room", rect: { x: 10, y: 1, width: 11, height: 4 } },
  { id: `${STUDIO_DUNGEON_MAP_ID}.corridor`, label: "Corridor", kind: "hall", rect: { x: 7, y: 1, width: 2, height: 13 } },
  { id: `${STUDIO_DUNGEON_MAP_ID}.studio-1`, label: "Recording Studio 1", kind: "room", rect: { x: 1, y: 11, width: 5, height: 3 } },
  { id: `${STUDIO_DUNGEON_MAP_ID}.studio-2`, label: "Recording Studio 2", kind: "room", rect: { x: 1, y: 6, width: 5, height: 4 } },
  { id: `${STUDIO_DUNGEON_MAP_ID}.studio-3`, label: "Recording Studio 3", kind: "room", rect: { x: 1, y: 1, width: 5, height: 4 } },
]

const RESTORED_LEGEND: Readonly<Record<string, DungeonCellSpec>> = {
  "#": WALL,
  ".": FLOOR,
  ">": ENTRANCE,
  "=": ARCHWAY,
  "+": DOOR,
  "^": STAIRS_UP,
  v: STAIRS_DOWN,
  r: FLOOR,
  s: FLOOR,
  t: FLOOR,
  c: FLOOR,
  u: FLOOR,
  "~": FLOOR,
  "1": {
    kind: "floor",
    feature: "console",
    entity: { idSuffix: "mixing-console", label: "Mixing Console", sourceId: "mixing_console" },
  },
  "2": {
    kind: "floor",
    feature: "crystal",
    entity: { idSuffix: "echo-crystal", label: "Echo Crystal", sourceId: "echo_crystal" },
  },
  "3": {
    kind: "floor",
    feature: "bassline",
    entity: { idSuffix: "crystal-bassline", label: "Crystal Bassline", sourceId: "crystal_bassline" },
  },
  K: {
    kind: "floor",
    feature: "hearth",
    entity: { idSuffix: "kitchen-hearth", label: "Kitchen Hearth", sourceId: "kitchen_hearth" },
  },
  D: {
    kind: "floor",
    feature: "table",
    entity: { idSuffix: "banquet-table", label: "Banquet Table", sourceId: "banquet_table" },
  },
}

const RUINED_LEGEND: Readonly<Record<string, DungeonCellSpec>> = {
  "#": WALL,
  ".": FLOOR,
  ">": ENTRANCE,
  "=": ARCHWAY,
  "+": DOOR,
  "^": STAIRS_UP,
  v: STAIRS_DOWN,
  r: STUDIO_VERMIN[0],
  s: STUDIO_VERMIN[1],
  t: STUDIO_VERMIN[2],
  c: containerCell("supply-crate", "Supply Crate", "loot.supply_crate"),
  u: containerCell("larder-cupboard", "Larder Cupboard", "loot.larder"),
  "~": RUBBLE_WALL,
  "1": {
    kind: "floor",
    feature: "rubble",
    entity: { idSuffix: "collapsed-console", label: "Collapsed Console", sourceId: "collapsed_console" },
  },
  "2": {
    kind: "floor",
    feature: "rubble",
    entity: { idSuffix: "cracked-crystal", label: "Cracked Echo Crystal", sourceId: "echo_crystal" },
  },
  "3": {
    kind: "floor",
    feature: "rubble",
    entity: { idSuffix: "silent-bassline", label: "Silent Bassline", sourceId: "crystal_bassline" },
  },
  K: {
    kind: "floor",
    feature: "rubble",
    entity: { idSuffix: "cold-hearth", label: "Cold Hearth", sourceId: "kitchen_hearth" },
  },
  D: {
    kind: "floor",
    feature: "rubble",
    entity: { idSuffix: "broken-table", label: "Broken Table", sourceId: "banquet_table" },
  },
}

const STUDIO_RESTORED_BLUEPRINT: DungeonBlueprint = {
  id: STUDIO_DUNGEON_MAP_ID,
  label: "The Studio",
  metadata: { theme: "studio", studioState: "restored" },
  entryFacing: "up",
  grid: BUILDING_GRID,
  legend: RESTORED_LEGEND,
  rooms: STUDIO_ROOMS,
}

const STUDIO_RUINED_BLUEPRINT: DungeonBlueprint = {
  id: STUDIO_DUNGEON_MAP_ID,
  label: "The Studio",
  metadata: { theme: "studio", studioState: "ruined" },
  entryFacing: "up",
  grid: BUILDING_GRID,
  legend: RUINED_LEGEND,
  rooms: STUDIO_ROOMS,
}

export function studioDungeonBlueprint(restored: boolean): DungeonBlueprint {
  return restored ? STUDIO_RESTORED_BLUEPRINT : STUDIO_RUINED_BLUEPRINT
}

export function studioDungeonMap(restored: boolean): GameMap {
  return compileDungeon(studioDungeonBlueprint(restored))
}

export const STUDIO_DUNGEON_ENTRANCE: CellCoord =
  dungeonEntranceCoord(STUDIO_RESTORED_BLUEPRINT) ?? { kind: "square", x: 15, y: 15 }
