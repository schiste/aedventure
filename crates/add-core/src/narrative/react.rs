//! Authored reaction chains: what characters do about what happened.
//!
//! §7 of the specification. A reaction says: when this happens, and these
//! conditions hold, this character does that, after this delay. The act it
//! emits is a normal event, so it can spread as rumour, match a sifting
//! pattern and trigger further reactions.
//!
//! Characters never act from free-running simulation. Every NPC act traces
//! back through an authored rule to something that happened, which is what
//! keeps the world deterministic and explainable.

use serde::{Deserialize, Serialize};

use super::log::{NarrativeLog, event_for};
use super::standing::GAME_DAY_SECONDS;
use crate::game_data::{ReactionDef, narrative_act_def, reactions};

/// The longest chain of reaction-triggered reactions. A cascade past this is a
/// content bug, not a story; the limit makes it visible instead of hanging.
pub const MAX_CHAIN_DEPTH: u8 = 8;

/// One reaction that fired.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FiredReaction {
    pub reaction_id: String,
    /// The event that triggered it, which becomes the emitted act's cause.
    pub because_of: u64,
    /// The event it produced.
    pub emitted: u64,
    pub depth: u8,
}

/// Has this reaction already fired for this trigger?
fn already_fired(log: &NarrativeLog, reaction: &ReactionDef, trigger_id: u64) -> bool {
    log.fired_reactions
        .iter()
        .any(|fired| fired.reaction_id == reaction.id && fired.because_of == trigger_id)
}

/// Is the reaction still cooling down for this actor?
fn cooling_down(log: &NarrativeLog, reaction: &ReactionDef, now_tick: f64) -> bool {
    log.fired_reactions
        .iter()
        .filter(|fired| fired.reaction_id == reaction.id)
        .any(|fired| {
            log.events
                .iter()
                .find(|event| event.id == fired.emitted)
                .is_some_and(|event| {
                    (now_tick - event.tick) < reaction.cooldown_days * GAME_DAY_SECONDS
                })
        })
}

/// Run every reaction whose trigger has happened, whose delay has elapsed, and
/// whose actor knows about it. Called from the tick path after rumour, so a
/// character reacts when they *hear*, not when it happened.
pub fn run(log: &mut NarrativeLog, now_tick: f64) -> Vec<FiredReaction> {
    let mut fired_now = Vec::new();

    for depth in 0..MAX_CHAIN_DEPTH {
        let mut pending: Vec<(String, u64, String, String, u8)> = Vec::new();

        for reaction in reactions() {
            for event in &log.events {
                if event.act_id != reaction.when_act {
                    continue;
                }
                if already_fired(log, reaction, event.id) {
                    continue;
                }
                // The actor reacts when they know. Rumour timing therefore
                // drives the chain, which is the whole point of §7.
                if !log.knowledge.knows(reaction.actor, event.id) {
                    continue;
                }
                if now_tick - event.tick < reaction.after_days * GAME_DAY_SECONDS {
                    continue;
                }
                if cooling_down(log, reaction, now_tick) {
                    continue;
                }
                pending.push((
                    reaction.id.to_string(),
                    event.id,
                    reaction.emit_act.to_string(),
                    reaction.emit_target.to_string(),
                    depth,
                ));
            }
        }

        if pending.is_empty() {
            break;
        }

        for (reaction_id, trigger_id, act_id, target, depth) in pending {
            let Some(act) = narrative_act_def(&act_id) else {
                continue;
            };
            let mut event = event_for(act, Some(target.as_str()), now_tick);
            // Causality is automatic: the trigger becomes the cause, so
            // `narr explain` can walk a whole chain back to the Hero's act.
            event.causes = vec![trigger_id];
            let emitted = log.append(event);
            let fired = FiredReaction { reaction_id, because_of: trigger_id, emitted, depth };
            log.fired_reactions.push(fired.clone());
            fired_now.push(fired);
        }
    }

    fired_now
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::narrative::{Knowledge, Secrecy};

    const VELL: &str = "entity.vell";

    fn log_with_betrayal(tick: f64) -> NarrativeLog {
        let mut log = NarrativeLog::default();
        let act = narrative_act_def("act.break_a_promise").expect("act");
        let mut event = event_for(act, Some(VELL), tick);
        event.secrecy = Secrecy::Public;
        log.append(event);
        log
    }

    #[test]
    fn a_reaction_fires_once_its_delay_has_passed() {
        let mut log = log_with_betrayal(0.0);
        assert!(run(&mut log, 0.0).is_empty(), "nothing should fire immediately");

        let fired = run(&mut log, 5.0 * GAME_DAY_SECONDS);
        assert_eq!(fired.len(), 1, "the denunciation should fire after its delay");
        assert_eq!(fired[0].reaction_id, "reaction.vell_denounces_a_broken_promise");
    }

    #[test]
    fn the_emitted_act_names_its_trigger_as_a_cause() {
        // What lets narr explain walk a chain back to the Hero's own act.
        let mut log = log_with_betrayal(0.0);
        let fired = run(&mut log, 5.0 * GAME_DAY_SECONDS);
        let emitted = log
            .events
            .iter()
            .find(|event| event.id == fired[0].emitted)
            .expect("emitted event");
        assert_eq!(emitted.causes, vec![fired[0].because_of]);
    }

    #[test]
    fn a_reaction_fires_at_most_once_per_trigger() {
        let mut log = log_with_betrayal(0.0);
        run(&mut log, 5.0 * GAME_DAY_SECONDS);
        let before = log.events.len();
        run(&mut log, 6.0 * GAME_DAY_SECONDS);
        run(&mut log, 7.0 * GAME_DAY_SECONDS);
        assert_eq!(log.events.len(), before, "it should not fire again");
    }

    #[test]
    fn an_actor_who_has_not_heard_does_not_react() {
        // Rumour timing drives the chain: a secret triggers nothing.
        let mut log = NarrativeLog::default();
        let act = narrative_act_def("act.break_a_promise").expect("act");
        let mut event = event_for(act, Some(VELL), 0.0);
        event.secrecy = Secrecy::Secret;
        log.append(event);

        assert!(run(&mut log, 100.0 * GAME_DAY_SECONDS).is_empty());

        // Once told, the same rule fires.
        log.knowledge.learn(VELL, 0, Knowledge::first_hand(0.0));
        assert_eq!(run(&mut log, 100.0 * GAME_DAY_SECONDS).len(), 1);
    }

    #[test]
    fn a_chain_cannot_run_away() {
        // Bounded by construction: whatever the content says, one pass emits
        // at most MAX_CHAIN_DEPTH rounds.
        let mut log = log_with_betrayal(0.0);
        let fired = run(&mut log, 400.0 * GAME_DAY_SECONDS);
        assert!(
            fired.iter().all(|f| f.depth < MAX_CHAIN_DEPTH),
            "no reaction should report a depth past the limit",
        );
        assert!(fired.len() <= MAX_CHAIN_DEPTH as usize * reactions().len());
    }

    #[test]
    fn running_twice_at_the_same_tick_changes_nothing() {
        let mut log = log_with_betrayal(0.0);
        run(&mut log, 5.0 * GAME_DAY_SECONDS);
        let snapshot = log.clone();
        run(&mut log, 5.0 * GAME_DAY_SECONDS);
        assert_eq!(log, snapshot, "reactions must be idempotent per tick");
    }
}
