// The story-content browser: a developer surface over what the narrative
// engine has done and what it will allow next.
//
// The eligibility row is the one that earns its place. Beat selection is
// emergent — preconditions are evaluated against live state and the winner is
// whichever eligible beat has the highest priority — so "why is this beat not
// firing?" is otherwise answerable only by reading Rust. It shows each
// precondition and whether it passed.
import type { AddStoryContentBrowserState } from "@aedventure/add-presentation"
import html from "solid-js/html"

import { indexList, showWhen } from "./control-flow"

type Browser = AddStoryContentBrowserState

export function storyBrowserBeatRows(beats: () => Browser["completedBeats"]): unknown {
  return indexList(
    beats,
    (beat) => html`
      <li>
        <span>
          <strong>${() => beat().label}</strong>
          <small>${() => `${beat().arc} · sequence ${beat().sequence}`}</small>
        </span>
        <code>${() => beat().id}</code>
      </li>
    `,
  )
}

export function storyBrowserChoiceRows(choices: () => Browser["choicesMade"]): unknown {
  return indexList(
    choices,
    (choice) => html`
      <li>
        <span>
          <strong>${() => choice().optionLabel}</strong>
          <small>${() => choice().beatLabel}</small>
        </span>
        <code>${() => choice().optionId}</code>
      </li>
    `,
  )
}

export function storyBrowserQualityRows(qualities: () => Browser["qualities"]): unknown {
  return indexList(
    qualities,
    (quality) => html`
      <li>
        <span>${() => quality().key}</span>
        <strong>${() => quality().value}</strong>
      </li>
    `,
  )
}

export function storyBrowserCommandRows(commands: () => Browser["availableCommands"]): unknown {
  return indexList(
    commands,
    (command) => html`
      <li
        class=${() => (command().enabled ? "story-browser-enabled" : "story-browser-disabled")}
        data-action-id=${() => command().id}
      >
        <span>
          <strong>${() => command().label}</strong>
          <small>
            ${() =>
              command().disabledReason ?? `${command().workerType} · ${command().kind}`}
          </small>
        </span>
        <code>${() => command().id}</code>
      </li>
    `,
  )
}

/** Active beats and completed ones are both "not blocked", but only one is now. */
export function beatEligibilityLabel(entry: Browser["beatEligibility"][number]): string {
  if (entry.active) return "Active"
  if (entry.completed) return "Done"
  return entry.eligible ? "Eligible" : "Blocked"
}

export function storyBrowserEligibilityRows(
  entries: () => Browser["beatEligibility"],
): unknown {
  return indexList(
    entries,
    (entry) => html`
      <li
        class=${() =>
          entry().eligible || entry().active ? "story-browser-enabled" : "story-browser-disabled"}
      >
        <span>
          <strong>${() => entry().beat.label}</strong>
          <small>${() => entry().reason}</small>
          ${() =>
            showWhen(
              () => entry().preconditions.length > 0,
              () =>
                html`<span class="story-browser-condition-line">
                  ${indexList(
                    () => entry().preconditions,
                    (condition) =>
                      html`<i data-pass=${() => condition().passed}>
                        ${() => condition().label}
                      </i>`,
                  )}
                </span>`,
            )}
        </span>
        <code>${() => beatEligibilityLabel(entry())}</code>
      </li>
    `,
  )
}
