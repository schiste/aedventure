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
