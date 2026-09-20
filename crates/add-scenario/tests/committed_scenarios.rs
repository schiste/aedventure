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

/// The ink-backed beat runs headlessly: the scene is rendered from the
/// compiled `.ink`, and taking a presented choice applies the authored
/// effects, so a narrative bug reproduces without a browser.
#[test]
fn ink_first_glimpse_runs_headlessly() {
    let run = run_scenario_file(&repo_path("scenarios/add/narrative/ink-first-glimpse.json"))
        .expect("committed ink scenario should pass");
    assert_eq!(run.scenario_id, "ink-first-glimpse");
    assert_eq!(run.command_count, 2);
    assert_eq!(run.checkpoints_passed, 2);

    let narrative = &run.final_snapshot["narrative"];
    assert_eq!(
        narrative["choiceByBeat"]["story.beat.first_glimpse"],
        "story.choice.glimpse.watch_lights",
        "the ink choice applied its authored choice id",
    );
    assert!(
        narrative["completedBeatIds"]
            .as_array()
            .expect("completed beats")
            .iter()
            .any(|id| id == "story.beat.first_glimpse"),
        "the ink-backed beat completed",
    );
    // Ink state never reaches the save; the scene is rebuilt by replay.
    assert!(!run.final_save.contains("currentFlowName"));
}

/// N3 acceptance: one dialogue act and one gameplay act each reach an
/// individual, a peer in the same crew, and a stranger elsewhere in the
/// faction — at three different strengths, from one log, with nothing stored.
#[test]
fn standing_reaches_three_distances_from_the_log() {
    use add_core::narrative::{Axis, Band};

    let run = run_scenario_file(&repo_path("scenarios/add/narrative/standing-three-distances.json"))
        .expect("committed standing scenario should pass");
    assert_eq!(run.checkpoints_passed, 3);

    let state = add_core::import_save(&run.final_save).expect("save loads");
    let log = &state.narrative.log;

    // The dialogue act: generosity toward Vell.
    let target = log.standing("entity.vell", Axis::Goodwill);
    let peer = log.standing("entity.joren", Axis::Goodwill);
    let stranger = log.standing("entity.sleepless", Axis::Goodwill);
    assert!(
        target > peer && peer > stranger && stranger >= 0.0,
        "goodwill should fall off with distance: {target} / {peer} / {stranger}",
    );

    // The gameplay act: competence spreads the same way.
    let competence_target = log.standing("entity.vell", Axis::Competence);
    let competence_faction = log.standing("entity.sleepless", Axis::Competence);
    assert!(
        competence_target > competence_faction && competence_faction > 0.0,
        "competence should reach the faction weakly: {competence_target} / {competence_faction}",
    );

    // The broken promise landed on Joren, not on Vell.
    assert!(
        log.standing("entity.joren", Axis::Integrity) < 0.0,
        "the promise was broken to Joren",
    );
    assert_eq!(
        log.band("entity.vell", Axis::Integrity),
        Band::Mid,
        "Vell has no reason to doubt the Hero's word",
    );

    // Nothing is stored: the save carries events, not scores.
    assert!(run.final_save.contains("\"events\""));
    assert!(!run.final_save.contains("\"goodwill\":"));
}
