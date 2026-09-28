// Entity row view types and player-facing status/traversal copy. Solid renderers live in entity-row-components.tsx.
//
// One function per kind, each taking a lookup rather than the whole world, so
// a panel's body becomes "draw these ids" and adding a kind is adding an entry
// here instead of writing another panel.
//
// Each returns `null` for an entity it cannot find. That matters more than it
// looks: authored content names entities the build may not have yet, and a
// panel that silently omits an unknown row is better than one that renders a
// row saying nothing.
export interface StationRowView {
  readonly label: string
  readonly powered: boolean
  readonly brownedOut: boolean
  readonly built: boolean
  readonly chorusUpkeepPerSecond: number
  readonly blockedReason: string | null
  readonly outputEffect: string
}

/** Stock and headroom, with the reason it is stuck when there is one. */
export interface ProjectRowView {
  readonly label: string
  readonly complete: boolean
  readonly enabled: boolean
  readonly costLabel: string
  readonly blockedReason: string | null
}

/** A build, and whether it can be started. */
export interface WorldActionRowView {
  readonly label: string
  readonly enabled: boolean
  readonly heroOnly: boolean
  readonly blockedReason: string | null
}

/** Something the Hero or the crew could go and do. */
export interface StoryBeatRowView {
  readonly label: string
  readonly arc: string
  readonly status: "completed" | "current" | "upcoming"
  readonly awaitingChoice: boolean
  readonly worldActionId: string | null
}

/**
 * What a beat says about itself: done, happening, or still ahead.
 *
 * `awaitingChoice` is the one worth separating from `current`. A current beat
 * that is waiting on the player is the only row on the panel they can act on,
 * and reading "In progress" when the game is in fact stopped waiting for them
 * is the difference between an objective list and a stalled one.
 *
 * An upcoming beat shows its arc rather than a hint at what it is. Beats are
 * selected emergently, so which one comes next is not decided yet, and naming
 * it would be a promise the engine has not made.
 */
export function storyBeatStatusCopy(beat: StoryBeatRowView): string {
  if (beat.status === "completed") return "Done"
  if (beat.status === "current") {
    if (beat.awaitingChoice) return "Waiting on you"
    return beat.worldActionId ? "Ready to act" : "In progress"
  }
  return beat.arc
}

export function storyBeatTone(beat: StoryBeatRowView): "neutral" | "accent" | "muted" {
  if (beat.status === "completed") return "muted"
  if (beat.status === "current") return "accent"
  return "neutral"
}

export interface TileRowView {
  readonly label: string
  readonly terrain: string
  readonly feature: string
  readonly impedance: number
  readonly isBlocker: boolean
  readonly dungeonIds: readonly string[]
  readonly areaIds: readonly string[]
}

/**
 * What a tile costs to cross, or that it cannot be.
 *
 * Impedance is a multiplier on travel time, so 1 is ordinary ground and saying
 * "1x slower" would be noise. A blocker is not slow, it is impassable, and the
 * two must not read as points on the same scale.
 */
export function tileTraversalCopy(tile: TileRowView): string {
  if (tile.isBlocker) return "Impassable"
  if (tile.impedance <= 1) return "Open ground"
  return `${tile.impedance.toFixed(1)}x slower`
}

/** Sub-maps a tile leads into, which is what makes it worth travelling to. */
export function tileLinkCount(tile: TileRowView): number {
  return tile.dungeonIds.length + tile.areaIds.length
}

export interface FlagRowView {
  readonly label: string
  readonly group: string
  readonly set: boolean
}

/**
 * A gate, and whether it is open.
 *
 * Flags read as progression rather than as state: "Unlocked" is something the
 * player achieved, "Locked" is something still ahead. Neither says *how* to
 * open it, because a flag records that a gate exists and nothing about what
 * turns it — that lives in the beats and projects which set it, and guessing
 * here would put a wrong instruction next to a correct status.
 */
export function flagStatusCopy(flag: FlagRowView): string {
  return flag.set ? "Unlocked" : "Locked"
}
