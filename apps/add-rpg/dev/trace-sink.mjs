import { appendFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

/** Keep roughly the last hour of activity; older lines and quiet sessions are purged. */
const RETENTION_MS = 60 * 60 * 1000
/** How often the background purge runs. */
const SWEEP_MS = 60 * 1000

/**
 * Per-file mutex: chains async work for a given path so an append and a purge
 * never read-modify-write the same file concurrently (which would drop lines).
 */
const fileLocks = new Map()
function withFileLock(path, fn) {
  const prev = fileLocks.get(path) ?? Promise.resolve()
  const next = prev.then(fn, fn)
  // Tail never rejects, so the chain keeps flowing after a failed op.
  fileLocks.set(
    path,
    next.then(
      () => {},
      () => {},
    ),
  )
  return next
}

/** Parse a line's monotonic timestamp (`t`), or undefined if absent/unparseable. */
function lineTime(line) {
  try {
    const t = JSON.parse(line).t
    return typeof t === "number" ? t : undefined
  } catch {
    return undefined
  }
}

/**
 * Dev-only Vite middleware: accepts batched NDJSON trace lines from the browser
 * and appends them to `logs/session-<id>.jsonl` at the repo root. A background
 * sweep keeps total retention bounded (see RETENTION_MS).
 *
 * `apply: "serve"` means this is wired into the dev server only — it is never
 * part of a production build, so the `/__trace` endpoint cannot ship.
 */
export function traceSink() {
  // trace-sink.mjs lives at apps/add-rpg/dev/, so the repo root is three up.
  const repoRoot = fileURLToPath(new URL("../../..", import.meta.url))
  const logsDir = `${repoRoot}/logs`

  return {
    name: "add-trace-sink",
    apply: "serve",
    configureServer(server) {
      const logger = server.config.logger

      /** Trim aged-out lines from one session file, or delete it if quiet/empty. */
      async function pruneFile(path, now) {
        try {
          const info = await stat(path)
          // A session that has not been written to within the window: drop whole.
          if (now - info.mtimeMs > RETENTION_MS) {
            await rm(path, { force: true })
            return
          }
          const lines = (await readFile(path, "utf8")).split("\n").filter((l) => l.length > 0)
          if (lines.length === 0) {
            await rm(path, { force: true })
            return
          }
          // Every line in a file shares one performance.now() origin, so keep the
          // last RETENTION_MS of activity measured against the newest line.
          let maxT = 0
          for (const line of lines) {
            const t = lineTime(line)
            if (t !== undefined && t > maxT) maxT = t
          }
          const cutoff = maxT - RETENTION_MS
          // Keep timestampless lines defensively — never silently discard data we can't judge.
          const kept = lines.filter((line) => {
            const t = lineTime(line)
            return t === undefined || t >= cutoff
          })
          if (kept.length === lines.length) return
          if (kept.length === 0) {
            await rm(path, { force: true })
            return
          }
          await writeFile(path, `${kept.join("\n")}\n`)
        } catch (err) {
          if (err && err.code !== "ENOENT") {
            logger.warn(`[trace-sink] prune failed for ${path}: ${String(err)}`)
          }
        }
      }

      /** Sweep every session file once. */
      async function sweep() {
        let names
        try {
          names = await readdir(logsDir)
        } catch {
          return // logs dir not created yet — nothing to purge.
        }
        const now = Date.now()
        await Promise.all(
          names
            .filter((name) => name.startsWith("session-") && name.endsWith(".jsonl"))
            .map((name) => {
              const path = `${logsDir}/${name}`
              return withFileLock(path, () => pruneFile(path, now))
            }),
        )
      }

      // Purge leftovers from previous runs immediately, then on a regular interval.
      void sweep()
      const timer = setInterval(() => void sweep(), SWEEP_MS)
      timer.unref?.() // don't keep the process alive for the sweep alone.
      server.httpServer?.once("close", () => clearInterval(timer))

      server.middlewares.use("/__trace", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405
          res.end()
          return
        }
        const session = String(req.headers["x-trace-session"] ?? "unknown").replace(/[^\w.-]/g, "_")
        const path = `${logsDir}/session-${session}.jsonl`
        let body = ""
        req.on("data", (chunk) => {
          body += chunk
        })
        req.on("end", async () => {
          try {
            const lines = body.endsWith("\n") ? body : `${body}\n`
            await withFileLock(path, async () => {
              await mkdir(logsDir, { recursive: true })
              await appendFile(path, lines)
            })
            res.statusCode = 204
            res.end()
          } catch (err) {
            logger.error(`[trace-sink] failed to append: ${String(err)}`)
            res.statusCode = 500
            res.end()
          }
        })
      })
    },
  }
}
