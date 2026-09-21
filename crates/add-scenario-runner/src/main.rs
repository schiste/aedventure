use add_scenario::{fuzz, narrative_schema, run_scenario_file, stable_json_string};
use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::ExitCode;

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(message) => {
            eprintln!("{message}");
            ExitCode::FAILURE
        }
    }
}

fn run() -> Result<(), String> {
    // Subcommands share this binary rather than growing a second one, so the
    // artifact conventions and the --json contract stay in one place.
    let mut argv = env::args().skip(1).peekable();
    match argv.peek().map(String::as_str) {
        Some("fuzz") => {
            argv.next();
            return run_fuzz(argv.collect());
        }
        Some("explain") => {
            argv.next();
            return run_explain(argv.collect());
        }
        Some("bench") => {
            argv.next();
            return run_bench(argv.collect());
        }
        Some("calibrate") => {
            argv.next();
            return run_calibrate(argv.collect());
        }
        Some("diff-tuning") => {
            argv.next();
            return run_diff_tuning(argv.collect());
        }
        Some("schema") => {
            println!("{}", stable_json_string(&narrative_schema()));
            return Ok(());
        }
        _ => {}
    }

    let mut arguments = env::args().skip(1);
    let mut scenario_path = None;
    let mut final_save_path = None;

    while let Some(argument) = arguments.next() {
        match argument.as_str() {
            "-h" | "--help" => {
                print_help();
                return Ok(());
            }
            "--write-final-save" => {
                let path = arguments
                    .next()
                    .ok_or_else(|| "--write-final-save requires a path".to_string())?;
                final_save_path = Some(PathBuf::from(path));
            }
            value if value.starts_with('-') => {
                return Err(format!("unknown option `{value}`; use --help"));
            }
            value if scenario_path.is_none() => scenario_path = Some(PathBuf::from(value)),
            value => return Err(format!("unexpected argument `{value}`; use --help")),
        }
    }

    let scenario_path = scenario_path.ok_or_else(|| {
        "a scenario path is required; use `npm run scenario:add -- scenarios/add/<id>.json`"
            .to_string()
    })?;
    let result = run_scenario_file(&scenario_path).map_err(|error| error.to_string())?;

    if let Some(path) = final_save_path {
        fs::write(&path, &result.final_save)
            .map_err(|error| format!("{}: {error}", path.display()))?;
    }

    println!("{}", stable_json_string(&result.report_value()));
    Ok(())
}

fn print_help() {
    println!(
        "Usage: add-scenario-runner <scenario.json> [--write-final-save <path>]\n\n\
Runs a deterministic ADD scenario against crates/add-core. Scenario save paths\n\
are resolved relative to the scenario file. On failure, the first divergent\n\
checkpoint and the replayable command prefix are printed to stderr."
    );
}

fn run_fuzz(arguments: Vec<String>) -> Result<(), String> {
    let mut runs = 1_000usize;
    let mut max_steps = 120usize;
    let mut index = 0;
    while index < arguments.len() {
        match arguments[index].as_str() {
            "-n" | "--runs" => {
                index += 1;
                runs = arguments
                    .get(index)
                    .and_then(|value| value.parse().ok())
                    .ok_or_else(|| "--runs requires a number".to_string())?;
            }
            "--max-steps" => {
                index += 1;
                max_steps = arguments
                    .get(index)
                    .and_then(|value| value.parse().ok())
                    .ok_or_else(|| "--max-steps requires a number".to_string())?;
            }
            other => return Err(format!("unknown fuzz option `{other}`")),
        }
        index += 1;
    }

    let report = fuzz::run_campaign(runs, max_steps);
    println!("{}", stable_json_string(&report.to_value()));
    if !report.ok() {
        // The command log of the first failure is in the report, so the bug
        // ships as a replayable sequence rather than a description.
        return Err(format!(
            "{} fuzz run(s) failed; replay the first failure's `commands`",
            report.failures.len()
        ));
    }
    Ok(())
}

/// Print the full product behind one entity's score on one axis: every event
/// that contributed, each factor with its input, and the running score. The
/// trace comes from the same fold that produces the number, so an explanation
/// can never disagree with the score it explains.
/// Replay a fixed corpus under two tunings and report what it changes.
fn run_diff_tuning(arguments: Vec<String>) -> Result<(), String> {
    let mut paths: Vec<PathBuf> = Vec::new();
    let mut runs = 6usize;
    let mut iterator = arguments.iter();
    while let Some(argument) = iterator.next() {
        match argument.as_str() {
            "--runs" => {
                runs = iterator
                    .next()
                    .and_then(|value| value.parse().ok())
                    .ok_or_else(|| "--runs needs a number".to_string())?;
            }
            other if other.starts_with('-') => {
                return Err(format!("unknown diff-tuning option `{other}`"));
            }
            value => paths.push(PathBuf::from(value)),
        }
    }
    if paths.len() != 2 {
        return Err("usage: diff-tuning <before.json> <after.json> [--runs <n>]".to_string());
    }

    let before = add_scenario::tuning::Tuning::load(&paths[0])?;
    let after = add_scenario::tuning::Tuning::load(&paths[1])?;
    // A fixed corpus: the same seeds every time, so a reported consequence is
    // the tuning's and not the sample's.
    let log = add_scenario::calibrate::play(runs, 60);
    let report = add_scenario::tuning::diff(&log, &before, &after, runs);
    println!("{}", stable_json_string(&report.to_value()));
    Ok(())
}

/// Report how the tuning spreads characters across the bands.
fn run_calibrate(arguments: Vec<String>) -> Result<(), String> {
    let mut acts = 400usize;
    let mut strict = false;
    let mut iterator = arguments.iter();
    while let Some(argument) = iterator.next() {
        match argument.as_str() {
            "-n" | "--acts" => {
                acts = iterator
                    .next()
                    .and_then(|value| value.parse().ok())
                    .ok_or_else(|| "--acts needs a number".to_string())?;
            }
            // Off by default: a dead axis is a finding for a writer to weigh,
            // not a broken build. `--strict` is for a caller that has decided
            // otherwise.
            "--strict" => strict = true,
            other => return Err(format!("unknown calibrate option `{other}`")),
        }
    }

    let report = add_scenario::calibrate::run(acts);
    println!("{}", stable_json_string(&report.to_value()));
    if strict && !report.ok() {
        return Err("calibration flagged an axis or an act".to_string());
    }
    Ok(())
}

/// Measure the §10 narrative budgets at full scale.
fn run_bench(arguments: Vec<String>) -> Result<(), String> {
    let mut events = add_scenario::bench::FULL_SCALE_EVENTS;
    let mut entities = 0usize;
    let mut iterator = arguments.iter();
    while let Some(argument) = iterator.next() {
        match argument.as_str() {
            "-n" | "--events" => {
                events = iterator
                    .next()
                    .and_then(|value| value.parse().ok())
                    .ok_or_else(|| "--events needs a number".to_string())?;
            }
            "--entities" => {
                entities = iterator
                    .next()
                    .and_then(|value| value.parse().ok())
                    .ok_or_else(|| "--entities needs a number".to_string())?;
            }
            other => return Err(format!("unknown bench option `{other}`")),
        }
    }

    // Before anything reads the graph, or the installation is refused.
    if entities > 0 {
        add_scenario::population::install(entities, 1)?;
    }

    let report = add_scenario::bench::run(events);
    // Measurements only. `scripts/narr-bench-check.cjs` applies the budgets
    // from performance/add-budgets.json and decides the verdict.
    println!("{}", stable_json_string(&report.to_value()));
    Ok(())
}

fn run_explain(arguments: Vec<String>) -> Result<(), String> {
    let mut save_path: Option<PathBuf> = None;
    let mut entity = None;
    let mut axis_name = None;
    let mut index = 0;
    while index < arguments.len() {
        match arguments[index].as_str() {
            "--save" => {
                index += 1;
                save_path = arguments.get(index).map(PathBuf::from);
            }
            value if entity.is_none() => entity = Some(value.to_string()),
            value if axis_name.is_none() => axis_name = Some(value.to_string()),
            other => return Err(format!("unexpected argument `{other}`")),
        }
        index += 1;
    }

    let entity = entity.ok_or_else(|| "usage: explain <entity-id> <axis> [--save <path>]".to_string())?;
    let axis_name = axis_name.ok_or_else(|| "an axis is required".to_string())?;
    let axis = add_core::narrative::Axis::from_str(&axis_name)
        .ok_or_else(|| format!("unknown axis `{axis_name}`"))?;

    let state = match save_path {
        Some(path) => {
            let raw = fs::read_to_string(&path)
                .map_err(|error| format!("{}: {error}", path.display()))?;
            add_core::import_save(&raw).map_err(|error| error.to_string())?
        }
        None => add_core::GameState::new(),
    };

    let now = state.clock_seconds;
    let (score, traces) = state.narrative.log.explain(&entity, axis, now);
    let report = serde_json::json!({
        "contract": "add_standing_explain_v1",
        "entity": entity,
        "axis": axis.as_str(),
        "score": score,
        "atTick": now,
        "band": add_core::narrative::Band::of(score).as_str(),
        "contributions": traces,
    });
    println!("{}", stable_json_string(&report));
    Ok(())
}
