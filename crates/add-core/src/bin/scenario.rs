// The scenario library intentionally remains outside the gameplay crate so
// it is not pulled into the WASM build. The add-core package owns this native
// entry point; compiling the shared source here avoids a dependency cycle
// (`add-scenario` already depends on `add-core`).
#[allow(unused_imports)]
#[path = "../../../add-scenario/src/lib.rs"]
mod scenario;

use scenario::{run_scenario_file, stable_json_string};
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
        "a scenario path is required; use `cargo run -p add-core --bin scenario -- scenarios/<id>.json`"
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
        "Usage: scenario <scenario.json> [--write-final-save <path>]\n\n\
Runs a deterministic ADD scenario against add-core. Scenario save paths are\n\
resolved relative to the scenario file. On failure, the first divergent\n\
checkpoint and the replayable command prefix are printed to stderr."
    );
}
