use serde::{Deserialize, Serialize};

use crate::game_data::BlockerKind;
use crate::state::GameEvent;

/// Stable catalog identifier for the reason a command was rejected.
pub type BlockerId = BlockerKind;

/// The authoritative result of applying one command to the simulation.
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CommandOutcome {
    pub accepted: bool,
    pub blocker: Option<BlockerId>,
    pub events: Vec<GameEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum GameCommand {
    ChooseStoryOption {
        beat_id: String,
        option_id: String,
    },
    /// Record a consequential act. Dialogue and gameplay both arrive here, so
    /// clearing a nest and promising a survivor water land in one log and move
    /// standing by the same pipeline.
    EmitAct {
        act_id: String,
        target: Option<String>,
        /// Cost to the Hero, 0.6 to 2.0. Amplifies help only.
        cost: f64,
        /// How badly the target needed it, 1.0 to 2.0.
        need: f64,
        /// Override the act's default visibility when presence says otherwise.
        secrecy: Option<String>,
        /// Who saw it, beyond the target. The engine's perception supplies
        /// this; authored dialogue never lists witnesses.
        witnesses: Vec<String>,
        /// Earlier events this one happened because of.
        causes: Vec<u64>,
    },
    /// Hand an entity an event at full fidelity: a confession, or proof.
    Tell {
        entity_id: String,
        event_id: u64,
    },
    /// Stop an entity passing anything on. A witness bought, removed, or
    /// simply persuaded.
    Silence {
        entity_id: String,
    },
    /// Take a choice presented by the ink scene for `beat_id`. Ink resolves
    /// which authored choice id that was; its effects come from the catalog.
    ChooseInkChoice {
        beat_id: String,
        index: u16,
    },
    CompletePreArrivalRoute,
    SetHeroAssigned {
        assigned: bool,
    },
    SetHeroRole {
        role_id: String,
    },
    SetRoleCrew {
        role_id: String,
        crew: u8,
    },
    SetStationEnabled {
        station_id: String,
        enabled: bool,
    },
    StartWorldAction {
        action_id: String,
    },
    StartConstruction {
        option_id: String,
    },
    StartProcessing {
        recipe_id: String,
    },
    StartResonanceRecipe {
        recipe_id: String,
    },
    SetStationSpecialization {
        station_id: String,
        path: crate::state::StationSpecializationPathState,
    },
    StartExpedition {
        target_id: String,
        assigned_crew: u16,
    },
    ClearExpeditionReports,
    RecruitFromSurvivorCave,
    MoveHeroTo {
        q: i8,
        r: i8,
    },
    OpenDoor {
        key: String,
    },
    ClearLocation {
        key: String,
        loot_item: Option<String>,
        loot_qty: u32,
    },
    /// Begin an auto-battler skirmish against a creature occupying `key`. The
    /// client supplies the (already-resolved) loot to drop on victory.
    Engage {
        creature_id: String,
        key: String,
        loot_item: Option<String>,
        loot_qty: u32,
    },
    DropItem {
        key: String,
        item_id: String,
        qty: u32,
    },
    PickUpLocation {
        key: String,
    },
    UseItem {
        item_id: String,
    },
    AcquirePerk {
        perk_id: String,
    },
    SpendBassline {
        amount: f64,
    },
    Tick {
        seconds: f64,
    },
    RunOfflineCatchup {
        elapsed_seconds: f64,
    },
    /// Dev-only live tuning: override a balance field by dotted camelCase path.
    SetBalanceOverride {
        path: String,
        value: f64,
    },
    /// Dev-only: drop all balance overrides, restoring the authored baseline.
    ResetBalanceOverrides,
    ResetRun,
}
