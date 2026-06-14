use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum GameCommand {
    ChooseStoryOption {
        beat_id: String,
        option_id: String,
    },
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
