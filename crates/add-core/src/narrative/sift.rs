//! Story sifting: recognising the arcs a player actually built.
//!
//! §7 of the specification. A pattern is a small query over the log — a few
//! event slots with constraints, plus ordering and causal relations between
//! them. Patterns are authored content; the matching is a rule and lives here.
//!
//! The point is not to detect everything. It is to let a character refer to
//! something the player did, by name, and say why it matters now.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use super::log::{NarrativeEvent, NarrativeLog};
use super::standing::GAME_DAY_SECONDS;
use crate::game_data::{SiftPatternDef, sift_patterns};

/// A pattern that matched, with who filled each slot.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArcMatch {
    pub pattern_id: String,
    /// Slot name -> the entity that filled it, for dialogue to name.
    pub roles: BTreeMap<String, String>,
    /// The events that made it, oldest first. `narr graph` draws these.
    pub event_ids: Vec<u64>,
    /// Tick of the event that completed it.
    pub completed_at: f64,
}

/// Everything the log currently recognises.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SiftResult {
    pub matches: Vec<ArcMatch>,
    /// Patterns whose first slot is filled but which have not completed. A
    /// character can warn the Hero that a promise is about to be tested.
    pub pending: Vec<String>,
}

impl SiftResult {
    pub fn matched(&self, pattern_id: &str) -> bool {
        self.matches.iter().any(|m| m.pattern_id == pattern_id)
    }

    pub fn is_pending(&self, pattern_id: &str) -> bool {
        self.pending.iter().any(|id| id == pattern_id)
    }

    /// Who filled a slot, for dialogue: `arc_role("mercy_repaid", "x")`.
    pub fn role(&self, pattern_id: &str, slot: &str) -> Option<&str> {
        self.matches
            .iter()
            .find(|m| m.pattern_id == pattern_id)
            .and_then(|m| m.roles.get(slot))
            .map(String::as_str)
    }

    pub fn pattern_ids(&self) -> Vec<String> {
        self.matches.iter().map(|m| m.pattern_id.clone()).collect()
    }
}

fn act_has_kind(act_id: &str, kind: &str) -> bool {
    crate::game_data::narrative_act_def(act_id)
        .is_some_and(|act| act.kinds.iter().any(|candidate| *candidate == kind))
}

/// Does `later` name `earlier` among its causes, directly or through a chain?
fn caused_by(log: &NarrativeLog, later: &NarrativeEvent, earlier_id: u64, depth: u8) -> bool {
    if depth == 0 {
        return false;
    }
    if later.causes.contains(&earlier_id) {
        return true;
    }
    later.causes.iter().any(|cause| {
        log.events
            .iter()
            .find(|event| event.id == *cause)
            .is_some_and(|parent| caused_by(log, parent, earlier_id, depth - 1))
    })
}

/// Match one pattern over the log.
///
/// Deliberately a scan rather than the specification's incremental matcher:
/// at the current log size a scan is microseconds, and an incremental matcher
/// is a cache that can disagree with the log. It becomes worth building when
/// `narr fuzz` shows the scan on the profile, not before.
fn match_pattern(log: &NarrativeLog, pattern: &SiftPatternDef) -> (Vec<ArcMatch>, bool) {
    let mut matches = Vec::new();
    let mut any_first_slot = false;

    for first in &log.events {
        if !act_has_kind(&first.act_id, pattern.first_kind) {
            continue;
        }
        let Some(subject) = first.target.clone() else {
            continue;
        };
        any_first_slot = true;

        for second in &log.events {
            if second.id <= first.id {
                continue;
            }
            if !act_has_kind(&second.act_id, pattern.second_kind) {
                continue;
            }
            // The same person must fill both slots: that is what makes it an
            // arc rather than two unrelated things happening.
            if second.target.as_deref() != Some(subject.as_str()) {
                continue;
            }
            let gap_days = (second.tick - first.tick).max(0.0) / GAME_DAY_SECONDS;
            if gap_days < pattern.min_gap_days {
                continue;
            }
            if pattern.expires_after_days > 0.0 && gap_days > pattern.expires_after_days {
                continue;
            }
            if pattern.requires_cause && !caused_by(log, second, first.id, 8) {
                continue;
            }

            let mut roles = BTreeMap::new();
            roles.insert("x".to_string(), subject.clone());
            matches.push(ArcMatch {
                pattern_id: pattern.id.to_string(),
                roles,
                event_ids: vec![first.id, second.id],
                completed_at: second.tick,
            });
        }
    }

    (matches, any_first_slot)
}

/// Sift the whole log.
pub fn sift(log: &NarrativeLog) -> SiftResult {
    let mut result = SiftResult::default();
    for pattern in sift_patterns() {
        let (matches, any_first_slot) = match_pattern(log, pattern);
        let completed = !matches.is_empty();
        result.matches.extend(matches);
        if any_first_slot && !completed {
            result.pending.push(pattern.id.to_string());
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::narrative::{Secrecy, event_for};
    use crate::game_data::narrative_act_def;

    const VELL: &str = "entity.vell";

    fn public_event(log: &mut NarrativeLog, act_id: &str, tick: f64, causes: Vec<u64>) -> u64 {
        let act = narrative_act_def(act_id).expect("act exists");
        let mut event = event_for(act, Some(VELL), tick);
        event.secrecy = Secrecy::Public;
        event.causes = causes;
        log.append(event)
    }

    #[test]
    fn mercy_repaid_needs_the_second_act_to_name_the_first() {
        // Without the causal link the two acts are just two acts.
        let mut unlinked = NarrativeLog::default();
        let spared = public_event(&mut unlinked, "act.spare_a_life", 0.0, vec![]);
        public_event(&mut unlinked, "act.aid_the_hero", 10.0 * GAME_DAY_SECONDS, vec![]);
        assert!(!sift(&unlinked).matched("arc.mercy_repaid"));

        let mut linked = NarrativeLog::default();
        let spared_id = public_event(&mut linked, "act.spare_a_life", 0.0, vec![]);
        public_event(
            &mut linked,
            "act.aid_the_hero",
            10.0 * GAME_DAY_SECONDS,
            vec![spared_id],
        );
        let result = sift(&linked);
        assert!(result.matched("arc.mercy_repaid"));
        assert_eq!(result.role("arc.mercy_repaid", "x"), Some(VELL));
        let _ = spared;
    }

    #[test]
    fn broken_oath_is_recognised_without_a_declared_cause() {
        // Swearing then doing the forbidden thing needs no link: the sequence
        // is the story.
        let mut log = NarrativeLog::default();
        public_event(&mut log, "act.swear_an_oath", 0.0, vec![]);
        public_event(&mut log, "act.break_a_promise", 5.0 * GAME_DAY_SECONDS, vec![]);
        let result = sift(&log);
        assert!(result.matched("arc.broken_oath"));
        assert_eq!(result.role("arc.broken_oath", "x"), Some(VELL));
    }

    #[test]
    fn a_pattern_with_only_its_first_slot_filled_is_pending() {
        // What lets a character warn the Hero that a promise is about to be
        // tested, rather than only commenting once it is too late.
        let mut log = NarrativeLog::default();
        public_event(&mut log, "act.swear_an_oath", 0.0, vec![]);
        let result = sift(&log);
        assert!(!result.matched("arc.broken_oath"));
        assert!(result.is_pending("arc.broken_oath"));
    }

    #[test]
    fn an_arc_that_happens_too_fast_does_not_count() {
        // mercy_repaid requires a gap: gratitude an hour later is the same
        // scene, not a repaid debt.
        let mut log = NarrativeLog::default();
        let spared = public_event(&mut log, "act.spare_a_life", 0.0, vec![]);
        public_event(&mut log, "act.aid_the_hero", 60.0, vec![spared]);
        assert!(!sift(&log).matched("arc.mercy_repaid"));
    }

    #[test]
    fn an_empty_log_matches_nothing_and_pends_nothing() {
        let result = sift(&NarrativeLog::default());
        assert!(result.matches.is_empty());
        assert!(result.pending.is_empty());
    }

    #[test]
    fn a_match_names_the_events_that_made_it() {
        let mut log = NarrativeLog::default();
        let first = public_event(&mut log, "act.swear_an_oath", 0.0, vec![]);
        let second = public_event(&mut log, "act.break_a_promise", 5.0 * GAME_DAY_SECONDS, vec![]);
        let result = sift(&log);
        let arc = result
            .matches
            .iter()
            .find(|m| m.pattern_id == "arc.broken_oath")
            .expect("matched");
        assert_eq!(arc.event_ids, vec![first, second]);
    }
}
