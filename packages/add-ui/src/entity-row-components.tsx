// Solid component renderers for the entity row view models.
// State interpretation and copy live in the small, Node-testable entity-rows.ts.
import { createComponent } from "solid-js"
import type { AddResourceSummary, AddRoleAssignmentSummary } from "@aedventure/add-presentation"

import { formatResource } from "./format"
import { Row, type Tone } from "./primitives"
import {
  flagStatusCopy,
  storyBeatStatusCopy,
  storyBeatTone,
  tileLinkCount,
  tileTraversalCopy,
  type FlagRowView,
  type ProjectRowView,
  type StoryBeatRowView,
  type StationRowView,
  type TileRowView,
  type WorldActionRowView,
} from "./entity-rows"

/** Stock and headroom, with the reason it is stuck when there is one. */
export function resourceEntityRow(
  resource: () => AddResourceSummary | undefined,
): unknown {
  if (!resource()) return null
  return createComponent(Row, {
    entity: "resource",
    label: () => resource()?.label ?? "",
    detail: () => {
      const current = resource()
      return current?.blocker ?? (current ? current.source + " -> " + current.sink : "")
    },
    trailing: () =>
      formatResource(resource()?.value ?? 0) + " / " + formatResource(resource()?.cap ?? 0),
  })
}

/** A station's state in one line. */
export function stationEntityRow(station: () => StationRowView | undefined): unknown {
  if (!station()) return null
  const tone = (): Tone => {
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
  return createComponent(Row, {
    entity: "station",
    tone,
    label: () => station()?.label ?? "",
    detail: status,
    trailing: () => formatResource(station()?.chorusUpkeepPerSecond ?? 0) + " Chorus/s",
  })
}

/** Who is on a job, or why nobody can be. */
export function roleEntityRow(role: () => AddRoleAssignmentSummary | undefined): unknown {
  if (!role()) return null
  return createComponent(Row, {
    entity: "role",
    tone: () => (role()?.available ? "neutral" : "muted"),
    label: () => role()?.label ?? "",
    detail: () => role()?.lockedReason ?? "Available",
    trailing: () => (role()?.crewAssigned ?? 0) + " crew",
  })
}

/** A build, and whether it can be started. */
export function projectEntityRow(project: () => ProjectRowView | undefined): unknown {
  if (!project()) return null
  const tone = (): Tone => {
    const current = project()
    if (!current) return "muted"
    if (current.complete) return "neutral"
    return current.enabled ? "accent" : "muted"
  }
  return createComponent(Row, {
    entity: "project",
    tone,
    label: () => project()?.label ?? "",
    detail: () => {
      const current = project()
      if (!current) return ""
      if (current.complete) return "Complete"
      return current.blockedReason ?? current.costLabel
    },
  })
}

/** Something the Hero or the crew could go and do. */
export function worldActionEntityRow(action: () => WorldActionRowView | undefined): unknown {
  if (!action()) return null
  return createComponent(Row, {
    entity: "world_action",
    tone: () => (action()?.enabled ? "accent" : "muted"),
    label: () => action()?.label ?? "",
    detail: () => action()?.blockedReason ?? (action()?.heroOnly ? "Hero only" : "Crew"),
  })
}

export function storyBeatEntityRow(beat: () => StoryBeatRowView | undefined): unknown {
  if (!beat()) return null
  return createComponent(Row, {
    entity: "story",
    tone: () => {
      const current = beat()
      return current ? storyBeatTone(current) : "neutral"
    },
    label: () => beat()?.label ?? "",
    detail: () => {
      const current = beat()
      return current ? storyBeatStatusCopy(current) : ""
    },
    beatStatus: () => beat()?.status ?? "upcoming",
  })
}

export function tileEntityRow(tile: () => TileRowView | undefined): unknown {
  return () => {
    const current = tile()
    if (!current) return null
    return createComponent(Row, {
      entity: "tile",
      tone: () => (tile()?.isBlocker ? "muted" : "neutral"),
      terrain: () => tile()?.terrain ?? "",
      label: () => tile()?.label ?? "",
      detail: () => {
        const selected = tile()
        if (!selected) return ""
        const feature = selected.feature === "none" ? selected.terrain : selected.feature.replaceAll("_", " ")
        return feature + " · " + tileTraversalCopy(selected)
      },
      trailing: () => {
        const selected = tile()
        const count = selected ? tileLinkCount(selected) : 0
        return count > 0 ? count + " " + (count === 1 ? "route" : "routes") : null
      },
    })
  }
}

export function flagEntityRow(flag: () => FlagRowView | undefined): unknown {
  return () => {
    const current = flag()
    if (!current) return null
    return createComponent(Row, {
      entity: "flag",
      tone: () => (flag()?.set ? "neutral" : "muted"),
      flagSet: () => flag()?.set ?? false,
      label: () => flag()?.label ?? "",
      detail: () => flag()?.group ?? "",
      trailing: () => {
        const selected = flag()
        return selected ? flagStatusCopy(selected) : ""
      },
    })
  }
}
