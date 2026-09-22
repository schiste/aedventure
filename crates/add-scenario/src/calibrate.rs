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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalibrationReport {
    pub contract: &'static str,
    pub characters: usize,
    pub acts_played: usize,
    pub distributions: Vec<AxisDistribution>,
    /// Axes nothing moved: gates on these can be authored but never fire.
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
        self.dead_axes.is_empty() && self.runaway_axes.is_empty() && self.clamped_acts.is_empty()
    }
}

/// Modifier clamp bounds, mirroring `narrative::standing::clamp_modifiers`.
const CLAMP_LOW: f64 = 0.1;
const CLAMP_HIGH: f64 = 4.0;

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
    let mut coverage = super::fuzz::Coverage::default();
    let mut log = NarrativeLog::default();
    for index in 0..runs {
        let policy = policies[index % policies.len()];
        let run = run_once(index as u64, policy, max_steps, &mut coverage);
        let Ok(save) = super::fuzz::replay(&run.commands) else {
            continue;
        };
        let Ok(state) = add_core::import_save(&save) else {
            continue;
        };
        // Each run is its own playthrough; their events are concatenated so the
        // distribution is taken over many sessions rather than one.
        for mut event in state.narrative.log.events {
            event.causes.clear();
            log.append(event);
        }
    }
    log
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
            dead_axes: Vec::new(),
            runaway_axes: Vec::new(),
            clamped_acts: Vec::new(),
        };
    }

    let runs = acts_to_play.div_ceil(40).max(4);
    // Directed play, for reachability: does anything move this axis at all.
    let played = play_with(&Policy::ALL, runs, 60);
    // Undirected play, for the runaway check: what ordinary play settles on.
    let representative: Vec<Policy> = Policy::ALL
        .into_iter()
        .filter(|policy| !policy.is_directed())
        .collect();
    let ordinary = play_with(&representative, runs, 60);
    let acts_played = played.events.len();
    if acts_played == 0 {
        return CalibrationReport {
            contract: "add_narr_calibrate_v1",
            characters: characters.len(),
            acts_played: 0,
            distributions: Vec::new(),
            dead_axes: Vec::new(),
            runaway_axes: Vec::new(),
            clamped_acts: Vec::new(),
        };
    }

    let mut distributions: BTreeMap<Axis, BTreeMap<u32, BTreeMap<String, usize>>> = BTreeMap::new();
    let now = played
        .events
        .last()
        .map(|event| event.tick)
        .unwrap_or_default();

    // The distribution is taken at a share of the playthrough, so each
    // checkpoint reads a log truncated to that share.
    let mut log = NarrativeLog::default();
    let mut next_mark = 0usize;
    for (index, event) in played.events.iter().enumerate() {
        log.append(event.clone());
        let share_played = ((index + 1) * 100) / acts_played;
        while next_mark < CHECKPOINTS.len() && share_played >= CHECKPOINTS[next_mark] as usize {
            let percent = CHECKPOINTS[next_mark];
            let at_tick = event.tick;
            for axis in Axis::ALL {
                let counts =
                    distributions.entry(axis).or_default().entry(percent).or_default();
                for character in &characters {
                    // Only characters the player has met: someone who has never
                    // appeared sits at zero and would count as a `mid` that the
                    // tuning never had a chance to move.
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

    // Clamp pressure, read from the same traces the score came from.
    let mut per_act: BTreeMap<String, (usize, usize)> = BTreeMap::new();
    for character in &characters {
        for axis in Axis::ALL {
            for trace in log.explain(character, axis, now).1 {
                let entry = per_act.entry(trace.act_id.clone()).or_insert((0, 0));
                entry.0 += 1;
                if trace.clamped_modifiers <= CLAMP_LOW || trace.clamped_modifiers >= CLAMP_HIGH {
                    entry.1 += 1;
                }
            }
        }
    }
    let mut clamped_acts: Vec<ClampReport> = per_act
        .into_iter()
        .filter_map(|(act_id, (impacts, clamped))| {
            let share = share(clamped, impacts);
            (share > CLAMP_RARELY).then_some(ClampReport { act_id, impacts, clamped, share })
        })
        .collect();
    clamped_acts.sort_by(|a, b| b.share.partial_cmp(&a.share).unwrap_or(std::cmp::Ordering::Equal));

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
        if let Some(final_counts) = by_checkpoint.get(&100) {
            let total: usize = final_counts.values().sum();
            let mid = share(*final_counts.get("mid").unwrap_or(&0), total);
            if mid > DEAD_AXIS_MID_SHARE {
                dead_axes.push(axis.as_str().to_string());
            }
        }
        // Runaway is read from ordinary play, for the reason on `play_with`.
        let now_ordinary = ordinary
            .events
            .last()
            .map(|event| event.tick)
            .unwrap_or_default();
        let mut extreme = 0usize;
        let mut counted = 0usize;
        for character in &characters {
            if !met(&ordinary, character) {
                continue;
            }
            counted += 1;
            let band = Band::of(ordinary.standing(character, *axis, now_ordinary));
            if band == Band::VeryLow || band == Band::VeryHigh {
                extreme += 1;
            }
        }
        if share(extreme, counted) > RUNAWAY_EXTREME_SHARE {
            runaway_axes.push(axis.as_str().to_string());
        }

        reported.push(AxisDistribution { axis: axis.as_str().to_string(), at });
    }

    CalibrationReport {
        contract: "add_narr_calibrate_v1",
        characters: characters.len(),
        acts_played,
        distributions: reported,
        dead_axes,
        runaway_axes,
        clamped_acts,
    }
}
