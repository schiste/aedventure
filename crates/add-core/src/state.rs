use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Deserializer, Serialize, Serializer};

use crate::game_data::{
    ROLE_CONSTRUCTION, ROLE_CRYSTAL_BASSLINE, ROLE_CRYSTAL_CHORUS, ROLE_CRYSTAL_HARMONICS,
    ROLE_FIRE_PIT, ROLE_SCAVENGE, ROLE_WATER, balance_snapshot, stations,
};
use crate::migrations::{CURRENT_CATALOG_VERSION, CURRENT_SCHEMA_VERSION, default_catalog_version};

pub const DEFAULT_BASE_SLOTS: u8 = 3;
pub const DEFAULT_TOTAL_CREW: u8 = 2;
pub const GRID_RADIUS: i8 = 6;
pub const BASE_Q: i8 = 0;
pub const BASE_R: i8 = 3;
pub const SURVIVOR_CAVE_Q: i8 = 6;
pub const SURVIVOR_CAVE_R: i8 = 0;
pub const REACH_OBJECTIVE_TARGET: u8 = 3;
pub const RECRUITMENT_RANGE_TILES: u8 = 3;

/// Initial seed/state for the sim's deterministic PRNG. A new game starts here;
/// the value evolves as draws are taken and persists in the save, so a reload
/// continues the same stream (deterministic + replayable).
pub const DEFAULT_RNG_SEED: u64 = 0x0ADD_5EED_2026;

/// serde default for [`GameState::rng_seed`] — old saves resume from the
/// default stream.
pub fn default_rng_seed() -> u64 {
    DEFAULT_RNG_SEED
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GameState {
    pub schema_version: u16,
    /// Identity of the content catalog this save was authored against. Defaults
    /// to the current catalog for saves written before the field existed.
    #[serde(default = "default_catalog_version")]
    pub catalog_version: u16,
    pub clock_seconds: f64,
    pub resources: ResourcePools,
    pub roster: RosterState,
    pub hero_progress: HeroProgressState,
    #[serde(default)]
    pub hero_survival: HeroSurvivalState,
    #[serde(default)]
    pub narrative: NarrativeState,
    pub crystal_circle: CrystalCircleState,
    pub processing: ProcessingState,
    #[serde(default)]
    pub expeditions: ExpeditionState,
    #[serde(default)]
    pub resonance: ResonanceState,
    pub base: BaseState,
    pub power: PowerState,
    pub stations: BTreeMap<String, StationState>,
    pub recruitment: RecruitmentState,
    pub bubble: BubbleState,
    pub objectives: ObjectiveState,
    #[serde(default)]
    pub discovered_cells: BTreeSet<HexCoordState>,
    #[serde(default)]
    pub hero_map: HexCoordState,
    pub hexes: Vec<HexState>,
    pub active_construction: Option<ConstructionJob>,
    pub active_world_action: Option<WorldAction>,
    pub notes: Vec<String>,
    /// Structured events produced by the command/tick just applied. Rebuilt
    /// every `apply` (ephemeral, not a rolling log like `notes`), so the
    /// snapshot carries exactly what happened this frame for the UI, audio, and
    /// telemetry to react to. Skipped on deserialize (saves never reland stale
    /// events) and stripped from exported saves.
    #[serde(default, skip_deserializing)]
    pub events: Vec<GameEvent>,
    /// State of the deterministic PRNG (splitmix64). Persisted so randomized
    /// outcomes (loot, combat) replay identically across save/reload.
    #[serde(default = "default_rng_seed", with = "u64_string")]
    pub rng_seed: u64,
    /// The in-progress auto-battler skirmish, if any. Ticks down over rounds and
    /// resolves to victory/retreat; persisted so offline catch-up finishes it.
    #[serde(default)]
    pub active_combat: Option<CombatJob>,
    /// Authoritative open/closed state for dungeon doors, keyed by
    /// `${dungeonId}:${x}:${y}`. A key present here means that door is open.
    #[serde(default)]
    pub open_doors: BTreeSet<String>,
    /// Perk ids the Hero has learned. Each costs one perk point (earned by
    /// leveling); their effects modify sim calculations.
    #[serde(default)]
    pub acquired_perks: BTreeSet<String>,
    /// Hero inventory: item id -> quantity (capped per item's `max_stack`).
    #[serde(default)]
    pub inventory: BTreeMap<String, u32>,
    /// Resolved per-location facts (looted containers, cleared creatures), keyed
    /// `${mapId}:${x}:${y}` like `open_doors`. A key present = that location is
    /// looted/cleared, so it stays so across re-entry and save/reload.
    #[serde(default)]
    pub cleared_locations: BTreeSet<String>,
    /// Items dropped on the ground, keyed `${mapId}:${x}:${y}` -> (item id ->
    /// quantity). Persists across re-entry and save/reload; picked back up by
    /// bumping the cell.
    #[serde(default)]
    pub dropped_items: BTreeMap<String, BTreeMap<String, u32>>,
    /// Sub-item fractional progress toward the next scavenged scrap unit.
    /// Internal; not persisted or surfaced.
    #[serde(skip)]
    pub scavenge_scrap_progress: f64,
}

mod u64_string {
    use super::*;

    pub fn serialize<S>(value: &u64, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&value.to_string())
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<u64, D::Error>
    where
        D: Deserializer<'de>,
    {
        #[derive(Deserialize)]
        #[serde(untagged)]
        enum U64StringOrNumber {
            String(String),
            Number(u64),
        }

        match U64StringOrNumber::deserialize(deserializer)? {
            U64StringOrNumber::String(value) => {
                value.parse::<u64>().map_err(serde::de::Error::custom)
            }
            U64StringOrNumber::Number(value) => Ok(value),
        }
    }
}

/// A structured thing that happened during the last applied command/tick.
///
/// This is the typed counterpart to the human-readable `notes` log: consumers
/// (UI moment driver, audio cues, telemetry) match on the variant instead of
/// sniffing note strings. Serialized onto the snapshot only — never persisted
/// (the field is `skip_deserializing` and stripped from exported saves), so the
/// enum carries owned runtime data and needs only `Serialize`.
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum GameEvent {
    /// A base construction project finished.
    ConstructionCompleted { option_id: String, label: String },
    /// A crystal/processing recipe finished.
    ProcessingCompleted { recipe_id: String, label: String },
    /// An expedition returned with its rewards.
    ExpeditionCompleted { target_id: String, label: String },
    /// A resonance recipe finished tuning.
    ResonanceCompleted { recipe_id: String, label: String },
    /// A hero world action (investigate/explore) finished.
    WorldActionCompleted { action_id: String, label: String },
    /// One or more recruits arrived from the Survivor Cave this frame.
    RecruitsArrived { count: u8 },
    /// A storylet became the active beat (fired its `on_activate`).
    BeatActivated { beat_id: String },
    /// The hero crossed the point of no return and is auto-returning.
    ForcedReturnTriggered,
    /// The hero finished recovering and can be reassigned.
    HeroRecovered,
    /// The bubble frontier collapsed before stabilizing.
    BubbleFrontierCollapsed,
    /// The Survivor Cave recruitment gate opened (reach objective met).
    RecruitmentGateOpened,
    /// An effect batch was rejected atomically because a cost could not be paid
    /// (nothing in the batch was applied).
    EffectRejected { reason: String },
    /// A Hero progression track leveled up this frame.
    HeroLeveledUp { track: String, level: u16 },
    /// An auto-battler skirmish finished. `outcome` is "victory" or "retreat".
    CombatResolved {
        creature_id: String,
        outcome: String,
    },
    /// A quest objective's conditions were met (rewards applied this frame).
    ObjectiveCompleted { objective_id: String },
    /// The runtime revealed the deterministic starting area for a new/reset run.
    StartingAreaDiscovered {
        center: HexCoordState,
        radius: u8,
        revealed: u16,
    },
}

/// One simulated round of an auto-battler skirmish, for the combat log.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CombatLogEntry {
    pub round: u16,
    pub hero_damage: f64,
    pub creature_damage: f64,
    pub hero_hp: f64,
    pub creature_hp: f64,
}

/// An in-progress skirmish. The Hero and creature trade blows once per round
/// (`round_seconds` apart); resolves when one side is downed. Persisted so an
/// offline gap finishes the fight on the next tick.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CombatJob {
    pub creature_id: String,
    pub creature_label: String,
    /// Location being cleared, so a win can mark it cleared + drop its loot.
    pub location_key: String,
    pub loot_item: Option<String>,
    pub loot_qty: u32,
    pub creature_hp: f64,
    pub creature_hp_max: f64,
    pub hero_hp: f64,
    pub hero_hp_max: f64,
    pub round: u16,
    /// Seconds remaining until the next round resolves.
    pub round_timer: f64,
    pub xp_reward: f64,
    pub threat: f64,
    pub log: Vec<CombatLogEntry>,
}

impl GameState {
    pub fn new() -> Self {
        let balance = balance_snapshot();
        Self {
            schema_version: CURRENT_SCHEMA_VERSION,
            catalog_version: CURRENT_CATALOG_VERSION,
            clock_seconds: 0.0,
            resources: ResourcePools {
                bassline: 0.0,
                bassline_cap: balance.crystal.base_bassline_cap,
                chorus: 0.0,
                chorus_cap: balance.crystal.base_chorus_cap,
                harmonics: 0.0,
                harmonics_cap: balance.crystal.base_harmonics_cap,
                stone: 0.0,
                stone_cap: 1000.0,
                base_stone_stock: balance.scavenge.base_stock_max,
                water: 0.0,
                water_cap: balance.water.water_cap,
                base_water_stock: balance.water.water_cap,
                vibes: 0.0,
                vibes_cap: 100.0,
                lifetime_generated: 0.0,
                lifetime_spent: 0.0,
            },
            roster: RosterState {
                hero_assigned: false,
                hero_role_id: ROLE_CRYSTAL_BASSLINE.to_string(),
                total_crew: DEFAULT_TOTAL_CREW,
                crew_by_role: BTreeMap::from([
                    (ROLE_CRYSTAL_BASSLINE.to_string(), 0),
                    (ROLE_CRYSTAL_CHORUS.to_string(), 0),
                    (ROLE_CRYSTAL_HARMONICS.to_string(), 0),
                    (ROLE_CONSTRUCTION.to_string(), 0),
                    (ROLE_FIRE_PIT.to_string(), 0),
                    (ROLE_SCAVENGE.to_string(), 0),
                    (ROLE_WATER.to_string(), 0),
                ]),
            },
            hero_progress: HeroProgressState::new(),
            hero_survival: HeroSurvivalState::new(),
            narrative: NarrativeState::new(),
            crystal_circle: CrystalCircleState {
                base_slots: DEFAULT_BASE_SLOTS,
                slot_capacity_level: 0,
                output_level: 0,
                storage_level: 0,
                field_polish_level: 0,
                removing_moss_unlocked: false,
                removing_moss_completed: false,
            },
            processing: ProcessingState::new(),
            expeditions: ExpeditionState::new(),
            resonance: ResonanceState::new(),
            base: BaseState::new(),
            power: PowerState::new(),
            stations: initial_station_states(),
            recruitment: RecruitmentState::new(),
            bubble: BubbleState::new(),
            objectives: ObjectiveState::new(),
            discovered_cells: BTreeSet::new(),
            hero_map: HexCoordState::survivor_cave(),
            hexes: initial_hexes(),
            active_construction: None,
            active_world_action: None,
            notes: vec![
                "Phase 0 runtime initialized.".to_string(),
                "Bassline, Chorus, and Harmonics now drive the base economy.".to_string(),
            ],
            events: Vec::new(),
            rng_seed: DEFAULT_RNG_SEED,
            active_combat: None,
            open_doors: BTreeSet::new(),
            acquired_perks: BTreeSet::new(),
            inventory: BTreeMap::new(),
            cleared_locations: BTreeSet::new(),
            dropped_items: BTreeMap::new(),
            scavenge_scrap_progress: 0.0,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "camelCase")]
pub struct HexCoordState {
    pub q: i8,
    pub r: i8,
}

impl HexCoordState {
    pub fn new(q: i8, r: i8) -> Self {
        Self { q, r }
    }

    pub fn base() -> Self {
        Self::new(BASE_Q, BASE_R)
    }

    pub fn survivor_cave() -> Self {
        Self::new(SURVIVOR_CAVE_Q, SURVIVOR_CAVE_R)
    }
}

impl Default for HexCoordState {
    fn default() -> Self {
        Self::survivor_cave()
    }
}

impl Default for GameState {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ResourcePools {
    pub bassline: f64,
    pub bassline_cap: f64,
    pub chorus: f64,
    pub chorus_cap: f64,
    pub harmonics: f64,
    pub harmonics_cap: f64,
    pub stone: f64,
    pub stone_cap: f64,
    pub base_stone_stock: f64,
    pub water: f64,
    pub water_cap: f64,
    pub base_water_stock: f64,
    pub vibes: f64,
    pub vibes_cap: f64,
    pub lifetime_generated: f64,
    pub lifetime_spent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RosterState {
    pub hero_assigned: bool,
    pub hero_role_id: String,
    pub total_crew: u8,
    pub crew_by_role: BTreeMap<String, u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HeroProgressState {
    pub drummer_level: u16,
    pub drummer_xp: f64,
    pub vocalist_level: u16,
    pub vocalist_xp: f64,
    pub synth_level: u16,
    pub synth_xp: f64,
}

impl HeroProgressState {
    pub fn new() -> Self {
        Self {
            drummer_level: 0,
            drummer_xp: 0.0,
            vocalist_level: 0,
            vocalist_xp: 0.0,
            synth_level: 0,
            synth_xp: 0.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HeroSurvivalState {
    #[serde(default)]
    pub sustain: u16,
    #[serde(default)]
    pub viral_load_ratio: f64,
    #[serde(default)]
    pub location: HeroLocationState,
    #[serde(default)]
    pub required_time_to_reenter_bubble_seconds: f64,
    #[serde(default)]
    pub return_to_studio_seconds: f64,
    #[serde(default = "default_point_of_no_return_ratio")]
    pub point_of_no_return_ratio: f64,
    #[serde(
        default = "default_seconds_until_forced_return",
        deserialize_with = "deserialize_seconds_until_forced_return"
    )]
    pub seconds_until_forced_return: f64,
    #[serde(default)]
    pub echo_scars: u16,
    #[serde(default)]
    pub debuff_tier: u8,
    #[serde(default = "default_multiplier")]
    pub work_efficiency_multiplier: f64,
    #[serde(default = "default_multiplier")]
    pub movement_speed_multiplier: f64,
    #[serde(default = "default_multiplier")]
    pub encounter_rate_multiplier: f64,
    #[serde(default = "WoundTrackState::hero_baseline")]
    pub wounds: WoundTrackState,
    #[serde(default)]
    pub forced_return: Option<ForcedReturnState>,
}

impl HeroSurvivalState {
    pub fn new() -> Self {
        Self {
            sustain: 0,
            viral_load_ratio: 0.0,
            location: HeroLocationState::Studio,
            required_time_to_reenter_bubble_seconds: 0.0,
            return_to_studio_seconds: 0.0,
            point_of_no_return_ratio: 1.0,
            seconds_until_forced_return: default_seconds_until_forced_return(),
            echo_scars: 0,
            debuff_tier: 0,
            work_efficiency_multiplier: 1.0,
            movement_speed_multiplier: 1.0,
            encounter_rate_multiplier: 1.0,
            wounds: WoundTrackState::hero_baseline(),
            forced_return: None,
        }
    }
}

impl Default for HeroSurvivalState {
    fn default() -> Self {
        Self::new()
    }
}

fn default_point_of_no_return_ratio() -> f64 {
    1.0
}

fn default_seconds_until_forced_return() -> f64 {
    999_999.0
}

fn default_multiplier() -> f64 {
    1.0
}

fn deserialize_seconds_until_forced_return<'de, D>(deserializer: D) -> Result<f64, D::Error>
where
    D: Deserializer<'de>,
{
    Ok(Option::<f64>::deserialize(deserializer)?
        .unwrap_or_else(default_seconds_until_forced_return))
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum HeroLocationState {
    Studio,
    Bubble,
    OutsideBubble,
}

impl Default for HeroLocationState {
    fn default() -> Self {
        Self::Studio
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WoundTrackState {
    pub major_wounds_max: u8,
    pub light_wounds_per_major: u8,
    pub wound_units_taken: u16,
}

impl WoundTrackState {
    pub fn hero_baseline() -> Self {
        Self {
            major_wounds_max: 3,
            light_wounds_per_major: 6,
            wound_units_taken: 0,
        }
    }

    pub fn total_light_wound_capacity(&self) -> u16 {
        u16::from(self.major_wounds_max) * u16::from(self.light_wounds_per_major)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ForcedReturnState {
    pub phase: ForcedReturnPhase,
    pub total_seconds: f64,
    pub remaining_seconds: f64,
    pub viral_load_ratio_on_trigger: f64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ForcedReturnPhase {
    ReturnToBubbleEdge,
    ReturnToStudio,
    RecoverAtStudio,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NarrativeState {
    pub active_beat_id: Option<String>,
    pub completed_beat_ids: Vec<String>,
    pub choice_by_beat: BTreeMap<String, String>,
    /// Arbitrary author-defined story variables (trust, suspicion, "met X" …).
    /// The quality-based-narrative lever: storylet conditions read these and
    /// effects write them, so new story state needs no Rust struct fields.
    #[serde(default)]
    pub qualities: BTreeMap<String, i64>,
    /// Beats whose `on_activate` effects have already fired this activation. A
    /// repeatable beat is removed once its preconditions lapse, so it re-fires
    /// the next time it triggers.
    #[serde(default)]
    pub activated_beat_ids: BTreeSet<String>,
    /// The ink scene the browser renders: lines, tags and presented choices.
    ///
    /// Derived, never a source of truth. Ink's own serialized state is
    /// deliberately *not* persisted: bladeink's `save_state` is not stable
    /// across a save/reload boundary (its thread counters diverge), which would
    /// break `command_log_replay_is_deterministic_across_save_reload`. The
    /// scene is fully determined by the active beat and `choice_by_beat`, so
    /// the runtime rebuilds it by replaying instead of storing it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ink_scene: Option<crate::narrative::InkScene>,
    /// Append-only history of consequential acts. The source of truth for
    /// standing: scores are folded from this on read, never stored, so a
    /// tuning change takes effect on an existing save without rewriting it.
    /// Distinct from `GameState.events`, which is cleared every command.
    #[serde(default)]
    pub log: crate::narrative::NarrativeLog,
    /// Arcs the log currently recognises. Derived from the log, carried on the
    /// snapshot so dialogue and the browser can name what the player built
    /// without either re-running the sifter.
    #[serde(default)]
    pub arcs: crate::narrative::SiftResult,
}

impl NarrativeState {
    pub fn new() -> Self {
        Self {
            active_beat_id: None,
            completed_beat_ids: Vec::new(),
            choice_by_beat: BTreeMap::new(),
            qualities: BTreeMap::new(),
            activated_beat_ids: BTreeSet::new(),
            ink_scene: None,
            log: crate::narrative::NarrativeLog::default(),
            arcs: crate::narrative::SiftResult::default(),
        }
    }
}

impl Default for NarrativeState {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CrystalCircleState {
    pub base_slots: u8,
    pub slot_capacity_level: u8,
    pub output_level: u8,
    pub storage_level: u8,
    pub field_polish_level: u8,
    pub removing_moss_unlocked: bool,
    pub removing_moss_completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProcessingState {
    pub resonance_calibration_level: u8,
    pub mix_calibration_level: u8,
    pub workshop_tooling_level: u8,
    pub workshop_water_condensers_level: u8,
    pub research_chorus_routing_level: u8,
    pub research_harmonic_study_level: u8,
    pub active_jobs: BTreeMap<String, ProcessingJob>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExpeditionState {
    pub active_jobs: Vec<ExpeditionJob>,
    pub completed_reports: Vec<ExpeditionReport>,
    pub next_job_id: u32,
    pub total_wounds: u16,
    pub total_clues: u16,
    pub total_dungeon_leads: u16,
}

impl ExpeditionState {
    pub fn new() -> Self {
        Self {
            active_jobs: Vec::new(),
            completed_reports: Vec::new(),
            next_job_id: 1,
            total_wounds: 0,
            total_clues: 0,
            total_dungeon_leads: 0,
        }
    }
}

impl Default for ExpeditionState {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExpeditionJob {
    pub id: u32,
    pub target_id: String,
    pub assigned_crew: u16,
    pub duration_seconds: f64,
    pub remaining_seconds: f64,
    pub risk: ExpeditionRiskState,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExpeditionReport {
    pub id: u32,
    pub target_id: String,
    pub assigned_crew: u16,
    pub duration_seconds: f64,
    pub risk: ExpeditionRiskState,
    pub stone_gained: f64,
    pub water_gained: f64,
    pub vibes_gained: f64,
    #[serde(default)]
    pub echo_shards_gained: u16,
    #[serde(default)]
    pub signal_scrap_gained: u16,
    #[serde(default)]
    pub harmonic_residue_gained: u16,
    pub wounds: u16,
    pub clues: u16,
    pub dungeon_leads: u16,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ExpeditionRiskState {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ResonanceState {
    pub materials: ResonanceMaterialState,
    pub tuning: CrystalTuningState,
    pub expedition_support_level: u16,
    pub active_jobs: BTreeMap<String, ResonanceJob>,
    pub completed_reports: Vec<ResonanceReport>,
    pub station_specializations: BTreeMap<String, StationSpecializationPathState>,
}

impl ResonanceState {
    pub fn new() -> Self {
        Self {
            materials: ResonanceMaterialState::new(),
            tuning: CrystalTuningState::new(),
            expedition_support_level: 0,
            active_jobs: BTreeMap::new(),
            completed_reports: Vec::new(),
            station_specializations: BTreeMap::new(),
        }
    }
}

impl Default for ResonanceState {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ResonanceMaterialState {
    pub echo_shards: u16,
    pub signal_scrap: u16,
    pub harmonic_residue: u16,
}

impl ResonanceMaterialState {
    pub fn new() -> Self {
        Self {
            echo_shards: 0,
            signal_scrap: 0,
            harmonic_residue: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CrystalTuningState {
    pub bassline_level: u16,
    pub chorus_level: u16,
    pub harmonics_level: u16,
}

impl CrystalTuningState {
    pub fn new() -> Self {
        Self {
            bassline_level: 0,
            chorus_level: 0,
            harmonics_level: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ResonanceJob {
    pub recipe_id: String,
    pub station_id: String,
    pub total_work_seconds: f64,
    pub remaining_work_seconds: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ResonanceReport {
    pub recipe_id: String,
    pub station_id: String,
    pub tuning_track: Option<CrystalTuningTrackState>,
    pub tuning_amount: u16,
    pub expedition_support_amount: u16,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CrystalTuningTrackState {
    Bassline,
    Chorus,
    Harmonics,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StationSpecializationPathState {
    Balanced,
    Conversion,
    Field,
    Extraction,
}

impl ProcessingState {
    pub fn new() -> Self {
        Self {
            resonance_calibration_level: 0,
            mix_calibration_level: 0,
            workshop_tooling_level: 0,
            workshop_water_condensers_level: 0,
            research_chorus_routing_level: 0,
            research_harmonic_study_level: 0,
            active_jobs: BTreeMap::new(),
        }
    }
}

impl CrystalCircleState {
    pub fn total_slots(&self) -> u8 {
        self.base_slots.saturating_add(self.slot_capacity_level)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BaseState {
    pub studio_restored: bool,
    pub studio_restore_unlocked: bool,
    pub bunks_capacity: u16,
    pub occupant_count: u16,
    pub free_bunks: i16,
    pub missing_bunks: u16,
    pub fire_pit_built: bool,
    pub resonance_chamber_built: bool,
    pub mix_console_built: bool,
    pub workshop_built: bool,
    pub research_booth_built: bool,
    pub tutorial_investigated: bool,
    pub tutorial_explored: bool,
    pub water_collection_unlocked: bool,
    pub skins: u16,
    pub overcrowded_seconds: f64,
    pub bad_vibes_multiplier: f64,
    pub effective_bad_vibes_rate: f64,
    pub crew_efficiency_multiplier: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PowerState {
    pub requested_upkeep_per_second: f64,
    pub active_upkeep_per_second: f64,
    pub life_support_upkeep_per_second: f64,
    pub brownout_active: bool,
    pub brownout_severity: f64,
    pub active_staff_count: u8,
    pub harmonics_tier: u8,
    pub bassline_generation_per_second: f64,
    pub chorus_generation_per_second: f64,
    pub harmonics_generation_per_second: f64,
    pub harmonics_efficiency_multiplier: f64,
    pub bassline_output_multiplier: f64,
    pub chorus_output_multiplier: f64,
    pub harmonics_output_multiplier: f64,
    pub field_multiplier: f64,
}

impl PowerState {
    pub fn new() -> Self {
        Self {
            requested_upkeep_per_second: 0.0,
            active_upkeep_per_second: 0.0,
            life_support_upkeep_per_second: 0.0,
            brownout_active: false,
            brownout_severity: 0.0,
            active_staff_count: 0,
            harmonics_tier: 0,
            bassline_generation_per_second: 0.0,
            chorus_generation_per_second: 0.0,
            harmonics_generation_per_second: 0.0,
            harmonics_efficiency_multiplier: 1.0,
            bassline_output_multiplier: 1.0,
            chorus_output_multiplier: 1.0,
            harmonics_output_multiplier: 1.0,
            field_multiplier: 1.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StationState {
    pub requested_enabled: bool,
    pub is_powered: bool,
    pub power_order: u32,
}

impl BaseState {
    pub fn new() -> Self {
        Self {
            studio_restored: false,
            studio_restore_unlocked: false,
            bunks_capacity: 0,
            occupant_count: 1,
            free_bunks: -1,
            missing_bunks: 1,
            fire_pit_built: false,
            resonance_chamber_built: false,
            mix_console_built: false,
            workshop_built: false,
            research_booth_built: false,
            tutorial_investigated: false,
            tutorial_explored: false,
            water_collection_unlocked: true,
            skins: 0,
            overcrowded_seconds: 0.0,
            bad_vibes_multiplier: 1.0,
            effective_bad_vibes_rate: 0.0,
            crew_efficiency_multiplier: 1.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RecruitmentState {
    pub total_recruited_this_run: u16,
    pub instant_recruits_used: u16,
    pub pending_recruits: Vec<RecruitTravel>,
    pub next_recruit_cost: f64,
}

impl RecruitmentState {
    pub fn new() -> Self {
        Self {
            total_recruited_this_run: 0,
            instant_recruits_used: 0,
            pending_recruits: Vec::new(),
            next_recruit_cost: 30.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RecruitTravel {
    pub total_seconds: f64,
    pub remaining_seconds: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BubbleState {
    pub stabilized_ring: u8,
    pub frontier_progress: f64,
    pub target_ring: u8,
    pub target_frontier_progress: f64,
    pub hold_seconds_remaining: f64,
    pub degrade_seconds_accumulated: f64,
    pub stabilized_hexes: u16,
    pub reach_from_base: u8,
    pub field_budget: f64,
    pub active_coverage_cost: f64,
    pub next_ring_cost: f64,
}

impl BubbleState {
    pub fn new() -> Self {
        Self {
            stabilized_ring: 0,
            frontier_progress: 0.0,
            target_ring: 0,
            target_frontier_progress: 0.0,
            hold_seconds_remaining: 10.0,
            degrade_seconds_accumulated: 0.0,
            stabilized_hexes: 1,
            reach_from_base: 0,
            field_budget: 0.0,
            active_coverage_cost: 0.0,
            next_ring_cost: 6.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ObjectiveState {
    pub reach_objective_target: u8,
    pub reach_objective_met: bool,
    pub survivor_cave_distance: u8,
    pub recruitment_range_tiles: u8,
    pub recruitment_enabled: bool,
    pub survivor_cave_in_bubble: bool,
    /// The current quest objective (lowest-sequence incomplete one), or None when
    /// all are done. Advanced by the data-driven objective selector.
    #[serde(default)]
    pub active_objective_id: Option<String>,
    /// Objectives whose conditions have been met, in completion order.
    #[serde(default)]
    pub completed_objective_ids: Vec<String>,
}

impl ObjectiveState {
    pub fn new() -> Self {
        Self {
            reach_objective_target: REACH_OBJECTIVE_TARGET,
            reach_objective_met: false,
            survivor_cave_distance: cube_distance(BASE_Q, BASE_R, SURVIVOR_CAVE_Q, SURVIVOR_CAVE_R),
            recruitment_range_tiles: RECRUITMENT_RANGE_TILES,
            recruitment_enabled: false,
            survivor_cave_in_bubble: false,
            active_objective_id: None,
            completed_objective_ids: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HexState {
    pub q: i8,
    pub r: i8,
    pub distance: u8,
    pub tile_id: String,
    pub state: HexVisualState,
    pub progress: f64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum HexVisualState {
    Inactive,
    Converting,
    Stabilized,
    Blocked,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ConstructionJob {
    pub option_id: String,
    pub resource_id: Option<String>,
    pub total_work_seconds: f64,
    pub remaining_work_seconds: f64,
    pub total_cost: f64,
    pub spent_cost: f64,
    pub per_worker_cost_per_second: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProcessingJob {
    pub recipe_id: String,
    pub station_id: String,
    pub total_work_seconds: f64,
    pub remaining_work_seconds: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WorldAction {
    pub action_id: String,
    pub total_seconds: f64,
    pub remaining_seconds: f64,
    pub hero_assigned_before: bool,
    pub hero_role_id_before: String,
}

fn initial_hexes() -> Vec<HexState> {
    // Generation is delegated to the data-driven overworld map (already sorted
    // by distance,q,r). Blocked cells fall out of the map's `is_blocker`, so the
    // visual state is no longer special-cased to the mountain-wall tile.
    crate::game_data::OVERWORLD_MAP
        .generated_cells()
        .into_iter()
        .map(|generated| HexState {
            q: generated.q,
            r: generated.r,
            distance: generated.distance,
            tile_id: generated.cell.tile_id.to_string(),
            state: if generated.distance == 0 {
                HexVisualState::Stabilized
            } else if generated.cell.is_blocker {
                HexVisualState::Blocked
            } else {
                HexVisualState::Inactive
            },
            progress: if generated.distance == 0 { 1.0 } else { 0.0 },
        })
        .collect()
}

fn initial_station_states() -> BTreeMap<String, StationState> {
    stations()
        .iter()
        .map(|station| {
            (
                station.id.to_string(),
                StationState {
                    requested_enabled: station.starts_requested,
                    is_powered: station.chorus_upkeep_per_second <= 0.0,
                    power_order: u32::from(station.ui_order),
                },
            )
        })
        .collect()
}

pub fn initial_discovered_cells() -> BTreeSet<HexCoordState> {
    let cave = HexCoordState::survivor_cave();
    crate::game_data::OVERWORLD_MAP
        .generated_cells()
        .into_iter()
        .filter(|generated| {
            !generated.cell.is_blocker
                && cube_distance(cave.q, cave.r, generated.q, generated.r) <= 1
        })
        .map(|generated| HexCoordState::new(generated.q, generated.r))
        .collect()
}

fn cube_distance(q1: i8, r1: i8, q2: i8, r2: i8) -> u8 {
    let dq = q1 - q2;
    let dr = r1 - r2;
    dq.abs().max(dr.abs()).max((-(q1 + r1) + (q2 + r2)).abs()) as u8
}
