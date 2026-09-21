//! Deterministic, file-backed scenarios for the ADD simulation.
//!
//! This crate deliberately stays outside `add-core`: the core owns gameplay
//! rules and state transitions, while this crate owns the test/replay format,
//! canonical comparison, and diagnostics around those transitions.

pub mod bench;
pub mod fuzz;

use add_core::{GameCommand, GameState, Simulation, StationSpecializationPathState};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Number, Value};
use std::error::Error;
use std::fmt::{self, Display, Formatter};
use std::fs;
use std::path::{Path, PathBuf};

mod inspection;

pub use inspection::{
    AGENT_RUNTIME_CONTRACT, AGENT_RUNTIME_REPORT_VERSION, AGENT_RUNTIME_SCHEMA_VERSION,
    compact_text as agent_runtime_text, report as agent_runtime_report,
};

const FNV_OFFSET_BASIS: u64 = 14_695_981_039_346_656_037;
const FNV_PRIME: u64 = 1_099_511_628_211;
const FLOAT_PRECISION: f64 = 1_000_000.0;

/// A committed, deterministic gameplay scenario.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scenario {
    #[serde(default)]
    pub id: String,
    pub seed: String,
    #[serde(default, alias = "initialSave")]
    pub initial_save: Option<String>,
    pub commands: Vec<ScenarioCommand>,
    #[serde(default)]
    pub checkpoints: Vec<Checkpoint>,
}

/// A command in the scenario file.
///
/// The names intentionally mirror the Rust `GameCommand` variants so a
/// scenario is a direct replay log. Field aliases accept both the compact
/// scenario spelling (`id`) and the core spelling (`optionId`/`option_id`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "PascalCase")]
pub enum ScenarioCommand {
    ChooseStoryOption {
        #[serde(rename = "beatId", alias = "beat_id")]
        beat_id: String,
        #[serde(rename = "optionId", alias = "option_id")]
        option_id: String,
    },
    /// Record a consequential act in the narrative log.
    EmitAct {
        #[serde(rename = "actId", alias = "act_id")]
        act_id: String,
        #[serde(default)]
        target: Option<String>,
        #[serde(default = "one")]
        cost: f64,
        #[serde(default = "one")]
        need: f64,
        #[serde(default)]
        secrecy: Option<String>,
        #[serde(default)]
        witnesses: Vec<String>,
        /// Earlier event ids this act happened because of.
        #[serde(default)]
        causes: Vec<u64>,
    },
    /// Hand an entity an event at full fidelity.
    Tell {
        #[serde(rename = "entityId", alias = "entity_id")]
        entity_id: String,
        #[serde(rename = "eventId", alias = "event_id")]
        event_id: u64,
    },
    /// Stop an entity passing anything on.
    Silence {
        #[serde(rename = "entityId", alias = "entity_id")]
        entity_id: String,
    },
    /// Take a choice the ink scene presented, by its index.
    ChooseInkChoice {
        #[serde(rename = "beatId", alias = "beat_id")]
        beat_id: String,
        index: u16,
    },
    CompletePreArrivalRoute,
    SetHeroAssigned {
        assigned: bool,
    },
    SetHeroRole {
        #[serde(rename = "roleId", alias = "role_id")]
        role_id: String,
    },
    SetRoleCrew {
        #[serde(rename = "roleId", alias = "role_id")]
        role_id: String,
        crew: u8,
    },
    SetStationEnabled {
        #[serde(rename = "stationId", alias = "station_id")]
        station_id: String,
        enabled: bool,
    },
    StartWorldAction {
        #[serde(rename = "actionId", alias = "action_id")]
        action_id: String,
    },
    StartConstruction {
        #[serde(rename = "id", alias = "optionId", alias = "option_id")]
        option_id: String,
    },
    StartProcessing {
        #[serde(rename = "recipeId", alias = "recipe_id")]
        recipe_id: String,
    },
    StartResonanceRecipe {
        #[serde(rename = "recipeId", alias = "recipe_id")]
        recipe_id: String,
    },
    SetStationSpecialization {
        #[serde(rename = "stationId", alias = "station_id")]
        station_id: String,
        path: StationSpecializationPathState,
    },
    StartExpedition {
        #[serde(rename = "targetId", alias = "target_id")]
        target_id: String,
        #[serde(rename = "assignedCrew", alias = "assigned_crew")]
        assigned_crew: u16,
    },
    ClearExpeditionReports,
    RecruitFromSurvivorCave,
    MoveHeroTo {
        q: i8,
        r: i8,
    },
    OpenDoor {
        key: String,
    },
    ClearLocation {
        key: String,
        #[serde(rename = "lootItem", alias = "loot_item")]
        loot_item: Option<String>,
        #[serde(rename = "lootQty", alias = "loot_qty")]
        loot_qty: u32,
    },
    Engage {
        #[serde(rename = "creatureId", alias = "creature_id")]
        creature_id: String,
        key: String,
        #[serde(rename = "lootItem", alias = "loot_item")]
        loot_item: Option<String>,
        #[serde(rename = "lootQty", alias = "loot_qty")]
        loot_qty: u32,
    },
    DropItem {
        key: String,
        #[serde(rename = "itemId", alias = "item_id")]
        item_id: String,
        qty: u32,
    },
    PickUpLocation {
        key: String,
    },
    UseItem {
        #[serde(rename = "itemId", alias = "item_id")]
        item_id: String,
    },
    AcquirePerk {
        #[serde(rename = "perkId", alias = "perk_id")]
        perk_id: String,
    },
    SpendBassline {
        amount: f64,
    },
    Tick {
        seconds: f64,
    },
    RunOfflineCatchup {
        #[serde(
            rename = "seconds",
            alias = "elapsedSeconds",
            alias = "elapsed_seconds"
        )]
        elapsed_seconds: f64,
    },
    SetBalanceOverride {
        path: String,
        value: f64,
    },
    ResetBalanceOverrides,
    ResetRun,
    /// Harness operation: export and import the current save before replay
    /// continues. It is not a gameplay command and never reaches the browser.
    SaveRoundTrip,
}

impl ScenarioCommand {
    fn into_game_command(self) -> Option<GameCommand> {
        Some(match self {
            Self::ChooseStoryOption { beat_id, option_id } => {
                GameCommand::ChooseStoryOption { beat_id, option_id }
            }
            Self::ChooseInkChoice { beat_id, index } => {
                GameCommand::ChooseInkChoice { beat_id, index }
            }
            Self::EmitAct { act_id, target, cost, need, secrecy, witnesses, causes } => {
                GameCommand::EmitAct { act_id, target, cost, need, secrecy, witnesses, causes }
            }
            Self::Tell { entity_id, event_id } => GameCommand::Tell { entity_id, event_id },
            Self::Silence { entity_id } => GameCommand::Silence { entity_id },
            Self::CompletePreArrivalRoute => GameCommand::CompletePreArrivalRoute,
            Self::SetHeroAssigned { assigned } => GameCommand::SetHeroAssigned { assigned },
            Self::SetHeroRole { role_id } => GameCommand::SetHeroRole { role_id },
            Self::SetRoleCrew { role_id, crew } => GameCommand::SetRoleCrew { role_id, crew },
            Self::SetStationEnabled {
                station_id,
                enabled,
            } => GameCommand::SetStationEnabled {
                station_id,
                enabled,
            },
            Self::StartWorldAction { action_id } => GameCommand::StartWorldAction { action_id },
            Self::StartConstruction { option_id } => GameCommand::StartConstruction { option_id },
            Self::StartProcessing { recipe_id } => GameCommand::StartProcessing { recipe_id },
            Self::StartResonanceRecipe { recipe_id } => {
                GameCommand::StartResonanceRecipe { recipe_id }
            }
            Self::SetStationSpecialization { station_id, path } => {
                GameCommand::SetStationSpecialization { station_id, path }
            }
            Self::StartExpedition {
                target_id,
                assigned_crew,
            } => GameCommand::StartExpedition {
                target_id,
                assigned_crew,
            },
            Self::ClearExpeditionReports => GameCommand::ClearExpeditionReports,
            Self::RecruitFromSurvivorCave => GameCommand::RecruitFromSurvivorCave,
            Self::MoveHeroTo { q, r } => GameCommand::MoveHeroTo { q, r },
            Self::OpenDoor { key } => GameCommand::OpenDoor { key },
            Self::ClearLocation {
                key,
                loot_item,
                loot_qty,
            } => GameCommand::ClearLocation {
                key,
                loot_item,
                loot_qty,
            },
            Self::Engage {
                creature_id,
                key,
                loot_item,
                loot_qty,
            } => GameCommand::Engage {
                creature_id,
                key,
                loot_item,
                loot_qty,
            },
            Self::DropItem { key, item_id, qty } => GameCommand::DropItem { key, item_id, qty },
            Self::PickUpLocation { key } => GameCommand::PickUpLocation { key },
            Self::UseItem { item_id } => GameCommand::UseItem { item_id },
            Self::AcquirePerk { perk_id } => GameCommand::AcquirePerk { perk_id },
            Self::SpendBassline { amount } => GameCommand::SpendBassline { amount },
            Self::Tick { seconds } => GameCommand::Tick { seconds },
            Self::RunOfflineCatchup { elapsed_seconds } => {
                GameCommand::RunOfflineCatchup { elapsed_seconds }
            }
            Self::SetBalanceOverride { path, value } => {
                GameCommand::SetBalanceOverride { path, value }
            }
            Self::ResetBalanceOverrides => GameCommand::ResetBalanceOverrides,
            Self::ResetRun => GameCommand::ResetRun,
            Self::SaveRoundTrip => return None,
        })
    }
}

/// A partial canonical snapshot to check after `after` commands have run.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Checkpoint {
    #[serde(default)]
    pub id: Option<String>,
    pub after: usize,
    #[serde(default, alias = "snapshot")]
    pub state: Value,
}

impl Checkpoint {
    /// Stable identity used in diagnostics and machine-readable reports.
    pub fn stable_id(&self, scenario_id: &str, ordinal: usize) -> String {
        let safe_scenario_id = scenario_id
            .trim()
            .chars()
            .map(|character| {
                if character.is_ascii_alphanumeric() || matches!(character, '.' | '_' | '-') {
                    character
                } else {
                    '-'
                }
            })
            .collect::<String>();
        let safe_scenario_id = if safe_scenario_id.is_empty() {
            "scenario"
        } else {
            safe_scenario_id.as_str()
        };
        match self.id.as_deref().filter(|id| !id.trim().is_empty()) {
            Some(id) => format!("checkpoint:{safe_scenario_id}:{id}"),
            None => format!(
                "checkpoint:{safe_scenario_id}:{}@{}",
                ordinal + 1,
                self.after
            ),
        }
    }
}

/// Successful execution result. `final_save` is kept for fixture generation
/// and is deliberately not printed by the CLI unless requested.
#[derive(Debug, Clone)]
pub struct ScenarioRun {
    pub scenario_id: String,
    pub seed: String,
    pub seed_value: u64,
    pub command_count: usize,
    pub checkpoints_passed: usize,
    pub checkpoint_ids: Vec<String>,
    pub replay_commands: Vec<ScenarioCommand>,
    pub final_snapshot: Value,
    pub final_agent_runtime: Value,
    pub final_save: String,
}

impl ScenarioRun {
    /// Stable, machine-readable success output for agents and CI.
    pub fn report_value(&self) -> Value {
        let mut report = Map::new();
        report.insert("status".to_string(), Value::String("passed".to_string()));
        report.insert(
            "scenario".to_string(),
            Value::String(self.scenario_id.clone()),
        );
        report.insert("seed".to_string(), Value::String(self.seed.clone()));
        report.insert(
            "seedValue".to_string(),
            Value::String(self.seed_value.to_string()),
        );
        report.insert(
            "commandCount".to_string(),
            Value::Number(Number::from(self.command_count as u64)),
        );
        report.insert(
            "checkpointsPassed".to_string(),
            Value::Number(Number::from(self.checkpoints_passed as u64)),
        );
        report.insert(
            "checkpoints".to_string(),
            self.checkpoint_ids
                .iter()
                .map(|id| serde_json::json!({ "id": id, "status": "passed" }))
                .collect::<Vec<_>>()
                .into(),
        );
        report.insert(
            "replayCommands".to_string(),
            serde_json::to_value(&self.replay_commands).expect("scenario commands serialize"),
        );
        report.insert("agentRuntime".to_string(), self.final_agent_runtime.clone());
        report.insert(
            "agentRuntimeText".to_string(),
            Value::String(agent_runtime_text(&self.final_agent_runtime)),
        );
        report.insert("finalSnapshot".to_string(), self.final_snapshot.clone());
        Value::Object(report)
    }
}

#[derive(Debug)]
pub struct CheckpointFailure {
    pub checkpoint_index: usize,
    pub checkpoint_id: Option<String>,
    pub after: usize,
    pub path: String,
    pub expected: Value,
    pub actual: Value,
    pub replay_commands: Vec<ScenarioCommand>,
}

#[derive(Debug)]
pub struct SaveRoundTripFailure {
    pub command_index: usize,
    pub path: String,
    pub before: Value,
    pub after: Value,
    pub replay_commands: Vec<ScenarioCommand>,
}

#[derive(Debug)]
pub enum ScenarioError {
    Io {
        path: PathBuf,
        source: std::io::Error,
    },
    Parse {
        path: Option<PathBuf>,
        source: serde_json::Error,
    },
    Invalid(String),
    CheckpointMismatch(Box<CheckpointFailure>),
    SaveRoundTripMismatch(Box<SaveRoundTripFailure>),
}

impl Display for ScenarioError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io { path, source } => write!(formatter, "{}: {source}", path.display()),
            Self::Parse { path, source } => match path {
                Some(path) => write!(formatter, "{}: {source}", path.display()),
                None => write!(formatter, "scenario JSON: {source}"),
            },
            Self::Invalid(message) => write!(formatter, "invalid scenario: {message}"),
            Self::CheckpointMismatch(failure) => {
                let label = failure
                    .checkpoint_id
                    .as_deref()
                    .map(|id| format!("{id} (#{})", failure.checkpoint_index + 1))
                    .unwrap_or_else(|| format!("#{}", failure.checkpoint_index + 1));
                writeln!(formatter, "first divergent checkpoint: {label}")?;
                writeln!(formatter, "after command: {}", failure.after)?;
                writeln!(formatter, "path: {}", failure.path)?;
                writeln!(
                    formatter,
                    "expected: {}",
                    stable_json_string(&failure.expected)
                )?;
                writeln!(formatter, "actual: {}", stable_json_string(&failure.actual))?;
                writeln!(formatter, "replayable command log:")?;
                write!(
                    formatter,
                    "{}",
                    stable_json_string(
                        &serde_json::to_value(&failure.replay_commands)
                            .expect("scenario commands serialize"),
                    )
                )
            }
            Self::SaveRoundTripMismatch(failure) => {
                writeln!(
                    formatter,
                    "save round-trip diverged after command {}",
                    failure.command_index + 1
                )?;
                writeln!(formatter, "path: {}", failure.path)?;
                writeln!(formatter, "before: {}", stable_json_string(&failure.before))?;
                writeln!(formatter, "after: {}", stable_json_string(&failure.after))?;
                writeln!(formatter, "replayable command log:")?;
                write!(
                    formatter,
                    "{}",
                    stable_json_string(
                        &serde_json::to_value(&failure.replay_commands)
                            .expect("scenario commands serialize"),
                    )
                )
            }
        }
    }
}

impl Error for ScenarioError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Io { source, .. } => Some(source),
            Self::Parse { source, .. } => Some(source),
            _ => None,
        }
    }
}

/// Run a scenario with an optional already-loaded save payload.
pub fn run_scenario(
    scenario: &Scenario,
    initial_save: Option<&str>,
) -> Result<ScenarioRun, ScenarioError> {
    validate_scenario(scenario)?;

    let mut state = match initial_save {
        Some(raw) => add_core::import_save(raw)
            .map_err(|error| ScenarioError::Invalid(format!("initial save: {error}")))?,
        None => GameState::new(),
    };
    let seed_value = seed_to_u64(&scenario.seed);
    state.rng_seed = seed_value;
    let mut simulation = Simulation::from_state(state);
    let mut replay_commands = Vec::with_capacity(scenario.commands.len());
    let mut checkpoint_ids = Vec::with_capacity(scenario.checkpoints.len());
    let mut next_checkpoint = 0;

    for command_count in 0..=scenario.commands.len() {
        while next_checkpoint < scenario.checkpoints.len()
            && scenario.checkpoints[next_checkpoint].after == command_count
        {
            let checkpoint = &scenario.checkpoints[next_checkpoint];
            let checkpoint_id = checkpoint.stable_id(&scenario.id, next_checkpoint);
            let snapshot = canonical_snapshot(simulation.state())
                .map_err(|error| ScenarioError::Invalid(format!("snapshot: {error}")))?;
            if let Some(mismatch) = first_mismatch(&snapshot, &checkpoint.state, "$".to_string()) {
                return Err(ScenarioError::CheckpointMismatch(Box::new(
                    CheckpointFailure {
                        checkpoint_index: next_checkpoint,
                        checkpoint_id: checkpoint
                            .id
                            .clone()
                            .or_else(|| Some(checkpoint_id.clone())),
                        after: command_count,
                        path: mismatch.path,
                        expected: mismatch.expected,
                        actual: mismatch.actual,
                        replay_commands: replay_commands.clone(),
                    },
                )));
            }
            checkpoint_ids.push(checkpoint_id);
            next_checkpoint += 1;
        }

        if command_count == scenario.commands.len() {
            break;
        }

        let command = scenario.commands[command_count].clone();
        if matches!(&command, ScenarioCommand::SaveRoundTrip) {
            let before = canonical_snapshot(simulation.state())
                .map_err(|error| ScenarioError::Invalid(format!("snapshot: {error}")))?;
            let raw = add_core::export_save(simulation.state())
                .map_err(|error| ScenarioError::Invalid(format!("save export: {error}")))?;
            let restored = add_core::import_save(&raw)
                .map_err(|error| ScenarioError::Invalid(format!("save import: {error}")))?;
            simulation = Simulation::from_state(restored);
            let after = canonical_snapshot(simulation.state())
                .map_err(|error| ScenarioError::Invalid(format!("snapshot: {error}")))?;
            replay_commands.push(command);
            if before != after {
                let mismatch =
                    first_mismatch(&after, &before, "$".to_string()).unwrap_or(Mismatch {
                        path: "$".to_string(),
                        expected: before.clone(),
                        actual: after.clone(),
                    });
                return Err(ScenarioError::SaveRoundTripMismatch(Box::new(
                    SaveRoundTripFailure {
                        command_index: command_count,
                        path: mismatch.path,
                        before,
                        after,
                        replay_commands,
                    },
                )));
            }
        } else {
            let game_command = command
                .clone()
                .into_game_command()
                .expect("non-round-trip scenario command must map to GameCommand");
            simulation.apply(game_command);
            replay_commands.push(command);
        }
    }

    let final_snapshot = canonical_snapshot(simulation.state())
        .map_err(|error| ScenarioError::Invalid(format!("snapshot: {error}")))?;
    let final_agent_runtime = agent_runtime_report(simulation.state());
    let final_save = add_core::export_save(simulation.state())
        .map_err(|error| ScenarioError::Invalid(format!("save export: {error}")))?;
    Ok(ScenarioRun {
        scenario_id: scenario.id.clone(),
        seed: scenario.seed.clone(),
        seed_value,
        command_count: scenario.commands.len(),
        checkpoints_passed: scenario.checkpoints.len(),
        checkpoint_ids,
        replay_commands,
        final_snapshot,
        final_agent_runtime,
        final_save,
    })
}

/// Load a scenario and its save path relative to the scenario file, then run
/// it. This is the path used by the CLI and integration tests.
pub fn run_scenario_file(path: &Path) -> Result<ScenarioRun, ScenarioError> {
    let raw = fs::read_to_string(path).map_err(|source| ScenarioError::Io {
        path: path.to_path_buf(),
        source,
    })?;
    let mut scenario: Scenario =
        serde_json::from_str(&raw).map_err(|source| ScenarioError::Parse {
            path: Some(path.to_path_buf()),
            source,
        })?;
    if scenario.id.trim().is_empty() {
        scenario.id = path
            .file_stem()
            .and_then(|stem| stem.to_str())
            .filter(|stem| !stem.trim().is_empty())
            .unwrap_or("scenario")
            .to_string();
    }
    let initial_save = scenario.initial_save.as_deref().map(|relative| {
        let save_path = Path::new(relative);
        if save_path.is_absolute() {
            save_path.to_path_buf()
        } else {
            path.parent()
                .unwrap_or_else(|| Path::new("."))
                .join(save_path)
        }
    });
    let initial_save_raw = initial_save
        .as_deref()
        .map(|save_path| {
            fs::read_to_string(save_path).map_err(|source| ScenarioError::Io {
                path: save_path.to_path_buf(),
                source,
            })
        })
        .transpose()?;
    run_scenario(&scenario, initial_save_raw.as_deref())
}

/// Convert a human-readable seed into the stable u64 stream seed used by the
/// authoritative runtime. FNV-1a is intentionally tiny and cross-language.
pub fn seed_to_u64(seed: &str) -> u64 {
    let mut hash = FNV_OFFSET_BASIS;
    for byte in seed.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(FNV_PRIME);
    }
    if hash == 0 { 1 } else { hash }
}

/// Serialize the gameplay state into a stable comparison snapshot.
///
/// Ephemeral `events` are excluded: they describe the last command for UI
/// reactions and are intentionally absent after a save reload. All objects are
/// rebuilt in sorted-key order and floating point values are rounded to six
/// decimal places to prevent platform-specific noise from breaking replays.
pub fn canonical_snapshot(state: &GameState) -> Result<Value, serde_json::Error> {
    // Rehydrate derived fields through the same constructor used by save
    // import. This makes a snapshot represent the stable save/runtime
    // boundary instead of whichever derived fields the last command happened
    // to refresh before it was captured.
    let normalized_state = Simulation::from_state(state.clone()).into_state();
    let value = serde_json::to_value(normalized_state)?;
    Ok(normalize_value(value, true))
}

/// Produce stable pretty JSON for reports, logs, and committed artifacts.
pub fn stable_json_string(value: &Value) -> String {
    serde_json::to_string_pretty(&normalize_value(value.clone(), false))
        .expect("normalized JSON is always serializable")
}

fn validate_scenario(scenario: &Scenario) -> Result<(), ScenarioError> {
    if scenario.id.trim().is_empty() {
        return Err(ScenarioError::Invalid("id must not be empty".to_string()));
    }
    if scenario.seed.is_empty() {
        return Err(ScenarioError::Invalid("seed must not be empty".to_string()));
    }
    let mut previous_after = 0;
    for (index, checkpoint) in scenario.checkpoints.iter().enumerate() {
        if checkpoint.after > scenario.commands.len() {
            return Err(ScenarioError::Invalid(format!(
                "checkpoint {} runs after command {}, but the scenario has {} commands",
                index + 1,
                checkpoint.after,
                scenario.commands.len()
            )));
        }
        if index > 0 && checkpoint.after < previous_after {
            return Err(ScenarioError::Invalid(
                "checkpoints must be ordered by their `after` command count".to_string(),
            ));
        }
        if !checkpoint.state.is_object() {
            return Err(ScenarioError::Invalid(format!(
                "checkpoint {} state must be a JSON object",
                index + 1
            )));
        }
        previous_after = checkpoint.after;
    }
    Ok(())
}

#[derive(Debug)]
struct Mismatch {
    path: String,
    expected: Value,
    actual: Value,
}

fn first_mismatch(actual: &Value, expected: &Value, path: String) -> Option<Mismatch> {
    if let Some(expected_object) = expected.as_object() {
        if let Some(mismatch) = predicate_mismatch(actual, expected_object, &path) {
            return Some(mismatch);
        }
        if expected_object
            .keys()
            .any(|key| matches!(key.as_str(), "equals" | "atLeast" | "atMost" | "contains"))
        {
            return None;
        }
        let Some(actual_object) = actual.as_object() else {
            return Some(Mismatch {
                path,
                expected: expected.clone(),
                actual: actual.clone(),
            });
        };
        for (key, expected_value) in expected_object {
            let child_path = format!("{path}.{key}");
            let Some(actual_value) = actual_object.get(key) else {
                return Some(Mismatch {
                    path: child_path,
                    expected: expected_value.clone(),
                    actual: Value::Null,
                });
            };
            if let Some(mismatch) = first_mismatch(actual_value, expected_value, child_path) {
                return Some(mismatch);
            }
        }
        return None;
    }

    if let (Some(actual_array), Some(expected_array)) = (actual.as_array(), expected.as_array()) {
        if actual_array.len() != expected_array.len() {
            return Some(Mismatch {
                path,
                expected: expected.clone(),
                actual: actual.clone(),
            });
        }
        for (index, (actual_value, expected_value)) in
            actual_array.iter().zip(expected_array).enumerate()
        {
            if let Some(mismatch) =
                first_mismatch(actual_value, expected_value, format!("{path}[{index}]"))
            {
                return Some(mismatch);
            }
        }
        return None;
    }

    if actual == expected {
        None
    } else {
        Some(Mismatch {
            path,
            expected: expected.clone(),
            actual: actual.clone(),
        })
    }
}

fn predicate_mismatch(
    actual: &Value,
    expected: &Map<String, Value>,
    path: &str,
) -> Option<Mismatch> {
    if let Some(expected_value) = expected.get("equals") {
        return first_mismatch(actual, expected_value, path.to_string());
    }
    if let Some(expected_value) = expected.get("atLeast") {
        return compare_number(actual, expected_value, path, |actual, expected| {
            actual >= expected
        });
    }
    if let Some(expected_value) = expected.get("atMost") {
        return compare_number(actual, expected_value, path, |actual, expected| {
            actual <= expected
        });
    }
    if let Some(expected_value) = expected.get("contains") {
        let contains = match (actual, expected_value) {
            (Value::Array(actual_values), Value::Array(expected_values)) => {
                expected_values.iter().all(|expected_value| {
                    actual_values
                        .iter()
                        .any(|actual_value| actual_value == expected_value)
                })
            }
            (Value::String(actual_value), Value::String(expected_value)) => {
                actual_value.contains(expected_value)
            }
            _ => false,
        };
        if !contains {
            return Some(Mismatch {
                path: path.to_string(),
                expected: Value::Object(expected.clone()),
                actual: actual.clone(),
            });
        }
        return None;
    }
    None
}

fn compare_number(
    actual: &Value,
    expected: &Value,
    path: &str,
    predicate: impl FnOnce(f64, f64) -> bool,
) -> Option<Mismatch> {
    let actual_number = actual.as_f64();
    let expected_number = expected.as_f64();
    if actual_number
        .zip(expected_number)
        .is_some_and(|(actual, expected)| predicate(actual, expected))
    {
        None
    } else {
        Some(Mismatch {
            path: path.to_string(),
            expected: expected.clone(),
            actual: actual.clone(),
        })
    }
}

fn normalize_value(value: Value, strip_events: bool) -> Value {
    match value {
        Value::Object(object) => {
            let mut normalized = Map::new();
            for (key, value) in object {
                if strip_events && key == "events" {
                    continue;
                }
                normalized.insert(key, normalize_value(value, strip_events));
            }
            Value::Object(normalized)
        }
        Value::Array(values) => Value::Array(
            values
                .into_iter()
                .map(|value| normalize_value(value, strip_events))
                .collect(),
        ),
        Value::Number(number) => {
            let Some(float) = number.as_f64() else {
                return Value::Number(number);
            };
            let rounded = (float * FLOAT_PRECISION).round() / FLOAT_PRECISION;
            if rounded == 0.0 {
                Value::Number(Number::from(0))
            } else if rounded.fract() == 0.0 && rounded.abs() <= i64::MAX as f64 {
                Value::Number(Number::from(rounded as i64))
            } else {
                Value::Number(Number::from_f64(rounded).unwrap_or(number))
            }
        }
        other => other,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scenario(commands: Vec<ScenarioCommand>, checkpoints: Vec<Checkpoint>) -> Scenario {
        Scenario {
            id: "unit".to_string(),
            seed: "unit-seed".to_string(),
            initial_save: None,
            commands,
            checkpoints,
        }
    }

    #[test]
    fn seed_hash_is_stable_and_nonzero() {
        assert_eq!(seed_to_u64("fixture-seed"), seed_to_u64("fixture-seed"));
        assert_ne!(seed_to_u64("fixture-seed"), seed_to_u64("other-seed"));
        assert_ne!(seed_to_u64(""), 0);
    }

    #[test]
    fn checkpoint_matching_is_partial_and_supports_numeric_predicates() {
        let run = run_scenario(
            &scenario(
                vec![ScenarioCommand::Tick { seconds: 60.0 }],
                vec![Checkpoint {
                    id: Some("clock-and-resources".to_string()),
                    after: 1,
                    state: serde_json::json!({
                        "clockSeconds": { "atLeast": 60 },
                        "resources": { "stone": { "atMost": 1000 } },
                        "heroMap": { "q": 6, "r": 0 }
                    }),
                }],
            ),
            None,
        )
        .expect("scenario should pass");
        assert_eq!(run.command_count, 1);
        assert_eq!(run.checkpoints_passed, 1);
    }

    #[test]
    fn save_round_trip_is_a_replay_command() {
        let run = run_scenario(
            &scenario(
                vec![
                    ScenarioCommand::SetHeroAssigned { assigned: true },
                    ScenarioCommand::SaveRoundTrip,
                    ScenarioCommand::Tick { seconds: 10.0 },
                ],
                vec![Checkpoint {
                    id: None,
                    after: 3,
                    state: serde_json::json!({
                        "clockSeconds": 10,
                        "roster": { "heroAssigned": true }
                    }),
                }],
            ),
            None,
        )
        .expect("save round-trip scenario should pass");
        assert_eq!(run.replay_commands.len(), 3);
    }

    #[test]
    fn mismatch_reports_the_first_path_and_prefix() {
        let error = run_scenario(
            &scenario(
                vec![ScenarioCommand::Tick { seconds: 1.0 }],
                vec![Checkpoint {
                    id: Some("bad-clock".to_string()),
                    after: 1,
                    state: serde_json::json!({ "clockSeconds": 2 }),
                }],
            ),
            None,
        )
        .expect_err("incorrect checkpoint should fail");
        let text = error.to_string();
        assert!(text.contains("first divergent checkpoint: bad-clock"));
        assert!(text.contains("path: $.clockSeconds"));
        assert!(text.contains("\"type\": \"Tick\""));
    }
}


/// One JSON export of the narrative vocabulary an agent needs before it writes
/// content: which beats exist, what each one's choices are, which are
/// ink-backed, and which knots the compiled story declares. This is the
/// context that stops generated content inventing near-duplicate ids.
pub fn narrative_schema() -> serde_json::Value {
    use serde_json::json;
    let beats: Vec<_> = add_core::story_beats()
        .iter()
        .map(|beat| {
            json!({
                "id": beat.id,
                "label": beat.label,
                "arc": beat.arc,
                "sequence": beat.sequence,
                "worldActionId": beat.world_action_id,
                "inkBacked": add_core::narrative::beat_has_knot(beat.id),
                "knot": add_core::narrative::knot_for_beat(beat.id),
                "choices": beat
                    .choices
                    .iter()
                    .map(|choice| json!({ "id": choice.id, "label": choice.label }))
                    .collect::<Vec<_>>(),
            })
        })
        .collect();

    json!({
        "contract": "add_narrative_schema_v1",
        "beats": beats,
        "inkKnots": add_core::narrative::all_knots(),
        "fuzzPolicies": fuzz::Policy::ALL.iter().map(|p| p.as_str()).collect::<Vec<_>>(),
        "commands": ["ChooseStoryOption", "ChooseInkChoice", "StartWorldAction", "Tick"],
    })
}


fn one() -> f64 {
    1.0
}
