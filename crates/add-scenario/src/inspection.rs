//! Headless projection of the agent runtime contract.
//!
//! add-core remains the authority for state and transitions. This module is
//! deliberately a reporting adapter: it reads the same GameState that the
//! scenario runner just replayed and never mutates or re-evaluates gameplay.

use add_core::game_data::{self, CostDef, RequirementDef};
use add_core::{ForcedReturnPhase, GameState, HeroLocationState};
use serde_json::{Value, json};
use std::collections::BTreeMap;

pub const AGENT_RUNTIME_REPORT_VERSION: u64 = 1;
pub const AGENT_RUNTIME_CONTRACT: &str = "agent_runtime_v1";

pub fn report(state: &GameState) -> Value {
    let catalog = game_data::catalog_snapshot();
    let commands = available_commands(state);
    let enabled_ids = commands
        .iter()
        .filter(|command| command["enabled"].as_bool() == Some(true))
        .filter_map(|command| command["id"].as_str())
        .map(str::to_string)
        .collect::<Vec<_>>();
    let blocked = commands
        .iter()
        .filter(|command| command["enabled"].as_bool() != Some(true))
        .collect::<Vec<_>>();
    let blockers = blocked
        .iter()
        .map(|command| {
            json!({
                "id": format!("blocker:command:{}", command["id"].as_str().unwrap_or("unknown")),
                "kind": "command_unavailable",
                "label": command["label"],
                "reason": command["whyUnavailable"],
                "relatedIds": command["relatedIds"],
            })
        })
        .collect::<Vec<_>>();
    let (next_label, next_detail, next_command_id, next_enabled) = next_action(state, &commands);
    let active_beat = state.narrative.active_beat_id.as_deref();
    let story_blocker = story_blocker(state);
    let mut all_blockers = blockers;
    if story_blocker.0 != "none" {
        all_blockers.push(json!({
            "id": format!("blocker:story:{}", story_blocker.0),
            "kind": "story",
            "label": story_blocker.1,
            "reason": story_blocker.2,
            "relatedIds": story_blocker.3,
        }));
    }

    json!({
        "schemaVersion": AGENT_RUNTIME_REPORT_VERSION,
        "contract": AGENT_RUNTIME_CONTRACT,
        "runtime": {
            "ready": true,
            "source": "headless-add-core",
            "snapshotReceived": true,
            "catalogReceived": true,
            "error": Value::Null,
        },
        "authoritative": authoritative_state(state, &catalog),
        "derived": {
            "map": {
                "mode": Value::Null,
                "availableModes": ["overworld_hex"],
                "topology": "hex",
            },
            "story": {
                "activeBeatId": active_beat,
                "activeArc": active_beat.and_then(game_data::story_beat_def).map(|beat| beat.arc),
                "nextAction": {
                    "commandId": next_command_id,
                    "label": next_label,
                    "detail": next_detail,
                    "enabled": next_enabled,
                },
                "blocker": {
                    "kind": story_blocker.0,
                    "label": story_blocker.1,
                    "detail": story_blocker.2,
                    "relatedIds": story_blocker.3,
                },
            },
            "availableCommands": commands,
            "enabledCommandIds": enabled_ids,
            "blockedCommandIds": blocked.iter().filter_map(|command| command["id"].as_str()).collect::<Vec<_>>(),
            "blockers": all_blockers,
        },
        "diagnostics": {
            "layerAuthority": {
                "authoritative": "rust-wasm-snapshot",
                "derived": "add-domain-selectors",
                "diagnostics": "headless-add-core",
            },
            "lastCommand": Value::Null,
            "lastEvent": "scenario_complete",
            "noteCount": state.notes.len(),
            "warnings": [],
        },
    })
}

pub fn compact_text(report: &Value) -> String {
    let runtime = if report["runtime"]["ready"].as_bool() == Some(true) {
        "ready"
    } else {
        "not-ready"
    };
    let seconds = report["authoritative"]["currentTime"]["seconds"]
        .as_f64()
        .unwrap_or(0.0);
    let beat = report["authoritative"]["story"]["activeBeatId"]
        .as_str()
        .unwrap_or("none");
    let next = report["derived"]["story"]["nextAction"]
        .get("commandId")
        .and_then(Value::as_str)
        .unwrap_or("none");
    let enabled = report["derived"]["enabledCommandIds"]
        .as_array()
        .map_or(0, Vec::len);
    let blocked = report["derived"]["blockedCommandIds"]
        .as_array()
        .map_or(0, Vec::len);
    format!(
        "runtime {runtime} source=headless-add-core\ntime {seconds:.3}s beat={beat}\nnext {next} commands enabled={enabled} blocked={blocked}"
    )
}

fn authoritative_state(state: &GameState, catalog: &game_data::CatalogSnapshot) -> Value {
    let resources = catalog
        .resources
        .iter()
        .map(|resource| {
            let (value, cap) = resource_values(state, resource.id);
            json!({
                "id": resource.id,
                "label": resource.label,
                "value": round(value),
                "cap": round(cap),
                "category": resource.category,
            })
        })
        .collect::<Vec<_>>();
    let content_families = [
        (
            "resources",
            catalog
                .resources
                .iter()
                .map(|item| item.id)
                .collect::<Vec<_>>(),
        ),
        (
            "roles",
            catalog.roles.iter().map(|item| item.id).collect::<Vec<_>>(),
        ),
        (
            "stations",
            catalog
                .stations
                .iter()
                .map(|item| item.id)
                .collect::<Vec<_>>(),
        ),
        (
            "constructionOptions",
            catalog
                .construction_options
                .iter()
                .map(|item| item.id)
                .collect::<Vec<_>>(),
        ),
        (
            "processingRecipes",
            catalog
                .processing_recipes
                .iter()
                .map(|item| item.id)
                .collect::<Vec<_>>(),
        ),
        (
            "worldActions",
            catalog
                .world_actions
                .iter()
                .map(|item| item.id)
                .collect::<Vec<_>>(),
        ),
        (
            "expeditionTargets",
            catalog
                .expedition_targets
                .iter()
                .map(|item| item.id)
                .collect::<Vec<_>>(),
        ),
        (
            "resonanceRecipes",
            catalog
                .resonance_recipes
                .iter()
                .map(|item| item.id)
                .collect::<Vec<_>>(),
        ),
        (
            "storyBeats",
            catalog
                .story_beats
                .iter()
                .map(|item| item.id)
                .collect::<Vec<_>>(),
        ),
        (
            "objectives",
            catalog
                .objectives
                .iter()
                .map(|item| item.id)
                .collect::<Vec<_>>(),
        ),
        (
            "items",
            catalog.items.iter().map(|item| item.id).collect::<Vec<_>>(),
        ),
        (
            "perks",
            catalog.perks.iter().map(|item| item.id).collect::<Vec<_>>(),
        ),
        (
            "creatures",
            catalog
                .creatures
                .iter()
                .map(|item| item.id)
                .collect::<Vec<_>>(),
        ),
        (
            "flags",
            catalog.flags.iter().map(|item| item.id).collect::<Vec<_>>(),
        ),
        (
            "models",
            catalog
                .models
                .iter()
                .map(|item| item.id)
                .collect::<Vec<_>>(),
        ),
        (
            "flora",
            catalog.flora.iter().map(|item| item.id).collect::<Vec<_>>(),
        ),
        (
            "structures",
            catalog
                .structures
                .iter()
                .map(|item| item.id)
                .collect::<Vec<_>>(),
        ),
        (
            "tiles",
            catalog.tiles.iter().map(|item| item.id).collect::<Vec<_>>(),
        ),
        (
            "entitySchemas",
            catalog
                .entity_schemas
                .iter()
                .map(|item| item.id)
                .collect::<Vec<_>>(),
        ),
        (
            "uiElements",
            catalog
                .ui_elements
                .iter()
                .map(|item| item.id)
                .collect::<Vec<_>>(),
        ),
    ];
    let counts = content_families
        .iter()
        .map(|(key, ids)| (*key, ids.len()))
        .collect::<BTreeMap<_, _>>();
    let content_ids = content_families
        .iter()
        .map(|(key, ids)| (*key, ids.clone()))
        .collect::<BTreeMap<_, _>>();
    let mut crew_role_ids = catalog
        .roles
        .iter()
        .map(|role| format!("crew-role:{}", role.id))
        .collect::<Vec<_>>();
    crew_role_ids.sort();

    json!({
        "entities": {
            "heroId": "entity:hero",
            "crewRoleIds": crew_role_ids,
        },
        "currentTime": { "seconds": round(state.clock_seconds) },
        "resources": resources,
        "jobs": {
            "construction": state.active_construction.as_ref().map(|job| json!({
                "id": job.option_id,
                "remainingSeconds": round(job.remaining_work_seconds),
                "totalSeconds": round(job.total_work_seconds),
            })),
            "worldAction": state.active_world_action.as_ref().map(|job| json!({
                "id": job.action_id,
                "remainingSeconds": round(job.remaining_seconds),
                "totalSeconds": round(job.total_seconds),
            })),
            "processing": state.processing.active_jobs.values().map(|job| json!({
                "id": job.station_id,
                "recipeId": job.recipe_id,
                "stationId": job.station_id,
                "remainingSeconds": round(job.remaining_work_seconds),
                "totalSeconds": round(job.total_work_seconds),
            })).collect::<Vec<_>>(),
            "resonance": state.resonance.active_jobs.values().map(|job| json!({
                "id": job.station_id,
                "recipeId": job.recipe_id,
                "stationId": job.station_id,
                "remainingSeconds": round(job.remaining_work_seconds),
                "totalSeconds": round(job.total_work_seconds),
            })).collect::<Vec<_>>(),
            "expeditions": state.expeditions.active_jobs.iter().map(|job| json!({
                "id": job.id.to_string(),
                "targetId": job.target_id,
                "remainingSeconds": round(job.remaining_seconds),
                "totalSeconds": round(job.duration_seconds),
                "assignedCrew": job.assigned_crew,
                "risk": job.risk,
            })).collect::<Vec<_>>(),
            "recruitment": state.recruitment.pending_recruits.iter().enumerate().map(|(index, job)| json!({
                "id": format!("recruitment:{}", index + 1),
                "remainingSeconds": round(job.remaining_seconds),
                "totalSeconds": round(job.total_seconds),
            })).collect::<Vec<_>>(),
            "combat": state.active_combat.as_ref().map(|job| json!({
                "creatureId": job.creature_id,
                "locationKey": job.location_key,
                "round": job.round,
                "remainingSeconds": round(job.round_timer),
            })),
        },
        "crew": {
            "heroAssigned": state.roster.hero_assigned,
            "heroRoleId": state.roster.hero_role_id,
            "totalCrew": state.roster.total_crew,
            "crewByRole": state.roster.crew_by_role,
        },
        "hero": {
            "progress": {
                "drummer": { "level": state.hero_progress.drummer_level, "xp": round(state.hero_progress.drummer_xp) },
                "vocalist": { "level": state.hero_progress.vocalist_level, "xp": round(state.hero_progress.vocalist_xp) },
                "synth": { "level": state.hero_progress.synth_level, "xp": round(state.hero_progress.synth_xp) },
            },
            "survival": state.hero_survival,
            "inventory": state.inventory,
            "acquiredPerks": state.acquired_perks,
        },
        "story": {
            "activeBeatId": state.narrative.active_beat_id,
            "completedBeatIds": state.narrative.completed_beat_ids,
            "choiceByBeat": state.narrative.choice_by_beat,
            "qualities": state.narrative.qualities,
        },
        "map": {
            "heroCell": format!("{}:{}", state.hero_map.q, state.hero_map.r),
            "discoveredCells": state.discovered_cells.iter().map(|cell| format!("{}:{}", cell.q, cell.r)).collect::<Vec<_>>(),
            "hexCount": state.hexes.len(),
            "bubble": state.bubble,
            "objectives": state.objectives,
        },
        "catalog": {
            "schemaVersion": state.schema_version,
            "catalogVersion": state.catalog_version,
            "contentValidationVersion": "content_authoring_model_v1",
            "counts": counts,
            "contentIds": content_ids,
        },
    })
}

fn available_commands(state: &GameState) -> Vec<Value> {
    let mut commands = Vec::new();
    if let Some(beat_id) = state.narrative.active_beat_id.as_deref()
        && let Some(beat) = game_data::story_beat_def(beat_id)
    {
        let choice_pending = !state.narrative.choice_by_beat.contains_key(beat_id);
        for choice in beat.choices {
            let reason = (!choice_pending)
                .then(|| "A choice has already been made for this story beat.".to_string());
            commands.push(command(
                &format!("story-choice:{beat_id}:{}", choice.id),
                "story_choice",
                choice.label,
                reason,
                json!({ "kind": "choose_story_option", "beatId": beat_id, "optionId": choice.id }),
                vec![beat_id, choice.id],
            ));
        }
    }
    for action in game_data::world_actions() {
        let reason = world_action_reason(state, action);
        commands.push(command(
            &format!("world-action:{}", action.id),
            "world_action",
            action.label,
            reason,
            json!({ "kind": "start_world_action", "actionId": action.id }),
            vec![action.id],
        ));
    }
    for option in game_data::construction_options() {
        let reason = construction_reason(state, option);
        commands.push(command(
            &format!("construction:{}", option.id),
            "construction",
            option.label,
            reason,
            json!({ "kind": "start_construction", "optionId": option.id }),
            vec![option.id],
        ));
    }
    let recruitment_reason = if !state.objectives.recruitment_enabled {
        Some("Recruitment opens when Survivor Cave is inside Bubble reach.".to_string())
    } else if !state.base.studio_restored {
        Some("Recruitment requires The Studio to be restored.".to_string())
    } else if !state.base.fire_pit_built {
        Some("Recruitment requires a built Fire Pit.".to_string())
    } else if state.resources.vibes < state.recruitment.next_recruit_cost {
        Some(format!(
            "Need {:.0} Vibes.",
            state.recruitment.next_recruit_cost
        ))
    } else {
        None
    };
    commands.push(command(
        "recruitment:survivor-cave",
        "recruitment",
        "Recruit survivor",
        recruitment_reason,
        json!({ "kind": "recruit_from_survivor_cave" }),
        vec!["objective.recruitment", game_data::RESOURCE_VIBES],
    ));
    for (id, seconds, label) in [
        ("wait:60", 60.0, "Wait 1 minute"),
        ("wait:120", 120.0, "Wait 2 minutes"),
    ] {
        commands.push(command(
            id,
            "wait",
            label,
            None::<String>,
            json!({ "kind": "tick", "seconds": seconds }),
            Vec::new(),
        ));
    }
    let hero_assignment = if state.hero_survival.forced_return.is_some() {
        Some("Hero cannot be assigned during forced return or recovery.".to_string())
    } else {
        None
    };
    commands.push(command(
        if state.roster.hero_assigned {
            "base:hero:unassign"
        } else {
            "base:hero:assign"
        },
        "base_assignment",
        if state.roster.hero_assigned {
            "Unassign Hero"
        } else {
            "Assign Hero"
        },
        hero_assignment,
        json!({ "kind": "assign_hero", "assigned": !state.roster.hero_assigned }),
        vec!["hero"],
    ));
    commands
}

fn command(
    id: &str,
    kind: &str,
    label: &str,
    reason: Option<String>,
    command: Value,
    related_ids: Vec<&str>,
) -> Value {
    json!({
        "id": id,
        "kind": kind,
        "label": label,
        "enabled": reason.is_none(),
        "whyUnavailable": reason,
        "command": command,
        "relatedIds": related_ids,
    })
}

fn world_action_reason(state: &GameState, action: &game_data::WorldActionDef) -> Option<String> {
    if state.hero_survival.forced_return.is_some() {
        return Some(
            "Hero is not ready for world actions while survival lock is active.".to_string(),
        );
    }
    if state.active_world_action.is_some() {
        return Some("A world action is already in progress.".to_string());
    }
    if action.hero_only && !state.roster.hero_assigned {
        return Some("Assign the Hero before starting this action.".to_string());
    }
    if action.hero_exposure == game_data::HeroExposureDef::Bubble
        && state.hero_survival.location == HeroLocationState::OutsideBubble
    {
        return Some("Hero must be back inside the bubble.".to_string());
    }
    if let Some(reason) = story_action_reason(state, action.id) {
        return Some(reason);
    }
    requirement_reason(state, action.requirements)
}

fn story_action_reason(state: &GameState, action_id: &str) -> Option<String> {
    let beat_id = state.narrative.active_beat_id.as_deref()?;
    let beat = game_data::story_beat_def(beat_id)?;
    match beat.world_action_id {
        Some(required)
            if required == action_id
                && !beat.choices.is_empty()
                && !state.narrative.choice_by_beat.contains_key(beat_id) =>
        {
            Some(format!(
                "Choose how to approach {} before starting it.",
                beat.label
            ))
        }
        Some(required) if required == action_id => None,
        Some(_) | None if beat.blocks_unrelated_world_actions => Some(format!(
            "Finish {} before starting a different world action.",
            beat.label
        )),
        _ => None,
    }
}

fn construction_reason(
    state: &GameState,
    option: &game_data::ConstructionOptionDef,
) -> Option<String> {
    if state.active_construction.is_some() {
        return Some("Construction is already in progress.".to_string());
    }
    if let Some(reason) = requirement_reason(state, option.requirements) {
        return Some(reason);
    }
    cost_reason(state, option.cost)
}

fn cost_reason(state: &GameState, cost: CostDef) -> Option<String> {
    match cost {
        CostDef::TimeOnly => None,
        CostDef::Upfront {
            resource_id,
            amount,
        }
        | CostDef::DrainPerWorkerSecond {
            resource_id,
            amount,
        } if resource_value(state, resource_id) < amount => {
            Some(format!("Need {:.0} {}.", amount, resource_id))
        }
        CostDef::Upfront { .. } | CostDef::DrainPerWorkerSecond { .. } => None,
        CostDef::UpfrontBundle { costs } => costs
            .iter()
            .find(|item| cost_item_value(state, item.item_id) < item.amount)
            .map(|item| format!("Need {:.0} {}.", item.amount, item.item_id)),
    }
}

fn requirement_reason(state: &GameState, requirements: &[RequirementDef]) -> Option<String> {
    requirements
        .iter()
        .find_map(|requirement| match requirement {
            RequirementDef::FlagSet(flag) if !flag_value(state, flag) => {
                Some(format!("Requires {flag}."))
            }
            RequirementDef::FlagUnset(flag) if flag_value(state, flag) => {
                Some(format!("Blocked while {flag} is already set."))
            }
            _ => None,
        })
}

fn flag_value(state: &GameState, flag: &str) -> bool {
    match flag {
        game_data::FLAG_BASE_STUDIO_RESTORE_UNLOCKED => state.base.studio_restore_unlocked,
        game_data::FLAG_BASE_STUDIO_RESTORED => state.base.studio_restored,
        game_data::FLAG_BASE_FIRE_PIT_BUILT => state.base.fire_pit_built,
        game_data::FLAG_BASE_RESONANCE_CHAMBER_BUILT => state.base.resonance_chamber_built,
        game_data::FLAG_BASE_MIX_CONSOLE_BUILT => state.base.mix_console_built,
        game_data::FLAG_BASE_WORKSHOP_BUILT => state.base.workshop_built,
        game_data::FLAG_BASE_RESEARCH_BOOTH_BUILT => state.base.research_booth_built,
        game_data::FLAG_BASE_TUTORIAL_INVESTIGATED => state.base.tutorial_investigated,
        game_data::FLAG_BASE_TUTORIAL_EXPLORED => state.base.tutorial_explored,
        game_data::FLAG_BASE_WATER_COLLECTION_UNLOCKED => state.base.water_collection_unlocked,
        game_data::FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED => {
            state.crystal_circle.removing_moss_unlocked
        }
        game_data::FLAG_CRYSTAL_REMOVING_MOSS_COMPLETED => {
            state.crystal_circle.removing_moss_completed
        }
        game_data::FLAG_HERO_OUTSIDE_BUBBLE => {
            state.hero_survival.location == HeroLocationState::OutsideBubble
        }
        game_data::FLAG_HERO_FORCED_RETURN_ACTIVE => state.hero_survival.forced_return.is_some(),
        game_data::FLAG_HERO_RECOVERING_AT_STUDIO => state
            .hero_survival
            .forced_return
            .as_ref()
            .is_some_and(|return_state| {
                matches!(return_state.phase, ForcedReturnPhase::RecoverAtStudio)
            }),
        _ => false,
    }
}

fn resource_values(state: &GameState, id: &str) -> (f64, f64) {
    match id {
        game_data::RESOURCE_BASSLINE => (state.resources.bassline, state.resources.bassline_cap),
        game_data::RESOURCE_CHORUS => (state.resources.chorus, state.resources.chorus_cap),
        game_data::RESOURCE_HARMONICS => (state.resources.harmonics, state.resources.harmonics_cap),
        game_data::RESOURCE_STONE => (state.resources.stone, state.resources.stone_cap),
        game_data::RESOURCE_WATER => (state.resources.water, state.resources.water_cap),
        game_data::RESOURCE_VIBES => (state.resources.vibes, state.resources.vibes_cap),
        _ => (0.0, 0.0),
    }
}

fn resource_value(state: &GameState, id: &str) -> f64 {
    resource_values(state, id).0
}

fn cost_item_value(state: &GameState, id: &str) -> f64 {
    if id == game_data::COST_ITEM_SKIN {
        f64::from(state.base.skins)
    } else {
        resource_value(state, id)
    }
}

fn next_action(
    state: &GameState,
    commands: &[Value],
) -> (&'static str, String, Option<String>, bool) {
    let Some(active_id) = state.narrative.active_beat_id.as_deref() else {
        return (
            "Wait",
            "No active story beat; inspect available commands.".to_string(),
            None,
            true,
        );
    };
    let Some(beat) = game_data::story_beat_def(active_id) else {
        return (
            "Wait",
            "The active story beat is not in the loaded catalog.".to_string(),
            None,
            false,
        );
    };
    if let Some(choice) = beat
        .choices
        .iter()
        .find(|_| !state.narrative.choice_by_beat.contains_key(active_id))
    {
        let id = format!("story-choice:{active_id}:{}", choice.id);
        let enabled = commands
            .iter()
            .find(|command| command["id"] == id)
            .and_then(|command| command["enabled"].as_bool())
            .unwrap_or(false);
        return (
            choice.label,
            "Choose a story option to continue.".to_string(),
            Some(id),
            enabled,
        );
    }
    if let Some(action_id) = beat.world_action_id {
        let id = format!("world-action:{action_id}");
        let command = commands.iter().find(|command| command["id"] == id);
        return (
            game_data::world_action_def(action_id).map_or("World action", |action| action.label),
            "Complete the active world action.".to_string(),
            Some(id),
            command
                .and_then(|item| item["enabled"].as_bool())
                .unwrap_or(false),
        );
    }
    (
        "Wait",
        "The runtime will select the next story beat after the current one resolves.".to_string(),
        None,
        true,
    )
}

fn story_blocker(state: &GameState) -> (&'static str, String, String, Vec<String>) {
    let Some(active_id) = state.narrative.active_beat_id.as_deref() else {
        return (
            "none",
            "No story blocker".to_string(),
            "No active story beat.".to_string(),
            Vec::new(),
        );
    };
    let Some(beat) = game_data::story_beat_def(active_id) else {
        return (
            "catalog",
            "Unknown story beat".to_string(),
            "The active beat is missing from the catalog.".to_string(),
            vec![active_id.to_string()],
        );
    };
    if !beat.choices.is_empty() && !state.narrative.choice_by_beat.contains_key(active_id) {
        return (
            "choice_required",
            "Story choice required".to_string(),
            format!("Choose how to approach {}.", beat.label),
            vec![active_id.to_string()],
        );
    }
    if beat.world_action_id.is_some() && state.active_world_action.is_none() {
        return (
            "action_required",
            "Story action required".to_string(),
            format!("Complete {}.", beat.label),
            vec![active_id.to_string()],
        );
    }
    (
        "none",
        "No story blocker".to_string(),
        "The story layer is not currently blocking an action.".to_string(),
        Vec::new(),
    )
}

fn round(value: f64) -> f64 {
    (value * 1_000_000.0).round() / 1_000_000.0
}
