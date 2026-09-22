// Rendering the interface from the catalog that describes it.
//
// `ui_elements` already carries 237 elements — label, visibility conditions,
// short label, player hint, display priority, reveal tier — code-generated from
// authored TypeScript, exactly like resources and story beats. Until now the
// app read none of them: the catalog was documentation, and the interface was
// hand-written beside it.
//
// That costs more here than it would elsewhere, because this engine's premise
// is emergent content. Storylets are cast at runtime and patterns sift out of
// history, but if every new one needs a hand-written panel then the interface,
// not the engine, decides how much game there can be.
//
// So: visibility is evaluated from the authored conditions, and a panel takes
// its identity from the catalog. Authoring a new element makes it appear.
import type { SimulationSnapshot, UiElementDef, VisibilityConditionDef } from "@aedventure/add-protocol"
import { flagValue } from "@aedventure/add-presentation"

/**
 * Everything the authored conditions can ask about.
 *
 * Passed in rather than read off the snapshot directly, because flags are not a
 * map in the snapshot — they are typed fields spread across `base`,
 * `crystalCircle` and the rest, and only the presentation layer knows where.
 * Taking a resolver keeps this evaluator free of that, and testable against a
 * handful of fields instead of a whole simulation.
 */
export interface VisibilityContext {
  readonly snapshot: SimulationSnapshot
  readonly flag: (flagId: string) => boolean
  readonly resourceAmount: (resourceId: string) => number
}

/** Build a context from a snapshot, using the presentation layer's resolvers. */
export function visibilityContext(
  snapshot: SimulationSnapshot,
  resourceAmount: (resourceId: string) => number,
): VisibilityContext {
  return {
    snapshot,
    flag: (flagId) => flagValue(snapshot, flagId),
    resourceAmount,
  }
}

export function evaluateVisibilityCondition(
  condition: VisibilityConditionDef,
  context: VisibilityContext,
): boolean {
  const { snapshot } = context
  switch (condition.kind) {
    case "always":
      return true
    case "flag_set":
      return context.flag(condition.flag_id)
    case "flag_unset":
      return !context.flag(condition.flag_id)
    case "resource_positive":
      return context.resourceAmount(condition.resource_id) > 0
    case "viral_load_positive":
      return snapshot.heroSurvival.viralLoadRatio > 0
    case "hero_outside_bubble":
      return snapshot.heroSurvival.location === "outside_bubble"
    case "hero_forced_return":
      return snapshot.heroSurvival.returnJourneySeconds > 0
    case "hero_recovering":
      return snapshot.heroSurvival.viralLoadRatio > 0 && snapshot.heroSurvival.location !== "outside_bubble"
    case "echo_scars_positive":
      return snapshot.heroSurvival.echoScars > 0
    case "role_assigned":
      return snapshot.roster.heroAssigned && snapshot.roster.heroRoleId === condition.role_id
    case "role_available":
      return (snapshot.roster.crewByRole[condition.role_id] ?? 0) > 0
    case "recruitment_enabled":
      return snapshot.objectives.recruitmentEnabled
    case "recruitment_disabled":
      return !snapshot.objectives.recruitmentEnabled
    case "pending_recruits":
      return snapshot.recruitment.pendingRecruits.length > 0
    case "recruited_any":
      return snapshot.recruitment.totalRecruitedThisRun > 0
    case "brownout_active":
      return snapshot.power.brownoutActive
    default:
      // An authored condition this build does not know about hides the element
      // rather than showing it unconditionally: content can run ahead of the
      // engine, and a panel that appears with nothing behind it is worse than
      // one that waits for the next build.
      return false
  }
}

/**
 * `allOf` must all hold; `anyOf` needs one. An empty `anyOf` is not a failed
 * test — it means the element did not ask, so only `allOf` decides.
 */
export function isUiElementVisible(element: UiElementDef, context: VisibilityContext): boolean {
  const { allOf, anyOf } = element.visibility
  if (!allOf.every((condition) => evaluateVisibilityCondition(condition, context))) return false
  if (anyOf.length === 0) return true
  return anyOf.some((condition) => evaluateVisibilityCondition(condition, context))
}

/** Authored order: lower `displayPriority` first, then by label for stability. */
export function orderUiElements(elements: readonly UiElementDef[]): readonly UiElementDef[] {
  return [...elements].sort((left, right) => {
    const byPriority =
      (left.presentation?.displayPriority ?? 0) - (right.presentation?.displayPriority ?? 0)
    return byPriority !== 0 ? byPriority : left.label.localeCompare(right.label)
  })
}

export type RevealTier = "default" | "advanced" | "debug"

const TIER_ORDER: Record<RevealTier, number> = { default: 0, advanced: 1, debug: 2 }

/** Is this element within the reveal tier the player has opted into? */
export function isWithinRevealTier(element: UiElementDef, tier: RevealTier): boolean {
  const elementTier = element.presentation?.reveal ?? "default"
  return TIER_ORDER[elementTier] <= TIER_ORDER[tier]
}
