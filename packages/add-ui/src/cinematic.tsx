// The cinematic stage: one playback surface, several media.
//
// The simulation says *which beat*; this says *what a beat looks like*. The
// split is the whole point of the primitive — adding a medium is a branch in
// `BeatMedia` below, not a second player — and it is why the stage never reads
// game state beyond the beat handed to it.
//
// Assets are named, not located. The app supplies `resolveAsset`, so where the
// files live (bundled, public folder, CDN, blob) is the app's problem and never
// the content author's.
import type { JSX } from "solid-js"
import { Show } from "solid-js"

import type { CinematicBeatView } from "./cinematic-playback"

export interface CinematicStageProps {
  /** Null when nothing is playing; the stage renders nothing. */
  beat: CinematicBeatView | null
  /** Human label, for the accessible name of the dialog. */
  label: string
  /** 0..1 across the whole cinematic, for the progress rule. */
  progress: number
  /** Beat n of m, for the counter. */
  beatNumber: number
  beatCount: number
  /** Omitted when the cinematic is authored unskippable. */
  onSkip?: () => void
  /** Advance on click, or when a video reports it ended. */
  onAdvance: () => void
  /** Name to URL. Returning null renders the beat's copy alone. */
  resolveAsset: (assetId: string) => string | null
}

/** The medium itself. One branch per kind; the only place kinds are known. */
function BeatMedia(props: {
  beat: CinematicBeatView
  resolveAsset: (assetId: string) => string | null
  onEnded: () => void
}): JSX.Element {
  const src = () => (props.beat.assetId ? props.resolveAsset(props.beat.assetId) : null)
  return (
    <Show when={src()} fallback={null}>
      {(resolved) => (
        <Show
          when={props.beat.media === "video"}
          fallback={
            <Show when={props.beat.media === "image"}>
              <img class="cinematic-media" src={resolved()} alt={props.beat.copy} />
            </Show>
          }
        >
          <video
            class="cinematic-media"
            src={resolved()}
            autoplay
            playsinline
            // `mediaEnd` beats end here. The simulation also holds an authored
            // backstop, so a clip that never fires `ended` still moves on.
            on:ended={() => props.onEnded()}
          />
        </Show>
      )}
    </Show>
  )
}

/**
 * The stage. A modal surface over everything, because a cinematic moment that
 * the player can click past is not a moment.
 */
export function CinematicStage(props: CinematicStageProps): JSX.Element {
  return (
    <Show when={props.beat}>
      {(beat) => (
        <div
          id="cinematic-stage"
          class="cinematic-stage"
          role="dialog"
          aria-modal="true"
          aria-label={props.label}
          data-media={beat().media}
          data-qa="cinematic-stage"
        >
          <div
            class="cinematic-frame"
            // Clicking the frame is how an `input` beat advances. Harmless on
            // the others: the simulation ignores an advance it did not want.
            on:click={() => props.onAdvance()}
          >
            <BeatMedia
              beat={beat()}
              resolveAsset={props.resolveAsset}
              onEnded={() => props.onAdvance()}
            />
            <Show when={beat().copy}>
              <p class="cinematic-copy" data-qa="cinematic-copy">
                {beat().copy}
              </p>
            </Show>
          </div>
          <footer class="cinematic-chrome">
            <span class="cinematic-progress" aria-hidden="true">
              <span
                class="cinematic-progress-fill"
                style={{ width: `${Math.round(props.progress * 100)}%` }}
              />
            </span>
            <span class="cinematic-count" data-qa="cinematic-count">
              {props.beatNumber} / {props.beatCount}
            </span>
            <Show when={props.onSkip}>
              {(skip) => (
                <button
                  type="button"
                  id="cinematic-skip"
                  class="cinematic-skip"
                  data-qa="cinematic-skip"
                  on:click={(event) => {
                    // Skipping must not also read as an advance on the frame.
                    event.stopPropagation()
                    skip()()
                  }}
                >
                  Skip
                </button>
              )}
            </Show>
          </footer>
        </div>
      )}
    </Show>
  )
}
