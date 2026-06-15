import type { AddGameEvent, SimulationSnapshot, TraceEntry } from "@aedventure/add-domain"

/**
 * Local-mode verbose tracing.
 *
 * Captures the full simulation protocol — every command sent to the worker, every
 * event received, and every semantic `add-game-event` — and streams it as NDJSON
 * to the dev-only `/__trace` sink (see apps/add-rpg/dev/trace-sink.mjs), which
 * appends it to `logs/session-*.jsonl`.
 *
 * Everything is gated behind `import.meta.env.DEV`: in a production build
 * `installTraceRecorder` returns a no-op and nothing here runs.
 *
 * Analyse a session afterwards with jq, e.g.:
 *   jq -c 'select(.kind=="combat_resolved")'        logs/session-*.jsonl
 *   jq -c 'select(.dir=="event" and .latencyMs>16)' logs/session-*.jsonl
 */

/** Injected at build time by vite.config.mjs `define`. */
declare const __ADD_GIT_SHA__: string

const DEV = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV)

/** Full snapshot bodies are huge and largely redundant tick-to-tick. By default
 *  we keep only the per-frame `events[]` (the real signal) plus the message type.
 *  Flip this to true if you need the entire reconstructed state on every tick. */
const KEEP_FULL_SNAPSHOTS = false

const SESSION = new Date().toISOString().replace(/[:.]/g, "-")
const FLUSH_MS = 1000
const MAX_BATCH = 200

const buffer: string[] = []
let flushTimer: ReturnType<typeof setTimeout> | undefined
let warnedSinkDown = false
/** Set while the recorder logs its own diagnostics, so console capture skips them (no recursion). */
let suppressCapture = false

function enqueue(record: unknown): void {
  buffer.push(JSON.stringify(record))
  if (buffer.length >= MAX_BATCH) flush()
  else if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_MS)
}

function flush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = undefined
  }
  if (buffer.length === 0) return
  // Lead each batch with a wall-clock checkpoint so monotonic `t` stays alignable
  // to real time even if the system clock is adjusted mid-session.
  const clock = JSON.stringify({ t: performance.now(), dir: "clock", epoch: Date.now() })
  const body = `${clock}\n${buffer.join("\n")}\n`
  buffer.length = 0
  // keepalive lets the final batch survive a page nav / refresh.
  void fetch("/__trace", {
    method: "POST",
    headers: { "content-type": "application/x-ndjson", "x-trace-session": SESSION },
    body,
    keepalive: true,
  }).catch(() => {
    if (!warnedSinkDown) {
      warnedSinkDown = true
      suppressCapture = true
      console.warn("[trace] /__trace sink unreachable — trace lines are being dropped")
      suppressCapture = false
    }
  })
}

/** Trim payloads that carry bulky, low-signal blobs while keeping their useful shape. */
function trimPayload(payload: TraceEntry["payload"]): unknown {
  if (!KEEP_FULL_SNAPSHOTS && "snapshot" in payload && payload.snapshot) {
    return { type: payload.type, events: payload.snapshot.events }
  }
  // Delta sections are surfaced compactly via the `changed` leaf map, so drop the
  // bulky raw delta (e.g. the whole resources object on every tick).
  if (!KEEP_FULL_SNAPSHOTS && payload.type === "snapshotDelta") {
    return { type: "snapshotDelta" }
  }
  // Save/import blobs dominate log volume (~70%) and add no debugging value;
  // keep only their size. Flip KEEP_FULL_SNAPSHOTS to retain everything.
  if (
    !KEEP_FULL_SNAPSHOTS &&
    (payload.type === "save" || payload.type === "importSave") &&
    typeof payload.payload === "string"
  ) {
    return { type: payload.type, saveBytes: payload.payload.length }
  }
  return payload
}

// ── Changed-leaf capture ────────────────────────────────────────────────────
// A compact flat map of primitive leaves that moved this frame (path -> new
// value), so the trace never hides a live signal behind the curated ctx. Handles
// Map-typed sections (stations, crewByRole, activeJobs) that JSON.stringify would
// otherwise flatten to "{}".

const MAX_CHANGED_LEAVES = 200

let lastLeaves = new Map<string, unknown>()
let leavesSeeded = false

/** Flatten objects / arrays / Maps into primitive leaves keyed by dotted path. */
function flattenInto(value: unknown, path: string, out: Map<string, unknown>): void {
  if (value instanceof Map) {
    for (const [k, v] of value) flattenInto(v, path ? `${path}.${String(k)}` : String(k), out)
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => flattenInto(v, `${path}.${i}`, out))
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) flattenInto(v, path ? `${path}.${k}` : k, out)
  } else {
    out.set(path, value)
  }
}

/** Primitive leaves that changed since the last frame; undefined if nothing moved. */
function changedLeaves(payload: TraceEntry["payload"]): Record<string, unknown> | undefined {
  let sections: Record<string, unknown> | undefined
  let isFull = false
  if ("snapshot" in payload && payload.snapshot) {
    sections = payload.snapshot as unknown as Record<string, unknown>
    isFull = true
  } else if (payload.type === "snapshotDelta") {
    sections = payload.changed as unknown as Record<string, unknown>
  }
  if (!sections) return undefined

  const next = new Map<string, unknown>()
  for (const [key, value] of Object.entries(sections)) {
    if (key === "events") continue // captured separately as dir:"game"
    flattenInto(value, key, next)
  }

  // Seed silently on the first snapshot rather than reporting the whole state.
  if (!leavesSeeded) {
    lastLeaves = next
    leavesSeeded = true
    return undefined
  }

  const changed: Record<string, unknown> = {}
  let count = 0
  let overflow = 0
  for (const [path, value] of next) {
    if (lastLeaves.get(path) !== value) {
      if (count < MAX_CHANGED_LEAVES) {
        changed[path] = value
        count += 1
      } else {
        overflow += 1
      }
    }
    lastLeaves.set(path, value)
  }
  // A full snapshot is authoritative — forget leaves that no longer exist.
  if (isFull) {
    for (const path of [...lastLeaves.keys()]) {
      if (!next.has(path)) lastLeaves.delete(path)
    }
  }
  if (overflow) changed.__more = overflow
  return count || overflow ? changed : undefined
}

// ── Performance sampling ────────────────────────────────────────────────────
// Render / main-thread perf is time-sampled (a rate, not a per-command fact), so
// it rides its own `dir:"perf"` stream rather than bloating every ctx.

const PERF_SAMPLE_MS = 1000
/** A frame slower than this is a visible hitch (well past the ~16.7ms 60fps budget). */
const JANK_FRAME_MS = 50

interface PerfMemory {
  readonly usedJSHeapSize: number
  readonly totalJSHeapSize: number
  readonly jsHeapSizeLimit: number
}

/** Latest worker back-pressure seen at the boundary, folded into each perf sample. */
let lastQueueDepth = 0
/** Seq of the command currently being processed, so game events can be linked to it. */
let lastSeq = 0
/** Whether the tab is backgrounded — stamped on perf samples so background
 *  artifacts (throttled timers, multi-second frames) can be filtered out. */
let documentHidden = false

/**
 * One-shot session header: the environment needed to interpret everything else.
 * `timeOrigin` is the anchor — any line's wall-clock time is `timeOrigin + t`.
 * Emitted after a short rAF probe so the display refresh rate is included.
 */
function recordSessionHeader(): void {
  const env = {
    dir: "session",
    kind: "header",
    session: SESSION,
    timeOrigin: Math.round(performance.timeOrigin),
    startedAt: new Date(performance.timeOrigin).toISOString(),
    mode: (import.meta as { env?: { MODE?: string } }).env?.MODE ?? "unknown",
    sha: typeof __ADD_GIT_SHA__ === "string" ? __ADD_GIT_SHA__ : "unknown",
    url: location.href,
    ua: navigator.userAgent,
    lang: navigator.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dpr: window.devicePixelRatio,
    cores: navigator.hardwareConcurrency ?? null,
    memGB: (navigator as { deviceMemory?: number }).deviceMemory ?? null,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    screen: { w: window.screen.width, h: window.screen.height },
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  }
  // Estimate the display refresh rate from a short frame-interval probe.
  const gaps: number[] = []
  let last = 0
  let frames = 0
  const probe = (ts: number): void => {
    if (last) gaps.push(ts - last)
    last = ts
    frames += 1
    if (frames <= 15) {
      requestAnimationFrame(probe)
      return
    }
    gaps.sort((a, b) => a - b)
    const median = gaps[Math.floor(gaps.length / 2)] || 0
    enqueue({ t: performance.now(), ...env, refreshHz: median ? Math.round(1000 / median) : null })
  }
  requestAnimationFrame(probe)
}

/** One-shot boot timing: navigation + paint milestones. Deferred until the `load`
 *  event so domContentLoaded/load/paint are actually populated (they read 0 if
 *  sampled mid-load, while the tracer is installing). */
function recordStartupPerf(): void {
  const emit = (): void => {
    try {
      const nav = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined
      const paints = performance.getEntriesByType("paint")
      const fp = paints.find((p) => p.name === "first-paint")?.startTime
      const fcp = paints.find((p) => p.name === "first-contentful-paint")?.startTime
      enqueue({
        t: performance.now(),
        dir: "perf",
        kind: "startup",
        ...(nav
          ? {
              domInteractiveMs: Math.round(nav.domInteractive),
              domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
              loadMs: Math.round(nav.loadEventEnd),
            }
          : {}),
        ...(fp !== undefined ? { firstPaintMs: Math.round(fp) } : {}),
        ...(fcp !== undefined ? { firstContentfulPaintMs: Math.round(fcp) } : {}),
      })
    } catch {
      // Timing APIs unavailable — startup metrics are best-effort.
    }
  }
  // `loadEventEnd` is only set after the load event finishes dispatching, so defer
  // one task past it; reading inside the handler itself yields 0.
  if (document.readyState === "complete") emit()
  else window.addEventListener("load", () => setTimeout(emit, 0), { once: true })
}

/** Begin per-second frame/jank/heap sampling. Returns a stop function. */
function startPerfSampling(): () => void {
  const frameMs: number[] = []
  let lastTs = 0
  let raf = requestAnimationFrame(function onFrame(ts) {
    if (lastTs) frameMs.push(ts - lastTs)
    lastTs = ts
    raf = requestAnimationFrame(onFrame)
  })

  let longTasks = 0
  let blockingMs = 0
  let observer: PerformanceObserver | undefined
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasks += 1
        blockingMs += entry.duration
      }
    })
    observer.observe({ entryTypes: ["longtask"] })
  } catch {
    // longtask observation unsupported (e.g. Firefox); frame timing still works.
  }

  // Event-loop lag: a self-rescheduling probe whose firing delay measures how long
  // the main thread was unavailable — saturation, distinct from messaging cost. This
  // is what attributes a tick's "transport" time to main-thread blocking vs the wire.
  const LAG_PROBE_MS = 100
  let lagMax = 0
  let lagSum = 0
  let lagCount = 0
  let lagLast = performance.now()
  let lagTimer = setTimeout(function lagProbe() {
    const now = performance.now()
    const lag = now - lagLast - LAG_PROBE_MS // how much later than scheduled it fired
    lagLast = now
    if (lag > 0) {
      if (lag > lagMax) lagMax = lag
      lagSum += lag
      lagCount += 1
    }
    lagTimer = setTimeout(lagProbe, LAG_PROBE_MS)
  }, LAG_PROBE_MS)

  const sample = (): void => {
    const samples = frameMs.splice(0)
    const n = samples.length
    const sum = samples.reduce((a, b) => a + b, 0)
    const avg = n ? sum / n : 0
    const sorted = [...samples].sort((a, b) => a - b)
    const p95 = n ? sorted[Math.min(n - 1, Math.floor(0.95 * n))] : 0
    const mem = (performance as unknown as { memory?: PerfMemory }).memory

    // App-supplied accumulator counts (e.g. Phaser display list / tweens). The
    // renderer publishes this dev-only window hook; absent in prod.
    const appProbe = (window as unknown as { __ADD_MEM_PROBE?: () => Record<string, number> })
      .__ADD_MEM_PROBE
    let probed: Record<string, number> = {}
    if (appProbe) {
      try {
        probed = appProbe()
      } catch {
        /* a bad probe must not break sampling */
      }
    }

    enqueue({
      t: performance.now(),
      dir: "perf",
      kind: "sample",
      fps: avg ? Math.round(1000 / avg) : 0,
      frameMsAvg: Math.round(avg * 10) / 10,
      frameMsP95: Math.round(p95 * 10) / 10,
      frameMsMax: n ? Math.round(Math.max(...samples) * 10) / 10 : 0,
      jankFrames: samples.filter((d) => d >= JANK_FRAME_MS).length,
      longTasks,
      blockingMs: Math.round(blockingMs),
      // Worst / average event-loop stall this window — main-thread saturation.
      loopLagMaxMs: Math.round(lagMax * 10) / 10,
      ...(lagCount ? { loopLagAvgMs: Math.round((lagSum / lagCount) * 10) / 10 } : {}),
      queueDepth: lastQueueDepth,
      // Background tabs throttle timers/rAF — flag so these samples can be excluded.
      hidden: documentHidden,
      // DOM node count is the cheapest, most universal leak signal.
      domNodes: document.getElementsByTagName("*").length,
      ...(mem
        ? {
            heapUsedMB: Math.round(mem.usedJSHeapSize / 1048576),
            heapTotalMB: Math.round(mem.totalJSHeapSize / 1048576),
            heapLimitMB: Math.round(mem.jsHeapSizeLimit / 1048576),
          }
        : {}),
      ...probed,
    })
    longTasks = 0
    blockingMs = 0
    lagMax = 0
    lagSum = 0
    lagCount = 0
  }

  const timer = setInterval(sample, PERF_SAMPLE_MS)
  return () => {
    cancelAnimationFrame(raf)
    clearInterval(timer)
    clearTimeout(lagTimer)
    observer?.disconnect()
  }
}

/**
 * Per-entry context stamped on EVERY trace line — the index that makes a
 * record-everything trace searchable. Grouped by analysis concern so jq reads
 * cleanly, e.g.:
 *   jq -c 'select(.ctx.power.brownout)'                    logs/session-*.jsonl
 *   jq -c 'select(.ctx.survival.forcedReturn)'            logs/session-*.jsonl
 *   jq -c '[.ctx.time.clock, .ctx.bubble.ring] | @csv'    logs/session-*.jsonl
 *
 * All values are rounded/counted to keep each line small; the `combat` group is
 * null unless a skirmish is live, so idle lines stay lean. Add or trim freely —
 * this is the one spot where you decide what questions the trace can answer.
 */
export function frameContext(s: SimulationSnapshot): Record<string, unknown> {
  const r1 = (n: number): number => Math.round(n * 10) / 10
  const r2 = (n: number): number => Math.round(n * 100) / 100
  const pct = (cur: number, max: number): number => Math.round((cur / Math.max(1, max)) * 100) / 100

  return {
    // Pacing — the x-axis of every time series.
    time: { clock: Math.round(s.clockSeconds) },

    // Hero power curve: the three class tracks you balance difficulty against.
    hero: {
      drummer: s.heroProgress.drummerLevel,
      vocalist: s.heroProgress.vocalistLevel,
      synth: s.heroProgress.synthLevel,
    },

    // Survival loop: risk, debuffs, and the forced-return timer (death-spiral debugging).
    survival: {
      sustain: r1(s.heroSurvival.sustain),
      where: s.heroSurvival.location,
      debuffTier: s.heroSurvival.debuffTier,
      echoScars: s.heroSurvival.echoScars,
      viralLoad: r2(s.heroSurvival.viralLoadRatio),
      pointOfNoReturn: r2(s.heroSurvival.pointOfNoReturnRatio),
      forcedReturnInS: Math.round(s.heroSurvival.secondsUntilForcedReturn),
      workEff: r2(s.heroSurvival.workEfficiencyMultiplier),
      forcedReturn: s.heroSurvival.forcedReturn !== null,
    },

    // Economy: currencies + lifetime flow for spotting source/sink drift.
    econ: {
      bassline: Math.round(s.resources.bassline),
      chorus: Math.round(s.resources.chorus),
      harmonics: Math.round(s.resources.harmonics),
      stone: Math.round(s.resources.stone),
      water: Math.round(s.resources.water),
      vibes: Math.round(s.resources.vibes),
      lifeGen: Math.round(s.resources.lifetimeGenerated),
      lifeSpent: Math.round(s.resources.lifetimeSpent),
    },

    // Production & power: brownouts are a top balance/debug signal.
    power: {
      brownout: s.power.brownoutActive,
      brownoutSev: r2(s.power.brownoutSeverity),
      harmonicsTier: s.power.harmonicsTier,
      staff: s.power.activeStaffCount,
      upkeepReq: r1(s.power.requestedUpkeepPerSecond),
      upkeepActive: r1(s.power.activeUpkeepPerSecond),
    },

    // Crew & base: growth, overcrowding, milestone unlocks.
    base: {
      crew: s.roster.totalCrew,
      occupants: s.base.occupantCount,
      freeBunks: s.base.freeBunks,
      missingBunks: s.base.missingBunks,
      overcrowdedS: Math.round(s.base.overcrowdedSeconds),
      studioRestored: s.base.studioRestored,
      badVibes: r2(s.base.badVibesMultiplier),
    },

    // Bubble frontier: the core expansion mechanic.
    bubble: {
      ring: s.bubble.stabilizedRing,
      frontier: r2(s.bubble.frontierProgress),
      targetRing: s.bubble.targetRing,
      hexes: s.bubble.stabilizedHexes,
      reach: r1(s.bubble.reachFromBase),
      holdLeftS: Math.round(s.bubble.holdSecondsRemaining),
    },

    // Progression spine: where the player is in quests and story.
    quest: {
      objective: s.objectives.activeObjectiveId,
      objectivesDone: s.objectives.completedObjectiveIds.length,
      recruitOpen: s.objectives.recruitmentEnabled,
      caveInBubble: s.objectives.survivorCaveInBubble,
      beat: s.narrative.activeBeatId,
      beatsDone: s.narrative.completedBeatIds.length,
    },

    // Roster pipeline.
    recruit: {
      total: s.recruitment.totalRecruitedThisRun,
      pending: s.recruitment.pendingRecruits.length,
      nextCost: Math.round(s.recruitment.nextRecruitCost),
    },

    // Field activity & rewards.
    expe: {
      active: s.expeditions.activeJobs.length,
      reports: s.expeditions.completedReports.length,
      clues: s.expeditions.totalClues,
      leads: s.expeditions.totalDungeonLeads,
      wounds: s.expeditions.totalWounds,
    },

    // Exploration footprint + hero position.
    map: { discovered: s.discoveredCells.length, q: s.heroMap.q, r: s.heroMap.r },

    // Combat — only when a skirmish is live, to keep idle lines lean.
    combat: s.activeCombat
      ? {
          creature: s.activeCombat.creatureId,
          round: s.activeCombat.round,
          heroHpPct: pct(s.activeCombat.heroHp, s.activeCombat.heroHpMax),
          enemyHpPct: pct(s.activeCombat.creatureHp, s.activeCombat.creatureHpMax),
          threat: r1(s.activeCombat.threat),
        }
      : null,
  }
}

// ── Diagnostics capture ─────────────────────────────────────────────────────
// console.error/warn, uncaught errors, unhandled rejections, and failed resource
// loads — the things otherwise invisible in the trace — folded into dir:"log".

const MAX_MSG = 2000
const MAX_STACK = 4000

function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s
}

/** Render one console argument compactly. */
function describeArg(arg: unknown): string {
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`
  if (typeof arg === "string") return arg
  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}

/** Stack from the first Error among console args, if any. */
function stackOf(args: unknown[]): { stack?: string } {
  const err = args.find((a) => a instanceof Error) as Error | undefined
  return err?.stack ? { stack: clip(err.stack, MAX_STACK) } : {}
}

/**
 * Patch console.error/warn and listen for uncaught errors + unhandled rejections,
 * mirroring each into the trace as dir:"log". The original console is always
 * called through, so nothing disappears from the terminal. Returns a restore fn.
 */
function installConsoleCapture(stamp: () => Record<string, unknown>): () => void {
  const wrapLevel = (level: "error" | "warn"): (() => void) => {
    const current = console[level] as typeof console.error & { __traceWrapped?: boolean }
    if (current.__traceWrapped) return () => {} // idempotent across HMR re-runs
    const original = current.bind(console)
    const wrapped = ((...args: unknown[]): void => {
      original(...args)
      if (suppressCapture) return
      try {
        enqueue({
          t: performance.now(),
          dir: "log",
          level,
          msg: clip(args.map(describeArg).join(" "), MAX_MSG),
          ...stackOf(args),
          ctx: stamp(),
        })
      } catch {
        /* logging must never break the app */
      }
    }) as typeof console.error & { __traceWrapped?: boolean }
    wrapped.__traceWrapped = true
    console[level] = wrapped
    return () => {
      console[level] = original
    }
  }

  const restoreError = wrapLevel("error")
  const restoreWarn = wrapLevel("warn")

  const onError = (event: ErrorEvent): void => {
    try {
      const target = event.target as (HTMLElement & { src?: string; href?: string }) | null
      const resource = !event.message && target ? target.src || target.href : undefined
      enqueue({
        t: performance.now(),
        dir: "log",
        level: resource ? "resource" : "uncaught",
        msg: clip(resource ? `failed to load ${resource}` : event.message || String(event.error), MAX_MSG),
        ...(event.error?.stack ? { stack: clip(String(event.error.stack), MAX_STACK) } : {}),
        ...(event.filename ? { source: `${event.filename}:${event.lineno}:${event.colno}` } : {}),
        ctx: stamp(),
      })
    } catch {
      /* swallow */
    }
  }
  const onRejection = (event: PromiseRejectionEvent): void => {
    try {
      const reason: unknown = event.reason
      enqueue({
        t: performance.now(),
        dir: "log",
        level: "unhandledrejection",
        msg: clip(describeArg(reason), MAX_MSG),
        ...(reason instanceof Error && reason.stack ? { stack: clip(reason.stack, MAX_STACK) } : {}),
        ctx: stamp(),
      })
    } catch {
      /* swallow */
    }
  }
  // Capture phase so resource-load failures (which don't bubble) are seen too.
  window.addEventListener("error", onError, true)
  window.addEventListener("unhandledrejection", onRejection)

  return () => {
    restoreError()
    restoreWarn()
    window.removeEventListener("error", onError, true)
    window.removeEventListener("unhandledrejection", onRejection)
  }
}

// ── User-interaction capture ────────────────────────────────────────────────
// Clicks, keys, and a throttled presence ping — the player intent the sim command
// stream can't show. This is what distinguishes "stuck staring" from "walked away".

const PRESENCE_MS = 5000

/** True when typing into a free-text field, so the characters can be masked. */
function isTextEntry(el: Element | null): boolean {
  const field = el?.closest?.("input,textarea,[contenteditable=true],[contenteditable='']")
  if (!field) return false
  if (field.tagName === "INPUT") {
    const type = (field as HTMLInputElement).type
    return !["checkbox", "radio", "button", "submit", "reset", "range", "color"].includes(type)
  }
  return true
}

/** Best-effort human-meaningful descriptor for the affordance an event hit. */
function describeTarget(start: EventTarget | null): { target: string; text?: string } | undefined {
  const el = start instanceof Element ? start : null
  if (!el) return undefined
  const interactive = el.closest(
    "button,a,input,select,textarea,label,[role=button],[role=tab],[role=menuitem],[role=link],[role=checkbox],[role=switch],[data-trace-id],[data-testid]",
  )
  const node = (interactive ?? el) as HTMLElement
  const ds = node.dataset ?? {}
  const id = ds.traceId ?? ds.testid ?? (node.id || undefined)
  const aria = node.getAttribute("aria-label") ?? node.getAttribute("title") ?? undefined
  const role = node.getAttribute("role") ?? undefined
  const tag = node.tagName.toLowerCase()
  const label = id ? `#${id}` : (aria ?? (role ? `${tag}[role=${role}]` : tag))
  const text = clip((node.textContent ?? "").replace(/\s+/g, " ").trim(), 60)
  // Only carry text when there's no better identifier (and it isn't already the aria label).
  return { target: clip(label, 80), ...(text && !aria && !id ? { text } : {}) }
}

/** Capture clicks, keystrokes, and a throttled presence ping. Returns a stop fn. */
function installInteractionCapture(stamp: () => Record<string, unknown>): () => void {
  const onClick = (event: MouseEvent): void => {
    enqueue({
      t: performance.now(),
      dir: "ui",
      kind: "click",
      ...describeTarget(event.target),
      x: Math.round(event.clientX),
      y: Math.round(event.clientY),
      ...(event.button ? { button: event.button } : {}),
      seq: lastSeq,
      ctx: stamp(),
    })
  }
  const onKey = (event: KeyboardEvent): void => {
    if (event.repeat) return // ignore auto-repeat from a held key
    const printable = event.key.length === 1
    const masked = printable && isTextEntry(event.target instanceof Element ? event.target : null)
    const mods = [
      event.ctrlKey && "ctrl",
      event.metaKey && "meta",
      event.altKey && "alt",
      event.shiftKey && "shift",
    ].filter(Boolean)
    enqueue({
      t: performance.now(),
      dir: "ui",
      kind: "key",
      key: masked ? "·" : event.key, // never log the actual character typed into a text field
      ...(mods.length ? { mods } : {}),
      ...describeTarget(event.target),
      seq: lastSeq,
      ctx: stamp(),
    })
  }
  let lastPresence = 0
  const onMove = (event: PointerEvent): void => {
    const now = performance.now()
    if (now - lastPresence < PRESENCE_MS) return
    lastPresence = now
    const described = describeTarget(event.target)
    enqueue({
      t: now,
      dir: "ui",
      kind: "active",
      ...(described ? { target: described.target } : {}),
      ctx: stamp(),
    })
  }
  window.addEventListener("click", onClick, { capture: true, passive: true })
  window.addEventListener("keydown", onKey, { capture: true })
  window.addEventListener("pointermove", onMove, { capture: true, passive: true })
  return () => {
    window.removeEventListener("click", onClick, true)
    window.removeEventListener("keydown", onKey, true)
    window.removeEventListener("pointermove", onMove, true)
  }
}

// ── Visibility ──────────────────────────────────────────────────────────────
// Backgrounding explains most perf anomalies (multi-second frames, throttled
// sampling, latency spikes). Track it explicitly so it's a filter, not a guess.

/** Record visibility transitions and keep `documentHidden` current. Returns a stop fn. */
function installVisibilityCapture(stamp: () => Record<string, unknown>): () => void {
  documentHidden = document.visibilityState === "hidden"
  const onChange = (): void => {
    documentHidden = document.visibilityState === "hidden"
    enqueue({
      t: performance.now(),
      dir: "visibility",
      hidden: documentHidden,
      state: document.visibilityState,
      ctx: stamp(),
    })
    // Hiding throttles timers, so the next interval flush may be far off — persist now.
    if (documentHidden) flush()
  }
  document.addEventListener("visibilitychange", onChange)
  return () => document.removeEventListener("visibilitychange", onChange)
}

export interface TraceRecorder {
  /** Pass to `SimulationClient` as its `onTrace` option. */
  readonly onTrace: (entry: TraceEntry) => void
}

/**
 * Wire up local-mode tracing. No-op (returns an empty `onTrace`) outside dev builds.
 * @param getSnapshot returns the latest snapshot so each line can be stamped with context.
 */
export function installTraceRecorder(getSnapshot: () => SimulationSnapshot | null): TraceRecorder {
  if (DEV !== true || typeof window === "undefined") {
    return { onTrace: () => {} }
  }

  const stamp = (): Record<string, unknown> => {
    const snap = getSnapshot()
    return snap ? frameContext(snap) : {}
  }

  // Capture diagnostics first, so errors thrown during the rest of setup are seen.
  const stopConsole = installConsoleCapture(stamp)
  // Player intent: clicks, keys, presence.
  const stopInteractions = installInteractionCapture(stamp)
  // Tab visibility — the explanation for most perf anomalies.
  const stopVisibility = installVisibilityCapture(stamp)

  // Session header: env + the timeOrigin anchor that maps every `t` to wall-clock.
  recordSessionHeader()

  // Boundary tap: every command out + every worker event in, with latency + back-pressure.
  const onTrace = (entry: TraceEntry): void => {
    if (entry.queueDepth !== undefined) lastQueueDepth = entry.queueDepth
    if (entry.seq !== undefined) lastSeq = entry.seq
    const changed = entry.dir === "event" ? changedLeaves(entry.payload) : undefined
    enqueue({
      t: entry.at,
      dir: entry.dir,
      kind: entry.kind,
      ...(entry.seq !== undefined ? { seq: entry.seq } : {}),
      ...(entry.latencyMs !== undefined ? { latencyMs: Math.round(entry.latencyMs) } : {}),
      ...(entry.workerMs !== undefined ? { workerMs: entry.workerMs } : {}),
      ...(entry.snapshotMs !== undefined ? { snapshotMs: entry.snapshotMs } : {}),
      ...(entry.diffMs !== undefined ? { diffMs: entry.diffMs } : {}),
      ...(entry.request ? { request: entry.request } : {}),
      ...(entry.queueDepth !== undefined ? { queueDepth: entry.queueDepth } : {}),
      payload: trimPayload(entry.payload),
      ...(changed ? { changed } : {}),
      ctx: stamp(),
    })
  }

  // Semantic tap: the same add-game-event stream music-event-bridge listens to.
  // lastSeq links each event to the command that produced it (set on the event
  // line just above, which fires before main.ts dispatches these).
  window.addEventListener("add-game-event", (event) => {
    const detail = (event as CustomEvent<AddGameEvent>).detail
    if (!detail?.kind) return
    enqueue({ t: performance.now(), dir: "game", kind: detail.kind, seq: lastSeq, payload: detail, ctx: stamp() })
  })

  // Performance: one-shot boot timing, then a per-second render/jank/heap sample.
  recordStartupPerf()
  const stopPerf = startPerfSampling()

  // Don't lose the tail when the page closes or reloads.
  window.addEventListener("beforeunload", () => {
    stopPerf()
    stopConsole()
    stopInteractions()
    stopVisibility()
    flush()
  })
  console.info(`[trace] recording to logs/session-${SESSION}.jsonl`)

  return { onTrace }
}
