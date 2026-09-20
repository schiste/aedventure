//! Standing: how an entity regards the Hero.
//!
//! The engine vocabulary for §5 and §5A of the specification. Axes, tiers and
//! the impact pipeline are *rules*, so they live here; which entities exist and
//! what each act does are *content*, authored in `packages/add-content` and
//! code-generated into `game_data`.
//!
//! Scores are never stored. They are folded from the event log on read, which
//! is the specification's principle 2: nothing is kept that the log cannot
//! rebuild. That is also what lets a tuning change take effect on an existing
//! save — the same log simply folds to different numbers.

use serde::{Deserialize, Serialize};

/// The eleven raw axes, in the specification's three layers.
///
/// Trust, respect, fear and threat are deliberately absent: the research
/// treats them as outcomes of these, so they are derived (see [`Derived`]).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Axis {
    // Character
    Affection,
    Goodwill,
    Integrity,
    Competence,
    Dominance,
    // Bond
    Closeness,
    Dependence,
    Debt,
    Grievance,
    // Identity
    Belonging,
    Alignment,
}

impl Axis {
    pub const ALL: [Axis; 11] = [
        Axis::Affection,
        Axis::Goodwill,
        Axis::Integrity,
        Axis::Competence,
        Axis::Dominance,
        Axis::Closeness,
        Axis::Dependence,
        Axis::Debt,
        Axis::Grievance,
        Axis::Belonging,
        Axis::Alignment,
    ];

    pub fn as_str(self) -> &'static str {
        match self {
            Axis::Affection => "affection",
            Axis::Goodwill => "goodwill",
            Axis::Integrity => "integrity",
            Axis::Competence => "competence",
            Axis::Dominance => "dominance",
            Axis::Closeness => "closeness",
            Axis::Dependence => "dependence",
            Axis::Debt => "debt",
            Axis::Grievance => "grievance",
            Axis::Belonging => "belonging",
            Axis::Alignment => "alignment",
        }
    }

    pub fn from_str(value: &str) -> Option<Axis> {
        Axis::ALL.into_iter().find(|axis| axis.as_str() == value)
    }

    /// Ledger axes settle through acts rather than fading. They never decay.
    pub fn is_ledger(self) -> bool {
        matches!(self, Axis::Debt | Axis::Grievance)
    }

    /// Negative impacts weigh more than positive ones, per axis. Bad is
    /// stronger than good (Baumeister et al.); trust is slow to build and
    /// quick to destroy (Slovic). Competence inverts: able acts are more
    /// diagnostic than failures (Skowronski and Carlston).
    pub fn negativity(self) -> f64 {
        match self {
            Axis::Integrity => 2.5,
            Axis::Goodwill => 2.0,
            Axis::Affection | Axis::Belonging | Axis::Alignment => 1.5,
            _ => 1.0,
        }
    }

    pub fn positivity(self) -> f64 {
        match self {
            Axis::Competence => 1.5,
            _ => 1.0,
        }
    }
}

/// Magnitude tiers. Geometric, because perceived intensity grows with ratios
/// rather than differences (Weber-Fechner; Stevens). One point is one percent
/// of an axis's half-range.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Tier {
    Trivial,
    Minor,
    Moderate,
    Major,
    Severe,
    Defining,
}

impl Tier {
    pub fn base(self) -> f64 {
        match self {
            Tier::Trivial => 1.0,
            Tier::Minor => 3.0,
            Tier::Moderate => 6.0,
            Tier::Major => 12.0,
            Tier::Severe => 25.0,
            Tier::Defining => 50.0,
        }
    }

    pub fn from_str(value: &str) -> Option<Tier> {
        Some(match value {
            "trivial" => Tier::Trivial,
            "minor" => Tier::Minor,
            "moderate" => Tier::Moderate,
            "major" => Tier::Major,
            "severe" => Tier::Severe,
            "defining" => Tier::Defining,
            _ => return None,
        })
    }
}

/// How deliberate an act was. People judge intent before outcome (Heider;
/// Malle).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Intent {
    Deliberate,
    Cruel,
    Reckless,
    Coerced,
    Accidental,
}

impl Intent {
    pub fn factor(self) -> f64 {
        match self {
            Intent::Deliberate => 1.0,
            Intent::Cruel => 1.3,
            Intent::Reckless => 0.6,
            Intent::Coerced => 0.3,
            Intent::Accidental => 0.25,
        }
    }

    pub fn from_str(value: &str) -> Option<Intent> {
        Some(match value {
            "deliberate" => Intent::Deliberate,
            "cruel" => Intent::Cruel,
            "reckless" => Intent::Reckless,
            "coerced" => Intent::Coerced,
            "accidental" => Intent::Accidental,
            _ => return None,
        })
    }
}

/// Named bands. Ink and content gate on these, never on raw numbers, so
/// rebalancing never touches authored gates.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Band {
    VeryLow,
    Low,
    Mid,
    High,
    VeryHigh,
}

impl Band {
    /// Lower edges from the tuning table. A score of 30 is `high`.
    pub fn of(score: f64) -> Band {
        match score {
            s if s >= 60.0 => Band::VeryHigh,
            s if s >= 25.0 => Band::High,
            s if s >= -10.0 => Band::Mid,
            s if s >= -40.0 => Band::Low,
            _ => Band::VeryLow,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Band::VeryLow => "very_low",
            Band::Low => "low",
            Band::Mid => "mid",
            Band::High => "high",
            Band::VeryHigh => "very_high",
        }
    }
}

/// Constructs computed from the raw axes at read time. These are what content
/// usually gates on.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Derived {
    Trust,
    Respect,
    Fear,
    Threat,
    LoyaltyToHero,
}

impl Derived {
    pub fn from_str(value: &str) -> Option<Derived> {
        Some(match value {
            "trust" => Derived::Trust,
            "respect" => Derived::Respect,
            "fear" => Derived::Fear,
            "threat" => Derived::Threat,
            "loyalty_to_hero" => Derived::LoyaltyToHero,
            _ => return None,
        })
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Derived::Trust => "trust",
            Derived::Respect => "respect",
            Derived::Fear => "fear",
            Derived::Threat => "threat",
            Derived::LoyaltyToHero => "loyalty_to_hero",
        }
    }
}

fn pos(value: f64) -> f64 {
    value.max(0.0)
}

/// Compute a derived construct from an entity's raw axis scores.
pub fn derive(kind: Derived, axis: &dyn Fn(Axis) -> f64) -> f64 {
    let c = axis(Axis::Competence);
    let g = axis(Axis::Goodwill);
    let i = axis(Axis::Integrity);
    let a = axis(Axis::Affection);
    let d = axis(Axis::Dominance);
    let b = axis(Axis::Belonging);
    let al = axis(Axis::Alignment);

    match kind {
        // The weakest-link rule: a liar who is able and friendly still cannot
        // be trusted (Mayer, Davis and Schoorman).
        Derived::Trust => {
            let weakest = c.min(g).min(i);
            let mean = (c + g + i) / 3.0;
            0.5 * weakest + 0.5 * mean
        }
        Derived::Respect => 0.6 * c + 0.4 * i,
        Derived::Fear => pos(d) * (1.0 - pos(g) / 100.0),
        Derived::Threat => {
            pos(d) * (1.0 - pos((g + b) / 2.0) / 100.0) + 0.5 * pos(-al)
        }
        Derived::LoyaltyToHero => {
            0.3 * b + 0.25 * g + 0.15 * axis(Axis::Debt) + 0.15 * axis(Axis::Dependence)
                + 0.15 * a
                - 0.5 * pos(axis(Axis::Grievance))
        }
    }
}

/// Fold one impact into a running score.
///
/// Saturation makes the last stretch hard: going from 0 to 25 costs what the
/// tiers say, 80 to 95 costs about three times as much. Falling is never
/// damped — a devoted ally can be lost at full speed.
pub fn fold(score: f64, delta: f64) -> f64 {
    let toward_extreme = (score >= 0.0 && delta > 0.0) || (score <= 0.0 && delta < 0.0);
    let headroom = if toward_extreme {
        1.0 - (score.abs() / 100.0).powi(2)
    } else {
        1.0
    };
    (score + delta * headroom).clamp(-100.0, 100.0)
}

/// Clamp on the product of every modifier, so no stack of them can turn a
/// slight into a catastrophe or erase a betrayal.
pub const MODIFIER_CLAMP: (f64, f64) = (0.1, 4.0);

pub fn clamp_modifiers(product: f64) -> f64 {
    product.clamp(MODIFIER_CLAMP.0, MODIFIER_CLAMP.1)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bands_use_the_tuning_edges() {
        assert_eq!(Band::of(30.0), Band::High);
        assert_eq!(Band::of(25.0), Band::High);
        assert_eq!(Band::of(24.9), Band::Mid);
        assert_eq!(Band::of(-40.0), Band::Low);
        assert_eq!(Band::of(-40.1), Band::VeryLow);
        assert_eq!(Band::of(60.0), Band::VeryHigh);
    }

    #[test]
    fn trust_is_dragged_down_by_its_weakest_component() {
        // The worked example from the specification: an able, friendly liar.
        let scores = |axis: Axis| match axis {
            Axis::Competence => 10.0,
            Axis::Goodwill => 45.0,
            Axis::Integrity => 20.0,
            _ => 0.0,
        };
        let before = derive(Derived::Trust, &scores);
        assert!((before - 17.5).abs() < 0.01, "trust was {before}");

        // One broken promise takes integrity to -14.5 and trust to about zero,
        // while goodwill is untouched: the conflicted state the axes exist for.
        let after_scores = |axis: Axis| match axis {
            Axis::Competence => 10.0,
            Axis::Goodwill => 45.0,
            Axis::Integrity => -14.5,
            _ => 0.0,
        };
        let after = derive(Derived::Trust, &after_scores);
        assert!(after.abs() < 1.0, "trust after the broken promise was {after}");
    }

    #[test]
    fn negativity_weights_integrity_hardest() {
        assert_eq!(Axis::Integrity.negativity(), 2.5);
        assert_eq!(Axis::Goodwill.negativity(), 2.0);
        assert_eq!(Axis::Competence.negativity(), 1.0);
        assert_eq!(Axis::Competence.positivity(), 1.5);
    }

    #[test]
    fn saturation_makes_the_last_stretch_hard_but_never_the_fall() {
        let low = fold(0.0, 25.0);
        let high = fold(80.0, 25.0) - 80.0;
        assert!(high < low / 2.0, "climbing from 80 should cost far more: {high} vs {low}");

        // Falling is undamped: the same magnitude lands in full.
        assert!((fold(80.0, -25.0) - 55.0).abs() < 1e-9);
    }

    #[test]
    fn a_good_to_bad_ratio_of_five_to_one_holds_on_integrity() {
        // One Moderate lie should cancel five Minor honest dealings (Gottman).
        let lie = Tier::Moderate.base() * Axis::Integrity.negativity();
        let honest = Tier::Minor.base() * 5.0;
        assert!((lie - honest).abs() < 1e-9, "{lie} vs {honest}");
    }

    #[test]
    fn ledger_axes_are_marked_and_the_rest_are_not() {
        assert!(Axis::Debt.is_ledger());
        assert!(Axis::Grievance.is_ledger());
        assert!(!Axis::Goodwill.is_ledger());
    }

    #[test]
    fn every_axis_round_trips_through_its_name() {
        for axis in Axis::ALL {
            assert_eq!(Axis::from_str(axis.as_str()), Some(axis));
        }
    }
}
