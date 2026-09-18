//! Dev-time live tuning: apply a single balance override (a dotted camelCase
//! path → value) onto a mutable [`BalanceSnapshot`] copy. The simulation keeps
//! a small override map and recomputes its effective balance from these, so a
//! designer can change a rate in the running sim with no rebuild.
//!
//! Paths use the same camelCase names as `balance.ts` / the catalog snapshot
//! (e.g. `combat.baseAttack`), so the dev dashboard can read current values
//! from the catalog and write them back here. Unknown paths are ignored
//! (returns `false`), so a stale override never corrupts balance.

use crate::game_data::BalanceSnapshot;

/// Apply `value` to the field named by `path`. Returns whether the path matched.
pub fn apply_balance_override(balance: &mut BalanceSnapshot, path: &str, value: f64) -> bool {
    match path {
        // Combat
        "combat.baseAttack" => balance.combat.base_attack = value,
        "combat.attackPerLevel" => balance.combat.attack_per_level = value,
        "combat.baseHp" => balance.combat.base_hp = value,
        "combat.hpPerLevel" => balance.combat.hp_per_level = value,
        "combat.roundSeconds" => balance.combat.round_seconds = value,
        "combat.damageVariance" => balance.combat.damage_variance = value,
        "combat.woundUnitsPerHpLost" => balance.combat.wound_units_per_hp_lost = value,

        // Progression
        "progression.xp0" => balance.progression.xp0 = value,
        "progression.xpGrowth" => balance.progression.xp_growth = value,
        "progression.levelMultiplierA" => balance.progression.level_multiplier_a = value,
        "progression.xpPerLocationClear" => balance.progression.xp_per_location_clear = value,
        "progression.xpPerExpedition" => balance.progression.xp_per_expedition = value,
        "progression.xpPerStoryBeat" => balance.progression.xp_per_story_beat = value,

        // Crystal economy
        "crystal.outputPerWorkerBase" => balance.crystal.output_per_worker_base = value,
        "crystal.outputPerWorkerLevelBonus" => {
            balance.crystal.output_per_worker_level_bonus = value
        }
        "crystal.baseBasslineCap" => balance.crystal.base_bassline_cap = value,

        // Bubble
        "bubble.holdSeconds" => balance.bubble.hold_seconds = value,
        "bubble.degradeSecondsPerRing" => balance.bubble.degrade_seconds_per_ring = value,
        "bubble.fieldKBase" => balance.bubble.field_k_base = value,

        // Survival
        "survival.heroTimeSeconds0To1" => balance.survival.hero_time_seconds_0_to_1 = value,
        "survival.recoveryTimeSeconds1To0" => balance.survival.recovery_time_seconds_1_to_0 = value,

        _ => return false,
    }
    true
}
