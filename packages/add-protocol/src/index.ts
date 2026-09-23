export interface ResourceSnapshot {
  bassline: number
  basslineCap: number
  chorus: number
  chorusCap: number
  harmonics: number
  harmonicsCap: number
  stone: number
  stoneCap: number
  baseStoneStock: number
  water: number
  waterCap: number
  baseWaterStock: number
  vibes: number
  vibesCap: number
  lifetimeGenerated: number
  lifetimeSpent: number
}

export interface RosterSnapshot {
  heroAssigned: boolean
  heroRoleId: string
  totalCrew: number
  crewByRole: Record<string, number>
}

export interface HeroProgressSnapshot {
  drummerLevel: number
  drummerXp: number
  vocalistLevel: number
  vocalistXp: number
  synthLevel: number
  synthXp: number
}

export interface WoundTrackSnapshot {
  majorWoundsMax: number
  lightWoundsPerMajor: number
  woundUnitsTaken: number
}

export interface ForcedReturnSnapshot {
  phase: 'return_to_bubble_edge' | 'return_to_studio' | 'recover_at_studio'
  totalSeconds: number
  remainingSeconds: number
  viralLoadRatioOnTrigger: number
}

export interface HeroSurvivalSnapshot {
  sustain: number
  viralLoadRatio: number
  location: 'studio' | 'bubble' | 'outside_bubble'
  requiredTimeToReenterBubbleSeconds: number
  returnToStudioSeconds: number
  /** Seconds left of the walk home after an outdoor action; positive means still outside. */
  returnJourneySeconds: number
  pointOfNoReturnRatio: number
  secondsUntilForcedReturn: number
  echoScars: number
  debuffTier: number
  workEfficiencyMultiplier: number
  movementSpeedMultiplier: number
  encounterRateMultiplier: number
  wounds: WoundTrackSnapshot
  forcedReturn: ForcedReturnSnapshot | null
  /** One-time exposure buffs, and whether the static has taken him. */
  exposure: ExposureSnapshot
}

/**
 * A character's exposure buffs. `viralLoadRatio` beside this is the spent
 * fraction of the budget they size, so there is one clock, not two.
 */
export interface ExposureSnapshot {
  /** While true the character is short the authored withheld hours. */
  untestedImmunity: boolean
  /** While true the next exhaustion restores protection instead of killing. */
  provingRestoreAvailable: boolean
  /** Protection reached zero with no restore left. The run is over. */
  fatal: boolean
}

/** One line of ink dialogue with the presentation tags authored beside it. */
export interface InkLineSnapshot {
  text: string
  /** Raw `key:value` tags: `speaker`, `mood`, `sfx`, `camera`. */
  tags: string[]
}

/** One presented ink choice. `index` is what the command sends back. */
export interface InkChoiceSnapshot {
  index: number
  text: string
  /** The authored choice id whose effects apply, when the beat declares one. */
  choiceId: string | null
}

/**
 * The ink scene for the active beat, when that beat has a knot. Beats without
 * one render from the catalog's `body`, so ink adoption is beat by beat.
 */
export interface InkSceneSnapshot {
  beatId: string
  lines: InkLineSnapshot[]
  choices: InkChoiceSnapshot[]
}

export interface NarrativeSnapshot {
  activeBeatId: string | null
  completedBeatIds: string[]
  choiceByBeat: Record<string, string>
  /** Arbitrary author-defined story variables. Rust owns writes; TS may explain them. */
  qualities?: Record<string, number>
  /** Present only while the active beat is rendered by ink. */
  inkScene?: InkSceneSnapshot | null
}

export interface CrystalCircleSnapshot {
  baseSlots: number
  slotCapacityLevel: number
  outputLevel: number
  storageLevel: number
  fieldPolishLevel: number
  removingMossUnlocked: boolean
  removingMossCompleted: boolean
}

export interface ProcessingJobSnapshot {
  recipeId: string
  stationId: string
  totalWorkSeconds: number
  remainingWorkSeconds: number
}

export interface ProcessingSnapshot {
  resonanceCalibrationLevel: number
  mixCalibrationLevel: number
  workshopToolingLevel: number
  workshopWaterCondensersLevel: number
  researchChorusRoutingLevel: number
  researchHarmonicStudyLevel: number
  activeJobs: Record<string, ProcessingJobSnapshot>
}

export type ExpeditionRisk = 'low' | 'medium' | 'high'

export interface ExpeditionJobSnapshot {
  id: number
  targetId: string
  assignedCrew: number
  durationSeconds: number
  remainingSeconds: number
  risk: ExpeditionRisk
}

export interface ExpeditionReportSnapshot {
  id: number
  targetId: string
  assignedCrew: number
  durationSeconds: number
  risk: ExpeditionRisk
  stoneGained: number
  waterGained: number
  vibesGained: number
  echoShardsGained: number
  signalScrapGained: number
  harmonicResidueGained: number
  wounds: number
  clues: number
  dungeonLeads: number
}

export interface ExpeditionSnapshot {
  activeJobs: ExpeditionJobSnapshot[]
  completedReports: ExpeditionReportSnapshot[]
  nextJobId: number
  totalWounds: number
  totalClues: number
  totalDungeonLeads: number
}

export type CrystalTuningTrack = 'bassline' | 'chorus' | 'harmonics'
export type StationSpecializationPath = 'balanced' | 'conversion' | 'field' | 'extraction'

export interface ResonanceMaterialSnapshot {
  echoShards: number
  signalScrap: number
  harmonicResidue: number
}

export interface CrystalTuningSnapshot {
  basslineLevel: number
  chorusLevel: number
  harmonicsLevel: number
}

export interface ResonanceJobSnapshot {
  recipeId: string
  stationId: string
  totalWorkSeconds: number
  remainingWorkSeconds: number
}

export interface ResonanceReportSnapshot {
  recipeId: string
  stationId: string
  tuningTrack: CrystalTuningTrack | null
  tuningAmount: number
  expeditionSupportAmount: number
}

export interface ResonanceSnapshot {
  materials: ResonanceMaterialSnapshot
  tuning: CrystalTuningSnapshot
  expeditionSupportLevel: number
  activeJobs: Record<string, ResonanceJobSnapshot>
  completedReports: ResonanceReportSnapshot[]
  stationSpecializations: Record<string, StationSpecializationPath>
}

export interface BaseSnapshot {
  studioRestored: boolean
  studioRestoreUnlocked: boolean
  bunksCapacity: number
  occupantCount: number
  freeBunks: number
  missingBunks: number
  firePitBuilt: boolean
  resonanceChamberBuilt: boolean
  mixConsoleBuilt: boolean
  workshopBuilt: boolean
  researchBoothBuilt: boolean
  tutorialInvestigated: boolean
  tutorialExplored: boolean
  waterCollectionUnlocked: boolean
  skins: number
  overcrowdedSeconds: number
  badVibesMultiplier: number
  effectiveBadVibesRate: number
  crewEfficiencyMultiplier: number
}

export interface RecruitTravelSnapshot {
  totalSeconds: number
  remainingSeconds: number
}

export interface RecruitmentSnapshot {
  totalRecruitedThisRun: number
  instantRecruitsUsed: number
  pendingRecruits: RecruitTravelSnapshot[]
  nextRecruitCost: number
}

export interface PowerSnapshot {
  requestedUpkeepPerSecond: number
  activeUpkeepPerSecond: number
  lifeSupportUpkeepPerSecond: number
  brownoutActive: boolean
  brownoutSeverity: number
  activeStaffCount: number
  harmonicsTier: number
  basslineGenerationPerSecond: number
  chorusGenerationPerSecond: number
  harmonicsGenerationPerSecond: number
  harmonicsEfficiencyMultiplier: number
  basslineOutputMultiplier: number
  chorusOutputMultiplier: number
  harmonicsOutputMultiplier: number
  fieldMultiplier: number
}

export interface StationSnapshot {
  requestedEnabled: boolean
  isPowered: boolean
  powerOrder: number
}

export interface ConstructionSnapshot {
  optionId: string
  resourceId: string | null
  totalWorkSeconds: number
  remainingWorkSeconds: number
  totalCost: number
  spentCost: number
  perWorkerCostPerSecond: number
}

export interface WorldActionSnapshot {
  actionId: string
  totalSeconds: number
  remainingSeconds: number
}

export interface BubbleSnapshot {
  stabilizedRing: number
  frontierProgress: number
  targetRing: number
  targetFrontierProgress: number
  holdSecondsRemaining: number
  degradeSecondsAccumulated: number
  stabilizedHexes: number
  reachFromBase: number
  fieldBudget: number
  activeCoverageCost: number
  nextRingCost: number
}

export interface ObjectiveSnapshot {
  reachObjectiveTarget: number
  reachObjectiveMet: boolean
  survivorCaveDistance: number
  recruitmentRangeTiles: number
  recruitmentEnabled: boolean
  survivorCaveInBubble: boolean
  /** The active quest objective id (lowest-sequence incomplete), or null. */
  activeObjectiveId: string | null
  /** Completed quest objective ids, in completion order. */
  completedObjectiveIds: string[]
}

export interface HexSnapshot {
  q: number
  r: number
  distance: number
  tileId: string
  state: 'inactive' | 'converting' | 'stabilized' | 'blocked'
  progress: number
}

export interface HexCoordSnapshot {
  q: number
  r: number
}

/**
 * A structured event produced by the command/tick that yielded this snapshot.
 * Typed counterpart to the `notes` log — consumers (moment driver, audio,
 * telemetry) match on `kind` instead of parsing note strings. Ephemeral: it
 * reflects only the last frame and is never persisted in saves.
 */
export type AddGameEvent =
  | { kind: "construction_completed"; optionId: string; label: string }
  | { kind: "processing_completed"; recipeId: string; label: string }
  | { kind: "expedition_completed"; targetId: string; label: string }
  | { kind: "resonance_completed"; recipeId: string; label: string }
  | { kind: "world_action_completed"; actionId: string; label: string }
  | { kind: "recruits_arrived"; count: number }
  | { kind: "beat_activated"; beatId: string }
  | { kind: "forced_return_triggered" }
  | { kind: "hero_recovered" }
  | { kind: "contamination_revealed" }
  | { kind: "contamination_fatal" }
  | { kind: "cinematic_started"; cinematicId: string }
  | { kind: "cinematic_completed"; cinematicId: string; skipped: boolean }
  | { kind: "bubble_frontier_collapsed" }
  | { kind: "recruitment_gate_opened" }
  | { kind: "effect_rejected"; reason: string }
  | { kind: "hero_leveled_up"; track: string; level: number }
  | { kind: "combat_resolved"; creatureId: string; outcome: "victory" | "retreat" }
  | { kind: "objective_completed"; objectiveId: string }
  | {
      kind: "starting_area_discovered"
      center: { q: number; r: number }
      radius: number
      revealed: number
    }

export interface CombatLogEntrySnapshot {
  round: number
  heroDamage: number
  creatureDamage: number
  heroHp: number
  creatureHp: number
}

export interface CombatJobSnapshot {
  creatureId: string
  creatureLabel: string
  locationKey: string
  lootItem: string | null
  lootQty: number
  creatureHp: number
  creatureHpMax: number
  heroHp: number
  heroHpMax: number
  round: number
  roundTimer: number
  xpReward: number
  threat: number
  log: CombatLogEntrySnapshot[]
}

/**
 * What the Hero believes the static is doing to him. Authoritative and saved:
 * the first fill is survived and teaches him he is immune, the second ends the
 * run. Distinct from `heroSurvival.viralLoadRatio`, which is the real thing.
 */
/** What a cinematic beat is made of; the player component switches on it. */
export type CinematicMedia = 'none' | 'image' | 'video' | 'text'

/** What ends a beat. `media_end` keeps `seconds` as a backstop. */
export type CinematicAdvance = 'auto' | 'input' | 'media_end'

/** Playback position. Saved, so a reload resumes mid-cutscene. */
export interface ActiveCinematicSnapshot {
  cinematicId: string
  beatIndex: number
  beatElapsedSeconds: number
}

/** One authored beat, as the catalog publishes it. */
export interface CinematicBeatDef {
  id: string
  media: CinematicMedia
  assetId: string
  copy: string
  advance: CinematicAdvance
  seconds: number
}

export interface CinematicDef {
  id: string
  label: string
  skippable: boolean
  /** Hold the world still while it plays. See the Rust `CinematicDef`. */
  freezeWorld: boolean
  replay: 'once' | 'always'
  beats: CinematicBeatDef[]
}

export interface CinematicSnapshot {
  active: ActiveCinematicSnapshot | null
  /** Ids seen through to the end, skipped ones included. */
  seen: readonly string[]
}

export interface SimulationSnapshot {
  schemaVersion: number
  /** Content catalog identity this save was authored against (see save migration). */
  catalogVersion: number
  /** Structured events from the last applied command/tick (ephemeral, not saved). */
  events: AddGameEvent[]
  /** Rust-evaluated outcomes keyed by the stable command-picker ID. */
  commandAvailability: CommandAvailabilitySnapshot
  /** The in-progress auto-battler skirmish, or null when not fighting. */
  activeCombat: CombatJobSnapshot | null
  clockSeconds: number
  resources: ResourceSnapshot
  roster: RosterSnapshot
  heroProgress: HeroProgressSnapshot
  heroSurvival: HeroSurvivalSnapshot
  cinematics: CinematicSnapshot
  narrative: NarrativeSnapshot
  crystalCircle: CrystalCircleSnapshot
  processing: ProcessingSnapshot
  expeditions: ExpeditionSnapshot
  resonance: ResonanceSnapshot
  base: BaseSnapshot
  power: PowerSnapshot
  stations: Record<string, StationSnapshot>
  recruitment: RecruitmentSnapshot
  bubble: BubbleSnapshot
  objectives: ObjectiveSnapshot
  discoveredCells: HexCoordSnapshot[]
  heroMap: HexCoordSnapshot
  hexes: HexSnapshot[]
  activeConstruction: ConstructionSnapshot | null
  activeWorldAction: WorldActionSnapshot | null
  notes: string[]
  /** Open dungeon doors, keyed by `${dungeonId}:${x}:${y}`. */
  openDoors: string[]
  /** Perk ids the Hero has learned. */
  acquiredPerks: string[]
  /** Hero inventory: item id -> quantity. */
  inventory: Record<string, number>
  /** Resolved per-location facts (looted containers, cleared creatures),
   * keyed `${mapId}:${x}:${y}`. */
  clearedLocations: string[]
  /** Items dropped on the ground: `${mapId}:${x}:${y}` -> (item id -> qty). */
  droppedItems: Record<string, Record<string, number>>
}

export type BlockerId = BlockerDef['kind']

export interface CommandOutcomeSnapshot {
  accepted: boolean
  blocker: BlockerId | null
  events: AddGameEvent[]
}

export type CommandAvailabilitySnapshot = Record<string, CommandOutcomeSnapshot>

export interface ResourceDef {
  id: string
  schemaId: string
  label: string
  category: 'band' | 'material' | 'run_scoped_pool'
  baseCap: number
  capBehavior: 'overflow_lost' | 'blocked_at_cap'
  startsAt: number
}

export interface RoleDef {
  id: string
  schemaId: string
  label: string
  slotPool: 'crystal_circle' | 'fire_pit' | 'base'
  heroAllowed: boolean
  crewAllowed: boolean
  maxCrewSlots: number | null
  uiSection: string
  uiOrder: number
}

export interface StationDef {
  id: string
  schemaId: string
  label: string
  category: 'crystal' | 'social' | 'power' | 'tuning' | 'crafting' | 'research'
  chorusUpkeepPerSecond: number
  manualPower: boolean
  startsRequested: boolean
  requirements: RequirementDef[]
  uiOrder: number
}

export interface TileDef {
  id: string
  schemaId: string
  label: string
  terrain: 'plains' | 'river' | 'scrub' | 'ridge' | 'mountain'
  feature: 'none' | 'base' | 'survivor_cave'
  impedance: number
  isBlocker: boolean
  tags: TileTag[]
  floraIds: string[]
  structureIds: string[]
  dungeonIds: string[]
  areaIds: string[]
  buildingCapacity: number
}

export type TileTag =
  | 'base'
  | 'sanctuary'
  | 'construction_anchor'
  | 'open_ground'
  | 'water_source'
  | 'easy_propagation'
  | 'brush'
  | 'harvestable'
  | 'elevated'
  | 'high_impedance'
  | 'blocker'
  | 'wall'
  | 'landmark'
  | 'recruitment_source'

export interface FloraDef {
  id: string
  schemaId: string
  label: string
  kind: 'reeds' | 'scrub'
  tags: TileTag[]
}

export interface StructureDef {
  id: string
  schemaId: string
  label: string
  kind: 'crystal_circle' | 'base' | 'cave'
  tags: TileTag[]
}

export interface RequirementDef {
  kind: 'flag_set' | 'flag_unset'
  flag_id: string
}

export interface EffectDef {
  kind:
    | 'set_flag'
    | 'add_bunks'
    | 'add_skins'
    | 'increment_crystal_track'
    | 'increment_processing_track'
    | 'grant_resource'
    | 'spend_resource'
    | 'set_quality'
    | 'add_quality'
    | 'complete_beat'
    | 'note'
    | 'emit_act'
  flag_id?: string
  value?: boolean
  amount?: number
  /** grant_resource / spend_resource */
  resource_id?: string
  /** set_quality / add_quality */
  key?: string
  /** complete_beat */
  beat_id?: string
  /** note */
  text?: string
  /** emit_act: the act recorded in the narrative log */
  act_id?: string
  /** emit_act: whom it was done to, when the act has a single subject */
  target?: string
  track?:
    | 'slot_capacity'
    | 'output'
    | 'storage'
    | 'field_polish'
    | 'resonance_calibration'
    | 'mix_calibration'
    | 'workshop_tooling'
    | 'workshop_water_condensers'
    | 'research_chorus_routing'
    | 'research_harmonic_study'
}

export interface CostItemDef {
  item_id: string
  amount: number
}

export interface CostDef {
  kind: 'upfront' | 'upfront_bundle' | 'drain_per_worker_second' | 'time_only'
  resource_id?: string
  amount?: number
  costs?: CostItemDef[]
}

export interface DurationDef {
  kind: 'fixed' | 'crystal_level_scaled'
  seconds?: number
  track?: 'slot_capacity' | 'output' | 'storage' | 'field_polish'
  base_seconds?: number
  per_level_seconds?: number
}

export interface ConstructionOptionDef {
  id: string
  schemaId: string
  label: string
  group: 'crystal_upgrade' | 'base_project'
  cost: CostDef
  duration: DurationDef
  requirements: RequirementDef[]
  effects: EffectDef[]
  uiOrder: number
}

export interface ProcessingRecipeDef {
  id: string
  schemaId: string
  label: string
  stationId: string
  cost: CostDef
  duration: DurationDef
  requirements: RequirementDef[]
  effects: EffectDef[]
  maxLevel: number
  uiOrder: number
}

export interface WorldActionDef {
  id: string
  schemaId: string
  label: string
  durationSeconds: number
  heroOnly: boolean
  offlineProgress: boolean
  heroExposure: 'studio' | 'bubble' | 'outside_bubble'
  returnToBubbleSeconds: number
  returnToStudioSeconds: number
  requirements: RequirementDef[]
  effects: EffectDef[]
  uiOrder: number
}

export interface ExpeditionSupportDef {
  requiresStudioRestored: boolean
  requiresFirePit: boolean
}

export interface ExpeditionRewardDef {
  stone: number
  water: number
  vibes: number
  echoShards: number
  signalScrap: number
  harmonicResidue: number
  wounds: number
  clues: number
  dungeonLeads: number
}

export interface ExpeditionTargetDef {
  id: string
  schemaId: string
  label: string
  durationSeconds: number
  requiredCrew: number
  requiredBubbleReach: number
  support: ExpeditionSupportDef
  risk: ExpeditionRisk
  expectedLoot: ExpeditionRewardDef
  uiOrder: number
  playerHint: string
}

export interface ResonanceMaterialCostDef {
  materialId: string
  amount: number
}

export type ResonanceEffectDef =
  | { kind: 'increment_tuning'; track: CrystalTuningTrack; amount: number }
  | { kind: 'increment_expedition_support'; amount: number }

export interface ResonanceRecipeDef {
  id: string
  label: string
  stationId: string
  durationSeconds: number
  costs: ResonanceMaterialCostDef[]
  effect: ResonanceEffectDef
  uiOrder: number
  playerHint: string
}

export interface StoryBeatDef {
  id: string
  schemaId: string
  label: string
  body: string
  arc: string
  sequence: number
  worldActionId: string | null
  choices: StoryChoiceDef[]
  relatedIds: string[]
  progression?: StoryProgressionDef | null
  /** Storylet (QBN) fields — authored in content + consumed by the authoritative
   * Rust salience selector (a beat becomes active when all `preconditions` hold,
   * highest `priority` wins; a non-repeatable beat auto-resolves when all
   * `autoCompleteWhen` hold). The runtime snapshot omits them, so they are
   * optional here — the TS layer renders the active beat, it does not re-select. */
  preconditions?: ConditionDef[]
  autoCompleteWhen?: ConditionDef[]
  priority?: number
  repeatable?: boolean
  /** While active, prevent unrelated world actions until this beat resolves. If
   * `worldActionId` is set, only that action can proceed. If it is null, all
   * world actions wait on the beat. */
  blocksUnrelatedWorldActions?: boolean
  /** Effects applied once when the beat resolves (rewards/quality shifts). */
  onComplete?: EffectDef[]
  /** Effects applied when the beat first becomes active (fires once per
   * activation). */
  onActivate?: EffectDef[]
}

export type StoryPrimaryActionDef =
  | { kind: 'story_choice' }
  | { kind: 'preview_route_to_base' }
  | { kind: 'world_action'; actionId: string }
  | {
      kind: 'construction'
      optionId: string
      gatherRoleId: string | null
      buildRoleId: string | null
      crew: number | null
      waitSeconds: number
    }
  | { kind: 'assign_role'; roleId: string; crew: number | null; assignHero: boolean }
  | { kind: 'tick'; seconds: number }
  | { kind: 'recruit_from_survivor_cave'; vibesRoleId: string | null; waitSeconds: number }
  | { kind: 'none' }

export interface StoryProgressionDef {
  track: 'first_playable'
  stepId: string
  presentation: PresentationDef | null
  primaryAction: StoryPrimaryActionDef | null
  blockers: BlockerDef[]
  unlocks: UnlockDef[]
}

export interface StoryChoiceDef {
  id: string
  label: string
  response: string
  /** Effects applied when picked (the consequence). Authoring + Rust only; the
   * snapshot omits them. */
  effects?: EffectDef[]
}

/** A condition over game state, evaluated in the sim (`evaluate_condition`).
 * A condition array is implicitly AND. */
export type ConditionDef =
  | { kind: 'always' }
  | { kind: 'flag_set'; flag_id: string }
  | { kind: 'flag_unset'; flag_id: string }
  | { kind: 'resource_at_least'; resource_id: string; amount: number }
  | { kind: 'bubble_reach_at_least'; n: number }
  | { kind: 'clock_seconds_at_least'; seconds: number }
  | { kind: 'quality_at_least'; key: string; value: number }
  | { kind: 'beat_completed'; beat_id: string }
  | { kind: 'choice_made'; beat_id: string; option_id: string }
  | { kind: 'role_available'; role_id: string }
  | { kind: 'recruitment_enabled' }
  | { kind: 'recruited_any' }
  | { kind: 'hero_outside_bubble' }
  | { kind: 'hero_forced_return' }
  | { kind: 'hero_recovering' }
  | { kind: 'all'; conditions: ConditionDef[] }
  | { kind: 'any'; conditions: ConditionDef[] }
  | { kind: 'not'; condition: ConditionDef }

export interface FlagDef {
  id: string
  label: string
  group: string
}

export interface ModelDef {
  id: string
  label: string
  kind: 'cost' | 'duration' | 'progression' | 'bubble' | 'power' | 'recruitment' | 'vibes' | 'terrain' | 'storage'
}

export interface PersistenceDef {
  scope: 'save_slot' | 'run' | 'content'
  tuningAffinity: 'tuned' | 'detuned' | 'untuned'
  resetsOnTuning: boolean
}

export interface UnlockDef {
  kind: 'story' | 'construction' | 'power' | 'reach' | 'station' | 'processing'
  label: string
  relatedIds: string[]
}

export interface BlockerDef {
  kind:
    | 'missing_requirement'
    | 'missing_resource'
    | 'missing_power'
    | 'missing_staff'
    | 'blocked_at_cap'
    | 'busy'
    | 'inaccessible'
    | 'out_of_bubble'
    | 'occluded'
    | 'offline_disabled'
    | 'reach_locked'
  label: string
  relatedIds: string[]
}

export interface AccessRuleDef {
  kind:
    | 'base_only'
    | 'bubble_required'
    | 'hero_only'
    | 'hero_visited'
    | 'reach_required'
    | 'not_blocked'
    | 'power_network'
    | 'story_unlocked'
  label: string
  relatedIds: string[]
}

export interface FlowDef {
  itemId: string
  label: string
  direction: 'input' | 'output' | 'capacity' | 'pressure' | 'unlock'
  cadence:
    | 'passive'
    | 'per_second'
    | 'per_worker_second'
    | 'on_start'
    | 'on_complete'
    | 'while_powered'
    | 'while_staffed'
  relatedIds: string[]
}

export interface ModelRefDef {
  kind: 'cost' | 'duration' | 'progression' | 'bubble' | 'power' | 'recruitment' | 'vibes' | 'terrain' | 'storage'
  referenceId: string
  label: string
}

export interface PowerProfileDef {
  resourceId: string
  upkeepPerSecond: number
  manualPower: boolean
  startsRequested: boolean
  fallbackMode: 'always_on' | 'brownout_lifo' | 'manual_request' | 'immediate_off_outside_bubble'
}

export interface PresentationDef {
  shortLabel: string
  playerHint: string
  ctaCopy: string | null
  primaryRiskCopy: string | null
  displayPriority: number
  reveal: 'default' | 'advanced' | 'debug'
}

export type VisibilityConditionDef =
  | { kind: 'always' }
  | { kind: 'flag_set'; flag_id: string }
  | { kind: 'flag_unset'; flag_id: string }
  | { kind: 'resource_positive'; resource_id: string }
  | { kind: 'viral_load_positive' }
  | { kind: 'hero_outside_bubble' }
  | { kind: 'hero_forced_return' }
  | { kind: 'hero_recovering' }
  | { kind: 'echo_scars_positive' }
  | { kind: 'role_assigned'; role_id: string }
  | { kind: 'role_available'; role_id: string }
  | { kind: 'recruitment_enabled' }
  | { kind: 'recruitment_disabled' }
  | { kind: 'pending_recruits' }
  | { kind: 'recruited_any' }
  | { kind: 'brownout_active' }

export interface VisibilityDef {
  allOf: VisibilityConditionDef[]
  anyOf: VisibilityConditionDef[]
}

export interface UiElementDef {
  id: string
  label: string
  relatedIds: string[]
  visibility: VisibilityDef
  presentation: PresentationDef | null
}

export interface EntitySchemaDef {
  id: string
  entityKind:
    | 'resource'
    | 'role'
    | 'station'
    | 'construction_option'
    | 'processing_recipe'
    | 'world_action'
    | 'story_beat'
    | 'tile'
    | 'flora'
    | 'structure'
    | 'ui_surface'
  persistence: PersistenceDef | null
  unlocks: UnlockDef[]
  blockers: BlockerDef[]
  accessRules: AccessRuleDef[]
  power: PowerProfileDef | null
  flows: FlowDef[]
  modelRefs: ModelRefDef[]
  notes: string[]
  presentation: PresentationDef | null
  visibility: VisibilityDef | null
}

export interface ObjectiveDef {
  id: string
  label: string
  description: string
  sequence: number
  // conditions/rewards are sim-internal (serde-skip) and not surfaced here.
}

/** Runtime catalog identity for the generated combat/inventory catalogs. The
 * detailed authoring definitions remain in `content/{items,perks,creatures}`;
 * these fields make their stable IDs visible in snapshots and inspection. */
export interface ItemDef {
  id: string
  label: string
  stackable: boolean
  maxStack: number
  useEffect: { kind: string; amount: number } | null
}

export interface PerkDef {
  id: string
  label: string
  requires: string[]
  effects: { stat: string; multiplier: number }[]
}

export interface CreatureDef {
  id: string
  label: string
  hp: number
  attack: number
  threat: number
  xpReward: number
}

export interface CatalogSnapshot {
  resources: ResourceDef[]
  roles: RoleDef[]
  stations: StationDef[]
  constructionOptions: ConstructionOptionDef[]
  processingRecipes: ProcessingRecipeDef[]
  worldActions: WorldActionDef[]
  expeditionTargets: ExpeditionTargetDef[]
  resonanceRecipes: ResonanceRecipeDef[]
  storyBeats: StoryBeatDef[]
  objectives: ObjectiveDef[]
  items: ItemDef[]
  perks: PerkDef[]
  cinematics: CinematicDef[]
  creatures: CreatureDef[]
  flags: FlagDef[]
  models: ModelDef[]
  flora: FloraDef[]
  structures: StructureDef[]
  tiles: TileDef[]
  entitySchemas: EntitySchemaDef[]
  uiElements: UiElementDef[]
  balance: BalanceSnapshot
}

export interface BalanceSnapshot {
  bubble: BubbleBalance
  crystal: CrystalBalance
  power: PowerBalance
  progression: ProgressionBalance
  combat: CombatBalance
  survival: SurvivalBalance
  build: BuildBalance
  scavenge: ScavengeBalance
  firePit: FirePitBalance
  water: WaterBalance
  vibes: VibesBalance
  recruitment: RecruitmentBalance
  notesLimit: number
}

export interface BubbleBalance {
  holdSeconds: number
  degradeSecondsPerRing: number
  fieldKBase: number
}

export interface CrystalBalance {
  baseBasslineCap: number
  baseChorusCap: number
  baseHarmonicsCap: number
  basslineCapPerStorageLevel: number
  chorusCapPerStorageLevel: number
  harmonicsCapPerStorageLevel: number
  outputPerWorkerBase: number
  outputPerWorkerLevelBonus: number
  chorusPerWorkerBase: number
  chorusPerWorkerLevelBonus: number
  harmonicsPerWorkerBase: number
  harmonicsPerWorkerLevelBonus: number
  removingMossOutputMultiplier: number
  removingMossPassiveBasslinePerSecond: number
  fieldKBonusPerPolishLevel: number
  firePitCrewSlots: number
}

export interface PowerBalance {
  lifeSupportFreeStaff: number
  lifeSupportUpkeepPerStaffPerSecond: number
  harmonicsContinuousBonusPerUnit: number
  harmonicsContinuousBonusCap: number
  harmonicsTierOneThreshold: number
  harmonicsTierTwoThreshold: number
  harmonicsTierThreeThreshold: number
  harmonicsTierBonus: number
  basslineGenerationBonusWeight: number
  chorusGenerationBonusWeight: number
  harmonicsGenerationBonusWeight: number
  resonanceChamberFieldBonus: number
  mixConsoleHarmonicsBonus: number
  mixConsoleBrownoutTolerance: number
  tierTwoBrownoutTolerance: number
  tierThreeBrownoutTolerance: number
  tierThreeUpkeepDiscount: number
  brownoutBasslinePenaltyWeight: number
  brownoutChorusPenaltyWeight: number
  brownoutHarmonicsPenaltyWeight: number
  brownoutFieldPenaltyWeight: number
  resonanceProcessingFieldBonusPerLevel: number
  mixProcessingHarmonicsBonusPerLevel: number
  mixProcessingBrownoutTolerancePerLevel: number
  researchChorusFreeStaffPerLevel: number
  researchHarmonicsThresholdReductionPerLevel: number
}

export interface ProgressionBalance {
  levelMultiplierA: number
  xp0: number
  xpGrowth: number
  xpPerLocationClear: number
  xpPerExpedition: number
  xpPerStoryBeat: number
}

export interface CombatBalance {
  baseAttack: number
  attackPerLevel: number
  baseHp: number
  hpPerLevel: number
  roundSeconds: number
  damageVariance: number
  woundUnitsPerHpLost: number
  defeatExtraWoundUnits: number
}

export interface SurvivalBalance {
  heroExposureGameHours: number
  normalHumanExposureGameHours: number
  heroUntestedImmunityReductionGameHours: number
  recoveryTimeSeconds1To0: number
  sustainBonusPerLevel: number
  tierOneThresholdRatio: number
  tierTwoThresholdRatio: number
  tierThreeThresholdRatio: number
  tierOneWorkEfficiencyMultiplier: number
  tierTwoWorkEfficiencyMultiplier: number
  tierThreeWorkEfficiencyMultiplier: number
  tierOneMovementSpeedMultiplier: number
  tierTwoMovementSpeedMultiplier: number
  tierThreeMovementSpeedMultiplier: number
  tierOneEncounterRateMultiplier: number
  tierTwoEncounterRateMultiplier: number
  tierThreeEncounterRateMultiplier: number
  recoveryBrownoutPenaltyWeight: number
  recoveryBrownoutStopThreshold: number
}

export interface ScavengeBalance {
  baseStockMax: number
  stockRatePerSecond: number
  ambientRatePerSecond: number
}

export interface FirePitBalance {
  baseVibesPerSecond: number
  staffVibesPerSecond: number
}

export interface WaterBalance {
  waterCap: number
  baseStockMax: number
  collectionRatePerSecond: number
  tileRegenPerSecond: number
  workshopWaterCapPerLevel: number
  workshopRegenBonusPerLevel: number
}

export interface BuildBalance {
  workshopToolingSpeedBonusPerLevel: number
}

export interface VibesBalance {
  negativeK: number
  badVibesBeta: number
  badVibesPow: number
  doublingTimeSeconds: number
  decayResetSeconds: number
}

export interface RecruitmentBalance {
  recruitTravelSeconds: number
  instantRecruitDelaySeconds: number
  goodVibesOptBase: number
  goodVibesOptStep: number
  t1Minutes: number
  t30TotalGoodVibes: number
  t500TotalGoodVibes: number
  t1000TotalGoodVibes: number
}

export type WorkerRequest =
  | { type: 'init' }
  | { type: 'reset' }
  | { type: 'tick'; seconds: number }
  | { type: 'offlineCatchup'; elapsedSeconds: number }
  | { type: 'chooseStoryOption'; beatId: string; optionId: string }
  | { type: 'chooseInkChoice'; beatId: string; index: number }
  | { type: 'completePreArrivalRoute' }
  | { type: 'startCinematic'; cinematicId: string }
  | { type: 'advanceCinematic' }
  | { type: 'skipCinematic' }
  | { type: 'assignHero'; assigned: boolean }
  | { type: 'setHeroRole'; roleId: string }
  | { type: 'setRoleCrew'; roleId: string; crew: number }
  | { type: 'setStationEnabled'; stationId: string; enabled: boolean }
  | { type: 'startWorldAction'; actionId: string }
  | { type: 'startConstruction'; optionId: string }
  | { type: 'startProcessing'; recipeId: string }
  | { type: 'startResonanceRecipe'; recipeId: string }
  | { type: 'setStationSpecialization'; stationId: string; path: StationSpecializationPath }
  | { type: 'startExpedition'; targetId: string; assignedCrew: number }
  | { type: 'clearExpeditionReports' }
  | { type: 'recruitFromSurvivorCave' }
  | { type: 'moveHeroTo'; q: number; r: number }
  | { type: 'openDoor'; key: string }
  | { type: 'clearLocation'; key: string; lootItem?: string; lootQty: number }
  | { type: 'engage'; creatureId: string; key: string; lootItem?: string; lootQty: number }
  | { type: 'dropItem'; key: string; itemId: string; qty: number }
  | { type: 'pickUpLocation'; key: string }
  | { type: 'useItem'; itemId: string }
  | { type: 'acquirePerk'; perkId: string }
  | { type: 'spendBassline'; amount: number }
  | { type: 'setBalanceOverride'; path: string; value: number }
  | { type: 'resetBalanceOverrides' }
  | { type: 'importSave'; payload: string }
  | { type: 'exportSave' }

/**
 * A partial snapshot: only the top-level sections that changed since the last
 * full/merged snapshot. The client merges it shallowly over its held snapshot
 * (each changed section is replaced wholesale), reconstructing a full snapshot
 * for consumers. Keys are never removed (the schema is fixed).
 */
export type SnapshotDelta = Partial<SimulationSnapshot>

/** Optional timing the worker attaches to each event, to localise where sim cost goes. */
export interface WorkerEventTiming {
  /** Total time spent in the worker handling the request (ms). */
  workerMs?: number
  /** Time spent invoking the Rust/WASM runtime, excluding snapshot/diff work. */
  runtimeMs?: number
  /** Of which: time building the snapshot — the Rust→JS serialization (ms). */
  snapshotMs?: number
  /** Of which: time diffing the snapshot for the delta channel (ms). */
  diffMs?: number
  /** Absolute wall-clock ms (timeOrigin + now) when the worker received the request. */
  workerRecvAt?: number
  /** Absolute wall-clock ms (timeOrigin + now) when the worker posted this event. */
  workerPostAt?: number
}

export type WorkerEvent = (
  | { type: 'ready'; snapshot: SimulationSnapshot; catalog: CatalogSnapshot }
  | { type: 'snapshot'; snapshot: SimulationSnapshot }
  | { type: 'snapshotDelta'; changed: SnapshotDelta }
  | { type: 'save'; payload: string }
  | { type: 'error'; message: string }
) &
  WorkerEventTiming
