const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")

const packageJson = require("../package.json")
const rendererPolicies = fs.readFileSync(
  path.join(__dirname, "../../add-presentation/src/adapters/renderer-policies.ts"),
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
  "packages/add-protocol/src",
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
const loreRefModule = path.join(repoRoot, "packages/add-content/src/content/lore-refs.ts")
assert.ok(
  fs.existsSync(loreRefModule),
  "Content brick must declare its lore links in content/lore-refs.ts.",
)

for (const file of sourceFiles("packages/add-content/src", [".ts"])
  .concat(sourceFiles("packages/add-presentation/src", [".ts"]))
  .concat(sourceFiles("packages/add-runtime-client/src", [".ts"]))) {
  if (file === loreRefModule) continue
  assert.doesNotMatch(
    fs.readFileSync(file, "utf8"),
    LORE_PATH,
    `Content brick may cite lore only from content/lore-refs.ts: ${path.relative(repoRoot, file)}`,
  )
}

// The protocol package is the boundary contract: types only, no dependencies,
// so anything may depend on it and it depends on nothing. A dependency here
// would let content or presentation leak across the boundary it describes.
const protocolManifest = require("../../add-protocol/package.json")
assert.equal(
  protocolManifest.dependencies,
  undefined,
  "@aedventure/add-protocol must stay dependency-free; it is the boundary contract.",
)

for (const file of sourceFiles("packages/add-protocol/src", [".ts"])) {
  assert.doesNotMatch(
    fs.readFileSync(file, "utf8"),
    /@aedventure\//,
    `Protocol package must not import workspace packages: ${path.relative(repoRoot, file)}`,
  )
}

// --- Lane separation
//
// `packages/game-*` is not one shared engine. Measured by consumer, it is
// three clusters, and the prefix hides which is which:
//
//   shared      game-topology, game-renderer-phaser  (both lanes import them)
//   ADD only    game-world, game-visibility, game-content, game-dungeon,
//               game-animation
//   office only game-core, game-protocol, game-map, game-input, game-assets
//
// The office lane is a different product. Keeping the two from importing each
// other is what lets either move later without dragging the other along.

const OFFICE_ONLY = [
  "game-core",
  "game-protocol",
  "game-map",
  "game-input",
  "game-assets",
  "asset-registry",
  "office-domain",
  "policy",
  "auth-wikimedia",
  "shared-types",
]

const ADD_PACKAGES = ["add-protocol", "add-content", "add-presentation", "add-runtime-client"]

for (const name of ADD_PACKAGES) {
  for (const file of sourceFiles(`packages/${name}/src`, [".ts"])) {
    const text = fs.readFileSync(file, "utf8")
    for (const office of OFFICE_ONLY) {
      assert.doesNotMatch(
        text,
        new RegExp(`@aedventure/${office}["/]`),
        `ADD lane must not import the office-only package ${office}: ${path.relative(repoRoot, file)}`,
      )
    }
  }
}

for (const office of OFFICE_ONLY) {
  for (const file of sourceFiles(`packages/${office}/src`, [".ts"])) {
    const text = fs.readFileSync(file, "utf8")
    for (const name of ADD_PACKAGES) {
      assert.doesNotMatch(
        text,
        new RegExp(`@aedventure/${name}["/]`),
        `Office lane must not import the ADD package ${name}: ${path.relative(repoRoot, file)}`,
      )
    }
  }
}

// The retired compatibility facades must not come back by import.
for (const dead of ["protocol", "map-engine"]) {
  assert.ok(
    !fs.existsSync(path.join(repoRoot, "packages", dead)),
    `packages/${dead} was retired as an unconsumed facade; do not reintroduce it.`,
  )
}

console.log("brick architecture boundary: all assertions passed")
