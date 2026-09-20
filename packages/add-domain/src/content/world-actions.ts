import type { WorldActionDef } from "@aedventure/add-protocol"

// Authored content: world actions (source of truth). codegen -> Rust `const WORLD_ACTIONS`.
export const WORLD_ACTIONS: readonly WorldActionDef[] = [
  {
    id: "world_action.investigate_base", schemaId: "world_action.investigate_base", label: "Investigate Base",
    durationSeconds: 5, heroOnly: true, offlineProgress: false, heroExposure: "studio",
    returnToBubbleSeconds: 0, returnToStudioSeconds: 0,
    requirements: [{ kind: "flag_unset", flag_id: "base.tutorial_investigated" }],
    effects: [{ kind: "set_flag", flag_id: "base.tutorial_investigated", value: true }],
    uiOrder: 10,
  },
  {
    id: "world_action.explore_base", schemaId: "world_action.explore_base", label: "Explore Base",
    durationSeconds: 10, heroOnly: true, offlineProgress: false, heroExposure: "outside_bubble",
    returnToBubbleSeconds: 2, returnToStudioSeconds: 4,
    requirements: [{ kind: "flag_set", flag_id: "base.tutorial_investigated" }, { kind: "flag_unset", flag_id: "base.tutorial_explored" }],
    effects: [
      { kind: "set_flag", flag_id: "base.tutorial_explored", value: true },
      { kind: "set_flag", flag_id: "base.studio_restore_unlocked", value: true },
      { kind: "set_flag", flag_id: "crystal.removing_moss_unlocked", value: true },
      { kind: "set_flag", flag_id: "base.water_collection_unlocked", value: true },
      { kind: "add_skins", amount: 1 },
    ],
    uiOrder: 20,
  },
]
