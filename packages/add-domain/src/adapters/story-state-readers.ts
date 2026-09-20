import type { SimulationSnapshot } from "@aedventure/add-protocol"

export function selectedStoryChoiceId(
  snapshot: SimulationSnapshot,
  beatId: string,
): string | null {
  return snapshot.narrative.choiceByBeat[beatId] ?? null
}

export function storyChoiceSelected(snapshot: SimulationSnapshot, beatId: string): boolean {
  return selectedStoryChoiceId(snapshot, beatId) !== null
}

export function storyBeatCompleted(snapshot: SimulationSnapshot, beatId: string): boolean {
  return snapshot.narrative.completedBeatIds.includes(beatId)
}

export function storyFlagSet(snapshot: SimulationSnapshot, flagId: string): boolean {
  switch (flagId) {
    case "base.tutorial_investigated":
      return snapshot.base.tutorialInvestigated
    case "base.tutorial_explored":
      return snapshot.base.tutorialExplored
    case "base.studio_restored":
      return snapshot.base.studioRestored
    case "base.fire_pit_built":
      return snapshot.base.firePitBuilt
    case "base.studio_restore_unlocked":
      return snapshot.base.studioRestoreUnlocked
    case "base.water_collection_unlocked":
      return snapshot.base.waterCollectionUnlocked
    case "crystal.removing_moss_unlocked":
      return snapshot.crystalCircle.removingMossUnlocked
    case "crystal.removing_moss_completed":
      return snapshot.crystalCircle.removingMossCompleted
    case "hero.outside_bubble":
      return snapshot.heroSurvival.location === "outside_bubble"
    case "hero.forced_return_active":
      return snapshot.heroSurvival.forcedReturn !== null
    case "hero.recovering_at_studio":
      return snapshot.heroSurvival.forcedReturn?.phase === "recover_at_studio"
    default:
      return false
  }
}

export function storyQualityValue(snapshot: SimulationSnapshot, key: string): number {
  return Number(snapshot.narrative.qualities?.[key] ?? 0)
}

export function storyQualityEntries(
  snapshot: SimulationSnapshot,
): readonly { readonly key: string; readonly value: number }[] {
  return Object.entries(snapshot.narrative.qualities ?? {})
    .map(([key, value]) => ({ key, value: Number(value) }))
    .sort((a, b) => a.key.localeCompare(b.key))
}
