//! `narr diff-tuning <before> <after>`: what would retuning change?
//!
//! §11: "replays a fixed corpus of recorded playthroughs under both tunings and
//! reports which gates flipped. The human director reviews consequences, not
//! numbers." That last sentence is the whole design. Nobody can look at a
//! changed tier table and say what it does to the game; they can look at "Vell
//! no longer trusts you enough for the storylet that needs it" and judge that.
//!
//! Both tunings are applied to the *traces* of one replay rather than by
//! re-running the engine twice. A trace records each contribution's tier, its
//! base and the delta it produced, so re-deriving a score under a different
//! tier table is a matter of rescaling each delta and folding again — and
//! `an_unchanged_tuning_reproduces_the_engine_exactly` holds that path to the
//! engine's own answer. Replaying once also means the two tunings see exactly
//! the same playthroughs, which is what makes the comparison meaningful.

use std::collections::BTreeMap;

use add_core::narrative::{Axis, Band, ImpactTrace, NarrativeLog, Tier, fold};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

/// The tuning knobs §5A exposes: what each tier is worth, and where the bands
/// are cut. Everything else in the pipeline is a multiplier on these.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Tuning {
    pub trivial: f64,
    pub minor: f64,
    pub moderate: f64,
    pub major: f64,
    pub severe: f64,
    pub defining: f64,
    /// Lower edges of the bands, from the §5A tuning table.
    pub very_high_at: f64,
    pub high_at: f64,
    pub mid_at: f64,
    pub low_at: f64,
}

impl Default for Tuning {
    fn default() -> Self {
        Self {
            trivial: 1.0,
            minor: 3.0,
            moderate: 6.0,
            major: 12.0,
            severe: 25.0,
            defining: 50.0,
            very_high_at: 60.0,
            high_at: 25.0,
            mid_at: -10.0,
            low_at: -40.0,
        }
    }
}

impl Tuning {
    pub fn load(path: &std::path::Path) -> Result<Self, String> {
        let text = std::fs::read_to_string(path)
            .map_err(|error| format!("cannot read {}: {error}", path.display()))?;
        serde_json::from_str(&text)
            .map_err(|error| format!("cannot parse {}: {error}", path.display()))
    }

    fn base(&self, tier: Tier) -> f64 {
        match tier {
            Tier::Trivial => self.trivial,
            Tier::Minor => self.minor,
            Tier::Moderate => self.moderate,
            Tier::Major => self.major,
            Tier::Severe => self.severe,
            Tier::Defining => self.defining,
        }
    }

    fn band(&self, score: f64) -> Band {
        match score {
            s if s >= self.very_high_at => Band::VeryHigh,
            s if s >= self.high_at => Band::High,
            s if s >= self.mid_at => Band::Mid,
            s if s >= self.low_at => Band::Low,
            _ => Band::VeryLow,
        }
    }
}

/// Re-derive a score from its traces under a different tuning.
///
/// Each contribution is rescaled by how much its tier is worth now against what
/// it was worth when the trace was taken, then folded in the original order —
/// order matters, because saturation is order-dependent.
pub fn retune(traces: &[ImpactTrace], tuning: &Tuning) -> f64 {
    let mut score = 0.0;
    for trace in traces {
        let scale = if trace.base == 0.0 {
            1.0
        } else {
            tuning.base(trace.tier) / trace.base
        };
        score = fold(score, trace.delta * scale);
    }
    score
}

/// One consequence of a retuning, in the terms a director can judge.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BandFlip {
    pub entity: String,
    pub axis: String,
    pub before: String,
    pub after: String,
    pub score_before: f64,
    pub score_after: f64,
}

/// A storylet that becomes castable, or stops being castable, because a role's
/// band requirement is now met or no longer met.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GateFlip {
    pub storylet_id: String,
    pub role: String,
    pub axis: String,
    pub entity: String,
    pub was_eligible: bool,
    pub is_eligible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffReport {
    pub contract: &'static str,
    pub playthroughs: usize,
    pub events: usize,
    pub band_flips: Vec<BandFlip>,
    pub gate_flips: Vec<GateFlip>,
}

impl DiffReport {
    pub fn to_value(&self) -> Value {
        serde_json::to_value(self).unwrap_or_else(|_| json!({"status": "unserializable"}))
    }

    pub fn unchanged(&self) -> bool {
        self.band_flips.is_empty() && self.gate_flips.is_empty()
    }
}

fn band_matches(band: Band, at_least: &str, at_most: &str) -> bool {
    let parse = |value: &str| match value {
        "very_low" => Band::VeryLow,
        "low" => Band::Low,
        "high" => Band::High,
        "very_high" => Band::VeryHigh,
        _ => Band::Mid,
    };
    band >= parse(at_least) && band <= parse(at_most)
}

pub fn diff(log: &NarrativeLog, before: &Tuning, after: &Tuning, playthroughs: usize) -> DiffReport {
    let now = log.events.last().map(|event| event.tick).unwrap_or_default();
    let entities = add_core::narrative::castable_entities();

    let mut band_flips = Vec::new();
    let mut bands: BTreeMap<(String, Axis), (Band, Band)> = BTreeMap::new();
    for entity in &entities {
        for axis in Axis::ALL {
            let traces = log.explain(entity, axis, now).1;
            let score_before = retune(&traces, before);
            let score_after = retune(&traces, after);
            let band_before = before.band(score_before);
            let band_after = after.band(score_after);
            bands.insert((entity.to_string(), axis), (band_before, band_after));
            if band_before != band_after {
                band_flips.push(BandFlip {
                    entity: entity.to_string(),
                    axis: axis.as_str().to_string(),
                    before: band_before.as_str().to_string(),
                    after: band_after.as_str().to_string(),
                    score_before,
                    score_after,
                });
            }
        }
    }

    // A band moving only matters where something reads it. Storylet roles are
    // the gate surface, so they are what gets reported as a consequence.
    let mut gate_flips = Vec::new();
    for storylet in add_core::game_data::storylets() {
        for role in storylet.roles {
            let Some(axis) = Axis::from_str(role.axis) else {
                continue;
            };
            for entity in &entities {
                let Some((band_before, band_after)) = bands.get(&((*entity).to_string(), axis))
                else {
                    continue;
                };
                let was = band_matches(*band_before, role.at_least, role.at_most);
                let is = band_matches(*band_after, role.at_least, role.at_most);
                if was != is {
                    gate_flips.push(GateFlip {
                        storylet_id: storylet.id.to_string(),
                        role: role.name.to_string(),
                        axis: role.axis.to_string(),
                        entity: (*entity).to_string(),
                        was_eligible: was,
                        is_eligible: is,
                    });
                }
            }
        }
    }

    DiffReport {
        contract: "add_narr_diff_tuning_v1",
        playthroughs,
        events: log.events.len(),
        band_flips,
        gate_flips,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use add_core::narrative::{Secrecy, event_for};

    fn played() -> NarrativeLog {
        let mut log = NarrativeLog::default();
        let acts = add_core::game_data::narrative_acts();
        let targets = add_core::narrative::castable_entities();
        for step in 0..40 {
            let act = &acts[step % acts.len()];
            let mut event = event_for(act, Some(targets[step % targets.len()]), step as f64 * 720.0);
            event.secrecy = Secrecy::Public;
            log.append(event);
        }
        log
    }

    /// The whole tool rests on this: re-deriving a score from its traces must
    /// reach the engine's own answer when nothing has been retuned. If it did
    /// not, every flip reported would be an artefact of the re-derivation
    /// rather than a consequence of the tuning change.
    #[test]
    fn an_unchanged_tuning_reproduces_the_engine_exactly() {
        let log = played();
        let now = log.events.last().map(|event| event.tick).unwrap_or_default();
        let default = Tuning::default();

        let mut checked = 0;
        for entity in add_core::narrative::castable_entities() {
            for axis in Axis::ALL {
                let (engine, traces) = log.explain(entity, axis, now);
                let rederived = retune(&traces, &default);
                assert!(
                    (engine - rederived).abs() < 1e-9,
                    "{entity} {axis:?}: engine {engine} but re-derived {rederived}",
                );
                if !traces.is_empty() {
                    checked += 1;
                }
            }
        }
        assert!(checked > 0, "this proves nothing if no axis had any contribution");
    }

    /// `tuning/current.json` must be the tuning the game actually runs.
    ///
    /// It is the baseline every comparison is made against, so if it drifts
    /// from the engine's defaults then `diff-tuning` reports the drift as
    /// though it were the change under review — the same trap as a budget file
    /// that no longer matches the code it gates.
    #[test]
    fn the_committed_baseline_matches_the_engine_defaults() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../tuning/current.json");
        let committed = Tuning::load(&path).expect("tuning/current.json should load");
        assert_eq!(
            committed,
            Tuning::default(),
            "tuning/current.json has drifted from the engine's defaults",
        );
    }

    /// Halving every tier should move somebody, or the tool would report
    /// "no consequences" for a change that plainly has some.
    #[test]
    fn a_weaker_tuning_moves_someone_across_a_band() {
        let log = played();
        let before = Tuning::default();
        let after = Tuning {
            trivial: 0.5,
            minor: 1.5,
            moderate: 3.0,
            major: 6.0,
            severe: 12.5,
            defining: 25.0,
            ..Tuning::default()
        };

        let report = diff(&log, &before, &after, 1);
        assert!(
            !report.unchanged(),
            "halving every tier should change where somebody sits",
        );
        assert!(
            report.band_flips.iter().all(|flip| flip.before != flip.after),
            "a reported flip must actually be a change",
        );
    }

    /// The identity case must report nothing, or every diff would be noise.
    #[test]
    fn comparing_a_tuning_with_itself_reports_no_consequences() {
        let log = played();
        let default = Tuning::default();
        let report = diff(&log, &default, &default, 1);
        assert!(
            report.unchanged(),
            "unchanged tuning reported {} band and {} gate flips",
            report.band_flips.len(),
            report.gate_flips.len(),
        );
    }
}
