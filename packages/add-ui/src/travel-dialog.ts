// The travel confirmation dialog's buttons.
//
// Four shapes, because the dialog says a different thing each time the Hero is
// asked to leave the field:
//
//   first_warning      the first time, spelled out — "No, stay here"
//   first_declined     they said no, and this is the acknowledgement
//   dramatic_reprise   a later, riskier trip, phrased as a choice again
//   (default)          they know by now — "Not yet" / "Yes, I know"
//
// The wording is the content of this component. A single "Cancel / Confirm" pair
// would be correct and would lose the fact that the game is escalating.
import html from "solid-js/html"

export type TravelDialogKind = "first_warning" | "first_declined" | "dramatic_reprise" | (string & {})

export interface TravelDialogActionIds {
  /** QA contract ids, passed in so this stays clear of the app's contract module. */
  readonly cancel: string
  readonly confirm: string
  readonly dismissWarning: string
}

export interface TravelDialogActionsProps {
  kind: () => TravelDialogKind
  actionIds: TravelDialogActionIds
  /** `true` to go, `false` to stay. */
  onAnswer: (venture: boolean) => void
}

/**
 * Buttons carry `data-key-action` and `aria-keyshortcuts` rather than binding
 * keys here: the dialog owns the keyboard, and it finds its own confirm and
 * cancel by those attributes. Enter and Escape therefore keep working whatever
 * the buttons are labelled.
 */
export function travelDialogActions(props: TravelDialogActionsProps): unknown {
  const stay = (): void => props.onAnswer(false)
  const go = (): void => props.onAnswer(true)

  return () => {
    const kind = props.kind()

    if (kind === "first_declined") {
      return [
        html`
          <button
            id="travel-dialog-dismiss"
            type="button"
            class="primary-action"
            data-action-id=${props.actionIds.dismissWarning}
            data-key-action="confirm"
            aria-keyshortcuts="Enter Escape"
            onClick=${go}
          >
            Fine
          </button>
        `,
      ]
    }

    if (kind === "dramatic_reprise") {
      return [
        html`
          <button
            id="travel-dialog-cancel"
            type="button"
            class="ghost-button"
            data-action-id=${props.actionIds.cancel}
            data-key-action="cancel"
            aria-keyshortcuts="Escape"
            onClick=${stay}
          >
            Actually wait
          </button>
        `,
        html`
          <button
            id="travel-dialog-venture"
            type="button"
            class="primary-action"
            data-action-id=${props.actionIds.confirm}
            data-key-action="confirm"
            aria-keyshortcuts="Enter"
            onClick=${go}
          >
            Venture forth
          </button>
        `,
      ]
    }

    const firstWarning = kind === "first_warning"
    return [
      html`
        <button
          id="travel-dialog-cancel"
          type="button"
          class="ghost-button"
          data-action-id=${props.actionIds.cancel}
          data-key-action="cancel"
          aria-keyshortcuts="Escape"
          onClick=${stay}
        >
          ${firstWarning ? "No, stay here" : "Not yet"}
        </button>
      `,
      html`
        <button
          id="travel-dialog-confirm"
          type="button"
          class="primary-action"
          data-action-id=${props.actionIds.confirm}
          data-key-action="confirm"
          aria-keyshortcuts="Enter"
          onClick=${go}
        >
          ${firstWarning ? "OK, venture forth" : "Yes, I know"}
        </button>
      `,
    ]
  }
}
