# Title-screen music startup and control

## Player outcome

Players can see and control the Hush Afterwards theme before starting or loading a game. Playback is attempted as the title page loads and starts on the first interaction when the browser blocks audible autoplay.

## Authoritative layer

- Owning layer/path: Live ADD browser app, `apps/add-rpg/src/browser/`.
- Authoritative state or rule: Persisted audio preferences remain in `settings/settings-state.ts`; `audio/music-director.ts` owns playback lifecycle and intent resolution; the browser controls whether audible autoplay is permitted.
- Browser/domain/renderer consumers: `main.ts` renders the title and in-game controls; `audio/boot.ts` starts the director.
- Why this boundary is correct: Audio playback and title controls are browser lifecycle and player presentation behavior. This does not change gameplay authority or authored content.

## Affected content IDs

- IDs: none.
- Families: Player audio settings and the existing Hush Afterwards soundtrack track; no authored content families are changed.
- Legacy references consulted: none.

## Acceptance scenarios

1. Given the title screen is open, when the page loads, then the music control is visible and the music director attempts playback immediately.
2. Given the browser blocks autoplay, when the player interacts with the page, then the theme retries playback without requiring the player to start a game.
3. Given the music control is visible on the title screen or in-game, when the player toggles it, then the persisted music preference changes and the control remains reachable on the title home, load, and options views.

## Focused verification

- First command: `AGENT_VERIFY_SMOKE=1 npm run agent:verify:add-ui`.
- Additional command(s): `npm --workspace @aedventure/add-rpg run build:browser`; `npm run smoke:add-rpg:built`.
- Browser/screenshot/state evidence, if presentation changes: Inspect the title screen at desktop and mobile widths, confirm the title toggle is exposed to accessibility queries, and verify the soundtrack request and persisted mute setting.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: none; this is a browser audio and title-screen change with no gameplay mutation.
- Focused command/result artifact: `AGENT_VERIFY_SMOKE=1 npm run agent:verify:add-ui` passed Rust tests (234 core, 20 scenario), content checks, WASM build, ADD types, and smoke syntax; it exited at the built-browser step because this fresh worktree lacked `dist-app`. `npm --workspace @aedventure/add-rpg run build:browser` then passed, followed by `ADD_QA_TIMEOUT_SCALE=3 npm run smoke:add-rpg:built` on the final bundle (passed).
- Player-facing evidence (if applicable): Chrome DevTools snapshot and screenshot confirmed the labeled title toggle at 1365x768 and 390x760, and in the Load and Options views. Clicking it updates the visible title and in-game controls and persists `musicMuted`. A reload initiated an HTTP 200 request for `audio/music/hush-afterwards.mp3`.
- Remaining risk or explicit reason: Audible autoplay remains subject to browser policy. The director attempts playback on load and retries on the first pointer or keyboard interaction when needed.

## Likely follow-up

No content or gameplay follow-up is required. Revisit audio readiness telemetry if the game later needs to distinguish a blocked attempt from active playback in player-facing status.

## Scope guard

Confirm that the task:

- extends the existing `apps/add-rpg` game when it is an ADD feature;
- keeps gameplay mutation in Rust and content authoring in the declared layer;
- does not add speculative shared infrastructure without a current consumer;
- does not turn legacy/reference material into a live dependency.
