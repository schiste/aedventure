# ADD Narrative System: Implementation, Documentation, and Tooling Plan

Status: proposed execution plan for the live ADD game.

> Scope note: this plan covers the ADD game lane only. It extends the existing
> playable `apps/add-rpg` game and its Rust runtime. It is not a proposal for a
> separate narrative demo, a second engine, or a replacement for the current
> idle loop.

This plan turns the [Narrative System
Specification](narrative-system-specification.md) into work this repository can
actually do, against the code that exists today. The specification is accepted
as the design. What follows is the reconciliation: which parts land where,
which parts already exist under another name, which parts must change to avoid
creating a second source of truth, and in what order.

Read the [three-brick contract](lore-engine-content-bricks.md) first. Every
decision below follows from it.

## Where does this change belong?

| Change | Owner | First verification |
| --- | --- | --- |
| Axes, impact pipeline, decay, saturation, inheritance, event log, knowledge, rumor, sifter, caster | `crates/add-core/` | `cargo test -p add-core` |
| ink runtime binding, external functions, tag parsing | `crates/add-core/src/narrative/story.rs` | `cargo test -p add-core` |
| Entities, acts, values, relationship states, patterns, storylet sidecars, reactions, tuning | `packages/add-content/src/content/narrative/` | `npm run content:check` |
| `.ink` prose, choices, scene flow | `packages/add-domain/narrative/story/` | `npm run content:check` |
| Which canon subject a narrative entity implements | `packages/add-content/src/content/lore-refs.ts` | `npm run lore:refs:check` |
| Standing explanation, storylet presentation, dialogue rendering | `packages/add-domain/src/adapters/` | `npm run agent:verify:add-ui` |
| Dialogue panel, choice list, speaker and mood presentation | `apps/add-rpg/src/browser/` | `npm run smoke:add-rpg:built` |
| Narrative scenarios, fuzz corpora, replay fixtures | `scenarios/add/narrative/` | `npm run scenario:add -- scenarios/add/narrative/<id>.json` |

## 1. What the specification assumes, and what already exists

The specification was written against "the homemade Rust engine" in the
abstract. That engine is `crates/add-core`, and it is further along than the
specification assumes in several places and differently shaped in others. This
table is the whole analysis in one view; the sections after it argue the
non-obvious rows.

| Specification concept | State in this repository | Verdict |
| --- | --- | --- |
| A deterministic Rust simulation to host the narrative | `crates/add-core`, 100 tests, 0.03 s | **Exists.** Host it here |
| One seeded generator, no wall clock, no hash-map iteration in decision paths | `GameState.rng_seed: u64`, `DEFAULT_RNG_SEED`, `BTreeMap`/`BTreeSet` throughout `state.rs`, determinism tests | **Exists and already matches** the specification's §10 rules |
| Engine-owned tick and calendar; the core never advances time itself | `GameCommand::Tick` and `RunOfflineCatchup` share `tick_internal` | **Exists.** No `GameClock` trait needed; the narrative reads the same tick |
| Storylets with salience, cooldown, priority, auto-completion | `StoryBeatDef` with `priority`, `sequence`, `repeatable`, auto-complete conditions; nine storylet tests | **Exists in simpler form.** Extend rather than replace |
| Conditions and effects as data | `Condition` (18 variants) and `EffectDef` in `game_data.rs`, authored in TypeScript, code-generated to Rust | **Exists.** The narrative vocabulary extends these enums |
| Deterministic headless runner taking a seed, a save and a command log | `crates/add-scenario` + `crates/add-scenario-runner`, `scenarios/add/*.json` with `{id, seed, commands, checkpoints}` | **Exists.** This *is* `narr replay`, and its format already matches §13 M2 |
| Agent-readable state report | `agent_runtime_v1` (`crates/add-scenario/src/inspection.rs`, `packages/add-domain/src/runtime/inspection.ts`) | **Exists.** Standing goes in its diagnostics channel |
| Content validation, ID registry, explain, reverse lookup, fixtures, version check | `content:check`, `content:validate`, `content:explain`, `content:graph --reverse`, `content:fixtures`, `content:version:check` | **Exists.** This is most of `narr lint`, `narr schema` and `narr explain` |
| Save versioning and forward migration | `CURRENT_SCHEMA_VERSION = 15`, `CURRENT_CATALOG_VERSION = 1`, migration registry, future-save rejection | **Exists.** Narrative state is a migration, not a new save file |
| Performance budgets enforced in CI | `performance/add-budgets.json`, `qa:add-rpg:size`, `qa:add-rpg:trace` | **Exists.** Narrative budgets join this file |
| **A persistent event log** | **None.** `Simulation::apply` begins with `self.state.events.clear()`; `export_save` strips events before serializing | **Missing, and it is the central change.** See §2.3 |
| **Named NPCs and an entity graph** | **None.** `RosterState` is `heroAssigned`, `heroRoleId`, `totalCrew`, `crewByRole` — anonymous counts. No character entities anywhere | **Missing.** The largest new content surface |
| **ink and `bladeink`** | **None.** Story beats are authored data, not scripts | **Missing.** New dependency, needs a spike |
| **Standing axes, values, knowledge, rumor, sifting, casting** | **None** | **Missing.** The system itself |
| **Policy-driven fuzzer, reachability search, calibration, tuning diff** | **None.** The scenario runner executes fixed command logs | **Missing.** Real tooling gaps |
| **A lore-to-content link** | **None** | **Missing.** See the [three-brick contract](lore-engine-content-bricks.md) |

Two numbers frame the effort. The specification targets 500 to 1,000 entities
and 50,000 events. The current game has 12 story beats across 3 arcs, 6
stations, 7 roles, a 127-cell map and no named characters at all. The narrative
system as specified is a larger body of content than the entire existing game.
That is not an argument against it; it is an argument for staging it against
real ADD content from the first milestone, which §4 does.

## 2. Decisions

These five reconciliations are where the specification meets the repository.
Each one exists to avoid a second source of truth.

### 2.1 One authority: `narrative_core` is a module of `add-core`, not a peer

The specification describes `narrative_core` as a crate sitting between ink and
the engine, owning its own `save()`/`load()`, its own `rand_chacha` generator,
and its own `advance_time(now_tick)`.

Adopted as written, that gives the game two save blobs, two random streams and
two notions of when time passed. Every replay, every migration and every
offline catch-up would then have to keep them in step, and nothing would check
that they were. The repository's first architectural rule is one authoritative
gameplay layer, and this would break it on day one.

**Decision.** The specification's module structure is kept exactly — `story`,
`graph`, `log`, `acts`, `sift`, `cast`, `react`, `values` — as
`crates/add-core/src/narrative/`. What changes is ownership of the three
cross-cutting resources:

| Resource | Specification | This repository |
| --- | --- | --- |
| Save | `NarrativeCore::save() -> SaveBlob` | Narrative state is a field on `GameState`, covered by `export_save`/`import_save` and one schema migration |
| Randomness | `narrative_core` owns a `rand_chacha` generator | Narrative draws from `GameState.rng_seed`'s existing stream |
| Time | `narrative_core::advance_time(now_tick)` | `tick_internal` calls into the narrative module; rumor steps run at fixed tick boundaries inside it |
| Facade | `NarrativeCore::step()` / `choose()` | New `GameCommand` variants, dispatched by `Simulation::apply` like every other command |

`WorldOracle` is not needed either: the engine already holds items, positions
and presence in `GameState`, so the narrative module reads them directly rather
than calling back out.

The specification's `emit_act` becomes `GameCommand::EmitAct { act_id, target,
context }`, which means gameplay acts arrive through the same dispatcher,
appear in the same replay logs and are testable by the existing scenario
harness with no new machinery.

If `narrative/` later needs to be a separate crate for compile times, it can be
extracted behind the same types. Extracting it is cheap; unifying two
authorities later is not.

### 2.2 One clock, one generator, already correct

No work is needed here, and that is worth recording. The specification's §10
determinism rules — one seeded generator, no wall-clock reads, no iteration
over hash maps in decision paths, time entering only through an explicit tick —
are already how `add-core` is written. `state.rs` uses `BTreeMap` and
`BTreeSet` exclusively, `rng_seed` is a single saved `u64`, and
`rng_stream_is_deterministic_across_save_reload` and
`command_log_replay_is_deterministic_across_save_reload` already prove the
property the specification asks for.

The narrative module must not introduce a `HashMap` in a decision path, a
`SystemTime` read, or a second generator. `cargo test -p add-core` plus a
committed replay scenario is the check.

### 2.3 The event log is the real change to the save model

This is the most consequential item in the plan and deserves to be stated
plainly.

The specification's principle 2 is that the event log is the source of truth
and standing is derived by replaying it. Today `add-core` does the opposite:

- `Simulation::apply` starts each command with `self.state.events.clear()`, so
  `GameEvent` is a per-frame notification channel, not a history.
- `export_save` clones the state and clears `events` before serializing, and
  the test `export_strips_events_and_load_ignores_them` locks that in.

So there is no history to derive anything from. Introducing one changes what a
save *is*.

**Decision.** Add a persistent, append-only `NarrativeLog` as a new field on
`GameState`, separate from the existing per-frame `events` channel. Keep both:

| Channel | Lifetime | Purpose |
| --- | --- | --- |
| `GameState.events` | Cleared every command | UI notifications, audio cues, per-frame telemetry. Unchanged |
| `GameState.narrative.log` | Append-only, saved | Consequential acts, witnesses, knowledge, causes. The narrative source of truth |

Consequences to plan for, all of them tractable:

- **A schema migration.** This bumps `CURRENT_SCHEMA_VERSION` to 16. It is
  additive, so `#[serde(default)]` covers old saves and the migration registry
  stays empty — but a save fixture at v15 must be committed before the bump so
  the upgrade path is regression-tested, not just framework-tested.
- **Save size.** The current save is about 24.7 KB. The specification's §10
  budget is 50,000 events with compaction of fully decayed impacts and dead
  rumors. Compaction is a milestone, not an afterthought; until it lands, cap
  the log and fail loudly rather than degrading quietly.
- **Replay on content change.** The specification's payoff — retune the tables,
  replay the log, keep the history — fits this repository well, because
  `CURRENT_CATALOG_VERSION` already exists to record which content build a save
  assumed. Wire the replay-on-catalog-change path to that field.

### 2.4 One content pipeline, not two

The specification's §12 authors all world data as RON files compiled by `narr
build` into a `world.bin`. This repository authors content as TypeScript
modules, validated and code-generated into Rust catalogs by
`scripts/build-add-content.cjs`, with a drift check, a golden catalog snapshot,
a single ID registry, an explainer, a reverse-dependency lookup, fixture
generators and a version check.

Adopting RON would create a second content pipeline: a second file format, a
second validator, a second ID namespace, a second `explain`, a second reverse
lookup, and a second thing that can drift from the Rust it produces.

**Decision.** Keep the specification's data model exactly — every field, every
enum, every default in §5A, §5B and §12 — and change only the file format.
Narrative world data is authored as TypeScript under
`packages/add-content/src/content/narrative/` and code-generated into
`crates/add-core/src/game_data/catalog/narrative/` by the existing generator.

What this buys, at no design cost:

- One ID namespace, so an act, an entity and a station cannot collide, and
  `content:explain -- act.kill_prisoner` works the day the act exists.
- `content:graph --reverse` answers "what uses this entity?" for free.
- The golden catalog snapshot proves a tuning change is intentional.
- `content:version:check` already reconciles content and save versions.
- Agents authoring content already have `npm run content:explain` and the
  registry as context, which is the specification's own `narr schema` goal.

What is genuinely lost: RON is more pleasant for the deeply nested act and
tuning literals, and the specification's examples are written in it. The
generator already handles nested tagged unions for `Condition` and `EffectDef`,
so the shapes are expressible; the cost is transcription, once.

`.ink` files are the exception. They are prose, not data, and they are
compiled by a different tool. They live at
`packages/add-domain/narrative/story/`, and their compiled JSON is a generated
artifact registered in `performance/generated-files.json` alongside the WASM.

If the RON format is preferred after all, the honest version of that choice is
to replace `build-add-content.cjs` for *all* content families, not to run two
pipelines side by side.

### 2.5 Hidden scores and the agent-readable report

The specification is emphatic that the player never sees an axis, a number, a
band word or a state name (§5, §14). This repository is equally emphatic that
an agent can read the full authoritative state through `agent_runtime_v1`.

These are compatible, but only under an explicit rule, because the obvious
implementation leaks numbers into the UI.

**Decision.** Standing, values, knowledge and sifter state are exposed in the
report's **diagnostics** channel only, never in derived presentation. Concretely:

- `authoritative` may carry the narrative log and raw axes — it is the truth.
- `derived` carries what the player is shown: the line, the choices, the
  speaker, the mood tag. It must not carry a band name, an axis value, a
  relationship-state id or a stance.
- `diagnostics` carries standing, bands, states, stances, value profiles, open
  sifter matches and `explain` traces, for tools and tests.

A player-facing QA fixture should assert the negative: that no band word, axis
name or state id appears in any rendered DOM text. That check is cheap and it
is the only thing that will keep a debugging panel from quietly becoming a
feature.

## 3. Prerequisites

Two open defects in the current runtime must be closed before the narrative
system lands, because it would multiply both.

**P0 — the WASM snapshot serializer.** `crates/add-web-bindings/src/lib.rs`
serializes with bare `serde_wasm_bindgen::to_value`, which emits a JS `Map` for
every Rust `BTreeMap`, while `packages/add-domain/src/runtime/protocol.ts`
declares those fields as `Record<string, …>`. Selectors shim around it
inconsistently, and three player-facing panels are wrong as a result.

The narrative system is built almost entirely out of maps keyed by entity:
standing per entity per axis, knowledge sets, NPC-to-NPC edges, value profiles,
storylet cooldowns. Shipping it on top of an unfixed serializer would multiply
the defect surface by roughly an order of magnitude. Fix
(`Serializer::json_compatible()`) and delete the shims first.

**P0 — the TypeScript build graph.** Six packages (`game-assets`, `game-map`,
`game-input`, `office-domain`, `asset-registry`, `game-renderer-phaser`) omit
`tsBuildInfoFile`, so their build info lands outside the gitignored `dist/` and
a stale build-info makes `tsc -b` skip the rebuild forever. This currently
fails `npm run verify`, `agent:verify:*` and `npm run check`. A subsystem of
this size cannot be built against a verification ladder that does not run.

**P1 — structured command results.** `Simulation::apply` returns
`CommandOutcome { accepted, blocker, events }`, with `blocker` using the stable
`BlockerKind` catalog IDs. The WASM boundary exposes the same result and the
command picker consumes the Rust outcome plus catalog-owned blocker labels, so
the narrative system can satisfy specification principle 7 ("explainable on
demand") without a second TypeScript gate evaluator.

## 4. Implementation plan

Eight milestones. The specification's M1 to M7 are kept in order and in intent;
N0 is added for the prerequisites and the dependency spike, and each milestone
is bound to a player-visible ADD outcome so the system is never a demo beside
the game.

Each milestone ships with a task brief filled from
[`docs/templates/add-task-brief.md`](templates/add-task-brief.md).

### N0 — Prerequisites and the bladeink spike

*Player outcome:* none directly; the inventory, expedition and station panels
stop disagreeing with the simulation.

- Close both P0s from §3 and land `CommandOutcome`.
- Spike `bladeink` and `bladeink-compiler` against a pinned version, in a
  throwaway branch, answering exactly the questions the specification's §14
  risk table raises:
  1. Does the compiler exist as a usable Rust crate, or is a Node/`inklecate`
     step required in the content build?
  2. Can a story be jumped to a knot **with arguments** from Rust? Storylet
     casting depends on it; the fallback is an ink-side dispatch knot.
  3. Can the story's random seed be set and saved?
  4. Do named flows work as documented?
  5. Does it compile to `wasm32-unknown-unknown`, and what does it add to the
     1,058 KB WASM and the budget in `performance/add-budgets.json`?

  Question 5 is the one that can change the plan. `wasm-opt` is currently
  disabled; enabling it is the first lever if the budget is threatened.

*Accepted when:* `npm run verify` passes, and the spike answers all five
questions in a committed note with a measured WASM delta.

### N1 — ink in the game

*Player outcome:* one existing ADD story beat is delivered as an ink scene, in
the real app, with the same choices and the same effects.

- `crates/add-core/src/narrative/story.rs`: own the `bladeink::Story`, bind
  externals, parse `key:value` tags, step dialogue.
- `GameCommand::StepStory` and `GameCommand::ChooseStoryOption` extended to
  carry an ink choice index; ink state serialized into `GameState`.
- `# speaker:`, `# mood:`, `# sfx:`, `# camera:` tags forwarded through the
  existing snapshot to the browser; `# locked:` rendered as a disabled choice.
- The hidden/visible gate rule from §4 of the specification, including the lint
  that every `locked` choice has an unlocked twin.

*Accepted when:* the beat plays in `apps/add-rpg`, survives save/load, and a
committed scenario reproduces it headlessly.

### N2 — Tools before content

*Player outcome:* none; this is the safety net for everything after it.

The specification puts the fuzzer early on purpose, and this repository should
too, because the scenario harness already does half the job.

- `narr` subcommands implemented as an extension of the existing scenario
  runner, not a new binary (see §5).
- `fuzz`: policy-driven playthroughs (uniform, first, last, maximize one axis,
  minimize, maximize secrecy, novelty-seeking), coverage per knot, choice and
  storylet.
- `schema`: one JSON export of the full vocabulary, for agent context.
- Strict lint rules for narrative IDs folded into `content:check`.

*Accepted when:* 10,000 fuzz runs finish with no error and no dead end, and a
replay reproduces byte-identical output.

### N3 — Standing, acts, and values

*Player outcome:* helping or harming a named survivor changes what they and
their group will do for the hero, hours later, without any number being shown.

- `graph`, `log`, `acts`, `values` modules: eleven raw axes, derived
  constructs, the impact pipeline with all nine modifiers, tiers, saturation,
  decay, inheritance by group kind, ledgers, value profiles and the circle
  verdict.
- The event log from §2.3, with the schema migration and a committed v15 save
  fixture.
- First narrative content: a handful of named individuals bound by `loreRef` to
  existing `lore/characters/` and `lore/factions/` subjects. Start with the
  Sleepless in Decibels and the Unplugged, which already have deep lore.
- `GameCommand::EmitAct` so gameplay acts — clearing a location, engaging a
  creature, recruiting — enter the same log as dialogue acts.
- `narr explain` printing the full product: tier, every factor with its input,
  headroom, decay.

*Accepted when:* one dialogue act and one gameplay act each change available
options for an individual, a sub-faction peer and a faction stranger, at three
different strengths, proven by a committed scenario with checkpoints.

### N4 — Knowledge, witnesses, rumor

*Player outcome:* the same act, witnessed or unwitnessed, leads to different
scenes days later. Secrets become mechanically real.

- Secrecy, witnesses supplied from `GameState` presence, ties, tick-driven
  rumor with fidelity decay and a spreading floor.
- `knows`, `heard_firsthand`, `anyone_knows`, `tell`, `silence` externals.
- Rumor steps at fixed tick boundaries inside `tick_internal`, so offline
  catch-up produces the same result as playing through.

*Accepted when:* a committed pair of scenarios differing only in witness
presence diverges, and a distant faction reacts measurably more weakly than a
close one.

### N5 — Causality, sifting, reactions

*Player outcome:* a character refers to something the player did, by name, and
explains why it matters now.

- Gate-derived causes (the cheap trick: gating and causality are the same
  bookkeeping), act-declared and explicit causes.
- Incremental sifter over authored patterns; the starter library from §7.
- Reaction rules with cooldowns, binding limits, chain depth 8, cycle lint and
  cascade-size reporting in the fuzz report.
- `narr graph` exporting the entity graph and the causal event graph.

*Accepted when:* `mercy_repaid` and `broken_oath` are detected in fuzz runs and
referenced in dialogue.

### N6 — Storylets and casting

*Player outcome:* scenes arrive that are about the specific people the player
has history with.

- Storylet sidecars, role solver seeded from entities present, salience
  scoring, hubs with a guaranteed fallback.
- `narr reach` for gated-choice reachability.
- Coverage report: storylets never cast, patterns never matched, acts never
  emitted, axes no act moves.

*Accepted when:* one two-role storylet fires with at least five distinct casts
across fuzz runs, and no hub stalls.

### N7 — Scale and hardening

*Player outcome:* the game stays fast as the world fills.

- Log compaction, act coalescing, `narr calibrate`, `narr diff-tuning`.
- Narrative budgets added to `performance/add-budgets.json` and checked by
  `qa:add-rpg:trace`.

*Accepted when:* the specification's §10 budgets hold at 1,000 entities and
50,000 events, measured by the existing trace harness.

N1 to N3 are the minimum for a vertical slice. N4 is the first point where the
system feels different from a conventional reputation bar.

## 5. Tooling plan

The specification proposes one `narr` binary with eleven subcommands. Roughly
half of them already exist in this repository under different names, backed by
the scenario harness and the content registry. Building `narr` as a fresh
binary would duplicate them and split the artifact conventions.

**Decision.** `narr` is a front-end over existing machinery: new subcommands
are added to `crates/add-scenario-runner` (which already loads content, runs
commands and emits normalized state), and the content-side subcommands alias
into `scripts/add-content-tools.cjs`. Every subcommand keeps the repository's
existing `--json` result contract and writes to
`artifacts/agent-verification/<run-id>/`.

| Specification command | Existing equivalent | Work required |
| --- | --- | --- |
| `narr lint` | `npm run content:check`, `content:validate` | **Extend.** Narrative ID resolution, ink-to-data ID validation, the `locked`-twin rule, unused-ID errors |
| `narr replay <file>` | `npm run scenario:add`, `agent:scenario` | **Extend.** The scenario format already carries seed, commands and checkpoints; add narrative checkpoints |
| `narr explain <save> <entity> <axis>` | `npm run content:explain`, `agent:state` | **Extend.** Add the standing trace: tier, factors, headroom, decay, knowledge hops |
| `narr graph` | `npm run content:graph --reverse` | **Extend.** Add entity graph and causal event graph as DOT |
| `narr schema` | content registry | **Extend.** One JSON vocabulary export for agent context |
| `narr play` | `npm run agent:state`, the browser app | **Extend.** Terminal player with a diagnostics side panel |
| `narr fuzz -n 10000` | — | **New.** Policy-driven playthroughs and coverage |
| `narr reach` | — | **New.** Static gate analysis plus guided search |
| `narr generate` | `npm run content:fixtures` | **New.** Value-profile generation from group rules and the world seed, output committed to `packages/add-content/src/content/narrative/generated/` |
| `narr calibrate` | — | **New.** Band distribution per axis at 25, 50, 100 percent of a playthrough; dead-axis and runaway flags |
| `narr diff-tuning <a> <b>` | — | **New.** Replay a fixed corpus under two tunings and report which gates flipped |
| `narr build` | `npm run content:check` | **Not needed.** The existing generator is the build step |

Five genuinely new capabilities, six extensions, one dropped. That is a much
smaller tooling bill than the specification implies, and it keeps one set of
commands for contributors to learn.

**Fuzzer and CI.** `narr fuzz` is expensive, so it belongs with the phase gate
(`npm run check`), not the focused loop. `narr lint` and a small
smoke corpus belong in `npm run verify`, which is the pre-commit hook.

## 6. Documentation plan

Five documents, in this order.

1. **[`narrative-system-specification.md`](narrative-system-specification.md)**
   — imported, and kept verbatim as the design of record. Changes to the design
   are re-imported from the source document, not edited in place, so it stays
   diffable against the author's copy.
2. **[`lore-engine-content-bricks.md`](lore-engine-content-bricks.md)** — the
   boundary contract. Written; needs the `lore_ref` mechanism it describes.
3. **This plan** — kept current as milestones land; each completed milestone
   moves from "planned" to a row in the parity audit.
4. **`docs/add-narrative-authoring.md`** (N3) — the authoring guide: how to add
   an entity, an act, a relationship state, a pattern, a storylet; which tier
   to pick and why; the rule that writers never write numbers. It is the
   counterpart of `add-content-authoring.md` and should be routed from it.
5. **`docs/add-narrative-runtime.md`** (N1) — the ink-to-Rust boundary: the
   external function table, the tag vocabulary, what is pure and what has
   effects, and the hidden-score contract from §2.5.

Also updated as the work lands:

- `README.md` — canonical documentation list and source layout.
- `docs/add-capability-map.md` — one route row and one command row per
  milestone; the map is the first thing a contributor or agent reads.
- `docs/story-content-engine.md` — the existing story contract gains a pointer
  saying that narrative acts and standing are the same content graph seen
  through a different projection.
- `docs/add-systems-parity-audit.md` — the factual implemented-versus-planned
  inventory, which is where a landed milestone is recorded.
- `docs/add-generated-files.md` — compiled ink JSON and generated value
  profiles are new generated outputs with new producers.

## 7. Performance

The specification's §10 budgets are compatible with this repository's existing
budget file and trace harness, and should be expressed in them rather than
tracked separately.

| Operation | Specification budget | Where it is checked |
| --- | --- | --- |
| `standing()` or `rel()` query | under 50 µs | `qa:add-rpg:trace` stage, new budget key |
| `emit_act` | under 0.5 ms | `qa:add-rpg:trace` |
| Rumor step | under 5 ms | `qa:add-rpg:trace` |
| Storylet selection at a hub | under 5 ms | `qa:add-rpg:trace` |
| Load with log replay | under 2 s | `scenario:add` timing assertion |
| WASM size after bladeink | not in the specification | `performance/add-budgets.json`, `qa:add-rpg:size` |

The last row is the one the specification does not anticipate, because it
assumes a native engine. ADD ships the simulation as WASM into a Web Worker:
1,058 KB today, with `wasm-opt` disabled and a size budget already enforced.
The N0 spike must measure the bladeink delta before any content is written.

One simplification falls out of the same fact. The specification's threading
note — `bladeink::Story` is `Rc<RefCell>` and not `Send`, so `narrative_core`
must run on one thread and exchange messages over channels — is already
satisfied: the worker is single-threaded and the runtime is already message-
driven through `SimulationClient`. No channel layer is needed.

## 8. Risks

| Risk | Why it matters here | Mitigation |
| --- | --- | --- |
| `bladeink-compiler` is not a usable Rust crate | The whole ink layer depends on it | N0 spike question 1; fallback is an `inklecate` step in the content build, producing a generated artifact like the WASM |
| No argument-passing jump to a knot | Storylet casting depends on it | Specification's own fallback: an ink-side dispatch knot; confirmed or rejected in N0 |
| WASM growth breaks the size budget | The budget is already enforced and the bundle is already large | Measure in N0; enable `wasm-opt`; lazy-load the story JSON separately from the WASM |
| A second gameplay authority emerges anyway | The specification's facade invites it | §2.1 is a contract, not a preference. An architecture test should assert that `narrative/` exposes no `save`, no generator and no clock of its own |
| The event-log migration corrupts saves | It changes what a save is | Additive field, `#[serde(default)]`, a committed v15 fixture before the bump, and `content:version:check` |
| Content mass outruns verification | The system needs 10× the current content | Tools before content (N2); strict lint; `narr schema` as agent context |
| Invisible consequences | Scores are hidden by design, so late quiet effects read as bugs | Specification's principle 4 is mandatory; the fuzz report flags large standing shifts no dialogue ever acknowledges |
| Standing leaks into the UI | The easiest implementation shows the number | §2.5 diagnostics-only rule plus a negative DOM assertion in the player-facing QA fixtures |
| Lore and narrative content drift apart | 389 lore files, no link to content today | `loreRef` and `lore:refs:check` from the brick contract, landing with N3 |
| The system becomes a demo beside the game | It is big enough to develop its own gravity | Every milestone in §4 has a player-visible ADD outcome and ships through `apps/add-rpg` |

## 9. Focused verification

| Stage | Command |
| --- | --- |
| Narrative rules, log, standing, sifter | `cargo test -p add-core` |
| Narrative content and generated catalogs | `npm run content:check` |
| One narrative ID | `npm run content:explain -- <id>` |
| Headless narrative scenario | `npm run scenario:add -- scenarios/add/narrative/<id>.json` |
| Agent-readable narrative state | `npm run agent:state -- --save <path>` |
| Lore-to-content links | `npm run lore:refs:check` |
| Dialogue in the real app | `npm run smoke:add-rpg:built` |
| Coverage and reachability | `narr fuzz -n 10000`, `narr reach` (planned, phase gate only) |

## 10. Explicit non-goals

- No free-running NPC simulation. NPCs act only through authored reaction
  rules, as the specification states.
- No procedural or model-generated prose at runtime.
- No second save file, generator, clock, content format, or ID namespace.
- No `narr` binary that duplicates `scenario:add`, `content:explain` or
  `content:graph`.
- No narrative content authored before N2 lands the tools that check it.
- No reorganization of `lore/`, `crates/` or `packages/` to serve this plan.
  The bricks are formalized where they already are.
- No office/platform-lane changes.

## 11. Known gaps

- The N0 spike has not run, so the ink layer's feasibility and its WASM cost
  are both unmeasured. Every milestone after N1 is conditional on it.
- The entity graph has no content yet. The lore it binds to is addressed by
  path rather than by a front-matter id; that decision is now made and recorded
  in the brick contract.
- The specification's calibration targets (§5A) assume content to fuzz. Until
  N3 produces some, the tier and modifier tables are unvalidated defaults.
- Offline catch-up over a long gap must produce the same rumor spread as
  playing through it. The fixed-tick-boundary rule in §2.1 is intended to
  guarantee that, but it needs a dedicated scenario pair to prove it.
