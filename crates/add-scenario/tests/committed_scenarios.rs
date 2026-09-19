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
    assert_eq!(run.command_count, 14);
    assert_eq!(run.checkpoints_passed, 6);
    assert_eq!(run.final_agent_runtime["contract"], "agent_runtime_v1");
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
        "checkpoint:idle-base-first-cycle:new-run-map-and-story"
    );
    assert!(
        run.final_agent_runtime["derived"]["availableCommands"]
            .as_array()
            .is_some_and(|commands| !commands.is_empty())
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
    assert!(run.final_agent_runtime["derived"]["blockers"].is_array());
}
