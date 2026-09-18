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
}

#[test]
fn committed_offline_return_scenario_matches_the_core_contract() {
    let run = run_scenario_file(&repo_path("scenarios/add/offline-return.json"))
        .expect("committed offline scenario should pass");
    assert_eq!(run.scenario_id, "offline-return");
    assert_eq!(run.command_count, 2);
    assert_eq!(run.checkpoints_passed, 3);
}
