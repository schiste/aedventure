#!/usr/bin/env node
// Lore <-> content link integrity. The boundary check for the edge described in
// docs/lore-engine-content-bricks.md: content cites lore, lore never cites
// content.
//
//   node scripts/lore-refs.cjs             # human report
//   node scripts/lore-refs.cjs --check     # non-zero exit on a broken link
//   node scripts/lore-refs.cjs --json      # machine-readable, for agents
//
// Errors (fail --check):
//   - a loreRef whose path does not exist, or points outside lore/
//   - a loreRef whose #anchor matches no heading on that page
//   - a loreRef for a content ID the registry does not know
//   - two refs for the same content ID
//
// Reported but not fatal:
//   - content IDs in a lore-linked family with no ref (canon gap)
//   - lore subjects nothing implements (the "world knows, game cannot show"
//     backlog)

const fs = require("node:fs")
const path = require("node:path")

const { ROOT, buildRegistry, loadContent } = require("./add-content-registry.cjs")

const CHECK = process.argv.includes("--check")
const JSON_OUT = process.argv.includes("--json")
const LORE_DIR = path.join(ROOT, "lore")

// Index and template pages are navigation or scaffolding, not subjects.
const NON_SUBJECT = /^(README|index|.*_TEMPLATE.*|pages-to-create|Lore_todo|progress_report)$/i

function loadLoreRefs() {
  const distPath = path.join(ROOT, "packages/add-content/dist/content/lore-refs.js")
  if (!fs.existsSync(distPath)) {
    throw new Error(
      "ADD content dist files are missing. Run `npm --workspace @aedventure/add-content run build` first.",
    )
  }
  return require(distPath)
}

/** GitHub-style heading slug, so `## The Crystal` is reachable as `#the-crystal`. */
function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
}

function headingSlugs(absolutePath) {
  const text = fs.readFileSync(absolutePath, "utf8")
  const slugs = new Set()
  for (const line of text.split("\n")) {
    const match = /^#{1,6}\s+(.*)$/.exec(line)
    if (match) slugs.add(slug(match[1]))
  }
  return slugs
}

function loreSubjectPages() {
  const pages = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolutePath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(absolutePath)
      } else if (entry.name.endsWith(".md") && !NON_SUBJECT.test(entry.name.replace(/\.md$/, ""))) {
        pages.push(path.relative(ROOT, absolutePath))
      }
    }
  }
  walk(LORE_DIR)
  return pages.sort()
}

function main() {
  const { LORE_REFS, LORE_LINKED_FAMILIES } = loadLoreRefs()
  const registry = buildRegistry(loadContent())

  const contentIds = new Map()
  for (const node of registry.nodes.values()) contentIds.set(node.id, node.family)

  const errors = []
  const seen = new Map()
  const referencedPages = new Set()

  for (const entry of LORE_REFS) {
    const { contentId, loreRef } = entry

    if (seen.has(contentId)) {
      errors.push(`duplicate loreRef for content ID "${contentId}"`)
      continue
    }
    seen.set(contentId, loreRef)

    if (!contentIds.has(contentId)) {
      errors.push(`loreRef names unknown content ID "${contentId}" (-> ${loreRef})`)
      continue
    }

    const [relativePath, anchor] = loreRef.split("#")
    if (!relativePath.startsWith("lore/")) {
      errors.push(`loreRef for "${contentId}" points outside lore/: ${loreRef}`)
      continue
    }

    const absolutePath = path.join(ROOT, relativePath)
    if (!fs.existsSync(absolutePath)) {
      errors.push(`loreRef for "${contentId}" does not resolve: ${relativePath}`)
      continue
    }
    referencedPages.add(relativePath)

    if (anchor && !headingSlugs(absolutePath).has(anchor)) {
      errors.push(`loreRef for "${contentId}" has no heading "#${anchor}" in ${relativePath}`)
    }
  }

  const linkedFamilies = new Set(LORE_LINKED_FAMILIES)
  const unlinkedContent = []
  for (const [id, family] of contentIds) {
    if (linkedFamilies.has(family) && !seen.has(id)) unlinkedContent.push({ id, family })
  }
  unlinkedContent.sort((a, b) => a.id.localeCompare(b.id))

  const unimplementedLore = loreSubjectPages().filter((page) => !referencedPages.has(page))

  const report = {
    contract: "lore_refs_v1",
    ok: errors.length === 0,
    errors,
    linked: LORE_REFS.length,
    linkedFamilies: [...linkedFamilies].sort(),
    unlinkedContent,
    unimplementedLoreCount: unimplementedLore.length,
    unimplementedLore,
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log("Lore <-> Content Links")
    console.log(`Status: ${report.ok ? "OK" : "BROKEN"}`)
    console.log(`Linked content IDs: ${report.linked}`)
    for (const error of errors) console.error(`  ERROR ${error}`)

    console.log(`\nUnlinked content in lore-linked families: ${unlinkedContent.length}`)
    for (const { id, family } of unlinkedContent.slice(0, 20)) console.log(`  ${family.padEnd(12)} ${id}`)
    if (unlinkedContent.length > 20) console.log(`  ... and ${unlinkedContent.length - 20} more`)

    console.log(`\nLore subjects no content implements: ${unimplementedLore.length}`)
    for (const page of unimplementedLore.slice(0, 10)) console.log(`  ${page}`)
    if (unimplementedLore.length > 10) console.log(`  ... and ${unimplementedLore.length - 10} more`)
  }

  if (CHECK && errors.length > 0) {
    console.error(`\n[lore:refs:check] ${errors.length} broken link(s).`)
    process.exit(1)
  }
}

try {
  main()
} catch (error) {
  console.error(error?.message ?? error)
  process.exit(1)
}
