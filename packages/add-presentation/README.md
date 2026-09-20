# @aedventure/add-presentation

Derived presentation for the ADD game: the selectors that turn an authoritative
Rust snapshot into something a player-facing surface can render, plus the
explanations that say why an action is unavailable.

Everything here is a projection. This package reads the snapshot and the
authored catalogs; it never mutates state and it holds no gameplay rules. When
a selector needs to know a rule, it asks the runtime rather than recomputing
it - see the availability note in
[the narrative plan](../../docs/add-narrative-system-plan.md).

It depends on `@aedventure/add-protocol` for the snapshot shape and
`@aedventure/add-content` for the catalogs, and on nothing that renders. The
browser shell in `apps/add-rpg` consumes it through the `@aedventure/add-runtime-client`
barrel.

These selectors are tested from `@aedventure/add-runtime-client`, in
`test/adapters.test.js`, because the suite exercises the assembled surface -
the selectors plus the agent runtime report built on top of them - through the
barrel that consumers actually import. That includes the
authoritative-versus-derived consistency check, which loads the real WASM
runtime and a committed save and asserts that what these selectors report
matches what the simulation holds.

See [the three-brick contract](../../docs/lore-engine-content-bricks.md).
