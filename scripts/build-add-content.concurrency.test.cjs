#!/usr/bin/env node
// The content generator must tolerate being run concurrently.
//
// It formats each catalog through a scratch file before comparing it to the
// committed Rust. That scratch path used to be derived only from the catalog's
// name and placed in `os.tmpdir()`, which every process on the machine shares:
// two runs would write, rustfmt, read and unlink one path, and whichever lost
// the race died with ENOENT. Because the collision is machine-wide rather than
// checkout-wide, it struck agents working in entirely separate worktrees, and
// it surfaced as an intermittently failing local CI gate rather than as an
// obvious bug.
//
// Run in --check mode so the test never writes into the repository.

const assert = require("node:assert")
const path = require("node:path")
const { execFile } = require("node:child_process")

const GENERATOR = path.join(__dirname, "build-add-content.cjs")
const CONCURRENT_RUNS = 3

function runGenerator() {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [GENERATOR, "--check"],
      { cwd: path.join(__dirname, "..") },
      (error, stdout, stderr) => resolve({ code: error ? (error.code ?? 1) : 0, stderr }),
    )
  })
}

async function main() {
  const results = await Promise.all(
    Array.from({ length: CONCURRENT_RUNS }, () => runGenerator()),
  )

  const failed = results.filter((result) => result.code !== 0)
  assert.deepEqual(
    failed.map((result) => result.stderr.trim().split("\n")[0]),
    [],
    `${failed.length} of ${CONCURRENT_RUNS} concurrent generator runs failed; the scratch path is colliding again`,
  )

  console.log(`build-add-content concurrency: ${CONCURRENT_RUNS} simultaneous runs all passed.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
