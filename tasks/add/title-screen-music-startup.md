# Title-screen music startup and control

## Player outcome

Players see a prominent, honest Hush Afterwards control on the title screen. The app attempts playback at page load, reports when audible autoplay is blocked, and starts the theme from the first player gesture without that gesture accidentally muting it.

## Authoritative layer

- Owning layer/path: Live ADD browser app, `apps/add-rpg/src/browser/`.
- Authoritative state or rule: Persisted audio preferences remain in `settings/settings-state.ts`; `audio/music-director.ts` owns playback lifecycle, intent resolution, and playback-state reporting; the browser controls whether audible autoplay is permitted.
- Browser/domain/renderer consumers: `main.ts` renders the title and in-game controls; `audio/boot.ts` starts the director.
- Why this boundary is correct: Audio playback and title controls are browser lifecycle and player presentation behavior. This does not change gameplay authority or authored content.

## Affected content IDs

- IDs: none.
- Families: Player audio settings and the existing Hush Afterwards soundtrack track; no authored content families are changed.
- Legacy references consulted: none.

## Acceptance scenarios

1. Given the title screen is open, when the page loads, then a prominent music control appears beside the title kicker and the music director attempts playback immediately.
2. Given the browser blocks audible autoplay, when the page settles, then the title control says Start music; clicking it starts the theme, and the first menu interaction also starts it.
3. Given the blocked-autoplay Start music control is clicked, when its pointer or keyboard gesture unlocks audio, then the control starts music instead of muting it.
4. Given the theme is playing, when the title or in-game quick control is activated, then the persisted music preference mutes it and the control remains reachable on the title home, load, and options views.

## Focused verification

- First command: `node apps/add-rpg/node_modules/vite/bin/vite.js build apps/add-rpg --config apps/add-rpg/vite.config.mjs` (UI-only bundle build; use the ADD UI profile when Rust/WASM inputs change).
- Additional command(s): `AGENT_VERIFY_SMOKE=1 npm run agent:verify:add-ui`; `npm run smoke:add-rpg:built`.
- Browser/screenshot/state evidence, if presentation changes: Inspect the title screen at desktop and mobile widths, confirm the Start music / Music on / Music off state is exposed to accessibility queries, and verify the soundtrack request and persisted mute setting.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: none; this is a browser audio and title-screen change with no gameplay mutation.
- Focused command/result artifact: The Vite production build passed in the broker worktree. Chrome on the rebuilt local preview loaded the title UI and soundtrack path; a fresh isolated page got the expected autoplay `NotAllowedError`, then the Start music control started playback. No gameplay or WASM inputs changed.
- Player-facing evidence (if applicable): The desktop title screenshot was inspected with a 121x44 Start music control beside the kicker. In a fresh browser context, Start music changed to Music on after `play()` succeeded; subsequent clicks changed it to Music off (persisted `musicMuted: true`) and back to Music on. A 390x760 mobile screenshot showed the control, note, and menu with no horizontal overflow.
- Remaining risk or explicit reason: Browsers can block audible autoplay before a user gesture; the app cannot force sound before the player interacts. It attempts playback on load, tells the player when a gesture is needed, and starts on the control or first menu interaction.

## Likely follow-up

No content or gameplay follow-up is required. Future audio work can reuse playback-state reporting if other surfaces need to reflect blocked or failed playback.

## Scope guard

Confirm that the task:

- extends the existing `apps/add-rpg` game when it is an ADD feature;
- keeps gameplay mutation in Rust and content authoring in the declared layer;
- does not add speculative shared infrastructure without a current consumer;
- does not turn legacy/reference material into a live dependency.
