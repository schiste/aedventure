# @aedventure/add-protocol

The ADD runtime boundary: the TypeScript shape of everything that crosses
between the Rust/WASM simulation and the browser. Snapshot and catalog types,
worker requests and events.

This package is types only. It holds no gameplay rules, no authored content,
and no presentation logic, so anything may depend on it and it depends on
nothing.

It is the hand-written mirror of the Rust types in `crates/add-core`. When a
Rust state field changes, this is the file that has to change with it, and
`packages/add-domain/test/adapters.test.js` is what proves the two still
agree against a real WASM snapshot.

See [the three-brick contract](../../docs/lore-engine-content-bricks.md).
