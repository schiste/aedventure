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
    /// Patterns that have ever seen their first slot filled.
    ///
    /// Kept so the result can be extended one event at a time: "pending" means
    /// a first slot was filled and no match completed, and the first fact is
    /// monotonic — it can never stop being true as the log grows. Without it an
    /// incremental update would have to rescan the log to answer it, which is
    /// the cost the incremental path exists to avoid.
    #[serde(default)]
    pub seen_first_slot: Vec<String>,
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

pub(crate) fn act_has_kind(act_id: &str, kind: &str) -> bool {
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

    // Both slots of a pattern must name the same subject — that is what makes
    // it an arc rather than two unrelated things happening — so pairs can only
    // form within one subject's events. Bucketing by subject first turns a scan
    // of every event against every other event into a scan within each bucket.
    let mut firsts_by_subject: BTreeMap<&str, Vec<&NarrativeEvent>> = BTreeMap::new();
    let mut seconds_by_subject: BTreeMap<&str, Vec<&NarrativeEvent>> = BTreeMap::new();
    for event in &log.events {
        let Some(target) = event.target.as_deref() else {
            continue;
        };
        if act_has_kind(&event.act_id, pattern.first_kind) {
            firsts_by_subject.entry(target).or_default().push(event);
        }
        if act_has_kind(&event.act_id, pattern.second_kind) {
            seconds_by_subject.entry(target).or_default().push(event);
        }
    }
    let any_first_slot = !firsts_by_subject.is_empty();

    // Walked the way `sift_append` walks it: seconds oldest first, so the arc
    // completes at the earliest moment it can, and for each second the most
    // recent qualifying first. The two must agree on *which pair* they cite,
    // not merely that something matched — a save records the event ids, and
    // `narr explain` shows them to a writer. Searching firsts in the opposite
    // direction here made the two paths name different events for the same arc.
    for (subject, seconds) in &seconds_by_subject {
        let Some(firsts) = firsts_by_subject.get(subject) else {
            continue;
        };
        let mut completed = false;
        for second in seconds {
            for first in firsts.iter().rev() {
                if first.id >= second.id {
                    continue;
                }
                let gap_days = (second.tick - first.tick).max(0.0) / GAME_DAY_SECONDS;
                // Walking back through the firsts, the gap only widens, so once
                // one has expired so has every earlier one.
                if pattern.expires_after_days > 0.0 && gap_days > pattern.expires_after_days {
                    break;
                }
                if gap_days < pattern.min_gap_days {
                    continue;
                }
                if pattern.requires_cause && !caused_by(log, second, first.id, 8) {
                    continue;
                }

                let mut roles = BTreeMap::new();
                roles.insert("x".to_string(), (*subject).to_string());
                matches.push(ArcMatch {
                    pattern_id: pattern.id.to_string(),
                    roles,
                    event_ids: vec![first.id, second.id],
                    completed_at: second.tick,
                });
                // An arc completes once for a given subject. Recording every
                // qualifying pair grows without bound — a pattern with no
                // expiry makes it quadratic in the log — and that list is
                // carried in the save. Nothing reads more than "did this arc
                // complete, and for whom".
                completed = true;
                break;
            }
            if completed {
                break;
            }
        }
    }

    (matches, any_first_slot)
}

/// Extend a sift result with the log's most recent event.
///
/// Every other event is older, so the new one can only complete a pattern as
/// its *second* slot; as a first slot it will be considered when the events
/// that might answer it arrive. Candidate firsts are walked backwards from the
/// end and abandoned once they fall outside the pattern's expiry window, so the
/// work is bounded by that window rather than by the length of the log.
///
/// Re-sifting the whole log on every act is what put `emit_act` over its budget:
/// the scan is quadratic in the log, and the log only grows.
pub fn sift_append(previous: &mut SiftResult, log: &NarrativeLog) {
    let Some(second) = log.events.last() else {
        return;
    };

    for pattern in sift_patterns() {
        if act_has_kind(&second.act_id, pattern.first_kind) && second.target.is_some() {
            if !previous.seen_first_slot.iter().any(|id| id == pattern.id) {
                previous.seen_first_slot.push(pattern.id.to_string());
            }
        }

        if !act_has_kind(&second.act_id, pattern.second_kind) {
            continue;
        }
        let Some(subject) = second.target.as_deref() else {
            continue;
        };
        // Already completed for this subject: nothing to look for, and nothing
        // to scan. This is what keeps `emit_act` off the length of the log for
        // patterns that never expire.
        if previous.matches.iter().any(|m| {
            m.pattern_id == pattern.id && m.roles.get("x").map(String::as_str) == Some(subject)
        }) {
            continue;
        }

        for first in log.events.iter().rev().skip(1) {
            let gap_days = (second.tick - first.tick).max(0.0) / GAME_DAY_SECONDS;
            // Walking backwards means ticks only decrease, so once one candidate
            // is beyond the expiry every earlier one is too.
            if pattern.expires_after_days > 0.0 && gap_days > pattern.expires_after_days {
                break;
            }
            if first.id >= second.id {
                continue;
            }
            if !act_has_kind(&first.act_id, pattern.first_kind) {
                continue;
            }
            if first.target.as_deref() != Some(subject) {
                continue;
            }
            if gap_days < pattern.min_gap_days {
                continue;
            }
            if pattern.requires_cause && !caused_by(log, second, first.id, 8) {
                continue;
            }

            let mut roles = BTreeMap::new();
            roles.insert("x".to_string(), subject.to_string());
            previous.matches.push(ArcMatch {
                pattern_id: pattern.id.to_string(),
                roles,
                event_ids: vec![first.id, second.id],
                completed_at: second.tick,
            });
            break;
        }
    }

    previous.pending = previous
        .seen_first_slot
        .iter()
        .filter(|id| !previous.matches.iter().any(|m| &&m.pattern_id == id))
        .cloned()
        .collect();
}

/// Sift the whole log.
pub fn sift(log: &NarrativeLog) -> SiftResult {
    let mut result = SiftResult::default();
    for pattern in sift_patterns() {
        let (matches, any_first_slot) = match_pattern(log, pattern);
        let completed = !matches.is_empty();
        result.matches.extend(matches);
        if any_first_slot {
            result.seen_first_slot.push(pattern.id.to_string());
            if !completed {
                result.pending.push(pattern.id.to_string());
            }
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

    /// Matches are compared as a set: the full scan groups them by pattern and
    /// the incremental path produces them in arrival order, which is a
    /// difference in bookkeeping, not in what was recognised.
    fn fingerprint(result: &SiftResult) -> (Vec<(String, Vec<u64>)>, Vec<String>) {
        let mut matches: Vec<(String, Vec<u64>)> = result
            .matches
            .iter()
            .map(|m| (m.pattern_id.clone(), m.event_ids.clone()))
            .collect();
        matches.sort();
        let mut pending = result.pending.clone();
        pending.sort();
        (matches, pending)
    }

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

    /// The incremental path must agree with the full scan at every step.
    ///
    /// This is the whole argument for using it: `emit_act` stops re-sifting the
    /// log only because extending the previous result is known to reach the
    /// same answer. Checked after every single append, across acts that do and
    /// do not complete arcs, because an incremental update that is right at the
    /// end and wrong in the middle would still ship wrong arcs to dialogue.
    #[test]
    fn extending_a_result_agrees_with_sifting_the_whole_log() {
        let act_ids = [
            "act.spare_a_life",
            "act.break_a_promise",
            "act.aid_the_hero",
            "act.share_supplies",
        ];
        let targets = ["entity.vell", "entity.joren"];

        let mut log = NarrativeLog::default();
        let mut incremental = SiftResult::default();

        for step in 0..24 {
            let act_id = act_ids[step % act_ids.len()];
            let Some(act) = narrative_act_def(act_id) else {
                continue;
            };
            let target = targets[step % targets.len()];
            let mut event = event_for(act, Some(target), step as f64 * GAME_DAY_SECONDS * 0.5);
            event.secrecy = Secrecy::Public;
            // Name the previous event as a cause so cause-requiring patterns
            // are exercised rather than silently skipped.
            if let Some(previous) = log.events.last() {
                event.causes = vec![previous.id];
            }
            log.append(event);

            sift_append(&mut incremental, &log);
            let full = sift(&log);

            assert_eq!(
                fingerprint(&incremental),
                fingerprint(&full),
                "incremental and full sift disagree after {} event(s)",
                log.events.len(),
            );
        }
    }

    /// Several promises broken before any is answered: which pair is cited?
    ///
    /// The full scan and the incremental path must agree on that, not merely on
    /// whether something matched. They pick the candidate `first` in opposite
    /// directions, so a pattern with more than one qualifying first is exactly
    /// where they would silently disagree.
    #[test]
    fn the_two_paths_cite_the_same_pair_when_several_firsts_qualify() {
        let Some(first_act) = narrative_act_def("act.swear_an_oath") else {
            return;
        };
        let Some(second_act) = narrative_act_def("act.break_a_promise") else {
            return;
        };

        let mut log = NarrativeLog::default();
        let mut incremental = SiftResult::default();

        for step in 0..3 {
            let mut event = event_for(first_act, Some(VELL), step as f64 * GAME_DAY_SECONDS);
            event.secrecy = Secrecy::Public;
            log.append(event);
            sift_append(&mut incremental, &log);
        }
        let mut closing = event_for(second_act, Some(VELL), 5.0 * GAME_DAY_SECONDS);
        closing.secrecy = Secrecy::Public;
        log.append(closing);
        sift_append(&mut incremental, &log);

        let full = sift(&log);
        // Guard against a vacuous pass: two empty results agree about nothing.
        assert!(
            !full.matches.is_empty(),
            "this test only means something if the arc actually completes",
        );
        assert_eq!(
            fingerprint(&incremental),
            fingerprint(&full),
            "the two paths cite different events for the same arc",
        );
    }
}
