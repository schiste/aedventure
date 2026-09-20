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
