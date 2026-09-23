// Base management cards: resources, staffing pools, and the loop summaries.
//
// Self-contained views over `AddBaseManagementState`. The `data-pressure` and
// `data-severity` attributes are the load-bearing part — the stylesheet colours
// on them, so a card says "this is fine" or "this is stuck" without the copy
// having to.
import type { AddBaseManagementState } from "@aedventure/add-presentation"
import html from "solid-js/html"

import { indexList, showWhen } from "./control-flow"
import {
  formatEconomyDuration,
  formatResource,
  formatResourceTime,
  leadUiCopy,
  signedRateCopy,
} from "./format"

type Base = AddBaseManagementState

/**
 * "ready" and "blocked" are different from a duration, and both are different
 * from each other: nothing to wait for, versus something that will never come.
 */
export function formatAffordabilityTime(
  affordability: Base["resources"][number]["nextAffordability"],
): string {
  if (!affordability) return "ready"
  return affordability.timeToAffordSeconds === null
    ? "blocked"
    : formatEconomyDuration(affordability.timeToAffordSeconds)
}

/** How long a stall reason can run before it needs a tooltip instead. */
const STALL_REASON_LENGTH = 58

export function baseManagementMetricRows(
  section: () => Base["sections"][number] | undefined,
): unknown {
  return indexList(
    () => section()?.metrics ?? [],
    (metric) => html`
      <span class="base-metric" data-severity=${() => metric().severity}>
        ${() => metric().label}
        <strong>${() => metric().value}</strong>
        <small>${() => metric().detail}</small>
      </span>
    `,
  )
}

export function baseStalledSystemRow(
  stalled: () => Base["economy"]["stalledSystems"][number],
): unknown {
  return html`
    <span class="base-stalled-row" data-severity=${() => stalled().severity}>
      <strong>${() => stalled().label}</strong>
      <small title=${() => stalled().reason}>
        ${() => leadUiCopy(stalled().reason, STALL_REASON_LENGTH)}
      </small>
    </span>
  `
}

export function baseSlotPoolRows(
  pools: () => readonly Base["staffing"]["slotPools"][number][],
): unknown {
  return indexList(
    pools,
    (pool) => html`
      <article class="base-slot-pool" data-pressure=${() => pool().pressure}>
        <span>${() => pool().label}</span>
        <strong>${() => `${pool().occupied} / ${pool().capacity}`}</strong>
        <small>${() => pool().detail}</small>
      </article>
    `,
  )
}

/**
 * A resource, with why it is not moving.
 *
 * `productionZeroReason` wins over `blocker`, which wins over `sink`: a player
 * looking at a stalled resource needs the most specific answer available, and
 * the generic sink description is the least useful of the three.
 */
export function baseResourceRows(
  resources: () => readonly Base["resources"][number][],
): unknown {
  return indexList(
    resources,
    (resource) => html`
      <article class="base-management-card" data-pressure=${() => resource().capPressure}>
        <span>${() => resource().label}</span>
        <strong>
          ${() => `${formatResource(resource().value)} / ${formatResource(resource().cap)}`}
        </strong>
        <small>
          ${() => resource().productionZeroReason ?? resource().blocker ?? resource().sink}
        </small>
        <div class="base-economy-line">
          <span>${() => `Gain ${formatResource(resource().gainPerSecond)}/s`}</span>
          <span>${() => `Spend ${formatResource(resource().spendPerSecond)}/s`}</span>
          <strong>${() => `Net ${signedRateCopy(resource().netPerSecond)}`}</strong>
        </div>
        <div class="base-economy-line">
          <span>${() => `Cap ${formatResourceTime(resource().timeToCapSeconds)}`}</span>
          <span>${() => `Afford ${formatAffordabilityTime(resource().nextAffordability)}`}</span>
        </div>
        ${() =>
          showWhen(
            () => resource().nextAffordability,
            (affordability) =>
              html`<small class="base-affordability-note">
                ${() => affordability().reason}
              </small>`,
          )}
      </article>
    `,
  )
}

export function baseConstructionLoopSummary(state: () => Base): unknown {
  return html`
    <article class="base-construction-summary">
      <span>Construction loop</span>
      <strong>
        ${() =>
          `${state().buildLoop.readyProjectCount} ready / ${
            state().buildLoop.assignedWorkers
          } builders`}
      </strong>
      <small>${() => state().buildLoop.summary}</small>
      <div class="base-economy-line">
        <span>
          ${() => `Throughput ${signedRateCopy(state().buildLoop.workerThroughputPerSecond)}`}
        </span>
        <span>${() => `${state().buildLoop.blockedProjectCount} waiting`}</span>
      </div>
    </article>
  `
}

export function baseStationMachineSummary(state: () => Base): unknown {
  return html`
    <article
      class="base-machine-summary"
      data-brownout=${() => (state().stationMachine.brownedOutCount > 0 ? "true" : "false")}
    >
      <span>Station machine</span>
      <strong>
        ${() =>
          `${state().stationMachine.poweredCount} powered / ${
            state().stationMachine.activeJobCount
          } jobs`}
      </strong>
      <small>${() => state().stationMachine.summary}</small>
      <div class="base-economy-line">
        <span>
          ${() =>
            `Active upkeep ${formatResource(
              state().stationMachine.activeUpkeepPerSecond,
            )} Chorus/s`}
        </span>
        <span>
          ${() =>
            `Requested ${formatResource(
              state().stationMachine.requestedUpkeepPerSecond,
            )} Chorus/s`}
        </span>
      </div>
    </article>
  `
}

export function resonanceMaterialCard(
  material: () => Base["resonance"]["materials"][number],
): unknown {
  return html`
    <article
      class="base-management-card"
      data-pressure=${() => (material().value > 0 ? "room" : "empty")}
    >
      <span>Strange material</span>
      <strong>${() => `${material().value} ${material().label}`}</strong>
      <small>${() => material().detail}</small>
    </article>
  `
}

/** Expeditions in the field, or the nudge to send one. */
export function expeditionActiveJobRows(state: () => Base): unknown {
  return [
    showWhen(
      () => state().expeditions.activeJobs.length === 0,
      () => html`
        <article class="base-management-card">
          <span>In the field</span>
          <strong>No active expedition</strong>
          <small>
            Send free crew from the target list below to keep the base acting in parallel.
          </small>
        </article>
      `,
    ),
    indexList(
      () => state().expeditions.activeJobs,
      (job) => html`
        <article class="base-management-card active" data-pressure=${() => job().risk}>
          <span>In the field</span>
          <strong>${() => job().label}</strong>
          <small>${() => job().returnCopy}</small>
          <div
            class="base-progress-track"
            aria-label=${() => `${job().label} expedition progress`}
          >
            <i style=${() => `width:${Math.round(job().progressPercent)}%`} aria-hidden="true" />
          </div>
          <div class="base-economy-line">
            <span>${() => `${job().assignedCrew} crew`}</span>
            <span>${() => job().riskLabel}</span>
            <strong>${() => formatEconomyDuration(job().remainingSeconds)}</strong>
          </div>
        </article>
      `,
    ),
  ]
}

export function socialPendingArrivalRows(state: () => Base): unknown {
  return [
    showWhen(
      () => state().socialPressure.pendingArrivals.length === 0,
      () => html`
        <article class="base-management-card">
          <span>Pending arrival</span>
          <strong>None</strong>
          <small>No recruit is traveling to the base right now.</small>
        </article>
      `,
    ),
    indexList(
      () => state().socialPressure.pendingArrivals,
      (arrival) => html`
        <article class="base-management-card active">
          <span>Pending arrival</span>
          <strong>${() => arrival().label}</strong>
          <small>${() => arrival().arrivalCopy}</small>
          <div
            class="base-progress-track"
            aria-label=${() => `${arrival().label} arrival progress`}
          >
            <i
              style=${() => `width:${Math.round(arrival().progressPercent)}%`}
              aria-hidden="true"
            />
          </div>
        </article>
      `,
    ),
  ]
}

/** How long a loop summary can run inside a focus tile. */
const FOCUS_DETAIL_LENGTH = 50

/**
 * One step of the idle loop, as a jump to the tab that serves it.
 *
 * A step with no `tabId` is disabled rather than hidden: the loop is a fixed
 * sequence, and hiding a step would make the shape of the loop change under the
 * player depending on where they are in it.
 */
export function basePlayerLoopStep(
  step: () => Base["playerLoop"]["steps"][number],
  onSelectTab: (tabId: string) => void,
): unknown {
  return html`
    <button
      type="button"
      class="base-loop-step"
      data-status=${() => step().status}
      onClick=${() => {
        const tabId = step().tabId
        if (tabId) onSelectTab(tabId)
      }}
      disabled=${() => step().tabId === null}
    >
      <span>${() => step().label}</span>
    </button>
  `
}

/**
 * The idle loop, as five things to look at in order: how the base is, what is
 * stopping it, what to do, what waiting would buy, and when to come back.
 *
 * Every tile is a keyboard stop with its own label, because this is the panel a
 * player reads to decide what to do next and it has to be navigable without a
 * pointer.
 */
export function basePlayerLoopPanel(props: {
  state: () => Base
  onSelectTab: (tabId: string) => void
  /** The disclosure primitive, passed in so this module stays free of JSX. */
  renderPlanDetail: (args: {
    id: string
    summary: string
    fullCopy: string | null | undefined
    visibleCopy: string
    className: string
  }) => unknown
}): unknown {
  const loop = (): Base["playerLoop"] => props.state().playerLoop
  const currentStep = (): Base["playerLoop"]["steps"][number] | undefined =>
    loop().steps.find((step) => step.status === "current")
  const waitForecast = (): Base["economy"]["waitForecasts"][number] | null =>
    props.state().economy.waitForecasts[0] ?? null
  const waitSummary = (): string =>
    waitForecast()?.summary ?? props.state().economy.offlinePreview.summary
  const lead = (copy: string | null | undefined): string => leadUiCopy(copy, FOCUS_DETAIL_LENGTH)

  return html`
    <section
      id="base-player-loop"
      class="base-player-loop keyboard-section"
      data-health=${() => loop().health.status}
      tabindex="0"
      aria-label="Base player loop"
    >
      <header>
        <span>Player loop</span>
        <strong>${() => currentStep()?.label ?? "Decide"}</strong>
        <small title=${() => loop().summary}>
          Assign the Hero, check the bottleneck, watch rates, then decide if waiting helps.
        </small>
      </header>
      <div class="base-loop-focus-grid">
        <article
          class="keyboard-section"
          data-severity=${() => loop().health.severity}
          tabindex="0"
          aria-label="Base health summary"
        >
          <span>Health</span>
          <strong>${() => loop().health.label}</strong>
          <small title=${() => loop().health.detail}>${() => lead(loop().health.detail)}</small>
        </article>
        <article
          class="keyboard-section"
          data-severity=${() => loop().bottleneck.severity}
          tabindex="0"
          aria-label="Base bottleneck summary"
        >
          <span>Bottleneck</span>
          <strong>${() => loop().bottleneck.label}</strong>
          <small title=${() => loop().bottleneck.detail}>
            ${() => lead(loop().bottleneck.detail)}
          </small>
        </article>
        <article
          class="keyboard-section"
          data-severity=${() => (props.state().recommendedAction.enabled ? "good" : "neutral")}
          tabindex="0"
          aria-label="Base recommended action summary"
        >
          <span>Action</span>
          <strong>${() => props.state().recommendedAction.label}</strong>
          <small title=${() => props.state().recommendedAction.detail}>
            ${() => lead(props.state().recommendedAction.detail)}
          </small>
        </article>
        <article
          class="keyboard-section"
          data-severity="neutral"
          tabindex="0"
          aria-label="Base wait forecast summary"
        >
          <span>If I wait</span>
          <strong>${() => waitForecast()?.label ?? "Forecast"}</strong>
          <small title=${waitSummary}>${() => lead(waitSummary())}</small>
        </article>
        <article
          class="keyboard-section"
          data-severity="neutral"
          tabindex="0"
          aria-label="Base return plan summary"
        >
          <span>Return</span>
          <strong>
            ${() => {
              const horizon = loop().returnPlan.horizonSeconds
              return horizon === null ? "Review now" : formatEconomyDuration(horizon)
            }}
          </strong>
          <small title=${() => loop().returnPlan.summary}>
            ${() => lead(loop().returnPlan.summary)}
          </small>
        </article>
      </div>
      <div class="base-loop-rate-strip">
        <span>Rates</span>
        <strong>${() => loop().rateWatch.summary}</strong>
      </div>
      <div class="base-loop-steps" aria-label="Idle loop steps">
        ${indexList(
          () => loop().steps,
          (step) => basePlayerLoopStep(step, props.onSelectTab),
        )}
      </div>
      ${() =>
        props.renderPlanDetail({
          id: "base-loop-plan-detail",
          summary: "Plan",
          fullCopy: loop().decisionHint,
          visibleCopy: currentStep()?.label ?? "Decide",
          className: "base-loop-details",
        })}
    </section>
  `
}
