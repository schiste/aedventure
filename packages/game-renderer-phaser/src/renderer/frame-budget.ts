// Frame performance helpers: a budget evaluator (the perf-regression check the
// smoke/CI runs over collected frame times) and a frame pacer (an optional cap
// so the render loop can target a lower FPS to save battery/heat). Both are
// pure and deterministic so they're testable without a renderer.

export interface FrameBudget {
  /** Max acceptable mean frame time (ms). */
  readonly averageMs: number
  /** Max acceptable 95th-percentile frame time (ms). */
  readonly p95Ms: number
  /** Max acceptable worst frame time (ms). */
  readonly maxMs: number
}

export interface FrameBudgetResult {
  readonly sampleCount: number
  readonly averageMs: number
  readonly p95Ms: number
  readonly maxMs: number
  readonly pass: boolean
  /** Human-readable budget breaches (empty when `pass`). */
  readonly breaches: readonly string[]
}

/**
 * Default headless/CI budget — mirrors docs/renderer-performance-budget.md.
 * Headless cadence is noisy, so this detects collapse, not production FPS.
 */
export const SMOKE_FRAME_BUDGET: FrameBudget = {
  averageMs: 50,
  p95Ms: 90,
  maxMs: 250,
}

/** Evaluate collected frame durations against a budget. Empty input passes. */
export function evaluateFrameBudget(
  samples: readonly number[],
  budget: FrameBudget = SMOKE_FRAME_BUDGET,
): FrameBudgetResult {
  if (samples.length === 0) {
    return { sampleCount: 0, averageMs: 0, p95Ms: 0, maxMs: 0, pass: true, breaches: [] }
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const averageMs = samples.reduce((sum, value) => sum + value, 0) / samples.length
  const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  const p95Ms = sorted[Math.max(0, p95Index)]
  const maxMs = sorted[sorted.length - 1]

  const breaches: string[] = []
  if (averageMs > budget.averageMs) {
    breaches.push(`average ${averageMs.toFixed(1)}ms > ${budget.averageMs}ms`)
  }
  if (p95Ms > budget.p95Ms) {
    breaches.push(`p95 ${p95Ms.toFixed(1)}ms > ${budget.p95Ms}ms`)
  }
  if (maxMs > budget.maxMs) {
    breaches.push(`max ${maxMs.toFixed(1)}ms > ${budget.maxMs}ms`)
  }
  return { sampleCount: samples.length, averageMs, p95Ms, maxMs, pass: breaches.length === 0, breaches }
}

/**
 * Frame pacer: caps how often the render loop runs. Call `shouldRender(now)`
 * each animation frame; it returns true only once `1000/targetFps` ms have
 * elapsed since the last accepted frame. `targetFps <= 0` disables pacing
 * (renders every frame). Deterministic — the caller supplies `now`.
 */
export function createFramePacer(targetFps: number): {
  shouldRender: (now: number) => boolean
  setTargetFps: (fps: number) => void
} {
  let interval = targetFps > 0 ? 1000 / targetFps : 0
  let lastRenderAt = Number.NEGATIVE_INFINITY
  return {
    shouldRender(now: number): boolean {
      if (interval <= 0) return true
      if (now - lastRenderAt + 0.0001 >= interval) {
        lastRenderAt = now
        return true
      }
      return false
    },
    setTargetFps(fps: number): void {
      interval = fps > 0 ? 1000 / fps : 0
      lastRenderAt = Number.NEGATIVE_INFINITY
    },
  }
}
