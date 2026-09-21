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
use super::standing::{
    Axis, Band, Derived, GAME_DAY_SECONDS, Intent, Tier, clamp_modifiers, derive, fold,
};
use super::knowledge::{KnowledgeBase, Knowledge, Secrecy};
use super::values::{Profile, Value, verdict};
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
    /// How visible it was when it happened.
    #[serde(default)]
    pub secrecy: Secrecy,
    /// Earlier events this one happened because of. Gating and causality are
    /// the same bookkeeping: when a choice was offered because of something,
    /// that something becomes its cause.
    #[serde(default)]
    pub causes: Vec<u64>,
    /// Who was present, beyond the target. Supplied by the engine's presence,
    /// never listed by authored dialogue.
    #[serde(default)]
    pub witnesses: Vec<String>,
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
    /// Closeness amplifier: kindness and betrayal land harder in close bonds.
    pub closeness: f64,
    /// Belonging: black sheep punished harder, small slips forgiven.
    pub belonging: f64,
    /// Values verdict, for `sign: values` impacts. Can flip the sign.
    pub values: f64,
    /// Decay already applied, 1.0 when the contribution is permanent.
    pub decay: f64,
    /// How reliably this observer holds the event. 1.0 first-hand.
    pub fidelity: f64,
    pub inheritance: f64,
    pub clamped_modifiers: f64,
    pub delta: f64,
    pub score_after: f64,
}

/// Append-only history. Small and flat on purpose: compaction belongs to N7.
#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NarrativeLog {
    pub events: Vec<NarrativeEvent>,
    pub next_id: u64,
    /// Who has heard what. Stored rather than derived: rumour is a
    /// time-ordered stochastic process, so replaying it on every standing read
    /// would mean re-running the whole spread each time.
    #[serde(default)]
    pub knowledge: KnowledgeBase,
    /// Reactions that have already fired, so a rule fires once per trigger
    /// and its cooldown can be read from the log rather than tracked apart.
    #[serde(default)]
    pub fired_reactions: Vec<crate::narrative::react::FiredReaction>,
    /// Memoised scores, keyed by the exact inputs that produce them.
    ///
    /// Folding one axis walks the whole log, and callers query in bursts: the
    /// caster asks for eleven axes across every candidate at a single tick, and
    /// the UI asks again for each entity it draws. Those repeats are bit-for-bit
    /// identical, so they are answered from here.
    ///
    /// Derived state, never persisted, and not part of the log's identity —
    /// hence `skip`, and the hand-written `PartialEq` and `Clone` below, which
    /// ignore it. A stale answer is impossible by construction rather than by
    /// discipline: the key carries the log length, the observer's knowledge
    /// count and the tick, so anything that could change a score changes the
    /// key. That is the specification's "invalidated when that entity learns an
    /// event", expressed so that forgetting to invalidate cannot happen.
    #[serde(skip)]
    standing_cache: std::cell::RefCell<std::collections::HashMap<StandingKey, f64>>,
}

/// The cache is derived state, so it takes no part in equality: two logs with
/// the same events and knowledge are the same log, whether or not either has
/// answered a query yet. Scenario and determinism tests compare logs directly
/// and would otherwise fail on nothing more than one of them having been read.
impl PartialEq for NarrativeLog {
    fn eq(&self, other: &Self) -> bool {
        self.events == other.events
            && self.next_id == other.next_id
            && self.knowledge == other.knowledge
            && self.fired_reactions == other.fired_reactions
    }
}

/// A clone starts with an empty cache rather than copying one. The entries
/// would still be valid — the key pins every input — but a clone is usually
/// taken to diverge from the original, so carrying them costs more than it saves.
impl Clone for NarrativeLog {
    fn clone(&self) -> Self {
        Self {
            events: self.events.clone(),
            next_id: self.next_id,
            knowledge: self.knowledge.clone(),
            fired_reactions: self.fired_reactions.clone(),
            standing_cache: Default::default(),
        }
    }
}

/// Everything a folded score depends on. Two queries with equal keys must
/// produce equal scores, so the key is the cache's correctness argument.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct StandingKey {
    observer: String,
    axis: Axis,
    /// `f64` has no `Eq`, and ticks are compared for exact equality here, so
    /// the bit pattern is the key. Any difference at all is a cache miss,
    /// which is the safe direction.
    tick_bits: u64,
    events: usize,
    knowledge: usize,
}

/// An observer's value profile: their own when authored, otherwise inherited
/// from the group they belong to, so a member without a hand-written profile
/// still reads acts the way their group does.
fn profile_for(entity_id: &str) -> Profile {
    let mut current = crate::game_data::narrative_entity_def(entity_id);
    while let Some(entity) = current {
        let profile = Profile::from_pairs(entity.values);
        if !profile.is_empty() {
            return profile;
        }
        current = entity.parent.and_then(crate::game_data::narrative_entity_def);
    }
    Profile::default()
}

/// The values an act expresses, resolved from authored strings.
fn expressed(act: &NarrativeActDef) -> Vec<(Value, f64)> {
    act.expresses
        .iter()
        .filter_map(|(name, weight)| Value::from_str(name).map(|value| (value, *weight)))
        .collect()
}

impl NarrativeLog {
    pub fn append(&mut self, mut event: NarrativeEvent) -> u64 {
        event.id = self.next_id;
        self.next_id += 1;
        let id = event.id;
        self.seed_knowledge(&event, id);
        self.events.push(event);
        id
    }

    /// Who knows an event the moment it happens, from its secrecy.
    fn seed_knowledge(&mut self, event: &NarrativeEvent, id: u64) {
        match event.secrecy {
            // Nobody but the Hero. Until it leaks it changes nothing.
            Secrecy::Secret => {}
            Secrecy::Witnessed => {
                if let Some(target) = event.target.as_deref() {
                    self.knowledge.learn(target, id, Knowledge::first_hand(event.tick));
                }
                for witness in &event.witnesses {
                    self.knowledge.learn(witness, id, Knowledge::first_hand(event.tick));
                }
            }
            Secrecy::Public => {
                // Everyone under any scope the act touches.
                let Some(act) = narrative_act_def(&event.act_id) else { return };
                let scopes: Vec<String> = act
                    .impacts
                    .iter()
                    .filter_map(|impact| Self::resolve_scope(impact.scope, event))
                    .map(str::to_string)
                    .collect();
                for entity in crate::game_data::narrative_entities() {
                    let chain = super::graph::ancestry(entity.id);
                    if scopes.iter().any(|scope| chain.contains(&scope.as_str())) {
                        self.knowledge
                            .learn(entity.id, id, Knowledge::first_hand(event.tick));
                    }
                }
            }
        }
    }

    /// Advance rumour to `now_tick`. Called from the engine's tick path.
    pub fn advance_rumour(&mut self, now_tick: f64, seed: u64) {
        self.knowledge.advance(now_tick, seed);
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
    /// The diminishing return on repeating the same act against the same scope:
    /// the nth occurrence lands at 0.7^n of the first.
    ///
    /// `seen` is the number of *prior* occurrences, which `fold_axis` now
    /// accumulates as it walks the log forward. It used to be counted by
    /// rescanning every earlier event for every event, which made folding one
    /// axis quadratic in the log: 12 million inner steps at 5,000 events and
    /// 1.25 billion at the 50,000 the specification sizes for. The arithmetic
    /// is unchanged — only how often the count is computed.
    fn repetition_decay(seen: u32) -> f64 {
        0.7_f64.powi(seen as i32)
    }

    /// Fold the log into one entity's score on one axis, and return the trace
    /// of every contribution. The trace is what `narr explain` prints, and it
    /// is produced by the same code path that produces the score, so an
    /// explanation can never disagree with the number.
    /// Closeness and belonging are themselves folded axes, so they are
    /// computed first with the observer modifiers neutral. One extra pass,
    /// bounded, and it keeps the amplifiers from being self-referential.
    fn observer_context(&self, observer_id: &str, now_tick: f64) -> (f64, f64) {
        let closeness = self
            .fold_axis(observer_id, Axis::Closeness, now_tick, None)
            .0;
        let belonging = self
            .fold_axis(observer_id, Axis::Belonging, now_tick, None)
            .0;
        (closeness, belonging)
    }

    pub fn explain(&self, observer_id: &str, axis: Axis, now_tick: f64) -> (f64, Vec<ImpactTrace>) {
        let context = self.observer_context(observer_id, now_tick);
        self.fold_axis(observer_id, axis, now_tick, Some(context))
    }

    fn fold_axis(
        &self,
        observer_id: &str,
        axis: Axis,
        now_tick: f64,
        context: Option<(f64, f64)>,
    ) -> (f64, Vec<ImpactTrace>) {
        let mut score = 0.0;
        let mut traces = Vec::new();
        // Prior occurrences of (act, scope), accumulated as the walk proceeds.
        // Counted over every impact of every event, not only those on the axis
        // being folded, because repetition is a property of the act landing on
        // the scope at all — which is what the rescan it replaces also did.
        let mut seen_counts: std::collections::HashMap<(&str, &str), u32> =
            std::collections::HashMap::new();

        for event in self.events.iter() {
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
                // §6: an impact moves an entity's standing only if that entity
                // knows the event, and only as far as it trusts the account it
                // holds. This is what makes a secret mechanically real.
                let Some(fidelity) = self.knowledge.fidelity(observer_id, event.id) else {
                    continue;
                };
                let Some(tier) = Tier::from_str(impact.tier) else {
                    continue;
                };

                // `sign: 0` means Values: the sign and strength come from how
                // this observer reads the act, so one authored impact yields
                // many verdicts.
                let values_verdict = if impact.sign == 0 {
                    let profile = profile_for(observer_id);
                    let raw = verdict(&profile, &expressed(act));
                    raw * (0.5 + profile.tightness())
                } else {
                    1.0
                };
                let effective_sign = if impact.sign == 0 {
                    if values_verdict >= 0.0 { 1.0 } else { -1.0 }
                } else {
                    impact.sign as f64
                };
                if impact.sign == 0 && values_verdict.abs() < 1e-9 {
                    continue;
                }

                let negative = effective_sign < 0.0;
                let negativity = if negative {
                    axis.negativity()
                } else {
                    axis.positivity()
                };
                // Cost and need only amplify help, never harm.
                let cost = if negative { 1.0 } else { event.cost };
                let repetition = Self::repetition_decay(
                    seen_counts.get(&(event.act_id.as_str(), scope)).copied().unwrap_or(0),
                );

                // Observer amplifiers. Neutral on the closeness/belonging
                // passes themselves, which is what `context: None` means.
                let (closeness_score, belonging_score) = context.unwrap_or((0.0, 0.0));
                let closeness = 1.0 + 0.5 * closeness_score.max(0.0) / 100.0;
                let belonging = if belonging_score >= 25.0 && negative {
                    // Black sheep (Marques): being one of them buys the benefit
                    // of the doubt on small things and a harsher fall on big ones.
                    if matches!(tier, Tier::Major | Tier::Severe | Tier::Defining) {
                        1.5
                    } else {
                        0.7
                    }
                } else {
                    1.0
                };

                // Decay is applied to the contribution, not the score, so an
                // old kindness still counts a little years later. Ledger axes
                // never fade: they settle through acts instead.
                let decay = match tier.half_life_days() {
                    Some(days) if !axis.is_ledger() => {
                        let elapsed_days =
                            ((now_tick - event.tick).max(0.0)) / GAME_DAY_SECONDS;
                        0.5_f64.powf(elapsed_days / days)
                    }
                    _ => 1.0,
                };

                let modifiers = clamp_modifiers(
                    negativity
                        * event.intent.factor()
                        * cost
                        * event.need
                        * repetition
                        * closeness
                        * belonging
                        * values_verdict.abs().max(if impact.sign == 0 { 0.0 } else { 1.0 }),
                );
                let delta = effective_sign * tier.base() * modifiers * inheritance * decay * fidelity;
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
                    closeness,
                    belonging,
                    values: values_verdict,
                    decay,
                    fidelity,
                    inheritance,
                    clamped_modifiers: modifiers,
                    delta,
                    score_after: score,
                });
            }

            // Record what this event landed on, after its own impacts have been
            // scored against the prior counts. Distinct scopes only: the rescan
            // this replaces counted each earlier *event* once, however many of
            // its impacts touched the scope.
            let mut counted: Vec<&str> = Vec::new();
            for impact in act.impacts {
                let Some(scope) = Self::resolve_scope(impact.scope, event) else {
                    continue;
                };
                if counted.contains(&scope) {
                    continue;
                }
                counted.push(scope);
                *seen_counts.entry((event.act_id.as_str(), scope)).or_insert(0) += 1;
            }
        }

        (score, traces)
    }

    pub fn standing(&self, observer_id: &str, axis: Axis, now_tick: f64) -> f64 {
        let key = StandingKey {
            observer: observer_id.to_string(),
            axis,
            tick_bits: now_tick.to_bits(),
            events: self.events.len(),
            knowledge: self.knowledge.len_for(observer_id),
        };
        if let Some(hit) = self.standing_cache.borrow().get(&key) {
            return *hit;
        }
        let score = self.explain(observer_id, axis, now_tick).0;
        self.standing_cache.borrow_mut().insert(key, score);
        score
    }

    pub fn band(&self, observer_id: &str, axis: Axis, now_tick: f64) -> Band {
        Band::of(self.standing(observer_id, axis, now_tick))
    }

    pub fn derived(&self, observer_id: &str, kind: Derived, now_tick: f64) -> f64 {
        derive(kind, &|axis| self.standing(observer_id, axis, now_tick))
    }

    pub fn derived_band(&self, observer_id: &str, kind: Derived, now_tick: f64) -> Band {
        Band::of(self.derived(observer_id, kind, now_tick))
    }

    /// How well an individual's values match the group they belong to. Drives
    /// how much of the group's view they inherit: a dissident barely cares.
    pub fn values_fit(entity_id: &str) -> f64 {
        let Some(entity) = crate::game_data::narrative_entity_def(entity_id) else {
            return 0.0;
        };
        let Some(parent_id) = entity.parent else {
            return 0.0;
        };
        let own = Profile::from_pairs(entity.values);
        let group = profile_for(parent_id);
        if own.is_empty() || group.is_empty() {
            return 0.0;
        }
        own.fit(&group)
    }

    /// The value an observer would name if asked what the Hero stands for.
    pub fn sees_hero_as(&self, observer_id: &str) -> Option<Value> {
        profile_for(observer_id).strongest()
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
        secrecy: Secrecy::from_str(act.secrecy).unwrap_or_default(),
        causes: Vec::new(),
        witnesses: Vec::new(),
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

    /// Everyone in the affected scopes hears at once. Used where the test is
    /// about how far an impact *reaches*, not about who heard it — the two are
    /// independent since N4, and mixing them makes a reach test fail for a
    /// knowledge reason.
    fn public_log_with(act_id: &str, target: &str) -> NarrativeLog {
        let mut log = NarrativeLog::default();
        let act = narrative_act_def(act_id).expect("act exists");
        let mut event = event_for(act, Some(target), 0.0);
        event.secrecy = Secrecy::Public;
        log.append(event);
        log
    }

    fn log_with(act_id: &str, target: &str) -> NarrativeLog {
        let mut log = NarrativeLog::default();
        let act = narrative_act_def(act_id).expect("act exists");
        log.append(event_for(act, Some(target), 0.0));
        log
    }

    #[test]
    fn helping_someone_raises_their_goodwill() {
        let log = log_with(HELP, VELL);
        let score = log.standing(VELL, Axis::Goodwill, 0.0);
        assert!(score > 0.0, "goodwill was {score}");
    }

    #[test]
    fn one_act_reaches_three_distances_at_three_strengths() {
        // The acceptance shape for N3: the target, a peer in the same
        // sub-faction, and a stranger elsewhere in the faction.
        let log = public_log_with(HELP, VELL);
        let target = log.standing(VELL, Axis::Goodwill, 0.0);
        let peer = log.standing(PEER, Axis::Goodwill, 0.0);
        let stranger = log.standing(FACTION, Axis::Goodwill, 0.0);

        assert!(
            target > peer && peer > stranger,
            "expected target {target} > peer {peer} > stranger {stranger}",
        );
        assert!(stranger >= 0.0, "the faction should not be harmed by help");
    }

    #[test]
    fn a_broken_promise_costs_integrity_far_more_than_help_gains_goodwill() {
        let helped = log_with(HELP, VELL).standing(VELL, Axis::Goodwill, 0.0);
        let betrayed = log_with(BETRAY, VELL).standing(VELL, Axis::Integrity, 0.0);
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
        let first = log.standing(VELL, Axis::Goodwill, 0.0);
        log.append(event_for(act, Some(VELL), 1.0));
        let second = log.standing(VELL, Axis::Goodwill, 0.0);

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
            costly.standing(VELL, Axis::Goodwill, 0.0) > cheap.standing(VELL, Axis::Goodwill, 0.0),
            "a costly gift in real need should land harder",
        );
    }

    #[test]
    fn the_explanation_and_the_score_come_from_one_code_path() {
        let log = log_with(HELP, VELL);
        let (score, traces) = log.explain(VELL, Axis::Goodwill, 0.0);
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
        assert_eq!(log.standing(VELL, Axis::Goodwill, 0.0), 0.0);
        assert_eq!(log.band(VELL, Axis::Goodwill, 0.0), Band::Mid);
    }

    #[test]
    fn standing_is_rebuilt_identically_from_the_same_log() {
        // The whole point of deriving rather than storing.
        let log = log_with(HELP, VELL);
        let rebuilt: NarrativeLog =
            serde_json::from_str(&serde_json::to_string(&log).unwrap()).unwrap();
        assert_eq!(
            log.standing(VELL, Axis::Goodwill, 0.0),
            rebuilt.standing(VELL, Axis::Goodwill, 0.0),
        );
    }
}

#[cfg(test)]
mod values_and_decay_tests {
    use super::*;
    use crate::narrative::standing::GAME_DAY_SECONDS;

    const VELL: &str = "entity.vell";
    const JOREN: &str = "entity.joren";
    const FACTION: &str = "entity.sleepless";
    const HELP: &str = "act.share_scarce_water";
    const BETRAY: &str = "act.break_a_promise";

    /// Everyone in the affected scopes hears at once. Used where the test is
    /// about how far an impact *reaches*, not about who heard it — the two are
    /// independent since N4, and mixing them makes a reach test fail for a
    /// knowledge reason.
    fn public_log_with(act_id: &str, target: &str) -> NarrativeLog {
        let mut log = NarrativeLog::default();
        let act = narrative_act_def(act_id).expect("act exists");
        let mut event = event_for(act, Some(target), 0.0);
        event.secrecy = Secrecy::Public;
        log.append(event);
        log
    }

    fn log_with(act_id: &str, target: &str) -> NarrativeLog {
        let mut log = NarrativeLog::default();
        let act = narrative_act_def(act_id).expect("act exists");
        log.append(event_for(act, Some(target), 0.0));
        log
    }

    #[test]
    fn a_universalist_act_offends_a_security_first_faction() {
        // Sharing scarce water with an outsider expresses universalism. The
        // Sleepless put safety and their own first, so the faction reads the
        // same generosity as resources given away. Nothing scripted this
        // disagreement: it falls out of the circle.
        let log = public_log_with(HELP, VELL);
        let alignment = log.standing(FACTION, Axis::Alignment, 0.0);
        assert!(
            alignment < 0.0,
            "the faction should read outsider-generosity as against them: {alignment}",
        );
    }

    #[test]
    fn the_same_act_still_earns_goodwill_from_the_person_it_helped() {
        // Values change how a group reads an act, not whether help was help.
        let log = log_with(HELP, VELL);
        assert!(log.standing(VELL, Axis::Goodwill, 0.0) > 0.0);
    }

    #[test]
    fn a_deviant_reads_the_world_differently_from_her_group() {
        // Joren's own profile is authored and low-fit; Vell inherits the
        // faction's. The same act therefore lands differently on each.
        let fit = NarrativeLog::values_fit(JOREN);
        assert!(fit < 0.0, "Joren should not fit the Sleepless: {fit}");

        let log = public_log_with(HELP, VELL);
        let joren = log.standing(JOREN, Axis::Alignment, 0.0);
        let faction = log.standing(FACTION, Axis::Alignment, 0.0);
        assert!(
            joren > faction,
            "the deviant should judge it less harshly than her faction: {joren} vs {faction}",
        );
    }

    #[test]
    fn a_minor_slight_fades_while_a_betrayal_does_not() {
        let help = log_with(HELP, VELL);
        let fresh = help.standing(VELL, Axis::Goodwill, 0.0);
        let stale = help.standing(VELL, Axis::Goodwill, 400.0 * GAME_DAY_SECONDS);
        assert!(stale < fresh, "a Major kindness should fade: {stale} vs {fresh}");
        assert!(stale > 0.0, "but it should still count a little: {stale}");
    }

    #[test]
    fn ledger_axes_never_decay() {
        // Debt and grievance settle through acts, not through time.
        let help = log_with(HELP, VELL);
        let now = help.standing(VELL, Axis::Debt, 0.0);
        let much_later = help.standing(VELL, Axis::Debt, 10_000.0 * GAME_DAY_SECONDS);
        assert!((now - much_later).abs() < 1e-9, "{now} vs {much_later}");
        assert!(now > 0.0);
    }

    #[test]
    fn a_severe_impact_is_permanent() {
        assert_eq!(Tier::Severe.half_life_days(), None);
        assert_eq!(Tier::Defining.half_life_days(), None);
        assert!(Tier::Minor.half_life_days().unwrap() < Tier::Major.half_life_days().unwrap());
    }

    #[test]
    fn closeness_amplifies_what_lands_on_a_close_bond() {
        // Two identical logs; one preceded by shared history that raises
        // closeness. The later act should land harder on the closer bond.
        let plain = log_with(BETRAY, VELL).standing(VELL, Axis::Integrity, 0.0);

        let mut close = NarrativeLog::default();
        let help = narrative_act_def(HELP).expect("act");
        for _ in 0..2 {
            close.append(event_for(help, Some(VELL), 0.0));
        }
        let before = close.standing(VELL, Axis::Integrity, 0.0);
        close.append(event_for(narrative_act_def(BETRAY).expect("act"), Some(VELL), 0.0));
        let after = close.standing(VELL, Axis::Integrity, 0.0) - before;

        // Both are negative; the closer one should be at least as heavy.
        assert!(after <= plain + 1e-9, "betrayal should not land lighter on a close bond: {after} vs {plain}");
    }

    #[test]
    fn the_trace_reports_every_new_factor() {
        let log = public_log_with(HELP, VELL);
        let (_, traces) = log.explain(FACTION, Axis::Alignment, 0.0);
        let trace = traces.first().expect("a values impact reached the faction");
        assert!(trace.values.abs() > 0.0, "the verdict should be recorded");
        assert!(trace.decay > 0.0 && trace.decay <= 1.0);
        assert!(trace.closeness >= 1.0);
        assert!(trace.belonging > 0.0);
    }
}

#[cfg(test)]
mod knowledge_tests {
    use super::*;
    use crate::narrative::knowledge::RUMOUR_INTERVAL_SECONDS;

    const VELL: &str = "entity.vell";
    const JOREN: &str = "entity.joren";
    const FACTION: &str = "entity.sleepless";
    const BETRAY: &str = "act.break_a_promise";

    fn broken_promise(secrecy: Secrecy) -> NarrativeLog {
        let mut log = NarrativeLog::default();
        let act = narrative_act_def(BETRAY).expect("act exists");
        let mut event = event_for(act, Some(VELL), 0.0);
        event.secrecy = secrecy;
        log.append(event);
        log
    }

    #[test]
    fn a_secret_changes_nothing_at_all() {
        // The headline of §6: blast radius is scope AND knowledge. A promise
        // broken with nobody watching costs the Hero exactly nothing.
        let log = broken_promise(Secrecy::Secret);
        assert_eq!(log.standing(VELL, Axis::Integrity, 0.0), 0.0);
        assert_eq!(log.standing(FACTION, Axis::Integrity, 0.0), 0.0);
        assert!(!log.knowledge.anyone_knows(FACTION, 0));
    }

    #[test]
    fn the_same_act_witnessed_costs_the_hero_his_word() {
        let log = broken_promise(Secrecy::Witnessed);
        let target = log.standing(VELL, Axis::Integrity, 0.0);
        assert!(target < 0.0, "the person promised should know: {target}");
    }

    #[test]
    fn witnessed_and_secret_diverge_for_the_same_act() {
        let witnessed = broken_promise(Secrecy::Witnessed).standing(VELL, Axis::Integrity, 0.0);
        let secret = broken_promise(Secrecy::Secret).standing(VELL, Axis::Integrity, 0.0);
        assert!(witnessed < secret, "{witnessed} should be worse than {secret}");
    }

    #[test]
    fn a_secret_told_later_lands_in_full() {
        let mut log = broken_promise(Secrecy::Secret);
        assert_eq!(log.standing(VELL, Axis::Integrity, 0.0), 0.0);
        log.knowledge
            .learn(VELL, 0, crate::narrative::Knowledge::first_hand(100.0));
        assert!(
            log.standing(VELL, Axis::Integrity, 100.0) < 0.0,
            "a confession should cost what the act always would have",
        );
    }

    #[test]
    fn a_distant_hearer_reacts_more_weakly_than_the_witness() {
        // Fidelity falls with every retelling, so the same event weighs less
        // the further it travels.
        let mut log = broken_promise(Secrecy::Witnessed);
        log.advance_rumour(600.0 * RUMOUR_INTERVAL_SECONDS, 9);
        assert!(log.knowledge.knows(JOREN, 0), "a crewmate should have heard by now");

        let witness = log.standing(VELL, Axis::Integrity, 0.0).abs();
        let hearsay = log.standing(JOREN, Axis::Integrity, 0.0).abs();
        assert!(hearsay > 0.0, "the crewmate should have formed a view");
        assert!(
            hearsay < witness,
            "hearsay {hearsay} should weigh less than the witness's {witness}",
        );
        assert!(log.knowledge.heard_first_hand(VELL, 0));
        assert!(!log.knowledge.heard_first_hand(JOREN, 0));
    }

    #[test]
    fn silencing_the_only_witness_keeps_it_contained() {
        let mut log = broken_promise(Secrecy::Witnessed);
        log.knowledge.silence(VELL);
        log.advance_rumour(1000.0 * RUMOUR_INTERVAL_SECONDS, 9);
        assert!(!log.knowledge.knows(JOREN, 0), "a silenced witness spreads nothing");
        assert!(log.standing(JOREN, Axis::Integrity, 0.0) == 0.0);
    }
}
