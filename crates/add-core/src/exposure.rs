//! How long a character lasts in the wild.
//!
//! Exposure is one quantity on one scale: a character's *endurance*, the
//! seconds beyond the field they can stand before their protection is spent.
//! Endurance belongs to the kind of person, not to the Hero — the Hero is
//! authored at 24 game hours and an ordinary survivor at 4 — so the rule reads
//! the same for the day the crew stop being counts and become characters.
//!
//! Two one-time buffs bend the Hero's curve, and between them they replace
//! what used to be a second hardcoded clock:
//!
//! - while his immunity is **untested** he is short 18 hours, so his first
//!   walk runs on a 6-hour budget he believes is all he has;
//! - the first time that budget reaches zero the **proving restore** gives it
//!   back in full, and the reduction is gone with it. He is on 24 hours from
//!   then on, because he now knows what he is.
//!
//! Reaching zero with no restore left ends the run.

use serde::{Deserialize, Serialize};

/// Runtime seconds in one game hour.
///
/// The world clock advances one game minute per runtime second, so an hour of
/// game time is a minute of play — and a hex crossing, authored at 60 game
/// minutes, costs exactly one hour of endurance. Endurance is authored in
/// hours for that reason: the number reads as a distance across the map.
pub const GAME_HOUR_SECONDS: f64 = 60.0;

/// Steps larger than this are offline catch-up rather than play.
///
/// Real ticks pass it comfortably — a single hex crossing is 60 seconds — so a
/// step this coarse means the game was shut. See [`ABSENCE_CEILING_RATIO`].
pub const MAX_ACCRUAL_STEP_SECONDS: f64 = 180.0;

/// The most of a character's protection an absence may spend.
///
/// Time away still counts: leaving someone standing in the static and closing
/// the game should be something to come back to. But it must not be something
/// to come back *from* — dying for having shut the tab is a punishment for not
/// playing. So an absence can bring a character to the brink and leave them
/// there, and the step that kills is always one the player was present for.
pub const ABSENCE_CEILING_RATIO: f64 = 0.999;

/// Protection counts as spent when this little of the ratio remains.
///
/// The spent fraction is accumulated step by step rather than recomputed from a
/// seconds total, and a sum of fractions cannot land on 1.0 exactly: six
/// 60-second steps against a 360-second budget come to 0.9999999999999999.
/// Without the tolerance an authored six hours would quietly need a seventh
/// hour, and the designer's number would be a lie.
pub const SPENT_RATIO_EPSILON: f64 = 1e-9;

/// Is this spent fraction, at the precision the accumulator can offer, all of it?
pub fn is_spent(spent_ratio: f64) -> bool {
    spent_ratio >= 1.0 - SPENT_RATIO_EPSILON
}

/// Who is standing in the wild.
///
/// Only [`ExposureArchetype::Hero`] has an instance today, because he is the
/// only character the simulation models individually. The lookup exists so
/// that stops being a reason the rule is hero-shaped.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExposureArchetype {
    Hero,
    NormalHuman,
}

/// The authored endurance for one archetype, already resolved against that
/// character's buffs and perks.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ExposureProfile {
    /// Hours of protection before any modifier.
    pub base_game_hours: f64,
    /// Hours withheld while the character's immunity is untested. Zero for
    /// everyone who has no immunity to prove.
    pub untested_reduction_game_hours: f64,
    /// Multiplier from Sustain levels and perks. 1.0 is unmodified.
    pub endurance_multiplier: f64,
}

/// One character's exposure, saved.
///
/// The spent-seconds count itself is *not* here: it lives as a ratio on the
/// character (the Hero keeps it as `viral_load_ratio`) so that the debuff
/// tiers, the point of no return and the red haze all read one number. What
/// this holds is the part a ratio cannot express — which one-time buffs are
/// still in hand, and whether the run is over.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExposureState {
    /// One-time: the character is short [`ExposureProfile::untested_reduction_game_hours`]
    /// until their immunity has been proven by surviving exhaustion once.
    #[serde(default = "buff_in_hand")]
    pub untested_immunity: bool,
    /// One-time: the next exhaustion restores protection in full instead of
    /// killing. Spent at the same moment `untested_immunity` is.
    #[serde(default = "buff_in_hand")]
    pub proving_restore_available: bool,
    /// Protection reached zero with no restore left.
    #[serde(default)]
    pub fatal: bool,
}

/// serde default: an unspent one-time buff. Saves written before these fields
/// existed belong to runs that had not used either.
fn buff_in_hand() -> bool {
    true
}

impl ExposureState {
    pub fn new() -> Self {
        Self { untested_immunity: true, proving_restore_available: true, fatal: false }
    }

    /// Has this character already survived exhaustion once?
    pub fn immunity_proven(&self) -> bool {
        !self.untested_immunity
    }
}

impl Default for ExposureState {
    fn default() -> Self {
        Self::new()
    }
}

/// What happened when protection reached zero.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Exhaustion {
    /// The restore fired: protection is full again and the immunity is proven.
    /// The caller resets the character's spent ratio to zero.
    Survived,
    /// Nothing left to spend.
    Fatal,
}

/// Seconds of protection this character has, with their buffs applied.
pub fn endurance_seconds(profile: ExposureProfile, state: &ExposureState) -> f64 {
    let mut hours = profile.base_game_hours;
    if state.untested_immunity {
        hours -= profile.untested_reduction_game_hours;
    }
    // A reduction authored larger than the base would otherwise divide by zero
    // at every call site that turns seconds into a ratio.
    (hours.max(0.0) * GAME_HOUR_SECONDS * profile.endurance_multiplier).max(f64::EPSILON)
}

/// Resolve protection reaching zero, spending the one-time buffs.
///
/// Both are spent together: surviving the first exhaustion is precisely what
/// proves the immunity, so there is no state in which the restore is gone but
/// the reduction remains.
pub fn exhaust(state: &mut ExposureState) -> Exhaustion {
    if state.proving_restore_available {
        state.proving_restore_available = false;
        state.untested_immunity = false;
        Exhaustion::Survived
    } else {
        state.fatal = true;
        Exhaustion::Fatal
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hero_profile() -> ExposureProfile {
        ExposureProfile {
            base_game_hours: 24.0,
            untested_reduction_game_hours: 18.0,
            endurance_multiplier: 1.0,
        }
    }

    #[test]
    fn untested_hero_runs_on_six_hours() {
        let state = ExposureState::new();
        assert_eq!(endurance_seconds(hero_profile(), &state), 6.0 * 60.0);
    }

    #[test]
    fn proving_the_immunity_unlocks_the_full_budget() {
        let mut state = ExposureState::new();
        assert_eq!(exhaust(&mut state), Exhaustion::Survived);
        assert!(state.immunity_proven(), "surviving it proves the immunity");
        assert_eq!(endurance_seconds(hero_profile(), &state), 24.0 * 60.0);
    }

    #[test]
    fn the_second_exhaustion_is_fatal() {
        let mut state = ExposureState::new();
        exhaust(&mut state);
        assert_eq!(exhaust(&mut state), Exhaustion::Fatal);
        assert!(state.fatal);
    }

    #[test]
    fn an_ordinary_survivor_has_no_buff_to_spend() {
        let profile = ExposureProfile {
            base_game_hours: 4.0,
            untested_reduction_game_hours: 0.0,
            endurance_multiplier: 1.0,
        };
        // No immunity to prove: the reduction is zero, so the budget is the
        // authored one whether or not the flag happens to be set.
        let mut state = ExposureState::new();
        assert_eq!(endurance_seconds(profile, &state), 4.0 * 60.0);
        exhaust(&mut state);
        assert_eq!(endurance_seconds(profile, &state), 4.0 * 60.0);
    }

    #[test]
    fn sustain_stretches_the_budget() {
        let mut profile = hero_profile();
        profile.endurance_multiplier = 1.5;
        let state = ExposureState::new();
        assert_eq!(endurance_seconds(profile, &state), 9.0 * 60.0);
    }

    #[test]
    fn an_exact_number_of_steps_spends_the_whole_budget() {
        // The drift this tolerance exists for: stepping a 6-hour budget in
        // 60-second crossings should finish it on the sixth, not the seventh.
        let endurance = endurance_seconds(hero_profile(), &ExposureState::new());
        let mut spent = 0.0;
        for _ in 0..6 {
            spent += 60.0 / endurance;
        }
        assert!(spent < 1.0, "the sum really does fall short of one");
        assert!(is_spent(spent), "and has to count as spent anyway");
    }

    #[test]
    fn a_budget_with_time_left_is_not_spent() {
        assert!(!is_spent(0.999));
    }

    #[test]
    fn a_reduction_past_the_base_still_yields_a_usable_scale() {
        let profile = ExposureProfile {
            base_game_hours: 4.0,
            untested_reduction_game_hours: 18.0,
            endurance_multiplier: 1.0,
        };
        let endurance = endurance_seconds(profile, &ExposureState::new());
        assert!(endurance > 0.0, "a zero scale would divide by zero downstream");
    }
}
