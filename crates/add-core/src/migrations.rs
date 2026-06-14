//! Versioned save migration.
//!
//! Saves are migrated forward one schema version at a time, operating on the
//! raw `serde_json::Value` *before* typed deserialization into [`GameState`].
//! This keeps load robust as the state shape evolves:
//!
//! - **Additive** changes (a new field) need no migration — `#[serde(default)]`
//!   on the field supplies a value for older saves.
//! - **Transforming** changes (renaming/reshaping *existing* data, splitting a
//!   field, changing units) get one [`Migration`] entry that mutates the
//!   `Value` so the typed deserialize succeeds.
//!
//! The loader walks from the save's recorded version up to
//! [`CURRENT_SCHEMA_VERSION`], applying the migration registered for each step
//! (steps with no registered transform are no-ops). Saves recorded at a version
//! *newer* than this build are rejected rather than silently mis-loaded.
//!
//! [`GameState`]: crate::state::GameState

use std::fmt;

use serde_json::Value;

/// Current shape of the serialized [`GameState`](crate::state::GameState).
///
/// Bump this whenever a change to the serialized state can't be satisfied by
/// `#[serde(default)]` alone, and add the matching entry to [`MIGRATIONS`] plus
/// a round-trip fixture test.
pub const CURRENT_SCHEMA_VERSION: u16 = 15;

/// Current identity of the content catalog a save was authored against.
///
/// Distinct from [`CURRENT_SCHEMA_VERSION`] (which tracks the *engine* state
/// shape): this tracks the *content* build, so a future content migration can
/// tell which catalog a save assumed. Bump when content changes in a way a save
/// must be reconciled against.
pub const CURRENT_CATALOG_VERSION: u16 = 1;

/// serde default for [`GameState::catalog_version`](crate::state::GameState).
/// Old saves (written before the field existed) load as the current catalog.
pub fn default_catalog_version() -> u16 {
    CURRENT_CATALOG_VERSION
}

/// A single forward step: upgrades a save's JSON from version `from` to
/// `from + 1` by mutating the `Value` in place.
struct Migration {
    /// The version this step upgrades *from* (it produces `from + 1`).
    from: u16,
    /// Transform applied to the raw save `Value`.
    apply: fn(&mut Value),
}

/// Ordered registry of data-transforming migrations.
///
/// Empty today: every field added on the way to v15 was additive and is covered
/// by `#[serde(default)]`, so no save needs reshaping. The framework still runs
/// (it stamps the version and rejects future saves); the first reshaping change
/// adds its entry here.
const MIGRATIONS: &[Migration] = &[
    // Example (when a real transform is needed):
    // Migration { from: 15, apply: migrate_15_to_16 },
];

/// Why a save could not be migrated.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MigrationError {
    /// The save was written by a newer build than this one understands.
    FromFuture { found: u16, current: u16 },
}

impl fmt::Display for MigrationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MigrationError::FromFuture { found, current } => write!(
                f,
                "save schema version {found} is newer than this build supports (max {current}); \
                 update the game to load it"
            ),
        }
    }
}

impl std::error::Error for MigrationError {}

/// Migrate a raw save `Value` in place to [`CURRENT_SCHEMA_VERSION`], ready for
/// typed deserialization. Stamps `schemaVersion` on success.
pub fn migrate_value(value: &mut Value) -> Result<(), MigrationError> {
    run_migrations(value, MIGRATIONS, CURRENT_SCHEMA_VERSION)
}

/// Core walk, parameterized over registry + target so it can be unit-tested
/// independently of the real (currently empty) [`MIGRATIONS`] registry.
fn run_migrations(
    value: &mut Value,
    registry: &[Migration],
    current: u16,
) -> Result<(), MigrationError> {
    // A save with no recorded version predates `schemaVersion`; treat it as the
    // oldest possible so every step runs.
    let found = read_version(value).unwrap_or(0);

    // Forward-incompatibility policy: refuse saves from a newer build. Loading
    // them best-effort risks silent state corruption, so we fail loudly and let
    // the player update instead. (Change here if a softer policy is wanted.)
    if found > current {
        return Err(MigrationError::FromFuture {
            found,
            current,
        });
    }

    let mut version = found;
    while version < current {
        if let Some(migration) = registry.iter().find(|migration| migration.from == version) {
            (migration.apply)(value);
        }
        version += 1;
    }

    write_version(value, current);
    Ok(())
}

fn read_version(value: &Value) -> Option<u16> {
    value
        .get("schemaVersion")
        .and_then(Value::as_u64)
        .map(|raw| raw as u16)
}

fn write_version(value: &mut Value, version: u16) {
    if let Some(object) = value.as_object_mut() {
        object.insert("schemaVersion".to_string(), Value::from(version));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn run_migrations_applies_each_step_in_order() {
        // Synthetic registry independent of the real (empty) MIGRATIONS, so the
        // ordered-application logic is genuinely covered.
        fn step_1_to_2(value: &mut Value) {
            value
                .as_object_mut()
                .unwrap()
                .insert("added".to_string(), json!("one"));
        }
        fn step_2_to_3(value: &mut Value) {
            // Depends on the prior step's field — proves ordering.
            let prior = value
                .get("added")
                .and_then(Value::as_str)
                .unwrap()
                .to_string();
            value
                .as_object_mut()
                .unwrap()
                .insert("chained".to_string(), json!(format!("{prior}-two")));
        }
        let registry = [
            Migration { from: 1, apply: step_1_to_2 },
            Migration { from: 2, apply: step_2_to_3 },
        ];

        let mut value = json!({ "schemaVersion": 1 });
        run_migrations(&mut value, &registry, 3).unwrap();

        assert_eq!(value["schemaVersion"], json!(3));
        assert_eq!(value["added"], json!("one"));
        assert_eq!(value["chained"], json!("one-two"));
    }

    #[test]
    fn run_migrations_skips_steps_below_recorded_version() {
        fn should_not_run(_: &mut Value) {
            panic!("migration below the recorded version must not run");
        }
        let registry = [Migration { from: 1, apply: should_not_run }];

        let mut value = json!({ "schemaVersion": 2 });
        run_migrations(&mut value, &registry, 3).unwrap();

        assert_eq!(value["schemaVersion"], json!(3));
    }

    #[test]
    fn missing_version_runs_from_oldest() {
        // A save with no `schemaVersion` is treated as version 0, so the
        // from-0 step runs.
        fn mark(value: &mut Value) {
            value
                .as_object_mut()
                .unwrap()
                .insert("ran_from_zero".to_string(), json!(true));
        }
        let registry = [Migration { from: 0, apply: mark }];

        let mut value = json!({});
        run_migrations(&mut value, &registry, 1).unwrap();

        assert_eq!(value.get("ran_from_zero"), Some(&json!(true)));
        assert_eq!(value["schemaVersion"], json!(1));
    }

    #[test]
    fn future_save_is_rejected() {
        let mut value = json!({ "schemaVersion": CURRENT_SCHEMA_VERSION + 1 });
        let result = run_migrations(&mut value, MIGRATIONS, CURRENT_SCHEMA_VERSION);
        assert_eq!(
            result,
            Err(MigrationError::FromFuture {
                found: CURRENT_SCHEMA_VERSION + 1,
                current: CURRENT_SCHEMA_VERSION,
            })
        );
    }

    #[test]
    fn migrate_value_stamps_current_version() {
        let mut value = json!({ "schemaVersion": 0 });
        migrate_value(&mut value).unwrap();
        assert_eq!(value["schemaVersion"], json!(CURRENT_SCHEMA_VERSION));
    }
}
