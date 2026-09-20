# N0: bladeink Feasibility Spike

Status: completed 2026-09-20. Measured findings, not a proposal.

> Scope note: this covers the ADD game lane. It is the gating milestone of the
> [ADD Narrative System Implementation Plan](add-narrative-system-plan.md);
> every milestone after N1 was conditional on these answers.

The [Narrative System Specification](narrative-system-specification.md) puts
its narrative layer in ink, run by `bladeink`. Its §14 risk table names four
capability risks and the plan added a fifth about WASM size, because the
specification assumes a native engine while ADD ships its simulation as WASM
into a Web Worker.

All five were answered by building and running a throwaway spike against
pinned crates, not by reading documentation.

## Verdict

**Proceed.** Every capability the specification depends on exists in
`bladeink 2.0.0`, including the one its own risk table called out as the most
likely to force a redesign. The cost is size, and it is affordable but not
free: the narrative runtime needs roughly **305 KB raw / 112 KB gzipped** of
WASM, which requires raising the raw budget and makes `wasm-opt` mandatory
rather than optional.

## Pinned versions

| Crate | Version | Role |
| --- | --- | --- |
| `bladeink` | 2.0.0 | ink runtime |
| `bladeink-compiler` | 2.0.0 | `.ink` source to ink JSON |

## The five questions

### Q1. Does the compiler exist as a usable Rust crate?

**Yes.** `bladeink-compiler` is a real crate with
`Compiler::compile(&str) -> Result<String, CompilerError>`. No Node step, no
`inklecate` binary, nothing to vendor.

This matters more than it looks. The plan's fallback was an `inklecate` step in
the content build, which would have added a non-Rust, non-npm toolchain
dependency to a pipeline that currently has neither. Compiling `.ink` in the
same Rust build that produces the WASM keeps the content pipeline as it is.

```
Q1 compiler: OK, ink JSON is 865 bytes
Q1 runtime:  OK, 1 line(s), tags ["speaker:narrator", "mood:tense"]
```

The tag channel the specification uses as its command bus (§4) parses as
documented: `# speaker:narrator # mood:tense` arrives as two tags on the line.

### Q2. Can Rust jump to a knot *with arguments*?

**Yes.** This was the highest risk in the specification — storylet casting
(§8) depends on passing role bindings into a parameterised knot, and the
documented fallback was an ink-side dispatch knot with a lookup table.

```rust
pub fn choose_path_string(
    &mut self,
    path: &str,
    reset_call_stack: bool,
    args: Option<&Vec<ValueType>>,
) -> Result<(), StoryError>
```

Proven against `=== sl_frightened(x, y) ===`:

```
Q2 knot args: OK -> ["Vell will not meet the eyes of Joren."]
```

**The fallback is not needed.** Storylet casting can be implemented as the
specification describes it.

### Q3. Can the story's random seed be set and saved?

**Yes, with one caveat about where it is set from.**

There is no Rust setter. The seed is set from ink via `~ SEED_RANDOM(n)`,
which writes `story_state.story_seed`, and that state is covered by
`save_state()` / `load_state()`.

```
Q3 determinism: OK, same seed gives same roll (["You reach the camp.", "Roll: 627"])
Q3 save/load:   OK, state is 449 bytes, trust=1
```

Two fresh stories seeded identically produced the same `RANDOM(1, 1000)` roll,
and a saved state round-tripped with its variables intact.

*Consequence for the design:* the core must emit `SEED_RANDOM` from ink at
story start, seeded from `GameState.rng_seed`, rather than calling a Rust API.
That fits §2.1 of the plan (one generator, owned by `add-core`) but it is a
binding detail worth writing down before N1: the seed has to cross into ink as
a value, not be set behind its back.

### Q4. Do named flows work?

**Yes.** `switch_flow(name)`, `remove_flow(name)` and `switch_to_default_flow()`
are all present and work.

```
Q4 flows: OK, switch_flow/switch_to_default_flow work
```

Ambient commentary and the hero's inner voice (§4) can run in named flows over
the same state, as specified.

### Q5. What does it cost in WASM?

It compiles to `wasm32-unknown-unknown` with no feature juggling — no
`getrandom/js` shim was needed.

Measured by adding `bladeink` to `crates/add-web-bindings` with a real
(non-eliminable) use, building through `scripts/build-add-rpg-wasm.cjs`, and
reverting.

| Build | raw | gzip |
| --- | --- | --- |
| baseline, `wasm-opt` off (as shipped before this spike) | 1,106,325 (1080 KB) | 323,999 (316 KB) |
| baseline, `wasm-opt -Oz` | 894,964 (874 KB) | 313,660 (306 KB) |
| with bladeink, `wasm-opt` off | 1,508,859 (1474 KB) | 452,196 (442 KB) |
| with bladeink, `wasm-opt -Oz` | 1,207,423 (1179 KB) | 428,665 (419 KB) |

Two separate results are tangled in that table, and they should be read apart.

**`wasm-opt` was leaving 206 KB on the floor.** Turning it on costs about three
seconds of build time and removes 211,361 raw bytes (−19%) from the shipped
binary with no bladeink involved. That is a free win and it is taken in this
change; `wasm-opt = ["-Oz"]` is now set in
`crates/add-web-bindings/Cargo.toml`.

**bladeink's marginal cost, with `wasm-opt` on, is 312,459 raw bytes (305 KB)
and 115,005 gzipped (112 KB).**

Against `performance/add-budgets.json`:

| Budget | Max | With bladeink (`-Oz`) | Verdict |
| --- | --- | --- | --- |
| `wasmBytes` | 1,200,000 | 1,207,423 | **over by 7,423 (0.6%)** |
| `wasmGzipBytes` | 500,000 | 428,665 | passes at 85.7%, 70 KB headroom |

So the narrative runtime very nearly fits the budget as written, and misses the
raw ceiling by less than one percent.

## What this changes in the plan

1. **N0 is satisfied and N1 is unblocked.** No capability gap, no redesign.
2. **The storylet fallback is dropped.** `choose_path_string` with arguments
   works, so §8 casting is implementable as written. The plan's risk row
   "No argument-passing jump to a knot" is closed.
3. **`wasm-opt` becomes part of the build, not an option.** Without it,
   bladeink puts the binary 26% over the raw budget. With it, 0.6% over.
   Enabled here, ahead of the narrative work, so the saving is banked and
   independently verified.
4. **The raw WASM budget needs raising to about 1,300,000 before N1 lands.**
   Not changed in this commit: the budget should move when the thing that needs
   it arrives, not in advance of it. The gzip budget — what users actually
   download — needs no change and keeps 70 KB of headroom.
5. **Seeding is an ink-side binding.** `SEED_RANDOM` must be emitted from ink
   at story start using `GameState.rng_seed`. Record this in the N1 runtime
   contract doc.

## What was not measured

- The spike bound no external functions and parsed no tags beyond a smoke
  check, so the cost of the `story` module's real surface (externals, tag
  routing, flow management) is not in these numbers. The bulk measured here is
  the runtime itself, which dominates, but expect some addition.
- Startup and per-step timing were not measured. The specification's §10
  budgets for `emit_act` and storylet selection are about `narrative_core`, not
  ink, and there is nothing to measure until N3.
- `bladeink-compiler` was measured only on the host. It should never ship in
  the WASM — compilation belongs in the content build — and the numbers above
  include only `bladeink`.

## Reproducing

The spike crate was throwaway and is not committed. To rebuild it: a binary
depending on `bladeink = "2.0.0"` and `bladeink-compiler = "2.0.0"`, compiling
an inline `.ink` source with `Compiler::new().compile(...)`, loading it with
`Story::new(&json)`, then exercising `choose_path_string` with a
`Vec<ValueType>`, `save_state`/`load_state` around a `SEED_RANDOM` roll, and
`switch_flow`.

The size numbers reproduce by adding `bladeink` to
`crates/add-web-bindings/Cargo.toml` with a `#[wasm_bindgen]` function that
constructs a `Story`, then running `node scripts/build-add-rpg-wasm.cjs` and
measuring `apps/add-rpg/src/generated/wasm/add-web-bindings/runtime_bg.wasm`.

## Focused verification

| Check | Command |
| --- | --- |
| The optimized WASM still builds and the game still runs | `npm run verify && npm run smoke:add-rpg:built` |
| Size against budget | `npm run qa:add-rpg:size:built` |
