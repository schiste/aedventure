use serde::Serialize;

use crate::topology::{AxialBounds, Landmark, MapCell, MapDefinition, TerrainRegion};

mod catalog;
use catalog::{
    BALANCE, CONSTRUCTION_OPTIONS, CONTENT_CATALOG_VERSION as GENERATED_CONTENT_CATALOG_VERSION,
    CONTENT_SAVE_SCHEMA_VERSION as GENERATED_CONTENT_SAVE_SCHEMA_VERSION,
    CONTENT_SCHEMA_VERSION as GENERATED_CONTENT_SCHEMA_VERSION, CREATURES, ENTITY_SCHEMAS,
    EXPEDITION_TARGETS, FLAGS, FLORA, ITEMS, OBJECTIVES, PERKS, PROCESSING_RECIPES,
    RESONANCE_RECIPES, RESOURCES, ROLES, STATIONS, STORY_BEATS, STRUCTURES, TILES, UI_ELEMENTS,
    WORLD_ACTIONS,
};

/// Authored content contract mirrored from `content-version.ts` by codegen.
pub const CONTENT_SCHEMA_VERSION: u16 = GENERATED_CONTENT_SCHEMA_VERSION;
pub const CONTENT_CATALOG_VERSION: u16 = GENERATED_CONTENT_CATALOG_VERSION;
pub const CONTENT_SAVE_SCHEMA_VERSION: u16 = GENERATED_CONTENT_SAVE_SCHEMA_VERSION;

pub const RESOURCE_BASSLINE: &str = "resource.bassline";
pub const RESOURCE_CHORUS: &str = "resource.chorus";
pub const RESOURCE_HARMONICS: &str = "resource.harmonics";
pub const RESOURCE_STONE: &str = "resource.stone";
pub const RESOURCE_WATER: &str = "resource.water";
pub const RESOURCE_VIBES: &str = "resource.vibes";
pub const COST_ITEM_SKIN: &str = "cost.skin";
pub const RESONANCE_MATERIAL_ECHO_SHARDS: &str = "echo_shards";
pub const RESONANCE_MATERIAL_SIGNAL_SCRAP: &str = "signal_scrap";
pub const RESONANCE_MATERIAL_HARMONIC_RESIDUE: &str = "harmonic_residue";

pub const FLAG_BASE_STUDIO_RESTORE_UNLOCKED: &str = "base.studio_restore_unlocked";
pub const FLAG_BASE_STUDIO_RESTORED: &str = "base.studio_restored";
pub const FLAG_BASE_FIRE_PIT_BUILT: &str = "base.fire_pit_built";
pub const FLAG_BASE_RESONANCE_CHAMBER_BUILT: &str = "base.resonance_chamber_built";
pub const FLAG_BASE_MIX_CONSOLE_BUILT: &str = "base.mix_console_built";
pub const FLAG_BASE_WORKSHOP_BUILT: &str = "base.workshop_built";
pub const FLAG_BASE_RESEARCH_BOOTH_BUILT: &str = "base.research_booth_built";
pub const FLAG_BASE_TUTORIAL_INVESTIGATED: &str = "base.tutorial_investigated";
pub const FLAG_BASE_TUTORIAL_EXPLORED: &str = "base.tutorial_explored";
pub const FLAG_BASE_WATER_COLLECTION_UNLOCKED: &str = "base.water_collection_unlocked";
pub const FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED: &str = "crystal.removing_moss_unlocked";
pub const FLAG_CRYSTAL_REMOVING_MOSS_COMPLETED: &str = "crystal.removing_moss_completed";
pub const FLAG_HERO_OUTSIDE_BUBBLE: &str = "hero.outside_bubble";
pub const FLAG_HERO_FORCED_RETURN_ACTIVE: &str = "hero.forced_return_active";
pub const FLAG_HERO_RECOVERING_AT_STUDIO: &str = "hero.recovering_at_studio";

pub const ROLE_CRYSTAL_BASSLINE: &str = "role.crystal_bassline";
pub const ROLE_CRYSTAL_CHORUS: &str = "role.crystal_chorus";
pub const ROLE_CRYSTAL_HARMONICS: &str = "role.crystal_harmonics";
pub const ROLE_CONSTRUCTION: &str = "role.construction";
pub const ROLE_FIRE_PIT: &str = "role.fire_pit";
pub const ROLE_SCAVENGE: &str = "role.scavenge";
pub const ROLE_WATER: &str = "role.water";

pub const CONSTRUCTION_SLOT_CAPACITY: &str = "construction.slot_capacity";
pub const CONSTRUCTION_OUTPUT: &str = "construction.output";
pub const CONSTRUCTION_STORAGE: &str = "construction.storage";
pub const CONSTRUCTION_REMOVING_MOSS: &str = "construction.removing_moss";
pub const CONSTRUCTION_POLISH_FIELD: &str = "construction.polish_field";
pub const PROJECT_RESTORE_STUDIO: &str = "project.restore_studio";
pub const PROJECT_BUILD_FIRE_PIT: &str = "project.build_fire_pit";
pub const PROJECT_BUILD_RESONANCE_CHAMBER: &str = "project.build_resonance_chamber";
pub const PROJECT_BUILD_MIX_CONSOLE: &str = "project.build_mix_console";
pub const PROJECT_BUILD_WORKSHOP: &str = "project.build_workshop";
pub const PROJECT_BUILD_RESEARCH_BOOTH: &str = "project.build_research_booth";
pub const PROJECT_EXPAND_BUNKS: &str = "project.expand_bunks";
pub const PROJECT_SAFE_WATER_SYSTEMS: &str = "project.safe_water_systems";
pub const PROJECT_EXPEDITION_STAGING: &str = "project.expedition_staging";
pub const PROJECT_PREPARE_LOUDSPEAKERS: &str = "project.prepare_loudspeakers";
pub const EXPEDITION_LOCAL_SCAVENGE_SWEEP: &str = "expedition.local_scavenge_sweep";
pub const EXPEDITION_SURVIVOR_CAVE_WATCH: &str = "expedition.survivor_cave_watch";
pub const EXPEDITION_FAR_RUINS_PROBE: &str = "expedition.far_ruins_probe";
pub const RESONANCE_RECIPE_BASSLINE_OVERTONE: &str = "resonance.recipe.bassline_overtone";
pub const RESONANCE_RECIPE_CHORUS_CARRIER: &str = "resonance.recipe.chorus_carrier";
pub const RESONANCE_RECIPE_HARMONIC_LATTICE: &str = "resonance.recipe.harmonic_lattice";
pub const RESONANCE_RECIPE_FIELD_ATTUNEMENT: &str = "resonance.recipe.field_attunement";
pub const RECIPE_RESONANCE_FIELD_CALIBRATION: &str = "recipe.resonance_field_calibration";
pub const RECIPE_MIX_SIGNAL_BALANCING: &str = "recipe.mix_signal_balancing";
pub const RECIPE_WORKSHOP_BUILDER_TOOLS: &str = "recipe.workshop_builder_tools";
pub const RECIPE_WORKSHOP_WATER_CONDENSERS: &str = "recipe.workshop_water_condensers";
pub const RECIPE_RESEARCH_CHORUS_ROUTING: &str = "recipe.research_chorus_routing";
pub const RECIPE_RESEARCH_HARMONIC_STUDY: &str = "recipe.research_harmonic_study";

pub const WORLD_ACTION_INVESTIGATE_BASE: &str = "world_action.investigate_base";
pub const WORLD_ACTION_EXPLORE_BASE: &str = "world_action.explore_base";

pub const STORY_BEAT_ROAD_TO_BASE: &str = "story.beat.road_to_base";
pub const STORY_BEAT_FIRST_GLIMPSE: &str = "story.beat.first_glimpse";
pub const STORY_BEAT_ENTER_THE_BUBBLE: &str = "story.beat.enter_the_bubble";
pub const STORY_BEAT_INVESTIGATE_BASE: &str = "story.beat.investigate_base";
pub const STORY_BEAT_EXPLORE_BASE: &str = "story.beat.explore_base";
pub const STORY_BEAT_RESTORE_STUDIO: &str = "story.beat.restore_studio";
pub const STORY_BEAT_BUILD_FIRE_PIT: &str = "story.beat.build_fire_pit";
pub const STORY_BEAT_REACH_SURVIVOR_CAVE: &str = "story.beat.reach_survivor_cave";
pub const STORY_BEAT_FIRST_RECRUIT: &str = "story.beat.first_recruit";
pub const STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL: &str = "story.beat.await_survivor_arrival";
pub const STORY_BEAT_STABILIZE_BASE: &str = "story.beat.stabilize_base";
pub const STORY_BEAT_HERO_EXPOSED: &str = "story.beat.hero_exposed";

pub const TILE_BASE_CORE: &str = "tile.base_core";
pub const TILE_PLAINS_OPEN: &str = "tile.plains_open";
pub const TILE_RIVER_SHALLOWS: &str = "tile.river_shallows";
pub const TILE_SCRUB_PATCH: &str = "tile.scrub_patch";
pub const TILE_RIDGE_LINE: &str = "tile.ridge_line";
pub const TILE_MOUNTAIN_WALL: &str = "tile.mountain_wall";
pub const TILE_SURVIVOR_CAVE: &str = "tile.survivor_cave";

pub const DUNGEON_SURVIVOR_CAVE: &str = "dungeon.survivor_cave";
pub const DUNGEON_STUDIO: &str = "dungeon.studio";

pub const AREA_STUDIO_GROUNDS: &str = "area.studio_grounds";

pub const FLORA_REEDS: &str = "flora.reeds";
pub const FLORA_SCRUB: &str = "flora.scrub";

pub const STRUCTURE_CRYSTAL_CIRCLE: &str = "structure.crystal_circle";
pub const STRUCTURE_BASE: &str = "structure.base";
pub const STRUCTURE_CAVE: &str = "structure.cave";

pub const STATION_CRYSTAL_CIRCLE: &str = "station.crystal_circle";
pub const STATION_FIRE_PIT: &str = "station.fire_pit";
pub const STATION_RESONANCE_CHAMBER: &str = "station.resonance_chamber";
pub const STATION_MIX_CONSOLE: &str = "station.mix_console";
pub const STATION_WORKSHOP: &str = "station.workshop";
pub const STATION_RESEARCH_BOOTH: &str = "station.research_booth";

pub const UI_PANEL_POWER: &str = "ui.panel.power";
pub const UI_PANEL_CRYSTAL: &str = "ui.panel.crystal";
pub const UI_PANEL_NARRATIVE: &str = "ui.panel.narrative";
pub const UI_PANEL_HERO: &str = "ui.panel.hero";
pub const UI_PANEL_MAP: &str = "ui.panel.map";
pub const UI_PANEL_CONSTRUCTION: &str = "ui.panel.construction";
pub const UI_PANEL_BASE: &str = "ui.panel.base";
pub const UI_PANEL_RUN: &str = "ui.panel.run";
pub const UI_PANEL_OBJECTIVES: &str = "ui.panel.objectives";
pub const UI_METRIC_CRYSTAL_FREE_SLOTS: &str = "ui.metric.crystal.free_slots";
pub const UI_METRIC_CRYSTAL_OUTPUT_LEVEL: &str = "ui.metric.crystal.output_level";
pub const UI_METRIC_CRYSTAL_FIELD_POLISH: &str = "ui.metric.crystal.field_polish";
pub const UI_METRIC_CRYSTAL_BUBBLE_BUDGET: &str = "ui.metric.crystal.bubble_budget";
pub const UI_METRIC_CRYSTAL_SOURCE: &str = "ui.metric.crystal.source";
pub const UI_METRIC_CRYSTAL_SINK: &str = "ui.metric.crystal.sink";
pub const UI_METRIC_CRYSTAL_RISK: &str = "ui.metric.crystal.risk";
pub const UI_METRIC_CHORUS_RATE: &str = "ui.metric.chorus.rate";
pub const UI_METRIC_CHORUS_STATION_UPKEEP: &str = "ui.metric.chorus.station_upkeep";
pub const UI_METRIC_CHORUS_SOURCE: &str = "ui.metric.chorus.source";
pub const UI_METRIC_CHORUS_SINK: &str = "ui.metric.chorus.sink";
pub const UI_METRIC_CHORUS_RISK: &str = "ui.metric.chorus.risk";
pub const UI_METRIC_HARMONICS_TIER: &str = "ui.metric.harmonics.tier";
pub const UI_METRIC_HARMONICS_EFFICIENCY: &str = "ui.metric.harmonics.efficiency";
pub const UI_METRIC_HARMONICS_SOURCE: &str = "ui.metric.harmonics.source";
pub const UI_METRIC_HARMONICS_SINK: &str = "ui.metric.harmonics.sink";
pub const UI_METRIC_HARMONICS_RISK: &str = "ui.metric.harmonics.risk";
pub const UI_METRIC_POWER_ACTIVE_UPKEEP: &str = "ui.metric.power.active_upkeep";
pub const UI_METRIC_POWER_ACTIVE_STAFF: &str = "ui.metric.power.active_staff";
pub const UI_METRIC_POWER_LIFE_SUPPORT: &str = "ui.metric.power.life_support";
pub const UI_METRIC_POWER_BROWNOUT: &str = "ui.metric.power.brownout";
pub const UI_SUMMARY_CONSTRUCTION_SOURCE: &str = "ui.summary.construction.source";
pub const UI_SUMMARY_CONSTRUCTION_SINK: &str = "ui.summary.construction.sink";
pub const UI_SUMMARY_CONSTRUCTION_BLOCKER: &str = "ui.summary.construction.blocker";
pub const UI_SUMMARY_POWER_SOURCE: &str = "ui.summary.power.source";
pub const UI_SUMMARY_POWER_SINK: &str = "ui.summary.power.sink";
pub const UI_SUMMARY_POWER_BLOCKER: &str = "ui.summary.power.blocker";
pub const UI_METRIC_BASE_RECRUIT_COST: &str = "ui.metric.base.recruit_cost";
pub const UI_METRIC_BASE_BUNKS: &str = "ui.metric.base.bunks";
pub const UI_METRIC_BASE_HOUSING: &str = "ui.metric.base.housing";
pub const UI_METRIC_BASE_BAD_VIBES: &str = "ui.metric.base.bad_vibes";
pub const UI_METRIC_BASE_CREW_EFFICIENCY: &str = "ui.metric.base.crew_efficiency";
pub const UI_METRIC_BASE_STONE_STOCK: &str = "ui.metric.base.stone_stock";
pub const UI_METRIC_BASE_WATER_STOCK: &str = "ui.metric.base.water_stock";
pub const UI_SUMMARY_BASE_SOURCE: &str = "ui.summary.base.source";
pub const UI_SUMMARY_BASE_SINK: &str = "ui.summary.base.sink";
pub const UI_SUMMARY_BASE_BLOCKER: &str = "ui.summary.base.blocker";
pub const UI_CONTROL_HERO_TASK: &str = "ui.control.hero.task";
pub const UI_STATUS_HERO: &str = "ui.status.hero";
pub const UI_METRIC_HERO_VITALS: &str = "ui.metric.hero.vitals";
pub const UI_METRIC_HERO_WOUNDS: &str = "ui.metric.hero.wounds";
pub const UI_METRIC_HERO_RETURN_WINDOW: &str = "ui.metric.hero.return_window";
pub const UI_METRIC_HERO_RECOVERY: &str = "ui.metric.hero.recovery";
pub const UI_METRIC_HERO_ECHO_SCARS: &str = "ui.metric.hero.echo_scars";
pub const UI_METRIC_HERO_DEBUFF: &str = "ui.metric.hero.debuff";
pub const UI_CONTROL_CONSTRUCTION_CREW: &str = "ui.control.construction.crew";
pub const UI_CONTROL_BASE_SCAVENGE: &str = "ui.control.base.scavenge";
pub const UI_CONTROL_BASE_FIRE_PIT: &str = "ui.control.base.fire_pit";
pub const UI_CONTROL_BASE_WATER: &str = "ui.control.base.water";
pub const UI_ACTION_RECRUIT: &str = "ui.action.recruit";
pub const UI_STATUS_BASE_STUDIO: &str = "ui.status.base.studio";
pub const UI_STATUS_BASE_FIRE_PIT: &str = "ui.status.base.fire_pit";
pub const UI_STATUS_BASE_RECRUITS: &str = "ui.status.base.recruits";
pub const UI_STATUS_BASE_HOUSING: &str = "ui.status.base.housing";
pub const UI_MAP_CAVE_GATE: &str = "ui.map.cave_gate";
pub const UI_OBJECTIVE_STATUS: &str = "ui.objective.status";
pub const UI_OBJECTIVE_ACTIVE_GOAL: &str = "ui.objective.active_goal";
pub const UI_OBJECTIVE_NEXT: &str = "ui.objective.next";
pub const UI_OBJECTIVE_BLOCKER: &str = "ui.objective.blocker";
pub const UI_OBJECTIVE_UNLOCK: &str = "ui.objective.unlock";
pub const UI_OBJECTIVE_NEXT_MOVE: &str = "ui.objective.next_move";
pub const UI_OBJECTIVE_WATCH_OUT: &str = "ui.objective.watch_out";

pub const TERRAIN_PLAINS_IMPEDANCE: f64 = 1.0;
pub const TERRAIN_RIVER_IMPEDANCE: f64 = 0.35;
pub const TERRAIN_SCRUB_IMPEDANCE: f64 = 1.6;
pub const TERRAIN_RIDGE_IMPEDANCE: f64 = 2.4;
pub const TERRAIN_MOUNTAIN_IMPEDANCE: f64 = 99.0;

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CapBehavior {
    OverflowLost,
    BlockedAtCap,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ResourceCategory {
    Band,
    Material,
    RunScopedPool,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RoleSlotPool {
    CrystalCircle,
    FirePit,
    Base,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ConstructionGroup {
    CrystalUpgrade,
    BaseProject,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ProcessingTrack {
    ResonanceCalibration,
    MixCalibration,
    WorkshopTooling,
    WorkshopWaterCondensers,
    ResearchChorusRouting,
    ResearchHarmonicStudy,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StationCategory {
    Crystal,
    Social,
    Power,
    Tuning,
    Crafting,
    Research,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EntityKind {
    Resource,
    Role,
    Station,
    ConstructionOption,
    ProcessingRecipe,
    WorldAction,
    StoryBeat,
    Tile,
    Flora,
    Structure,
    UiSurface,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PersistenceScope {
    SaveSlot,
    Run,
    Content,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TuningAffinity {
    Tuned,
    Detuned,
    Untuned,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum UnlockKind {
    Story,
    Construction,
    Power,
    Reach,
    Station,
    Processing,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BlockerKind {
    MissingRequirement,
    MissingResource,
    MissingPower,
    MissingStaff,
    BlockedAtCap,
    Busy,
    Inaccessible,
    OutOfBubble,
    Occluded,
    OfflineDisabled,
    ReachLocked,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AccessRuleKind {
    BaseOnly,
    BubbleRequired,
    HeroOnly,
    HeroVisited,
    ReachRequired,
    NotBlocked,
    PowerNetwork,
    StoryUnlocked,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FlowDirection {
    Input,
    Output,
    Capacity,
    Pressure,
    Unlock,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FlowCadence {
    Passive,
    PerSecond,
    PerWorkerSecond,
    OnStart,
    OnComplete,
    WhilePowered,
    WhileStaffed,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ModelKind {
    Cost,
    Duration,
    Progression,
    Bubble,
    Power,
    Recruitment,
    Survival,
    Vibes,
    Terrain,
    Storage,
}

// Hero perk stats a perk effect can multiply. Each maps to one sim calc site.
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PerkStat {
    ScavengeYield,
    ConstructionSpeed,
    CrystalOutput,
    HeroRecovery,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PerkEffectDef {
    pub stat: PerkStat,
    pub multiplier: f64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PerkDef {
    pub id: &'static str,
    pub label: &'static str,
    pub requires: &'static [&'static str],
    pub effects: &'static [PerkEffectDef],
}

// What consuming one item does. Each kind maps to one sim effect site.
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ItemEffectKind {
    RestoreSurvival,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ItemEffectDef {
    pub kind: ItemEffectKind,
    pub amount: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ItemDef {
    pub id: &'static str,
    pub label: &'static str,
    pub stackable: bool,
    pub max_stack: u32,
    pub use_effect: Option<ItemEffectDef>,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CreatureDef {
    pub id: &'static str,
    pub label: &'static str,
    pub hp: f64,
    pub attack: f64,
    pub threat: f64,
    pub xp_reward: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ObjectiveDef {
    pub id: &'static str,
    pub label: &'static str,
    pub description: &'static str,
    pub sequence: u16,
    /// Conditions that must all hold to complete the objective. Evaluated in the
    /// sim; omitted from the serialized snapshot (the selector runs in Rust).
    #[serde(skip)]
    pub conditions: &'static [Condition],
    /// Effects applied once when the objective completes.
    #[serde(skip)]
    pub rewards: &'static [EffectDef],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PowerFallbackMode {
    AlwaysOn,
    BrownoutLifo,
    ManualRequest,
    ImmediateOffOutsideBubble,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PresentationReveal {
    Default,
    Advanced,
    Debug,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum VisibilityConditionDef {
    Always,
    FlagSet { flag_id: &'static str },
    FlagUnset { flag_id: &'static str },
    ResourcePositive { resource_id: &'static str },
    ViralLoadPositive,
    HeroOutsideBubble,
    HeroForcedReturn,
    HeroRecovering,
    EchoScarsPositive,
    RoleAssigned { role_id: &'static str },
    RoleAvailable { role_id: &'static str },
    RecruitmentEnabled,
    RecruitmentDisabled,
    PendingRecruits,
    RecruitedAny,
    BrownoutActive,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CostKind {
    DrainPerWorkerSecond,
    Upfront,
    UpfrontBundle,
    TimeOnly,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CrystalTrack {
    SlotCapacity,
    Output,
    Storage,
    FieldPolish,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PersistenceDef {
    pub scope: PersistenceScope,
    pub tuning_affinity: TuningAffinity,
    pub resets_on_tuning: bool,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UnlockDef {
    pub kind: UnlockKind,
    pub label: &'static str,
    pub related_ids: &'static [&'static str],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BlockerDef {
    pub kind: BlockerKind,
    pub label: &'static str,
    pub related_ids: &'static [&'static str],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AccessRuleDef {
    pub kind: AccessRuleKind,
    pub label: &'static str,
    pub related_ids: &'static [&'static str],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FlowDef {
    pub item_id: &'static str,
    pub label: &'static str,
    pub direction: FlowDirection,
    pub cadence: FlowCadence,
    pub related_ids: &'static [&'static str],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ModelRefDef {
    pub kind: ModelKind,
    pub reference_id: &'static str,
    pub label: &'static str,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PowerProfileDef {
    pub resource_id: &'static str,
    pub upkeep_per_second: f64,
    pub manual_power: bool,
    pub starts_requested: bool,
    pub fallback_mode: PowerFallbackMode,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PresentationDef {
    pub short_label: &'static str,
    pub player_hint: &'static str,
    pub cta_copy: Option<&'static str>,
    pub primary_risk_copy: Option<&'static str>,
    pub display_priority: u16,
    pub reveal: PresentationReveal,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VisibilityDef {
    pub all_of: &'static [VisibilityConditionDef],
    pub any_of: &'static [VisibilityConditionDef],
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct EntityPresentationDef {
    pub id: &'static str,
    pub short_label: &'static str,
    pub player_hint: &'static str,
    pub cta_copy: Option<&'static str>,
    pub primary_risk_copy: Option<&'static str>,
    pub display_priority: u16,
    pub reveal: PresentationReveal,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct EntityVisibilityDef {
    pub id: &'static str,
    pub all_of: &'static [VisibilityConditionDef],
    pub any_of: &'static [VisibilityConditionDef],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EntitySchemaDef {
    pub id: &'static str,
    pub entity_kind: EntityKind,
    pub persistence: Option<PersistenceDef>,
    pub unlocks: &'static [UnlockDef],
    pub blockers: &'static [BlockerDef],
    pub access_rules: &'static [AccessRuleDef],
    pub power: Option<PowerProfileDef>,
    pub flows: &'static [FlowDef],
    pub model_refs: &'static [ModelRefDef],
    pub notes: &'static [&'static str],
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EntitySchemaSnapshot {
    pub id: &'static str,
    pub entity_kind: EntityKind,
    pub persistence: Option<PersistenceDef>,
    pub unlocks: Vec<UnlockDef>,
    pub blockers: Vec<BlockerDef>,
    pub access_rules: Vec<AccessRuleDef>,
    pub power: Option<PowerProfileDef>,
    pub flows: Vec<FlowDef>,
    pub model_refs: Vec<ModelRefDef>,
    pub notes: Vec<&'static str>,
    pub presentation: Option<PresentationDef>,
    pub visibility: Option<VisibilityDef>,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UiElementDef {
    pub id: &'static str,
    pub label: &'static str,
    pub related_ids: &'static [&'static str],
    pub visibility: VisibilityDef,
    pub presentation: Option<PresentationDef>,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RequirementDef {
    FlagSet(&'static str),
    FlagUnset(&'static str),
}

/// A condition over game state — the unified gating vocabulary, evaluated by
/// `Simulation::evaluate_condition`. Supersets `RequirementDef` (flags) and the
/// UI-only `VisibilityConditionDef`, and adds numeric comparisons + boolean
/// combinators so storylet preconditions can react to arbitrary state.
// P1 substrate: most variants are constructed by codegen'd storylet content in
// P2; until then they are only matched in the evaluator.
#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Condition {
    Always,
    FlagSet(&'static str),
    FlagUnset(&'static str),
    /// True when the named resource pool currently holds at least `amount`.
    ResourceAtLeast {
        resource_id: &'static str,
        amount: f64,
    },
    BubbleReachAtLeast(u8),
    ClockSecondsAtLeast(f64),
    /// True when the narrative quality `key` is at least `value` (default 0).
    QualityAtLeast {
        key: &'static str,
        value: i64,
    },
    BeatCompleted(&'static str),
    ChoiceMade {
        beat_id: &'static str,
        option_id: &'static str,
    },
    RoleAvailable(&'static str),
    RecruitmentEnabled,
    RecruitedAny,
    HeroOutsideBubble,
    HeroForcedReturn,
    HeroRecovering,
    All(&'static [Condition]),
    Any(&'static [Condition]),
    Not(&'static Condition),
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum EffectDef {
    SetFlag {
        flag_id: &'static str,
        value: bool,
    },
    AddBunks {
        amount: u16,
    },
    AddSkins {
        amount: u16,
    },
    IncrementCrystalTrack {
        track: CrystalTrack,
        amount: u8,
    },
    IncrementProcessingTrack {
        track: ProcessingTrack,
        amount: u8,
    },
    /// Add `amount` of a resource (capped). Narrative/storylet effects.
    GrantResource {
        resource_id: &'static str,
        amount: f64,
    },
    SpendResource {
        resource_id: &'static str,
        amount: f64,
    },
    /// Set / add to a narrative quality (arbitrary author-defined story state).
    SetQuality {
        key: &'static str,
        value: i64,
    },
    AddQuality {
        key: &'static str,
        amount: i64,
    },
    /// Mark a story beat complete directly (used by storylet onComplete).
    CompleteBeat {
        beat_id: &'static str,
    },
    /// Push a line into the run log.
    Note {
        text: &'static str,
    },
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CostItemDef {
    pub item_id: &'static str,
    pub amount: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum DurationDef {
    Fixed {
        seconds: f64,
    },
    CrystalLevelScaled {
        track: CrystalTrack,
        base_seconds: f64,
        per_level_seconds: f64,
    },
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum CostDef {
    Upfront {
        resource_id: &'static str,
        amount: f64,
    },
    UpfrontBundle {
        costs: &'static [CostItemDef],
    },
    DrainPerWorkerSecond {
        resource_id: &'static str,
        amount: f64,
    },
    TimeOnly,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ResourceDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub category: ResourceCategory,
    pub base_cap: f64,
    pub cap_behavior: CapBehavior,
    pub starts_at: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RoleDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub slot_pool: RoleSlotPool,
    pub hero_allowed: bool,
    pub crew_allowed: bool,
    pub max_crew_slots: Option<u8>,
    pub ui_section: &'static str,
    pub ui_order: u8,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StationDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub category: StationCategory,
    pub chorus_upkeep_per_second: f64,
    pub manual_power: bool,
    pub starts_requested: bool,
    pub requirements: &'static [RequirementDef],
    pub ui_order: u8,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ConstructionOptionDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub group: ConstructionGroup,
    pub cost: CostDef,
    pub duration: DurationDef,
    pub requirements: &'static [RequirementDef],
    pub effects: &'static [EffectDef],
    pub ui_order: u8,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProcessingRecipeDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub station_id: &'static str,
    pub cost: CostDef,
    pub duration: DurationDef,
    pub requirements: &'static [RequirementDef],
    pub effects: &'static [EffectDef],
    pub max_level: u8,
    pub ui_order: u8,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WorldActionDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub duration_seconds: f64,
    pub hero_only: bool,
    pub offline_progress: bool,
    pub hero_exposure: HeroExposureDef,
    pub return_to_bubble_seconds: f64,
    pub return_to_studio_seconds: f64,
    pub requirements: &'static [RequirementDef],
    pub effects: &'static [EffectDef],
    pub ui_order: u8,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ExpeditionRiskDef {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExpeditionSupportDef {
    pub requires_studio_restored: bool,
    pub requires_fire_pit: bool,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExpeditionRewardDef {
    pub stone: f64,
    pub water: f64,
    pub vibes: f64,
    pub echo_shards: u16,
    pub signal_scrap: u16,
    pub harmonic_residue: u16,
    pub wounds: u16,
    pub clues: u16,
    pub dungeon_leads: u16,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExpeditionTargetDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub duration_seconds: f64,
    pub required_crew: u16,
    pub required_bubble_reach: u8,
    pub support: ExpeditionSupportDef,
    pub risk: ExpeditionRiskDef,
    pub expected_loot: ExpeditionRewardDef,
    pub ui_order: u8,
    pub player_hint: &'static str,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ResonanceTuningTrackDef {
    Bassline,
    Chorus,
    Harmonics,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ResonanceMaterialCostDef {
    pub material_id: &'static str,
    pub amount: u16,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "snake_case", tag = "kind")]
pub enum ResonanceEffectDef {
    IncrementTuning {
        track: ResonanceTuningTrackDef,
        amount: u16,
    },
    IncrementExpeditionSupport {
        amount: u16,
    },
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ResonanceRecipeDef {
    pub id: &'static str,
    pub label: &'static str,
    pub station_id: &'static str,
    pub duration_seconds: f64,
    pub costs: &'static [ResonanceMaterialCostDef],
    pub effect: ResonanceEffectDef,
    pub ui_order: u8,
    pub player_hint: &'static str,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum HeroExposureDef {
    Studio,
    Bubble,
    OutsideBubble,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StoryChoiceDef {
    pub id: &'static str,
    pub label: &'static str,
    pub response: &'static str,
    /// Effects applied when the player picks this choice — the consequence that
    /// makes the world remember (typically narrative qualities). Rust-internal;
    /// omitted from the serialized snapshot.
    #[serde(skip)]
    pub effects: &'static [EffectDef],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "snake_case", tag = "kind")]
pub enum StoryPrimaryActionDef {
    StoryChoice,
    PreviewRouteToBase,
    WorldAction {
        action_id: &'static str,
    },
    Construction {
        option_id: &'static str,
        gather_role_id: Option<&'static str>,
        build_role_id: Option<&'static str>,
        crew: Option<u8>,
        wait_seconds: f64,
    },
    AssignRole {
        role_id: &'static str,
        crew: Option<u8>,
        assign_hero: bool,
    },
    Tick {
        seconds: f64,
    },
    RecruitFromSurvivorCave {
        vibes_role_id: Option<&'static str>,
        wait_seconds: f64,
    },
    None,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StoryProgressionDef {
    pub track: &'static str,
    pub step_id: &'static str,
    pub presentation: Option<PresentationDef>,
    pub primary_action: Option<StoryPrimaryActionDef>,
    pub blockers: &'static [BlockerDef],
    pub unlocks: &'static [UnlockDef],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StoryBeatDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub body: &'static str,
    pub arc: &'static str,
    pub sequence: u16,
    pub world_action_id: Option<&'static str>,
    pub choices: &'static [StoryChoiceDef],
    pub related_ids: &'static [&'static str],
    pub progression: Option<StoryProgressionDef>,
    /// Storylet (QBN) fields. The salience selector activates the highest-priority
    /// storylet whose `preconditions` all hold; an active storylet auto-resolves
    /// when its `auto_complete_when` conditions hold. `repeatable` storylets can
    /// re-activate after their preconditions lapse and hold again. These drive the
    /// authoritative Rust selector only; the serialized snapshot omits them (the
    /// TS layer renders the active beat, it does not re-select).
    #[serde(skip)]
    pub preconditions: &'static [Condition],
    #[serde(skip)]
    pub auto_complete_when: &'static [Condition],
    #[serde(skip)]
    pub priority: i16,
    #[serde(skip)]
    pub repeatable: bool,
    /// Content-authored gate: while this beat is active, unrelated world actions
    /// are blocked so the player resolves the current story beat first.
    #[serde(skip)]
    pub blocks_unrelated_world_actions: bool,
    /// Effects applied once when this beat resolves (rewards, quality shifts,
    /// follow-on flags). Rust-internal; omitted from the snapshot.
    #[serde(skip)]
    pub on_complete: &'static [EffectDef],
    /// Effects applied when this beat first becomes active (fires once per
    /// activation; a repeatable beat re-fires after it lapses and re-triggers).
    #[serde(skip)]
    pub on_activate: &'static [EffectDef],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FlagDef {
    pub id: &'static str,
    pub label: &'static str,
    pub group: &'static str,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ModelDef {
    pub id: &'static str,
    pub label: &'static str,
    pub kind: ModelKind,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CatalogSnapshot {
    pub resources: Vec<ResourceDef>,
    pub roles: Vec<RoleDef>,
    pub stations: Vec<StationDef>,
    pub construction_options: Vec<ConstructionOptionDef>,
    pub processing_recipes: Vec<ProcessingRecipeDef>,
    pub world_actions: Vec<WorldActionDef>,
    pub expedition_targets: Vec<ExpeditionTargetDef>,
    pub resonance_recipes: Vec<ResonanceRecipeDef>,
    pub story_beats: Vec<StoryBeatDef>,
    pub objectives: Vec<ObjectiveDef>,
    pub items: Vec<ItemDef>,
    pub perks: Vec<PerkDef>,
    pub creatures: Vec<CreatureDef>,
    pub flags: Vec<FlagDef>,
    pub models: Vec<ModelDef>,
    pub flora: Vec<FloraDef>,
    pub structures: Vec<StructureDef>,
    pub tiles: Vec<TileDef>,
    pub entity_schemas: Vec<EntitySchemaSnapshot>,
    pub ui_elements: Vec<UiElementDef>,
    pub balance: BalanceSnapshot,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BalanceSnapshot {
    pub bubble: BubbleBalance,
    pub crystal: CrystalBalance,
    pub power: PowerBalance,
    pub progression: ProgressionBalance,
    pub combat: CombatBalance,
    pub survival: SurvivalBalance,
    pub build: BuildBalance,
    pub scavenge: ScavengeBalance,
    pub fire_pit: FirePitBalance,
    pub water: WaterBalance,
    pub vibes: VibesBalance,
    pub recruitment: RecruitmentBalance,
    pub notes_limit: usize,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BubbleBalance {
    pub hold_seconds: f64,
    pub degrade_seconds_per_ring: f64,
    pub field_k_base: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CrystalBalance {
    pub base_bassline_cap: f64,
    pub base_chorus_cap: f64,
    pub base_harmonics_cap: f64,
    pub bassline_cap_per_storage_level: f64,
    pub chorus_cap_per_storage_level: f64,
    pub harmonics_cap_per_storage_level: f64,
    pub output_per_worker_base: f64,
    pub output_per_worker_level_bonus: f64,
    pub chorus_per_worker_base: f64,
    pub chorus_per_worker_level_bonus: f64,
    pub harmonics_per_worker_base: f64,
    pub harmonics_per_worker_level_bonus: f64,
    pub removing_moss_output_multiplier: f64,
    pub removing_moss_passive_bassline_per_second: f64,
    pub field_k_bonus_per_polish_level: f64,
    pub fire_pit_crew_slots: u8,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PowerBalance {
    pub life_support_free_staff: u8,
    pub life_support_upkeep_per_staff_per_second: f64,
    pub harmonics_continuous_bonus_per_unit: f64,
    pub harmonics_continuous_bonus_cap: f64,
    pub harmonics_tier_one_threshold: f64,
    pub harmonics_tier_two_threshold: f64,
    pub harmonics_tier_three_threshold: f64,
    pub harmonics_tier_bonus: f64,
    pub bassline_generation_bonus_weight: f64,
    pub chorus_generation_bonus_weight: f64,
    pub harmonics_generation_bonus_weight: f64,
    pub resonance_chamber_field_bonus: f64,
    pub mix_console_harmonics_bonus: f64,
    pub mix_console_brownout_tolerance: f64,
    pub tier_two_brownout_tolerance: f64,
    pub tier_three_brownout_tolerance: f64,
    pub tier_three_upkeep_discount: f64,
    pub brownout_bassline_penalty_weight: f64,
    pub brownout_chorus_penalty_weight: f64,
    pub brownout_harmonics_penalty_weight: f64,
    pub brownout_field_penalty_weight: f64,
    pub resonance_processing_field_bonus_per_level: f64,
    pub mix_processing_harmonics_bonus_per_level: f64,
    pub mix_processing_brownout_tolerance_per_level: f64,
    pub research_chorus_free_staff_per_level: u8,
    pub research_harmonics_threshold_reduction_per_level: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProgressionBalance {
    pub level_multiplier_a: f64,
    pub xp0: f64,
    pub xp_growth: f64,
    /// Flat XP for clearing a location (awarded to the Drummer track).
    pub xp_per_location_clear: f64,
    /// Flat XP for a returned expedition (awarded to the Synth track).
    pub xp_per_expedition: f64,
    /// Flat XP for completing a story beat (awarded to the Vocalist track).
    pub xp_per_story_beat: f64,
}

/// The three Hero progression tracks. Crystal work feeds them by resource
/// (Bassline→Drummer, Chorus→Vocalist, Harmonics→Synth); discrete events feed
/// one track each (clears→Drummer, expeditions→Synth, beats→Vocalist).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HeroTrack {
    Drummer,
    Vocalist,
    Synth,
}

impl HeroTrack {
    /// Lowercase identifier used in events/snapshots.
    pub fn key(self) -> &'static str {
        match self {
            HeroTrack::Drummer => "drummer",
            HeroTrack::Vocalist => "vocalist",
            HeroTrack::Synth => "synth",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CombatBalance {
    /// Hero attack at total level 0.
    pub base_attack: f64,
    /// Added attack per total Hero level.
    pub attack_per_level: f64,
    /// Hero combat HP at total level 0.
    pub base_hp: f64,
    /// Added combat HP per total Hero level.
    pub hp_per_level: f64,
    /// Real seconds each simulated combat round takes.
    pub round_seconds: f64,
    /// Per-hit damage variance fraction (e.g. 0.15 = ±15%).
    pub damage_variance: f64,
    /// Wound units accrued per point of Hero HP lost in a fight.
    pub wound_units_per_hp_lost: f64,
    /// Extra wound units when a fight ends in retreat (Hero downed).
    pub defeat_extra_wound_units: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SurvivalBalance {
    pub hero_time_seconds_0_to_1: f64,
    pub normal_human_time_seconds_0_to_1: f64,
    pub recovery_time_seconds_1_to_0: f64,
    pub sustain_bonus_per_level: f64,
    pub tier_one_threshold_ratio: f64,
    pub tier_two_threshold_ratio: f64,
    pub tier_three_threshold_ratio: f64,
    pub tier_one_work_efficiency_multiplier: f64,
    pub tier_two_work_efficiency_multiplier: f64,
    pub tier_three_work_efficiency_multiplier: f64,
    pub tier_one_movement_speed_multiplier: f64,
    pub tier_two_movement_speed_multiplier: f64,
    pub tier_three_movement_speed_multiplier: f64,
    pub tier_one_encounter_rate_multiplier: f64,
    pub tier_two_encounter_rate_multiplier: f64,
    pub tier_three_encounter_rate_multiplier: f64,
    pub recovery_brownout_penalty_weight: f64,
    pub recovery_brownout_stop_threshold: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScavengeBalance {
    pub base_stock_max: f64,
    pub stock_rate_per_second: f64,
    pub ambient_rate_per_second: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FirePitBalance {
    pub base_vibes_per_second: f64,
    pub staff_vibes_per_second: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WaterBalance {
    pub water_cap: f64,
    pub base_stock_max: f64,
    pub collection_rate_per_second: f64,
    pub tile_regen_per_second: f64,
    pub workshop_water_cap_per_level: f64,
    pub workshop_regen_bonus_per_level: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BuildBalance {
    pub workshop_tooling_speed_bonus_per_level: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VibesBalance {
    pub negative_k: f64,
    pub bad_vibes_beta: f64,
    pub bad_vibes_pow: f64,
    pub doubling_time_seconds: f64,
    pub decay_reset_seconds: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RecruitmentBalance {
    pub recruit_travel_seconds: f64,
    pub instant_recruit_delay_seconds: f64,
    pub good_vibes_opt_base: f64,
    pub good_vibes_opt_step: f64,
    pub t1_minutes: f64,
    pub t30_total_good_vibes: f64,
    pub t500_total_good_vibes: f64,
    pub t1000_total_good_vibes: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TileFeature {
    None,
    Base,
    SurvivorCave,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TileTag {
    Base,
    Sanctuary,
    ConstructionAnchor,
    OpenGround,
    WaterSource,
    EasyPropagation,
    Brush,
    Harvestable,
    Elevated,
    HighImpedance,
    Blocker,
    Wall,
    Landmark,
    RecruitmentSource,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FloraKind {
    Reeds,
    Scrub,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StructureKind {
    CrystalCircle,
    Base,
    Cave,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TerrainProfile {
    pub terrain: TerrainSnapshot,
    pub impedance: f64,
    pub is_blocker: bool,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TileDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub terrain: TerrainSnapshot,
    pub feature: TileFeature,
    pub impedance: f64,
    pub is_blocker: bool,
    pub tags: &'static [TileTag],
    pub flora_ids: &'static [&'static str],
    pub structure_ids: &'static [&'static str],
    pub dungeon_ids: &'static [&'static str],
    pub area_ids: &'static [&'static str],
    pub building_capacity: u8,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FloraDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub kind: FloraKind,
    pub tags: &'static [TileTag],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StructureDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub kind: StructureKind,
    pub tags: &'static [TileTag],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TerrainSnapshot {
    Plains,
    River,
    Scrub,
    Ridge,
    Mountain,
}

const ENTITY_VISIBILITY: &[EntityVisibilityDef] = &[
    EntityVisibilityDef {
        id: RESOURCE_BASSLINE,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED,
            },
            VisibilityConditionDef::ResourcePositive {
                resource_id: RESOURCE_BASSLINE,
            },
        ],
    },
    EntityVisibilityDef {
        id: RESOURCE_CHORUS,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_STUDIO_RESTORED,
            },
            VisibilityConditionDef::ResourcePositive {
                resource_id: RESOURCE_CHORUS,
            },
        ],
    },
    EntityVisibilityDef {
        id: RESOURCE_HARMONICS,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
            },
            VisibilityConditionDef::ResourcePositive {
                resource_id: RESOURCE_HARMONICS,
            },
        ],
    },
    EntityVisibilityDef {
        id: RESOURCE_STONE,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_TUTORIAL_INVESTIGATED,
            },
            VisibilityConditionDef::ResourcePositive {
                resource_id: RESOURCE_STONE,
            },
        ],
    },
    EntityVisibilityDef {
        id: RESOURCE_WATER,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_TUTORIAL_EXPLORED,
            },
            VisibilityConditionDef::ResourcePositive {
                resource_id: RESOURCE_WATER,
            },
        ],
    },
    EntityVisibilityDef {
        id: RESOURCE_VIBES,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_FIRE_PIT_BUILT,
            },
            VisibilityConditionDef::RecruitmentEnabled,
            VisibilityConditionDef::ResourcePositive {
                resource_id: RESOURCE_VIBES,
            },
        ],
    },
    EntityVisibilityDef {
        id: ROLE_CRYSTAL_BASSLINE,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: ROLE_CRYSTAL_CHORUS,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_STUDIO_RESTORED,
            },
            VisibilityConditionDef::RoleAssigned {
                role_id: ROLE_CRYSTAL_CHORUS,
            },
        ],
    },
    EntityVisibilityDef {
        id: ROLE_CRYSTAL_HARMONICS,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
            },
            VisibilityConditionDef::RoleAssigned {
                role_id: ROLE_CRYSTAL_HARMONICS,
            },
        ],
    },
    EntityVisibilityDef {
        id: ROLE_CONSTRUCTION,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: ROLE_SCAVENGE,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_TUTORIAL_EXPLORED,
            },
            VisibilityConditionDef::RoleAssigned {
                role_id: ROLE_SCAVENGE,
            },
        ],
    },
    EntityVisibilityDef {
        id: ROLE_FIRE_PIT,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_FIRE_PIT_BUILT,
            },
            VisibilityConditionDef::RoleAssigned {
                role_id: ROLE_FIRE_PIT,
            },
        ],
    },
    EntityVisibilityDef {
        id: ROLE_WATER,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_WATER_COLLECTION_UNLOCKED,
            },
            VisibilityConditionDef::RoleAssigned {
                role_id: ROLE_WATER,
            },
        ],
    },
    EntityVisibilityDef {
        id: CONSTRUCTION_SLOT_CAPACITY,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: CONSTRUCTION_OUTPUT,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: CONSTRUCTION_STORAGE,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: CONSTRUCTION_REMOVING_MOSS,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_CRYSTAL_REMOVING_MOSS_COMPLETED,
        }],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED,
        }],
    },
    EntityVisibilityDef {
        id: CONSTRUCTION_POLISH_FIELD,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_TUTORIAL_EXPLORED,
        }],
    },
    EntityVisibilityDef {
        id: PROJECT_RESTORE_STUDIO,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_BASE_STUDIO_RESTORED,
        }],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_STUDIO_RESTORE_UNLOCKED,
        }],
    },
    EntityVisibilityDef {
        id: PROJECT_BUILD_FIRE_PIT,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_BASE_FIRE_PIT_BUILT,
        }],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_STUDIO_RESTORED,
        }],
    },
    EntityVisibilityDef {
        id: PROJECT_BUILD_RESONANCE_CHAMBER,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
        }],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_FIRE_PIT_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: PROJECT_BUILD_MIX_CONSOLE,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_BASE_MIX_CONSOLE_BUILT,
        }],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: PROJECT_BUILD_WORKSHOP,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_BASE_WORKSHOP_BUILT,
        }],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_STUDIO_RESTORED,
        }],
    },
    EntityVisibilityDef {
        id: PROJECT_BUILD_RESEARCH_BOOTH,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_BASE_RESEARCH_BOOTH_BUILT,
        }],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: PROJECT_EXPAND_BUNKS,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_STUDIO_RESTORED,
        }],
    },
    EntityVisibilityDef {
        id: PROJECT_SAFE_WATER_SYSTEMS,
        all_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_WATER_COLLECTION_UNLOCKED,
            },
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_WORKSHOP_BUILT,
            },
        ],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: PROJECT_EXPEDITION_STAGING,
        all_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
            },
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_WORKSHOP_BUILT,
            },
        ],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: PROJECT_PREPARE_LOUDSPEAKERS,
        all_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_RESEARCH_BOOTH_BUILT,
        }],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STATION_CRYSTAL_CIRCLE,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STATION_FIRE_PIT,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_FIRE_PIT_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: STATION_RESONANCE_CHAMBER,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: STATION_MIX_CONSOLE,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_MIX_CONSOLE_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: STATION_WORKSHOP,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_WORKSHOP_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: STATION_RESEARCH_BOOTH,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_RESEARCH_BOOTH_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: RECIPE_RESONANCE_FIELD_CALIBRATION,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: RECIPE_MIX_SIGNAL_BALANCING,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_MIX_CONSOLE_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: RECIPE_WORKSHOP_BUILDER_TOOLS,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_WORKSHOP_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: RECIPE_WORKSHOP_WATER_CONDENSERS,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_WORKSHOP_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: RECIPE_RESEARCH_CHORUS_ROUTING,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_RESEARCH_BOOTH_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: RECIPE_RESEARCH_HARMONIC_STUDY,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_RESEARCH_BOOTH_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: WORLD_ACTION_INVESTIGATE_BASE,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_BASE_TUTORIAL_INVESTIGATED,
        }],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: WORLD_ACTION_EXPLORE_BASE,
        all_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_TUTORIAL_INVESTIGATED,
            },
            VisibilityConditionDef::FlagUnset {
                flag_id: FLAG_BASE_TUTORIAL_EXPLORED,
            },
        ],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_ROAD_TO_BASE,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_HERO_EXPOSED,
        all_of: &[],
        any_of: &[VisibilityConditionDef::HeroOutsideBubble],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_FIRST_GLIMPSE,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_ENTER_THE_BUBBLE,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_INVESTIGATE_BASE,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_BASE_TUTORIAL_INVESTIGATED,
        }],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_EXPLORE_BASE,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_TUTORIAL_INVESTIGATED,
        }],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_RESTORE_STUDIO,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_STUDIO_RESTORE_UNLOCKED,
        }],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_BUILD_FIRE_PIT,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_STUDIO_RESTORED,
        }],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_REACH_SURVIVOR_CAVE,
        all_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_FIRE_PIT_BUILT,
        }],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_FIRST_RECRUIT,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::RecruitmentEnabled,
            VisibilityConditionDef::RecruitedAny,
            VisibilityConditionDef::PendingRecruits,
        ],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL,
        all_of: &[VisibilityConditionDef::PendingRecruits],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_STABILIZE_BASE,
        all_of: &[VisibilityConditionDef::RecruitedAny],
        any_of: &[VisibilityConditionDef::Always],
    },
];

const ENTITY_PRESENTATIONS: &[EntityPresentationDef] = &[
    EntityPresentationDef {
        id: RESOURCE_BASSLINE,
        short_label: "Bassline",
        player_hint: "Stored Bassline holds the bubble open and feeds Crystal upgrades.",
        cta_copy: None,
        primary_risk_copy: Some(
            "Spending too far into Bassline budget will put bubble coverage at risk.",
        ),
        display_priority: 1000,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: RESOURCE_CHORUS,
        short_label: "Chorus",
        player_hint: "Chorus is the power rail for stations and life support.",
        cta_copy: None,
        primary_risk_copy: Some(
            "If Chorus falls behind upkeep, brownouts will start unpowering requested stations.",
        ),
        display_priority: 990,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: RESOURCE_HARMONICS,
        short_label: "Harmonics",
        player_hint: "Harmonics boosts Crystal efficiency, field strength, and power tolerance.",
        cta_copy: None,
        primary_risk_copy: Some(
            "Ignoring Harmonics leaves the base efficient only on paper and fragile under pressure.",
        ),
        display_priority: 980,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: RESOURCE_STONE,
        short_label: "Stone",
        player_hint: "Stone is the first hard gate for restoring the base and building stations.",
        cta_copy: None,
        primary_risk_copy: Some(
            "If Stone stock runs dry, construction and processing stall immediately.",
        ),
        display_priority: 970,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: RESOURCE_WATER,
        short_label: "Water",
        player_hint: "Water supports polishing and advanced processing once the base starts opening up.",
        cta_copy: None,
        primary_risk_copy: Some(
            "Low Water slows advanced improvements even when the rest of the economy looks healthy.",
        ),
        display_priority: 960,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: RESOURCE_VIBES,
        short_label: "Vibes",
        player_hint: "Vibes are the social fuel for early recruitment.",
        cta_copy: None,
        primary_risk_copy: Some("Bad Vibes from overcrowding will push recruitment farther away."),
        display_priority: 950,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: ROLE_CRYSTAL_BASSLINE,
        short_label: "Bassline Crew",
        player_hint: "Assign Bassline staff when you need safer reach or Crystal upgrades.",
        cta_copy: Some("Assign Bassline Crew"),
        primary_risk_copy: Some(
            "Too little Bassline output leaves the bubble vulnerable to spending.",
        ),
        display_priority: 900,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: ROLE_CRYSTAL_CHORUS,
        short_label: "Chorus Crew",
        player_hint: "Assign Chorus staff when power pressure or brownouts begin to appear.",
        cta_copy: Some("Assign Chorus Crew"),
        primary_risk_copy: Some(
            "Without Chorus staffing, power demand will outgrow supply quickly.",
        ),
        display_priority: 890,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: ROLE_CRYSTAL_HARMONICS,
        short_label: "Harmonics Crew",
        player_hint: "Assign Harmonics staff when the base needs better efficiency, tiers, and tolerance.",
        cta_copy: Some("Assign Harmonics Crew"),
        primary_risk_copy: Some(
            "No Harmonics means weaker output multipliers and less brownout protection.",
        ),
        display_priority: 880,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: ROLE_CONSTRUCTION,
        short_label: "Construction Crew",
        player_hint: "Builders turn time into finished projects and upgrades.",
        cta_copy: Some("Assign Builders"),
        primary_risk_copy: Some("Projects stop cold when no builders are assigned."),
        display_priority: 870,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: ROLE_FIRE_PIT,
        short_label: "Fire Pit Crew",
        player_hint: "Fire Pit staff accelerate Vibes generation for recruitment.",
        cta_copy: Some("Assign Fire Pit Crew"),
        primary_risk_copy: Some(
            "No one on the Fire Pit means slower recruitment and weaker morale recovery.",
        ),
        display_priority: 860,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: ROLE_SCAVENGE,
        short_label: "Scavenge Crew",
        player_hint: "Scavenge crew turns Base stock into Stone for repairs and builds.",
        cta_copy: Some("Assign Scavenge Crew"),
        primary_risk_copy: Some("If scavengers sit idle, the base starves for Stone."),
        display_priority: 850,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: ROLE_WATER,
        short_label: "Water Crew",
        player_hint: "Water crew gathers Water for polishing and processing.",
        cta_copy: Some("Assign Water Crew"),
        primary_risk_copy: Some(
            "Without Water collection, several processing upgrades stay locked behind shortages.",
        ),
        display_priority: 840,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STATION_CRYSTAL_CIRCLE,
        short_label: "Crystal Circle",
        player_hint: "The Crystal Circle is the root of the three-band economy.",
        cta_copy: None,
        primary_risk_copy: Some(
            "Understaffing the Crystal Circle makes every other system feel starved.",
        ),
        display_priority: 830,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STATION_FIRE_PIT,
        short_label: "Fire Pit",
        player_hint: "The Fire Pit starts the Vibes loop and opens early recruitment.",
        cta_copy: None,
        primary_risk_copy: Some(
            "Delaying the Fire Pit delays recruitment and the first real growth jump.",
        ),
        display_priority: 820,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STATION_RESONANCE_CHAMBER,
        short_label: "Resonance Chamber",
        player_hint: "The Resonance Chamber strengthens field conversion and opens Harmonics processing.",
        cta_copy: None,
        primary_risk_copy: Some(
            "If this station browns out, field efficiency and tuning-side growth fall behind.",
        ),
        display_priority: 810,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STATION_MIX_CONSOLE,
        short_label: "Mix Console",
        player_hint: "The Mix Console helps stabilize power pressure and improves Harmonics-side efficiency.",
        cta_copy: None,
        primary_risk_copy: Some("When the Mix Console is offline, brownout tolerance shrinks."),
        display_priority: 800,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: STATION_WORKSHOP,
        short_label: "Workshop",
        player_hint: "The Workshop turns gathered materials into faster building and better Water handling.",
        cta_copy: None,
        primary_risk_copy: Some(
            "A dark Workshop means slower build throughput and weaker Water scaling.",
        ),
        display_priority: 790,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: STATION_RESEARCH_BOOTH,
        short_label: "Research Booth",
        player_hint: "The Research Booth reduces Chorus pressure and makes Harmonics tiers easier to reach.",
        cta_copy: None,
        primary_risk_copy: Some(
            "Without Research, life-support Chorus pressure stays higher than it needs to be.",
        ),
        display_priority: 780,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: CONSTRUCTION_SLOT_CAPACITY,
        short_label: "Slot Capacity",
        player_hint: "More Crystal slots let the three bands scale together.",
        cta_copy: Some("Upgrade Slots"),
        primary_risk_copy: Some("Skipping slot upgrades caps Crystal growth early."),
        display_priority: 760,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: CONSTRUCTION_OUTPUT,
        short_label: "Output",
        player_hint: "Output upgrades raise the raw productivity of Crystal staffing.",
        cta_copy: Some("Upgrade Output"),
        primary_risk_copy: Some("Low output makes every assignment feel weaker than it should."),
        display_priority: 750,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: CONSTRUCTION_STORAGE,
        short_label: "Storage",
        player_hint: "Storage upgrades widen your safe spending window.",
        cta_copy: Some("Upgrade Storage"),
        primary_risk_copy: Some(
            "Low storage increases overflow loss and narrows your budget buffer.",
        ),
        display_priority: 740,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: CONSTRUCTION_REMOVING_MOSS,
        short_label: "Removing Moss",
        player_hint: "Removing Moss is the first cleanup upgrade and a small passive Bassline improvement.",
        cta_copy: Some("Clear Moss"),
        primary_risk_copy: Some(
            "Until Moss is cleared, early Bassline growth stays weaker than intended.",
        ),
        display_priority: 730,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: CONSTRUCTION_POLISH_FIELD,
        short_label: "Polish Crystal Base",
        player_hint: "Field polish makes stored Bassline go farther.",
        cta_copy: Some("Polish Crystal"),
        primary_risk_copy: Some(
            "Ignoring field polish leaves reach more expensive than it needs to be.",
        ),
        display_priority: 720,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: PROJECT_RESTORE_STUDIO,
        short_label: "Restore Studio",
        player_hint: "Restore the Studio to bring Chorus online and open the first real power loop.",
        cta_copy: Some("Restore Studio"),
        primary_risk_copy: Some(
            "Without the Studio, Chorus remains locked and the base stays one-dimensional.",
        ),
        display_priority: 710,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: PROJECT_BUILD_FIRE_PIT,
        short_label: "Build Fire Pit",
        player_hint: "Build the Fire Pit to begin generating Vibes and preparing recruitment.",
        cta_copy: Some("Build Fire Pit"),
        primary_risk_copy: Some(
            "Without the Fire Pit, the run cannot enter the first crew-growth loop.",
        ),
        display_priority: 700,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: PROJECT_BUILD_RESONANCE_CHAMBER,
        short_label: "Build Resonance Chamber",
        player_hint: "Build the Resonance Chamber to unlock Harmonics and better field efficiency.",
        cta_copy: Some("Build Resonance Chamber"),
        primary_risk_copy: Some(
            "No Resonance Chamber means Harmonics stays locked and efficiency lags.",
        ),
        display_priority: 690,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: PROJECT_BUILD_MIX_CONSOLE,
        short_label: "Build Mix Console",
        player_hint: "Build the Mix Console to improve Harmonics-side stability and brownout tolerance.",
        cta_copy: Some("Build Mix Console"),
        primary_risk_copy: Some("Skipping the Mix Console leaves advanced power tuning blunt."),
        display_priority: 680,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: PROJECT_BUILD_WORKSHOP,
        short_label: "Build Workshop",
        player_hint: "Build the Workshop to turn Stone and Water into practical production upgrades.",
        cta_copy: Some("Build Workshop"),
        primary_risk_copy: Some("Without a Workshop, gathered materials stay underused."),
        display_priority: 670,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: PROJECT_BUILD_RESEARCH_BOOTH,
        short_label: "Build Research Booth",
        player_hint: "Build the Research Booth to make the power curve less punishing.",
        cta_copy: Some("Build Research Booth"),
        primary_risk_copy: Some("Without Research, Chorus pressure stays harsher than necessary."),
        display_priority: 660,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: PROJECT_EXPAND_BUNKS,
        short_label: "Expand Bunks",
        player_hint: "Add bunk capacity before recruitment turns into overcrowding pressure.",
        cta_copy: Some("Expand Bunks"),
        primary_risk_copy: Some(
            "Recruiting without bunks creates Bad Vibes and slows the whole base.",
        ),
        display_priority: 655,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: PROJECT_SAFE_WATER_SYSTEMS,
        short_label: "Safer Water Systems",
        player_hint: "Improve Water handling so advanced upgrades stop bottlenecking on scarcity.",
        cta_copy: Some("Improve Water"),
        primary_risk_copy: Some(
            "Weak Water systems make several upgrades look ready but stay blocked.",
        ),
        display_priority: 654,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: PROJECT_EXPEDITION_STAGING,
        short_label: "Expedition Prep",
        player_hint: "Prepare field staging for longer crew expeditions and better route support.",
        cta_copy: Some("Prepare Expeditions"),
        primary_risk_copy: Some(
            "Sending teams farther without staging makes expedition choices riskier later.",
        ),
        display_priority: 653,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: PROJECT_PREPARE_LOUDSPEAKERS,
        short_label: "Relay Prep",
        player_hint: "Prepare loudspeaker relays to make Chorus routing scale with the growing base.",
        cta_copy: Some("Prepare Relays"),
        primary_risk_copy: Some(
            "Poor relay prep leaves larger field operations harder to sustain.",
        ),
        display_priority: 652,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: RECIPE_RESONANCE_FIELD_CALIBRATION,
        short_label: "Field Calibration",
        player_hint: "Calibration makes the current Bassline budget cover more ground.",
        cta_copy: Some("Run Calibration"),
        primary_risk_copy: Some("Skipping calibration makes bubble expansion more expensive."),
        display_priority: 640,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: RECIPE_MIX_SIGNAL_BALANCING,
        short_label: "Signal Balancing",
        player_hint: "Signal balancing improves Harmonics efficiency and brownout tolerance.",
        cta_copy: Some("Balance Signal"),
        primary_risk_copy: Some(
            "Without signal balancing, advanced power management stays brittle.",
        ),
        display_priority: 630,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: RECIPE_WORKSHOP_BUILDER_TOOLS,
        short_label: "Builder Tools",
        player_hint: "Builder Tools make every construction assignment hit harder.",
        cta_copy: Some("Craft Builder Tools"),
        primary_risk_copy: Some("No builder tooling means longer waits on every project."),
        display_priority: 620,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: RECIPE_WORKSHOP_WATER_CONDENSERS,
        short_label: "Water Condensers",
        player_hint: "Water Condensers expand Water capacity and refill it faster.",
        cta_copy: Some("Build Condensers"),
        primary_risk_copy: Some("Without condensers, Water becomes a repeated bottleneck."),
        display_priority: 610,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: RECIPE_RESEARCH_CHORUS_ROUTING,
        short_label: "Chorus Routing",
        player_hint: "Chorus Routing lowers life-support pressure on the power rail.",
        cta_copy: Some("Research Routing"),
        primary_risk_copy: Some(
            "Ignoring Chorus Routing leaves staffing more power-hungry than it needs to be.",
        ),
        display_priority: 600,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: RECIPE_RESEARCH_HARMONIC_STUDY,
        short_label: "Harmonic Study",
        player_hint: "Harmonic Study brings Harmonics tiers online faster.",
        cta_copy: Some("Study Harmonics"),
        primary_risk_copy: Some(
            "Without Harmonic Study, tier unlocks arrive later than the rest of the economy wants.",
        ),
        display_priority: 590,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: WORLD_ACTION_INVESTIGATE_BASE,
        short_label: "Investigate Base",
        player_hint: "The first investigation reveals what still works in the ruins.",
        cta_copy: Some("Investigate Base"),
        primary_risk_copy: None,
        display_priority: 570,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: WORLD_ACTION_EXPLORE_BASE,
        short_label: "Explore Base",
        player_hint: "Exploring deeper unlocks real repairs and the first upgrade loop.",
        cta_copy: Some("Explore Base"),
        primary_risk_copy: None,
        display_priority: 560,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_ROAD_TO_BASE,
        short_label: "Road to Base",
        player_hint: "Sets up the arrival path before the player reaches the sanctuary.",
        cta_copy: None,
        primary_risk_copy: None,
        display_priority: 555,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_HERO_EXPOSED,
        short_label: "Exposed",
        player_hint: "A reactive moment that interrupts when the Hero is caught outside the bubble.",
        cta_copy: None,
        primary_risk_copy: None,
        display_priority: 555,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_FIRST_GLIMPSE,
        short_label: "First Glimpse",
        player_hint: "Frames the first distant view of the Base and Crystal Circle.",
        cta_copy: None,
        primary_risk_copy: None,
        display_priority: 554,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_ENTER_THE_BUBBLE,
        short_label: "Enter the Bubble",
        player_hint: "Transitions the player from exposed arrival into the Base sanctuary.",
        cta_copy: None,
        primary_risk_copy: Some(
            "If this beat is unclear, the game loses its first sense of safety.",
        ),
        display_priority: 553,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_INVESTIGATE_BASE,
        short_label: "Investigate Beat",
        player_hint: "The first playable story beat: inspect the ruins and establish the immediate situation.",
        cta_copy: Some("Investigate Base"),
        primary_risk_copy: None,
        display_priority: 552,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_EXPLORE_BASE,
        short_label: "Explore Beat",
        player_hint: "The first exploratory beat: uncover repairs, water access, and the upgrade loop.",
        cta_copy: Some("Explore Base"),
        primary_risk_copy: None,
        display_priority: 551,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_RESTORE_STUDIO,
        short_label: "Restore Studio Beat",
        player_hint: "Marks the moment the Base becomes a real three-band machine.",
        cta_copy: Some("Restore Studio"),
        primary_risk_copy: Some(
            "Without the Studio, Chorus and most power interactions stay locked.",
        ),
        display_priority: 550,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_BUILD_FIRE_PIT,
        short_label: "Build Fire Pit Beat",
        player_hint: "Turns the Base from simple recovery into a place that can attract new survivors.",
        cta_copy: Some("Build Fire Pit"),
        primary_risk_copy: Some("No Fire Pit means no real social growth loop."),
        display_priority: 549,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_REACH_SURVIVOR_CAVE,
        short_label: "Reach Cave Beat",
        player_hint: "Push the bubble far enough to connect the Survivor Cave to the Base.",
        cta_copy: None,
        primary_risk_copy: Some(
            "If Bassline spending outruns field budget, the cave connection will stay out of reach.",
        ),
        display_priority: 548,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_FIRST_RECRUIT,
        short_label: "First Recruit Beat",
        player_hint: "Completes the first growth arc: the Base proves it can reach and keep someone new.",
        cta_copy: Some("Recruit Survivor"),
        primary_risk_copy: Some("If this beat lands too late, the first session feels static."),
        display_priority: 547,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL,
        short_label: "Arrival Beat",
        player_hint: "Hold the Base together while the first recruit travels back.",
        cta_copy: None,
        primary_risk_copy: Some(
            "This beat falls flat if the Base destabilizes before the recruit arrives.",
        ),
        display_priority: 546,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_STABILIZE_BASE,
        short_label: "Stabilize Beat",
        player_hint: "Transition from first success into a wider optimization game of power, staffing, and housing.",
        cta_copy: None,
        primary_risk_copy: Some(
            "If power, morale, or housing collapse here, the first session loses momentum.",
        ),
        display_priority: 545,
        reveal: PresentationReveal::Default,
    },
];

pub fn catalog_snapshot() -> CatalogSnapshot {
    CatalogSnapshot {
        resources: RESOURCES.to_vec(),
        roles: ROLES.to_vec(),
        stations: STATIONS.to_vec(),
        construction_options: CONSTRUCTION_OPTIONS.to_vec(),
        processing_recipes: PROCESSING_RECIPES.to_vec(),
        world_actions: WORLD_ACTIONS.to_vec(),
        expedition_targets: EXPEDITION_TARGETS.to_vec(),
        resonance_recipes: RESONANCE_RECIPES.to_vec(),
        story_beats: STORY_BEATS.to_vec(),
        objectives: OBJECTIVES.to_vec(),
        items: ITEMS.to_vec(),
        perks: PERKS.to_vec(),
        creatures: CREATURES.to_vec(),
        flags: FLAGS.to_vec(),
        models: model_snapshot(),
        flora: FLORA.to_vec(),
        structures: STRUCTURES.to_vec(),
        tiles: TILES.to_vec(),
        entity_schemas: ENTITY_SCHEMAS.iter().map(entity_schema_snapshot).collect(),
        ui_elements: UI_ELEMENTS.to_vec(),
        balance: BALANCE,
    }
}

pub fn resources() -> &'static [ResourceDef] {
    RESOURCES
}

pub fn resource_def(id: &str) -> Option<&'static ResourceDef> {
    RESOURCES.iter().find(|resource| resource.id == id)
}

pub fn roles() -> &'static [RoleDef] {
    ROLES
}

pub fn construction_options() -> &'static [ConstructionOptionDef] {
    CONSTRUCTION_OPTIONS
}

pub fn world_actions() -> &'static [WorldActionDef] {
    WORLD_ACTIONS
}

pub fn expedition_targets() -> &'static [ExpeditionTargetDef] {
    EXPEDITION_TARGETS
}

pub fn expedition_target_def(id: &str) -> Option<&'static ExpeditionTargetDef> {
    EXPEDITION_TARGETS.iter().find(|target| target.id == id)
}

pub fn resonance_recipes() -> &'static [ResonanceRecipeDef] {
    RESONANCE_RECIPES
}

pub fn resonance_recipe_def(id: &str) -> Option<&'static ResonanceRecipeDef> {
    RESONANCE_RECIPES.iter().find(|recipe| recipe.id == id)
}

pub fn story_beats() -> &'static [StoryBeatDef] {
    STORY_BEATS
}

pub fn story_beat_def(id: &str) -> Option<&'static StoryBeatDef> {
    STORY_BEATS.iter().find(|beat| beat.id == id)
}

pub fn flags() -> &'static [FlagDef] {
    FLAGS
}

pub fn processing_recipes() -> &'static [ProcessingRecipeDef] {
    PROCESSING_RECIPES
}

pub fn stations() -> &'static [StationDef] {
    STATIONS
}

pub fn flora() -> &'static [FloraDef] {
    FLORA
}

pub fn structures() -> &'static [StructureDef] {
    STRUCTURES
}

pub fn entity_schemas() -> &'static [EntitySchemaDef] {
    ENTITY_SCHEMAS
}

pub fn entity_schema_def(id: &str) -> Option<&'static EntitySchemaDef> {
    ENTITY_SCHEMAS.iter().find(|schema| schema.id == id)
}

pub fn presentation_def(id: &str) -> Option<&'static EntityPresentationDef> {
    ENTITY_PRESENTATIONS
        .iter()
        .find(|presentation| presentation.id == id)
}

pub fn visibility_def(id: &str) -> Option<&'static EntityVisibilityDef> {
    ENTITY_VISIBILITY
        .iter()
        .find(|visibility| visibility.id == id)
}

fn presentation_snapshot(id: &str) -> Option<PresentationDef> {
    presentation_def(id).map(|presentation| PresentationDef {
        short_label: presentation.short_label,
        player_hint: presentation.player_hint,
        cta_copy: presentation.cta_copy,
        primary_risk_copy: presentation.primary_risk_copy,
        display_priority: presentation.display_priority,
        reveal: presentation.reveal,
    })
}

fn visibility_snapshot(id: &str) -> Option<VisibilityDef> {
    visibility_def(id).map(|visibility| VisibilityDef {
        all_of: visibility.all_of,
        any_of: visibility.any_of,
    })
}

fn entity_schema_snapshot(schema: &EntitySchemaDef) -> EntitySchemaSnapshot {
    EntitySchemaSnapshot {
        id: schema.id,
        entity_kind: schema.entity_kind,
        persistence: schema.persistence,
        unlocks: schema.unlocks.to_vec(),
        blockers: schema.blockers.to_vec(),
        access_rules: schema.access_rules.to_vec(),
        power: schema.power,
        flows: schema.flows.to_vec(),
        model_refs: schema.model_refs.to_vec(),
        notes: schema.notes.to_vec(),
        presentation: presentation_snapshot(schema.id),
        visibility: visibility_snapshot(schema.id),
    }
}

fn model_snapshot() -> Vec<ModelDef> {
    let mut seen = std::collections::BTreeSet::new();
    let mut models = Vec::new();

    for schema in ENTITY_SCHEMAS {
        for model_ref in schema.model_refs {
            if seen.insert(model_ref.reference_id) {
                models.push(ModelDef {
                    id: model_ref.reference_id,
                    label: model_ref.label,
                    kind: model_ref.kind,
                });
            }
        }
    }

    models
}

pub fn role_def(id: &str) -> Option<&'static RoleDef> {
    ROLES.iter().find(|role| role.id == id)
}

pub fn construction_option_def(id: &str) -> Option<&'static ConstructionOptionDef> {
    CONSTRUCTION_OPTIONS.iter().find(|option| option.id == id)
}

pub fn world_action_def(id: &str) -> Option<&'static WorldActionDef> {
    WORLD_ACTIONS.iter().find(|action| action.id == id)
}

pub fn processing_recipe_def(id: &str) -> Option<&'static ProcessingRecipeDef> {
    PROCESSING_RECIPES.iter().find(|recipe| recipe.id == id)
}

pub fn station_def(id: &str) -> Option<&'static StationDef> {
    STATIONS.iter().find(|station| station.id == id)
}

pub fn tile_def(id: &str) -> Option<&'static TileDef> {
    TILES.iter().find(|tile| tile.id == id)
}

pub fn flora_def(id: &str) -> Option<&'static FloraDef> {
    FLORA.iter().find(|flora| flora.id == id)
}

pub fn structure_def(id: &str) -> Option<&'static StructureDef> {
    STRUCTURES.iter().find(|structure| structure.id == id)
}

pub fn perks() -> &'static [PerkDef] {
    PERKS
}

pub fn perk_def(id: &str) -> Option<&'static PerkDef> {
    PERKS.iter().find(|perk| perk.id == id)
}

pub fn items() -> &'static [ItemDef] {
    ITEMS
}

pub fn item_def(id: &str) -> Option<&'static ItemDef> {
    ITEMS.iter().find(|item| item.id == id)
}

pub fn creatures() -> &'static [CreatureDef] {
    CREATURES
}

pub fn creature_def(id: &str) -> Option<&'static CreatureDef> {
    CREATURES.iter().find(|creature| creature.id == id)
}

pub fn objectives() -> &'static [ObjectiveDef] {
    OBJECTIVES
}

pub fn objective_def(id: &str) -> Option<&'static ObjectiveDef> {
    OBJECTIVES.iter().find(|objective| objective.id == id)
}

pub fn balance_snapshot() -> BalanceSnapshot {
    BALANCE
}

/// The ADD overworld as data. The base disk, the Survivor Cave landmark, and
/// the terrain regions that used to be hardcoded in two parallel match ladders
/// now live here as one [`MapDefinition`]; `tile_id_for`/`terrain_profile_for`
/// are thin readers over it, so tile identity and terrain can never drift.
///
/// Region order is significant (first match wins) — it mirrors the original
/// ladder: river → mountain → ridge → scrub, over a plains default.
pub const OVERWORLD_MAP: MapDefinition = MapDefinition {
    radius: crate::state::GRID_RADIUS,
    base_q: crate::state::BASE_Q,
    base_r: crate::state::BASE_R,
    base: MapCell {
        tile_id: TILE_BASE_CORE,
        terrain: TerrainSnapshot::Plains,
        impedance: TERRAIN_PLAINS_IMPEDANCE,
        is_blocker: false,
    },
    landmarks: &[Landmark {
        key: "survivor_cave",
        q: crate::state::SURVIVOR_CAVE_Q,
        r: crate::state::SURVIVOR_CAVE_R,
        cell: MapCell {
            tile_id: TILE_SURVIVOR_CAVE,
            terrain: TerrainSnapshot::Plains,
            impedance: TERRAIN_PLAINS_IMPEDANCE,
            is_blocker: false,
        },
    }],
    regions: &[
        // Terrain regions are authored around the Studio/base anchor, so moving
        // the Studio preserves early bubble costs and onboarding timing.
        // River shallows: the r == -2 band across the centre columns.
        TerrainRegion {
            bounds: AxialBounds {
                q_min: crate::state::BASE_Q - 1,
                q_max: crate::state::BASE_Q + 2,
                r_min: crate::state::BASE_R - 2,
                r_max: crate::state::BASE_R - 2,
            },
            cell: MapCell {
                tile_id: TILE_RIVER_SHALLOWS,
                terrain: TerrainSnapshot::River,
                impedance: TERRAIN_RIVER_IMPEDANCE,
                is_blocker: false,
            },
        },
        // Mountain wall: the impassable far-northwest wedge (q <= -3, r >= 1).
        TerrainRegion {
            bounds: AxialBounds {
                q_min: i8::MIN,
                q_max: crate::state::BASE_Q - 3,
                r_min: crate::state::BASE_R + 1,
                r_max: i8::MAX,
            },
            cell: MapCell {
                tile_id: TILE_MOUNTAIN_WALL,
                terrain: TerrainSnapshot::Mountain,
                impedance: TERRAIN_MOUNTAIN_IMPEDANCE,
                is_blocker: true,
            },
        },
        // Ridge line: the southeast highland (q >= 2, r >= 2).
        TerrainRegion {
            bounds: AxialBounds {
                q_min: crate::state::BASE_Q + 2,
                q_max: i8::MAX,
                r_min: crate::state::BASE_R + 2,
                r_max: i8::MAX,
            },
            cell: MapCell {
                tile_id: TILE_RIDGE_LINE,
                terrain: TerrainSnapshot::Ridge,
                impedance: TERRAIN_RIDGE_IMPEDANCE,
                is_blocker: false,
            },
        },
        // Scrub patch: the northern dry belt (q <= 0, r <= -3).
        TerrainRegion {
            bounds: AxialBounds {
                q_min: i8::MIN,
                q_max: crate::state::BASE_Q,
                r_min: i8::MIN,
                r_max: crate::state::BASE_R - 3,
            },
            cell: MapCell {
                tile_id: TILE_SCRUB_PATCH,
                terrain: TerrainSnapshot::Scrub,
                impedance: TERRAIN_SCRUB_IMPEDANCE,
                is_blocker: false,
            },
        },
    ],
    default: MapCell {
        tile_id: TILE_PLAINS_OPEN,
        terrain: TerrainSnapshot::Plains,
        impedance: TERRAIN_PLAINS_IMPEDANCE,
        is_blocker: false,
    },
};

/// Terrain profile for an overworld cell. Thin reader over [`OVERWORLD_MAP`].
pub fn terrain_profile_for(q: i8, r: i8, distance: u8) -> TerrainProfile {
    OVERWORLD_MAP.cell_at(q, r, distance).terrain_profile()
}

/// Tile id for an overworld cell. Thin reader over [`OVERWORLD_MAP`].
pub fn tile_id_for(q: i8, r: i8, distance: u8) -> &'static str {
    OVERWORLD_MAP.cell_at(q, r, distance).tile_id
}

pub fn recruit_cost_for_index(index: u16) -> f64 {
    let balance = BALANCE.recruitment;
    let i = f64::from(index.max(1));
    let good_vibes_opt_per_tick =
        balance.good_vibes_opt_base + balance.good_vibes_opt_step * (i - 1.0);
    let t30 = balance.t30_total_good_vibes
        / ((balance.good_vibes_opt_base + balance.good_vibes_opt_step * 29.0) * 60.0);
    let t500 = balance.t500_total_good_vibes
        / ((balance.good_vibes_opt_base + balance.good_vibes_opt_step * 499.0) * 60.0);
    let t1000 = balance.t1000_total_good_vibes
        / ((balance.good_vibes_opt_base + balance.good_vibes_opt_step * 999.0) * 60.0);

    let minutes = if i <= 30.0 {
        let progress = (i - 1.0) / 29.0;
        balance.t1_minutes + (t30 - balance.t1_minutes) * progress.powi(2)
    } else if i <= 500.0 {
        t30 + (t500 - t30) * ((i - 30.0) / 470.0)
    } else {
        let k_time = 500.0 / (t1000 / t500).ln();
        t500 * ((i - 500.0) / k_time).exp()
    };

    (good_vibes_opt_per_tick * 60.0 * minutes).ceil()
}
