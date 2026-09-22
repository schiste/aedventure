//! `narr calibrate`: is the tuning producing a spread of outcomes?
//!
//! §5A: "runs the fuzzer and reports, per axis, the share of met characters in
//! each band at 25, 50 and 100 percent of a playthrough. Flags: an axis with
//! more than 70 percent of characters still in `mid` at the end (dead axis), an
//! axis where more than 30 percent sit at an extreme (runaway), and any act
//! whose final impact hits the 0.1 or 4 clamp more than rarely."
//!
//! Eleven axes with group values is more tuning than anyone can balance by eye,
//! so the question this answers is not "are the numbers right" — nobody can
//! read that off a table — but "does this axis do anything, and does it do too
//! much". A dead axis is content a writer can gate on and never see fire; a
//! runaway one is a gate that is always open.

use std::collections::BTreeMap;

use add_core::narrative::{Axis, Band, NarrativeLog, castable_entities};

use super::fuzz::{Policy, run_once};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

/// Where in a playthrough the distribution is sampled, as a share of its acts.
pub const CHECKPOINTS: [u32; 3] = [25, 50, 100];

/// Share of met characters still in `mid` at the end above which an axis is
/// reported dead.
pub const DEAD_AXIS_MID_SHARE: f64 = 0.70;
/// Share at either extreme above which an axis is reported runaway.
pub const RUNAWAY_EXTREME_SHARE: f64 = 0.30;
/// Share of an act's impacts that may hit a clamp before it is worth reporting.
/// "More than rarely", made a number so the tool can apply it.
pub const CLAMP_RARELY: f64 = 0.05;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AxisDistribution {
    pub axis: String,
    /// Share per band, keyed by band name, at each checkpoint.
    pub at: BTreeMap<u32, BTreeMap<String, f64>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClampReport {
    pub act_id: String,
    pub impacts: usize,
    pub clamped: usize,
    pub share: f64,
    /// Times the modifiers were pushed below the floor, and above the ceiling.
    ///
    /// Which bound is hit says what to do about it: the floor means the act is
    /// being damped into nothing, the ceiling means the tuning is asking for
    /// more than the scale can hold. Reporting only a percentage left that
    /// unanswerable without a debugger.
    pub clamped_low: usize,
    pub clamped_high: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalibrationReport {
    pub contract: &'static str,
    pub characters: usize,
    pub acts_played: usize,
    pub distributions: Vec<AxisDistribution>,
    /// Axes no act in the catalog touches at all.
    ///
    /// Static and exact, unlike `dead_axes` below, which depends on what the
    /// playthroughs happened to do. An axis here cannot move however long
    /// anything plays, so it is the finding worth acting on first.
    pub axes_no_act_moves: Vec<String>,
    /// Axes nothing moved *in this sample*: gates on these can be authored but
    /// never fire. Sample-dependent — an axis with few sources can read dead
    /// simply because no playthrough reached for it.
    pub dead_axes: Vec<String>,
    /// Axes that pin characters at an extreme: gates on these never close.
    pub runaway_axes: Vec<String>,
    /// Acts whose modifiers hit the 0.1 or 4 clamp more than rarely. A clamped
    /// impact means the tuning tried to express something the scale cannot
    /// hold, so the act is louder or quieter than its tier says.
    pub clamped_acts: Vec<ClampReport>,
}

impl CalibrationReport {
    pub fn to_value(&self) -> Value {
        serde_json::to_value(self).unwrap_or_else(|_| json!({"status": "unserializable"}))
    }

    pub fn ok(&self) -> bool {
        self.axes_no_act_moves.is_empty()
            && self.dead_axes.is_empty()
            && self.runaway_axes.is_empty()
            && self.clamped_acts.is_empty()
    }
}

/// Modifier clamp bounds, from the engine rather than copied.
const CLAMP_LOW: f64 = add_core::narrative::MODIFIER_CLAMP.0;
const CLAMP_HIGH: f64 = add_core::narrative::MODIFIER_CLAMP.1;

/// Has the player met this character? §5A counts "met characters", and the
/// distinction matters: an unmet character is neutral on every axis, so
/// counting them would report the cast's size as a dead axis.
fn met(log: &NarrativeLog, entity_id: &str) -> bool {
    log.events
        .iter()
        .any(|event| event.target.as_deref() == Some(entity_id))
}

fn share(count: usize, total: usize) -> f64 {
    if total == 0 { 0.0 } else { count as f64 / total as f64 }
}

/// Play the fuzzer and keep the narrative log it produced.
///
/// §5A says calibrate "runs the fuzzer", and it matters that it really does:
/// a hand-written loop that cycles acts uniformly would report the shape of
/// that loop rather than the shape of the game. The fuzzer drives story
/// choices, world actions and acts the way a player's session does, so the
/// distribution below is one the content can actually produce.
pub fn play(runs: usize, max_steps: usize) -> NarrativeLog {
    play_with(&Policy::ALL, runs, max_steps)
}

/// Play under an explicit set of policies.
///
/// The two questions calibrate asks need different play. "Can anything move
/// this axis" is only fair under a policy that tries — a player is consistent
/// where random play cancels itself out. "Does ordinary play pin this axis at an
/// extreme" is only fair under a policy that is *not* trying, because a policy
/// whose purpose is to drive an axis to its limit will drive it there, and
/// reporting that as a runaway would be reporting the measurement.
pub fn play_with(policies: &[Policy], runs: usize, max_steps: usize) -> NarrativeLog {
    let mut merged = NarrativeLog::default();
    for log in play_each(policies, runs, max_steps) {
        for mut event in log.events {
            event.causes.clear();
            merged.append(event);
        }
    }
    merged
}

/// One log per playthrough, kept apart.
///
/// The distribution §5A asks for is over characters in a playthrough, so the
/// playthroughs cannot be concatenated: sixty-six sessions poured into one log
/// is one impossibly long game, and every axis saturates. That is how raising
/// the run count turned six axes "runaway" without a line of content changing.
/// How many acts a playthrough is taken to contain.
///
/// A fuzz session ends when the story graph is exhausted, which today is about
/// twenty acts — far too few for standing to develop, so every axis reads dead
/// at 25, 50 and 100 percent of it. Merging sessions instead over-saturates.
/// Neither is a playthrough. Each session is therefore continued under its own
/// policy until it is the length of a game, which is what §5A's checkpoints
/// assume and what a player would actually produce.
pub const ACTS_PER_PLAYTHROUGH: usize = 300;

/// Continue a session under its policy until it is a game's worth of acts.
fn extend_to_a_full_game(log: &mut NarrativeLog, policy: Policy, seed: u64, target: usize) {
    let acts = add_core::game_data::narrative_acts();
    let characters = castable_entities();
    if acts.is_empty() || characters.is_empty() {
        return;
    }
    let wanted = policy.act_direction();
    let axis = Axis::ALL[(seed as usize) % Axis::ALL.len()];
    let movers: Vec<_> = match wanted {
        Some(sign) => acts
            .iter()
            .filter(|act| {
                act.impacts
                    .iter()
                    .any(|i| i.axis == axis.as_str() && (i.sign == sign || i.sign == 0))
            })
            .collect(),
        None => acts.iter().collect(),
    };
    let pool: Vec<_> = if movers.is_empty() { acts.iter().collect() } else { movers };

    let mut state = seed ^ 0xA5A5_5A5A_1234_9876;
    let mut next = || {
        state = state.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = state;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        (z ^ (z >> 31)) as usize
    };

    let mut tick = log.events.last().map(|event| event.tick).unwrap_or(0.0);
    while log.events.len() < target {
        let act = pool[next() % pool.len()];
        let target_entity = characters[next() % characters.len()];
        // Spaced so repeats do not coalesce and decay has room to work.
        tick += add_core::narrative::GAME_DAY_SECONDS * 0.5;
        let mut event = add_core::narrative::event_for(act, Some(target_entity), tick);
        event.secrecy = add_core::narrative::Secrecy::Public;
        log.append(event);
    }
}

/// A playthrough, with what it was trying to do.
pub struct Session {
    pub log: NarrativeLog,
    pub policy: Policy,
    /// The axis a directed policy aimed at, if it was directed.
    pub aimed_at: Option<Axis>,
}

pub fn play_each(policies: &[Policy], runs: usize, max_steps: usize) -> Vec<NarrativeLog> {
    play_sessions(policies, runs, max_steps)
        .into_iter()
        .map(|session| session.log)
        .collect()
}

pub fn play_sessions(policies: &[Policy], runs: usize, max_steps: usize) -> Vec<Session> {
    let mut coverage = super::fuzz::Coverage::default();
    let mut sessions = Vec::new();
    for index in 0..runs {
        let policy = policies[index % policies.len()];
        let run = run_once(index as u64, policy, max_steps, &mut coverage);
        let Ok(save) = super::fuzz::replay(&run.commands) else {
            continue;
        };
        let Ok(state) = add_core::import_save(&save) else {
            continue;
        };
        let mut log = state.narrative.log;
        extend_to_a_full_game(&mut log, policy, index as u64, ACTS_PER_PLAYTHROUGH);
        let aimed_at = policy
            .is_directed()
            .then(|| Axis::ALL[(index) % Axis::ALL.len()]);
        sessions.push(Session { log, policy, aimed_at });
    }
    sessions
}

pub fn run(acts_to_play: usize) -> CalibrationReport {
    let characters = castable_entities();
    let acts = add_core::game_data::narrative_acts();
    if characters.is_empty() || acts.is_empty() {
        return CalibrationReport {
            contract: "add_narr_calibrate_v1",
            characters: 0,
            acts_played: 0,
            distributions: Vec::new(),
            axes_no_act_moves: Vec::new(),
            dead_axes: Vec::new(),
            runaway_axes: Vec::new(),
            clamped_acts: Vec::new(),
        };
    }

    // Enough runs for every directed policy to aim at every axis at least once.
    // The policies rotate, so with only a handful of runs the directed ones aim
    // at two axes out of eleven and the rest read dead for want of attention —
    // `debt` did exactly that, with sources in both directions the whole time.
    let runs = acts_to_play
        .div_ceil(40)
        .max(Policy::ALL.len() * Axis::ALL.len());
    // Directed play, for reachability: does anything move this axis at all.
    let sessions = play_sessions(&Policy::ALL, runs, 60);
    let directed: Vec<NarrativeLog> = sessions.iter().map(|s| s.log.clone()).collect();
    // Undirected play, for the runaway check: what ordinary play settles on.
    let representative: Vec<Policy> = Policy::ALL
        .into_iter()
        .filter(|policy| !policy.is_directed())
        .collect();
    let ordinary = play_each(&representative, runs, 60);
    let acts_played: usize = directed.iter().map(|log| log.events.len()).sum();
    if acts_played == 0 {
        return CalibrationReport {
            contract: "add_narr_calibrate_v1",
            characters: characters.len(),
            acts_played: 0,
            distributions: Vec::new(),
            axes_no_act_moves: Vec::new(),
            dead_axes: Vec::new(),
            runaway_axes: Vec::new(),
            clamped_acts: Vec::new(),
        };
    }

    // Band counts per axis per checkpoint, accumulated across playthroughs.
    // Each playthrough is read on its own timeline, so "50% of a playthrough"
    // means half of that session rather than half of every session stacked.
    let mut distributions: BTreeMap<Axis, BTreeMap<u32, BTreeMap<String, usize>>> = BTreeMap::new();
    let mut extremes: BTreeMap<Axis, (usize, usize)> = BTreeMap::new();

    for (session_index, session) in directed.iter().enumerate() {
        let total = session.events.len();
        if total == 0 {
            continue;
        }
        let mut log = NarrativeLog::default();
        let mut next_mark = 0usize;
        for (index, event) in session.events.iter().enumerate() {
            let mut event = event.clone();
            event.causes.clear();
            log.append(event);
            let share_played = ((index + 1) * 100) / total;
            while next_mark < CHECKPOINTS.len() && share_played >= CHECKPOINTS[next_mark] as usize {
                let percent = CHECKPOINTS[next_mark];
                let at_tick = session.events[index].tick;
                for axis in Axis::ALL {
                    let counts =
                        distributions.entry(axis).or_default().entry(percent).or_default();
                    for character in &characters {
                        // Only characters this session has met: someone who
                        // never appeared sits at zero and would count as a
                        // `mid` the tuning never had a chance to move.
                        if !met(&log, character) {
                            continue;
                        }
                        let band = Band::of(log.standing(character, axis, at_tick));
                        *counts.entry(band.as_str().to_string()).or_insert(0) += 1;
                    }
                }
                next_mark += 1;
            }
        }
        let _ = session_index;
    }

    // Runaway, from undirected play, one session at a time.
    for session in &ordinary {
        let Some(now) = session.events.last().map(|event| event.tick) else {
            continue;
        };
        for axis in Axis::ALL {
            let entry = extremes.entry(axis).or_insert((0, 0));
            for character in &characters {
                if !met(session, character) {
                    continue;
                }
                entry.1 += 1;
                let band = Band::of(session.standing(character, axis, now));
                if band == Band::VeryLow || band == Band::VeryHigh {
                    entry.0 += 1;
                }
            }
        }
    }

    // Clamp pressure, read from the same traces the score came from.
    let mut per_act: BTreeMap<String, (usize, usize, usize, usize)> = BTreeMap::new();
    for session in &directed {
        let Some(now) = session.events.last().map(|event| event.tick) else {
            continue;
        };
        for character in &characters {
        for axis in Axis::ALL {
            for trace in session.explain(character, axis, now).1 {
                let entry = per_act.entry(trace.act_id.clone()).or_insert((0, 0, 0, 0));
                entry.0 += 1;
                // Whether the clamp bit, read from the modifiers as they were
                // before it, not guessed from how small the result ended up.
                if trace.unclamped_modifiers < CLAMP_LOW {
                    entry.1 += 1;
                    entry.2 += 1;
                } else if trace.unclamped_modifiers > CLAMP_HIGH {
                    entry.1 += 1;
                    entry.3 += 1;
                }
            }
        }
        }
    }
    let mut clamped_acts: Vec<ClampReport> = per_act
        .into_iter()
        .filter_map(|(act_id, (impacts, clamped, low, high))| {
            let share = share(clamped, impacts);
            (share > CLAMP_RARELY).then_some(ClampReport {
                act_id,
                impacts,
                clamped,
                share,
                clamped_low: low,
                clamped_high: high,
            })
        })
        .collect();
    clamped_acts.sort_by(|a, b| b.share.partial_cmp(&a.share).unwrap_or(std::cmp::Ordering::Equal));

    // What the catalog can move, read from the catalog.
    let axes_no_act_moves: Vec<String> = Axis::ALL
        .into_iter()
        .filter(|axis| {
            !add_core::game_data::narrative_acts()
                .iter()
                .any(|act| act.impacts.iter().any(|i| i.axis == axis.as_str()))
        })
        .map(|axis| axis.as_str().to_string())
        .collect();

    let mut dead_axes = Vec::new();
    let mut runaway_axes = Vec::new();
    let mut reported = Vec::new();
    for (axis, by_checkpoint) in &distributions {
        let mut at = BTreeMap::new();
        for (percent, counts) in by_checkpoint {
            let total: usize = counts.values().sum();
            let shares = counts
                .iter()
                .map(|(band, count)| (band.clone(), share(*count, total)))
                .collect();
            at.insert(*percent, shares);
        }

        // Judged at the end of the playthrough, which is where the spec sets
        // both thresholds: an axis is allowed to be quiet early.
        // Judged only on the sessions that tried to move this axis. Averaging
        // over every session buries them: each axis is aimed at by about two
        // runs in sixty-six, so an axis that moves readily when pushed still
        // reads dead in the aggregate. "Can this move" is a question about the
        // attempts, not about the mean.
        let mut mid_when_pushed = 0usize;
        let mut pushed = 0usize;
        for session in sessions.iter().filter(|s| s.aimed_at == Some(*axis)) {
            let Some(now) = session.log.events.last().map(|event| event.tick) else {
                continue;
            };
            for character in &characters {
                if !met(&session.log, character) {
                    continue;
                }
                pushed += 1;
                if Band::of(session.log.standing(character, *axis, now)) == Band::Mid {
                    mid_when_pushed += 1;
                }
            }
        }
        if pushed > 0 && share(mid_when_pushed, pushed) > DEAD_AXIS_MID_SHARE {
            dead_axes.push(axis.as_str().to_string());
        }
        if let Some((extreme, counted)) = extremes.get(axis) {
            if share(*extreme, *counted) > RUNAWAY_EXTREME_SHARE {
                runaway_axes.push(axis.as_str().to_string());
            }
        }

        reported.push(AxisDistribution { axis: axis.as_str().to_string(), at });
    }

    CalibrationReport {
        contract: "add_narr_calibrate_v1",
        characters: characters.len(),
        acts_played,
        distributions: reported,
        axes_no_act_moves,
        dead_axes,
        runaway_axes,
        clamped_acts,
    }
}
