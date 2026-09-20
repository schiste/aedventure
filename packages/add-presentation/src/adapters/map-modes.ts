import {
  createSquareCoord,
  type SquareCoord,
} from "@aedventure/game-topology"
import type {
  GameCellPlacement,
  GameEntity,
  GameInteraction,
  GameMap,
  GameWorld,
  GameZone,
} from "@aedventure/game-world"

import type { CatalogSnapshot, SimulationSnapshot } from "@aedventure/add-protocol"
import { addSnapshotToGameWorld } from "./snapshot-to-world"
import {
  addDungeonByMapId,
  SURVIVOR_CAVE_DUNGEON_MAP_ID,
} from "@aedventure/add-content"
import {
  studioDungeonMap,
  STUDIO_DUNGEON_MAP_ID,
} from "@aedventure/add-content"
import { addAreaByMapId, addAreaById, DEFAULT_AREA_MAP_ID } from "@aedventure/add-content"
import type { AddAreaEntrySide } from "@aedventure/add-content"
import { selectAddMapScaleForMode } from "./map-scale"

export type AddMapMode = "overworld_hex" | "dungeon_square" | "base_square" | "area_hex"

export const ADD_BASE_SQUARE_MAP_ID = "add.rpg.base.studio"

export interface AddMapModeOption {
  readonly id: AddMapMode
  readonly label: string
  readonly topology: "hex" | "square"
  readonly fixture: boolean
}

export const ADD_MAP_MODE_OPTIONS: readonly AddMapModeOption[] = [
  { id: "overworld_hex", label: "World", topology: "hex", fixture: false },
  { id: "area_hex", label: "Studio", topology: "hex", fixture: false },
  { id: "dungeon_square", label: "Cave", topology: "square", fixture: false },
  { id: "base_square", label: "Base", topology: "square", fixture: false },
]

export interface CreateAddWorldOptions {
  /** Which dungeon map to load in dungeon_square mode. Defaults to the Studio. */
  readonly dungeonMapId?: string
  /** Which area map to load in area_hex mode. Defaults to the Studio Grounds. */
  readonly areaMapId?: string
  /** World-side entry used to place the Hero on a side midpoint inside an area map. */
  readonly areaEntrySide?: AddAreaEntrySide | null
}

export function createAddWorldForMapMode(
  mode: AddMapMode,
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  options: CreateAddWorldOptions = {},
): GameWorld {
  const metersPerCell = selectAddMapScaleForMode(mode).metersPerCell
  if (mode === "overworld_hex") {
    return stampMapScale(
      addSnapshotToGameWorld(snapshot, catalog, {
        worldId: "add.rpg.live-world",
        mapId: "add.rpg.hex-overworld",
        hexRadius: 26,
      }),
      metersPerCell,
    )
  }

  const map =
    mode === "dungeon_square"
      ? dungeonMapForId(options.dungeonMapId ?? STUDIO_DUNGEON_MAP_ID, snapshot)
      : mode === "area_hex"
        ? areaMapForId(options.areaMapId, options.areaEntrySide ?? null)
        : baseSquareMap()
  return stampMapScale(
    {
      id: "add.rpg.live-world",
      activeMapId: map.id,
      maps: [map],
      metadata: {
        source: "add-runtime-square-map",
        mapMode: mode,
        runtimeAuthority: "rust-wasm",
        projectionOnly: true,
        fixture: false,
      },
    },
    metersPerCell,
  )
}

/** Stamp the real-world scale onto the active map's metadata so the renderer can
 * draw a scale bar without re-deriving the mode (the overworld map carries no
 * mapMode in its metadata). */
function stampMapScale(world: GameWorld, metersPerCell: number | null): GameWorld {
  if (metersPerCell == null) return world
  return {
    ...world,
    maps: world.maps.map((map) =>
      map.id === world.activeMapId
        ? { ...map, metadata: { ...map.metadata, metersPerCell } }
        : map,
    ),
  }
}

export function addMapModeLabel(mode: AddMapMode): string {
  return ADD_MAP_MODE_OPTIONS.find((option) => option.id === mode)?.label ?? mode
}

function areaMapForId(
  areaMapId: string | undefined,
  entrySide: AddAreaEntrySide | null,
): GameMap {
  const area =
    (areaMapId ? addAreaByMapId(areaMapId) ?? addAreaById(areaMapId) : undefined) ??
    addAreaByMapId(DEFAULT_AREA_MAP_ID)
  return (area ?? addAreaByMapId(DEFAULT_AREA_MAP_ID))!.build({ entrySide })
}

function dungeonMapForId(mapId: string, snapshot: SimulationSnapshot): GameMap {
  const registered = addDungeonByMapId(mapId)
  if (mapId === SURVIVOR_CAVE_DUNGEON_MAP_ID || registered?.mapId === SURVIVOR_CAVE_DUNGEON_MAP_ID) {
    return survivorCaveDungeonMap()
  }

  // The Studio is the canonical first dungeon; it reflects the restore state.
  // Unknown dungeon ids intentionally fall back to the Studio until their
  // blueprint is registered.
  const studio = studioDungeonMap(snapshot.base.studioRestored)
  return {
    ...studio,
    metadata: {
      ...studio.metadata,
      mapMode: "dungeon_square",
      fixture: false,
      gameplayReady: false,
    },
  }
}

function survivorCaveDungeonMap(): GameMap {
  const width = 14
  const height = 10
  const cells = squareCells(width, height, (coord) => {
    const wall =
      coord.x === 0 ||
      coord.y === 0 ||
      coord.x === width - 1 ||
      coord.y === height - 1 ||
      (coord.x === 6 && coord.y > 1 && coord.y < 7) ||
      (coord.y === 5 && coord.x > 2 && coord.x < 11)
    const doorway = (coord.x === 6 && coord.y === 4) || (coord.x === 9 && coord.y === 5)
    const blocked = wall && !doorway
    return {
      tokenId: blocked ? "add.dungeon.wall" : "add.dungeon.floor",
      blocked,
      metadata: {
        terrain: blocked ? "dungeon_wall" : "dungeon_floor",
        state: blocked ? "blocked" : "stabilized",
        feature:
          coord.x === 2 && coord.y === 4
            ? "dungeon_entrance"
            : coord.x === 11 && coord.y === 7
              ? "relic_door"
              : "none",
      },
    }
  })

  return squareMap({
    id: SURVIVOR_CAVE_DUNGEON_MAP_ID,
    label: "Survivor Cave",
    mode: "dungeon_square",
    width,
    height,
    cells,
    entities: [
      hero("add.entity.dungeon.hero-entry", "Hero", createSquareCoord(2, 4)),
      landmark(
        "add.entity.dungeon.entry",
        "Survivor Cave Mouth",
        createSquareCoord(2, 4),
        "survivor_cave_mouth",
      ),
      landmark("add.entity.dungeon.relic-door", "Relic Door", createSquareCoord(11, 7), "relic_door"),
      landmark("add.entity.dungeon.echo-crystal", "Echo Crystal", createSquareCoord(8, 3), "echo_crystal"),
    ],
    zones: [
      zone("add.zone.dungeon.entrance", "Dungeon Entry", [
        createSquareCoord(1, 3),
        createSquareCoord(2, 3),
        createSquareCoord(1, 4),
        createSquareCoord(2, 4),
      ]),
      zone("add.zone.dungeon.future-combat", "Future Encounter", [
        createSquareCoord(9, 6),
        createSquareCoord(10, 6),
        createSquareCoord(9, 7),
        createSquareCoord(10, 7),
      ]),
    ],
    gameplayReady: true,
  })
}

function baseSquareMap(): GameMap {
  const width = 12
  const height = 8
  const cells = squareCells(width, height, (coord) => {
    const wall = coord.x === 0 || coord.y === 0 || coord.x === width - 1 || coord.y === height - 1
    const blocked = wall && !(coord.x === 5 && coord.y === height - 1)
    const feature =
      coord.x === 5 && coord.y === 4
        ? "base_core"
        : coord.x === 5 && coord.y === 2
          ? "dungeon_entrance"
        : coord.x === 8 && coord.y === 3
          ? "workbench"
          : "none"
    return {
      tokenId: blocked ? "add.base.wall" : "add.base.floor",
      blocked,
      metadata: {
        terrain: blocked ? "base_wall" : "base_floor",
        state: blocked ? "blocked" : "stabilized",
        feature,
      },
    }
  })

  return squareMap({
    id: ADD_BASE_SQUARE_MAP_ID,
    label: "The Studio",
    mode: "base_square",
    width,
    height,
    cells,
    entities: [
      landmark("add.entity.base.core", "Base Core", createSquareCoord(5, 4), "base_core"),
      landmark(
        "add.entity.base.studio-dungeon-entrance",
        "Studio Dungeon Entrance",
        createSquareCoord(5, 2),
        "studio_dungeon_entrance",
      ),
      landmark("add.entity.base.workbench", "Workbench", createSquareCoord(8, 3), "workbench"),
      landmark("add.entity.base.exit", "World Exit", createSquareCoord(5, 6), "base_exit"),
    ],
    zones: [
      zone("add.zone.base.core", "Core Room", [
        createSquareCoord(4, 3),
        createSquareCoord(5, 3),
        createSquareCoord(6, 3),
        createSquareCoord(4, 4),
        createSquareCoord(5, 4),
        createSquareCoord(6, 4),
      ]),
      zone("add.zone.base.workshop", "Workshop", [
        createSquareCoord(8, 2),
        createSquareCoord(9, 2),
        createSquareCoord(8, 3),
        createSquareCoord(9, 3),
      ]),
      zone("add.zone.base.studio-dungeon-entrance", "Studio Dungeon Entrance", [
        createSquareCoord(4, 1),
        createSquareCoord(5, 1),
        createSquareCoord(6, 1),
        createSquareCoord(4, 2),
        createSquareCoord(5, 2),
        createSquareCoord(6, 2),
      ]),
    ],
    interactions: [
      {
        id: "add.interaction.base.enter-studio-dungeon",
        kind: "map_transition",
        action: "add.enter_dungeon",
        target: { kind: "map", id: STUDIO_DUNGEON_MAP_ID },
        label: "Enter The Studio Dungeon",
        requiredZoneId: "add.zone.base.studio-dungeon-entrance",
        enabled: true,
        metadata: {
          source: "add-runtime-square-map",
          targetMapMode: "dungeon_square",
          targetMapId: STUDIO_DUNGEON_MAP_ID,
        },
      },
    ],
  })
}

function squareMap(input: {
  readonly id: string
  readonly label: string
  readonly mode: AddMapMode
  readonly width: number
  readonly height: number
  readonly cells: readonly GameCellPlacement[]
  readonly entities: readonly GameEntity[]
  readonly zones: readonly GameZone[]
  readonly interactions?: readonly GameInteraction[]
  readonly gameplayReady?: boolean
}): GameMap {
  const gameplayReady = input.gameplayReady ?? false
  const interactions: readonly GameInteraction[] = [
    {
      id: `add.interaction.${input.mode}.map-objective`,
      kind: "map_objective",
      action: `add.map.${input.mode}.objective`,
      target: { kind: "map", id: input.id },
      label: gameplayReady ? "Dungeon objective" : "Preview only",
      enabled: gameplayReady,
      metadata: {
        source: "add-runtime-square-map",
        gameplayReady,
      },
    },
    ...(input.interactions ?? []),
  ]

  return {
    id: input.id,
    label: input.label,
    topology: {
      kind: "square",
      cellSize: 34,
      bounds: { width: input.width, height: input.height },
      neighborMode: "cardinal",
      distanceMetric: "manhattan",
    },
    layers: [
      {
        id: `${input.id}.terrain`,
        kind: "terrain",
        label: "Square map terrain",
        cells: input.cells,
      },
      {
        id: `${input.id}.collision`,
        kind: "collision",
        label: "Square map blockers",
        visible: false,
        cells: input.cells.filter((cell) => cell.blocked),
      },
    ],
    entities: input.entities,
    zones: input.zones,
    interactions,
    metadata: {
      source: "add-runtime-square-map",
      mapMode: input.mode,
      fixture: false,
      gameplayReady,
    },
  }
}

function squareCells(
  width: number,
  height: number,
  describe: (coord: SquareCoord) => Omit<GameCellPlacement, "coord">,
): readonly GameCellPlacement[] {
  const cells: GameCellPlacement[] = []
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const coord = createSquareCoord(x, y)
      cells.push({ coord, ...describe(coord) })
    }
  }
  return cells
}

function landmark(
  id: string,
  label: string,
  coord: SquareCoord,
  sourceId: string,
): GameEntity {
  return {
    id,
    kind: "landmark",
    label,
    coord,
    tags: ["add", "landmark", "square"],
    metadata: { sourceId },
  }
}

function hero(id: string, label: string, coord: SquareCoord): GameEntity {
  return {
    id,
    kind: "hero",
    label,
    coord,
    tags: ["add", "playable", "square"],
    metadata: { sourceId: "dungeon_entry" },
  }
}

function zone(id: string, label: string, cells: readonly SquareCoord[]): GameZone {
  return {
    id,
    kind: "map_zone",
    label,
    cells,
    metadata: {
      source: "add-runtime-square-map",
      gameplayReady: false,
    },
  }
}
