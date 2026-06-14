import type { StoryBeatDef } from "../../../runtime/protocol"
import { allOf, beatDone, NONE, STORY_ARC_AMBIENT, storyCondition } from "../helpers"

export const AMBIENT_STORY_BEATS: readonly StoryBeatDef[] = [
  // Reactive side-storylet: not on the first-playable spine. Its high priority
  // lets the Rust salience selector surface it when the Hero is caught outside
  // the bubble after onboarding has started.
  {
    id: "story.beat.hero_exposed",
    schemaId: "story.beat.hero_exposed",
    label: "Exposed",
    body: "Outside the bubble the static leans in. Every second out here is borrowed — the road back is the only safe direction.",
    arc: STORY_ARC_AMBIENT,
    sequence: 1000,
    worldActionId: null,
    choices: [
      {
        id: "story.choice.exposed.steady",
        label: "Steady yourself and press on",
        response: "You fix your eyes on the field's edge and keep moving. Fear, at least, is a kind of focus.",
        effects: [{ kind: "add_quality", key: "resolve", amount: 1 }],
      },
    ],
    relatedIds: ["story.beat.explore_base"],
    preconditions: [
      allOf([storyCondition.heroOutsideBubble(), beatDone("story.beat.explore_base")]),
    ],
    autoCompleteWhen: NONE,
    priority: 100,
    repeatable: false,
    onActivate: [{ kind: "add_quality", key: "exposure_seen", amount: 1 }],
  },
]
