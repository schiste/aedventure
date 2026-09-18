const fs = require("node:fs")
const path = require("node:path")
const { ROOT, loadContent } = require("./add-content-registry.cjs")

function read(relativePath, root = ROOT) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function requireVersion(text, name, expected, errors) {
  const match = text.match(new RegExp(`(?:const|static)\\s+${name}[^=]*=\\s*(\\d+)`))
  if (!match) {
    errors.push(`generated Rust version is missing ${name}`)
  } else if (Number(match[1]) !== expected) {
    errors.push(`${name} drift: authored=${expected}, generated=${match[1]}`)
  }
}

function validateContentVersion(root = ROOT) {
  const content = loadContent(root)
  const version = content.version
  const errors = []
  for (const name of ["contentSchemaVersion", "catalogVersion", "saveSchemaVersion"]) {
    if (!Number.isInteger(version[name]) || version[name] < 1) {
      errors.push(`content version ${name} must be a positive integer`)
    }
  }

  const generated = read("crates/add-core/src/game_data/catalog/version.rs", root)
  requireVersion(generated, "CONTENT_SCHEMA_VERSION", version.contentSchemaVersion, errors)
  requireVersion(generated, "CONTENT_CATALOG_VERSION", version.catalogVersion, errors)
  requireVersion(generated, "CONTENT_SAVE_SCHEMA_VERSION", version.saveSchemaVersion, errors)

  const migrations = read("crates/add-core/src/migrations.rs", root)
  if (!migrations.includes("crate::game_data::CONTENT_SAVE_SCHEMA_VERSION")) {
    errors.push("Rust save schema is not sourced from the authored content version contract")
  }
  if (!migrations.includes("crate::game_data::CONTENT_CATALOG_VERSION")) {
    errors.push("Rust catalog version is not sourced from the authored content version contract")
  }

  if (errors.length > 0) {
    throw new Error(`[content:version] ${errors.length} error(s):\n${errors.map((error) => `  - ${error}`).join("\n")}`)
  }
  return version
}

if (require.main === module) {
  try {
    const version = validateContentVersion()
    console.log(`[content:version] OK (content ${version.contentSchemaVersion}, catalog ${version.catalogVersion}, save ${version.saveSchemaVersion})`)
  } catch (error) {
    console.error(error?.message ?? error)
    process.exit(1)
  }
}

module.exports = { validateContentVersion }
