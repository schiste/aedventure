# ADD Task Brief: Hush Afterwards Main Theme

## Player outcome

After the player's first audio-enabled gesture, the supplied recording becomes the game's ambient main theme. It loops as the default world bed, respects the existing mute and volume settings, and yields to higher-priority adaptive music with the existing crossfade.

## Authoritative layer

- Owning layer/path: apps/add-rpg/src/browser/audio/.
- Authoritative state or rule: the browser music director resolves MusicIntent values to a registered track and owns playback/crossfade.
- Browser/domain/renderer consumers: browser audio and the existing settings event bridge.
- Why this boundary is correct: a soundtrack is presentation; no gameplay mutation or Rust/WASM state is involved.

## Affected content IDs

- IDs: new presentation track ID music.hush_afterwards; no ADD simulation/content IDs.
- Families: browser music registry and static audio asset.
- Legacy references consulted: none.

## Acceptance scenarios

1. Given the player opens the game and makes the first audio-enabled gesture, when the baseline ambient intent resolves, then Hush Afterwards starts, loops, and loads from the configured /app/ asset base.
2. Given a higher-priority night or story/combat intent becomes active, when the director resolves it, then the theme crossfades out; when that intent is released, the theme crossfades back in.
3. Given the player mutes music or changes the music/master volume, when the settings event is applied, then the supplied recording follows the existing effective music gain.

## Focused verification

- First command: npm run agent:verify:add-ui.
- Additional command(s): npm --workspace @aedventure/add-rpg run build:browser, then ADD_QA_TIMEOUT_SCALE=3 npm run smoke:add-rpg:built.
- Browser/screenshot/state evidence, if presentation changes: after a user gesture, confirm the audio request and playback state; verify an adaptive intent crossfade returns to the theme.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: none; audio playback is browser presentation behavior.
- Focused command/result artifact: ADD profile passed; its console result and browser evidence are recorded in progress.md and the session 96 handoff. Task brief validation artifact: artifacts/agent-verification/20260926073403348-task-description-10775/result.json.
- Player-facing evidence (if applicable): Chrome verified a 200 response from /app/audio/music/hush-afterwards.mp3; after release of a tension intent, play() resolved, the element was looping and unpaused, and currentTime advanced.
- Remaining risk or explicit reason: only the supplied MP3 and M4A files were found in Downloads; no third format was present. The MP3 is the shipped web asset.

## Likely follow-up

A later asset pipeline may add attribution/license metadata or alternate encodings if the game is packaged beyond the browser. No new conversion pipeline is introduced for this single supplied recording.

## Scope guard

- Extends the existing apps/add-rpg game.
- Keeps gameplay mutation in Rust and content authoring in the declared layer; this task has no gameplay mutation or authored ADD content.
- Adds no speculative shared infrastructure without a current consumer.
- Does not turn legacy/reference material into a live dependency.
