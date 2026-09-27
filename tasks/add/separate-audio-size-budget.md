# ADD Task Brief

## Player outcome

The player keeps the authored main theme, and future game builds report music
against a meaningful media-size limit without weakening the existing code,
WASM, style, or visual asset limits.

## Authoritative layer

- Owning layer/path: scripts/add-rpg-size-report.cjs and performance/add-budgets.json.
- Authoritative state or rule: encoded audio is measured in its own byte budget; non-audio browser assets retain the existing aggregate raw and gzip limits.
- Browser/domain/renderer consumers: the ADD browser bundle includes apps/add-rpg/public/audio/music/hush-afterwards.mp3; the size report validates the emitted assets.
- Why this boundary is correct: MP3 and similar formats are already compressed, so their byte size is not comparable to gzip-compressed code and WASM. Separate metrics keep both budgets observable.

## Affected content IDs

- IDs: none.
- Families: emitted ADD browser assets; encoded music.
- Legacy references consulted: none.

## Acceptance scenarios

1. Given a built ADD bundle containing a supported audio file, when the size report runs, then audio bytes are measured separately and checked against the dedicated audio cap.
2. Given the same bundle, when aggregate non-audio budgets are evaluated, then audio bytes are excluded while JavaScript, WASM, styles, and visual assets remain subject to their existing limits.

## Focused verification

- First command: npm run qa:add-rpg:size:test.
- Additional command(s): npm run qa:add-rpg:size:built after the browser build; npm run check before publication.
- Browser/screenshot/state evidence, if presentation changes: none; this changes size accounting only.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: none; this is a build report contract, not gameplay behavior.
- Focused command/result artifact: npm run qa:add-rpg:size:test passed. npm run qa:add-rpg:size:built passed on the d28e0aa browser build: 3,922,936 non-audio bytes, 1,375,686 non-audio gzip bytes, and 5,077,709 audio bytes, all within their separate caps.
- Player-facing evidence: none; the rendered game and music playback are unchanged.
- Remaining risk or explicit reason: the dedicated audio cap measures aggregate encoded audio size, not playback timing or codec quality. The current theme uses 5,077,709 of the 6,000,000-byte allowance.

## Likely follow-up

Capture download and playback-start timing on supported devices if startup performance work needs an audio-specific runtime budget.

## Scope guard

- Extends the existing apps/add-rpg game.
- Keeps gameplay mutation in Rust and content authoring in the declared layer.
- Adds no speculative shared infrastructure; the emitted ADD audio file is a current consumer.
- Does not turn legacy/reference material into a live dependency.
