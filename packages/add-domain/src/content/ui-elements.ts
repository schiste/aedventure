import type { UiElementDef } from "@aedventure/add-protocol"

// Bootstrapped from the catalog snapshot, then owned here as the source of truth.
// `content:build` codegens the Rust catalog from this module.
export const UI_ELEMENTS: readonly UiElementDef[] = [
  {
    "id": "ui.panel.objectives",
    "label": "Objectives",
    "relatedIds": [
      "story.beat.investigate_base",
      "story.beat.explore_base",
      "story.beat.restore_studio",
      "story.beat.build_fire_pit",
      "story.beat.reach_survivor_cave",
      "story.beat.first_recruit",
      "story.beat.await_survivor_arrival",
      "story.beat.stabilize_base"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Objectives",
      "playerHint": "Objectives translate the current story and system state into a playable next move.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 900,
      "reveal": "default"
    }
  },
  {
    "id": "ui.objective.status",
    "label": "Current Objective",
    "relatedIds": [
      "story.beat.investigate_base",
      "story.beat.explore_base",
      "story.beat.restore_studio",
      "story.beat.build_fire_pit",
      "story.beat.first_recruit"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Current Objective",
      "playerHint": "Shows where the first-session arc currently stands.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 899,
      "reveal": "default"
    }
  },
  {
    "id": "ui.objective.active_goal",
    "label": "Active Goal",
    "relatedIds": [
      "story.beat.investigate_base",
      "story.beat.explore_base",
      "story.beat.restore_studio",
      "story.beat.build_fire_pit",
      "story.beat.first_recruit"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Active Goal",
      "playerHint": "The highest-priority thing the player should complete next.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 898,
      "reveal": "default"
    }
  },
  {
    "id": "ui.objective.next",
    "label": "After That",
    "relatedIds": [
      "story.beat.explore_base",
      "story.beat.restore_studio",
      "story.beat.build_fire_pit",
      "story.beat.first_recruit"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "After That",
      "playerHint": "Shows the next meaningful progression step after the active goal.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 897,
      "reveal": "default"
    }
  },
  {
    "id": "ui.objective.blocker",
    "label": "Blocking This",
    "relatedIds": [
      "resource.stone",
      "resource.vibes",
      "resource.bassline",
      "resource.chorus",
      "tile.survivor_cave"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Blocking This",
      "playerHint": "Surfaces the main current gate in the first playable loop.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 896,
      "reveal": "default"
    }
  },
  {
    "id": "ui.objective.unlock",
    "label": "This Unlocks",
    "relatedIds": [
      "resource.chorus",
      "resource.water",
      "station.fire_pit",
      "ui.action.recruit"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "This Unlocks",
      "playerHint": "Shows the next system or story layer the player will gain.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 895,
      "reveal": "default"
    }
  },
  {
    "id": "ui.objective.next_move",
    "label": "Do This Next",
    "relatedIds": [
      "role.scavenge",
      "role.crystal_bassline",
      "project.restore_studio",
      "project.build_fire_pit"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Do This Next",
      "playerHint": "A condensed recommendation derived from the current progression state.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 894,
      "reveal": "default"
    }
  },
  {
    "id": "ui.objective.watch_out",
    "label": "Watch Out",
    "relatedIds": [
      "resource.bassline",
      "resource.chorus",
      "resource.vibes",
      "ui.status.base.housing"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Watch Out",
      "playerHint": "Highlights the most important current risk in the first session.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 893,
      "reveal": "default"
    }
  },
  {
    "id": "ui.panel.construction",
    "label": "Build and Repair",
    "relatedIds": [
      "role.construction",
      "construction.output",
      "project.restore_studio",
      "project.build_fire_pit"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restore_unlocked"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Construction",
      "playerHint": "Construction turns staffing and resources into permanent base progress.",
      "ctaCopy": null,
      "primaryRiskCopy": "No builders means all progress stalls immediately.",
      "displayPriority": 892,
      "reveal": "default"
    }
  },
  {
    "id": "ui.panel.crystal",
    "label": "Crystal Circle",
    "relatedIds": [
      "station.crystal_circle",
      "resource.bassline",
      "resource.chorus",
      "resource.harmonics",
      "crystal.removing_moss_unlocked"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "crystal.removing_moss_unlocked"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Crystal Circle",
      "playerHint": "The Crystal is only surfaced once the overgrowth is cleared enough to uncover it.",
      "ctaCopy": null,
      "primaryRiskCopy": "Before the Crystal is uncovered, its full control surface stays hidden.",
      "displayPriority": 891,
      "reveal": "default"
    }
  },
  {
    "id": "ui.panel.hero",
    "label": "Hero",
    "relatedIds": [
      "role.crystal_bassline",
      "role.crystal_chorus",
      "role.crystal_harmonics",
      "world_action.investigate_base",
      "world_action.explore_base"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Hero",
      "playerHint": "The Hero can idle, staff a band, or leave to perform world actions.",
      "ctaCopy": null,
      "primaryRiskCopy": "World actions temporarily pull the Hero away from band support.",
      "displayPriority": 895,
      "reveal": "default"
    }
  },
  {
    "id": "ui.panel.map",
    "label": "Map",
    "relatedIds": [
      "ui.map.cave_gate",
      "tile.survivor_cave",
      "resource.bassline"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Map",
      "playerHint": "The map shows current bubble reach and nearby progression landmarks.",
      "ctaCopy": null,
      "primaryRiskCopy": "If Bassline falls too low, the bubble can contract and lose reach.",
      "displayPriority": 894,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.crystal.free_slots",
    "label": "Free Slots",
    "relatedIds": [
      "station.crystal_circle",
      "role.crystal_bassline",
      "role.crystal_chorus",
      "role.crystal_harmonics"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Free Slots",
      "playerHint": "Crystal slots are shared across Bassline, Chorus, and Harmonics staffing.",
      "ctaCopy": null,
      "primaryRiskCopy": "No free slots means the Crystal cannot scale without upgrades.",
      "displayPriority": 891,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.crystal.output_level",
    "label": "Output",
    "relatedIds": [
      "construction.output",
      "station.crystal_circle"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Output",
      "playerHint": "Crystal output level increases all three band tracks.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 890,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.crystal.field_polish",
    "label": "Field Polish",
    "relatedIds": [
      "construction.polish_field",
      "resource.bassline"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.tutorial_explored"
        },
        {
          "kind": "flag_set",
          "flag_id": "crystal.removing_moss_completed"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Field Polish",
      "playerHint": "Field Polish improves how efficiently Bassline becomes bubble coverage.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 889,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.crystal.bubble_budget",
    "label": "Bubble Budget",
    "relatedIds": [
      "resource.bassline",
      "ui.map.cave_gate"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Bubble Budget",
      "playerHint": "Shows how much active bubble coverage the current Bassline pool is sustaining.",
      "ctaCopy": null,
      "primaryRiskCopy": "Spending too deeply into Bassline can force the bubble to contract.",
      "displayPriority": 888,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.crystal.source",
    "label": "Source",
    "relatedIds": [
      "resource.bassline",
      "role.crystal_bassline"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Source",
      "playerHint": "Shows the primary current source for Bassline.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 887,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.crystal.sink",
    "label": "Sink",
    "relatedIds": [
      "resource.bassline",
      "construction.output",
      "construction.storage",
      "construction.slot_capacity",
      "construction.polish_field"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Sink",
      "playerHint": "Shows the primary current demand on stored Bassline.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 886,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.crystal.risk",
    "label": "Risk",
    "relatedIds": [
      "resource.bassline",
      "ui.map.cave_gate"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Risk",
      "playerHint": "Summarizes the current bubble risk created by Bassline pressure.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 885,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.chorus.rate",
    "label": "Rate",
    "relatedIds": [
      "resource.chorus",
      "role.crystal_chorus"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Rate",
      "playerHint": "Current Chorus generation per second.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 884,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.chorus.station_upkeep",
    "label": "Stations",
    "relatedIds": [
      "resource.chorus",
      "station.resonance_chamber",
      "station.mix_console",
      "station.workshop",
      "station.research_booth"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Stations",
      "playerHint": "Powered stations consume Chorus while active.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 883,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.chorus.source",
    "label": "Source",
    "relatedIds": [
      "resource.chorus",
      "role.crystal_chorus"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Source",
      "playerHint": "Shows the primary current source for Chorus.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 882,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.chorus.sink",
    "label": "Sink",
    "relatedIds": [
      "resource.chorus",
      "role.construction",
      "role.fire_pit",
      "role.scavenge",
      "role.water",
      "station.resonance_chamber",
      "station.mix_console",
      "station.workshop",
      "station.research_booth"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Sink",
      "playerHint": "Shows the primary current power-side Chorus demand.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 881,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.chorus.risk",
    "label": "Risk",
    "relatedIds": [
      "resource.chorus",
      "ui.metric.power.brownout"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Risk",
      "playerHint": "Summarizes current brownout risk driven by Chorus pressure.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 880,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.harmonics.tier",
    "label": "Tier",
    "relatedIds": [
      "resource.harmonics",
      "station.resonance_chamber"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.resonance_chamber_built"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Tier",
      "playerHint": "Harmonics tier reflects how far efficiency and resilience have progressed.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 879,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.harmonics.efficiency",
    "label": "Boost",
    "relatedIds": [
      "resource.harmonics",
      "station.resonance_chamber",
      "station.mix_console"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.resonance_chamber_built"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Boost",
      "playerHint": "Harmonics efficiency boosts the rest of the base economy.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 878,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.harmonics.source",
    "label": "Source",
    "relatedIds": [
      "resource.harmonics",
      "role.crystal_harmonics"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.resonance_chamber_built"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Source",
      "playerHint": "Shows the primary current source for Harmonics.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 877,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.harmonics.sink",
    "label": "Sink",
    "relatedIds": [
      "resource.harmonics",
      "station.resonance_chamber",
      "station.mix_console"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.resonance_chamber_built"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Sink",
      "playerHint": "Shows where Harmonics-side progress is currently being invested.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 876,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.harmonics.risk",
    "label": "Risk",
    "relatedIds": [
      "resource.harmonics",
      "station.resonance_chamber",
      "station.mix_console"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.resonance_chamber_built"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Risk",
      "playerHint": "Summarizes the current risk of leaving Harmonics understaffed.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 875,
      "reveal": "default"
    }
  },
  {
    "id": "ui.panel.power",
    "label": "Power and Processing",
    "relatedIds": [
      "resource.chorus",
      "resource.harmonics",
      "station.resonance_chamber",
      "station.mix_console"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Power",
      "playerHint": "Chorus powers the base. Harmonics improves throughput and resilience.",
      "ctaCopy": null,
      "primaryRiskCopy": "Brownouts will shut down the last requested powered station first.",
      "displayPriority": 760,
      "reveal": "default"
    }
  },
  {
    "id": "ui.control.hero.task",
    "label": "Task",
    "relatedIds": [
      "role.crystal_bassline",
      "role.crystal_chorus",
      "role.crystal_harmonics",
      "world_action.investigate_base",
      "world_action.explore_base"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Task",
      "playerHint": "Shows what the Hero is currently assigned to do.",
      "ctaCopy": "Choose Hero Task",
      "primaryRiskCopy": null,
      "displayPriority": 868,
      "reveal": "default"
    }
  },
  {
    "id": "ui.status.hero",
    "label": "Status",
    "relatedIds": [
      "world_action.investigate_base",
      "world_action.explore_base"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Status",
      "playerHint": "Shows whether the Hero is idle, active, or tied up on a world action.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 867,
      "reveal": "default"
    }
  },
  {
    "id": "ui.control.construction.crew",
    "label": "Construction Crew",
    "relatedIds": [
      "role.construction",
      "project.restore_studio",
      "project.build_fire_pit"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Construction Crew",
      "playerHint": "Builders determine how quickly active construction can progress.",
      "ctaCopy": "Assign Builders",
      "primaryRiskCopy": "No builders means every construction project stalls.",
      "displayPriority": 866,
      "reveal": "default"
    }
  },
  {
    "id": "ui.summary.construction.source",
    "label": "Source",
    "relatedIds": [
      "role.construction",
      "resource.stone",
      "resource.bassline"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Source",
      "playerHint": "Shows the main current input feeding construction progress.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 874,
      "reveal": "default"
    }
  },
  {
    "id": "ui.summary.construction.sink",
    "label": "Sink",
    "relatedIds": [
      "construction.output",
      "project.restore_studio",
      "project.build_fire_pit"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Sink",
      "playerHint": "Shows the active current construction demand.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 873,
      "reveal": "default"
    }
  },
  {
    "id": "ui.summary.construction.blocker",
    "label": "Blocker",
    "relatedIds": [
      "role.construction",
      "resource.stone",
      "resource.bassline"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Blocker",
      "playerHint": "Shows the main thing currently stopping construction from moving.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 872,
      "reveal": "default"
    }
  },
  {
    "id": "ui.summary.power.source",
    "label": "Source",
    "relatedIds": [
      "resource.chorus",
      "resource.harmonics",
      "role.crystal_chorus",
      "role.crystal_harmonics"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Source",
      "playerHint": "Shows the main current input to the power layer.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 871,
      "reveal": "default"
    }
  },
  {
    "id": "ui.summary.power.sink",
    "label": "Sink",
    "relatedIds": [
      "resource.chorus",
      "station.resonance_chamber",
      "station.mix_console",
      "station.workshop",
      "station.research_booth"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Sink",
      "playerHint": "Shows the main current Chorus demand in the power network.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 870,
      "reveal": "default"
    }
  },
  {
    "id": "ui.summary.power.blocker",
    "label": "Blocker",
    "relatedIds": [
      "ui.metric.power.brownout",
      "resource.chorus"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Blocker",
      "playerHint": "Shows the main current blocker in the power and processing layer.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 869,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.power.active_upkeep",
    "label": "Chorus Upkeep",
    "relatedIds": [
      "resource.chorus",
      "station.resonance_chamber",
      "station.mix_console",
      "station.workshop",
      "station.research_booth"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Chorus Upkeep",
      "playerHint": "Shows the current Chorus upkeep from active powered stations.",
      "ctaCopy": null,
      "primaryRiskCopy": "High upkeep relative to Chorus income increases brownout pressure.",
      "displayPriority": 721,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.power.active_staff",
    "label": "Active Staff",
    "relatedIds": [
      "role.construction",
      "role.fire_pit",
      "role.scavenge",
      "role.water",
      "resource.chorus"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Active Staff",
      "playerHint": "Shows how many staffed roles are currently contributing to life support demand.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 720,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.power.life_support",
    "label": "Life Support",
    "relatedIds": [
      "resource.chorus"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Life Support",
      "playerHint": "Active staff increase Chorus upkeep through life support.",
      "ctaCopy": null,
      "primaryRiskCopy": "If Chorus runs thin, life support contributes to brownout pressure.",
      "displayPriority": 720,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.power.brownout",
    "label": "Brownout",
    "relatedIds": [
      "resource.chorus",
      "station.resonance_chamber",
      "station.mix_console"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "brownout_active"
        },
        {
          "kind": "flag_set",
          "flag_id": "base.resonance_chamber_built"
        },
        {
          "kind": "flag_set",
          "flag_id": "base.mix_console_built"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Brownout",
      "playerHint": "Brownouts appear when Chorus cannot sustain all requested power and life support.",
      "ctaCopy": null,
      "primaryRiskCopy": "Increase Chorus or reduce powered demand to stabilize the base.",
      "displayPriority": 730,
      "reveal": "default"
    }
  },
  {
    "id": "ui.panel.base",
    "label": "Base",
    "relatedIds": [
      "resource.stone",
      "resource.water",
      "resource.vibes",
      "project.restore_studio",
      "project.build_fire_pit"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.tutorial_investigated"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Base",
      "playerHint": "The Base panel gathers supplies, housing, recruitment, and social pressure.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 868,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.base.stone_stock",
    "label": "Stone Stock",
    "relatedIds": [
      "resource.stone",
      "role.scavenge"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.tutorial_explored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Stone Stock",
      "playerHint": "Shows how much scavengable stone remains around the base.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 867,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.base.water_stock",
    "label": "Water Stock",
    "relatedIds": [
      "resource.water",
      "role.water"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.water_collection_unlocked"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Water Stock",
      "playerHint": "Shows how much collectable water remains in the local source.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 866,
      "reveal": "default"
    }
  },
  {
    "id": "ui.summary.base.source",
    "label": "Source",
    "relatedIds": [
      "role.scavenge",
      "role.water",
      "role.fire_pit",
      "resource.stone",
      "resource.water",
      "resource.vibes"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Source",
      "playerHint": "Shows the main current source feeding the Base layer.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 865,
      "reveal": "default"
    }
  },
  {
    "id": "ui.summary.base.sink",
    "label": "Sink",
    "relatedIds": [
      "project.restore_studio",
      "project.build_fire_pit",
      "ui.action.recruit"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Sink",
      "playerHint": "Shows the main current demand on Base-side materials and Vibes.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 864,
      "reveal": "default"
    }
  },
  {
    "id": "ui.summary.base.blocker",
    "label": "Blocker",
    "relatedIds": [
      "resource.stone",
      "resource.water",
      "resource.vibes",
      "ui.status.base.housing"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Blocker",
      "playerHint": "Shows the main current blocker in the Base layer.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 863,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.base.recruit_cost",
    "label": "Recruit Cost",
    "relatedIds": [
      "resource.vibes"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "recruitment_enabled"
        },
        {
          "kind": "pending_recruits"
        },
        {
          "kind": "recruited_any"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Recruit Cost",
      "playerHint": "Vibes pay for new survivors once the cave route is open.",
      "ctaCopy": "Recruit Survivor",
      "primaryRiskCopy": "If Vibes stall, crew growth stalls with them.",
      "displayPriority": 700,
      "reveal": "default"
    }
  },
  {
    "id": "ui.panel.run",
    "label": "Run",
    "relatedIds": [
      "resource.bassline",
      "resource.chorus",
      "resource.harmonics",
      "resource.stone",
      "resource.water",
      "resource.vibes"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Run",
      "playerHint": "Run controls handle save/load and offline return visibility for the current play session.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 862,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.base.bunks",
    "label": "Bunks",
    "relatedIds": [
      "project.restore_studio"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Bunks",
      "playerHint": "The Studio provides bunks. Housing limits how fast the crew can grow safely.",
      "ctaCopy": null,
      "primaryRiskCopy": "If bunks run short, Bad Vibes will start building up.",
      "displayPriority": 690,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.base.housing",
    "label": "Housing",
    "relatedIds": [
      "project.restore_studio"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Housing",
      "playerHint": "Housing shows whether current bunks can support everyone at the base.",
      "ctaCopy": null,
      "primaryRiskCopy": "Missing bunks will degrade morale and eventually crew performance.",
      "displayPriority": 680,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.base.bad_vibes",
    "label": "Morale Drain",
    "relatedIds": [
      "resource.vibes",
      "project.build_fire_pit"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.fire_pit_built"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Morale Drain",
      "playerHint": "Bad Vibes track the pressure created by overcrowding and unstable housing.",
      "ctaCopy": null,
      "primaryRiskCopy": "If morale drain rises, crew efficiency will fall.",
      "displayPriority": 670,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.base.crew_efficiency",
    "label": "Crew Speed",
    "relatedIds": [
      "resource.vibes",
      "project.build_fire_pit"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.fire_pit_built"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Crew Speed",
      "playerHint": "Crew speed reflects how much Bad Vibes are slowing the base down.",
      "ctaCopy": null,
      "primaryRiskCopy": "Low crew speed slows construction, gathering, and the whole first-session arc.",
      "displayPriority": 660,
      "reveal": "default"
    }
  },
  {
    "id": "ui.control.base.scavenge",
    "label": "Scavenge Crew",
    "relatedIds": [
      "role.scavenge",
      "resource.stone"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.tutorial_explored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Scavenge",
      "playerHint": "Scavenge Crew convert the surrounding ruins into Stone for repairs and projects.",
      "ctaCopy": "Add Scavenge Crew",
      "primaryRiskCopy": null,
      "displayPriority": 650,
      "reveal": "default"
    }
  },
  {
    "id": "ui.control.base.fire_pit",
    "label": "Fire Pit Crew",
    "relatedIds": [
      "role.fire_pit",
      "resource.vibes"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.fire_pit_built"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Fire Pit",
      "playerHint": "Fire Pit Crew turn your built fire into Vibes for recruitment.",
      "ctaCopy": "Add Fire Pit Crew",
      "primaryRiskCopy": null,
      "displayPriority": 640,
      "reveal": "default"
    }
  },
  {
    "id": "ui.control.base.water",
    "label": "Water Crew",
    "relatedIds": [
      "role.water",
      "resource.water"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.water_collection_unlocked"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Water",
      "playerHint": "Water Crew collect and refill the water loop for repairs and upgrades.",
      "ctaCopy": "Add Water Crew",
      "primaryRiskCopy": null,
      "displayPriority": 630,
      "reveal": "default"
    }
  },
  {
    "id": "ui.action.recruit",
    "label": "Recruit Survivor",
    "relatedIds": [
      "resource.vibes"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "recruitment_enabled"
        },
        {
          "kind": "pending_recruits"
        },
        {
          "kind": "recruited_any"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Recruit",
      "playerHint": "Recruiting survivors spends Vibes and expands your crew capacity.",
      "ctaCopy": "Recruit Survivor",
      "primaryRiskCopy": "If Vibes are low, recruitment stalls.",
      "displayPriority": 620,
      "reveal": "default"
    }
  },
  {
    "id": "ui.status.base.studio",
    "label": "Studio Status",
    "relatedIds": [
      "project.restore_studio"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restore_unlocked"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Studio",
      "playerHint": "The Studio is the first major repair and unlocks housing plus Chorus.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 610,
      "reveal": "default"
    }
  },
  {
    "id": "ui.status.base.fire_pit",
    "label": "Fire Pit Status",
    "relatedIds": [
      "project.build_fire_pit"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.fire_pit_built"
        },
        {
          "kind": "recruitment_enabled"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Fire Pit Status",
      "playerHint": "The Fire Pit determines whether the Vibes loop is actually online.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 600,
      "reveal": "default"
    }
  },
  {
    "id": "ui.status.base.recruits",
    "label": "Recruit Status",
    "relatedIds": [
      "resource.vibes"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "recruitment_enabled"
        },
        {
          "kind": "pending_recruits"
        },
        {
          "kind": "recruited_any"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Recruit Status",
      "playerHint": "This shows pending recruits and remaining instant recruit stock.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 590,
      "reveal": "default"
    }
  },
  {
    "id": "ui.status.base.housing",
    "label": "Housing Status",
    "relatedIds": [
      "project.restore_studio"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "flag_set",
          "flag_id": "base.studio_restored"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Housing Status",
      "playerHint": "Housing status warns when the crew outgrows the available bunks.",
      "ctaCopy": null,
      "primaryRiskCopy": "Overcrowding creates Bad Vibes over time.",
      "displayPriority": 580,
      "reveal": "default"
    }
  },
  {
    "id": "ui.map.cave_gate",
    "label": "Cave Gate",
    "relatedIds": [
      "world_action.explore_base",
      "resource.bassline"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "recruitment_disabled"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Cave Gate",
      "playerHint": "The cave route opens once the Bassline bubble reaches it safely.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 570,
      "reveal": "default"
    }
  },
  {
    "id": "ui.app.eyebrow",
    "label": "AD&D",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "AD&D",
      "playerHint": "App eyebrow label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 120,
      "reveal": "default"
    }
  },
  {
    "id": "ui.app.view.game",
    "label": "Game View",
    "relatedIds": [
      "ui.panel.hero",
      "ui.panel.objectives",
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Game View",
      "playerHint": "Player-facing view.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 119,
      "reveal": "default"
    }
  },
  {
    "id": "ui.app.view.admin",
    "label": "Admin View",
    "relatedIds": [
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Admin View",
      "playerHint": "Debug and inspection view.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 118,
      "reveal": "default"
    }
  },
  {
    "id": "ui.app.view.data_tree",
    "label": "Data Tree",
    "relatedIds": [
      "ui.panel.objectives"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Data Tree",
      "playerHint": "Catalog and graph inspection view.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 117,
      "reveal": "default"
    }
  },
  {
    "id": "ui.hero.name",
    "label": "The Hero",
    "relatedIds": [
      "ui.panel.hero"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "The Hero",
      "playerHint": "Current run protagonist.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 116,
      "reveal": "default"
    }
  },
  {
    "id": "ui.hero.class.drummer",
    "label": "Drummer",
    "relatedIds": [
      "role.crystal_bassline"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Drummer",
      "playerHint": "Bassline-focused Hero class track.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 115,
      "reveal": "default"
    }
  },
  {
    "id": "ui.hero.class.vocalist",
    "label": "Vocalist",
    "relatedIds": [
      "role.crystal_chorus"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Vocalist",
      "playerHint": "Chorus-focused Hero class track.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 114,
      "reveal": "default"
    }
  },
  {
    "id": "ui.hero.class.synth",
    "label": "Synth",
    "relatedIds": [
      "role.crystal_harmonics"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Synth",
      "playerHint": "Harmonics-focused Hero class track.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 113,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.hero.vitals",
    "label": "Vitals Monitor",
    "relatedIds": [
      "hero.outside_bubble",
      "hero.forced_return_active",
      "hero.recovering_at_studio"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Vitals Monitor",
      "playerHint": "Shows current Viral Load and strain tier.",
      "ctaCopy": null,
      "primaryRiskCopy": "If Viral Load crosses the point of no return, forced retreat starts immediately.",
      "displayPriority": 112,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.hero.wounds",
    "label": "Wounds",
    "relatedIds": [
      "hero.forced_return_active"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Wounds",
      "playerHint": "Tracks the Hero wound pool separately from Viral Load.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 111,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.hero.return_window",
    "label": "Return Window",
    "relatedIds": [
      "hero.outside_bubble",
      "hero.forced_return_active"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "hero_outside_bubble"
        },
        {
          "kind": "hero_forced_return"
        },
        {
          "kind": "viral_load_positive"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Return Window",
      "playerHint": "Shows how much safe margin remains before forced retreat or how long retreat will take.",
      "ctaCopy": null,
      "primaryRiskCopy": "A shrinking window means the Hero is almost out of safe return budget.",
      "displayPriority": 110,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.hero.recovery",
    "label": "Recovery",
    "relatedIds": [
      "hero.recovering_at_studio",
      "hero.outside_bubble"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "hero_recovering"
        },
        {
          "kind": "viral_load_positive"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Recovery",
      "playerHint": "Recovery starts only once the Hero is back in the Studio and slows during severe brownouts.",
      "ctaCopy": null,
      "primaryRiskCopy": "Brownouts can slow or stop recovery at the Studio.",
      "displayPriority": 109,
      "reveal": "default"
    }
  },
  {
    "id": "ui.metric.hero.echo_scars",
    "label": "Echo Scars",
    "relatedIds": [
      "hero.forced_return_active"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "echo_scars_positive"
        },
        {
          "kind": "hero_forced_return"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Echo Scars",
      "playerHint": "Forced returns leave Echo Scars behind even when the Hero survives.",
      "ctaCopy": null,
      "primaryRiskCopy": "Echo Scars stack and will matter more as the world layer opens up.",
      "displayPriority": 108,
      "reveal": "advanced"
    }
  },
  {
    "id": "ui.metric.hero.debuff",
    "label": "Strain Tier",
    "relatedIds": [
      "hero.outside_bubble"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "viral_load_positive"
        },
        {
          "kind": "hero_forced_return"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Strain Tier",
      "playerHint": "Viral Load thresholds reduce Hero work and movement before full forced return.",
      "ctaCopy": null,
      "primaryRiskCopy": "Higher strain makes the Hero slower and less effective outside safety.",
      "displayPriority": 107,
      "reveal": "default"
    }
  },
  {
    "id": "ui.hero.state.forced_return",
    "label": "Forced Return",
    "relatedIds": [
      "hero.forced_return_active"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Forced Return",
      "playerHint": "Hero state label during automatic retreat.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 106,
      "reveal": "default"
    }
  },
  {
    "id": "ui.hero.state.returning_to_studio",
    "label": "Returning to Studio",
    "relatedIds": [
      "hero.forced_return_active"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Returning to Studio",
      "playerHint": "Hero state label after re-entering the bubble during forced return.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 105,
      "reveal": "default"
    }
  },
  {
    "id": "ui.hero.state.recovering",
    "label": "Recovering at Studio",
    "relatedIds": [
      "hero.recovering_at_studio"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Recovering at Studio",
      "playerHint": "Hero state label during Studio-bound recovery.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 104,
      "reveal": "default"
    }
  },
  {
    "id": "ui.hero.state.outside_bubble",
    "label": "Outside Bubble",
    "relatedIds": [
      "hero.outside_bubble"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Outside Bubble",
      "playerHint": "Hero state label while exposed to the Silence outside safety.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 103,
      "reveal": "default"
    }
  },
  {
    "id": "ui.map.metric.reach",
    "label": "Reach",
    "relatedIds": [
      "ui.panel.map",
      "resource.bassline"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Reach",
      "playerHint": "Current bubble reach from the base.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 112,
      "reveal": "default"
    }
  },
  {
    "id": "ui.map.metric.frontier",
    "label": "Frontier",
    "relatedIds": [
      "ui.panel.map",
      "resource.bassline"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Frontier",
      "playerHint": "Current conversion progress at the bubble edge.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 111,
      "reveal": "default"
    }
  },
  {
    "id": "ui.map.metric.target",
    "label": "Target",
    "relatedIds": [
      "ui.panel.map",
      "resource.bassline"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Target",
      "playerHint": "Target bubble reach from current Bassline budget.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 110,
      "reveal": "default"
    }
  },
  {
    "id": "ui.map.metric.cave_gate_in",
    "label": "Cave Gate in",
    "relatedIds": [
      "ui.map.cave_gate",
      "tile.survivor_cave"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "recruitment_disabled"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Cave Gate in",
      "playerHint": "Remaining reach needed to open the cave route.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 109,
      "reveal": "default"
    }
  },
  {
    "id": "ui.map.metric.shrink_warning",
    "label": "Bubble will shrink in",
    "relatedIds": [
      "resource.bassline",
      "ui.panel.map"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Bubble will shrink in",
      "playerHint": "Countdown until the bubble contracts if budget stays too low.",
      "ctaCopy": null,
      "primaryRiskCopy": "Spend less Bassline or grow supply to avoid shrink.",
      "displayPriority": 108,
      "reveal": "default"
    }
  },
  {
    "id": "ui.panel.narrative",
    "label": "Arrival",
    "relatedIds": [
      "story.beat.road_to_base",
      "story.beat.first_glimpse",
      "story.beat.enter_the_bubble",
      "story.beat.investigate_base",
      "story.beat.explore_base"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Arrival",
      "playerHint": "Narrative intro panel for the first five opening beats.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 108,
      "reveal": "default"
    }
  },
  {
    "id": "ui.narrative.kicker",
    "label": "Introduction",
    "relatedIds": [
      "ui.panel.narrative"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Introduction",
      "playerHint": "Narrative intro panel kicker.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 107,
      "reveal": "default"
    }
  },
  {
    "id": "ui.narrative.choice_label",
    "label": "Choose your line",
    "relatedIds": [
      "ui.panel.narrative"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Choose your line",
      "playerHint": "Prompt shown before the player commits to a narrative choice.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 106,
      "reveal": "default"
    }
  },
  {
    "id": "ui.narrative.selected_label",
    "label": "Chosen",
    "relatedIds": [
      "ui.panel.narrative"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Chosen",
      "playerHint": "Heading for the selected intro choice.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 105,
      "reveal": "default"
    }
  },
  {
    "id": "ui.narrative.unlock_label",
    "label": "This sets up",
    "relatedIds": [
      "ui.panel.narrative",
      "world_action.investigate_base",
      "world_action.explore_base"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "This sets up",
      "playerHint": "Label for the playable action unlocked by the current narrative beat.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 104,
      "reveal": "default"
    }
  },
  {
    "id": "ui.run.kicker",
    "label": "Run",
    "relatedIds": [
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Run",
      "playerHint": "Run-level save and offline controls.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 103,
      "reveal": "default"
    }
  },
  {
    "id": "ui.run.no_autosave",
    "label": "No autosave",
    "relatedIds": [
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "No autosave",
      "playerHint": "Shown before the first autosave lands.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 106,
      "reveal": "default"
    }
  },
  {
    "id": "ui.run.metric.clock",
    "label": "Clock",
    "relatedIds": [
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Clock",
      "playerHint": "Current run clock.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 105,
      "reveal": "default"
    }
  },
  {
    "id": "ui.run.metric.autosave",
    "label": "Autosave",
    "relatedIds": [
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Autosave",
      "playerHint": "Latest autosave timestamp.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 104,
      "reveal": "default"
    }
  },
  {
    "id": "ui.run.away_summary",
    "label": "While you were away",
    "relatedIds": [
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "While you were away",
      "playerHint": "Offline catch-up summary heading.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 103,
      "reveal": "default"
    }
  },
  {
    "id": "ui.run.dismiss",
    "label": "Dismiss",
    "relatedIds": [
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Dismiss",
      "playerHint": "Dismiss the offline summary.",
      "ctaCopy": "Dismiss",
      "primaryRiskCopy": null,
      "displayPriority": 102,
      "reveal": "default"
    }
  },
  {
    "id": "ui.run.metric.reach",
    "label": "Reach",
    "relatedIds": [
      "ui.panel.run",
      "resource.bassline"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Reach",
      "playerHint": "Offline reach delta.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 101,
      "reveal": "default"
    }
  },
  {
    "id": "ui.run.metric.recruits",
    "label": "Recruits",
    "relatedIds": [
      "ui.panel.run",
      "ui.action.recruit"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Recruits",
      "playerHint": "Offline recruit delta.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 100,
      "reveal": "default"
    }
  },
  {
    "id": "ui.run.action.save_now",
    "label": "Save Now",
    "relatedIds": [
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Save Now",
      "playerHint": "Export the current save.",
      "ctaCopy": "Save Now",
      "primaryRiskCopy": null,
      "displayPriority": 99,
      "reveal": "default"
    }
  },
  {
    "id": "ui.run.action.load_autosave",
    "label": "Load Autosave",
    "relatedIds": [
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Load Autosave",
      "playerHint": "Load the browser autosave.",
      "ctaCopy": "Load Autosave",
      "primaryRiskCopy": null,
      "displayPriority": 98,
      "reveal": "default"
    }
  },
  {
    "id": "ui.run.action.load_text",
    "label": "Load Text",
    "relatedIds": [
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Load Text",
      "playerHint": "Import a pasted save payload.",
      "ctaCopy": "Load Text",
      "primaryRiskCopy": null,
      "displayPriority": 97,
      "reveal": "default"
    }
  },
  {
    "id": "ui.run.action.reset",
    "label": "Reset Run",
    "relatedIds": [
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Reset Run",
      "playerHint": "Reset the current run to a fresh state.",
      "ctaCopy": "Reset Run",
      "primaryRiskCopy": "This clears current run progress.",
      "displayPriority": 96,
      "reveal": "default"
    }
  },
  {
    "id": "ui.run.metric.save_payload",
    "label": "Save Payload",
    "relatedIds": [
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Save Payload",
      "playerHint": "Raw serialized save text.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 95,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.title",
    "label": "Data Tree",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Data Tree",
      "playerHint": "Catalog navigation heading.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 94,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.subtitle",
    "label": "Catalog, schemas, and UI surfaces",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Catalog, schemas, and UI surfaces",
      "playerHint": "Data Tree subtitle.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 93,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.search",
    "label": "Filter nodes",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Filter nodes",
      "playerHint": "Search input label for the data tree.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 92,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.empty",
    "label": "No nodes match the current filter.",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "No nodes match the current filter.",
      "playerHint": "Shown when the Data Tree is filtered to nothing.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 91,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.definition",
    "label": "Definition",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Definition",
      "playerHint": "Selected node definition section.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 90,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.select_node",
    "label": "Select a node",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Select a node",
      "playerHint": "Shown when no Data Tree node is selected.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 89,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.mode.graph",
    "label": "Graph",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Graph",
      "playerHint": "Relation graph mode.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 88,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.mode.timeline",
    "label": "Timeline",
    "relatedIds": [
      "story.beat.investigate_base",
      "story.beat.stabilize_base"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Timeline",
      "playerHint": "Story-beat timeline mode.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 87,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.graph",
    "label": "Graph",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Graph",
      "playerHint": "Graph section title.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 86,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.graph.hint",
    "label": "Inspect incoming and outgoing relations around the selected node.",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Inspect incoming and outgoing relations around the selected node.",
      "playerHint": "Graph help text.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 85,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.graph.reset",
    "label": "Reset Graph",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Reset Graph",
      "playerHint": "Clear local graph simulation state.",
      "ctaCopy": "Reset Graph",
      "primaryRiskCopy": null,
      "displayPriority": 84,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.timeline",
    "label": "Timeline",
    "relatedIds": [
      "story.beat.investigate_base",
      "story.beat.stabilize_base"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Timeline",
      "playerHint": "Story-beat timeline section title.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 83,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.timeline_hint",
    "label": "Browse progression beats by arc and sequence.",
    "relatedIds": [
      "story.beat.investigate_base",
      "story.beat.stabilize_base"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Browse progression beats by arc and sequence.",
      "playerHint": "Timeline help text.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 82,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.timeline.empty",
    "label": "No story beats are available for the current filter.",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "No story beats are available for the current filter.",
      "playerHint": "Empty state for story timeline.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 81,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.timeline.arc",
    "label": "Arc",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Arc",
      "playerHint": "Story arc label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 80,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.timeline.sequence",
    "label": "Sequence",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Sequence",
      "playerHint": "Story beat sequence label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 79,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.visible",
    "label": "Visible",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Visible",
      "playerHint": "Visibility state label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 78,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.hidden",
    "label": "Hidden",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Hidden",
      "playerHint": "Visibility state label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 77,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.none",
    "label": "None",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "None",
      "playerHint": "Empty relation/value label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 76,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.graph.enabled",
    "label": "Enabled",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Enabled",
      "playerHint": "Graph enabled-state marker.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 75,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.graph.simulated",
    "label": "Simulated Unlock",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Simulated Unlock",
      "playerHint": "Graph simulated-unlock marker.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 74,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.graph.enable",
    "label": "Enable Node",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Enable Node",
      "playerHint": "Enable a node in the local graph simulation.",
      "ctaCopy": "Enable Node",
      "primaryRiskCopy": null,
      "displayPriority": 73,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.graph.disable",
    "label": "Disable Node",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Disable Node",
      "playerHint": "Disable a node in the local graph simulation.",
      "ctaCopy": "Disable Node",
      "primaryRiskCopy": null,
      "displayPriority": 72,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.graph.show_hidden",
    "label": "Show hidden nodes",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Show hidden nodes",
      "playerHint": "Toggle hidden nodes in the graph.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 71,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.graph.incoming",
    "label": "Incoming",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Incoming",
      "playerHint": "Incoming relation column label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 70,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.graph.selected",
    "label": "Selected",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Selected",
      "playerHint": "Selected-node column label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 69,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.graph.enabled_nodes",
    "label": "Enabled Nodes",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Enabled Nodes",
      "playerHint": "Enabled-nodes list label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 68,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.graph.no_enabled",
    "label": "No nodes enabled",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "No nodes enabled",
      "playerHint": "Empty state for enabled nodes.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 67,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.graph.potential_unlocks",
    "label": "Potential Unlocks",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Potential Unlocks",
      "playerHint": "Potential unlocks list label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 66,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.graph.no_potential_unlocks",
    "label": "No potential unlocks",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "No potential unlocks",
      "playerHint": "Empty state for potential unlocks.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 65,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.graph.outgoing",
    "label": "Outgoing",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Outgoing",
      "playerHint": "Outgoing relation column label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 64,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.field.kind",
    "label": "Kind",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Kind",
      "playerHint": "Definition field label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 63,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.field.id",
    "label": "ID",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "ID",
      "playerHint": "Definition field label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 62,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.field.label",
    "label": "Label",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Label",
      "playerHint": "Definition field label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 61,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.group.resources",
    "label": "Resources",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Resources",
      "playerHint": "Data Tree group label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 60,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.group.roles",
    "label": "Roles",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Roles",
      "playerHint": "Data Tree group label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 59,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.group.stations",
    "label": "Stations",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Stations",
      "playerHint": "Data Tree group label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 58,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.group.construction",
    "label": "Construction",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Construction",
      "playerHint": "Data Tree group label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 57,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.group.processing",
    "label": "Processing",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Processing",
      "playerHint": "Data Tree group label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 56,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.group.actions",
    "label": "World Actions",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "World Actions",
      "playerHint": "Data Tree group label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 55,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.group.story",
    "label": "Story Beats",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Story Beats",
      "playerHint": "Data Tree group label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 54,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.group.flags",
    "label": "State Flags",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "State Flags",
      "playerHint": "Data Tree group label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 53,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.group.models",
    "label": "Models",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Models",
      "playerHint": "Data Tree group label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 52,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.group.ui",
    "label": "UI Surfaces",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "UI Surfaces",
      "playerHint": "Data Tree group label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 51,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.group.tiles",
    "label": "Tiles",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Tiles",
      "playerHint": "Data Tree group label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 50,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.group.flora",
    "label": "Flora",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Flora",
      "playerHint": "Data Tree group label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 49,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.group.structures",
    "label": "Structures",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Structures",
      "playerHint": "Data Tree group label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 48,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.filter.all",
    "label": "All",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "All",
      "playerHint": "Relation filter label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 47,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.filter.unlock",
    "label": "Unlocks",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Unlocks",
      "playerHint": "Relation filter label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 46,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.filter.blocker",
    "label": "Blockers",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Blockers",
      "playerHint": "Relation filter label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 45,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.filter.flow",
    "label": "Flows",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Flows",
      "playerHint": "Relation filter label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 44,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.filter.access",
    "label": "Access",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Access",
      "playerHint": "Relation filter label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 43,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.filter.power",
    "label": "Power",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Power",
      "playerHint": "Relation filter label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 42,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.filter.model",
    "label": "Models",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Models",
      "playerHint": "Relation filter label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 41,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.filter.related",
    "label": "Related",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Related",
      "playerHint": "Relation filter label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 40,
      "reveal": "default"
    }
  },
  {
    "id": "ui.construction.kicker",
    "label": "Construction",
    "relatedIds": [
      "ui.panel.construction"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Construction",
      "playerHint": "Construction panel kicker.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 39,
      "reveal": "default"
    }
  },
  {
    "id": "ui.construction.note",
    "label": "Build, repair, and queue the next permanent base milestone here.",
    "relatedIds": [
      "ui.panel.construction"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Build, repair, and queue the next permanent base milestone here.",
      "playerHint": "Construction panel note.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 38,
      "reveal": "default"
    }
  },
  {
    "id": "ui.power.kicker",
    "label": "Power",
    "relatedIds": [
      "ui.panel.power"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Power",
      "playerHint": "Power panel kicker.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 37,
      "reveal": "default"
    }
  },
  {
    "id": "ui.power.metric.harmonics_tier",
    "label": "Harmonics Tier",
    "relatedIds": [
      "ui.metric.harmonics.tier"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Harmonics Tier",
      "playerHint": "Power panel metric label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 36,
      "reveal": "default"
    }
  },
  {
    "id": "ui.power.note",
    "label": "Power the stations you need, watch Chorus drain, and avoid brownouts.",
    "relatedIds": [
      "ui.panel.power"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Power the stations you need, watch Chorus drain, and avoid brownouts.",
      "playerHint": "Power panel note.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 35,
      "reveal": "default"
    }
  },
  {
    "id": "ui.base.kicker",
    "label": "Base",
    "relatedIds": [
      "ui.panel.base"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Base",
      "playerHint": "Base panel kicker.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 34,
      "reveal": "default"
    }
  },
  {
    "id": "ui.base.note",
    "label": "Gather supplies, manage housing pressure, and prepare recruitment.",
    "relatedIds": [
      "ui.panel.base"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Gather supplies, manage housing pressure, and prepare recruitment.",
      "playerHint": "Base panel note.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 33,
      "reveal": "default"
    }
  },
  {
    "id": "ui.objectives.kicker",
    "label": "Objectives",
    "relatedIds": [
      "ui.panel.objectives"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Objectives",
      "playerHint": "Objectives panel kicker.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 32,
      "reveal": "default"
    }
  },
  {
    "id": "ui.objectives.no_direct_action",
    "label": "No direct action",
    "relatedIds": [
      "ui.panel.objectives"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "No direct action",
      "playerHint": "Shown when the current objective is passive.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 31,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.simulation.kicker",
    "label": "Simulation",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Simulation",
      "playerHint": "Admin simulation section kicker.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 30,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.simulation.title",
    "label": "Simulation Controls",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Simulation Controls",
      "playerHint": "Admin simulation section title.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 29,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.simulation.action.export_save",
    "label": "Export Save",
    "relatedIds": [
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Export Save",
      "playerHint": "Admin export action.",
      "ctaCopy": "Export Save",
      "primaryRiskCopy": null,
      "displayPriority": 28,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.simulation.action.tick10",
    "label": "Tick 10s",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Tick 10s",
      "playerHint": "Advance runtime by 10 seconds.",
      "ctaCopy": "Tick 10s",
      "primaryRiskCopy": null,
      "displayPriority": 27,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.simulation.action.tick60",
    "label": "Tick 60s",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Tick 60s",
      "playerHint": "Advance runtime by 60 seconds.",
      "ctaCopy": "Tick 60s",
      "primaryRiskCopy": null,
      "displayPriority": 26,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.simulation.action.offline1h",
    "label": "Offline 1h",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Offline 1h",
      "playerHint": "Simulate one hour offline.",
      "ctaCopy": "Offline 1h",
      "primaryRiskCopy": null,
      "displayPriority": 25,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.simulation.action.offline4h",
    "label": "Offline 4h",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Offline 4h",
      "playerHint": "Simulate four hours offline.",
      "ctaCopy": "Offline 4h",
      "primaryRiskCopy": null,
      "displayPriority": 24,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.construction.kicker",
    "label": "Construction",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Construction",
      "playerHint": "Admin construction section kicker.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 23,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.construction.title",
    "label": "Construction State",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Construction State",
      "playerHint": "Admin construction section title.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 22,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.spending.kicker",
    "label": "Spending",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Spending",
      "playerHint": "Admin spending section kicker.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 21,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.spending.title",
    "label": "Manual Spending",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Manual Spending",
      "playerHint": "Admin spending section title.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 20,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.spending.action.spend10",
    "label": "Spend 10",
    "relatedIds": [
      "resource.bassline"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Spend 10",
      "playerHint": "Admin spend action.",
      "ctaCopy": "Spend 10",
      "primaryRiskCopy": null,
      "displayPriority": 19,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.spending.action.spend25",
    "label": "Spend 25",
    "relatedIds": [
      "resource.bassline"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Spend 25",
      "playerHint": "Admin spend action.",
      "ctaCopy": "Spend 25",
      "primaryRiskCopy": null,
      "displayPriority": 18,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.spending.action.spend50",
    "label": "Spend 50",
    "relatedIds": [
      "resource.bassline"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Spend 50",
      "playerHint": "Admin spend action.",
      "ctaCopy": "Spend 50",
      "primaryRiskCopy": null,
      "displayPriority": 17,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.spending.action.spend_all",
    "label": "Spend All",
    "relatedIds": [
      "resource.bassline"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Spend All",
      "playerHint": "Admin spend action.",
      "ctaCopy": "Spend All",
      "primaryRiskCopy": null,
      "displayPriority": 16,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.diagnostics.kicker",
    "label": "Diagnostics",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Diagnostics",
      "playerHint": "Admin diagnostics section kicker.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 15,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.diagnostics.title",
    "label": "Diagnostics",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Diagnostics",
      "playerHint": "Admin diagnostics section title.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 14,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.persistence.kicker",
    "label": "Persistence",
    "relatedIds": [
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Persistence",
      "playerHint": "Admin persistence section kicker.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 13,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.persistence.title",
    "label": "Save Preview",
    "relatedIds": [
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Save Preview",
      "playerHint": "Admin persistence section title.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 12,
      "reveal": "default"
    }
  },
  {
    "id": "ui.admin.persistence.empty",
    "label": "No save exported yet.",
    "relatedIds": [
      "ui.panel.run"
    ],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "No save exported yet.",
      "playerHint": "Admin save preview empty state.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 11,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.field.short_label",
    "label": "Short Label",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Short Label",
      "playerHint": "Data Tree field label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 10,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.field.player_hint",
    "label": "Player Hint",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Player Hint",
      "playerHint": "Data Tree field label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 9,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.field.cta",
    "label": "CTA",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "CTA",
      "playerHint": "Data Tree field label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 8,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.field.risk",
    "label": "Risk",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Risk",
      "playerHint": "Data Tree field label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 7,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.field.reveal",
    "label": "Reveal",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Reveal",
      "playerHint": "Data Tree field label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 6,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.visibility",
    "label": "Visibility",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Visibility",
      "playerHint": "Data Tree section title.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 5,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.field.current_state",
    "label": "Current State",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Current State",
      "playerHint": "Data Tree field label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 4,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.field.conditions_all",
    "label": "Conditions (all)",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Conditions (all)",
      "playerHint": "Data Tree field label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 3,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.field.conditions_any",
    "label": "Conditions (any)",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Conditions (any)",
      "playerHint": "Data Tree field label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 2,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.relations",
    "label": "Relations",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Relations",
      "playerHint": "Data Tree section title.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 1,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.outgoing",
    "label": "Outgoing",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Outgoing",
      "playerHint": "Relation column label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 1,
      "reveal": "default"
    }
  },
  {
    "id": "ui.data_tree.incoming",
    "label": "Incoming",
    "relatedIds": [],
    "visibility": {
      "allOf": [],
      "anyOf": [
        {
          "kind": "always"
        }
      ]
    },
    "presentation": {
      "shortLabel": "Incoming",
      "playerHint": "Relation column label.",
      "ctaCopy": null,
      "primaryRiskCopy": null,
      "displayPriority": 1,
      "reveal": "default"
    }
  }
]
