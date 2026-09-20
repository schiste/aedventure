import type { SimulationSnapshot } from "@aedventure/add-protocol"
import { PERKS } from "../content/perks"

// Presents perk progression for the UI: which perks are acquired, which can be
// learned now, and why locked. Perk points = total Hero level - acquired count
// (mirrors the sim's eligibility rule). Perk defs come from the TS catalog;
// acquired state comes from the snapshot.
export interface AddPerkSummary {
  readonly id: string
  readonly label: string
  readonly description: string | null
  readonly acquired: boolean
  readonly available: boolean
  readonly lockedReason: string | null
}

export interface AddPerkProgress {
  readonly pointsAvailable: number
  readonly perks: readonly AddPerkSummary[]
}

export function heroTotalLevel(snapshot: SimulationSnapshot): number {
  const progress = snapshot.heroProgress
  return progress.drummerLevel + progress.vocalistLevel + progress.synthLevel
}

export function selectAddPerkSummaries(snapshot: SimulationSnapshot): AddPerkProgress {
  const acquired = new Set(snapshot.acquiredPerks ?? [])
  const pointsAvailable = Math.max(0, heroTotalLevel(snapshot) - acquired.size)
  const perkLabel = (id: string) => PERKS.find((perk) => perk.id === id)?.label ?? id

  const perks = PERKS.map((perk) => {
    const isAcquired = acquired.has(perk.id)
    const missing = (perk.requires ?? []).filter((req) => !acquired.has(req))
    const lockedReason = isAcquired
      ? null
      : missing.length > 0
        ? `Requires ${missing.map(perkLabel).join(", ")}`
        : pointsAvailable <= 0
          ? "No perk points"
          : null
    return {
      id: perk.id,
      label: perk.label,
      description: perk.description ?? null,
      acquired: isAcquired,
      available: !isAcquired && lockedReason === null,
      lockedReason,
    }
  })

  return { pointsAvailable, perks }
}
