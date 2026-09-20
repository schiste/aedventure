#!/usr/bin/env node
// Content pipeline: codegen Rust catalog `const` arrays from the authored TS
// content modules (the single source of truth in packages/add-content/src/content).
// Mirrors scripts/build-internal-office-atlas.cjs: a deterministic generator with
// a `--check` mode (used by `content:check`) that fails if the checked-in Rust has
// drifted. Data equivalence across a migration is guarded separately by the Rust
// `catalog_snapshot_matches_golden` test.
//
//   node scripts/build-add-content.cjs           # regenerate the Rust files
//   node scripts/build-add-content.cjs --check    # verify, do not write

const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { execFileSync } = require("node:child_process")

const ROOT = path.resolve(__dirname, "..")
const CHECK = process.argv.includes("--check")
const PREAMBLE = "use crate::game_data::*;"
const RUST_EDITION = "2024"

function resolveRustfmt() {
  for (const candidate of ["rustfmt", path.join(os.homedir(), ".cargo", "bin", "rustfmt")]) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" })
      return candidate
    } catch {
      // try next
    }
  }
  throw new Error("rustfmt not found (install via `rustup component add rustfmt`).")
}

// Build the content source so we can require its compiled output.
execFileSync(path.join(ROOT, "node_modules", ".bin", "tsc"), ["-b", "packages/add-runtime-client"], {
  cwd: ROOT,
  stdio: "inherit",
})

const { toRustConst, toRustStatic } = require(path.join(ROOT, "packages/game-content/dist/index.js"))
const { validateAddContent } = require(path.join(__dirname, "add-content-validator.cjs"))
const content = (name) => require(path.join(ROOT, "packages/add-content/dist/content", `${name}.js`))
const resources = content("resources")
const roles = content("roles")
const flags = content("flags")
const flora = content("flora")
const structures = content("structures")
const tiles = content("tiles")
const stations = content("stations")
const construction = content("construction")
const worldActions = content("world-actions")
const processing = content("processing")
const story = content("story")
const uiElements = content("ui-elements")
const entitySchemas = content("entity-schemas")
const balance = content("balance")
const perks = content("perks")
const items = content("items")
const creatures = content("creatures")
const objectives = content("objectives")
const contentVersion = content("content-version")
const encounterTables = content("encounter-tables")
const lootTables = content("loot-tables")
const dungeons = require(path.join(ROOT, "packages/add-content/dist/dungeons/registry.js"))
const areas = require(path.join(ROOT, "packages/add-content/dist/areas/registry.js"))

try {
  validateAddContent({
    resources: resources.RESOURCES,
    roles: roles.ROLES,
    flags: flags.FLAGS,
    flora: flora.FLORA,
    structures: structures.STRUCTURES,
    tiles: tiles.TILES,
    stations: stations.STATIONS,
    constructionOptions: construction.CONSTRUCTION_OPTIONS,
    worldActions: worldActions.WORLD_ACTIONS,
    processingRecipes: processing.PROCESSING_RECIPES,
    storyBeats: story.STORY_BEATS,
    uiElements: uiElements.UI_ELEMENTS,
    entitySchemas: entitySchemas.ENTITY_SCHEMAS,
    items: items.ITEMS,
    perks: perks.PERKS,
    creatures: creatures.CREATURES,
    dungeons: dungeons.ADD_DUNGEON_REGISTRY,
    areas: areas.ADD_AREA_REGISTRY,
    objectives: objectives.OBJECTIVES,
    encounterTables: encounterTables.ENCOUNTER_TABLES,
    lootTables: lootTables.LOOT_TABLES,
  })
} catch (err) {
  console.error(err.message || err)
  process.exit(1)
}

const VIS = "pub(in crate::game_data)"
// Balance is all-numeric; helper for the many f64 fields (from defaults to camelCase).
const f64s = (...names) => names.map((name) => ({ name, kind: "f64" }))
const i64 = (name) => ({ name, kind: "i64" })

// Reusable: a `requirements: &[RequirementDef]` field (tuple-variant enum).
const REQUIREMENTS_FIELD = {
  name: "requirements",
  kind: "array",
  element: {
    name: "req",
    kind: "taggedEnum",
    rustEnum: "RequirementDef",
    variants: {
      flag_set: { variant: "FlagSet", tuple: [{ name: "flag", from: "flag_id", kind: "idConst", prefix: "FLAG_" }] },
      flag_unset: { variant: "FlagUnset", tuple: [{ name: "flag", from: "flag_id", kind: "idConst", prefix: "FLAG_" }] },
    },
  },
}

// Reusable: cost / duration / effects (kind-tagged Rust enums). Cross-catalog id
// references (resource_id, item_id) emit as string literals (value-equivalent,
// dodges irregular id-const names like COST_ITEM_SKIN); flag ids stay id-consts.
const COST_FIELD = {
  name: "cost",
  kind: "taggedEnum",
  rustEnum: "CostDef",
  variants: {
    upfront: { variant: "Upfront", fields: [{ name: "resource_id", from: "resource_id", kind: "string" }, { name: "amount", kind: "f64" }] },
    upfront_bundle: {
      variant: "UpfrontBundle",
      fields: [
        {
          name: "costs",
          kind: "array",
          element: { name: "c", kind: "struct", structType: "CostItemDef", fields: [{ name: "item_id", from: "item_id", kind: "string" }, { name: "amount", kind: "f64" }] },
        },
      ],
    },
    drain_per_worker_second: { variant: "DrainPerWorkerSecond", fields: [{ name: "resource_id", from: "resource_id", kind: "string" }, { name: "amount", kind: "f64" }] },
    time_only: { variant: "TimeOnly" },
  },
}

const DURATION_FIELD = {
  name: "duration",
  kind: "taggedEnum",
  rustEnum: "DurationDef",
  variants: {
    fixed: { variant: "Fixed", fields: [{ name: "seconds", kind: "f64" }] },
    crystal_level_scaled: {
      variant: "CrystalLevelScaled",
      fields: [
        { name: "track", kind: "enum", rustEnum: "CrystalTrack" },
        { name: "base_seconds", from: "base_seconds", kind: "f64" },
        { name: "per_level_seconds", from: "per_level_seconds", kind: "f64" },
      ],
    },
  },
}

const EFFECTS_FIELD = {
  name: "effects",
  kind: "array",
  element: {
    name: "eff",
    kind: "taggedEnum",
    rustEnum: "EffectDef",
    variants: {
      set_flag: { variant: "SetFlag", fields: [{ name: "flag_id", from: "flag_id", kind: "idConst", prefix: "FLAG_" }, { name: "value", kind: "bool" }] },
      add_bunks: { variant: "AddBunks", fields: [{ name: "amount", kind: "i64" }] },
      add_skins: { variant: "AddSkins", fields: [{ name: "amount", kind: "i64" }] },
      increment_crystal_track: { variant: "IncrementCrystalTrack", fields: [{ name: "track", kind: "enum", rustEnum: "CrystalTrack" }, { name: "amount", kind: "i64" }] },
      increment_processing_track: { variant: "IncrementProcessingTrack", fields: [{ name: "track", kind: "enum", rustEnum: "ProcessingTrack" }, { name: "amount", kind: "i64" }] },
      grant_resource: { variant: "GrantResource", fields: [{ name: "resource_id", from: "resource_id", kind: "string" }, { name: "amount", kind: "f64" }] },
      spend_resource: { variant: "SpendResource", fields: [{ name: "resource_id", from: "resource_id", kind: "string" }, { name: "amount", kind: "f64" }] },
      set_quality: { variant: "SetQuality", fields: [{ name: "key", from: "key", kind: "string" }, { name: "value", kind: "i64" }] },
      add_quality: { variant: "AddQuality", fields: [{ name: "key", from: "key", kind: "string" }, { name: "amount", kind: "i64" }] },
      complete_beat: { variant: "CompleteBeat", fields: [{ name: "beat_id", from: "beat_id", kind: "idConst" }] },
      note: { variant: "Note", fields: [{ name: "text", from: "text", kind: "string" }] },
    },
  },
}

// Reusable: a single `Condition` (the unified gating vocabulary, evaluated in the
// sim). A condition array is implicitly AND; explicit all/any/not lets authors
// compose richer deterministic gates without leaving the runtime vocabulary.
const CONDITION = {
  name: "cond",
  kind: "taggedEnum",
  rustEnum: "Condition",
  variants: {},
}
Object.assign(CONDITION.variants, {
  always: { variant: "Always" },
  flag_set: { variant: "FlagSet", tuple: [{ name: "flag", from: "flag_id", kind: "idConst", prefix: "FLAG_" }] },
  flag_unset: { variant: "FlagUnset", tuple: [{ name: "flag", from: "flag_id", kind: "idConst", prefix: "FLAG_" }] },
  resource_at_least: { variant: "ResourceAtLeast", fields: [{ name: "resource_id", from: "resource_id", kind: "string" }, { name: "amount", kind: "f64" }] },
  bubble_reach_at_least: { variant: "BubbleReachAtLeast", tuple: [{ name: "n", from: "n", kind: "i64" }] },
  clock_seconds_at_least: { variant: "ClockSecondsAtLeast", tuple: [{ name: "seconds", from: "seconds", kind: "f64" }] },
  quality_at_least: { variant: "QualityAtLeast", fields: [{ name: "key", from: "key", kind: "string" }, { name: "value", kind: "i64" }] },
  beat_completed: { variant: "BeatCompleted", tuple: [{ name: "beat", from: "beat_id", kind: "idConst" }] },
  choice_made: { variant: "ChoiceMade", fields: [{ name: "beat_id", from: "beat_id", kind: "idConst" }, { name: "option_id", from: "option_id", kind: "string" }] },
  role_available: { variant: "RoleAvailable", tuple: [{ name: "role", from: "role_id", kind: "idConst", prefix: "ROLE_" }] },
  recruitment_enabled: { variant: "RecruitmentEnabled" },
  recruited_any: { variant: "RecruitedAny" },
  hero_outside_bubble: { variant: "HeroOutsideBubble" },
  hero_forced_return: { variant: "HeroForcedReturn" },
  hero_recovering: { variant: "HeroRecovering" },
  all: { variant: "All", tuple: [{ name: "conditions", kind: "array", element: CONDITION }] },
  any: { variant: "Any", tuple: [{ name: "conditions", kind: "array", element: CONDITION }] },
  not: { variant: "Not", tuple: [{ name: "condition", kind: "ref", element: CONDITION }] },
})
const conditionsField = (name) => ({ name, kind: "array", element: CONDITION })
const effectsField = (name) => ({ ...EFFECTS_FIELD, name })

// Reusable: visibility (conditions) + presentation, shared by ui_elements and
// entity_schemas. Condition arg fields are snake_case in the JSON.
const VISIBILITY_CONDITION = {
  name: "cond",
  kind: "taggedEnum",
  rustEnum: "VisibilityConditionDef",
  variants: {
    always: { variant: "Always" },
    flag_set: { variant: "FlagSet", fields: [{ name: "flag_id", from: "flag_id", kind: "string" }] },
    flag_unset: { variant: "FlagUnset", fields: [{ name: "flag_id", from: "flag_id", kind: "string" }] },
    resource_positive: { variant: "ResourcePositive", fields: [{ name: "resource_id", from: "resource_id", kind: "string" }] },
    viral_load_positive: { variant: "ViralLoadPositive" },
    hero_outside_bubble: { variant: "HeroOutsideBubble" },
    hero_forced_return: { variant: "HeroForcedReturn" },
    hero_recovering: { variant: "HeroRecovering" },
    echo_scars_positive: { variant: "EchoScarsPositive" },
    role_assigned: { variant: "RoleAssigned", fields: [{ name: "role_id", from: "role_id", kind: "string" }] },
    role_available: { variant: "RoleAvailable", fields: [{ name: "role_id", from: "role_id", kind: "string" }] },
    recruitment_enabled: { variant: "RecruitmentEnabled" },
    recruitment_disabled: { variant: "RecruitmentDisabled" },
    pending_recruits: { variant: "PendingRecruits" },
    recruited_any: { variant: "RecruitedAny" },
    brownout_active: { variant: "BrownoutActive" },
  },
}

const VISIBILITY_FIELD = {
  name: "visibility",
  kind: "struct",
  structType: "VisibilityDef",
  fields: [
    { name: "all_of", from: "allOf", kind: "array", element: VISIBILITY_CONDITION },
    { name: "any_of", from: "anyOf", kind: "array", element: VISIBILITY_CONDITION },
  ],
}

const PRESENTATION_FIELD = {
  name: "presentation",
  kind: "option",
  inner: "struct",
  structType: "PresentationDef",
  fields: [
    { name: "short_label", kind: "string" },
    { name: "player_hint", kind: "string" },
    { name: "cta_copy", kind: "option", inner: "string" },
    { name: "primary_risk_copy", kind: "option", inner: "string" },
    { name: "display_priority", kind: "i64" },
    { name: "reveal", kind: "enum", rustEnum: "PresentationReveal" },
  ],
}

const UNLOCK_FIELD = {
  name: "unlock",
  kind: "struct",
  structType: "UnlockDef",
  fields: [
    { name: "kind", kind: "enum", rustEnum: "UnlockKind" },
    { name: "label", kind: "string" },
    { name: "related_ids", kind: "array", element: { name: "id", kind: "string" } },
  ],
}

const BLOCKER_FIELD = {
  name: "blocker",
  kind: "struct",
  structType: "BlockerDef",
  fields: [
    { name: "kind", kind: "enum", rustEnum: "BlockerKind" },
    { name: "label", kind: "string" },
    { name: "related_ids", kind: "array", element: { name: "id", kind: "string" } },
  ],
}

const UNLOCKS_FIELD = {
  name: "unlocks",
  kind: "array",
  element: UNLOCK_FIELD,
}

const BLOCKERS_FIELD = {
  name: "blockers",
  kind: "array",
  element: BLOCKER_FIELD,
}

const STORY_PRIMARY_ACTION_FIELD = {
  name: "primary_action",
  from: "primaryAction",
  kind: "option",
  inner: "taggedEnum",
  rustEnum: "StoryPrimaryActionDef",
  variants: {
    story_choice: { variant: "StoryChoice" },
    preview_route_to_base: { variant: "PreviewRouteToBase" },
    world_action: {
      variant: "WorldAction",
      fields: [{ name: "action_id", from: "actionId", kind: "string" }],
    },
    construction: {
      variant: "Construction",
      fields: [
        { name: "option_id", from: "optionId", kind: "string" },
        { name: "gather_role_id", from: "gatherRoleId", kind: "option", inner: "string" },
        { name: "build_role_id", from: "buildRoleId", kind: "option", inner: "string" },
        { name: "crew", kind: "option", inner: "i64" },
        { name: "wait_seconds", from: "waitSeconds", kind: "f64" },
      ],
    },
    assign_role: {
      variant: "AssignRole",
      fields: [
        { name: "role_id", from: "roleId", kind: "string" },
        { name: "crew", kind: "option", inner: "i64" },
        { name: "assign_hero", from: "assignHero", kind: "bool" },
      ],
    },
    tick: {
      variant: "Tick",
      fields: [{ name: "seconds", kind: "f64" }],
    },
    recruit_from_survivor_cave: {
      variant: "RecruitFromSurvivorCave",
      fields: [
        { name: "vibes_role_id", from: "vibesRoleId", kind: "option", inner: "string" },
        { name: "wait_seconds", from: "waitSeconds", kind: "f64" },
      ],
    },
    none: { variant: "None" },
  },
}

const STORY_PROGRESSION_FIELD = {
  name: "progression",
  kind: "option",
  inner: "struct",
  structType: "StoryProgressionDef",
  fields: [
    { name: "track", kind: "string" },
    { name: "step_id", from: "stepId", kind: "string" },
    PRESENTATION_FIELD,
    STORY_PRIMARY_ACTION_FIELD,
    BLOCKERS_FIELD,
    UNLOCKS_FIELD,
  ],
}

// One entry per generated Rust file. A file may hold several catalogs (consts);
// each maps authored TS data → a Rust `const` array via a shape descriptor.
const FILES = [
  {
    sourceModule: "packages/add-content/src/content/resources.ts",
    rustPath: "crates/add-core/src/game_data/catalog/resources.rs",
    consts: [
      {
        entries: resources.RESOURCES,
        spec: {
          constName: "RESOURCES",
          rustType: "ResourceDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "category", kind: "enum", rustEnum: "ResourceCategory" },
            { name: "base_cap", kind: "f64" },
            { name: "cap_behavior", kind: "enum", rustEnum: "CapBehavior" },
            { name: "starts_at", kind: "f64" },
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-content/src/content/roles.ts",
    rustPath: "crates/add-core/src/game_data/catalog/roles.rs",
    consts: [
      {
        entries: roles.ROLES,
        spec: {
          constName: "ROLES",
          rustType: "RoleDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "slot_pool", kind: "enum", rustEnum: "RoleSlotPool" },
            { name: "hero_allowed", kind: "bool" },
            { name: "crew_allowed", kind: "bool" },
            { name: "max_crew_slots", kind: "option", inner: "i64" },
            { name: "ui_section", kind: "string" },
            { name: "ui_order", kind: "i64" },
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-content/src/content/flags.ts",
    rustPath: "crates/add-core/src/game_data/catalog/flags.rs",
    consts: [
      {
        entries: flags.FLAGS,
        spec: {
          constName: "FLAGS",
          rustType: "FlagDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst", prefix: "FLAG_" },
            { name: "label", kind: "string" },
            { name: "group", kind: "string" },
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-content/src/content/{flora,structures,tiles}.ts",
    rustPath: "crates/add-core/src/game_data/catalog/tiles.rs",
    consts: [
      {
        entries: flora.FLORA,
        spec: {
          constName: "FLORA",
          rustType: "FloraDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "kind", kind: "enum", rustEnum: "FloraKind" },
            { name: "tags", kind: "enumArray", rustEnum: "TileTag" },
          ],
        },
      },
      {
        entries: structures.STRUCTURES,
        spec: {
          constName: "STRUCTURES",
          rustType: "StructureDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "kind", kind: "enum", rustEnum: "StructureKind" },
            { name: "tags", kind: "enumArray", rustEnum: "TileTag" },
          ],
        },
      },
      {
        entries: tiles.TILES,
        spec: {
          constName: "TILES",
          rustType: "TileDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "terrain", kind: "enum", rustEnum: "TerrainSnapshot" },
            { name: "feature", kind: "enum", rustEnum: "TileFeature" },
            { name: "impedance", kind: "f64" },
            { name: "is_blocker", kind: "bool" },
            { name: "tags", kind: "enumArray", rustEnum: "TileTag" },
            { name: "flora_ids", kind: "idConstArray" },
            { name: "structure_ids", kind: "idConstArray" },
            { name: "dungeon_ids", kind: "idConstArray" },
            { name: "area_ids", kind: "idConstArray" },
            { name: "building_capacity", kind: "i64" },
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-content/src/content/stations.ts",
    rustPath: "crates/add-core/src/game_data/catalog/stations.rs",
    consts: [
      {
        entries: stations.STATIONS,
        spec: {
          constName: "STATIONS",
          rustType: "StationDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "category", kind: "enum", rustEnum: "StationCategory" },
            { name: "chorus_upkeep_per_second", kind: "f64" },
            { name: "manual_power", kind: "bool" },
            { name: "starts_requested", kind: "bool" },
            REQUIREMENTS_FIELD,
            { name: "ui_order", kind: "i64" },
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-content/src/content/{construction,world-actions,processing}.ts",
    rustPath: "crates/add-core/src/game_data/catalog/actions.rs",
    consts: [
      {
        entries: construction.CONSTRUCTION_OPTIONS,
        spec: {
          constName: "CONSTRUCTION_OPTIONS",
          rustType: "ConstructionOptionDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "group", kind: "enum", rustEnum: "ConstructionGroup" },
            COST_FIELD,
            DURATION_FIELD,
            REQUIREMENTS_FIELD,
            EFFECTS_FIELD,
            { name: "ui_order", kind: "i64" },
          ],
        },
      },
      {
        entries: worldActions.WORLD_ACTIONS,
        spec: {
          constName: "WORLD_ACTIONS",
          rustType: "WorldActionDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "duration_seconds", kind: "f64" },
            { name: "hero_only", kind: "bool" },
            { name: "offline_progress", kind: "bool" },
            { name: "hero_exposure", kind: "enum", rustEnum: "HeroExposureDef" },
            { name: "return_to_bubble_seconds", kind: "f64" },
            { name: "return_to_studio_seconds", kind: "f64" },
            REQUIREMENTS_FIELD,
            EFFECTS_FIELD,
            { name: "ui_order", kind: "i64" },
          ],
        },
      },
      {
        entries: processing.PROCESSING_RECIPES,
        spec: {
          constName: "PROCESSING_RECIPES",
          rustType: "ProcessingRecipeDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "station_id", kind: "string" },
            COST_FIELD,
            DURATION_FIELD,
            REQUIREMENTS_FIELD,
            EFFECTS_FIELD,
            { name: "max_level", kind: "i64" },
            { name: "ui_order", kind: "i64" },
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-content/src/content/story/index.ts",
    rustPath: "crates/add-core/src/game_data/catalog/story_beats.rs",
    consts: [
      {
        entries: story.STORY_BEATS,
        spec: {
          constName: "STORY_BEATS",
          rustType: "StoryBeatDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "body", kind: "string" },
            { name: "arc", kind: "string" },
            { name: "sequence", kind: "i64" },
            { name: "world_action_id", kind: "option", inner: "string" },
            {
              name: "choices",
              kind: "array",
              element: {
                name: "c",
                kind: "struct",
                structType: "StoryChoiceDef",
                fields: [
                  { name: "id", kind: "string" },
                  { name: "label", kind: "string" },
                  { name: "response", kind: "string" },
                  effectsField("effects"),
                ],
              },
            },
            { name: "related_ids", kind: "array", element: { name: "r", kind: "string" } },
            STORY_PROGRESSION_FIELD,
            conditionsField("preconditions"),
            conditionsField("auto_complete_when"),
            { name: "priority", kind: "i64" },
            { name: "repeatable", kind: "bool" },
            { name: "blocks_unrelated_world_actions", from: "blocksUnrelatedWorldActions", kind: "bool" },
            effectsField("on_complete"),
            effectsField("on_activate"),
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-content/src/content/ui-elements.ts",
    rustPath: "crates/add-core/src/game_data/catalog/ui_elements.rs",
    consts: [
      {
        entries: uiElements.UI_ELEMENTS,
        spec: {
          constName: "UI_ELEMENTS",
          rustType: "UiElementDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "string" },
            { name: "label", kind: "string" },
            { name: "related_ids", kind: "array", element: { name: "r", kind: "string" } },
            VISIBILITY_FIELD,
            PRESENTATION_FIELD,
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-content/src/content/entity-schemas.ts",
    rustPath: "crates/add-core/src/game_data/catalog/entity_schemas.rs",
    consts: [
      {
        entries: entitySchemas.ENTITY_SCHEMAS,
        spec: {
          constName: "ENTITY_SCHEMAS",
          rustType: "EntitySchemaDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "string" },
            { name: "entity_kind", kind: "enum", rustEnum: "EntityKind" },
            {
              name: "persistence",
              kind: "option",
              inner: "struct",
              structType: "PersistenceDef",
              fields: [
                { name: "scope", kind: "enum", rustEnum: "PersistenceScope" },
                { name: "tuning_affinity", kind: "enum", rustEnum: "TuningAffinity" },
                { name: "resets_on_tuning", kind: "bool" },
              ],
            },
            {
              ...UNLOCKS_FIELD,
            },
            {
              ...BLOCKERS_FIELD,
            },
            {
              name: "access_rules",
              kind: "array",
              element: {
                name: "rule",
                kind: "struct",
                structType: "AccessRuleDef",
                fields: [
                  { name: "kind", kind: "enum", rustEnum: "AccessRuleKind" },
                  { name: "label", kind: "string" },
                  { name: "related_ids", kind: "array", element: { name: "id", kind: "string" } },
                ],
              },
            },
            {
              name: "power",
              kind: "option",
              inner: "struct",
              structType: "PowerProfileDef",
              fields: [
                { name: "resource_id", kind: "string" },
                { name: "upkeep_per_second", kind: "f64" },
                { name: "manual_power", kind: "bool" },
                { name: "starts_requested", kind: "bool" },
                { name: "fallback_mode", kind: "enum", rustEnum: "PowerFallbackMode" },
              ],
            },
            {
              name: "flows",
              kind: "array",
              element: {
                name: "flow",
                kind: "struct",
                structType: "FlowDef",
                fields: [
                  { name: "item_id", kind: "string" },
                  { name: "label", kind: "string" },
                  { name: "direction", kind: "enum", rustEnum: "FlowDirection" },
                  { name: "cadence", kind: "enum", rustEnum: "FlowCadence" },
                  { name: "related_ids", kind: "array", element: { name: "id", kind: "string" } },
                ],
              },
            },
            {
              name: "model_refs",
              kind: "array",
              element: {
                name: "model_ref",
                kind: "struct",
                structType: "ModelRefDef",
                fields: [
                  { name: "kind", kind: "enum", rustEnum: "ModelKind" },
                  { name: "reference_id", kind: "string" },
                  { name: "label", kind: "string" },
                ],
              },
            },
            { name: "notes", kind: "array", element: { name: "note", kind: "string" } },
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-content/src/content/balance.ts",
    rustPath: "crates/add-core/src/game_data/catalog/balance.rs",
    consts: [
      {
        singleton: true,
        entries: balance.BALANCE,
        spec: {
          constName: "BALANCE",
          rustType: "BalanceSnapshot",
          visibility: VIS,
          fields: [
            { name: "bubble", kind: "struct", structType: "BubbleBalance", fields: f64s("hold_seconds", "degrade_seconds_per_ring", "field_k_base") },
            {
              name: "crystal", kind: "struct", structType: "CrystalBalance",
              fields: [
                ...f64s("base_bassline_cap", "base_chorus_cap", "base_harmonics_cap", "bassline_cap_per_storage_level", "chorus_cap_per_storage_level", "harmonics_cap_per_storage_level", "output_per_worker_base", "output_per_worker_level_bonus", "chorus_per_worker_base", "chorus_per_worker_level_bonus", "harmonics_per_worker_base", "harmonics_per_worker_level_bonus", "removing_moss_output_multiplier", "removing_moss_passive_bassline_per_second", "field_k_bonus_per_polish_level"),
                i64("fire_pit_crew_slots"),
              ],
            },
            {
              name: "power", kind: "struct", structType: "PowerBalance",
              fields: [
                i64("life_support_free_staff"),
                ...f64s("life_support_upkeep_per_staff_per_second", "harmonics_continuous_bonus_per_unit", "harmonics_continuous_bonus_cap", "harmonics_tier_one_threshold", "harmonics_tier_two_threshold", "harmonics_tier_three_threshold", "harmonics_tier_bonus", "bassline_generation_bonus_weight", "chorus_generation_bonus_weight", "harmonics_generation_bonus_weight", "resonance_chamber_field_bonus", "mix_console_harmonics_bonus", "mix_console_brownout_tolerance", "tier_two_brownout_tolerance", "tier_three_brownout_tolerance", "tier_three_upkeep_discount", "brownout_bassline_penalty_weight", "brownout_chorus_penalty_weight", "brownout_harmonics_penalty_weight", "brownout_field_penalty_weight", "resonance_processing_field_bonus_per_level", "mix_processing_harmonics_bonus_per_level", "mix_processing_brownout_tolerance_per_level"),
                i64("research_chorus_free_staff_per_level"),
                ...f64s("research_harmonics_threshold_reduction_per_level"),
              ],
            },
            { name: "progression", kind: "struct", structType: "ProgressionBalance", fields: f64s("level_multiplier_a", "xp0", "xp_growth", "xp_per_location_clear", "xp_per_expedition", "xp_per_story_beat") },
            { name: "combat", kind: "struct", structType: "CombatBalance", fields: f64s("base_attack", "attack_per_level", "base_hp", "hp_per_level", "round_seconds", "damage_variance", "wound_units_per_hp_lost", "defeat_extra_wound_units") },
            {
              name: "survival", kind: "struct", structType: "SurvivalBalance",
              fields: f64s("hero_time_seconds_0_to_1", "normal_human_time_seconds_0_to_1", "recovery_time_seconds_1_to_0", "sustain_bonus_per_level", "tier_one_threshold_ratio", "tier_two_threshold_ratio", "tier_three_threshold_ratio", "tier_one_work_efficiency_multiplier", "tier_two_work_efficiency_multiplier", "tier_three_work_efficiency_multiplier", "tier_one_movement_speed_multiplier", "tier_two_movement_speed_multiplier", "tier_three_movement_speed_multiplier", "tier_one_encounter_rate_multiplier", "tier_two_encounter_rate_multiplier", "tier_three_encounter_rate_multiplier", "recovery_brownout_penalty_weight", "recovery_brownout_stop_threshold"),
            },
            { name: "build", kind: "struct", structType: "BuildBalance", fields: f64s("workshop_tooling_speed_bonus_per_level") },
            { name: "scavenge", kind: "struct", structType: "ScavengeBalance", fields: f64s("base_stock_max", "stock_rate_per_second", "ambient_rate_per_second") },
            { name: "fire_pit", kind: "struct", structType: "FirePitBalance", fields: f64s("base_vibes_per_second", "staff_vibes_per_second") },
            { name: "water", kind: "struct", structType: "WaterBalance", fields: f64s("water_cap", "base_stock_max", "collection_rate_per_second", "tile_regen_per_second", "workshop_water_cap_per_level", "workshop_regen_bonus_per_level") },
            { name: "vibes", kind: "struct", structType: "VibesBalance", fields: f64s("negative_k", "bad_vibes_beta", "bad_vibes_pow", "doubling_time_seconds", "decay_reset_seconds") },
            { name: "recruitment", kind: "struct", structType: "RecruitmentBalance", fields: f64s("recruit_travel_seconds", "instant_recruit_delay_seconds", "good_vibes_opt_base", "good_vibes_opt_step", "t1_minutes", "t30_total_good_vibes", "t500_total_good_vibes", "t1000_total_good_vibes") },
            i64("notes_limit"),
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-content/src/content/perks.ts",
    rustPath: "crates/add-core/src/game_data/catalog/perks.rs",
    consts: [
      {
        entries: perks.PERKS,
        spec: {
          constName: "PERKS",
          rustType: "PerkDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "string" },
            { name: "label", kind: "string" },
            { name: "requires", kind: "array", element: { name: "r", kind: "string" } },
            {
              name: "effects",
              kind: "array",
              element: {
                name: "e",
                kind: "struct",
                structType: "PerkEffectDef",
                fields: [
                  { name: "stat", kind: "enum", rustEnum: "PerkStat" },
                  { name: "multiplier", kind: "f64" },
                ],
              },
            },
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-content/src/content/items.ts",
    rustPath: "crates/add-core/src/game_data/catalog/items.rs",
    consts: [
      {
        entries: items.ITEMS,
        spec: {
          constName: "ITEMS",
          rustType: "ItemDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "string" },
            { name: "label", kind: "string" },
            { name: "stackable", kind: "bool" },
            { name: "max_stack", kind: "u64" },
            {
              name: "use_effect",
              kind: "option",
              inner: "struct",
              structType: "ItemEffectDef",
              fields: [
                { name: "kind", kind: "enum", rustEnum: "ItemEffectKind" },
                { name: "amount", kind: "f64" },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-content/src/content/creatures.ts",
    rustPath: "crates/add-core/src/game_data/catalog/creatures.rs",
    consts: [
      {
        entries: creatures.CREATURES,
        spec: {
          constName: "CREATURES",
          rustType: "CreatureDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "string" },
            { name: "label", kind: "string" },
            { name: "hp", kind: "f64" },
            { name: "attack", kind: "f64" },
            { name: "threat", kind: "f64" },
            { name: "xp_reward", kind: "f64" },
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-content/src/content/objectives.ts",
    rustPath: "crates/add-core/src/game_data/catalog/objectives.rs",
    consts: [
      {
        entries: objectives.OBJECTIVES,
        spec: {
          constName: "OBJECTIVES",
          rustType: "ObjectiveDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "string" },
            { name: "label", kind: "string" },
            { name: "description", kind: "string" },
            { name: "sequence", kind: "i64" },
            conditionsField("conditions"),
            effectsField("rewards"),
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-content/src/content/content-version.ts",
    rustPath: "crates/add-core/src/game_data/catalog/version.rs",
    preamble: false,
    render: () => [
      `pub const CONTENT_SCHEMA_VERSION: u16 = ${contentVersion.ADD_CONTENT_VERSION.contentSchemaVersion};`,
      `pub const CONTENT_CATALOG_VERSION: u16 = ${contentVersion.ADD_CONTENT_VERSION.catalogVersion};`,
      `pub const CONTENT_SAVE_SCHEMA_VERSION: u16 = ${contentVersion.ADD_CONTENT_VERSION.saveSchemaVersion};`,
      "",
    ].join("\n"),
  },
]

const rustfmt = resolveRustfmt()

function generate(file) {
  const header = [
    `// @generated by \`npm run content:build\` from ${file.sourceModule}.`,
    "// Do not edit by hand; edit the TS source and re-run the generator.",
  ].join("\n")
  const blocks = file.render
    ? file.render()
    : file.consts.map((c) =>
      c.singleton ? toRustStatic(c.spec, c.entries) : toRustConst(c.spec, c.entries),
    ).join("\n")
  const raw = [header, "", file.preamble === false ? null : PREAMBLE, file.preamble === false ? null : "", blocks]
    .filter((part) => part !== null)
    .join("\n")
  const tmp = path.join(os.tmpdir(), `add-content-${path.basename(file.rustPath)}`)
  fs.writeFileSync(tmp, raw)
  try {
    execFileSync(rustfmt, ["--edition", RUST_EDITION, tmp], {
      stdio: ["ignore", "ignore", "pipe"],
    })
  } catch (err) {
    console.error(`[content:build] rustfmt failed for ${file.rustPath}:\n${err.stderr || err}`)
    console.error(`[content:build] raw left at ${tmp}`)
    throw err
  }
  const formatted = fs.readFileSync(tmp, "utf8")
  fs.unlinkSync(tmp)
  return formatted
}

let drift = 0
for (const file of FILES) {
  const formatted = generate(file)
  const target = path.join(ROOT, file.rustPath)
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null
  if (CHECK) {
    if (current !== formatted) {
      drift += 1
      console.error(`[content:check] DRIFT: ${file.rustPath} is out of date with its TS source`)
    }
  } else if (current !== formatted) {
    fs.writeFileSync(target, formatted)
    console.log(`[content:build] wrote ${file.rustPath}`)
  } else {
    console.log(`[content:build] up to date: ${file.rustPath}`)
  }
}

if (CHECK && drift > 0) {
  console.error(`[content:check] ${drift} file(s) drifted; run \`npm run content:build\`.`)
  process.exit(1)
}
