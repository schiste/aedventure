//! Generating a population, so the system can be measured at the scale §10
//! sizes for rather than at the size the authored cast happens to be.
//!
//! §11 describes `narr generate` as producing "individuals and value profiles
//! from each group's rules and the world seed", and that is what this does: it
//! keeps every authored group, keeps every authored character, and fills the
//! groups out with generated members whose value profiles are their group's,
//! deviated by a seeded amount.
//!
//! Generated entities are leaked to `'static`. That is deliberate and bounded:
//! a definition holds `&'static str` because the authored catalog is compiled
//! in, the population is installed once per process before anything reads it,
//! and the process is a benchmark or a tool. It is not a pattern for the game.

use add_core::game_data::NarrativeEntityDef;
use add_core::narrative::GroupKind;

/// Splitmix64, so a population is reproducible from its seed. The same
/// generator the fuzzer uses, for the same reason.
struct Rng(u64);

impl Rng {
    fn next(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }

    /// A value in -1.0..1.0.
    fn signed_unit(&mut self) -> f64 {
        (self.next() % 20_001) as f64 / 10_000.0 - 1.0
    }
}

fn leak(value: String) -> &'static str {
    Box::leak(value.into_boxed_str())
}

/// Build a population of at least `target` entities.
///
/// Every authored entity is kept as it is — the named cast still exists, with
/// the same ids, so committed scenarios and authored content keep working.
/// Generated members are attached to the authored groups, spread evenly, so
/// the inheritance chains they hang from are the real ones.
pub fn generate(target: usize, seed: u64) -> Vec<NarrativeEntityDef> {
    let authored = add_core::game_data::narrative_entities();
    let mut population: Vec<NarrativeEntityDef> = authored.to_vec();

    // Groups a generated individual can belong to: anything that is not itself
    // an individual. Falling back to the whole catalog would parent people to
    // people, which is not what the graph means.
    let groups: Vec<&NarrativeEntityDef> = authored
        .iter()
        .filter(|entity| entity.kind != GroupKind::Individual)
        .collect();
    if groups.is_empty() || population.len() >= target {
        return population;
    }

    let mut rng = Rng(seed ^ 0x5EED_0F_A_1);
    let mut index = 0usize;
    while population.len() < target {
        let group = groups[index % groups.len()];

        // The profile is the group's, deviated. A member who differs from their
        // group is what makes a population more than a crowd of identical
        // reactions — §5B's deviants, generated rather than authored.
        let values: Vec<(&'static str, f64)> = group
            .values
            .iter()
            .map(|(axis, weight)| {
                let deviation = rng.signed_unit() * 0.3;
                (*axis, weight + deviation)
            })
            .collect();

        population.push(NarrativeEntityDef {
            id: leak(format!("entity.generated.{index}")),
            label: leak(format!("Survivor {index}")),
            kind: GroupKind::Individual,
            parent: Some(group.id),
            rank: 0,
            influence: 0.1,
            values: Box::leak(values.into_boxed_slice()),
        });
        index += 1;
    }

    population
}

/// Generate and install, for a tool that wants the world at scale.
pub fn install(target: usize, seed: u64) -> Result<usize, String> {
    let population = generate(target, seed);
    let size = population.len();
    add_core::game_data::install_generated_population(population)?;
    Ok(size)
}
