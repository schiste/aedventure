// The ADD content brick's public surface: everything authored, plus the lore
// links that say which canon subject each content ID implements.
//
// One deliberate exception. `content/objectives` declares an *authoring*
// `ObjectiveDef` carrying `conditions` and `rewards`, while
// `@aedventure/add-protocol` declares a *runtime* `ObjectiveDef` — the trimmed
// shape that actually reaches a snapshot. Both names are re-exported through
// `@aedventure/add-runtime-client`, so exporting the type here would be ambiguous.
// Only its values are re-exported; the type is deep-import only until one side
// is renamed. Nothing in the codegen pipeline is affected: the generator and
// the content tooling load every module by path.

export * from "./content/resources"
export * from "./content/content-version"
export * from "./content/roles"
export * from "./content/flags"
export * from "./content/flora"
export * from "./content/structures"
export * from "./content/tiles"
export * from "./content/stations"
export * from "./content/construction"
export * from "./content/world-actions"
export * from "./content/processing"
export * from "./content/story"
export * from "./content/content-validation"
export * from "./content/ui-elements"
export * from "./content/entity-schemas"
export * from "./content/loot-tables"
export * from "./content/lore-refs"
export * from "./content/balance"
export * from "./content/items"
export * from "./content/perks"
export * from "./content/creatures"
export * from "./content/encounter-tables"

export { OBJECTIVES, objectiveById } from "./content/objectives"

export * from "./dungeons/studio"
export * from "./dungeons/registry"

export * from "./areas/build-area-map"
export * from "./areas/registry"
export * from "./areas/studio-grounds"
