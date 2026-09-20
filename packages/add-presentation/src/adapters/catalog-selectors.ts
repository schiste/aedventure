import type {
  CatalogSnapshot,
  EntitySchemaDef,
  FloraDef,
  ResourceDef,
  StructureDef,
  TileDef,
  UiElementDef,
  WorldActionDef,
} from "@aedventure/add-protocol"

export interface AddCatalogIndexes {
  readonly resourcesById: ReadonlyMap<string, ResourceDef>
  readonly tilesById: ReadonlyMap<string, TileDef>
  readonly floraById: ReadonlyMap<string, FloraDef>
  readonly structuresById: ReadonlyMap<string, StructureDef>
  readonly worldActionsById: ReadonlyMap<string, WorldActionDef>
  readonly entitySchemasById: ReadonlyMap<string, EntitySchemaDef>
  readonly uiElementsById: ReadonlyMap<string, UiElementDef>
}

export function createAddCatalogIndexes(catalog: CatalogSnapshot): AddCatalogIndexes {
  return {
    resourcesById: byId(catalog.resources),
    tilesById: byId(catalog.tiles),
    floraById: byId(catalog.flora),
    structuresById: byId(catalog.structures),
    worldActionsById: byId(catalog.worldActions),
    entitySchemasById: byId(catalog.entitySchemas),
    uiElementsById: byId(catalog.uiElements),
  }
}

export function selectAddTile(
  catalog: CatalogSnapshot,
  tileId: string,
): TileDef | undefined {
  return catalog.tiles.find((tile) => tile.id === tileId)
}

export function selectAddWorldAction(
  catalog: CatalogSnapshot,
  actionId: string,
): WorldActionDef | undefined {
  return catalog.worldActions.find((action) => action.id === actionId)
}

function byId<T extends { readonly id: string }>(items: readonly T[]): ReadonlyMap<string, T> {
  return new Map(items.map((item) => [item.id, item]))
}
