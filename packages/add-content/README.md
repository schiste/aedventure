# @aedventure/add-content

The ADD content brick: the game as authored. Resources, roles, stations,
construction projects, world actions, processing recipes, story beats,
objectives, items, perks, creatures, tiles, dungeons and areas — their IDs,
their numbers and their copy.

Content is code-generated into the Rust catalogs under
`crates/add-core/src/game_data/catalog/` by `npm run content:build`. The engine
never imports this package; the generator places its data into the engine.

This package depends on `@aedventure/add-protocol` for the shapes it fills in,
and on neutral `@aedventure/game-*` primitives. It depends on no presentation
code, which is what lets the engine be built from it without dragging the
browser projection along.

`content/lore-refs.ts` is the one edge to the lore brick: it names the canon
subject each content ID implements, and is verified by
`npm run lore:refs:check`.

See [the three-brick contract](../../docs/lore-engine-content-bricks.md) and
[content authoring](../../docs/add-content-authoring.md).
