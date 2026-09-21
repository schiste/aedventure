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
///
/// The acts are public so this isolates *reach*. Since N4, reach and knowledge
/// are independent: `broken-promise-witnessed` / `-secret` cover the other
/// half, where the same act costs everything or nothing depending on who saw.
#[test]
fn standing_reaches_three_distances_from_the_log() {
    use add_core::narrative::{Axis, Band};

    let run = run_scenario_file(&repo_path("scenarios/add/narrative/standing-three-distances.json"))
        .expect("committed standing scenario should pass");
    assert_eq!(run.checkpoints_passed, 3);

    let state = add_core::import_save(&run.final_save).expect("save loads");
    let log = &state.narrative.log;
    let now = state.clock_seconds;

    // The dialogue act: generosity toward Vell.
    let target = log.standing("entity.vell", Axis::Goodwill, now);
    let peer = log.standing("entity.joren", Axis::Goodwill, now);
    let stranger = log.standing("entity.sleepless", Axis::Goodwill, now);
    assert!(
        target > peer && peer > stranger && stranger >= 0.0,
        "goodwill should fall off with distance: {target} / {peer} / {stranger}",
    );

    // The gameplay act: competence spreads the same way.
    let competence_target = log.standing("entity.vell", Axis::Competence, now);
    let competence_faction = log.standing("entity.sleepless", Axis::Competence, now);
    assert!(
        competence_target > competence_faction && competence_faction > 0.0,
        "competence should reach the faction weakly: {competence_target} / {competence_faction}",
    );

    // The broken promise landed on Joren, not on Vell.
    assert!(
        log.standing("entity.joren", Axis::Integrity, now) < 0.0,
        "the promise was broken to Joren",
    );
    assert_eq!(
        log.band("entity.vell", Axis::Integrity, now),
        Band::Mid,
        "Vell has no reason to doubt the Hero's word",
    );

    // Nothing is stored: the save carries events, not scores.
    assert!(run.final_save.contains("\"events\""));
    assert!(!run.final_save.contains("\"goodwill\":"));
}

/// N4 acceptance: a committed pair differing only in whether anyone saw it.
/// The secret costs nothing; the witnessed one costs the Hero his word, and a
/// crewmate who only heard about it reacts measurably more weakly.
#[test]
fn witnessed_and_secret_promises_diverge() {
    use add_core::narrative::Axis;

    let witnessed = run_scenario_file(&repo_path("scenarios/add/narrative/broken-promise-witnessed.json"))
        .expect("witnessed scenario should pass");
    let secret = run_scenario_file(&repo_path("scenarios/add/narrative/broken-promise-secret.json"))
        .expect("secret scenario should pass");

    let seen = add_core::import_save(&witnessed.final_save).expect("save loads");
    let unseen = add_core::import_save(&secret.final_save).expect("save loads");
    let now = seen.clock_seconds;

    let seen_integrity = seen.narrative.log.standing("entity.vell", Axis::Integrity, now);
    let unseen_integrity = unseen.narrative.log.standing("entity.vell", Axis::Integrity, now);

    assert!(seen_integrity < 0.0, "a witnessed broken promise should cost: {seen_integrity}");
    assert_eq!(
        unseen_integrity, 0.0,
        "an unwitnessed one should cost nothing at all: {unseen_integrity}",
    );

    // Since N5 the witnessed run produces MORE than the secret one: Vell
    // hears, and denounces the Hero to his crew. The secret run produces
    // nothing further, because nobody has anything to react to.
    assert!(
        seen.narrative.log.events.len() > unseen.narrative.log.events.len(),
        "a witnessed betrayal should provoke a reaction the secret one cannot",
    );
    assert!(
        seen.narrative
            .log
            .fired_reactions
            .iter()
            .any(|fired| fired.reaction_id == "reaction.vell_denounces_a_broken_promise"),
        "Vell should have denounced the broken promise",
    );
    assert!(
        unseen.narrative.log.fired_reactions.is_empty(),
        "nothing can react to what nobody knows",
    );

    // Nobody can have heard what nobody saw.
    assert!(!unseen.narrative.log.knowledge.anyone_knows("entity.sleepless", 0));
}

/// N5 acceptance: mercy_repaid is detected from a committed run, the arc names
/// who filled its slot, and the causal link is what made it an arc rather than
/// two unrelated things that happened.
#[test]
fn mercy_repaid_is_detected_and_names_its_subject() {
    let run = run_scenario_file(&repo_path("scenarios/add/narrative/arc-mercy-repaid.json"))
        .expect("committed arc scenario should pass");
    let state = add_core::import_save(&run.final_save).expect("save loads");

    assert!(
        state.narrative.arcs.matched("arc.mercy_repaid"),
        "the arc should be recognised: {:?}",
        state.narrative.arcs,
    );
    assert_eq!(
        state.narrative.arcs.role("arc.mercy_repaid", "x"),
        Some("entity.vell"),
        "dialogue needs to be able to name who repaid the mercy",
    );

    // The aid names the mercy among its causes. Without that link the sifter
    // would see two acts, not an arc.
    let aid = state
        .narrative
        .log
        .events
        .iter()
        .find(|event| event.act_id == "act.aid_the_hero")
        .expect("the aid was logged");
    assert!(aid.causes.contains(&0), "the aid should name the mercy: {:?}", aid.causes);
}

/// N6 acceptance: a cast follows the history the player actually built. The
/// scenario wrongs one specific survivor; the caster must then lead with that
/// survivor rather than with whoever the catalog happens to list first.
#[test]
fn casting_leads_with_the_person_the_player_has_history_with() {
    let run = run_scenario_file(&repo_path(
        "scenarios/add/narrative/storylet-cast-follows-history.json",
    ))
    .expect("committed casting scenario should pass");
    let state = add_core::import_save(&run.final_save).expect("save loads");

    let available = add_core::narrative::castable_entities();
    let casting = add_core::narrative::cast(
        &state.narrative.log,
        &state.narrative.arcs,
        &state.narrative.cast_history,
        &available,
        state.clock_seconds,
    );

    assert_eq!(
        casting.roles.first().map(String::as_str),
        Some("entity.joren"),
        "the wronged survivor should lead the cast, not the catalog's first entry: {casting:?}",
    );
    assert!(
        add_core::narrative::all_knots().contains(&casting.knot.as_str()),
        "the cast knot must exist in ink or the hub stalls: {}",
        casting.knot,
    );
}
