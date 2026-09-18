# Locations Bible

> **The Geography of Silence**
>
> **Related:** [timeline.md](../timeline.md) | [the-truth.md](../the-truth.md) | [thesaurus.md](../thesaurus.md)

---

## Overview

AD&D takes place in the **Touraine region** of France, approximately 200-250km southwest of Paris. The game world is centered on two key locations connected by the Bresme river valley:

| Location | Type | Distance from Tours |
|----------|------|---------------------|
| **Studio Echo** (Hero Base) | Former recording studio, rural Pernay | ~20km NW |
| **Les Grottes de la Bresme** (Survivors Cave) | Troglodyte cave network, Saint-Etienne-de-Chigny | ~12km W |

---

## Regional Context

The Loire Valley — specifically the **Gatine Tourangelle** plateau and the **tuffeau limestone** river valleys — provides the perfect setting for AD&D:

- **Tuffeau limestone** caves used for centuries as wine cellars, mushroom farms, and even dwellings
- **Troglodyte heritage** — people have lived in carved-out caves here since medieval times
- **Rural isolation** — small communes of 1,000-2,000 people surrounded by farmland and forest
- **Proximity to Tours** — regional capital, now a Silent Zone ruin

---

## Folder Structure

```
locations/
├── README.md (this file — world scale, hex mapping, OSM source)
└── touraine/
    ├── README.md (regional overview, real-world geographic data, hex assignments)
    ├── studio_echo.md (Hero Base — hex 0,0)
    ├── les_grottes_de_la_bresme.md (Survivors Cave — hex 6,0)
    ├── tours_ruins.md (dead city — planned)
    ├── pernay.md (Hero Base commune — planned)
    └── saint_etienne_de_chigny.md (Survivors Cave commune — planned)
```

---

## World Scale & Game Mechanics

The game world maps real geography to a hex grid with consistent scale rules. These parameters are authoritative and shared between lore, mechanics, and code.

> **Cross-references:** [mechanics/specifications.md](../../legacy/add/mechanics/specifications.md) sections 2.1 (world scale) and 3.4.1 (crew intake) | `crates/core/src/state.rs` (grid constants) | `crates/core/src/game_data.rs` (`SurvivalBalance`, `RecruitmentBalance`)

### Hex Grid Scale

| Parameter | Value | Code Reference |
|-----------|-------|----------------|
| **1 hex tile** | **4 km** (center-to-center) | `specifications.md:251` |
| **1 real second** | **1 in-world hour** | `specifications.md:252` |
| **Grid radius** | **6 rings** (19x19 hex grid, 127 tiles) | `state.rs: GRID_RADIUS = 6` |
| **Hex layout** | Pointy-top axial coordinates (q, r) | `state.rs: HexState` |
| **Base location** | **(0, 0)** | Origin of hex grid |

### Survival Parameters (Lore-Mechanical Bridge)

| Parameter | Value | Real-World Meaning | Code Reference |
|-----------|-------|-------------------|----------------|
| **Hero survival outside bubble** | 24s (= 24 in-world hours) | Resilient physiology | `game_data.rs: hero_time_seconds_0_to_1` |
| **Normal human survival outside bubble** | 4s (= 4 in-world hours) | ~4 hours to fatal viral load | `game_data.rs: normal_human_time_seconds_0_to_1` |
| **Recovery time (full viral load → zero)** | 240s (= 10 in-world days) | Slow recovery inside bubble | `game_data.rs: recovery_time_seconds_1_to_0` |
| **Plains travel time** | 1s/tile (= 1 hour/4km) | Normal walking pace | `specifications.md:256` |

### Recruitment Pipeline (Bubble → Cave → Crew)

| Parameter | Value | Rationale | Code Reference |
|-----------|-------|-----------|----------------|
| **Survivor Cave distance** | **6 tiles** (24 km) | Real distance Pernay → Saint-Etienne-de-Chigny | `state.rs: SURVIVOR_CAVE_Q = 6, SURVIVOR_CAVE_R = 0` |
| **Recruitment range** | **3 tiles** | Survivors can walk 3 tiles (3 hours) before the 4-hour lethal window | `state.rs: RECRUITMENT_RANGE_TILES = 3` |
| **Reach objective (first milestone)** | **3 rings** | Bubble must reach ring 3 to open recruitment gate | `state.rs: REACH_OBJECTIVE_TARGET = 3` |
| **Recruit travel time** | **6s** (normal) / **1s** (instant stock) | Journey through safe bubble corridor | `game_data.rs: recruit_travel_seconds` |
| **Tile feature** | `SurvivorCave` | Placed at (6, 0) on the hex grid | `game_data.rs: TILE_SURVIVOR_CAVE` |

**The coherence chain:** 24 km real distance / 4 km per tile = 6 tiles. 4-hour lethal window / 1 hour per tile = 3 tiles max traverse. 6 - 3 = 3, which is exactly `REACH_OBJECTIVE_TARGET`. The real-world geography drives the game balance.

---

## Canon Geography

### Key Locations (with Hex Coordinates)

| Location | Hex (q, r) | Type | Real Coordinates | Tile ID |
|----------|------------|------|-----------------|---------|
| **Studio Echo** (Hero Base) | **(0, 0)** | Settlement / Crystal site | ~47.40°N, 0.65°E (near Pernay) | `tile.base_core` |
| **Les Grottes de la Bresme** (Survivors Cave) | **(6, 0)** | Underground settlement | ~47.38°N, 0.42°E (Saint-Etienne-de-Chigny) | `tile.survivor_cave` |
| **Tours** (Dead City) | Beyond grid | Silent Zone ruins | 47.39°N, 0.69°E | Not on Phase 0 map |

### Distance Matrix

| From / To | Studio Echo | Grottes de la Bresme | Tours (ruins) |
|-----------|-------------|----------------------|---------------|
| **Studio Echo** | — | 22 km / **6 tiles** / 6s travel | 20 km / ~5 tiles |
| **Grottes de la Bresme** | 22 km / **6 tiles** / 6s travel | — | 12 km / ~3 tiles |
| **Tours** | 20 km / ~5 tiles | 12 km / ~3 tiles | — |

### Key Routes

| Route | Distance | Hex Path | Terrain | Risk Level |
|-------|----------|----------|---------|------------|
| **The Bresme Path** | ~22 km (6 tiles) | (0,0) → (6,0) due east | River valley, plains | Medium |
| **The Plateau Road** | ~18 km (5 tiles) | Direct overland | Gatine Tourangelle scrub/forest | Exposed, high |
| **The Loire Approach** | ~30 km (8 tiles) | Southern arc via Loire valley | Open farmland, urban ruins | Very high (Tours danger zone) |

---

## Why Touraine?

The location was chosen for deep lore reasons:

1. **Henri Marchand's grandparents** were from Saint-Etienne-de-Chigny — he knew the troglodyte caves from childhood summers
2. **The tuffeau limestone** is soft enough to carve but stable enough for deep structures
3. **The rural isolation** meant fewer people, less noise, better survival chances
4. **The existing cave infrastructure** — wine caves, mushroom farms — provided ready-made shelter

---

## OSM Data Source

The game map is grounded in real OpenStreetMap geographic data. A prototype hex database (`tours_region.db`) was generated by `osm_to_hex.py` with the following parameters:

| Parameter | Value |
|-----------|-------|
| **Source** | OpenStreetMap |
| **Center** | 47.58°N, 0.70°E (prototype; canonical center should be ~47.40°N, 0.65°E for Studio Echo) |
| **Hex size** | 4,000 m (matches game scale: 1 tile = 4 km) |
| **Generator** | `osm_to_hex.py` (v4) |

The database schema supports: `hexes` (terrain, elevation, features), `pois` (points of interest by category/type), `roads` (named routes with geometry), `waterways` (rivers/streams with geometry), `edges` (hex-to-hex connectivity), `hex_state` / `poi_state` (discovery tracking for gameplay).

See [touraine/README.md](touraine/README.md) for the structured real-world geographic data extracted from this source.

---

*Last updated: 2026-03-15*
