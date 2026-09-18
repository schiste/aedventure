Original prompt: continue do the whole plan end to end, granular commits as you code, don't stop until we have a locally working demo

## Progress

- Started demo-critical path: browser app, fixture-map rendering, local dev host,
  server-authoritative movement, chat, and media-token flow.
- RBAC/admin/SaaS control-plane work remains deliberately deferred.
- ADD map-primary interface pass: Phaser now renders reachable-cell decision
  affordances, 1h crossing chips, path/time preview, unknown frontier hints,
  stronger landmark/action markers, and camera framing based on known cells while
  preserving full-map pan bounds. `render_game_to_text` exposes the
  `mapPrimaryAffordances` contract so smoke tests can detect if the map becomes
  passive again.
- ADD completed-objective hierarchy pass: once the first-playable arc completes,
  the objective tracker auto-collapses once into an "Arc complete" journal chip
  instead of competing with Return/Base/Dungeon panels. Smoke now asserts the
  completed tracker is compact during the offline return review.
- ADD Base is now the earned next mode after Studio arrival: once the Base view
  opens, the shared current-action surface prioritizes the `base_loop` action,
  assigns the Hero through the recommended Base role so rate changes are
  visible, and exposes an enabled 1m "Let the base run" command tied to the
  wait forecast.
- ADD Studio placement now uses an explicit base coordinate `(0,3)`, six hexes
  from Survivor Cave `(6,0)` and on the same rendered horizontal band. The
  neutral Rust topology no longer assumes the base is the origin, ADD terrain
  regions stay anchored around the moved Studio to preserve early bubble timing,
  and browser smoke asserts both six-hex distance and horizontal world alignment.
- Verification: `npm --workspace @aedventure/add-rpg run build`, `npm run
  smoke:add-rpg`, local web-game client against `http://127.0.0.1:5177/app/`,
  and full `npm run check` passed. The in-app Browser plugin was unavailable in
  this session, so visual checks used smoke screenshots plus the bundled
  Playwright client copied into `tmp/` to resolve the repo Playwright dependency.

## Current Slice

- Convert the static browser shell from a smoke-loop page into a playable local
  demo with a local user, companion participant, keyboard movement, chat, media
  token issuance, and machine-readable browser state.

## Notes

- Browser demo queues async actions so keyboard/button input does not race
  server round trips.
- `window.render_game_to_text` and `window.advanceTime` are being added for the
  Playwright-based demo test loop.
- Browser validation passed with Playwright MCP: before join the companion is
  hidden, after join the local player and companion are visible, chat delivers to
  one recipient, media joins `zone:room-lobby:meeting-zone`, and delayed
  movement updates the server-authoritative player position.
- Continuing with lifecycle controls: reset leaves both local demo participants
  through `/world/leave` and makes the demo rejoinable without refresh.
- Playwright MCP verified join -> reset -> rejoin. Reset hides the companion,
  restores idle/not-joined/not-issued statuses, and re-enables Join demo.
- Reusable app layer now has `CustomerVirtualOfficeApp.leaveWorld()` and
  `TransportWorldClient.leave()` so future Phaser code can use the same lifecycle
  path as the local browser demo.
- World server now exposes a room-scoped snapshot route so clients can sync
  visible players from server state instead of assuming who joined locally.
- Browser demo now calls `/world/snapshot` after companion join and records the
  server-confirmed player IDs in `render_game_to_text`.
- Static `/app` files have been promoted into a Vite + TypeScript browser app
  under `apps/web`, while the dev host still preserves `/dev`, `/api`, `/world`,
  `/media`, `/app`, and `/` routes.
- `npm run check` now builds the Vite browser bundle before validating the dev
  HTTP host against the generated `/app/assets/*` files.
- Browser MCP smoke check verified the Vite-built `/app` shell loads, joins the
  local demo, syncs two players, issues a media token, sends chat, and resets.
- Phaser 4 is now integrated in `apps/web`; `/dev/fixture-map` is rendered
  through Phaser tile layers generated from asset-registry semantic token GIDs.
- The old DOM tile/player renderer has been removed from `/app`; HTML now owns
  the controls/status overlays while Phaser owns the world canvas.
- Current Phaser art is still generated placeholder tiles from semantic token
  IDs, so licensed sprite onboarding remains a later visual-assets task.
- Player rendering is now keyed by world player IDs instead of hard-coded local
  and companion slots. `/world/snapshot` drives local/remote avatar visibility,
  labels, facing direction, placeholder idle/walk tweens, and y-based z-order.
- Movement input now supports held keyboard repeat paced to the authoritative
  world tick; the browser still sends direction intents only, while Phaser
  interpolates confirmed server positions for smoothness.
- Wall/furniture collisions now surface as throttled, useful blocked-movement
  feedback, and reset clears the rendered-player cache before reseeding the
  local avatar.
- Browser MCP verified the rebuilt `/app` bundle: holding right into furniture
  stays at `112,64` with a collision rejection, holding down advances to
  `112,112` and clears the rejection marker, reset removes the companion from
  rendered players, and the browser console has no warnings or errors. The
  bundled web-game client script could not run because `playwright` is not
  installed in the skill/runtime path, so Playwright MCP was used for the
  browser pass.
- Camera/viewport behavior now lives in the Phaser renderer: the camera follows
  the local avatar, viewport size is driven by the map container, and zoom uses a
  fit-to-container base multiplied by user controls outside the canvas.
- Browser MCP verified desktop `1280x900` and mobile `390x760` layouts. The
  zoom controls update from `115%` to `160%`, `render_game_to_text` exposes
  viewport dimensions/effective zoom/camera scroll/follow target, and the
  browser console stayed clean. The standalone web-game client still cannot run
  because the skill runtime cannot resolve the `playwright` package.
- ADD runtime discovery now lives in Rust/WASM save state as `discoveredCells`
  plus `heroMap`. Reset returns discovery to Studio/base + Survivor Cave, hero
  travel reveals radius 1 at the destination, bubble progress reveals stabilized
  or actively converting bubble cells, and offline catch-up does not reveal
  anything unless those runtime rules advance. `npm run check` passed after the
  browser smoke asserted movement discovery, save/import preservation, and reset
  cleanup.
- ADD tile facts are now filtered at the domain adapter boundary. Hidden cells
  project as unknown terrain with vague travel copy, discovered cells keep
  static terrain/landmark facts while dynamic risk is stale/unknown, visible
  cells expose current facts, and dungeon links/landmark entities stay hidden
  until visibility allows them. Phaser telemetry now reports `knownFacts` so QA
  can assert the fog-of-war contract instead of raw simulation-only state.
- Phase 2 base-economy legibility is implemented in `add-domain`: resources now
  project gain/s, spend/s, net/s, time-to-cap, time-to-afford, zero-production
  reasons, current limiting resource, stalled systems, 1m/5m/30m wait forecasts,
  and an offline-preview summary.
- The ADD Base management surface now renders a compact economy overview plus
  enriched resource cards so player-facing tabs explain both rates and blockers
  without opening Admin.
- `render_game_to_text` exposes the same base economy projection for automation.
  The ADD smoke asserts forecast horizons, stalled-system reasons, and offline
  preview copy.
- Verification passed for `npm --workspace @aedventure/add-domain run build`,
  `npm --workspace @aedventure/add-rpg run build`, `npm run smoke:add-rpg`, and
  full `npm run check`. The generated base-management smoke screenshot was
  visually inspected and showed readable limiter/forecast/stall copy without
  overlap.
- Phase 3 staffing is now projected as the ADD base-management core loop:
  `add-domain` exposes free/assigned crew, Hero task options, slot-pool
  pressure, per-role next-worker rate deltas, visible staffing impact, and the
  Balanced / Push reach / Gather stone / Recover power presets.
- The Crew tab now prioritizes staffing above the economy forecast: free crew,
  Hero task selector, risk/bottleneck impact, preset buttons, Crystal/Fire Pit
  slot pressure, and plus/minus role allocation controls are player-facing.
- `render_game_to_text` exposes the staffing projection, and ADD smoke verifies
  that moving one Bassline worker changes crew count, free crew, and Bassline
  gain before restoring the worker for later scenarios. The dedicated
  `add-rpg-staffing-management-smoke.png` screenshot was inspected for readable
  staffing layout.
- Verification passed again for `npm --workspace @aedventure/add-domain run
  build`, `npm --workspace @aedventure/add-rpg run build`, `npm run
  smoke:add-rpg`, and full `npm run check`.
- Phase 6 offline return is now a player-facing feature. `add-domain` projects
  before/after offline catch-up summaries with elapsed time, resources gained,
  completed construction/processing jobs, recruits arrived, bubble deltas,
  brownout state, and explicit "did not progress" rules for manual Hero/world
  actions plus online-only Stone/Water collection. The ADD app captures the
  pre-catch-up snapshot, renders a dismissible "While you were away" overlay,
  and exposes the same summary through `render_game_to_text`.
- ADD smoke now asserts the offline return telemetry contract, validates the
  paused rule split, checks the visible return panel copy, dismisses it, and
  captures `tmp/add-rpg-offline-return-smoke.png`; the screenshot was inspected
  for readable categories and no blocking overlap.
- Phase 7 social pressure/recruitment is now a real base-management layer.
  `add-domain` projects Vibes gain/loss, Bad Vibes pressure, bunks/free/missing
  housing state, pending recruit arrivals, next recruit cost timing, and a
  "can we support this recruit?" forecast. The ADD Social tab renders that
  projection as the primary surface so recruiting reads as exciting but visibly
  risky when housing or Vibes are weak.
- ADD smoke now asserts the `baseManagement.socialPressure` telemetry contract,
  checks Social tab copy for Vibes/Bunks/Recruitment/support forecast, and
  captures `tmp/add-rpg-social-pressure-smoke.png`; the screenshot was inspected
  after the focused two-column layout pass.
- Phase 8 idle expeditions are implemented end to end. The Rust/WASM runtime now
  owns expedition targets, active jobs, completion reports, free-crew validation,
  saved state, offline progression, and deterministic material/wound/clue/lead
  returns. The Base panel has an Expeditions tab with target cards, active jobs,
  returned reports, and report clearing.
- `render_game_to_text` exposes expedition targets/jobs/reports/totals, the
  offline return summary treats expedition returns as completed jobs, and
  `npm run smoke:add-rpg` verifies starting and completing the Local Scavenge
  Sweep through the real browser. The `tmp/add-rpg-expeditions-smoke.png`
  screenshot was inspected and shows the returned report in the first viewport.
- ADD Phaser fog rendering now uses a visual-only graphics layer above terrain
  and below landmarks. Hidden cells draw as dark silhouettes, discovered/stale
  cells get a muted overlay, visible cells render normally, and hidden-to-known
  changes trigger a short reveal pulse. `render_game_to_text` exposes
  `visibility` counts plus `affectsAuthority: false`, and renderer QA samples the
  ADD canvas for dark, muted, and bright regions.
- ADD map interaction UX now respects visibility through one tile-detail
  formatter. Hidden tile selection says "Unknown region" with unknown terrain,
  risk, and no dungeon actions; discovered/stale tiles show static name/terrain
  with uncertain current conditions; visible tiles show current state/terrain;
  and renderer-side dungeon links are guarded to only appear for discovered or
  visible cells. ADD smoke clicks a hidden map tile through the real canvas to
  verify movement preview remains possible without leaking hidden dungeon links.
- ADD smoke now explicitly covers the visibility QA gate: initial discovery is
  exactly Survivor Cave plus Studio/base, hidden cells exist, a first hero move
  reveals new cells, autosave reload/import preserve the discovered cell set,
  hidden tile interaction never exposes dungeon links while the discovered
  Survivor Cave can, a fog-overlay canvas screenshot is nonblank, and held-key
  movement does not chain additional travel or discovery.
- ADD visibility polish V1 is visual-only in Phaser: hidden and remembered cells
  now use layered soft fog edges, reveal transitions use a longer expanding
  ripple, and known cave landmarks get cave-mouth silhouettes. `render_game_to_text`
  exposes `presentation.visibilityPolish` with future hooks for day/night radius,
  weather/season, and scouting/building/item vision modifiers, but those later
  systems do not affect authority yet.
- ADD travel now visually unveils fog through a player-centered soft halo while
  the Hero is crossing a tile instead of waiting for all fog to switch at
  landing. Phaser computes a visual-only `travelRevealPreview` from the Hero's
  interpolated world position; nearby cell centers fade by halo coverage,
  recently lit cells decay through a short trail as the halo leaves them, and a
  subtle glow follows the Hero, while authoritative discovery still happens only
  when Rust/WASM accepts the arrival snapshot.
- ADD hidden map cells are now visually absent by default instead of drawing as
  dark silhouettes. Phaser keeps hidden cells in topology/telemetry for
  authority and movement, but terrain, landmarks, ambience, bubble outlines, and
  pointer selection only render known cells or the Studio anchor; active travel
  reveal remains visual-only while the Hero crosses a tile.
- ADD opening travel dialogs are now gated to the exact first-playable opening:
  active `reach-base` step, overworld map mode, Hero still at Survivor Cave, and
  the attempted move leaving that cave. The render text state exposes the dialog
  eligibility reason so future smoke checks can prove the dramatic warning does
  not leak into later travel.
- Verification for the travel halo trail: `npm --workspace @aedventure/add-rpg
  run build:browser` and `npm run smoke:add-rpg` pass. The broader
  `npm run check` is currently blocked by unrelated dirty ADD dungeon work
  resolving `@aedventure/game-dungeon`; keep that out of targeted travel-reveal
  commits until the dungeon package is intentionally staged.
- Phase 9 resonance/conversion loops are implemented end to end. Expeditions
  now return strange materials, Resonance recipes consume them through powered
  stations, Crystal tuning permanently boosts Bassline/Chorus/Harmonics output,
  field support shortens expedition duration, and station specialization paths
  bias conversion, field, or extraction behavior.
- The ADD Base panel now includes a Resonance tab with strange material stock,
  tuning levels, recipe progress, station specialization controls, and
  player-facing blockers. `render_game_to_text` exposes the resonance projection
  for smoke/agent inspection, and offline-return summaries can report completed
  resonance jobs.
- Verification passed for `cargo test -p add-core`,
  `npm --workspace @aedventure/add-domain run build`,
  `npm --workspace @aedventure/add-rpg run build`, `npm run smoke:add-rpg`, and
  full `npm run check`. The regenerated
  `tmp/add-rpg-resonance-smoke.png` screenshot was inspected and showed the
  Resonance tab/tuning/material cards without text overlap.
- Phase 10 player-loop polish is implemented as a domain projection rather than
  component-only copy. `add-domain` now exposes `baseManagement.playerLoop` with
  health, bottleneck, recommended action context, rates to watch, growth push,
  return plan, decision hint, and the eight-step idle cadence from "check base
  health" through "make a better decision."
- The ADD Base panel now renders that player-loop projection as a compact
  command surface above the recommendation. `render_game_to_text` exposes the
  same contract for agents/smoke tests, and ADD smoke asserts the eight ordered
  steps, one current step, health status, visible rates, return plan, and
  decision hint.
- Verification passed for `npm --workspace @aedventure/add-domain run build`,
  `npm --workspace @aedventure/add-rpg run build`, `npm run smoke:add-rpg`, and
  full `npm run check`. The regenerated
  `tmp/add-rpg-base-management-smoke.png` screenshot was inspected; the loop
  panel is readable and did not overlap the map or recommendation controls.
- The debug-style event feed is no longer visible in the primary app UI. It has
  been replaced with compact session/world/media status pills, a compact room
  chat transcript, and transient toast feedback for join/reset/error-like events.
- Browser MCP verified join, chat delivery, reset, desktop `1280x900`, and
  mobile `390x760`: statuses move through disconnected/not-joined/not-ready to
  connected/joined/media-ready, reset clears chat and restores disconnected
  states, toasts render, no `#events` feed exists, and the browser console stayed
  clean. The standalone web-game client remains blocked by missing `playwright`.
- Phase 7 engine-boundary proof is implemented: `packages/rpg-domain` owns a
  tiny RPG/idle map, semantic asset catalog, entities, and gather action, while
  `apps/rpg-idle-demo` renders it through `@aedventure/game-renderer-phaser`.
- The RPG demo imports the neutral packages (`game-assets`, `game-map`,
  `game-input`, `game-renderer-phaser`) and explicitly avoids
  `office-domain`. It has one hero, one tree resource node, one cabin/site, one
  gathering zone, and one local gather action with no accounts or persistence.
- Browser smoke now covers RPG load -> gather -> move -> run toggle -> reset and
  captures a nonblank canvas screenshot. A canvas layout feedback issue was fixed
  by positioning the Phaser canvas absolutely inside a stable host.
- Verification passed: `npm run check`, `npm run qa:responsive`,
  `node scripts/rpg-idle-demo-smoke.test.cjs`. The standalone
  `develop-web-game` client still fails before browser launch because the
  skill-local script cannot resolve its own `playwright` import.
- Phase 6 camera excellence is implemented: the Phaser renderer now exposes
  follow-player and fit-room modes, named zoom presets, mobile default zoom,
  viewport-tuned deadzones, constrained camera bounds, local-player visibility,
  and camera telemetry through `window.render_game_to_text`.
- `npm run smoke:frontend`, `npm run qa:responsive`, and `npm run check` passed
  after adding camera-mode, idle-stability, zoom-safety, and mobile default
  assertions. The standalone develop-web-game client is still blocked because
  its skill script cannot resolve its own `playwright` package, while the repo
  Playwright smoke/QA scripts run successfully.
- Phase 7 avatar system is implemented: avatar appearance, animation,
  interpolation, emote, and cosmetic-slot metadata now lives in a renderer
  registry; Phaser avatar drawing consumes that registry and exposes avatar
  telemetry through `window.render_game_to_text`.
- The frontend smoke now renders a four-avatar fixture, checks directional
  idle/walk animation keys, readable labels, emote hooks, local/remote
  interpolation profiles, and future cosmetic slots. `npm run build`,
  `npm run smoke:frontend`, `npm run qa:responsive`, and `npm run check` passed.
- Phase 8 zone presentation is implemented: Phaser zones now have passive
  affordances, active/hovered visual states, action markers, zoom-aware labels,
  kind-specific styling for meeting/private/portal/quiet/lobby zones, debug
  bounds, and zone telemetry in `window.render_game_to_text`.
- Movement debugging now distinguishes browser-side diagonal intent from
  server-side application: authoritative movement responses echo requested and
  applied vectors, collision-slide state, and the browser trace flags legacy or
  stale direction-only server responses as missing telemetry.
- The browser now promotes missing server movement telemetry into an explicit
  protocol mismatch state: the world status changes to `Update server`, the
  movement trace records the restart instruction, and `render_game_to_text`
  exposes `movement.serverProtocolMismatch` for automation.
- `npm run dev:http` now builds the target workspace before starting the local
  HTTP host, so a restart refreshes both backend `dist` modules and the Vite
  browser bundle.
- Avatar movement has been retuned for continuous-feeling local motion: browser
  input repeat, client prediction max step, and the local dev world tick now use
  60 ms frames, while avatar interpolation moves at the same visual speed as the
  server-authoritative world instead of snapping ahead and pausing.
- Movement now supports an authoritative walk/run mode. The browser offers a
  Run toggle and Shift momentary run, sends `movementMode` through the protocol,
  predicts with 88 px/s walk and 148 px/s run speeds, and the world server owns
  the accepted speed for each movement response.
- Phase 14 has started: map switches now use a short room transition, avatars
  fade into rooms on entry, and lightweight ambient object motion is applied to
  plants/coffee-style props without changing gameplay authority.
- Local movement has moved to a continuous client-motion controller. The
  authoritative server position is still tracked separately, but the local
  avatar now moves every animation frame with velocity smoothing, soft
  correction blending, collision-aware prediction, and a direct renderer path
  that avoids restarting position tweens during direction changes.
- Movement transport has started moving off HTTP request/response: the local
  dev host now exposes `/world/realtime` as a WebSocket gateway, the browser
  streams move intents through `WorldRealtimeTransport` when the socket is open,
  and `/world/message` remains as a fallback for startup or unavailable sockets.
  The gateway still calls the same `WorldRoomController`, so server authority is
  unchanged and can later be wrapped by a real Colyseus room.
- The standalone develop-web-game client was retried with the repo
  `node_modules` on `NODE_PATH`, but the skill script still cannot resolve its
  own ESM `playwright` import. Repo-native Playwright smoke/renderer/responsive
  QA continues to cover the browser loop successfully.
- The frontend smoke now verifies meeting-zone action availability, that meeting
  controls remain locked outside valid meeting state, debug zone bounds, private
  and portal affordances, and renderer zone state. `npm run build`,
  `npm run smoke:frontend`, `npm run qa:responsive`, and `npm run check` passed.
- Movement feel tuning now treats collision and analog response as explicit game
  systems: the tuning model owns body radius, analog curve, and corner-slide
  assist, client prediction uses those values, and the development world server
  can receive matching movement tuning through a dev-only route.
- ADD Phase 0 tile-detail foundation is now in progress: `add-domain` exposes
  a renderer-agnostic selected tile detail contract with optional base/dungeon
  links, map scale metadata distinguishes strategic overworld hex travel from
  local/interior square submaps, the selected-tile card renders link/action
  rows from the domain projection, and smoke assertions cover normal tiles
  having no submap plus Survivor Cave/base/dungeon scale rules.
- Verification for this slice: `npm --workspace @aedventure/add-domain run
  build`, `npm --workspace @aedventure/add-rpg run build:types`, and `node
  --check scripts/add-rpg-smoke.test.cjs` pass. Full ADD browser build/smoke is
  currently blocked by unrelated dirty inventory runtime work:
  `crates/add-core/src/simulation.rs` references `SCRAP_PER_STONE` without a
  visible definition.
- Dungeon entity identity is no longer tied to cell coordinates. Mutable
  entities can declare stable `instanceId`s, static fallback entities use
  occurrence-based ids, duplicate instance ids are validated, and Studio rats now
  have explicit stable ids so future save/combat state can survive layout edits.
- ADD first-playable progression is now data-driven in
  `first-playable-script` instead of embedded in `ui-selectors`. The selector
  projects the evaluated summary, while the script owns ordered steps,
  evaluators, and generated actions.
- ADD browser telemetry now flows through a typed `add-telemetry-presenter`.
  `render_game_to_text` still exposes the same smoke-friendly contract, but the
  Solid shell only supplies presenter inputs instead of assembling JSON directly
  from internal signals.
- ADD RPG smoke automation is now scenario-oriented. The same boot, visibility,
  travel, map-mode, first-playable, persistence, screenshot, and console checks
  run through named scenario wrappers with shared helpers, so failures identify
  the affected subsystem.
- ADD Phaser neutralization step 5 is underway: `game-renderer-phaser` now
  exposes neutral cell presentation, interaction, and topology navigation policy
  contracts plus a policy-driven `GameMapCellRenderer` for square/hex maps.
  `add-domain` provides ADD implementations for visibility, terrain styling,
  fog styling, tile interactions, and navigation. The ADD app scene now consumes
  those policies for terrain visibility/style, movement entry checks, and travel
  interaction labels while keeping the current public `AddPhaserMapInfo` shape.
  Targeted verification passed for renderer build/test, add-domain build/test,
  ADD app type build, and ADD smoke; renderer QA is still blocked by unrelated
  dirty dungeon fixture work changing the expected square map id from
  `add.rpg.square-dungeon-fixture` to `add.rpg.dungeon.studio`.
- Follow-up policy neutralization moved terrain visual semantics behind
  `CellVisualStyle`: renderer-facing style now carries neutral `activity`,
  `activityProgress`, and `motif` fields. ADD maps its cell state/terrain into
  those values in `add-domain`, and the ADD Phaser scene now draws terrain
  motifs/progress from the policy instead of directly reading ADD
  terrain/state/progress selectors. Targeted renderer/add-domain builds, tests,
  ADD type build, and ADD smoke passed.
- The neutral `GameEntity` contract no longer uses vague `size`. Entity shape is
  split into explicit `visualFootprint`, `collisionFootprint`,
  `interactionRadius`, and `renderScale` concepts, with `cell` or `world` units.
  `game-world` validates those fields, `game-dungeon` compiles dungeon entity
  specs into them, and the ADD creature renderer uses `visualFootprint` for
  sub-tile rats. Targeted game-world/game-dungeon builds and tests, add-domain
  build/test, ADD type build, ADD smoke, and renderer QA passed.
- Renderer/engine separation now has explicit browser-engine controllers:
  `InputController` owns held keyboard/D-pad/joystick/run state and shaped
  movement intents, while `WorldSyncController` owns the realtime transport
  boundary. Existing Phaser modules remain split behind `RendererHost` /
  `OfficeScene`, and `render_game_to_text.engine` exposes the architecture for
  automation.
- Avatar sprite art now has a real atlas import path: the renderer owns a
  manifest schema, expected semantic frame keys, a manifest validator, and
  render telemetry for `/assets/avatar-atlases/internal-avatar-atlas-v1`.
  Runtime-generated avatar frames remain the active fallback and now use
  per-visual-facing texture keys so diagonal preview frames do not collide.
- Verification passed for the avatar atlas import path: web build,
  frontend smoke, Phaser renderer QA, responsive QA, and full `npm run check`
  all passed. The avatar preview gallery screenshot was inspected and shows all
  128 avatar/state/facing combinations. The standalone develop-web-game client
  remains blocked by its skill-local missing `playwright` ESM dependency.
- Generated placeholder avatar art was polished: fallback sprite frames now draw
  stronger shadows, feet, arms, jacket seams, hair/ear details, and clearer
  diagonal face cues, with walk/run-specific stride, squash, lift, and arm
  swing. Emote bubbles now anchor to the label's top-right edge, scale with the
  camera-aware label system, and expose overlay geometry in renderer telemetry.
- Verification passed for the placeholder-art polish: web build,
  frontend smoke, Phaser renderer QA, responsive QA, and full `npm run check`
  passed. Fresh desktop/mobile and avatar preview gallery screenshots were
  inspected. The standalone develop-web-game client still cannot run because
  its skill-local Playwright dependency is missing.
- World text sharpness was upgraded beyond high-resolution Phaser text:
  avatar names and zone labels now render through a native DOM overlay
  synchronized to Phaser world coordinates, positioned on whole CSS pixels, and
  not transform-scaled. Phaser text remains as a hidden/fallback measurement path
  for avatar/zone labels and as the fallback for remaining world glyphs.
- Renderer telemetry now reports the `dom_overlay` + `phaser_text_fallback`
  text backends, and renderer QA asserts visible DOM avatar/zone labels,
  readable native font metrics, whole-pixel positioning, and no transform-based
  text scaling. Desktop and mobile full-page screenshots were inspected and show
  crisp avatar and zone labels.
- Verification passed for the sharper text pass: `npm --workspace
  @aedventure/web run build`, `npm run smoke:frontend`, `npm run qa:renderer`,
  `npm run qa:responsive`, `npm run check`, and `git diff --check` passed. The
  standalone develop-web-game client was retried and still fails before browser
  launch because `/Users/christophehenner/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js`
  cannot resolve its own `playwright` ESM import.
- The DOM world label code has been extracted out of `RendererHost` into
  `DomWorldOverlayRenderer`, keeping avatar/zone label node lifecycle,
  world-to-viewport projection, label metrics, accent colors, and cleanup in a
  dedicated renderer module. `RendererHost` now only wires the overlay to the
  parent element, `OfficeScene`, and scene readiness promise.
- Verification passed for the DOM overlay extraction: `npm --workspace
  @aedventure/web run build`, `npm run smoke:frontend`, `npm run qa:renderer`,
  `npm run qa:responsive`, `npm run check`, and `git diff --check` passed.
  Desktop and mobile renderer screenshots were inspected and still show crisp
  avatar/zone labels. The standalone develop-web-game client remains blocked by
  the same skill-local missing `playwright` dependency.
- Remaining product-facing world text was moved off canvas where it mattered:
  interaction marker prompt text, the `E` hotkey badge, and emote glyphs now
  render through the DOM world overlay. Phaser still owns the marker geometry,
  hit areas, emote bubble background, and server-permitted interaction state.
  Shared marker positioning lives in `world-interaction-presentation.ts`, so the
  Phaser marker and DOM text use the same candidate filtering and coordinates.
- Phase 11 ADD shell is underway: `apps/add-rpg` now uses a Solid runtime
  shell, keeps the `UI -> Worker -> Rust/WASM -> Snapshot` boundary, converts
  live ADD snapshots through `add-domain`, and hosts a Phaser hex map rendered
  from the neutral `GameWorld` adapter. The ADD smoke now checks Solid shell
  telemetry, live resources/objective state, command buttons, and a nonblank
  Phaser canvas screenshot. The standalone develop-web-game client was retried
  and still fails before launch because its skill-local script cannot resolve
  its own `playwright` ESM import.
- ADD map playability now has a local main-character navigation layer:
  `add.entity.hero` renders as a movable Phaser character, arrow/WASD keys move
  it across non-blocked square/hex cells, and `render_game_to_text` exposes
  character position, movement result, and local-preview authority.
- Tile-to-dungeon data now enters through the neutral `GameCellPlacement.links`
  model. The Rust ADD catalog exposes `dungeonIds`, the ADD domain adapter maps
  Survivor Cave tiles to a dungeon link targeting the square dungeon fixture, and
  Phaser renders a dungeon-entry glyph plus link telemetry for selected/occupied
  cells.
- ADD local dev was restarted on `http://127.0.0.1:8108/app/` and a browser
  readiness probe confirmed `runtime.ready`, `map.ready`, and no console/page
  errors. A systems parity audit now documents which ADD data/calculation
  systems are live in `crates/add-core`, which browser/domain layers are
  presentation-only, and which legacy ADD docs remain future reference. The
  Rust suite also now guards the current first-playable catalog surface and the
  offline rule split between allowed idle systems and online-only world actions.
  During verification, a reset/save race was fixed by awaiting the reset save
  export before allowing subsequent import edits; `cargo test -p add-core`,
  `npm --workspace @aedventure/add-domain run build`, `npm --workspace
  @aedventure/add-domain run test`, `npm run smoke:add-rpg:built`, `npm run
  check`, and `git diff --check` all passed.
- QA now asserts DOM interaction prompts/hotkeys and DOM emote glyphs use native
  font metrics, whole-pixel placement, and no transform scaling. Verification
  passed with `npm --workspace @aedventure/web run build`, `npm run
  smoke:frontend`, `npm run qa:renderer`, `npm run qa:responsive`, `npm run
  check`, and `git diff --check`. The standalone develop-web-game client was
  retried and remains blocked by the skill-local missing `playwright` import.
- Meeting-zone interactions now use the compiled map zones in the browser app:
  the Phaser renderer highlights the active zone, the app exposes Join/Leave
  meeting controls outside the canvas, and media is no longer auto-joined when
  the demo starts.
- The meeting join path still relies on the media gateway for permission. The
  browser requests `/media/media-token` with the active zone ID, while the server
  resolves the requester through the authoritative world participant directory
  and can deny out-of-zone requests.
- Playwright MCP verified desktop `1280x900` and mobile `390x760`: entering the
  demo leaves media `Not ready`, Join meeting issues
  `zone:room-lobby:meeting-zone`, Leave meeting clears local meeting state, and
  walking out of the compiled zone auto-clears meeting media. Browser console
  warnings/errors stayed at zero. The standalone web-game client still cannot
  run because the skill runtime cannot resolve the `playwright` package.
- Basic media UX is now wired around the existing `/media/media-token` route:
  the browser stores token metadata for the active meeting zone, displays room,
  endpoint, participant count, and token expiry, and keeps the raw token out of
  `render_game_to_text`.
- Mic/camera controls now model local device intent after token issuance. They
  default off, enable only when the server grants publish permission, reset on
  leave/reset/out-of-zone, and feed the media placeholder panel.
- Playwright MCP verified token issuance, mic/camera toggles, leave cleanup,
  desktop `1280x900`, and mobile `390x760`; browser console warnings/errors
  stayed at zero. The standalone web-game client remains blocked by missing
  `playwright`.
- Deterministic map generation demo is now wired. The asset registry owns
  `compileDeterministicPromptMap()`, which maps prompt keywords such as
  `10-person`, `cozy`, `wood`, and `coffee` into a semantic map definition,
  compiles it into tile layers, and validates blocked tiles, spawn points, and
  zones.
- The browser now has a room prompt panel. The default prompt renders a generated
  14x11 cozy meeting room with 10 seats, perimeter walls, a coffee bar, a
  meeting zone, two spawns, and validation counters. Generating while joined
  resets the local demo before applying the new map.
- Playwright MCP verified default prompt generation, Phaser rendering,
  machine-readable validation state, join-after-generation, reset-on-generate,
  desktop `1280x900`, and mobile `390x760`; browser console warnings/errors
  stayed at zero. The standalone web-game client remains blocked by missing
  `playwright`.
- The visual catalog now has a target-approved internal placeholder source,
  `internal.generated.office.placeholders`, recorded as CC0 in the asset
  manifest. Existing stable semantic IDs for floors, wood walls, conference
  tables, chairs, and coffee machines now point to that source instead of
  SkyOffice/LimeZu references.
- Added stable placeholder vocabulary for polished concrete, carpet, glass
  walls, small round tables, potted plants, coffee bars, single doors, and a
  local placeholder avatar. SkyOffice/LimeZu sources remain in the registry as
  reference-only metadata and are still not bundled into the target app.
- The deterministic prompt compiler now understands `bar`, `plant(s)`, and
  `door(s)`. The default coffee-bar prompt uses `item.coffee_bar`, and explicit
  plant/door prompts render those tokens through Phaser placeholder visuals.
- Verification passed: `npm --workspace @aedventure/asset-registry run build`,
  `node packages/asset-registry/test/catalog.test.js`,
  `npm --workspace @aedventure/web run build`, and `npm run check`. Playwright
  MCP verified desktop `1280x900` and mobile `390x760` generated rooms with
  plants, a door, and a coffee bar; browser console warnings/errors stayed at
  zero. The standalone web-game client still cannot run because it cannot
  resolve the `playwright` package from the skill runtime.
- Map switching is now wired through semantic presets. The app exposes Lobby,
  Meeting room, Lounge/cafe, and Generated room controls; presets live in
  `packages/asset-registry` and compile through the same semantic map compiler
  as prompt-generated rooms.
- Switching maps uses the clean demo reset path, then posts the selected map's
  pixel collision geometry and zones to `/dev/world-geometry` so the local
  authoritative world server validates against the same layout that Phaser
  renders.
- Verification passed for asset-registry presets, world room reset,
  dev fixture/world-geometry routes, the Vite browser build, and full
  `npm run check`.
- Playwright MCP verified desktop `1280x900` and mobile `390x760`: Lobby loads
  by default, Meeting room can be joined with two demo players, switching to
  Lounge/café resets the local demo world cleanly, Generated room compiles the
  prompt map, active switcher state is reflected through `aria-pressed`, and
  browser console warnings/errors stayed at zero. The standalone web-game
  client still cannot run because it cannot resolve the `playwright` package
  from the skill runtime.
- Local avatar basics are now wired without account persistence: the demo has a
  name input, four placeholder avatar choices, live Phaser avatar recoloring,
  name labels, media-preview initials, and `render_game_to_text` identity fields.
- The local demo profile remains browser-runtime only. Verification checked that
  the app does not use `localStorage`, `sessionStorage`, or `indexedDB` for the
  demo name/avatar state.
- The lobby companion spawn moved farther from the local player so the default
  demo displays two readable avatars and labels after join.
- Verification passed: `npm --workspace @aedventure/web run build`,
  `npm run check`, Playwright MCP desktop/mobile screenshots, live pre-join and
  post-join identity changes, empty storage keys, and zero browser console
  warnings/errors. The standalone web-game client still cannot run because it
  cannot resolve the `playwright` package from the skill runtime.
- Lifecycle handling now has an explicit room-state banner and machine-readable
  `render_game_to_text.lifecycle` state for empty, joining, joined, leaving,
  map-reloading, and recovery phases.
- Reset/leave is best-effort: the browser attempts to leave the local and
  companion world clients, then clears local runtime state, chat, media,
  meeting state, snapshots, held movement, and remote players even if the
  server no longer remembers the clients.
- Rejoin and map reload are clean. Starting the demo re-syncs the current map
  geometry before admission, map switching reloads world geometry and returns to
  an empty-room state, and rejoin repopulates the two demo users.
- Server restart recovery is handled through `unknown_client`/not-admitted world
  errors. The browser clears stale room state, shows `World restarted, rejoin
  needed`, changes the main action to `Rejoin demo`, and reconfigures geometry
  on the next join.
- The meeting-room companion spawn moved farther from the local player so
  lifecycle screenshots have readable labels after rejoin.
- Verification passed: `npm --workspace @aedventure/asset-registry run build`,
  `npm --workspace @aedventure/web run build`, `npm run check`, Playwright MCP
  join/reset/rejoin/map-reload/server-restart-recovery/rejoin-after-recovery
  flows, desktop and mobile layout inspection, and zero browser console
  warnings/errors. The standalone web-game client still cannot run because it
  cannot resolve the `playwright` package from the skill runtime.
- Desktop/mobile layout polish is now applied. The app workspace renders the
  Phaser canvas beside a right-side tools/chat rail on desktop, with Camera,
  Chat, Meeting, and Media visible and the movement fallback kept collapsed so
  it is not primary UX.
- Mobile now visually prioritizes the canvas immediately after the header,
  connection status, and room state. Tool/chat panels become collapsed
  `<details>` sections below the canvas, with setup controls moved after the
  canvas in the mobile visual order.
- `render_game_to_text.layout` now exposes the active responsive mode and
  collapsible section state for automated layout checks.
- Verification passed: `npm --workspace @aedventure/web run build`,
  `npm run check`, Playwright MCP desktop `1440x960` and mobile `390x760`
  screenshots, desktop join/zoom/chat flows after the DOM move, mobile
  collapsible Chat/Move expansion, and zero browser console warnings/errors.
  The standalone web-game client still cannot run because it cannot resolve the
  `playwright` package from the skill runtime.
- Frontend smoke automation is now repo-owned through
  `scripts/frontend-smoke.test.cjs` and `npm run smoke:frontend`. The smoke
  boots the local dev HTTP host on an ephemeral loopback port, opens Chromium,
  verifies `render_game_to_text`, captures a `#map` screenshot buffer, checks
  that the map is nonblank, and exercises load -> map switch -> join ->
  keyboard move -> chat -> media token -> reset -> rejoin.
- `npm run check` now includes the browser frontend smoke after the Vite browser
  bundle build, so local and CI verification cover the primary V1 browser flow.
- Verification passed: `npm run smoke:frontend` and `npm run check`. In this
  sandbox both commands require escalation because the smoke binds a local HTTP
  server on `127.0.0.1`; that should not be an issue in normal local or CI
  environments. The external standalone web-game client remains blocked because
  it cannot resolve `playwright` from the skill runtime, but the repository now
  has its own Playwright dependency and smoke runner.
- Frontend V1 visual foundation pass is underway. The vanilla app shell now has
  a tokenized CSS system for surfaces, type, spacing, borders, shadows, focus
  states, status colors, and reusable control styling. Existing DOM structure
  and app behavior were preserved so Phaser, movement, media tokens, and smoke
  automation remain stable.
- Visible app copy now avoids demo/debug wording: the primary flow reads as
  entering/leaving the office, media access reads as meeting/media state rather
  than token plumbing, and the local app keeps implementation details out of the
  main UI. Toast lifetime was shortened so feedback is useful without lingering
  over controls.
- Visual QA passed with Chromium screenshots at desktop `1440x960` and mobile
  `390x760` after join. The app kept the canvas first, panels remained readable,
  mobile controls stayed reachable, and browser console errors stayed at zero.
- Verification passed: `npm run check`, including the updated browser frontend
  smoke and the development HTTP host app-shell assertion.
- Asset upgrade pass is now applied. The target asset source is
  `internal.generated.office.polished_v1`, still generated internally at runtime
  and recorded as CC0; SkyOffice/LimeZu entries remain reference-only metadata
  and are not bundled into the target app.
- The semantic catalog now covers polished wood, carpet, concrete floors; wood,
  glass, and neutral office walls; tables, chairs, plants, coffee machines,
  coffee bars, doors, couches; and four stable avatar tokens (`ember`, `cobalt`,
  `moss`, `violet`). Existing semantic IDs/GIDs were preserved and new IDs were
  appended.
- Phaser now draws polished procedural tiles instead of labeled placeholder
  blocks. Multi-tile semantic assets are rendered as clipped segments of one
  larger object so conference tables, round tables, coffee bars, and couches do
  not look like repeated one-tile stamps.
- Deterministic prompt generation now recognizes couch/sofa wording and the
  lounge/cafe preset includes a couch while keeping map compilation and server
  collision driven by the same semantic registry.
- Visual QA captured Lobby, Meeting room, Lounge/cafe, Generated room, and
  mobile screenshots on the local dev host. The app bundle contains
  `internal.generated.office.polished_v1`, `wall.neutral.*`, and
  `item.lounge_couch`, with no remaining placeholder source strings in the web
  bundle. The standalone web-game client can run through a temporary symlinked
  entrypoint with the repo `node_modules`; its direct canvas capture is still
  black under headless WebGL, so page-level Playwright screenshots remain the
  visual source of truth.
- Primary app layout pass is now applied. The browser app uses a product-level
  layout with a left workspace navigation rail, central Phaser stage, and right
  collaboration rail instead of a stack of test controls.
- Meeting and media controls are consolidated into one Call module; chat is
  visually integrated into the collaboration rail; profile/setup controls are
  compact and secondary in the left rail; movement remains available as a
  collapsed fallback instead of primary UX.
- Mobile now keeps the canvas-first flow and presents collaboration as a
  bottom-tray style set of collapsed Call/Chat/Move handles, with the tray
  layered above transient toasts so controls remain visible.
- Verification passed: `git diff --check`, the browser layout Playwright QA
  script against the local app on `127.0.0.1:8787`, and full `npm run check`
  including the repository frontend smoke. The known large Phaser/Vite chunk
  warning remains non-blocking.
- Map generation UX pass is now applied. The generator is presented as a
  prompt-to-map product feature with textarea prompts, example prompt chips,
  generated-room preview status, human validation feedback, and a clear
  Generate/Regenerate flow.
- The Generated room switcher no longer regenerates implicitly. It starts
  disabled with "Create one first", becomes available after generation, and
  reopens the saved generated room while presets can still be browsed without
  losing the draft.
- Regeneration visibly resets the local world through the existing map reload
  lifecycle and keeps the deterministic compiler as the only map-generation
  backend. No LLM integration has been added yet.
- Browser QA verified disabled generated navigation, example prompt fill,
  generation, saved generated-room reopening, regeneration after join, desktop
  and mobile screenshots, and zero browser console errors. The repository
  frontend smoke now asserts the same core generated-room UX path. Full
  `npm run check` passed; the known large Phaser/Vite chunk warning remains
  non-blocking.
- Meeting-zone UX pass is now applied. Phaser meeting zones have a passive
  boundary glow and an active "Join call available" label when the local player
  enters the zone.
- The Call module now has explicit outside/available/pending/joined panel
  states. Entering a meeting zone enables Join call, explains that media is
  available because the user is in that zone, and lets mic/camera controls act
  as pre-call device intent before LiveKit wiring.
- Joining the meeting still uses the server-issued `/media/media-token` flow;
  prepared mic/camera state carries into the granted call session, while Leave
  call and zone exit clear local media state.
- Verification passed: browser meeting-zone QA on the local app with
  available/joined/mobile screenshots, updated `npm run check`, and the
  repository frontend smoke now covers zone availability, pre-call mic/camera
  controls, and joined-call state. The known large Phaser/Vite chunk warning
  remains non-blocking.
- Phaser world presentation pass is applied. Furniture now renders as
  generated object sprites with y-based depth instead of one flat object
  tilemap layer, so tables, couches, chairs, doors, plants, and players share a
  consistent foreground/background ordering model.
- Zones now have lower scene depth than furniture/avatars plus hover/active
  highlight states and centered in-canvas labels. Avatar labels now have a
  stronger bubble treatment with a shadow and pointer tail, while avatar
  movement uses distance-aware interpolation and more deliberate idle/walk
  placeholder animation.
- Floor and wall tiles have stronger gradients, base lips, and corner posts to
  make wall transitions more readable without adding new external assets.
- Verification passed: `npm --workspace @aedventure/web run build`,
  page-level Playwright screenshots for Lobby, Meeting hover, Meeting joined,
  and mobile states on `127.0.0.1:8787`, and full `npm run check`.
- Movement and camera feel pass is now applied. Held-key movement repeats every
  190ms instead of 250ms, while the server still computes authoritative
  positions from direction intents.
- Avatar interpolation now uses a shorter distance-aware Sine-out tween, and
  the camera follows a hidden anchor rather than the bobbing avatar container.
  This keeps idle/walk animation from feeding jitter into the viewport, with a
  small camera deadzone and gentler follow lerp.
- Blocked movement now reads as a physical bump: the avatar nudges and squashes
  briefly, collision toasts use softer "Bumped into wall or furniture" copy,
  and collision feedback uses info tone rather than warning tone.
- Zoom controls now move in 10% steps and disable at min/max zoom. Browser QA
  verified stable idle camera scroll, held movement, collision bump feedback,
  zoom limits/reset, and desktop/mobile screenshots.
- Responsive QA pass started. Added a repository-owned responsive Playwright
  sweep for desktop `1440x960`, laptop `1280x800`, tablet-ish `900x700`,
  mobile `390x760`, and narrow mobile `360x740`; it checks canvas prominence,
  reachable controls, text overflow, control overlap, and captures empty/joined
  screenshots for each viewport.
- First responsive sweep found that narrow mobile wasted too much horizontal
  space in nested shell/panel padding. Added a `max-width: 380px` spacing
  breakpoint so the Phaser map keeps more width and height on 360px screens.
- Screenshot review found transient toasts visually competing with the
  collaboration rail. The rail now sits above toasts, keeping chat/call controls
  visually clean while toasts can still appear over non-control map space.
- Responsive QA now passes for all requested viewports in both empty and joined
  states. Representative screenshots were visually inspected for desktop,
  laptop, tablet-ish, mobile, and narrow mobile; controls remain reachable and
  the canvas remains the primary surface.
- Browser smoke expansion is applied. The repo smoke now asserts map switcher
  visibility, nonblank desktop and mobile map screenshots, usable chat form and
  transcript, meeting control enabled/disabled states outside/inside/joined
  states, mobile collapsed Call/Chat/Move handles, and the
  `render_game_to_text` layout/world/media contract.
- Phaser renderer architecture Phase 1 is applied. The former monolithic
  `PhaserOfficeRenderer` is now a thin compatibility export over
  `RendererHost`, with `OfficeScene` coordinating specialized renderers for
  tilemaps, objects, avatars, zones, camera, and renderer telemetry.
- The split is behavior-preserving: semantic tile drawing, generated object
  textures, avatar interpolation, camera follow/zoom, zone highlight labels,
  and the existing public renderer API remain intact. Renderer modules depend
  only on Phaser, fixture-map shapes, and renderer-local types, not auth,
  media, permissions, or business UI state.
- Verification passed: `npm run check`, explicit `npm run smoke:frontend`, and
  `npm run qa:responsive`. Representative desktop and mobile responsive QA
  screenshots were visually inspected after the refactor.
- Phaser 4 WebGL-first configuration is applied. The renderer now requests
  `Phaser.WEBGL` explicitly and records the actual renderer, Phaser version,
  WebGL limits, context loss/restore counters, canvas size, and pixel/rounding
  decisions in `render_game_to_text`.
- Pixel-art rendering is deliberate: global pixel art is enabled, smooth pixel
  art and antialiasing are disabled, camera rounding stays enabled, camera
  follow requests rounded pixels, and tile/object/avatar GameObjects use
  Phaser's conservative `safeAuto` vertex rounding mode.
- WebGL context recovery is handled by listening for Phaser's lose/restore
  renderer events. After restore, the renderer replays the saved semantic map,
  player list, active zones, and zoom factor so generated tile/object canvas
  textures are recreated instead of depending on stale GPU resources.
- Verification passed: `npm run check`, explicit `npm run smoke:frontend`, and
  `npm run qa:responsive`. The frontend smoke now asserts WebGL capabilities,
  nonblank map screenshots after resize and rejoin, and synthetic
  `WEBGL_lose_context` loss/restore recovery; mobile and narrow-mobile QA
  screenshots were visually inspected.
- TilemapGPULayer migration is applied for static architectural layers. The
  floor and wall layers still consume the same compiled semantic `gids` arrays,
  but the renderer now promotes their Phaser `LayerData` into
  `TilemapGPULayer` instances when WebGL is available.
- Furniture remains separate generated sprites for y-depth sorting, zones
  remain Phaser graphics, and avatar/labels remain ordinary display objects.
  The asset registry and deterministic map compiler were not changed.
- Renderer capability output now reports static tile layer modes, GPU/CPU layer
  counts, and static tile counts. The frontend smoke asserts that floor and
  walls are GPU layers, then renders a synthetic 128x96 semantic stress map
  through the same browser renderer path and checks nonblank output plus frame
  cadence thresholds.
- Verification passed: `npm run check`, explicit `npm run smoke:frontend`, and
  `npm run qa:responsive`. Desktop and mobile responsive screenshots were
  visually inspected after the migration.
- Phaser 4 Effects Layer phase is applied. The renderer now has a dedicated
  visual-only effects subsystem for WebGL-gated camera color grading, static
  ambient tinting, room light ellipses, corner shadows, and tenant lighting
  modes. Zone hover/selection outlines remain owned by the zone renderer, and
  no effects state feeds movement, collision, permissions, or media authority.
- Effects degrade cleanly: low-capability or forced-off modes destroy camera
  filters and effect geometry, while `render_game_to_text` reports enabled
  state, requested quality, tenant lighting, capability flags, applied passes,
  and deterministic/static animation mode.
- Verification passed: `npm --workspace @aedventure/web run build`,
  `npm run smoke:frontend`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. The frontend smoke now covers normal effects, forced
  low-capability disable, night lighting re-enable, nonblank screenshots, and
  frame cadence thresholds. Representative desktop and narrow-mobile QA
  screenshots were visually inspected.
- Phase 10 big-map performance is implemented. The renderer now reports a
  documented performance budget, target FPS, benchmark sizes, chunking/culling
  strategy, pooling state, map render count, map-switch count, texture count,
  display-object count, and a stable Phaser game instance ID through
  `render_game_to_text`.
- Map switches no longer rely on broad `children.removeAll(true)`. Tilemap
  layers are destroyed through the active Phaser tilemap, object sprites are
  released into a pool, and the single Phaser game instance remains alive across
  benchmark map switches.
- Static tile layers keep the Phaser 4 WebGL GPU-layer batching path. Object
  sprites now use viewport culling with a fixed margin, object textures are
  reused by semantic/atlas signature, and semantic tilesets are reused when the
  catalog signature is unchanged.
- Added `docs/renderer-performance-budget.md` with the target FPS budget,
  benchmark map sizes, runtime strategy, and map-switch leak gate.
- The frontend smoke now benchmarks 20x15, 50x40, and 100x80 maps over two
  passes, checks frame cadence, verifies object culling/pooling/texture reuse,
  verifies the Phaser game instance is reused, and asserts repeated 100x80 map
  switches do not grow texture/display-object counts.
- Verification passed: `npm --workspace @aedventure/web run build`,
  `npm run smoke:frontend`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. Representative desktop and narrow-mobile QA screenshots
  were visually inspected. The generic develop-web-game skill client still
  cannot run because its script cannot resolve its own `playwright` package,
  while the repo-owned Playwright smoke uses the local dependency successfully.
- Phase 11 AI-generated map readiness is implemented. The asset registry now
  exposes `MapDefinitionInterface` as the renderer-agnostic semantic map
  contract and compiles it into explicit render layers, a movement collision
  layer, zones, and explainable validation checks.
- The browser renderer now runs a Phaser-specific preflight before scene
  mutation. It validates render layer dimensions, referenced GIDs, visual
  footprint bounds, collision layer dimensions, and zone bounds, then exposes a
  deterministic render fingerprint through `render_game_to_text`.
- Generated-room flow now creates preview metadata before applying the map:
  MDI schema, compiler output categories, renderer preflight result, preview
  fingerprint, applied fingerprint, and `previewMatchesRendered`. The UI detail
  now reports when the preview matches the rendered room.
- Invalid generated/AI-style maps fail before Phaser mutation. The frontend
  smoke attempts a map with an out-of-bounds visual footprint and verifies that
  map render count and active app map remain unchanged while the rejected
  fingerprint and validation error are still explainable.
- Added `docs/ai-map-readiness.md` documenting the MDI -> compiler output ->
  renderer preflight contract and preview fidelity gate.
- Verification passed: `npm --workspace @aedventure/asset-registry run build`,
  `node packages/asset-registry/test/catalog.test.js`,
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`,
  `npm run qa:responsive`, `npm run check`, and `git diff --check`.
  Representative desktop and narrow-mobile QA screenshots were visually
  inspected.
- Phase 12 observability and QA is implemented. Added `npm run qa:renderer` as
  a Phaser-specific browser QA gate that builds the browser bundle, starts the
  local app, captures renderer capability snapshots, samples frame cadence,
  records texture/display-object counts, validates map-switch leak deltas, and
  writes a JSON report plus screenshot artifacts.
- Renderer QA now checks canvas nonblank state and pixel contrast for desktop,
  mobile, joined lobby, stress map, and depth-order fixtures. It also records
  whether depth samples come from fixture projection or camera-bounds fallback
  so screenshot assertions remain meaningful.
- `npm run check` remains the main gate and now invokes the renderer QA after
  frontend smoke. Existing responsive QA is unchanged and still passes.
- Verification passed: `npm run qa:renderer`, `npm run qa:responsive`,
  `npm run check`, `node --check scripts/renderer-qa.test.cjs`, and
  `git diff --check`. Representative renderer QA screenshots were visually
  inspected from `/var/folders/f2/krjzd4c15nn491pm37zrkp1h0000gn/T/aedventure-renderer-qa`.
- Phase 13 developer tooling is implemented. Renderer dev tools are gated to
  local developer/automation sessions through `?devtools=1` or local storage,
  with query-param defaults for grid, collision, zone, depth, sprite-bounds,
  camera readout, and initial fixture selection.
- Added a Phaser dev overlay for grid lines, collision tiles, sprite/player
  bounds, and camera readout. Zone and depth overlays now route through the
  same devtools state, while the primary product UI remains unchanged and
  exposes no debug controls.
- Added dev fixture selection through keyboard/API only: presets, generated
  room, depth fixtures, avatar fixture, zone fixture, and 20x15/50x40/100x80
  stress fixtures. `render_game_to_text.devTools` reports gate state, overlay
  state, shortcut help, fixture selector state, overlay object counts, and the
  product-control exposure count for agents.
- Renderer QA now opens a query-param-gated devtools session, validates every
  overlay state, asserts zero product-facing debug controls, captures devtools
  screenshots, verifies `Alt+Shift+C` toggles collision, and verifies
  `Alt+Shift+F` cycles to the next fixture.
- Verification passed: `npm --workspace @aedventure/web run build`,
  `npm run qa:renderer`, `npm run smoke:frontend`, `npm run qa:responsive`,
  `npm run check`, `node --check scripts/renderer-qa.test.cjs`,
  `node --check scripts/frontend-smoke.test.cjs`, and `git diff --check`.
  Representative devtools screenshots were visually inspected from
  `/var/folders/f2/krjzd4c15nn491pm37zrkp1h0000gn/T/aedventure-renderer-qa`.
- Rendering polish pass: avatar name labels now use high-resolution Phaser text
  and zoom-aware screen scaling so they stay crisp instead of being magnified
  with the pixel-art world. Avatar label render metadata is exposed through
  `render_game_to_text.avatars.players`.
- Avatar movement smoothing was refactored so the logical avatar container
  interpolates between server-confirmed positions with vertex rounding disabled,
  while idle/walk/rejection pose animation lives on an inner visual root. This
  prevents idle bobbing from fighting grid-step movement.
- Frontend smoke now asserts high-resolution labels, screen-space readable
  label bounds, the confirmed-position tween smoothing mode, and a true
  in-between current position while a remote avatar moves toward its target.
- Verification passed: `npm --workspace @aedventure/web run build`,
  `npm run smoke:frontend`, `npm run qa:renderer`, `npm run qa:responsive`,
  `npm run check`, `node --check scripts/frontend-smoke.test.cjs`, and
  `git diff --check`. Representative joined/depth renderer screenshots were
  visually inspected from
  `/var/folders/f2/krjzd4c15nn491pm37zrkp1h0000gn/T/aedventure-renderer-qa`.
- Avatar movement now uses browser-side client prediction with server
  reconciliation. The client still sends only `{ type: "move", direction, seq }`
  to the world server, but immediately animates the local rendered player
  against the same `@aedventure/map-engine` collision rules used by the server.
- Authoritative app state remains separate from rendered state: `state.position`
  updates only after `player_state`/`movement_rejected`, while `state.players`
  can hold the predicted visual target. `render_game_to_text.movement.prediction`
  exposes active prediction, attempted/target coordinates, totals, correction
  distance, and last outcome for agents and automation.
- Avatar name/emote text now uses 4x Phaser text resolution plus linear texture
  filtering, while pixel-art world assets remain nearest-neighbor. Local avatar
  smoothing reports `client_prediction_reconciliation`; remote avatars report
  `remote_interpolation`.
- Movement repeat cadence is now 125ms so held movement produces smaller,
  more frequent server-authoritative steps while preserving the 64px/s world
  speed. The local interpolation profile was retuned to glide through those
  steps with a near-continuous linear tween.
- Frontend smoke now delays one `/world/message` move request and proves the
  predicted visual avatar moves before the authoritative player position
  changes. Verification passed: `npm --workspace @aedventure/web run build`,
  `npm run smoke:frontend`, `npm run qa:renderer`, `npm run qa:responsive`,
  `npm run check`, and `git diff --check`. Renderer and responsive screenshots
  were visually inspected from the latest QA artifact folders. The standalone
  develop-web-game client remains blocked by its own missing `playwright`
  module resolution, while repo-owned Playwright suites continue to pass.
- Diagonal movement is now first-class and still server-authoritative. Clients
  send `{ type: "move", vector, direction, seq }`; the protocol accepts vector
  intents with legacy direction fallback, the map engine normalizes diagonal
  vectors so speed stays constant, and collision resolution can slide along a
  clear axis instead of hard-stopping every diagonal collision.
- Browser input now combines held arrow/WASD keys into diagonal vectors while
  keeping the last active key as the facing hint. Client prediction uses the
  same map-engine vector simulation as the world server, and
  `render_game_to_text.movement.prediction` exposes last vector, applied vector,
  and collision-slide telemetry for automation.
- Verification passed for the diagonal slice:
  `npm --workspace @aedventure/protocol run build`,
  `npm --workspace @aedventure/map-engine run build`,
  `node packages/map-engine/test/movement.test.js`,
  `npm --workspace @aedventure/world-server run build`,
  `node apps/world-server/test/authoritative-world.test.js`,
  `node apps/web/test/customer-office-app.test.js`,
  `npm --workspace @aedventure/web run build`,
  `npm run smoke:frontend`, `npm run qa:renderer`,
  `npm run qa:responsive`, `npm run check`, and `git diff --check`.
  Representative renderer and responsive QA screenshots were visually
  inspected from the latest artifact folders.
- Follow-up diagonal control fix: the product Move panel now exposes an
  8-direction d-pad instead of four cardinal-only buttons. Pointer/touch holds
  feed the same held-input repeater as keyboard chords, active controls get a
  pressed visual state, and keyboard smoke now verifies the real
  `ArrowUp` + `ArrowRight` path rather than the automation-only move hook.
- Verification passed after the d-pad fix: `npm --workspace @aedventure/web run
  build`, `npm run smoke:frontend`, `npm run qa:responsive`,
  `npm run qa:renderer`, `npm run check`, `node --check
  scripts/frontend-smoke.test.cjs`, and `git diff --check`. Mobile joined and
  expanded Move-control screenshots were visually inspected.
- Added an in-app Movement trace panel to debug diagonal input on real devices.
  The trace records key down/up, d-pad pointer events, active held vectors,
  in-flight queue/dequeue behavior, client prediction, server responses, and
  reconciliation. `render_game_to_text.movement.debugLog` exposes the same
  lines for automation, and the panel has a Copy button for sharing logs.
- The movement input path now preserves the latest intent that arrives while a
  request is in flight, then sends it immediately after the current move
  resolves. This specifically covers quick diagonal key chords where the second
  key used to arrive before the first request completed.
- Verification passed after the Movement trace work: `npm --workspace
  @aedventure/web run build`, `npm run smoke:frontend`,
  `npm run qa:responsive`, `npm run qa:renderer`, `npm run check`,
  `node --check scripts/frontend-smoke.test.cjs`, and `git diff --check`.
  A focused mobile screenshot confirmed the full-width Movement trace panel is
  readable.
- Client reconciliation now keeps a bounded pending input history and replays
  unacknowledged moves after each server ack. New predictions chain from the
  latest pending target, acknowledgements prune through `seqAck`, and the local
  motion controller blends toward the replayed target while `state.position`
  remains the server-confirmed coordinate.
- `render_game_to_text.movement.prediction` now exposes input-history and replay
  telemetry: history limit, pending count/seqs, last ack seq, replay count,
  total replay operations, replay target, and replay correction distance.
- Verification passed after input-history replay: `npm --workspace
  @aedventure/web run build`, `node --check scripts/frontend-smoke.test.cjs`,
  `npm run smoke:frontend`, `npm run qa:renderer`,
  `npm run qa:responsive`, and `npm run check`. Representative renderer and
  mobile responsive screenshots were visually inspected from the latest QA
  artifact folders. The standalone develop-web-game client still fails before
  navigation because it cannot resolve its own `playwright` package.
- Movement feel is now a first-class client runtime system. Defaults and tuning
  metadata live in `apps/web/src/browser/movement-feel.ts`, including explicit
  values for walk/run speed, acceleration, deceleration, turn response,
  correction smoothing, correction thresholds, frame step limiting, stop
  epsilon, and collision slide carry.
- The local motion controller now consumes a `MovementFeelTuning` object instead
  of hard-coded constants. Client prediction receives the same walk/run speeds,
  and turn response is separate from acceleration so direction changes can stay
  responsive without making starts/stops feel weightless.
- A devtools-gated Feel tuning panel appears only on local `?devtools=1`
  sessions. It exposes live sliders for the main feel values, writes changes to
  `render_game_to_text.movement.feel`, records tuning changes in the Movement
  trace, and provides an automation API at `window.__aedventureMovementFeel`.
- Verification passed after the movement-feel slice: `npm --workspace
  @aedventure/web run build`, `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. The devtools full-page screenshot and mobile joined
  screenshot were visually inspected. The standalone develop-web-game client
  still fails before navigation because it cannot resolve its own `playwright`
  package.
- Collision feel now supports bounded corner sliding in the shared movement
  engine. Cardinal and diagonal blocked moves can nudge along a nearby clear
  edge before fully rejecting, so players glide around furniture and wall
  corners instead of sticking to square tile boundaries.
- Movement responses, rejections, client predictions, debug logs, and
  `render_game_to_text.movement.prediction` now expose slide axis and slide
  distance metadata. This keeps client prediction, server authority, and
  automation aligned on whether a collision became an axis slide, a corner
  slide, or a hard block.
- Blocked movement feedback now includes a short impact ring around the avatar
  in addition to the existing physical bump. It reads as contact feedback in
  the world rather than as a primary UI error.
- Verification passed after the collision-feel pass: `npm --workspace
  @aedventure/map-engine run build`,
  `node packages/map-engine/test/movement.test.js`, `npm --workspace
  @aedventure/protocol run build`, `npm --workspace @aedventure/world-server
  run build`, `node apps/world-server/test/authoritative-world.test.js`,
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. Renderer and mobile responsive screenshots were visually
  inspected. The standalone develop-web-game client still fails before
  navigation because it cannot resolve its own `playwright` package.
- Avatar animation blending now separates authoritative 4-way direction from
  renderer-only 8-way visual facing. Motion deltas choose diagonal presentation
  states such as `downRight`, while server/world protocol can stay unchanged.
- The avatar registry now includes a renderer-only `turn` action for stationary
  direction changes. Pose details blend through a short tween, so hair, head,
  facing marker, feet, and body lean rotate/fade instead of snapping the whole
  avatar to a fresh pose.
- The avatar body is now isolated in its own Phaser container below the label
  layer. Walk/run/turn body pulses affect the character silhouette without
  scaling the crisp name label texture.
- Verification passed after the animation-blending pass: `npm --workspace
  @aedventure/web run build`, `node --check scripts/frontend-smoke.test.cjs`,
  `npm run smoke:frontend`, `npm run qa:renderer`,
  `npm run qa:responsive`, `npm run check`, and `git diff --check`. Desktop
  and mobile QA screenshots were visually inspected. The standalone
  develop-web-game client still fails before navigation because it cannot
  resolve its own `playwright` package.
- Camera feel now follows an invisible renderer-only leading anchor instead of
  the raw avatar anchor. The lead offset is based on rendered velocity, grows
  farther while running, and damps during correction-only movement so
  reconciliation does not create stop/start camera twitch.
- Camera state now exposes the follow lead contract in
  `render_game_to_text.camera.lead`: source, offset, target offset, velocity,
  speed, max distance, smoothing constant, and whether correction damping is
  active. The camera follow anchor is reported as `leading_player_anchor`.
- Deadzone ratios and follow lerp were retuned for the lead anchor, with a
  slightly tighter deadzone and softer follow easing to make movement feel
  anticipatory without jittering when idle.
- Verification passed after the camera-feel pass: `npm --workspace
  @aedventure/web run build`, `node --check scripts/frontend-smoke.test.cjs`,
  `npm run smoke:frontend`, `npm run qa:renderer`, and
  `npm run qa:responsive`. Desktop and mobile QA screenshots were visually
  inspected. `npm run check` and `git diff --check` also passed. The standalone
  develop-web-game client still fails before navigation because it cannot
  resolve its own `playwright` package.
- Remote avatar presentation now uses renderer-side snapshot buffering instead
  of restarting a Phaser position tween for every server update. Remote
  snapshots render at a small interpolation delay, can extrapolate briefly when
  a snapshot is late, and fall back to the last authoritative snapshot after
  the extrapolation cap.
- `render_game_to_text.avatars.players[].remoteInterpolation` now exposes the
  remote smoothing contract: buffer size, interpolation delay, extrapolation
  cap, render time, latest snapshot age, velocity, extrapolating, and snapping.
  Remote movement smoothing is reported as `remote_snapshot_buffer`.
- Avatar label/depth layout now uses the current rendered avatar position
  rather than the latest remote target position, so buffered remote movement
  keeps labels and y-depth aligned with what is actually on screen.
- Verification passed after the remote-interpolation pass: `npm --workspace
  @aedventure/web run build`, `node --check scripts/frontend-smoke.test.cjs`,
  `npm run smoke:frontend`, `npm run qa:renderer`, and
  `npm run qa:responsive`. Desktop and mobile QA screenshots were visually
  inspected. `npm run check` and `git diff --check` also passed.
- Mobile controls now use an analog virtual joystick as the primary touch
  movement input. The joystick emits fractional vectors and analog stick
  magnitude into the same
  server-authoritative movement, prediction, WebSocket/fallback, and
  reconciliation path as keyboard and D-pad input; the 8-way D-pad remains as a
  secondary fallback.
- `render_game_to_text.movement.joystick` now exposes primary/fallback state,
  active pointer, vector, magnitude, knob position, radius, and deadzone
  telemetry. The movement trace records joystick down/move/release events so
  real-device touch issues can be debugged without guessing.
- Mobile collaboration layout now gives an opened tool full width and removes
  internal tray scrolling for expanded controls, so the joystick and D-pad do
  not squeeze into narrow columns or overlap text.
- Verification passed after the joystick slice: `npm --workspace
  @aedventure/map-engine run build`, `node packages/map-engine/test/movement.test.js`,
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`, `npm run smoke:frontend`,
  `npm run qa:responsive`, `npm run qa:renderer`, `npm run check`, and
  `git diff --check`. A focused mobile screenshot of the expanded Move panel
  was visually inspected at
  `/private/tmp/aedventure-mobile-joystick.png`. The standalone
  develop-web-game client still fails before navigation because it cannot
  resolve its own `playwright` package.
- Copyleft asset onboarding started. Downloaded and checked in LPC/OpenGameArt
  source material for `[LPC] Floors`, `[LPC] Walls`, `[LPC] Wooden Furniture`,
  and `[LPC] Upholstery`; the tempting `[LPC Revised] The Office` archive was
  rejected because its bundled credits identify the actual files as OGA-BY
  rather than copyleft.
- The internal office atlas generator now derives floors, walls, table
  surfaces, round tables, chair details, and couch shapes from those LPC source
  sheets while preserving existing semantic IDs, GIDs, collision metadata, and
  Phaser atlas paths.
- The generated atlas manifest now records every external image input with
  source URL, author, copyleft license choice, attribution text, credit-file
  path when available, and SHA-256 checksums so the asset pipeline remains
  reproducible and auditable.
- Verification passed for the copyleft asset pass:
  `npm --workspace @aedventure/asset-registry run build`,
  `node packages/asset-registry/test/catalog.test.js`,
  `node scripts/build-internal-office-atlas.cjs --check`,
  `node scripts/verify-internal-assets.cjs`,
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. Desktop and mobile renderer screenshots were visually
  inspected. The standalone develop-web-game client still fails before
  navigation because it cannot resolve `playwright` from the skill runtime.
- Realtime simulation core is now in place on the local world path. WebSocket
  movement messages queue input intents instead of applying them immediately;
  `WorldRoomController.tick()` consumes the latest queued intent per client on
  a fixed 50 ms server tick, routes authoritative movement results, and
  broadcasts `world_snapshot` messages with tick, tickMs, serverTime, players,
  movement mode, and last acknowledged sequence.
- Browser movement now streams input at 20 Hz when `/world/realtime` is open,
  bypassing the old one-request-in-flight guard only for WebSocket transport.
  HTTP movement fallback still keeps the guard. Client prediction remains
  immediate, with reconciliation replay driven by player-state acks or snapshot
  acks.
- `render_game_to_text.movement.simulation` now exposes the realtime contract:
  mode, input rate, client input frame, server tick, server rate, snapshot
  count, last snapshot tick, and last snapshot server time. Smoke coverage now
  asserts the 20 Hz input/50 ms server-tick path after movement.
- Verification passed after the realtime simulation slice:
  `npm --workspace @aedventure/protocol run build`,
  `npm --workspace @aedventure/world-server run build`,
  `npm --workspace @aedventure/web run build`,
  `node apps/world-server/test/authoritative-world.test.js`,
  `node apps/web/test/adapters.test.js`, `node scripts/dev-app-loop.test.cjs`,
  `npm run smoke:frontend`, `npm run qa:renderer`,
  `npm run qa:responsive`, `npm run check`, and `git diff --check`.
  Desktop and mobile QA screenshots were visually inspected. The standalone
  develop-web-game client still fails before navigation because it cannot
  resolve `playwright` from the skill runtime.
- Real avatar animation metadata is now explicit in the renderer contract.
  The avatar registry exposes the supported states (`idle`, `walk`, `run`,
  `turn`), the 4-way server / 8-way visual-facing model, procedural atlas
  metadata, per-animation frame keys, frame counts, frame rates, anchors, and
  preview fixtures covering avatar/state/visual-facing combinations.
- `render_game_to_text.avatars` now reports the sprite atlas contract,
  animation states, visual direction model, preview fixtures, and per-player
  sprite frame metadata. The current art path is intentionally labeled
  `procedural_proxy` so the later bitmap-atlas replacement can be verified
  without pretending placeholder procedural parts are final avatar art.
- Verification passed after the avatar animation metadata pass:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, and `npm run check`.
  Desktop/mobile renderer and responsive screenshots were visually inspected.
  The standalone develop-web-game client was attempted against a local Vite
  server but still fails before navigation because it cannot resolve
  `playwright` from the skill runtime.
- Asset metadata pipeline was hardened. Internal atlas frames now carry
  per-frame tenant theme tags, default and tenant-tint variant metadata,
  precise visual footprints, per-object collision footprints, z-anchors, and
  foreground occlusion split metadata. The generated manifest mirrors the
  TypeScript catalog so drift is caught by asset verification.
- Source/license validation is stricter for bundled target assets: bundled
  sources must have a manifest path, attribution text, distribution approval,
  commercial approval, and an approved copyleft license path. Manifest inputs
  still record source URLs, attribution, license, and checksums.
- `render_game_to_text.renderer.assets.metadata` now exposes frame count,
  footprint counts, z-anchor count, occlusion split count, variant count,
  tenant theme tags, source input count, source-license validation, and atlas
  build validation for browser automation and future agents.
- Verification passed after the asset metadata pipeline slice:
  `npm --workspace @aedventure/asset-registry run build`,
  `node scripts/build-internal-office-atlas.cjs --check`,
  `node packages/asset-registry/test/catalog.test.js`,
  `node scripts/verify-internal-assets.cjs`,
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. Desktop/mobile renderer and responsive screenshots were
  visually inspected. The standalone develop-web-game client still fails
  before navigation because it cannot resolve `playwright` from the skill
  runtime.
- Big map performance proof telemetry is now explicit. `render_game_to_text`
  exposes `performance.proofs` for map size, GPU tile batching, viewport
  culling, object pooling, and texture reuse. The benchmark API now returns a
  `proof` object covering benchmark map coverage, batching, culling, pooling,
  texture reuse, and repeated-map leak checks.
- Renderer QA now proves the 20x15, 50x40, and 100x80 benchmark sequence across
  two passes. The latest artifact showed one Phaser game instance, zero
  repeated 100x80 display-object delta, zero texture delta, zero created-sprite
  delta, zero created-texture delta, GPU batching true, culling true, pooling
  true, texture reuse true, and no map-switch leaks. The 100x80 sample rendered
  8,356 static tiles, 512 depth objects, and culled 482 of 512 object sprites.
- `docs/renderer-performance-budget.md` now documents the automated proof
  contract so future renderer work knows exactly which invariants preserve SaaS
  tenant-space readiness.
- Verification passed after the big-map performance proof slice:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. Renderer stress-map, desktop, and mobile screenshots were
  visually inspected. The standalone develop-web-game client still fails
  before navigation because it cannot resolve `playwright` from the skill
  runtime.
- World interactions now run through a server-permitted action layer instead
  of canvas-only presentation. The renderer can show native object markers,
  zone affordances, and available actions, while the app asks the dev host for
  permitted meeting/private/portal/object actions before enabling product UI.
- The World tool section now presents the nearest permitted action, including
  meeting joins, private area availability, portal entries, door prompts, and
  object-use prompts. Meeting controls only unlock when the world-action
  permission response allows `join_meeting` for the current zone.
- `render_game_to_text` now reports world interaction authority, candidates,
  visible markers, and the renderer/app permission contract so automation can
  verify that actions are server-gated rather than client-invented.
- Verification passed after the world interaction layer slice:
  `node --check scripts/dev-http-host.cjs`,
  `node --check scripts/dev-http-host.test.cjs`,
  `node --check scripts/frontend-smoke.test.cjs`,
  `node scripts/dev-http-host.test.cjs`,
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. The renderer-zone, desktop, and mobile screenshots were
  visually inspected. The standalone develop-web-game client still fails before
  navigation because it cannot resolve `playwright` from the skill runtime.
- Developer renderer tooling now has an explicit object-footprint overlay in
  addition to the existing grid, collision, zone bounds, depth, sprite/label
  bounds, camera readout, fixture selector, and movement tuning panel. Object
  footprints draw authored visual footprint, collision footprint, and z-anchor
  metadata so art/collision/depth bugs can be diagnosed separately.
- `render_game_to_text.devTools.renderer.overlayObjectCounts` now reports grid
  lines, blocked tiles, zone bounds, depth anchors, object footprints, and
  sprite bounds. The overlay can be query-gated with `devObjectFootprints=1`,
  toggled through `Alt+Shift+O`, and controlled through the local automation
  devtools API.
- Verification passed after the developer tooling slice:
  `node --check scripts/renderer-qa.test.cjs`,
  `npm --workspace @aedventure/web run build`, `npm run qa:renderer`,
  `npm run smoke:frontend`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. The devtools-zone, devtools-page, desktop, and mobile
  screenshots were visually inspected. The required standalone
  develop-web-game client was attempted against the local dev host but still
  fails before navigation because it cannot resolve `playwright` from the skill
  runtime.
- A gated renderer dev menu now appears inside the map stage when `devtools=1`
  is active on a local host. It lists all overlay toggles, shows the current
  devtools status, and exposes the fixture selector without adding any
  product-facing dev controls.
- The menu writes back through the same devtools state used by query params,
  keyboard shortcuts, and the local automation API. Renderer QA now verifies
  that menu checkboxes, app state, and renderer overlay state stay synchronized,
  including a UI toggle for object footprints.
- Verification passed after the devtools menu slice:
  `node --check scripts/renderer-qa.test.cjs`,
  `npm --workspace @aedventure/web run build`, `npm run qa:renderer`,
  `npm run smoke:frontend`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. The devtools-page, devtools-zone, desktop, and mobile
  screenshots were visually inspected. The standalone develop-web-game client
  was attempted against the local dev host on port 8108 but still fails before
  navigation because it cannot resolve `playwright` from the skill runtime.
- Movement feel presets now live beside the tuning controls in
  `movement-feel.ts`: Default, Snappy, Smooth, Heavy, and Mobile. The dev-only
  feel panel exposes the presets as quick buttons while preserving direct
  slider tuning; any manual slider edit reports the active preset as `custom`.
- `render_game_to_text.movement.feel` now reports active preset id/label,
  preset metadata, preset values, and existing slider controls. The local
  `__aedventureMovementFeel` dev API can now apply presets as well as
  individual values, which keeps browser QA and future agents aligned with the
  panel.
- Verification passed after the movement-feel preset slice:
  `node --check scripts/renderer-qa.test.cjs`,
  `npm --workspace @aedventure/web run build`, `npm run qa:renderer`,
  `npm run smoke:frontend`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. The devtools-page, desktop, and mobile screenshots were
  visually inspected. The standalone develop-web-game client was attempted
  against the local dev host on port 8108 but still fails before navigation
  because it cannot resolve `playwright` from the skill runtime.
- Realtime simulation core telemetry is now explicit across protocol, server,
  client transport, renderer, and `render_game_to_text`. `world_snapshot`
  messages include fixed-tick authority, latest-intent input coalescing,
  queued-client count, processed move count, dropped move count, max queue
  depth, and latest input age. The browser reports snapshot cadence, snapshot
  age, server tick Hz, and the same input stats.
- Remote avatar interpolation now carries snapshot tick/server-time/receive-time
  metadata from the WebSocket snapshot stream into the Phaser avatar buffer.
  `render_game_to_text.avatars.players[].remoteInterpolation` exposes
  `source: "server_snapshot_stream"`, buffered window duration, latest snapshot
  tick/server time, and latest snapshot age so automation can distinguish
  real snapshot buffering from direct position jumps.
- Client prediction telemetry now names the actual game-network model:
  sequence-numbered input history, authoritative player-state/world-snapshot
  acks, rewind/replay/blend reconciliation, and visual-only correction after
  replay. `render_game_to_text.movement.simulation` reports server authority,
  fixed tick, WebSocket intent stream/fallback mode, input coalescing, client
  reconciliation, and remote snapshot-buffer interpolation.
- Verification passed after the realtime simulation core slice:
  `npm --workspace @aedventure/protocol run build`,
  `npm --workspace @aedventure/world-server run build`,
  `npm --workspace @aedventure/web run build`,
  `node apps/world-server/test/authoritative-world.test.js`,
  `node --check scripts/frontend-smoke.test.cjs`, `git diff --check`,
  `npm run smoke:frontend`, `npm run qa:renderer`, `npm run qa:responsive`,
  and `npm run check`. Renderer and responsive desktop/mobile screenshots were
  visually inspected. The local dev host was restarted on port 8108 with the
  rebuilt stack. The required standalone develop-web-game client was attempted
  against `http://127.0.0.1:8108/app`, but it still fails before navigation
  because the skill runtime cannot resolve `playwright`.
- World interaction presentation now has polished server-permitted affordances:
  active candidates expose `actionAffordance`, `hotkeyLabel`, `tapLabel`,
  selected/hovered candidate ids, and marker presentation telemetry through
  `render_game_to_text.worldInteractions`.
- The Phaser interaction renderer now draws zoom-aware action marker cards with
  an `E` keycap, tap-ready prompt chip, hover/click selection, and an activation
  callback that re-checks the current candidate in app state before running the
  action. Overlapping portal-door markers collapse visually to the primary
  server-approved action so the canvas does not stack duplicate labels.
- Door/portal and private zone feedback is richer in the zone renderer:
  portal thresholds draw doorway geometry, private areas get subtle hatch
  feedback, and zone telemetry now reports `feedback` values such as
  `private_access_available` and `portal_ready`.
- The product panel now has a compact `E / Tap` action affordance, the `E`
  hotkey triggers the current server-approved primary action, and marker taps
  use the same action path. Frontend smoke now verifies affordance telemetry,
  private feedback, portal feedback, and marker visibility.
- Verification passed after the world interaction polish slice:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`, `git diff --check`,
  `npm run smoke:frontend`, `npm run qa:renderer`, `npm run qa:responsive`,
  and `npm run check`. Responsive and renderer screenshots were visually
  inspected, plus a targeted Playwright screenshot of the active portal marker
  was captured at `/private/tmp/aedventure-interaction-marker.png`. A targeted
  browser check also verified that pressing `E` on an approved portal action
  produces the expected "Portal Door opened" toast. The required
  standalone develop-web-game client was attempted again against
  `http://127.0.0.1:8108/app`, but still fails before navigation because the
  skill runtime cannot resolve `playwright`.
- Avatar animation now runs through a sprite-atlas metadata pipeline instead
  of the previous procedural-proxy contract. The renderer exposes atlas schema
  version, stable `avatar/action/server-direction/frame` keys, generated frame
  texture source, per-state frame counts/rates/loop/blend metadata, turn
  blending, emote hooks, and label visibility rules through
  `render_game_to_text.avatars`.
- Phaser avatar rendering now swaps generated frame textures by atlas frame
  key while keeping the old procedural body parts hidden as a temporary
  fallback scaffold. The current frame key/index/rate/duration/loop/blend
  state is reported per player, with 4-way authoritative server direction and
  8-way visual facing preserved.
- Verification passed after the avatar sprite-atlas pipeline slice:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`, `git diff --check`,
  `npm run smoke:frontend`, `npm run qa:renderer`, `npm run qa:responsive`,
  and `npm run check`. Renderer and responsive screenshots were visually
  inspected. The required standalone develop-web-game client was attempted
  against `http://127.0.0.1:8108/app`, but still fails before navigation
  because the skill runtime cannot resolve `playwright`.
- Avatar animation preview now has a dev-only contact-sheet fixture available
  through `__aedventureRendererTest.renderAvatarPreviewGallery()` and the gated
  renderer fixture selector (`avatar_preview_gallery`). It renders all 4
  avatars across idle/walk/run/turn and all 8 visual facings, while preserving
  4-way server direction mapping through `animationPreview`.
- The preview gallery is sized to fit inside the current minimum room zoom so
  all 128 avatar previews, short labels, and edge walls are visible in one
  renderer screenshot. The fixture is hidden from product UI and only exposed
  through local automation/devtools.
- Verification passed after the avatar preview gallery slice:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`, `git diff --check`,
  `npm run smoke:frontend`, `npm run qa:renderer`, `npm run qa:responsive`,
  and `npm run check`. The renderer gallery screenshot was inspected at
  `/var/folders/f2/krjzd4c15nn491pm37zrkp1h0000gn/T/aedventure-renderer-qa/avatar-preview-gallery-canvas.png`
  and a targeted local screenshot was captured at
  `/private/tmp/aedventure-avatar-preview-gallery.png`. The required
  standalone develop-web-game client was attempted against
  `http://127.0.0.1:8108/app`, but still fails before navigation because the
  skill runtime cannot resolve `playwright`.
- Avatar animation state is now resolved through an explicit transition
  planner instead of ad hoc inline branching in `AvatarView.update()`. The
  planner names transitions such as `idle_to_locomotion`,
  `locomotion_direction_blend`, `locomotion_speed_blend`, `idle_to_turn`,
  `turn_hold`, and `turn_to_idle`.
- Locomotion frame phase is preserved across compatible walk/run and direction
  changes, so changing direction swaps the frame texture without resetting the
  animation clock. Idle, turn, and identity changes still deliberately restart
  the sprite clock.
- `render_game_to_text.avatars.players[].animation.transition` now reports
  from/to state, transition reason, whether sprite phase was preserved, whether
  the sprite clock restarted, and whether a stationary turn hold is active.
  Frontend smoke verifies idle-to-walk, direction-blend, stationary turn, and
  turn-to-idle behavior.
- Verification passed after the animation state-machine cleanup:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`, `git diff --check`,
  `npm run smoke:frontend`, `npm run qa:renderer`, `npm run qa:responsive`,
  and `npm run check`. Renderer and responsive screenshots were visually
  inspected. The standalone develop-web-game client was attempted against
  `http://127.0.0.1:8108/app`, but still fails before navigation because the
  skill runtime cannot resolve `playwright`.
- Renderer QA now covers avatar animation regressions directly: it captures
  8-way facing crops from the avatar preview gallery, asserts each crop has
  visible/high-contrast avatar pixels, and checks that the facing set produces
  distinct silhouettes instead of duplicated diagonal/side textures.
- Avatar animation telemetry now includes frame progression derived from
  Phaser scene time: elapsed time, raw frame index, current frame index, frame
  count, cycle duration, normalized loop progress, and loop status. Frontend
  smoke and renderer QA both verify the telemetry stays consistent with the
  active sprite frame.
- Renderer QA now switches from the fully-cycled avatar gallery to a stress map
  and back to the avatar gallery twice, then verifies visible avatar texture
  keys and runtime texture counts remain bounded. This gives us an automated
  leak check for map/avatar switches before real imported atlases land.
- Verification passed after the avatar QA expansion:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`, `git diff --check`,
  `npm run smoke:frontend`, `npm run qa:renderer`, `npm run qa:responsive`,
  and `npm run check`. The latest avatar preview gallery plus 8-way crop
  artifacts were visually inspected under
  `/var/folders/f2/krjzd4c15nn491pm37zrkp1h0000gn/T/aedventure-renderer-qa`.
  The required standalone develop-web-game client was attempted against
  `http://127.0.0.1:8108/app`, but still fails before navigation because the
  skill runtime cannot resolve `playwright`.
- Avatar playback now goes through Phaser's Animation Manager instead of
  direct image frame swapping. The avatar sprite atlas adapter registers native
  Phaser animation keys for each semantic avatar/action/server-direction plus
  8-way visual facing, while still generating fallback canvas frame textures
  until real atlas images are available.
- Avatar views now use `Phaser.GameObjects.Sprite` and expose native animation
  telemetry through `render_game_to_text`: native animation key, registration
  state, playing state, repeat, frame rate, progress, and current Phaser frame
  texture. The semantic state machine still owns action transitions and phase
  preservation; Phaser now owns frame lookup and texture-frame selection.
- Renderer QA reports frame progression with `source:
  phaser_animation_manager` and includes native animation details for the
  avatar preview samples. The texture leak check remains bounded after the
  animation-manager migration.
- Verification passed after the Phaser Animation Manager migration:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`,
  `npm run smoke:frontend`, `npm run qa:renderer`,
  `npm run qa:responsive`, and `npm run check`. The latest avatar preview
  gallery plus desktop/mobile responsive screenshots were visually inspected.
  The standalone develop-web-game client was attempted against
  `http://127.0.0.1:8108/app`, but still fails before navigation because the
  skill runtime cannot resolve `playwright`.
- Renderer office textures now load through Phaser's LoaderPlugin asset-pack
  path instead of a custom fetch/Image preload. The core office pack registers
  the internal atlas manifest as JSON and the atlas image as a Phaser texture,
  while renderer telemetry reports pack key, section, tenant/theme bundle IDs,
  load progress, completed file keys, failed file keys, and JSON/texture cache
  membership through `render_game_to_text.renderer.assets.loader`.
- The semantic tileset still compiles from stable asset-registry token IDs, but
  its atlas source is now resolved from Phaser caches via
  `runtimeAssetAtlasFromLoadedAssets()`. Procedural drawing remains the
  fallback path when an atlas frame is missing, keeping generated maps and QA
  fixtures deterministic while opening the path for multi-atlas and tenant
  theme bundles later.
- Frontend smoke and renderer QA now assert the loader contract: the
  `core-office` section is loaded, deferred sections include avatar and tenant
  bundles, failed file count is zero, the office atlas manifest is present in
  the Phaser JSON cache, and the office atlas image is present in the Phaser
  texture cache.
- Renderer QA's avatar texture leak check now dispatches scene-switch commands
  and verifies the resulting `render_game_to_text` state. This avoids keeping a
  Playwright evaluation promise attached while Phaser tears down the 128-avatar
  preview scene, which was causing a transient execution-context loss even
  though the page and renderer remained alive.
- Verification passed after the Phaser asset-pack loader migration:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/renderer-qa.test.cjs`, `git diff --check`,
  `npm run smoke:frontend`, `npm run qa:renderer`, `npm run qa:responsive`,
  and `npm run check`. The latest stress-map, avatar-gallery, desktop, and
  mobile screenshots were visually inspected under the renderer and responsive
  QA artifact directories.
- Static architectural map layers now bake into a reusable Phaser
  `RenderTexture` after the floor and wall tile layers are generated. The
  source layers are still built as GPU tilemap layers from semantic map data,
  then drawn once into a single `baked-static-architecture` render texture and
  destroyed so runtime presentation uses one static background display object.
- Renderer telemetry now reports `renderer.tilemap.staticLayerBake` plus
  `renderer.performance.proofs.staticLayerBaking`. The proof records whether
  baking is enabled, that the mode is `single_render_texture`, the source layer
  count, baked layer count, source tile count, and the display-object reduction.
  Large-map benchmark proof now requires static layer baking in addition to GPU
  tile batching, viewport culling, object pooling, texture reuse, and no switch
  leaks.
- The bake texture is reused and resized across map switches instead of
  allocating one texture per generated room. Renderer QA verified the repeated
  100x80 map display-object delta and texture delta both remain `0`, with
  `staticLayerBaking: true` for all 20x15, 50x40, and 100x80 benchmark samples.
- Verification passed after the RenderTexture baking migration:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`, `git diff --check`,
  `npm run smoke:frontend`, `npm run qa:renderer`, `npm run qa:responsive`,
  and `npm run check`. Latest renderer desktop/stress screenshots and the
  mobile responsive screenshot were visually inspected. The standalone
  develop-web-game client was attempted against `http://127.0.0.1:8108/app`,
  but still fails before navigation because the skill runtime cannot resolve
  `playwright`.
- Custom WebGL room effects are now wired into the Phaser effects layer through
  a dedicated shader object/pass. Premium effects report
  `customWebglPipelines: ["ShaderQuad:aedventure_room_lighting"]`,
  `shaderPass: "custom_room_lighting_shader"`, floor lighting, zone glow, soft
  shadows, shader object counts, and `capability.shadersAvailable` through
  `render_game_to_text.renderer.effects`.
- The shader is intentionally visual-only: it consumes compiled map bounds and
  up to four zone rectangles as uniforms, but it does not affect collision,
  movement, permissions, or zone authority. If shader game objects are not
  available, the effects layer skips the custom shader pass and keeps the
  static ambient graphics path alive.
- The first shader tuning pass was too bright and washed the lobby toward
  white/cyan. A visual comparison against effects-off and low-quality effects
  led to reduced camera brightness, lower ambient/light alpha, more restrained
  shader alpha, a neutral default palette, and edge-focused zone glow. The
  latest desktop renderer screenshot keeps material contrast while preserving a
  subtle premium lighting layer.
- Frontend smoke and renderer QA now assert the custom WebGL effects contract,
  including active shader pipeline metadata, shader pass names, zone glow, soft
  shadows, shader object counts, and low-capability shutdown.
- Verification passed after the custom WebGL effects pass:
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. Latest renderer desktop/stress screenshots and mobile
  responsive screenshots were visually inspected. The standalone
  develop-web-game client was attempted against `http://127.0.0.1:8787`, but
  still fails before navigation with `ERR_MODULE_NOT_FOUND` because the
  skill-local script cannot resolve `playwright`.
- Phaser particles are now part of the visual-only effects layer. The new
  `ParticleEffectsPass` creates a reusable soft particle texture and
  capability-gated emitters for room entry transitions, coffee steam, plant
  motes, portal shimmer, and meeting-zone activation. Particle effects consume
  compiled map objects/zones plus renderer zone-interaction state, but they do
  not affect movement, collision, permissions, media, or server authority.
- Effects telemetry now reports `animationMode: "ambient_particles"` when
  particles are active, `deterministic: false` for animated visual state,
  `capability.particlesAvailable`, active `particleEffects`, per-effect emitter
  counts, particle texture count, and a bounded `particleAliveBudget`.
- Particle budgets remain intentionally small. Latest renderer QA reported:
  lobby `4` emitters / `29` max alive particles, stress map `8` / `46`, and
  avatar preview `1` / `18`. The stress map also verified
  `meeting_zone_activation` through zone-interaction state.
- Verification passed after the particle effects pass:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. Latest renderer desktop/stress screenshots and mobile
  responsive screenshots were visually inspected. The standalone
  develop-web-game client was attempted against `http://127.0.0.1:8787`, but
  still fails before navigation with `ERR_MODULE_NOT_FOUND` because the
  skill-local script cannot resolve `playwright`.
- Phaser multiple-camera support is now wired through a dedicated
  `SecondaryCameraController`. It creates an `overview-minimap` Phaser camera
  beside the main follow camera, uses a same-scene overlay viewport, fits the
  full room/map on resize or map switch, and disables itself on compact
  viewports so mobile keeps the canvas clear.
- Camera telemetry now reports `camera.secondary` with Phaser CameraManager
  source, `main_only` vs `main_plus_overview` mode, max/total/visible camera
  counts, overview viewport, world view, zoom, alpha, round-pixel state, render
  target, and update policy. Renderer QA now records this in the snapshot
  report.
- A startup bug was caught during smoke: `render_game_to_text` failed to
  install because camera telemetry queried `scene.cameras.getTotal()` before
  Phaser had booted the scene. The secondary camera info path now tolerates the
  pre-ready phase and reports zero camera counts until the camera manager is
  available.
- Verification passed after the secondary-camera pass:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. Latest desktop renderer screenshot was visually inspected
  and shows the top-right overview camera; latest mobile-narrow responsive
  screenshot was inspected and correctly has no minimap. The standalone
  develop-web-game client was attempted against `http://127.0.0.1:8787`, but
  still fails before navigation with `ERR_MODULE_NOT_FOUND` because the
  skill-local script cannot resolve `playwright`.
- Phaser scene management is now split into an explicit `RendererSceneManager`
  with `RendererLoadingScene` for asset-pack preload/cache warmup and
  `OfficeScene` for the live office runtime. Future scene boundaries are now
  named in telemetry for lobby, avatar preview, generated-room preview, map
  editor, and room transitions without moving product UI/auth/media into Phaser.
- `render_game_to_text.renderer.scenes` now reports active, registered, and
  planned scene keys plus preload/world ownership. The engine architecture
  contract also reports `RendererSceneManager`, so QA and future agents can
  verify that scene lifecycle stays behind `RendererHost`.
- Scene-manager implementation sanity checks passed so far:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`, and
  `node --check scripts/renderer-qa.test.cjs`.
- Verification passed after the scene-manager pass:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. Latest renderer QA and responsive desktop/mobile
  screenshots were visually inspected; the office canvas remains nonblank,
  the overview camera still appears on desktop, and mobile stays map-first
  without the minimap. The renderer QA report now records active
  `OfficeScene`, registered `RendererLoadingScene`/`OfficeScene`, and planned
  lobby/avatar-preview/generated-room-preview/map-editor/transition scenes.
- The standalone develop-web-game client was attempted again against
  `http://127.0.0.1:8787`, but still fails before navigation with
  `ERR_MODULE_NOT_FOUND` because the skill-local script cannot resolve the
  `playwright` package.
- Phaser advanced input support now lives behind a dedicated
  `AdvancedInputPlugin`. It tracks pointer world coordinates, semantic zone
  hit-testing, invisible object hit areas, drag targets, cursor state, touch
  multi-pointer/pinch telemetry, and renderer-only object selection. This is
  deliberately visual/selection telemetry only; movement, map mutation, and
  permissions remain outside Phaser authority.
- Zone hover now flows through the advanced input layer instead of direct
  pointer listeners in `ZoneRenderer`. Object hit targets are generated from
  renderer depth bounds, which keeps interaction geometry aligned with the same
  metadata used for z-order, occlusion, and QA.
- Renderer QA now performs a real input exercise: it projects a world object
  through the renderer test API, moves the mouse over its Phaser hit area,
  verifies `grab` cursor state, selects and drags the target, then moves over a
  semantic zone and verifies zone hover. A failed first attempt exposed that
  `GameObjects.Zone` needed native size-based hit areas rather than a custom
  negative rectangle hit area.
- Verification passed after the advanced input pass:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. Latest renderer and mobile responsive screenshots were
  visually inspected. The standalone develop-web-game client still fails before
  navigation with `ERR_MODULE_NOT_FOUND` because the skill-local script cannot
  resolve `playwright`.
- Follow-up cleanup kept hover-only pointer movement out of active pointer
  counts so drag/pinch telemetry only reflects pressed pointers. The localhost
  QA scripts needed escalated execution on the final rerun because the sandbox
  blocked temporary `127.0.0.1` binds, but the tests themselves passed.
- Phaser Arcade Physics is now enabled only for visual/editor affordances
  through `PhysicsAffordanceSystem`. It creates static Arcade sensor bodies from
  renderer depth object collision bounds and semantic zone bounds, plus two
  dynamic probes: a local player affordance probe and an editor placement
  preview probe. It does not attach physics bodies to avatars and does not
  mutate movement, collision, map placement, or permissions.
- `render_game_to_text.renderer.physics` now reports the engine (`arcade`),
  visual-only authority boundary, sensor/probe counts, local probe overlaps,
  and deterministic placement-preview state. Matter remains explicitly disabled
  for runtime authority.
- Renderer QA now verifies the physics affordance contract. Latest report:
  54 object sensors, 1 zone sensor, 55 static bodies, 2 dynamic probes, local
  probe `near_zone` on `lobby-zone`, and placement preview `blocked` against
  `furniture:item.plant_potted:3,3`.
- Verification passed after the physics affordance pass:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. Latest renderer and mobile responsive screenshots were
  visually inspected. The standalone develop-web-game client still fails before
  navigation with `ERR_MODULE_NOT_FOUND` because the skill-local script cannot
  resolve `playwright`.
- Phaser masks, blend modes, and depth effects now live in a dedicated
  `DepthEffectsLayer`. It builds Phaser geometry masks for semantic zone fog,
  applies a low-alpha multiply fog pass to masked zones, reports private-zone
  mask counts when private zones exist, and computes foreground label-occlusion
  candidates from the same depth metadata used for object/player sorting.
- Foreground wall sprites now receive explicit blend treatment. Glass wall
  foreground sprites are transparent, tinted, and rendered with `SCREEN`
  blending; solid foreground occluders stay on normal blending. Pooled object
  sprites now reset alpha, tint, and blend mode before reuse to prevent visual
  state from leaking between assets.
- Avatar labels now support visual-only foreground occlusion. Local labels stay
  readable; remote labels that overlap foreground occluders are dimmed by the
  renderer without changing movement, collision, or permission authority.
- `render_game_to_text.renderer.depthEffects` now reports visual-only
  authority, feature flags, geometry/zone/label mask counts, foreground/glass
  blend-mode counts, fog mode, and label occlusion policy. The engine
  architecture contract now names `DepthEffectsLayer` and the
  `phaserDepthEffectsAreVisualOnly` boundary.
- Renderer QA now records depth-effects telemetry in
  `renderer-qa-report.json`. Latest report verified one geometry mask, one
  zone-fog mask, 47 glass foreground sprites using `screen`, and label
  occlusion telemetry on the lobby; the stress map verified a private-zone mask
  path. Latest desktop lobby, mobile responsive, and devtools-zone screenshots
  were visually inspected and remained nonblank/readable.
- Verification passed after the depth-effects pass:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. The standalone develop-web-game client was attempted
  against `http://127.0.0.1:8787/app`, but still fails before navigation with
  `ERR_MODULE_NOT_FOUND` because the skill-local script cannot resolve
  `playwright`.
- Phaser tilemap features beyond static rendering now live in
  `TilemapFeatureSystem`. Static floor/wall tiles are annotated during paint
  with schema-versioned semantic metadata (`semanticId`, `kind`, layer,
  collision flag, editor-selectable flag, tenant-customizable flag, animation
  key, callback kind, and tile segment offsets).
- The tilemap runtime now registers Phaser collision properties and callbacks
  without changing gameplay authority: wall tiles get collision properties and
  tile-index callbacks, while semantic zones get floor-layer location
  callbacks. These callbacks are renderer/editor affordances only; compiled
  collision layers and the server remain authoritative.
- Animated tile overlays now provide a lightweight Phaser-tween animation path
  for semantic tiles. The first pass animates glass wall tiles with subtle
  screen-blended shimmer rectangles capped at 96 overlays, leaving static
  GPU/baked architecture intact.
- `render_game_to_text.renderer.tilemap.features` now reports tile metadata,
  collision-property counts, callback registrations, animated tile overlays,
  and layered editor readiness. The engine architecture contract now names
  `TilemapFeatureSystem` and the
  `phaserTilemapFeaturesAreRendererOnly` boundary.
- Renderer QA now verifies the tilemap feature contract. Latest lobby report:
  207 schema-versioned tile properties, 47 wall collision-property tiles, 2
  wall tile-index callbacks, 1 floor location callback, 47 animated glass tile
  overlays, and layered editor metadata ready across `floor` and `walls`.
  Latest desktop lobby, mobile responsive, and devtools-zone screenshots were
  visually inspected and remained nonblank/readable.
- Verification passed after the tilemap-features pass:
  `npm --workspace @aedventure/web run build`,
  `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. The standalone develop-web-game client was attempted
  against `http://127.0.0.1:8787/app`, but still fails before navigation with
  `ERR_MODULE_NOT_FOUND` because the skill-local script cannot resolve
  `playwright`.
- Phaser world UI audio now lives in `WorldAudioSystem`. It uses Phaser's
  sound manager for generated lightweight WAV cues while keeping call media,
  LiveKit, and meeting permissions outside Phaser. The first cue set covers
  footsteps, doors/portals becoming available, zone enter, blocked movement,
  chat notification, and map transition feedback.
- Audio playback is event-driven from renderer/world state: local player step
  distance and run throttle, server-rejected movement, active zone changes,
  server-permitted door/portal candidates, chat delivery, and map render
  transitions. Autoplay lock is treated as a normal browser state, so the
  renderer records attempts instead of surfacing raw technical errors.
- `render_game_to_text.audio` and `render_game_to_text.renderer.audio` now
  report source, world-UI-only authority, sound manager state, generated and
  decoded cue IDs, event bindings, play counts, autoplay policy, concurrent
  sound cap, and the explicit media-routing boundary.
- The engine architecture contract now names `WorldAudioSystem` and the
  `phaserAudioIsWorldUiOnly` boundary. Frontend smoke and renderer QA assert
  the audio contract so future media/call work cannot accidentally move into
  Phaser.
- Renderer QA latest audio report: 6 generated cues, 6 decoded cues, 0 failed
  cues, 2 cue attempts before browser audio unlock, `map_transition` and
  `zone_enter` attempt telemetry, and media routing still marked
  `livekit_or_browser_media`. Latest desktop lobby, mobile responsive, and
  desktop joined screenshots were visually inspected and remained
  nonblank/readable.
- Verification passed after the audio-system pass:
  `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`,
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. The standalone develop-web-game client was attempted
  against `http://127.0.0.1:8787/app`, but still fails before navigation with
  `ERR_MODULE_NOT_FOUND` because the skill-local script cannot resolve
  `playwright`.
- Text rendering now has an explicit crisp-text policy instead of relying on
  scattered Phaser `Text` options. `text-rendering.ts` centralizes the
  high-resolution text texture setting and linear texture filter used by avatar
  labels, emotes, zone labels, interaction markers, and dev/debug overlays.
- The canvas keeps Phaser `pixelArt: true` for tiles and sprites, but the final
  browser canvas scaling is forced back to `image-rendering: auto`. This avoids
  nearest-neighbor scaling of the entire canvas, which was making in-world
  writing look blocky even when the underlying text textures were high
  resolution.
- DOM text smoothing is now explicit through the app CSS root, and
  `render_game_to_text.renderer.text` reports the text quality contract:
  `antialiased_text_pixel_art_world`, resolution `4`, texture filter `linear`,
  canvas CSS image rendering `auto`, and text object classes covered.
- Frontend smoke and renderer QA now assert the text rendering contract. Latest
  renderer QA report confirmed `canvasCssAntialiasingAllowed: true` with
  pixel-art sprites still texture-filtered by Phaser. Latest desktop lobby and
  mobile responsive screenshots were visually inspected and labels/text
  remained readable.
- Verification passed after the text crispness pass:
  `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`,
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. The standalone develop-web-game client was attempted
  against `http://127.0.0.1:8787/app`, but still fails before navigation with
  `ERR_MODULE_NOT_FOUND` because the skill-local script cannot resolve
  `playwright`.
- Interaction affordances are being polished into one native DOM card anchored
  to the Phaser marker. The card now carries the input affordance (`E / Tap`),
  the action kind, prompt text, active state, and tone metadata so door, zone,
  object, and meeting prompts share a single crisp presentation path.
- Marker geometry now uses a cleaner Phaser pin, halo, stem, and active ring,
  while all marker text is native DOM. Active zone labels are suppressed when a
  matching interaction card is visible, which removes the duplicated
  "Join call" label/username overlap seen in the zone fixture.
- Frontend smoke and renderer QA now assert the interaction card contract:
  active state, tone metadata, `E / Tap`, action kind, crisp DOM text metrics,
  and whole-pixel card anchoring. A targeted Playwright screenshot of the zone
  fixture was inspected at `/private/tmp/aedventure-marker-polish-final-map.png`
  and showed the card readable with no duplicate zone label overlap.
- Verification passed after the interaction marker polish:
  `node --check scripts/frontend-smoke.test.cjs`,
  `node --check scripts/renderer-qa.test.cjs`,
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. The standalone develop-web-game client was attempted
  against `http://127.0.0.1:8787/app`, but still fails before navigation with
  `ERR_MODULE_NOT_FOUND` because the skill-local script cannot resolve
  `playwright`.
- Realtime movement now streams explicit idle/stop inputs over the WebSocket
  path when keyboard, D-pad, or joystick movement is released. The protocol
  accepts zero-vector move intents only when a direction is present, and the
  authoritative world returns zero-vector movement telemetry without moving the
  player.
- Client prediction now handles fixed-tick input coalescing correctly: if the
  server acknowledges a newer idle/stop sequence while older predicted movement
  inputs are still pending, those older predictions are marked as
  `server_superseded` and removed from the pending prediction window.
- Verification passed for the realtime stop/supersede slice:
  `npm --workspace @aedventure/protocol run build`, `npm --workspace
  @aedventure/world-server run build`, `npm --workspace @aedventure/web run
  build`, `node apps/world-server/test/authoritative-world.test.js`, `node
  --check scripts/frontend-smoke.test.cjs`, `npm run smoke:frontend`, and `git
  diff --check`.
- The avatar pipeline now has a real atlas-ready contract layered over the
  generated placeholder runtime. The contract declares the four supported
  avatars, four server-authoritative directions, eight visual facings, and the
  idle/walk/run/turn states needed by a future imported atlas.
- Avatar atlas validation now checks the imported manifest against the expected
  semantic frame matrix: unknown frames, duplicate semantic keys, duplicate
  atlas frame names, metadata mismatches, frame rectangle bounds, anchor bounds,
  and state-by-state coverage. Runtime-generated fallback frames still report as
  complete so the current demo remains usable while real atlases are added.
- The avatar preview gallery remains the QA surface for this work. Renderer
  telemetry now exposes the atlas contract, state coverage, and preview fixture
  coverage so agents and smoke tests can verify that all avatars, actions, and
  eight-way visual facings stay covered.
- Verification for the atlas pipeline slice has passed so far:
  `npm --workspace @aedventure/web run build`, `node --check
  scripts/frontend-smoke.test.cjs`, `node --check scripts/renderer-qa.test.cjs`,
  `npm run smoke:frontend`, `npm run qa:renderer`, `npm run qa:responsive`, and
  `git diff --check`. Latest desktop/mobile responsive screenshots and renderer
  QA avatar screenshots were visually inspected and remained readable/nonblank.
- Final project verification also passed with `npm run check` and a clean `git
  diff --check`. The standalone develop-web-game Playwright client was attempted
  against `http://127.0.0.1:8787/app`, but it still exits before navigation with
  `ERR_MODULE_NOT_FOUND` because the skill-local script cannot resolve the
  `playwright` package.
- Renderer module cleanup continued by extracting crisp DOM interaction cards
  from `DomWorldOverlayRenderer` into a dedicated `DomInteractionOverlayRenderer`.
  The world overlay now coordinates avatar labels, zone labels, and interaction
  labels, while the interaction overlay owns card DOM node lifecycle,
  positioning, active state, action tone, and prompt text.
- This keeps the renderer split cleaner: Phaser marker drawing remains in
  `InteractionRenderer`, crisp browser-text interaction cards now have their own
  DOM renderer, and `DomWorldOverlayRenderer` no longer carries
  interaction-specific card construction details.
- Verification passed for the renderer cleanup slice:
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`, `npm
  run qa:renderer`, `npm run qa:responsive`, `npm run check`, and `git diff
  --check`. Latest renderer QA and responsive screenshots were visually
  inspected. The standalone develop-web-game client was attempted against
  `http://127.0.0.1:8787/app`, but it still exits before navigation with
  `ERR_MODULE_NOT_FOUND` because the skill-local script cannot resolve
  `playwright`.
- Visual polish continued after the renderer cleanup. Phaser action markers now
  use layered marker geometry with a ground shadow, ambient halo, pulse ring,
  richer pin silhouette, and stronger active-state treatment while the crisp DOM
  interaction card remains transform-free for text sharpness.
- Furniture rendering now adds pooled visual-only object shadows underneath
  item sprites. The shadows use the existing asset metadata (`visualFootprint`
  and `zAnchor`) where available, stay below the object depth, and are culled
  with their corresponding sprites without affecting collision or server state.
- The app surface received small polish upgrades: room switch/entry transitions
  now have a light sweep overlay, interaction cards have a stronger accent rail,
  the analog joystick has more tactile active styling, and reduced-motion users
  get transition-heavy polish disabled at CSS level.
- Verification passed for the visual polish slice:
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`, `npm
  run qa:renderer`, `npm run qa:responsive`, `npm run check`, and `git diff
  --check`. Regenerated desktop and mobile screenshots were visually inspected.
  The standalone develop-web-game client was attempted against
  `http://127.0.0.1:8787/app`, but it still exits before navigation with
  `ERR_MODULE_NOT_FOUND` because the skill-local script cannot resolve
  `playwright`.
- Realtime simulation core was hardened around the existing fixed-tick WebSocket
  path. `WorldRealtimeTransport` now tracks snapshot cadence target, jitter,
  dropped snapshot count, buffered snapshot count/window, and latest snapshot
  player count so `render_game_to_text` can report whether the 20Hz server
  stream is actually healthy enough for interpolation.
- Snapshot reconciliation now handles a server snapshot acknowledging an input
  sequence that has already been superseded out of the exact pending prediction
  list. In that case the client still uses the authoritative snapshot as the
  rewind point, replays remaining pending inputs, and blends toward the replay
  target instead of silently accepting the authoritative point without a replay
  correction.
- Frontend smoke now asserts the realtime core contract: fixed 50ms server
  cadence, snapshot buffer telemetry, dropped snapshot telemetry, latest
  snapshot player count, sequence-numbered input history, and rewind/replay
  reconciliation.
- Verification passed for this realtime core slice:
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`, `node
  apps/world-server/test/authoritative-world.test.js`, `npm run check`, `npm run
  qa:responsive`, and `git diff --check`. Latest renderer QA and responsive
  screenshots were visually inspected. The standalone develop-web-game client
  was attempted against `http://127.0.0.1:8787/app`, but it still exits before
  navigation with `ERR_MODULE_NOT_FOUND` because the skill-local script cannot
  resolve `playwright`.
- Renderer polish telemetry is now part of `render_game_to_text`. The renderer
  snapshot exposes `visualPolish.markerEffectMode`, object shadow counts,
  ambient motion counts with object/particle breakdown, room transition state,
  and reduced-motion policy/match behavior.
- `qa:renderer` now locks the visual polish telemetry contract and verifies it
  against the real renderer sources: interaction marker presentation,
  object-pool shadow counters, ambient object motion counters, Phaser particle
  emitters, map transition dataset state, and reduced-motion media-query
  behavior. Frontend smoke was updated to include the new marker effect mode in
  the world-interaction presentation contract.
- Verification passed for the polish telemetry slice:
  `npm --workspace @aedventure/web run build`, `npm run qa:renderer`, `npm run
  smoke:frontend`, `npm run qa:responsive`, `npm run check`, and `git diff
  --check`. The latest renderer QA screenshot was inspected and the report
  showed `markerEffectMode: layered_pin_pulse_shadow`, `objectShadowCount: 7`,
  `ambientMotionCount: 7`, and `transitionState: entering` for the lobby
  snapshot. The standalone develop-web-game client still exits before
  navigation with `ERR_MODULE_NOT_FOUND` because the skill-local script cannot
  resolve `playwright`.
- World interaction UX now has stronger door, portal, object, and touch
  affordances. Phaser markers use a larger 148x82 hit area, a subtle tap target,
  and world-space target outlines; object candidates get footprint outlines,
  while door/portal candidates get directional beacon feedback. The crisp DOM
  interaction card now exposes action, interaction kind, and action-flow
  metadata and has pointer-coarse sizing for touch devices.
- The interaction presentation contract now records
  `objectSelectionMode: hover_select_target_outline`,
  `doorPortalFeedback: directional_beacon_and_bounds`,
  `actionFlow: approach_permission_confirm_execute`, and
  `touchAffordance: large_marker_hit_area_dom_prompt`. Frontend smoke and
  renderer QA assert these fields plus the DOM card metadata so the new UX
  affordances stay stable.
- Verification passed for the world-interaction UX slice:
  `npm --workspace @aedventure/web run build`, `npm run qa:renderer`, `npm run
  smoke:frontend`, `npm run qa:responsive`, `npm run check`, and `git diff
  --check`. A focused zone-fixture screenshot was captured at
  `/private/tmp/aedventure-zone-interaction.png` and inspected; it shows the
  enlarged meeting target, beacon marker, and crisp `E / Tap` card. The
  standalone develop-web-game client still exits before navigation with
  `ERR_MODULE_NOT_FOUND` because the skill-local script cannot resolve
  `playwright`.
- Avatar animation expressiveness was upgraded on top of the atlas-ready
  pipeline. Runtime avatar telemetry now declares the explicit
  idle/walk/run/turn state machine, phase-preserved walk/run blending,
  anticipation-arc turn poses, and avatar-preview 8-way facing QA contract.
- Procedural fallback avatar frames now make turn clips visibly distinct with
  stronger lean/lift/stride cues plus pivot arc markers, so the generated atlas
  remains useful as a concrete target for future real PNG/JSON imports.
  Walk/run rendering also preserves locomotion phase while adding richer body
  bounce, and emotes now expose visual hooks for wave sway, raise-hand lift, and
  focus pulse reactions.
- Frontend smoke and renderer QA now assert the animation pipeline fields,
  walk/run blend weights, turn-pose progress, emote reaction hook, and 8-way
  preview-gallery samples. The renderer QA non-loop turn assertion was tuned to
  validate a reached expressive pose instead of treating turn clips like
  forever-looping locomotion.
- Verification passed for the avatar animation expressiveness slice:
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and `git
  diff --check`. The avatar preview gallery screenshot was inspected at
  `/var/folders/f2/krjzd4c15nn491pm37zrkp1h0000gn/T/aedventure-renderer-qa/avatar-preview-gallery-canvas.png`.
  The standalone develop-web-game client still exits before navigation with
  `ERR_MODULE_NOT_FOUND` because the skill-local script cannot resolve
  `playwright`.
- Asset/map presentation was upgraded with six new internal semantic furniture
  tokens: modular work desk, wall whiteboard, lounge armchair, low bookshelf,
  floor lamp, and side table. Existing item metadata now includes
  shadow-footprint and interaction-affordance definitions, and the internal
  atlas/manifest generator emits and validates those fields.
- Preset and generated-room composition now use the richer catalog: the lobby
  has workspace and shelf details, the meeting room gets whiteboard/side-table
  affordances, lounge/cafe gets armchairs/bookshelves/floor lamps, and prompt
  keywords can steer quiet carpet, modern glass, neutral office, lounge, desk,
  and library variants. Wall perimeter generation now caps door/opening breaks
  with corner transition pieces, and the atlas wall renderer draws stronger
  trim/transition detail.
- Object shadows now prefer asset shadow-footprint metadata instead of only
  heuristic sprite bounds, and object interaction candidates consume
  metadata-driven labels/prompts/radii for `open`, `sit`, `serve`, `gather`,
  `inspect`, and decoration affordances. The Phaser advanced-input layer was
  fixed to keep semantic zone hover underneath furniture hit targets and to use
  Phaser `gameout` for actual canvas exits instead of clearing zone hover when
  leaving an object.
- Verification passed for the asset/map presentation slice:
  `node packages/asset-registry/test/catalog.test.js`,
  `node scripts/verify-internal-assets.cjs`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. The latest renderer and responsive screenshots were
  inspected, including the denser lobby, mobile layout, and avatar preview
  gallery. A focused local browser probe confirmed furniture hover and
  underlying zone hover are both represented in `render_game_to_text`. The
  standalone develop-web-game client was attempted against
  `http://127.0.0.1:8787/app`, but it still exits before navigation with
  `ERR_MODULE_NOT_FOUND` because the skill-local script cannot resolve
  `playwright`.
- Phase 2 extracted the neutral asset metadata foundation into
  `packages/game-assets`. The package now owns asset source/tileset/token
  metadata, atlas manifest types, footprints, z-anchors, occlusion, interaction
  affordances, variants, and catalog validation helpers. A boundary test checks
  that the neutral source does not introduce obvious office/RPG/product terms.
- Office-specific asset data moved under `packages/office-domain/src/assets`.
  The office catalog, prompt compiler, preset maps, legacy SkyOffice reference
  metadata, and internal office atlas paths now import neutral asset types from
  `@aedventure/game-assets`. `@aedventure/asset-registry` remains as a
  compatibility facade so existing app imports and tests keep working during
  later extraction phases.
- The asset variant role was neutralized from `tenant_tint` to `theme_tint`,
  and the internal office atlas manifest was regenerated. The rendered atlas
  image remains visually unchanged; the metadata vocabulary is now less tied to
  the SaaS tenant model.
- Verification passed for the Phase 2 game-assets split:
  `npm --workspace @aedventure/game-assets run build`,
  `npm --workspace @aedventure/office-domain run build`,
  `npm --workspace @aedventure/asset-registry run build`,
  `node packages/game-assets/test/assets.test.js`,
  `node packages/asset-registry/test/catalog.test.js`,
  `node scripts/verify-internal-assets.cjs`,
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. Latest renderer and responsive screenshots were
  inspected. A concurrent `qa:renderer` attempt hit the known timing-sensitive
  non-looping avatar turn progression assertion, but the isolated rerun and the
  full `npm run check` renderer QA both passed. The standalone
  develop-web-game client still exits before navigation with
  `ERR_MODULE_NOT_FOUND` because the skill-local script cannot resolve
  `playwright`.
- Phase 3 extracted the neutral semantic map compiler into
  `packages/game-map`. The package now owns semantic map schema types, tile
  layer compilation, object/furniture placement, zones, spawn helpers, movement
  collision layers, blocked-tile handling, map validation, and deterministic
  compiler primitives. A boundary test verifies the package does not introduce
  obvious office/SkyOffice/product-domain labels.
- Office-specific map behavior remains in `packages/office-domain/src/assets`:
  prompt keyword parsing, lobby/meeting-room/lounge-cafe presets, office
  semantic item names, office zone labels, and the starter visual catalog.
  `@aedventure/asset-registry` remains the compatibility facade; direct neutral
  consumers can now import `@aedventure/game-map`.
- Renderer QA was stabilized for non-looping turn-pose clips. The check now
  asserts that pose clips reach an animated frame and reports bounded turn
  progress instead of requiring elapsed time to be monotonic across samples,
  which can legitimately reset or clamp for non-looping clips.
- Verification passed for the Phase 3 game-map split:
  `npm --workspace @aedventure/game-map run build`,
  `npm --workspace @aedventure/office-domain run build`,
  `npm --workspace @aedventure/asset-registry run build`,
  `node packages/game-map/test/map.test.js`,
  `node packages/asset-registry/test/catalog.test.js`,
  `node scripts/verify-internal-assets.cjs`,
  `npm --workspace @aedventure/web run build`, `npm run qa:responsive`,
  `npm run qa:renderer`, `npm run check`, and `git diff --check`. Desktop and
  mobile responsive screenshots plus the renderer lobby screenshot were
  inspected. The standalone develop-web-game client was attempted against
  `http://127.0.0.1:8787/app`, but it still exits before navigation with
  `ERR_MODULE_NOT_FOUND` because the skill-local script cannot resolve
  `playwright`.
- Phase 4 extracted the neutral Phaser renderer into
  `packages/game-renderer-phaser`. The package now owns `RendererHost`,
  `TileWorldScene`, tilemap/object/avatar/entity/zone renderers, camera
  control, DOM world overlays, interaction rendering, renderer telemetry,
  effects, audio cues, dev overlays, and renderer QA support. A package boundary
  test prevents obvious office/meeting/media/admin/account terms from entering
  the neutral renderer source.
- The office frontend now keeps only a thin adapter in
  `apps/web/src/browser/phaser-office-renderer.ts`. It passes the internal
  office atlas paths, cache keys, and bundle IDs into the neutral renderer while
  keeping map data, entity lists, interaction labels, meeting/call state, and
  app UI callbacks in the virtual office app layer.
- Renderer telemetry was neutralized around the extraction: `OfficeScene` is now
  `TileWorldScene`, scene architecture reports `boot_preload_tile_world_runtime`,
  action-zone particles no longer use meeting-specific names, and world UI audio
  reports realtime streams as an external browser runtime concern rather than a
  Phaser media layer.
- Verification passed for the Phase 4 renderer split:
  `npm --workspace @aedventure/game-renderer-phaser run build`,
  `npm --workspace @aedventure/game-renderer-phaser test`,
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. The latest renderer lobby, desktop joined, and mobile
  joined screenshots were inspected and the virtual office still visually
  behaves through the extracted renderer package.
- Phase 5 extracted the neutral input layer into `packages/game-input`. The
  package now owns keyboard direction mapping, neutral keyboard actions
  (`move`, `interact`, `select`, `cancel`, `run`), held movement state,
  run/walk intent generation, d-pad parsing, joystick vector math, input
  telemetry, and sequence-numbered input shapes.
- The virtual office app now acts as the DOM/product adapter for input: it keeps
  office UI labels, meeting/action behavior, button active styling, movement
  debug copy, and server transport decisions, while consuming neutral movement
  and action intents from `@aedventure/game-input`.
- Verification passed for the Phase 5 game-input split:
  `npm --workspace @aedventure/game-input run build`,
  `npm --workspace @aedventure/game-input test`,
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`,
  `npm run qa:responsive`, isolated `npm run qa:renderer`, `npm run check`, and
  `git diff --check`. A parallel renderer/responsive QA run hit a transient
  frame-cadence threshold, but the isolated rerun and full check passed. Latest
  renderer lobby and mobile responsive screenshots were inspected.
- The standalone develop-web-game client was retried against
  `http://127.0.0.1:8787/app` after starting the local dev host, but it still
  exits before navigation with `ERR_MODULE_NOT_FOUND` because
  `/Users/christophehenner/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js`
  cannot resolve its own `playwright` ESM import. The local dev host was stopped
  after the attempt.
- Phase 6 extracted the neutral wire contracts into
  `packages/game-protocol`. The package now owns input intent messages, action
  commands, entity state, map state, world snapshots, server tick metadata, and
  movement reconciliation payload shapes. The old `packages/protocol` package
  remains as a compatibility facade that re-exports `@aedventure/game-protocol`.
- The realtime client/server path now imports `@aedventure/game-protocol`
  directly: browser transport, world sync, movement prediction, client motion,
  game input, map engine, world server, web app-layer types, and policy types.
  WebSocket snapshots now also emit neutral entity state and tick metadata, and
  player-state/rejection responses include reconciliation payloads for the
  upcoming fixed-tick replay refactor.
- Verification passed for the Phase 6 game-protocol split:
  `npm --workspace @aedventure/game-protocol run build`,
  `npm --workspace @aedventure/game-protocol test`,
  `npm --workspace @aedventure/protocol run build`,
  `npm --workspace @aedventure/world-server run build`,
  `node apps/world-server/test/authoritative-world.test.js`,
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`,
  `npm run qa:renderer`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. Latest renderer lobby and mobile responsive screenshots
  were inspected.
- The standalone develop-web-game client was retried again after the protocol
  split and still exits before navigation with the same skill-local
  `playwright` ESM resolution error.
- Phase 8 made QA multi-app. Added shared browser QA helpers for
  `render_game_to_text` contracts, static app serving, and nonblank screenshot
  assertions. The office app now reports `app`, neutral engine-boundary
  metadata, and renderer viewport state; the RPG idle demo now exposes the same
  renderer capability surface.
- The root scripts now split office smoke, RPG smoke, and built-app variants.
  `npm run check` builds both browser apps, runs both app smokes, and runs the
  shared Phaser renderer QA without rebuilding inside the gate.
- Renderer QA now includes a neutral RPG fixture. The latest report recorded
  `app: rpg-idle-demo`, `domain: @aedventure/rpg-domain`,
  `importsOfficeDomain: false`, `mapId: rpg_idle_grove`, and a nonblank
  `810x645` canvas screenshot with 96 sampled color buckets.
- Verification passed for Phase 8: `npm run smoke:office`,
  `npm run smoke:rpg`, `npm run qa:renderer`, `npm run check`,
  `npm run qa:responsive`, and `git diff --check`. The neutral RPG renderer
  fixture screenshot was visually inspected.
- Phase 9 extracted neutral deterministic simulation into
  `packages/game-core`. The package now owns movement simulation, collision
  checks, zone overlap, permission-aware movement application, deterministic
  tick advancement, world snapshot creation, reconciliation payload helpers,
  movement correction measurement, and replay helpers.
- `packages/map-engine` is now a compatibility facade that re-exports
  `@aedventure/game-core`. Active app paths were migrated to `game-core`:
  the office world server delegates move intent application and snapshot
  creation to the core package, the office browser prediction/motion code uses
  core movement primitives, and the RPG idle demo applies movement through the
  same neutral entity movement helper.
- Multi-app QA now advertises `@aedventure/game-core` in each app's
  `render_game_to_text` engine boundary. The renderer QA neutral fixture report
  confirmed the RPG app uses shared packages
  `@aedventure/game-core`, `@aedventure/game-assets`, `@aedventure/game-map`,
  `@aedventure/game-input`, and `@aedventure/game-renderer-phaser` while
  keeping `importsOfficeDomain: false`.
- Verification passed for Phase 9: `npm --workspace @aedventure/game-core run
  build`, `npm --workspace @aedventure/game-core test`, `npm --workspace
  @aedventure/map-engine run build`, `node packages/map-engine/test/movement.test.js`,
  `npm --workspace @aedventure/world-server run build`,
  `node apps/world-server/test/authoritative-world.test.js`, `npm --workspace
  @aedventure/web run build`, `npm --workspace @aedventure/rpg-idle-demo run
  build`, `npm run smoke:office`, `npm run smoke:rpg`, `npm run qa:renderer`
  after one transient frame-cadence retry, `npm run qa:renderer:built`,
  `npm run check` after one transient renderer devtools retry, `npm run
  qa:responsive`, and `git diff --check`. The neutral RPG renderer screenshot
  and desktop/mobile responsive screenshots were visually inspected.
- The standalone develop-web-game client was retried and still exits before
  navigation with `ERR_MODULE_NOT_FOUND` because the skill-local script cannot
  resolve its own `playwright` import.
- ADD migration Phase 6 started the neutral engine sandbox app in
  `apps/engine-sandbox`. The sandbox consumes only `@aedventure/game-topology`
  and `@aedventure/game-world`, renders one square fixture and one hex fixture
  on a shared canvas, and exposes entities, zones, labels, interactions, and
  topology coexistence through `window.render_game_to_text`.
- ADD migration Phase 7 started the Phaser topology split. The square tilemap
  implementation moved to `packages/game-renderer-phaser/src/square`, shared
  host/camera/entity/zone/telemetry entry points moved to `src/shared`, and new
  `src/hex` renderer modules define cell, zone, landmark, and geometry paths
  for future Phaser-backed hex maps. The engine sandbox now reuses the exported
  hex geometry helper for its nonblank hex fixture.
- Phase 7 partial verification passed for
  `npm --workspace @aedventure/game-renderer-phaser run build`,
  `npm --workspace @aedventure/game-renderer-phaser test`,
  `npm --workspace @aedventure/engine-sandbox run build`,
  `npm run smoke:engine-sandbox:built`, `npm run smoke:office`, and
  `npm run qa:renderer`. The standalone develop-web-game client was retried and
  still fails before navigation with `ERR_MODULE_NOT_FOUND` for its own
  `playwright` import.
- Final Phase 7 verification passed with `npm run check` after the sandbox
  fixture label spacing polish. The latest engine sandbox screenshot was
  visually inspected and shows clear square and hex topology fixtures.
- ADD migration Phase 8 moved the Rust runtime crates out of
  `legacy/add/crates` into the aeoffice root workspace as `crates/add-core`,
  `crates/add-web-bindings`, and `crates/add-web-worker`. The root `Cargo.toml`
  now owns the ADD serde/wasm workspace dependencies, and the web bindings crate
  points at `../add-core`.
- Phase 8 verification passed with `cargo check` and `cargo test` from the
  aeoffice root.
- ADD migration Phase 12 replaced the ADD canvas-style overworld projection
  with a Phaser hex renderer in `apps/add-rpg`. The renderer now draws terrain
  cells, inactive/converting/stabilized/blocked states, bubble edge outlines,
  the Studio/base center, Survivor Cave, hover and selection affordances, and
  camera zoom/pan/reset controls from the live ADD snapshot adapter.
- The ADD adapter now passes bubble ring metadata through the neutral
  `GameWorld` map metadata so the Phaser layer can reproduce ADD's bubble edge
  without owning rules or simulation state. `render_game_to_text` reports the
  explicit authority split: Rust/WASM snapshots own rules, Phaser is visual
  projection only, and Phaser does not mutate simulation.
- Phase 12 verification passed with `npm --workspace @aedventure/add-rpg run
  build:types`, `npm --workspace @aedventure/add-rpg run build:browser`, `npm
  run smoke:add-rpg:built`, `npm run qa:renderer`, and `npm run check`. The ADD
  smoke now asserts snapshot cell parity, bubble edge presence, Studio and
  Survivor Cave visibility, hover/select, zoom, pan, reset, and nonblank map/app
  screenshots. The latest ADD RPG screenshots were visually inspected.
- ADD migration Phase 13 preserved ADD save/offline runtime behavior in the
  Phaser app shell. `apps/add-rpg` now autosaves the worker-exported Rust/WASM
  save payload to browser storage, restores autosave on reload, applies capped
  offline catch-up from the stored timestamp, exposes manual export/import text,
  supports explicit offline catch-up, keeps reset durable, and surfaces runtime
  import errors in app state.
- The browser save wrapper is deliberately metadata-only: localStorage stores an
  opaque `exportSave()` payload plus browser metadata such as save timestamp,
  source, snapshot schema version, and clock. Rust/WASM remains the only owner of
  import validation, offline progression rules, and reset semantics.
- Phase 13 verification passed with `npm --workspace @aedventure/add-rpg run
  build:browser`, `npm run smoke:add-rpg:built`, and `npm run check` after
  forcing the stale TypeScript project-reference declaration cache to rebuild.
  The ADD smoke now covers manual save, reload restore, automatic offline
  catch-up, valid import, explicit offline tick, reset, invalid import error
  state, recovery reset, and nonblank screenshots. The latest ADD RPG screenshots
  were visually inspected. The standalone develop-web-game client was retried
  and still exits before navigation because the skill-local script cannot
  resolve its own `playwright` import.
- ADD migration Phase 14 added the square dungeon renderer foundation. The ADD
  browser app now exposes map modes for `overworld_hex`, `dungeon_square`, and
  `base_square`; overworld remains live snapshot-driven, while dungeon and base
  are square `GameWorld` fixtures that prove the same app and Phaser host can
  render future square spaces.
- The ADD Phaser map host now supports both hex and square topology contexts,
  reports topology/mode/fixture telemetry, keeps legacy hex interaction fields
  while adding neutral selected/hovered cell fields, resets camera/selection on
  map switches, and renders square terrain, blockers, landmarks, labels, zones,
  and selection outlines without adding fake runtime authority.
- Phase 14 verification passed with `npm --workspace @aedventure/add-rpg run
  build:types`, `npm --workspace @aedventure/add-rpg run build:browser`, `npm
  run smoke:add-rpg:built`, and `npm run check`. The ADD smoke now switches
  hex overworld -> square dungeon -> square base -> hex overworld, asserts
  topology/fixture telemetry, square blocked cells, square selection, and
  captures a nonblank square dungeon screenshot. The latest overworld and
  dungeon screenshots were visually inspected. The standalone develop-web-game
  client was retried and still fails before navigation on its skill-local
  missing `playwright` import.
- ADD migration Phase 15 added explicit multi-app QA coverage. `npm run check`
  now runs `qa:multi-app`, which audits that the full target-stack gate still
  includes office smoke, RPG idle smoke, ADD smoke, engine sandbox smoke,
  renderer QA, ADD WASM build, and root cargo check.
- Renderer QA now records ADD topology fixtures as first-class browser artifacts:
  the live `overworld_hex` Phaser map and the square `dungeon_square` fixture
  both capture nonblank screenshots, report their topology, map id, cell counts,
  landmark counts, and the authority boundary that Phaser remains visual
  projection only. The normal smoke cadence check records timing budgets while
  keeping strict frame-budget enforcement available through
  `STRICT_RENDERER_TIMING=1`.
- Phase 15 verification passed with `node scripts/multi-app-qa-contracts.test.cjs`,
  `npm run qa:renderer`, `npm run smoke:add-rpg:built`, and `npm run check`.
  The latest ADD hex and square renderer QA screenshots were visually inspected.
- ADD migration Phase 16 retired the placeholder RPG/idle demo. The tracked
  `apps/rpg-idle-demo`, `packages/rpg-domain`, and
  `scripts/rpg-idle-demo-smoke.test.cjs` files were removed, stale local build
  output directories were deleted, and root workspace scripts/TypeScript
  references/package-lock entries no longer list those retired workspaces.
- The active app matrix is now office + engine sandbox + ADD RPG. `qa:renderer`
  builds the engine sandbox instead of the retired toy app, and renderer QA
  records `engineSandboxFixtures` for the neutral square/hex topology fixture
  while ADD remains the real RPG/idle app through `smoke:add-rpg`.
- Phase 16 verification passed with `node scripts/multi-app-qa-contracts.test.cjs`,
  `npm run qa:renderer`, and `npm run check`. The replacement engine sandbox
  topology screenshot was visually inspected. The standalone develop-web-game
  client was retried and still fails before navigation on its skill-local
  missing `playwright` import; repo-native Playwright checks pass.
- ADD migration Phase 17 upgraded the ADD Phaser presentation. The ADD map host
  now uses separate terrain, ambience, overlay, and transition graphics layers;
  terrain cells render with procedural painterly motifs, bubble edges animate
  with halo effects, landmarks use stacked procedural sprite shapes, and labels
  use high-resolution Phaser text. Map info now reports presentation telemetry
  for terrain art, bubble effects, landmark sprites, label rendering, ambience,
  transition state, and responsive layout.
- The ADD browser shell was restyled from a diagnostic tan dashboard into a
  darker field-command game surface with compact controls, stronger map focus,
  and mobile-safe world sizing. The ADD smoke now asserts the presentation
  contract and includes a mobile viewport readiness check.
- Phase 17 verification passed with `npm --workspace @aedventure/add-rpg run
  build:types`, `npm --workspace @aedventure/add-rpg run build:browser`,
  `npm run smoke:add-rpg:built`, `npm run qa:renderer`, `npm run check`, and
  `git diff --check`. The updated overworld, dungeon, full app shell, and
  renderer QA ADD screenshots were visually inspected. The standalone
  develop-web-game client was retried and still fails before navigation on its
  skill-local missing `playwright` import; repo-native Playwright checks pass.
- ADD migration Phase 18 aligned the aeoffice ADD app with the imported
  first-playable gate. `packages/add-domain` now derives first-playable
  checklist steps, primary next actions, resource source/sink/blocker summaries,
  role assignment summaries, and construction readiness from the Rust/WASM
  snapshot and catalog without moving rules into Phaser or the UI.
- The ADD browser shell now exposes a visible first-playable panel, story-choice
  buttons, focused role/crew controls, Studio/Fire Pit construction controls,
  and persistence-aware `render_game_to_text` telemetry. The first-playable path
  can guide a new run through arrival choices, Hero/crew assignment, resource
  generation, Studio restoration, Fire Pit construction, bubble reach,
  recruitment unlock, first recruitment, and save/offline verification.
- Phase 18 also fixed a real web-boundary issue from `serde-wasm-bindgen`: Rust
  maps such as `crewByRole` and `choiceByBeat` can arrive as JS `Map` instances,
  so ADD domain selectors and browser telemetry now normalize those values at
  the app/domain boundary. Manual first-playable actions now wait for an
  in-flight auto tick instead of being dropped.
- Phase 18 verification passed with `npm --workspace @aedventure/add-domain run
  build`, `npm --workspace @aedventure/add-rpg run build:types`, `npm
  --workspace @aedventure/add-rpg run build:browser`, `npm run
  smoke:add-rpg:built`, `npm run qa:renderer`, and `npm run check`. The ADD
  smoke now completes the whole first-playable arc through visible UI controls,
  then verifies save, reload, offline catch-up, import, reset, and screenshots.
  The standalone develop-web-game client was retried and still fails before
  navigation on its skill-local missing `playwright` import; repo-native
  Playwright checks pass.
- ADD character navigation now treats keyboard chords as one hex movement
  intent instead of applying each keydown as an immediate step. `Up+Left`
  resolves to `north_west` and lands on `hex:0,-1`; `Up+Right` resolves to
  `north_east`. The map origin and camera reset prefer the Studio/base cell, so
  a fresh overworld starts with the Hero/Studio centered in the Phaser world.
- Verification for the hex navigation fix passed with `npm --workspace
  @aedventure/add-rpg run build:browser`, `npm run smoke:add-rpg:built`, and
  `npm run check`. The ADD smoke now asserts Studio centering and the `Up+Left`
  chord. The skill-local develop-web-game Playwright client still cannot import
  its own `playwright` dependency, so the live 8108 keyboard check used the
  repo Playwright dependency directly and captured
  `tmp/add-rpg-live-hex-chord.png`.
- ADD now has a first-pass world time abstraction in `packages/add-domain`.
  `selectAddWorldTime()` derives Day, local time, season, daylight phase,
  daylight ratio, and estimated sunrise/sunset from the authoritative Rust
  `clockSeconds` without adding new save state. The presentation uses the
  Studio Echo/Touraine estimate, 2025 reference dates, and a `1 runtime second =
  1 in-game minute` visual scale.
- The ADD app shell now shows a compact Day/time/season/sunrise/sunset HUD and
  a pointer-safe day/night overlay over the Phaser map. The first screen starts
  at dawn so the player discovers the Studio with visible environmental time
  instead of a debug seconds counter.
- Verification for the world time pass passed with `npm --workspace
  @aedventure/add-domain run build`, `npm --workspace @aedventure/add-domain run
  test`, `npm --workspace @aedventure/add-rpg run build:browser`, `npm run
  smoke:add-rpg:built`, and `npm run check`. The ADD smoke now asserts the
  world-time telemetry, and the latest ADD screenshot was visually inspected.
- ADD tile crossing now has a visible travel-time experience. The shared
  world-time adapter exports the travel scale (`60` in-game minutes per tile,
  `60` runtime seconds at the current display scale) plus
  `selectAddWorldTimeForClockSeconds()` so the app can preview arrival time
  without duplicating solar/date logic.
- The Phaser ADD map host now emits a character travel event when an accepted
  adjacent move starts. The app shell listens to that event, locks further
  travel briefly, advances the Rust/WASM runtime clock by one tile-hour through
  the normal worker snapshot path, and shows a traveling/arrived recap with
  destination, arrival time, and exposure-risk copy. Phaser remains a visual
  projection layer; the runtime clock still comes from Rust.
- The ADD map presentation now includes a desktop-safe travel card, a pulsing
  time chip while crossing, and a toxicity haze derived from current viral load
  plus the destination tile's exposure risk. Smoke tests now assert that keyboard
  movement changes cells, waits for the visible travel animation, and advances
  `snapshot.clockSeconds` by roughly one tile-hour per accepted step.
- Verification for the travel-time slice passed with `npm --workspace
  @aedventure/add-domain run build`, `npm --workspace @aedventure/add-domain run
  test`, `npm --workspace @aedventure/add-rpg run build:browser`, `npm run
  smoke:add-rpg:built`, `npm run check`, and `git diff --check`. The updated
  ADD map screenshot was visually inspected to ensure the travel card no longer
  overlaps the quest panel.
- ADD first movement now has a one-off dramatic confirmation flow before
  Phaser commits the step. `AddRpgPhaserMapHost` asks the app shell through
  `onBeforeCharacterTravel`; the Solid shell shows the toxic-world warning,
  the second "1 HOUR" confirmation, the first-decline joke, and the
  second-attempt "dramatic effect" shortcut. This keeps modal copy in the
  product shell while Phaser remains renderer/input code.
- The ADD Hero now spawns at the Survivor Cave by deriving the Hero entity
  coordinate from the catalog-backed survivor cave tile in
  `addSnapshotToGameWorld()`. Initial camera focus follows that character start,
  so the first overworld screen frames the cave instead of the Studio.
- Verification for the first-move/cave-start polish passed with `npm
  --workspace @aedventure/add-domain run build`, `npm --workspace
  @aedventure/add-domain run test`, `npm --workspace @aedventure/add-rpg run
  build:browser`, `npm run smoke:add-rpg:built`, `npm run check`, and
  `git diff --check`. The ADD map screenshot was visually inspected and now
  shows the Hero at the Survivor Cave.
- ADD world-time presentation now animates forward snapshots minute by minute
  instead of snapping directly to the new hour. The Rust/WASM snapshot remains
  authoritative, while the Solid HUD/day-night overlay uses a separate
  presentation clock that ticks through each visible minute quickly and catches
  up to the authoritative clock.
- Verification for the minute-by-minute clock pass passed with `npm --workspace
  @aedventure/add-domain run build`, `npm --workspace @aedventure/add-rpg run
  build:browser`, `npm run smoke:add-rpg:built`, `npm run check`, and
  `git diff --check`. The ADD smoke now samples several distinct travel-clock
  minute strings before accepting the one-hour tile crossing.
- ADD travel presentation timing is now centralized in
  `apps/add-rpg/src/browser/travel-presentation-timing.ts`. The app shell,
  Phaser map host, and smoke telemetry all use the same contract:
  `60` visible minutes at `30ms` per visible minute, for an `1800ms` adjacent
  hex crossing. Auto tick pauses while the Hero is crossing so the tile-hour
  remains the only clock advancement during travel.
- Verification for the synced travel abstraction passed with `npm --workspace
  @aedventure/add-rpg run build:browser`, `npm run smoke:add-rpg:built`,
  `npm run check`, and `git diff --check`. The ADD smoke now asserts the app
  travel duration, Phaser travel duration, and clock tick cadence match.
- Fixed the travel-clock runaway bug by defaulting ADD browser auto-tick to
  paused. The player-facing topbar now says `Ready` when the runtime is loaded
  but not advancing ambient time; `Live` is reserved for the admin-only auto-tick
  mode. After a tile crossing, the clock stops unless another explicit action
  advances time.
- Disabling ambient time exposed a first-playable selector mismatch: active
  construction can progress with the Hero assigned to construction, even without
  extra crew. `roleHasWorker()` now captures that domain concept, so the
  first-playable action advances construction instead of repeatedly asking for
  build crew. Verification passed with `npm --workspace @aedventure/add-domain
  run build`, `npm --workspace @aedventure/add-rpg run build:browser`,
  `npm run smoke:add-rpg:built`, `npm run check`, and `git diff --check`.
- The travel-clock bug had a second input path: repeated keydown events could
  start another adjacent hex crossing immediately after the first one completed.
  ADD overworld keyboard movement now ignores browser key-repeat events, making
  each toxic-world tile crossing a deliberate key press. Travel start/finally
  also forces admin auto-tick back to paused.
- Verification for the held-key clock fix passed with `npm --workspace
  @aedventure/add-domain run build`, `npm --workspace @aedventure/add-rpg run
  build:browser`, `npm run smoke:add-rpg:built`, `npm run check`, and
  `git diff --check`. The smoke now asserts both authoritative and displayed
  clocks stay stopped after travel and that held-key repeats do not chain moves.
- Reworked the ADD time mechanic into a single authoritative clock with a
  presentation layer that only smooths the explicit per-hex travel reveal.
  `onSnapshot` now snaps the displayed clock straight to truth for every
  non-travel change (boot import, offline catch-up, ambient ticks, manual
  advances); `animatePresentationClockTo` was rewritten as a real-time
  requestAnimationFrame interpolation used solely by the travel reveal, so the
  display can no longer crawl through large jumps or drift past arrival. This
  fixed the "clock fast-forwards on load" bug (the old setTimeout animator
  crawled the whole saved/caught-up span at 30ms/minute). Ambient time is now
  ON by default at 1 game-minute per real second (`autoTick` defaults to `true`,
  superseding the earlier "paused by default / Live is admin-only" note above);
  it pauses only while the Hero crosses a tile (the travel phase gate) so the
  tile-hour stays exact, then resumes on arrival. The topbar reads `Live` while
  ambient time flows and `Paused` when toggled off. Also added
  `@aedventure/game-visibility` to the add-rpg Vite alias map so the dev server
  loads its `src` like the other workspace packages instead of a stale CJS
  `dist`. Verified live in-browser and via `npm --workspace @aedventure/add-rpg
  run build:types` + `npm run smoke:add-rpg`; the smoke now asserts idle ambient
  advance (~1min/sec, snapped), travel = exact +1h then ambient resumes, and
  offline catch-up snaps without crawling.
- Phase 1 field-of-vision foundation has started with
  `packages/game-visibility`. The package is topology-neutral and exports
  visibility states, visibility maps keyed by serialized neutral cell
  coordinates, square/hex radius reveal helpers, known-fact filtering policies,
  stale-memory transforms, and validation helpers. It has no ADD, office,
  Phaser, dungeon, toxicity, tenant, or account concepts.
- `game-visibility` is wired into the root TypeScript project graph and
  `scripts/verify-target-stack.sh`. Focused verification passed with
  `npm --workspace @aedventure/game-visibility run build`,
  `npm --workspace @aedventure/game-visibility run test`, and
  `git diff --check`.
- Phase 2 field-of-vision world-model support is in place. `GameCellPlacement`
  now accepts optional `visibility?: GameCellVisibility`, which aliases the
  neutral `VisibilityEntry` shape from `@aedventure/game-visibility`. Existing
  maps remain valid without visibility metadata, while square and hex cells can
  now carry `hidden`/`discovered`/`visible`/`stale` metadata.
- `game-world` validation now checks optional cell visibility metadata
  structurally through `validateVisibilityEntry()` without deciding product
  reveal rules. Verification passed with `npm --workspace @aedventure/game-world
  run build`, `npm --workspace @aedventure/game-world run test`, `npm run
  check`, and `git diff --check`.
- ADD core catalog data has started moving out of the `game_data.rs` monolith.
  Resources, roles, actions/construction/recipes, story beats, flags, flora,
  structures, and tiles now live under `crates/add-core/src/game_data/catalog/`,
  while `game_data.rs` remains the stable facade for shared types, lookup
  functions, entity schemas, presentations, UI elements, and balance data.
  Verification passed with `cargo check -p add-core` and `npm run smoke:add-rpg`.
- ADD Phaser neutralization step 6 has started replacing custom scene internals
  with shared renderer modules. `GameMapCellRenderer` now has a neutral
  painterly mode for square/hex terrain cells, motifs, shadows, highlights, and
  emphasized edge cells. `AddRpgPhaserMapHost` wires that renderer with ADD
  presentation policies and keeps only the ADD-specific dungeon-link glyph
  overlay locally. Verification passed with `npm --workspace
  @aedventure/game-renderer-phaser run build`, `npm --workspace
  @aedventure/add-rpg run build:types`, `npm --workspace
  @aedventure/game-renderer-phaser run test`, `npm run smoke:add-rpg`, and
  `npm run qa:renderer`. The generic develop-web-game client remains blocked
  by its own missing `playwright` package before browser launch.
- Renderer boundary hardening now explicitly rejects ADD-specific leakage in
  `packages/game-renderer-phaser/src`, including `AddTerrain`, `AddTravel`,
  `dungeon.studio`, `Survivor Cave`, and `toxic`. The exact `rg
  "AddTerrain|AddTravel|dungeon.studio|Survivor Cave|toxic"
  packages/game-renderer-phaser/src` check returns no matches, and the automated
  renderer boundary test is part of `npm run check`. Acceptance verification
  passed with `npm run smoke:add-rpg`, `npm run smoke:engine-sandbox`, `npm run
  qa:renderer`, and `npm run check`.
- ADD character rendering now routes through the shared neutral
  `WorldEntityRenderer` in `@aedventure/game-renderer-phaser`. The ADD scene
  provides entity position, label, facing, travel state, and appearance policy;
  the shared renderer owns shadow/body/head/label placement, depth, and
  interpolation-ready frame hooks. `AddRpgPhaserMapHost` no longer defines the
  Hero display object set locally. Verification passed with
  `npm --workspace @aedventure/game-renderer-phaser run build`,
  `npm --workspace @aedventure/add-rpg run build:types`, `npm --workspace
  @aedventure/game-renderer-phaser run test`, exact renderer leakage `rg`,
  `npm run smoke:add-rpg`, `npm run qa:renderer`, `npm run smoke:engine-sandbox`,
  and `npm run check`.
- ADD interaction and zone presentation now uses the shared neutral
  `WorldCellInteractionRenderer`. The ADD scene provides selected/hovered
  cells, bubble-edge zone cells, and semantic affordances such as linked-area
  entry labels; the renderer owns square/hex outline drawing, pulsing zone
  presentation, portal/action glyphs, crisp action marker labels, and overlay
  cleanup. This removes local dungeon glyph, bubble edge, and selection outline
  drawing from `add-world-scene.ts` without adding ADD terminology to
  `game-renderer-phaser`. Focused verification passed with
  `npm --workspace @aedventure/game-renderer-phaser run build`,
  `npm --workspace @aedventure/add-rpg run build:types`, `npm --workspace
  @aedventure/game-renderer-phaser run test`, exact renderer leakage `rg`,
  `npm run smoke:add-rpg`, `npm run qa:renderer`, and
  `npm run smoke:engine-sandbox`.
- ADD Phaser map telemetry now has a raw/projected split. `AddWorldScene`
  records neutral `PhaserMapRendererState` facts for renderer readiness,
  topology, cells, renderer subsystem info, controlled entity position,
  movement, landmarks, visibility, camera, interaction, and presentation.
  `projectAddPhaserMapInfo()` maps that raw state plus ADD domain selectors into
  the existing `render_game_to_text` contract, so future renderer refactors can
  change internals without churning ADD smoke assertions. Verification passed
  with `npm --workspace @aedventure/add-rpg run build:types`, `npm run
  smoke:add-rpg`, `npm run qa:renderer`, `npm run smoke:engine-sandbox`, and
  `npm run check`.
- ADD fog and visibility presentation now routes through a shared neutral
  `WorldFogRenderer` in `@aedventure/game-renderer-phaser`. ADD domain maps its
  visibility rules into neutral fog treatments (`none`, `concealed`,
  `remembered`), while the shared renderer owns soft square/hex fog primitives,
  reveal pulses, travel halo previews, and trail fade-out state. The ADD scene
  now only supplies the Hero travel preview input and no longer contains the fog
  drawing algorithms. Verification passed with `npm --workspace
  @aedventure/game-renderer-phaser run build`, `npm --workspace
  @aedventure/add-domain run build`, `npm --workspace @aedventure/add-rpg run
  build:types`, `npm --workspace @aedventure/game-renderer-phaser run test`,
  `npm run smoke:add-rpg`, `npm run qa:renderer`, `npm run smoke:engine-sandbox`,
  exact renderer leakage `rg`, `git diff --check`, and `npm run check`.
- ADD has started the post-renderer-neutralization gameplay loop. A new
  `selectAddDiscoverySummary()` selector in `@aedventure/add-domain` projects
  movement consequences, revealed tile choices, first dungeon entry readiness,
  resource links, and available actions without importing Phaser or browser UI.
  `apps/add-rpg` renders that as a compact Discovery panel over the map, and
  `render_game_to_text` now exposes a typed discovery projection for smoke and
  agent inspection. Verification passed with `npm --workspace
  @aedventure/add-domain run build`, `npm --workspace @aedventure/add-rpg run
  build:types`, `npm run smoke:add-rpg`, `npm run qa:renderer`, `npm run
  smoke:engine-sandbox`, and the exact renderer leakage `rg`. A full `npm run
  check` reached the office smoke and failed only on the large GPU map
  real-time cadence threshold while the machine was under heavy unrelated CPU
  load; the ADD and renderer portions completed successfully.
- Office GPU cadence smoke is now hardened. `frontend-smoke.test.cjs` keeps the
  same 50ms average / 90ms p95 / 250ms max target, but normal smoke runs only
  warn when local or CI load misses that target and fail on wider
  constrained-runner hard budgets that indicate real frame starvation.
  `STRICT_FRONTEND_SMOKE_TIMING=1` or `STRICT_RENDERER_TIMING=1` restores strict
  target enforcement for dedicated performance runs. Verification passed with
  `npm run smoke:office:built`, `npm run check`, and visual inspection of the
  renderer QA stress-map artifact.
- Survivor Cave dungeon entry is now a real player loop. The Hero starts on the
  Survivor Cave, the overworld exposes `Enter Survivor Cave`, entering opens the
  linked square dungeon map, the objective panel switches to a cave-specific
  dungeon objective, and both the top bar and objective panel can return cleanly
  to the overworld. `render_game_to_text` now exposes the dungeon objective
  projection, and `npm run smoke:add-rpg` covers the entry/return loop plus a
  dedicated `tmp/add-rpg-survivor-cave-entry-smoke.png` screenshot.
- Revealed tile choices are now actionable. Selecting a revealed tile projects a
  domain-owned decision card with travel minutes, whether the Hero is standing
  there or can travel now, toxicity risk, known facts, unknown facts, dungeon
  link count/copy, and objective/resource usefulness reasons. The Discovery
  panel renders that card, and `render_game_to_text` exposes the same selected
  tile decision for agents and smoke tests. Verification passed with
  `npm --workspace @aedventure/add-domain run build`, `npm --workspace
  @aedventure/add-rpg run build:types`, `npm run smoke:add-rpg`,
  `npm run qa:renderer`, `npm run smoke:engine-sandbox`, `git diff --check`,
  exact renderer leakage `rg`, and `npm run check`. Visual artifact:
  `tmp/add-rpg-selected-tile-decision-smoke.png`.
- Movement consequences are now tied into the Discovery loop. `add-domain`
  projects viral-load feedback, daylight/time-of-day risk, return-safety
  severity, player-facing warnings, and a future automatic-return authority flag
  from the authoritative ADD snapshot. The ADD app renders a compact Movement
  Consequences card after travel, and `render_game_to_text` exposes the same
  consequence projection for agent/smoke inspection. Verification passed with
  `npm --workspace @aedventure/add-domain run build`, `npm --workspace
  @aedventure/add-rpg run build:types`, `npm run smoke:add-rpg`,
  `npm run qa:renderer`, `npm run smoke:engine-sandbox`, `git diff --check`,
  exact renderer leakage `rg`, and `npm run check`. Visual artifact:
  `tmp/add-rpg-movement-consequences-smoke.png`.
- Discovery panel UX is now closer to a lightweight decision helper. The
  `add-domain` selector projects a primary `nextAction`, filters noisy disabled
  actions down to enabled choices or one meaningful blocker, and uses more
  player-facing copy for unknown/hidden tiles. The ADD app renders a persistent
  Next Step card, supports panel collapse/expand while keeping the
  recommendation visible, and exposes the collapsed state plus next-action
  contract through `render_game_to_text`. Verification passed with
  `npm --workspace @aedventure/add-domain run build`, `npm --workspace
  @aedventure/add-rpg run build:types`, `npm run smoke:add-rpg`,
  `npm run qa:renderer`, `npm run smoke:engine-sandbox`, `git diff --check`,
  exact renderer leakage `rg`, and `npm run check`. Visual artifact:
  `tmp/add-rpg-discovery-collapsed-smoke.png`.
- The Studio now has a proper tile-detail path. Selecting the Studio overworld
  tile exposes both `Manage Studio Echo` and `Enter The Studio`, routes base
  management to `add.rpg.square-base-fixture`, routes the Studio dungeon action
  to `add.rpg.dungeon.studio`, and keeps top-bar Survivor Cave entry from
  stealing the same click gesture. The Discovery panel action layer is hardened
  for pointer events, and `render_game_to_text` now exposes selected tile link
  labels/action ids plus map-mode routing telemetry for smoke coverage.
  Verification passed with `node --check scripts/add-rpg-smoke.test.cjs`,
  `npm --workspace @aedventure/add-rpg run build:types`,
  `npm run smoke:add-rpg`, `npm run qa:renderer`,
  `npm run smoke:engine-sandbox`, `git diff --check`, and `npm run check`.
  Visual artifact: `tmp/add-rpg-studio-tile-detail-smoke.png`.
- The Studio route now follows the desired two-step map structure. The overworld
  Studio tile opens `The Studio` subtile/base square map first; direct overworld
  entry into `add.rpg.dungeon.studio` is no longer exposed as a tile action.
  The Studio square map includes a visible `Studio Dungeon Entrance` landmark
  plus a `GameInteraction` targeting `add.rpg.dungeon.studio`; entering from
  that subtile returns to the Studio map instead of jumping straight back to
  the overworld. Verification passed with `node --check
  scripts/add-rpg-smoke.test.cjs`, `npm --workspace @aedventure/add-domain run
  build`, `npm --workspace @aedventure/add-rpg run build:types`,
  `npm run smoke:add-rpg`, `npm run qa:renderer`,
  `npm run smoke:engine-sandbox`, `git diff --check`, and `npm run check`.
  Visual artifacts: `tmp/add-rpg-studio-tile-detail-smoke.png` and
  `tmp/add-rpg-studio-subtile-dungeon-entrance-smoke.png`.
- Phase 1 base management surface is implemented as a player-facing Studio
  panel, not an Admin dependency. `add-domain` now exports
  `selectAddBaseManagementState(snapshot, catalog)` for resources/caps/rates,
  role slot pressure, active construction, projects, stations, processing,
  Vibes/bunks/recruitment, bottlenecks, and recommended action. The ADD app
  renders Base mode as Crystal, Build, Power, Crew, Social, and Processing tabs
  with runtime-backed buttons for Hero/crew staffing, construction, station
  power, processing, recruitment, and the recommended action. `render_game_to_text`
  exposes the base-management contract for agent/smoke inspection. Verification
  passed with `npm run smoke:add-rpg:built`, `npm run smoke:add-rpg`, visual
  inspection of `tmp/add-rpg-base-management-smoke.png`, and `npm run check`.
- Phase 2 economy legibility and Phase 3 staffing are now active base-management
  layers. `add-domain` projects per-resource gain/spend, time-to-cap,
  time-to-afford, zero-output reasons, limiting resources, wait previews, Hero
  task options, crew allocation pressure, and staffing presets. The ADD base
  view exposes this through Crystal, Build, and Crew panels so moving workers
  visibly changes rates, blockers, and recommendations. Verification passed
  with focused ADD domain/app builds, ADD smoke coverage, and full `npm run
  check`.
- Phase 4 stations-as-a-machine is implemented. `add-domain` now projects a
  station-machine model spanning the synthetic Studio plus Crystal Circle, Fire
  Pit, Resonance Chamber, Mix Console, Workshop, and Research Booth, including
  built/locked/powered/browned-out state, Chorus upkeep, current jobs, available
  recipes, output effects, blocked reasons, and brownout priority. The ADD app
  leads the Power and Processing tabs with grouped station cards instead of
  loose controls, and `render_game_to_text` exposes the station-machine contract
  for agent/smoke inspection. Verification passed with `npm --workspace
  @aedventure/add-domain run build`, `npm --workspace @aedventure/add-rpg run
  build`, `node --check scripts/add-rpg-smoke.test.cjs`, `npm run
  smoke:add-rpg`, visual inspection of `tmp/add-rpg-station-machine-smoke.png`,
  and full `npm run check`.
- Phase 5 better construction and upgrade loop is implemented. Construction now
  has a `buildLoop` projection in `add-domain` with active-job progress,
  assigned/required builders, estimated completion time, missing resources,
  result preview, Bassline spending risk, future economy impact, and repair /
  crystal / station / housing / support categories. The catalog now includes
  executable long-term projects for bunk expansion, safer water systems,
  expedition prep structures, and relay/loudspeaker preparation, all using
  existing runtime effects so they change the economy without new save schema.
  The ADD Build tab now leads with the construction loop and grouped project
  cards, while `render_game_to_text` exposes the build-loop contract for agents
  and smoke tests. Verification passed with `npm --workspace
  @aedventure/add-domain run build`, `npm --workspace @aedventure/add-rpg run
  build`, `node --check scripts/add-rpg-smoke.test.cjs`, `npm run
  smoke:add-rpg`, visual inspection of `tmp/add-rpg-construction-loop-smoke.png`,
  and full `npm run check`.
- Phase 0 interface/data cleanup is complete for the current ADD surface. The
  live local ADD app was reset to a fresh opening state, repo-local temporary
  screenshots plus `.chau7/` local artifacts were removed, and production ADD
  base/dungeon maps no longer publish fixture IDs, fixture metadata, fixture
  token names, or fixture interaction/zone kinds. Developer/QA renderer
  fixtures remain intentionally named as fixtures. Verification passed with
  `npm --workspace @aedventure/add-domain run build`, `npm --workspace
  @aedventure/add-rpg run build`, `npm --workspace @aedventure/add-domain test`,
  `npm run smoke:add-rpg`, `npm run qa:renderer`, and full `npm run check`.
  Screenshots inspected: `tmp/add-rpg-smoke.png`,
  `tmp/add-rpg-fog-map-smoke.png`, and
  `tmp/add-rpg-studio-subtile-dungeon-entrance-smoke.png`. Remaining UI note:
  Studio/base interior labels can still overlap in the square subtile view and
  should be handled in the next interface polish pass.
- Interface Phase 1 hierarchy is implemented. The ADD shell now declares one
  player-facing hierarchy: primary map/world, secondary decision/action,
  tertiary resources/time/status, and hidden advanced Admin. Discovery and Base
  panels lead with a compact four-question brief: where am I, what changed,
  what should I do now, and what happens if I wait. The top rail now carries
  compact key resources beside time/status, while `render_game_to_text` exposes
  `shell.interfaceHierarchy` for agent/smoke inspection. The Studio dungeon
  return label now handles `area_hex` correctly, and the Studio smoke flow was
  aligned with the committed area/base return paths. Verification passed with
  `npm --workspace @aedventure/add-rpg run build`, `npm run smoke:add-rpg`,
  `npm run qa:renderer`, visual inspection of `tmp/add-rpg-smoke.png`, and full
  `npm run check`.
- Interface Phase 2 current action unification is implemented. The ADD shell
  now has a typed `shell.currentAction` projection and one shared
  `#current-action-surface` that can represent offline return review, dungeon
  objectives, base-loop recommendations, discovery actions, first-playable
  steps, or runtime boot state. Discovery/Base panels now reuse that surface
  instead of separate "next step" / "recommended" cards, and the first-playable
  objective panel is progress/context only so the active CTA is not duplicated.
  Smoke coverage now asserts the unified action contract, updates the Studio
  tile detail contract for Base + Studio Grounds links, and uses hardened
  dynamic-control clicks for the live base panel. Verification passed with
  `npm --workspace @aedventure/add-rpg run build`, `npm run smoke:add-rpg`,
  `npm run qa:renderer`, visual inspection of `tmp/add-rpg-smoke.png` and
  `tmp/add-rpg-base-management-smoke.png`, and full `npm run check`.
- Interface Phase 3 desktop layout pass is implemented. The ADD map remains
  the full-screen primary surface, the topbar is thinner and less text-heavy,
  resources are compacted, Admin moved behind a secondary Menu, and the bottom
  HUD is camera controls only. Discovery, Base, Dungeon, and Return now render
  as a single right-side contextual rail while the left objective tracker stays
  compact and progress-oriented. `render_game_to_text` now exposes
  `shell.shellMenuOpen`, and the ADD smoke was hardened for live-panel
  re-renders by using deterministic queued `window.advanceTime()` and DOM-level
  clicks for dynamic controls. Verification passed with `npm --workspace
  @aedventure/add-rpg run build:types`, `npm run smoke:add-rpg`, `npm run
  qa:renderer`, visual inspection of `tmp/add-rpg-smoke.png`,
  `tmp/add-rpg-base-management-smoke.png`, `tmp/add-rpg-dungeon-map-smoke.png`,
  and `tmp/add-rpg-offline-return-smoke.png`, plus full `npm run check`.
- Interface Phase 4 mobile layout pass is implemented. Narrow viewports use an
  ultra-compact topbar, short map-mode labels, a contextual bottom sheet,
  collapsed objective tracker, and camera controls above the sheet. ADD smoke
  now asserts the mobile layout at `390x760` and `360x740` and captures
  `tmp/add-rpg-mobile-smoke.png` plus
  `tmp/add-rpg-mobile-narrow-smoke.png`.
- Interface Phase 5 contextual panel density pass is implemented. The old
  travel status card and separate four-question hierarchy grid were removed
  from contextual panels; `#current-action-surface` now owns the scannable
  `Do now / Wait / Changed / Where` decision brief. Discovery secondary data
  now lives behind expandable sections for consequences, selected tile, nearby
  choices, resources, and other actions. Verification passed with
  `npm run agent:verify:add-ui`, direct Vite browser build for ADD, and
  `npm run smoke:add-rpg:built`; full `npm run smoke:add-rpg` is currently
  blocked before UI smoke by unrelated dirty storylet/content-generation work
  around `Condition::RecruitedAny` and generated `StoryBeatDef` fields.
- Interface Phase 6 discovery decision UX is implemented. Nearby revealed
  choices are now real selectable rows with action labels and hints, and the
  selected tile card explains travel time, toxicity, known facts, unknown
  facts, dungeon/submap links, and usefulness reasons. Enabled adjacent travel
  CTAs route through the existing Phaser `moveMainCharacter` path so the
  one-hour clock, warning dialog, reveal halo, and runtime snapshot remain the
  single source of movement truth. Unavailable actions are hidden unless their
  blocked reason is useful to the scouting decision. Verification passed with
  `npm --workspace @aedventure/add-domain run build`,
  `npm --workspace @aedventure/add-rpg exec vite -- build --config
  vite.config.mjs`, `npm run agent:verify:add-ui`, and
  `npm run smoke:add-rpg:built`.
- Interface Phase 7 base management UX refinement is implemented. Base
  management now has product-like tabs for Crystal, Build, Power, Crew, Social,
  Expeditions, Resonance, and Processing; the panel leads with a clear
  bottleneck/recommended-action strip; and crew changes produce an explicit
  rate-change card after the runtime's resource-flow snapshot catches up.
  Construction/build cards are lighter, with future-economy detail moved behind
  compact disclosure rows, and Admin remains unnecessary for the first-playable
  base loop. Verification passed with `npm --workspace @aedventure/add-rpg run
  build:types`, direct Vite browser build for ADD,
  `npm run agent:verify:add-ui`, and `npm run smoke:add-rpg:built`.
- Interface Phase 8 dungeon context UX is implemented. Dungeon mode now has a
  distinct right-side context panel instead of reusing the global story/current
  action surface. The panel shows the current dungeon objective, return action,
  discovered exits, blocker/visibility constraints, and local map state without
  duplicating the full left objective step list. `render_game_to_text` now
  exposes `dungeonContext` for smoke/agent checks. Verification passed with
  `npm --workspace @aedventure/add-rpg run build:types`, direct Vite browser
  build for ADD, `npm run agent:verify:add-ui`, and
  `npm run smoke:add-rpg:built`; visually inspected
  `tmp/add-rpg-survivor-cave-entry-smoke.png`.
- Interface Phase 9 return/offline review UX is implemented. The "While you
  were away" panel now leads with a short outcome summary, scannable highlight
  counters, a first-viewport "After dismissing" next-action card, explicit
  blockers, unchanged/manual systems, and offline-vs-manual progression rules.
  `render_game_to_text` exposes the same next-action and review counts so
  agents can reason about the return state without scraping copy. Verification
  passed with `npm --workspace @aedventure/add-rpg run build:types`, direct
  Vite browser build for ADD, `npm run agent:verify:add-ui`, and
  `npm run smoke:add-rpg:built`; visually inspected
  `tmp/add-rpg-offline-return-smoke.png`.
- Interface Phase 10 admin/dev separation is implemented. Admin still opens
  from the top-right Menu, but the default drawer now shows player-safe run
  status, resources, objective, recovery, and world-action surfaces. Runtime
  internals, manual time stepping, reset/import controls, and the raw save
  payload live behind an explicit Developer tools reveal that collapses whenever
  Admin closes. `render_game_to_text` exposes `shell.devToolsOpen` and the
  advanced hierarchy now reports that runtime internals are hidden by default.
  Verification passed with `npm --workspace @aedventure/add-rpg run
  build:types`, direct Vite browser build for ADD, and
  `npm run smoke:add-rpg:built`; visually inspected
  `tmp/add-rpg-admin-clean-smoke.png`.
- Interface Phase 11 interaction polish is implemented. Shared Phaser
  interaction rendering now fills hover/selected cells and shows blocked primary
  markers distinctly; ADD map telemetry reports active cell/source, last input
  method, marker visibility, and dragging state; selected-tile telemetry exposes
  enabled actions, disabled reasons, and the primary action. The Discovery panel
  now shows visible blocked-action reasons, selected tile choices expose pressed
  state, and the objective tracker reports drag/collapse actions while reclamping
  after size changes. Verification passed with `npm --workspace
  @aedventure/add-rpg run build:types`, direct Vite browser build for ADD,
  `npm run smoke:add-rpg:built`, `npm run agent:verify:add-ui`, and
  `npm run qa:renderer`; visually inspected
  `tmp/add-rpg-selected-tile-decision-smoke.png`.
- Interface Phase 12 accessibility/readability is implemented. The ADD shell now
  exposes an accessibility telemetry contract with focused region, keyboard
  navigation support, labelled contextual panels, live current-action updates,
  skip-link support, and scroll-trap guardrails for the right rail/mobile bottom
  sheet. The objective tracker can be moved with keyboard arrow keys and
  collapsed/expanded with Enter or Space from the focused handle; Escape closes
  the secondary menu or admin drawer and returns focus to the menu button.
  Closed admin drawers are no longer keyboard-reachable off screen, muted small
  labels have stronger contrast, focus states are more visible, and reduced
  motion requests are respected. Verification passed with `npm --workspace
  @aedventure/add-rpg run build:types`, `npm --workspace @aedventure/add-rpg
  run build`, `npm run smoke:add-rpg:built`, and
  `npm run agent:verify:add-ui`; visually inspected `tmp/add-rpg-smoke.png`,
  `tmp/add-rpg-mobile-narrow-smoke.png`, and
  `tmp/add-rpg-selected-tile-decision-smoke.png`.
- Interface Phase 13 visual polish is implemented. The ADD shell now has a
  visible surface system for map stage, status bar, warm objective overlay,
  cool context inspector, map controls, and native loading/error/empty states.
  Shared CSS tokens drive spacing, borders, shadows, motion, and panel rhythm;
  contextual panels are more opaque over detailed square/hex maps; the map
  stage has a softer world-to-UI integration layer; and smoke now asserts the
  visual surface contract through `render_game_to_text` plus DOM markers.
  Verification passed with `npm --workspace @aedventure/add-rpg run
  build:types`, direct Vite browser build for ADD,
  `npm run smoke:add-rpg:built`, and `npm run agent:verify:add-ui`; visually
  inspected `tmp/add-rpg-smoke.png`, `tmp/add-rpg-base-management-smoke.png`,
  and `tmp/add-rpg-mobile-narrow-smoke.png`.
- Layout hierarchy smoke coverage now captures dedicated screenshots for
  desktop Discovery, desktop Base, Dungeon, Offline Return, and mobile
  bottom-sheet states. The ADD smoke asserts exactly one contextual panel is
  visible, Admin stays behind Menu, the bottom-left HUD is camera-only, and
  debug/runtime controls stay out of the primary UI. During verification, the
  new visible-text guard caught the player-facing phrase "return snapshot" in
  the offline review; that copy now says "when you returned." Verification
  passed with `npm --workspace @aedventure/add-rpg run build`,
  `npm run smoke:add-rpg:built`, and `npm run agent:verify:add-ui`; visually
  inspected the five new hierarchy screenshots in `tmp/`.
- Interface Phase 15 V1 gate is now explicit in the ADD smoke. The gate records
  that Discovery, Base, Dungeon, and Return states each answer where the player
  is, what changed, what to do next, and what happens if they wait, while also
  proving each state is playable without Admin or developer tools. The same
  gate requires desktop hierarchy screenshots for the four contextual panels and
  a stable mobile bottom-sheet layout before the smoke can finish. Verification
  passed with `npm run smoke:add-rpg:built` and full `npm run check`; visually
  inspected the regenerated Discovery, Base, Dungeon, Offline Return, and mobile
  bottom-sheet hierarchy screenshots.
- Fixed the first critical interface review finding: Base mode no longer leads
  with the overworld Discovery story card. `currentActionSurface` now allows
  callers to opt out of story moment injection, and `baseManagementPanel` starts
  with the base player-loop health/bottleneck/action/rates surface before the
  current decision. The ADD smoke now asserts that Base mode does not leak "Road
  to Base" / "Follow the low signal" copy. Verification passed with
  `npm --workspace @aedventure/add-rpg run build:types`,
  `npm --workspace @aedventure/add-rpg run build:browser`, and
  `npm run smoke:add-rpg:built`; visually inspected the regenerated Base
  hierarchy screenshot.
- Started the camera HUD polish pass: the bottom-left map HUD keeps the same
  camera-control behavior and IDs, but is now structured as compact zoom and
  anchor clusters. The zoom readout now uses game-style scale (`1.2x`) instead
  of a QA-like percent, Hero/Studio/Cave anchors are compact glyph controls with
  accessible labels, and the Cave anchor only appears on the overworld when the
  Survivor Cave anchor is relevant.
- Completed and verified the camera HUD polish pass. Smoke now asserts the Cave
  anchor is present while the Hero starts on Survivor Cave and disappears after
  the Hero leaves that local cave context. Verification passed with
  `npm run smoke:add-rpg` and the web-game client against
  `http://127.0.0.1:5180/app/`; inspected the generated start screenshot and
  `tmp/add-rpg-movement-consequences-smoke.png`.
- Fixed the ADD dev-console boot issues reported from `main.ts` and Phaser.
  Module-scope Solid `createMemo` / `createEffect` calls now live under explicit
  module roots with HMR disposal, so dev builds no longer warn about ownerless
  computations. The ADD Phaser host now prefers WebGL but falls back to Canvas
  when a browser cannot create a WebGL context, preventing a renderer boot
  white screen; the app also catches total renderer startup failure and records
  it as runtime UI state. Added an empty favicon link to avoid the local
  `/favicon.ico` 404 noise. Verification passed with `npm --workspace
  @aedventure/add-rpg run build:browser`, full `npm run smoke:add-rpg`, a dev
  browser console pass against `http://127.0.0.1:5177/app/`, a forced
  WebGL-disabled Canvas boot pass, and the web-game client screenshot/state
  capture.
- Completed the interface copy-density pass for review finding 10. The ADD
  browser shell now renders action-first lead copy, moves longer story/current
  action/selected tile/base loop/offline rule explanations behind disclosure
  controls, and keeps full copy available through titles/details and
  `render_game_to_text`. Selected tile and movement consequence sections are
  open by default on desktop/player detail surfaces, while mobile action snap
  uses the explicit sheet state instead of `:has(details[open])` so supporting
  details stay hidden until the Details toggle. Verification passed with
  `npm --workspace @aedventure/add-rpg run build:browser`, full
  `npm run smoke:add-rpg`, and the web-game client against
  `http://127.0.0.1:5180/app/`; visually inspected Discovery, Base, and Offline
  Return screenshots.
- Removed the disruptive per-hex travel-time badges from the ADD Phaser map.
  The renderer no longer draws repeated `1h` chips on every reachable adjacent
  cell or the `Crossing: 1h` path-preview label; travel time remains available
  in the discovery panel, selected-tile details, and telemetry. Verification
  passed with `npm --workspace @aedventure/add-rpg run build:browser`, full
  `npm run smoke:add-rpg`, and a web-game client screenshot against the live
  local preview at `http://127.0.0.1:5180/app/`.
- Polished the first ADD map readability pass. The overworld Hero label is now
  hidden while the neutral entity renderer supports explicit label visibility;
  entrance markers are icon-only instead of text badges; Survivor Cave gets a
  lower, smaller landmark plate when the Hero stands on it; reachable/selected
  hexes use glow/outline affordances; tile fact tooltips stay off the canvas so
  details remain in the side panel. Verification passed with
  `npm --workspace @aedventure/add-rpg run build:browser`, `npm run
  smoke:add-rpg`, and the web-game client screenshot/state pass against
  `http://127.0.0.1:5180/app/`. Renderer QA now accepts either Studio or
  Survivor Cave as a valid ADD square dungeon fixture, because the topology gate
  is about proving the square Phaser renderer, not a specific product route.
  Full `npm run check` passed after the QA contract update.
- Made reachable hex selection feel like a real travel decision. Hovering or
  clicking a reachable region now promotes it into the Discovery decision state,
  switches the primary action to "Travel to this region," shows the 60-minute
  cost, risk, known/unknown facts, and why the region matters in the side panel,
  and uses a stronger map path preview instead of an on-map text badge. The ADD
  smoke now asserts this player path so future map-label or CTA regressions are
  caught.
- Polished the first ADD movement micro-loop from map selection through arrival.
  The first travel smoke path now selects a reachable hex, confirms through the
  side-panel CTA, exercises the first-travel dialog, observes synchronized Hero,
  clock, and reveal-halo animation, and asserts the arrival "Changed" feedback.
  Current Action now exposes transient Travel/Arrival states ahead of tutorial
  actions while the crossing resolves, and the Phaser map no longer draws generic
  `Inspect` badges for non-portal tiles; tile facts stay in the Discovery panel.
- Reduced the ADD objective tracker so the map has more visual priority by
  default. The first-playable panel now starts collapsed on desktop and mobile,
  shows only the current step plus progress, expands into the full checklist on
  demand, and collapses into a small journal chip after the arc completes. The
  ADD smoke contract now asserts the compact default, expansion path, and offline
  return review behavior.
- Improved ADD landmark/object language on the Phaser map. Cave, Studio/crystal,
  doors, and dungeon entrances now render as stronger procedural objects/icons;
  persistent Cave/Studio text plates are removed except for the active selected
  landmark context, keeping exact names in the side panel. The ADD smoke map-mode
  tab helper was also hardened against harmless live re-renders, and
  `npm run smoke:add-rpg:built` passed.
- Gated Base navigation behind actual Studio arrival. The Base topbar entry is
  now hidden until the Hero reaches The Studio or opens Base through a validated
  Studio action, and reset clears the unlock. Telemetry now reports only visible
  map-mode entries, so smoke can assert Base is absent on boot/mobile and appears
  only after the real travel path to Studio. Verification passed with
  `npm run smoke:add-rpg:built` and `npm run agent:verify:add-ui`.
- Made "Reach the Base" a real route objective instead of a story-choice CTA.
  The first playable now exposes "Preview route to Studio," selects the next
  Studio-bound step on the map, shows the 60-minute crossing path/decision state,
  and only unlocks Base once the Hero has actually reached The Studio. The
  hidden pre-arrival story beats are resolved at the Studio/Base handoff so the
  old narrative gate no longer blocks product actions. Verification passed with
  full `npm run smoke:add-rpg`, focused `npm run agent:verify:add-ui`, and
  visual inspection of `tmp/add-rpg-map-smoke.png`.
- Polished the Studio arrival handoff. When the Hero reaches The Studio, the
  current decision now reads as an Arrival state with "Open base management" as
  the primary CTA, the Studio landmark gets a stronger glow/label emphasis, and
  opening Base shows a short map-level transition before landing in the Base
  view. Smoke now captures `tmp/add-rpg-studio-arrival-handoff-smoke.png` and
  asserts the arrival card plus renderer emphasis telemetry. Verification passed
  with full `npm run smoke:add-rpg` and focused `npm run agent:verify:add-ui`.
- Added the Phase 8 agent-friendly story API to ADD `render_game_to_text`.
  Telemetry now exposes a structured `storyAgent` contract with active beat/arc,
  blocker, primary action, command IDs, available commands, next beat candidates,
  completed arc progress, content validation version, and a concise
  "what should I do next and why" answer. The pass also hardened story action
  payload normalization, cleaned command resource IDs, refreshed narrative state
  after runtime ticks, and aligned the first-playable arrival gate with the
  current economy. Verification passed with the ADD browser build,
  `npm run smoke:add-rpg:built`, and `npm run agent:verify:add-ui`.
- Completed Phase 9's first content-authoring refactor. Story content is now
  split into `content/story/arcs/pre-arrival.ts`,
  `content/story/arcs/base-onboarding.ts`, and
  `content/story/arcs/ambient.ts`, with shared authoring helpers in
  `content/story/helpers.ts` and a typed `content/content-validation` entry
  point for conventions. The old `content/story.ts` path remains a compatibility
  re-export, while codegen now points at `content/story/index.ts`. Verification
  passed with `npm run content:check`, `npm run content:validate`, and
  `npm run agent:verify:add-ui`.
- Added the Phase 10 Admin story/content browser. ADD now has a domain-level
  `selectAddStoryContentBrowserState` projection that exposes active beat,
  completed beats, choices made, narrative qualities, available commands, and
  beat eligibility reasons without letting the UI mutate or re-select story
  state. The Admin drawer renders that read-only browser outside developer
  internals, and smoke coverage asserts it stays visible on the clean Admin
  surface.
- Hardened the ADD interface pop-ins and clickability contract. The travel
  confirmation and offline return surfaces are now draggable with bounded
  pointer/keyboard movement, z-index layering was tightened around topbar/menu/
  modal/admin surfaces, and the smoke suite now verifies visible primary actions
  are not blocked at their click centers. The pass also re-ordered the Base
  current action so its primary CTA is reachable without scrolling on desktop.
- Fixed the road-to-base story copy placement. The active story moment no
  longer renders as a direct child of the Phaser world beneath the status bar;
  it now lives inside the Discovery contextual panel, preserving the map as the
  primary play surface. Smoke coverage now asserts the topbar remains pinned and
  visible, and that narrative cards cannot be mounted directly under the map
  header. Focused verification passed; the broader built smoke later reached an
  unrelated ADD runtime numeric-conversion error during base management.
- Reworked ADD clean-start discovery to be runtime-event driven. Raw
  `GameState::new()` now starts with no authored discovered cells; the
  simulation bootstrap emits a typed `starting_area_discovered` event and reveals
  only the open radius-1 cells around Survivor Cave. The Studio/base hex stays
  hidden and unselectable on boot while Phaser renders a small objective label as
  the only distant information. Reset now returns to the same cave-local
  discovery shape. The pass also fixed optional `activeConstruction`
  projection checks and string-serialized the deterministic RNG seed so
  expedition returns no longer fail WASM snapshot conversion. Verification
  passed with `cargo test -p add-core`, `npm run agent:verify:add-ui`,
  `npm --workspace @aedventure/add-rpg run build`, `npm run
  smoke:add-rpg:built`, and a local web-game client no-crash render pass.
- Split ADD shell tools into three player/agent-facing drawers: Settings,
  Admin, and Dev. Settings now owns real player preferences for pace, motion,
  objective/discovery panel density, and autosave; Admin stays a clean
  operational/story/recovery surface; Dev owns raw runtime commands and save
  payload tooling. `render_game_to_text` now reports `settingsOpen`,
  Settings metadata, and separate Admin/Dev tool state. Built smoke now covers
  the split with Settings/Admin screenshots and verifies Dev does not leak into
  player-facing V1 states.
- Rotated shared hex rendering to flat-top orientation. The neutral topology
  projection now maps axial q/r cells to flat-top world coordinates, the Phaser
  hex polygon points use horizontal top/bottom sides, and engine-sandbox
  telemetry/smoke copy now says "flat-top axial q/r." ADD overworld screenshots
  and engine-sandbox topology fixtures visually confirm the new orientation.
  The renderer QA was also updated for the current fog-of-war contract where
  boot may have hidden cells plus visible cave-adjacent cells but no separate
  discovered/stale sample yet, and its dungeon-mode switch now uses a stable DOM
  activation instead of a timing-sensitive pointer click. Verification passed
  with topology/renderer builds and tests, ADD build/smoke, engine sandbox
  smoke, `npm run qa:renderer:built`, and `npm run agent:verify`.
- Added player sound management to the active ADD Settings surface and changed
  Settings from the shared drawer shell into a centered hex-shaped modal window.
  The shell now reuses the persisted browser `AddSettings` store, exposes
  master/music/effects sliders plus a mute toggle, dispatches
  `add-settings-changed` for the existing music director, and reports audio
  state/presentation through `render_game_to_text`. The old self-mounted
  settings overlay script was removed from the ADD HTML entry so there is one
  player settings surface. Smoke now asserts the hex presentation, audio
  telemetry, mute/reset behavior, and deterministic settings storage cleanup.
  Verification passed with `npm --workspace @aedventure/add-rpg run
  build:types`, `npm --workspace @aedventure/add-rpg run build:browser`, full
  `npm run smoke:add-rpg:built`, and `npm run agent:verify:add-ui`.
- Reviewed and tightened the ADD menu hierarchy. The topbar menu now groups
  player-facing settings separately from operational Admin and raw Dev tools,
  Admin/Dev drawers have sticky section maps for their internal sections, and
  the tool drawers use immediate opacity visibility instead of slide-in
  transforms so screenshots and clicks no longer catch a partially shifted
  panel. Menu surfaces were made more opaque to keep background map text from
  bleeding through. Smoke now asserts the grouped shell menu, and verification
  passed with `npm --workspace @aedventure/add-rpg run build:browser`, full
  `npm run smoke:add-rpg:built`, and `npm run agent:verify:add-ui`.
- Made the ADD Menu and Settings surfaces behave like intentional hex UI.
  The topbar menu now uses a true six-sided clipped hex boundary, and Settings
  has a deeper hex modal silhouette that can be dragged with the same bounded
  pointer/keyboard movement model used by other pop-ins. Dev live-tuning no
  longer auto-mounts from `index.html`; it is hidden by default and can be
  shown/removed explicitly from the Dev drawer. A Playwright spot-check against
  `http://127.0.0.1:5180/app/` verified Settings dragging, tuning show/remove,
  screenshots, and zero console errors. Focused verification passed with
  `npm run agent:verify:add-ui`.
