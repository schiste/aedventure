const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")

const packageJson = require("../package.json")
const rendererPolicies = fs.readFileSync(
  path.join(__dirname, "../src/adapters/renderer-policies.ts"),
  "utf8",
)

assert.equal(
  packageJson.dependencies?.["@aedventure/game-renderer-phaser"],
  undefined,
  "ADD domain adapters must not depend on the Phaser renderer package.",
)
assert.match(
  rendererPolicies,
  /@aedventure\/game-world/,
  "ADD renderer adapters must consume neutral game-world policy types.",
)
assert.doesNotMatch(
  rendererPolicies,
  /@aedventure\/game-renderer-phaser/,
  "ADD domain adapters must not import renderer-owned types.",
)

// --- Brick direction: lore -> content -> engine
// See docs/lore-engine-content-bricks.md. The engine must run without knowing
// lore exists, and content may cite lore only through the one declared edge.
// These assertions keep the back-edges from appearing by accident.

const repoRoot = path.join(__dirname, "../../..")

function sourceFiles(relativeDir, extensions) {
  const absoluteDir = path.join(repoRoot, relativeDir)
  if (!fs.existsSync(absoluteDir)) return []
  const found = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "target") continue
      const absolutePath = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(absolutePath)
      else if (extensions.some((extension) => entry.name.endsWith(extension))) found.push(absolutePath)
    }
  }
  walk(absoluteDir)
  return found
}

// A path mention of the lore directory. Deliberately narrow: it catches a read
// or an import, not the word "lore" in prose.
const LORE_PATH = /["'`(]\s*\.{0,2}\/?lore\//

const engineDirs = [
  "crates/add-core/src",
  "crates/add-web-bindings/src",
  "crates/add-scenario/src",
  ...fs
    .readdirSync(path.join(repoRoot, "packages"))
    .filter((name) => name.startsWith("game-"))
    .map((name) => `packages/${name}/src`),
]

for (const dir of engineDirs) {
  for (const file of sourceFiles(dir, [".rs", ".ts"])) {
    assert.doesNotMatch(
      fs.readFileSync(file, "utf8"),
      LORE_PATH,
      `Engine brick must not read lore: ${path.relative(repoRoot, file)}`,
    )
  }
}

// Content may cite lore, but only through the declared registry, so there is
// exactly one place to audit and one place the generator must keep out of Rust.
const loreRefModule = path.join(__dirname, "../src/content/lore-refs.ts")
assert.ok(
  fs.existsSync(loreRefModule),
  "Content brick must declare its lore links in content/lore-refs.ts.",
)

for (const file of sourceFiles("packages/add-domain/src", [".ts"])) {
  if (file === loreRefModule) continue
  assert.doesNotMatch(
    fs.readFileSync(file, "utf8"),
    LORE_PATH,
    `Content brick may cite lore only from content/lore-refs.ts: ${path.relative(repoRoot, file)}`,
  )
}

console.log("add-domain architecture boundary: all assertions passed")
