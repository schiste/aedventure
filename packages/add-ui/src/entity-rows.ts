// Renderers for the entity kinds a panel's `relatedIds` can name.
//
// One function per kind, each taking a lookup rather than the whole world, so
// a panel's body becomes "draw these ids" and adding a kind is adding an entry
// here instead of writing another panel.
//
// Each returns `null` for an entity it cannot find. That matters more than it
// looks: authored content names entities the build may not have yet, and a
// panel that silently omits an unknown row is better than one that renders a
// row saying nothing.
import type { AddResourceSummary, AddRoleAssignmentSummary } from "@aedventure/add-presentation"
import html from "solid-js/html"

import { formatResource } from "./format"

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
export function resourceEntityRow(
  resource: () => AddResourceSummary | undefined,
): unknown {
  if (!resource()) return null
  return html`
    <article class="ui-row" data-tone="neutral" data-entity="resource">
      <span class="ui-row-label">
        ${() => resource()?.label}
        <small class="ui-row-detail">
          ${() => resource()?.blocker ?? `${resource()?.source} -> ${resource()?.sink}`}
        </small>
      </span>
      <strong class="ui-row-trailing">
        ${() =>
          `${formatResource(resource()?.value ?? 0)} / ${formatResource(resource()?.cap ?? 0)}`}
      </strong>
    </article>
  `
}

/**
 * A station's state in one line.
 *
 * "Browned out" reads differently from "off": the player did not turn it off,
 * the base ran out of Chorus, and the fix is different.
 */
export function stationEntityRow(station: () => StationRowView | undefined): unknown {
  if (!station()) return null
  const tone = (): string => {
    const current = station()
    if (!current || !current.built) return "muted"
    if (current.brownedOut) return "danger"
    return current.powered ? "neutral" : "muted"
  }
  const status = (): string => {
    const current = station()
    if (!current) return ""
    if (!current.built) return "Not built"
    if (current.brownedOut) return "Browned out"
    if (!current.powered) return current.blockedReason ?? "Off"
    return current.outputEffect
  }
  return html`
    <article class="ui-row" data-tone=${tone} data-entity="station">
      <span class="ui-row-label">
        ${() => station()?.label}
        <small class="ui-row-detail">${status}</small>
      </span>
      <strong class="ui-row-trailing">
        ${() => `${formatResource(station()?.chorusUpkeepPerSecond ?? 0)} Chorus/s`}
      </strong>
    </article>
  `
}

/** Who is on a job, or why nobody can be. */
export function roleEntityRow(role: () => AddRoleAssignmentSummary | undefined): unknown {
  if (!role()) return null
  return html`
    <article
      class="ui-row"
      data-tone=${() => (role()?.available ? "neutral" : "muted")}
      data-entity="role"
    >
      <span class="ui-row-label">
        ${() => role()?.label}
        <small class="ui-row-detail">${() => role()?.lockedReason ?? "Available"}</small>
      </span>
      <strong class="ui-row-trailing">${() => `${role()?.crewAssigned ?? 0} crew`}</strong>
    </article>
  `
}

export interface ProjectRowView {
  readonly label: string
  readonly complete: boolean
  readonly enabled: boolean
  readonly costLabel: string
  readonly blockedReason: string | null
}

/** A build, and whether it can be started. */
export function projectEntityRow(project: () => ProjectRowView | undefined): unknown {
  if (!project()) return null
  const tone = (): string => {
    const current = project()
    if (!current) return "muted"
    if (current.complete) return "neutral"
    return current.enabled ? "accent" : "muted"
  }
  return html`
    <article class="ui-row" data-tone=${tone} data-entity="project">
      <span class="ui-row-label">
        ${() => project()?.label}
        <small class="ui-row-detail">
          ${() => {
            const current = project()
            if (!current) return ""
            if (current.complete) return "Complete"
            return current.blockedReason ?? current.costLabel
          }}
        </small>
      </span>
    </article>
  `
}

export interface WorldActionRowView {
  readonly label: string
  readonly enabled: boolean
  readonly heroOnly: boolean
  readonly blockedReason: string | null
}

/** Something the Hero or the crew could go and do. */
export function worldActionEntityRow(action: () => WorldActionRowView | undefined): unknown {
  if (!action()) return null
  return html`
    <article
      class="ui-row"
      data-tone=${() => (action()?.enabled ? "accent" : "muted")}
      data-entity="world_action"
    >
      <span class="ui-row-label">
        ${() => action()?.label}
        <small class="ui-row-detail">
          ${() => action()?.blockedReason ?? (action()?.heroOnly ? "Hero only" : "Crew")}
        </small>
      </span>
    </article>
  `
}

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

export function storyBeatEntityRow(beat: () => StoryBeatRowView | undefined): unknown {
  if (!beat()) return null
  return html`
    <article
      class="ui-row"
      data-tone=${() => {
        const current = beat()
        return current ? storyBeatTone(current) : "neutral"
      }}
      data-entity="story"
      data-beat-status=${() => beat()?.status}
    >
      <span class="ui-row-label">
        ${() => beat()?.label}
        <small class="ui-row-detail">
          ${() => {
            const current = beat()
            return current ? storyBeatStatusCopy(current) : ""
          }}
        </small>
      </span>
    </article>
  `
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

export function tileEntityRow(tile: () => TileRowView | undefined): unknown {
  return () => {
    const current = tile()
    if (!current) return null
    const links = tileLinkCount(current)
    return html`
      <article
        class="ui-row"
        data-tone=${current.isBlocker ? "muted" : "neutral"}
        data-entity="tile"
        data-terrain=${current.terrain}
      >
        <span class="ui-row-label">
          ${current.label}
          <small class="ui-row-detail">
            ${current.feature === "none" ? current.terrain : current.feature.replaceAll("_", " ")}
            ${" · "}
            ${tileTraversalCopy(current)}
          </small>
        </span>
        ${links > 0
          ? html`<strong class="ui-row-trailing">
              ${`${links} ${links === 1 ? "route" : "routes"}`}
            </strong>`
          : null}
      </article>
    `
  }
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

export function flagEntityRow(flag: () => FlagRowView | undefined): unknown {
  return () => {
    const current = flag()
    if (!current) return null
    return html`
      <article
        class="ui-row"
        data-tone=${current.set ? "neutral" : "muted"}
        data-entity="flag"
        data-flag-set=${current.set ? "true" : "false"}
      >
        <span class="ui-row-label">
          ${current.label}
          <small class="ui-row-detail">${current.group}</small>
        </span>
        <strong class="ui-row-trailing">${flagStatusCopy(current)}</strong>
      </article>
    `
  }
}
