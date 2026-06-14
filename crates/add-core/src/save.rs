use std::fmt;

use serde_json::Value;

use crate::migrations::{MigrationError, migrate_value};
use crate::state::GameState;

/// Why a save string could not be loaded.
#[derive(Debug)]
pub enum SaveError {
    /// The raw text was not valid save JSON, or did not match the state shape
    /// (even after migration).
    Json(serde_json::Error),
    /// The save was recorded by a newer build than this one supports.
    Migration(MigrationError),
}

impl fmt::Display for SaveError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SaveError::Json(error) => write!(f, "{error}"),
            SaveError::Migration(error) => write!(f, "{error}"),
        }
    }
}

impl std::error::Error for SaveError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            SaveError::Json(error) => Some(error),
            SaveError::Migration(error) => Some(error),
        }
    }
}

impl From<serde_json::Error> for SaveError {
    fn from(error: serde_json::Error) -> Self {
        SaveError::Json(error)
    }
}

impl From<MigrationError> for SaveError {
    fn from(error: MigrationError) -> Self {
        SaveError::Migration(error)
    }
}

pub fn export_save(state: &GameState) -> Result<String, serde_json::Error> {
    // `events` is an ephemeral per-frame buffer, not save data. Drop it so saves
    // never carry stale events (they're also `skip_deserializing`, so a save
    // that somehow contained them would ignore them on load).
    let mut state = state.clone();
    state.events.clear();
    serde_json::to_string_pretty(&state)
}

/// Load a save string: parse to a raw `Value`, migrate it forward to the
/// current schema version, then deserialize into [`GameState`]. Migration runs
/// before typed deserialization so older saves whose shape predates current
/// fields still load.
pub fn import_save(raw: &str) -> Result<GameState, SaveError> {
    let mut value: Value = serde_json::from_str(raw)?;
    migrate_value(&mut value)?;
    let state = serde_json::from_value(value)?;
    Ok(state)
}
