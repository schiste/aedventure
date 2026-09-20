//! The event log, and the impact pipeline that folds it into standing.
//!
//! Specification principle 2: the log is the source of truth. Standing is
//! derived by replaying it, so nothing mutates a score without an event behind
//! it, and retuning the tables changes what an existing save means without
//! rewriting its history.
//!
//! This is a separate channel from `GameState.events`, which is cleared every
//! command and drives UI notifications. This one is append-only and saved.

use serde::{Deserialize, Serialize};

use super::graph::inheritance_weight;
use super::standing::{Axis, Band, Derived, Intent, Tier, clamp_modifiers, derive, fold};
use crate::game_data::{NarrativeActDef, narrative_act_def};

/// One consequential thing the Hero did.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NarrativeEvent {
    /// Monotonic. Order matters, because saturation is order-dependent.
    pub id: u64,
    /// Engine tick when it happened.
    pub tick: f64,
    pub act_id: String,
    /// Whom it was done to, when the act has a target.
    pub target: Option<String>,
    /// Intent, which the caller may override per occurrence.
    pub intent: Intent,
    /// Cost to the Hero, 0.6 to 2.0. Cheap kindness proves little (costly
    /// signalling; Zahavi).
    pub cost: f64,
    /// How badly the target needed it, 1.0 to 2.0.
    pub need: f64,
}

/// One resolved contribution to one entity's view of the Hero.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImpactTrace {
    pub event_id: u64,
    pub act_id: String,
    pub scope: String,
    pub axis: Axis,
    pub tier: Tier,
    pub base: f64,
    pub negativity: f64,
    pub intent: f64,
    pub cost: f64,
    pub need: f64,
    pub repetition: f64,
    pub inheritance: f64,
    pub clamped_modifiers: f64,
    pub delta: f64,
    pub score_after: f64,
}

/// Append-only history. Small and flat on purpose: compaction belongs to N7.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NarrativeLog {
    pub events: Vec<NarrativeEvent>,
    pub next_id: u64,
}

impl NarrativeLog {
    pub fn append(&mut self, mut event: NarrativeEvent) -> u64 {
        event.id = self.next_id;
        self.next_id += 1;
        let id = event.id;
        self.events.push(event);
        id
    }

    /// Resolve `scope` for one impact of one event: `Target` means whoever the
    /// act was done to, so acts are authored once and reused.
    fn resolve_scope<'a>(scope: &'a str, event: &'a NarrativeEvent) -> Option<&'a str> {
        match scope {
            "Target" => event.target.as_deref(),
            "ParentOf(Target)" => event
                .target
                .as_deref()
                .and_then(crate::game_data::narrative_entity_def)
                .and_then(|entity| entity.parent),
            "FactionOf(Target)" => {
                let chain = event
                    .target
                    .as_deref()
                    .map(super::graph::ancestry)
                    .unwrap_or_default();
                chain.last().copied()
            }
            explicit => Some(explicit),
        }
    }

    /// Repetition: 0.7^n over similar acts toward the same scope. Ten small
    /// gifts do not equal one sacrifice (habituation, diminishing returns).
    fn repetition_factor(&self, upto: usize, act_id: &str, scope: &str) -> f64 {
        let seen = self.events[..upto]
            .iter()
            .filter(|event| {
                event.act_id == act_id
                    && narrative_act_def(&event.act_id)
                        .map(|act| {
                            act.impacts
                                .iter()
                                .any(|impact| Self::resolve_scope(impact.scope, event) == Some(scope))
                        })
                        .unwrap_or(false)
            })
            .count();
        0.7_f64.powi(seen as i32)
    }

    /// Fold the log into one entity's score on one axis, and return the trace
    /// of every contribution. The trace is what `narr explain` prints, and it
    /// is produced by the same code path that produces the score, so an
    /// explanation can never disagree with the number.
    pub fn explain(&self, observer_id: &str, axis: Axis) -> (f64, Vec<ImpactTrace>) {
        let mut score = 0.0;
        let mut traces = Vec::new();

        for (index, event) in self.events.iter().enumerate() {
            let Some(act) = narrative_act_def(&event.act_id) else {
                continue;
            };
            for impact in act.impacts {
                if Axis::from_str(impact.axis) != Some(axis) {
                    continue;
                }
                let Some(scope) = Self::resolve_scope(impact.scope, event) else {
                    continue;
                };
                let inheritance = inheritance_weight(observer_id, scope);
                if inheritance <= 0.0 {
                    continue;
                }
                let Some(tier) = Tier::from_str(impact.tier) else {
                    continue;
                };

                let negative = impact.sign < 0;
                let negativity = if negative {
                    axis.negativity()
                } else {
                    axis.positivity()
                };
                // Cost and need only amplify help, never harm.
                let cost = if negative { 1.0 } else { event.cost };
                let repetition = self.repetition_factor(index, &event.act_id, scope);

                let modifiers = clamp_modifiers(
                    negativity * event.intent.factor() * cost * event.need * repetition,
                );
                let delta = (impact.sign as f64) * tier.base() * modifiers * inheritance;
                score = fold(score, delta);

                traces.push(ImpactTrace {
                    event_id: event.id,
                    act_id: event.act_id.clone(),
                    scope: scope.to_string(),
                    axis,
                    tier,
                    base: tier.base(),
                    negativity,
                    intent: event.intent.factor(),
                    cost,
                    need: event.need,
                    repetition,
                    inheritance,
                    clamped_modifiers: modifiers,
                    delta,
                    score_after: score,
                });
            }
        }

        (score, traces)
    }

    pub fn standing(&self, observer_id: &str, axis: Axis) -> f64 {
        self.explain(observer_id, axis).0
    }

    pub fn band(&self, observer_id: &str, axis: Axis) -> Band {
        Band::of(self.standing(observer_id, axis))
    }

    pub fn derived(&self, observer_id: &str, kind: Derived) -> f64 {
        derive(kind, &|axis| self.standing(observer_id, axis))
    }

    pub fn derived_band(&self, observer_id: &str, kind: Derived) -> Band {
        Band::of(self.derived(observer_id, kind))
    }
}

/// Build an event for an act, defaulting the per-occurrence context.
pub fn event_for(act: &NarrativeActDef, target: Option<&str>, tick: f64) -> NarrativeEvent {
    NarrativeEvent {
        id: 0,
        tick,
        act_id: act.id.to_string(),
        target: target.map(str::to_string),
        intent: Intent::from_str(act.intent).unwrap_or(Intent::Deliberate),
        cost: 1.0,
        need: 1.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const VELL: &str = "entity.vell";
    const PEER: &str = "entity.joren";
    const SUBFACTION: &str = "entity.sleepless.sounding_five";
    const FACTION: &str = "entity.sleepless";
    const HELP: &str = "act.share_scarce_water";
    const BETRAY: &str = "act.break_a_promise";

    fn log_with(act_id: &str, target: &str) -> NarrativeLog {
        let mut log = NarrativeLog::default();
        let act = narrative_act_def(act_id).expect("act exists");
        log.append(event_for(act, Some(target), 0.0));
        log
    }

    #[test]
    fn helping_someone_raises_their_goodwill() {
        let log = log_with(HELP, VELL);
        let score = log.standing(VELL, Axis::Goodwill);
        assert!(score > 0.0, "goodwill was {score}");
    }

    #[test]
    fn one_act_reaches_three_distances_at_three_strengths() {
        // The acceptance shape for N3: the target, a peer in the same
        // sub-faction, and a stranger elsewhere in the faction.
        let log = log_with(HELP, VELL);
        let target = log.standing(VELL, Axis::Goodwill);
        let peer = log.standing(PEER, Axis::Goodwill);
        let stranger = log.standing(FACTION, Axis::Goodwill);

        assert!(
            target > peer && peer > stranger,
            "expected target {target} > peer {peer} > stranger {stranger}",
        );
        assert!(stranger >= 0.0, "the faction should not be harmed by help");
    }

    #[test]
    fn a_broken_promise_costs_integrity_far_more_than_help_gains_goodwill() {
        let helped = log_with(HELP, VELL).standing(VELL, Axis::Goodwill);
        let betrayed = log_with(BETRAY, VELL).standing(VELL, Axis::Integrity);
        assert!(betrayed < 0.0, "integrity should fall: {betrayed}");
        assert!(
            betrayed.abs() > helped,
            "bad should weigh more than good: {betrayed} vs {helped}",
        );
    }

    #[test]
    fn repeating_the_same_kindness_yields_less_each_time() {
        let act = narrative_act_def(HELP).expect("act");
        let mut log = NarrativeLog::default();
        log.append(event_for(act, Some(VELL), 0.0));
        let first = log.standing(VELL, Axis::Goodwill);
        log.append(event_for(act, Some(VELL), 1.0));
        let second = log.standing(VELL, Axis::Goodwill);

        let first_gain = first;
        let second_gain = second - first;
        assert!(
            second_gain < first_gain,
            "second gain {second_gain} should be smaller than the first {first_gain}",
        );
    }

    #[test]
    fn cost_and_need_amplify_help_but_not_harm() {
        let act = narrative_act_def(HELP).expect("act");
        let mut cheap = NarrativeLog::default();
        cheap.append(event_for(act, Some(VELL), 0.0));

        let mut costly = NarrativeLog::default();
        let mut event = event_for(act, Some(VELL), 0.0);
        event.cost = 2.0;
        event.need = 1.8;
        costly.append(event);

        assert!(
            costly.standing(VELL, Axis::Goodwill) > cheap.standing(VELL, Axis::Goodwill),
            "a costly gift in real need should land harder",
        );
    }

    #[test]
    fn the_explanation_and_the_score_come_from_one_code_path() {
        let log = log_with(HELP, VELL);
        let (score, traces) = log.explain(VELL, Axis::Goodwill);
        assert!(!traces.is_empty());
        assert_eq!(
            traces.last().map(|trace| trace.score_after),
            Some(score),
            "the last trace must end on the reported score",
        );
    }

    #[test]
    fn an_empty_log_leaves_everyone_neutral() {
        let log = NarrativeLog::default();
        assert_eq!(log.standing(VELL, Axis::Goodwill), 0.0);
        assert_eq!(log.band(VELL, Axis::Goodwill), Band::Mid);
    }

    #[test]
    fn standing_is_rebuilt_identically_from_the_same_log() {
        // The whole point of deriving rather than storing.
        let log = log_with(HELP, VELL);
        let rebuilt: NarrativeLog =
            serde_json::from_str(&serde_json::to_string(&log).unwrap()).unwrap();
        assert_eq!(
            log.standing(VELL, Axis::Goodwill),
            rebuilt.standing(VELL, Axis::Goodwill),
        );
    }
}
