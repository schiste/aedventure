# ADD Task Brief: Hush Afterwards as the Sole Music Bed

## Player outcome

After the player's first audio-enabled gesture, the supplied recording is the only music heard in the game. Ambient, night, combat, danger, victory, and future unmatched music intents all continue using Hush Afterwards. The recording loops and respects the existing mute and volume settings.

## Authoritative layer

- Owning layer/path: apps/add-rpg/src/browser/audio/.
- Authoritative state or rule: the browser music director resolves prioritized MusicIntent values to the sole registered track and owns playback.
- Browser/domain/renderer consumers: browser audio and the existing settings event bridge.
- Why this boundary is correct: a soundtrack is presentation; no gameplay mutation or Rust/WASM state is involved.

## Affected content IDs

- IDs: music.hush_afterwards; no ADD simulation/content IDs.
- Families: browser music registry and static audio asset.
- Legacy references consulted: none.

## Acceptance scenarios

1. Given the player makes the first audio-enabled gesture, when baseline, night, tension/combat, victory, or an unmatched mood intent is active, then Hush Afterwards remains the selected track and loops.
2. Given any game intent is added or released, when the winning intent changes, then the current recording keeps playing without switching or restarting.
3. Given the player mutes music or changes the music/master volume, when the settings event is applied, then the supplied recording follows the existing effective music gain.

## Focused verification

- First command: npm --workspace @aedventure/add-rpg run build:browser.
- Additional command(s): relaunch the built local app and confirm the MP3 loads and playback stays on the same media element as game mood intents change.
- Browser/screenshot/state evidence, if presentation changes: inspect the relaunched app state, audio asset response, loop status, active track telemetry, and console errors. A screenshot is not material to this audio-only change.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: none; audio playback is browser presentation behavior.
- Focused command/result artifact: browser build passed with npm --workspace @aedventure/add-rpg run build:browser; ADD profile passed with ADD_QA_TIMEOUT_SCALE=3 npm run agent:verify:add-ui (234 add-core tests, 20 scenario tests, content, WASM, ADD types, and smoke syntax). Scale 3 is the documented timeout adjustment, not a pass result.
- Player-facing evidence (if applicable): Chrome loaded /app/audio/music/hush-afterwards.mp3 with HTTP 200. After a user gesture, play() was called once, the media stayed unpaused and looping, and currentTime advanced while ambient, night, tension, combat, triumph, victory, an unmatched mood, and an unknown track ID were requested. The title screen screenshot was visually inspected.
- Remaining risk or explicit reason: only the supplied MP3 and M4A files were found in Downloads; the MP3 is the shipped web asset.

## Likely follow-up

A later asset pipeline may add attribution/license metadata or alternate encodings if the game is packaged beyond the browser. No conversion pipeline is needed for this supplied web recording.

## Scope guard

- Extends the existing apps/add-rpg game.
- Keeps gameplay mutation in Rust and content authoring in the declared layer; this task has no gameplay mutation or authored ADD content.
- Adds no speculative shared infrastructure without a current consumer.
- Does not turn legacy/reference material into a live dependency.
