// The offline-return report: what happened while the player was away.
//
// Pure functions of the summary the presentation layer produces, and the reason
// they are worth moving out of the app is the empty cases. Each of these lists
// says something deliberate when it has nothing to show — "Loops were steady or
// capped" is a different statement from "No stock gained", and a player who was
// away overnight needs to be able to tell the difference. That is content, and
// it now sits somewhere it can be read and tested.
import type { AddOfflineReturnSummary } from "@aedventure/add-presentation"
import html from "solid-js/html"

import { formatResource, formatSignedResourceDelta, leadUiCopy } from "./format"
import { indexList } from "./control-flow"

/** How long a blocker's explanation can run before it needs a tooltip. */
const BLOCKER_DETAIL_LENGTH = 58

export function offlineReturnJobKindLabel(
  kind: AddOfflineReturnSummary["jobsCompleted"][number]["kind"],
): string {
  switch (kind) {
    case "construction":
      return "Construction finished"
    case "processing":
      return "Processing finished"
    case "expedition":
      return "Expedition returned"
    case "resonance":
      return "Resonance tuned"
  }
}

/** Counts the player scans first: time away, then gains, jobs and blockers. */
export function offlineReturnHighlights(summary: () => AddOfflineReturnSummary): unknown {
  return indexList(
    () => {
      const current = summary()
      const blockerCount =
        current.didNotProgress.length + (current.brownout.occurred ? 1 : 0)
      return [
        ["Away", current.elapsedLabel],
        ["Gains", `${current.resourcesGained.length}`],
        ["Jobs", `${current.jobsCompleted.length}`],
        ["Blockers", `${blockerCount}`],
      ] as const
    },
    (entry) => html`
      <span>
        <small>${() => entry()[0]}</small>
        <strong>${() => entry()[1]}</strong>
      </span>
    `,
  )
}

export function offlineReturnResourceRows(summary: () => AddOfflineReturnSummary): unknown {
  return [
    // "Capped" and "steady" are different reasons for the same zero, and the
    // player can act on one of them.
    summary().resourcesGained.length === 0
      ? html`<li>
          <strong>No stock gained</strong>
          <small>Loops were steady or capped.</small>
        </li>`
      : null,
    indexList(
      () => summary().resourcesGained.slice(0, 6),
      (resource) => html`
        <li>
          <strong>${() => resource().label}</strong>
          <small>
            ${() =>
              `${formatSignedResourceDelta(resource().delta)} to ${formatResource(
                resource().after,
              )}`}
          </small>
        </li>
      `,
    ),
  ]
}

export function offlineReturnJobRows(summary: () => AddOfflineReturnSummary): unknown {
  return [
    summary().jobsCompleted.length === 0
      ? html`<li>
          <strong>No job completed</strong>
          <small>No queued job finished.</small>
        </li>`
      : null,
    indexList(
      () => summary().jobsCompleted.slice(0, 4),
      (job) => html`
        <li>
          <strong>${() => job().label}</strong>
          <small>${() => offlineReturnJobKindLabel(job().kind)}</small>
        </li>
      `,
    ),
  ]
}

/**
 * Brownout first, then the rules that stopped. A brownout explains why several
 * of the rules below it did not progress, so it reads before them.
 */
export function offlineReturnBlockerRows(summary: () => AddOfflineReturnSummary): unknown {
  const blockers = (): readonly { label: string; detail: string }[] => {
    const current = summary()
    const rows = current.brownout.occurred
      ? [{ label: "Brownout pressure", detail: current.brownout.summary }]
      : []
    return [
      ...rows,
      ...current.didNotProgress.map((rule) => ({ label: rule.label, detail: rule.detail })),
    ]
  }
  return [
    blockers().length === 0
      ? html`<li>
          <strong>No return blockers</strong>
          <small>Nothing needed attention.</small>
        </li>`
      : null,
    indexList(
      blockers,
      (blocker) => html`
        <li>
          <strong>${() => blocker().label}</strong>
          <small title=${() => blocker().detail}>
            ${() => leadUiCopy(blocker().detail, BLOCKER_DETAIL_LENGTH)}
          </small>
        </li>
      `,
    ),
  ]
}

export function offlineReturnPausedRows(summary: () => AddOfflineReturnSummary): unknown {
  return indexList(
    () => summary().didNotProgress,
    (rule) => html`
      <li>
        <strong>${() => rule().label}</strong>
        <small title=${() => rule().detail}>
          ${() => leadUiCopy(rule().detail, BLOCKER_DETAIL_LENGTH)}
        </small>
      </li>
    `,
  )
}
