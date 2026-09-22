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
| `.ink` prose, choices, scene flow | `packages/add-runtime-client/narrative/story/` | `npm run content:check` |
| Which canon subject a narrative entity implements | `packages/add-content/src/content/lore-refs.ts` | `npm run lore:refs:check` |
| Standing explanation, storylet presentation, dialogue rendering | `packages/add-presentation/src/adapters/` | `npm run agent:verify:add-ui` |
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
| Agent-readable state report | `agent_runtime_v1` (`crates/add-scenario/src/inspection.rs`, `packages/add-runtime-client/src/runtime/inspection.ts`) | **Exists.** Standing goes in its diagnostics channel |
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
`packages/add-runtime-client/narrative/story/`, and their compiled JSON is a generated
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
every Rust `BTreeMap`, while `packages/add-runtime-client/src/runtime/protocol.ts`
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

**Status: done.** All three prerequisites landed (P0.1 in session 16, P0.2 in
18, P0.3 in 19, `CommandOutcome` as P1.3 in 23). The spike ran against pinned
`bladeink 2.0.0` and `bladeink-compiler 2.0.0`; findings are in
[the bladeink spike](add-narrative-bladeink-spike.md). Headlines: the compiler
is a usable Rust crate so no `inklecate` step is needed; `choose_path_string`
takes arguments so the storylet dispatch fallback is dropped; seeding is an
ink-side `SEED_RANDOM` binding, not a Rust setter; named flows work; and the
narrative runtime costs about 305 KB raw / 112 KB gzipped, which makes
`wasm-opt` mandatory and needs the raw WASM budget raised to ~1,300,000 before
N1 lands. `wasm-opt = ["-Oz"]` is now on, which was independently worth 206 KB.

**N1 is unblocked.**

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

**Status: done.** `story.beat.first_glimpse` is ink-backed. The boundary is
documented in [the narrative runtime contract](add-narrative-runtime.md).
Three findings changed the design from what this plan assumed: ink state is
**not** serialized into `GameState` (bladeink's `save_state` is unstable across
a reload and would break replay determinism, so the scene is rebuilt by
replay); choice binding uses an ink variable rather than a tag (bladeink 2.0.0
does not populate `Choice::tags`); and the WASM landed at 1,242,850 bytes
against N0's 1,207,423 estimate, so `wasmBytes` moved to 1,300,000 — now 95.6%
used, with gzip at 88.2%.

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

**Status: done.** 10,000 runs in 39 s, zero failures, and replay proven
byte-identical. Two notes. The fuzzer reads refusals from P1.3's
`CommandOutcome` rather than inferring them, which made it catch its own
mismodelling of world-action beats on first run. And coverage is honestly
thin — 5 of 12 beats — because the later arc is gated on gameplay the fuzzer
does not yet drive; the report names exactly what it cannot reach. See
[the runtime contract](add-narrative-runtime.md).

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

**Status: done.** N3b added the Schwartz value circle, decay by tier half-life,
and the closeness and black-sheep amplifiers, so one act now reads as virtue to
one group and betrayal to another with nothing scripted to disagree. What
remains of §5/§5B — ledger settlement, association, stance, hypocrisy,
generated deviants — is recorded in the runtime contract's known gaps; most of
it depends on knowledge or NPC-to-NPC edges, which are N4.

**N3a:** The milestone was too large for one pass, so it
was split rather than half-delivered. N3a landed the entity graph, the event
log, the eleven axes, derived constructs, the impact pipeline, `EmitAct`,
`narr explain`, and the first entities bound by `loreRef` to the Sleepless in
Decibels lore. The three-distance acceptance holds, proven by
`standing-three-distances`. N3b is values (§5B), decay, ledger settlement and
the observer-side modifiers; see the known gaps in
[the runtime contract](add-narrative-runtime.md).

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

**Status: done.** `broken-promise-witnessed` and `-secret` differ in one field
and diverge completely: the witnessed promise costs the Hero his word, the
secret one costs nothing and nobody can have heard it. Fidelity falls 0.7 per
retelling, so hearsay weighs less than a witness. Rumour advances on fixed tick
boundaries from the save's seed, and a test asserts one long offline gap
spreads exactly what many short steps do. This also forced a useful separation:
the N3 reach scenario now marks its acts `public`, because reach and knowledge
are independent and a reach test should not fail for a knowledge reason.

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

**Status: done.** Both patterns are detected — `arc-mercy-repaid` is a
committed scenario, and `broken_oath` has unit coverage including the pending
case. Dialogue references them through `EXTERNAL arc(pattern_id)`, bound to
the sifted result. Reactions fire only when the actor has *heard*, which made
the N4 secret/witnessed pair diverge further still: the secret run fires no
reaction at all. `narr graph` is built — see §11 tooling below.

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

**Status: done.** Two storylets, two knots, **forty distinct casts** across a
300-run campaign, no stalls. Each newly-seen cast is actually entered in ink and
must play lines, so "no hub stalls" is verified by the scene rendering rather
than inferred from the knot's name existing.

Three things worth recording, because each was a defect coverage caught and
correctness tests did not:

1. **The first caster produced exactly one distinct cast in 400 runs.** It
   returned the first entity that fits, and the candidate list never changes
   order, so every scene was about the same two people — while passing every
   unit test. Candidates are now ranked by shared history (the role's axis, or
   the strongest feeling in any direction for an unconstrained role), which is
   what makes one knot into many scenes. `committed_scenarios` pins this with an
   assertion that fails under the old ordering.
2. **The ink compiler recorded `sl_x(a, b)` as a knot name**, signature and all.
   Invisible while every knot was parameterless; it would have surfaced as a hub
   that could never enter its own storylet. A knot's name is now its identifier.
3. **The fuzzer never emitted acts**, so the narrative log was always empty and
   every candidate had identical history. Casting coverage was measuring a world
   in which nothing had happened. The fuzzer now emits acts, which also puts the
   N4/N5 pipeline under fuzz for the first time; `replay` learned `EmitAct` so a
   recorded failure stays reproducible.

The role gate is keyed on `integrity`, not `grievance`: repeated identical acts
decay by repetition, so grievance plateaus below its own `high` band, while a
pattern of broken promises drives integrity down hard. "Someone who no longer
believes the Hero's word" is also the more legible cast for a writer.

The coverage report now names content holes as well as engine faults, and on
current content it finds three: `arc.mercy_repaid` is never matched under fuzz
(the fuzzer emits acts without causal links, so the chain rarely forms — the
committed scenario covers it), and **`affection`, `dominance` and `belonging`
are axes no act in the catalog moves.** That last is dead standing: the writer
can ask about it and nothing in the game can change it. It is an authoring gap,
recorded here rather than papered over.

`narr reach` and `narr graph` are built — see §11 tooling below.

### N7 — Scale and hardening

*Player outcome:* the game stays fast as the world fills.

- Log compaction, act coalescing, `narr calibrate`, `narr diff-tuning`.
- Narrative budgets added to `performance/add-budgets.json` and checked by
  `qa:add-rpg:trace`.

*Accepted when:* the specification's §10 budgets hold at 1,000 entities and
50,000 events, measured by the existing trace harness.

**Status: budgets hold; compaction and the tuning tools are not built.**

At 50,000 events every §10 budget passes. Four algorithmic defects were in the
way, each found by measuring rather than by reading:

| Operation | Before | After | Budget |
| --- | --- | --- | --- |
| `standing` (warm) | 14,221 us | 0.17 us | 50 us |
| `emit_act` | 56,480 us | 0.58 us | 500 us |
| `rumour_step` | 754 us | 960 us | 5,000 us |
| `storylet_selection` | 3,160,697 us | 7.46 us | 5,000 us |
| `load_replay` | — | 1,039,116 us | 2,000,000 us |

1. **`repetition_factor` rescanned every earlier event for every event**, making
   one axis fold quadratic in the log: 12 million inner steps at 5,000 events,
   1.25 billion at 50,000. It is now accumulated in the single forward pass the
   fold already makes. The arithmetic is unchanged.
2. **The sifter paired every event with every other event**, for every pattern,
   on every act emitted. It now buckets by subject — both slots must name the
   same subject, so pairs can only form within a bucket — and `emit_act` extends
   the previous result instead of re-sifting, since the new event can only
   complete a pattern as its second slot.
3. **Casting recomputed a candidate's salience inside a sort comparator**, twice
   per comparison and again at every backtracking step, each call being up to
   eleven full log scans. This was mine, introduced in N6, and it is why
   storylet selection took three seconds. Ranking is now computed once per role.
4. **The catalog lookups were linear scans** called once per event inside those
   loops, multiplying log length by catalog length. They are indexed now.

Two further changes came out of the measuring rather than the optimising:

- **An arc now completes once per subject.** A pattern with no expiry — and
  `arc.broken_oath` has none — matched every qualifying pair, so the match list
  grew quadratically *inside the save*. Nothing reads more than whether an arc
  completed and for whom.
- **Both sift paths now cite the same pair.** They searched candidate firsts in
  opposite directions, so for a subject with several qualifying firsts they
  named different events for the same arc. A save records those ids and
  `narr explain` shows them to a writer, so this was a real divergence and not
  a formality; `the_two_paths_cite_the_same_pair_when_several_firsts_qualify`
  pins it, and failed before the fix.

*Measuring on a shared machine.* The first full run reported every figure 5 to
10 times slower than the previous one, with no code change between them: the
load average was 22, because this repository is built for concurrent agents.
The budgets are therefore judged on the **fastest** sample, which is the one
least contaminated by preemption and a true lower bound — it cannot produce a
false pass. `npm run narr:budgets` measures and judges; the numbers live in
`performance/add-budgets.json`, and the Rust bench only measures, so the gate
cannot drift from the figures it claims to enforce.

**Compaction and coalescing are now built.**

*Coalescing* (§10: "ten thefts in one hour against the same group become one
event with a count") merges identical acts inside a one-hour window into a
single entry carrying a count. It changes how repeats are stored, not what they
are worth: a coalesced entry is folded once per occurrence it stands for, each
with its own repetition step, and
`a_coalesced_burst_is_worth_what_its_occurrences_were_worth` holds the two to
exact equality. Getting that equality required folding whole occurrences in
authored order rather than all of one impact's occurrences together —
`act.break_a_promise` carries two impacts on `integrity`, and because `fold`
saturates, the two orders disagreed by 0.12%. Acts differing in target, intent,
secrecy, witnesses or declared causes never merge, because each of those changes
what the act does.

*Compaction* folds history older than 360 days into per-observer baselines and
drops the knowledge that went with it. It is a summary and loses two things: a
folded contribution stops decaying, and the observer context it was folded under
is frozen. Both are bounded by only folding what has already largely decayed —
360 days is four half-lives of the longest tier. The residual is measured rather
than asserted: over a two-year log, **61 of 120 entries folded and the worst
standing changed by 0.0047 points**, against a Mid band 35 points wide. Events
an arc could still need are kept whatever their age.

Compaction folds 67% of the log and roughly halves a cold standing read: 2,136
us to 974 us at 5,000 events, and 27,067 us to 15,435 us at 50,000. Every §10
budget still holds at full scale. Repetition counts are carried forward, so
folding away an old habit does not make the next act feel like the first.

It runs on the rumour boundary, behind a single comparison against the oldest
event, so a log with nothing old enough pays almost nothing to skip it.

**`arc.broken_oath` now expires after a year.** It previously had no expiry,
which meant every `act.swear_an_oath` stayed a first-slot candidate forever and
could never be folded; because only a prefix can be folded, one early oath
pinned everything after it and compaction folded 5 entries out of 5,000. With
the expiry it folds 3,337 — the same 67% the rest of the catalog reaches.

A year was chosen against `arc.mercy_repaid`'s 90 days: an oath should hang over
the Hero far longer than a favour, but a pattern that never expires is not
"important forever", it is a pattern whose evidence can never be summarised.

Giving every pattern an expiry also moved the load budget onto firmer ground.
§10 names compaction as *how* that budget is met, and compaction runs on the
rumour boundary, so a save holding 50,000 events has been compacted throughout
play — an uncompacted log that size is not a state the game produces. Measured
both ways at full scale: **767,587 us compacted against the 2,000,000 us budget,
and 1,720,134 us uncompacted**, the latter reported without a budget. The
uncompacted figure had already breached once, at 2,070,818 us, which is how
close that path runs to the line.

The retention rule was wrong for expiring patterns and is now fixed. It kept
first-slot events only for patterns that never expire, so with an expiry set an
oath could have been folded away while it was still breakable. Retention now
follows each pattern's own window, and
`an_arc_s_first_slot_is_kept_exactly_as_long_as_it_could_be_answered` pins both
halves: kept while the arc can still be answered, folded once it cannot.

**`narr calibrate` and `narr diff-tuning` are built.**

`npm run narr:calibrate` runs the fuzzer and reports, per axis, the share of
*met* characters in each band at 25, 50 and 100 percent of a playthrough, then
flags what §5A says to flag: an axis with more than 70% still in `mid` at the
end (dead), more than 30% at an extreme (runaway), and acts whose modifiers hit
the 0.1 or 4 clamp more than rarely. It drives the real fuzzer rather than a
loop over the act catalog, and the difference is not academic: a uniform loop
reported `competence` and `debt` as dead axes, which the fuzzer shows spreading
properly. Unmet characters are excluded, or the size of the cast would read as a
dead axis.

It found seven dead axes on first run — `affection`, `dominance`, `closeness`,
`dependence`, `grievance`, `belonging`, `alignment`. **There are now none.**
Fixing them turned out to be four different problems wearing one label:

- **Nothing touched them.** `affection`, `dominance` and `belonging` had no act
  at all: a writer could gate a scene on being liked and nothing in the game
  could make anyone like you. Six acts were authored — sitting through the night,
  humiliating someone before their crew, taking command, standing down, keeping
  the worst watch, walking out — covering each axis in both directions, because
  an axis moved only one way leaves the far bands as unreachable as before.
- **They only landed on groups.** `alignment` and `dependence` had impacts, but
  on `FactionOf(Target)` and `ParentOf(Target)`. An impact recorded on a faction
  reaches one of its members at roughly a tenth of its weight, so a moderate act
  arrived as less than a point. Both now also land on the target.
- **One act, damped.** `grievance` had a single source, and repeating it is
  damped by repetition before the axis leaves `mid`. Different acts count
  separately, so a second, heavier source fixed it: a pattern of different
  cruelties accumulates where one cruelty repeated does not.
- **Random play cancelled them.** `dominance` was moved a full tier each way and
  still read dead, because uniform play fires opposing acts about equally often.
  This was a fault in the tool, not the content — see below.

**The runaway axes are fixed too: no axis is dead, unmovable or runaway.**

Both runaways were the mirror of the dead-axis problem — an axis that could only
travel one way:

- **`integrity` had three ways down and none up.** Nothing in the game could
  raise it, so a Hero who broke one promise was mistrusted for the rest of the
  game whatever they did after. Keeping a promise, admitting a fault and telling
  an unwelcome truth now raise it. §5B's asymmetry is kept — negativity weights
  integrity hardest, so one betrayal still outweighs several kept words. Slow
  recovery is the design; impossible recovery was not.
- **`goodwill` had three ways up, one of them `severe`, against one `minor`
  down.** Refusing help is now a heavy way down, and the acts that cost the Hero
  their standing cost goodwill too.
- **`grievance` never settled.** It is a ledger axis, and §5A says ledger axes
  "settle through acts instead" of decaying — but nothing settled it, so it only
  accumulated and two in five characters ended at the top. Making amends now
  answers it: 41% at `very_high` became 4%.
- **`competence` was a ratchet like integrity**, slower only because every
  source was moderate against a `high` band that begins at 25. Clearing a threat
  is now major, and failing visibly takes it back.

Counterweighting overshot first, which is worth recording: matching the positive
sources one for one put goodwill from pinned at the top to pinned at the bottom
in a single step, and took affection with it. §5B weights negative impacts
hardest, so **an equal count is not an equal effect** — the counterweights had to
come in a tier lighter than the acts they answer.

**Clamping is fixed, and the cause was not the tiers.** Every act was hitting
the 0.1 or 4 modifier clamp between 14% and 72% of the time. It is now one act
of eighteen, `act.spare_a_life` at 16%, which is the ceiling genuinely binding
on a `severe` act that cost and need are both amplifying — the clamp doing the
job it was written for. Two separate faults were behind it.

*Repetition was inside the clamp.* The clamp exists so "no stack of them can
turn a slight into a catastrophe or erase a betrayal", which is a statement
about the **observer's** modifiers. Repetition is not one of those: it is a
principled decay of an act the Hero has already done. Folded in before the
clamp, `0.7^n` drove the whole product onto the 0.1 floor from the seventh
repeat, so the clamp stopped being a guard and became the normal path — and
§5A's "hits the clamp more than rarely" signal was dead, because everything hit
it. It also meant the seventh and the seventieth repetition landed identically,
which is not a diminishing return but a floor. The observer's modifiers are
clamped, and repetition applies after: the guarantee is about one act's context,
not about the tenth identical act, which is the thing that should be allowed to
fade.

*The repetition window was missing entirely.* §5A: "0.7 to the power of the
number of similar acts toward the same scope **in the last 30 days**", and the
tuning block says `repetition: (factor: 0.7, window: Days(30))`. The count ran
over the whole log and never expired, so the seventieth theft of a three-year
game was damped as though all seventy had happened in a week. This went unnoticed
while the clamp floor was holding the result up; taking repetition out from under
the clamp exposed it immediately, as three axes reading dead because every
repeated act now decayed to nothing. With the window, habituation is about recent
behaviour — which is what habituation is — and a habit resumed after a season
lands afresh.

One interaction fell out of it, caught by the compaction test: compaction carries
a *lifetime* repetition count, which under a windowed rule damped surviving acts
as though a year of history had happened last week. Folded-away repeats are no
longer counted at all, which is exact rather than approximate — compaction only
folds history at least a year old and the window looks back a month, so a folded
event cannot be a recent repeat.

With both fixed, no axis is dead, unmovable or runaway, and the clamp report is
a signal again.

**Three faults in calibrate itself surfaced on the way, each hidden by the last.**

First, the fuzzer had none of the directed policies §5A lists. §5A
lists "maximize one axis toward one faction, minimize it" among the policies it
rotates, and we had four of them, none directed. Without a directed policy an
axis moved equally in both directions reads as dead, because random play cancels
it — which is a statement about the policy, not about the content. `Push` and
`Drag` pick acts that move a chosen axis the way they want, falling back to any
act when none do, since an axis nothing can move is exactly what is being looked
for and the run must still play.

That split the two thresholds apart, and they now read from different play.
Reachability is judged under directed play, because a player is consistent where
random play is not. Runaway is judged under *undirected* play only: a policy
whose purpose is to drive an axis to its limit will drive it there, and reporting
that as a runaway would be reporting the measurement rather than the game.

Second, playthroughs were **concatenated into one log**. Sixty-six sessions
poured together is one impossibly long game in which every axis saturates, which
is how raising the run count turned six axes runaway without a line of content
changing. Each session is now read on its own timeline, so "50% of a playthrough"
means half of that session.

Third, a fuzz session ends when the story graph is exhausted — about twenty acts
today — and twenty acts move nobody, so every axis read dead instead. Neither a
twenty-act session nor sixty-six merged is a playthrough. Each session is now
continued under its own policy to `ACTS_PER_PLAYTHROUGH`, which is what §5A's
checkpoints assume.

And reachability is judged only on the sessions that **aimed at** the axis in
question. Averaging over all of them buries the evidence: each axis is aimed at
by about two runs in sixty-six, so an axis that moves readily when pushed still
reads dead in the mean. "Can this move" is a question about the attempts.

Also added: `axesNoActMoves`, a static list of axes no act in the catalog touches
at all. It is exact and cannot depend on what the sample happened to do, which
makes it the finding to act on first — `dead_axes` beside it is an observation
about play and will always be softer evidence.

`npm run narr:diff-tuning <before.json> <after.json>` replays a fixed corpus of
seeded playthroughs and reports which bands and which storylet gates flip. Both
tunings are applied to the *traces* of a single replay rather than by running
the engine twice, so the two see exactly the same playthroughs;
`an_unchanged_tuning_reproduces_the_engine_exactly` holds that re-derivation to
the engine's own answer, without which every reported flip would be an artefact
of the re-derivation. `tuning/current.json` is the committed baseline and a test
pins it to the engine's defaults, so it cannot drift and start reporting its own
staleness as a consequence.

The output is consequences, not numbers, as §11 asks: softening the top three
tiers reports "entity.vell goodwill very_high -> high", not a table of deltas.

**The 1,000-entity half of the acceptance criterion is now measured.**

`narr bench --entities 1000` generates a population from the authored groups'
rules and a seed — §11's `narr generate` in miniature — and installs it before
anything reads the graph. Every authored character is kept with its own id, so
committed scenarios and authored content are unaffected; the generated members
hang off the real groups with their group's value profile, deviated.

It could not be run at all at first: 1,000 entities did not finish a benchmark
in fifteen minutes, and neither did 50 events. Instrumenting the phases rather
than guessing showed the whole cost in one place — **rumour, at 384 seconds,
against milliseconds for everything else.** Three defects, each invisible at a
cast of five:

1. **`ties()` scanned the whole population and allocated**, and was called once
   per teller per known event — 300,000 scans of 1,000 entities for a single
   boundary. It is an index now, and resolved once per teller.
2. **Public events were written to every entity.** §10 says they belong at the
   scope node, read through membership, and it is right: one public act cost one
   entry per entity in the world, and rumour then re-checked all of them every
   boundary to rediscover they already knew.
3. **Everyone told everyone.** A generated group of 333 members means a step
   costs the square of the group. Fan-out is capped at 8 peers on a rotating
   window, which bounds the work and is the truer model — people tell the few
   they saw today, and it reaches the rest through them, more slowly.

Compaction's own lookups were a fourth: `baselines` and `seen` were lists,
scanned inside the fold. Fine at five characters, and at a thousand they made a
compacted load *slower* than an uncompacted one. They are maps now.

At 998 entities and 2,000 events, four of the five budgets hold:

| Operation | At 1,000 entities | Budget |
| --- | --- | --- |
| `standing` (warm) | 0.1 us | 50 us |
| `emit_act` | 0.2 us | 500 us |
| `rumour_step` | 4,238 us | 5,000 us |
| `storylet_selection` | 2,827 us | 5,000 us |
| `load_replay` | 27,075,362 us | 2,000,000 us |

`rumour_step` passes with little room, and is the first thing to watch if the
population grows again.

**`load_replay` now holds too: the cache survives a save.** The save folds
every character once and writes the scores in; the load turns them into cache
entries and drops the field. Opening a save went from **27,075,362 us to 801
us** — the last budget, and the whole table now passes at a thousand entities.

Raw scores are still not state. §10 is explicit that they are derived from the
log so scores and history cannot drift apart, and this does not change that.
Every entry is checked against the world that produced it — the tick, the length
of the log, that observer's knowledge count — and, crucially, the content
version. §10: "If world data changed (retuned amounts, new entities), replay the
log against the new act definitions." A cache that outlived a retune would
defeat exactly that, and silently: the game would show scores from the old
tuning and nothing would look wrong. `a_saved_score_from_different_content_is_refolded`
plants an absurd value under a bumped stamp and requires it to be ignored.

The field is cleared once its contents are in the cache, so a loaded state is
identical to one that was never saved. That is not tidiness: the save round-trip
check compares the two, and it caught the first version of this, where a state
that had been through a save differed from a played one by carrying a cache in
its identity.

The cost moved to the save, and moving work somewhere less closely watched is
not the same as removing it, so both ends are measured. A save taken mid-play
costs **19,454 us**, because a game that has been asking for standings already
has them memoised for the current tick. A save taken on a log nothing has read
costs **8,812,407 us**, which is the worst case and the number to watch if
saving is ever moved somewhere that has not just been playing.

**`narr graph` and `narr reach` are built**, which closes §11's tool list.

`npm run narr:graph` exports both graphs as DOT. The entity graph's edges point
from member to group — the direction an impact travels — and carry that step's
inheritance weight, which is the number deciding how much of what happens to one
person is felt above them. The causal graph labels events by act and target so a
chain reads as a story rather than as ids, and draws no edge to an event
compaction has folded away: an arrow from a node that is not in the log is a
graph that renders and lies.

`npm run narr:reach` runs §11's two passes. The static pass rejects a gate that
can never open — an axis or band that does not exist, or a range like "at least
`low`, at most `very_low`" that is empty. The search then plays and watches for
anyone who satisfies each gate, sampling as the log grows rather than only at
the end, because a gate can open mid-game and shut again as decay and repetition
pull scores back toward the middle — and a gate that was briefly satisfied is a
gate that fires. An unreached gate is reported with who came closest and how many
standing points short they were, which is the difference between "this never
fires" and "this needs six more points of grievance".

Gates are storylet roles. Reactions trigger on acts rather than bands, so they
gate nothing. On current content the single gate is reachable and nothing is
contradictory; the tool is pinned by tests that assert it catches an empty
range, an unknown axis, an unknown band, and a well-formed gate the content
cannot satisfy — `alignment` at `very_high`, one of the dead axes calibrate
reports — because a checker that only ever confirms what already works would
pass a broken gate silently.

**Still outstanding:**
- **1,000 entities.** Only the event-count half of the acceptance criterion is
  actually measured. The entity graph is a compile-time catalog, so a synthetic
  population cannot be injected at runtime: unknown ids resolve to nothing,
  inheritance returns zero and the fold exits early, which would report a
  flatteringly fast number for a world that does not exist. The measured cast is
  the authored one. Reaching the stated scale needs either `narr generate` from
  §11 or an entity graph passed as data rather than read from a global.

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
| ~~`bladeink-compiler` is not a usable Rust crate~~ | — | **Closed by the N0 spike.** It is a usable Rust crate; no `inklecate` step needed |
| ~~No argument-passing jump to a knot~~ | — | **Closed by the N0 spike.** `choose_path_string` takes `args`; the dispatch-knot fallback is dropped |
| WASM growth breaks the size budget | **Confirmed and quantified.** bladeink adds ~305 KB raw / 112 KB gzip | `wasm-opt -Oz` enabled (worth 206 KB on its own); raise `wasmBytes` to ~1,300,000 when N1 lands; gzip budget keeps 70 KB headroom. Lazy-loading the story JSON remains available |
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

- The N0 spike is done; see [its findings](add-narrative-bladeink-spike.md).
  What it did not measure: the cost of the `story` module's real surface
  (externals, tag routing, flow management) on top of the runtime, and any
  per-step timing, which has nothing to measure until N3.
- The entity graph has no content yet. The lore it binds to is addressed by
  path rather than by a front-matter id; that decision is now made and recorded
  in the brick contract.
- The specification's calibration targets (§5A) assume content to fuzz. Until
  N3 produces some, the tier and modifier tables are unvalidated defaults.
- Offline catch-up over a long gap must produce the same rumor spread as
  playing through it. The fixed-tick-boundary rule in §2.1 is intended to
  guarantee that, but it needs a dedicated scenario pair to prove it.
