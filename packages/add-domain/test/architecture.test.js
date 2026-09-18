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

console.log("add-domain architecture boundary: all assertions passed")
