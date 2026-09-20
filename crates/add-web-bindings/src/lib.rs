use std::collections::BTreeMap;

use add_core::{
    CommandOutcome, GameCommand, GameState, Simulation, catalog_snapshot, export_save, import_save,
};
use serde::Serialize;
use wasm_bindgen::prelude::*;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WebSnapshot<'a> {
    #[serde(flatten)]
    state: &'a GameState,
    command_availability: BTreeMap<String, CommandOutcome>,
}

#[wasm_bindgen]
pub struct WebRuntime {
    simulation: Simulation,
}

#[wasm_bindgen]
impl WebRuntime {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            simulation: Simulation::new(),
        }
    }

    #[wasm_bindgen(js_name = snapshot)]
    pub fn snapshot(&self) -> Result<JsValue, JsValue> {
        WebSnapshot {
            state: self.simulation.state(),
            command_availability: self.simulation.command_availability(),
        }
        .serialize(&serde_wasm_bindgen::Serializer::json_compatible())
        .map_err(|error| JsValue::from_str(&error.to_string()))
    }

    #[wasm_bindgen(js_name = commandAvailability)]
    pub fn command_availability(&self) -> Result<JsValue, JsValue> {
        self.simulation
            .command_availability()
            .serialize(&serde_wasm_bindgen::Serializer::json_compatible())
            .map_err(|error| JsValue::from_str(&error.to_string()))
    }

    #[wasm_bindgen(js_name = catalog)]
    pub fn catalog(&self) -> Result<JsValue, JsValue> {
        catalog_snapshot()
            .serialize(&serde_wasm_bindgen::Serializer::json_compatible())
            .map_err(|error| JsValue::from_str(&error.to_string()))
    }

    #[wasm_bindgen(js_name = tick)]
    pub fn tick(&mut self, seconds: f64) -> Result<JsValue, JsValue> {
        apply_command(&mut self.simulation, GameCommand::Tick { seconds })
    }

    #[wasm_bindgen(js_name = chooseStoryOption)]
    pub fn choose_story_option(
        &mut self,
        beat_id: &str,
        option_id: &str,
    ) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::ChooseStoryOption {
                beat_id: beat_id.to_string(),
                option_id: option_id.to_string(),
            },
        )
    }

    #[wasm_bindgen(js_name = completePreArrivalRoute)]
    pub fn complete_pre_arrival_route(&mut self) -> Result<JsValue, JsValue> {
        apply_command(&mut self.simulation, GameCommand::CompletePreArrivalRoute)
    }

    #[wasm_bindgen(js_name = assignHero)]
    pub fn assign_hero(&mut self, assigned: bool) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::SetHeroAssigned { assigned },
        )
    }

    #[wasm_bindgen(js_name = setHeroRole)]
    pub fn set_hero_role(&mut self, role_id: &str) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::SetHeroRole {
                role_id: role_id.to_string(),
            },
        )
    }

    #[wasm_bindgen(js_name = runOfflineCatchup)]
    pub fn run_offline_catchup(&mut self, elapsed_seconds: f64) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::RunOfflineCatchup { elapsed_seconds },
        )
    }

    #[wasm_bindgen(js_name = setRoleCrew)]
    pub fn set_role_crew(&mut self, role_id: &str, crew: u8) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::SetRoleCrew {
                role_id: role_id.to_string(),
                crew,
            },
        )
    }

    #[wasm_bindgen(js_name = setStationEnabled)]
    pub fn set_station_enabled(
        &mut self,
        station_id: &str,
        enabled: bool,
    ) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::SetStationEnabled {
                station_id: station_id.to_string(),
                enabled,
            },
        )
    }

    #[wasm_bindgen(js_name = startWorldAction)]
    pub fn start_world_action(&mut self, action_id: &str) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::StartWorldAction {
                action_id: action_id.to_string(),
            },
        )
    }

    #[wasm_bindgen(js_name = startConstruction)]
    pub fn start_construction(&mut self, option_id: &str) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::StartConstruction {
                option_id: option_id.to_string(),
            },
        )
    }

    #[wasm_bindgen(js_name = startProcessing)]
    pub fn start_processing(&mut self, recipe_id: &str) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::StartProcessing {
                recipe_id: recipe_id.to_string(),
            },
        )
    }

    #[wasm_bindgen(js_name = startResonanceRecipe)]
    pub fn start_resonance_recipe(&mut self, recipe_id: &str) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::StartResonanceRecipe {
                recipe_id: recipe_id.to_string(),
            },
        )
    }

    #[wasm_bindgen(js_name = setStationSpecialization)]
    pub fn set_station_specialization(
        &mut self,
        station_id: &str,
        path: &str,
    ) -> Result<JsValue, JsValue> {
        let path = match path {
            "conversion" => add_core::StationSpecializationPathState::Conversion,
            "field" => add_core::StationSpecializationPathState::Field,
            "extraction" => add_core::StationSpecializationPathState::Extraction,
            _ => add_core::StationSpecializationPathState::Balanced,
        };
        apply_command(
            &mut self.simulation,
            GameCommand::SetStationSpecialization {
                station_id: station_id.to_string(),
                path,
            },
        )
    }

    #[wasm_bindgen(js_name = startExpedition)]
    pub fn start_expedition(
        &mut self,
        target_id: &str,
        assigned_crew: u16,
    ) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::StartExpedition {
                target_id: target_id.to_string(),
                assigned_crew,
            },
        )
    }

    #[wasm_bindgen(js_name = clearExpeditionReports)]
    pub fn clear_expedition_reports(&mut self) -> Result<JsValue, JsValue> {
        apply_command(&mut self.simulation, GameCommand::ClearExpeditionReports)
    }

    #[wasm_bindgen(js_name = recruitFromSurvivorCave)]
    pub fn recruit_from_survivor_cave(&mut self) -> Result<JsValue, JsValue> {
        apply_command(&mut self.simulation, GameCommand::RecruitFromSurvivorCave)
    }

    #[wasm_bindgen(js_name = moveHeroTo)]
    pub fn move_hero_to(&mut self, q: i8, r: i8) -> Result<JsValue, JsValue> {
        apply_command(&mut self.simulation, GameCommand::MoveHeroTo { q, r })
    }

    #[wasm_bindgen(js_name = openDoor)]
    pub fn open_door(&mut self, key: &str) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::OpenDoor {
                key: key.to_string(),
            },
        )
    }

    #[wasm_bindgen(js_name = acquirePerk)]
    pub fn acquire_perk(&mut self, perk_id: &str) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::AcquirePerk {
                perk_id: perk_id.to_string(),
            },
        )
    }

    #[wasm_bindgen(js_name = clearLocation)]
    pub fn clear_location(
        &mut self,
        key: &str,
        loot_item: Option<String>,
        loot_qty: u32,
    ) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::ClearLocation {
                key: key.to_string(),
                loot_item,
                loot_qty,
            },
        )
    }

    #[wasm_bindgen(js_name = engage)]
    pub fn engage(
        &mut self,
        creature_id: &str,
        key: &str,
        loot_item: Option<String>,
        loot_qty: u32,
    ) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::Engage {
                creature_id: creature_id.to_string(),
                key: key.to_string(),
                loot_item,
                loot_qty,
            },
        )
    }

    #[wasm_bindgen(js_name = dropItem)]
    pub fn drop_item(&mut self, key: &str, item_id: &str, qty: u32) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::DropItem {
                key: key.to_string(),
                item_id: item_id.to_string(),
                qty,
            },
        )
    }

    #[wasm_bindgen(js_name = pickUpLocation)]
    pub fn pick_up_location(&mut self, key: &str) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::PickUpLocation {
                key: key.to_string(),
            },
        )
    }

    #[wasm_bindgen(js_name = useItem)]
    pub fn use_item(&mut self, item_id: &str) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::UseItem {
                item_id: item_id.to_string(),
            },
        )
    }

    #[wasm_bindgen(js_name = spendBassline)]
    pub fn spend_bassline(&mut self, amount: f64) -> Result<JsValue, JsValue> {
        apply_command(&mut self.simulation, GameCommand::SpendBassline { amount })
    }

    #[wasm_bindgen(js_name = setBalanceOverride)]
    pub fn set_balance_override(&mut self, path: &str, value: f64) -> Result<JsValue, JsValue> {
        apply_command(
            &mut self.simulation,
            GameCommand::SetBalanceOverride {
                path: path.to_string(),
                value,
            },
        )
    }

    #[wasm_bindgen(js_name = resetBalanceOverrides)]
    pub fn reset_balance_overrides(&mut self) -> Result<JsValue, JsValue> {
        apply_command(&mut self.simulation, GameCommand::ResetBalanceOverrides)
    }

    #[wasm_bindgen(js_name = exportSave)]
    pub fn export_save(&self) -> Result<String, JsValue> {
        export_save(self.simulation.state()).map_err(|error| JsValue::from_str(&error.to_string()))
    }

    #[wasm_bindgen(js_name = importSave)]
    pub fn import_save(&mut self, raw: &str) -> Result<(), JsValue> {
        let state = import_save(raw).map_err(|error| JsValue::from_str(&error.to_string()))?;
        self.simulation = Simulation::from_state(state);
        Ok(())
    }
}

fn apply_command(simulation: &mut Simulation, command: GameCommand) -> Result<JsValue, JsValue> {
    simulation
        .apply(command)
        .serialize(&serde_wasm_bindgen::Serializer::json_compatible())
        .map_err(|error| JsValue::from_str(&error.to_string()))
}

impl Default for WebRuntime {
    fn default() -> Self {
        Self::new()
    }
}

pub fn state_from_js(value: JsValue) -> Result<GameState, JsValue> {
    serde_wasm_bindgen::from_value(value).map_err(|error| JsValue::from_str(&error.to_string()))
}
