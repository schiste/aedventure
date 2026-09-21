//! Casting storylets: finding the people a scene should be about.
//!
//! §8 of the specification. A storylet is a knot written for roles; the caster
//! solves those roles against the world and picks the most salient candidate.
//! One knot therefore fires for any pair that fits, which is what turns a
//! small amount of authored prose into scenes about the specific people the
//! player has history with.
//!
//! A hub never stalls: if nothing qualifies, the caster returns the fallback,
//! so the story always has somewhere to go.

use serde::{Deserialize, Serialize};

use super::log::NarrativeLog;
use super::sift::SiftResult;
use super::standing::{Axis, Band, GAME_DAY_SECONDS};
use crate::game_data::{StoryletDef, storylets};

/// The knot a hub falls back to when nothing qualifies. Guarantees the story
/// always has somewhere to go.
pub const FALLBACK_KNOT: &str = "sl_quiet_hour";

/// A storylet with its roles filled.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Casting {
    pub storylet_id: String,
    pub knot: String,
    /// Entities filling each role, in the knot's parameter order.
    pub roles: Vec<String>,
    pub salience: i64,
}

/// Which storylets have been cast, and when, so cooldowns hold across saves.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CastHistory {
    /// Storylet id and the tick it last fired.
    pub last_cast: Vec<(String, f64)>,
}

impl CastHistory {
    fn last_tick(&self, storylet_id: &str) -> Option<f64> {
        self.last_cast
            .iter()
            .find(|(id, _)| id == storylet_id)
            .map(|(_, tick)| *tick)
    }

    pub fn record(&mut self, storylet_id: &str, tick: f64) {
        if let Some(entry) = self.last_cast.iter_mut().find(|(id, _)| id == storylet_id) {
            entry.1 = tick;
        } else {
            self.last_cast.push((storylet_id.to_string(), tick));
        }
    }
}

fn band_from_str(value: &str) -> Band {
    match value {
        "very_low" => Band::VeryLow,
        "low" => Band::Low,
        "high" => Band::High,
        "very_high" => Band::VeryHigh,
        _ => Band::Mid,
    }
}

/// Does this entity satisfy one role?
fn fits(log: &NarrativeLog, entity_id: &str, axis: &str, at_least: &str, at_most: &str, now: f64) -> bool {
    if axis.is_empty() {
        return true;
    }
    let Some(axis) = Axis::from_str(axis) else {
        return false;
    };
    let band = log.band(entity_id, axis, now);
    band >= band_from_str(at_least) && band <= band_from_str(at_most)
}

/// How interesting a candidate is for one role: the weight of shared history.
///
/// Without this the solver returns the first entity that fits, and since the
/// candidate list and its order never change, every scene is about the same two
/// people — a 400-run fuzz campaign produced exactly one distinct cast. Ranking
/// by history is what makes one knot into many scenes, because the ranking moves
/// as the player builds standing with different people.
///
/// For a constrained role the axis itself is the measure. For an unconstrained
/// role, the strongest feeling in any direction stands in for "we have history".
fn candidate_salience(log: &NarrativeLog, entity_id: &str, axis: &str, now: f64) -> i64 {
    let magnitude = match Axis::from_str(axis) {
        Some(axis) => log.standing(entity_id, axis, now).abs(),
        None => Axis::ALL
            .into_iter()
            .map(|axis| log.standing(entity_id, axis, now).abs())
            .fold(0.0_f64, f64::max),
    };
    // Rounded to a whole point: sub-point differences are noise, and an
    // integer keeps the ordering exactly reproducible across platforms.
    magnitude.round() as i64
}

/// Solve one storylet's roles against the entities available.
///
/// Roles are solved in declaration order with backtracking, and no entity
/// fills two roles — a scene about one person talking to themselves is not a
/// scene. The candidate list comes from the caller, which in the engine is
/// whoever is present, so the solver never scans the whole population.
///
/// Within a role, candidates are tried most-history-first, so the cast follows
/// the player's actual relationships rather than the order of the catalog.
fn solve(
    log: &NarrativeLog,
    storylet: &StoryletDef,
    available: &[&str],
    now: f64,
) -> Option<Vec<String>> {
    fn recurse<'a>(
        log: &NarrativeLog,
        storylet: &StoryletDef,
        ranked_per_role: &[Vec<&'a str>],
        now: f64,
        index: usize,
        chosen: &mut Vec<String>,
    ) -> bool {
        if index == storylet.roles.len() {
            return true;
        }
        let role = &storylet.roles[index];
        let ranked = &ranked_per_role[index];
        for candidate in ranked {
            if chosen.iter().any(|taken| taken == *candidate) {
                continue;
            }
            if !fits(log, candidate, role.axis, role.at_least, role.at_most, now) {
                continue;
            }
            chosen.push((*candidate).to_string());
            if recurse(log, storylet, ranked_per_role, now, index + 1, chosen) {
                return true;
            }
            chosen.pop();
        }
        false
    }

    // Rank each role's candidates once, before the search.
    //
    // A candidate's salience depends only on the role's axis and the log, so it
    // is constant for the whole solve. Computing it inside a sort comparator
    // re-ran it twice per comparison, and re-sorting at every backtracking step
    // multiplied that again — each call being up to eleven full scans of the
    // event log. Hoisting it out is what takes storylet selection from seconds
    // to microseconds; the ordering it produces is identical.
    let ranked_per_role: Vec<Vec<&str>> = storylet
        .roles
        .iter()
        .map(|role| {
            let mut scored: Vec<(i64, &str)> = available
                .iter()
                .map(|candidate| (candidate_salience(log, candidate, role.axis, now), *candidate))
                .collect();
            // Most history first, id as the tie-break so casting stays deterministic.
            scored.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(b.1)));
            scored.into_iter().map(|(_, candidate)| candidate).collect()
        })
        .collect();

    let mut chosen = Vec::new();
    recurse(log, storylet, &ranked_per_role, now, 0, &mut chosen).then_some(chosen)
}

/// Pick the most salient storylet that can be cast right now.
///
/// More specific storylets outrank generic ones by carrying a higher
/// `base_salience`, so a player who did something unusual gets the bespoke
/// scene and everyone else still gets a scene.
pub fn cast(
    log: &NarrativeLog,
    arcs: &SiftResult,
    history: &CastHistory,
    available: &[&str],
    now: f64,
) -> Casting {
    let mut best: Option<Casting> = None;

    for storylet in storylets() {
        if let Some(last) = history.last_tick(storylet.id) {
            if now - last < storylet.cooldown_days * GAME_DAY_SECONDS {
                continue;
            }
        }
        let Some(roles) = solve(log, storylet, available, now) else {
            continue;
        };
        let mut salience = storylet.base_salience;
        if !storylet.trigger_arc.is_empty() && arcs.matched(storylet.trigger_arc) {
            salience += 50;
        }
        // Ties break on id, so casting is deterministic.
        let better = match &best {
            None => true,
            Some(current) => {
                salience > current.salience
                    || (salience == current.salience && storylet.id < current.storylet_id.as_str())
            }
        };
        if better {
            best = Some(Casting {
                storylet_id: storylet.id.to_string(),
                knot: storylet.knot.to_string(),
                roles,
                salience,
            });
        }
    }

    best.unwrap_or_else(|| Casting {
        storylet_id: "storylet.fallback".to_string(),
        knot: FALLBACK_KNOT.to_string(),
        roles: Vec::new(),
        salience: 0,
    })
}

/// Everyone who could appear in a scene: the named individuals.
pub fn castable_entities() -> Vec<&'static str> {
    crate::game_data::narrative_entities()
        .iter()
        .filter(|entity| entity.kind == super::graph::GroupKind::Individual)
        .map(|entity| entity.id)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::narrative::{Secrecy, event_for, sift};
    use crate::game_data::narrative_act_def;

    fn empty() -> (NarrativeLog, SiftResult, CastHistory) {
        (NarrativeLog::default(), SiftResult::default(), CastHistory::default())
    }

    fn wrong(log: &mut NarrativeLog, target: &str) {
        let act = narrative_act_def("act.break_a_promise").expect("act");
        for _ in 0..3 {
            let mut event = event_for(act, Some(target), 0.0);
            event.secrecy = Secrecy::Public;
            log.append(event);
        }
    }

    #[test]
    fn a_hub_never_stalls() {
        // Nothing qualifies and nobody is present: the story still goes on.
        let (log, arcs, history) = empty();
        let casting = cast(&log, &arcs, &history, &[], 0.0);
        assert_eq!(casting.knot, FALLBACK_KNOT);
    }

    #[test]
    fn the_generic_storylet_casts_two_different_people() {
        let (log, arcs, history) = empty();
        let available = castable_entities();
        let casting = cast(&log, &arcs, &history, &available, 0.0);
        assert_eq!(casting.storylet_id, "storylet.two_survivors_talk");
        assert_eq!(casting.roles.len(), 2);
        assert_ne!(casting.roles[0], casting.roles[1], "nobody talks to themselves");
    }

    #[test]
    fn a_specific_storylet_outranks_the_generic_one_when_it_can_be_cast() {
        // The whole point of salience: a player who actually wronged someone
        // gets the bespoke scene.
        let (mut log, _, history) = empty();
        wrong(&mut log, "entity.vell");
        let arcs = sift(&log);
        let available = castable_entities();

        let casting = cast(&log, &arcs, &history, &available, 0.0);
        assert_eq!(casting.storylet_id, "storylet.wronged_and_witness");
        assert_eq!(casting.roles[0], "entity.vell", "the wronged party leads");
    }

    #[test]
    fn a_storylet_on_cooldown_is_skipped() {
        let (mut log, _, mut history) = empty();
        wrong(&mut log, "entity.vell");
        let arcs = sift(&log);
        let available = castable_entities();

        history.record("storylet.wronged_and_witness", 0.0);
        let casting = cast(&log, &arcs, &history, &available, GAME_DAY_SECONDS);
        assert_eq!(
            casting.storylet_id, "storylet.two_survivors_talk",
            "the generic scene should cover while the specific one cools down",
        );
    }

    #[test]
    fn casting_is_deterministic() {
        let (log, arcs, history) = empty();
        let available = castable_entities();
        let first = cast(&log, &arcs, &history, &available, 0.0);
        let second = cast(&log, &arcs, &history, &available, 0.0);
        assert_eq!(first, second);
    }

    #[test]
    fn the_cast_changes_with_who_is_present() {
        // The multiplier: one knot, a different scene per pairing.
        let (log, arcs, history) = empty();
        let all = castable_entities();
        let a = cast(&log, &arcs, &history, &all[..2], 0.0);
        let b = cast(&log, &arcs, &history, &all[2..], 0.0);
        assert_ne!(a.roles, b.roles);
    }

    #[test]
    fn a_role_with_no_qualifying_entity_refuses_to_cast() {
        // wronged_and_witness needs someone actually aggrieved.
        let (log, arcs, history) = empty();
        let available = castable_entities();
        let casting = cast(&log, &arcs, &history, &available, 0.0);
        assert_ne!(casting.storylet_id, "storylet.wronged_and_witness");
    }
}
