/**
 * Stable browser hooks for player-facing QA.
 *
 * These identifiers describe the existing ADD surface; they are not a second
 * command system. Gameplay action IDs still come from the domain/runtime
 * contract and are only mirrored onto the DOM for deterministic inspection.
 */
export const ADD_BROWSER_QA_CONTRACT_VERSION = "add-browser-qa-v1" as const

export const ADD_QA_SELECTORS = {
  app: "add-app",
  mapStage: "map-stage",
  status: "status-bar",
  objective: "objective-tracker",
  currentAction: "current-action",
  mapControls: "map-controls",
  storyBrowser: "story-browser",
  storyCommands: "story-commands",
  saveTools: "save-tools",
  travelDialog: "travel-dialog",
  offlineReturn: "offline-return",
} as const

export const ADD_QA_ACTION_IDS = {
  timeToggleSpeed: "time.toggle-speed",
  menuOpenSettings: "menu.open.settings",
  menuOpenAdmin: "menu.open.admin",
  menuOpenDeveloper: "menu.open.developer",
  mapZoomIn: "map.zoom.in",
  mapZoomOut: "map.zoom.out",
  saveExport: "save.export",
  saveLoadAutosave: "save.load-autosave",
  saveImport: "save.import",
  offlineCatchupOneHour: "offline.catchup.1h",
  offlineDismiss: "offline-return.dismiss",
  storyOpenContext: "story.open-context",
  travelDismissWarning: "travel.dismiss-warning",
  travelCancel: "travel.cancel",
  travelConfirm: "travel.confirm",
} as const

export function addQaMapModeActionId(mode: string): string {
  return `map.open.${mode}`
}
