# Lore, Engine, and Content: The Three Bricks

Status: canonical boundary contract for the ADD lane.

> Scope note: this contract covers the ADD game lane. The office/platform lane
> (`apps/web/`, `apps/api/`, `apps/world-server/`, `apps/media-gateway/`) has
> its own boundaries and is not governed by this document.

The ADD game is built from three bricks. They are connected and
interdependent, but each has one owner, one authoring format, one verification
command, and one direction of dependency. Getting a change into the wrong
brick is the most expensive mistake available in this repository, because it
creates a second source of truth that nothing checks.

This document names the bricks, fixes the dependency direction, and says how
the boundary is enforced. It exists because the [Narrative System
Specification](narrative-system-specification.md) introduces authored world
data (entities, acts, values, sifting patterns, storylets) that sits exactly on
the lore/content seam and would drift immediately without a written rule.

## The three bricks

| Brick | Question it answers | Lives in | Authoring format | First verification |
| --- | --- | --- | --- | --- |
| **Lore** | What is true in this world? | `lore/` | Markdown wiki + `lore/data/*.json` | `npm run lore:check` |
| **Engine** | What can happen, and what happens next? | `crates/add-core/`, `crates/add-web-bindings/`, `crates/add-scenario*/`, `packages/game-*` | Rust and neutral TypeScript | `cargo test -p add-core` |
| **Content** | What exists in this particular game, and what does it say? | `packages/add-domain/`, `scenarios/` | TypeScript content modules, JSON fixtures, `.ink` scripts | `npm run content:check` |

### Lore owns canon, not behavior

`lore/` is the world bible: history, factions, characters, places, creatures,
terminology, tone. It is written for humans and agents who need to know what is
true before they author anything.

Lore owns:

- Facts, names, chronology, causality, and the canon status of each
  (`Canon`, `Internal`, `Draft`, `Open Question`).
- Shared structured canon in `lore/data/*.json`, transcluded into pages by the
  `<!-- lore:include -->` mechanism and rendered by `npm run lore:render`.
- Tone, vocabulary, and the reference bible.

Lore owns nothing that runs. It contains no balance numbers, no IDs the engine
resolves, no conditions, and no effects. A lore page may describe that the
Keepers execute deserters; it never states the `grievance` tier that produces.

### Engine owns rules, not material

The engine is the authoritative simulation and the neutral primitives beneath
it. It owns state transitions, determinism, time, saves, and the *vocabulary*
in which content can express itself.

Engine owns:

- `GameState` and every mutation of it (`crates/add-core/src/simulation.rs`).
- The type of thing content is allowed to say: `Condition`, `EffectDef`,
  `GameCommand`, `GameEvent`, axis and tier definitions.
- Determinism: one seeded generator, one clock, one save format, one migration
  registry (`CURRENT_SCHEMA_VERSION`).
- Neutral topology, world, visibility, and renderer contracts (`packages/game-*`).

The engine contains no authored material. Every catalog file under
`crates/add-core/src/game_data/catalog/` is generated and carries a
`@generated` banner. Adding a new *kind* of rule is an engine change; adding
another instance of an existing rule is a content change.

### Content owns the material, and binds the other two

Content is the game as authored: which beats, resources, stations, entities,
acts and storylets exist, what they cost, and what they say. It is the only
brick that is allowed to know about both of the others.

Content owns:

- Authored catalogs in `packages/add-domain/src/content/`.
- Player-facing copy and, once the narrative system lands, `.ink` prose.
- Derived presentation and explanations in `packages/add-domain/src/adapters/`.
- Committed scenarios and fixtures in `scenarios/`.
- The `lore_ref` back-links that tie a content ID to the canon it implements.

## Dependency direction

The direction is strictly one-way. Nothing in this repository should ever
create an edge pointing backwards along it.

```mermaid
flowchart LR
  L[Lore<br/>lore/] -->|canon ids, facts, names| C[Content<br/>packages/add-domain, scenarios]
  C -->|codegen| E[Engine<br/>crates/add-core, packages/game-*]
  E -->|snapshot, events| C
  C -.->|generated back-index only| L
```

Read it as four rules:

1. **Content may cite lore.** A content definition carries a `lore_ref` naming
   the canon subject it implements. This is a string, resolved by tooling, not
   an import.
2. **Content compiles into the engine.** Authored TypeScript is code-generated
   into Rust catalogs by `scripts/build-add-content.cjs`. The engine never
   imports content; content is *placed into* it by the generator.
3. **The engine may not know lore or content exists.** `crates/add-core` must
   compile and pass its tests with no knowledge of why a value is what it is.
   If a rule needs to name a specific entity to work, the rule is in the wrong
   brick.
4. **Lore never authors a link to content.** The navigation from a lore page to
   its implementation is *generated* from the content brick's `lore_ref` fields
   into a `<!-- lore:generated -->` block, exactly like `lore/data/canon.json`
   is transcluded today. This keeps the authored dependency one-way while
   giving humans both directions of navigation.

The back-edge in the diagram is dotted because it is generated output, never
authored input.

## Where does this change belong?

| Change | Brick | Path | First verification |
| --- | --- | --- | --- |
| A world fact, a character's history, a place, a name, a canon status | Lore | `lore/` | `npm run lore:check` |
| Shared structured canon consumed by several lore pages | Lore | `lore/data/*.json` | `npm run lore:check` |
| A new kind of condition, effect, command, event, axis, or state field | Engine | `crates/add-core/src/` | `cargo test -p add-core` |
| Determinism, saves, migrations, time advancement, offline catch-up | Engine | `crates/add-core/src/` | `cargo test -p add-core` |
| Neutral topology, world, visibility, renderer, or input contracts | Engine | `packages/game-*` | `npm run agent:verify:types` |
| A new beat, resource, station, role, item, creature, perk, act, or entity | Content | `packages/add-domain/src/content/` | `npm run content:check` |
| Balance numbers, costs, durations, tiers | Content | `packages/add-domain/src/content/` | `npm run content:check` |
| Player-facing copy, dialogue, `.ink` prose | Content | `packages/add-domain/` | `npm run content:check` |
| Snapshot explanation, available-action projection, blocker copy | Content | `packages/add-domain/src/adapters/` | `npm run agent:verify:add-ui` |
| A committed scenario, fixture, or replay | Content | `scenarios/` | `npm run scenario:add -- scenarios/add/<id>.json` |
| The `lore_ref` linking a content ID to its canon subject | Content | `packages/add-domain/src/content/` | `npm run lore:refs:check` (planned) |

When a change seems to belong in two bricks, it is usually one engine change
plus one content change, and they should be separable. If they are not, the
engine change is probably too specific.

## What is already true today

Most of this boundary already exists; it has simply never been named or
enforced. Recording the current state honestly matters more than proposing a
reorganization.

| Property | State today | Evidence |
| --- | --- | --- |
| Lore is separate from the game | Yes | `lore/` is 389 tracked files with its own Python tooling and its own site build; nothing in `apps/` or `crates/` reads it |
| Engine is free of authored material | Yes | Every `crates/add-core/src/game_data/catalog/*.rs` is `@generated`; hand-written rules live in `simulation.rs` and `game_data.rs` |
| Content compiles into the engine | Yes | `scripts/build-add-content.cjs` with a `--check` drift mode and a golden catalog snapshot |
| Content does not reimplement engine rules | Mostly | `packages/add-domain/test/architecture.test.js` enforces the renderer boundary; availability evaluation is still a TypeScript projection, self-labelled `typescript_projection_pending_rust_explain` |
| Lore links to content | **No** | No content definition names a lore subject; no lore page names a content ID. The two bricks are unconnected |
| Boundary is machine-checked | **Partial** | Renderer direction and content drift are checked; brick direction is not |

So the work is not a migration. It is: add the missing lore-to-content link,
and add the checks that keep the existing direction from eroding.

## Enforcement

Three checks hold the boundary. Two exist; one is new.

**1. Content-to-engine drift (exists).** `npm run content:check` regenerates
the Rust catalogs and fails if the checked-in output drifted from the authored
TypeScript. `cargo test -p add-core` additionally holds a golden snapshot of
the whole catalog, so a data change is always visible in review.

**2. Import direction (exists, needs extending).**
`packages/add-domain/test/architecture.test.js` already asserts that the domain
package does not depend on the renderer. Extend it with two assertions:

- no file under `crates/` or `packages/game-*` reads from `lore/`;
- no file under `packages/add-domain/src/` imports lore prose (only
  `lore/data/*.json`, and only through the registry).

**3. Lore reference integrity (new).** A `lore:refs:check` command that:

- resolves every `lore_ref` in the content catalogs to a lore page and anchor,
  and fails on a dangling reference;
- reports content IDs with no `lore_ref`, so the unbound surface is visible;
- reports lore subjects that no content implements, which is a genuinely useful
  backlog — it is the list of things the world knows about that the game cannot
  yet show;
- regenerates the `<!-- lore:generated -->` back-index blocks, with a `--check`
  mode for CI, mirroring `build-add-content.cjs`.

`lore_ref` is a plain string on a content definition, for example:

```ts
{
  id: "faction.ashfield_keepers",
  label: "The Keepers",
  loreRef: "lore/factions/ashfield_keepers.md",
  // ...
}
```

The generator interns it away, so it costs nothing at runtime. It is authoring
metadata and inspection material, not gameplay state.

## How the narrative system uses the bricks

The [Narrative System Specification](narrative-system-specification.md) is the
first system that genuinely spans all three. Its pieces distribute like this,
and the [ADD Narrative System Implementation Plan](add-narrative-system-plan.md)
follows this split for every milestone.

| Specification concept | Brick | Where it lands |
| --- | --- | --- |
| Who the Keepers are, their history, what Ashfield is | Lore | `lore/factions/`, `lore/characters/` |
| The eleven axes and how they combine into `trust` | Engine | `crates/add-core/` |
| The impact pipeline, decay, saturation, inheritance math | Engine | `crates/add-core/` |
| The event log, knowledge sets, rumor spread mechanics | Engine | `crates/add-core/` |
| The sifter and the storylet caster | Engine | `crates/add-core/` |
| Which entities exist, their values, ranks, edges | Content | `packages/add-domain/src/content/narrative/` |
| Act definitions: tiers, scopes, expressed values | Content | `packages/add-domain/src/content/narrative/` |
| Relationship states, sifting patterns, storylet sidecars | Content | `packages/add-domain/src/content/narrative/` |
| Tuning tables: tier bases, modifiers, band edges, value angles | Content | `packages/add-domain/src/content/narrative/` |
| `.ink` prose, choices, scene flow | Content | `packages/add-domain/narrative/story/` |
| Reaction rules | Content | `packages/add-domain/src/content/narrative/` |

The specification's §12 puts all of this in RON files under `story/` and
`world/`. This repository already has a validated TypeScript-to-Rust content
pipeline with one ID namespace, one validator, one explainer and one reverse
lookup. The plan therefore keeps the specification's *data model* exactly and
changes only its *file format*, so the narrative system inherits
`content:check`, `content:explain`, `content:graph --reverse` and the golden
catalog rather than growing a second toolchain beside them. That trade is
argued in the plan's "One content pipeline, not two" section.

## Focused verification

| Brick | Command | What it proves |
| --- | --- | --- |
| Lore | `npm run lore:check` | Links resolve and shared canon data is consistent |
| Lore | `npm run lore:render` | Transcluded canon blocks match `lore/data/*.json` |
| Engine | `cargo test -p add-core` | Rules, determinism, saves, and the catalog golden hold |
| Engine | `npm run agent:verify:types` | Neutral package contracts compile |
| Content | `npm run content:check` | Authored content validates and generated Rust has not drifted |
| Content | `npm run content:explain -- <id>` | A content ID exposes its definition, source, references and users |
| Content | `npm run scenario:add -- scenarios/add/<id>.json` | Authored content behaves deterministically against the engine |
| Boundary | `npm --workspace @aedventure/add-domain test` | Import direction assertions hold |
| Boundary | `npm run lore:refs:check` (planned) | Every `lore_ref` resolves; unbound lore and content are reported |

## Known gaps

- `lore_ref` and `lore:refs:check` do not exist yet. Until they do, the lore
  and content bricks are connected only by the judgement of whoever authored
  the content.
- The import-direction assertions cover the renderer boundary only.
- Availability and blocker evaluation is still projected in TypeScript rather
  than answered by the engine, so one rule currently has two implementations.
  This is tracked in the narrative plan as a prerequisite, because the
  narrative system would otherwise inherit and enlarge it.
- `lore/` has no machine-readable subject index, so `lore:refs:check` must
  either parse headings or require a small front-matter id per page. The plan
  proposes front matter.
