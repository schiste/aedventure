import {
  ADD_DOMAIN_BOUNDARY,
  addMapModeLabel,
  selectAddMapScaleForMode,
  type AddDungeonObjectiveSummary,
  type AddDiscoverySummary,
  type AddBaseManagementState,
  type AddBaseManagementTabId,
  type AddFirstPlayableAction,
  type AddMapMode,
  type AddMapScaleSummary,
  type AddOfflineReturnSummary,
  type AddUiState,
  type AddWorldTimeSummary,
  type CatalogSnapshot,
  type SimulationSnapshot,
} from "@aedventure/add-domain"

import type { AddPhaserMapInfo, AddCharacterTravelEvent } from "./phaser-add-map"
import {
  ADD_AUTOSAVE_STORAGE_KEY,
  type AddSaveSource,
} from "./save-runtime"
import { ADD_TILE_TRAVEL_PRESENTATION } from "./travel-presentation-timing"

export type AddTelemetryTravelDramaState = "fresh" | "declined_once" | "complete"
export type AddTelemetryTravelDialogKind =
  | "first_warning"
  | "second_warning"
  | "first_declined"
  | "dramatic_reprise"
export type AddTelemetryTravelDialogEligibilityReason =
  | "opening_reach_base_from_survivor_cave"
  | "already_complete"
  | "missing_state"
  | "not_overworld"
  | "not_reach_base_step"
  | "missing_survivor_cave"
  | "not_survivor_cave_start"
  | "not_leaving_survivor_cave"

export interface AddTelemetryTravelDialogEligibility {
  readonly eligible: boolean
  readonly reason: AddTelemetryTravelDialogEligibilityReason
}

export interface AddTelemetryTravelExperience {
  readonly phase: "traveling" | "arrived"
  readonly event: AddCharacterTravelEvent
  readonly fromClockSeconds: number
  readonly toClockSeconds: number
  readonly fromTime: AddWorldTimeSummary
  readonly toTime: AddWorldTimeSummary
  readonly startedAtMs: number
  readonly arrivalAtMs: number
  readonly runtimeSynced: boolean
  readonly toxicityBefore: number
  readonly toxicityAfter: number | null
}

export interface AddTelemetryClockAnimationState {
  readonly remainingMinutes: number
}

export type AddCurrentActionSource =
  | "offline_return"
  | "dungeon_objective"
  | "base_loop"
  | "discovery"
  | "first_playable"
  | "runtime"

export interface AddCurrentActionState {
  readonly source: AddCurrentActionSource
  readonly sourceLabel: string
  readonly label: string
  readonly detail: string
  readonly kind: string
  readonly enabled: boolean
  readonly primaryLabel: string | null
  readonly primaryEnabled: boolean
  readonly metaLabel: string
  readonly progressLabel: string | null
  readonly actionId: string | null
}

export interface AddInterfaceHierarchyState {
  readonly primary: {
    readonly label: "Map"
    readonly answer: string
  }
  readonly secondary: {
    readonly label: "Decision"
    readonly answer: string
    readonly actionLabel: string
    readonly actionEnabled: boolean
  }
  readonly tertiary: {
    readonly label: "Status"
    readonly answer: string
    readonly waitForecast: string
  }
  readonly advanced: {
    readonly label: "Admin"
    readonly hiddenByDefault: true
    readonly open: boolean
    readonly developerToolsOpen: boolean
    readonly runtimeInternalsHiddenByDefault: true
  }
  readonly questions: {
    readonly whereAmI: string
    readonly whatChanged: string
    readonly whatShouldIDoNow: string
    readonly whatHappensIfIWait: string
  }
}

export interface AddRuntimeTelemetryPresenterInput {
  readonly snapshot: SimulationSnapshot | null
  readonly catalog: CatalogSnapshot | null
  readonly ui: AddUiState | null
  readonly displayedWorldTime: AddWorldTimeSummary | null
  readonly displayClockSeconds: number | null
  readonly clockAnimation: AddTelemetryClockAnimationState | null
  readonly mapInfo: AddPhaserMapInfo
  readonly discovery: AddDiscoverySummary | null
  readonly baseManagement: AddBaseManagementState | null
  readonly baseManagementTab: AddBaseManagementTabId
  readonly baseRateChange: {
    readonly reason: string
    readonly summary: string
    readonly changes: readonly {
      readonly id: string
      readonly label: string
      readonly beforeNetPerSecond: number
      readonly afterNetPerSecond: number
      readonly deltaPerSecond: number
    }[]
  } | null
  readonly dungeonObjective: AddDungeonObjectiveSummary | null
  readonly mapMode: AddMapMode
  readonly mapModeAvailable: readonly AddMapMode[]
  readonly dungeonTarget: string | null
  readonly lastDungeonEntryCommand: string | null
  readonly lastTileActionTarget: string | null
  readonly currentAction: AddCurrentActionState
  readonly returnReviewNextAction: AddCurrentActionState
  readonly interfaceHierarchy: AddInterfaceHierarchyState
  readonly baseViewTransition: "idle" | "opening" | "settling"
  readonly shellMenuOpen: boolean
  readonly adminOpen: boolean
  readonly devToolsOpen: boolean
  readonly focusedRegion:
    | "world"
    | "topbar"
    | "context_panel"
    | "objective_tracker"
    | "map_controls"
    | "menu"
    | "admin"
    | "unknown"
  readonly discoveryPanelCollapsed: boolean
  readonly firstPlayableCollapsed: boolean
  readonly questPanelPosition: {
    readonly x: number
    readonly y: number
  }
  readonly questPanelInteraction: {
    readonly dragging: boolean
    readonly lastAction:
      | "idle"
      | "dragging"
      | "dragged"
      | "collapsed"
      | "expanded"
      | "keyboard_moved"
    readonly dragEnabled: true
    readonly keyboardMoveEnabled: true
    readonly collapseControlLabel: string
  }
  readonly runtime: {
    readonly ready: boolean
    readonly autoTick: boolean
    readonly timeSpeed: number
    readonly online: boolean
    readonly lastEvent: string
    readonly lastCommand: string | null
    readonly error: string | null
  }
  readonly travel: {
    readonly experience: AddTelemetryTravelExperience | null
    readonly dramaState: AddTelemetryTravelDramaState
    readonly dialogKind: AddTelemetryTravelDialogKind | null
    readonly confirmationEligibility: AddTelemetryTravelDialogEligibility
  }
  readonly offlineReturn: AddOfflineReturnSummary | null
  readonly persistence: {
    readonly autosaveEnabled: boolean
    readonly autosaveAvailable: boolean
    readonly lastAutosaveAtMs: number | null
    readonly lastAutosaveClockSeconds: number | null
    readonly lastAutosaveSource: AddSaveSource | null
    readonly lastManualExportAtMs: number | null
    readonly lastImportAtMs: number | null
    readonly lastOfflineCatchupSeconds: number
    readonly resetCount: number
    readonly savePayloadLength: number
    readonly status: string
    readonly storageError: string | null
    readonly firstPlayablePersistenceReady: boolean
  }
}

export interface RuntimeTextState {
  readonly app: "add-rpg"
  readonly coordinateSystem: "active ADD map mode projected through Phaser"
  readonly shell: {
    readonly framework: "solid"
    readonly surface: "fullscreen_map_shell"
    readonly hostsPhaserMap: boolean
    readonly interfaceHierarchy: AddInterfaceHierarchyState
    readonly baseViewTransition: "idle" | "opening" | "settling"
    readonly currentAction: AddCurrentActionState
    readonly shellMenuOpen: boolean
    readonly adminOpen: boolean
    readonly devToolsOpen: boolean
    readonly questPanel: {
      readonly collapsed: boolean
      readonly x: number
      readonly y: number
      readonly dragging: boolean
      readonly lastAction:
        | "idle"
        | "dragging"
        | "dragged"
        | "collapsed"
        | "expanded"
        | "keyboard_moved"
      readonly dragEnabled: true
      readonly keyboardMoveEnabled: true
      readonly collapseControlLabel: string
    }
    readonly accessibility: {
      readonly keyboardNavigation: true
      readonly focusVisible: true
      readonly focusedRegion:
        | "world"
        | "topbar"
        | "context_panel"
        | "objective_tracker"
        | "map_controls"
        | "menu"
        | "admin"
        | "unknown"
      readonly currentActionLiveRegion: "polite"
      readonly contextualPanelsLabelled: true
      readonly objectiveTrackerKeyboardMove: true
      readonly rightRailAvoidsScrollTrap: true
      readonly mobileBottomSheetAvoidsScrollTrap: true
      readonly shortcuts: readonly string[]
    }
    readonly visualPolish: {
      readonly surfaceSystem: "map_objective_context_status"
      readonly mapSurface: "full_bleed_phaser_stage"
      readonly objectiveSurface: "warm_progress_overlay"
      readonly contextSurface: "cool_decision_inspector"
      readonly statusSurface: "thin_resource_time_bar"
      readonly stateLayer: "native_loading_error_empty"
      readonly panelRhythm: "shared_spacing_border_shadow_tokens"
      readonly transitions: "cohesive_motion_with_reduced_motion_guard"
      readonly worldUiIntegration: "glass_surfaces_over_living_map"
    }
    readonly discoveryPanel: {
      readonly collapsed: boolean
    }
  }
  readonly boundary: typeof ADD_DOMAIN_BOUNDARY
  readonly runtime: {
    readonly workerBoundary: "ui-worker-rust-wasm-snapshot"
    readonly ready: boolean
    readonly snapshotReceived: boolean
    readonly catalogReceived: boolean
    readonly autoTick: boolean
    readonly timeSpeed: number
    readonly online: boolean
    readonly lastEvent: string
    readonly lastCommand: string | null
    readonly error: string | null
  }
  readonly snapshot: {
    readonly clockSeconds: number
    readonly hexCount: number
    readonly stabilizedHexes: number
    readonly discoveredCellCount: number
    readonly discoveredCells: readonly string[]
    readonly heroMap: string
    readonly heroAssigned: boolean
    readonly activeWorldAction: string | null
    readonly resources: {
      readonly bassline: number
      readonly chorus: number
      readonly harmonics: number
      readonly stone: number
      readonly water: number
      readonly vibes: number
    }
    readonly base: {
      readonly tutorialInvestigated: boolean
      readonly tutorialExplored: boolean
      readonly studioRestoreUnlocked: boolean
      readonly studioRestored: boolean
      readonly firePitBuilt: boolean
      readonly bunksCapacity: number
      readonly freeBunks: number
    }
    readonly roster: {
      readonly heroRoleId: string
      readonly totalCrew: number
      readonly crewByRole: Record<string, number>
    }
    readonly heroSurvival: {
      readonly location: string
      readonly viralLoadRatio: number
      readonly debuffTier: number
      readonly movementSpeedMultiplier: number
      readonly encounterRateMultiplier: number
      readonly forcedReturnPhase: string | null
    }
    readonly bubble: {
      readonly reachFromBase: number
      readonly fieldBudget: number
      readonly targetRing: number
      readonly frontierProgress: number
    }
    readonly recruitment: {
      readonly totalRecruitedThisRun: number
      readonly pendingCount: number
      readonly nextRecruitCost: number
    }
    readonly activeConstruction: {
      readonly optionId: string
      readonly remainingSeconds: number
    } | null
  } | null
  readonly ui: {
    readonly worldTime: {
      readonly day: number
      readonly referenceDate: string
      readonly localTime: string
      readonly season: string
      readonly seasonLabel: string
      readonly daylightPhase: string
      readonly daylightRatio: number
      readonly nightRatio: number
      readonly sunrise: string
      readonly sunset: string
      readonly location: string
      readonly source: string
      readonly presentationClockSeconds: number
      readonly authoritativeClockSeconds: number
      readonly animating: boolean
      readonly remainingMinutes: number
    }
    readonly resourceCount: number
    readonly resourceFlows: readonly {
      readonly id: string
      readonly source: string
      readonly sink: string
      readonly blocker: string | null
    }[]
    readonly noteCount: number
    readonly activeStoryBeatId: string | null
    readonly storyChoiceIds: readonly string[]
    readonly storyProgression: {
      readonly activeBeatId: string | null
      readonly activeArc: string | null
      readonly completedBeatIds: readonly string[]
      readonly currentBeatIds: readonly string[]
      readonly upcomingBeatIds: readonly string[]
      readonly nextLikelyBeatId: string | null
      readonly primaryActionSource: string
      readonly primaryActionEnabled: boolean
      readonly blockerKind: string
      readonly firstPlayableStepId: string | null
      readonly firstPlayableComplete: boolean
      readonly awaitingChoice: boolean
      readonly unlockPreviewIds: readonly string[]
    }
    readonly enabledWorldActionIds: readonly string[]
    readonly roleAssignments: readonly {
      readonly id: string
      readonly available: boolean
      readonly heroAssigned: boolean
      readonly crewAssigned: number
    }[]
    readonly constructionOptions: readonly {
      readonly id: string
      readonly complete: boolean
      readonly enabled: boolean
      readonly inProgress: boolean
      readonly blockedReason: string | null
    }[]
    readonly objectiveReachMet: boolean
    readonly recruitmentEnabled: boolean
    readonly firstPlayable: {
      readonly complete: boolean
      readonly completedCount: number
      readonly totalCount: number
      readonly currentStepId: string | null
      readonly currentAction: AddFirstPlayableAction | null
      readonly steps: readonly {
        readonly id: string
        readonly complete: boolean
        readonly active: boolean
        readonly actionLabel: string | null
      }[]
      readonly persistenceReady: boolean
    }
  } | null
  readonly mapMode: {
    readonly active: AddMapMode
    readonly label: string
    readonly dungeonTarget: string | null
    readonly lastDungeonEntryCommand: string | null
    readonly lastTileActionTarget: string | null
    readonly available: readonly AddMapMode[]
    readonly topology: "hex" | "square" | "unknown"
    readonly fixture: boolean
    readonly scale: AddMapScaleSummary
  }
  readonly travel: {
    readonly costGameMinutes: number
    readonly costRuntimeSeconds: number
    readonly presentationDurationMs: number
    readonly clockStepMs: number
    readonly active: boolean
    readonly phase: "idle" | "preview" | "traveling" | "arrived"
    readonly progress: number
    readonly fromTime: string | null
    readonly toTime: string | null
    readonly destinationLabel: string | null
    readonly exposureRisk: string | null
    readonly runtimeSynced: boolean
    readonly toxicityBefore: number | null
    readonly toxicityAfter: number | null
    readonly previewCell: string | null
    readonly previewLabel: string | null
    readonly previewAdjacent: boolean
    readonly confirmation: {
      readonly dramaState: AddTelemetryTravelDramaState
      readonly dialogOpen: boolean
      readonly dialogKind: AddTelemetryTravelDialogKind | null
      readonly eligible: boolean
      readonly reason: AddTelemetryTravelDialogEligibilityReason
    }
  }
  readonly map: AddPhaserMapInfo
  readonly offlineReturn: {
    readonly source: "autosave" | "manual"
    readonly elapsedSeconds: number
    readonly elapsedLabel: string
    readonly headline: string
    readonly summary: string
    readonly resourceDeltas: readonly {
      readonly id: string
      readonly label: string
      readonly delta: number
      readonly before: number
      readonly after: number
    }[]
    readonly jobsCompleted: readonly {
      readonly id: string
      readonly label: string
      readonly kind: "construction" | "processing" | "expedition" | "resonance"
    }[]
    readonly recruitsArrived: number
    readonly bubble: {
      readonly reachDelta: number
      readonly fieldBudgetDelta: number
      readonly stabilizedHexesDelta: number
      readonly summary: string
    }
    readonly brownout: {
      readonly occurred: boolean
      readonly affectedStations: readonly string[]
      readonly summary: string
    }
    readonly didNotProgress: readonly {
      readonly id: string
      readonly label: string
      readonly detail: string
    }[]
    readonly nextAction: {
      readonly source: AddCurrentActionSource
      readonly label: string
      readonly detail: string
      readonly actionId: string | null
    }
    readonly review: {
      readonly changedCount: number
      readonly completedCount: number
      readonly blockerCount: number
      readonly unchangedCount: number
      readonly manualProgressionRule: string
    }
  } | null
  readonly discovery: {
    readonly phase: string
    readonly headline: string
    readonly nextAction: {
      readonly label: string
      readonly detail: string
      readonly kind: string
      readonly enabled: boolean
      readonly actionId: string | null
      readonly inputHint: string | null
    }
    readonly movementDiscoveredDelta: number
    readonly movementToxicityDelta: number
    readonly movementConsequences: {
      readonly active: boolean
      readonly viralLoad: {
        readonly before: number | null
        readonly after: number
        readonly delta: number
        readonly percent: number
      }
      readonly timeOfDay: {
        readonly localTime: string
        readonly phase: string
        readonly riskModifier: string
      }
      readonly safety: {
        readonly severity: string
        readonly headline: string
        readonly secondsUntilForcedReturn: number
        readonly pointOfNoReturnRatio: number
        readonly forcedReturnPhase: string | null
      }
      readonly warnings: readonly string[]
      readonly futureAuthority: string
    }
    readonly tileChoiceCount: number
    readonly tileChoices: readonly {
      readonly id: string
      readonly label: string
      readonly cell: string
      readonly visibility: string
      readonly risk: string
      readonly adjacent: boolean
      readonly dungeonCount: number
      readonly actionLabel: string
      readonly actionHint: string
      readonly decisionState: string
    }[]
    readonly selectedTile: {
      readonly cell: string
      readonly label: string
      readonly travelMinutes: number
      readonly travelRisk: string
      readonly standingHere: boolean
      readonly canTravelNow: boolean
      readonly knownFacts: readonly string[]
      readonly unknownFacts: readonly string[]
      readonly dungeonLinkCount: number
      readonly usefulnessLevel: string
      readonly usefulnessReasons: readonly string[]
    } | null
    readonly tileDetail: {
      readonly cell: string
      readonly label: string
      readonly visibility: string
      readonly terrain: string | null
      readonly feature: string | null
      readonly hasSubmap: boolean
      readonly linkCount: number
      readonly visibleLinkIds: readonly string[]
      readonly enabledLinkIds: readonly string[]
      readonly linkKinds: readonly string[]
      readonly linkLabels: readonly string[]
      readonly targetMapModes: readonly string[]
      readonly targetMapIds: readonly string[]
      readonly actionIds: readonly string[]
      readonly actionKinds: readonly string[]
      readonly enabledActionIds: readonly string[]
      readonly disabledActionReasons: readonly {
        readonly id: string
        readonly label: string
        readonly reason: string
      }[]
      readonly primaryAction: {
        readonly id: string
        readonly label: string
        readonly enabled: boolean
        readonly blockedReason: string | null
      } | null
    } | null
    readonly dungeonEntryAvailable: boolean
    readonly dungeonEntryTarget: string | null
    readonly enabledActionIds: readonly string[]
    readonly relevantResourceIds: readonly string[]
  } | null
  readonly baseManagement: {
    readonly active: boolean
    readonly title: string
    readonly selectedTab: AddBaseManagementTabId
    readonly tabIds: readonly AddBaseManagementTabId[]
    readonly nextBottleneck: {
      readonly id: string
      readonly label: string
      readonly severity: string
    }
    readonly recommendedAction: {
      readonly id: string
      readonly label: string
      readonly kind: string
      readonly targetId: string | null
      readonly enabled: boolean
    }
    readonly rateChange: {
      readonly reason: string
      readonly summary: string
      readonly changes: readonly {
        readonly id: string
        readonly label: string
        readonly beforeNetPerSecond: number
        readonly afterNetPerSecond: number
        readonly deltaPerSecond: number
      }[]
    } | null
    readonly playerLoop: {
      readonly summary: string
      readonly currentStepId: string
      readonly health: {
        readonly status: string
        readonly label: string
        readonly severity: string
      }
      readonly bottleneck: {
        readonly id: string
        readonly label: string
        readonly severity: string
      }
      readonly rateWatch: {
        readonly summary: string
        readonly rates: readonly {
          readonly resourceId: string
          readonly netPerSecond: number
          readonly copy: string
        }[]
      }
      readonly growthPush: {
        readonly label: string
        readonly tabId: AddBaseManagementTabId
      }
      readonly returnPlan: {
        readonly summary: string
        readonly horizonSeconds: number | null
      }
      readonly decisionHint: string
      readonly steps: readonly {
        readonly id: string
        readonly status: string
        readonly tabId: AddBaseManagementTabId | null
      }[]
    }
    readonly resourcePressure: readonly {
      readonly id: string
      readonly value: number
      readonly cap: number
      readonly gainPerSecond: number
      readonly spendPerSecond: number
      readonly netPerSecond: number
      readonly capPressure: string
      readonly timeToCapSeconds: number | null
      readonly timeToAffordSeconds: number | null
      readonly affordabilityTargetLabel: string | null
      readonly productionZeroReason: string | null
      readonly blocker: string | null
    }[]
    readonly economy: {
      readonly limitingResource: {
        readonly resourceId: string
        readonly resourceLabel: string
        readonly targetId: string
        readonly targetLabel: string
        readonly timeToAffordSeconds: number | null
        readonly copy: string
      } | null
      readonly stalledSystems: readonly {
        readonly id: string
        readonly label: string
        readonly reason: string
        readonly severity: string
        readonly relatedResourceId: string | null
      }[]
      readonly waitForecasts: readonly {
        readonly label: string
        readonly horizonSeconds: number
        readonly summary: string
        readonly resourceDeltas: readonly {
          readonly id: string
          readonly delta: number
          readonly valueAfter: number
          readonly capReached: boolean
        }[]
      }[]
      readonly offlinePreview: {
        readonly enabled: boolean
        readonly summary: string
        readonly caveat: string
      }
    }
    readonly socialPressure: {
      readonly status: string
      readonly headline: string
      readonly detail: string
      readonly vibes: {
        readonly value: number
        readonly cap: number
        readonly gainPerSecond: number
        readonly lossPerSecond: number
        readonly netPerSecond: number
        readonly explanation: string
        readonly lossExplanation: string
        readonly timeToNextRecruitSeconds: number | null
      }
      readonly housing: {
        readonly capacity: number
        readonly occupied: number
        readonly free: number
        readonly missing: number
        readonly pressure: string
        readonly overcrowdedSeconds: number
        readonly warning: string
      }
      readonly recruitment: {
        readonly enabled: boolean
        readonly pendingCount: number
        readonly nextCost: number
        readonly canAfford: boolean
        readonly canRecruitNow: boolean
        readonly blocker: string | null
        readonly costProjection: string
      }
      readonly pendingArrivals: readonly {
        readonly id: string
        readonly remainingSeconds: number
        readonly progressPercent: number
      }[]
      readonly supportForecast: {
        readonly canSupport: boolean
        readonly status: string
        readonly bunksAfterArrival: number
        readonly missingBunksAfterArrival: number
        readonly vibesAfterCommit: number
        readonly copy: string
        readonly warning: string | null
      }
    }
    readonly rolePressure: readonly {
      readonly id: string
      readonly heroAssigned: boolean
      readonly crewAssigned: number
      readonly suggestedCrew: number
      readonly slotPool: string
      readonly slotPressure: string
      readonly outputResourceId: string | null
      readonly currentNetPerSecond: number
      readonly nextWorkerDeltaPerSecond: number
      readonly pressureCopy: string
    }[]
    readonly staffing: {
      readonly freeCrew: number
      readonly assignedCrew: number
      readonly totalCrew: number
      readonly heroRoleId: string
      readonly heroRoleLabel: string
      readonly heroAssigned: boolean
      readonly currentPresetId: string | null
      readonly slotPools: readonly {
        readonly id: string
        readonly occupied: number
        readonly capacity: number
        readonly free: number
        readonly pressure: string
      }[]
      readonly presets: readonly {
        readonly id: string
        readonly label: string
        readonly enabled: boolean
        readonly disabledReason: string | null
        readonly heroRoleId: string
        readonly crewByRole: Record<string, number>
      }[]
      readonly visibleImpact: {
        readonly rateSummary: string
        readonly riskSummary: string
        readonly bottleneckSummary: string
      }
    }
    readonly expeditions: {
      readonly summary: string
      readonly availableCrew: number
      readonly assignedCrew: number
      readonly activeCount: number
      readonly completedReportCount: number
      readonly totalWounds: number
      readonly totalClues: number
      readonly totalDungeonLeads: number
      readonly recommendedTargetId: string | null
      readonly targets: readonly {
        readonly id: string
        readonly enabled: boolean
        readonly disabledReason: string | null
        readonly durationSeconds: number
        readonly requiredCrew: number
        readonly requiredBubbleReach: number
        readonly risk: string
        readonly expectedLootCopy: string
      }[]
      readonly activeJobs: readonly {
        readonly id: number
        readonly targetId: string
        readonly label: string
        readonly assignedCrew: number
        readonly remainingSeconds: number
        readonly progressPercent: number
        readonly risk: string
      }[]
      readonly reports: readonly {
        readonly id: number
        readonly targetId: string
        readonly rewardCopy: string
        readonly resonanceCopy: string
        readonly woundCopy: string
        readonly clueCopy: string
      }[]
    }
    readonly resonance: {
      readonly summary: string
      readonly expeditionSupportLevel: number
      readonly activeJobCount: number
      readonly completedReportCount: number
      readonly recommendedRecipeId: string | null
      readonly materials: readonly {
        readonly id: string
        readonly value: number
      }[]
      readonly tuning: {
        readonly basslineLevel: number
        readonly chorusLevel: number
        readonly harmonicsLevel: number
        readonly basslineBonusPercent: number
        readonly chorusBonusPercent: number
        readonly harmonicsBonusPercent: number
      }
      readonly recipes: readonly {
        readonly id: string
        readonly stationId: string
        readonly enabled: boolean
        readonly inProgress: boolean
        readonly blockedReason: string | null
        readonly progressPercent: number
        readonly effectLabel: string
        readonly costLabel: string
      }[]
      readonly stationSpecializations: readonly {
        readonly stationId: string
        readonly currentPath: string
      }[]
    }
    readonly activeConstructionId: string | null
    readonly enabledConstructionIds: readonly string[]
    readonly buildLoop: {
      readonly summary: string
      readonly assignedWorkers: number
      readonly workerThroughputPerSecond: number
      readonly readyProjectCount: number
      readonly blockedProjectCount: number
      readonly activeJobId: string | null
      readonly groups: readonly {
        readonly id: string
        readonly label: string
        readonly projectIds: readonly string[]
      }[]
      readonly projects: readonly {
        readonly id: string
        readonly label: string
        readonly category: string
        readonly complete: boolean
        readonly enabled: boolean
        readonly inProgress: boolean
        readonly progressPercent: number
        readonly estimatedCompletionSeconds: number | null
        readonly missingResource: string | null
        readonly resultPreview: string
        readonly futureEconomyChange: string
        readonly basslineRiskSeverity: string
        readonly basslineRiskCopy: string
      }[]
    }
    readonly stationMachine: {
      readonly summary: string
      readonly poweredCount: number
      readonly brownedOutCount: number
      readonly activeJobCount: number
      readonly requestedUpkeepPerSecond: number
      readonly activeUpkeepPerSecond: number
      readonly groups: readonly {
        readonly id: string
        readonly label: string
        readonly cardIds: readonly string[]
      }[]
      readonly cards: readonly {
        readonly id: string
        readonly label: string
        readonly group: string
        readonly status: string
        readonly built: boolean
        readonly locked: boolean
        readonly powered: boolean
        readonly brownedOut: boolean
        readonly requestedEnabled: boolean
        readonly chorusUpkeepPerSecond: number
        readonly brownoutPriority: number | null
        readonly currentJobId: string | null
        readonly currentJobLabel: string | null
        readonly availableRecipeIds: readonly string[]
        readonly enabledRecipeIds: readonly string[]
        readonly outputEffect: string
        readonly blockedReason: string | null
        readonly brownoutPriorityCopy: string
      }[]
    }
    readonly poweredStationIds: readonly string[]
    readonly requestedStationIds: readonly string[]
    readonly activeProcessingIds: readonly string[]
    readonly enabledProcessingIds: readonly string[]
    readonly bunks: {
      readonly free: number
      readonly missing: number
      readonly pressure: string
    }
    readonly recruitment: {
      readonly enabled: boolean
      readonly pending: number
      readonly nextCost: number
      readonly pressure: string
    }
    readonly power: {
      readonly activeUpkeepPerSecond: number
      readonly requestedUpkeepPerSecond: number
      readonly brownoutActive: boolean
    }
  } | null
  readonly dungeonObjective: {
    readonly active: boolean
    readonly dungeonId: string
    readonly mapId: string
    readonly label: string
    readonly headline: string
    readonly currentStepId: string
    readonly returnAvailable: boolean
    readonly stepStatuses: readonly {
      readonly id: string
      readonly status: string
    }[]
  } | null
  readonly dungeonContext: {
    readonly active: boolean
    readonly panel: "dungeon_context"
    readonly currentObjective: {
      readonly label: string
      readonly headline: string
      readonly currentStepId: string
    }
    readonly returnAction: {
      readonly label: string
      readonly available: boolean
    }
    readonly discoveredExits: {
      readonly count: number
      readonly labels: readonly string[]
    }
    readonly blockers: {
      readonly hiddenCells: number
      readonly blockedCells: number
      readonly activeBlocker: string | null
      readonly validationWarning: string | null
    }
    readonly localMapState: {
      readonly totalCells: number
      readonly visibleCells: number
      readonly hiddenCells: number
      readonly blockedCells: number
      readonly heroCell: string | null
      readonly selectedCell: string | null
      readonly facing: string | null
    }
  } | null
  readonly persistence: {
    readonly storageKey: string
    readonly autosaveEnabled: boolean
    readonly autosaveAvailable: boolean
    readonly lastAutosaveAtMs: number | null
    readonly lastAutosaveClockSeconds: number | null
    readonly lastAutosaveSource: AddSaveSource | null
    readonly lastManualExportAtMs: number | null
    readonly lastImportAtMs: number | null
    readonly lastOfflineCatchupSeconds: number
    readonly resetCount: number
    readonly savePayloadLength: number
    readonly status: string
    readonly storageError: string | null
  }
  readonly catalog: {
    readonly resourceCount: number
    readonly roleCount: number
    readonly tileCount: number
    readonly worldActionCount: number
  } | null
}

export function createAddRuntimeTextState(
  input: AddRuntimeTelemetryPresenterInput,
): RuntimeTextState {
  const worldTime = input.displayedWorldTime ?? input.ui?.worldTime ?? null
  return {
    app: "add-rpg",
    coordinateSystem: "active ADD map mode projected through Phaser",
    shell: {
      framework: "solid",
      surface: "fullscreen_map_shell",
      hostsPhaserMap: true,
      interfaceHierarchy: input.interfaceHierarchy,
      baseViewTransition: input.baseViewTransition,
      currentAction: input.currentAction,
      shellMenuOpen: input.shellMenuOpen,
      adminOpen: input.adminOpen,
      devToolsOpen: input.devToolsOpen,
      questPanel: {
        collapsed: input.firstPlayableCollapsed,
        x: input.questPanelPosition.x,
        y: input.questPanelPosition.y,
        dragging: input.questPanelInteraction.dragging,
        lastAction: input.questPanelInteraction.lastAction,
        dragEnabled: input.questPanelInteraction.dragEnabled,
        keyboardMoveEnabled: input.questPanelInteraction.keyboardMoveEnabled,
        collapseControlLabel: input.questPanelInteraction.collapseControlLabel,
      },
      accessibility: {
        keyboardNavigation: true,
        focusVisible: true,
        focusedRegion: input.focusedRegion,
        currentActionLiveRegion: "polite",
        contextualPanelsLabelled: true,
        objectiveTrackerKeyboardMove: true,
        rightRailAvoidsScrollTrap: true,
        mobileBottomSheetAvoidsScrollTrap: true,
        shortcuts: [
          "Tab / Shift+Tab moves through panels and controls",
          "Escape closes the menu or admin view",
          "Arrow keys move the focused objective tracker handle",
          "Enter or Space toggles the focused objective tracker",
        ],
      },
      visualPolish: {
        surfaceSystem: "map_objective_context_status",
        mapSurface: "full_bleed_phaser_stage",
        objectiveSurface: "warm_progress_overlay",
        contextSurface: "cool_decision_inspector",
        statusSurface: "thin_resource_time_bar",
        stateLayer: "native_loading_error_empty",
        panelRhythm: "shared_spacing_border_shadow_tokens",
        transitions: "cohesive_motion_with_reduced_motion_guard",
        worldUiIntegration: "glass_surfaces_over_living_map",
      },
      discoveryPanel: {
        collapsed: input.discoveryPanelCollapsed,
      },
    },
    boundary: ADD_DOMAIN_BOUNDARY,
    runtime: {
      workerBoundary: "ui-worker-rust-wasm-snapshot",
      ready: input.runtime.ready,
      snapshotReceived: input.snapshot !== null,
      catalogReceived: input.catalog !== null,
      autoTick: input.runtime.autoTick,
      timeSpeed: input.runtime.timeSpeed,
      online: input.runtime.online,
      lastEvent: input.runtime.lastEvent,
      lastCommand: input.runtime.lastCommand,
      error: input.runtime.error,
    },
    snapshot: input.snapshot ? snapshotTelemetry(input.snapshot) : null,
    ui: input.ui && worldTime ? uiTelemetry(input, worldTime) : null,
    mapMode: {
      active: input.mapMode,
      label: addMapModeLabel(input.mapMode),
      dungeonTarget: input.dungeonTarget,
      lastDungeonEntryCommand: input.lastDungeonEntryCommand,
      lastTileActionTarget: input.lastTileActionTarget,
      available: input.mapModeAvailable,
      topology: input.mapInfo.topology.kind,
      fixture: input.mapInfo.topology.fixture,
      scale: selectAddMapScaleForMode(input.mapMode),
    },
    travel: travelTelemetry(input),
    map: input.mapInfo,
    offlineReturn: offlineReturnTelemetry(input.offlineReturn, input.returnReviewNextAction),
    discovery: input.discovery
      ? {
          phase: input.discovery.phase,
          headline: input.discovery.headline,
          nextAction: {
            label: input.discovery.nextAction.label,
            detail: input.discovery.nextAction.detail,
            kind: input.discovery.nextAction.kind,
            enabled: input.discovery.nextAction.enabled,
            actionId: input.discovery.nextAction.actionId,
            inputHint: input.discovery.nextAction.inputHint,
          },
          movementDiscoveredDelta: input.discovery.movement.discoveredDelta,
          movementToxicityDelta: round3(input.discovery.movement.toxicityDelta),
          movementConsequences: {
            active: input.discovery.movementConsequences.active,
            viralLoad: {
              before:
                input.discovery.movementConsequences.viralLoad.before === null
                  ? null
                  : round3(input.discovery.movementConsequences.viralLoad.before),
              after: round3(input.discovery.movementConsequences.viralLoad.after),
              delta: round3(input.discovery.movementConsequences.viralLoad.delta),
              percent: input.discovery.movementConsequences.viralLoad.percent,
            },
            timeOfDay: {
              localTime: input.discovery.movementConsequences.timeOfDay.localTime,
              phase: input.discovery.movementConsequences.timeOfDay.phase,
              riskModifier: input.discovery.movementConsequences.timeOfDay.riskModifier,
            },
            safety: {
              severity: input.discovery.movementConsequences.safety.severity,
              headline: input.discovery.movementConsequences.safety.headline,
              secondsUntilForcedReturn:
                input.discovery.movementConsequences.safety.secondsUntilForcedReturn,
              pointOfNoReturnRatio:
                input.discovery.movementConsequences.safety.pointOfNoReturnRatio,
              forcedReturnPhase:
                input.discovery.movementConsequences.safety.forcedReturnPhase,
            },
            warnings: input.discovery.movementConsequences.warnings,
            futureAuthority: input.discovery.movementConsequences.futureAuthority,
          },
          tileChoiceCount: input.discovery.tileChoices.length,
          tileChoices: input.discovery.tileChoices.map((choice) => ({
            id: choice.id,
            label: choice.label,
            cell: choice.cell,
            visibility: choice.visibility,
            risk: choice.risk,
            adjacent: choice.adjacent,
            dungeonCount: choice.dungeonCount,
            actionLabel: choice.actionLabel,
            actionHint: choice.actionHint,
            decisionState: choice.decisionState,
          })),
          selectedTile: input.discovery.selectedTile
            ? {
                cell: input.discovery.selectedTile.cell,
                label: input.discovery.selectedTile.label,
                travelMinutes: input.discovery.selectedTile.travel.gameMinutes,
                travelRisk: input.discovery.selectedTile.travel.risk,
                standingHere: input.discovery.selectedTile.travel.standingHere,
                canTravelNow: input.discovery.selectedTile.travel.canTravelNow,
                knownFacts: input.discovery.selectedTile.facts.known,
                unknownFacts: input.discovery.selectedTile.facts.unknown,
                dungeonLinkCount: input.discovery.selectedTile.dungeonLinks.count,
                usefulnessLevel: input.discovery.selectedTile.usefulness.level,
                usefulnessReasons: input.discovery.selectedTile.usefulness.reasons,
              }
            : null,
          tileDetail: input.discovery.tileDetail
            ? {
                cell: input.discovery.tileDetail.cell,
                label: input.discovery.tileDetail.label,
                visibility: input.discovery.tileDetail.visibility,
                terrain: input.discovery.tileDetail.terrain,
                feature: input.discovery.tileDetail.feature,
                hasSubmap: input.discovery.tileDetail.hasSubmap,
                linkCount: input.discovery.tileDetail.links.length,
                visibleLinkIds: input.discovery.tileDetail.links
                  .filter((link) => link.visible)
                  .map((link) => link.id),
                enabledLinkIds: input.discovery.tileDetail.links
                  .filter((link) => link.enabled)
                  .map((link) => link.id),
                linkKinds: input.discovery.tileDetail.links.map((link) => link.kind),
                linkLabels: input.discovery.tileDetail.links.map((link) => link.label),
                targetMapModes: input.discovery.tileDetail.links.flatMap((link) =>
                  link.targetMapMode ? [link.targetMapMode] : [],
                ),
                targetMapIds: input.discovery.tileDetail.links.flatMap((link) =>
                  link.targetMapId ? [link.targetMapId] : [],
                ),
                actionIds: input.discovery.tileDetail.actions.map((action) => action.id),
                actionKinds: input.discovery.tileDetail.actions.map((action) => action.kind),
                enabledActionIds: input.discovery.tileDetail.actions
                  .filter((action) => action.enabled)
                  .map((action) => action.id),
                disabledActionReasons: input.discovery.tileDetail.actions
                  .filter((action) => !action.enabled && action.blockedReason)
                  .map((action) => ({
                    id: action.id,
                    label: action.label,
                    reason: action.blockedReason ?? "Action is not currently available.",
                  })),
                primaryAction: input.discovery.tileDetail.actions[0]
                  ? {
                      id: input.discovery.tileDetail.actions[0].id,
                      label: input.discovery.tileDetail.actions[0].label,
                      enabled: input.discovery.tileDetail.actions[0].enabled,
                      blockedReason: input.discovery.tileDetail.actions[0].blockedReason,
                    }
                  : null,
              }
            : null,
          dungeonEntryAvailable: input.discovery.dungeonEntry?.enabled ?? false,
          dungeonEntryTarget: input.discovery.dungeonEntry?.targetMapId ?? null,
          enabledActionIds: input.discovery.actionLinks
            .filter((link) => link.enabled)
            .map((link) => link.id),
          relevantResourceIds: input.discovery.resourceLinks
            .filter((link) => link.relevant)
            .map((link) => link.id),
        }
      : null,
    baseManagement: baseManagementTelemetry(input),
    dungeonObjective: input.dungeonObjective
      ? {
          active: input.dungeonObjective.active,
          dungeonId: input.dungeonObjective.dungeonId,
          mapId: input.dungeonObjective.mapId,
          label: input.dungeonObjective.label,
          headline: input.dungeonObjective.headline,
          currentStepId: input.dungeonObjective.currentStepId,
          returnAvailable: input.mapMode === "dungeon_square",
          stepStatuses: input.dungeonObjective.steps.map((step) => ({
            id: step.id,
            status: step.status,
          })),
        }
      : null,
    dungeonContext: dungeonContextTelemetry(input),
    persistence: {
      storageKey: ADD_AUTOSAVE_STORAGE_KEY,
      autosaveEnabled: input.persistence.autosaveEnabled,
      autosaveAvailable: input.persistence.autosaveAvailable,
      lastAutosaveAtMs: input.persistence.lastAutosaveAtMs,
      lastAutosaveClockSeconds: input.persistence.lastAutosaveClockSeconds,
      lastAutosaveSource: input.persistence.lastAutosaveSource,
      lastManualExportAtMs: input.persistence.lastManualExportAtMs,
      lastImportAtMs: input.persistence.lastImportAtMs,
      lastOfflineCatchupSeconds: input.persistence.lastOfflineCatchupSeconds,
      resetCount: input.persistence.resetCount,
      savePayloadLength: input.persistence.savePayloadLength,
      status: input.persistence.status,
      storageError: input.persistence.storageError,
    },
    catalog: input.catalog
      ? {
          resourceCount: input.catalog.resources.length,
          roleCount: input.catalog.roles.length,
          tileCount: input.catalog.tiles.length,
          worldActionCount: input.catalog.worldActions.length,
        }
      : null,
  }
}

function offlineReturnTelemetry(
  summary: AddOfflineReturnSummary | null,
  nextAction: AddCurrentActionState,
): RuntimeTextState["offlineReturn"] {
  if (!summary) return null
  const blockerCount = summary.didNotProgress.length + (summary.brownout.occurred ? 1 : 0)
  return {
    source: summary.source,
    elapsedSeconds: round2(summary.elapsedSeconds),
    elapsedLabel: summary.elapsedLabel,
    headline: summary.headline,
    summary: summary.summary,
    resourceDeltas: summary.resourcesGained.map((resource) => ({
      id: resource.id,
      label: resource.label,
      delta: round2(resource.delta),
      before: round2(resource.before),
      after: round2(resource.after),
    })),
    jobsCompleted: summary.jobsCompleted.map((job) => ({
      id: job.id,
      label: job.label,
      kind: job.kind,
    })),
    recruitsArrived: summary.recruitsArrived,
    bubble: {
      reachDelta: summary.bubble.reachDelta,
      fieldBudgetDelta: round2(summary.bubble.fieldBudgetDelta),
      stabilizedHexesDelta: summary.bubble.stabilizedHexesDelta,
      summary: summary.bubble.summary,
    },
    brownout: {
      occurred: summary.brownout.occurred,
      affectedStations: summary.brownout.affectedStations,
      summary: summary.brownout.summary,
    },
    didNotProgress: summary.didNotProgress.map((rule) => ({
      id: rule.id,
      label: rule.label,
      detail: rule.detail,
    })),
    nextAction: {
      source: nextAction.source,
      label: nextAction.label,
      detail: nextAction.detail,
      actionId: nextAction.actionId,
    },
    review: {
      changedCount: summary.resourcesGained.length,
      completedCount: summary.jobsCompleted.length,
      blockerCount,
      unchangedCount: summary.didNotProgress.length,
      manualProgressionRule:
        "Automated/systemic loops can resolve offline; manual Hero/world actions and local collection require online input.",
    },
  }
}

function snapshotTelemetry(snapshot: SimulationSnapshot): NonNullable<RuntimeTextState["snapshot"]> {
  return {
    clockSeconds: round2(snapshot.clockSeconds),
    hexCount: snapshot.hexes.length,
    stabilizedHexes: snapshot.bubble.stabilizedHexes,
    discoveredCellCount: snapshot.discoveredCells.length,
    discoveredCells: snapshot.discoveredCells.map((coord) => `${coord.q},${coord.r}`),
    heroMap: `${snapshot.heroMap.q},${snapshot.heroMap.r}`,
    heroAssigned: snapshot.roster.heroAssigned,
    activeWorldAction: snapshot.activeWorldAction?.actionId ?? null,
    resources: {
      bassline: snapshot.resources.bassline,
      chorus: snapshot.resources.chorus,
      harmonics: snapshot.resources.harmonics,
      stone: snapshot.resources.stone,
      water: snapshot.resources.water,
      vibes: snapshot.resources.vibes,
    },
    base: {
      tutorialInvestigated: snapshot.base.tutorialInvestigated,
      tutorialExplored: snapshot.base.tutorialExplored,
      studioRestoreUnlocked: snapshot.base.studioRestoreUnlocked,
      studioRestored: snapshot.base.studioRestored,
      firePitBuilt: snapshot.base.firePitBuilt,
      bunksCapacity: snapshot.base.bunksCapacity,
      freeBunks: snapshot.base.freeBunks,
    },
    roster: {
      heroRoleId: snapshot.roster.heroRoleId,
      totalCrew: snapshot.roster.totalCrew,
      crewByRole: stringNumberRecord(snapshot.roster.crewByRole),
    },
    heroSurvival: {
      location: snapshot.heroSurvival.location,
      viralLoadRatio: round3(snapshot.heroSurvival.viralLoadRatio),
      debuffTier: snapshot.heroSurvival.debuffTier,
      movementSpeedMultiplier: round3(snapshot.heroSurvival.movementSpeedMultiplier),
      encounterRateMultiplier: round3(snapshot.heroSurvival.encounterRateMultiplier),
      forcedReturnPhase: snapshot.heroSurvival.forcedReturn?.phase ?? null,
    },
    bubble: {
      reachFromBase: snapshot.bubble.reachFromBase,
      fieldBudget: snapshot.bubble.fieldBudget,
      targetRing: snapshot.bubble.targetRing,
      frontierProgress: snapshot.bubble.frontierProgress,
    },
    recruitment: {
      totalRecruitedThisRun: snapshot.recruitment.totalRecruitedThisRun,
      pendingCount: snapshot.recruitment.pendingRecruits.length,
      nextRecruitCost: snapshot.recruitment.nextRecruitCost,
    },
    activeConstruction: snapshot.activeConstruction
      ? {
          optionId: snapshot.activeConstruction.optionId,
          remainingSeconds: round2(snapshot.activeConstruction.remainingWorkSeconds),
        }
      : null,
  }
}

function uiTelemetry(
  input: AddRuntimeTelemetryPresenterInput,
  worldTime: AddWorldTimeSummary,
): NonNullable<RuntimeTextState["ui"]> {
  const ui = input.ui
  if (!ui) throw new Error("uiTelemetry requires ADD UI state.")
  return {
    worldTime: {
      day: worldTime.day,
      referenceDate: worldTime.referenceDate,
      localTime: worldTime.localTime,
      season: worldTime.season,
      seasonLabel: worldTime.seasonLabel,
      daylightPhase: worldTime.daylightPhase,
      daylightRatio: worldTime.daylightRatio,
      nightRatio: worldTime.nightRatio,
      sunrise: worldTime.sunrise,
      sunset: worldTime.sunset,
      location: worldTime.location.label,
      source: worldTime.source,
      presentationClockSeconds: round2(
        input.displayClockSeconds ?? input.snapshot?.clockSeconds ?? 0,
      ),
      authoritativeClockSeconds: round2(input.snapshot?.clockSeconds ?? 0),
      animating: input.clockAnimation !== null,
      remainingMinutes: input.clockAnimation?.remainingMinutes ?? 0,
    },
    resourceCount: ui.resources.length,
    resourceFlows: ui.resources.map((resource) => ({
      id: resource.id,
      source: resource.source,
      sink: resource.sink,
      blocker: resource.blocker,
    })),
    noteCount: ui.notes.length,
    activeStoryBeatId: ui.activeStoryBeat?.id ?? null,
    storyChoiceIds: ui.activeStoryBeat?.choices.map((choice) => choice.id) ?? [],
    storyProgression: {
      ...ui.storyProgression.telemetrySummary,
      unlockPreviewIds: ui.storyProgression.unlockPreview.map((entry) => entry.id),
    },
    enabledWorldActionIds: ui.availableWorldActions
      .filter((action) => action.enabled)
      .map((action) => action.id),
    roleAssignments: ui.roleAssignments.map((role) => ({
      id: role.id,
      available: role.available,
      heroAssigned: role.heroAssigned,
      crewAssigned: role.crewAssigned,
    })),
    constructionOptions: ui.constructionOptions.map((option) => ({
      id: option.id,
      complete: option.complete,
      enabled: option.enabled,
      inProgress: option.inProgress,
      blockedReason: option.blockedReason,
    })),
    objectiveReachMet: ui.objective.reachMet,
    recruitmentEnabled: ui.objective.recruitmentEnabled,
    firstPlayable: {
      complete: ui.firstPlayable.complete,
      completedCount: ui.firstPlayable.completedCount,
      totalCount: ui.firstPlayable.totalCount,
      currentStepId: ui.firstPlayable.currentStepId,
      currentAction: ui.firstPlayable.steps.find((step) => step.active)?.action ?? null,
      steps: ui.firstPlayable.steps.map((step) => ({
        id: step.id,
        complete: step.complete,
        active: step.active,
        actionLabel: step.actionLabel,
      })),
      persistenceReady: input.persistence.firstPlayablePersistenceReady,
    },
  }
}

function baseManagementTelemetry(
  input: AddRuntimeTelemetryPresenterInput,
): RuntimeTextState["baseManagement"] {
  const state = input.baseManagement
  if (!state) return null
  return {
    active: input.mapMode === "base_square",
    title: state.title,
    selectedTab: input.baseManagementTab,
    tabIds: state.sections.map((section) => section.id),
    nextBottleneck: {
      id: state.nextBottleneck.id,
      label: state.nextBottleneck.label,
      severity: state.nextBottleneck.severity,
    },
    recommendedAction: {
      id: state.recommendedAction.id,
      label: state.recommendedAction.label,
      kind: state.recommendedAction.kind,
      targetId: state.recommendedAction.targetId,
      enabled: state.recommendedAction.enabled,
    },
    rateChange: input.baseRateChange
      ? {
          reason: input.baseRateChange.reason,
          summary: input.baseRateChange.summary,
          changes: input.baseRateChange.changes.map((change) => ({
            id: change.id,
            label: change.label,
            beforeNetPerSecond: round3(change.beforeNetPerSecond),
            afterNetPerSecond: round3(change.afterNetPerSecond),
            deltaPerSecond: round3(change.deltaPerSecond),
          })),
        }
      : null,
    playerLoop: {
      summary: state.playerLoop.summary,
      currentStepId: state.playerLoop.currentStepId,
      health: {
        status: state.playerLoop.health.status,
        label: state.playerLoop.health.label,
        severity: state.playerLoop.health.severity,
      },
      bottleneck: {
        id: state.playerLoop.bottleneck.id,
        label: state.playerLoop.bottleneck.label,
        severity: state.playerLoop.bottleneck.severity,
      },
      rateWatch: {
        summary: state.playerLoop.rateWatch.summary,
        rates: state.playerLoop.rateWatch.rates.map((rate) => ({
          resourceId: rate.resourceId,
          netPerSecond: round3(rate.netPerSecond),
          copy: rate.copy,
        })),
      },
      growthPush: {
        label: state.playerLoop.growthPush.label,
        tabId: state.playerLoop.growthPush.tabId,
      },
      returnPlan: {
        summary: state.playerLoop.returnPlan.summary,
        horizonSeconds:
          state.playerLoop.returnPlan.horizonSeconds === null
            ? null
            : round2(state.playerLoop.returnPlan.horizonSeconds),
      },
      decisionHint: state.playerLoop.decisionHint,
      steps: state.playerLoop.steps.map((step) => ({
        id: step.id,
        status: step.status,
        tabId: step.tabId,
      })),
    },
    resourcePressure: state.resources.map((resource) => ({
      id: resource.id,
      value: round2(resource.value),
      cap: round2(resource.cap),
      gainPerSecond: round3(resource.gainPerSecond),
      spendPerSecond: round3(resource.spendPerSecond),
      netPerSecond: round3(resource.netPerSecond),
      capPressure: resource.capPressure,
      timeToCapSeconds:
        resource.timeToCapSeconds === null ? null : round2(resource.timeToCapSeconds),
      timeToAffordSeconds:
        resource.nextAffordability?.timeToAffordSeconds === undefined
          ? null
          : resource.nextAffordability.timeToAffordSeconds === null
            ? null
            : round2(resource.nextAffordability.timeToAffordSeconds),
      affordabilityTargetLabel: resource.nextAffordability?.targetLabel ?? null,
      productionZeroReason: resource.productionZeroReason,
      blocker: resource.blocker,
    })),
    economy: {
      limitingResource: state.economy.limitingResource
        ? {
            resourceId: state.economy.limitingResource.resourceId,
            resourceLabel: state.economy.limitingResource.resourceLabel,
            targetId: state.economy.limitingResource.targetId,
            targetLabel: state.economy.limitingResource.targetLabel,
            timeToAffordSeconds:
              state.economy.limitingResource.timeToAffordSeconds === null
                ? null
                : round2(state.economy.limitingResource.timeToAffordSeconds),
            copy: state.economy.limitingResource.copy,
          }
        : null,
      stalledSystems: state.economy.stalledSystems.map((stalled) => ({
        id: stalled.id,
        label: stalled.label,
        reason: stalled.reason,
        severity: stalled.severity,
        relatedResourceId: stalled.relatedResourceId,
      })),
      waitForecasts: state.economy.waitForecasts.map((forecast) => ({
        label: forecast.label,
        horizonSeconds: forecast.horizonSeconds,
        summary: forecast.summary,
        resourceDeltas: forecast.resourceDeltas.map((delta) => ({
          id: delta.id,
          delta: round2(delta.delta),
          valueAfter: round2(delta.valueAfter),
          capReached: delta.capReached,
        })),
      })),
      offlinePreview: {
        enabled: state.economy.offlinePreview.enabled,
        summary: state.economy.offlinePreview.summary,
        caveat: state.economy.offlinePreview.caveat,
      },
    },
    socialPressure: {
      status: state.socialPressure.status,
      headline: state.socialPressure.headline,
      detail: state.socialPressure.detail,
      vibes: {
        value: round2(state.socialPressure.vibes.value),
        cap: round2(state.socialPressure.vibes.cap),
        gainPerSecond: round3(state.socialPressure.vibes.gainPerSecond),
        lossPerSecond: round3(state.socialPressure.vibes.lossPerSecond),
        netPerSecond: round3(state.socialPressure.vibes.netPerSecond),
        explanation: state.socialPressure.vibes.explanation,
        lossExplanation: state.socialPressure.vibes.lossExplanation,
        timeToNextRecruitSeconds:
          state.socialPressure.vibes.timeToNextRecruitSeconds === null
            ? null
            : round2(state.socialPressure.vibes.timeToNextRecruitSeconds),
      },
      housing: {
        capacity: state.socialPressure.housing.capacity,
        occupied: state.socialPressure.housing.occupied,
        free: state.socialPressure.housing.free,
        missing: state.socialPressure.housing.missing,
        pressure: state.socialPressure.housing.pressure,
        overcrowdedSeconds: round2(state.socialPressure.housing.overcrowdedSeconds),
        warning: state.socialPressure.housing.warning,
      },
      recruitment: {
        enabled: state.socialPressure.recruitment.enabled,
        pendingCount: state.socialPressure.recruitment.pendingCount,
        nextCost: round2(state.socialPressure.recruitment.nextCost),
        canAfford: state.socialPressure.recruitment.canAfford,
        canRecruitNow: state.socialPressure.recruitment.canRecruitNow,
        blocker: state.socialPressure.recruitment.blocker,
        costProjection: state.socialPressure.recruitment.costProjection,
      },
      pendingArrivals: state.socialPressure.pendingArrivals.map((arrival) => ({
        id: arrival.id,
        remainingSeconds: round2(arrival.remainingSeconds),
        progressPercent: round2(arrival.progressPercent),
      })),
      supportForecast: {
        canSupport: state.socialPressure.supportForecast.canSupport,
        status: state.socialPressure.supportForecast.status,
        bunksAfterArrival: state.socialPressure.supportForecast.bunksAfterArrival,
        missingBunksAfterArrival:
          state.socialPressure.supportForecast.missingBunksAfterArrival,
        vibesAfterCommit: round2(state.socialPressure.supportForecast.vibesAfterCommit),
        copy: state.socialPressure.supportForecast.copy,
        warning: state.socialPressure.supportForecast.warning,
      },
    },
    rolePressure: state.roles.map((role) => ({
      id: role.id,
      heroAssigned: role.heroAssigned,
      crewAssigned: role.crewAssigned,
      suggestedCrew: role.suggestedCrew,
      slotPool: role.slotPool,
      slotPressure: role.slotPressure,
      outputResourceId: role.outputResourceId,
      currentNetPerSecond: round3(role.currentNetPerSecond),
      nextWorkerDeltaPerSecond: round3(role.nextWorkerDeltaPerSecond),
      pressureCopy: role.pressureCopy,
    })),
    staffing: {
      freeCrew: state.staffing.freeCrew,
      assignedCrew: state.staffing.assignedCrew,
      totalCrew: state.staffing.totalCrew,
      heroRoleId: state.staffing.heroRoleId,
      heroRoleLabel: state.staffing.heroRoleLabel,
      heroAssigned: state.staffing.heroAssigned,
      currentPresetId: state.staffing.currentPresetId,
      slotPools: state.staffing.slotPools.map((pool) => ({
        id: pool.id,
        occupied: pool.occupied,
        capacity: pool.capacity,
        free: pool.free,
        pressure: pool.pressure,
      })),
      presets: state.staffing.presets.map((preset) => ({
        id: preset.id,
        label: preset.label,
        enabled: preset.enabled,
        disabledReason: preset.disabledReason,
        heroRoleId: preset.heroRoleId,
        crewByRole: preset.crewByRole,
      })),
      visibleImpact: {
        rateSummary: state.staffing.visibleImpact.rateSummary,
        riskSummary: state.staffing.visibleImpact.riskSummary,
        bottleneckSummary: state.staffing.visibleImpact.bottleneckSummary,
      },
    },
    expeditions: {
      summary: state.expeditions.summary,
      availableCrew: state.expeditions.availableCrew,
      assignedCrew: state.expeditions.assignedCrew,
      activeCount: state.expeditions.activeCount,
      completedReportCount: state.expeditions.completedReportCount,
      totalWounds: state.expeditions.totalWounds,
      totalClues: state.expeditions.totalClues,
      totalDungeonLeads: state.expeditions.totalDungeonLeads,
      recommendedTargetId: state.expeditions.recommendedTargetId,
      targets: state.expeditions.targets.map((target) => ({
        id: target.id,
        enabled: target.enabled,
        disabledReason: target.disabledReason,
        durationSeconds: round2(target.durationSeconds),
        requiredCrew: target.requiredCrew,
        requiredBubbleReach: target.requiredBubbleReach,
        risk: target.risk,
        expectedLootCopy: target.expectedLootCopy,
      })),
      activeJobs: state.expeditions.activeJobs.map((job) => ({
        id: job.id,
        targetId: job.targetId,
        label: job.label,
        assignedCrew: job.assignedCrew,
        remainingSeconds: round2(job.remainingSeconds),
        progressPercent: round2(job.progressPercent),
        risk: job.risk,
      })),
      reports: state.expeditions.reports.map((report) => ({
        id: report.id,
        targetId: report.targetId,
        rewardCopy: report.rewardCopy,
        resonanceCopy: report.resonanceCopy,
        woundCopy: report.woundCopy,
        clueCopy: report.clueCopy,
      })),
    },
    resonance: {
      summary: state.resonance.summary,
      expeditionSupportLevel: state.resonance.expeditionSupportLevel,
      activeJobCount: state.resonance.activeJobCount,
      completedReportCount: state.resonance.completedReportCount,
      recommendedRecipeId: state.resonance.recommendedRecipeId,
      materials: state.resonance.materials.map((material) => ({
        id: material.id,
        value: material.value,
      })),
      tuning: {
        basslineLevel: state.resonance.tuning.basslineLevel,
        chorusLevel: state.resonance.tuning.chorusLevel,
        harmonicsLevel: state.resonance.tuning.harmonicsLevel,
        basslineBonusPercent: state.resonance.tuning.basslineBonusPercent,
        chorusBonusPercent: state.resonance.tuning.chorusBonusPercent,
        harmonicsBonusPercent: state.resonance.tuning.harmonicsBonusPercent,
      },
      recipes: state.resonance.recipes.map((recipe) => ({
        id: recipe.id,
        stationId: recipe.stationId,
        enabled: recipe.enabled,
        inProgress: recipe.inProgress,
        blockedReason: recipe.blockedReason,
        progressPercent: round2(recipe.progressPercent),
        effectLabel: recipe.effectLabel,
        costLabel: recipe.costLabel,
      })),
      stationSpecializations: state.resonance.stationSpecializations.map((station) => ({
        stationId: station.stationId,
        currentPath: station.currentPath,
      })),
    },
    activeConstructionId: state.activeConstruction?.id ?? null,
    enabledConstructionIds: state.construction
      .filter((option) => option.enabled)
      .map((option) => option.id),
    buildLoop: {
      summary: state.buildLoop.summary,
      assignedWorkers: state.buildLoop.assignedWorkers,
      workerThroughputPerSecond: round3(state.buildLoop.workerThroughputPerSecond),
      readyProjectCount: state.buildLoop.readyProjectCount,
      blockedProjectCount: state.buildLoop.blockedProjectCount,
      activeJobId: state.buildLoop.activeJob?.id ?? null,
      groups: state.buildLoop.groups.map((group) => ({
        id: group.id,
        label: group.label,
        projectIds: group.projects.map((project) => project.id),
      })),
      projects: state.buildLoop.projects.map((project) => ({
        id: project.id,
        label: project.label,
        category: project.category,
        complete: project.complete,
        enabled: project.enabled,
        inProgress: project.inProgress,
        progressPercent: round2(project.progressPercent),
        estimatedCompletionSeconds:
          project.estimatedCompletionSeconds === null
            ? null
            : round2(project.estimatedCompletionSeconds),
        missingResource: project.missingResource,
        resultPreview: project.resultPreview,
        futureEconomyChange: project.futureEconomyChange,
        basslineRiskSeverity: project.basslineRisk.severity,
        basslineRiskCopy: project.basslineRisk.copy,
      })),
    },
    stationMachine: {
      summary: state.stationMachine.summary,
      poweredCount: state.stationMachine.poweredCount,
      brownedOutCount: state.stationMachine.brownedOutCount,
      activeJobCount: state.stationMachine.activeJobCount,
      requestedUpkeepPerSecond: round3(state.stationMachine.requestedUpkeepPerSecond),
      activeUpkeepPerSecond: round3(state.stationMachine.activeUpkeepPerSecond),
      groups: state.stationMachine.groups.map((group) => ({
        id: group.id,
        label: group.label,
        cardIds: group.cards.map((card) => card.id),
      })),
      cards: state.stationMachine.cards.map((card) => ({
        id: card.id,
        label: card.label,
        group: card.group,
        status: card.status,
        built: card.built,
        locked: card.locked,
        powered: card.powered,
        brownedOut: card.brownedOut,
        requestedEnabled: card.requestedEnabled,
        chorusUpkeepPerSecond: round3(card.chorusUpkeepPerSecond),
        brownoutPriority: card.brownoutPriority,
        currentJobId: card.currentJob?.id ?? null,
        currentJobLabel: card.currentJob?.label ?? null,
        availableRecipeIds: card.availableRecipes.map((recipe) => recipe.id),
        enabledRecipeIds: card.availableRecipes
          .filter((recipe) => recipe.enabled)
          .map((recipe) => recipe.id),
        outputEffect: card.outputEffect,
        blockedReason: card.blockedReason,
        brownoutPriorityCopy: card.brownoutPriorityCopy,
      })),
    },
    poweredStationIds: state.stations
      .filter((station) => station.powered)
      .map((station) => station.id),
    requestedStationIds: state.stations
      .filter((station) => station.requestedEnabled)
      .map((station) => station.id),
    activeProcessingIds: state.processing
      .filter((recipe) => recipe.inProgress)
      .map((recipe) => recipe.id),
    enabledProcessingIds: state.processing
      .filter((recipe) => recipe.enabled)
      .map((recipe) => recipe.id),
    bunks: {
      free: state.bunks.free,
      missing: state.bunks.missing,
      pressure: state.bunks.pressure,
    },
    recruitment: {
      enabled: state.recruitment.enabled,
      pending: state.recruitment.pending,
      nextCost: state.recruitment.nextCost,
      pressure: state.recruitment.pressure,
    },
    power: {
      activeUpkeepPerSecond: round3(state.power.activeUpkeepPerSecond),
      requestedUpkeepPerSecond: round3(state.power.requestedUpkeepPerSecond),
      brownoutActive: state.power.brownoutActive,
    },
  }
}

function dungeonContextTelemetry(
  input: AddRuntimeTelemetryPresenterInput,
): RuntimeTextState["dungeonContext"] {
  if (input.mapMode !== "dungeon_square" || !input.dungeonObjective) return null

  const mapInfo = input.mapInfo
  const exits = [
    ...mapInfo.character.dungeonLinksAtCell,
    ...mapInfo.dungeonLinks.selected,
  ]
  const uniqueExits = Array.from(
    new Map(exits.map((exit) => [exit.targetMapId || exit.id, exit])).values(),
  )
  return {
    active: true,
    panel: "dungeon_context",
    currentObjective: {
      label: input.dungeonObjective.label,
      headline: input.dungeonObjective.headline,
      currentStepId: input.dungeonObjective.currentStepId,
    },
    returnAction: {
      label: input.dungeonObjective.returnLabel,
      available: true,
    },
    discoveredExits: {
      count: 1 + uniqueExits.length,
      labels: [input.dungeonObjective.returnLabel, ...uniqueExits.map((exit) => exit.label)],
    },
    blockers: {
      hiddenCells: mapInfo.visibility.hiddenCells,
      blockedCells: mapInfo.cells.blocked,
      activeBlocker: mapInfo.character.blockedReason ?? mapInfo.travel.blockedReason,
      validationWarning: mapInfo.validationValid ? null : mapInfo.validationSummary,
    },
    localMapState: {
      totalCells: mapInfo.cells.total,
      visibleCells: mapInfo.visibility.visibleCells,
      hiddenCells: mapInfo.visibility.hiddenCells,
      blockedCells: mapInfo.cells.blocked,
      heroCell: mapInfo.character.cell,
      selectedCell: mapInfo.interaction.selectedCell,
      facing: mapInfo.character.facing,
    },
  }
}

function travelTelemetry(input: AddRuntimeTelemetryPresenterInput): RuntimeTextState["travel"] {
  const experience = input.travel.experience
  const phase = experience
    ? experience.phase
    : input.mapInfo.travel.previewCell
      ? "preview"
      : "idle"
  const progress =
    experience?.phase === "arrived"
      ? 1
      : input.mapInfo.travel.active
        ? input.mapInfo.travel.progress
        : 0

  return {
    costGameMinutes: ADD_TILE_TRAVEL_PRESENTATION.visibleGameMinutes,
    costRuntimeSeconds: ADD_TILE_TRAVEL_PRESENTATION.runtimeSeconds,
    presentationDurationMs: ADD_TILE_TRAVEL_PRESENTATION.durationMs,
    clockStepMs: ADD_TILE_TRAVEL_PRESENTATION.msPerVisibleMinute,
    active: experience?.phase === "traveling" || input.mapInfo.travel.active,
    phase,
    progress,
    fromTime: experience?.fromTime.localTime ?? null,
    toTime: experience?.toTime.localTime ?? null,
    destinationLabel:
      experience?.event.destinationLabel ??
      input.mapInfo.travel.destinationLabel ??
      input.mapInfo.travel.previewLabel,
    exposureRisk:
      experience?.event.exposureRisk ??
      input.mapInfo.travel.exposureRisk ??
      input.mapInfo.travel.previewExposureRisk,
    runtimeSynced: experience?.runtimeSynced ?? false,
    toxicityBefore: experience === null ? null : round3(experience.toxicityBefore),
    toxicityAfter:
      experience?.toxicityAfter === null || experience?.toxicityAfter === undefined
        ? null
        : round3(experience.toxicityAfter),
    previewCell: input.mapInfo.travel.previewCell,
    previewLabel: input.mapInfo.travel.previewLabel,
    previewAdjacent: input.mapInfo.travel.previewAdjacent,
    confirmation: {
      dramaState: input.travel.dramaState,
      dialogOpen: input.travel.dialogKind !== null,
      dialogKind: input.travel.dialogKind,
      eligible: input.travel.confirmationEligibility.eligible,
      reason: input.travel.confirmationEligibility.reason,
    },
  }
}

function stringNumberRecord(
  value: Record<string, number> | Map<string, number>,
): Record<string, number> {
  if (typeof (value as Map<string, number>).entries === "function") {
    return Object.fromEntries((value as Map<string, number>).entries())
  }
  return value as Record<string, number>
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}
