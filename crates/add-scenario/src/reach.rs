//! `narr reach`: can a gated scene ever actually open?
//!
//! §11, in two passes. "First, a static pass reads gate expressions ... and
//! flags contradictions, for example a band that does not exist. Second, a
//! guided search uses the novelty policy with the target gate as the goal. A
//! gate still unreached after the budget is reported as suspect, with the
//! closest attempt and what was missing."
//!
//! The gates are storylet roles: a role names an axis and a band range, and a
//! storylet cannot be cast until somebody sits inside it. Reactions trigger on
//! acts rather than on bands, so they gate nothing. This is content nobody can
//! check by reading — a role asking for `very_high` grievance is indisputably
//! authored and may still be unreachable, because repetition damps the axis
//! before it ever gets there.

use std::collections::BTreeMap;

use add_core::narrative::{Axis, Band, NarrativeLog};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Gate {
    pub storylet_id: String,
    pub role: String,
    pub axis: String,
    pub at_least: String,
    pub at_most: String,
}

impl Gate {
    fn key(&self) -> String {
        format!("{}|{}", self.storylet_id, self.role)
    }
}

/// A gate that cannot be satisfied by anything, whatever is played.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Contradiction {
    pub gate: Gate,
    pub problem: String,
}

/// A gate nothing reached, with how close it came.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Unreached {
    pub gate: Gate,
    pub closest_entity: String,
    pub closest_score: f64,
    pub closest_band: String,
    /// How much further the score had to travel, in standing points.
    pub missing: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReachReport {
    pub contract: &'static str,
    pub gates: usize,
    pub playthroughs: usize,
    pub contradictions: Vec<Contradiction>,
    pub reached: Vec<String>,
    pub unreached: Vec<Unreached>,
}

impl ReachReport {
    pub fn to_value(&self) -> Value {
        serde_json::to_value(self).unwrap_or_else(|_| json!({"status": "unserializable"}))
    }

    /// §11 fails CI on "a gate no search can satisfy".
    pub fn ok(&self) -> bool {
        self.contradictions.is_empty() && self.unreached.is_empty()
    }
}

/// Every gate the content declares.
pub fn gates() -> Vec<Gate> {
    let mut gates = Vec::new();
    for storylet in add_core::game_data::storylets() {
        for role in storylet.roles {
            // A role with no axis accepts anyone, so it gates nothing.
            if role.axis.is_empty() {
                continue;
            }
            gates.push(Gate {
                storylet_id: storylet.id.to_string(),
                role: role.name.to_string(),
                axis: role.axis.to_string(),
                at_least: role.at_least.to_string(),
                at_most: role.at_most.to_string(),
            });
        }
    }
    gates
}

/// Pass one: gates that are wrong on their face, before anything is played.
pub fn contradictions(gates: &[Gate]) -> Vec<Contradiction> {
    let mut faults = Vec::new();
    for gate in gates {
        if Axis::from_str(&gate.axis).is_none() {
            faults.push(Contradiction {
                gate: gate.clone(),
                problem: format!("no axis named `{}`", gate.axis),
            });
            continue;
        }
        let Some(low) = Band::from_str(&gate.at_least) else {
            faults.push(Contradiction {
                gate: gate.clone(),
                problem: format!("no band named `{}`", gate.at_least),
            });
            continue;
        };
        let Some(high) = Band::from_str(&gate.at_most) else {
            faults.push(Contradiction {
                gate: gate.clone(),
                problem: format!("no band named `{}`", gate.at_most),
            });
            continue;
        };
        if low > high {
            faults.push(Contradiction {
                gate: gate.clone(),
                problem: format!(
                    "asks for at least `{}` and at most `{}`, which is empty",
                    gate.at_least, gate.at_most
                ),
            });
        }
    }
    faults
}

/// Pass two: play, and watch for anyone who satisfies each gate.
///
/// Bands are sampled as the log grows rather than only at the end, because a
/// gate can be open in the middle of a game and shut again by the time it
/// finishes — decay and repetition both pull scores back toward the middle, and
/// a gate that was briefly satisfied is a gate that fires.
pub fn search(runs: usize, max_steps: usize) -> ReachReport {
    search_gates(gates(), runs, max_steps)
}

/// The search against an explicit set of gates, so a test can ask about a gate
/// the content does not happen to declare.
pub fn search_gates(gates: Vec<Gate>, runs: usize, max_steps: usize) -> ReachReport {
    let contradictions = contradictions(&gates);
    let entities = add_core::narrative::castable_entities();

    let played = super::calibrate::play(runs, max_steps);
    let mut reached: BTreeMap<String, bool> = gates.iter().map(|g| (g.key(), false)).collect();
    // The closest anything came, per gate: entity, score and the gap left.
    let mut closest: BTreeMap<String, (String, f64, f64)> = BTreeMap::new();

    let mut log = NarrativeLog::default();
    for (index, event) in played.events.iter().enumerate() {
        log.append(event.clone());
        // Sampling every event at every axis for every entity is the bulk of
        // the work; every few events is enough to catch a band that opens.
        if index % 5 != 0 && index + 1 != played.events.len() {
            continue;
        }
        let now = event.tick;
        for gate in &gates {
            let Some(axis) = Axis::from_str(&gate.axis) else {
                continue;
            };
            let (Some(low), Some(high)) =
                (Band::from_str(&gate.at_least), Band::from_str(&gate.at_most))
            else {
                continue;
            };
            for entity in &entities {
                let score = log.standing(entity, axis, now);
                let band = Band::of(score);
                if band >= low && band <= high {
                    reached.insert(gate.key(), true);
                    continue;
                }
                // How far short, toward whichever edge it failed.
                let missing = if band < low {
                    low.lower_edge().map(|edge| edge - score).unwrap_or(0.0)
                } else {
                    // Above the range: it must come down past the next edge up.
                    let above = Band::from_str(&gate.at_most)
                        .and_then(|b| match b {
                            Band::VeryHigh => None,
                            Band::High => Band::VeryHigh.lower_edge(),
                            Band::Mid => Band::High.lower_edge(),
                            Band::Low => Band::Mid.lower_edge(),
                            Band::VeryLow => Band::Low.lower_edge(),
                        })
                        .unwrap_or(score);
                    score - above
                };
                let entry = closest
                    .entry(gate.key())
                    .or_insert_with(|| ((*entity).to_string(), score, f64::MAX));
                if missing.abs() < entry.2.abs() {
                    *entry = ((*entity).to_string(), score, missing);
                }
            }
        }
    }

    let mut reached_ids = Vec::new();
    let mut unreached = Vec::new();
    for gate in &gates {
        if reached.get(&gate.key()).copied().unwrap_or(false) {
            reached_ids.push(gate.key());
            continue;
        }
        let (entity, score, missing) = closest
            .get(&gate.key())
            .cloned()
            .unwrap_or_else(|| ("(nobody)".to_string(), 0.0, f64::NAN));
        unreached.push(Unreached {
            gate: gate.clone(),
            closest_entity: entity,
            closest_score: score,
            closest_band: Band::of(score).as_str().to_string(),
            missing,
        });
    }

    ReachReport {
        contract: "add_narr_reach_v1",
        gates: gates.len(),
        playthroughs: runs,
        contradictions,
        reached: reached_ids,
        unreached,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn gate(axis: &str, at_least: &str, at_most: &str) -> Gate {
        Gate {
            storylet_id: "storylet.test".to_string(),
            role: "x".to_string(),
            axis: axis.to_string(),
            at_least: at_least.to_string(),
            at_most: at_most.to_string(),
        }
    }

    /// The static pass has to catch the things a writer cannot see by reading.
    #[test]
    fn the_static_pass_catches_gates_that_can_never_open() {
        let faults = contradictions(&[
            gate("integrity", "low", "very_low"),
            gate("not_an_axis", "low", "high"),
            gate("integrity", "quite_low", "high"),
            gate("integrity", "low", "high"),
        ]);

        let problems: Vec<&str> = faults.iter().map(|f| f.problem.as_str()).collect();
        assert_eq!(faults.len(), 3, "three of the four are wrong: {problems:?}");
        assert!(problems.iter().any(|p| p.contains("which is empty")));
        assert!(problems.iter().any(|p| p.contains("no axis named")));
        assert!(problems.iter().any(|p| p.contains("no band named")));
    }

    /// A well-formed gate the content cannot satisfy must be reported, or the
    /// tool would only ever confirm what already works.
    #[test]
    fn a_gate_nothing_can_satisfy_is_reported_with_how_close_it_came() {
        // `alignment` is one of the axes calibrate reports as dead: no act in
        // the catalog moves it, so nobody can ever be high on it.
        let report = search_gates(vec![gate("alignment", "very_high", "very_high")], 2, 40);

        assert!(report.contradictions.is_empty(), "the gate is well-formed");
        assert_eq!(report.unreached.len(), 1, "an unreachable gate must be reported");
        let unreached = &report.unreached[0];
        assert!(
            unreached.missing > 0.0,
            "the report should say how far short it fell, not just that it did",
        );
        assert!(!report.ok(), "an unreached gate should fail the command");
    }

    /// And a gate the content does satisfy must not be reported, or the tool
    /// would cry wolf on every run.
    #[test]
    fn a_gate_the_content_reaches_is_not_reported() {
        // Broken promises drive integrity down hard, so `low` is reachable.
        let report = search_gates(vec![gate("integrity", "very_low", "low")], 2, 40);
        assert!(
            report.unreached.is_empty(),
            "integrity should reach low: {:?}",
            report.unreached,
        );
        assert!(report.ok());
    }
}
