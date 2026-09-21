//! Who has heard what, and how well.
//!
//! Blast radius is the product of two things: *scope* — who would care — and
//! *knowledge* — who has heard. §6 of the specification. An impact moves an
//! entity's standing only if that entity knows the event, which is what makes
//! a secret mechanically real rather than a fiction the numbers ignore.
//!
//! Knowledge is stored rather than derived. Rumour is a stochastic,
//! time-ordered process, so rebuilding it on every standing read would mean
//! replaying the whole spread each time. The specification stores it too, for
//! the same reason. It stays deterministic: every roll comes from the save's
//! seed and the identities involved, never from wall-clock or iteration order.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use super::standing::GAME_DAY_SECONDS;

/// How an event became known, and how reliably.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Knowledge {
    /// Game tick at which this entity learned it.
    pub learned_at: f64,
    /// 0 means witnessed first-hand; each retelling adds one.
    pub hops: u8,
    /// 1.0 first-hand, multiplied by `FIDELITY_PER_HOP` per retelling.
    pub fidelity: f64,
}

impl Knowledge {
    pub fn first_hand(tick: f64) -> Knowledge {
        Knowledge { learned_at: tick, hops: 0, fidelity: 1.0 }
    }
}

/// How visible an act was when it happened.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Secrecy {
    /// Everyone in the affected scopes knows at once.
    Public,
    /// The target and whoever was named as present.
    #[default]
    Witnessed,
    /// Nobody but the Hero. Until it leaks, it changes nothing.
    Secret,
}

impl Secrecy {
    pub fn from_str(value: &str) -> Option<Secrecy> {
        Some(match value {
            "public" => Secrecy::Public,
            "witnessed" => Secrecy::Witnessed,
            "secret" => Secrecy::Secret,
            _ => return None,
        })
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Secrecy::Public => "public",
            Secrecy::Witnessed => "witnessed",
            Secrecy::Secret => "secret",
        }
    }
}

/// Each retelling costs this much fidelity.
pub const FIDELITY_PER_HOP: f64 = 0.7;
/// Below this, a rumour is too vague to carry and stops spreading.
pub const FIDELITY_FLOOR: f64 = 0.2;
/// Rumour advances on fixed tick boundaries, so an offline gap produces the
/// same spread as playing through it.
pub const RUMOUR_INTERVAL_SECONDS: f64 = 6.0 * 60.0;

/// How many peers one entity can tell at a single boundary.
///
/// Without a cap, everyone in a group tells everyone else, so a step costs the
/// square of the group's size: at a thousand entities a single boundary took 87
/// milliseconds against a 5 millisecond budget, and priming a three-year game
/// took six minutes.
///
/// A cap is also the truer model. People do not tell two hundred acquaintances
/// anything; they tell the few they saw today, and it reaches the rest through
/// them. Which peers those are rotates deterministically with the tick, so news
/// still reaches the whole group over several boundaries — more slowly, which
/// is how rumour actually travels.
pub const GOSSIP_FANOUT: usize = 8;
/// Base chance one tie passes something on in a single step.
pub const GOSSIP_CHANCE: f64 = 0.45;
/// News older than this stops travelling regardless of fidelity.
pub const RECENCY_DAYS: f64 = 30.0;

/// Who knows what: entity id -> event id -> how they know it.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeBase {
    pub by_entity: BTreeMap<String, BTreeMap<u64, Knowledge>>,
    /// Entities that will no longer pass anything on: bought, removed, or
    /// simply told to keep quiet.
    pub silenced: Vec<String>,
    /// Tick of the last rumour step, so stepping is idempotent per boundary.
    pub last_step_tick: f64,
}

impl KnowledgeBase {
    /// How many events this entity knows of.
    ///
    /// Used as a cheap version stamp for the standing cache: an entity's score
    /// can only move when the log grows or when that entity learns something,
    /// and learning is only ever an insertion here.
    pub fn len_for(&self, entity_id: &str) -> usize {
        self.by_entity.get(entity_id).map_or(0, |events| events.len())
    }

    /// Drop everything anyone knew about these events.
    ///
    /// Called by compaction: an event that is no longer in the log cannot be
    /// learned, repeated or forgotten, so holding knowledge of it would keep
    /// the rumour tables growing after the events themselves were summarised.
    pub fn forget_all(&mut self, event_ids: &[u64]) {
        if event_ids.is_empty() {
            return;
        }
        for events in self.by_entity.values_mut() {
            events.retain(|event_id, _| !event_ids.contains(event_id));
        }
        self.by_entity.retain(|_, events| !events.is_empty());
    }

    /// Does this entity know, in their own right or through a group they
    /// belong to?
    ///
    /// A public act is recorded once at the scope it touched, so membership is
    /// resolved here by walking up the graph rather than by copying the event
    /// onto every member when it happens.
    pub fn knows(&self, entity_id: &str, event_id: u64) -> bool {
        self.holder_of(entity_id, event_id).is_some()
    }

    /// The nearest holder of this knowledge: the entity itself, or the closest
    /// ancestor that holds it.
    fn holder_of(&self, entity_id: &str, event_id: u64) -> Option<&Knowledge> {
        if let Some(knowledge) = self.by_entity.get(entity_id).and_then(|e| e.get(&event_id)) {
            return Some(knowledge);
        }
        let mut current = crate::game_data::narrative_entity_def(entity_id);
        while let Some(entity) = current {
            let Some(parent_id) = entity.parent else {
                return None;
            };
            if let Some(knowledge) = self.by_entity.get(parent_id).and_then(|e| e.get(&event_id)) {
                return Some(knowledge);
            }
            current = crate::game_data::narrative_entity_def(parent_id);
        }
        None
    }

    pub fn fidelity(&self, entity_id: &str, event_id: u64) -> Option<f64> {
        self.holder_of(entity_id, event_id).map(|k| k.fidelity)
    }

    pub fn heard_first_hand(&self, entity_id: &str, event_id: u64) -> bool {
        self.holder_of(entity_id, event_id)
            .is_some_and(|knowledge| knowledge.hops == 0)
    }

    /// Does anyone in this entity's subtree know?
    pub fn anyone_knows(&self, scope_id: &str, event_id: u64) -> bool {
        self.by_entity.iter().any(|(entity_id, events)| {
            events.contains_key(&event_id)
                && super::graph::ancestry(entity_id).contains(&scope_id)
        })
    }

    /// Record knowledge, keeping the best account an entity has. Hearing a
    /// first-hand telling after a rumour upgrades what they hold, never
    /// downgrades it.
    pub fn learn(&mut self, entity_id: &str, event_id: u64, knowledge: Knowledge) {
        let entry = self
            .by_entity
            .entry(entity_id.to_string())
            .or_default()
            .entry(event_id)
            .or_insert(knowledge);
        if knowledge.fidelity > entry.fidelity {
            *entry = knowledge;
        }
    }

    pub fn silence(&mut self, entity_id: &str) {
        if !self.silenced.iter().any(|id| id == entity_id) {
            self.silenced.push(entity_id.to_string());
        }
    }

    fn is_silenced(&self, entity_id: &str) -> bool {
        self.silenced.iter().any(|id| id == entity_id)
    }

    /// Ties an entity can talk to: its group, and everyone sharing that group.
    /// Rumour follows contact, not sentiment — rivals in one band gossip
    /// constantly.
    /// Who an entity would tell: the group it belongs to, and everyone else in
    /// that group.
    ///
    /// Read from an index built once rather than by scanning the whole
    /// population per call. The scan it replaces was O(entities) *and*
    /// allocated, and `step` called it once per teller per known event — at a
    /// thousand entities that is three hundred thousand scans of a thousand
    /// entities for a single rumour boundary.
    fn ties(entity_id: &str) -> &'static [&'static str] {
        static INDEX: std::sync::OnceLock<
            std::collections::HashMap<&'static str, Vec<&'static str>>,
        > = std::sync::OnceLock::new();

        let index = INDEX.get_or_init(|| {
            let mut by_parent: std::collections::HashMap<&'static str, Vec<&'static str>> =
                std::collections::HashMap::new();
            for entity in crate::game_data::narrative_entities() {
                if let Some(parent_id) = entity.parent {
                    by_parent.entry(parent_id).or_default().push(entity.id);
                }
            }

            let mut ties = std::collections::HashMap::new();
            for entity in crate::game_data::narrative_entities() {
                let Some(parent_id) = entity.parent else {
                    continue;
                };
                let mut listeners = vec![parent_id];
                if let Some(siblings) = by_parent.get(parent_id) {
                    listeners.extend(siblings.iter().filter(|id| **id != entity.id));
                }
                ties.insert(entity.id, listeners);
            }
            ties
        });

        index.get(entity_id).map(Vec::as_slice).unwrap_or(&[])
    }

    /// Advance rumour to `now_tick` on fixed boundaries. Idempotent: calling
    /// it twice for the same tick spreads nothing extra, which is what makes
    /// an offline gap match playing through.
    pub fn advance(&mut self, now_tick: f64, seed: u64) {
        while now_tick - self.last_step_tick >= RUMOUR_INTERVAL_SECONDS {
            self.last_step_tick += RUMOUR_INTERVAL_SECONDS;
            self.step(self.last_step_tick, seed);
        }
    }

    fn step(&mut self, tick: f64, seed: u64) {
        // Collect first so the spread within one step cannot cascade: what a
        // tie hears now, it passes on at the next boundary, never this one.
        let mut pending: Vec<(String, u64, Knowledge)> = Vec::new();

        for (teller_id, events) in &self.by_entity {
            if self.is_silenced(teller_id) {
                continue;
            }
            // §10: "Only entities holding spreadable, recent knowledge are
            // visited." Someone with nothing fresh to pass on is skipped before
            // their listeners are looked up at all.
            let has_fresh_news = events.iter().any(|(_, knowledge)| {
                knowledge.fidelity > FIDELITY_FLOOR
                    && (tick - knowledge.learned_at).max(0.0) / GAME_DAY_SECONDS <= RECENCY_DAYS
            });
            if !has_fresh_news {
                continue;
            }
            // Depends only on the teller, so it is resolved once rather than
            // once per event they know.
            let all_listeners = Self::ties(teller_id);
            // A rotating window, so the cap bounds the work per boundary
            // without permanently cutting anyone out of earshot.
            let offset = if all_listeners.is_empty() {
                0
            } else {
                (deterministic_roll(seed, tick, teller_id, "", 0) * all_listeners.len() as f64)
                    as usize
                    % all_listeners.len()
            };
            let reach = all_listeners.len().min(GOSSIP_FANOUT);
            let listeners: Vec<&'static str> = (0..reach)
                .map(|step| all_listeners[(offset + step) % all_listeners.len()])
                .collect();
            for (event_id, knowledge) in events {
                if knowledge.fidelity <= FIDELITY_FLOOR {
                    continue;
                }
                let age_days = (tick - knowledge.learned_at).max(0.0) / GAME_DAY_SECONDS;
                if age_days > RECENCY_DAYS {
                    continue;
                }
                let recency = 1.0 - (age_days / RECENCY_DAYS);
                for listener_id in listeners.iter().copied() {
                    if self.knows(listener_id, *event_id) {
                        continue;
                    }
                    let roll = deterministic_roll(seed, tick, teller_id, listener_id, *event_id);
                    if roll < GOSSIP_CHANCE * recency {
                        pending.push((
                            listener_id.to_string(),
                            *event_id,
                            Knowledge {
                                learned_at: tick,
                                hops: knowledge.hops.saturating_add(1),
                                fidelity: knowledge.fidelity * FIDELITY_PER_HOP,
                            },
                        ));
                    }
                }
            }
        }

        for (entity_id, event_id, knowledge) in pending {
            self.learn(&entity_id, event_id, knowledge);
        }
    }
}

/// A roll in [0, 1) that depends only on the save's seed and the identities
/// involved. No wall-clock, no hash-map iteration order, no global generator:
/// the same save always spreads the same rumours.
fn deterministic_roll(seed: u64, tick: f64, teller: &str, listener: &str, event_id: u64) -> f64 {
    let mut hash = seed ^ 0xA076_1D64_78BD_642F;
    let mut mix = |value: u64| {
        hash ^= value;
        hash = hash.wrapping_mul(0x9E37_79B9_7F4A_7C15);
        hash ^= hash >> 29;
    };
    mix(tick as u64);
    mix(event_id);
    for byte in teller.bytes() {
        mix(byte as u64);
    }
    for byte in listener.bytes() {
        mix(byte as u64);
    }
    (hash >> 11) as f64 / (1u64 << 53) as f64
}

#[cfg(test)]
mod tests {
    use super::*;

    const VELL: &str = "entity.vell";
    const JOREN: &str = "entity.joren";
    const CREW: &str = "entity.sleepless.sounding_five";

    fn witnessed_by_vell() -> KnowledgeBase {
        let mut base = KnowledgeBase::default();
        base.learn(VELL, 1, Knowledge::first_hand(0.0));
        base
    }

    #[test]
    fn a_secret_nobody_witnessed_is_known_to_nobody() {
        let base = KnowledgeBase::default();
        assert!(!base.knows(VELL, 1));
        assert!(!base.anyone_knows(CREW, 1));
    }

    #[test]
    fn rumour_reaches_a_tie_and_loses_fidelity_on_the_way() {
        let mut base = witnessed_by_vell();
        base.advance(400.0 * RUMOUR_INTERVAL_SECONDS, 7);

        assert!(base.knows(JOREN, 1), "a crewmate should eventually hear");
        let heard = base.fidelity(JOREN, 1).expect("fidelity");
        assert!(heard < 1.0, "a retelling should cost fidelity: {heard}");
        assert!(base.heard_first_hand(VELL, 1));
        assert!(!base.heard_first_hand(JOREN, 1));
    }

    #[test]
    fn spreading_is_deterministic_for_a_given_seed() {
        let mut a = witnessed_by_vell();
        let mut b = witnessed_by_vell();
        a.advance(200.0 * RUMOUR_INTERVAL_SECONDS, 11);
        b.advance(200.0 * RUMOUR_INTERVAL_SECONDS, 11);
        assert_eq!(a, b);
    }

    #[test]
    fn one_long_gap_matches_many_short_steps() {
        // The property offline catch-up depends on.
        let target = 300.0 * RUMOUR_INTERVAL_SECONDS;
        let mut offline = witnessed_by_vell();
        offline.advance(target, 5);

        let mut online = witnessed_by_vell();
        let mut tick = 0.0;
        while tick < target {
            tick += RUMOUR_INTERVAL_SECONDS;
            online.advance(tick, 5);
        }
        assert_eq!(offline, online);
    }

    #[test]
    fn a_silenced_witness_passes_nothing_on() {
        let mut base = witnessed_by_vell();
        base.silence(VELL);
        base.advance(500.0 * RUMOUR_INTERVAL_SECONDS, 3);
        assert!(!base.knows(JOREN, 1), "a silenced witness should not spread it");
    }

    #[test]
    fn a_first_hand_account_upgrades_a_rumour() {
        let mut base = KnowledgeBase::default();
        base.learn(JOREN, 1, Knowledge { learned_at: 0.0, hops: 2, fidelity: 0.49 });
        base.learn(JOREN, 1, Knowledge::first_hand(10.0));
        assert_eq!(base.fidelity(JOREN, 1), Some(1.0));
        assert!(base.heard_first_hand(JOREN, 1));
    }

    #[test]
    fn anyone_knows_answers_for_a_whole_subtree() {
        let base = witnessed_by_vell();
        assert!(base.anyone_knows(CREW, 1));
        assert!(base.anyone_knows("entity.sleepless", 1));
        assert!(!base.anyone_knows(JOREN, 1));
    }
}
