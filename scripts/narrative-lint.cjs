#!/usr/bin/env node
// Strict narrative lint, run as part of `npm run content:check`.
//
// Cross-references the authored `.ink` against the authored story catalog, so
// the two cannot drift apart silently. The deeper runtime invariants — that a
// presented choice id is the id ink records, that every branch sets `chosen` —
// are Rust tests in crates/add-core, because they need the runtime to prove.
//
//   node scripts/narrative-lint.cjs            # human report
//   node scripts/narrative-lint.cjs --json     # machine-readable

const fs = require("node:fs")
const path = require("node:path")

const ROOT = path.resolve(__dirname, "..")
const STORY_DIR = path.join(ROOT, "packages/add-content/narrative/story")
const JSON_OUT = process.argv.includes("--json")

function loadBeats() {
  const distPath = path.join(ROOT, "packages/add-content/dist/content/story.js")
  if (!fs.existsSync(distPath)) {
    throw new Error(
      "ADD content dist is missing. Run `npm --workspace @aedventure/add-content run build` first.",
    )
  }
  return require(distPath).STORY_BEATS
}

const knotForBeat = (beatId) => beatId.replace(/[.-]/g, "_")

function parseInk(file) {
  const text = fs.readFileSync(file, "utf8")
  const knots = []
  let current = null
  for (const [lineNumber, raw] of text.split("\n").entries()) {
    const line = raw.trim()
    const heading = /^===+\s*([A-Za-z0-9_]+)\s*=*$/.exec(line)
    if (heading) {
      current = { name: heading[1], line: lineNumber + 1, chosen: [], choices: 0 }
      knots.push(current)
      continue
    }
    if (!current) continue
    if (/^\*\s/.test(line) || /^\+\s/.test(line)) current.choices += 1
    const chosen = /^~\s*chosen\s*=\s*"([^"]+)"/.exec(line)
    if (chosen) current.chosen.push(chosen[1])
  }
  return knots
}

function main() {
  const beats = loadBeats()
  const byKnot = new Map(beats.map((beat) => [knotForBeat(beat.id), beat]))
  const errors = []
  const files = fs
    .readdirSync(STORY_DIR)
    .filter((name) => name.endsWith(".ink"))
    .sort()

  let knotCount = 0
  for (const name of files) {
    const rel = path.relative(ROOT, path.join(STORY_DIR, name))
    for (const knot of parseInk(path.join(STORY_DIR, name))) {
      knotCount += 1
      const beat = byKnot.get(knot.name)
      if (!beat) {
        errors.push(`${rel}:${knot.line} knot \`${knot.name}\` names no story beat`)
        continue
      }
      // A choice that records nothing would present an option that cannot
      // change the world.
      if (knot.choices !== knot.chosen.length) {
        errors.push(
          `${rel}:${knot.line} knot \`${knot.name}\` has ${knot.choices} choice(s) but ` +
            `${knot.chosen.length} \`~ chosen = ...\` assignment(s); every choice must record one`,
        )
      }
      const authored = new Set(beat.choices.map((choice) => choice.id))
      for (const id of knot.chosen) {
        if (!authored.has(id)) {
          errors.push(
            `${rel}:${knot.line} knot \`${knot.name}\` records \`${id}\`, which is not a choice of ${beat.id}`,
          )
        }
      }
      // Ink must present every authored choice, or the catalog holds effects
      // the player can never trigger.
      for (const choice of beat.choices) {
        if (!knot.chosen.includes(choice.id)) {
          errors.push(
            `${rel}:${knot.line} knot \`${knot.name}\` never offers \`${choice.id}\`, ` +
              `an authored choice of ${beat.id}`,
          )
        }
      }
    }
  }

  const report = {
    contract: "add_narrative_lint_v1",
    ok: errors.length === 0,
    inkFiles: files.length,
    knots: knotCount,
    inkBackedBeats: [...byKnot.keys()].filter((knot) =>
      files.some((name) => parseInk(path.join(STORY_DIR, name)).some((k) => k.name === knot)),
    ),
    errors,
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log("ADD Narrative Lint")
    console.log(`Status: ${report.ok ? "OK" : "BROKEN"}`)
    console.log(`Ink files: ${report.inkFiles}, knots: ${report.knots}`)
    console.log(`Ink-backed beats: ${report.inkBackedBeats.join(", ") || "none"}`)
    for (const error of errors) console.error(`  ERROR ${error}`)
  }

  if (errors.length > 0) process.exit(1)
}

try {
  main()
} catch (error) {
  console.error(error?.message ?? error)
  process.exit(1)
}
