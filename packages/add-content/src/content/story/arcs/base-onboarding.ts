import type { StoryBeatDef } from "@aedventure/add-protocol"
import {
  beatDone,
  blocker,
  firstPlayableProgression,
  flagSet,
  NONE,
  STORY_ARC_BASE_ONBOARDING,
  unlock,
} from "../helpers"

export const BASE_ONBOARDING_STORY_BEATS: readonly StoryBeatDef[] = [
  {
    id: "story.beat.investigate_base",
    schemaId: "story.beat.investigate_base",
    label: "Investigate Base",
    body: "The first sweep is about triage. Find what still works, what is beyond repair, and what the Base needs before it collapses completely.",
    arc: STORY_ARC_BASE_ONBOARDING,
    sequence: 40,
    worldActionId: "world_action.investigate_base",
    choices: [
      {
        id: "story.choice.investigate.search_power",
        label: "Search for surviving systems",
        response: "If anything still runs here, it will tell you what can be saved.",
      },
      {
        id: "story.choice.investigate.trace_hum",
        label: "Trace the hum through the walls",
        response: "The sound has a source. If you can reach it, the Base might answer back.",
      },
    ],
    relatedIds: ["world_action.investigate_base", "story.beat.explore_base", "structure.base"],
    progression: firstPlayableProgression({
      stepId: "investigate-base",
      shortLabel: "Investigate Base",
      playerHint: "Choose an approach, then send the Hero through the first Base sweep.",
      ctaCopy: "Start investigation",
      primaryRiskCopy: "The Hero must be free before Base actions can start.",
      displayPriority: 990,
      primaryAction: { kind: "world_action", actionId: "world_action.investigate_base" },
      blockers: [
        blocker("busy", "The Hero must be assigned and available for the first sweep.", [
          "world_action.investigate_base",
          "role.crystal_bassline",
        ]),
      ],
      unlocks: [
        unlock("story", "Investigating unlocks the deeper Base exploration beat.", [
          "story.beat.explore_base",
        ]),
      ],
    }),
    preconditions: [beatDone("story.beat.enter_the_bubble")],
    autoCompleteWhen: [flagSet("base.tutorial_investigated")],
    priority: 0,
    repeatable: false,
    blocksUnrelatedWorldActions: true,
  },
  {
    id: "story.beat.explore_base",
    schemaId: "story.beat.explore_base",
    label: "Explore Base",
    body: "Now go deeper. The first repair loop is buried somewhere inside the ruin, along with the pieces you need to wake the Base back up.",
    arc: STORY_ARC_BASE_ONBOARDING,
    sequence: 50,
    worldActionId: "world_action.explore_base",
    choices: [
      {
        id: "story.choice.explore.look_for_tools",
        label: "Look for tools and salvage",
        response: "You push deeper, looking for anything that can turn ruins into repairs.",
      },
      {
        id: "story.choice.explore.look_for_rooms",
        // Making rooms habitable is work done for people who are not here yet.
        effects: [{ kind: "emit_act", act_id: "act.keep_the_watch", target: "entity.sleepless" }],
        label: "Look for livable rooms",
        response: "If more people are coming, they will need more than a miracle. They will need a place to stay.",
      },
    ],
    relatedIds: [
      "world_action.explore_base",
      "project.restore_studio",
      "construction.removing_moss",
      "resource.water",
    ],
    progression: firstPlayableProgression({
      stepId: "explore-base",
      shortLabel: "Explore Base",
      playerHint: "Push deeper to unlock the first repair projects and utility loops.",
      ctaCopy: "Explore the ruin",
      primaryRiskCopy: "Exploration is a Hero-only online action and briefly leaves the safe core.",
      displayPriority: 980,
      primaryAction: { kind: "world_action", actionId: "world_action.explore_base" },
      blockers: [
        blocker("busy", "The Hero must be free to explore the ruin.", [
          "world_action.explore_base",
        ]),
      ],
      unlocks: [
        unlock("construction", "Exploring unlocks Studio restoration and water collection.", [
          "project.restore_studio",
          "resource.water",
        ]),
      ],
    }),
    preconditions: [beatDone("story.beat.investigate_base")],
    autoCompleteWhen: [flagSet("base.tutorial_explored")],
    priority: 0,
    repeatable: false,
    blocksUnrelatedWorldActions: true,
  },
  {
    id: "story.beat.restore_studio",
    schemaId: "story.beat.restore_studio",
    label: "Restore Studio",
    body: "The Studio is the first room worth saving. If you can bring it back, the Base can start singing again.",
    arc: STORY_ARC_BASE_ONBOARDING,
    sequence: 60,
    worldActionId: null,
    choices: [],
    relatedIds: ["project.restore_studio", "resource.chorus", "project.build_fire_pit"],
    progression: firstPlayableProgression({
      stepId: "restore-studio",
      shortLabel: "Restore Studio",
      playerHint: "Gather enough Stone, start the Studio project, then staff construction until it finishes.",
      ctaCopy: "Restore Studio",
      primaryRiskCopy: "Stone and builder availability are the first hard construction bottlenecks.",
      displayPriority: 970,
      primaryAction: {
        kind: "construction",
        optionId: "project.restore_studio",
        gatherRoleId: "role.scavenge",
        buildRoleId: "role.construction",
        crew: 2,
        waitSeconds: 8,
      },
      blockers: [
        blocker("missing_resource", "Stone is required before the Studio can be repaired.", [
          "project.restore_studio",
          "resource.stone",
        ]),
        blocker("missing_staff", "Construction Crew must work the active repair.", [
          "role.construction",
        ]),
      ],
      unlocks: [
        unlock("power", "Restoring the Studio opens Chorus, bunks, and Fire Pit construction.", [
          "resource.chorus",
          "project.build_fire_pit",
        ]),
      ],
    }),
    preconditions: [beatDone("story.beat.explore_base")],
    autoCompleteWhen: [flagSet("base.studio_restored")],
    priority: 0,
    repeatable: false,
    onComplete: [
      { kind: "add_quality", key: "hope", amount: 1 },
      // Building the pit is taking the worst of the work so others can rest —
      // the faction feels it, not any one survivor yet.
      { kind: "emit_act", act_id: "act.keep_the_watch", target: "entity.sleepless" },
    ],
  },
  {
    id: "story.beat.build_fire_pit",
    schemaId: "story.beat.build_fire_pit",
    label: "Build Fire Pit",
    body: "The Fire Pit is less about heat than rhythm. People gather around steady signals before they trust walls and wiring.",
    arc: STORY_ARC_BASE_ONBOARDING,
    sequence: 70,
    worldActionId: null,
    choices: [],
    relatedIds: [
      "project.build_fire_pit",
      "station.fire_pit",
      "story.beat.reach_survivor_cave",
      "ui.action.recruit",
    ],
    progression: firstPlayableProgression({
      stepId: "build-fire-pit",
      shortLabel: "Build Fire Pit",
      playerHint: "Build the Fire Pit so the Base can generate Vibes and support recruitment.",
      ctaCopy: "Build Fire Pit",
      primaryRiskCopy: "Without Vibes, recruitment stays out of reach.",
      displayPriority: 960,
      primaryAction: {
        kind: "construction",
        optionId: "project.build_fire_pit",
        gatherRoleId: "role.scavenge",
        buildRoleId: "role.construction",
        crew: 2,
        waitSeconds: 8,
      },
      blockers: [
        blocker("missing_resource", "Fire Pit construction needs a smaller Stone reserve.", [
          "project.build_fire_pit",
          "resource.stone",
        ]),
      ],
      unlocks: [
        unlock("station", "The Fire Pit unlocks Vibes and the first recruitment loop.", [
          "station.fire_pit",
          "ui.action.recruit",
        ]),
      ],
    }),
    preconditions: [flagSet("base.studio_restored")],
    autoCompleteWhen: [flagSet("base.fire_pit_built")],
    priority: 0,
    repeatable: false,
  },
  {
    id: "story.beat.reach_survivor_cave",
    schemaId: "story.beat.reach_survivor_cave",
    label: "Reach Survivor Cave",
    body: "If the Bubble holds long enough, its edge will brush the cave where the next survivors are hiding.",
    arc: STORY_ARC_BASE_ONBOARDING,
    sequence: 75,
    worldActionId: null,
    choices: [],
    relatedIds: ["tile.survivor_cave", "ui.map.cave_gate", "story.beat.first_recruit"],
    progression: firstPlayableProgression({
      stepId: "bubble-reach",
      shortLabel: "Reach Survivor Cave",
      playerHint: "Keep Bassline staffed and let the Bubble reach the Survivor Cave.",
      ctaCopy: "Hold the field",
      primaryRiskCopy: "Pulling too much crew away from Bassline slows the Bubble.",
      displayPriority: 950,
      primaryAction: { kind: "tick", seconds: 120 },
      blockers: [
        blocker("reach_locked", "The cave must be inside Bubble reach before recruitment opens.", [
          "tile.survivor_cave",
          "resource.bassline",
        ]),
      ],
      unlocks: [
        unlock("reach", "Reaching the cave unlocks the first recruit action.", [
          "story.beat.first_recruit",
          "ui.action.recruit",
        ]),
      ],
    }),
    preconditions: [flagSet("base.fire_pit_built")],
    autoCompleteWhen: [{ kind: "recruitment_enabled" }],
    priority: 0,
    repeatable: false,
  },
  {
    id: "story.beat.first_recruit",
    schemaId: "story.beat.first_recruit",
    label: "First Survivor Recruited",
    body: "The first recruit is proof the Base is more than a shelter. It is becoming a place people can choose.",
    arc: STORY_ARC_BASE_ONBOARDING,
    sequence: 80,
    worldActionId: null,
    choices: [],
    relatedIds: [
      "ui.action.recruit",
      "tile.survivor_cave",
      "ui.status.base.recruits",
      "story.beat.await_survivor_arrival",
    ],
    progression: firstPlayableProgression({
      stepId: "recruit-once",
      shortLabel: "Recruit Once",
      playerHint: "Generate enough Vibes, then recruit once from the Survivor Cave.",
      ctaCopy: "Recruit survivor",
      primaryRiskCopy: "Recruiting grows the Base but adds pressure to housing and morale.",
      displayPriority: 940,
      primaryAction: {
        kind: "recruit_from_survivor_cave",
        vibesRoleId: "role.fire_pit",
        waitSeconds: 120,
      },
      blockers: [
        blocker("missing_resource", "Vibes pay the first recruitment cost.", [
          "resource.vibes",
          "station.fire_pit",
        ]),
      ],
      unlocks: [
        unlock("story", "The first recruit transitions the opening arc into stabilization.", [
          "story.beat.await_survivor_arrival",
        ]),
      ],
    }),
    // Someone chose to walk in: the Hero led and was followed, which is what
    // `take_the_lead` records. Emitted on completion rather than from a choice
    // because the beat has none — the recruitment itself is the act.
    onComplete: [{ kind: "emit_act", act_id: "act.take_the_lead", target: "entity.sleepless" }],
    preconditions: [{ kind: "recruitment_enabled" }],
    autoCompleteWhen: [{ kind: "recruited_any" }],
    priority: 0,
    repeatable: false,
  },
  {
    id: "story.beat.await_survivor_arrival",
    schemaId: "story.beat.await_survivor_arrival",
    label: "Await Survivor Arrival",
    body: "Signal the route. Keep the Base stable. A promise only matters if someone can safely walk into it.",
    // The beat's own text names the act: they walked in, so the promise held.
    onComplete: [{ kind: "emit_act", act_id: "act.keep_a_promise", target: "entity.sleepless" }],
    arc: STORY_ARC_BASE_ONBOARDING,
    sequence: 85,
    worldActionId: null,
    choices: [],
    relatedIds: ["ui.status.base.recruits", "story.beat.stabilize_base"],
    progression: firstPlayableProgression({
      stepId: "await-survivor-arrival",
      shortLabel: "Await Arrival",
      playerHint: "Keep the field stable while the first recruit commits to the route.",
      ctaCopy: "Keep the Base steady",
      primaryRiskCopy: "The Base still needs enough reach to prove the route is safe.",
      displayPriority: 930,
      primaryAction: { kind: "tick", seconds: 120 },
      blockers: [
        blocker("reach_locked", "The Bubble must keep expanding after recruitment starts.", [
          "resource.bassline",
          "ui.status.base.recruits",
        ]),
      ],
      unlocks: [
        unlock("story", "Arrival hands off into broader Base stabilization.", [
          "story.beat.stabilize_base",
        ]),
      ],
    }),
    preconditions: [{ kind: "recruited_any" }],
    autoCompleteWhen: [{ kind: "bubble_reach_at_least", n: 3 }],
    priority: 0,
    repeatable: false,
  },
  {
    id: "story.beat.stabilize_base",
    schemaId: "story.beat.stabilize_base",
    label: "Stabilize the Base",
    body: "The Base is alive, but not safe yet. Power, morale, housing, and sound all need to hold at once now.",
    arc: STORY_ARC_BASE_ONBOARDING,
    sequence: 90,
    worldActionId: null,
    choices: [],
    relatedIds: ["resource.chorus", "resource.harmonics", "ui.panel.power", "ui.panel.base"],
    progression: firstPlayableProgression({
      stepId: "stabilize-base",
      shortLabel: "Stabilize Base",
      playerHint: "The first arc is complete once the Base can hand off into power, staffing, and processing.",
      ctaCopy: null,
      primaryRiskCopy: "This is the handoff from tutorial growth into the wider idle game.",
      displayPriority: 920,
      primaryAction: { kind: "none" },
      unlocks: [
        unlock("story", "Stabilization opens independent Base, Discovery, and Dungeon growth.", [
          "ui.panel.power",
          "ui.panel.base",
        ]),
      ],
    }),
    preconditions: [beatDone("story.beat.await_survivor_arrival")],
    autoCompleteWhen: NONE,
    priority: 0,
    repeatable: false,
  },
]
