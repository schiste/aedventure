#!/usr/bin/env node

const fs = require("node:fs")
const path = require("node:path")

const ROOT = path.resolve(__dirname, "..")

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing generated-file contract input: ${relativePath}`)
  }
  return fs.readFileSync(absolutePath, "utf8")
}

function requireText(text, fragment, label) {
  if (!text.includes(fragment)) {
    throw new Error(`${label} is missing required text: ${fragment}`)
  }
}

const manifest = JSON.parse(read("performance/generated-files.json"))
const documentation = read("docs/add-generated-files.md")
const gitignore = read(".gitignore")
const packageJson = JSON.parse(read("package.json"))

if (manifest.schema_version !== 1 || manifest.id !== "add-generated-files-v1") {
  throw new Error("Generated-file manifest has an unsupported schema or ID.")
}
if (manifest.scope !== "live-add" || !Array.isArray(manifest.entries)) {
  throw new Error("Generated-file manifest must describe the live ADD entries.")
}

const ids = new Set()
for (const entry of manifest.entries) {
  for (const field of ["id", "path", "source", "producer", "check"]) {
    if (typeof entry[field] !== "string" || entry[field].length === 0) {
      throw new Error(`Generated-file entry is missing ${field}: ${JSON.stringify(entry)}`)
    }
  }
  if (ids.has(entry.id)) throw new Error(`Duplicate generated-file entry: ${entry.id}`)
  ids.add(entry.id)
  if (typeof entry.tracked !== "boolean" || typeof entry.writes_source !== "boolean") {
    throw new Error(`Generated-file entry needs tracked/writes_source booleans: ${entry.id}`)
  }
  requireText(documentation, entry.path, `Generated-file documentation for ${entry.id}`)
  requireText(documentation, entry.producer, `Generated-file producer for ${entry.id}`)
  requireText(documentation, entry.check, `Generated-file check for ${entry.id}`)
}

requireText(documentation, "## Where does this change belong?", "Generated-file documentation")
requireText(documentation, "## Write-capable checks", "Generated-file documentation")
requireText(documentation, "npm run generated:check", "Generated-file documentation")
requireText(gitignore, "apps/add-rpg/src/generated/wasm/", "Generated WASM ignore rule")

for (const command of [
  "generated:check",
  "qa:add-rpg:trace",
  "qa:add-rpg:trace:fixture",
  "qa:add-rpg:trace:test",
  "qa:add-rpg:size",
  "qa:add-rpg:size:built",
  "qa:add-rpg:size:test",
  "qa:add-rpg:performance",
]) {
  if (!packageJson.scripts[command]) {
    throw new Error(`package.json is missing generated/performance command: ${command}`)
  }
}

const budgets = JSON.parse(read("performance/add-budgets.json"))
if (budgets.schema_version !== 1 || budgets.id !== "add-performance-budgets-v1") {
  throw new Error("ADD performance budget contract has an unsupported schema or ID.")
}
if (budgets.trace_format !== "add-trace-v1") {
  throw new Error("ADD performance budgets must declare add-trace-v1.")
}

console.log("Generated-file and write-capability contract: OK")
