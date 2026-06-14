use crate::command::GameCommand;
use crate::game_data::{
    BalanceSnapshot, COST_ITEM_SKIN, Condition, ConstructionOptionDef, CostDef, CostItemDef,
    CrystalTrack, EffectDef, ExpeditionRiskDef, ExpeditionTargetDef, FLAG_BASE_FIRE_PIT_BUILT,
    FLAG_BASE_MIX_CONSOLE_BUILT, FLAG_BASE_RESEARCH_BOOTH_BUILT, FLAG_BASE_RESONANCE_CHAMBER_BUILT,
    FLAG_BASE_STUDIO_RESTORE_UNLOCKED, FLAG_BASE_STUDIO_RESTORED, FLAG_BASE_TUTORIAL_EXPLORED,
    FLAG_BASE_TUTORIAL_INVESTIGATED, FLAG_BASE_WATER_COLLECTION_UNLOCKED, FLAG_BASE_WORKSHOP_BUILT,
    FLAG_CRYSTAL_REMOVING_MOSS_COMPLETED, FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED,
    FLAG_HERO_FORCED_RETURN_ACTIVE, FLAG_HERO_OUTSIDE_BUBBLE, FLAG_HERO_RECOVERING_AT_STUDIO,
    HeroExposureDef, HeroTrack, INTRO_STORY_BEAT_IDS, ItemEffectKind, PerkStat, ProcessingTrack,
    RESONANCE_MATERIAL_ECHO_SHARDS, RESONANCE_MATERIAL_HARMONIC_RESIDUE,
    RESONANCE_MATERIAL_SIGNAL_SCRAP, RESOURCE_BASSLINE, RESOURCE_CHORUS, RESOURCE_HARMONICS,
    RESOURCE_STONE, RESOURCE_VIBES, RESOURCE_WATER, ROLE_CONSTRUCTION, ROLE_CRYSTAL_BASSLINE,
    ROLE_CRYSTAL_CHORUS, ROLE_CRYSTAL_HARMONICS, ROLE_FIRE_PIT, ROLE_SCAVENGE, ROLE_WATER,
    RequirementDef, ResonanceEffectDef, ResonanceRecipeDef, ResonanceTuningTrackDef, RoleSlotPool,
    STATION_MIX_CONSOLE, STATION_RESEARCH_BOOTH, STATION_RESONANCE_CHAMBER, STATION_WORKSHOP,
    TileFeature, balance_snapshot, construction_option_def, creature_def, expedition_target_def,
    item_def,
    perk_def, processing_recipe_def, recruit_cost_for_index, resonance_recipe_def, role_def,
    station_def, stations, story_beat_def, story_beats, tile_def, world_action_def,
};
use crate::state::{
    CombatJob, CombatLogEntry, ConstructionJob, CrystalTuningTrackState, ExpeditionJob,
    ExpeditionReport, ExpeditionRiskState,
    ForcedReturnPhase, ForcedReturnState, GRID_RADIUS, GameState, HeroLocationState, HexCoordState,
    HexState, HexVisualState, ResonanceJob, ResonanceReport, StationSpecializationPathState,
    WorldAction, initial_discovered_cells,
};

/// Scrap-metal items yielded per second of scavenging effort (a unit of effort
/// is one worker at full efficiency). Independent of stone storage.
const SCRAP_PER_EFFORT_SECOND: f64 = 0.2;
const ITEM_SCRAP_METAL: &str = "item.scrap_metal";
const RESONANCE_TUNING_OUTPUT_BONUS_PER_LEVEL: f64 = 0.06;
const RESONANCE_SUPPORT_DURATION_REDUCTION_PER_LEVEL: f64 = 0.04;
const RESONANCE_SUPPORT_DURATION_REDUCTION_CAP: f64 = 0.35;
const STATION_SPECIALIZATION_CONVERSION_SPEED_BONUS: f64 = 0.2;
const STATION_SPECIALIZATION_FIELD_DURATION_BONUS: f64 = 0.12;

#[derive(Debug, Clone)]
pub struct Simulation {
    state: GameState,
}

impl Default for Simulation {
    fn default() -> Self {
        Self::new()
    }
}

impl Simulation {
    pub fn new() -> Self {
        let mut simulation = Self {
            state: GameState::new(),
        };
        simulation.normalize_assignment();
        simulation.refresh_hero_survival_state();
        simulation.refresh_base_pressure_state();
        simulation.refresh_power_state();
        simulation.state.resources.water_cap = simulation.water_cap();
        simulation.refresh_bubble_state();
        simulation.refresh_objectives();
        simulation.refresh_narrative_state();
        simulation
    }

    pub fn from_state(mut state: GameState) -> Self {
        let balance = balance_snapshot();
        // `import_save` already migrates + stamps the version before deserialize;
        // this also covers states built directly (tests, resets). Idempotent.
        if state.schema_version < crate::migrations::CURRENT_SCHEMA_VERSION {
            state.schema_version = crate::migrations::CURRENT_SCHEMA_VERSION;
        }
        state.resources.bassline_cap = state
            .resources
            .bassline_cap
            .max(balance.crystal.base_bassline_cap);
        state.resources.chorus_cap = state
            .resources
            .chorus_cap
            .max(balance.crystal.base_chorus_cap);
        state.resources.harmonics_cap = state
            .resources
            .harmonics_cap
            .max(balance.crystal.base_harmonics_cap);
        state.resources.stone_cap = state.resources.stone_cap.max(1000.0);
        state.resources.water_cap = state.resources.water_cap.max(balance.water.water_cap);
        state.resources.vibes_cap = state.resources.vibes_cap.max(100.0);
        state.resources.base_stone_stock = state
            .resources
            .base_stone_stock
            .clamp(0.0, balance.scavenge.base_stock_max);
        state.resources.base_water_stock = state
            .resources
            .base_water_stock
            .clamp(0.0, balance.water.base_stock_max);
        for station in stations() {
            state
                .stations
                .entry(station.id.to_string())
                .or_insert(crate::state::StationState {
                    requested_enabled: station.starts_requested,
                    is_powered: station.chorus_upkeep_per_second <= 0.0,
                    power_order: u32::from(station.ui_order),
                });
        }

        let mut simulation = Self { state };
        simulation.normalize_discovery_state();
        simulation.normalize_assignment();
        simulation.refresh_hero_survival_state();
        simulation.normalize_station_state();
        simulation.refresh_base_pressure_state();
        simulation.refresh_power_state();
        simulation.state.resources.water_cap = simulation.water_cap();
        simulation.refresh_bubble_state();
        simulation.refresh_objectives();
        simulation.refresh_narrative_state();
        simulation
    }

    pub fn state(&self) -> &GameState {
        &self.state
    }

    pub fn into_state(self) -> GameState {
        self.state
    }

    /// Mutable state access for tests that need to construct specific scenarios
    /// (e.g. a brownout) without driving the full sim to reach them.
    #[cfg(test)]
    pub(crate) fn state_mut(&mut self) -> &mut GameState {
        &mut self.state
    }

    pub fn apply(&mut self, command: GameCommand) {
        // `events` reflects only what this command/tick produced.
        self.state.events.clear();
        match command {
            GameCommand::ChooseStoryOption { beat_id, option_id } => {
                self.choose_story_option(&beat_id, &option_id)
            }
            GameCommand::SetHeroAssigned { assigned } => self.set_hero_assigned(assigned),
            GameCommand::SetHeroRole { role_id } => self.set_hero_role(&role_id),
            GameCommand::SetRoleCrew { role_id, crew } => self.set_role_crew(&role_id, crew),
            GameCommand::SetStationEnabled {
                station_id,
                enabled,
            } => self.set_station_enabled(&station_id, enabled),
            GameCommand::StartWorldAction { action_id } => self.start_world_action(&action_id),
            GameCommand::StartConstruction { option_id } => self.start_construction(&option_id),
            GameCommand::StartProcessing { recipe_id } => self.start_processing(&recipe_id),
            GameCommand::StartResonanceRecipe { recipe_id } => {
                self.start_resonance_recipe(&recipe_id)
            }
            GameCommand::SetStationSpecialization { station_id, path } => {
                self.set_station_specialization(&station_id, path)
            }
            GameCommand::StartExpedition {
                target_id,
                assigned_crew,
            } => self.start_expedition(&target_id, assigned_crew),
            GameCommand::ClearExpeditionReports => self.clear_expedition_reports(),
            GameCommand::RecruitFromSurvivorCave => self.recruit_from_survivor_cave(),
            GameCommand::MoveHeroTo { q, r } => self.move_hero_to(q, r),
            GameCommand::OpenDoor { key } => {
                self.state.open_doors.insert(key);
            }
            GameCommand::ClearLocation {
                key,
                loot_item,
                loot_qty,
            } => self.clear_location(key, loot_item, loot_qty),
            GameCommand::Engage {
                creature_id,
                key,
                loot_item,
                loot_qty,
            } => self.engage(&creature_id, key, loot_item, loot_qty),
            GameCommand::DropItem { key, item_id, qty } => self.drop_item(key, item_id, qty),
            GameCommand::PickUpLocation { key } => self.pick_up_location(&key),
            GameCommand::UseItem { item_id } => self.use_item(&item_id),
            GameCommand::AcquirePerk { perk_id } => self.acquire_perk(&perk_id),
            GameCommand::SpendBassline { amount } => self.spend_bassline(amount),
            GameCommand::Tick { seconds } => self.tick_internal(seconds, false),
            GameCommand::RunOfflineCatchup { elapsed_seconds } => {
                self.tick_internal(elapsed_seconds, true)
            }
            GameCommand::ResetRun => {
                self.state = GameState::new();
                self.refresh_hero_survival_state();
                self.refresh_base_pressure_state();
                self.refresh_power_state();
                self.refresh_bubble_state();
                self.normalize_discovery_state();
                self.normalize_assignment();
                self.refresh_objectives();
                self.refresh_narrative_state();
            }
        }
    }

    fn move_hero_to(&mut self, q: i8, r: i8) {
        let Some(destination) = self
            .state
            .hexes
            .iter()
            .find(|hex| hex.q == q && hex.r == r)
            .cloned()
        else {
            self.push_note(format!(
                "Hero movement ignored: hex {q},{r} is outside the map."
            ));
            return;
        };

        if !self.hex_is_open(&destination) || destination.state == HexVisualState::Blocked {
            self.push_note(format!("Hero movement ignored: hex {q},{r} is blocked."));
            return;
        }

        self.state.hero_map = HexCoordState::new(q, r);
        self.reveal_hero_vision_at(q, r);
    }

    fn set_hero_assigned(&mut self, assigned: bool) {
        if assigned && self.hero_locked_by_survival() {
            self.push_note("Hero cannot be assigned while forced return or recovery is active.");
            return;
        }
        self.state.roster.hero_assigned = assigned;
        self.normalize_assignment();
        self.push_note(if assigned {
            "Hero assigned to active duty."
        } else {
            "Hero set to idle."
        });
    }

    fn set_hero_role(&mut self, role_id: &str) {
        if self.hero_locked_by_survival() {
            self.push_note("Hero cannot switch roles during forced return or recovery.");
            return;
        }
        if role_def(role_id).is_none() {
            self.push_note(format!("Unknown Hero role: {role_id}."));
            return;
        }
        if !self.role_available(role_id) {
            self.push_note(format!("{} is not unlocked yet.", self.role_label(role_id)));
            return;
        }
        self.state.roster.hero_role_id = role_id.to_string();
        self.state.roster.hero_assigned = true;
        self.normalize_assignment();
        self.push_note(format!("Hero switched to {}.", self.role_label(role_id)));
    }

    fn set_role_crew(&mut self, role_id: &str, crew: u8) {
        let Some(role) = role_def(role_id) else {
            self.push_note(format!("Unknown crew role: {role_id}."));
            return;
        };
        if !role.crew_allowed {
            self.push_note(format!("{} cannot receive crew assignments.", role.label));
            return;
        }
        if !self.role_available(role_id) {
            self.push_note(format!("{} is not unlocked yet.", role.label));
            return;
        }
        let requested = crew;
        let clamped = requested.min(self.max_crew_for_role(role_id));
        self.state
            .roster
            .crew_by_role
            .insert(role_id.to_string(), clamped);
        self.normalize_assignment();
        if clamped < requested {
            self.push_note(format!(
                "{} crew request clipped to {} by current capacity.",
                role.label, clamped
            ));
        }
        self.push_note(format!(
            "{} crew updated to {}.",
            role.label,
            self.crew_count(role_id)
        ));
    }

    fn set_station_enabled(&mut self, station_id: &str, enabled: bool) {
        let Some(def) = station_def(station_id) else {
            self.push_note(format!("Unknown station: {station_id}."));
            return;
        };
        if !def.manual_power {
            self.push_note(format!("{} cannot be toggled manually.", def.label));
            return;
        }
        if !self.requirements_met(def.requirements) {
            self.push_note(format!("{} is not built yet.", def.label));
            return;
        }

        let next_order = self
            .state
            .stations
            .values()
            .map(|station| station.power_order)
            .max()
            .unwrap_or(0)
            .saturating_add(1);

        let station = self.state.stations.entry(station_id.to_string()).or_insert(
            crate::state::StationState {
                requested_enabled: def.starts_requested,
                is_powered: def.chorus_upkeep_per_second <= 0.0,
                power_order: next_order,
            },
        );

        station.requested_enabled = enabled;
        if enabled {
            station.power_order = next_order;
        } else {
            station.is_powered = false;
        }

        self.refresh_power_state();
        self.resolve_station_power(0.0);
        self.refresh_power_state();
        self.refresh_bubble_state();
        self.push_note(format!(
            "{} {}.",
            def.label,
            if enabled {
                "requested on"
            } else {
                "set to standby"
            }
        ));
    }

    fn choose_story_option(&mut self, beat_id: &str, option_id: &str) {
        let Some(active_beat_id) = self.state.narrative.active_beat_id.as_deref() else {
            self.push_note("There is no active story beat right now.");
            return;
        };
        if active_beat_id != beat_id {
            self.push_note("Finish the current story beat before making another choice.");
            return;
        }

        let Some(beat) = story_beat_def(beat_id) else {
            self.push_note(format!("Unknown story beat: {beat_id}."));
            return;
        };
        let Some(choice) = beat.choices.iter().find(|choice| choice.id == option_id) else {
            self.push_note(format!("Unknown story choice: {option_id}."));
            return;
        };

        let choice_effects = choice.effects;
        let world_action_none = beat.world_action_id.is_none();
        self.state
            .narrative
            .choice_by_beat
            .insert(beat_id.to_string(), option_id.to_string());
        self.push_note(format!("{}: {}", beat.label, choice.label));
        // The consequence: the choice mutates state (typically narrative
        // qualities) so later storylets can react to what the player chose.
        self.apply_effects(choice_effects);

        if world_action_none {
            self.mark_story_beat_complete(beat_id);
            self.refresh_narrative_state();
        }
    }

    fn start_world_action(&mut self, action_id: &str) {
        let Some(action_def) = world_action_def(action_id) else {
            self.push_note(format!("Unknown world action: {action_id}."));
            return;
        };
        if self.hero_locked_by_survival() {
            self.push_note("Hero is not ready for world actions while survival lock is active.");
            return;
        }
        if !self.story_action_allowed(action_id) {
            return;
        }
        if self.state.active_world_action.is_some() {
            self.push_note("A world action is already in progress.");
            return;
        }
        if self.state.active_construction.is_some()
            && self.state.roster.hero_assigned
            && self.hero_on_role(ROLE_CONSTRUCTION)
        {
            self.push_note("The Hero is building. Reassign them before starting a world action.");
            return;
        }
        if !self.requirements_met(action_def.requirements) {
            self.push_note(format!("{} is not available yet.", action_def.label));
            return;
        }

        let hero_assigned_before = self.state.roster.hero_assigned;
        let hero_role_id_before = self.state.roster.hero_role_id.clone();

        self.state.active_world_action = Some(WorldAction {
            action_id: action_def.id.to_string(),
            total_seconds: action_def.duration_seconds,
            remaining_seconds: action_def.duration_seconds,
            hero_assigned_before,
            hero_role_id_before,
        });

        self.state.roster.hero_assigned = false;
        self.apply_world_action_exposure(action_def);
        self.normalize_assignment();
        self.push_note(format!("Hero started {}.", action_def.label));
    }

    fn start_construction(&mut self, option_id: &str) {
        let Some(option_def) = construction_option_def(option_id) else {
            self.push_note(format!("Unknown construction option: {option_id}."));
            return;
        };
        if self.state.active_construction.is_some() {
            self.push_note("Construction already in progress.");
            return;
        }
        if !self.requirements_met(option_def.requirements) {
            self.push_note(format!("{} is not available yet.", option_def.label));
            return;
        }

        let total_work_seconds = self.construction_duration(option_def);
        let (resource_id, total_cost, spent_cost, per_worker_cost_per_second) =
            match option_def.cost {
                CostDef::DrainPerWorkerSecond {
                    resource_id,
                    amount,
                } => (
                    Some(resource_id.to_string()),
                    total_work_seconds * amount,
                    0.0,
                    amount,
                ),
                CostDef::Upfront {
                    resource_id,
                    amount,
                } => {
                    if !self.can_afford(resource_id, amount) {
                        self.push_note(format!(
                            "Not enough {}: need {:.0}.",
                            self.resource_label(resource_id),
                            amount
                        ));
                        return;
                    }
                    self.spend_resource(resource_id, amount);
                    (Some(resource_id.to_string()), amount, amount, 0.0)
                }
                CostDef::UpfrontBundle { costs } => {
                    if let Some((label, amount)) = costs.iter().find_map(|item| {
                        (!self.can_afford_cost_item(item))
                            .then_some((self.cost_item_label(item.item_id), item.amount))
                    }) {
                        self.push_note(format!("Not enough {}: need {:.0}.", label, amount));
                        return;
                    }
                    self.commit_cost_items(costs);
                    (
                        None,
                        costs.iter().map(|item| item.amount).sum(),
                        costs.iter().map(|item| item.amount).sum(),
                        0.0,
                    )
                }
                CostDef::TimeOnly => (None, 0.0, 0.0, 0.0),
            };

        self.state.active_construction = Some(ConstructionJob {
            option_id: option_def.id.to_string(),
            resource_id,
            total_work_seconds,
            remaining_work_seconds: total_work_seconds,
            total_cost,
            spent_cost,
            per_worker_cost_per_second,
        });
        self.push_note(format!("{} started.", option_def.label));
    }

    fn recruit_from_survivor_cave(&mut self) {
        if !self.state.objectives.recruitment_enabled {
            self.push_note(
                "Recruitment is locked until the bubble reaches the Survivor Cave window.",
            );
            return;
        }
        if !self.state.base.studio_restored {
            self.push_note("Recruitment requires The Studio to be restored.");
            return;
        }
        if !self.state.base.fire_pit_built {
            self.push_note("Recruitment requires a built Fire Pit.");
            return;
        }

        let cost = self.next_recruit_cost();
        if self.state.resources.vibes < cost {
            self.push_note(format!(
                "Not enough Vibes to recruit: need {:.0}, have {:.1}.",
                cost, self.state.resources.vibes
            ));
            return;
        }

        self.state.resources.vibes -= cost;
        self.state.recruitment.total_recruited_this_run = self
            .state
            .recruitment
            .total_recruited_this_run
            .saturating_add(1);

        let current_instant_available = self.instant_recruits_available();
        let travel_seconds = if current_instant_available > 0 {
            self.state.recruitment.instant_recruits_used = self
                .state
                .recruitment
                .instant_recruits_used
                .saturating_add(1);
            self.balance().recruitment.instant_recruit_delay_seconds
        } else {
            self.balance().recruitment.recruit_travel_seconds
        };

        self.state
            .recruitment
            .pending_recruits
            .push(crate::state::RecruitTravel {
                total_seconds: travel_seconds,
                remaining_seconds: travel_seconds,
            });
        self.state.recruitment.next_recruit_cost = self.next_recruit_cost();

        self.push_note(format!(
            "Recruit committed from Survivor Cave ({:.0} Vibes, arrival in {:.0}s).",
            cost, travel_seconds
        ));
    }

    fn start_processing(&mut self, recipe_id: &str) {
        let Some(recipe_def) = processing_recipe_def(recipe_id) else {
            self.push_note(format!("Unknown processing recipe: {recipe_id}."));
            return;
        };
        if !self.requirements_met(recipe_def.requirements) {
            self.push_note(format!("{} is not available yet.", recipe_def.label));
            return;
        }
        if self.processing_track_level_for_recipe(recipe_id) >= recipe_def.max_level {
            self.push_note(format!("{} is already maxed.", recipe_def.label));
            return;
        }
        if self
            .state
            .processing
            .active_jobs
            .contains_key(recipe_def.station_id)
        {
            self.push_note(format!(
                "{} is already processing a recipe.",
                self.station_label(recipe_def.station_id)
            ));
            return;
        }
        if !self.station_powered(recipe_def.station_id) {
            self.push_note(format!(
                "{} must be powered before processing can start.",
                self.station_label(recipe_def.station_id)
            ));
            return;
        }

        match recipe_def.cost {
            CostDef::Upfront {
                resource_id,
                amount,
            } => {
                if !self.can_afford(resource_id, amount) {
                    self.push_note(format!(
                        "Not enough {}: need {:.0}.",
                        self.resource_label(resource_id),
                        amount
                    ));
                    return;
                }
                self.spend_resource(resource_id, amount);
            }
            CostDef::UpfrontBundle { costs } => {
                if let Some((label, amount)) = costs.iter().find_map(|item| {
                    (!self.can_afford_cost_item(item))
                        .then_some((self.cost_item_label(item.item_id), item.amount))
                }) {
                    self.push_note(format!("Not enough {}: need {:.0}.", label, amount));
                    return;
                }
                self.commit_cost_items(costs);
            }
            CostDef::TimeOnly => {}
            CostDef::DrainPerWorkerSecond { .. } => {
                self.push_note("Processing recipes do not support per-worker drains yet.");
                return;
            }
        }

        let duration = match recipe_def.duration {
            crate::game_data::DurationDef::Fixed { seconds } => seconds,
            crate::game_data::DurationDef::CrystalLevelScaled {
                track,
                base_seconds,
                per_level_seconds,
            } => base_seconds + f64::from(self.crystal_track_level(track)) * per_level_seconds,
        };

        self.state.processing.active_jobs.insert(
            recipe_def.station_id.to_string(),
            crate::state::ProcessingJob {
                recipe_id: recipe_def.id.to_string(),
                station_id: recipe_def.station_id.to_string(),
                total_work_seconds: duration,
                remaining_work_seconds: duration,
            },
        );
        self.push_note(format!("{} started.", recipe_def.label));
    }

    fn start_resonance_recipe(&mut self, recipe_id: &str) {
        let Some(recipe_def) = resonance_recipe_def(recipe_id) else {
            self.push_note(format!("Unknown resonance recipe: {recipe_id}."));
            return;
        };

        if self
            .state
            .resonance
            .active_jobs
            .contains_key(recipe_def.station_id)
        {
            self.push_note(format!(
                "{} is already running resonance work.",
                self.station_label(recipe_def.station_id)
            ));
            return;
        }

        if !self.station_powered(recipe_def.station_id) {
            self.push_note(format!(
                "{} needs power before {} can start.",
                self.station_label(recipe_def.station_id),
                recipe_def.label
            ));
            return;
        }

        if let Some(missing) = recipe_def
            .costs
            .iter()
            .find(|cost| self.resonance_material_amount(cost.material_id) < cost.amount)
        {
            self.push_note(format!(
                "Not enough {} for {}: need {}.",
                resonance_material_label(missing.material_id),
                recipe_def.label,
                missing.amount
            ));
            return;
        }

        for cost in recipe_def.costs {
            self.spend_resonance_material(cost.material_id, cost.amount);
        }

        let duration = self.resonance_recipe_duration_seconds(recipe_def);
        self.state.resonance.active_jobs.insert(
            recipe_def.station_id.to_string(),
            ResonanceJob {
                recipe_id: recipe_def.id.to_string(),
                station_id: recipe_def.station_id.to_string(),
                total_work_seconds: duration,
                remaining_work_seconds: duration,
            },
        );
        self.push_note(format!("{} started.", recipe_def.label));
    }

    fn set_station_specialization(
        &mut self,
        station_id: &str,
        path: StationSpecializationPathState,
    ) {
        if station_def(station_id).is_none() {
            self.push_note(format!(
                "Unknown station specialization target: {station_id}."
            ));
            return;
        }
        self.state
            .resonance
            .station_specializations
            .insert(station_id.to_string(), path);
        self.refresh_power_state();
        self.refresh_bubble_state();
        self.push_note(format!(
            "{} specialization set to {}.",
            self.station_label(station_id),
            station_specialization_label(path)
        ));
    }

    fn start_expedition(&mut self, target_id: &str, assigned_crew: u16) {
        let Some(target_def) = expedition_target_def(target_id) else {
            self.push_note(format!("Unknown expedition target: {target_id}."));
            return;
        };

        if target_def.support.requires_studio_restored && !self.state.base.studio_restored {
            self.push_note(format!(
                "{} requires the Studio to be restored.",
                target_def.label
            ));
            return;
        }
        if target_def.support.requires_fire_pit && !self.state.base.fire_pit_built {
            self.push_note(format!("{} requires a built Fire Pit.", target_def.label));
            return;
        }
        if self.state.bubble.reach_from_base < target_def.required_bubble_reach {
            self.push_note(format!(
                "{} requires bubble reach {}; current reach is {}.",
                target_def.label,
                target_def.required_bubble_reach,
                self.state.bubble.reach_from_base
            ));
            return;
        }
        if assigned_crew < target_def.required_crew {
            self.push_note(format!(
                "{} requires {} crew.",
                target_def.label, target_def.required_crew
            ));
            return;
        }

        self.normalize_assignment();
        let available = self.available_expedition_crew();
        if assigned_crew > available {
            self.push_note(format!(
                "{} needs {} free crew; only {} free.",
                target_def.label, assigned_crew, available
            ));
            return;
        }

        let id = self.state.expeditions.next_job_id;
        self.state.expeditions.next_job_id = self.state.expeditions.next_job_id.saturating_add(1);
        self.state.expeditions.active_jobs.push(ExpeditionJob {
            id,
            target_id: target_def.id.to_string(),
            assigned_crew,
            duration_seconds: self.expedition_duration_seconds(target_def),
            remaining_seconds: self.expedition_duration_seconds(target_def),
            risk: expedition_risk_state(target_def.risk),
        });
        self.push_note(format!(
            "{} departed with {} crew.",
            target_def.label, assigned_crew
        ));
    }

    fn clear_expedition_reports(&mut self) {
        self.state.expeditions.completed_reports.clear();
        self.push_note("Expedition reports cleared.");
    }

    fn spend_bassline(&mut self, amount: f64) {
        let spend = amount.max(0.0).min(self.state.resources.bassline);
        if spend <= 0.0 {
            return;
        }
        self.state.resources.bassline -= spend;
        self.state.resources.lifetime_spent += spend;
        self.refresh_bubble_state();
        self.refresh_objectives();
        self.push_note(format!("Spent {:.1} Bassline.", spend));
    }

    fn hero_locked_by_survival(&self) -> bool {
        self.state.hero_survival.forced_return.is_some()
    }

    fn hero_outside_time_seconds_0_to_1(&self) -> f64 {
        self.balance().survival.hero_time_seconds_0_to_1
            * (1.0
                + f64::from(self.state.hero_survival.sustain)
                    * self.balance().survival.sustain_bonus_per_level)
    }

    fn hero_recovery_time_seconds_1_to_0(&self) -> f64 {
        let sustain_mult = 1.0
            + f64::from(self.state.hero_survival.sustain)
                * self.balance().survival.sustain_bonus_per_level;
        // Perks shorten recovery time (faster recovery).
        self.balance().survival.recovery_time_seconds_1_to_0
            / sustain_mult.max(1.0)
            / self.perk_multiplier(PerkStat::HeroRecovery)
    }

    pub(crate) fn hero_recovery_rate_multiplier(&self) -> f64 {
        if self.state.power.brownout_active
            && self.state.power.brownout_severity
                >= self.balance().survival.recovery_brownout_stop_threshold
        {
            return 0.0;
        }

        (1.0 - self.state.power.brownout_severity
            * self.balance().survival.recovery_brownout_penalty_weight)
            .clamp(0.0, 1.0)
    }

    fn refresh_hero_survival_state(&mut self) {
        self.state.hero_survival.viral_load_ratio =
            self.state.hero_survival.viral_load_ratio.clamp(0.0, 1.0);

        let ratio = self.state.hero_survival.viral_load_ratio;
        let survival = self.balance().survival;
        let (tier, work_mult, move_mult, encounter_mult) =
            if ratio >= survival.tier_three_threshold_ratio {
                (
                    3,
                    survival.tier_three_work_efficiency_multiplier,
                    survival.tier_three_movement_speed_multiplier,
                    survival.tier_three_encounter_rate_multiplier,
                )
            } else if ratio >= survival.tier_two_threshold_ratio {
                (
                    2,
                    survival.tier_two_work_efficiency_multiplier,
                    survival.tier_two_movement_speed_multiplier,
                    survival.tier_two_encounter_rate_multiplier,
                )
            } else if ratio >= survival.tier_one_threshold_ratio {
                (
                    1,
                    survival.tier_one_work_efficiency_multiplier,
                    survival.tier_one_movement_speed_multiplier,
                    survival.tier_one_encounter_rate_multiplier,
                )
            } else {
                (0, 1.0, 1.0, 1.0)
            };

        self.state.hero_survival.debuff_tier = tier;
        self.state.hero_survival.work_efficiency_multiplier = work_mult;
        self.state.hero_survival.movement_speed_multiplier = move_mult;
        self.state.hero_survival.encounter_rate_multiplier = encounter_mult;

        self.update_point_of_no_return_metrics();
    }

    fn update_point_of_no_return_metrics(&mut self) {
        if self.state.hero_survival.location != HeroLocationState::OutsideBubble
            || self.state.hero_survival.forced_return.is_some()
            || self
                .state
                .hero_survival
                .required_time_to_reenter_bubble_seconds
                <= 0.0
        {
            self.state.hero_survival.point_of_no_return_ratio = 1.0;
            self.state.hero_survival.seconds_until_forced_return = 999_999.0;
            return;
        }

        let outside_time = self.hero_outside_time_seconds_0_to_1();
        let threshold = (1.0
            - (self
                .state
                .hero_survival
                .required_time_to_reenter_bubble_seconds
                / outside_time))
            .clamp(0.0, 1.0);
        self.state.hero_survival.point_of_no_return_ratio = threshold;
        self.state.hero_survival.seconds_until_forced_return =
            ((threshold - self.state.hero_survival.viral_load_ratio).max(0.0) * outside_time)
                .max(0.0);
    }

    fn apply_world_action_exposure(&mut self, action_def: &crate::game_data::WorldActionDef) {
        match action_def.hero_exposure {
            HeroExposureDef::Studio => {
                self.state.hero_survival.location = HeroLocationState::Studio;
                self.state
                    .hero_survival
                    .required_time_to_reenter_bubble_seconds = 0.0;
                self.state.hero_survival.return_to_studio_seconds = 0.0;
            }
            HeroExposureDef::Bubble => {
                self.state.hero_survival.location = HeroLocationState::Bubble;
                self.state
                    .hero_survival
                    .required_time_to_reenter_bubble_seconds = 0.0;
                self.state.hero_survival.return_to_studio_seconds = 0.0;
            }
            HeroExposureDef::OutsideBubble => {
                self.state.hero_survival.location = HeroLocationState::OutsideBubble;
                self.state
                    .hero_survival
                    .required_time_to_reenter_bubble_seconds =
                    action_def.return_to_bubble_seconds.max(0.0);
                self.state.hero_survival.return_to_studio_seconds =
                    action_def.return_to_studio_seconds.max(0.0);
                self.push_note(format!(
                    "{} takes the Hero outside the safe field. Viral Load is now active.",
                    action_def.label
                ));
            }
        }
        self.refresh_hero_survival_state();
    }

    fn trigger_forced_return(&mut self) {
        if self.state.hero_survival.forced_return.is_some() {
            return;
        }

        if let Some(interrupted) = self.state.active_world_action.take() {
            if let Some(action_def) = world_action_def(&interrupted.action_id) {
                self.push_note(format!(
                    "{} was interrupted by forced return.",
                    action_def.label
                ));
            }
        }

        let return_to_bubble = self
            .state
            .hero_survival
            .required_time_to_reenter_bubble_seconds
            .max(0.1);
        self.state.roster.hero_assigned = false;
        self.normalize_assignment();
        self.state.hero_survival.echo_scars = self.state.hero_survival.echo_scars.saturating_add(1);
        self.state.hero_survival.forced_return = Some(ForcedReturnState {
            phase: ForcedReturnPhase::ReturnToBubbleEdge,
            total_seconds: return_to_bubble,
            remaining_seconds: return_to_bubble,
            viral_load_ratio_on_trigger: self.state.hero_survival.viral_load_ratio,
        });
        self.push_note(
            "Point of no return crossed. The Hero is auto-returning to safety and cannot be reassigned."
                .to_string(),
        );
        self.push_event(crate::state::GameEvent::ForcedReturnTriggered);
        self.refresh_hero_survival_state();
    }

    fn begin_forced_return_recovery(&mut self) {
        let recovery_seconds = (self.state.hero_survival.viral_load_ratio
            * self.hero_recovery_time_seconds_1_to_0())
        .max(0.1);
        self.state.hero_survival.location = HeroLocationState::Studio;
        self.state
            .hero_survival
            .required_time_to_reenter_bubble_seconds = 0.0;
        self.state.hero_survival.return_to_studio_seconds = 0.0;
        self.state.hero_survival.forced_return = Some(ForcedReturnState {
            phase: ForcedReturnPhase::RecoverAtStudio,
            total_seconds: recovery_seconds,
            remaining_seconds: recovery_seconds,
            viral_load_ratio_on_trigger: self.state.hero_survival.viral_load_ratio,
        });
    }

    fn progress_forced_return(&mut self, mut seconds: f64) {
        while seconds > 0.0 {
            let Some(mut current) = self.state.hero_survival.forced_return.clone() else {
                break;
            };

            let consumed = current.remaining_seconds.min(seconds);

            match current.phase {
                ForcedReturnPhase::ReturnToBubbleEdge => {
                    self.state.hero_survival.viral_load_ratio +=
                        consumed / self.hero_outside_time_seconds_0_to_1();
                    current.remaining_seconds = (current.remaining_seconds - consumed).max(0.0);
                    seconds -= consumed;
                    if current.remaining_seconds > 0.0 {
                        self.state.hero_survival.forced_return = Some(current);
                        break;
                    }

                    let return_to_studio =
                        if self.state.hero_survival.return_to_studio_seconds > 0.0 {
                            self.state.hero_survival.return_to_studio_seconds
                        } else {
                            (self
                                .state
                                .hero_survival
                                .required_time_to_reenter_bubble_seconds
                                * 2.0)
                                .max(0.1)
                        };
                    self.state.hero_survival.location = HeroLocationState::Bubble;
                    self.state.hero_survival.forced_return = Some(ForcedReturnState {
                        phase: ForcedReturnPhase::ReturnToStudio,
                        total_seconds: return_to_studio,
                        remaining_seconds: return_to_studio,
                        viral_load_ratio_on_trigger: current.viral_load_ratio_on_trigger,
                    });
                    self.push_note(
                        "Hero re-entered the bubble and is stumbling back to the Studio."
                            .to_string(),
                    );
                }
                ForcedReturnPhase::ReturnToStudio => {
                    current.remaining_seconds = (current.remaining_seconds - consumed).max(0.0);
                    seconds -= consumed;
                    if current.remaining_seconds > 0.0 {
                        self.state.hero_survival.forced_return = Some(current);
                        break;
                    }

                    self.push_note(
                        "Hero reached the Studio and is beginning Viral Load recovery.".to_string(),
                    );
                    self.begin_forced_return_recovery();
                }
                ForcedReturnPhase::RecoverAtStudio => {
                    let recovery_multiplier = self.hero_recovery_rate_multiplier();
                    if recovery_multiplier <= 0.0 {
                        self.state.hero_survival.forced_return = Some(current);
                        break;
                    }

                    let viral_delta =
                        (consumed / self.hero_recovery_time_seconds_1_to_0()) * recovery_multiplier;
                    self.state.hero_survival.viral_load_ratio =
                        (self.state.hero_survival.viral_load_ratio - viral_delta).max(0.0);
                    current.remaining_seconds = (current.remaining_seconds - consumed).max(0.0);
                    seconds -= consumed;

                    if self.state.hero_survival.viral_load_ratio > 0.0
                        && current.remaining_seconds > 0.0
                    {
                        self.state.hero_survival.forced_return = Some(current);
                        break;
                    }

                    self.state.hero_survival.forced_return = None;
                    self.state.hero_survival.location = HeroLocationState::Studio;
                    self.state
                        .hero_survival
                        .required_time_to_reenter_bubble_seconds = 0.0;
                    self.state.hero_survival.return_to_studio_seconds = 0.0;
                    self.push_note(
                        "Hero recovered from forced return and can be assigned again.".to_string(),
                    );
                    self.push_event(crate::state::GameEvent::HeroRecovered);
                }
            }
        }
    }

    fn progress_hero_survival(&mut self, seconds: f64) {
        if self.state.hero_survival.forced_return.is_some() {
            self.progress_forced_return(seconds);
            self.refresh_hero_survival_state();
            return;
        }

        match self.state.hero_survival.location {
            HeroLocationState::OutsideBubble => {
                self.state.hero_survival.viral_load_ratio +=
                    seconds / self.hero_outside_time_seconds_0_to_1();
                self.refresh_hero_survival_state();
                if self.state.hero_survival.viral_load_ratio
                    >= self.state.hero_survival.point_of_no_return_ratio
                {
                    self.trigger_forced_return();
                }
            }
            HeroLocationState::Studio | HeroLocationState::Bubble => {
                let recovery_multiplier = self.hero_recovery_rate_multiplier();
                if recovery_multiplier > 0.0 {
                    self.state.hero_survival.viral_load_ratio =
                        (self.state.hero_survival.viral_load_ratio
                            - (seconds / self.hero_recovery_time_seconds_1_to_0())
                                * recovery_multiplier)
                            .max(0.0);
                }
                self.refresh_hero_survival_state();
            }
        }
    }

    fn tick_internal(&mut self, seconds: f64, offline: bool) {
        let safe_seconds = seconds.max(0.0);
        if safe_seconds <= 0.0 {
            return;
        }

        self.state.clock_seconds += safe_seconds;
        self.state.resources.bassline_cap = self.bassline_cap();
        self.state.resources.chorus_cap = self.chorus_cap();
        self.state.resources.harmonics_cap = self.harmonics_cap();
        self.state.resources.stone_cap = 1000.0;
        self.state.resources.water_cap = self.water_cap();
        self.state.resources.vibes_cap = 100.0;
        self.regenerate_water_stock(safe_seconds);
        self.refresh_power_state();

        let crew_efficiency = self.crew_efficiency_multiplier();
        let hero_work_efficiency = self.state.hero_survival.work_efficiency_multiplier;
        let bassline_output_multiplier = self.state.power.bassline_output_multiplier;
        let chorus_output_multiplier = self.state.power.chorus_output_multiplier;
        let harmonics_output_multiplier = self.state.power.harmonics_output_multiplier;
        let passive_trickle = if self.state.crystal_circle.removing_moss_completed {
            safe_seconds
                * self
                    .balance()
                    .crystal
                    .removing_moss_passive_bassline_per_second
        } else {
            0.0
        };
        let bassline_crew_gain = safe_seconds
            * f64::from(self.crew_count(ROLE_CRYSTAL_BASSLINE))
            * self.bassline_output_per_worker()
            * crew_efficiency
            * bassline_output_multiplier;
        let bassline_hero_gain = if self.hero_on_role(ROLE_CRYSTAL_BASSLINE) {
            safe_seconds
                * self.bassline_output_per_worker()
                * crew_efficiency
                * hero_work_efficiency
                * bassline_output_multiplier
                * self.hero_band_multiplier()
        } else {
            0.0
        };
        let bassline_gain = bassline_crew_gain + bassline_hero_gain + passive_trickle;
        let chorus_crew_gain = safe_seconds
            * f64::from(self.crew_count(ROLE_CRYSTAL_CHORUS))
            * self.chorus_output_per_worker()
            * crew_efficiency
            * chorus_output_multiplier;
        let chorus_hero_gain = if self.hero_on_role(ROLE_CRYSTAL_CHORUS) {
            safe_seconds
                * self.chorus_output_per_worker()
                * crew_efficiency
                * hero_work_efficiency
                * chorus_output_multiplier
                * self.hero_band_multiplier()
        } else {
            0.0
        };
        let chorus_gain = chorus_crew_gain + chorus_hero_gain;
        let harmonics_crew_gain = safe_seconds
            * f64::from(self.crew_count(ROLE_CRYSTAL_HARMONICS))
            * self.harmonics_output_per_worker()
            * crew_efficiency
            * harmonics_output_multiplier;
        let harmonics_hero_gain = if self.hero_on_role(ROLE_CRYSTAL_HARMONICS) {
            safe_seconds
                * self.harmonics_output_per_worker()
                * crew_efficiency
                * hero_work_efficiency
                * harmonics_output_multiplier
                * self.hero_band_multiplier()
        } else {
            0.0
        };
        let harmonics_gain = harmonics_crew_gain + harmonics_hero_gain;
        let available_storage = (self.bassline_cap() - self.state.resources.bassline).max(0.0);
        let stored_gain = bassline_gain.min(available_storage);
        let available_chorus_storage = (self.chorus_cap() - self.state.resources.chorus).max(0.0);
        let stored_chorus_gain = chorus_gain.min(available_chorus_storage);
        let available_harmonics_storage =
            (self.harmonics_cap() - self.state.resources.harmonics).max(0.0);
        let stored_harmonics_gain = harmonics_gain.min(available_harmonics_storage);

        self.state.resources.bassline += stored_gain;
        self.state.resources.chorus += stored_chorus_gain;
        self.state.resources.harmonics += stored_harmonics_gain;
        self.state.resources.lifetime_generated += bassline_gain;
        self.award_hero_band_xp(
            ROLE_CRYSTAL_BASSLINE,
            self.hero_stored_share(
                stored_gain,
                passive_trickle,
                bassline_hero_gain,
                bassline_crew_gain,
            ),
        );
        self.award_hero_band_xp(
            ROLE_CRYSTAL_CHORUS,
            self.hero_stored_share(stored_chorus_gain, 0.0, chorus_hero_gain, chorus_crew_gain),
        );
        self.award_hero_band_xp(
            ROLE_CRYSTAL_HARMONICS,
            self.hero_stored_share(
                stored_harmonics_gain,
                0.0,
                harmonics_hero_gain,
                harmonics_crew_gain,
            ),
        );

        let stone_gain = if offline {
            0.0
        } else {
            self.progress_scavenge(safe_seconds, crew_efficiency)
        };
        let water_gain = if offline {
            0.0
        } else {
            self.progress_water_collection(safe_seconds, crew_efficiency)
        };

        self.progress_construction(safe_seconds, crew_efficiency);
        self.progress_processing(safe_seconds);
        self.progress_resonance(safe_seconds);
        self.progress_expeditions(safe_seconds);
        self.progress_vibes(safe_seconds, crew_efficiency);
        self.resolve_station_power(safe_seconds);
        self.refresh_power_state();
        self.progress_bubble(safe_seconds);
        self.progress_hero_survival(safe_seconds);
        self.progress_combat(safe_seconds);
        if !offline {
            self.progress_world_action(safe_seconds);
        }
        self.progress_recruitment(safe_seconds);
        self.refresh_bubble_state();
        self.refresh_objectives();

        self.push_note(format!(
            "Advanced simulation by {:.1}s, +{:.1} Bassline, +{:.1} Chorus, +{:.1} Harmonics, +{:.1} Stone, +{:.1} Water, {:.1} Vibes, reach {}.",
            safe_seconds,
            stored_gain,
            stored_chorus_gain,
            stored_harmonics_gain,
            stone_gain,
            water_gain,
            self.state.resources.vibes,
            self.state.bubble.stabilized_ring
        ));
    }

    fn bassline_output_per_worker(&self) -> f64 {
        let base_output = self.balance().crystal.output_per_worker_base
            + f64::from(self.state.crystal_circle.output_level)
                * self.balance().crystal.output_per_worker_level_bonus;
        let output = if self.state.crystal_circle.removing_moss_completed {
            base_output * self.balance().crystal.removing_moss_output_multiplier
        } else {
            base_output
        };
        output
            * self.perk_multiplier(PerkStat::CrystalOutput)
            * self.resonance_tuning_multiplier(CrystalTuningTrackState::Bassline)
    }

    fn chorus_output_per_worker(&self) -> f64 {
        (self.balance().crystal.chorus_per_worker_base
            + f64::from(self.state.crystal_circle.output_level)
                * self.balance().crystal.chorus_per_worker_level_bonus)
            * self.perk_multiplier(PerkStat::CrystalOutput)
            * self.resonance_tuning_multiplier(CrystalTuningTrackState::Chorus)
    }

    fn harmonics_output_per_worker(&self) -> f64 {
        (self.balance().crystal.harmonics_per_worker_base
            + f64::from(self.state.crystal_circle.output_level)
                * self.balance().crystal.harmonics_per_worker_level_bonus)
            * self.perk_multiplier(PerkStat::CrystalOutput)
            * self.resonance_tuning_multiplier(CrystalTuningTrackState::Harmonics)
    }

    fn bassline_cap(&self) -> f64 {
        self.balance().crystal.base_bassline_cap
            + f64::from(self.state.crystal_circle.storage_level)
                * self.balance().crystal.bassline_cap_per_storage_level
    }

    fn chorus_cap(&self) -> f64 {
        self.balance().crystal.base_chorus_cap
            + f64::from(self.state.crystal_circle.storage_level)
                * self.balance().crystal.chorus_cap_per_storage_level
    }

    fn harmonics_cap(&self) -> f64 {
        self.balance().crystal.base_harmonics_cap
            + f64::from(self.state.crystal_circle.storage_level)
                * self.balance().crystal.harmonics_cap_per_storage_level
    }

    fn water_cap(&self) -> f64 {
        self.balance().water.water_cap
            + f64::from(self.state.processing.workshop_water_condensers_level)
                * self.balance().water.workshop_water_cap_per_level
    }

    fn max_assignable(&self) -> u8 {
        self.state.crystal_circle.total_slots()
    }

    fn fire_pit_capacity(&self) -> u8 {
        if self.state.base.fire_pit_built {
            self.balance().crystal.fire_pit_crew_slots
        } else {
            0
        }
    }

    fn construction_duration(&self, option_def: &ConstructionOptionDef) -> f64 {
        let base_duration = match option_def.duration {
            crate::game_data::DurationDef::Fixed { seconds } => seconds,
            crate::game_data::DurationDef::CrystalLevelScaled {
                track,
                base_seconds,
                per_level_seconds,
            } => base_seconds + f64::from(self.crystal_track_level(track)) * per_level_seconds,
        };
        let tooling_bonus = f64::from(self.state.processing.workshop_tooling_level)
            * self.balance().build.workshop_tooling_speed_bonus_per_level;
        // Perks speed up construction (shorter duration).
        base_duration * (1.0 - tooling_bonus).clamp(0.2, 1.0)
            / self.perk_multiplier(PerkStat::ConstructionSpeed)
    }

    fn progress_scavenge(&mut self, seconds: f64, crew_efficiency: f64) -> f64 {
        let rate_multiplier = (f64::from(self.crew_count(ROLE_SCAVENGE)) * crew_efficiency)
            + if self.hero_on_role(ROLE_SCAVENGE) {
                crew_efficiency * self.state.hero_survival.work_efficiency_multiplier
            } else {
                0.0
            };
        if rate_multiplier <= 0.0 {
            return 0.0;
        }

        let yield_mult = self.perk_multiplier(PerkStat::ScavengeYield);
        // Scavenging effort yields scrap metal even when the stone shed is full.
        self.state.scavenge_scrap_progress +=
            rate_multiplier * seconds * SCRAP_PER_EFFORT_SECOND * yield_mult;
        let scrap_units = self.state.scavenge_scrap_progress.floor();
        if scrap_units >= 1.0 {
            self.state.scavenge_scrap_progress -= scrap_units;
            self.grant_item(ITEM_SCRAP_METAL, scrap_units as u32);
        }

        let free_capacity = (self.state.resources.stone_cap - self.state.resources.stone).max(0.0);
        if free_capacity <= 0.0 {
            self.push_note("Scavenge blocked: Stone storage is full.");
            return 0.0;
        }

        let stock_rate =
            self.balance().scavenge.stock_rate_per_second * rate_multiplier * yield_mult;
        let ambient_rate =
            self.balance().scavenge.ambient_rate_per_second * rate_multiplier * yield_mult;
        let mut gathered = 0.0;
        let mut remaining_time = seconds;

        if self.state.resources.base_stone_stock > 0.0 && stock_rate > 0.0 {
            let stock_time_to_empty = self.state.resources.base_stone_stock / stock_rate;
            let stock_phase_time = remaining_time.min(stock_time_to_empty);
            let stock_gather = (stock_phase_time * stock_rate)
                .min(self.state.resources.base_stone_stock)
                .min(free_capacity);

            self.state.resources.base_stone_stock =
                (self.state.resources.base_stone_stock - stock_gather).max(0.0);
            self.state.resources.stone += stock_gather;
            gathered += stock_gather;
            remaining_time -= stock_phase_time;
        }

        let free_capacity = (self.state.resources.stone_cap - self.state.resources.stone).max(0.0);
        if remaining_time > 0.0 && free_capacity > 0.0 && ambient_rate > 0.0 {
            let ambient_gather = (remaining_time * ambient_rate).min(free_capacity);
            self.state.resources.stone += ambient_gather;
            gathered += ambient_gather;
        }

        if gathered > 0.0 {
            self.push_note(format!("Scavenged {:.1} Stone.", gathered));
        }

        gathered
    }

    /// Mark a per-location fact resolved (a looted container, a cleared
    /// creature). Idempotent and once-only: the first clear grants the optional
    /// loot; re-clearing an already-resolved key is a no-op (no double loot).
    fn clear_location(&mut self, key: String, loot_item: Option<String>, loot_qty: u32) {
        if !self.state.cleared_locations.insert(key) {
            return;
        }
        if let Some(item_id) = loot_item {
            self.grant_item(&item_id, loot_qty);
        }
        let xp = self.balance().progression.xp_per_location_clear;
        self.grant_track_xp(HeroTrack::Drummer, xp);
    }

    /// Move `qty` of an item from the Hero inventory onto the ground at `key`.
    /// No-op if the inventory does not hold that quantity.
    fn drop_item(&mut self, key: String, item_id: String, qty: u32) {
        if qty == 0 {
            return;
        }
        let held = self.state.inventory.get(&item_id).copied().unwrap_or(0);
        if held < qty {
            return;
        }
        match held - qty {
            0 => {
                self.state.inventory.remove(&item_id);
            }
            remaining => {
                self.state.inventory.insert(item_id.clone(), remaining);
            }
        }
        let pile = self.state.dropped_items.entry(key).or_default();
        let entry = pile.entry(item_id).or_insert(0);
        *entry = entry.saturating_add(qty);
    }

    /// Consume one of an item to apply its use effect. No-op if none is held or
    /// the item has no use effect.
    fn use_item(&mut self, item_id: &str) {
        let held = self.state.inventory.get(item_id).copied().unwrap_or(0);
        if held == 0 {
            return;
        }
        let Some(effect) = item_def(item_id).and_then(|def| def.use_effect) else {
            return;
        };
        match held - 1 {
            0 => {
                self.state.inventory.remove(item_id);
            }
            remaining => {
                self.state.inventory.insert(item_id.to_string(), remaining);
            }
        }
        match effect.kind {
            ItemEffectKind::RestoreSurvival => {
                self.state.hero_survival.viral_load_ratio =
                    (self.state.hero_survival.viral_load_ratio - effect.amount).max(0.0);
            }
        }
    }

    /// Move every item dropped at `key` back into inventory (capped per
    /// `max_stack`) and clear the pile. No-op when nothing is there.
    fn pick_up_location(&mut self, key: &str) {
        let Some(pile) = self.state.dropped_items.remove(key) else {
            return;
        };
        for (item_id, qty) in pile {
            self.grant_item(&item_id, qty);
        }
    }

    /// Add items to the Hero inventory, capped at the item's `max_stack`
    /// (uncapped for unknown ids).
    pub(crate) fn grant_item(&mut self, item_id: &str, quantity: u32) {
        if quantity == 0 {
            return;
        }
        let cap = item_def(item_id).map_or(u32::MAX, |def| def.max_stack);
        let entry = self.state.inventory.entry(item_id.to_string()).or_insert(0);
        *entry = entry.saturating_add(quantity).min(cap);
    }

    fn regenerate_water_stock(&mut self, seconds: f64) {
        self.state.resources.base_water_stock = (self.state.resources.base_water_stock
            + seconds
                * (self.balance().water.tile_regen_per_second
                    + f64::from(self.state.processing.workshop_water_condensers_level)
                        * self.balance().water.workshop_regen_bonus_per_level))
            .min(self.balance().water.base_stock_max);
    }

    fn progress_water_collection(&mut self, seconds: f64, crew_efficiency: f64) -> f64 {
        if !self.state.base.water_collection_unlocked {
            return 0.0;
        }

        let effective_workers = (f64::from(self.crew_count(ROLE_WATER)) * crew_efficiency)
            + if self.hero_on_role(ROLE_WATER) {
                crew_efficiency * self.state.hero_survival.work_efficiency_multiplier
            } else {
                0.0
            };
        if effective_workers <= 0.0 {
            return 0.0;
        }

        let free_capacity = (self.state.resources.water_cap - self.state.resources.water).max(0.0);
        if free_capacity <= 0.0 {
            self.push_note("Water collection blocked: Water storage is full.");
            return 0.0;
        }

        let available_stock = self.state.resources.base_water_stock.max(0.0);
        if available_stock <= 0.0 {
            self.push_note("Water collection paused: the Base tile cistern is empty.");
            return 0.0;
        }

        let rate = self.balance().water.collection_rate_per_second * effective_workers;
        let gathered = (seconds * rate).min(available_stock).min(free_capacity);
        if gathered <= 0.0 {
            return 0.0;
        }

        self.state.resources.base_water_stock -= gathered;
        self.state.resources.water += gathered;
        self.push_note(format!("Collected {:.1}L Water.", gathered));
        gathered
    }

    fn progress_vibes(&mut self, seconds: f64, crew_efficiency: f64) {
        let good_vibes = if self.state.base.fire_pit_built {
            self.balance().fire_pit.base_vibes_per_second
                + ((f64::from(self.crew_count(ROLE_FIRE_PIT)) * crew_efficiency)
                    + if self.hero_on_role(ROLE_FIRE_PIT) {
                        crew_efficiency * self.state.hero_survival.work_efficiency_multiplier
                    } else {
                        0.0
                    })
                    * self.balance().fire_pit.staff_vibes_per_second
        } else {
            0.0
        };
        let bad_vibes = self.update_bad_vibes_state(seconds);
        let delta = (good_vibes - bad_vibes) * seconds;
        let next_vibes = self.state.resources.vibes + delta;
        self.state.resources.vibes = next_vibes.min(self.state.resources.vibes_cap);
        self.refresh_base_pressure_state();
    }

    fn update_bad_vibes_state(&mut self, seconds: f64) -> f64 {
        self.refresh_base_pressure_state();
        if !self.state.base.fire_pit_built {
            self.state.base.overcrowded_seconds = 0.0;
            self.state.base.bad_vibes_multiplier = 1.0;
            self.state.base.effective_bad_vibes_rate = 0.0;
            return 0.0;
        }

        let missing_bunks = f64::from(self.state.base.missing_bunks);
        if missing_bunks <= 0.0 {
            self.state.base.overcrowded_seconds = (self.state.base.overcrowded_seconds
                - seconds * (180.0 / self.balance().vibes.decay_reset_seconds))
                .max(0.0);
        } else {
            self.state.base.overcrowded_seconds += seconds;
        }

        self.state.base.bad_vibes_multiplier = 2f64
            .powf(self.state.base.overcrowded_seconds / self.balance().vibes.doubling_time_seconds);

        let base_rate = if missing_bunks <= 0.0 {
            0.0
        } else {
            let crew_count = f64::from(self.state.roster.total_crew.max(1));
            let ratio = missing_bunks / crew_count;
            missing_bunks
                * (1.0
                    + self.balance().vibes.bad_vibes_beta
                        * ratio.powf(self.balance().vibes.bad_vibes_pow))
        };

        let effective = base_rate * self.state.base.bad_vibes_multiplier;
        self.state.base.effective_bad_vibes_rate = effective;
        effective
    }

    fn crew_efficiency_multiplier(&self) -> f64 {
        if self.state.resources.vibes < 0.0 {
            (self.state.resources.vibes / self.balance().vibes.negative_k).exp()
        } else {
            1.0
        }
    }

    fn refresh_base_pressure_state(&mut self) {
        let occupant_count = u16::from(self.state.roster.total_crew) + 1;
        let bunks_capacity = self.state.base.bunks_capacity;
        let free_bunks = i32::from(bunks_capacity) - i32::from(occupant_count);
        self.state.base.occupant_count = occupant_count;
        self.state.base.free_bunks = free_bunks as i16;
        self.state.base.missing_bunks = free_bunks.checked_neg().unwrap_or(0).max(0) as u16;
        self.state.base.crew_efficiency_multiplier = self.crew_efficiency_multiplier();
    }

    fn progress_bubble(&mut self, seconds: f64) {
        let (target_ring, target_frontier_progress) = self.target_bubble_position();
        let current_ring = self.state.bubble.stabilized_ring;
        let current_frontier_progress = self.state.bubble.frontier_progress;

        if target_ring > current_ring
            || (target_ring == current_ring
                && target_frontier_progress >= current_frontier_progress)
        {
            self.state.bubble.stabilized_ring = target_ring;
            self.state.bubble.frontier_progress = target_frontier_progress;
            self.state.bubble.hold_seconds_remaining = self.balance().bubble.hold_seconds;
            self.state.bubble.degrade_seconds_accumulated = 0.0;
            return;
        }

        self.apply_bubble_decay(seconds, target_ring, target_frontier_progress);
    }

    fn apply_bubble_decay(
        &mut self,
        mut seconds: f64,
        target_ring: u8,
        target_frontier_progress: f64,
    ) {
        if self.state.bubble.hold_seconds_remaining > 0.0 {
            let consumed_hold = self.state.bubble.hold_seconds_remaining.min(seconds);
            self.state.bubble.hold_seconds_remaining =
                (self.state.bubble.hold_seconds_remaining - consumed_hold).max(0.0);
            seconds -= consumed_hold;

            if seconds <= 0.0 || self.state.bubble.hold_seconds_remaining > 0.0 {
                return;
            }
        }

        self.state.bubble.degrade_seconds_accumulated += seconds;

        while self.state.bubble.degrade_seconds_accumulated
            >= self.balance().bubble.degrade_seconds_per_ring
        {
            self.state.bubble.degrade_seconds_accumulated -=
                self.balance().bubble.degrade_seconds_per_ring;

            if self.state.bubble.stabilized_ring == target_ring
                && self.state.bubble.frontier_progress > target_frontier_progress
            {
                self.state.bubble.frontier_progress = target_frontier_progress;
                self.push_note("Bubble frontier contracted toward the new Bassline equilibrium.");
                break;
            }

            if self.state.bubble.frontier_progress > 0.0 {
                self.state.bubble.frontier_progress = 0.0;
                self.push_note("Bubble frontier collapsed before stabilizing.");
                self.push_event(crate::state::GameEvent::BubbleFrontierCollapsed);
                continue;
            }

            if self.state.bubble.stabilized_ring > target_ring {
                self.state.bubble.stabilized_ring =
                    self.state.bubble.stabilized_ring.saturating_sub(1);
                if self.state.bubble.stabilized_ring == target_ring {
                    self.state.bubble.frontier_progress = target_frontier_progress;
                }
                self.push_note(format!(
                    "Bubble shrank to ring {} after Bassline shortfall.",
                    self.state.bubble.stabilized_ring
                ));
            } else {
                self.state.bubble.degrade_seconds_accumulated = 0.0;
                break;
            }
        }
    }

    fn progress_construction(&mut self, seconds: f64, crew_efficiency: f64) {
        let worker_seconds = seconds
            * ((f64::from(self.crew_count(ROLE_CONSTRUCTION)) * crew_efficiency)
                + if self.hero_on_role(ROLE_CONSTRUCTION) {
                    crew_efficiency * self.state.hero_survival.work_efficiency_multiplier
                } else {
                    0.0
                });
        if worker_seconds <= 0.0 {
            if self.state.active_construction.is_some() {
                self.push_note("Construction paused: no workers allocated to building.");
            }
            return;
        }

        let Some(job) = self.state.active_construction.as_mut() else {
            return;
        };

        if job.resource_id.as_deref() == Some(RESOURCE_BASSLINE) {
            let max_spend = worker_seconds * job.per_worker_cost_per_second;
            let remaining_cost = (job.total_cost - job.spent_cost).max(0.0);
            let spend = self
                .state
                .resources
                .bassline
                .min(max_spend)
                .min(remaining_cost);

            if spend <= 0.0 {
                self.push_note("Construction paused: no Bassline available for builders.");
                return;
            }

            let completed_worker_seconds = spend / job.per_worker_cost_per_second;
            job.spent_cost = (job.spent_cost + spend).min(job.total_cost);
            job.remaining_work_seconds =
                (job.remaining_work_seconds - completed_worker_seconds).max(0.0);

            self.state.resources.bassline -= spend;
            self.state.resources.lifetime_spent += spend;

            if job.remaining_work_seconds > 0.0 && job.spent_cost < job.total_cost {
                return;
            }
        } else {
            job.remaining_work_seconds = (job.remaining_work_seconds - worker_seconds).max(0.0);
            if job.remaining_work_seconds > 0.0 {
                return;
            }
        }

        let completed = self
            .state
            .active_construction
            .take()
            .expect("construction should exist");

        let option_id = completed.option_id.clone();
        let label = construction_option_def(&option_id)
            .map(|def| def.label)
            .unwrap_or("Construction");
        self.apply_construction_effects(&option_id);

        self.state.resources.bassline_cap = self.bassline_cap();
        self.state.resources.water_cap = self.water_cap();
        self.normalize_assignment();
        self.normalize_station_state();
        self.refresh_power_state();
        self.push_note(format!("{label} completed."));
        self.push_event(crate::state::GameEvent::ConstructionCompleted {
            option_id,
            label: label.to_string(),
        });
    }

    fn progress_processing(&mut self, seconds: f64) {
        if self.state.processing.active_jobs.is_empty() {
            return;
        }

        let station_ids = self
            .state
            .processing
            .active_jobs
            .keys()
            .cloned()
            .collect::<Vec<_>>();
        let mut completed = Vec::new();

        for station_id in station_ids {
            if !self.station_powered(&station_id) {
                self.push_note(format!(
                    "{} processing paused: station is unpowered.",
                    self.station_label(&station_id)
                ));
                continue;
            }

            if let Some(job) = self.state.processing.active_jobs.get_mut(&station_id) {
                job.remaining_work_seconds = (job.remaining_work_seconds - seconds).max(0.0);
                if job.remaining_work_seconds <= 0.0 {
                    completed.push((station_id.clone(), job.recipe_id.clone()));
                }
            }
        }

        for (station_id, recipe_id) in completed {
            self.state.processing.active_jobs.remove(&station_id);
            if let Some(recipe_def) = processing_recipe_def(&recipe_id) {
                self.apply_effects(recipe_def.effects);
                self.state.resources.water_cap = self.water_cap();
                self.refresh_power_state();
                self.refresh_bubble_state();
                self.push_note(format!("{} completed.", recipe_def.label));
                self.push_event(crate::state::GameEvent::ProcessingCompleted {
                    recipe_id: recipe_id.clone(),
                    label: recipe_def.label.to_string(),
                });
            }
        }
    }

    fn progress_recruitment(&mut self, seconds: f64) {
        if self.state.recruitment.pending_recruits.is_empty() {
            return;
        }

        let mut arrivals = 0u8;
        for recruit in &mut self.state.recruitment.pending_recruits {
            recruit.remaining_seconds = (recruit.remaining_seconds - seconds).max(0.0);
            if recruit.remaining_seconds <= 0.0 {
                arrivals = arrivals.saturating_add(1);
            }
        }

        if arrivals > 0 {
            self.state
                .recruitment
                .pending_recruits
                .retain(|recruit| recruit.remaining_seconds > 0.0);
            self.state.roster.total_crew = self.state.roster.total_crew.saturating_add(arrivals);
            self.normalize_assignment();
            self.refresh_base_pressure_state();
            self.push_note(format!(
                "{arrivals} recruit(s) arrived from the Survivor Cave."
            ));
            self.push_event(crate::state::GameEvent::RecruitsArrived { count: arrivals });
        }
    }

    fn progress_expeditions(&mut self, seconds: f64) {
        if self.state.expeditions.active_jobs.is_empty() {
            return;
        }

        let mut completed_ids = Vec::new();
        for job in &mut self.state.expeditions.active_jobs {
            job.remaining_seconds = (job.remaining_seconds - seconds).max(0.0);
            if job.remaining_seconds <= 0.0 {
                completed_ids.push(job.id);
            }
        }
        if completed_ids.is_empty() {
            return;
        }

        let mut completed_jobs = Vec::new();
        self.state.expeditions.active_jobs.retain(|job| {
            if completed_ids.contains(&job.id) {
                completed_jobs.push(job.clone());
                false
            } else {
                true
            }
        });

        for job in completed_jobs {
            let Some(target_def) = expedition_target_def(&job.target_id) else {
                continue;
            };
            let report = self.complete_expedition_job(&job, target_def);
            self.state.expeditions.total_wounds = self
                .state
                .expeditions
                .total_wounds
                .saturating_add(report.wounds);
            self.state.expeditions.total_clues = self
                .state
                .expeditions
                .total_clues
                .saturating_add(report.clues);
            self.state.expeditions.total_dungeon_leads = self
                .state
                .expeditions
                .total_dungeon_leads
                .saturating_add(report.dungeon_leads);
            self.state.expeditions.completed_reports.push(report);
            if self.state.expeditions.completed_reports.len() > 8 {
                self.state.expeditions.completed_reports.remove(0);
            }
            self.push_note(format!("{} returned from expedition.", target_def.label));
            self.push_event(crate::state::GameEvent::ExpeditionCompleted {
                target_id: job.target_id.clone(),
                label: target_def.label.to_string(),
            });
            let xp = self.balance().progression.xp_per_expedition;
            self.grant_track_xp(HeroTrack::Synth, xp);
        }
        self.normalize_assignment();
    }

    fn progress_resonance(&mut self, seconds: f64) {
        if self.state.resonance.active_jobs.is_empty() {
            return;
        }

        let mut completed_station_ids = Vec::new();
        for job in self.state.resonance.active_jobs.values_mut() {
            job.remaining_work_seconds = (job.remaining_work_seconds - seconds).max(0.0);
            if job.remaining_work_seconds <= 0.0 {
                completed_station_ids.push(job.station_id.clone());
            }
        }
        if completed_station_ids.is_empty() {
            return;
        }

        let mut completed_jobs = Vec::new();
        for station_id in completed_station_ids {
            if let Some(job) = self.state.resonance.active_jobs.remove(&station_id) {
                completed_jobs.push(job);
            }
        }

        for job in completed_jobs {
            let Some(recipe_def) = resonance_recipe_def(&job.recipe_id) else {
                continue;
            };
            let report = self.complete_resonance_job(&job, recipe_def);
            self.state.resonance.completed_reports.push(report);
            if self.state.resonance.completed_reports.len() > 8 {
                self.state.resonance.completed_reports.remove(0);
            }
            self.push_note(format!("{} resonance recipe completed.", recipe_def.label));
            self.push_event(crate::state::GameEvent::ResonanceCompleted {
                recipe_id: job.recipe_id.clone(),
                label: recipe_def.label.to_string(),
            });
        }

        self.refresh_power_state();
        self.refresh_bubble_state();
    }

    fn complete_resonance_job(
        &mut self,
        job: &ResonanceJob,
        recipe_def: &ResonanceRecipeDef,
    ) -> ResonanceReport {
        let mut tuning_track = None;
        let mut tuning_amount = 0;
        let mut expedition_support_amount = 0;
        match recipe_def.effect {
            ResonanceEffectDef::IncrementTuning { track, amount } => {
                let runtime_track = crystal_tuning_track_state(track);
                tuning_track = Some(runtime_track);
                tuning_amount = amount;
                match runtime_track {
                    CrystalTuningTrackState::Bassline => {
                        self.state.resonance.tuning.bassline_level = self
                            .state
                            .resonance
                            .tuning
                            .bassline_level
                            .saturating_add(amount);
                    }
                    CrystalTuningTrackState::Chorus => {
                        self.state.resonance.tuning.chorus_level = self
                            .state
                            .resonance
                            .tuning
                            .chorus_level
                            .saturating_add(amount);
                    }
                    CrystalTuningTrackState::Harmonics => {
                        self.state.resonance.tuning.harmonics_level = self
                            .state
                            .resonance
                            .tuning
                            .harmonics_level
                            .saturating_add(amount);
                    }
                }
            }
            ResonanceEffectDef::IncrementExpeditionSupport { amount } => {
                expedition_support_amount = amount;
                self.state.resonance.expedition_support_level = self
                    .state
                    .resonance
                    .expedition_support_level
                    .saturating_add(amount);
            }
        }

        ResonanceReport {
            recipe_id: recipe_def.id.to_string(),
            station_id: job.station_id.clone(),
            tuning_track,
            tuning_amount,
            expedition_support_amount,
        }
    }

    fn complete_expedition_job(
        &mut self,
        job: &ExpeditionJob,
        target_def: &ExpeditionTargetDef,
    ) -> ExpeditionReport {
        let stone_gained = self.add_capped_resource(RESOURCE_STONE, target_def.expected_loot.stone);
        let water_gained = self.add_capped_resource(RESOURCE_WATER, target_def.expected_loot.water);
        let vibes_gained = self.add_capped_resource(RESOURCE_VIBES, target_def.expected_loot.vibes);
        let echo_shards_gained =
            self.expedition_material_reward(target_def.expected_loot.echo_shards);
        let signal_scrap_gained =
            self.expedition_material_reward(target_def.expected_loot.signal_scrap);
        let harmonic_residue_gained =
            self.expedition_material_reward(target_def.expected_loot.harmonic_residue);
        self.add_resonance_material(RESONANCE_MATERIAL_ECHO_SHARDS, echo_shards_gained);
        self.add_resonance_material(RESONANCE_MATERIAL_SIGNAL_SCRAP, signal_scrap_gained);
        self.add_resonance_material(RESONANCE_MATERIAL_HARMONIC_RESIDUE, harmonic_residue_gained);

        ExpeditionReport {
            id: job.id,
            target_id: target_def.id.to_string(),
            assigned_crew: job.assigned_crew,
            duration_seconds: job.duration_seconds,
            risk: job.risk,
            stone_gained,
            water_gained,
            vibes_gained,
            echo_shards_gained,
            signal_scrap_gained,
            harmonic_residue_gained,
            wounds: target_def.expected_loot.wounds,
            clues: target_def.expected_loot.clues,
            dungeon_leads: target_def.expected_loot.dungeon_leads,
        }
    }

    fn progress_world_action(&mut self, seconds: f64) {
        let Some(action) = self.state.active_world_action.as_mut() else {
            return;
        };

        let action_speed_multiplier = world_action_def(&action.action_id)
            .map(|def| match def.hero_exposure {
                HeroExposureDef::OutsideBubble => {
                    self.state.hero_survival.movement_speed_multiplier
                }
                HeroExposureDef::Studio | HeroExposureDef::Bubble => {
                    self.state.hero_survival.work_efficiency_multiplier
                }
            })
            .unwrap_or(1.0);

        action.remaining_seconds =
            (action.remaining_seconds - seconds * action_speed_multiplier).max(0.0);
        if action.remaining_seconds > 0.0 {
            return;
        }

        let completed = self
            .state
            .active_world_action
            .take()
            .expect("world action should exist");

        if !self.hero_locked_by_survival() {
            self.state.roster.hero_assigned = completed.hero_assigned_before;
            self.state.roster.hero_role_id = completed.hero_role_id_before;
        }
        self.state.hero_survival.location = HeroLocationState::Studio;
        self.state
            .hero_survival
            .required_time_to_reenter_bubble_seconds = 0.0;
        self.state.hero_survival.return_to_studio_seconds = 0.0;

        if let Some(action_def) = world_action_def(&completed.action_id) {
            self.apply_effects(action_def.effects);
            self.push_note(format!("{} completed.", action_def.label));
            self.push_event(crate::state::GameEvent::WorldActionCompleted {
                action_id: completed.action_id.clone(),
                label: action_def.label.to_string(),
            });
        }

        self.normalize_assignment();
        self.refresh_base_pressure_state();
        self.refresh_hero_survival_state();
        self.refresh_narrative_state();
    }

    fn field_budget(&self) -> f64 {
        self.state.resources.bassline
            * self.balance().bubble.field_k_base
            * self.field_k_multiplier()
            * self.state.power.field_multiplier
    }

    fn field_k_multiplier(&self) -> f64 {
        1.0 + f64::from(self.state.crystal_circle.field_polish_level)
            * self.balance().crystal.field_k_bonus_per_polish_level
    }

    fn next_frontier_ring(&self) -> u8 {
        self.state.bubble.stabilized_ring.saturating_add(1)
    }

    fn ring_cost(&self, ring: u8) -> f64 {
        if ring == 0 || ring > GRID_RADIUS as u8 {
            return 0.0;
        }
        self.state
            .hexes
            .iter()
            .filter_map(|hex| {
                let tile = self.tile_for_hex(hex)?;
                (!tile.is_blocker && hex.distance == ring).then_some(tile.impedance)
            })
            .sum()
    }

    fn active_coverage_cost(&self) -> f64 {
        let stabilized_cost: f64 = (1..=self.state.bubble.stabilized_ring)
            .map(|ring| self.ring_cost(ring))
            .sum();
        stabilized_cost
            + (self.ring_cost(self.next_frontier_ring()) * self.state.bubble.frontier_progress)
    }

    fn stabilized_hexes(&self) -> u16 {
        self.state
            .hexes
            .iter()
            .filter(|hex| {
                self.hex_is_open(hex) && hex.distance <= self.state.bubble.stabilized_ring
            })
            .count() as u16
    }

    fn reach_from_base(&self) -> u8 {
        self.state
            .hexes
            .iter()
            .filter(|hex| {
                self.hex_is_open(hex) && hex.distance <= self.state.bubble.stabilized_ring
            })
            .map(|hex| hex.distance)
            .max()
            .unwrap_or(0)
    }

    fn target_bubble_position(&self) -> (u8, f64) {
        let budget = self.field_budget();
        let mut cumulative_cost = 0.0;
        let mut ring = 0;

        while ring < GRID_RADIUS as u8 {
            let next_ring = ring + 1;
            let next_cost = self.ring_cost(next_ring);
            if cumulative_cost + next_cost > budget {
                let progress = if next_cost > 0.0 {
                    ((budget - cumulative_cost) / next_cost).clamp(0.0, 1.0)
                } else {
                    0.0
                };
                return (ring, progress);
            }

            cumulative_cost += next_cost;
            ring = next_ring;
        }

        (ring, 0.0)
    }

    fn refresh_bubble_state(&mut self) {
        let (target_ring, target_frontier_progress) = self.target_bubble_position();
        self.state.bubble.stabilized_hexes = self.stabilized_hexes();
        self.state.bubble.reach_from_base = self.reach_from_base();
        self.state.bubble.target_ring = target_ring;
        self.state.bubble.target_frontier_progress = target_frontier_progress;
        self.state.bubble.field_budget = self.field_budget();
        self.state.bubble.active_coverage_cost = self.active_coverage_cost();
        self.state.bubble.next_ring_cost = self.ring_cost(self.next_frontier_ring());

        let stabilized_ring = self.state.bubble.stabilized_ring;
        let frontier_ring = self.next_frontier_ring();
        let frontier_progress = self.state.bubble.frontier_progress;

        for hex in &mut self.state.hexes {
            let is_blocked = tile_def(&hex.tile_id)
                .map(|tile| tile.is_blocker)
                .unwrap_or(false);
            if is_blocked {
                hex.state = HexVisualState::Blocked;
                hex.progress = 0.0;
            } else if hex.distance <= stabilized_ring {
                hex.state = HexVisualState::Stabilized;
                hex.progress = 1.0;
            } else if hex.distance == frontier_ring && frontier_ring <= GRID_RADIUS as u8 {
                hex.state = HexVisualState::Converting;
                hex.progress = frontier_progress;
            } else {
                hex.state = HexVisualState::Inactive;
                hex.progress = 0.0;
            }
        }
        self.reveal_bubble_cells();
    }

    fn normalize_discovery_state(&mut self) {
        let retained: Vec<HexCoordState> = self
            .state
            .discovered_cells
            .iter()
            .copied()
            .filter(|coord| self.hex_exists(coord.q, coord.r))
            .collect();
        self.state.discovered_cells.clear();
        self.state.discovered_cells.extend(retained);
        for coord in initial_discovered_cells() {
            self.state.discovered_cells.insert(coord);
        }
        if !self.hex_is_open_at(self.state.hero_map.q, self.state.hero_map.r) {
            self.state.hero_map = HexCoordState::survivor_cave();
        }
        self.reveal_bubble_cells();
    }

    fn reveal_bubble_cells(&mut self) {
        let coords: Vec<HexCoordState> = self
            .state
            .hexes
            .iter()
            .filter(|hex| {
                hex.state == HexVisualState::Stabilized
                    || (hex.state == HexVisualState::Converting && hex.progress > 0.0)
            })
            .filter(|hex| self.hex_is_open(hex))
            .map(|hex| HexCoordState::new(hex.q, hex.r))
            .collect();

        for coord in coords {
            self.state.discovered_cells.insert(coord);
        }
    }

    fn reveal_hero_vision_at(&mut self, q: i8, r: i8) {
        let coords: Vec<HexCoordState> = self
            .state
            .hexes
            .iter()
            .filter(|hex| hex_distance(q, r, hex.q, hex.r) <= 1)
            .filter(|hex| self.hex_is_open(hex))
            .map(|hex| HexCoordState::new(hex.q, hex.r))
            .collect();

        for coord in coords {
            self.state.discovered_cells.insert(coord);
        }
    }

    fn refresh_objectives(&mut self) {
        let previous_reach = self.state.objectives.reach_objective_met;
        let previous_recruitment = self.state.objectives.recruitment_enabled;
        let previous_cave_in_bubble = self.state.objectives.survivor_cave_in_bubble;
        let current_reach = self.state.bubble.reach_from_base;

        self.state.objectives.reach_objective_met =
            current_reach >= self.state.objectives.reach_objective_target;
        self.state.objectives.recruitment_enabled = self
            .state
            .objectives
            .survivor_cave_distance
            .saturating_sub(current_reach)
            <= self.state.objectives.recruitment_range_tiles;
        self.state.objectives.survivor_cave_in_bubble = self
            .state
            .hexes
            .iter()
            .find(|hex| self.hex_feature(hex) == TileFeature::SurvivorCave)
            .map(|hex| hex.state == HexVisualState::Stabilized)
            .unwrap_or(false);

        if !previous_reach && self.state.objectives.reach_objective_met {
            self.push_note(format!(
                "Reach objective met: bubble reached ring {}.",
                self.state.objectives.reach_objective_target
            ));
        }

        if !previous_recruitment && self.state.objectives.recruitment_enabled {
            self.push_note("Survivor Cave recruitment gate is now open.");
            self.push_event(crate::state::GameEvent::RecruitmentGateOpened);
        } else if previous_recruitment && !self.state.objectives.recruitment_enabled {
            let cancelled = self.state.recruitment.pending_recruits.len();
            self.state.recruitment.pending_recruits.clear();
            if cancelled > 0 {
                self.push_note(format!(
                    "Recruitment gate closed after bubble shrink. {cancelled} in-transit recruit(s) were lost."
                ));
            } else {
                self.push_note("Survivor Cave recruitment gate closed after bubble shrink.");
            }
        }

        if !previous_cave_in_bubble && self.state.objectives.survivor_cave_in_bubble {
            self.push_note("Survivor Cave is now inside the bubble.");
        }
    }

    /// Salience selection over the storylet pool (replaces the hardcoded intro
    /// chain). Each refresh: cascade-resolve any active spine storylet whose
    /// `auto_complete_when` holds, then surface the most salient eligible
    /// storylet as `active_beat_id`. Reactive/side storylets light up whenever
    /// their preconditions hold — the engine reacts to game state, not a line.
    pub(crate) fn refresh_narrative_state(&mut self) {
        // Let repeatable beats re-fire on_activate after they lapse: drop any
        // activation marker whose beat is repeatable and no longer eligible.
        let activated: Vec<String> =
            self.state.narrative.activated_beat_ids.iter().cloned().collect();
        for id in activated {
            if story_beat_def(&id).is_some_and(|beat| {
                beat.repeatable && !self.evaluate_conditions(beat.preconditions)
            }) {
                self.state.narrative.activated_beat_ids.remove(&id);
            }
        }

        loop {
            let Some(beat_id) = self.best_eligible_storylet() else {
                self.state.narrative.active_beat_id = None;
                return;
            };
            let beat = story_beat_def(&beat_id).expect("eligible beat is in the catalog");
            // Non-repeatable spine beats resolve when their state conditions hold;
            // repeatable/reactive beats stay active only while still eligible.
            if !beat.repeatable
                && !beat.auto_complete_when.is_empty()
                && self.evaluate_conditions(beat.auto_complete_when)
            {
                self.mark_story_beat_complete(&beat_id);
                continue;
            }
            // Fire on_activate once per activation (the lapse cleanup above lets
            // repeatable beats fire again on re-trigger).
            if !self.state.narrative.activated_beat_ids.contains(&beat_id) {
                self.state.narrative.activated_beat_ids.insert(beat_id.clone());
                self.apply_effects(beat.on_activate);
                self.push_event(crate::state::GameEvent::BeatActivated {
                    beat_id: beat_id.clone(),
                });
            }
            self.state.narrative.active_beat_id = Some(beat_id);
            return;
        }
    }

    /// The most salient storylet that can be active now: highest `priority`, then
    /// lowest `sequence`, among storylets whose preconditions all hold and that
    /// aren't already completed (unless `repeatable`).
    fn best_eligible_storylet(&self) -> Option<String> {
        story_beats()
            .iter()
            .filter(|beat| {
                (beat.repeatable || !self.story_beat_completed(beat.id))
                    && self.evaluate_conditions(beat.preconditions)
            })
            .max_by(|a, b| {
                a.priority
                    .cmp(&b.priority)
                    .then_with(|| b.sequence.cmp(&a.sequence))
            })
            .map(|beat| beat.id.to_string())
    }

    fn story_beat_completed(&self, beat_id: &str) -> bool {
        self.state
            .narrative
            .completed_beat_ids
            .iter()
            .any(|completed| completed == beat_id)
    }

    fn mark_story_beat_complete(&mut self, beat_id: &str) {
        if self.story_beat_completed(beat_id) {
            return;
        }
        self.state
            .narrative
            .completed_beat_ids
            .push(beat_id.to_string());
        // Fire the beat's one-shot resolution effects (idempotent: guarded above).
        if let Some(beat) = story_beat_def(beat_id) {
            self.apply_effects(beat.on_complete);
        }
        let xp = self.balance().progression.xp_per_story_beat;
        self.grant_track_xp(HeroTrack::Vocalist, xp);
    }

    fn story_action_allowed(&mut self, action_id: &str) -> bool {
        let Some(active_beat_id) = self.state.narrative.active_beat_id.as_deref() else {
            return true;
        };
        let Some(active_beat) = story_beat_def(active_beat_id) else {
            return true;
        };

        match active_beat.world_action_id {
            Some(required_action_id) if required_action_id == action_id => {
                if !active_beat.choices.is_empty()
                    && !self
                        .state
                        .narrative
                        .choice_by_beat
                        .contains_key(active_beat_id)
                {
                    self.push_note(format!(
                        "Choose how to approach {} before starting it.",
                        active_beat.label
                    ));
                    return false;
                }
                true
            }
            Some(_) | None if INTRO_STORY_BEAT_IDS.contains(&active_beat_id) => {
                self.push_note(format!(
                    "Finish {} before starting a different world action.",
                    active_beat.label
                ));
                false
            }
            _ => true,
        }
    }

    fn chorus_unlocked(&self) -> bool {
        self.state.base.studio_restored
    }

    fn harmonics_unlocked(&self) -> bool {
        self.state.base.resonance_chamber_built
    }

    fn role_available(&self, role_id: &str) -> bool {
        match role_id {
            ROLE_CRYSTAL_CHORUS => self.chorus_unlocked(),
            ROLE_CRYSTAL_HARMONICS => self.harmonics_unlocked(),
            ROLE_FIRE_PIT => self.state.base.fire_pit_built,
            _ => true,
        }
    }

    fn hero_total_level(&self) -> u16 {
        self.state.hero_progress.drummer_level
            + self.state.hero_progress.vocalist_level
            + self.state.hero_progress.synth_level
    }

    /// Perk points available to spend: one per total Hero level, minus those
    /// already spent on acquired perks.
    pub fn perk_points_available(&self) -> u16 {
        (self.hero_total_level()).saturating_sub(self.state.acquired_perks.len() as u16)
    }

    pub fn has_perk(&self, perk_id: &str) -> bool {
        self.state.acquired_perks.contains(perk_id)
    }

    /// Learn a perk if it exists, isn't already owned, all `requires` are met,
    /// and a perk point is available. No-op otherwise.
    fn acquire_perk(&mut self, perk_id: &str) {
        if self.has_perk(perk_id) || self.perk_points_available() == 0 {
            return;
        }
        let Some(def) = perk_def(perk_id) else {
            return;
        };
        if !def.requires.iter().all(|req| self.has_perk(req)) {
            return;
        }
        self.state.acquired_perks.insert(perk_id.to_string());
    }

    /// Aggregate multiplier for a stat: the product of every acquired perk's
    /// effects that target it (1.0 if none).
    pub fn perk_multiplier(&self, stat: PerkStat) -> f64 {
        self.state
            .acquired_perks
            .iter()
            .filter_map(|id| perk_def(id))
            .flat_map(|def| def.effects.iter())
            .filter(|effect| effect.stat == stat)
            .map(|effect| effect.multiplier)
            .product::<f64>()
    }

    fn class_level_multiplier(&self, level: u16) -> f64 {
        1.0 + self.balance().progression.level_multiplier_a * (1.0 + f64::from(level)).log2()
    }

    fn hero_band_multiplier(&self) -> f64 {
        self.class_level_multiplier(self.state.hero_progress.drummer_level)
            * self.class_level_multiplier(self.state.hero_progress.vocalist_level)
            * self.class_level_multiplier(self.state.hero_progress.synth_level)
    }

    fn xp_to_next_level(&self, total_level: u16) -> f64 {
        self.balance().progression.xp0
            * self
                .balance()
                .progression
                .xp_growth
                .powf(f64::from(total_level))
    }

    fn hero_stored_share(
        &self,
        stored_total: f64,
        passive_gain: f64,
        hero_gain: f64,
        crew_gain: f64,
    ) -> f64 {
        let total_gain = passive_gain + hero_gain + crew_gain;
        if stored_total <= 0.0 || total_gain <= 0.0 || hero_gain <= 0.0 {
            return 0.0;
        }

        let passive_share = stored_total * (passive_gain / total_gain);
        let staffed_share = (stored_total - passive_share).max(0.0);
        let staffed_total = hero_gain + crew_gain;

        if staffed_total <= 0.0 {
            0.0
        } else {
            staffed_share * (hero_gain / staffed_total)
        }
    }

    /// Map a crystal work role to the progression track it feeds.
    fn track_for_role(role_id: &str) -> Option<HeroTrack> {
        match role_id {
            ROLE_CRYSTAL_BASSLINE => Some(HeroTrack::Drummer),
            ROLE_CRYSTAL_CHORUS => Some(HeroTrack::Vocalist),
            ROLE_CRYSTAL_HARMONICS => Some(HeroTrack::Synth),
            _ => None,
        }
    }

    fn award_hero_band_xp(&mut self, role_id: &str, xp_gain: f64) {
        if let Some(track) = Self::track_for_role(role_id) {
            self.grant_track_xp(track, xp_gain);
        }
    }

    /// Add XP to a progression track, leveling it up across the shared curve and
    /// emitting a HeroLeveledUp event per level reached. The single entry point
    /// for all XP sources (crystal work, clears, expeditions, beats, combat).
    pub(crate) fn grant_track_xp(&mut self, track: HeroTrack, xp_gain: f64) {
        if xp_gain <= 0.0 {
            return;
        }

        let (label, mut xp_value, mut level_value) = match track {
            HeroTrack::Drummer => (
                "Drummer",
                self.state.hero_progress.drummer_xp,
                self.state.hero_progress.drummer_level,
            ),
            HeroTrack::Vocalist => (
                "Vocalist",
                self.state.hero_progress.vocalist_xp,
                self.state.hero_progress.vocalist_level,
            ),
            HeroTrack::Synth => (
                "Synth",
                self.state.hero_progress.synth_xp,
                self.state.hero_progress.synth_level,
            ),
        };

        xp_value += xp_gain;
        let mut leveled = 0u16;
        let starting_total_level = self.hero_total_level();

        loop {
            let threshold = self.xp_to_next_level(starting_total_level.saturating_add(leveled));
            if xp_value + 0.0001 < threshold {
                break;
            }
            xp_value -= threshold;
            level_value = level_value.saturating_add(1);
            leveled = leveled.saturating_add(1);
        }

        match track {
            HeroTrack::Drummer => {
                self.state.hero_progress.drummer_xp = xp_value;
                self.state.hero_progress.drummer_level = level_value;
            }
            HeroTrack::Vocalist => {
                self.state.hero_progress.vocalist_xp = xp_value;
                self.state.hero_progress.vocalist_level = level_value;
            }
            HeroTrack::Synth => {
                self.state.hero_progress.synth_xp = xp_value;
                self.state.hero_progress.synth_level = level_value;
            }
        }

        if leveled > 0 {
            self.push_note(format!(
                "Hero {} gained {} level(s), now level {}.",
                label, leveled, level_value
            ));
            self.push_event(crate::state::GameEvent::HeroLeveledUp {
                track: track.key().to_string(),
                level: level_value,
            });
        }
    }

    fn raw_bassline_generation_per_second(&self, crew_efficiency: f64) -> f64 {
        let passive_trickle = if self.state.crystal_circle.removing_moss_completed {
            self.balance()
                .crystal
                .removing_moss_passive_bassline_per_second
        } else {
            0.0
        };
        let crew_gain = f64::from(self.crew_count(ROLE_CRYSTAL_BASSLINE))
            * self.bassline_output_per_worker()
            * crew_efficiency;
        let hero_gain = if self.hero_on_role(ROLE_CRYSTAL_BASSLINE) {
            self.bassline_output_per_worker()
                * crew_efficiency
                * self.state.hero_survival.work_efficiency_multiplier
                * self.hero_band_multiplier()
        } else {
            0.0
        };
        crew_gain + hero_gain + passive_trickle
    }

    fn raw_chorus_generation_per_second(&self, crew_efficiency: f64) -> f64 {
        let crew_gain = f64::from(self.crew_count(ROLE_CRYSTAL_CHORUS))
            * self.chorus_output_per_worker()
            * crew_efficiency;
        let hero_gain = if self.hero_on_role(ROLE_CRYSTAL_CHORUS) {
            self.chorus_output_per_worker()
                * crew_efficiency
                * self.state.hero_survival.work_efficiency_multiplier
                * self.hero_band_multiplier()
        } else {
            0.0
        };
        crew_gain + hero_gain
    }

    fn raw_harmonics_generation_per_second(&self, crew_efficiency: f64) -> f64 {
        let crew_gain = f64::from(self.crew_count(ROLE_CRYSTAL_HARMONICS))
            * self.harmonics_output_per_worker()
            * crew_efficiency;
        let hero_gain = if self.hero_on_role(ROLE_CRYSTAL_HARMONICS) {
            self.harmonics_output_per_worker()
                * crew_efficiency
                * self.state.hero_survival.work_efficiency_multiplier
                * self.hero_band_multiplier()
        } else {
            0.0
        };
        crew_gain + hero_gain
    }

    fn manual_station_upkeep_multiplier_for(&self, harmonics_tier: u8) -> f64 {
        if harmonics_tier >= 3 {
            1.0 - self.balance().power.tier_three_upkeep_discount
        } else {
            1.0
        }
    }

    pub(crate) fn brownout_severity(
        &self,
        requested_upkeep: f64,
        active_upkeep: f64,
        harmonics_tier: u8,
    ) -> f64 {
        if requested_upkeep <= 0.0 || active_upkeep + 0.0001 >= requested_upkeep {
            return 0.0;
        }

        let mut tolerance = 0.0;
        if harmonics_tier >= 2 {
            tolerance += self.balance().power.tier_two_brownout_tolerance;
        }
        if harmonics_tier >= 3 {
            tolerance += self.balance().power.tier_three_brownout_tolerance;
        }
        if self.station_powered(STATION_MIX_CONSOLE) {
            tolerance += self.balance().power.mix_console_brownout_tolerance;
        }

        let raw_severity = (1.0 - (active_upkeep / requested_upkeep)).clamp(0.0, 1.0);
        (raw_severity * (1.0 - tolerance.clamp(0.0, 0.85))).clamp(0.0, 1.0)
    }

    fn normalize_assignment(&mut self) {
        let total_crew = self.state.roster.total_crew;

        let expedition_crew = self.expedition_assigned_crew_u8();
        let mut remaining_crew = total_crew.saturating_sub(expedition_crew);
        let mut remaining_crystal_slots = self.max_assignable();
        let mut remaining_fire_pit_slots = self.fire_pit_capacity();

        for role_id in [
            ROLE_CRYSTAL_BASSLINE,
            ROLE_CRYSTAL_CHORUS,
            ROLE_CRYSTAL_HARMONICS,
            ROLE_CONSTRUCTION,
            ROLE_FIRE_PIT,
            ROLE_SCAVENGE,
            ROLE_WATER,
        ] {
            let Some(role) = role_def(role_id) else {
                continue;
            };
            if !self.role_available(role_id) {
                self.state
                    .roster
                    .crew_by_role
                    .insert(role_id.to_string(), 0);
                continue;
            }
            let current = self.crew_count(role_id);
            let capped = match role.slot_pool {
                RoleSlotPool::CrystalCircle => {
                    current.min(remaining_crystal_slots).min(remaining_crew)
                }
                RoleSlotPool::FirePit => current.min(remaining_fire_pit_slots).min(remaining_crew),
                RoleSlotPool::Base => current.min(remaining_crew),
            };
            self.state
                .roster
                .crew_by_role
                .insert(role_id.to_string(), capped);
            remaining_crew = remaining_crew.saturating_sub(capped);
            match role.slot_pool {
                RoleSlotPool::CrystalCircle => {
                    remaining_crystal_slots = remaining_crystal_slots.saturating_sub(capped)
                }
                RoleSlotPool::FirePit => {
                    remaining_fire_pit_slots = remaining_fire_pit_slots.saturating_sub(capped)
                }
                RoleSlotPool::Base => {}
            }
        }

        if !self.state.roster.hero_assigned || role_def(&self.state.roster.hero_role_id).is_none() {
            self.state.roster.hero_assigned = false;
            self.state.roster.hero_role_id = ROLE_CRYSTAL_BASSLINE.to_string();
        } else if !self.role_available(&self.state.roster.hero_role_id) {
            self.state.roster.hero_role_id = ROLE_CRYSTAL_BASSLINE.to_string();
        }
    }

    fn max_crew_for_role(&self, role_id: &str) -> u8 {
        let Some(role) = role_def(role_id) else {
            return 0;
        };
        if !role.crew_allowed || !self.role_available(role_id) {
            return 0;
        }

        let assigned_elsewhere: u8 = self
            .state
            .roster
            .crew_by_role
            .iter()
            .filter(|(current_role_id, _)| current_role_id.as_str() != role_id)
            .map(|(_, crew)| *crew)
            .sum();
        let expedition_crew = self.expedition_assigned_crew_u8();
        let remaining_crew_including_current = self
            .state
            .roster
            .total_crew
            .saturating_sub(assigned_elsewhere)
            .saturating_sub(expedition_crew);

        match role.slot_pool {
            RoleSlotPool::CrystalCircle => {
                let used_crystal_elsewhere: u8 = [
                    ROLE_CRYSTAL_BASSLINE,
                    ROLE_CRYSTAL_CHORUS,
                    ROLE_CRYSTAL_HARMONICS,
                ]
                .into_iter()
                .filter(|current_role_id| *current_role_id != role_id)
                .map(|current_role_id| self.crew_count(current_role_id))
                .sum();
                self.max_assignable()
                    .saturating_sub(used_crystal_elsewhere)
                    .min(remaining_crew_including_current)
            }
            RoleSlotPool::FirePit => self
                .fire_pit_capacity()
                .min(remaining_crew_including_current),
            RoleSlotPool::Base => remaining_crew_including_current,
        }
    }

    fn normalize_station_state(&mut self) {
        for def in stations() {
            let is_available = self.requirements_met(def.requirements);
            let station = self.state.stations.entry(def.id.to_string()).or_insert(
                crate::state::StationState {
                    requested_enabled: def.starts_requested,
                    is_powered: def.chorus_upkeep_per_second <= 0.0,
                    power_order: u32::from(def.ui_order),
                },
            );
            if !is_available {
                station.is_powered = false;
                station.requested_enabled = def.starts_requested;
            } else if !def.manual_power {
                station.requested_enabled = true;
                station.is_powered = true;
            }
        }
    }

    fn instant_recruits_available(&self) -> u16 {
        let current_stock =
            (30i32 - (self.state.clock_seconds / 10.0).floor() as i32).max(5) as u16;
        current_stock.saturating_sub(self.state.recruitment.instant_recruits_used)
    }

    fn next_recruit_cost(&self) -> f64 {
        recruit_cost_for_index(
            self.state
                .recruitment
                .total_recruited_this_run
                .saturating_add(1),
        )
    }

    fn balance(&self) -> BalanceSnapshot {
        balance_snapshot()
    }

    pub(crate) fn harmonics_tier_from_rate(&self, harmonics_per_second: f64) -> u8 {
        let power = self.balance().power;
        let threshold_multiplier = (1.0
            - f64::from(self.state.processing.research_harmonic_study_level)
                * power.research_harmonics_threshold_reduction_per_level)
            .clamp(0.25, 1.0);
        let mut tier = 0;
        if harmonics_per_second >= power.harmonics_tier_one_threshold * threshold_multiplier {
            tier += 1;
        }
        if harmonics_per_second >= power.harmonics_tier_two_threshold * threshold_multiplier {
            tier += 1;
        }
        if harmonics_per_second >= power.harmonics_tier_three_threshold * threshold_multiplier {
            tier += 1;
        }
        tier
    }

    fn harmonics_efficiency_multiplier(&self, harmonics_per_second: f64) -> f64 {
        let power = self.balance().power;
        let continuous = (harmonics_per_second * power.harmonics_continuous_bonus_per_unit)
            .min(power.harmonics_continuous_bonus_cap);
        let tier_bonus = f64::from(self.harmonics_tier_from_rate(harmonics_per_second))
            * power.harmonics_tier_bonus;
        let mix_console_bonus = if self.station_powered(STATION_MIX_CONSOLE) {
            power.mix_console_harmonics_bonus
        } else {
            0.0
        };
        1.0 + continuous + tier_bonus + mix_console_bonus
    }

    fn active_staff_count(&self) -> u8 {
        let assigned_crew: u16 = self
            .state
            .roster
            .crew_by_role
            .values()
            .map(|crew| u16::from(*crew))
            .sum();
        (assigned_crew + u16::from(self.state.roster.hero_assigned)).min(u16::from(u8::MAX)) as u8
    }

    fn expedition_assigned_crew(&self) -> u16 {
        self.state
            .expeditions
            .active_jobs
            .iter()
            .map(|job| job.assigned_crew)
            .sum()
    }

    fn expedition_assigned_crew_u8(&self) -> u8 {
        self.expedition_assigned_crew().min(u16::from(u8::MAX)) as u8
    }

    fn available_expedition_crew(&self) -> u16 {
        let assigned_roles: u16 = self
            .state
            .roster
            .crew_by_role
            .values()
            .map(|crew| u16::from(*crew))
            .sum();
        u16::from(self.state.roster.total_crew)
            .saturating_sub(assigned_roles)
            .saturating_sub(self.expedition_assigned_crew())
    }

    fn life_support_upkeep_per_second(&self) -> f64 {
        if !self.chorus_unlocked() {
            return 0.0;
        }

        let active_staff = self.active_staff_count();
        let free_staff = self.balance().power.life_support_free_staff.saturating_add(
            self.state
                .processing
                .research_chorus_routing_level
                .saturating_mul(self.balance().power.research_chorus_free_staff_per_level),
        );
        let staffed_overage = active_staff.saturating_sub(free_staff);

        f64::from(staffed_overage)
            * self
                .balance()
                .power
                .life_support_upkeep_per_staff_per_second
    }

    fn refresh_power_state(&mut self) {
        self.normalize_station_state();
        let crew_efficiency = self.crew_efficiency_multiplier();
        let active_staff_count = self.active_staff_count();
        let life_support_upkeep = self.life_support_upkeep_per_second();
        let bassline_generation_per_second =
            self.raw_bassline_generation_per_second(crew_efficiency);
        let chorus_generation_per_second = self.raw_chorus_generation_per_second(crew_efficiency);
        let harmonics_generation_per_second =
            self.raw_harmonics_generation_per_second(crew_efficiency);
        let harmonics_tier = self.harmonics_tier_from_rate(harmonics_generation_per_second);
        let requested_station_upkeep = self.requested_station_upkeep_per_second_for(harmonics_tier);
        let active_station_upkeep = self.active_station_upkeep_per_second_for(harmonics_tier);
        let requested_upkeep = requested_station_upkeep + life_support_upkeep;
        let active_upkeep = active_station_upkeep + life_support_upkeep;
        let base_harmonics_efficiency_multiplier =
            self.harmonics_efficiency_multiplier(harmonics_generation_per_second);
        let base_brownout_severity =
            self.brownout_severity(requested_upkeep, active_upkeep, harmonics_tier);
        let mix_processing_harmonics_bonus = if self.station_powered(STATION_MIX_CONSOLE) {
            f64::from(self.state.processing.mix_calibration_level)
                * self
                    .balance()
                    .power
                    .mix_processing_harmonics_bonus_per_level
        } else {
            0.0
        };
        let mix_processing_brownout_tolerance = if self.station_powered(STATION_MIX_CONSOLE) {
            f64::from(self.state.processing.mix_calibration_level)
                * self
                    .balance()
                    .power
                    .mix_processing_brownout_tolerance_per_level
        } else {
            0.0
        };
        let harmonics_efficiency_multiplier =
            base_harmonics_efficiency_multiplier + mix_processing_harmonics_bonus;
        let brownout_severity = (base_brownout_severity
            * (1.0 - mix_processing_brownout_tolerance.clamp(0.0, 0.75)))
        .clamp(0.0, 1.0);
        let bassline_output_multiplier = (1.0
            + (harmonics_efficiency_multiplier - 1.0)
                * self.balance().power.bassline_generation_bonus_weight)
            * (1.0 - brownout_severity * self.balance().power.brownout_bassline_penalty_weight);
        let chorus_output_multiplier = (1.0
            + (harmonics_efficiency_multiplier - 1.0)
                * self.balance().power.chorus_generation_bonus_weight)
            * (1.0 - brownout_severity * self.balance().power.brownout_chorus_penalty_weight);
        let harmonics_output_multiplier = (1.0
            + (harmonics_efficiency_multiplier - 1.0)
                * self.balance().power.harmonics_generation_bonus_weight)
            * (1.0 - brownout_severity * self.balance().power.brownout_harmonics_penalty_weight);
        let mut field_multiplier = harmonics_efficiency_multiplier;
        if self.station_powered(STATION_RESONANCE_CHAMBER) {
            field_multiplier *= (1.0 + self.balance().power.resonance_chamber_field_bonus)
                * (1.0
                    + f64::from(self.state.processing.resonance_calibration_level)
                        * self
                            .balance()
                            .power
                            .resonance_processing_field_bonus_per_level);
        }
        field_multiplier *=
            1.0 - brownout_severity * self.balance().power.brownout_field_penalty_weight;

        self.state.power.requested_upkeep_per_second = requested_upkeep;
        self.state.power.active_upkeep_per_second = active_upkeep;
        self.state.power.life_support_upkeep_per_second = life_support_upkeep;
        self.state.power.brownout_active = active_upkeep + 0.0001 < requested_upkeep;
        self.state.power.brownout_severity = brownout_severity;
        self.state.power.active_staff_count = active_staff_count;
        self.state.power.harmonics_tier = harmonics_tier;
        self.state.power.bassline_generation_per_second = bassline_generation_per_second;
        self.state.power.chorus_generation_per_second = chorus_generation_per_second;
        self.state.power.harmonics_generation_per_second = harmonics_generation_per_second;
        self.state.power.harmonics_efficiency_multiplier = harmonics_efficiency_multiplier;
        self.state.power.bassline_output_multiplier = bassline_output_multiplier.max(0.0);
        self.state.power.chorus_output_multiplier = chorus_output_multiplier.max(0.0);
        self.state.power.harmonics_output_multiplier = harmonics_output_multiplier.max(0.0);
        self.state.power.field_multiplier = field_multiplier;
    }

    pub(crate) fn resolve_station_power(&mut self, seconds: f64) {
        self.normalize_station_state();
        let mandatory_upkeep = self.life_support_upkeep_per_second() * seconds;
        let mut candidates = stations()
            .iter()
            .filter(|station| station.manual_power)
            .filter(|station| self.requirements_met(station.requirements))
            .filter_map(|station| {
                let runtime = self.state.stations.get(station.id)?;
                runtime.requested_enabled.then_some((
                    station.id,
                    station.label,
                    station.chorus_upkeep_per_second
                        * self
                            .manual_station_upkeep_multiplier_for(self.state.power.harmonics_tier),
                    runtime.power_order,
                ))
            })
            .collect::<Vec<_>>();
        candidates.sort_by_key(|(_, _, _, order)| *order);

        let available_after_life_support =
            (self.state.resources.chorus - mandatory_upkeep).max(0.0);
        let mut active_ids = candidates
            .iter()
            .map(|(id, _, upkeep, _)| (*id, *upkeep))
            .collect::<Vec<_>>();

        while active_ids
            .iter()
            .map(|(_, upkeep)| *upkeep * seconds)
            .sum::<f64>()
            > available_after_life_support
        {
            if active_ids.pop().is_none() {
                break;
            }
        }

        let total_upkeep = active_ids.iter().map(|(_, upkeep)| *upkeep).sum::<f64>();
        let total_spend = mandatory_upkeep + total_upkeep * seconds;
        self.state.resources.chorus = (self.state.resources.chorus - total_spend).max(0.0);

        let active_set = active_ids
            .iter()
            .map(|(id, _)| (*id).to_string())
            .collect::<Vec<_>>();
        for station in stations() {
            if let Some(runtime) = self.state.stations.get_mut(station.id) {
                let was_powered = runtime.is_powered;
                runtime.is_powered = !station.manual_power
                    || (runtime.requested_enabled && active_set.iter().any(|id| id == station.id));
                if was_powered && !runtime.is_powered {
                    self.push_note(format!("Brownout unpowered {}.", station.label));
                } else if !was_powered && runtime.is_powered && station.manual_power {
                    self.push_note(format!("{} powered back on.", station.label));
                }
            }
        }
    }

    fn requested_station_upkeep_per_second_for(&self, harmonics_tier: u8) -> f64 {
        stations()
            .iter()
            .filter(|station| station.manual_power)
            .filter(|station| self.requirements_met(station.requirements))
            .filter_map(|station| {
                self.state
                    .stations
                    .get(station.id)
                    .filter(|runtime| runtime.requested_enabled)
                    .map(|_| {
                        station.chorus_upkeep_per_second
                            * self.manual_station_upkeep_multiplier_for(harmonics_tier)
                    })
            })
            .sum()
    }

    fn active_station_upkeep_per_second_for(&self, harmonics_tier: u8) -> f64 {
        stations()
            .iter()
            .filter(|station| station.manual_power)
            .filter_map(|station| {
                self.state
                    .stations
                    .get(station.id)
                    .filter(|runtime| runtime.is_powered)
                    .map(|_| {
                        station.chorus_upkeep_per_second
                            * self.manual_station_upkeep_multiplier_for(harmonics_tier)
                    })
            })
            .sum()
    }

    fn station_powered(&self, station_id: &str) -> bool {
        self.state
            .stations
            .get(station_id)
            .map(|station| station.is_powered)
            .unwrap_or(false)
    }

    fn station_specialization(&self, station_id: &str) -> StationSpecializationPathState {
        self.state
            .resonance
            .station_specializations
            .get(station_id)
            .copied()
            .unwrap_or(StationSpecializationPathState::Balanced)
    }

    fn resonance_tuning_multiplier(&self, track: CrystalTuningTrackState) -> f64 {
        1.0 + f64::from(self.resonance_tuning_level(track))
            * RESONANCE_TUNING_OUTPUT_BONUS_PER_LEVEL
    }

    fn resonance_tuning_level(&self, track: CrystalTuningTrackState) -> u16 {
        match track {
            CrystalTuningTrackState::Bassline => self.state.resonance.tuning.bassline_level,
            CrystalTuningTrackState::Chorus => self.state.resonance.tuning.chorus_level,
            CrystalTuningTrackState::Harmonics => self.state.resonance.tuning.harmonics_level,
        }
    }

    fn resonance_material_amount(&self, material_id: &str) -> u16 {
        match material_id {
            RESONANCE_MATERIAL_ECHO_SHARDS => self.state.resonance.materials.echo_shards,
            RESONANCE_MATERIAL_SIGNAL_SCRAP => self.state.resonance.materials.signal_scrap,
            RESONANCE_MATERIAL_HARMONIC_RESIDUE => self.state.resonance.materials.harmonic_residue,
            _ => 0,
        }
    }

    fn add_resonance_material(&mut self, material_id: &str, amount: u16) {
        match material_id {
            RESONANCE_MATERIAL_ECHO_SHARDS => {
                self.state.resonance.materials.echo_shards = self
                    .state
                    .resonance
                    .materials
                    .echo_shards
                    .saturating_add(amount);
            }
            RESONANCE_MATERIAL_SIGNAL_SCRAP => {
                self.state.resonance.materials.signal_scrap = self
                    .state
                    .resonance
                    .materials
                    .signal_scrap
                    .saturating_add(amount);
            }
            RESONANCE_MATERIAL_HARMONIC_RESIDUE => {
                self.state.resonance.materials.harmonic_residue = self
                    .state
                    .resonance
                    .materials
                    .harmonic_residue
                    .saturating_add(amount);
            }
            _ => {}
        }
    }

    fn spend_resonance_material(&mut self, material_id: &str, amount: u16) {
        match material_id {
            RESONANCE_MATERIAL_ECHO_SHARDS => {
                self.state.resonance.materials.echo_shards = self
                    .state
                    .resonance
                    .materials
                    .echo_shards
                    .saturating_sub(amount);
            }
            RESONANCE_MATERIAL_SIGNAL_SCRAP => {
                self.state.resonance.materials.signal_scrap = self
                    .state
                    .resonance
                    .materials
                    .signal_scrap
                    .saturating_sub(amount);
            }
            RESONANCE_MATERIAL_HARMONIC_RESIDUE => {
                self.state.resonance.materials.harmonic_residue = self
                    .state
                    .resonance
                    .materials
                    .harmonic_residue
                    .saturating_sub(amount);
            }
            _ => {}
        }
    }

    fn resonance_recipe_duration_seconds(&self, recipe_def: &ResonanceRecipeDef) -> f64 {
        let mut multiplier = 1.0;
        if self.station_specialization(recipe_def.station_id)
            == StationSpecializationPathState::Conversion
        {
            multiplier -= STATION_SPECIALIZATION_CONVERSION_SPEED_BONUS;
        }
        (recipe_def.duration_seconds * multiplier.max(0.25)).max(1.0)
    }

    fn expedition_duration_seconds(&self, target_def: &ExpeditionTargetDef) -> f64 {
        let support_bonus = (f64::from(self.state.resonance.expedition_support_level)
            * RESONANCE_SUPPORT_DURATION_REDUCTION_PER_LEVEL)
            .min(RESONANCE_SUPPORT_DURATION_REDUCTION_CAP);
        let station_bonus = if self.station_specialization(STATION_RESONANCE_CHAMBER)
            == StationSpecializationPathState::Field
        {
            STATION_SPECIALIZATION_FIELD_DURATION_BONUS
        } else {
            0.0
        };
        target_def.duration_seconds * (1.0 - support_bonus - station_bonus).clamp(0.4, 1.0)
    }

    fn expedition_material_reward(&self, base_amount: u16) -> u16 {
        if base_amount == 0 {
            return 0;
        }
        let support_bonus = self.state.resonance.expedition_support_level / 2;
        let extraction_bonus = if self.station_specialization(STATION_WORKSHOP)
            == StationSpecializationPathState::Extraction
        {
            1
        } else {
            0
        };
        base_amount
            .saturating_add(support_bonus)
            .saturating_add(extraction_bonus)
    }

    fn tile_for_hex(&self, hex: &HexState) -> Option<&crate::game_data::TileDef> {
        tile_def(&hex.tile_id)
    }

    fn hex_is_open(&self, hex: &HexState) -> bool {
        self.tile_for_hex(hex)
            .map(|tile| !tile.is_blocker)
            .unwrap_or(false)
    }

    fn hex_exists(&self, q: i8, r: i8) -> bool {
        self.state.hexes.iter().any(|hex| hex.q == q && hex.r == r)
    }

    fn hex_is_open_at(&self, q: i8, r: i8) -> bool {
        self.state
            .hexes
            .iter()
            .find(|hex| hex.q == q && hex.r == r)
            .map(|hex| self.hex_is_open(hex))
            .unwrap_or(false)
    }

    fn hex_feature(&self, hex: &HexState) -> TileFeature {
        self.tile_for_hex(hex)
            .map(|tile| tile.feature)
            .unwrap_or(TileFeature::None)
    }

    fn crew_count(&self, role_id: &str) -> u8 {
        *self.state.roster.crew_by_role.get(role_id).unwrap_or(&0)
    }

    fn hero_on_role(&self, role_id: &str) -> bool {
        self.state.roster.hero_assigned && self.state.roster.hero_role_id == role_id
    }

    fn role_label(&self, role_id: &str) -> String {
        role_def(role_id)
            .map(|role| role.label.to_string())
            .unwrap_or_else(|| role_id.to_string())
    }

    fn station_label(&self, station_id: &str) -> String {
        station_def(station_id)
            .map(|station| station.label.to_string())
            .unwrap_or_else(|| station_id.to_string())
    }

    fn processing_track_level(&self, track: ProcessingTrack) -> u8 {
        match track {
            ProcessingTrack::ResonanceCalibration => {
                self.state.processing.resonance_calibration_level
            }
            ProcessingTrack::MixCalibration => self.state.processing.mix_calibration_level,
            ProcessingTrack::WorkshopTooling => self.state.processing.workshop_tooling_level,
            ProcessingTrack::WorkshopWaterCondensers => {
                self.state.processing.workshop_water_condensers_level
            }
            ProcessingTrack::ResearchChorusRouting => {
                self.state.processing.research_chorus_routing_level
            }
            ProcessingTrack::ResearchHarmonicStudy => {
                self.state.processing.research_harmonic_study_level
            }
        }
    }

    fn processing_track_level_for_recipe(&self, recipe_id: &str) -> u8 {
        let Some(recipe_def) = processing_recipe_def(recipe_id) else {
            return 0;
        };
        recipe_def
            .effects
            .iter()
            .find_map(|effect| match effect {
                EffectDef::IncrementProcessingTrack { track, .. } => {
                    Some(self.processing_track_level(*track))
                }
                _ => None,
            })
            .unwrap_or(0)
    }

    fn crystal_track_level(&self, track: CrystalTrack) -> u8 {
        match track {
            CrystalTrack::SlotCapacity => self.state.crystal_circle.slot_capacity_level,
            CrystalTrack::Output => self.state.crystal_circle.output_level,
            CrystalTrack::Storage => self.state.crystal_circle.storage_level,
            CrystalTrack::FieldPolish => self.state.crystal_circle.field_polish_level,
        }
    }

    fn requirements_met(&self, requirements: &[RequirementDef]) -> bool {
        requirements.iter().all(|requirement| {
            let condition = match *requirement {
                RequirementDef::FlagSet(flag_id) => Condition::FlagSet(flag_id),
                RequirementDef::FlagUnset(flag_id) => Condition::FlagUnset(flag_id),
            };
            self.evaluate_condition(&condition)
        })
    }

    /// Whether every condition holds (the gating + storylet-precondition check).
    pub(crate) fn evaluate_conditions(&self, conditions: &[Condition]) -> bool {
        conditions
            .iter()
            .all(|condition| self.evaluate_condition(condition))
    }

    /// The single source of truth for "does this condition hold against current
    /// state". Reads typed state + the narrative qualities bag; combinators
    /// recurse. (See `Condition` in game_data.rs.)
    pub(crate) fn evaluate_condition(&self, condition: &Condition) -> bool {
        match *condition {
            Condition::Always => true,
            Condition::FlagSet(flag_id) => self.flag_value(flag_id),
            Condition::FlagUnset(flag_id) => !self.flag_value(flag_id),
            Condition::ResourceAtLeast {
                resource_id,
                amount,
            } => self.can_afford(resource_id, amount),
            Condition::BubbleReachAtLeast(n) => self.state.bubble.reach_from_base >= n,
            Condition::ClockSecondsAtLeast(seconds) => self.state.clock_seconds >= seconds,
            Condition::QualityAtLeast { key, value } => self.quality(key) >= value,
            Condition::BeatCompleted(beat_id) => self.story_beat_completed(beat_id),
            Condition::ChoiceMade {
                beat_id,
                option_id,
            } => self
                .state
                .narrative
                .choice_by_beat
                .get(beat_id)
                .is_some_and(|chosen| chosen == option_id),
            Condition::RoleAvailable(role_id) => self.role_available(role_id),
            Condition::RecruitmentEnabled => self.state.objectives.recruitment_enabled,
            Condition::RecruitedAny => self.state.recruitment.total_recruited_this_run > 0,
            Condition::HeroOutsideBubble => self.flag_value(FLAG_HERO_OUTSIDE_BUBBLE),
            Condition::HeroForcedReturn => self.flag_value(FLAG_HERO_FORCED_RETURN_ACTIVE),
            Condition::HeroRecovering => self.flag_value(FLAG_HERO_RECOVERING_AT_STUDIO),
            Condition::All(conditions) => self.evaluate_conditions(conditions),
            Condition::Any(conditions) => {
                conditions.iter().any(|c| self.evaluate_condition(c))
            }
            Condition::Not(inner) => !self.evaluate_condition(inner),
        }
    }

    /// Read a narrative quality (absent = 0).
    pub(crate) fn quality(&self, key: &str) -> i64 {
        self.state
            .narrative
            .qualities
            .get(key)
            .copied()
            .unwrap_or(0)
    }

    fn set_quality(&mut self, key: &str, value: i64) {
        self.state
            .narrative
            .qualities
            .insert(key.to_string(), value);
    }

    fn add_quality(&mut self, key: &str, amount: i64) {
        let next = self.quality(key).saturating_add(amount);
        self.set_quality(key, next);
    }

    fn flag_value(&self, flag_id: &str) -> bool {
        match flag_id {
            FLAG_BASE_STUDIO_RESTORE_UNLOCKED => self.state.base.studio_restore_unlocked,
            FLAG_BASE_STUDIO_RESTORED => self.state.base.studio_restored,
            FLAG_BASE_FIRE_PIT_BUILT => self.state.base.fire_pit_built,
            FLAG_BASE_RESONANCE_CHAMBER_BUILT => self.state.base.resonance_chamber_built,
            FLAG_BASE_MIX_CONSOLE_BUILT => self.state.base.mix_console_built,
            FLAG_BASE_WORKSHOP_BUILT => self.state.base.workshop_built,
            FLAG_BASE_RESEARCH_BOOTH_BUILT => self.state.base.research_booth_built,
            FLAG_BASE_TUTORIAL_INVESTIGATED => self.state.base.tutorial_investigated,
            FLAG_BASE_TUTORIAL_EXPLORED => self.state.base.tutorial_explored,
            FLAG_BASE_WATER_COLLECTION_UNLOCKED => self.state.base.water_collection_unlocked,
            FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED => self.state.crystal_circle.removing_moss_unlocked,
            FLAG_CRYSTAL_REMOVING_MOSS_COMPLETED => {
                self.state.crystal_circle.removing_moss_completed
            }
            FLAG_HERO_OUTSIDE_BUBBLE => {
                self.state.hero_survival.location == HeroLocationState::OutsideBubble
            }
            FLAG_HERO_FORCED_RETURN_ACTIVE => self.state.hero_survival.forced_return.is_some(),
            FLAG_HERO_RECOVERING_AT_STUDIO => matches!(
                self.state
                    .hero_survival
                    .forced_return
                    .as_ref()
                    .map(|state| state.phase),
                Some(ForcedReturnPhase::RecoverAtStudio)
            ),
            _ => false,
        }
    }

    fn set_flag(&mut self, flag_id: &str, value: bool) {
        match flag_id {
            FLAG_BASE_STUDIO_RESTORE_UNLOCKED => self.state.base.studio_restore_unlocked = value,
            FLAG_BASE_STUDIO_RESTORED => self.state.base.studio_restored = value,
            FLAG_BASE_FIRE_PIT_BUILT => self.state.base.fire_pit_built = value,
            FLAG_BASE_RESONANCE_CHAMBER_BUILT => {
                self.state.base.resonance_chamber_built = value;
                if value {
                    self.ensure_station_present(STATION_RESONANCE_CHAMBER);
                }
            }
            FLAG_BASE_MIX_CONSOLE_BUILT => {
                self.state.base.mix_console_built = value;
                if value {
                    self.ensure_station_present(STATION_MIX_CONSOLE);
                }
            }
            FLAG_BASE_WORKSHOP_BUILT => {
                self.state.base.workshop_built = value;
                if value {
                    self.ensure_station_present(STATION_WORKSHOP);
                }
            }
            FLAG_BASE_RESEARCH_BOOTH_BUILT => {
                self.state.base.research_booth_built = value;
                if value {
                    self.ensure_station_present(STATION_RESEARCH_BOOTH);
                }
            }
            FLAG_BASE_TUTORIAL_INVESTIGATED => self.state.base.tutorial_investigated = value,
            FLAG_BASE_TUTORIAL_EXPLORED => self.state.base.tutorial_explored = value,
            FLAG_BASE_WATER_COLLECTION_UNLOCKED => {
                self.state.base.water_collection_unlocked = value
            }
            FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED => {
                self.state.crystal_circle.removing_moss_unlocked = value
            }
            FLAG_CRYSTAL_REMOVING_MOSS_COMPLETED => {
                self.state.crystal_circle.removing_moss_completed = value
            }
            _ => {}
        }
    }

    pub(crate) fn apply_effects(&mut self, effects: &[EffectDef]) {
        // Validate-then-commit: if any cost in the batch can't be paid, reject
        // the whole batch (no partial application) and surface why.
        if let Some(reason) = self.unaffordable_effect_reason(effects) {
            self.push_note(reason.clone());
            self.push_event(crate::state::GameEvent::EffectRejected { reason });
            return;
        }
        for effect in effects {
            match *effect {
                EffectDef::SetFlag { flag_id, value } => self.set_flag(flag_id, value),
                EffectDef::AddBunks { amount } => {
                    self.state.base.bunks_capacity =
                        self.state.base.bunks_capacity.saturating_add(amount);
                    self.refresh_base_pressure_state();
                }
                EffectDef::AddSkins { amount } => {
                    self.state.base.skins = self.state.base.skins.saturating_add(amount);
                }
                EffectDef::IncrementCrystalTrack { track, amount } => match track {
                    CrystalTrack::SlotCapacity => {
                        self.state.crystal_circle.slot_capacity_level = self
                            .state
                            .crystal_circle
                            .slot_capacity_level
                            .saturating_add(amount);
                    }
                    CrystalTrack::Output => {
                        self.state.crystal_circle.output_level = self
                            .state
                            .crystal_circle
                            .output_level
                            .saturating_add(amount);
                    }
                    CrystalTrack::Storage => {
                        self.state.crystal_circle.storage_level = self
                            .state
                            .crystal_circle
                            .storage_level
                            .saturating_add(amount);
                    }
                    CrystalTrack::FieldPolish => {
                        self.state.crystal_circle.field_polish_level = self
                            .state
                            .crystal_circle
                            .field_polish_level
                            .saturating_add(amount);
                    }
                },
                EffectDef::IncrementProcessingTrack { track, amount } => match track {
                    ProcessingTrack::ResonanceCalibration => {
                        self.state.processing.resonance_calibration_level = self
                            .state
                            .processing
                            .resonance_calibration_level
                            .saturating_add(amount);
                    }
                    ProcessingTrack::MixCalibration => {
                        self.state.processing.mix_calibration_level = self
                            .state
                            .processing
                            .mix_calibration_level
                            .saturating_add(amount);
                    }
                    ProcessingTrack::WorkshopTooling => {
                        self.state.processing.workshop_tooling_level = self
                            .state
                            .processing
                            .workshop_tooling_level
                            .saturating_add(amount);
                    }
                    ProcessingTrack::WorkshopWaterCondensers => {
                        self.state.processing.workshop_water_condensers_level = self
                            .state
                            .processing
                            .workshop_water_condensers_level
                            .saturating_add(amount);
                    }
                    ProcessingTrack::ResearchChorusRouting => {
                        self.state.processing.research_chorus_routing_level = self
                            .state
                            .processing
                            .research_chorus_routing_level
                            .saturating_add(amount);
                    }
                    ProcessingTrack::ResearchHarmonicStudy => {
                        self.state.processing.research_harmonic_study_level = self
                            .state
                            .processing
                            .research_harmonic_study_level
                            .saturating_add(amount);
                    }
                },
                EffectDef::GrantResource {
                    resource_id,
                    amount,
                } => {
                    self.add_capped_resource(resource_id, amount);
                }
                EffectDef::SpendResource {
                    resource_id,
                    amount,
                } => self.spend_resource(resource_id, amount),
                EffectDef::SetQuality { key, value } => self.set_quality(key, value),
                EffectDef::AddQuality { key, amount } => self.add_quality(key, amount),
                EffectDef::CompleteBeat { beat_id } => self.mark_story_beat_complete(beat_id),
                EffectDef::Note { text } => self.push_note(text.to_string()),
            }
        }
    }

    fn apply_construction_effects(&mut self, option_id: &str) {
        if let Some(option_def) = construction_option_def(option_id) {
            self.apply_effects(option_def.effects);
        }
    }

    fn resource_label(&self, resource_id: &str) -> String {
        match resource_id {
            RESOURCE_BASSLINE => "Bassline".to_string(),
            RESOURCE_CHORUS => "Chorus".to_string(),
            RESOURCE_HARMONICS => "Harmonics".to_string(),
            RESOURCE_STONE => "Stone".to_string(),
            RESOURCE_WATER => "Water".to_string(),
            RESOURCE_VIBES => "Vibes".to_string(),
            _ => resource_id.to_string(),
        }
    }

    fn cost_item_label(&self, item_id: &str) -> String {
        match item_id {
            COST_ITEM_SKIN => "Skin".to_string(),
            RESOURCE_WATER => "Water".to_string(),
            _ => self.resource_label(item_id),
        }
    }

    fn can_afford(&self, resource_id: &str, amount: f64) -> bool {
        match resource_id {
            RESOURCE_BASSLINE => self.state.resources.bassline >= amount,
            RESOURCE_CHORUS => self.state.resources.chorus >= amount,
            RESOURCE_HARMONICS => self.state.resources.harmonics >= amount,
            RESOURCE_STONE => self.state.resources.stone >= amount,
            RESOURCE_WATER => self.state.resources.water >= amount,
            _ => false,
        }
    }

    fn can_afford_cost_item(&self, cost: &CostItemDef) -> bool {
        match cost.item_id {
            COST_ITEM_SKIN => f64::from(self.state.base.skins) >= cost.amount,
            _ => self.can_afford(cost.item_id, cost.amount),
        }
    }

    fn commit_cost_items(&mut self, costs: &[CostItemDef]) {
        for cost in costs {
            match cost.item_id {
                COST_ITEM_SKIN => {
                    self.state.base.skins = self
                        .state
                        .base
                        .skins
                        .saturating_sub(cost.amount.max(0.0).floor() as u16);
                }
                _ => self.spend_resource(cost.item_id, cost.amount),
            }
        }
    }

    fn spend_resource(&mut self, resource_id: &str, amount: f64) {
        match resource_id {
            RESOURCE_BASSLINE => {
                self.state.resources.bassline = (self.state.resources.bassline - amount).max(0.0);
                self.state.resources.lifetime_spent += amount;
            }
            RESOURCE_CHORUS => {
                self.state.resources.chorus = (self.state.resources.chorus - amount).max(0.0);
            }
            RESOURCE_HARMONICS => {
                self.state.resources.harmonics = (self.state.resources.harmonics - amount).max(0.0);
            }
            RESOURCE_STONE => {
                self.state.resources.stone = (self.state.resources.stone - amount).max(0.0);
            }
            RESOURCE_WATER => {
                self.state.resources.water = (self.state.resources.water - amount).max(0.0);
            }
            _ => {}
        }
    }

    fn add_capped_resource(&mut self, resource_id: &str, amount: f64) -> f64 {
        let amount = amount.max(0.0);
        match resource_id {
            RESOURCE_BASSLINE => {
                let before = self.state.resources.bassline;
                self.state.resources.bassline =
                    (before + amount).min(self.state.resources.bassline_cap);
                self.state.resources.bassline - before
            }
            RESOURCE_CHORUS => {
                let before = self.state.resources.chorus;
                self.state.resources.chorus =
                    (before + amount).min(self.state.resources.chorus_cap);
                self.state.resources.chorus - before
            }
            RESOURCE_HARMONICS => {
                let before = self.state.resources.harmonics;
                self.state.resources.harmonics =
                    (before + amount).min(self.state.resources.harmonics_cap);
                self.state.resources.harmonics - before
            }
            RESOURCE_STONE => {
                let before = self.state.resources.stone;
                self.state.resources.stone = (before + amount).min(self.state.resources.stone_cap);
                self.state.resources.stone - before
            }
            RESOURCE_WATER => {
                let before = self.state.resources.water;
                self.state.resources.water = (before + amount).min(self.state.resources.water_cap);
                self.state.resources.water - before
            }
            RESOURCE_VIBES => {
                let before = self.state.resources.vibes;
                self.state.resources.vibes = (before + amount).min(self.state.resources.vibes_cap);
                self.state.resources.vibes - before
            }
            _ => 0.0,
        }
    }

    fn ensure_station_present(&mut self, station_id: &str) {
        if let Some(def) = station_def(station_id) {
            self.state.stations.entry(station_id.to_string()).or_insert(
                crate::state::StationState {
                    requested_enabled: def.starts_requested,
                    is_powered: def.chorus_upkeep_per_second <= 0.0,
                    power_order: u32::from(def.ui_order),
                },
            );
        }
    }

    fn push_note(&mut self, note: impl Into<String>) {
        let note = note.into();
        if self.state.notes.last() == Some(&note) {
            return;
        }
        self.state.notes.push(note);
        if self.state.notes.len() > self.balance().notes_limit {
            let overflow = self.state.notes.len() - self.balance().notes_limit;
            self.state.notes.drain(0..overflow);
        }
    }

    /// Record a structured event for this frame. The human-readable `notes` log
    /// is pushed separately at the same sites, so the two stay in sync while
    /// consumers migrate from string-sniffing to typed events.
    fn push_event(&mut self, event: crate::state::GameEvent) {
        self.state.events.push(event);
    }

    /// If a batch's resource costs can't be paid, the reason; else `None`.
    ///
    /// Spends of the same resource are summed and checked against the current
    /// balance. Only known spendable resources are validated — an unrecognized
    /// resource id no-ops on spend (as before), so it isn't treated as a cost.
    fn unaffordable_effect_reason(&self, effects: &[EffectDef]) -> Option<String> {
        use std::collections::BTreeMap;
        let mut required: BTreeMap<&'static str, f64> = BTreeMap::new();
        for effect in effects {
            if let EffectDef::SpendResource {
                resource_id,
                amount,
            } = *effect
            {
                if is_known_spendable(resource_id) {
                    *required.entry(resource_id).or_insert(0.0) += amount.max(0.0);
                }
            }
        }
        for (resource_id, amount) in required {
            if !self.can_afford(resource_id, amount) {
                return Some(format!(
                    "Not enough {} for the effect.",
                    self.resource_label(resource_id)
                ));
            }
        }
        None
    }

    /// Advance the deterministic PRNG (splitmix64) and return the next value.
    /// Mutates the persisted `rng_seed`, so the stream survives save/reload.
    pub(crate) fn next_rng_u64(&mut self) -> u64 {
        self.state.rng_seed = self.state.rng_seed.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.state.rng_seed;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }

    /// Next PRNG draw as an `f64` in `[0.0, 1.0)`.
    pub(crate) fn next_rng_f64(&mut self) -> f64 {
        // Top 53 bits give a uniform double without bias.
        (self.next_rng_u64() >> 11) as f64 / ((1u64 << 53) as f64)
    }

    /// Next PRNG draw as an index in `0..bound` (returns 0 when `bound == 0`).
    /// Reserved for index draws (loot/encounter selection); exercised in tests.
    #[allow(dead_code)]
    pub(crate) fn next_rng_below(&mut self, bound: u64) -> u64 {
        if bound == 0 {
            return 0;
        }
        self.next_rng_u64() % bound
    }

    /// The Hero's aggregated combat stats. Today this is base + per-level scaling;
    /// the single seam where skills and gear bonuses will fold in (T2.1 step 2/3).
    pub(crate) fn hero_stats(&self) -> HeroStats {
        let combat = self.balance().combat;
        let level = f64::from(self.hero_total_level());
        HeroStats {
            attack: combat.base_attack + level * combat.attack_per_level,
            max_hp: combat.base_hp + level * combat.hp_per_level,
        }
    }

    /// Begin an auto-battler skirmish, unless the Hero is unavailable, already
    /// fighting, or the location is already cleared.
    fn engage(&mut self, creature_id: &str, key: String, loot_item: Option<String>, loot_qty: u32) {
        if self.state.active_combat.is_some() {
            self.push_note("The Hero is already in a fight.");
            return;
        }
        if self.hero_locked_by_survival() {
            self.push_note("The Hero cannot fight during forced return or recovery.");
            return;
        }
        if self.state.cleared_locations.contains(&key) {
            return;
        }
        let Some(creature) = creature_def(creature_id) else {
            self.push_note(format!("Unknown creature: {creature_id}."));
            return;
        };
        let stats = self.hero_stats();
        let round_seconds = self.balance().combat.round_seconds;
        self.state.active_combat = Some(CombatJob {
            creature_id: creature_id.to_string(),
            creature_label: creature.label.to_string(),
            location_key: key,
            loot_item,
            loot_qty,
            creature_hp: creature.hp,
            creature_hp_max: creature.hp,
            hero_hp: stats.max_hp,
            hero_hp_max: stats.max_hp,
            round: 0,
            round_timer: round_seconds,
            xp_reward: creature.xp_reward,
            threat: creature.threat,
            log: Vec::new(),
        });
        self.push_note(format!("Engaged {}.", creature.label));
    }

    /// Advance any in-progress skirmish by `seconds`, resolving whole rounds as
    /// the timer elapses. Runs live and during offline catch-up.
    fn progress_combat(&mut self, mut seconds: f64) {
        while seconds > 0.0 {
            let Some(mut combat) = self.state.active_combat.clone() else {
                break;
            };
            if combat.round_timer > seconds {
                combat.round_timer -= seconds;
                self.state.active_combat = Some(combat);
                break;
            }
            seconds -= combat.round_timer;

            // Both sides strike once, each with ±variance damage.
            let stats = self.hero_stats();
            let creature_attack = creature_def(&combat.creature_id)
                .map(|creature| creature.attack)
                .unwrap_or(0.0);
            let hero_damage = stats.attack * self.combat_variance();
            let creature_damage = creature_attack * self.combat_variance();

            combat.round = combat.round.saturating_add(1);
            combat.creature_hp = (combat.creature_hp - hero_damage).max(0.0);
            combat.hero_hp = (combat.hero_hp - creature_damage).max(0.0);
            combat.round_timer = self.balance().combat.round_seconds;
            combat.log.push(CombatLogEntry {
                round: combat.round,
                hero_damage,
                creature_damage,
                hero_hp: combat.hero_hp,
                creature_hp: combat.creature_hp,
            });
            // Keep the log bounded for long fights.
            if combat.log.len() > 30 {
                let overflow = combat.log.len() - 30;
                combat.log.drain(0..overflow);
            }

            if combat.creature_hp <= 0.0 {
                self.resolve_combat_victory(&combat);
                self.state.active_combat = None;
            } else if combat.hero_hp <= 0.0 {
                self.resolve_combat_retreat(&combat);
                self.state.active_combat = None;
            } else {
                self.state.active_combat = Some(combat);
            }

            if self.state.active_combat.is_none() {
                break;
            }
        }
    }

    /// One damage roll's multiplier in `[1 - variance, 1 + variance)`.
    fn combat_variance(&mut self) -> f64 {
        let variance = self.balance().combat.damage_variance;
        1.0 - variance + 2.0 * variance * self.next_rng_f64()
    }

    /// Wound units to inflict for `hp_lost`, scaled by creature `threat`.
    fn combat_wounds(&self, hp_lost: f64, threat: f64) -> u16 {
        let per_hp = self.balance().combat.wound_units_per_hp_lost;
        (hp_lost.max(0.0) * per_hp * (1.0 + threat)).round() as u16
    }

    pub(crate) fn resolve_combat_victory(&mut self, combat: &CombatJob) {
        let hp_lost = combat.hero_hp_max - combat.hero_hp;
        let wounds = self.combat_wounds(hp_lost, combat.threat);
        self.state.hero_survival.wounds.wound_units_taken = self
            .state
            .hero_survival
            .wounds
            .wound_units_taken
            .saturating_add(wounds);

        self.state.cleared_locations.insert(combat.location_key.clone());
        if let Some(item_id) = &combat.loot_item {
            self.grant_item(item_id, combat.loot_qty);
        }
        self.grant_track_xp(HeroTrack::Drummer, combat.xp_reward);

        self.push_note(format!(
            "Defeated {} after {} round(s).",
            combat.creature_label, combat.round
        ));
        self.push_event(crate::state::GameEvent::CombatResolved {
            creature_id: combat.creature_id.clone(),
            outcome: "victory".to_string(),
        });
        self.refresh_hero_survival_state();
    }

    pub(crate) fn resolve_combat_retreat(&mut self, combat: &CombatJob) {
        let wounds = self
            .combat_wounds(combat.hero_hp_max, combat.threat)
            .saturating_add(self.balance().combat.defeat_extra_wound_units.round() as u16);
        self.state.hero_survival.wounds.wound_units_taken = self
            .state
            .hero_survival
            .wounds
            .wound_units_taken
            .saturating_add(wounds);

        self.push_note(format!(
            "Retreated from {} — the Hero is hurt and pulling back to safety.",
            combat.creature_label
        ));
        self.push_event(crate::state::GameEvent::CombatResolved {
            creature_id: combat.creature_id.clone(),
            outcome: "retreat".to_string(),
        });
        // A downed Hero is forced to return and recover.
        self.trigger_forced_return();
        self.refresh_hero_survival_state();
    }
}

/// The Hero's aggregated combat stats for one skirmish.
pub(crate) struct HeroStats {
    pub attack: f64,
    pub max_hp: f64,
}

/// Whether `spend_resource` recognizes (and can actually deduct) this resource.
fn is_known_spendable(resource_id: &str) -> bool {
    matches!(
        resource_id,
        RESOURCE_BASSLINE | RESOURCE_CHORUS | RESOURCE_HARMONICS | RESOURCE_STONE | RESOURCE_WATER
    )
}

fn hex_distance(q1: i8, r1: i8, q2: i8, r2: i8) -> u8 {
    let dq = q1 - q2;
    let dr = r1 - r2;
    dq.abs().max(dr.abs()).max((-(q1 + r1) + (q2 + r2)).abs()) as u8
}

fn expedition_risk_state(risk: ExpeditionRiskDef) -> ExpeditionRiskState {
    match risk {
        ExpeditionRiskDef::Low => ExpeditionRiskState::Low,
        ExpeditionRiskDef::Medium => ExpeditionRiskState::Medium,
        ExpeditionRiskDef::High => ExpeditionRiskState::High,
    }
}

fn crystal_tuning_track_state(track: ResonanceTuningTrackDef) -> CrystalTuningTrackState {
    match track {
        ResonanceTuningTrackDef::Bassline => CrystalTuningTrackState::Bassline,
        ResonanceTuningTrackDef::Chorus => CrystalTuningTrackState::Chorus,
        ResonanceTuningTrackDef::Harmonics => CrystalTuningTrackState::Harmonics,
    }
}

fn resonance_material_label(material_id: &str) -> &'static str {
    match material_id {
        RESONANCE_MATERIAL_ECHO_SHARDS => "Echo Shards",
        RESONANCE_MATERIAL_SIGNAL_SCRAP => "Signal Scrap",
        RESONANCE_MATERIAL_HARMONIC_RESIDUE => "Harmonic Residue",
        _ => "Strange Material",
    }
}

fn station_specialization_label(path: StationSpecializationPathState) -> &'static str {
    match path {
        StationSpecializationPathState::Balanced => "Balanced",
        StationSpecializationPathState::Conversion => "Conversion",
        StationSpecializationPathState::Field => "Field",
        StationSpecializationPathState::Extraction => "Extraction",
    }
}
