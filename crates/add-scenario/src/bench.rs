//! Narrative performance budgets at full scale (§10 of the specification).
//!
//! The budgets exist because the narrative system's cost is driven by the size
//! of the event log, and the log only grows. A query that is instant at seven
//! events and unusable at fifty thousand is not a tuning problem, it is the
//! wrong data structure — so the measurement has to run at the size the
//! finished game reaches, not the size the test content happens to be.
//!
//! Measured headlessly against the real catalog, in native code. The browser
//! trace harness cannot see these: a 50 microsecond call is below its
//! resolution, and none of this runs on the main thread.

use std::time::Instant;

use add_core::narrative::{
    Axis, CastHistory, GAME_DAY_SECONDS, NarrativeLog, Secrecy, cast, castable_entities, event_for,
    sift,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

/// The scale the specification sizes for: "500 to 1,000 entities and a log of
/// 50,000 events, since gameplay acts add far more events than dialogue does."
pub const FULL_SCALE_EVENTS: usize = 50_000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Measurement {
    pub operation: &'static str,
    pub samples: usize,
    /// The fastest observed run. This is what the budget is judged on.
    ///
    /// These benchmarks share a developer machine with other agents, and this
    /// repository is explicitly built for concurrent sessions, so wall-clock
    /// tails measure the machine's load as much as the code's cost — a first
    /// run of this suite reported everything 5 to 10 times slower purely
    /// because the load average was 22. The minimum is the sample least
    /// contaminated by preemption and is a true lower bound on the real cost:
    /// if it exceeds the budget the code is too slow, with no room to argue.
    /// The tail figures stay in the report because they are still worth
    /// reading, they just cannot be a gate here.
    pub min_us: f64,
    pub mean_us: f64,
    pub p95_us: f64,
    pub max_us: f64,
}

impl Measurement {
    /// Measurements carry no budget of their own.
    ///
    /// The budgets live in `performance/add-budgets.json`, applied by
    /// `scripts/narr-bench-check.cjs`. Holding them in both places is how a
    /// gate quietly stops matching the numbers it claims to enforce.
    fn new(operation: &'static str, mut samples_us: Vec<f64>) -> Self {
        samples_us.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let count = samples_us.len().max(1);
        let mean = samples_us.iter().sum::<f64>() / count as f64;
        // Nearest-rank p95: with few samples this is the honest reading, where
        // interpolation would invent a number between two real ones.
        let index = (((count as f64) * 0.95).ceil() as usize).saturating_sub(1);
        let p95 = samples_us.get(index).copied().unwrap_or(0.0);
        let max = samples_us.last().copied().unwrap_or(0.0);
        let min = samples_us.first().copied().unwrap_or(0.0);
        Self {
            operation,
            samples: samples_us.len(),
            min_us: min,
            mean_us: mean,
            p95_us: p95,
            max_us: max,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BenchReport {
    pub contract: &'static str,
    pub events: usize,
    pub entities: usize,
    /// How many entries compaction folded away at this scale.
    pub folded: usize,
    pub measurements: Vec<Measurement>,
}

impl BenchReport {
    pub fn to_value(&self) -> Value {
        serde_json::to_value(self).unwrap_or_else(|_| json!({"status": "unserializable"}))
    }
}

/// How long a full game's log is taken to span.
///
/// The event count comes from §10; the span does not, and it matters as much.
/// Packing 50,000 events into a few game-days would model a frantic afternoon
/// rather than a full game, and would hide both decay and compaction — every
/// event would still be fresh. Three game-years at roughly forty-five acts a
/// day is a plausible shape for a game that reaches this many events.
const SPAN_DAYS: f64 = 3.0 * 365.0;

/// Build a log of `events` acts spread across the cast, as gameplay would.
fn populate(events: usize) -> NarrativeLog {
    let mut log = NarrativeLog::default();
    // Every authored act. A pattern with no expiry would pin its first slot in
    // the log forever and this would have to exclude those acts to measure
    // anything; every pattern now expires, so the whole catalog can play.
    let acts: Vec<_> = add_core::game_data::narrative_acts().iter().collect();
    let targets = castable_entities();
    if acts.is_empty() || targets.is_empty() {
        return log;
    }
    for index in 0..events {
        let act = acts[index % acts.len()];
        let target = targets[index % targets.len()];
        let spacing = SPAN_DAYS * GAME_DAY_SECONDS / events.max(1) as f64;
        let mut event = event_for(act, Some(target), index as f64 * spacing);
        event.secrecy = Secrecy::Public;
        log.append(event);
    }
    log
}

fn micros_since(start: Instant) -> f64 {
    start.elapsed().as_nanos() as f64 / 1000.0
}

pub fn run(events: usize) -> BenchReport {
    let entities = castable_entities();
    let log = populate(events);
    let now = SPAN_DAYS * GAME_DAY_SECONDS;

    // standing(), cold and warm, measured apart.
    //
    // The two numbers answer different questions and conflating them would
    // flatter the result: warm is what a frame of UI or a casting solve pays,
    // cold is what the first read after an act pays, because appending an event
    // invalidates every cached score. A benchmark that queried in a loop would
    // report only the warm figure and call the budget met.
    let mut cold_samples = Vec::new();
    let mut warm_samples = Vec::new();
    for round in 0..40 {
        let observer = entities[round % entities.len()];
        let axis = Axis::ALL[round % Axis::ALL.len()];
        // A tick nothing has been asked about yet, so this cannot be a hit.
        let cold_tick = now + round as f64;
        let start = Instant::now();
        std::hint::black_box(log.standing(observer, axis, cold_tick));
        cold_samples.push(micros_since(start));

        let start = Instant::now();
        std::hint::black_box(log.standing(observer, axis, cold_tick));
        warm_samples.push(micros_since(start));
    }

    // emit_act: appending one act and re-sifting, which is what a gameplay
    // beat costs.
    let acts = add_core::game_data::narrative_acts();
    let mut emit_samples = Vec::new();
    // Prepared once. A running game already holds its arc result and its log;
    // rebuilding both per round would time the setup instead of the act, and at
    // full scale the setup dwarfs everything being measured.
    let primed_arcs = sift(&log);
    let mut scratch = log.clone();
    let mut arcs = primed_arcs.clone();
    for round in 0..50 {
        let act = &acts[round % acts.len()];
        let mut event = event_for(act, Some(entities[round % entities.len()]), now);
        event.secrecy = Secrecy::Public;
        // Mirrors Simulation::emit_act exactly: append, then extend the arc
        // result. Benchmarking a cheaper path than the game runs would make the
        // budget meaningless.
        let start = Instant::now();
        scratch.append(event);
        add_core::narrative::sift_append(&mut arcs, &scratch);
        emit_samples.push(micros_since(start));
    }

    // Rumour step: *one* tick boundary of spreading.
    //
    // `advance_rumour` catches up every boundary since it last ran, so calling
    // it on a fresh log runs hundreds of steps at once — measuring that and
    // calling it a step overstates the cost by three orders of magnitude. The
    // clock is wound forward outside the timer so each sample is one boundary.
    const RUMOUR_INTERVAL_SECONDS: f64 = 360.0;
    let mut rumour_samples = Vec::new();
    // Wound forward once, then stepped one boundary at a time. Priming inside
    // the loop would replay every boundary since tick zero on each round.
    let mut rumour_log = log.clone();
    rumour_log.advance_rumour(now, 7);
    for round in 0..20 {
        let step_tick = now + (round as f64 + 1.0) * RUMOUR_INTERVAL_SECONDS;
        let start = Instant::now();
        rumour_log.advance_rumour(step_tick, 7);
        rumour_samples.push(micros_since(start));
    }

    // Storylet selection at a hub.
    let arcs = sift(&log);
    let history = CastHistory::default();
    let mut cast_samples = Vec::new();
    for _ in 0..20 {
        let start = Instant::now();
        std::hint::black_box(cast(&log, &arcs, &history, &entities, now));
        cast_samples.push(micros_since(start));
    }

    // Load: rebuilding every score from the log, which is what a save costs on
    // open because raw scores are deliberately never persisted.
    // What compaction buys: the same cold read, against a log whose aged
    // history has been summarised. Measured on its own clone so nothing above
    // is affected by it.
    let mut compacted = log.clone();
    let folded = compacted.compact(now);
    let mut compacted_samples = Vec::new();
    for round in 0..40 {
        let observer = entities[round % entities.len()];
        let axis = Axis::ALL[round % Axis::ALL.len()];
        let cold_tick = now + 1000.0 + round as f64;
        let start = Instant::now();
        std::hint::black_box(compacted.standing(observer, axis, cold_tick));
        compacted_samples.push(micros_since(start));
    }

    // Two loads: the save the game actually writes, and the same log with
    // nothing folded.
    //
    // §10 names compaction as *how* the load budget is met, and compaction runs
    // on the rumour boundary, so a save that reached this many events has been
    // compacted throughout play — an uncompacted log of 50,000 events is not a
    // state the game produces. The uncompacted figure is still reported,
    // without a budget, so the cost compaction is removing stays visible.
    // The save folds every standing once and writes them in, so this measures
    // a load of a save the game would actually have written. The cost moved to
    // the save is measured too, below: moving work somewhere less visible is
    // not the same as removing it.
    let mut saved = compacted.clone();
    let start = Instant::now();
    saved.warm_for_save(now);
    let save_warm_cold_us = micros_since(start);

    // The same save from a log that has been played rather than just loaded.
    //
    // A game reaching a save point has been asking for standings all along, so
    // the scores for the current tick are already memoised and the save mostly
    // collects them. The cold figure above is a save taken on a log nothing has
    // read, which is the worst case and not the usual one — both are reported,
    // because moving work to a place that is measured less carefully is not the
    // same as removing it.
    let mut played = compacted.clone();
    for entity in &entities {
        for axis in Axis::ALL {
            std::hint::black_box(played.standing(entity, axis, now));
        }
    }
    let start = Instant::now();
    played.warm_for_save(now);
    let save_warm_played_us = micros_since(start);

    let mut load_samples = Vec::new();
    for _ in 0..2 {
        // What a load does: take what the save carried into the cache, then
        // answer the queries that follow.
        let mut fresh = saved.clone();
        fresh.hydrate_from_save();
        let start = Instant::now();
        for observer in &entities {
            for axis in Axis::ALL {
                std::hint::black_box(fresh.standing(observer, axis, now));
            }
        }
        load_samples.push(micros_since(start));
    }

    let mut load_uncompacted_samples = Vec::new();
    for _ in 0..2 {
        // A clone starts with an empty cache, which is the point: opening a
        // save rebuilds every score from the log, because raw scores are
        // deliberately never persisted. Reusing the warmed log here would
        // measure the cache and report a load that never happens.
        let fresh = log.clone();
        let start = Instant::now();
        for observer in &entities {
            for axis in Axis::ALL {
                std::hint::black_box(fresh.standing(observer, axis, now));
            }
        }
        load_uncompacted_samples.push(micros_since(start));
    }

    // What opening a save actually costs.
    //
    // The figures above fold every entity on every axis, which is the worst
    // case and not what the engine does: standing is derived on demand and
    // cached, so a load pays for the scores it is about to show — the people in
    // the scene — not for all eleven axes of every stranger in the world. Both
    // are reported rather than replacing one with the other, because the eager
    // figure is the one §10's budget is written against and redefining a
    // measurement after watching it fail is how a budget stops meaning anything.
    let present: Vec<&str> = entities.iter().take(8).copied().collect();
    let mut load_present_samples = Vec::new();
    for _ in 0..2 {
        let fresh = compacted.clone();
        let start = Instant::now();
        for observer in &present {
            for axis in Axis::ALL {
                std::hint::black_box(fresh.standing(observer, axis, now));
            }
        }
        load_present_samples.push(micros_since(start));
    }

    let measurements = vec![
        Measurement::new("standing_warm", warm_samples),
        // No budget: §10 sets one figure for a standing query, and names the
        // per-entity cache as how it is met. The cold fold is reported so the
        // cost the cache is hiding stays visible rather than becoming folklore.
        Measurement::new("standing_cold", cold_samples),
        Measurement::new("standing_cold_compacted", compacted_samples),
        Measurement::new("emit_act", emit_samples),
        Measurement::new("rumour_step", rumour_samples),
        Measurement::new("storylet_selection", cast_samples),
        Measurement::new("load_replay", load_samples),
        Measurement::new("load_replay_uncompacted", load_uncompacted_samples),
        Measurement::new("load_replay_present_only", load_present_samples),
        Measurement::new("save_warm_scores_cold", vec![save_warm_cold_us]),
        Measurement::new("save_warm_scores_in_play", vec![save_warm_played_us]),
    ];

    BenchReport {
        contract: "add_narr_bench_v1",
        events,
        entities: entities.len(),
        folded,
        measurements,
    }
}
