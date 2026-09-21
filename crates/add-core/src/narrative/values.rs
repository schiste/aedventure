//! What a person or group stands for: Schwartz's ten basic values on a circle.
//!
//! The single vocabulary for ideology and culture (§5B). Neighbours on the
//! circle are compatible and opposites conflict, and that structure is what
//! lets one act read as virtue to one group and betrayal to another without
//! either being scripted to disagree.
//!
//! A profile is ten relative priorities, not ten independent scores. Nobody
//! can value everything, so the trade-offs are built into the shape.

use serde::{Deserialize, Serialize};

/// The ten values, in circle order. Angles are data so the uneven real
/// spacing can be refined later without touching the maths.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Value {
    SelfDirection,
    Stimulation,
    Hedonism,
    Achievement,
    Power,
    Security,
    Conformity,
    Tradition,
    Benevolence,
    Universalism,
}

impl Value {
    pub const ALL: [Value; 10] = [
        Value::SelfDirection,
        Value::Stimulation,
        Value::Hedonism,
        Value::Achievement,
        Value::Power,
        Value::Security,
        Value::Conformity,
        Value::Tradition,
        Value::Benevolence,
        Value::Universalism,
    ];

    /// Position on the circle, in degrees.
    pub fn angle(self) -> f64 {
        match self {
            Value::SelfDirection => 0.0,
            Value::Stimulation => 36.0,
            Value::Hedonism => 72.0,
            Value::Achievement => 108.0,
            Value::Power => 144.0,
            Value::Security => 180.0,
            Value::Conformity => 216.0,
            Value::Tradition => 252.0,
            Value::Benevolence => 288.0,
            Value::Universalism => 324.0,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Value::SelfDirection => "self_direction",
            Value::Stimulation => "stimulation",
            Value::Hedonism => "hedonism",
            Value::Achievement => "achievement",
            Value::Power => "power",
            Value::Security => "security",
            Value::Conformity => "conformity",
            Value::Tradition => "tradition",
            Value::Benevolence => "benevolence",
            Value::Universalism => "universalism",
        }
    }

    pub fn from_str(value: &str) -> Option<Value> {
        Value::ALL.into_iter().find(|v| v.as_str() == value)
    }
}

/// Ten relative priorities, each -1 to 1. Centred on load so they sum to zero:
/// what drives behaviour is what someone ranks *above* what.
#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
pub struct Profile([f64; 10]);

impl Profile {
    pub fn from_pairs(pairs: &[(&str, f64)]) -> Profile {
        let mut raw = [0.0; 10];
        for (name, weight) in pairs {
            if let Some(value) = Value::from_str(name) {
                raw[value as usize] = *weight;
            }
        }
        Profile(raw).centred()
    }

    pub fn get(&self, value: Value) -> f64 {
        self.0[value as usize]
    }

    pub fn is_empty(&self) -> bool {
        self.0.iter().all(|weight| weight.abs() < f64::EPSILON)
    }

    /// Subtract the mean, so a profile is priorities rather than levels.
    fn centred(self) -> Profile {
        let mean = self.0.iter().sum::<f64>() / 10.0;
        let mut raw = self.0;
        for weight in raw.iter_mut() {
            *weight -= mean;
        }
        Profile(raw)
    }

    /// Correlation between two profiles, -1 to 1. This is *fit*: how much an
    /// individual's priorities match their group's. It replaces a hand-set
    /// loyalty number, because people whose values match their environment are
    /// more committed to it (Sagiv and Schwartz).
    pub fn fit(&self, other: &Profile) -> f64 {
        let dot: f64 = (0..10).map(|i| self.0[i] * other.0[i]).sum();
        let a: f64 = self.0.iter().map(|w| w * w).sum::<f64>().sqrt();
        let b: f64 = other.0.iter().map(|w| w * w).sum::<f64>().sqrt();
        if a < f64::EPSILON || b < f64::EPSILON {
            return 0.0;
        }
        (dot / (a * b)).clamp(-1.0, 1.0)
    }

    /// The value this profile ranks highest.
    pub fn strongest(&self) -> Option<Value> {
        Value::ALL
            .into_iter()
            .max_by(|a, b| self.get(*a).total_cmp(&self.get(*b)))
            .filter(|value| self.get(*value) > 0.0)
    }

    /// Tightness: how hard this group punishes norm violations. Derived from
    /// the conservation values (Gelfand et al.); groups under threat run tight.
    pub fn tightness(&self) -> f64 {
        let mean = (self.get(Value::Conformity)
            + self.get(Value::Tradition)
            + self.get(Value::Security))
            / 3.0;
        ((mean + 1.0) / 2.0).clamp(0.0, 1.0)
    }
}

/// How an observer reads an act, from -1 (against everything they stand for)
/// to +1 (exactly what they stand for).
///
/// `expresses` are the act's weights over the values it expresses, summing to
/// 1. A *violated* value counts as its opposite on the circle. The 1/5 factor
/// normalises the sum for a ten-value circle.
pub fn verdict(observer: &Profile, expresses: &[(Value, f64)]) -> f64 {
    if observer.is_empty() || expresses.is_empty() {
        return 0.0;
    }
    let mut total = 0.0;
    for (expressed, weight) in expresses {
        for value in Value::ALL {
            let delta = (value.angle() - expressed.angle()).to_radians();
            total += weight * observer.get(value) * delta.cos();
        }
    }
    (total / 5.0).clamp(-1.0, 1.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn universalist() -> Profile {
        Profile::from_pairs(&[
            ("universalism", 0.9),
            ("benevolence", 0.6),
            ("power", -0.8),
            ("security", -0.5),
        ])
    }

    fn security_first() -> Profile {
        Profile::from_pairs(&[
            ("security", 0.9),
            ("conformity", 0.6),
            ("tradition", 0.4),
            ("universalism", -0.7),
            ("self_direction", -0.6),
        ])
    }

    #[test]
    fn a_profile_is_centred_so_it_holds_priorities_not_levels() {
        let profile = Profile::from_pairs(&[("power", 1.0), ("security", 1.0)]);
        let sum: f64 = Value::ALL.into_iter().map(|v| profile.get(v)).sum();
        assert!(sum.abs() < 1e-9, "profile should sum to zero, got {sum}");
    }

    #[test]
    fn sharing_with_a_stranger_divides_the_two_groups() {
        // The specification's worked example: the same act, opposite readings.
        let act = [(Value::Universalism, 1.0)];
        let open = verdict(&universalist(), &act);
        let closed = verdict(&security_first(), &act);

        assert!(open > 0.2, "a universalist should approve: {open}");
        assert!(closed < -0.2, "a security-first group should not: {closed}");
        assert!(open > closed);
    }

    #[test]
    fn executing_a_deserter_reverses_that_split() {
        let act = [(Value::Security, 0.6), (Value::Power, 0.4)];
        let open = verdict(&universalist(), &act);
        let closed = verdict(&security_first(), &act);
        assert!(closed > 0.0, "the rules holding reads as good: {closed}");
        assert!(open < 0.0, "a universalist reads it as cruelty: {open}");
    }

    #[test]
    fn opposites_on_the_circle_disagree_most() {
        let power = Profile::from_pairs(&[("power", 1.0)]);
        let against_power = verdict(&power, &[(Value::Universalism, 1.0)]);
        let with_power = verdict(&power, &[(Value::Power, 1.0)]);
        assert!(with_power > 0.0 && against_power < 0.0);
        assert!(with_power > against_power.abs() - 0.2);
    }

    #[test]
    fn fit_is_high_within_a_group_and_low_across_the_circle() {
        assert!(universalist().fit(&universalist()) > 0.99);
        assert!(universalist().fit(&security_first()) < 0.0);
    }

    #[test]
    fn tightness_rises_with_the_conservation_values() {
        assert!(security_first().tightness() > universalist().tightness());
    }

    #[test]
    fn an_absent_profile_reads_every_act_as_neutral() {
        // A group with no authored values has no opinion, rather than a
        // confidently wrong one.
        assert_eq!(verdict(&Profile::default(), &[(Value::Power, 1.0)]), 0.0);
    }

    #[test]
    fn the_strongest_value_is_what_a_character_would_name() {
        assert_eq!(universalist().strongest(), Some(Value::Universalism));
    }
}
