//! Neutral, genre-agnostic hex-map topology.
//!
//! A [`MapDefinition`] is *data*: a disk radius, a base cell, named landmarks,
//! and ordered terrain regions. [`MapDefinition::cell_at`] resolves a single
//! [`MapCell`] (tile id + terrain profile) for any coordinate, so tile identity
//! and terrain stay one source of truth instead of two parallel match ladders.
//!
//! Nothing here is ADD-specific — the ADD overworld is one `MapDefinition`
//! constant (`game_data::OVERWORLD_MAP`); a different game (or test) supplies a
//! different definition and reuses the same generation and resolution code.

use crate::game_data::{TerrainProfile, TerrainSnapshot};

/// Inclusive axial bounds. Use [`i8::MIN`]/[`i8::MAX`] for an open side.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AxialBounds {
    pub q_min: i8,
    pub q_max: i8,
    pub r_min: i8,
    pub r_max: i8,
}

impl AxialBounds {
    pub const fn contains(&self, q: i8, r: i8) -> bool {
        q >= self.q_min && q <= self.q_max && r >= self.r_min && r <= self.r_max
    }
}

/// The resolved facts of a single cell: which tile sits here and how terrain
/// behaves. Unifies what used to be split across `tile_id_for` (tile identity)
/// and `terrain_profile_for` (movement/terrain).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MapCell {
    pub tile_id: &'static str,
    pub terrain: TerrainSnapshot,
    pub impedance: f64,
    pub is_blocker: bool,
}

impl MapCell {
    pub const fn terrain_profile(&self) -> TerrainProfile {
        TerrainProfile {
            terrain: self.terrain,
            impedance: self.impedance,
            is_blocker: self.is_blocker,
        }
    }
}

/// A named point of interest placed at a fixed coordinate (base, cave, …).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Landmark {
    pub key: &'static str,
    pub q: i8,
    pub r: i8,
    pub cell: MapCell,
}

/// A rectangular axial region painting a terrain. Regions are matched in order;
/// the first containing region wins (so author specific regions before broad).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TerrainRegion {
    pub bounds: AxialBounds,
    pub cell: MapCell,
}

/// A complete hex map as data: a disk of `radius`, a base at the origin,
/// landmarks, and ordered terrain regions over a default fill.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MapDefinition {
    /// Disk radius (rings out from the origin).
    pub radius: i8,
    /// The origin cell (distance 0).
    pub base: MapCell,
    /// Fixed points of interest, looked up by exact coordinate.
    pub landmarks: &'static [Landmark],
    /// Ordered terrain regions; first match wins.
    pub regions: &'static [TerrainRegion],
    /// Fill for any cell matched by no landmark or region.
    pub default: MapCell,
}

impl MapDefinition {
    /// Resolve the cell at `(q, r)`. `distance` is the cube distance from the
    /// origin (passed in to avoid recomputing where the caller already has it).
    /// Resolution order: base (origin) → landmark → region → default.
    pub fn cell_at(&self, q: i8, r: i8, distance: u8) -> MapCell {
        if distance == 0 {
            return self.base;
        }
        if let Some(landmark) = self.landmark_at(q, r) {
            return landmark.cell;
        }
        for region in self.regions {
            if region.bounds.contains(q, r) {
                return region.cell;
            }
        }
        self.default
    }

    /// The landmark exactly at `(q, r)`, if any.
    pub fn landmark_at(&self, q: i8, r: i8) -> Option<&Landmark> {
        self.landmarks
            .iter()
            .find(|landmark| landmark.q == q && landmark.r == r)
    }

    /// The landmark with `key`, if any.
    pub fn landmark(&self, key: &str) -> Option<&Landmark> {
        self.landmarks.iter().find(|landmark| landmark.key == key)
    }

    /// Every cell of the disk, resolved, sorted by `(distance, q, r)`.
    ///
    /// This is the generic generation step: callers (e.g. `initial_hexes`) map
    /// each entry into their own cell representation. Reused unchanged by any
    /// `MapDefinition`, which is what makes the topology genre-neutral.
    pub fn generated_cells(&self) -> Vec<GeneratedCell> {
        let radius = self.radius;
        let mut cells = Vec::new();
        for q in -radius..=radius {
            let r_lo = (-radius).max(-q - radius);
            let r_hi = radius.min(-q + radius);
            for r in r_lo..=r_hi {
                let distance = axial_distance(0, 0, q, r);
                cells.push(GeneratedCell {
                    q,
                    r,
                    distance,
                    cell: self.cell_at(q, r, distance),
                });
            }
        }
        cells.sort_by_key(|generated| (generated.distance, generated.q, generated.r));
        cells
    }
}

/// One coordinate of a generated map plus its resolved [`MapCell`].
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct GeneratedCell {
    pub q: i8,
    pub r: i8,
    pub distance: u8,
    pub cell: MapCell,
}

/// Cube distance between two axial coordinates.
pub fn axial_distance(q1: i8, r1: i8, q2: i8, r2: i8) -> u8 {
    let dq = q1 - q2;
    let dr = r1 - r2;
    dq.abs().max(dr.abs()).max((-(q1 + r1) + (q2 + r2)).abs()) as u8
}

#[cfg(test)]
mod tests {
    use super::*;

    // A second, deliberately different map proves the generation + resolution
    // code is generic and not wired to the ADD overworld.
    const TEST_BASE: MapCell = MapCell {
        tile_id: "test.base",
        terrain: TerrainSnapshot::Plains,
        impedance: 1.0,
        is_blocker: false,
    };
    const TEST_DEFAULT: MapCell = MapCell {
        tile_id: "test.grass",
        terrain: TerrainSnapshot::Plains,
        impedance: 1.0,
        is_blocker: false,
    };
    const TEST_WALL: MapCell = MapCell {
        tile_id: "test.wall",
        terrain: TerrainSnapshot::Mountain,
        impedance: 99.0,
        is_blocker: true,
    };
    const TEST_LANDMARKS: &[Landmark] = &[Landmark {
        key: "outpost",
        q: 2,
        r: -1,
        cell: MapCell {
            tile_id: "test.outpost",
            terrain: TerrainSnapshot::Plains,
            impedance: 1.0,
            is_blocker: false,
        },
    }];
    const TEST_REGIONS: &[TerrainRegion] = &[TerrainRegion {
        bounds: AxialBounds {
            q_min: i8::MIN,
            q_max: -2,
            r_min: i8::MIN,
            r_max: i8::MAX,
        },
        cell: TEST_WALL,
    }];
    const TEST_MAP: MapDefinition = MapDefinition {
        radius: 3,
        base: TEST_BASE,
        landmarks: TEST_LANDMARKS,
        regions: TEST_REGIONS,
        default: TEST_DEFAULT,
    };

    #[test]
    fn generates_a_disk_of_the_expected_size() {
        // A hex disk of radius R has 3*R*(R+1)+1 cells.
        let cells = TEST_MAP.generated_cells();
        assert_eq!(cells.len(), 3 * 3 * (3 + 1) + 1);
        // Sorted base-first.
        assert_eq!(cells[0].distance, 0);
        assert_eq!(cells[0].cell.tile_id, "test.base");
    }

    #[test]
    fn resolves_landmark_region_and_default() {
        // Landmark wins over region/default.
        assert_eq!(TEST_MAP.cell_at(2, -1, 2).tile_id, "test.outpost");
        // Region paints the far-left columns as wall.
        let wall = TEST_MAP.cell_at(-3, 1, 3);
        assert_eq!(wall.tile_id, "test.wall");
        assert!(wall.is_blocker);
        // Everything else is the default fill.
        assert_eq!(TEST_MAP.cell_at(1, 1, 2).tile_id, "test.grass");
    }

    #[test]
    fn landmark_lookup_by_key() {
        let outpost = TEST_MAP.landmark("outpost").expect("outpost exists");
        assert_eq!((outpost.q, outpost.r), (2, -1));
        assert!(TEST_MAP.landmark("missing").is_none());
    }
}
