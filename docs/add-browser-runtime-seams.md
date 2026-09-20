# ADD Browser Runtime Seams

Status: implemented Phase 6 decomposition contract for the live ADD app.

> Scope note: this is the browser-shell contract for `apps/add-rpg`. It does
> not move gameplay rules into TypeScript, and it does not describe the
> separate office/platform renderer.

## Where does this change belong?

| Change | Owning seam | First check |
| --- | --- | --- |
| Worker lifecycle, typed runtime requests, snapshot/save waits | `AddRuntimeBridge` | `npm --workspace @aedventure/add-rpg run build:types` |
| Phaser mount, map rendering, camera, selection, movement lock, renderer telemetry | `AddMapController` and `AddRpgPhaserMapHost` | `npm run qa:add-rpg:phase5:built` |
| Panel state, derived presentation, browser settings, QA hooks, and player flow orchestration | `main.ts` | `npm run agent:verify:add-ui` |
| Authoritative rules and state transitions | `crates/add-core/` through the worker/WASM boundary | `cargo test -p add-core` |

The browser shell translates player intent into a `WorkerRequest` and renders
the resulting snapshot. It may derive labels, panel state, and presentation
timing, but it does not calculate authoritative resources, progression,
survival, recruitment, story outcomes, or map truth.

## Current dependency direction

```text
main.ts
  ├── AddRuntimeBridge
  │     └── add-runtime-client SimulationClient
  │           └── Web Worker -> add-web-bindings -> add-core
  └── AddMapController
        └── AddRpgPhaserMapHost -> neutral world/topology/renderer packages
```

`main.ts` now sends every runtime command through `AddRuntimeBridge.dispatch`.
The bridge owns the worker URL, runtime client construction, one-command wait
serialization, snapshot versions, save waiters, and disposal. The map
controller owns the optional Phaser host and returns stable empty telemetry
before mount, which keeps Solid lifecycle code from checking renderer nullability
at every call site.

## Incremental extraction order

Extract along side effects and lifecycle ownership, not arbitrary line count:

1. Keep worker construction, protocol dispatch, snapshot/save synchronization,
   and runtime disposal in `AddRuntimeBridge`.
2. Keep Phaser lifecycle, world rendering, camera/selection/movement controls,
   and renderer probes in `AddMapController` plus the existing map host.
3. Keep `main.ts` as the composition root for Solid signals, domain selectors,
   player panels, map-mode routing, and player-flow orchestration until a
   fixture can protect a narrower boundary.
4. Extract panel families only when their state and acceptance flow are
   independently testable; panel modules may call an intent callback but must
   not import `SimulationClient` or mutate Rust-owned values.
5. Extract dev tools and live tuning after their command/report contract is
   stable; they remain diagnostic surfaces, not gameplay authorities.

This order makes each move reversible and keeps one runtime transport and one
gameplay authority. A new seam must name its owner, callback/command contract,
cleanup behavior, and focused browser or headless evidence before it is split.

## Focused verification

```sh
npm --workspace @aedventure/add-rpg run build:types
npm --workspace @aedventure/add-rpg run build:browser
npm run qa:add-rpg:phase5:built
npm run agent:verify:add-ui
```
