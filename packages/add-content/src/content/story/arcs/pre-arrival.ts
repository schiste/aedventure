import type { StoryBeatDef } from "@aedventure/add-protocol"
import {
  beatDone,
  firstPlayableProgression,
  NONE,
  STORY_ARC_PRE_ARRIVAL,
  unlock,
  blocker,
} from "../helpers"

export const PRE_ARRIVAL_STORY_BEATS: readonly StoryBeatDef[] = [
  {
    id: "story.beat.road_to_base",
    schemaId: "story.beat.road_to_base",
    label: "Road to Base",
    body: "The last safe road is a scar through dead ground. Somewhere ahead, a weak musical hum is still holding back the static.",
    arc: STORY_ARC_PRE_ARRIVAL,
    sequence: 10,
    worldActionId: null,
    choices: [
      {
        id: "story.choice.road.follow_signal",
        label: "Follow the low signal",
        response: "You stay on the broken road because the distant hum feels like the only promise left.",
        effects: [{ kind: "add_quality", key: "resolve", amount: 1 }],
      },
      {
        id: "story.choice.road.keep_moving",
        label: "Keep moving through the ash",
        response: "You refuse to stop moving. If there is shelter ahead, momentum will find it first.",
        effects: [{ kind: "add_quality", key: "haste", amount: 1 }],
      },
    ],
    relatedIds: ["tile.base_core", "structure.base"],
    progression: firstPlayableProgression({
      stepId: "reach-base",
      shortLabel: "Reach the Studio",
      playerHint: "Travel from the Survivor Cave to the Studio before the Base loop can open.",
      ctaCopy: "Preview route to Studio",
      primaryRiskCopy: "Each region crossing takes one in-game hour outside safety.",
      displayPriority: 1000,
      primaryAction: { kind: "preview_route_to_base" },
      blockers: [
        blocker("reach_locked", "The Base is not usable until the Hero reaches the Studio.", [
          "tile.base_core",
          "tile.survivor_cave",
        ]),
      ],
      unlocks: [
        unlock("story", "Reaching the Studio starts the Base onboarding arc.", [
          "story.beat.investigate_base",
          "ui.panel.base",
        ]),
      ],
    }),
    preconditions: NONE,
    autoCompleteWhen: NONE,
    priority: 0,
    repeatable: false,
    blocksUnrelatedWorldActions: true,
  },
  {
    id: "story.beat.first_glimpse",
    schemaId: "story.beat.first_glimpse",
    label: "First Glimpse",
    body: "From the ridge, you finally see it: a broken complex wrapped in a thin blue halo. The Base is still standing for now.",
    arc: STORY_ARC_PRE_ARRIVAL,
    sequence: 20,
    worldActionId: null,
    choices: [
      {
        id: "story.choice.glimpse.watch_lights",
        label: "Study the lights",
        response: "The light pulses in time with the hum. Someone built this place to keep something worse outside.",
      },
      {
        id: "story.choice.glimpse.scan_ruins",
        label: "Scan the ruins",
        response: "The outer shell is wrecked, but the center still breathes. The Base might be dying, not dead.",
      },
    ],
    relatedIds: ["tile.ridge_line", "tile.base_core", "structure.crystal_circle"],
    progression: firstPlayableProgression({
      stepId: "first-glimpse",
      shortLabel: "First Glimpse",
      playerHint: "Read the Base from the ridge and choose what the Hero notices first.",
      ctaCopy: "Study the Base",
      primaryRiskCopy: "The Studio is close, but the outside air is still unsafe.",
      displayPriority: 998,
      primaryAction: { kind: "story_choice" },
      unlocks: [
        unlock("story", "The first glimpse leads to crossing into the Bubble.", [
          "story.beat.enter_the_bubble",
        ]),
      ],
    }),
    preconditions: [beatDone("story.beat.road_to_base")],
    autoCompleteWhen: NONE,
    priority: 0,
    repeatable: false,
    blocksUnrelatedWorldActions: true,
  },
  {
    id: "story.beat.enter_the_bubble",
    schemaId: "story.beat.enter_the_bubble",
    label: "Enter the Bubble",
    body: "Crossing the boundary changes everything. The pressure drops, the noise thins, and the Crystal's pulse becomes a direction instead of a warning.",
    arc: STORY_ARC_PRE_ARRIVAL,
    sequence: 30,
    worldActionId: null,
    choices: [
      {
        id: "story.choice.bubble.trust_sound",
        label: "Trust the sound wall",
        response: "The pressure eases as soon as you cross the edge. The Bubble is weak, but it is real.",
      },
      {
        id: "story.choice.bubble.touch_air",
        label: "Test the air first",
        response: "Your hand trembles at the border. Inside the Bubble, the noise of the world finally steps back.",
      },
    ],
    relatedIds: ["resource.bassline", "station.crystal_circle", "tile.base_core"],
    progression: firstPlayableProgression({
      stepId: "enter-bubble",
      shortLabel: "Enter the Bubble",
      playerHint: "Cross the boundary and decide how the Hero understands the sound wall.",
      ctaCopy: "Enter the Bubble",
      primaryRiskCopy: "Inside the Bubble the pressure drops, but the Base is still fragile.",
      displayPriority: 996,
      primaryAction: { kind: "story_choice" },
      unlocks: [
        unlock("story", "Entering the Bubble starts Base investigation.", [
          "story.beat.investigate_base",
        ]),
      ],
    }),
    preconditions: [beatDone("story.beat.first_glimpse")],
    autoCompleteWhen: NONE,
    priority: 0,
    repeatable: false,
    blocksUnrelatedWorldActions: true,
  },
]
