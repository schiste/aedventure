"use strict"

/**
 * One dependency graph, checked against the three places that still enumerate it.
 *
 * `package.json` declares `workspaces: ["apps/*", "packages/*"]`, so npm is the
 * mechanism that resolves `@aedventure/*` for both `tsc` and the test scripts.
 * Two files still hand-maintain a list on top of that, and a third used to:
 *
 * - `tsconfig.base.json` `compilerOptions.paths` — the path map.
 * - `apps/add-rpg/vite.config.mjs` `resolve.alias` — the browser's path map.
 * - `scripts/stack-gate-common.sh` had a symlink farm listing 20 of the 22
 *   packages. It was removed: npm already does it, and it was wrong.
 *
 * Nothing compared those lists to each other, so adding a package meant editing
 * several files and nothing complained if you edited some of them. In practice
 * `@aedventure/add-ui` was missing from the app's `package.json` dependencies and
 * from the path map entirely, and resolved only because `npm install` hoisted
 * it.
 *
 * This check makes the two remaining lists a view of reality instead of a copy.
 * A missing entry fails; an entry with no directory fails. Nothing is
 * hardcoded here, so a new package is picked up automatically.
 */

const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")

const ROOT_DIR = path.resolve(__dirname, "..")

/**
 * Reduce a specifier to its package, so a sub-path export
 * (`@aedventure/game-renderer-phaser/hex-geometry`) is satisfied by declaring
 * the package it lives in.
 */
function packageNameOf(specifier) {
  const withoutScope = specifier.slice("@aedventure/".length)
  const slash = withoutScope.indexOf("/")
  return slash === -1 ? specifier : `@aedventure/${withoutScope.slice(0, slash)}`
}

function workspacePackageNames() {
  const names = []
  for (const group of ["packages", "apps"]) {
    const dir = path.join(ROOT_DIR, group)
    if (!fs.existsSync(dir)) continue
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      // A workspace directory is a package when it declares a package.json with
      // a name. Anything else in packages/ or apps/ is not part of the graph.
      const manifest = path.join(dir, entry.name, "package.json")
      if (!fs.existsSync(manifest)) continue
      try {
        const declared = JSON.parse(fs.readFileSync(manifest, "utf8")).name
        if (typeof declared === "string" && declared.startsWith("@aedventure/")) {
          names.push(declared)
        }
      } catch {
        // A malformed manifest is the workspace's problem to report, not ours.
      }
    }
  }
  return names.sort()
}

function tsconfigPathEntries() {
  const base = readJsonc(path.join(ROOT_DIR, "tsconfig.base.json"))
  return Object.keys(base?.compilerOptions?.paths ?? {}).sort()
}

function viteAliasEntries() {
  const text = fs.readFileSync(
    path.join(ROOT_DIR, "apps/add-rpg/vite.config.mjs"),
    "utf8",
  )
  // `packageSource("<name>")` is the only way an alias is declared in that file.
  const names = new Set()
  for (const match of text.matchAll(/packageSource\(\s*"([^"]+)"\s*\)/g)) {
    names.add(`@aedventure/${match[1]}`)
  }
  return [...names].sort()
}

/** tsconfig files carry comments, so they are not plain JSON. */
function readJsonc(absolutePath) {
  return JSON.parse(fs.readFileSync(absolutePath, "utf8").replace(/^\s*\/\/.*$/gm, ""))
}

/**
 * Workspace packages that contain JSX sources.
 *
 * Only `add-ui` today. Computed rather than listed, so a second JSX package is
 * covered the moment it appears.
 */
function jsxWorkspacePackages() {
  const found = []
  const containsJsx = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist") continue
        if (containsJsx(full)) return true
      } else if (/\.(tsx|jsx)$/.test(entry.name)) {
        return true
      }
    }
    return false
  }
  for (const name of workspacePackageNames()) {
    const relative = name.slice("@aedventure/".length)
    for (const group of ["packages", "apps"]) {
      const srcDir = path.join(ROOT_DIR, group, relative, "src")
      if (fs.existsSync(srcDir) && containsJsx(srcDir)) {
        found.push(name)
        break
      }
    }
  }
  return found
}

function appDependencyGaps() {
  // Every workspace package an app imports must be one of its dependencies.
  // Walking the app's own sources is deliberate: it is the usage that matters,
  // not a list someone has to remember to update.
  const gaps = []
  const appDirs = ["apps/add-rpg", "apps/web", "apps/api", "apps/engine-sandbox"]
  for (const app of appDirs) {
    const manifestPath = path.join(ROOT_DIR, app, "package.json")
    if (!fs.existsSync(manifestPath)) continue
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    const declared = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ])
    const srcDir = path.join(ROOT_DIR, app, "src")
    if (!fs.existsSync(srcDir)) continue
    const specifiers = new Set()
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          // Generated WASM bindings are not the app's imports to declare.
          if (entry.name === "generated") continue
          walk(full)
        } else if (/\.(ts|tsx|mts)$/.test(entry.name)) {
          const text = fs.readFileSync(full, "utf8")
          for (const match of text.matchAll(/from\s+"(@aedventure\/[^"]+)"/g)) {
            specifiers.add(match[1])
          }
        }
      }
    }
    walk(srcDir)
    // Declaring the package covers its sub-path exports, so match on the
    // package prefix the way the path-map check does.
    const declaredPackages = new Set(
      [...declared].map((name) => packageNameOf(name)),
    )
    for (const specifier of [...specifiers].sort()) {
      if (!declaredPackages.has(packageNameOf(specifier))) {
        gaps.push(`${app} imports ${specifier} but does not declare it`)
      }
    }
  }
  return gaps
}

function main() {
  const packages = workspacePackageNames()
  assert.ok(
    packages.length > 0,
    "Expected to find @aedventure workspace packages under packages/ and apps/.",
  )

  const tsconfigPaths = tsconfigPathEntries()
  const viteAliases = viteAliasEntries()
  const jsxPackages = jsxWorkspacePackages()

  // The path map must not point at a package that does not exist.
  const dangling = tsconfigPaths.filter((entry) => !packages.includes(packageNameOf(entry)))
  assert.deepEqual(
    dangling,
    [],
    `tsconfig.base.json maps paths with no workspace package: ${dangling.join(", ")}.`,
  )

  // A JSX package must never be mapped to source by a consumer.
  //
  // `paths` points at `src`, so TypeScript compiles those sources into the
  // consumer's own program -- with the consumer's JSX settings, not the
  // package's. `@aedventure/add-ui` is the one package with `.tsx` sources, and
  // it compiles with `jsx: preserve`, which Solid's babel plugin requires
  // because tsc must not transform the JSX itself. An app that mapped it to
  // source compiled it under the app's settings and then reported every one of
  // its named exports as missing: 15 errors naming `Button`, `Chip`,
  // `CinematicStage` and the rest, with no error at the import site.
  //
  // The gate did not catch it either, because `tsc -b` is incremental and a
  // stale `.tsbuildinfo` meant the app was never re-checked.
  //
  // A reference resolves to the package's build output and is always correct.
  assert.deepEqual(
    jsxPackages.filter((name) => tsconfigPaths.includes(name)),
    [],
    `tsconfig.base.json maps JSX package(s) ${jsxPackages
      .filter((name) => tsconfigPaths.includes(name))
      .join(", ")} to source. A consumer must reference them instead: mapping a ` +
      `.tsx package to src compiles it under the consumer's JSX settings.`,
  )

  // The Vite alias list is a deliberate partial optimisation layer — it points
  // at `src` for the packages the browser bundle needs from source, and the rest
  // resolve through node_modules to their built output. So it is allowed to be
  // incomplete, but not to name something that does not exist.
  const danglingAliases = viteAliases.filter(
    (entry) => !packages.includes(packageNameOf(entry)),
  )
  assert.deepEqual(
    danglingAliases,
    [],
    `vite.config.mjs aliases packages that do not exist: ${danglingAliases.join(", ")}.`,
  )

  // Every app that imports a workspace package must declare it.
  const gaps = appDependencyGaps()
  assert.deepEqual(
    gaps,
    [],
    `An app imports a workspace package it does not declare:\n  ${gaps.join("\n  ")}\n` +
      "Declare it in that app's package.json, or it only resolves by accident.",
  )

  console.log(
    `Workspace graph: OK — ${packages.length} packages, ` +
      `${tsconfigPaths.length} tsconfig paths (${jsxPackages.length} JSX packages, none mapped), ` +
      `${viteAliases.length} vite aliases, ` +
      "no undeclared app imports.",
  )
}

main()
