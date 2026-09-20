import { ADD_DOMAIN_BOUNDARY } from "@aedventure/add-runtime-client"

export interface AddRpgAppScaffold {
  readonly appId: "add-rpg"
  readonly boundary: typeof ADD_DOMAIN_BOUNDARY
}

export const ADD_RPG_APP_SCAFFOLD: AddRpgAppScaffold = {
  appId: "add-rpg",
  boundary: ADD_DOMAIN_BOUNDARY,
}
