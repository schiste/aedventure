//! The entity graph: who exists, who they belong to, and how much a group's
//! view of the Hero rubs off on its members.
//!
//! Entities are *content* — authored in `packages/add-content` and generated
//! into `game_data`. What lives here is the *rule*: how far an impact recorded
//! on a group reaches into the people inside it.

use serde::{Deserialize, Serialize};

/// What kind of group this is. Structure, not values: it sets how tightly
/// members inherit and how far blame spreads (entitativity; Lickel et al.).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GroupKind {
    Individual,
    Family,
    BeliefGroup,
    Crew,
    SurvivalFaction,
    LooseAssociation,
}

impl GroupKind {
    /// How much a member inherits of its group's standing.
    pub fn inherit(self) -> f64 {
        match self {
            GroupKind::Family => 0.7,
            GroupKind::BeliefGroup => 0.6,
            GroupKind::Crew => 0.4,
            GroupKind::SurvivalFaction => 0.3,
            GroupKind::LooseAssociation => 0.1,
            GroupKind::Individual => 0.0,
        }
    }

    /// How much of one member's grievance the rest of the group takes on.
    pub fn shared_grievance(self) -> f64 {
        match self {
            GroupKind::Family => 0.8,
            GroupKind::BeliefGroup => 0.6,
            GroupKind::Crew => 0.3,
            GroupKind::SurvivalFaction => 0.2,
            GroupKind::LooseAssociation | GroupKind::Individual => 0.0,
        }
    }

    /// How much an individual's first-hand view leaks up into their group
    /// (contact generalises upward; Allport, Pettigrew and Tropp).
    pub fn leak_up(self) -> f64 {
        match self {
            GroupKind::Family => 0.5,
            GroupKind::BeliefGroup => 0.4,
            GroupKind::Crew => 0.3,
            GroupKind::SurvivalFaction => 0.2,
            GroupKind::LooseAssociation => 0.05,
            GroupKind::Individual => 0.0,
        }
    }

    pub fn from_str(value: &str) -> Option<GroupKind> {
        Some(match value {
            "individual" => GroupKind::Individual,
            "family" => GroupKind::Family,
            "belief_group" => GroupKind::BeliefGroup,
            "crew" => GroupKind::Crew,
            "survival_faction" => GroupKind::SurvivalFaction,
            "loose_association" => GroupKind::LooseAssociation,
            _ => return None,
        })
    }

    pub fn as_str(self) -> &'static str {
        match self {
            GroupKind::Individual => "individual",
            GroupKind::Family => "family",
            GroupKind::BeliefGroup => "belief_group",
            GroupKind::Crew => "crew",
            GroupKind::SurvivalFaction => "survival_faction",
            GroupKind::LooseAssociation => "loose_association",
        }
    }
}

/// The chain from an entity up to the world: `[self, parent, grandparent, …]`.
pub fn ancestry(entity_id: &str) -> Vec<&'static str> {
    let mut chain = Vec::new();
    let mut current = crate::game_data::narrative_entity_def(entity_id);
    while let Some(entity) = current {
        chain.push(entity.id);
        current = entity.parent.and_then(crate::game_data::narrative_entity_def);
    }
    chain
}

/// How much of an impact recorded on `scope` reaches `observer`.
///
/// Zero when the scope is not the observer or one of its ancestors: a faction
/// impact reaches its members, a member's does not reach their sibling. Each
/// level up multiplies again by that level's group kind, so a distant faction
/// stranger feels far less than a peer in the same crew.
pub fn inheritance_weight(observer_id: &str, scope_id: &str) -> f64 {
    if observer_id == scope_id {
        return 1.0;
    }
    let mut weight = 1.0;
    let mut current = crate::game_data::narrative_entity_def(observer_id);
    while let Some(entity) = current {
        let Some(parent_id) = entity.parent else {
            return 0.0;
        };
        let Some(parent) = crate::game_data::narrative_entity_def(parent_id) else {
            return 0.0;
        };
        // The step from a member to its group is weighted by the group's kind.
        weight *= parent.kind.inherit();
        if parent_id == scope_id {
            return weight;
        }
        current = Some(parent);
    }
    0.0
}

#[cfg(test)]
mod tests {
    use super::*;

    const INDIVIDUAL: &str = "entity.vell";
    const SUBFACTION: &str = "entity.sleepless.sounding_five";
    const FACTION: &str = "entity.sleepless";

    #[test]
    fn an_entity_inherits_fully_from_itself() {
        assert_eq!(inheritance_weight(INDIVIDUAL, INDIVIDUAL), 1.0);
    }

    #[test]
    fn inheritance_attenuates_with_every_level_up() {
        let peer = inheritance_weight(INDIVIDUAL, SUBFACTION);
        let distant = inheritance_weight(INDIVIDUAL, FACTION);
        assert!(peer > 0.0, "a member should inherit from its sub-faction");
        assert!(
            distant < peer,
            "a faction impact should reach a member more weakly ({distant}) than its \
             sub-faction's does ({peer})",
        );
    }

    #[test]
    fn impacts_do_not_travel_sideways_or_downward() {
        // A scope that is neither the observer nor an ancestor of it.
        assert_eq!(inheritance_weight(SUBFACTION, INDIVIDUAL), 0.0);
        assert_eq!(inheritance_weight(FACTION, INDIVIDUAL), 0.0);
    }

    #[test]
    fn ancestry_runs_from_the_entity_to_the_top() {
        let chain = ancestry(INDIVIDUAL);
        assert_eq!(chain.first().copied(), Some(INDIVIDUAL));
        assert!(chain.contains(&SUBFACTION));
        assert!(chain.contains(&FACTION));
    }

    #[test]
    fn group_kinds_rank_as_the_research_says() {
        // Families inherit and share blame harder than loose associations.
        assert!(GroupKind::Family.inherit() > GroupKind::SurvivalFaction.inherit());
        assert!(
            GroupKind::SurvivalFaction.inherit() > GroupKind::LooseAssociation.inherit()
        );
        assert!(GroupKind::Family.shared_grievance() > GroupKind::Crew.shared_grievance());
    }
}
