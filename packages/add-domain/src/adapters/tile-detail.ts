import type { AddMapMode } from "./map-modes"
import type {
  AddDungeonLinkInfo,
  AddFeature,
  AddTileInteractionDetail,
  AddTravelExposureRisk,
  AddVisibilityRenderState,
} from "./map-presentation"
import { ADD_BASE_SQUARE_MAP_ID } from "./map-modes"
import { addAreaById } from "../areas/registry"

export type AddTileLinkKind =
  | "base"
  | "dungeon"
  | "area"
  | "building"
  | "resource_node"
  | "encounter"
export type AddTileActionKind = "travel" | "enter_submap" | "manage_base" | "inspect"

export interface AddTileTravelSummary {
  readonly gameMinutes: number
  readonly standingHere: boolean
  readonly adjacent: boolean
  readonly canTravelNow: boolean
  readonly risk: AddTravelExposureRisk
  readonly copy: string
}

export interface AddTileFactsSummary {
  readonly known: readonly string[]
  readonly unknown: readonly string[]
}

export interface AddTileLink {
  readonly id: string
  readonly kind: AddTileLinkKind
  readonly label: string
  readonly targetMapMode?: AddMapMode
  readonly targetMapId?: string
  readonly visible: boolean
  readonly enabled: boolean
  readonly blockedReason: string | null
}

export interface AddTileAction {
  readonly id: string
  readonly kind: AddTileActionKind
  readonly label: string
  readonly enabled: boolean
  readonly blockedReason: string | null
  readonly linkId: string | null
}

export interface AddTileDetailSummary {
  readonly cell: string
  readonly label: string
  readonly visibility: AddVisibilityRenderState
  readonly terrain: string | null
  readonly feature: AddFeature | null
  readonly travel: AddTileTravelSummary
  readonly facts: AddTileFactsSummary
  readonly links: readonly AddTileLink[]
  readonly actions: readonly AddTileAction[]
  readonly hasSubmap: boolean
}

export interface SelectAddTileDetailInput {
  readonly tile: AddTileInteractionDetail | null
  readonly heroCell: string | null
  readonly heroDungeonLinks: readonly AddDungeonLinkInfo[]
  readonly travel: {
    readonly gameMinutes: number
    readonly previewAdjacent: boolean
    readonly previewCell: string | null
  }
}

export function selectAddTileDetail(
  input: SelectAddTileDetailInput,
): AddTileDetailSummary | null {
  const { tile } = input
  if (!tile) return null

  const standingHere = input.heroCell === tile.cell
  const adjacent =
    !standingHere && input.travel.previewAdjacent && input.travel.previewCell === tile.cell
  const travel = tileTravelSummary(tile, {
    standingHere,
    adjacent,
    gameMinutes: input.travel.gameMinutes,
  })
  const facts = tileFactsSummary(tile)
  const links = tileLinks(tile, input.heroDungeonLinks)
  const actions = tileActions({ tile, travel, links })

  return {
    cell: tile.cell,
    label: tileDetailLabel(tile),
    visibility: tile.visibility,
    terrain: tile.visibility === "hidden" ? null : tile.terrain,
    feature: tile.visibility === "hidden" ? null : tile.feature,
    travel,
    facts,
    links,
    actions,
    hasSubmap: links.some((link) => link.visible && hasSubmapTarget(link)),
  }
}

function tileTravelSummary(
  tile: AddTileInteractionDetail,
  context: {
    readonly standingHere: boolean
    readonly adjacent: boolean
    readonly gameMinutes: number
  },
): AddTileTravelSummary {
  const canTravelNow = context.adjacent && tile.visibility !== "hidden"
  return {
    gameMinutes: context.gameMinutes,
    standingHere: context.standingHere,
    adjacent: context.adjacent,
    canTravelNow,
    risk: tile.exposureRisk,
    copy: travelCopy(tile, context.standingHere, context.adjacent, canTravelNow),
  }
}

function tileFactsSummary(tile: AddTileInteractionDetail): AddTileFactsSummary {
  if (tile.visibility === "hidden") {
    return {
      known: [],
      unknown: [
        "Terrain after scouting",
        "current toxicity after arrival",
        "dungeon or submap links",
        "resource value and usefulness",
      ],
    }
  }

  const known = [`Terrain: ${titleCase(tile.terrain.replaceAll("_", " "))}`]
  if (tile.knownInfoLevel === "full_current") {
    known.push(`Current state: ${titleCase(tile.state.replaceAll("_", " "))}`)
    known.push(`Toxicity: ${titleCase(tile.exposureRisk.replaceAll("_", " "))}`)
  }
  if (tile.dungeonLinks.length > 0) {
    known.push(`${tile.dungeonLinks.length} interior link${tile.dungeonLinks.length === 1 ? "" : "s"} known`)
  }

  const unknown =
    tile.knownInfoLevel === "known_static"
      ? ["Current toxicity", "active threats", "fresh resource state"]
      : tile.dungeonLinks.length === 0
        ? ["No interior link is currently known here"]
        : ["Interior details remain unknown until entered"]

  return {
    known: known.slice(0, 4),
    unknown,
  }
}

function tileLinks(
  tile: AddTileInteractionDetail,
  heroDungeonLinks: readonly AddDungeonLinkInfo[],
): readonly AddTileLink[] {
  if (tile.visibility === "hidden") return []

  const links: AddTileLink[] = []
  if (isBaseFeature(tile.feature)) {
    links.push({
      id: "tile-link:base:studio-echo",
      kind: "base",
      label: "The Studio",
      targetMapMode: "base_square",
      targetMapId: ADD_BASE_SQUARE_MAP_ID,
      visible: true,
      enabled: true,
      blockedReason: null,
    })
  }

  // Area links (the optional middle tier). Emitted for any tile with areaIds —
  // including the base tile — so they sit alongside, not replace, dungeon links.
  tile.areaIds.forEach((areaId) => {
    const area = addAreaById(areaId)
    if (!area) return
    links.push({
      id: `tile-link:area:${areaId}`,
      kind: "area",
      label: area.label,
      targetMapMode: "area_hex",
      targetMapId: area.mapId,
      visible: true,
      enabled: true,
      blockedReason: null,
    })
  })

  if (isBaseFeature(tile.feature)) return links

  tile.dungeonLinks.forEach((link) => {
    const heroLink = heroDungeonLinks.find((candidate) => candidate.id === link.id)
    const enabled = Boolean(heroLink?.enabled)
    links.push({
      id: `tile-link:dungeon:${link.id}`,
      kind: "dungeon",
      label: link.label,
      targetMapMode: "dungeon_square",
      targetMapId: link.targetMapId,
      visible: true,
      enabled,
      blockedReason: enabled
        ? null
        : "Move the Hero onto this entrance to enter.",
    })
  })

  return links
}

function tileActions(input: {
  readonly tile: AddTileInteractionDetail
  readonly travel: AddTileTravelSummary
  readonly links: readonly AddTileLink[]
}): readonly AddTileAction[] {
  const actions: AddTileAction[] = []

  if (!input.travel.standingHere) {
    actions.push({
      id: `tile-action:travel:${input.tile.cell}`,
      kind: "travel",
      label: input.tile.visibility === "hidden" ? "Scout edge" : "Travel here",
      enabled: input.travel.canTravelNow,
      blockedReason: input.travel.canTravelNow
        ? null
        : input.travel.adjacent
          ? "Use the map movement controls to spend the scouting hour; precise details appear on arrival."
          : "Select an adjacent region or move closer first.",
      linkId: null,
    })
  }

  input.links.forEach((link) => {
    actions.push({
      id: `tile-action:${link.kind}:${link.id}`,
      kind: link.kind === "base" ? "manage_base" : "enter_submap",
      label: link.kind === "base" ? `Open ${link.label}` : `Enter ${link.label}`,
      enabled: link.enabled,
      blockedReason: link.blockedReason,
      linkId: link.id,
    })
  })

  if (actions.length === 0) {
    actions.push({
      id: `tile-action:inspect:${input.tile.cell}`,
      kind: "inspect",
      label: input.tile.visibility === "hidden" ? "Unknown region" : "Inspect region",
      enabled: input.tile.visibility !== "hidden",
      blockedReason:
        input.tile.visibility === "hidden"
          ? "Hidden regions expose no precise detail until scouted."
          : null,
      linkId: null,
    })
  }

  return actions
}

function travelCopy(
  tile: AddTileInteractionDetail,
  standingHere: boolean,
  adjacent: boolean,
  canTravelNow: boolean,
): string {
  if (standingHere) {
    return "The Hero is already here; use local links or choose the next adjacent region."
  }
  if (tile.visibility === "hidden") {
    return "Blind scout: spending the hour reveals reliable terrain, toxicity, links, and value only after arrival."
  }
  if (canTravelNow) {
    return "Adjacent destination: crossing consumes one in-game hour."
  }
  if (!adjacent) {
    return "Select an adjacent revealed tile or move closer before crossing."
  }
  return "The tile is readable, but movement is not currently available."
}

function hasSubmapTarget(link: AddTileLink): boolean {
  return Boolean(link.targetMapMode && link.targetMapId)
}

function isBaseFeature(feature: AddFeature): boolean {
  return feature === "base" || feature === "base_core"
}

function tileDetailLabel(tile: AddTileInteractionDetail): string {
  if (isBaseFeature(tile.feature)) return "The Studio"
  return conciseTileLabel(tile.label)
}

function conciseTileLabel(label: string): string {
  return label.replace(/\s*->.*$/, "")
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}
