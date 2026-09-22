// Leaf list components for the ADD interface.
//
// These are the rows that a snapshot replaces wholesale on every frame, and
// they are the ones that have historically flickered. They live here rather
// than inside the app's single render function for two reasons: a component
// that takes its data and its callbacks as props can be rendered by any app in
// this repo, and it can be reasoned about — and eventually tested — without
// standing up the whole game.
//
// Every prop is an accessor, never a value. Passing `resources()` would read
// the signal at call time and freeze it; passing `() => resources()` lets the
// component track it.
import type {
  AddConstructionSummary,
  AddInventoryEntry,
  AddPerkSummary,
  AddResourceSummary,
  AddRoleAssignmentSummary,
  AddWorldActionSummary,
} from "@aedventure/add-presentation"
import html from "solid-js/html"
import { indexList, showWhen } from "./control-flow"

export interface FirstPlayableStep {
  readonly label: string
  readonly active: boolean
  readonly complete: boolean
}

export interface MapModeTab<Id extends string = string> {
  readonly id: Id
  readonly label: string
  readonly shortLabel: string
  readonly ariaLabel: string
}

/** Objective checklist: what the player is being asked to do next. */
export function ObjectiveSteps(props: { steps: () => readonly FirstPlayableStep[] }): unknown {
  return indexList(
    props.steps,
    (step) => html`
      <li class=${() => (step().active ? "active" : step().complete ? "complete" : "")}>
        <span>${() => step().label}</span>
        <small>${() => (step().complete ? "Done" : step().active ? "Now" : "Next")}</small>
      </li>
    `,
  )
}

/** Resource readouts, with the reason a resource is stuck when it is. */
export function ResourceList(props: {
  resources: () => readonly AddResourceSummary[]
  format: (value: number) => string
}): unknown {
  return indexList(
    props.resources,
    (resource) => html`
      <article class="resource-row">
        <span>
          ${() => resource().label}
          ${() =>
            resource().blocker
              ? html`<small class="row-blocker">${() => resource().blocker}</small>`
              : html`<small>${() => `${resource().source} -> ${resource().sink}`}</small>`}
        </span>
        <strong>
          ${() => `${props.format(resource().value)} / ${props.format(resource().cap)}`}
        </strong>
      </article>
    `,
  )
}

/** World actions the player could start, and why they cannot. */
export function WorldActionList(props: {
  actions: () => readonly AddWorldActionSummary[]
}): unknown {
  return indexList(
    props.actions,
    (action) => html`
      <li class=${() => (action().enabled ? "" : "disabled")}>
        <span>${() => action().label}</span>
        <small>${() => action().blockedReason ?? (action().heroOnly ? "hero" : "crew")}</small>
      </li>
    `,
  )
}

/**
 * Role assignment rows, indexed over a fixed id list rather than over whatever
 * the snapshot happens to contain, so a role that is briefly missing does not
 * shuffle every row below it.
 */
export function RoleControls(props: {
  roleIds: () => readonly string[]
  roleFor: (id: string) => AddRoleAssignmentSummary | undefined
  ready: () => boolean
  shortLabel: (id: string) => string
  elementId: (id: string) => string
  onAssignHero: (id: string) => void
  onAssignCrew: (id: string, crew: number) => void
}): unknown {
  return indexList(props.roleIds, (roleId) =>
    showWhen(
      () => props.roleFor(roleId()),
      (role) => html`
        <article class="quick-control-row">
          <span>
            ${() => role().label}
            <small>${() => role().lockedReason ?? `${role().crewAssigned} crew`}</small>
          </span>
          <div>
            <button
              id=${() => `assign-${props.elementId(role().id)}`}
              type="button"
              class="ghost-button"
              onClick=${() => props.onAssignHero(role().id)}
              disabled=${() => !props.ready() || !role().available}
            >
              Hero
            </button>
            <button
              id=${() => `crew-${props.elementId(role().id)}`}
              type="button"
              onClick=${() => props.onAssignCrew(role().id, role().suggestedCrew)}
              disabled=${() => !props.ready() || !role().available || role().suggestedCrew <= 0}
            >
              ${() => `${props.shortLabel(role().id)} crew`}
            </button>
          </div>
        </article>
      `,
    ),
  )
}

/** Construction projects, indexed over a fixed id list for the same reason. */
export function ConstructionControls(props: {
  optionIds: () => readonly string[]
  optionFor: (id: string) => AddConstructionSummary | undefined
  ready: () => boolean
  buttonId: (id: string) => string
  onStart: (id: string) => void
}): unknown {
  return indexList(props.optionIds, (optionId) =>
    showWhen(
      () => props.optionFor(optionId()),
      (option) => html`
        <article class="quick-control-row">
          <span>
            ${() => option().label}
            <small>
              ${() =>
                option().complete ? "Complete" : option().blockedReason ?? option().costLabel}
            </small>
          </span>
          <button
            id=${() => props.buttonId(option().id)}
            type="button"
            onClick=${() => props.onStart(option().id)}
            disabled=${() => !props.ready() || !option().enabled}
          >
            Start
          </button>
        </article>
      `,
    ),
  )
}

/** Perks, learned and learnable. */
export function PerkControls(props: {
  perks: () => readonly AddPerkSummary[]
  ready: () => boolean
  elementId: (id: string) => string
  onAcquire: (id: string) => void
}): unknown {
  return indexList(
    props.perks,
    (perk) => html`
      <article class="quick-control-row">
        <span>
          ${() => perk().label}
          <small>
            ${() => (perk().acquired ? "Learned" : perk().lockedReason ?? perk().description ?? "")}
          </small>
        </span>
        <button
          id=${() => `perk-${props.elementId(perk().id)}`}
          type="button"
          class="ghost-button"
          onClick=${() => props.onAcquire(perk().id)}
          disabled=${() => !props.ready() || !perk().available}
        >
          ${() => (perk().acquired ? "Learned" : "Learn")}
        </button>
      </article>
    `,
  )
}

/** Carried items. Dropping is only possible where `canDrop` says it is. */
export function InventoryList(props: {
  items: () => readonly AddInventoryEntry[]
  ready: () => boolean
  canDrop: () => boolean
  elementId: (id: string) => string
  onUse: (id: string) => void
  onDrop: (id: string) => void
}): unknown {
  return [
    showWhen(
      () => props.items().length === 0,
      () => html`<p class="quick-control-empty"><small>Empty — scavenge to find scrap.</small></p>`,
    ),
    indexList(
      props.items,
      (item) => html`
        <article class="quick-control-row">
          <span>
            ${() => item().label}
            <small>
              ${() =>
                item().maxStack ? `${item().quantity}/${item().maxStack}` : `${item().quantity}`}
            </small>
          </span>
          <div>
            ${() =>
              showWhen(
                () => item().usable,
                () => html`<button
                  id=${() => `use-${props.elementId(item().id)}`}
                  type="button"
                  onClick=${() => props.onUse(item().id)}
                  disabled=${() => !props.ready() || item().quantity <= 0}
                >
                  Use
                </button>`,
              )}
            <button
              id=${() => `drop-${props.elementId(item().id)}`}
              type="button"
              class="ghost-button"
              onClick=${() => props.onDrop(item().id)}
              disabled=${() => !props.ready() || !props.canDrop() || item().quantity <= 0}
            >
              Drop
            </button>
          </div>
        </article>
      `,
    ),
  ]
}

/** Map mode tab strip. */
export function MapModeTabs<Id extends string>(props: {
  modes: () => readonly MapModeTab<Id>[]
  current: () => string
  actionId: (id: Id) => string
  onSelect: (id: Id) => void
}): unknown {
  return indexList(
    props.modes,
    (option) => html`
      <button
        id=${() => `map-mode-${option().id}`}
        type="button"
        data-action-id=${() => props.actionId(option().id)}
        class=${() =>
          props.current() === option().id ? "map-mode-button active" : "map-mode-button"}
        role="tab"
        aria-selected=${() => props.current() === option().id}
        aria-label=${() => option().ariaLabel}
        onClick=${() => props.onSelect(option().id)}
      >
        <span class="map-mode-label-full">${() => option().label}</span>
        <span class="map-mode-label-short" aria-hidden="true">${() => option().shortLabel}</span>
      </button>
    `,
  )
}

export interface ForecastDelta {
  readonly label: string
  readonly delta: number
  readonly capReached: boolean
}

export interface EconomyForecast {
  readonly label: string
  readonly summary: string
  readonly resourceDeltas: readonly ForecastDelta[]
}

/**
 * What waiting would do to the base's resources.
 *
 * The filter is the content of this component: a delta too small to see is
 * noise, but one that has hit a cap is worth saying even at zero, because the
 * reason it is not moving is the thing the player needs to know.
 */
export function EconomyForecastCard(props: {
  forecast: () => EconomyForecast
  format: (value: number) => string
  /** How many deltas to show before the line stops being readable. */
  limit?: number
}): unknown {
  const shown = (): readonly ForecastDelta[] =>
    props
      .forecast()
      .resourceDeltas.filter((delta) => Math.abs(delta.delta) >= 0.001 || delta.capReached)
      .slice(0, props.limit ?? 3)
  return html`
    <article class="base-economy-forecast">
      <span>${() => props.forecast().label}</span>
      <strong>${() => props.forecast().summary}</strong>
      <small>
        ${() =>
          shown().length > 0
            ? shown()
                .map((delta) => `${delta.label} ${props.format(delta.delta)}`)
                .join(" · ")
            : "No material resource change."}
      </small>
    </article>
  `
}
