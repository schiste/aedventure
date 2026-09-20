import type { TileDef } from "@aedventure/add-protocol"

// Authored content: the tile catalog (source of truth). codegen -> Rust `const TILES`.
// Impedance values match the TERRAIN_*_IMPEDANCE constants in the crate.
export const TILES: readonly TileDef[] = [
  { id: "tile.base_core", schemaId: "tile.base_core", label: "Base Core", terrain: "plains", feature: "base", impedance: 1.0, isBlocker: false, tags: ["base", "sanctuary", "construction_anchor"], floraIds: [], structureIds: ["structure.crystal_circle", "structure.base"], dungeonIds: [], areaIds: ["area.studio_grounds"], buildingCapacity: 3 },
  { id: "tile.plains_open", schemaId: "tile.plains_open", label: "Open Plains", terrain: "plains", feature: "none", impedance: 1.0, isBlocker: false, tags: ["open_ground"], floraIds: [], structureIds: [], dungeonIds: [], areaIds: [], buildingCapacity: 1 },
  { id: "tile.river_shallows", schemaId: "tile.river_shallows", label: "River Shallows", terrain: "river", feature: "none", impedance: 0.35, isBlocker: false, tags: ["water_source", "easy_propagation"], floraIds: ["flora.reeds"], structureIds: [], dungeonIds: [], areaIds: [], buildingCapacity: 0 },
  { id: "tile.scrub_patch", schemaId: "tile.scrub_patch", label: "Scrub Patch", terrain: "scrub", feature: "none", impedance: 1.6, isBlocker: false, tags: ["brush", "harvestable"], floraIds: ["flora.scrub"], structureIds: [], dungeonIds: [], areaIds: [], buildingCapacity: 1 },
  { id: "tile.ridge_line", schemaId: "tile.ridge_line", label: "Ridge Line", terrain: "ridge", feature: "none", impedance: 2.4, isBlocker: false, tags: ["elevated", "high_impedance"], floraIds: [], structureIds: [], dungeonIds: [], areaIds: [], buildingCapacity: 0 },
  { id: "tile.mountain_wall", schemaId: "tile.mountain_wall", label: "Mountain Wall", terrain: "mountain", feature: "none", impedance: 99.0, isBlocker: true, tags: ["blocker", "wall"], floraIds: [], structureIds: [], dungeonIds: [], areaIds: [], buildingCapacity: 0 },
  { id: "tile.survivor_cave", schemaId: "tile.survivor_cave", label: "Survivor Cave", terrain: "plains", feature: "survivor_cave", impedance: 1.0, isBlocker: false, tags: ["landmark", "recruitment_source"], floraIds: [], structureIds: ["structure.cave"], dungeonIds: ["dungeon.survivor_cave"], areaIds: [], buildingCapacity: 0 },
]
