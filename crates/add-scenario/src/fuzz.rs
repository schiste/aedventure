//! Policy-driven playthroughs over the authored story.
//!
//! Tools before content (N2 of the narrative plan): the fuzzer exists so the
//! story can be grown without growing the number of ways it can silently
//! break. It drives `add-core` directly, so a run costs microseconds and ten
//! thousand of them are a CI step rather than an overnight job.
//!
//! What it looks for:
//!
//! - a run that errors, or that stalls with a beat still active and nothing
//!   left to do (a dead end);
//! - authored content nothing ever reaches — a story beat never activated, a
//!   choice never taken, an ink knot never entered.
//!
//! Pure random play under-explores: it takes the first choice as often as the
//! last and never persists with either. The policies below rotate so that
//! ordering-sensitive content is reached too.

use std::collections::{BTreeMap, BTreeSet};

use add_core::game_data::{
    ROLE_CONSTRUCTION, ROLE_CRYSTAL_BASSLINE, ROLE_FIRE_PIT, ROLE_SCAVENGE,
};
use add_core::{GameCommand, GameState, Simulation, export_save, import_save, story_beats};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

/// How a run picks among the choices a beat presents.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Policy {
    /// Seeded uniform pick. The baseline.
    Uniform,
    /// Always the first presented choice.
    First,
    /// Always the last presented choice.
    Last,
    /// Prefer whichever choice this run has taken least often. Reaches content
    /// behind an unpopular branch that uniform play keeps missing.
    Novelty,
    /// Emit acts that push one axis up, and `Drag` down. §5A's "maximize one
    /// axis toward one faction, minimize it".
    ///
    /// Without these, an axis moved equally in both directions by different acts
    /// reads as dead: uniform play fires the opposing acts about as often as
    /// each other and they cancel, so `dominance` sat in `mid` for four fifths
    /// of the cast while being moved a full tier each way. A player is
    /// consistent; random play is not, and only a directed policy tells the
    /// difference between "nothing moves this" and "nothing moves this *on
    /// average*".
    Push,
    Drag,
}

impl Policy {
    pub const ALL: [Policy; 6] = [
        Policy::Uniform,
        Policy::First,
        Policy::Last,
        Policy::Novelty,
        Policy::Push,
        Policy::Drag,
    ];

    /// Which way this policy wants the axis it is working on to move, if it
    /// cares at all.
    /// Which way this policy wants its axis to move, for callers outside this
    /// module that emit acts on its behalf.
    pub fn act_direction(self) -> Option<i64> {
        self.direction()
    }

    /// Does this policy aim at an axis rather than play the content?
    pub fn is_directed(self) -> bool {
        self.direction().is_some()
    }

    fn direction(self) -> Option<i64> {
        match self {
            Policy::Push => Some(1),
            Policy::Drag => Some(-1),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Policy::Uniform => "uniform",
            Policy::First => "first",
            Policy::Last => "last",
            Policy::Novelty => "novelty",
            Policy::Push => "push",
            Policy::Drag => "drag",
        }
    }
}

/// Why a single run stopped.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "kind", content = "detail")]
pub enum RunOutcome {
    /// The story ran out of active beats: a clean finish.
    Exhausted,
    /// The step budget ran out with the story still progressing. Not a fault.
    BudgetReached,
    /// A beat stayed active and its choices changed nothing. A real fault:
    /// the player would be stuck looking at it.
    DeadEnd(String),
    /// A command produced a rejection the run could not route around.
    Rejected(String),
}

/// One playthrough.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FuzzRun {
    pub seed: u64,
    pub policy: Policy,
    pub steps: usize,
    pub outcome: RunOutcome,
    /// The commands taken, so a failure replays exactly.
    pub commands: Vec<Value>,
}

impl FuzzRun {
    pub fn failed(&self) -> bool {
        matches!(self.outcome, RunOutcome::DeadEnd(_) | RunOutcome::Rejected(_))
    }
}

/// What the whole campaign reached.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Coverage {
    pub beats_seen: BTreeSet<String>,
    pub choices_taken: BTreeSet<String>,
    pub ink_knots_entered: BTreeSet<String>,
    /// Distinct castings, as `storylet.id -> role+role`. A storylet is only
    /// worth its authoring cost if it produces many of these from one knot,
    /// so the count is the measure of the multiplier §8 promises.
    pub storylet_casts: BTreeSet<String>,
    pub acts_emitted: BTreeSet<String>,
    pub patterns_matched: BTreeSet<String>,
}

/// The campaign result, shaped for `--json` consumption.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FuzzReport {
    pub contract: &'static str,
    pub runs: usize,
    pub failures: Vec<FuzzRun>,
    pub coverage: Coverage,
    pub beats_never_seen: Vec<String>,
    pub choices_never_taken: Vec<String>,
    pub ink_knots_never_entered: Vec<String>,
    pub storylets_never_cast: Vec<String>,
    pub acts_never_emitted: Vec<String>,
    pub patterns_never_matched: Vec<String>,
    /// Axes no act in the catalog moves. A static hole: standing the writer can
    /// ask about but nothing in the game can ever change.
    pub axes_no_act_moves: Vec<String>,
    /// Distinct casts per storylet, the multiplier made visible.
    pub casts_per_storylet: BTreeMap<String, usize>,
    pub outcomes: BTreeMap<String, usize>,
    pub status: &'static str,
}

impl FuzzReport {
    pub fn ok(&self) -> bool {
        self.failures.is_empty()
    }

    pub fn to_value(&self) -> Value {
        serde_json::to_value(self).unwrap_or_else(|_| json!({"status": "unserializable"}))
    }
}

/// Splitmix64: a small seeded generator so a run is reproducible from its
/// seed alone. Deliberately not the simulation's own stream, which belongs to
/// gameplay; this one only picks which choice the fuzzer takes.
struct Rng(u64);

impl Rng {
    fn next(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }

    fn below(&mut self, bound: usize) -> usize {
        if bound == 0 { 0 } else { (self.next() % bound as u64) as usize }
    }
}

/// Run one playthrough under one policy.
/// The longest a single tick may be while a world action is running.
///
/// World actions take seconds — exploring the ruin takes ten — and the hero is
/// outside the bubble for the whole of it. Advancing time in one coarse jump
/// processes that entire span of exposure at once, which trips the point of no
/// return and cancels the action before it can finish. The fuzzer was ticking
/// thirty seconds at a time and so could never complete `world_action.
/// explore_base`: it stalled on that beat forever and never saw the six beats
/// behind it, which is what `beatsNeverSeen` had been reporting all along.
///
/// A player at normal speed never hits this, because the runtime ticks far
/// finer than the action is long.
const MAX_TICK_WITH_ACTION_SECONDS: f64 = 5.0;

/// Is this beat the end of its arc rather than a stall?
///
/// A beat with no choices, no world action and nothing that completes it is
/// where an arc finishes: `story.beat.stabilize_base` is the end of the first
/// playable arc and is meant to stay active. Reading that as a dead end only
/// became possible once runs got far enough to reach it, and it would have
/// failed every campaign for a beat that is behaving exactly as authored.
fn is_arc_terminus(beat_id: &str) -> bool {
    add_core::story_beat_def(beat_id).is_some_and(|beat| {
        beat.choices.is_empty()
            && beat.world_action_id.is_none()
            && beat.auto_complete_when.is_empty()
    })
}

/// Work the base loop: put idle crew to work, and build what is affordable.
///
/// The story spine stops being playable at `story.beat.restore_studio`, which
/// waits on a construction project costing 600 stone and needing a crew to work
/// it. A driver that only takes story choices and world actions can never
/// satisfy that, so every run stalled there and the five beats behind it stayed
/// unreached — `beatsNeverSeen` had been naming them the whole time.
///
/// Deliberately simple and not a strategy: crew go to scavenge for the stone
/// every early project is priced in, and to construction while something is
/// being built. The point is to reach content, not to play well.
fn work_the_base_loop(simulation: &mut Simulation) -> Vec<Value> {
    let mut commands = Vec::new();
    let state = simulation.state();
    let crew = state.roster.total_crew;
    if crew == 0 {
        return commands;
    }

    let building = state.active_construction.is_some();

    // Where the crew should be, given what the spine is waiting for.
    //
    // A single post at a time, because there are two of them to start with and
    // splitting them makes every step slower without unlocking anything sooner.
    // The order is the dependency chain: a project needs hands, recruiting
    // needs the bubble to reach the Survivor Cave and the bubble grows from
    // stored bassline, recruiting itself is paid in vibes from the fire pit,
    // and stone is what everything else is priced in.
    // Whether the spine is currently waiting on something to be built.
    //
    // This cannot key off the recruiting beat being active, which is what it
    // did first: that beat's own precondition is that recruitment is enabled,
    // and recruitment is enabled by the bubble reaching the cave — so waiting
    // for the beat before growing the bubble waits forever.
    let waiting_on_a_build = state
        .narrative
        .active_beat_id
        .as_deref()
        .and_then(add_core::game_data::story_beat_def)
        .and_then(|beat| beat.progression.as_ref())
        .and_then(|progression| progression.primary_action.as_ref())
        .is_some_and(|action| {
            matches!(action, add_core::game_data::StoryPrimaryActionDef::Construction { .. })
        });

    let waiting_to_recruit = matches!(
        state
            .narrative
            .active_beat_id
            .as_deref()
            .and_then(add_core::game_data::story_beat_def)
            .and_then(|beat| beat.progression.as_ref())
            .and_then(|progression| progression.primary_action.as_ref()),
        Some(add_core::game_data::StoryPrimaryActionDef::RecruitFromSurvivorCave { .. })
    );

    let post = if building {
        ROLE_CONSTRUCTION
    } else if waiting_on_a_build {
        // Everything early is priced in stone.
        ROLE_SCAVENGE
    } else if waiting_to_recruit && state.objectives.recruitment_enabled {
        // The cave is in reach, so what is missing is the vibes it costs.
        ROLE_FIRE_PIT
    } else {
        // Otherwise grow the field. Recruiting needs the bubble to reach the
        // cave, and `story.beat.await_survivor_arrival` then waits for it to
        // reach three — so parking the crew on the fire pit the moment
        // recruiting became possible stopped the bubble growing and the beat
        // after it never completed.
        ROLE_CRYSTAL_BASSLINE
    };

    let posts = [ROLE_CONSTRUCTION, ROLE_SCAVENGE, ROLE_CRYSTAL_BASSLINE, ROLE_FIRE_PIT];
    let already = state.roster.crew_by_role.get(post).copied().unwrap_or(0);
    if already != crew {
        // Free them first. Crew cannot be in two places, so assigning while
        // they are still posted elsewhere is refused for exceeding what is
        // available — which is why this loop reassigned on every single step
        // and never actually moved anybody.
        let mut assign = |simulation: &mut Simulation, role_id: &str, count: u8| {
            if simulation
                .apply(GameCommand::SetRoleCrew {
                    role_id: role_id.to_string(),
                    crew: count,
                })
                .accepted
            {
                commands.push(json!({ "type": "SetRoleCrew", "roleId": role_id, "crew": count }));
            }
        };
        for other in posts.iter().filter(|role| **role != post) {
            assign(simulation, other, 0);
        }
        assign(simulation, post, crew);
    }

    // Start what the story is waiting on, before anything else.
    //
    // Only one project runs at a time, so picking the first affordable option
    // can block the one that matters: `construction.slot_capacity` is priced in
    // bassline, nothing here produces bassline, and it sat at zero progress
    // forever while `story.beat.restore_studio` waited behind it. Base projects
    // are the ones the spine is gated on, so they go first.
    if simulation.state().active_construction.is_none() {
        // Only what the spine is gated on, and only when it is affordable.
        //
        // Anything else is stone spent on something the story did not ask for.
        // `project.build_fire_pit` costs 200 against the Studio's 600, so a
        // loop that builds whatever it can afford takes the cheap one first and
        // spends exactly what the Studio was waiting for — and the Studio is
        // what grants bunks, without which the base is overcrowded and morale
        // compounds. Crystal upgrades are excluded for a different reason: they
        // are priced per second rather than upfront, so one is affordable from
        // the first tick, starts immediately, never finishes because nothing
        // here produces what it eats, and holds the single construction slot
        // for the rest of the run.
        let gating_option = simulation
            .state()
            .narrative
            .active_beat_id
            .as_deref()
            .and_then(add_core::game_data::story_beat_def)
            .and_then(|beat| beat.progression.as_ref())
            .and_then(|progression| progression.primary_action.as_ref())
            .and_then(|action| match action {
                add_core::game_data::StoryPrimaryActionDef::Construction { option_id, .. } => {
                    Some(*option_id)
                }
                _ => None,
            });
        if let Some(option_id) = gating_option {
            let outcome = simulation.apply(GameCommand::StartConstruction {
                option_id: option_id.to_string(),
            });
            if outcome.accepted {
                commands.push(json!({ "type": "StartConstruction", "optionId": option_id }));
            }
        }
    }

    // Recruiting, when the spine is waiting on it. `story.beat.first_recruit`
    // completes on someone arriving, and nothing else in this loop produces
    // one. Offered every step and refused until it is affordable, which is
    // cheap and saves tracking the cost here.
    if matches!(
        simulation
            .state()
            .narrative
            .active_beat_id
            .as_deref()
            .and_then(add_core::game_data::story_beat_def)
            .and_then(|beat| beat.progression.as_ref())
            .and_then(|progression| progression.primary_action.as_ref()),
        Some(add_core::game_data::StoryPrimaryActionDef::RecruitFromSurvivorCave { .. })
    ) && simulation.apply(GameCommand::RecruitFromSurvivorCave).accepted
    {
        commands.push(json!({ "type": "RecruitFromSurvivorCave" }));
    }
    commands
}

/// Advance time without stepping over a world action that is in flight.
fn tick_without_cancelling_actions(simulation: &mut Simulation, seconds: f64) -> Vec<Value> {
    let mut commands = Vec::new();
    let mut remaining = seconds;
    let beat_on_entry = simulation.state().narrative.active_beat_id.clone();
    while remaining > 0.0 {
        // Coarse ticks must not step over a bounded state the driver is meant
        // to observe. An active world action is one; the walk home after an
        // outdoor action is the other, and that is the only window in which
        // `story.beat.hero_exposed` is eligible.
        let state = simulation.state();
        let step = if state.active_world_action.is_some()
            || state.hero_survival.return_journey_seconds > 0.0
        {
            remaining.min(MAX_TICK_WITH_ACTION_SECONDS)
        } else {
            remaining
        };
        simulation.apply(GameCommand::Tick { seconds: step });
        commands.push(json!({ "type": "Tick", "seconds": step }));
        remaining -= step;
        // A beat that interrupts mid-tick has to hand control back. Sleeping
        // through the rest of the span steps over reactive storylets whose
        // window is shorter than the tick: `story.beat.hero_exposed` is only
        // eligible during the walk home, and the driver never saw it.
        if simulation.state().narrative.active_beat_id != beat_on_entry {
            break;
        }
    }
    commands
}

pub fn run_once(seed: u64, policy: Policy, max_steps: usize, coverage: &mut Coverage) -> FuzzRun {
    let mut rng = Rng(seed ^ 0x5DEE_CE66_D1B1_4A25);
    let mut simulation = Simulation::from_state(GameState::new());
    let mut commands = Vec::new();
    let mut taken: BTreeMap<String, usize> = BTreeMap::new();
    let mut steps = 0usize;

    while steps < max_steps {
        steps += 1;
        let Some(beat_id) = simulation.state().narrative.active_beat_id.clone() else {
            return FuzzRun { seed, policy, steps, outcome: RunOutcome::Exhausted, commands };
        };
        coverage.beats_seen.insert(beat_id.clone());
        // Also count what has completed. A beat whose `autoCompleteWhen` is
        // already satisfied when it becomes active finishes inside the same
        // tick and is never observed as the active beat — it read as unreached
        // while its effects had in fact fired.
        for completed in &simulation.state().narrative.completed_beat_ids {
            coverage.beats_seen.insert(completed.clone());
        }

        // Emit an act now and then, so runs diverge in standing rather than
        // only in which choices they took. Without this the narrative log stays
        // empty, every candidate has identical history, and casting can only
        // ever produce the catalog's first pairing — the fuzzer would report
        // full coverage of a world nothing had happened in.
        if rng.below(3) == 0 {
            let acts = add_core::game_data::narrative_acts();
            let targets = add_core::narrative::castable_entities();
            if !acts.is_empty() && !targets.is_empty() {
                // A directed policy picks from the acts that move its axis the
                // way it wants, and falls back to any act when none do — an
                // axis nothing can move is exactly what calibrate is looking
                // for, so the run must still play rather than stall.
                let act = match policy.direction() {
                    Some(wanted) => {
                        let axis = add_core::narrative::Axis::ALL
                            [(seed as usize) % add_core::narrative::Axis::ALL.len()];
                        let movers: Vec<_> = acts
                            .iter()
                            .filter(|candidate| {
                                candidate.impacts.iter().any(|impact| {
                                    impact.axis == axis.as_str()
                                        && (impact.sign == wanted || impact.sign == 0)
                                })
                            })
                            .collect();
                        if movers.is_empty() {
                            &acts[rng.below(acts.len())]
                        } else {
                            movers[rng.below(movers.len())]
                        }
                    }
                    None => &acts[rng.below(acts.len())],
                };
                let target = targets[rng.below(targets.len())];
                // Sometimes answer something already done to this person rather
                // than acting out of nowhere. Every act the fuzzer emitted used
                // to have an empty cause list, so no pattern with
                // `requiresCause` could ever complete: `arc.mercy_repaid` wants
                // aid that is *because of* an earlier mercy, and the whole
                // causal chain went untested.
                let causes = if rng.below(2) == 0 {
                    let prior: Vec<u64> = simulation
                        .state()
                        .narrative
                        .log
                        .events
                        .iter()
                        .rev()
                        .take(32)
                        .filter(|event| event.target.as_deref() == Some(target))
                        .map(|event| event.id)
                        .collect();
                    if prior.is_empty() {
                        Vec::new()
                    } else {
                        vec![prior[rng.below(prior.len())]]
                    }
                } else {
                    Vec::new()
                };
                let command = GameCommand::EmitAct {
                    act_id: act.id.to_string(),
                    target: Some(target.to_string()),
                    cost: 1.0,
                    need: 1.0,
                    secrecy: None,
                    witnesses: Vec::new(),
                    causes: causes.clone(),
                };
                if simulation.apply(command).accepted {
                    coverage.acts_emitted.insert(act.id.to_string());
                    commands.push(json!({
                        "type": "EmitAct",
                        "actId": act.id,
                        "target": target,
                        "causes": causes,
                    }));
                }
            }
        }

        // What a hub would show right now, given everything the player has
        // done. Recorded every step because the answer changes as standing
        // moves, which is exactly the coverage worth measuring.
        {
            let state = simulation.state();
            let available = add_core::narrative::castable_entities();
            let casting = add_core::narrative::cast(
                &state.narrative.log,
                &state.narrative.arcs,
                &state.narrative.cast_history,
                &available,
                state.clock_seconds,
            );
            for matched in &state.narrative.arcs.matches {
                coverage.patterns_matched.insert(matched.pattern_id.clone());
            }

            let key = format!("{} -> {}", casting.storylet_id, casting.roles.join("+"));
            // Only play a cast the campaign has not played before: the cost is
            // then bounded by the number of distinct casts, not by steps, and
            // replaying an identical cast proves nothing new.
            if coverage.storylet_casts.insert(key) {
                let played = add_core::narrative::NarrativeStory::new(seed)
                    .and_then(|mut story| story.enter_storylet(&casting.knot, &casting.roles));
                match played {
                    Ok(scene) if !scene.lines.is_empty() => {
                        coverage.ink_knots_entered.insert(casting.knot.clone());
                    }
                    Ok(_) => {
                        return FuzzRun {
                            seed,
                            policy,
                            steps,
                            outcome: RunOutcome::DeadEnd(format!(
                                "storylet `{}` cast but played no lines: a stalled hub",
                                casting.storylet_id
                            )),
                            commands,
                        };
                    }
                    Err(error) => {
                        return FuzzRun {
                            seed,
                            policy,
                            steps,
                            outcome: RunOutcome::DeadEnd(format!(
                                "storylet `{}` could not be entered: {error}",
                                casting.storylet_id
                            )),
                            commands,
                        };
                    }
                }
            }
        }

        let ink_scene = simulation.state().narrative.ink_scene.clone();
        let ink = ink_scene.filter(|scene| scene.beat_id == beat_id);
        if let Some(scene) = &ink {
            coverage
                .ink_knots_entered
                .insert(add_core::narrative::knot_for_beat(&scene.beat_id));
        }

        // A beat whose choice is already recorded is waiting on something
        // else: its world action, or simply time. Offering it another choice
        // would be refused, which is the fuzzer misreading the beat rather
        // than the beat being broken.
        if simulation.state().narrative.choice_by_beat.contains_key(&beat_id) {
            let action = add_core::story_beat_def(&beat_id).and_then(|beat| beat.world_action_id);
            let before = simulation.state().narrative.active_beat_id.clone();
            if let Some(action_id) = action {
                let outcome = simulation.apply(GameCommand::StartWorldAction {
                    action_id: action_id.to_string(),
                });
                if outcome.accepted {
                    commands.push(json!({ "type": "StartWorldAction", "actionId": action_id }));
                }
            }
            commands.extend(work_the_base_loop(&mut simulation));
            commands.extend(tick_without_cancelling_actions(&mut simulation, 30.0));
            if simulation.state().narrative.active_beat_id == before
                && simulation.state().clock_seconds > 60_000.0
            {
                return FuzzRun {
                    seed,
                    policy,
                    steps,
                    outcome: RunOutcome::DeadEnd(format!(
                        "{beat_id} kept its choice recorded but never resolved"
                    )),
                    commands,
                };
            }
            continue;
        }

        // Choices the beat presents, as (label-for-novelty, command).
        let options: Vec<(String, GameCommand)> = match &ink {
            Some(scene) if !scene.choices.is_empty() => scene
                .choices
                .iter()
                .map(|choice| {
                    let id = choice
                        .choice_id
                        .clone()
                        .unwrap_or_else(|| format!("{beat_id}#{}", choice.index));
                    (
                        id,
                        GameCommand::ChooseInkChoice {
                            beat_id: beat_id.clone(),
                            index: choice.index as u16,
                        },
                    )
                })
                .collect(),
            _ => add_core::story_beat_def(&beat_id)
                .map(|beat| {
                    beat.choices
                        .iter()
                        .map(|choice| {
                            (
                                choice.id.to_string(),
                                GameCommand::ChooseStoryOption {
                                    beat_id: beat_id.clone(),
                                    option_id: choice.id.to_string(),
                                },
                            )
                        })
                        .collect()
                })
                .unwrap_or_default(),
        };

        if options.is_empty() {
            // A spine beat with no decision: let time carry the story.
            let before = simulation.state().narrative.active_beat_id.clone();
            commands.extend(work_the_base_loop(&mut simulation));
            commands.extend(tick_without_cancelling_actions(&mut simulation, 30.0));
            if simulation.state().narrative.active_beat_id == before
                && simulation.state().clock_seconds > 60_000.0
                && !is_arc_terminus(&beat_id)
            {
                return FuzzRun {
                    seed,
                    policy,
                    steps,
                    outcome: RunOutcome::DeadEnd(format!(
                        "{beat_id} stayed active with no choices and no progress"
                    )),
                    commands,
                };
            }
            continue;
        }

        let pick = match policy {
            Policy::Uniform => rng.below(options.len()),
            Policy::First => 0,
            Policy::Last => options.len() - 1,
            Policy::Novelty => options
                .iter()
                .enumerate()
                .min_by_key(|(index, (id, _))| (taken.get(id).copied().unwrap_or(0), *index))
                .map(|(index, _)| index)
                .unwrap_or(0),
            // The directed policies aim acts, not dialogue: a story choice does
            // not name an axis, so there is nothing to steer by here and
            // uniform play keeps the run covering the story graph.
            Policy::Push | Policy::Drag => rng.below(options.len()),
        };

        let (id, command) = options[pick].clone();
        *taken.entry(id.clone()).or_insert(0) += 1;
        commands.push(command_json(&command));
        let outcome = simulation.apply(command);

        // P1.3 gave commands a structured result, so a refusal is read rather
        // than inferred. A presented choice the runtime refuses is a fault:
        // the player is being offered something that cannot happen.
        if !outcome.accepted {
            return FuzzRun {
                seed,
                policy,
                steps,
                outcome: RunOutcome::Rejected(format!(
                    "{beat_id} presented {id} but the runtime refused it ({:?})",
                    outcome.blocker
                )),
                commands,
            };
        }

        // A choice that changes nothing leaves the player looking at the same
        // beat with the same options: the dead end worth failing on.
        if simulation.state().narrative.active_beat_id.as_deref() == Some(beat_id.as_str())
            && !simulation.state().narrative.choice_by_beat.contains_key(&beat_id)
        {
            return FuzzRun {
                seed,
                policy,
                steps,
                outcome: RunOutcome::DeadEnd(format!("{beat_id} did not advance after {id}")),
                commands,
            };
        }
        coverage.choices_taken.insert(id);
    }

    FuzzRun { seed, policy, steps, outcome: RunOutcome::BudgetReached, commands }
}

fn command_json(command: &GameCommand) -> Value {
    match command {
        GameCommand::ChooseStoryOption { beat_id, option_id } => json!({
            "type": "ChooseStoryOption", "beatId": beat_id, "optionId": option_id
        }),
        GameCommand::ChooseInkChoice { beat_id, index } => json!({
            "type": "ChooseInkChoice", "beatId": beat_id, "index": index
        }),
        GameCommand::Tick { seconds } => json!({ "type": "Tick", "seconds": seconds }),
        other => json!({ "type": format!("{other:?}") }),
    }
}

/// Run a campaign, rotating policies across seeds.
pub fn run_campaign(runs: usize, max_steps: usize) -> FuzzReport {
    let mut coverage = Coverage::default();
    let mut failures = Vec::new();
    let mut outcomes: BTreeMap<String, usize> = BTreeMap::new();

    for index in 0..runs {
        let policy = Policy::ALL[index % Policy::ALL.len()];
        let run = run_once(index as u64, policy, max_steps, &mut coverage);
        let key = match &run.outcome {
            RunOutcome::Exhausted => "exhausted",
            RunOutcome::BudgetReached => "budget_reached",
            RunOutcome::DeadEnd(_) => "dead_end",
            RunOutcome::Rejected(_) => "rejected",
        };
        *outcomes.entry(key.to_string()).or_insert(0) += 1;
        if run.failed() && failures.len() < 10 {
            failures.push(run);
        }
    }

    let mut beats_never_seen = Vec::new();
    let mut choices_never_taken = Vec::new();
    for beat in story_beats() {
        if !coverage.beats_seen.contains(beat.id) {
            beats_never_seen.push(beat.id.to_string());
        }
        for choice in beat.choices {
            if !coverage.choices_taken.contains(choice.id) {
                choices_never_taken.push(choice.id.to_string());
            }
        }
    }
    // This metric means "authored prose nothing can reach". The hub fallback is
    // reachable by construction — it plays precisely when nothing else
    // qualifies, which a campaign of castable storylets never produces — so its
    // absence here is not a coverage hole. `story::tests` plays it directly.
    let ink_knots_never_entered = add_core::narrative::all_knots()
        .iter()
        .filter(|knot| **knot != add_core::narrative::FALLBACK_KNOT)
        .filter(|knot| !coverage.ink_knots_entered.contains(**knot))
        .map(|knot| knot.to_string())
        .collect();

    let mut casts_per_storylet: BTreeMap<String, usize> = BTreeMap::new();
    for cast in &coverage.storylet_casts {
        let id = cast.split(" -> ").next().unwrap_or(cast);
        *casts_per_storylet.entry(id.to_string()).or_insert(0) += 1;
    }
    let storylets_never_cast = add_core::game_data::storylets()
        .iter()
        .filter(|storylet| !casts_per_storylet.contains_key(storylet.id))
        .map(|storylet| storylet.id.to_string())
        .collect();

    let acts_never_emitted = add_core::game_data::narrative_acts()
        .iter()
        .filter(|act| !coverage.acts_emitted.contains(act.id))
        .map(|act| act.id.to_string())
        .collect();
    let patterns_never_matched = add_core::game_data::sift_patterns()
        .iter()
        .filter(|pattern| !coverage.patterns_matched.contains(pattern.id))
        .map(|pattern| pattern.id.to_string())
        .collect();
    // Static, not play-derived: an axis no act moves is dead standing however
    // long the campaign runs, so the catalog is the only evidence needed.
    let axes_no_act_moves = add_core::narrative::Axis::ALL
        .into_iter()
        .filter(|axis| {
            !add_core::game_data::narrative_acts().iter().any(|act| {
                act.impacts.iter().any(|impact| impact.axis == axis.as_str())
            })
        })
        .map(|axis| axis.as_str().to_string())
        .collect();

    let status = if failures.is_empty() { "passed" } else { "failed" };
    FuzzReport {
        contract: "add_fuzz_v1",
        runs,
        failures,
        coverage,
        beats_never_seen,
        choices_never_taken,
        storylets_never_cast,
        casts_per_storylet,
        acts_never_emitted,
        patterns_never_matched,
        axes_no_act_moves,
        ink_knots_never_entered,
        outcomes,
        status,
    }
}

/// Replay a recorded command log and return the canonical final save. Two
/// replays of the same log must produce byte-identical output; that is what
/// makes a fuzz failure a usable bug report.
pub fn replay(commands: &[Value]) -> Result<String, String> {
    let mut simulation = Simulation::from_state(GameState::new());
    for command in commands {
        let kind = command.get("type").and_then(Value::as_str).unwrap_or("");
        match kind {
            "ChooseStoryOption" => {
                simulation.apply(GameCommand::ChooseStoryOption {
                    beat_id: string_field(command, "beatId")?,
                    option_id: string_field(command, "optionId")?,
                });
            }
            "ChooseInkChoice" => {
                simulation.apply(GameCommand::ChooseInkChoice {
                    beat_id: string_field(command, "beatId")?,
                    index: command.get("index").and_then(Value::as_u64).unwrap_or(0) as u16,
                });
            }
            "Tick" => {
                simulation.apply(GameCommand::Tick {
                    seconds: command.get("seconds").and_then(Value::as_f64).unwrap_or(0.0),
                });
            }
            "StartWorldAction" => {
                simulation.apply(GameCommand::StartWorldAction {
                    action_id: string_field(command, "actionId")?,
                });
            }
            "EmitAct" => {
                simulation.apply(GameCommand::EmitAct {
                    act_id: string_field(command, "actId")?,
                    target: command
                        .get("target")
                        .and_then(Value::as_str)
                        .map(str::to_string),
                    cost: 1.0,
                    need: 1.0,
                    secrecy: None,
                    witnesses: Vec::new(),
                    // Replay has to cite the same causes, or a run that only
                    // failed because one act answered another cannot reproduce.
                    causes: command
                        .get("causes")
                        .and_then(Value::as_array)
                        .map(|causes| causes.iter().filter_map(Value::as_u64).collect())
                        .unwrap_or_default(),
                });
            }
            "SetRoleCrew" => {
                simulation.apply(GameCommand::SetRoleCrew {
                    role_id: string_field(command, "roleId")?,
                    crew: command.get("crew").and_then(Value::as_u64).unwrap_or(0) as u8,
                });
            }
            "StartConstruction" => {
                simulation.apply(GameCommand::StartConstruction {
                    option_id: string_field(command, "optionId")?,
                });
            }
            "RecruitFromSurvivorCave" => {
                simulation.apply(GameCommand::RecruitFromSurvivorCave);
            }
            other => return Err(format!("replay does not know command `{other}`")),
        }
    }
    let raw = export_save(simulation.state()).map_err(|error| error.to_string())?;
    // Round-trip so the output is the canonical form, not whatever the live
    // state happened to hold.
    let reloaded = import_save(&raw).map_err(|error| error.to_string())?;
    export_save(&reloaded).map_err(|error| error.to_string())
}

fn string_field(value: &Value, field: &str) -> Result<String, String> {
    value
        .get(field)
        .and_then(Value::as_str)
        .map(str::to_string)
        .ok_or_else(|| format!("command is missing `{field}`"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_short_campaign_finds_no_faults_and_reaches_the_ink_beat() {
        let report = run_campaign(40, 60);
        assert!(report.ok(), "fuzz failures: {:?}", report.failures);
        assert!(
            report
                .coverage
                .ink_knots_entered
                .contains("story_beat_first_glimpse"),
            "the ink beat should be reachable by fuzzing",
        );
        assert!(report.ink_knots_never_entered.is_empty());
    }

    #[test]
    fn every_policy_is_exercised_and_each_reaches_the_story() {
        for policy in Policy::ALL {
            let mut coverage = Coverage::default();
            let run = run_once(11, policy, 60, &mut coverage);
            assert!(!run.failed(), "{policy:?} failed: {:?}", run.outcome);
            assert!(
                !coverage.beats_seen.is_empty(),
                "{policy:?} reached no story beat",
            );
        }
    }

    #[test]
    fn first_and_last_policies_take_different_choices() {
        // If they agreed, rotating policies would buy nothing.
        let mut a = Coverage::default();
        let mut b = Coverage::default();
        run_once(5, Policy::First, 60, &mut a);
        run_once(5, Policy::Last, 60, &mut b);
        assert_ne!(a.choices_taken, b.choices_taken);
    }

    #[test]
    fn a_recorded_run_replays_byte_identically() {
        let mut coverage = Coverage::default();
        let run = run_once(21, Policy::Uniform, 60, &mut coverage);
        let first = replay(&run.commands).expect("replay");
        let second = replay(&run.commands).expect("replay again");
        assert_eq!(first, second, "replay is not deterministic");
        assert!(!first.is_empty());
    }

    #[test]
    fn the_same_seed_and_policy_produce_the_same_run() {
        let mut a = Coverage::default();
        let mut b = Coverage::default();
        let first = run_once(99, Policy::Uniform, 60, &mut a);
        let second = run_once(99, Policy::Uniform, 60, &mut b);
        assert_eq!(first.commands, second.commands);
        assert_eq!(first.steps, second.steps);
    }

    #[test]
    fn casting_produces_many_distinct_casts() {
        // The measure of §8's multiplier, and a regression guard with teeth:
        // the first version of the caster returned the first entity that fit,
        // which passed every other test while producing exactly ONE distinct
        // cast across 400 runs. Coverage, not correctness, caught that.
        let report = run_campaign(120, 60);
        assert!(report.ok(), "campaign failed: {:?}", report.failures);
        assert!(
            report.coverage.storylet_casts.len() >= 5,
            "only {} distinct cast(s); one knot should tell many scenes: {:?}",
            report.coverage.storylet_casts.len(),
            report.coverage.storylet_casts,
        );
        assert!(
            report.storylets_never_cast.is_empty(),
            "storylets nothing ever cast: {:?}",
            report.storylets_never_cast,
        );
    }

    #[test]
    fn a_hub_never_stalls_under_fuzz() {
        // Every casting the campaign produced names a knot ink can enter;
        // run_once turns a miss into a DeadEnd, so a pass here is the proof.
        let report = run_campaign(60, 40);
        assert_eq!(report.outcomes.get("dead_end"), None, "a hub stalled");
    }
}
