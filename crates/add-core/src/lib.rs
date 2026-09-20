pub mod command;
pub mod game_data;
pub mod migrations;
pub mod save;
pub mod simulation;
pub mod state;
pub mod topology;
pub mod tuning;

pub use command::{BlockerId, CommandOutcome, GameCommand};
pub use game_data::{
    AccessRuleDef, AccessRuleKind, BalanceSnapshot, BlockerDef, BlockerKind, BubbleBalance,
    CapBehavior, CatalogSnapshot, ConstructionGroup, ConstructionOptionDef, CostDef, CreatureDef,
    CrystalBalance, CrystalTrack, EffectDef, EntityKind, EntityPresentationDef, EntitySchemaDef,
    EntitySchemaSnapshot, EntityVisibilityDef, ExpeditionRewardDef, ExpeditionRiskDef,
    ExpeditionSupportDef, ExpeditionTargetDef, FirePitBalance, FloraDef, FloraKind, FlowCadence,
    FlowDef, FlowDirection, HeroExposureDef, HeroTrack, ItemDef, ItemEffectDef, ItemEffectKind,
    ModelKind, ModelRefDef, OVERWORLD_MAP, PerkDef, PerkEffectDef, PerkStat, PersistenceDef,
    PersistenceScope, PowerBalance, PowerFallbackMode, PowerProfileDef, PresentationDef,
    PresentationReveal, ProcessingRecipeDef, ProcessingTrack, ProgressionBalance,
    RecruitmentBalance, RequirementDef, ResonanceEffectDef, ResonanceMaterialCostDef,
    ResonanceRecipeDef, ResonanceTuningTrackDef, ResourceCategory, ResourceDef, RoleDef,
    RoleSlotPool, ScavengeBalance, StationCategory, StationDef, StoryBeatDef, StoryChoiceDef,
    StructureDef, StructureKind, SurvivalBalance, TerrainProfile, TerrainSnapshot, TileDef,
    TileFeature, TileTag, TuningAffinity, UiElementDef, UnlockDef, UnlockKind, VibesBalance,
    VisibilityConditionDef, VisibilityDef, WaterBalance, WorldActionDef, balance_snapshot,
    catalog_snapshot, construction_option_def, construction_options, entity_schema_def,
    entity_schemas, expedition_target_def, expedition_targets, flora, flora_def, presentation_def,
    processing_recipe_def, processing_recipes, recruit_cost_for_index, resonance_recipe_def,
    resonance_recipes, resource_def, resources, role_def, roles, station_def, stations,
    story_beat_def, story_beats, structure_def, structures, terrain_profile_for, tile_def,
    tile_id_for, world_action_def, world_actions,
};
pub use migrations::{CURRENT_CATALOG_VERSION, CURRENT_SCHEMA_VERSION, MigrationError};
pub use save::{SaveError, export_save, import_save};
pub use simulation::Simulation;
pub use state::{
    BaseState, BubbleState, CombatJob, CombatLogEntry, ConstructionJob, CrystalCircleState,
    CrystalTuningState, CrystalTuningTrackState, DEFAULT_BASE_SLOTS, DEFAULT_TOTAL_CREW,
    ExpeditionJob, ExpeditionReport, ExpeditionRiskState, ExpeditionState, ForcedReturnPhase,
    ForcedReturnState, GRID_RADIUS, GameEvent, GameState, HeroLocationState, HeroProgressState,
    HeroSurvivalState, HexCoordState, HexState, HexVisualState, NarrativeState, ObjectiveState,
    PowerState, ProcessingJob, ProcessingState, RecruitTravel, RecruitmentState, ResonanceJob,
    ResonanceMaterialState, ResonanceReport, ResonanceState, ResourcePools, RosterState,
    StationSpecializationPathState, StationState, WorldAction, WoundTrackState,
};
pub use topology::{
    AxialBounds, GeneratedCell, Landmark, MapCell, MapDefinition, TerrainRegion, axial_distance,
};

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::{
        BlockerKind, DEFAULT_TOTAL_CREW, ForcedReturnPhase, ForcedReturnState, GameCommand,
        GameState, HeroLocationState, HexCoordState, RecruitTravel, Simulation,
        StationSpecializationPathState, StationState, export_save,
        game_data::{
            CONSTRUCTION_OUTPUT, CONSTRUCTION_REMOVING_MOSS, CONSTRUCTION_STORAGE, Condition,
            EXPEDITION_LOCAL_SCAVENGE_SWEEP, EffectDef, FLAG_BASE_FIRE_PIT_BUILT,
            FLAG_BASE_STUDIO_RESTORED, PROJECT_BUILD_FIRE_PIT, PROJECT_BUILD_MIX_CONSOLE,
            PROJECT_BUILD_RESEARCH_BOOTH, PROJECT_BUILD_RESONANCE_CHAMBER, PROJECT_BUILD_WORKSHOP,
            PROJECT_EXPAND_BUNKS, PROJECT_EXPEDITION_STAGING, PROJECT_PREPARE_LOUDSPEAKERS,
            PROJECT_RESTORE_STUDIO, PROJECT_SAFE_WATER_SYSTEMS, RECIPE_MIX_SIGNAL_BALANCING,
            RECIPE_RESEARCH_CHORUS_ROUTING, RECIPE_RESEARCH_HARMONIC_STUDY,
            RECIPE_RESONANCE_FIELD_CALIBRATION, RECIPE_WORKSHOP_BUILDER_TOOLS,
            RECIPE_WORKSHOP_WATER_CONDENSERS, RESONANCE_RECIPE_BASSLINE_OVERTONE,
            RESOURCE_BASSLINE, RESOURCE_CHORUS, RESOURCE_HARMONICS, RESOURCE_STONE, RESOURCE_VIBES,
            RESOURCE_WATER, ROLE_CONSTRUCTION, ROLE_CRYSTAL_BASSLINE, ROLE_CRYSTAL_CHORUS,
            ROLE_CRYSTAL_HARMONICS, ROLE_FIRE_PIT, ROLE_SCAVENGE, ROLE_WATER,
            STATION_CRYSTAL_CIRCLE, STATION_FIRE_PIT, STATION_MIX_CONSOLE, STATION_RESEARCH_BOOTH,
            STATION_RESONANCE_CHAMBER, STATION_WORKSHOP, STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL,
            STORY_BEAT_BUILD_FIRE_PIT, STORY_BEAT_ENTER_THE_BUBBLE, STORY_BEAT_EXPLORE_BASE,
            STORY_BEAT_FIRST_GLIMPSE, STORY_BEAT_FIRST_RECRUIT, STORY_BEAT_HERO_EXPOSED,
            STORY_BEAT_INVESTIGATE_BASE, STORY_BEAT_REACH_SURVIVOR_CAVE, STORY_BEAT_RESTORE_STUDIO,
            STORY_BEAT_ROAD_TO_BASE, STORY_BEAT_STABILIZE_BASE, STRUCTURE_BASE, STRUCTURE_CAVE,
            STRUCTURE_CRYSTAL_CIRCLE, TILE_BASE_CORE, TILE_MOUNTAIN_WALL, TILE_SURVIVOR_CAVE,
            WORLD_ACTION_EXPLORE_BASE, WORLD_ACTION_INVESTIGATE_BASE,
        },
        import_save,
    };

    #[test]
    fn old_save_without_catalog_version_loads_to_current() {
        // Simulate a pre-migration save: an older schema version and no
        // `catalogVersion` field at all.
        let state = GameState::new();
        let mut value: serde_json::Value =
            serde_json::from_str(&export_save(&state).unwrap()).unwrap();
        let object = value.as_object_mut().unwrap();
        object.insert("schemaVersion".to_string(), serde_json::json!(1));
        object.remove("catalogVersion");
        let raw = serde_json::to_string(&value).unwrap();

        let loaded = import_save(&raw).expect("old save should migrate and load");
        assert_eq!(loaded.schema_version, crate::CURRENT_SCHEMA_VERSION);
        assert_eq!(loaded.catalog_version, crate::CURRENT_CATALOG_VERSION);
    }

    #[test]
    fn future_save_is_rejected_on_import() {
        let state = GameState::new();
        let mut value: serde_json::Value =
            serde_json::from_str(&export_save(&state).unwrap()).unwrap();
        value.as_object_mut().unwrap().insert(
            "schemaVersion".to_string(),
            serde_json::json!(crate::CURRENT_SCHEMA_VERSION + 1),
        );
        let raw = serde_json::to_string(&value).unwrap();

        match import_save(&raw) {
            Err(crate::SaveError::Migration(_)) => {}
            other => panic!("expected migration rejection of a future save, got {other:?}"),
        }
    }

    #[test]
    fn export_then_import_round_trips() {
        let state = GameState::new();
        let raw = export_save(&state).unwrap();
        let loaded = import_save(&raw).expect("freshly exported save must load");
        assert_eq!(loaded, state);
    }

    #[test]
    fn applying_a_command_emits_structured_events() {
        let mut simulation = Simulation::new();
        // The opening choice completes the road beat; the selector then activates
        // the next beat, firing a BeatActivated event this frame.
        let outcome = simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ROAD_TO_BASE.to_string(),
            option_id: "story.choice.road.follow_signal".to_string(),
        });
        assert!(outcome.accepted);
        assert_eq!(outcome.blocker, None);
        assert_eq!(outcome.events, simulation.state().events);
        assert!(
            simulation
                .state()
                .events
                .iter()
                .any(|event| matches!(event, crate::GameEvent::BeatActivated { .. })),
            "a story choice should surface a BeatActivated event, got {:?}",
            simulation.state().events
        );
    }

    #[test]
    fn rejected_command_returns_catalog_blocker() {
        let mut simulation = Simulation::new();
        let outcome = simulation.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_EXPLORE_BASE.to_string(),
        });

        assert!(!outcome.accepted);
        assert_eq!(outcome.blocker, Some(BlockerKind::Busy));
        assert!(outcome.events.is_empty());
    }

    #[test]
    fn command_availability_uses_the_same_handlers() {
        let simulation = Simulation::new();
        let outcomes = simulation.command_availability();
        let explore = outcomes
            .get(&format!("world-action:{WORLD_ACTION_EXPLORE_BASE}"))
            .expect("world action should be exposed to the command picker");

        assert!(!explore.accepted);
        assert_eq!(explore.blocker, Some(BlockerKind::Busy));
    }

    #[test]
    fn events_are_cleared_between_commands() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ROAD_TO_BASE.to_string(),
            option_id: "story.choice.road.follow_signal".to_string(),
        });
        assert!(!simulation.state().events.is_empty());
        // A tick that completes nothing leaves the buffer empty.
        simulation.apply(GameCommand::Tick { seconds: 0.0 });
        assert!(
            simulation.state().events.is_empty(),
            "events must reflect only the latest command, got {:?}",
            simulation.state().events
        );
    }

    #[test]
    fn export_strips_events_and_load_ignores_them() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ROAD_TO_BASE.to_string(),
            option_id: "story.choice.road.follow_signal".to_string(),
        });
        assert!(!simulation.state().events.is_empty());

        let raw = export_save(simulation.state()).unwrap();
        let value: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(
            value["events"].as_array().map(Vec::len),
            Some(0),
            "exported saves must not carry transient events"
        );

        let loaded = import_save(&raw).unwrap();
        assert!(loaded.events.is_empty());
    }

    #[test]
    fn effect_batch_is_rejected_atomically_when_unaffordable() {
        let mut simulation = Simulation::new();
        let skins_before = simulation.state().base.skins;
        let bassline_before = simulation.state().resources.bassline;

        // A batch whose spend exceeds the balance must apply nothing.
        simulation.apply_effects(&[
            EffectDef::AddSkins { amount: 5 },
            EffectDef::SpendResource {
                resource_id: RESOURCE_BASSLINE,
                amount: 1_000_000.0,
            },
        ]);

        assert_eq!(
            simulation.state().base.skins,
            skins_before,
            "no partial apply"
        );
        assert_eq!(simulation.state().resources.bassline, bassline_before);
        assert!(
            simulation
                .state()
                .events
                .iter()
                .any(|event| matches!(event, crate::GameEvent::EffectRejected { .. })),
            "an unaffordable batch should emit EffectRejected"
        );
    }

    #[test]
    fn rng_stream_is_deterministic_across_save_reload() {
        let mut a = Simulation::new();
        let first: Vec<u64> = (0..3).map(|_| a.next_rng_u64()).collect();

        // Save mid-stream and resume on a fresh simulation.
        let raw = export_save(a.state()).unwrap();
        let mut b = Simulation::from_state(import_save(&raw).unwrap());

        let continued_a: Vec<u64> = (0..3).map(|_| a.next_rng_u64()).collect();
        let continued_b: Vec<u64> = (0..3).map(|_| b.next_rng_u64()).collect();
        assert_eq!(continued_a, continued_b, "reloaded stream must match");

        // A fresh sim from the default seed reproduces the whole sequence.
        let mut c = Simulation::new();
        let all: Vec<u64> = (0..6).map(|_| c.next_rng_u64()).collect();
        assert_eq!(all, [first, continued_a].concat());
    }

    #[test]
    fn granting_track_xp_levels_up_and_yields_perk_points() {
        let mut simulation = Simulation::new();
        assert_eq!(simulation.perk_points_available(), 0);

        // A large lump crosses at least the first level threshold.
        simulation.grant_track_xp(crate::HeroTrack::Drummer, 1000.0);

        assert!(simulation.state().hero_progress.drummer_level >= 1);
        assert!(simulation.perk_points_available() >= 1);
        assert!(
            simulation
                .state()
                .events
                .iter()
                .any(|event| matches!(event, crate::GameEvent::HeroLeveledUp { .. })),
            "leveling a track should emit HeroLeveledUp"
        );
    }

    #[test]
    fn clearing_a_location_grants_drummer_xp() {
        let mut simulation = Simulation::new();
        let before = simulation.state().hero_progress.drummer_xp;
        simulation.apply(GameCommand::ClearLocation {
            key: "studio:1:1".to_string(),
            loot_item: None,
            loot_qty: 0,
        });
        assert!(
            simulation.state().hero_progress.drummer_xp > before,
            "clearing a location should award Drummer XP"
        );
    }

    #[test]
    fn engaging_and_winning_clears_location_grants_loot_and_xp() {
        let mut simulation = Simulation::new();
        let xp_before = simulation.state().hero_progress.drummer_xp;
        simulation.apply(GameCommand::Engage {
            creature_id: "rat".to_string(),
            key: "studio:2:2".to_string(),
            loot_item: Some("item.scrap_metal".to_string()),
            loot_qty: 1,
        });
        assert!(simulation.state().active_combat.is_some());

        // Offline catch-up runs whole rounds and finishes the in-flight fight.
        simulation.apply(GameCommand::RunOfflineCatchup {
            elapsed_seconds: 100.0,
        });

        assert!(
            simulation.state().active_combat.is_none(),
            "combat resolves"
        );
        assert!(simulation.state().cleared_locations.contains("studio:2:2"));
        assert_eq!(
            simulation
                .state()
                .inventory
                .get("item.scrap_metal")
                .copied(),
            Some(1),
            "victory drops the supplied loot"
        );
        assert!(
            simulation.state().hero_progress.drummer_xp > xp_before,
            "victory awards combat XP"
        );
        assert!(
            simulation
                .state()
                .events
                .iter()
                .any(|event| matches!(event, crate::GameEvent::CombatResolved { .. }))
        );
    }

    #[test]
    fn combat_rounds_are_deterministic_for_a_given_seed() {
        let run = || {
            let mut simulation = Simulation::new();
            simulation.apply(GameCommand::Engage {
                creature_id: "giant_rat".to_string(),
                key: "studio:3:3".to_string(),
                loot_item: None,
                loot_qty: 0,
            });
            // Two rounds (1.5s each) — not enough to finish the long fight.
            simulation.apply(GameCommand::Tick { seconds: 3.0 });
            simulation.state().active_combat.clone()
        };
        let first = run();
        let second = run();
        assert!(
            first.as_ref().map(|c| !c.log.is_empty()).unwrap_or(false),
            "the fight should still be in progress with a log"
        );
        assert_eq!(first, second, "same seed must replay identical rounds");
    }

    #[test]
    fn combat_retreat_inflicts_wounds_and_forces_return() {
        let mut simulation = Simulation::new();
        let downed = crate::CombatJob {
            creature_id: "giant_rat".to_string(),
            creature_label: "Giant Rat".to_string(),
            location_key: "studio:4:4".to_string(),
            loot_item: None,
            loot_qty: 0,
            creature_hp: 5.0,
            creature_hp_max: 20.0,
            hero_hp: 0.0,
            hero_hp_max: 24.0,
            round: 9,
            round_timer: 1.5,
            xp_reward: 16.0,
            threat: 0.4,
            log: Vec::new(),
        };
        simulation.resolve_combat_retreat(&downed);
        assert!(
            simulation.state().hero_survival.wounds.wound_units_taken > 0,
            "retreat is a wound source"
        );
        assert!(
            simulation.state().hero_survival.forced_return.is_some(),
            "a downed Hero is forced to return"
        );
    }

    #[test]
    fn echo_scars_reduce_hero_stats() {
        let mut simulation = Simulation::new();
        let base_attack = simulation.hero_stats().attack;
        {
            let state = simulation.state_mut();
            state.hero_survival.echo_scars = 5;
        }
        let scarred = simulation.hero_stats().attack;
        // 5 scars * 2% = 10% reduction.
        assert!(scarred < base_attack, "echo scars should weaken the Hero");
        assert!(
            (scarred - base_attack * 0.9).abs() < 1e-6,
            "expected ~10% reduction"
        );
    }

    #[test]
    fn resource_grants_are_capped() {
        let mut simulation = Simulation::new();
        let cap = simulation.state().resources.bassline_cap;
        simulation.apply_effects(&[EffectDef::GrantResource {
            resource_id: RESOURCE_BASSLINE,
            amount: cap * 1000.0,
        }]);
        assert!(
            (simulation.state().resources.bassline - cap).abs() < 1e-6,
            "a grant beyond the cap is clamped to the cap"
        );
    }

    #[test]
    fn crew_assignment_never_exceeds_available() {
        let mut simulation = Simulation::new();
        // Request far more crew than exist on a role.
        simulation.apply(GameCommand::SetRoleCrew {
            role_id: ROLE_CRYSTAL_BASSLINE.to_string(),
            crew: 200,
        });
        let assigned = *simulation
            .state()
            .roster
            .crew_by_role
            .get(ROLE_CRYSTAL_BASSLINE)
            .unwrap_or(&0);
        assert!(
            assigned <= simulation.state().roster.total_crew,
            "assigned crew never exceeds the total roster"
        );
    }

    #[test]
    fn recruit_cost_increases_with_index() {
        let first = crate::recruit_cost_for_index(1);
        let tenth = crate::recruit_cost_for_index(10);
        let hundredth = crate::recruit_cost_for_index(100);
        assert!(first > 0.0);
        assert!(tenth > first, "cost should climb with each recruit");
        assert!(hundredth > tenth, "cost keeps climbing");
    }

    #[test]
    fn quest_objectives_advance_and_apply_rewards() {
        let mut simulation = Simulation::new();
        simulation.refresh_quest_objectives();
        assert_eq!(
            simulation.state().objectives.active_objective_id.as_deref(),
            Some("objective.restore_studio"),
            "the first objective is active at start"
        );
        assert!(
            simulation
                .state()
                .objectives
                .completed_objective_ids
                .is_empty()
        );

        let vibes_before = simulation.state().resources.vibes;
        {
            let state = simulation.state_mut();
            state.base.studio_restored = true;
            state.base.fire_pit_built = true;
            state.bubble.reach_from_base = 3;
            state.recruitment.total_recruited_this_run = 1;
        }
        simulation.refresh_quest_objectives();

        let completed = simulation
            .state()
            .objectives
            .completed_objective_ids
            .clone();
        for id in [
            "objective.restore_studio",
            "objective.build_fire_pit",
            "objective.reach_ring_3",
            "objective.first_recruit",
        ] {
            assert!(
                completed.contains(&id.to_string()),
                "{id} should be complete"
            );
        }
        assert_eq!(
            simulation.state().objectives.active_objective_id,
            None,
            "no objectives remain active"
        );
        assert!(
            simulation.state().resources.vibes >= vibes_before + 25.0 - 0.01,
            "the reach_ring_3 reward granted vibes"
        );
        assert!(
            simulation
                .state()
                .events
                .iter()
                .any(|event| matches!(event, crate::GameEvent::ObjectiveCompleted { .. })),
            "completing an objective emits ObjectiveCompleted"
        );
    }

    #[test]
    fn balance_override_applies_live_and_resets() {
        let mut simulation = Simulation::new();
        let baseline = crate::balance_snapshot().combat.base_attack;
        assert!((simulation.hero_stats().attack - baseline).abs() < 1e-9);

        // Override raises hero attack live (no rebuild).
        simulation.apply(GameCommand::SetBalanceOverride {
            path: "combat.baseAttack".to_string(),
            value: baseline + 10.0,
        });
        assert!(
            (simulation.hero_stats().attack - (baseline + 10.0)).abs() < 1e-9,
            "override should change the derived stat live"
        );

        // An unknown path is ignored (and noted), not applied.
        simulation.apply(GameCommand::SetBalanceOverride {
            path: "combat.notAField".to_string(),
            value: 999.0,
        });
        assert!((simulation.hero_stats().attack - (baseline + 10.0)).abs() < 1e-9);

        // Reset restores the authored baseline.
        simulation.apply(GameCommand::ResetBalanceOverrides);
        assert!((simulation.hero_stats().attack - baseline).abs() < 1e-9);
    }

    #[test]
    fn harmonics_tier_steps_at_each_threshold() {
        let simulation = Simulation::new();
        let power = crate::balance_snapshot().power;
        // research_harmonic_study_level 0 → no threshold reduction.
        assert_eq!(simulation.harmonics_tier_from_rate(0.0), 0);
        assert_eq!(
            simulation.harmonics_tier_from_rate(power.harmonics_tier_one_threshold - 0.001),
            0
        );
        assert_eq!(
            simulation.harmonics_tier_from_rate(power.harmonics_tier_one_threshold),
            1
        );
        assert_eq!(
            simulation.harmonics_tier_from_rate(power.harmonics_tier_two_threshold),
            2
        );
        assert_eq!(
            simulation.harmonics_tier_from_rate(power.harmonics_tier_three_threshold),
            3
        );
    }

    #[test]
    fn brownout_severity_scales_and_tolerances_reduce_it() {
        let mut simulation = Simulation::new();
        // No shortfall → no brownout.
        assert_eq!(simulation.brownout_severity(10.0, 10.0, 0), 0.0);

        // Half the requested upkeep is met → raw severity 0.5 at tier 0.
        let raw = simulation.brownout_severity(10.0, 5.0, 0);
        assert!(
            (raw - 0.5).abs() < 1e-6,
            "raw severity should be 0.5, got {raw}"
        );

        // Higher harmonics tiers carry brownout tolerance, reducing severity.
        let tier2 = simulation.brownout_severity(10.0, 5.0, 2);
        let tier3 = simulation.brownout_severity(10.0, 5.0, 3);
        assert!(tier2 < raw, "tier 2 tolerance should reduce severity");
        assert!(tier3 < tier2, "tier 3 adds more tolerance");

        // A powered Mix Console adds tolerance too.
        {
            let state = simulation.state_mut();
            state.base.mix_console_built = true;
            state.stations.insert(
                "station.mix_console".to_string(),
                StationState {
                    requested_enabled: true,
                    is_powered: true,
                    power_order: 40,
                },
            );
        }
        let with_mix = simulation.brownout_severity(10.0, 5.0, 0);
        assert!(
            with_mix < raw,
            "mix console tolerance should reduce severity"
        );
    }

    #[test]
    fn recovery_is_blocked_by_a_severe_brownout() {
        let mut simulation = Simulation::new();
        let survival = crate::balance_snapshot().survival;

        // Severe brownout (at/over the stop threshold) halts recovery entirely.
        {
            let state = simulation.state_mut();
            state.power.brownout_active = true;
            state.power.brownout_severity = survival.recovery_brownout_stop_threshold + 0.01;
        }
        assert_eq!(simulation.hero_recovery_rate_multiplier(), 0.0);

        // A milder brownout slows recovery without stopping it.
        {
            let state = simulation.state_mut();
            state.power.brownout_severity =
                (survival.recovery_brownout_stop_threshold - 0.05).max(0.01);
        }
        let mild = simulation.hero_recovery_rate_multiplier();
        assert!(
            mild > 0.0 && mild < 1.0,
            "mild brownout should slow recovery, got {mild}"
        );

        // No brownout → full-speed recovery.
        {
            let state = simulation.state_mut();
            state.power.brownout_active = false;
            state.power.brownout_severity = 0.0;
        }
        assert_eq!(simulation.hero_recovery_rate_multiplier(), 1.0);
    }

    #[test]
    fn brownout_cascade_drops_highest_power_order_station_first() {
        let mut simulation = Simulation::new();
        {
            let state = simulation.state_mut();
            // Two manual-power stations: Resonance Chamber (order 30) and
            // Research Booth (order 60). Zero staff → no life-support draw.
            state.base.resonance_chamber_built = true;
            state.base.research_booth_built = true;
            state.roster.total_crew = 0;
            state.roster.hero_assigned = false;
            state.roster.crew_by_role.clear();
            state.stations.insert(
                "station.resonance_chamber".to_string(),
                StationState {
                    requested_enabled: true,
                    is_powered: true,
                    power_order: 30,
                },
            );
            state.stations.insert(
                "station.research_booth".to_string(),
                StationState {
                    requested_enabled: true,
                    is_powered: true,
                    power_order: 60,
                },
            );
            // Covers one station's upkeep (0.12) but not both (0.12 + 0.14).
            state.resources.chorus = 0.20;
        }

        simulation.resolve_station_power(1.0);

        let powered = |id: &str| {
            simulation
                .state()
                .stations
                .get(id)
                .map(|station| station.is_powered)
                .unwrap_or(false)
        };
        assert!(
            powered("station.resonance_chamber"),
            "the lower power-order station is kept"
        );
        assert!(
            !powered("station.research_booth"),
            "the higher power-order station is dropped first"
        );
    }

    #[test]
    fn rng_helpers_have_expected_ranges() {
        let mut simulation = Simulation::new();
        let f = simulation.next_rng_f64();
        assert!((0.0..1.0).contains(&f));
        assert!(simulation.next_rng_below(10) < 10);
        assert_eq!(simulation.next_rng_below(0), 0);
    }

    fn advance_intro_to_investigate(simulation: &mut Simulation) {
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ROAD_TO_BASE.to_string(),
            option_id: "story.choice.road.follow_signal".to_string(),
        });
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_FIRST_GLIMPSE.to_string(),
            option_id: "story.choice.glimpse.watch_lights".to_string(),
        });
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ENTER_THE_BUBBLE.to_string(),
            option_id: "story.choice.bubble.trust_sound".to_string(),
        });
    }

    fn complete_intro_investigate(simulation: &mut Simulation) {
        advance_intro_to_investigate(simulation);
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_INVESTIGATE_BASE.to_string(),
            option_id: "story.choice.investigate.search_power".to_string(),
        });
        simulation.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_INVESTIGATE_BASE.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 5.0 });
    }

    fn complete_intro_explore(simulation: &mut Simulation) {
        complete_intro_investigate(simulation);
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_EXPLORE_BASE.to_string(),
            option_id: "story.choice.explore.look_for_tools".to_string(),
        });
        simulation.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_EXPLORE_BASE.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 10.0 });
    }

    #[test]
    fn ticking_increases_bassline() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetHeroAssigned { assigned: true });
        let before = simulation.state().resources.bassline;
        simulation.apply(GameCommand::Tick { seconds: 10.0 });
        assert!(simulation.state().resources.bassline > before);
    }

    #[test]
    fn every_catalog_definition_has_a_schema_entry() {
        let catalog = super::catalog_snapshot();
        let schema_ids: HashSet<&str> = catalog
            .entity_schemas
            .iter()
            .map(|schema| schema.id)
            .collect();

        for resource in &catalog.resources {
            assert!(
                schema_ids.contains(resource.schema_id),
                "missing schema for resource {}",
                resource.id
            );
        }
        for role in &catalog.roles {
            assert!(
                schema_ids.contains(role.schema_id),
                "missing schema for role {}",
                role.id
            );
        }
        for station in &catalog.stations {
            assert!(
                schema_ids.contains(station.schema_id),
                "missing schema for station {}",
                station.id
            );
        }
        for option in &catalog.construction_options {
            assert!(
                schema_ids.contains(option.schema_id),
                "missing schema for construction option {}",
                option.id
            );
        }
        for recipe in &catalog.processing_recipes {
            assert!(
                schema_ids.contains(recipe.schema_id),
                "missing schema for processing recipe {}",
                recipe.id
            );
        }
        for action in &catalog.world_actions {
            assert!(
                schema_ids.contains(action.schema_id),
                "missing schema for world action {}",
                action.id
            );
        }
        for beat in &catalog.story_beats {
            assert!(
                schema_ids.contains(beat.schema_id),
                "missing schema for story beat {}",
                beat.id
            );
        }
        for tile in &catalog.tiles {
            assert!(
                schema_ids.contains(tile.schema_id),
                "missing schema for tile {}",
                tile.id
            );
        }
        for flora in &catalog.flora {
            assert!(
                schema_ids.contains(flora.schema_id),
                "missing schema for flora {}",
                flora.id
            );
        }
        for structure in &catalog.structures {
            assert!(
                schema_ids.contains(structure.schema_id),
                "missing schema for structure {}",
                structure.id
            );
        }
    }

    #[test]
    fn every_player_facing_schema_has_presentation_metadata() {
        let catalog = super::catalog_snapshot();

        for schema in &catalog.entity_schemas {
            let requires_presentation = matches!(
                schema.entity_kind,
                super::EntityKind::Resource
                    | super::EntityKind::Role
                    | super::EntityKind::Station
                    | super::EntityKind::ConstructionOption
                    | super::EntityKind::ProcessingRecipe
                    | super::EntityKind::WorldAction
                    | super::EntityKind::StoryBeat
            );

            if !requires_presentation {
                continue;
            }

            let presentation = schema.presentation.as_ref().unwrap_or_else(|| {
                panic!("missing presentation metadata for schema {}", schema.id)
            });

            assert!(
                !presentation.short_label.trim().is_empty(),
                "schema {} must have a short label",
                schema.id
            );
            assert!(
                !presentation.player_hint.trim().is_empty(),
                "schema {} must have a player hint",
                schema.id
            );

            if matches!(
                schema.entity_kind,
                super::EntityKind::Role
                    | super::EntityKind::ConstructionOption
                    | super::EntityKind::ProcessingRecipe
                    | super::EntityKind::WorldAction
            ) {
                assert!(
                    presentation
                        .cta_copy
                        .map(|copy| !copy.trim().is_empty())
                        .unwrap_or(false),
                    "interactive schema {} must have CTA copy",
                    schema.id
                );
            }
        }
    }

    #[test]
    fn player_facing_entities_and_ui_elements_have_visibility_metadata() {
        let catalog = super::catalog_snapshot();

        for schema in &catalog.entity_schemas {
            let requires_visibility = matches!(
                schema.entity_kind,
                super::EntityKind::Resource
                    | super::EntityKind::Role
                    | super::EntityKind::Station
                    | super::EntityKind::ConstructionOption
                    | super::EntityKind::ProcessingRecipe
                    | super::EntityKind::WorldAction
                    | super::EntityKind::StoryBeat
            );

            if requires_visibility {
                assert!(
                    schema.visibility.is_some(),
                    "player-facing schema {} must have visibility metadata",
                    schema.id
                );
            }
        }

        for element in &catalog.ui_elements {
            assert!(
                !element.label.trim().is_empty(),
                "ui element {} must have a label",
                element.id
            );
            assert!(
                !element.visibility.any_of.is_empty() || !element.visibility.all_of.is_empty(),
                "ui element {} must declare visibility conditions",
                element.id
            );
            let presentation = element.presentation.as_ref().unwrap_or_else(|| {
                panic!("ui element {} must have presentation metadata", element.id)
            });
            assert!(
                !presentation.short_label.trim().is_empty(),
                "ui element {} must have a short label",
                element.id
            );
            assert!(
                !presentation.player_hint.trim().is_empty(),
                "ui element {} must have a player hint",
                element.id
            );
        }
    }

    #[test]
    fn every_flag_and_model_reference_resolves_to_a_catalog_node() {
        let catalog = super::catalog_snapshot();
        let flag_ids: std::collections::BTreeSet<_> =
            catalog.flags.iter().map(|flag| flag.id).collect();
        let model_ids: std::collections::BTreeSet<_> =
            catalog.models.iter().map(|model| model.id).collect();

        for schema in &catalog.entity_schemas {
            for unlock in &schema.unlocks {
                for related_id in unlock.related_ids {
                    if related_id.starts_with("base.") || related_id.starts_with("crystal.") {
                        assert!(
                            flag_ids.contains(related_id),
                            "unlock relation {} -> {} must resolve to a flag node",
                            schema.id,
                            related_id
                        );
                    }
                }
            }

            for blocker in &schema.blockers {
                for related_id in blocker.related_ids {
                    if related_id.starts_with("base.") || related_id.starts_with("crystal.") {
                        assert!(
                            flag_ids.contains(related_id),
                            "blocker relation {} -> {} must resolve to a flag node",
                            schema.id,
                            related_id
                        );
                    }
                }
            }

            for access_rule in &schema.access_rules {
                for related_id in access_rule.related_ids {
                    if related_id.starts_with("base.") || related_id.starts_with("crystal.") {
                        assert!(
                            flag_ids.contains(related_id),
                            "access relation {} -> {} must resolve to a flag node",
                            schema.id,
                            related_id
                        );
                    }
                }
            }

            for model_ref in &schema.model_refs {
                assert!(
                    model_ids.contains(model_ref.reference_id),
                    "model reference {} -> {} must resolve to a model node",
                    schema.id,
                    model_ref.reference_id
                );
            }
        }
    }

    #[test]
    fn save_round_trip_preserves_state() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ROAD_TO_BASE.to_string(),
            option_id: "story.choice.road.follow_signal".to_string(),
        });
        let serialized = export_save(simulation.state()).expect("save should serialize");
        let restored = import_save(&serialized).expect("save should deserialize");
        // `events` is transient: stripped on export and never deserialized, so a
        // round-trip drops it. Everything else must round-trip exactly.
        let mut expected = simulation.state().clone();
        expected.events.clear();
        assert_eq!(expected, restored);
    }

    #[test]
    fn discovery_initializes_around_survivor_cave_without_revealing_studio() {
        assert!(
            GameState::new().discovered_cells.is_empty(),
            "raw state should not author discovery before the runtime bootstrap event"
        );

        let simulation = Simulation::new();
        let cave = HexCoordState::survivor_cave();

        assert!(
            !simulation
                .state()
                .discovered_cells
                .contains(&HexCoordState::base())
        );
        assert!(simulation.state().discovered_cells.contains(&cave));
        assert!(simulation.state().discovered_cells.len() > 1);
        assert!(
            simulation
                .state()
                .discovered_cells
                .iter()
                .all(|coord| { hex_distance(cave, *coord) <= 1 })
        );
        assert!(
            simulation.state().events.iter().any(|event| matches!(
                event,
                crate::GameEvent::StartingAreaDiscovered {
                    center,
                    radius: 1,
                    revealed,
                } if *center == cave && *revealed > 1
            )),
            "runtime bootstrap should emit a typed starting discovery event, got {:?}",
            simulation.state().events
        );
        assert_eq!(simulation.state().hero_map, HexCoordState::survivor_cave());
    }

    #[test]
    fn hero_movement_reveals_adjacent_cells_and_persists_in_save() {
        let mut simulation = Simulation::new();
        let initial_count = simulation.state().discovered_cells.len();

        let base = HexCoordState::base();
        simulation.apply(GameCommand::MoveHeroTo {
            q: base.q,
            r: base.r,
        });

        assert_eq!(simulation.state().hero_map, HexCoordState::base());
        assert!(simulation.state().discovered_cells.len() > initial_count);

        let serialized = export_save(simulation.state()).expect("save should serialize");
        let restored = import_save(&serialized).expect("save should deserialize");
        let restored_simulation = Simulation::from_state(restored);
        assert_eq!(
            restored_simulation.state().discovered_cells,
            simulation.state().discovered_cells
        );
        assert_eq!(restored_simulation.state().hero_map, HexCoordState::base());
    }

    #[test]
    fn open_door_records_key_and_persists_in_save() {
        let mut simulation = Simulation::new();
        assert!(simulation.state().open_doors.is_empty());

        simulation.apply(GameCommand::OpenDoor {
            key: "dungeon.studio:6:7".to_string(),
        });
        assert!(simulation.state().open_doors.contains("dungeon.studio:6:7"));

        let serialized = export_save(simulation.state()).expect("save should serialize");
        let restored = import_save(&serialized).expect("save should deserialize");
        let restored_simulation = Simulation::from_state(restored);
        assert!(
            restored_simulation
                .state()
                .open_doors
                .contains("dungeon.studio:6:7")
        );
    }

    #[test]
    fn perks_apply_effects_with_level_gating_and_persist() {
        let mut state = crate::state::GameState::new();
        state.hero_progress.drummer_level = 3; // 3 perk points
        let mut simulation = Simulation::from_state(state);
        assert_eq!(simulation.perk_points_available(), 3);
        assert_eq!(
            simulation.perk_multiplier(crate::game_data::PerkStat::ScavengeYield),
            1.0
        );

        // requires gate: crystal_attuned needs steady_hands first.
        simulation.apply(GameCommand::AcquirePerk {
            perk_id: "perk.crystal_attuned".to_string(),
        });
        assert!(!simulation.has_perk("perk.crystal_attuned"));

        // acquire scavenger -> its effect multiplier applies.
        simulation.apply(GameCommand::AcquirePerk {
            perk_id: "perk.scavenger".to_string(),
        });
        assert!(simulation.has_perk("perk.scavenger"));
        assert!(
            (simulation.perk_multiplier(crate::game_data::PerkStat::ScavengeYield) - 1.25).abs()
                < 1e-9
        );

        // satisfy requires, then crystal_attuned succeeds (a point remains).
        simulation.apply(GameCommand::AcquirePerk {
            perk_id: "perk.steady_hands".to_string(),
        });
        simulation.apply(GameCommand::AcquirePerk {
            perk_id: "perk.crystal_attuned".to_string(),
        });
        assert!(simulation.has_perk("perk.crystal_attuned"));

        // points exhausted (3 spent) -> field_medic rejected.
        simulation.apply(GameCommand::AcquirePerk {
            perk_id: "perk.field_medic".to_string(),
        });
        assert!(!simulation.has_perk("perk.field_medic"));
        assert_eq!(simulation.perk_points_available(), 0);

        // persistence round-trip.
        let serialized = export_save(simulation.state()).expect("save serializes");
        let restored = Simulation::from_state(import_save(&serialized).expect("save deserializes"));
        assert!(restored.has_perk("perk.scavenger"));
        assert!(restored.has_perk("perk.crystal_attuned"));
    }

    #[test]
    fn inventory_grants_cap_at_max_stack_and_persist() {
        let mut simulation = Simulation::new();
        // Stackable item caps at its max_stack (scrap = 99).
        simulation.grant_item("item.scrap_metal", 200);
        assert_eq!(
            simulation.state().inventory.get("item.scrap_metal"),
            Some(&99)
        );
        // Non-stackable caps at 1.
        simulation.grant_item("item.field_kit", 5);
        assert_eq!(simulation.state().inventory.get("item.field_kit"), Some(&1));

        // Inventory survives a save round-trip.
        let serialized = export_save(simulation.state()).expect("save serializes");
        let restored = Simulation::from_state(import_save(&serialized).expect("save deserializes"));
        assert_eq!(
            restored.state().inventory.get("item.scrap_metal"),
            Some(&99)
        );
    }

    #[test]
    fn scavenging_effort_yields_scrap_even_when_stone_is_full() {
        let mut state = crate::state::GameState::new();
        state
            .roster
            .crew_by_role
            .insert("role.scavenge".to_string(), 3);
        // Stone at cap: proves scrap comes from effort, not from hauled stone.
        state.resources.stone = state.resources.stone_cap;
        let mut simulation = Simulation::from_state(state);
        simulation.apply(GameCommand::Tick { seconds: 10.0 });
        let scrap = simulation
            .state()
            .inventory
            .get("item.scrap_metal")
            .copied()
            .unwrap_or(0);
        assert!(
            scrap > 0,
            "expected scrap from scavenging effort, got {scrap}"
        );
    }

    #[test]
    fn clearing_a_location_loots_once_and_persists() {
        let mut simulation = Simulation::new();
        let key = "dungeon.studio:3:3".to_string();

        // First clear marks the location and grants its loot.
        simulation.apply(GameCommand::ClearLocation {
            key: key.clone(),
            loot_item: Some("item.scrap_metal".to_string()),
            loot_qty: 4,
        });
        assert!(simulation.state().cleared_locations.contains(&key));
        assert_eq!(
            simulation.state().inventory.get("item.scrap_metal"),
            Some(&4)
        );

        // Re-clearing the same location is a no-op (no double loot).
        simulation.apply(GameCommand::ClearLocation {
            key: key.clone(),
            loot_item: Some("item.scrap_metal".to_string()),
            loot_qty: 4,
        });
        assert_eq!(
            simulation.state().inventory.get("item.scrap_metal"),
            Some(&4)
        );

        // Cleared locations survive a save round-trip.
        let serialized = export_save(simulation.state()).expect("save serializes");
        let restored = Simulation::from_state(import_save(&serialized).expect("save deserializes"));
        assert!(restored.state().cleared_locations.contains(&key));
    }

    #[test]
    fn dropping_then_picking_up_items_moves_them_and_persists() {
        let mut simulation = Simulation::new();
        simulation.grant_item("item.scrap_metal", 5);
        let key = "dungeon.studio:4:4".to_string();

        // Over-drop is a no-op.
        simulation.apply(GameCommand::DropItem {
            key: key.clone(),
            item_id: "item.scrap_metal".to_string(),
            qty: 99,
        });
        assert_eq!(
            simulation.state().inventory.get("item.scrap_metal"),
            Some(&5)
        );
        assert!(simulation.state().dropped_items.is_empty());

        // Drop 2 -> inventory 3, pile 2.
        simulation.apply(GameCommand::DropItem {
            key: key.clone(),
            item_id: "item.scrap_metal".to_string(),
            qty: 2,
        });
        assert_eq!(
            simulation.state().inventory.get("item.scrap_metal"),
            Some(&3)
        );
        assert_eq!(
            simulation
                .state()
                .dropped_items
                .get(&key)
                .and_then(|p| p.get("item.scrap_metal")),
            Some(&2)
        );

        // Dropped pile survives a save round-trip.
        let serialized = export_save(simulation.state()).expect("save serializes");
        let mut restored =
            Simulation::from_state(import_save(&serialized).expect("save deserializes"));
        assert_eq!(
            restored
                .state()
                .dropped_items
                .get(&key)
                .and_then(|p| p.get("item.scrap_metal")),
            Some(&2)
        );

        // Pick up -> back to inventory, pile cleared.
        restored.apply(GameCommand::PickUpLocation { key: key.clone() });
        assert_eq!(restored.state().inventory.get("item.scrap_metal"), Some(&5));
        assert!(!restored.state().dropped_items.contains_key(&key));
    }

    #[test]
    fn using_a_consumable_applies_its_effect_and_decrements() {
        let mut state = crate::state::GameState::new();
        state.hero_survival.viral_load_ratio = 0.8;
        let mut simulation = Simulation::from_state(state);
        simulation.grant_item("item.ration", 2);

        // Using a ration restores survival (lowers viral load) and consumes one.
        simulation.apply(GameCommand::UseItem {
            item_id: "item.ration".to_string(),
        });
        assert!((simulation.state().hero_survival.viral_load_ratio - 0.5).abs() < 1e-9);
        assert_eq!(simulation.state().inventory.get("item.ration"), Some(&1));

        // A non-consumable (no use effect) is a no-op and is not consumed.
        simulation.grant_item("item.scrap_metal", 3);
        simulation.apply(GameCommand::UseItem {
            item_id: "item.scrap_metal".to_string(),
        });
        assert_eq!(
            simulation.state().inventory.get("item.scrap_metal"),
            Some(&3)
        );

        // Using with none held is a no-op (and doesn't change survival).
        simulation.apply(GameCommand::UseItem {
            item_id: "item.field_kit".to_string(),
        });
        assert!((simulation.state().hero_survival.viral_load_ratio - 0.5).abs() < 1e-9);
    }

    // Golden snapshot of the whole catalog. Catalogs are migrated to TS-authored
    // data + codegen one at a time; this proves each migration leaves the data the
    // sim and client see byte-identical, regardless of how the generated Rust is
    // structured. Regenerate intentionally with UPDATE_GOLDEN=1.
    #[test]
    fn catalog_snapshot_matches_golden() {
        let json = serde_json::to_string_pretty(&super::catalog_snapshot())
            .expect("catalog serializes")
            + "\n";
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/golden/catalog.json");
        if std::env::var("UPDATE_GOLDEN").is_ok() {
            std::fs::create_dir_all(std::path::Path::new(path).parent().unwrap()).unwrap();
            std::fs::write(path, &json).unwrap();
        }
        let golden = std::fs::read_to_string(path).unwrap_or_default();
        assert_eq!(
            json, golden,
            "catalog snapshot drifted from golden (rerun with UPDATE_GOLDEN=1 if intended)"
        );
    }

    #[test]
    fn reset_clears_discovery_to_initial_cells() {
        let mut simulation = Simulation::new();
        let base = HexCoordState::base();
        simulation.apply(GameCommand::MoveHeroTo {
            q: base.q,
            r: base.r,
        });
        assert!(simulation.state().discovered_cells.len() > 2);

        simulation.apply(GameCommand::ResetRun);
        let cave = HexCoordState::survivor_cave();

        assert!(
            !simulation
                .state()
                .discovered_cells
                .contains(&HexCoordState::base())
        );
        assert!(simulation.state().discovered_cells.contains(&cave));
        assert!(simulation.state().discovered_cells.len() > 1);
        assert!(
            simulation
                .state()
                .discovered_cells
                .iter()
                .all(|coord| { hex_distance(cave, *coord) <= 1 })
        );
        assert!(
            simulation.state().events.iter().any(|event| matches!(
                event,
                crate::GameEvent::StartingAreaDiscovered {
                    center,
                    radius: 1,
                    revealed,
                } if *center == cave && *revealed > 1
            )),
            "reset should emit a typed starting discovery event, got {:?}",
            simulation.state().events
        );
        assert_eq!(simulation.state().hero_map, HexCoordState::survivor_cave());
    }

    #[test]
    fn intro_story_progression_and_choices_persist() {
        let mut simulation = Simulation::new();

        assert_eq!(
            simulation.state().narrative.active_beat_id.as_deref(),
            Some(STORY_BEAT_ROAD_TO_BASE)
        );

        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ROAD_TO_BASE.to_string(),
            option_id: "story.choice.road.follow_signal".to_string(),
        });
        assert_eq!(
            simulation.state().narrative.active_beat_id.as_deref(),
            Some(STORY_BEAT_FIRST_GLIMPSE)
        );

        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_FIRST_GLIMPSE.to_string(),
            option_id: "story.choice.glimpse.watch_lights".to_string(),
        });
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ENTER_THE_BUBBLE.to_string(),
            option_id: "story.choice.bubble.trust_sound".to_string(),
        });

        assert_eq!(
            simulation.state().narrative.active_beat_id.as_deref(),
            Some(STORY_BEAT_INVESTIGATE_BASE)
        );

        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_INVESTIGATE_BASE.to_string(),
            option_id: "story.choice.investigate.search_power".to_string(),
        });
        simulation.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_INVESTIGATE_BASE.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 5.0 });

        assert_eq!(
            simulation.state().narrative.active_beat_id.as_deref(),
            Some(STORY_BEAT_EXPLORE_BASE)
        );

        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_EXPLORE_BASE.to_string(),
            option_id: "story.choice.explore.look_for_tools".to_string(),
        });
        simulation.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_EXPLORE_BASE.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 10.0 });

        // Beats 6-11 are revived by the storylet selector: after Explore the spine
        // advances to Restore Studio (preconditioned on Explore) instead of going
        // dark like the old hardcoded intro chain did.
        assert_eq!(
            simulation.state().narrative.active_beat_id.as_deref(),
            Some(STORY_BEAT_RESTORE_STUDIO)
        );
        assert_eq!(
            simulation
                .state()
                .narrative
                .choice_by_beat
                .get(STORY_BEAT_INVESTIGATE_BASE)
                .map(String::as_str),
            Some("story.choice.investigate.search_power")
        );
        assert_eq!(
            simulation
                .state()
                .narrative
                .choice_by_beat
                .get(STORY_BEAT_EXPLORE_BASE)
                .map(String::as_str),
            Some("story.choice.explore.look_for_tools")
        );
    }

    #[test]
    fn intro_story_action_requires_a_choice_first() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ROAD_TO_BASE.to_string(),
            option_id: "story.choice.road.follow_signal".to_string(),
        });
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_FIRST_GLIMPSE.to_string(),
            option_id: "story.choice.glimpse.watch_lights".to_string(),
        });
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ENTER_THE_BUBBLE.to_string(),
            option_id: "story.choice.bubble.trust_sound".to_string(),
        });

        simulation.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_INVESTIGATE_BASE.to_string(),
        });

        assert!(simulation.state().active_world_action.is_none());
        assert_eq!(
            simulation.state().narrative.active_beat_id.as_deref(),
            Some(STORY_BEAT_INVESTIGATE_BASE)
        );
    }

    #[test]
    fn investigate_base_stays_safe() {
        let mut simulation = Simulation::new();
        advance_intro_to_investigate(&mut simulation);
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_INVESTIGATE_BASE.to_string(),
            option_id: "story.choice.investigate.search_power".to_string(),
        });
        simulation.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_INVESTIGATE_BASE.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 3.0 });

        assert_eq!(
            simulation.state().hero_survival.location,
            HeroLocationState::Studio
        );
        assert_eq!(simulation.state().hero_survival.viral_load_ratio, 0.0);
        assert!(simulation.state().active_world_action.is_some());
    }

    #[test]
    fn explore_base_accumulates_viral_load() {
        let mut simulation = Simulation::new();
        complete_intro_investigate(&mut simulation);
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_EXPLORE_BASE.to_string(),
            option_id: "story.choice.explore.look_for_tools".to_string(),
        });
        simulation.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_EXPLORE_BASE.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 4.0 });

        assert_eq!(
            simulation.state().hero_survival.location,
            HeroLocationState::OutsideBubble
        );
        assert!(simulation.state().hero_survival.viral_load_ratio > 0.15);
        assert!(simulation.state().active_world_action.is_some());
    }

    #[test]
    fn forced_return_triggers_when_point_of_no_return_is_crossed() {
        let mut state = GameState::new();
        state.hero_survival.location = HeroLocationState::OutsideBubble;
        state.hero_survival.required_time_to_reenter_bubble_seconds = 6.0;
        state.hero_survival.return_to_studio_seconds = 4.0;
        state.hero_survival.viral_load_ratio = 0.74;
        state.roster.hero_assigned = true;

        let mut simulation = Simulation::from_state(state);
        simulation.apply(GameCommand::Tick { seconds: 0.3 });

        let forced_return = simulation
            .state()
            .hero_survival
            .forced_return
            .as_ref()
            .expect("forced return should trigger");
        assert_eq!(forced_return.phase, ForcedReturnPhase::ReturnToBubbleEdge);
        assert_eq!(simulation.state().hero_survival.echo_scars, 1);
        assert!(!simulation.state().roster.hero_assigned);
        assert_eq!(
            simulation.state().hero_survival.location,
            HeroLocationState::OutsideBubble
        );
    }

    #[test]
    fn forced_return_recovers_only_at_studio() {
        let mut return_state = GameState::new();
        return_state.hero_survival.location = HeroLocationState::Bubble;
        return_state.hero_survival.viral_load_ratio = 0.5;
        return_state.hero_survival.forced_return = Some(ForcedReturnState {
            phase: ForcedReturnPhase::ReturnToStudio,
            total_seconds: 10.0,
            remaining_seconds: 10.0,
            viral_load_ratio_on_trigger: 0.5,
        });

        let mut simulation = Simulation::from_state(return_state);
        simulation.apply(GameCommand::Tick { seconds: 5.0 });
        assert_eq!(simulation.state().hero_survival.viral_load_ratio, 0.5);
        assert_eq!(
            simulation
                .state()
                .hero_survival
                .forced_return
                .as_ref()
                .map(|state| state.phase),
            Some(ForcedReturnPhase::ReturnToStudio)
        );

        simulation.apply(GameCommand::Tick { seconds: 5.0 });
        assert_eq!(
            simulation.state().hero_survival.location,
            HeroLocationState::Studio
        );
        assert_eq!(
            simulation
                .state()
                .hero_survival
                .forced_return
                .as_ref()
                .map(|state| state.phase),
            Some(ForcedReturnPhase::RecoverAtStudio)
        );

        let before_recovery = simulation.state().hero_survival.viral_load_ratio;
        simulation.apply(GameCommand::Tick { seconds: 10.0 });
        assert!(simulation.state().hero_survival.viral_load_ratio < before_recovery);
    }

    #[test]
    fn offline_catchup_progresses_viral_load_while_outside() {
        let mut state = GameState::new();
        state.hero_survival.location = HeroLocationState::OutsideBubble;
        state.hero_survival.required_time_to_reenter_bubble_seconds = 2.0;
        state.hero_survival.return_to_studio_seconds = 4.0;
        let mut simulation = Simulation::from_state(state);

        simulation.apply(GameCommand::RunOfflineCatchup {
            elapsed_seconds: 6.0,
        });

        assert!(simulation.state().hero_survival.viral_load_ratio > 0.2);
    }

    #[test]
    fn viral_load_debuff_reduces_hero_world_action_speed() {
        let mut healthy = Simulation::new();
        complete_intro_investigate(&mut healthy);
        healthy.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_EXPLORE_BASE.to_string(),
            option_id: "story.choice.explore.look_for_tools".to_string(),
        });
        healthy.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_EXPLORE_BASE.to_string(),
        });
        healthy.apply(GameCommand::Tick { seconds: 1.0 });
        let healthy_remaining = healthy
            .state()
            .active_world_action
            .as_ref()
            .expect("explore should still be active")
            .remaining_seconds;

        let mut strained_state = GameState::new();
        strained_state.narrative = healthy.state().narrative.clone();
        strained_state.base = healthy.state().base.clone();
        strained_state.crystal_circle = healthy.state().crystal_circle.clone();
        strained_state.hero_survival.viral_load_ratio = 0.6;
        let mut strained = Simulation::from_state(strained_state);
        strained.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_EXPLORE_BASE.to_string(),
        });
        strained.apply(GameCommand::Tick { seconds: 1.0 });
        let strained_remaining = strained
            .state()
            .active_world_action
            .as_ref()
            .expect("explore should still be active")
            .remaining_seconds;

        assert!(strained_remaining > healthy_remaining);
    }

    #[test]
    fn buying_upgrade_spends_bassline() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetHeroAssigned { assigned: true });
        simulation.apply(GameCommand::Tick { seconds: 120.0 });
        simulation.apply(GameCommand::StartConstruction {
            option_id: CONSTRUCTION_STORAGE.to_string(),
        });
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_CONSTRUCTION.to_string(),
        });
        simulation.apply(GameCommand::SetRoleCrew {
            role_id: ROLE_CRYSTAL_BASSLINE.to_string(),
            crew: 1,
        });
        simulation.apply(GameCommand::SetRoleCrew {
            role_id: ROLE_CONSTRUCTION.to_string(),
            crew: 1,
        });
        simulation.apply(GameCommand::Tick { seconds: 10.0 });

        assert!(simulation.state().resources.lifetime_spent > 0.0);
        assert!(simulation.state().active_construction.is_some());
    }

    #[test]
    fn construction_completes_after_time_passes() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetHeroAssigned { assigned: true });
        simulation.apply(GameCommand::Tick { seconds: 120.0 });
        simulation.apply(GameCommand::StartConstruction {
            option_id: CONSTRUCTION_OUTPUT.to_string(),
        });
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_CONSTRUCTION.to_string(),
        });
        simulation.apply(GameCommand::SetRoleCrew {
            role_id: ROLE_CRYSTAL_BASSLINE.to_string(),
            crew: 1,
        });
        simulation.apply(GameCommand::SetRoleCrew {
            role_id: ROLE_CONSTRUCTION.to_string(),
            crew: 1,
        });
        simulation.apply(GameCommand::Tick { seconds: 40.0 });

        assert_eq!(simulation.state().crystal_circle.output_level, 1);
        assert!(simulation.state().active_construction.is_none());
    }

    #[test]
    fn bubble_expands_from_stored_bassline() {
        let mut simulation = Simulation::new();
        let initial_discovered = simulation.state().discovered_cells.len();
        simulation.apply(GameCommand::SetHeroAssigned { assigned: true });
        simulation.apply(GameCommand::SetRoleCrew {
            role_id: ROLE_CRYSTAL_BASSLINE.to_string(),
            crew: 2,
        });
        simulation.apply(GameCommand::Tick { seconds: 120.0 });

        assert!(
            simulation.state().bubble.stabilized_ring >= 1
                || simulation.state().bubble.frontier_progress > 0.0
        );
        assert!(simulation.state().bubble.target_ring >= 1);
        assert!(simulation.state().discovered_cells.len() > initial_discovered);
    }

    #[test]
    fn survivor_cave_gate_opens_at_reach_three() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetHeroAssigned { assigned: true });
        simulation.apply(GameCommand::SetRoleCrew {
            role_id: ROLE_CRYSTAL_BASSLINE.to_string(),
            crew: 1,
        });
        simulation.apply(GameCommand::Tick { seconds: 320.0 });

        assert!(simulation.state().bubble.reach_from_base >= 3);
        assert!(simulation.state().objectives.reach_objective_met);
        assert!(simulation.state().objectives.recruitment_enabled);
    }

    #[test]
    fn studio_restore_and_fire_pit_build_use_stone() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_SCAVENGE.to_string(),
        });
        complete_intro_explore(&mut simulation);
        simulation.apply(GameCommand::Tick { seconds: 10.0 });
        simulation.apply(GameCommand::StartConstruction {
            option_id: PROJECT_RESTORE_STUDIO.to_string(),
        });
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_CONSTRUCTION.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 12.0 });
        simulation.apply(GameCommand::StartConstruction {
            option_id: PROJECT_BUILD_FIRE_PIT.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 4.0 });

        assert!(simulation.state().base.studio_restored);
        assert!(simulation.state().base.fire_pit_built);
        assert_eq!(simulation.state().base.bunks_capacity, 15);
        assert!(simulation.state().resources.stone < 1000.0);
    }

    #[test]
    fn recruitment_spends_vibes_and_adds_pending_travel() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.base.fire_pit_built = true;
        state.base.bunks_capacity = 15;
        state.objectives.survivor_cave_distance = 0;
        state.resources.vibes = 80.0;
        let mut simulation = Simulation::from_state(state);

        let before_crew = simulation.state().roster.total_crew;
        simulation.apply(GameCommand::RecruitFromSurvivorCave);

        assert!(simulation.state().resources.vibes < 100.0);
        assert_eq!(simulation.state().recruitment.pending_recruits.len(), 1);

        simulation.apply(GameCommand::Tick { seconds: 2.0 });
        assert!(simulation.state().roster.total_crew > before_crew);
    }

    #[test]
    fn expedition_starts_with_free_crew_and_returns_rewards() {
        let mut simulation = Simulation::new();
        let before_stone = simulation.state().resources.stone;

        simulation.apply(GameCommand::StartExpedition {
            target_id: EXPEDITION_LOCAL_SCAVENGE_SWEEP.to_string(),
            assigned_crew: 1,
        });

        assert_eq!(simulation.state().expeditions.active_jobs.len(), 1);
        assert_eq!(
            simulation.state().expeditions.active_jobs[0].assigned_crew,
            1
        );

        simulation.apply(GameCommand::Tick { seconds: 120.0 });

        assert!(simulation.state().expeditions.active_jobs.is_empty());
        assert_eq!(simulation.state().expeditions.completed_reports.len(), 1);
        assert!(simulation.state().resources.stone > before_stone);
    }

    #[test]
    fn expeditions_return_strange_materials_for_resonance() {
        let mut simulation = Simulation::new();

        simulation.apply(GameCommand::StartExpedition {
            target_id: EXPEDITION_LOCAL_SCAVENGE_SWEEP.to_string(),
            assigned_crew: 1,
        });
        simulation.apply(GameCommand::Tick { seconds: 120.0 });

        let report = simulation
            .state()
            .expeditions
            .completed_reports
            .last()
            .expect("expedition should report rewards");
        assert!(report.echo_shards_gained > 0);
        assert!(report.signal_scrap_gained > 0);
        assert_eq!(
            simulation.state().resonance.materials.echo_shards,
            report.echo_shards_gained
        );
        assert_eq!(
            simulation.state().resonance.materials.signal_scrap,
            report.signal_scrap_gained
        );
    }

    #[test]
    fn resonance_recipe_consumes_materials_and_tunes_bassline() {
        let mut state = GameState::new();
        state.roster.hero_assigned = true;
        state.base.resonance_chamber_built = true;
        state.resources.chorus = 100.0;
        state.resonance.materials.echo_shards = 1;
        state.resonance.materials.signal_scrap = 1;
        state.stations.insert(
            STATION_RESONANCE_CHAMBER.to_string(),
            StationState {
                requested_enabled: true,
                is_powered: true,
                power_order: 30,
            },
        );
        let before_generation = Simulation::from_state(state.clone())
            .state()
            .power
            .bassline_generation_per_second;
        let mut simulation = Simulation::from_state(state);

        simulation.apply(GameCommand::StartResonanceRecipe {
            recipe_id: RESONANCE_RECIPE_BASSLINE_OVERTONE.to_string(),
        });

        assert_eq!(simulation.state().resonance.materials.echo_shards, 0);
        assert_eq!(simulation.state().resonance.materials.signal_scrap, 0);
        assert_eq!(simulation.state().resonance.active_jobs.len(), 1);

        simulation.apply(GameCommand::Tick { seconds: 45.0 });

        assert!(simulation.state().resonance.active_jobs.is_empty());
        assert_eq!(simulation.state().resonance.tuning.bassline_level, 1);
        assert!(
            simulation.state().power.bassline_generation_per_second > before_generation,
            "Bassline tuning should raise runtime generation"
        );
    }

    #[test]
    fn resonance_support_changes_expedition_duration() {
        let mut state = GameState::new();
        state.resonance.expedition_support_level = 2;
        state.resonance.station_specializations.insert(
            STATION_RESONANCE_CHAMBER.to_string(),
            StationSpecializationPathState::Field,
        );
        let mut simulation = Simulation::from_state(state);

        simulation.apply(GameCommand::StartExpedition {
            target_id: EXPEDITION_LOCAL_SCAVENGE_SWEEP.to_string(),
            assigned_crew: 1,
        });

        let job = simulation
            .state()
            .expeditions
            .active_jobs
            .first()
            .expect("expedition should start");
        assert!(job.duration_seconds < 120.0);
        assert_eq!(job.duration_seconds, job.remaining_seconds);
    }

    #[test]
    fn expedition_refuses_crew_already_assigned_to_roles() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetRoleCrew {
            role_id: ROLE_CRYSTAL_BASSLINE.to_string(),
            crew: DEFAULT_TOTAL_CREW,
        });

        simulation.apply(GameCommand::StartExpedition {
            target_id: EXPEDITION_LOCAL_SCAVENGE_SWEEP.to_string(),
            assigned_crew: 1,
        });

        assert!(simulation.state().expeditions.active_jobs.is_empty());
    }

    #[test]
    fn offline_catchup_progresses_expeditions() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::StartExpedition {
            target_id: EXPEDITION_LOCAL_SCAVENGE_SWEEP.to_string(),
            assigned_crew: 1,
        });

        simulation.apply(GameCommand::RunOfflineCatchup {
            elapsed_seconds: 120.0,
        });

        assert!(simulation.state().expeditions.active_jobs.is_empty());
        assert_eq!(simulation.state().expeditions.completed_reports.len(), 1);
        assert!(simulation.state().expeditions.completed_reports[0].stone_gained > 0.0);
    }

    #[test]
    fn investigate_explore_unlocks_studio_and_removing_moss() {
        let mut simulation = Simulation::new();
        complete_intro_explore(&mut simulation);

        assert!(simulation.state().base.tutorial_investigated);
        assert!(simulation.state().base.tutorial_explored);
        assert!(simulation.state().base.studio_restore_unlocked);
        assert!(simulation.state().crystal_circle.removing_moss_unlocked);
        assert_eq!(simulation.state().base.skins, 1);
    }

    #[test]
    fn water_collects_from_run_start() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_WATER.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 1.0 });

        assert!(simulation.state().resources.water > 0.0);
        assert!(simulation.state().resources.base_water_stock < 5.0);
    }

    #[test]
    fn bad_vibes_hysteresis_grows_when_overcrowded() {
        let mut state = GameState::new();
        state.base.fire_pit_built = true;
        state.base.studio_restored = true;
        state.base.bunks_capacity = 1;
        state.roster.total_crew = 6;
        let mut simulation = Simulation::from_state(state);
        simulation.apply(GameCommand::Tick { seconds: 60.0 });

        assert!(simulation.state().base.effective_bad_vibes_rate > 0.0);
        assert!(simulation.state().base.bad_vibes_multiplier > 1.0);
    }

    #[test]
    fn chorus_life_support_scales_with_active_staff() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.roster.hero_assigned = true;
        state.roster.total_crew = 4;
        state
            .roster
            .crew_by_role
            .insert(ROLE_CRYSTAL_BASSLINE.to_string(), 3);

        let simulation = Simulation::from_state(state);

        assert_eq!(simulation.state().power.active_staff_count, 4);
        assert!(simulation.state().power.life_support_upkeep_per_second > 0.0);
        assert!(
            simulation.state().power.requested_upkeep_per_second
                >= simulation.state().power.life_support_upkeep_per_second
        );
    }

    #[test]
    fn hero_gains_bassline_xp_from_stored_output() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetHeroAssigned { assigned: true });
        simulation.apply(GameCommand::Tick { seconds: 60.0 });

        assert!(simulation.state().hero_progress.drummer_xp > 0.0);
    }

    #[test]
    fn passive_bassline_trickle_does_not_grant_xp() {
        let mut state = GameState::new();
        state.roster.hero_assigned = false;
        state.crystal_circle.removing_moss_completed = true;
        let mut simulation = Simulation::from_state(state);
        simulation.apply(GameCommand::Tick { seconds: 30.0 });

        assert_eq!(simulation.state().hero_progress.drummer_xp, 0.0);
    }

    #[test]
    fn resonance_processing_recipe_increases_field_multiplier() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.base.resonance_chamber_built = true;
        state.resources.chorus = 10.0;
        state.resources.stone = 500.0;
        state.resources.water = 5.0;
        let mut simulation = Simulation::from_state(state);

        simulation.apply(GameCommand::SetStationEnabled {
            station_id: "station.resonance_chamber".to_string(),
            enabled: true,
        });
        let before = simulation.state().power.field_multiplier;
        simulation.apply(GameCommand::StartProcessing {
            recipe_id: RECIPE_RESONANCE_FIELD_CALIBRATION.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 10.0 });

        assert_eq!(simulation.state().processing.resonance_calibration_level, 1);
        assert!(simulation.state().power.field_multiplier > before);
    }

    #[test]
    fn mix_processing_recipe_increases_harmonics_efficiency() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.base.resonance_chamber_built = true;
        state.base.mix_console_built = true;
        state.resources.chorus = 10.0;
        state.resources.stone = 800.0;
        state.resources.water = 5.0;
        let mut simulation = Simulation::from_state(state);

        simulation.apply(GameCommand::SetStationEnabled {
            station_id: "station.mix_console".to_string(),
            enabled: true,
        });
        let before = simulation.state().power.harmonics_efficiency_multiplier;
        simulation.apply(GameCommand::StartProcessing {
            recipe_id: RECIPE_MIX_SIGNAL_BALANCING.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 12.0 });

        assert_eq!(simulation.state().processing.mix_calibration_level, 1);
        assert!(simulation.state().power.harmonics_efficiency_multiplier > before);
    }

    #[test]
    fn workshop_water_condensers_increase_water_cap() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.base.workshop_built = true;
        state.resources.chorus = 10.0;
        state.resources.stone = 500.0;
        state.resources.water = 5.0;
        let mut simulation = Simulation::from_state(state);

        simulation.apply(GameCommand::SetStationEnabled {
            station_id: "station.workshop".to_string(),
            enabled: true,
        });
        let before = simulation.state().resources.water_cap;
        simulation.apply(GameCommand::StartProcessing {
            recipe_id: RECIPE_WORKSHOP_WATER_CONDENSERS.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 12.0 });

        assert_eq!(
            simulation
                .state()
                .processing
                .workshop_water_condensers_level,
            1
        );
        assert!(simulation.state().resources.water_cap > before);
    }

    #[test]
    fn research_chorus_routing_reduces_life_support_upkeep() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.base.resonance_chamber_built = true;
        state.base.research_booth_built = true;
        state.resources.chorus = 20.0;
        state.resources.stone = 500.0;
        state.resources.water = 5.0;
        state.roster.total_crew = 4;
        state
            .roster
            .crew_by_role
            .insert(ROLE_CRYSTAL_BASSLINE.to_string(), 3);
        let mut simulation = Simulation::from_state(state);

        simulation.apply(GameCommand::SetStationEnabled {
            station_id: "station.research_booth".to_string(),
            enabled: true,
        });
        let before = simulation.state().power.life_support_upkeep_per_second;
        simulation.apply(GameCommand::StartProcessing {
            recipe_id: RECIPE_RESEARCH_CHORUS_ROUTING.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 16.0 });

        assert_eq!(
            simulation.state().processing.research_chorus_routing_level,
            1
        );
        assert!(simulation.state().power.life_support_upkeep_per_second < before);
    }

    #[test]
    fn harmonics_becomes_worth_staffing_after_unlock() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.base.resonance_chamber_built = true;
        state.roster.hero_assigned = true;
        state.roster.hero_role_id = ROLE_CRYSTAL_HARMONICS.to_string();
        let simulation = Simulation::from_state(state);

        assert!(simulation.state().power.harmonics_generation_per_second >= 0.08);
        assert!(
            simulation.state().power.harmonics_tier >= 1,
            "expected Harmonics tier 1 with Hero assigned after unlock, got generation {:.3}/s and tier {}",
            simulation.state().power.harmonics_generation_per_second,
            simulation.state().power.harmonics_tier,
        );
    }

    #[test]
    fn studio_restore_becomes_affordable_soon_after_explore() {
        let mut simulation = Simulation::new();
        complete_intro_explore(&mut simulation);
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_SCAVENGE.to_string(),
        });

        let mut affordable_at = None;
        for second in 1..=20 {
            simulation.apply(GameCommand::Tick { seconds: 1.0 });
            if simulation.state().resources.stone >= 600.0 {
                affordable_at = Some(second);
                break;
            }
        }

        let affordable_at =
            affordable_at.expect("studio restore should become affordable after Explore");
        assert!(
            affordable_at <= 12,
            "expected Studio restore to become affordable quickly after Explore, got {affordable_at}s",
        );
    }

    #[test]
    fn one_early_chorus_assignment_offsets_life_support() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.roster.hero_assigned = true;
        state.roster.hero_role_id = ROLE_CRYSTAL_CHORUS.to_string();
        state.roster.total_crew = 2;
        state
            .roster
            .crew_by_role
            .insert(ROLE_CRYSTAL_BASSLINE.to_string(), 1);
        let simulation = Simulation::from_state(state);

        assert!(
            simulation.state().power.chorus_generation_per_second
                >= simulation.state().power.life_support_upkeep_per_second,
            "expected one early Chorus assignment to offset life support: generation {:.3}/s, upkeep {:.3}/s",
            simulation.state().power.chorus_generation_per_second,
            simulation.state().power.life_support_upkeep_per_second,
        );
    }

    #[test]
    fn first_recruit_pacing_stays_inside_first_session_window() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.base.fire_pit_built = true;
        state.base.bunks_capacity = 15;
        state.objectives.recruitment_enabled = true;
        state.objectives.reach_objective_met = true;
        state.objectives.survivor_cave_in_bubble = true;
        state
            .roster
            .crew_by_role
            .insert(ROLE_FIRE_PIT.to_string(), 1);
        let mut simulation = Simulation::from_state(state);

        let mut reached_at = None;
        for second in 1..=300 {
            simulation.apply(GameCommand::Tick { seconds: 1.0 });
            if simulation.state().resources.vibes
                >= simulation.state().recruitment.next_recruit_cost
            {
                reached_at = Some(second);
                break;
            }
        }

        let reached_at = reached_at.unwrap_or_else(|| {
            panic!(
                "first recruit should become affordable inside 5 minutes; vibes={:.2}, cost={:.2}",
                simulation.state().resources.vibes,
                simulation.state().recruitment.next_recruit_cost,
            )
        });
        assert!(
            (120..=300).contains(&reached_at),
            "expected first recruit affordability around 2-5 minutes after Fire Pit, got {reached_at}s",
        );
    }

    #[test]
    fn early_path_reaches_survivor_gate_in_tuning_window() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetRoleCrew {
            role_id: ROLE_CRYSTAL_BASSLINE.to_string(),
            crew: 1,
        });
        complete_intro_explore(&mut simulation);
        simulation.apply(GameCommand::StartConstruction {
            option_id: CONSTRUCTION_REMOVING_MOSS.to_string(),
        });
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_CONSTRUCTION.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 10.0 });
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_SCAVENGE.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 8.0 });
        simulation.apply(GameCommand::StartConstruction {
            option_id: PROJECT_RESTORE_STUDIO.to_string(),
        });
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_CONSTRUCTION.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 12.0 });
        simulation.apply(GameCommand::StartConstruction {
            option_id: PROJECT_BUILD_FIRE_PIT.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 4.0 });
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_CRYSTAL_BASSLINE.to_string(),
        });

        let mut reached_at = None;
        for step in 0..360 {
            simulation.apply(GameCommand::Tick { seconds: 1.0 });
            if simulation.state().bubble.reach_from_base >= 3 {
                reached_at = Some(step + 1);
                break;
            }
        }

        let reached_at = reached_at.unwrap_or_else(|| {
            panic!(
                "should reach Survivor Cave gate; final reach={}, bassline={:.1}, budget={:.1}, target_ring={}, frontier={:.2}",
                simulation.state().bubble.reach_from_base,
                simulation.state().resources.bassline,
                simulation.state().bubble.field_budget,
                simulation.state().bubble.target_ring,
                simulation.state().bubble.frontier_progress,
            )
        });
        let total_elapsed = 39 + reached_at;

        assert!(
            (240..=360).contains(&total_elapsed),
            "expected reach gate around 4-6 minutes, got {total_elapsed}s"
        );
    }

    #[test]
    fn phase_zero_catalog_contains_current_playable_systems() {
        let catalog = super::catalog_snapshot();

        assert_catalog_ids(
            "resources",
            catalog.resources.iter().map(|item| item.id),
            &[
                RESOURCE_BASSLINE,
                RESOURCE_CHORUS,
                RESOURCE_HARMONICS,
                RESOURCE_STONE,
                RESOURCE_WATER,
                RESOURCE_VIBES,
            ],
        );
        assert_catalog_ids(
            "roles",
            catalog.roles.iter().map(|item| item.id),
            &[
                ROLE_CRYSTAL_BASSLINE,
                ROLE_CRYSTAL_CHORUS,
                ROLE_CRYSTAL_HARMONICS,
                ROLE_CONSTRUCTION,
                ROLE_FIRE_PIT,
                ROLE_SCAVENGE,
                ROLE_WATER,
            ],
        );
        assert_catalog_ids(
            "stations",
            catalog.stations.iter().map(|item| item.id),
            &[
                STATION_CRYSTAL_CIRCLE,
                STATION_FIRE_PIT,
                STATION_RESONANCE_CHAMBER,
                STATION_MIX_CONSOLE,
                STATION_WORKSHOP,
                STATION_RESEARCH_BOOTH,
            ],
        );
        assert_catalog_ids(
            "construction options",
            catalog.construction_options.iter().map(|item| item.id),
            &[
                CONSTRUCTION_STORAGE,
                CONSTRUCTION_OUTPUT,
                CONSTRUCTION_REMOVING_MOSS,
                PROJECT_RESTORE_STUDIO,
                PROJECT_BUILD_FIRE_PIT,
                PROJECT_BUILD_RESONANCE_CHAMBER,
                PROJECT_BUILD_MIX_CONSOLE,
                PROJECT_BUILD_WORKSHOP,
                PROJECT_BUILD_RESEARCH_BOOTH,
                PROJECT_EXPAND_BUNKS,
                PROJECT_SAFE_WATER_SYSTEMS,
                PROJECT_EXPEDITION_STAGING,
                PROJECT_PREPARE_LOUDSPEAKERS,
            ],
        );
        assert_catalog_ids(
            "processing recipes",
            catalog.processing_recipes.iter().map(|item| item.id),
            &[
                RECIPE_RESONANCE_FIELD_CALIBRATION,
                RECIPE_MIX_SIGNAL_BALANCING,
                RECIPE_WORKSHOP_BUILDER_TOOLS,
                RECIPE_WORKSHOP_WATER_CONDENSERS,
                RECIPE_RESEARCH_CHORUS_ROUTING,
                RECIPE_RESEARCH_HARMONIC_STUDY,
            ],
        );
        assert_catalog_ids(
            "world actions",
            catalog.world_actions.iter().map(|item| item.id),
            &[WORLD_ACTION_INVESTIGATE_BASE, WORLD_ACTION_EXPLORE_BASE],
        );
        assert_catalog_ids(
            "story beats",
            catalog.story_beats.iter().map(|item| item.id),
            &[
                STORY_BEAT_ROAD_TO_BASE,
                STORY_BEAT_FIRST_GLIMPSE,
                STORY_BEAT_ENTER_THE_BUBBLE,
                STORY_BEAT_INVESTIGATE_BASE,
                STORY_BEAT_EXPLORE_BASE,
                STORY_BEAT_RESTORE_STUDIO,
                STORY_BEAT_BUILD_FIRE_PIT,
                STORY_BEAT_REACH_SURVIVOR_CAVE,
                STORY_BEAT_FIRST_RECRUIT,
                STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL,
                STORY_BEAT_STABILIZE_BASE,
            ],
        );
        assert_catalog_ids(
            "tiles",
            catalog.tiles.iter().map(|item| item.id),
            &[TILE_BASE_CORE, TILE_SURVIVOR_CAVE, TILE_MOUNTAIN_WALL],
        );
        assert_catalog_ids(
            "structures",
            catalog.structures.iter().map(|item| item.id),
            &[STRUCTURE_CRYSTAL_CIRCLE, STRUCTURE_BASE, STRUCTURE_CAVE],
        );

        assert!(catalog.balance.bubble.field_k_base > 0.0);
        assert!(catalog.balance.crystal.output_per_worker_base > 0.0);
        assert!(
            catalog
                .balance
                .power
                .life_support_upkeep_per_staff_per_second
                > 0.0
        );
        assert!(catalog.balance.recruitment.t1_minutes > 0.0);
        assert!(super::recruit_cost_for_index(1) > 0.0);
        assert!(catalog.balance.survival.hero_time_seconds_0_to_1 > 0.0);
    }

    #[test]
    fn offline_catchup_progresses_allowed_systems_and_freezes_online_world_actions() {
        let mut state = GameState::new();
        state
            .roster
            .crew_by_role
            .insert(ROLE_CRYSTAL_BASSLINE.to_string(), 1);
        state.recruitment.pending_recruits.push(RecruitTravel {
            total_seconds: 5.0,
            remaining_seconds: 5.0,
        });
        let mut simulation = Simulation::from_state(state);

        simulation.apply(GameCommand::RunOfflineCatchup {
            elapsed_seconds: 10.0,
        });

        assert!(simulation.state().resources.bassline > 0.0);
        assert_eq!(simulation.state().recruitment.pending_recruits.len(), 0);
        assert_eq!(simulation.state().roster.total_crew, DEFAULT_TOTAL_CREW + 1);

        let mut online_only = Simulation::new();
        advance_intro_to_investigate(&mut online_only);
        online_only.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_INVESTIGATE_BASE.to_string(),
            option_id: "story.choice.investigate.search_power".to_string(),
        });
        online_only.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_INVESTIGATE_BASE.to_string(),
        });
        let remaining = online_only
            .state()
            .active_world_action
            .as_ref()
            .expect("world action should be active")
            .remaining_seconds;

        online_only.apply(GameCommand::RunOfflineCatchup {
            elapsed_seconds: 10.0,
        });

        assert_eq!(
            online_only
                .state()
                .active_world_action
                .as_ref()
                .expect("online-only world action should remain active")
                .remaining_seconds,
            remaining
        );

        let mut discovery_only = Simulation::new();
        let before_discovery = discovery_only.state().discovered_cells.clone();
        discovery_only.apply(GameCommand::RunOfflineCatchup {
            elapsed_seconds: 10.0,
        });
        assert_eq!(discovery_only.state().discovered_cells, before_discovery);
    }

    fn assert_catalog_ids<'a>(label: &str, ids: impl Iterator<Item = &'a str>, expected: &[&str]) {
        let actual = ids.collect::<HashSet<_>>();
        for expected_id in expected {
            assert!(
                actual.contains(expected_id),
                "missing {label} catalog id {expected_id}"
            );
        }
    }

    #[test]
    fn condition_evaluator_handles_flags_and_combinators() {
        let mut sim = Simulation::new();
        assert!(sim.evaluate_condition(&Condition::Always));
        assert!(sim.evaluate_condition(&Condition::FlagUnset(FLAG_BASE_STUDIO_RESTORED)));
        assert!(!sim.evaluate_condition(&Condition::FlagSet(FLAG_BASE_STUDIO_RESTORED)));

        sim.apply_effects(&[EffectDef::SetFlag {
            flag_id: FLAG_BASE_STUDIO_RESTORED,
            value: true,
        }]);
        assert!(sim.evaluate_condition(&Condition::FlagSet(FLAG_BASE_STUDIO_RESTORED)));

        assert!(
            sim.evaluate_condition(&Condition::Not(&Condition::FlagUnset(
                FLAG_BASE_STUDIO_RESTORED
            )))
        );
        assert!(sim.evaluate_condition(&Condition::All(&[
            Condition::Always,
            Condition::FlagSet(FLAG_BASE_STUDIO_RESTORED),
        ])));
        assert!(!sim.evaluate_condition(&Condition::All(&[
            Condition::FlagUnset(FLAG_BASE_STUDIO_RESTORED),
            Condition::Always,
        ])));
        assert!(sim.evaluate_condition(&Condition::Any(&[
            Condition::FlagUnset(FLAG_BASE_STUDIO_RESTORED),
            Condition::Always,
        ])));
    }

    #[test]
    fn effects_mutate_resources_qualities_and_beats() {
        let mut sim = Simulation::new();

        // Resource grant feeds the ResourceAtLeast condition.
        assert!(!sim.evaluate_condition(&Condition::ResourceAtLeast {
            resource_id: RESOURCE_STONE,
            amount: 100.0,
        }));
        sim.apply_effects(&[EffectDef::GrantResource {
            resource_id: RESOURCE_STONE,
            amount: 150.0,
        }]);
        assert!(sim.evaluate_condition(&Condition::ResourceAtLeast {
            resource_id: RESOURCE_STONE,
            amount: 100.0,
        }));

        // Qualities — the quality-based-narrative lever.
        assert_eq!(sim.quality("trust"), 0);
        assert!(!sim.evaluate_condition(&Condition::QualityAtLeast {
            key: "trust",
            value: 1
        }));
        sim.apply_effects(&[EffectDef::AddQuality {
            key: "trust",
            amount: 2,
        }]);
        assert_eq!(sim.quality("trust"), 2);
        assert!(sim.evaluate_condition(&Condition::QualityAtLeast {
            key: "trust",
            value: 2
        }));
        sim.apply_effects(&[EffectDef::SetQuality {
            key: "trust",
            value: 0,
        }]);
        assert!(!sim.evaluate_condition(&Condition::QualityAtLeast {
            key: "trust",
            value: 1
        }));

        // Beat completion + numeric reach comparison.
        assert!(!sim.evaluate_condition(&Condition::BeatCompleted(STORY_BEAT_ROAD_TO_BASE)));
        sim.apply_effects(&[EffectDef::CompleteBeat {
            beat_id: STORY_BEAT_ROAD_TO_BASE,
        }]);
        assert!(sim.evaluate_condition(&Condition::BeatCompleted(STORY_BEAT_ROAD_TO_BASE)));
        assert!(sim.evaluate_condition(&Condition::BubbleReachAtLeast(0)));
        assert!(!sim.evaluate_condition(&Condition::BubbleReachAtLeast(1)));
    }

    #[test]
    fn storylet_selector_revives_late_beats_from_state() {
        let mut sim = Simulation::new();
        // Fast-forward the intro, then drive the late spine purely from game state.
        sim.apply_effects(&[
            EffectDef::CompleteBeat {
                beat_id: STORY_BEAT_ROAD_TO_BASE,
            },
            EffectDef::CompleteBeat {
                beat_id: STORY_BEAT_FIRST_GLIMPSE,
            },
            EffectDef::CompleteBeat {
                beat_id: STORY_BEAT_ENTER_THE_BUBBLE,
            },
            EffectDef::CompleteBeat {
                beat_id: STORY_BEAT_INVESTIGATE_BASE,
            },
            EffectDef::CompleteBeat {
                beat_id: STORY_BEAT_EXPLORE_BASE,
            },
            EffectDef::SetFlag {
                flag_id: FLAG_BASE_STUDIO_RESTORED,
                value: true,
            },
        ]);
        sim.refresh_narrative_state();
        // studio_restored auto-resolves Restore Studio + activates Build Fire Pit —
        // a beat that the old hardcoded intro chain never reached.
        assert_eq!(
            sim.state().narrative.active_beat_id.as_deref(),
            Some(STORY_BEAT_BUILD_FIRE_PIT)
        );

        sim.apply_effects(&[EffectDef::SetFlag {
            flag_id: FLAG_BASE_FIRE_PIT_BUILT,
            value: true,
        }]);
        sim.refresh_narrative_state();
        assert_eq!(
            sim.state().narrative.active_beat_id.as_deref(),
            Some(STORY_BEAT_REACH_SURVIVOR_CAVE)
        );
    }

    #[test]
    fn story_choices_and_oncomplete_mutate_qualities() {
        let mut sim = Simulation::new();

        // The opening choice records a remembered quality — the world remembers
        // the player's temperament (resolve vs haste).
        assert_eq!(sim.quality("haste"), 0);
        sim.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ROAD_TO_BASE.to_string(),
            option_id: "story.choice.road.keep_moving".to_string(),
        });
        assert_eq!(sim.quality("haste"), 1);
        assert_eq!(sim.quality("resolve"), 0);

        // Restore Studio's onComplete grants hope when the beat resolves.
        assert_eq!(sim.quality("hope"), 0);
        sim.apply_effects(&[
            EffectDef::CompleteBeat {
                beat_id: STORY_BEAT_FIRST_GLIMPSE,
            },
            EffectDef::CompleteBeat {
                beat_id: STORY_BEAT_ENTER_THE_BUBBLE,
            },
            EffectDef::CompleteBeat {
                beat_id: STORY_BEAT_INVESTIGATE_BASE,
            },
            EffectDef::CompleteBeat {
                beat_id: STORY_BEAT_EXPLORE_BASE,
            },
            EffectDef::SetFlag {
                flag_id: FLAG_BASE_STUDIO_RESTORED,
                value: true,
            },
        ]);
        sim.refresh_narrative_state();
        assert_eq!(sim.quality("hope"), 1);
    }

    #[test]
    fn reactive_storylet_interrupts_when_hero_exposed() {
        let mut state = GameState::new();
        // Past onboarding, and the Hero is caught outside the bubble.
        state.hero_survival.location = HeroLocationState::OutsideBubble;
        state.narrative.completed_beat_ids = vec![
            STORY_BEAT_ROAD_TO_BASE.to_string(),
            STORY_BEAT_FIRST_GLIMPSE.to_string(),
            STORY_BEAT_ENTER_THE_BUBBLE.to_string(),
            STORY_BEAT_INVESTIGATE_BASE.to_string(),
            STORY_BEAT_EXPLORE_BASE.to_string(),
        ];
        let mut sim = Simulation::from_state(state);
        sim.refresh_narrative_state();
        // The off-spine, high-priority reactive storylet interrupts whatever beat
        // would otherwise be active — pure emergence from game state.
        assert_eq!(
            sim.state().narrative.active_beat_id.as_deref(),
            Some(STORY_BEAT_HERO_EXPOSED)
        );
        // on_activate fired exactly once on activation...
        assert_eq!(sim.quality("exposure_seen"), 1);
        sim.refresh_narrative_state();
        assert_eq!(
            sim.quality("exposure_seen"),
            1,
            "on_activate must not re-fire"
        );

        // Resolving it applies the choice effect and hands the spine back.
        sim.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_HERO_EXPOSED.to_string(),
            option_id: "story.choice.exposed.steady".to_string(),
        });
        assert_eq!(sim.quality("resolve"), 1);
        assert_ne!(
            sim.state().narrative.active_beat_id.as_deref(),
            Some(STORY_BEAT_HERO_EXPOSED)
        );
    }

    fn hex_distance(left: HexCoordState, right: HexCoordState) -> u8 {
        let dq = left.q - right.q;
        let dr = left.r - right.r;
        dq.abs()
            .max(dr.abs())
            .max((-(left.q + left.r) + (right.q + right.r)).abs()) as u8
    }
}
