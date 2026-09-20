# Story And Content Engine Contract

Date: 2026-06-14

## Purpose

This document defines the ownership boundary for ADD story and content systems.
The goal is to keep the game deterministic, inspectable, and easy to extend
without letting story rules leak into UI code or presentation layers.

Story, objectives, tutorials, unlocks, and current actions should eventually be
different projections of the same authored content graph. Until that extraction
is complete, this contract is the rule set for where new logic belongs.

This contract is consumed by the live `apps/add-rpg` game. It describes how to
extend the existing product safely; it is not a proposal for a separate story
demo or a replacement for the current playable loop.

The narrative system described in the
[Narrative System Specification](narrative-system-specification.md) is the
deep-consequence extension of this same content graph: acts, standing, and
knowledge are further projections of authored content, evaluated by the same
Rust authority. It does not introduce a second story system. Its ownership
split and milestone order are in the
[ADD Narrative System Implementation Plan](add-narrative-system-plan.md), and
the lore/engine/content boundary it sits on is fixed by the
[three-brick contract](lore-engine-content-bricks.md).

## Where does this change belong?

| Change | Owner | First verification |
| --- | --- | --- |
| Story beat, choice, condition, effect, flag, objective, or authored copy | `packages/add-domain/src/content/` | `npm run content:check` |
| Authoritative evaluation or mutation of a story effect | `crates/add-core/` | `cargo test -p add-core` |
| Story progression projection, available action, or explanation | `packages/add-domain/src/adapters/` | `npm run agent:verify:add-ui` |
| Player-facing journal, panel, or moment presentation | `apps/add-rpg/` | `npm run smoke:add-rpg:built` |

Keep the content ID and its conditions in the authored catalog. Do not copy
story gates into DOM event handlers or create a second story state in the
browser. See the [ADD Task Brief Template](templates/add-task-brief.md) when a
story change crosses more than one row.

## Current Architecture

The live story/content path is:

```text
packages/add-domain/src/content/*
  authored TypeScript content
  ↓
scripts/build-add-content.cjs
  deterministic code generation
  ↓
crates/add-core/src/game_data/catalog/*
  generated Rust catalog
  ↓
crates/add-core
  authoritative simulation, story selection, effects, saves
  ↓
packages/add-domain/src/adapters/*
  typed projections for UI, telemetry, and agents
  ↓
apps/add-rpg
  rendering and command dispatch only
```

The Rust runtime is the only layer that decides which story beat is active, when
story beats complete, and how story effects mutate the save state.

## Ownership Rules

### Rust Runtime Owns Authority

`crates/add-core` owns:

- storylet selection and salience ordering
- condition evaluation
- choice validation
- effect application
- beat activation and completion
- story/event notes emitted by commands
- save/load of narrative state
- deterministic replay from state plus command sequence

The authoritative narrative state is:

- `active_beat_id`
- `completed_beat_ids`
- `choice_by_beat`
- `qualities`
- `activated_beat_ids`

Any logic that changes those fields belongs in Rust, not the browser app.

### TypeScript Content Owns Authoring

`packages/add-domain/src/content/*` owns authored content:

- story beat IDs, labels, bodies, arcs, and sequence numbers
- choices and choice copy
- preconditions and auto-completion conditions
- related catalog IDs
- effects attached to choices, activation, or completion
- author-facing helpers for composing content safely

TypeScript content files are source material. They must stay deterministic and
must not depend on browser state, timers, local storage, random values, DOM APIs,
or Phaser.

### Codegen Owns Content Transfer

`scripts/build-add-content.cjs` owns converting authored TypeScript content into
checked-in Rust catalog files.

Codegen must be:

- deterministic
- stable in ordering
- usable in `--check` mode
- strict about unknown schema shapes
- explicit about generated files

Before emitting Rust, codegen must run semantic content validation. Validation
should fail loudly for authoring mistakes that TypeScript cannot prove by type
alone: duplicate IDs, missing references, unreachable story beats, invalid story
graph cycles, orphaned arc sequence entries, impossible local preconditions, and
story actions that point at missing world actions.

Generated Rust catalog files are runtime inputs, not the editing surface.

### Domain Selectors Explain, They Do Not Mutate

`packages/add-domain/src/adapters/*` may:

- project active story state into UI-friendly structures
- explain why a beat or command is available
- derive objective, discovery, base, dungeon, and telemetry copy
- expose agent-readable state through stable contracts
- map visible actions to command descriptors

Selectors must not:

- choose the active story beat
- mark story beats complete
- apply effects
- write save state
- guess condition results that Rust did not expose
- silently diverge from runtime authority

If a selector needs to answer "why is this story beat active?", it should read
runtime-provided state and catalog metadata. It must not re-run the story engine.

### UI Renders And Dispatches Commands Only

`apps/add-rpg` may:

- render story moments, objectives, and current actions
- show choices and disabled reasons
- call the runtime worker with a typed command
- transition presentation state after a snapshot changes
- expose smoke/agent telemetry from domain projections

UI must not:

- re-evaluate story conditions
- decide active beats
- complete beats directly
- mutate narrative state
- apply story effects
- encode progression rules that should live in content or selectors

Temporary UI glue is allowed only when clearly marked as transitional and backed
by a planned domain projection.

## Command Rule

Every story-driven action must map to exactly one runtime command.

Examples:

| Story action | Runtime command |
| --- | --- |
| Pick a story choice | `ChooseStoryOption` |
| Start a beat-linked world action | `StartWorldAction` |
| Begin a build objective | `StartConstruction` |
| Assign Hero to a role | `SetHeroRole` |
| Move crew for a story bottleneck | `SetRoleCrew` |
| Recruit from Survivor Cave | `RecruitFromSurvivorCave` |
| Let the base run | `Tick` |

The command mapping should become a single domain-level projection. UI should
not maintain multiple independent action translators.

## Dependency Direction

Allowed dependency direction:

```text
apps/add-rpg
  -> packages/add-domain
  -> generated Rust/WASM snapshot and catalog contracts
  -> crates/add-core authority
```

Disallowed:

- `crates/add-core` depending on browser app code
- `crates/add-core` depending on domain selectors
- Phaser or UI code becoming a source of story truth
- selector code changing save state
- content files importing app UI helpers

## Determinism Rules

Story/content behavior must remain deterministic:

- same save state plus same command produces same next state
- no browser time in story selection
- no unseeded randomness in story selection or effects
- story conditions evaluate only against runtime state
- effects are applied atomically where the runtime supports validation
- generated catalogs are stable across repeated builds

## Agent-Friendly Rules

Story state must be inspectable without scraping visual UI.

`render_game_to_text` and future telemetry should expose:

- active beat ID
- active arc
- completed beat IDs or progress summary
- choices made
- available story commands
- current blocker
- next likely unlock or progression hint
- content/catalog version

Agents should be able to answer "what should I do next and why?" from structured
state, not DOM text.

## Content Tooling

Use the content tooling commands before reading large source files by hand.
They inspect the authored TypeScript content and print deterministic text output
for humans and agents.

```sh
npm run content:validate
npm run content:graph
npm run content:timeline
npm run content:explain -- story.beat.restore_studio
```

Command intent:

- `content:validate`: runs semantic content validation and prints story
  reachability.
- `content:graph`: prints story dependency edges and unreachable story beats.
- `content:timeline`: prints beats grouped by arc and sequence.
- `content:explain -- <id>`: explains one story beat, including conditions,
  effects, related IDs, incoming dependencies, and outgoing dependencies.

These tools read `packages/add-domain/dist`, so the npm scripts build
`@aedventure/add-domain` before running the inspector. The output is deliberately
plain text and stable in ordering so it can be pasted into planning notes,
debugging reports, and agent context.

## Transitional Known Gaps

These are accepted short-term gaps, not desired end state:

- `ADD_FIRST_PLAYABLE_SCRIPT` duplicates part of the story/onboarding spine.
- current-action routing still has app-level glue for some first-playable and
  Base handoff behavior.
- TypeScript `ConditionDef` and content codegen intentionally expose only flat
  condition variants for now; recursive `all` / `any` / `not` authoring is
  deferred until content needs nested logic.
- story choices can surface through story moment UI, map interactions, and
  first-playable action paths instead of one canonical command projection.

Future phases should remove these gaps by making story progression and command
projection domain-level contracts.

## Acceptance Gate For This Contract

Phase 0 is accepted when:

- this document exists in `docs/story-content-engine.md`
- Rust authority, TypeScript authoring, selector projection, and UI rendering
  responsibilities are explicit
- the command rule is explicit
- dependency direction is explicit
- known transitional gaps are recorded
- future agents have no ambiguity about where story logic belongs
