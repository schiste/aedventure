// @aedventure/game-animation — engine-neutral presentation transitions.
//
// A *transition* eases a single numeric property from one value to another over a
// duration. The registry is keyed (e.g. "entity:rotation"), deterministic (the
// caller supplies the clock, so it is frame-rate independent and testable), and
// agnostic of any renderer or game domain. Views interpret a state change as
// "begin a transition", then each frame "sample the current value and apply it".

export type Easing = (t: number) => number

export const linear: Easing = (t) => t
export const smoothStep: Easing = (t) => t * t * (3 - 2 * t)
export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3)
export const easeInOutQuad: Easing = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

export function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

export interface TransitionOptions {
  readonly from: number
  readonly to: number
  readonly durationMs: number
  /** The clock value when the transition starts. */
  readonly startedAt: number
  /** Defaults to {@link smoothStep}. */
  readonly easing?: Easing
}

interface ActiveTransition {
  readonly from: number
  readonly to: number
  readonly startedAt: number
  readonly durationMs: number
  readonly easing: Easing
}

export interface TransitionSample {
  readonly value: number
  readonly progress: number
  readonly done: boolean
}

/**
 * A keyed set of one-shot numeric transitions. Deterministic — callers pass the
 * current time to {@link sample}/{@link value}/{@link prune}, so it never reads a
 * wall clock and is fully testable. Not coupled to any renderer or game domain.
 */
export class TransitionRegistry {
  private readonly active = new Map<string, ActiveTransition>()
  private reducedMotion: boolean

  constructor(options: { readonly reducedMotion?: boolean } = {}) {
    this.reducedMotion = options.reducedMotion ?? false
  }

  /**
   * Accessibility gate. When enabled, transitions complete instantly — new ones
   * begin with zero duration and in-flight ones sample as done — so the view
   * snaps to target values with no motion. Wire this to the player's
   * reduced-motion preference (settings + `prefers-reduced-motion`).
   */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced
  }

  get reducedMotionEnabled(): boolean {
    return this.reducedMotion
  }

  /** Start (or restart) the transition stored at `key`. */
  begin(key: string, options: TransitionOptions): void {
    this.active.set(key, {
      from: options.from,
      to: options.to,
      startedAt: options.startedAt,
      durationMs: this.reducedMotion ? 0 : Math.max(0, options.durationMs),
      easing: options.easing ?? smoothStep,
    })
  }

  has(key: string): boolean {
    return this.active.has(key)
  }

  /** Eased value + progress at `now`, or `undefined` when nothing is active. */
  sample(key: string, now: number): TransitionSample | undefined {
    const transition = this.active.get(key)
    if (!transition) return undefined
    const progress =
      this.reducedMotion || transition.durationMs <= 0
        ? 1
        : clamp01((now - transition.startedAt) / transition.durationMs)
    return {
      value: lerp(transition.from, transition.to, transition.easing(progress)),
      progress,
      done: progress >= 1,
    }
  }

  /** Current value at `key`, or `fallback` when there is no active transition. */
  value(key: string, now: number, fallback: number): number {
    return this.sample(key, now)?.value ?? fallback
  }

  delete(key: string): void {
    this.active.delete(key)
  }

  clear(): void {
    this.active.clear()
  }

  /** Drop transitions that have finished at `now`. Call once per frame. */
  prune(now: number): void {
    for (const [key, transition] of this.active) {
      if (now - transition.startedAt >= transition.durationMs) this.active.delete(key)
    }
  }

  get size(): number {
    return this.active.size
  }
}

/**
 * Remembers the last value seen per key so a view can detect state changes (e.g.
 * an open flag flipping) and respond — typically by beginning a transition.
 * Domain-neutral; `T` is whatever discrete state you track.
 */
export class ChangeTracker<T> {
  private readonly last = new Map<string, T>()

  /** Record `value` for `key`, returning the previous value (`undefined` if new). */
  set(key: string, value: T): T | undefined {
    const previous = this.last.get(key)
    this.last.set(key, value)
    return previous
  }

  /** True when `value` differs from the last recorded value (or `key` is new). */
  changed(key: string, value: T): boolean {
    return !this.last.has(key) || this.last.get(key) !== value
  }

  get(key: string): T | undefined {
    return this.last.get(key)
  }

  delete(key: string): void {
    this.last.delete(key)
  }

  clear(): void {
    this.last.clear()
  }
}
