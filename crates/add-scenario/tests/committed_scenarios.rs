use add_scenario::run_scenario_file;
use std::path::PathBuf;

fn repo_path(relative: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .join(relative)
}

#[test]
fn committed_idle_loop_scenario_matches_the_core_contract() {
    let run = run_scenario_file(&repo_path("scenarios/add/idle-base-first-cycle.json"))
        .expect("committed idle scenario should pass");
    assert_eq!(run.scenario_id, "idle-base-first-cycle");
    assert_eq!(run.command_count, 26);
    assert_eq!(run.checkpoints_passed, 10);
    assert_eq!(run.final_agent_runtime["contract"], "agent_runtime_v1");
    assert_eq!(run.final_agent_runtime["schemaVersion"], 1);
    assert_eq!(run.final_agent_runtime["catalogVersion"], 1);
    assert_eq!(run.final_agent_runtime["reportVersion"], 1);
    assert_eq!(
        run.final_agent_runtime["runtime"]["source"],
        "headless-add-core"
    );
    assert_eq!(
        run.final_agent_runtime["authoritative"]["entities"]["heroId"],
        "entity:hero"
    );
    assert_eq!(
        run.checkpoint_ids[0],
        "checkpoint:idle-base-first-cycle:travel-started"
    );
    assert_eq!(
        run.checkpoint_ids.last().map(String::as_str),
        Some("checkpoint:idle-base-first-cycle:save-round-trip-stable")
    );
    let replay = serde_json::to_value(&run.replay_commands).expect("scenario replay serializes");
    let command_types = replay
        .as_array()
        .expect("scenario replay is an array")
        .iter()
        .map(|command| command["type"].as_str().expect("command has a type"))
        .collect::<Vec<_>>();
    assert_eq!(
        &command_types[..6],
        [
            "MoveHeroTo",
            "MoveHeroTo",
            "MoveHeroTo",
            "MoveHeroTo",
            "MoveHeroTo",
            "MoveHeroTo"
        ]
    );
    assert!(!command_types.contains(&"CompletePreArrivalRoute"));
    assert!(command_types.contains(&"SetRoleCrew"));
    assert!(command_types.contains(&"RunOfflineCatchup"));
    assert_eq!(
        run.final_snapshot["heroMap"],
        serde_json::json!({ "q": 0, "r": 3 })
    );
    assert_eq!(run.final_snapshot["clockSeconds"], 3702.0);
    assert_eq!(run.final_snapshot["base"]["studioRestored"], true);
    assert!(
        run.final_snapshot["resources"]["bassline"]
            .as_f64()
            .is_some_and(|bassline| bassline > 0.0)
    );
    assert_eq!(
        run.final_snapshot["roster"]["crewByRole"]["role.scavenge"],
        1
    );
    assert_eq!(
        run.final_snapshot["roster"]["crewByRole"]["role.construction"],
        1
    );
    assert!(
        run.final_agent_runtime["derived"]["availableCommands"]
            .as_array()
            .is_some_and(|commands| !commands.is_empty())
    );
    let report = run.report_value();
    assert_eq!(report["agentRuntime"], run.final_agent_runtime);
    assert!(
        report["agentRuntimeText"]
            .as_str()
            .is_some_and(|text| text.contains("runtime ready"))
    );
}

#[test]
fn committed_offline_return_scenario_matches_the_core_contract() {
    let run = run_scenario_file(&repo_path("scenarios/add/offline-return.json"))
        .expect("committed offline scenario should pass");
    assert_eq!(run.scenario_id, "offline-return");
    assert_eq!(run.command_count, 2);
    assert_eq!(run.checkpoints_passed, 3);
    assert_eq!(
        run.final_agent_runtime["authoritative"]["currentTime"]["seconds"],
        3642.0
    );
    assert_eq!(run.final_agent_runtime["catalogVersion"], 1);
    assert_eq!(run.final_agent_runtime["reportVersion"], 1);
    assert!(run.final_agent_runtime["derived"]["blockers"].is_array());
}
