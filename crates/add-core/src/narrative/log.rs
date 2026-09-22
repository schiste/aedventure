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
    /// How many times this act happened, when repeats were coalesced into one
    /// entry. One for an ordinary event.
    ///
    /// §10: "ten thefts in one hour against the same group become one event
    /// with a count, so the log records behavior, not button presses." Gameplay
    /// emits acts far faster than dialogue does, and a log of identical
    /// button-presses is both larger and less true — what happened is that the
    /// Hero robbed them repeatedly, not that a button moved eleven times.
    #[serde(default = "one")]
    pub count: u32,
}

/// serde default for [`NarrativeEvent::count`]: an event that does not say
/// otherwise happened once. Saves written before coalescing have no field.
fn one() -> u32 {
    1
}

/// One resolved contribution to one entity's view of the Hero.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImpactTrace {
    pub event_id: u64,
    /// Occurrences this entry stands for. Above one, `delta` is their total.
    #[serde(default = "one")]
    pub count: u32,
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
    /// The observer modifiers before the clamp.
    ///
    /// Recorded so tooling can say whether the clamp actually bit, rather than
    /// inferring it from a small final figure — which stopped being a reliable
    /// signal once repetition was applied after the clamp, because a damped
    /// repeat is small without anything having been clamped.
    #[serde(default)]
    pub unclamped_modifiers: f64,
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
    /// What the events folded away by [`NarrativeLog::compact`] left behind.
    #[serde(default)]
    pub compaction: Compaction,
    /// Scores carried across a save, so opening one does not re-fold the log
    /// for every character before the first frame.
    #[serde(default)]
    pub warm_scores: WarmScores,
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
            && self.compaction == other.compaction
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
            compaction: self.compaction.clone(),
            // Carried, unlike the in-memory memo: these are validated on every
            // read, so a clone cannot make them stale in a way a read misses.
            warm_scores: self.warm_scores.clone(),
            standing_cache: Default::default(),
        }
    }
}

/// Folded scores written into the save, with everything needed to know whether
/// they are still true.
///
/// Raw scores are deliberately not persisted as state — §10 is explicit that
/// they are derived from the log so that scores and history can never drift
/// apart — and this does not change that. It is a cache: every entry is checked
/// against the world that produced it, and anything that could have changed the
/// answer throws it away and re-folds.
///
/// The content stamp is the one that matters. §10: "If world data changed
/// (retuned amounts, new entities), replay the log against the new act
/// definitions. Scores update to the new tuning; history stays intact." A cache
/// that outlived a retune would defeat exactly that, and quietly — the game
/// would show scores from the old tuning with no sign anything was wrong.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WarmScores {
    /// The content catalog these were folded under.
    pub catalog_version: u16,
    /// The tick they were taken at. A score is only true for its own moment,
    /// because decay is continuous.
    pub tick_bits: u64,
    /// How long the log was. One more event and every score may have moved.
    pub events: usize,
    /// Every entity that was folded, and how much it knew at the time.
    ///
    /// Presence is what makes absence meaningful below: an entity listed here
    /// was folded on every axis, so an axis missing from `entries` is a score
    /// of zero rather than a score nobody took. Storing the zeros instead would
    /// be eleven entries per entity, almost all of them zero, for a thousand
    /// strangers — and leaving them out without this made every zero re-fold on
    /// load, which is the expensive case, because reaching zero means walking
    /// the whole log to find nothing.
    ///
    /// The count is per observer because invalidation is: one character
    /// learning something does not move anyone else's score.
    pub knowledge: std::collections::BTreeMap<String, usize>,
    /// `entity|axis` to score, for the scores that are not zero.
    pub entries: std::collections::BTreeMap<String, f64>,
}

/// The residue of events that have been folded away.
///
/// §10: "Compaction: fully decayed impacts and dead rumors are folded into
/// per-node baselines." A log only grows, and every score is derived by
/// replaying it, so without this the cost of a cold read grows with the length
/// of the game. Compaction replaces a prefix of the log with what that prefix
/// was worth.
///
/// This is a summary, not a lossless encoding, and the two ways it loses are
/// worth naming. A folded contribution stops decaying, and the observer context
/// it was folded under is frozen. Both are bounded by only ever compacting
/// events old enough that what decays has already decayed — see
/// [`NarrativeLog::COMPACTION_HORIZON_DAYS`] — and
/// `compaction_preserves_what_the_log_was_worth` measures the residual error
/// rather than trusting this paragraph.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Compaction {
    /// Score the folded-away events contributed, keyed `entity|axis`.
    ///
    /// A map rather than a list because it is read inside the fold, once per
    /// query: scanning a list costs nothing with a handful of characters and
    /// dominates everything at a thousand, where it made a compacted load
    /// slower than an uncompacted one.
    pub baselines: std::collections::BTreeMap<String, f64>,
    /// Repetition counts carried forward, keyed `act|scope`.
    ///
    /// Without these, folding away a prefix would make the acts that follow it
    /// land at full strength again: the tenth theft would count as the first.
    pub seen: std::collections::BTreeMap<String, u32>,
    /// Events at or before this tick have been folded away.
    pub through_tick: f64,
    /// How many events have been folded away, for reporting.
    pub folded: usize,
}

impl Compaction {
    /// Nothing has been folded away, so every lookup below is a no-op. Checked
    /// first because these are called inside the fold's inner loop, and an
    /// uncompacted log is the common case.
    fn is_empty(&self) -> bool {
        self.baselines.is_empty() && self.seen.is_empty()
    }

    fn baseline(&self, observer_id: &str, axis: Axis) -> f64 {
        if self.baselines.is_empty() {
            return 0.0;
        }
        self.baselines
            .get(&Self::axis_key(observer_id, axis))
            .copied()
            .unwrap_or(0.0)
    }

    fn axis_key(observer_id: &str, axis: Axis) -> String {
        format!("{observer_id}|{}", axis.as_str())
    }

    fn scope_key(act_id: &str, scope: &str) -> String {
        format!("{act_id}|{scope}")
    }

    fn seen_for(&self, act_id: &str, scope: &str) -> u32 {
        if self.seen.is_empty() {
            return 0;
        }
        self.seen
            .get(&Self::scope_key(act_id, scope))
            .copied()
            .unwrap_or(0)
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
    /// How close together two identical acts must be to become one entry.
    ///
    /// One in-game hour. Long enough to absorb a burst of the same gameplay
    /// action, short enough that two deliberate acts an afternoon apart stay
    /// two events with their own ticks and their own decay.
    pub const COALESCE_WINDOW_SECONDS: f64 = 60.0 * 60.0;

    pub fn append(&mut self, mut event: NarrativeEvent) -> u64 {
        if let Some(id) = self.coalesce(&event) {
            return id;
        }
        event.id = self.next_id;
        self.next_id += 1;
        let id = event.id;
        self.seed_knowledge(&event, id);
        self.events.push(event);
        id
    }

    /// Fold a repeat into the entry it repeats, and report that entry's id.
    ///
    /// Only the most recent event is considered: acts arrive in tick order, so
    /// anything earlier is separated by something else, and merging across that
    /// would reorder history — which matters, because saturation is
    /// order-dependent.
    ///
    /// An event is a repeat only when everything that distinguishes it is
    /// equal. Differing secrecy, witnesses or declared causes make it a
    /// different event with different consequences, so those never merge.
    fn coalesce(&mut self, incoming: &NarrativeEvent) -> Option<u64> {
        let last = self.events.last_mut()?;
        if last.act_id != incoming.act_id
            || last.target != incoming.target
            || last.intent != incoming.intent
            || last.secrecy != incoming.secrecy
            || last.witnesses != incoming.witnesses
            || !incoming.causes.is_empty()
            || (incoming.tick - last.tick) > Self::COALESCE_WINDOW_SECONDS
            || incoming.tick < last.tick
        {
            return None;
        }
        // Cost and need are per-occurrence weights; the merged entry carries
        // the mean so a coalesced burst is not silently reweighted by whichever
        // occurrence happened to arrive last.
        let previous = last.count as f64;
        let total = previous + 1.0;
        last.cost = (last.cost * previous + incoming.cost) / total;
        last.need = (last.need * previous + incoming.need) / total;
        last.count = last.count.saturating_add(1);
        // The entry keeps its original tick: the burst is one thing that
        // started then, and moving the tick would restart its decay.
        Some(last.id)
    }

    /// How old an event must be before it may be folded away.
    ///
    /// The longest half-life in the tier table is 90 days, so at 360 days a
    /// decaying contribution has halved four times and retains about 6% of its
    /// original weight; by the time anything is compacted, what fades has
    /// largely faded. Ledger axes never decay and are carried in the baseline
    /// at full value, which is exact for them.
    pub const COMPACTION_HORIZON_DAYS: f64 = 360.0;

    /// Fold away everything older than the horizon, keeping what it was worth.
    ///
    /// Returns how many entries were folded. Safe to call repeatedly; each call
    /// folds only what has aged past the horizon since the last one.
    ///
    /// Events that could still complete an arc are kept regardless of age. A
    /// pattern with no expiry — `arc.broken_oath` has none — can be answered
    /// years later, and folding away the oath would erase the arc rather than
    /// summarise it.
    pub fn compact(&mut self, now_tick: f64) -> usize {
        let cutoff = now_tick - Self::COMPACTION_HORIZON_DAYS * GAME_DAY_SECONDS;
        // Cheap rejection first. This runs on every rumour boundary, and the
        // work below walks the log; doing that each tick to discover there is
        // nothing to fold would cost more than compaction saves. Events are
        // appended in tick order, so if the oldest is not past the horizon then
        // nothing is.
        if self.events.first().is_none_or(|event| event.tick > cutoff) {
            return 0;
        }
        let protected = self.sift_relevant_ids(now_tick);

        let foldable = |event: &NarrativeEvent| {
            event.tick <= cutoff && !protected.contains(&event.id)
        };
        // Only a prefix may be folded: the baseline is a running score, so it
        // cannot represent events with unfolded events before them.
        let fold_upto = self
            .events
            .iter()
            .position(|event| !foldable(event))
            .unwrap_or(self.events.len());
        if fold_upto == 0 {
            return 0;
        }

        // Compute what the prefix was worth, before removing it. Every observer
        // and axis, because any of them may be asked for later.
        let observers: Vec<&'static str> = crate::game_data::narrative_entities()
            .iter()
            .map(|entity| entity.id)
            .collect();
        let tail = self.events.split_off(fold_upto);
        let folded = self.events.len();

        let mut baselines = std::collections::BTreeMap::new();
        for observer in &observers {
            let context = self.observer_context(observer, now_tick);
            for axis in Axis::ALL {
                let score = self.fold_axis(observer, axis, now_tick, Some(context)).0;
                if score != 0.0 {
                    baselines.insert(Compaction::axis_key(observer, axis), score);
                }
            }
        }

        // Carry the repetition counts forward.
        let mut seen: std::collections::BTreeMap<String, u32> = std::collections::BTreeMap::new();
        for event in &self.events {
            let Some(act) = narrative_act_def(&event.act_id) else {
                continue;
            };
            let mut counted: Vec<&str> = Vec::new();
            for impact in act.impacts {
                let Some(scope) = Self::resolve_scope(impact.scope, event) else {
                    continue;
                };
                if counted.contains(&scope) {
                    continue;
                }
                counted.push(scope);
                let occurrences = event.count.max(1);
                let key = Compaction::scope_key(&event.act_id, scope);
                let entry = seen.entry(key).or_insert(0);
                *entry = entry.saturating_add(occurrences);
            }
        }

        // Dead rumours go with the events they were about: nobody can learn or
        // repeat something the log no longer holds.
        let folded_ids: Vec<u64> = self.events.iter().map(|event| event.id).collect();
        self.knowledge.forget_all(&folded_ids);

        self.compaction = Compaction {
            baselines,
            seen,
            through_tick: cutoff,
            folded: self.compaction.folded + folded,
        };
        self.events = tail;
        self.standing_cache.borrow_mut().clear();
        folded
    }

    /// Events that must survive compaction because an arc could still need
    /// them: a pattern's first slot, while that pattern could still be answered.
    ///
    /// The window is the pattern's own expiry. A pattern that never expires
    /// protects its first slot for good, which is why one is so costly: every
    /// oath ever sworn would stay in the log, and because only a prefix can be
    /// folded, the oldest one pins everything after it.
    fn sift_relevant_ids(&self, now_tick: f64) -> Vec<u64> {
        let mut ids = Vec::new();
        for pattern in crate::game_data::sift_patterns() {
            for event in &self.events {
                if event.target.is_none()
                    || !crate::narrative::sift::act_has_kind(&event.act_id, pattern.first_kind)
                {
                    continue;
                }
                if pattern.expires_after_days > 0.0 {
                    let age_days = (now_tick - event.tick).max(0.0) / GAME_DAY_SECONDS;
                    // Past its expiry nothing can complete this arc from it, so
                    // it is free to be folded away like any other history.
                    if age_days > pattern.expires_after_days {
                        continue;
                    }
                }
                ids.push(event.id);
            }
        }
        ids
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
                // Recorded once at each scope the act touches, not on every
                // member of those scopes.
                //
                // §10: "Public events are stored once at the scope node instead
                // of on every member, which keeps memory flat when a faction of
                // 200 learns something at once." Writing it to every member
                // instead made a public act cost one entry per entity in the
                // world, and left rumour re-checking all of them every boundary
                // to rediscover that they already knew. Membership is what the
                // ancestry walk in `knows` is for.
                let Some(act) = narrative_act_def(&event.act_id) else { return };
                let mut scopes: Vec<&str> = act
                    .impacts
                    .iter()
                    .filter_map(|impact| Self::resolve_scope(impact.scope, event))
                    .collect();
                scopes.sort_unstable();
                scopes.dedup();
                for scope in scopes {
                    self.knowledge
                        .learn(scope, id, Knowledge::first_hand(event.tick));
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

    /// How far back repetition looks.
    ///
    /// §5A: "0.7 to the power of the number of similar acts toward the same
    /// scope **in the last 30 days**". The window was missing, so the count ran
    /// over the whole log and never expired: the seventieth theft of a
    /// three-year game was damped as though all seventy had happened in a week.
    /// Over a long playthrough that drove every repeated act to nothing, which
    /// is what made three axes read dead once repetition was no longer held up
    /// by the modifier clamp.
    ///
    /// With the window, habituation is about recent behaviour — which is what
    /// habituation is — and a habit resumed after a season lands afresh.
    pub const REPETITION_WINDOW_DAYS: f64 = 30.0;

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
        // Everything folded away already contributed; the walk below continues
        // from there rather than from nothing.
        let mut score = self.compaction.baseline(observer_id, axis);
        let mut traces = Vec::new();
        // When each prior occurrence of (act, scope) happened, so the count can
        // be limited to the window. Counted over every impact of every event,
        // not only those on the axis being folded, because repetition is a
        // property of the act landing on the scope at all.
        let mut seen_ticks: std::collections::HashMap<(&str, &str), Vec<f64>> =
            std::collections::HashMap::new();

        for event in self.events.iter() {
            let Some(act) = narrative_act_def(&event.act_id) else {
                continue;
            };
            // A coalesced entry stands for `count` occurrences. They are folded
            // one whole occurrence at a time — every impact of the act, in
            // authored order, then the next occurrence — because that is the
            // order the separate events they replaced would have folded in, and
            // `fold` saturates, so the order changes the answer. Folding all of
            // one impact's occurrences before moving to the next impact drifts:
            // `act.break_a_promise` carries two impacts on integrity, and the
            // two orders disagreed by 0.12%.
            let occurrences = event.count.max(1);
            for occurrence in 0..occurrences {
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
                let window_start =
                    event.tick - Self::REPETITION_WINDOW_DAYS * GAME_DAY_SECONDS;
                let recent = seen_ticks
                    .get(&(event.act_id.as_str(), scope))
                    .map(|ticks| ticks.iter().filter(|tick| **tick >= window_start).count() as u32)
                    .unwrap_or(0);
                // Folded-away repeats are deliberately not counted. Compaction
                // only folds history at least a year old and the window looks
                // back a month, so a folded event cannot be a recent repeat —
                // and the count compaction carries is a lifetime total, which
                // applied against a windowed rule damped surviving acts as
                // though a year of history had happened last week.
                let seen = recent + occurrence;
                let repetition = Self::repetition_decay(seen);

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

                // Held apart from the repetition step so a coalesced entry can
                // apply a different step per occurrence without recomputing
                // everything else.
                let unrepeated_modifiers = negativity
                    * event.intent.factor()
                    * cost
                    * event.need
                    * closeness
                    * belonging
                    * values_verdict.abs().max(if impact.sign == 0 { 0.0 } else { 1.0 });
                // The clamp guards the *observer's* modifiers, which is what it
                // was written for: "no stack of them can turn a slight into a
                // catastrophe or erase a betrayal". Repetition is not one of
                // those. It is a principled decay of an act the Hero has already
                // done, and folding it in before the clamp meant `0.7^n` drove
                // the whole product onto the 0.1 floor from the seventh repeat —
                // so every act clamped most of the time, the clamp stopped being
                // a guard and became the normal path, and §5A's "hits the clamp
                // more than rarely" signal was dead. It also meant the seventh
                // and the seventieth repetition landed identically, which is not
                // a diminishing return, it is a floor.
                //
                // Clamped first, then damped: the guarantee is about one act's
                // context, not about the tenth identical act, which is exactly
                // the thing that should be allowed to fade to nothing.
                let modifiers = clamp_modifiers(unrepeated_modifiers) * repetition;
                let delta = effective_sign * tier.base() * modifiers * inheritance * decay * fidelity;
                score = fold(score, delta);

                // One trace per impact, not per occurrence: a coalesced entry is
                // one thing that happened `count` times, and `narr explain`
                // should read that way. Only the first occurrence emits it.
                if occurrence > 0 {
                    continue;
                }

                traces.push(ImpactTrace {
                    event_id: event.id,
                    count: event.count,
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
                    unclamped_modifiers: unrepeated_modifiers,
                    delta,
                    score_after: score,
                });
            }

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
                // A coalesced entry advances the count by every occurrence it
                // stands for, all at this entry's tick, so later acts are damped
                // as they would have been had the repeats stayed separate.
                let ticks = seen_ticks.entry((event.act_id.as_str(), scope)).or_default();
                for _ in 0..event.count.max(1) {
                    ticks.push(event.tick);
                }
            }
        }

        (score, traces)
    }

    /// Move what the save carried into the in-memory cache, and drop it.
    ///
    /// Called once, on load. The scores become ordinary cache entries, so every
    /// read after this is the same code path as a read in a game that never
    /// saved — there is no second lookup on the hot path, and no way for a
    /// stale entry to be consulted by one reader and not another.
    ///
    /// Clearing the field afterwards is what keeps a save honest: a loaded
    /// state is then identical to the state that was saved, which
    /// `save_round_trip_is_a_replay_command` checks. Leaving it populated would
    /// make a state that has been through a save differ from one that has not,
    /// by carrying a cache in its identity.
    pub fn hydrate_from_save(&mut self) {
        let warm = std::mem::take(&mut self.warm_scores);
        if warm.knowledge.is_empty()
            || warm.catalog_version != crate::game_data::CONTENT_CATALOG_VERSION
            || warm.events != self.events.len()
        {
            return;
        }

        let mut cache = self.standing_cache.borrow_mut();
        for (observer_id, saved_knowledge) in &warm.knowledge {
            if *saved_knowledge != self.knowledge.len_for(observer_id) {
                continue;
            }
            for axis in Axis::ALL {
                let score = warm
                    .entries
                    .get(&Self::warm_key(observer_id, axis))
                    .copied()
                    .unwrap_or(0.0);
                cache.insert(
                    StandingKey {
                        observer: observer_id.clone(),
                        axis,
                        tick_bits: warm.tick_bits,
                        events: warm.events,
                        knowledge: *saved_knowledge,
                    },
                    score,
                );
            }
        }
    }

    fn warm_key(observer_id: &str, axis: Axis) -> String {
        format!("{observer_id}|{}", axis.as_str())
    }

    /// Fold every character's standing and write it into the save.
    ///
    /// Called when exporting. The cost is paid by the save, which happens on a
    /// boundary, rather than by the load, which happens while someone waits.
    pub fn warm_for_save(&mut self, now_tick: f64) {
        let mut entries = std::collections::BTreeMap::new();
        let mut knowledge = std::collections::BTreeMap::new();
        for entity in crate::game_data::narrative_entities() {
            knowledge.insert(entity.id.to_string(), self.knowledge.len_for(entity.id));
            for axis in Axis::ALL {
                let score = self.standing(entity.id, axis, now_tick);
                if score != 0.0 {
                    entries.insert(Self::warm_key(entity.id, axis), score);
                }
            }
        }
        self.warm_scores = WarmScores {
            catalog_version: crate::game_data::CONTENT_CATALOG_VERSION,
            tick_bits: now_tick.to_bits(),
            events: self.events.len(),
            knowledge,
            entries,
        };
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
        count: 1,
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

    const TARGET: &str = "entity.vell";

    fn burst(log: &mut NarrativeLog, act_id: &str, times: usize, spacing: f64) {
        let act = narrative_act_def(act_id).expect("act exists");
        for step in 0..times {
            let mut event = event_for(act, Some(TARGET), step as f64 * spacing);
            event.secrecy = Secrecy::Public;
            log.append(event);
        }
    }

    /// Coalescing changes how the log stores repeats, not what they are worth.
    ///
    /// Ten thefts in an hour become one entry with a count of ten. The entry is
    /// folded once per occurrence it stands for, each with its own repetition
    /// step, so the standing it produces matches the ten separate events it
    /// replaced. Without this the feature would quietly retune the game.
    #[test]
    fn a_coalesced_burst_is_worth_what_its_occurrences_were_worth() {
        // Far enough apart to stay separate: one entry per act.
        let mut separate = NarrativeLog::default();
        burst(&mut separate, "act.break_a_promise", 10, NarrativeLog::COALESCE_WINDOW_SECONDS * 2.0);

        // Close enough to merge: one entry standing for ten.
        let mut coalesced = NarrativeLog::default();
        burst(&mut coalesced, "act.break_a_promise", 10, 1.0);

        assert_eq!(coalesced.events.len(), 1, "the burst should be one entry");
        assert_eq!(coalesced.events[0].count, 10);
        assert_eq!(separate.events.len(), 10, "spaced acts must stay separate");

        // Read both at the moment the last act lands, so decay plays no part in
        // the comparison: the spaced log's events are older and would otherwise
        // have faded by different amounts.
        let merged = coalesced.standing(TARGET, Axis::Integrity, 0.0);
        let apart = {
            let mut same_tick = NarrativeLog::default();
            let act = narrative_act_def("act.break_a_promise").expect("act");
            for _ in 0..10 {
                let mut event = event_for(act, Some(TARGET), 0.0);
                event.secrecy = Secrecy::Public;
                // Distinct causes keep them from merging without moving them in
                // time, isolating coalescing from every other variable.
                event.causes = vec![u64::MAX];
                same_tick.append(event);
            }
            same_tick.standing(TARGET, Axis::Integrity, 0.0)
        };

        assert!(
            (merged - apart).abs() < 1e-9,
            "coalesced {merged} should equal the separate occurrences {apart}",
        );
        assert!(merged < 0.0, "ten broken promises should cost integrity");
    }

    /// Diminishing returns have to keep diminishing.
    ///
    /// Repetition used to be multiplied in before the modifier clamp, and
    /// `0.7^7` is 0.082 — below the 0.1 floor. From the seventh repeat every
    /// further occurrence landed on the floor, so the seventh and the
    /// seventieth were worth exactly the same. That is not a diminishing
    /// return; it is a subscription.
    #[test]
    fn the_seventieth_repetition_is_worth_less_than_the_seventh() {
        let act = narrative_act_def("act.break_a_promise").expect("act exists");
        let mut log = NarrativeLog::default();

        let mut after = Vec::new();
        for step in 0..70 {
            let mut event = event_for(act, Some("entity.vell"), step as f64 * 3_600.0);
            event.secrecy = Secrecy::Public;
            // Distinct causes keep them from coalescing into one entry.
            event.causes = vec![u64::MAX];
            log.append(event);
            after.push(log.standing("entity.vell", Axis::Integrity, 70.0 * 3_600.0));
        }

        let seventh_step = (after[6] - after[5]).abs();
        let seventieth_step = (after[69] - after[68]).abs();
        assert!(
            seventieth_step < seventh_step,
            "the 70th repeat moved {seventieth_step} and the 7th moved {seventh_step}; \
             repetition stopped diminishing",
        );
        assert!(
            seventieth_step < seventh_step * 0.5,
            "the 70th repeat should be far weaker, not marginally: \
             {seventieth_step} against {seventh_step}",
        );
    }

    /// Habituation is about recent behaviour, so it expires.
    ///
    /// §5A counts "similar acts toward the same scope in the last 30 days". The
    /// window was missing, so the count ran over the whole log: a habit resumed
    /// after a year was damped as though it had never stopped, and over a long
    /// playthrough every repeated act decayed to nothing.
    #[test]
    fn repetition_only_counts_the_last_thirty_days() {
        let act = narrative_act_def("act.share_scarce_water").expect("act exists");
        let window = NarrativeLog::REPETITION_WINDOW_DAYS * GAME_DAY_SECONDS;

        let landing = |spacing: f64| {
            let mut log = NarrativeLog::default();
            let mut before = 0.0;
            let mut last = 0.0;
            for step in 0..6 {
                let mut event = event_for(act, Some("entity.vell"), step as f64 * spacing);
                event.secrecy = Secrecy::Public;
                event.causes = vec![u64::MAX];
                log.append(event);
                let now = 5.0 * spacing;
                let score = log.standing("entity.vell", Axis::Goodwill, now);
                if step == 4 {
                    before = score;
                }
                last = score;
            }
            (last - before).abs()
        };

        // Six kindnesses in a week: the sixth is heavily habituated.
        let crowded = landing(GAME_DAY_SECONDS);
        // The same six spread over a year: each one lands fresh.
        let spaced = landing(window * 2.0);

        assert!(
            spaced > crowded * 2.0,
            "a kindness after a long gap should land far harder than the sixth in a week: \
             {spaced} against {crowded}",
        );
    }

    /// And the clamp must still do the job it was written for.
    #[test]
    fn a_stack_of_modifiers_still_cannot_erase_an_act() {
        // Cost and need are the caller-supplied multipliers; drive both to
        // their floor and the act must still land.
        let act = narrative_act_def("act.break_a_promise").expect("act exists");
        let mut log = NarrativeLog::default();
        let mut event = event_for(act, Some("entity.vell"), 0.0);
        event.secrecy = Secrecy::Public;
        event.cost = 0.0;
        event.need = 0.0;
        log.append(event);

        let score = log.standing("entity.vell", Axis::Integrity, 0.0);
        assert!(
            score < 0.0,
            "a betrayal with every modifier at its floor still has to cost something, got {score}",
        );
    }

    /// Compaction summarises; it must not retune.
    ///
    /// A long history is folded away and every entity's standing on every axis
    /// is compared before and after. The error is reported, not assumed: the
    /// two ways compaction loses information — a folded contribution stops
    /// decaying, and the context it was folded under is frozen — are only
    /// acceptable if they stay small, and the only way to know is to measure.
    #[test]
    fn compaction_preserves_what_the_log_was_worth() {
        let mut log = NarrativeLog::default();
        // No oaths: `arc.broken_oath` never expires, so every oath is pinned in
        // the log and the prefix stops at the first one. Measuring the error
        // over four folded events would prove very little, and the pinning has
        // its own test below.
        let acts = [
            "act.break_a_promise",
            "act.share_scarce_water",
            "act.spare_a_life",
            "act.aid_the_hero",
        ];
        let targets = ["entity.vell", "entity.joren"];

        // Two years of history, spaced so nothing coalesces.
        for step in 0..120 {
            let act = narrative_act_def(acts[step % acts.len()]).expect("act exists");
            let mut event = event_for(
                act,
                Some(targets[step % targets.len()]),
                step as f64 * GAME_DAY_SECONDS * 6.0,
            );
            event.secrecy = Secrecy::Public;
            log.append(event);
        }

        let now = 120.0 * GAME_DAY_SECONDS * 6.0;
        let before: Vec<(String, Axis, f64)> = crate::game_data::narrative_entities()
            .iter()
            .flat_map(|entity| {
                Axis::ALL
                    .into_iter()
                    .map(move |axis| (entity.id.to_string(), axis, 0.0))
            })
            .map(|(id, axis, _)| {
                let score = log.standing(&id, axis, now);
                (id, axis, score)
            })
            .collect();

        let events_before = log.events.len();
        let folded = log.compact(now);
        assert!(folded > 0, "a two-year log should have something to fold");
        assert!(
            log.events.len() < events_before,
            "compaction should shorten the log: {events_before} -> {}",
            log.events.len(),
        );

        let mut worst = 0.0_f64;
        let mut worst_where = String::new();
        for (id, axis, expected) in &before {
            let actual = log.standing(id, *axis, now);
            let error = (actual - expected).abs();
            if error > worst {
                worst = error;
                worst_where = format!("{id} {axis:?}: {expected} -> {actual}");
            }
        }

        // A standing point is the unit the bands are cut in — the Mid band is
        // 35 points wide — so a worst-case drift under one point cannot move
        // any entity across a band edge, which is what gameplay reads.
        println!("COMPACTION: {events_before} -> {} events, folded {folded}, worst error {worst} ({worst_where})", log.events.len());
        assert!(
            worst < 1.0,
            "compaction changed standing by {worst} ({worst_where}); it is meant to summarise, not retune",
        );
    }

    /// An arc's first slot survives compaction while that arc can still be
    /// answered, and only while.
    ///
    /// Both halves matter. Folding away an oath that could still be broken
    /// would erase the arc rather than summarise it; keeping one that can no
    /// longer be answered pins the log forever, because only a prefix can be
    /// folded. `arc.broken_oath` expires after a year, so the year is the line.
    #[test]
    fn an_arc_s_first_slot_is_kept_exactly_as_long_as_it_could_be_answered() {
        let oath = narrative_act_def("act.swear_an_oath").expect("act exists");
        let expiry_days = crate::game_data::sift_pattern_def("arc.broken_oath")
            .expect("pattern exists")
            .expires_after_days;
        assert!(
            expiry_days > 0.0,
            "this test is about the expiry; without one there is nothing to check",
        );

        // Old enough to compact, young enough to still be broken.
        let mut answerable = NarrativeLog::default();
        let mut event = event_for(oath, Some("entity.vell"), 0.0);
        event.secrecy = Secrecy::Public;
        answerable.append(event);
        let within = (NarrativeLog::COMPACTION_HORIZON_DAYS + 1.0) * GAME_DAY_SECONDS;
        assert!(
            within / GAME_DAY_SECONDS <= expiry_days,
            "the horizon must fall inside the expiry for this case to exist",
        );
        answerable.compact(within);
        assert_eq!(
            answerable.events.len(),
            1,
            "an oath that could still be broken must outlive compaction",
        );

        // Past the expiry: nothing can complete the arc from it any more.
        let mut expired = NarrativeLog::default();
        let mut event = event_for(oath, Some("entity.vell"), 0.0);
        event.secrecy = Secrecy::Public;
        expired.append(event);
        expired.compact((expiry_days + 1.0) * GAME_DAY_SECONDS);
        assert_eq!(
            expired.events.len(),
            0,
            "once the arc can no longer be answered the oath is ordinary history",
        );
    }

    /// A warm score is used when it is still true, and the save carries one.
    #[test]
    fn a_saved_score_is_reused_after_a_load() {
        let mut log = NarrativeLog::default();
        let act = narrative_act_def("act.break_a_promise").expect("act exists");
        let mut event = event_for(act, Some("entity.vell"), 0.0);
        event.secrecy = Secrecy::Public;
        log.append(event);

        let now = GAME_DAY_SECONDS;
        let expected = log.standing("entity.vell", Axis::Integrity, now);
        log.warm_for_save(now);
        assert!(!log.warm_scores.entries.is_empty(), "the save should carry scores");

        // A clone drops the in-memory memo, so anything answered afterwards
        // came from what the save carried.
        let mut loaded = log.clone();
        assert!(loaded.standing_cache.borrow().is_empty());
        loaded.hydrate_from_save();
        assert!(
            !loaded.standing_cache.borrow().is_empty(),
            "the saved scores should become cache entries",
        );
        assert!(
            loaded.warm_scores.entries.is_empty(),
            "and the field should be cleared, so a loaded state matches a played one",
        );
        assert_eq!(loaded.standing("entity.vell", Axis::Integrity, now), expected);
    }

    /// Retuned content must throw the saved scores away.
    ///
    /// §10: "If world data changed (retuned amounts, new entities), replay the
    /// log against the new act definitions. Scores update to the new tuning;
    /// history stays intact." A cache that outlived a retune would defeat that
    /// silently — the game would show scores from the old tuning and nothing
    /// would look wrong. The planted value is deliberately absurd so that using
    /// it would be unmistakable.
    #[test]
    fn a_saved_score_from_different_content_is_refolded() {
        let mut log = NarrativeLog::default();
        let act = narrative_act_def("act.break_a_promise").expect("act exists");
        let mut event = event_for(act, Some("entity.vell"), 0.0);
        event.secrecy = Secrecy::Public;
        log.append(event);

        let now = GAME_DAY_SECONDS;
        let honest = log.standing("entity.vell", Axis::Integrity, now);
        log.warm_for_save(now);

        let mut stale = log.clone();
        stale.warm_scores.catalog_version =
            crate::game_data::CONTENT_CATALOG_VERSION.wrapping_add(1);
        for entry in stale.warm_scores.entries.values_mut() {
            *entry = 999.0;
        }
        stale.hydrate_from_save();

        assert!(
            stale.standing_cache.borrow().is_empty(),
            "scores folded under different content must not be adopted",
        );
        assert_eq!(
            stale.standing("entity.vell", Axis::Integrity, now),
            honest,
            "a score folded under different content must be recomputed, not trusted",
        );
    }

    /// The guards are per observer and per moment, not global.
    #[test]
    fn a_saved_score_is_refused_once_anything_could_have_moved_it() {
        let mut log = NarrativeLog::default();
        let act = narrative_act_def("act.break_a_promise").expect("act exists");
        let mut event = event_for(act, Some("entity.vell"), 0.0);
        event.secrecy = Secrecy::Public;
        log.append(event);
        let now = GAME_DAY_SECONDS;
        log.warm_for_save(now);

        // A different moment: decay has moved on, so the adopted entry cannot
        // answer for it.
        let mut loaded = log.clone();
        loaded.hydrate_from_save();
        let key_count = loaded.standing_cache.borrow().len();
        assert!(key_count > 0);
        let later = loaded.standing("entity.vell", Axis::Integrity, now + GAME_DAY_SECONDS);
        assert!(
            loaded.standing_cache.borrow().len() > key_count,
            "a later tick must be folded afresh rather than answered from the save",
        );
        let _ = later;

        // One more event, and every score may have moved.
        let mut grown = log.clone();
        let mut another = event_for(act, Some("entity.vell"), now);
        another.secrecy = Secrecy::Public;
        another.causes = vec![u64::MAX];
        grown.append(another);
        grown.hydrate_from_save();
        assert!(
            grown.standing_cache.borrow().is_empty(),
            "a longer log must invalidate what was saved",
        );
    }

    /// Acts that differ in anything consequential are not repeats.
    #[test]
    fn only_identical_acts_in_the_same_window_merge() {
        let act = narrative_act_def("act.break_a_promise").expect("act");

        let mut different_target = NarrativeLog::default();
        let mut first = event_for(act, Some(TARGET), 0.0);
        first.secrecy = Secrecy::Public;
        different_target.append(first);
        let mut second = event_for(act, Some("entity.joren"), 1.0);
        second.secrecy = Secrecy::Public;
        different_target.append(second);
        assert_eq!(different_target.events.len(), 2, "a different target is a different event");

        let mut different_secrecy = NarrativeLog::default();
        let mut public = event_for(act, Some(TARGET), 0.0);
        public.secrecy = Secrecy::Public;
        different_secrecy.append(public);
        let mut secret = event_for(act, Some(TARGET), 1.0);
        secret.secrecy = Secrecy::Secret;
        different_secrecy.append(secret);
        assert_eq!(
            different_secrecy.events.len(),
            2,
            "who saw it changes what it does, so it cannot merge",
        );

        let mut late = NarrativeLog::default();
        let mut early = event_for(act, Some(TARGET), 0.0);
        early.secrecy = Secrecy::Public;
        late.append(early);
        let mut hours_later = event_for(act, Some(TARGET), NarrativeLog::COALESCE_WINDOW_SECONDS + 1.0);
        hours_later.secrecy = Secrecy::Public;
        late.append(hours_later);
        assert_eq!(late.events.len(), 2, "beyond the window they are two acts");
    }

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
