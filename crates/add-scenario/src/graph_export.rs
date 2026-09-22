//! `narr graph`: the entity graph and the causal event graph, as DOT.
//!
//! §11 lists it with no CI condition, which is the point — it fails nothing and
//! explains something. Standing travels up the entity graph and arcs are found
//! along the causal one, so when a score or an arc is surprising the answer is
//! usually a shape in one of these, and a shape is easier to see than to read
//! out of a log.

use add_core::narrative::NarrativeLog;

fn escape(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

/// The entity graph: who belongs to whom, and how strongly that carries.
///
/// Edges point from member to group, the direction an impact travels, and carry
/// the inheritance weight of that step — the number that decides how much of
/// what happens to one person is felt by the group above them.
pub fn entity_dot() -> String {
    let mut out = String::from("digraph entities {\n  rankdir=BT;\n  node [shape=box];\n");
    for entity in add_core::game_data::narrative_entities() {
        out.push_str(&format!(
            "  \"{}\" [label=\"{}\\n{:?}\"];\n",
            escape(entity.id),
            escape(entity.label),
            entity.kind,
        ));
    }
    for entity in add_core::game_data::narrative_entities() {
        let Some(parent) = entity.parent else {
            continue;
        };
        let weight = add_core::narrative::inheritance_weight(entity.id, parent);
        out.push_str(&format!(
            "  \"{}\" -> \"{}\" [label=\"{weight:.2}\"];\n",
            escape(entity.id),
            escape(parent),
        ));
    }
    out.push_str("}\n");
    out
}

/// The causal event graph: what happened because of what.
///
/// An event with no cause is a root — something the player did unprompted — and
/// a chain from one is the shape a sifted arc is found in. Events are labelled
/// with their act and target so a chain reads as a story rather than as ids.
pub fn causal_dot(log: &NarrativeLog) -> String {
    let mut out = String::from("digraph causes {\n  rankdir=LR;\n  node [shape=ellipse];\n");
    for event in &log.events {
        let target = event.target.as_deref().unwrap_or("-");
        let repeats = if event.count > 1 {
            format!("\\nx{}", event.count)
        } else {
            String::new()
        };
        out.push_str(&format!(
            "  \"e{}\" [label=\"{}\\n{}{}\"];\n",
            event.id,
            escape(&event.act_id),
            escape(target),
            repeats,
        ));
    }
    for event in &log.events {
        for cause in &event.causes {
            // A cause can name an event that compaction has since folded away;
            // drawing an edge to a node that is not there would produce a graph
            // that renders but lies about what is in the log.
            if log.events.iter().any(|candidate| candidate.id == *cause) {
                out.push_str(&format!("  \"e{cause}\" -> \"e{}\";\n", event.id));
            }
        }
    }
    out.push_str("}\n");
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use add_core::narrative::{Secrecy, event_for};

    #[test]
    fn the_entity_graph_names_every_entity_and_every_membership() {
        let dot = entity_dot();
        assert!(dot.starts_with("digraph entities {"));
        assert!(dot.trim_end().ends_with('}'));
        for entity in add_core::game_data::narrative_entities() {
            assert!(dot.contains(entity.id), "{} is missing from the graph", entity.id);
            if let Some(parent) = entity.parent {
                assert!(
                    dot.contains(&format!("\"{}\" -> \"{parent}\"", entity.id)),
                    "{} -> {parent} is missing",
                    entity.id,
                );
            }
        }
    }

    /// A cause can name an event compaction has folded away. Drawing that edge
    /// would produce a graph that renders and lies: an arrow from a node that
    /// is not in the log.
    #[test]
    fn the_causal_graph_draws_no_edge_to_an_event_that_is_gone() {
        let mut log = add_core::narrative::NarrativeLog::default();
        let act = add_core::game_data::narrative_act_def("act.break_a_promise").expect("act");
        let mut first = event_for(act, Some("entity.vell"), 0.0);
        first.secrecy = Secrecy::Public;
        let first_id = log.append(first);

        let mut second = event_for(act, Some("entity.vell"), 10_000.0);
        second.secrecy = Secrecy::Public;
        second.causes = vec![first_id, 9_999];
        log.append(second);

        let dot = causal_dot(&log);
        assert!(dot.contains(&format!("\"e{first_id}\" ->")), "the real cause should be drawn");
        assert!(
            !dot.contains("\"e9999\""),
            "an event that is not in the log must not appear",
        );
    }
}
