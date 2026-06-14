import type { ConditionDef, StoryBeatDef } from "../runtime/protocol"

// Authored content: story beats as STORYLETS (quests/dialogue source of truth).
// codegen -> Rust `const STORY_BEATS`. The Rust salience selector activates the
// highest-`priority` beat whose `preconditions` all hold; a non-repeatable beat
// auto-resolves when its `autoCompleteWhen` conditions hold. Beats 1-3 still
// resolve via their dialogue choice; beats 4-11 resolve from game state, so the
// whole spine (including the formerly-orphaned 6-11) is now data-driven.
// `worldActionId`/`relatedIds`/condition ids reference other catalogs by value.

export const storyCondition = {
  always: (): ConditionDef => ({ kind: "always" }),
  flagSet: (flag_id: string): ConditionDef => ({ kind: "flag_set", flag_id }),
  flagUnset: (flag_id: string): ConditionDef => ({ kind: "flag_unset", flag_id }),
  resourceAtLeast: (resource_id: string, amount: number): ConditionDef => ({
    kind: "resource_at_least",
    resource_id,
    amount,
  }),
  bubbleReachAtLeast: (n: number): ConditionDef => ({ kind: "bubble_reach_at_least", n }),
  clockSecondsAtLeast: (seconds: number): ConditionDef => ({ kind: "clock_seconds_at_least", seconds }),
  qualityAtLeast: (key: string, value: number): ConditionDef => ({ kind: "quality_at_least", key, value }),
  beatDone: (beat_id: string): ConditionDef => ({ kind: "beat_completed", beat_id }),
  choiceMade: (beat_id: string, option_id: string): ConditionDef => ({ kind: "choice_made", beat_id, option_id }),
  roleAvailable: (role_id: string): ConditionDef => ({ kind: "role_available", role_id }),
  recruitmentEnabled: (): ConditionDef => ({ kind: "recruitment_enabled" }),
  recruitedAny: (): ConditionDef => ({ kind: "recruited_any" }),
  heroOutsideBubble: (): ConditionDef => ({ kind: "hero_outside_bubble" }),
  heroForcedReturn: (): ConditionDef => ({ kind: "hero_forced_return" }),
  heroRecovering: (): ConditionDef => ({ kind: "hero_recovering" }),
}

const flagSet = storyCondition.flagSet
const beatDone = storyCondition.beatDone
const NONE: ConditionDef[] = []

export const STORY_BEATS: readonly StoryBeatDef[] = [
  {
    id: "story.beat.road_to_base", schemaId: "story.beat.road_to_base", label: "Road to Base",
    body: "The last safe road is a scar through dead ground. Somewhere ahead, a weak musical hum is still holding back the static.",
    arc: "pre_arrival", sequence: 10, worldActionId: null,
    choices: [
      { id: "story.choice.road.follow_signal", label: "Follow the low signal", response: "You stay on the broken road because the distant hum feels like the only promise left.", effects: [{ kind: "add_quality", key: "resolve", amount: 1 }] },
      { id: "story.choice.road.keep_moving", label: "Keep moving through the ash", response: "You refuse to stop moving. If there is shelter ahead, momentum will find it first.", effects: [{ kind: "add_quality", key: "haste", amount: 1 }] },
    ],
    relatedIds: ["tile.base_core", "structure.base"],
    preconditions: NONE, autoCompleteWhen: NONE, priority: 0, repeatable: false,
  },
  {
    id: "story.beat.first_glimpse", schemaId: "story.beat.first_glimpse", label: "First Glimpse",
    body: "From the ridge, you finally see it: a broken complex wrapped in a thin blue halo. The Base is still standing for now.",
    arc: "pre_arrival", sequence: 20, worldActionId: null,
    choices: [
      { id: "story.choice.glimpse.watch_lights", label: "Study the lights", response: "The light pulses in time with the hum. Someone built this place to keep something worse outside." },
      { id: "story.choice.glimpse.scan_ruins", label: "Scan the ruins", response: "The outer shell is wrecked, but the center still breathes. The Base might be dying, not dead." },
    ],
    relatedIds: ["tile.ridge_line", "tile.base_core", "structure.crystal_circle"],
    preconditions: [beatDone("story.beat.road_to_base")], autoCompleteWhen: NONE, priority: 0, repeatable: false,
  },
  {
    id: "story.beat.enter_the_bubble", schemaId: "story.beat.enter_the_bubble", label: "Enter the Bubble",
    body: "Crossing the boundary changes everything. The pressure drops, the noise thins, and the Crystal's pulse becomes a direction instead of a warning.",
    arc: "pre_arrival", sequence: 30, worldActionId: null,
    choices: [
      { id: "story.choice.bubble.trust_sound", label: "Trust the sound wall", response: "The pressure eases as soon as you cross the edge. The Bubble is weak, but it is real." },
      { id: "story.choice.bubble.touch_air", label: "Test the air first", response: "Your hand trembles at the border. Inside the Bubble, the noise of the world finally steps back." },
    ],
    relatedIds: ["resource.bassline", "station.crystal_circle", "tile.base_core"],
    preconditions: [beatDone("story.beat.first_glimpse")], autoCompleteWhen: NONE, priority: 0, repeatable: false,
  },
  {
    id: "story.beat.investigate_base", schemaId: "story.beat.investigate_base", label: "Investigate Base",
    body: "The first sweep is about triage. Find what still works, what is beyond repair, and what the Base needs before it collapses completely.",
    arc: "base_onboarding", sequence: 40, worldActionId: "world_action.investigate_base",
    choices: [
      { id: "story.choice.investigate.search_power", label: "Search for surviving systems", response: "If anything still runs here, it will tell you what can be saved." },
      { id: "story.choice.investigate.trace_hum", label: "Trace the hum through the walls", response: "The sound has a source. If you can reach it, the Base might answer back." },
    ],
    relatedIds: ["world_action.investigate_base", "story.beat.explore_base", "structure.base"],
    preconditions: [beatDone("story.beat.enter_the_bubble")], autoCompleteWhen: [flagSet("base.tutorial_investigated")], priority: 0, repeatable: false,
  },
  {
    id: "story.beat.explore_base", schemaId: "story.beat.explore_base", label: "Explore Base",
    body: "Now go deeper. The first repair loop is buried somewhere inside the ruin, along with the pieces you need to wake the Base back up.",
    arc: "base_onboarding", sequence: 50, worldActionId: "world_action.explore_base",
    choices: [
      { id: "story.choice.explore.look_for_tools", label: "Look for tools and salvage", response: "You push deeper, looking for anything that can turn ruins into repairs." },
      { id: "story.choice.explore.look_for_rooms", label: "Look for livable rooms", response: "If more people are coming, they will need more than a miracle. They will need a place to stay." },
    ],
    relatedIds: ["world_action.explore_base", "project.restore_studio", "construction.removing_moss", "resource.water"],
    preconditions: [beatDone("story.beat.investigate_base")], autoCompleteWhen: [flagSet("base.tutorial_explored")], priority: 0, repeatable: false,
  },
  {
    id: "story.beat.restore_studio", schemaId: "story.beat.restore_studio", label: "Restore Studio",
    body: "The Studio is the first room worth saving. If you can bring it back, the Base can start singing again.",
    arc: "base_onboarding", sequence: 60, worldActionId: null, choices: [],
    relatedIds: ["project.restore_studio", "resource.chorus", "project.build_fire_pit"],
    preconditions: [beatDone("story.beat.explore_base")], autoCompleteWhen: [flagSet("base.studio_restored")], priority: 0, repeatable: false,
    onComplete: [{ kind: "add_quality", key: "hope", amount: 1 }],
  },
  {
    id: "story.beat.build_fire_pit", schemaId: "story.beat.build_fire_pit", label: "Build Fire Pit",
    body: "The Fire Pit is less about heat than rhythm. People gather around steady signals before they trust walls and wiring.",
    arc: "base_onboarding", sequence: 70, worldActionId: null, choices: [],
    relatedIds: ["project.build_fire_pit", "station.fire_pit", "story.beat.reach_survivor_cave", "ui.action.recruit"],
    preconditions: [flagSet("base.studio_restored")], autoCompleteWhen: [flagSet("base.fire_pit_built")], priority: 0, repeatable: false,
  },
  {
    id: "story.beat.reach_survivor_cave", schemaId: "story.beat.reach_survivor_cave", label: "Reach Survivor Cave",
    body: "If the Bubble holds long enough, its edge will brush the cave where the next survivors are hiding.",
    arc: "base_onboarding", sequence: 75, worldActionId: null, choices: [],
    relatedIds: ["tile.survivor_cave", "ui.map.cave_gate", "story.beat.first_recruit"],
    preconditions: [flagSet("base.fire_pit_built")], autoCompleteWhen: [{ kind: "recruitment_enabled" }], priority: 0, repeatable: false,
  },
  {
    id: "story.beat.first_recruit", schemaId: "story.beat.first_recruit", label: "First Survivor Recruited",
    body: "The first recruit is proof the Base is more than a shelter. It is becoming a place people can choose.",
    arc: "base_onboarding", sequence: 80, worldActionId: null, choices: [],
    relatedIds: ["ui.action.recruit", "tile.survivor_cave", "ui.status.base.recruits", "story.beat.await_survivor_arrival"],
    preconditions: [{ kind: "recruitment_enabled" }], autoCompleteWhen: [{ kind: "recruited_any" }], priority: 0, repeatable: false,
  },
  {
    id: "story.beat.await_survivor_arrival", schemaId: "story.beat.await_survivor_arrival", label: "Await Survivor Arrival",
    body: "Signal the route. Keep the Base stable. A promise only matters if someone can safely walk into it.",
    arc: "base_onboarding", sequence: 85, worldActionId: null, choices: [],
    relatedIds: ["ui.status.base.recruits", "story.beat.stabilize_base"],
    preconditions: [{ kind: "recruited_any" }], autoCompleteWhen: [{ kind: "bubble_reach_at_least", n: 4 }], priority: 0, repeatable: false,
  },
  {
    id: "story.beat.stabilize_base", schemaId: "story.beat.stabilize_base", label: "Stabilize the Base",
    body: "The Base is alive, but not safe yet. Power, morale, housing, and sound all need to hold at once now.",
    arc: "base_onboarding", sequence: 90, worldActionId: null, choices: [],
    relatedIds: ["resource.chorus", "resource.harmonics", "ui.panel.power", "ui.panel.base"],
    preconditions: [beatDone("story.beat.await_survivor_arrival")], autoCompleteWhen: NONE, priority: 0, repeatable: false,
  },
  // A reactive, OPTIONAL side-storylet: not on the spine at all. Its high priority
  // means it interrupts whatever beat is active the moment the Hero is caught
  // outside the bubble (after onboarding). Pure emergence — the engine surfaces it
  // from game state, not a scripted sequence; it resolves once the player steadies.
  {
    id: "story.beat.hero_exposed", schemaId: "story.beat.hero_exposed", label: "Exposed",
    body: "Outside the bubble the static leans in. Every second out here is borrowed — the road back is the only safe direction.",
    arc: "ambient", sequence: 1000, worldActionId: null,
    choices: [
      { id: "story.choice.exposed.steady", label: "Steady yourself and press on", response: "You fix your eyes on the field's edge and keep moving. Fear, at least, is a kind of focus.", effects: [{ kind: "add_quality", key: "resolve", amount: 1 }] },
    ],
    relatedIds: ["story.beat.explore_base"],
    preconditions: [{ kind: "hero_outside_bubble" }, beatDone("story.beat.explore_base")],
    autoCompleteWhen: NONE, priority: 100, repeatable: false,
    onActivate: [{ kind: "add_quality", key: "exposure_seen", amount: 1 }],
  },
]
