import type { EntitySchemaDef } from "@aedventure/add-protocol"

// Bootstrapped from the catalog snapshot, then owned here as the source of truth.
// `content:build` codegens the Rust catalog from this module.
export const ENTITY_SCHEMAS: readonly Omit<EntitySchemaDef, "presentation" | "visibility">[] = [
  {
    "id": "resource.bassline",
    "entityKind": "resource",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [],
    "blockers": [
      {
        "kind": "blocked_at_cap",
        "label": "Overflow is lost when Bassline storage is full.",
        "relatedIds": [
          "resource.bassline"
        ]
      }
    ],
    "accessRules": [],
    "power": null,
    "flows": [
      {
        "itemId": "resource.bassline",
        "label": "Crystal Bassline staffing generates stored Bassline.",
        "direction": "output",
        "cadence": "per_second",
        "relatedIds": [
          "role.crystal_bassline"
        ]
      },
      {
        "itemId": "resource.bassline",
        "label": "Removing Moss adds passive Bassline.",
        "direction": "output",
        "cadence": "passive",
        "relatedIds": [
          "construction.removing_moss"
        ]
      },
      {
        "itemId": "resource.bassline",
        "label": "Crystal upgrades drain Bassline while builders work.",
        "direction": "input",
        "cadence": "per_worker_second",
        "relatedIds": [
          "construction.slot_capacity",
          "construction.output",
          "construction.storage",
          "construction.polish_field"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "bubble",
        "referenceId": "field_k_base",
        "label": "Bubble coverage is budgeted from stored Bassline."
      },
      {
        "kind": "storage",
        "referenceId": "overflow_lost",
        "label": "Overflow is discarded at cap."
      }
    ],
    "notes": [
      "Bassline is both a stored resource and the active bubble budget anchor."
    ]
  },
  {
    "id": "resource.chorus",
    "entityKind": "resource",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [
      {
        "kind": "construction",
        "label": "Restore Studio to unlock Chorus production.",
        "relatedIds": [
          "base.studio_restored"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Chorus staffing is locked until the Studio is restored.",
        "relatedIds": [
          "base.studio_restored"
        ]
      },
      {
        "kind": "blocked_at_cap",
        "label": "Overflow is lost when Chorus storage is full.",
        "relatedIds": [
          "resource.chorus"
        ]
      }
    ],
    "accessRules": [],
    "power": null,
    "flows": [
      {
        "itemId": "resource.chorus",
        "label": "Crystal Chorus staffing generates stored Chorus.",
        "direction": "output",
        "cadence": "per_second",
        "relatedIds": [
          "role.crystal_chorus"
        ]
      },
      {
        "itemId": "resource.chorus",
        "label": "Life support always consumes Chorus when active staff exceed the free allowance.",
        "direction": "input",
        "cadence": "per_second",
        "relatedIds": [
          "role.crystal_bassline",
          "role.crystal_chorus",
          "role.crystal_harmonics",
          "role.construction",
          "role.fire_pit",
          "role.scavenge",
          "role.water"
        ]
      },
      {
        "itemId": "resource.chorus",
        "label": "Manual stations consume Chorus while powered.",
        "direction": "input",
        "cadence": "while_powered",
        "relatedIds": [
          "station.resonance_chamber",
          "station.mix_console",
          "station.workshop",
          "station.research_booth"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "power",
        "referenceId": "manual_station_upkeep_multiplier",
        "label": "Harmonics tiers alter Chorus upkeep."
      },
      {
        "kind": "storage",
        "referenceId": "overflow_lost",
        "label": "Overflow is discarded at cap."
      }
    ],
    "notes": [
      "Chorus is the power rail for stations and life support."
    ]
  },
  {
    "id": "resource.harmonics",
    "entityKind": "resource",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [
      {
        "kind": "construction",
        "label": "Build Resonance Chamber to unlock Harmonics production.",
        "relatedIds": [
          "base.resonance_chamber_built"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Harmonics staffing is locked until the Resonance Chamber is built.",
        "relatedIds": [
          "base.resonance_chamber_built"
        ]
      },
      {
        "kind": "blocked_at_cap",
        "label": "Overflow is lost when Harmonics storage is full.",
        "relatedIds": [
          "resource.harmonics"
        ]
      }
    ],
    "accessRules": [],
    "power": null,
    "flows": [
      {
        "itemId": "resource.harmonics",
        "label": "Crystal Harmonics staffing generates stored Harmonics.",
        "direction": "output",
        "cadence": "per_second",
        "relatedIds": [
          "role.crystal_harmonics"
        ]
      },
      {
        "itemId": "resource.harmonics",
        "label": "Harmonics feeds tier thresholds and output multipliers.",
        "direction": "pressure",
        "cadence": "per_second",
        "relatedIds": [
          "station.resonance_chamber",
          "station.mix_console"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "power",
        "referenceId": "harmonics_tier_thresholds",
        "label": "Harmonics generation rate determines the active tier."
      },
      {
        "kind": "power",
        "referenceId": "harmonics_continuous_bonus",
        "label": "Continuous Harmonics output boosts efficiency before tiers."
      }
    ],
    "notes": [
      "Harmonics is a structural efficiency resource, not a direct upkeep pool."
    ]
  },
  {
    "id": "resource.stone",
    "entityKind": "resource",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [],
    "blockers": [
      {
        "kind": "blocked_at_cap",
        "label": "Stone collection pauses at cap.",
        "relatedIds": [
          "resource.stone"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Base scavenging is available on the Base tile.",
        "relatedIds": [
          "role.scavenge"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.stone",
        "label": "Scavenge Crew gathers Stone from Base stock while online.",
        "direction": "output",
        "cadence": "while_staffed",
        "relatedIds": [
          "role.scavenge"
        ]
      },
      {
        "itemId": "resource.stone",
        "label": "Base projects and processing spend Stone upfront.",
        "direction": "input",
        "cadence": "on_start",
        "relatedIds": [
          "project.restore_studio",
          "project.build_fire_pit",
          "project.build_resonance_chamber",
          "project.build_mix_console",
          "project.build_workshop",
          "project.build_research_booth",
          "recipe.resonance_field_calibration",
          "recipe.mix_signal_balancing",
          "recipe.workshop_builder_tools",
          "recipe.workshop_water_condensers",
          "recipe.research_chorus_routing",
          "recipe.research_harmonic_study"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "storage",
        "referenceId": "blocked_at_cap",
        "label": "Collection pauses at cap instead of losing overflow."
      }
    ],
    "notes": [
      "Stone is an untuned material and the first hard construction gate."
    ]
  },
  {
    "id": "resource.water",
    "entityKind": "resource",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [
      {
        "kind": "story",
        "label": "Explore Base unlocks Water collection.",
        "relatedIds": [
          "base.water_collection_unlocked"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "blocked_at_cap",
        "label": "Water collection pauses at cap.",
        "relatedIds": [
          "resource.water"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Water collection is a Base-tile action.",
        "relatedIds": [
          "role.water"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.water",
        "label": "Water Crew gathers from Base Water stock while online.",
        "direction": "output",
        "cadence": "while_staffed",
        "relatedIds": [
          "role.water"
        ]
      },
      {
        "itemId": "resource.water",
        "label": "Base Water stock regenerates passively.",
        "direction": "output",
        "cadence": "passive",
        "relatedIds": [
          "tile.river_shallows",
          "tile.base_core"
        ]
      },
      {
        "itemId": "resource.water",
        "label": "Processing and polishing consume Water upfront.",
        "direction": "input",
        "cadence": "on_start",
        "relatedIds": [
          "construction.polish_field",
          "recipe.resonance_field_calibration",
          "recipe.mix_signal_balancing",
          "recipe.workshop_builder_tools",
          "recipe.workshop_water_condensers",
          "recipe.research_chorus_routing",
          "recipe.research_harmonic_study"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "storage",
        "referenceId": "blocked_at_cap",
        "label": "Collection pauses at cap instead of losing overflow."
      }
    ],
    "notes": [
      "Water is an untuned material with a separate Base stock and player pool."
    ]
  },
  {
    "id": "resource.vibes",
    "entityKind": "resource",
    "persistence": {
      "scope": "run",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [
      {
        "kind": "construction",
        "label": "Build Fire Pit to start the Vibes loop.",
        "relatedIds": [
          "base.fire_pit_built"
        ]
      }
    ],
    "blockers": [],
    "accessRules": [],
    "power": null,
    "flows": [
      {
        "itemId": "resource.vibes",
        "label": "Fire Pit produces Vibes passively and from staffed crew.",
        "direction": "output",
        "cadence": "per_second",
        "relatedIds": [
          "role.fire_pit",
          "station.fire_pit"
        ]
      },
      {
        "itemId": "resource.vibes",
        "label": "Recruitment spends Vibes upfront.",
        "direction": "input",
        "cadence": "on_start",
        "relatedIds": [
          "tile.survivor_cave"
        ]
      },
      {
        "itemId": "resource.vibes",
        "label": "Overcrowding creates Bad Vibes pressure against the pool.",
        "direction": "pressure",
        "cadence": "per_second",
        "relatedIds": [
          "project.build_fire_pit"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "recruitment",
        "referenceId": "recruit_cost_curve_v0",
        "label": "Recruit cost follows the Good Vibes curve anchors."
      }
    ],
    "notes": [
      "Vibes can go negative and directly control early recruitment pacing."
    ]
  },
  {
    "id": "role.crystal_bassline",
    "entityKind": "role",
    "persistence": null,
    "unlocks": [],
    "blockers": [
      {
        "kind": "missing_staff",
        "label": "Crystal roles compete for shared free slots.",
        "relatedIds": [
          "station.crystal_circle"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Crystal staffing is only available at the Base.",
        "relatedIds": [
          "station.crystal_circle"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.bassline",
        "label": "Assigned staff convert time into Bassline output.",
        "direction": "output",
        "cadence": "while_staffed",
        "relatedIds": [
          "resource.bassline"
        ]
      }
    ],
    "modelRefs": [],
    "notes": [
      "The Hero can assign here without consuming a crew slot."
    ]
  },
  {
    "id": "role.crystal_chorus",
    "entityKind": "role",
    "persistence": null,
    "unlocks": [
      {
        "kind": "construction",
        "label": "Restore Studio to unlock Chorus staffing.",
        "relatedIds": [
          "base.studio_restored"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Studio must be restored before Chorus staffing exists.",
        "relatedIds": [
          "base.studio_restored"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Crystal staffing is only available at the Base.",
        "relatedIds": [
          "station.crystal_circle"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.chorus",
        "label": "Assigned staff convert time into Chorus output.",
        "direction": "output",
        "cadence": "while_staffed",
        "relatedIds": [
          "resource.chorus"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "role.crystal_harmonics",
    "entityKind": "role",
    "persistence": null,
    "unlocks": [
      {
        "kind": "construction",
        "label": "Build Resonance Chamber to unlock Harmonics staffing.",
        "relatedIds": [
          "base.resonance_chamber_built"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Resonance Chamber must be built before Harmonics staffing exists.",
        "relatedIds": [
          "base.resonance_chamber_built"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Crystal staffing is only available at the Base.",
        "relatedIds": [
          "station.crystal_circle"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.harmonics",
        "label": "Assigned staff convert time into Harmonics output.",
        "direction": "output",
        "cadence": "while_staffed",
        "relatedIds": [
          "resource.harmonics"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "role.construction",
    "entityKind": "role",
    "persistence": null,
    "unlocks": [],
    "blockers": [
      {
        "kind": "busy",
        "label": "Construction crew are locked while building or restoring.",
        "relatedIds": [
          "project.restore_studio",
          "project.build_fire_pit"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Construction is a Base-side role.",
        "relatedIds": [
          "structure.base"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.bassline",
        "label": "Builders convert time into construction progress and may drain Bassline.",
        "direction": "input",
        "cadence": "while_staffed",
        "relatedIds": [
          "construction.slot_capacity",
          "construction.output",
          "construction.storage"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "duration",
        "referenceId": "worker_blocking_construction",
        "label": "Builder availability directly affects progress."
      }
    ],
    "notes": [
      "Construction is a Base role and does not consume Crystal slots."
    ]
  },
  {
    "id": "role.fire_pit",
    "entityKind": "role",
    "persistence": null,
    "unlocks": [
      {
        "kind": "construction",
        "label": "Build Fire Pit to unlock Vibes staffing.",
        "relatedIds": [
          "base.fire_pit_built"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Fire Pit must be built before Vibes staffing exists.",
        "relatedIds": [
          "base.fire_pit_built"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Fire Pit staffing is a Base-side role.",
        "relatedIds": [
          "station.fire_pit"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.vibes",
        "label": "Fire Pit staffing increases Vibes generation.",
        "direction": "output",
        "cadence": "while_staffed",
        "relatedIds": [
          "resource.vibes"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "role.scavenge",
    "entityKind": "role",
    "persistence": null,
    "unlocks": [],
    "blockers": [
      {
        "kind": "blocked_at_cap",
        "label": "Scavenge pauses when Stone is capped.",
        "relatedIds": [
          "resource.stone"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Scavenge is a Base-tile action.",
        "relatedIds": [
          "tile.base_core"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.stone",
        "label": "Scavenge Crew gathers Stone while online.",
        "direction": "output",
        "cadence": "while_staffed",
        "relatedIds": [
          "resource.stone"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "role.water",
    "entityKind": "role",
    "persistence": null,
    "unlocks": [
      {
        "kind": "story",
        "label": "Explore Base to unlock Water collection.",
        "relatedIds": [
          "base.water_collection_unlocked"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Water collection is locked until the tutorial Explore completes.",
        "relatedIds": [
          "base.water_collection_unlocked"
        ]
      },
      {
        "kind": "blocked_at_cap",
        "label": "Water collection pauses when Water is capped.",
        "relatedIds": [
          "resource.water"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Water collection is a Base-tile action.",
        "relatedIds": [
          "tile.base_core"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.water",
        "label": "Water Crew gathers Water while online.",
        "direction": "output",
        "cadence": "while_staffed",
        "relatedIds": [
          "resource.water"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "station.crystal_circle",
    "entityKind": "station",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [],
    "blockers": [],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "The Crystal Circle is anchored to the Base core.",
        "relatedIds": [
          "tile.base_core"
        ]
      }
    ],
    "power": {
      "resourceId": "resource.chorus",
      "upkeepPerSecond": 0,
      "manualPower": false,
      "startsRequested": true,
      "fallbackMode": "always_on"
    },
    "flows": [
      {
        "itemId": "resource.bassline",
        "label": "Crystal slots convert staffed time into band resources.",
        "direction": "output",
        "cadence": "while_staffed",
        "relatedIds": [
          "role.crystal_bassline",
          "role.crystal_chorus",
          "role.crystal_harmonics"
        ]
      },
      {
        "itemId": "resource.bassline",
        "label": "Bubble field coverage is derived from stored Bassline.",
        "direction": "pressure",
        "cadence": "passive",
        "relatedIds": [
          "resource.bassline"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "bubble",
        "referenceId": "field_k_base",
        "label": "Crystal output converts into bubble field budget."
      }
    ],
    "notes": [
      "The Crystal Circle is the root station for the three-band economy."
    ]
  },
  {
    "id": "station.fire_pit",
    "entityKind": "station",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [
      {
        "kind": "construction",
        "label": "Build Fire Pit to activate the morale station.",
        "relatedIds": [
          "base.fire_pit_built"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Fire Pit station is unavailable until built.",
        "relatedIds": [
          "base.fire_pit_built"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "The Fire Pit is a Base-side station.",
        "relatedIds": [
          "tile.base_core"
        ]
      }
    ],
    "power": {
      "resourceId": "resource.chorus",
      "upkeepPerSecond": 0,
      "manualPower": false,
      "startsRequested": true,
      "fallbackMode": "always_on"
    },
    "flows": [
      {
        "itemId": "resource.vibes",
        "label": "The Fire Pit generates Vibes.",
        "direction": "output",
        "cadence": "per_second",
        "relatedIds": [
          "resource.vibes",
          "role.fire_pit"
        ]
      }
    ],
    "modelRefs": [],
    "notes": [
      "The Fire Pit intentionally has no Chorus upkeep in the early game."
    ]
  },
  {
    "id": "station.resonance_chamber",
    "entityKind": "station",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [
      {
        "kind": "construction",
        "label": "Build Resonance Chamber to unlock Harmonics processing.",
        "relatedIds": [
          "base.resonance_chamber_built"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Resonance Chamber is unavailable until built.",
        "relatedIds": [
          "base.resonance_chamber_built"
        ]
      },
      {
        "kind": "missing_power",
        "label": "Processing pauses if the station browns out.",
        "relatedIds": [
          "resource.chorus"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "The station is built at the Base.",
        "relatedIds": [
          "tile.base_core"
        ]
      },
      {
        "kind": "power_network",
        "label": "The station only functions when Chorus power is available.",
        "relatedIds": [
          "resource.chorus"
        ]
      }
    ],
    "power": {
      "resourceId": "resource.chorus",
      "upkeepPerSecond": 0.12,
      "manualPower": true,
      "startsRequested": true,
      "fallbackMode": "brownout_lifo"
    },
    "flows": [
      {
        "itemId": "resource.harmonics",
        "label": "Unlocks Harmonics staffing and field-focused processing.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "role.crystal_harmonics",
          "recipe.resonance_field_calibration"
        ]
      },
      {
        "itemId": "resource.chorus",
        "label": "Draws Chorus while requested and powered.",
        "direction": "input",
        "cadence": "while_powered",
        "relatedIds": [
          "resource.chorus"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "power",
        "referenceId": "brownout_lifo",
        "label": "Manual power requests participate in LIFO brownouts."
      },
      {
        "kind": "bubble",
        "referenceId": "resonance_chamber_field_bonus",
        "label": "This station improves field conversion."
      }
    ],
    "notes": []
  },
  {
    "id": "station.mix_console",
    "entityKind": "station",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [
      {
        "kind": "construction",
        "label": "Build Mix Console after the Resonance Chamber.",
        "relatedIds": [
          "base.mix_console_built"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Mix Console is unavailable until built.",
        "relatedIds": [
          "base.mix_console_built"
        ]
      },
      {
        "kind": "missing_power",
        "label": "Processing pauses if the station browns out.",
        "relatedIds": [
          "resource.chorus"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "The station is built at the Base.",
        "relatedIds": [
          "tile.base_core"
        ]
      },
      {
        "kind": "power_network",
        "label": "The station only functions when Chorus power is available.",
        "relatedIds": [
          "resource.chorus"
        ]
      }
    ],
    "power": {
      "resourceId": "resource.chorus",
      "upkeepPerSecond": 0.16,
      "manualPower": true,
      "startsRequested": true,
      "fallbackMode": "brownout_lifo"
    },
    "flows": [
      {
        "itemId": "resource.chorus",
        "label": "Draws Chorus while requested and powered.",
        "direction": "input",
        "cadence": "while_powered",
        "relatedIds": [
          "resource.chorus"
        ]
      },
      {
        "itemId": "resource.harmonics",
        "label": "Raises Harmonics-side processing and brownout tolerance.",
        "direction": "output",
        "cadence": "on_complete",
        "relatedIds": [
          "recipe.mix_signal_balancing"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "power",
        "referenceId": "mix_console_brownout_tolerance",
        "label": "The station improves tolerance to brownouts."
      }
    ],
    "notes": []
  },
  {
    "id": "station.workshop",
    "entityKind": "station",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [
      {
        "kind": "construction",
        "label": "Build Workshop to unlock tools and condensers.",
        "relatedIds": [
          "base.workshop_built"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Workshop is unavailable until built.",
        "relatedIds": [
          "base.workshop_built"
        ]
      },
      {
        "kind": "missing_power",
        "label": "Workshop processing pauses without Chorus power.",
        "relatedIds": [
          "resource.chorus"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "The station is built at the Base.",
        "relatedIds": [
          "tile.base_core"
        ]
      },
      {
        "kind": "power_network",
        "label": "The station only functions when Chorus power is available.",
        "relatedIds": [
          "resource.chorus"
        ]
      }
    ],
    "power": {
      "resourceId": "resource.chorus",
      "upkeepPerSecond": 0.1,
      "manualPower": true,
      "startsRequested": true,
      "fallbackMode": "brownout_lifo"
    },
    "flows": [
      {
        "itemId": "resource.stone",
        "label": "Builder Tools consumes Stone and Water to improve construction speed.",
        "direction": "input",
        "cadence": "on_start",
        "relatedIds": [
          "recipe.workshop_builder_tools"
        ]
      },
      {
        "itemId": "resource.water",
        "label": "Water Condensers improve Water cap and stock regen.",
        "direction": "output",
        "cadence": "on_complete",
        "relatedIds": [
          "recipe.workshop_water_condensers"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "duration",
        "referenceId": "workshop_tooling_speed_bonus_per_level",
        "label": "Workshop research speeds up construction."
      },
      {
        "kind": "storage",
        "referenceId": "workshop_water_cap_per_level",
        "label": "Workshop upgrades expand Water systems."
      }
    ],
    "notes": []
  },
  {
    "id": "station.research_booth",
    "entityKind": "station",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [
      {
        "kind": "construction",
        "label": "Build Research Booth to unlock routing and study recipes.",
        "relatedIds": [
          "base.research_booth_built"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Research Booth is unavailable until built.",
        "relatedIds": [
          "base.research_booth_built"
        ]
      },
      {
        "kind": "missing_power",
        "label": "Research pauses without Chorus power.",
        "relatedIds": [
          "resource.chorus"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "The station is built at the Base.",
        "relatedIds": [
          "tile.base_core"
        ]
      },
      {
        "kind": "power_network",
        "label": "The station only functions when Chorus power is available.",
        "relatedIds": [
          "resource.chorus"
        ]
      }
    ],
    "power": {
      "resourceId": "resource.chorus",
      "upkeepPerSecond": 0.14,
      "manualPower": true,
      "startsRequested": true,
      "fallbackMode": "brownout_lifo"
    },
    "flows": [
      {
        "itemId": "resource.chorus",
        "label": "Chorus Routing reduces life-support Chorus pressure.",
        "direction": "output",
        "cadence": "on_complete",
        "relatedIds": [
          "recipe.research_chorus_routing"
        ]
      },
      {
        "itemId": "resource.harmonics",
        "label": "Harmonic Study lowers the thresholds needed for higher tiers.",
        "direction": "output",
        "cadence": "on_complete",
        "relatedIds": [
          "recipe.research_harmonic_study"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "power",
        "referenceId": "research_chorus_free_staff_per_level",
        "label": "Research can offset some life-support cost."
      },
      {
        "kind": "progression",
        "referenceId": "research_harmonics_threshold_reduction_per_level",
        "label": "Research reduces the Harmonics tier thresholds."
      }
    ],
    "notes": []
  },
  {
    "id": "construction.slot_capacity",
    "entityKind": "construction_option",
    "persistence": null,
    "unlocks": [
      {
        "kind": "construction",
        "label": "Completing this upgrade adds a Crystal slot.",
        "relatedIds": [
          "station.crystal_circle"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_staff",
        "label": "Needs Construction Crew to make progress.",
        "relatedIds": [
          "role.construction"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Needs stored Bassline while builders work.",
        "relatedIds": [
          "resource.bassline"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Crystal upgrades happen at the Base.",
        "relatedIds": [
          "station.crystal_circle"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.bassline",
        "label": "Drains Bassline while builders work.",
        "direction": "input",
        "cadence": "per_worker_second",
        "relatedIds": [
          "resource.bassline"
        ]
      },
      {
        "itemId": "station.crystal_circle",
        "label": "Adds one shared Crystal slot on completion.",
        "direction": "output",
        "cadence": "on_complete",
        "relatedIds": [
          "role.crystal_bassline",
          "role.crystal_chorus",
          "role.crystal_harmonics"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "duration",
        "referenceId": "crystal_level_scaled_duration",
        "label": "Each upgrade level increases duration."
      }
    ],
    "notes": []
  },
  {
    "id": "construction.output",
    "entityKind": "construction_option",
    "persistence": null,
    "unlocks": [],
    "blockers": [
      {
        "kind": "missing_staff",
        "label": "Needs Construction Crew to make progress.",
        "relatedIds": [
          "role.construction"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Needs stored Bassline while builders work.",
        "relatedIds": [
          "resource.bassline"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Crystal upgrades happen at the Base.",
        "relatedIds": [
          "station.crystal_circle"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.bassline",
        "label": "Drains Bassline while builders work.",
        "direction": "input",
        "cadence": "per_worker_second",
        "relatedIds": [
          "resource.bassline"
        ]
      },
      {
        "itemId": "station.crystal_circle",
        "label": "Raises band output on completion.",
        "direction": "output",
        "cadence": "on_complete",
        "relatedIds": [
          "resource.bassline",
          "resource.chorus",
          "resource.harmonics"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "duration",
        "referenceId": "crystal_level_scaled_duration",
        "label": "Each upgrade level increases duration."
      }
    ],
    "notes": []
  },
  {
    "id": "construction.storage",
    "entityKind": "construction_option",
    "persistence": null,
    "unlocks": [],
    "blockers": [
      {
        "kind": "missing_staff",
        "label": "Needs Construction Crew to make progress.",
        "relatedIds": [
          "role.construction"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Needs stored Bassline while builders work.",
        "relatedIds": [
          "resource.bassline"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Crystal upgrades happen at the Base.",
        "relatedIds": [
          "station.crystal_circle"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.bassline",
        "label": "Drains Bassline while builders work.",
        "direction": "input",
        "cadence": "per_worker_second",
        "relatedIds": [
          "resource.bassline"
        ]
      },
      {
        "itemId": "resource.bassline",
        "label": "Raises band storage on completion.",
        "direction": "capacity",
        "cadence": "on_complete",
        "relatedIds": [
          "resource.bassline",
          "resource.chorus",
          "resource.harmonics"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "duration",
        "referenceId": "crystal_level_scaled_duration",
        "label": "Each upgrade level increases duration."
      }
    ],
    "notes": []
  },
  {
    "id": "construction.removing_moss",
    "entityKind": "construction_option",
    "persistence": null,
    "unlocks": [
      {
        "kind": "story",
        "label": "Explore Base to unlock Removing Moss.",
        "relatedIds": [
          "crystal.removing_moss_unlocked"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Explore Base before you can clear the Crystal Circle.",
        "relatedIds": [
          "crystal.removing_moss_unlocked"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Crystal upgrades happen at the Base.",
        "relatedIds": [
          "station.crystal_circle"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.bassline",
        "label": "Unlocks passive Bassline trickle on completion.",
        "direction": "output",
        "cadence": "on_complete",
        "relatedIds": [
          "resource.bassline"
        ]
      }
    ],
    "modelRefs": [],
    "notes": [
      "This is time-only and does not cost Stone."
    ]
  },
  {
    "id": "construction.polish_field",
    "entityKind": "construction_option",
    "persistence": null,
    "unlocks": [
      {
        "kind": "story",
        "label": "Explore Base to unlock Crystal polishing.",
        "relatedIds": [
          "base.tutorial_explored"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_resource",
        "label": "Requires Skin and Water upfront.",
        "relatedIds": [
          "cost.skin",
          "resource.water"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Crystal upgrades happen at the Base.",
        "relatedIds": [
          "station.crystal_circle"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "cost.skin",
        "label": "Consumes Skin at start.",
        "direction": "input",
        "cadence": "on_start",
        "relatedIds": [
          "cost.skin"
        ]
      },
      {
        "itemId": "resource.water",
        "label": "Consumes Water at start.",
        "direction": "input",
        "cadence": "on_start",
        "relatedIds": [
          "resource.water"
        ]
      },
      {
        "itemId": "resource.bassline",
        "label": "Improves field conversion on completion.",
        "direction": "output",
        "cadence": "on_complete",
        "relatedIds": [
          "resource.bassline"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "project.restore_studio",
    "entityKind": "construction_option",
    "persistence": null,
    "unlocks": [
      {
        "kind": "construction",
        "label": "Restoring the Studio unlocks Chorus.",
        "relatedIds": [
          "base.studio_restored"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Investigate and Explore the Base first.",
        "relatedIds": [
          "base.studio_restore_unlocked"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Requires Stone upfront.",
        "relatedIds": [
          "resource.stone"
        ]
      },
      {
        "kind": "missing_staff",
        "label": "Needs Construction Crew to make progress.",
        "relatedIds": [
          "role.construction"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Studio restoration happens at the Base.",
        "relatedIds": [
          "structure.base"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.stone",
        "label": "Consumes Stone at start.",
        "direction": "input",
        "cadence": "on_start",
        "relatedIds": [
          "resource.stone"
        ]
      },
      {
        "itemId": "resource.chorus",
        "label": "Unlocks Chorus staffing and bunks on completion.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "resource.chorus",
          "role.crystal_chorus"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "project.build_fire_pit",
    "entityKind": "construction_option",
    "persistence": null,
    "unlocks": [
      {
        "kind": "construction",
        "label": "Building the Fire Pit unlocks Vibes generation.",
        "relatedIds": [
          "base.fire_pit_built"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_resource",
        "label": "Requires Stone upfront.",
        "relatedIds": [
          "resource.stone"
        ]
      },
      {
        "kind": "missing_staff",
        "label": "Needs Construction Crew to make progress.",
        "relatedIds": [
          "role.construction"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Fire Pit construction happens at the Base.",
        "relatedIds": [
          "structure.base"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.stone",
        "label": "Consumes Stone at start.",
        "direction": "input",
        "cadence": "on_start",
        "relatedIds": [
          "resource.stone"
        ]
      },
      {
        "itemId": "resource.vibes",
        "label": "Unlocks Vibes production on completion.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "resource.vibes",
          "role.fire_pit"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "project.build_resonance_chamber",
    "entityKind": "construction_option",
    "persistence": null,
    "unlocks": [
      {
        "kind": "construction",
        "label": "Building the Resonance Chamber unlocks Harmonics.",
        "relatedIds": [
          "base.resonance_chamber_built"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Restore the Studio first.",
        "relatedIds": [
          "base.studio_restored"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Requires Stone upfront.",
        "relatedIds": [
          "resource.stone"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Base project.",
        "relatedIds": [
          "structure.base"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.harmonics",
        "label": "Unlocks Harmonics staffing and field processing.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "role.crystal_harmonics",
          "station.resonance_chamber"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "project.build_mix_console",
    "entityKind": "construction_option",
    "persistence": null,
    "unlocks": [
      {
        "kind": "construction",
        "label": "Build Mix Console to unlock signal balancing.",
        "relatedIds": [
          "base.mix_console_built"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Requires Studio and Resonance Chamber first.",
        "relatedIds": [
          "base.studio_restored",
          "base.resonance_chamber_built"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Requires Stone upfront.",
        "relatedIds": [
          "resource.stone"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Base project.",
        "relatedIds": [
          "structure.base"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "station.mix_console",
        "label": "Unlocks Mix Console processing.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "recipe.mix_signal_balancing"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "project.build_workshop",
    "entityKind": "construction_option",
    "persistence": null,
    "unlocks": [
      {
        "kind": "construction",
        "label": "Build Workshop to unlock tooling and condenser recipes.",
        "relatedIds": [
          "base.workshop_built"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Restore the Studio first.",
        "relatedIds": [
          "base.studio_restored"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Requires Stone upfront.",
        "relatedIds": [
          "resource.stone"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Base project.",
        "relatedIds": [
          "structure.base"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "station.workshop",
        "label": "Unlocks Workshop processing recipes.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "recipe.workshop_builder_tools",
          "recipe.workshop_water_condensers"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "project.build_research_booth",
    "entityKind": "construction_option",
    "persistence": null,
    "unlocks": [
      {
        "kind": "construction",
        "label": "Build Research Booth to unlock routing and study recipes.",
        "relatedIds": [
          "base.research_booth_built"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Requires Studio and Resonance Chamber first.",
        "relatedIds": [
          "base.studio_restored",
          "base.resonance_chamber_built"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Requires Stone upfront.",
        "relatedIds": [
          "resource.stone"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Base project.",
        "relatedIds": [
          "structure.base"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "station.research_booth",
        "label": "Unlocks Research Booth processing recipes.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "recipe.research_chorus_routing",
          "recipe.research_harmonic_study"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "project.expand_bunks",
    "entityKind": "construction_option",
    "persistence": null,
    "unlocks": [
      {
        "kind": "construction",
        "label": "Adds bunk capacity for safer recruitment.",
        "relatedIds": [
          "base.studio_restored"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Restore the Studio first.",
        "relatedIds": [
          "base.studio_restored"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Requires Stone and Water upfront.",
        "relatedIds": [
          "resource.stone",
          "resource.water"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Base housing project.",
        "relatedIds": [
          "structure.base"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "base.bunks_capacity",
        "label": "Adds five bunks when complete.",
        "direction": "capacity",
        "cadence": "on_complete",
        "relatedIds": [
          "ui.action.recruit"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "project.safe_water_systems",
    "entityKind": "construction_option",
    "persistence": null,
    "unlocks": [
      {
        "kind": "construction",
        "label": "Improves Water handling through Workshop condenser practice.",
        "relatedIds": [
          "base.workshop_built",
          "base.water_collection_unlocked"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Requires the Workshop and Water collection.",
        "relatedIds": [
          "base.workshop_built",
          "base.water_collection_unlocked"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Requires Stone and Water upfront.",
        "relatedIds": [
          "resource.stone",
          "resource.water"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Base support project.",
        "relatedIds": [
          "structure.base"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.water",
        "label": "Improves safe Water capacity and regeneration through condenser level.",
        "direction": "capacity",
        "cadence": "on_complete",
        "relatedIds": [
          "recipe.workshop_water_condensers"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "project.expedition_staging",
    "entityKind": "construction_option",
    "persistence": null,
    "unlocks": [
      {
        "kind": "construction",
        "label": "Prepares field staging for safer expedition reach.",
        "relatedIds": [
          "base.resonance_chamber_built",
          "base.workshop_built"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Requires Resonance Chamber and Workshop.",
        "relatedIds": [
          "base.resonance_chamber_built",
          "base.workshop_built"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Requires Stone and Water upfront.",
        "relatedIds": [
          "resource.stone",
          "resource.water"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Base expedition project.",
        "relatedIds": [
          "structure.base"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "construction.polish_field",
        "label": "Improves field polish when complete.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "resource.bassline"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "project.prepare_loudspeakers",
    "entityKind": "construction_option",
    "persistence": null,
    "unlocks": [
      {
        "kind": "construction",
        "label": "Prepares Chorus relay routing for larger base operations.",
        "relatedIds": [
          "base.research_booth_built"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Requires the Research Booth.",
        "relatedIds": [
          "base.research_booth_built"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Requires Stone and Water upfront.",
        "relatedIds": [
          "resource.stone",
          "resource.water"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "Base relay project.",
        "relatedIds": [
          "structure.base"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "recipe.research_chorus_routing",
        "label": "Improves Chorus routing when complete.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "station.research_booth"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "recipe.resonance_field_calibration",
    "entityKind": "processing_recipe",
    "persistence": null,
    "unlocks": [],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Requires Resonance Chamber.",
        "relatedIds": [
          "base.resonance_chamber_built"
        ]
      },
      {
        "kind": "missing_power",
        "label": "Recipe pauses if the Resonance Chamber loses power.",
        "relatedIds": [
          "station.resonance_chamber"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Consumes Stone and Water upfront.",
        "relatedIds": [
          "resource.stone",
          "resource.water"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "power_network",
        "label": "Requires the Resonance Chamber to stay powered.",
        "relatedIds": [
          "station.resonance_chamber"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.stone",
        "label": "Consumes Stone at start.",
        "direction": "input",
        "cadence": "on_start",
        "relatedIds": [
          "resource.stone"
        ]
      },
      {
        "itemId": "resource.water",
        "label": "Consumes Water at start.",
        "direction": "input",
        "cadence": "on_start",
        "relatedIds": [
          "resource.water"
        ]
      },
      {
        "itemId": "resource.bassline",
        "label": "Improves field conversion on completion.",
        "direction": "output",
        "cadence": "on_complete",
        "relatedIds": [
          "resource.bassline"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "power",
        "referenceId": "resonance_processing_field_bonus_per_level",
        "label": "Each level improves field conversion."
      }
    ],
    "notes": []
  },
  {
    "id": "recipe.mix_signal_balancing",
    "entityKind": "processing_recipe",
    "persistence": null,
    "unlocks": [],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Requires Mix Console.",
        "relatedIds": [
          "base.mix_console_built"
        ]
      },
      {
        "kind": "missing_power",
        "label": "Recipe pauses if the Mix Console loses power.",
        "relatedIds": [
          "station.mix_console"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Consumes Stone and Water upfront.",
        "relatedIds": [
          "resource.stone",
          "resource.water"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "power_network",
        "label": "Requires the Mix Console to stay powered.",
        "relatedIds": [
          "station.mix_console"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.harmonics",
        "label": "Improves Harmonics-side efficiency on completion.",
        "direction": "output",
        "cadence": "on_complete",
        "relatedIds": [
          "resource.harmonics"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "power",
        "referenceId": "mix_processing_harmonics_bonus_per_level",
        "label": "Each level improves Harmonics efficiency."
      }
    ],
    "notes": []
  },
  {
    "id": "recipe.workshop_builder_tools",
    "entityKind": "processing_recipe",
    "persistence": null,
    "unlocks": [],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Requires Workshop.",
        "relatedIds": [
          "base.workshop_built"
        ]
      },
      {
        "kind": "missing_power",
        "label": "Recipe pauses if the Workshop loses power.",
        "relatedIds": [
          "station.workshop"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Consumes Stone and Water upfront.",
        "relatedIds": [
          "resource.stone",
          "resource.water"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "power_network",
        "label": "Requires the Workshop to stay powered.",
        "relatedIds": [
          "station.workshop"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "role.construction",
        "label": "Raises construction speed on completion.",
        "direction": "output",
        "cadence": "on_complete",
        "relatedIds": [
          "role.construction"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "duration",
        "referenceId": "workshop_tooling_speed_bonus_per_level",
        "label": "Each level speeds up construction."
      }
    ],
    "notes": []
  },
  {
    "id": "recipe.workshop_water_condensers",
    "entityKind": "processing_recipe",
    "persistence": null,
    "unlocks": [],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Requires Workshop.",
        "relatedIds": [
          "base.workshop_built"
        ]
      },
      {
        "kind": "missing_power",
        "label": "Recipe pauses if the Workshop loses power.",
        "relatedIds": [
          "station.workshop"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Consumes Stone and Water upfront.",
        "relatedIds": [
          "resource.stone",
          "resource.water"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "power_network",
        "label": "Requires the Workshop to stay powered.",
        "relatedIds": [
          "station.workshop"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.water",
        "label": "Improves Water cap and stock regeneration on completion.",
        "direction": "capacity",
        "cadence": "on_complete",
        "relatedIds": [
          "resource.water"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "storage",
        "referenceId": "workshop_water_cap_per_level",
        "label": "Each level expands Water capacity and stock regen."
      }
    ],
    "notes": []
  },
  {
    "id": "recipe.research_chorus_routing",
    "entityKind": "processing_recipe",
    "persistence": null,
    "unlocks": [],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Requires Research Booth.",
        "relatedIds": [
          "base.research_booth_built"
        ]
      },
      {
        "kind": "missing_power",
        "label": "Recipe pauses if the Research Booth loses power.",
        "relatedIds": [
          "station.research_booth"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Consumes Stone and Water upfront.",
        "relatedIds": [
          "resource.stone",
          "resource.water"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "power_network",
        "label": "Requires the Research Booth to stay powered.",
        "relatedIds": [
          "station.research_booth"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.chorus",
        "label": "Reduces life-support Chorus upkeep on completion.",
        "direction": "output",
        "cadence": "on_complete",
        "relatedIds": [
          "resource.chorus"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "power",
        "referenceId": "research_chorus_free_staff_per_level",
        "label": "Each level offsets some Chorus life-support pressure."
      }
    ],
    "notes": []
  },
  {
    "id": "recipe.research_harmonic_study",
    "entityKind": "processing_recipe",
    "persistence": null,
    "unlocks": [],
    "blockers": [
      {
        "kind": "missing_requirement",
        "label": "Requires Research Booth.",
        "relatedIds": [
          "base.research_booth_built"
        ]
      },
      {
        "kind": "missing_power",
        "label": "Recipe pauses if the Research Booth loses power.",
        "relatedIds": [
          "station.research_booth"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Consumes Stone and Water upfront.",
        "relatedIds": [
          "resource.stone",
          "resource.water"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "power_network",
        "label": "Requires the Research Booth to stay powered.",
        "relatedIds": [
          "station.research_booth"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.harmonics",
        "label": "Lowers Harmonics thresholds on completion.",
        "direction": "output",
        "cadence": "on_complete",
        "relatedIds": [
          "resource.harmonics"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "progression",
        "referenceId": "research_harmonics_threshold_reduction_per_level",
        "label": "Each level lowers Harmonics tier thresholds."
      }
    ],
    "notes": []
  },
  {
    "id": "world_action.investigate_base",
    "entityKind": "world_action",
    "persistence": null,
    "unlocks": [
      {
        "kind": "story",
        "label": "Finishing Investigate unlocks Explore.",
        "relatedIds": [
          "base.tutorial_investigated"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "offline_disabled",
        "label": "Investigate only progresses while online.",
        "relatedIds": [
          "world_action.investigate_base"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "This action is performed on the Base tile.",
        "relatedIds": [
          "tile.base_core"
        ]
      },
      {
        "kind": "hero_only",
        "label": "Only the Hero can perform this action.",
        "relatedIds": [
          "world_action.investigate_base"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "world_action.explore_base",
        "label": "Unlocks Explore Base on completion.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "world_action.explore_base"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "world_action.explore_base",
    "entityKind": "world_action",
    "persistence": null,
    "unlocks": [
      {
        "kind": "story",
        "label": "Unlocks Restore Studio.",
        "relatedIds": [
          "base.studio_restore_unlocked"
        ]
      },
      {
        "kind": "story",
        "label": "Unlocks Removing Moss and Water collection.",
        "relatedIds": [
          "crystal.removing_moss_unlocked",
          "base.water_collection_unlocked"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "offline_disabled",
        "label": "Explore only progresses while online.",
        "relatedIds": [
          "world_action.explore_base"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "This action is performed on the Base tile.",
        "relatedIds": [
          "tile.base_core"
        ]
      },
      {
        "kind": "hero_only",
        "label": "Only the Hero can perform this action.",
        "relatedIds": [
          "world_action.explore_base"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "base.studio_restore_unlocked",
        "label": "Unlocks restoration and the first persistent utility loops.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "project.restore_studio",
          "construction.removing_moss",
          "resource.water"
        ]
      }
    ],
    "modelRefs": [],
    "notes": [
      "This action also grants the first Skin and opens the early Base economy."
    ]
  },
  {
    "id": "story.beat.road_to_base",
    "entityKind": "story_beat",
    "persistence": {
      "scope": "content",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [
      {
        "kind": "story",
        "label": "Sets up the first glimpse of the Base.",
        "relatedIds": [
          "story.beat.first_glimpse",
          "tile.base_core"
        ]
      }
    ],
    "blockers": [],
    "accessRules": [
      {
        "kind": "story_unlocked",
        "label": "This beat establishes the arrival path into the playable space.",
        "relatedIds": [
          "story.beat.first_glimpse",
          "structure.base"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "story.beat.first_glimpse",
        "label": "Leads into the Base reveal sequence.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "story.beat.first_glimpse"
        ]
      }
    ],
    "modelRefs": [],
    "notes": [
      "Pre-arrival story beat used to frame the start of the game."
    ]
  },
  {
    "id": "story.beat.hero_exposed",
    "entityKind": "story_beat",
    "persistence": {
      "scope": "content",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [],
    "blockers": [],
    "accessRules": [],
    "power": null,
    "flows": [],
    "modelRefs": [],
    "notes": [
      "Reactive ambient storylet: interrupts the active beat when the Hero is caught outside the bubble after onboarding."
    ]
  },
  {
    "id": "story.beat.first_glimpse",
    "entityKind": "story_beat",
    "persistence": {
      "scope": "content",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [
      {
        "kind": "story",
        "label": "Frames the bubble before the player steps into it.",
        "relatedIds": [
          "story.beat.enter_the_bubble",
          "structure.crystal_circle"
        ]
      }
    ],
    "blockers": [],
    "accessRules": [
      {
        "kind": "story_unlocked",
        "label": "The Base and Crystal Circle must already exist in the scene framing.",
        "relatedIds": [
          "tile.ridge_line",
          "tile.base_core"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "story.beat.enter_the_bubble",
        "label": "Leads into the player crossing into safety.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "story.beat.enter_the_bubble"
        ]
      }
    ],
    "modelRefs": [],
    "notes": [
      "Pre-arrival story beat used for the first visual reveal of the sanctuary."
    ]
  },
  {
    "id": "story.beat.enter_the_bubble",
    "entityKind": "story_beat",
    "persistence": {
      "scope": "content",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [
      {
        "kind": "story",
        "label": "Hands off into the first base interaction.",
        "relatedIds": [
          "story.beat.investigate_base",
          "world_action.investigate_base"
        ]
      }
    ],
    "blockers": [],
    "accessRules": [
      {
        "kind": "bubble_required",
        "label": "This beat depends on the Crystal bubble being legible as safety.",
        "relatedIds": [
          "resource.bassline",
          "station.crystal_circle"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "world_action.investigate_base",
        "label": "Transitions into the first actionable world step.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "world_action.investigate_base",
          "story.beat.investigate_base"
        ]
      }
    ],
    "modelRefs": [],
    "notes": [
      "Pre-arrival story beat used to transition from arrival to interaction."
    ]
  },
  {
    "id": "story.beat.investigate_base",
    "entityKind": "story_beat",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [
      {
        "kind": "story",
        "label": "Completing this beat opens Explore Base.",
        "relatedIds": [
          "world_action.explore_base",
          "story.beat.explore_base"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "busy",
        "label": "The Hero must be free to investigate the Base.",
        "relatedIds": [
          "world_action.investigate_base"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "This beat happens entirely on the Base tile.",
        "relatedIds": [
          "structure.base",
          "tile.base_core"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "world_action.investigate_base",
        "label": "Uses the Investigate Base action as its playable step.",
        "direction": "unlock",
        "cadence": "while_staffed",
        "relatedIds": [
          "world_action.investigate_base"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "story.beat.explore_base",
    "entityKind": "story_beat",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [
      {
        "kind": "story",
        "label": "Completing this beat unlocks real repairs and utilities.",
        "relatedIds": [
          "project.restore_studio",
          "story.beat.restore_studio",
          "construction.removing_moss",
          "resource.water"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "busy",
        "label": "The Hero must be free to explore the Base.",
        "relatedIds": [
          "world_action.explore_base"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "This beat happens entirely on the Base tile.",
        "relatedIds": [
          "structure.base",
          "tile.base_core"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "world_action.explore_base",
        "label": "Uses the Explore Base action as its playable step.",
        "direction": "unlock",
        "cadence": "while_staffed",
        "relatedIds": [
          "world_action.explore_base"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "story.beat.restore_studio",
    "entityKind": "story_beat",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [
      {
        "kind": "construction",
        "label": "Restoring the Studio opens Chorus and the first power loop.",
        "relatedIds": [
          "resource.chorus",
          "station.crystal_circle",
          "story.beat.build_fire_pit",
          "project.build_fire_pit"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_resource",
        "label": "Stone is required before the Studio can be repaired.",
        "relatedIds": [
          "project.restore_studio",
          "resource.stone"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "The Studio is part of the Base footprint.",
        "relatedIds": [
          "structure.base"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "project.restore_studio",
        "label": "Uses the Restore Studio construction project.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "project.restore_studio"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "story.beat.build_fire_pit",
    "entityKind": "story_beat",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [
      {
        "kind": "station",
        "label": "Building the Fire Pit opens the first social output loop.",
        "relatedIds": [
          "station.fire_pit",
          "story.beat.first_recruit",
          "ui.action.recruit"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_resource",
        "label": "Stone is required before the Fire Pit can be built.",
        "relatedIds": [
          "project.build_fire_pit",
          "resource.stone"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "The Fire Pit is constructed in the Base camp.",
        "relatedIds": [
          "structure.base",
          "station.fire_pit"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "project.build_fire_pit",
        "label": "Uses the Build Fire Pit construction project.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "project.build_fire_pit"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "story.beat.reach_survivor_cave",
    "entityKind": "story_beat",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [
      {
        "kind": "reach",
        "label": "Extending the bubble to the cave opens the first recruitment attempt.",
        "relatedIds": [
          "ui.map.cave_gate",
          "tile.survivor_cave",
          "story.beat.first_recruit",
          "ui.action.recruit"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "reach_locked",
        "label": "Stored Bassline must sustain enough bubble reach to connect to the cave.",
        "relatedIds": [
          "resource.bassline",
          "tile.survivor_cave",
          "ui.map.cave_gate"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "bubble_required",
        "label": "This beat depends on the active bubble reaching the Survivor Cave.",
        "relatedIds": [
          "resource.bassline",
          "tile.survivor_cave"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "ui.map.cave_gate",
        "label": "Uses the current bubble budget to push the frontier to the cave.",
        "direction": "unlock",
        "cadence": "while_powered",
        "relatedIds": [
          "ui.map.cave_gate",
          "tile.survivor_cave"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "story.beat.first_recruit",
    "entityKind": "story_beat",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [
      {
        "kind": "reach",
        "label": "First recruitment proves the base loop can now grow outward.",
        "relatedIds": [
          "ui.status.base.recruits",
          "tile.survivor_cave",
          "ui.map.cave_gate"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "reach_locked",
        "label": "The bubble must reach the Survivor Cave before recruiting.",
        "relatedIds": [
          "tile.survivor_cave",
          "ui.action.recruit"
        ]
      },
      {
        "kind": "missing_resource",
        "label": "Enough Vibes are required before a recruit will join.",
        "relatedIds": [
          "resource.vibes",
          "ui.action.recruit"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "reach_required",
        "label": "Recruitment depends on bubble reach and the Survivor Cave connection.",
        "relatedIds": [
          "tile.survivor_cave",
          "ui.map.cave_gate"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "ui.action.recruit",
        "label": "Uses the recruit action after the cave is in reach.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "ui.action.recruit"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "story.beat.await_survivor_arrival",
    "entityKind": "story_beat",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [
      {
        "kind": "story",
        "label": "The pending recruit transitions the first arc into base stabilization.",
        "relatedIds": [
          "ui.status.base.recruits",
          "story.beat.stabilize_base"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "busy",
        "label": "The recruit is already traveling back to the Base.",
        "relatedIds": [
          "ui.status.base.recruits"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "reach_required",
        "label": "This beat exists only once recruitment has actually started.",
        "relatedIds": [
          "ui.action.recruit",
          "ui.status.base.recruits"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "ui.status.base.recruits",
        "label": "Tracks the first recruit while they travel to the Base.",
        "direction": "unlock",
        "cadence": "per_second",
        "relatedIds": [
          "ui.status.base.recruits"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "story.beat.stabilize_base",
    "entityKind": "story_beat",
    "persistence": {
      "scope": "save_slot",
      "tuningAffinity": "tuned",
      "resetsOnTuning": true
    },
    "unlocks": [
      {
        "kind": "power",
        "label": "The first arc hands off into a wider power, staffing, and processing game.",
        "relatedIds": [
          "ui.panel.power",
          "ui.panel.base",
          "resource.chorus",
          "resource.harmonics"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "missing_power",
        "label": "Brownouts or weak housing stability will limit this next phase.",
        "relatedIds": [
          "ui.panel.power",
          "ui.status.base.housing"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "This beat is about optimizing the Base after the first recruit arrives.",
        "relatedIds": [
          "structure.base",
          "ui.panel.base"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "ui.panel.power",
        "label": "Expands into the broader idle game of power, staffing, and processing.",
        "direction": "unlock",
        "cadence": "on_complete",
        "relatedIds": [
          "ui.panel.power",
          "ui.panel.base"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "tile.base_core",
    "entityKind": "tile",
    "persistence": {
      "scope": "content",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [],
    "blockers": [],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "The Base Core anchors all starting systems.",
        "relatedIds": [
          "structure.base",
          "structure.crystal_circle"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.stone",
        "label": "Hosts Base scavenging.",
        "direction": "output",
        "cadence": "while_staffed",
        "relatedIds": [
          "role.scavenge"
        ]
      },
      {
        "itemId": "resource.water",
        "label": "Hosts Base Water collection.",
        "direction": "output",
        "cadence": "while_staffed",
        "relatedIds": [
          "role.water"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "tile.plains_open",
    "entityKind": "tile",
    "persistence": {
      "scope": "content",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [],
    "blockers": [],
    "accessRules": [
      {
        "kind": "not_blocked",
        "label": "Open terrain with no special access gate.",
        "relatedIds": [
          "tile.plains_open"
        ]
      }
    ],
    "power": null,
    "flows": [],
    "modelRefs": [
      {
        "kind": "terrain",
        "referenceId": "terrain_impedance",
        "label": "Plains use the baseline impedance profile."
      }
    ],
    "notes": []
  },
  {
    "id": "tile.river_shallows",
    "entityKind": "tile",
    "persistence": {
      "scope": "content",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [],
    "blockers": [],
    "accessRules": [
      {
        "kind": "not_blocked",
        "label": "River tiles stay traversable and propagate the bubble efficiently.",
        "relatedIds": [
          "tile.river_shallows"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.water",
        "label": "The river profile supports Water theming and future harvestables.",
        "direction": "output",
        "cadence": "passive",
        "relatedIds": [
          "resource.water",
          "flora.reeds"
        ]
      }
    ],
    "modelRefs": [
      {
        "kind": "terrain",
        "referenceId": "terrain_impedance",
        "label": "River tiles use low impedance."
      }
    ],
    "notes": []
  },
  {
    "id": "tile.scrub_patch",
    "entityKind": "tile",
    "persistence": {
      "scope": "content",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [],
    "blockers": [],
    "accessRules": [
      {
        "kind": "not_blocked",
        "label": "Scrub tiles stay accessible but cost more bubble budget.",
        "relatedIds": [
          "tile.scrub_patch"
        ]
      }
    ],
    "power": null,
    "flows": [],
    "modelRefs": [
      {
        "kind": "terrain",
        "referenceId": "terrain_impedance",
        "label": "Scrub tiles use elevated impedance."
      }
    ],
    "notes": []
  },
  {
    "id": "tile.ridge_line",
    "entityKind": "tile",
    "persistence": {
      "scope": "content",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [],
    "blockers": [],
    "accessRules": [
      {
        "kind": "not_blocked",
        "label": "Ridge tiles are reachable but expensive for the bubble.",
        "relatedIds": [
          "tile.ridge_line"
        ]
      }
    ],
    "power": null,
    "flows": [],
    "modelRefs": [
      {
        "kind": "terrain",
        "referenceId": "terrain_impedance",
        "label": "Ridge tiles use high impedance."
      }
    ],
    "notes": []
  },
  {
    "id": "tile.mountain_wall",
    "entityKind": "tile",
    "persistence": {
      "scope": "content",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [],
    "blockers": [
      {
        "kind": "inaccessible",
        "label": "Mountains are hard blockers for the bubble in the current model.",
        "relatedIds": [
          "tile.mountain_wall"
        ]
      },
      {
        "kind": "occluded",
        "label": "Mountains are the first terrain intended to cast shadow later.",
        "relatedIds": [
          "tile.mountain_wall"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "not_blocked",
        "label": "Future systems may reduce impedance or route around this blocker.",
        "relatedIds": [
          "tile.mountain_wall"
        ]
      }
    ],
    "power": null,
    "flows": [],
    "modelRefs": [
      {
        "kind": "terrain",
        "referenceId": "terrain_impedance",
        "label": "Mountains use blocker-level impedance."
      }
    ],
    "notes": []
  },
  {
    "id": "tile.survivor_cave",
    "entityKind": "tile",
    "persistence": {
      "scope": "content",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [
      {
        "kind": "reach",
        "label": "Bubble reach unlocks recruitment at the Survivor Cave.",
        "relatedIds": [
          "resource.vibes"
        ]
      }
    ],
    "blockers": [
      {
        "kind": "reach_locked",
        "label": "The cave only activates when the bubble reaches the recruitment threshold.",
        "relatedIds": [
          "resource.bassline"
        ]
      }
    ],
    "accessRules": [
      {
        "kind": "reach_required",
        "label": "Requires sufficient bubble reach from the Base.",
        "relatedIds": [
          "resource.bassline"
        ]
      },
      {
        "kind": "bubble_required",
        "label": "Recruitment only opens while the cave is inside the bubble.",
        "relatedIds": [
          "resource.bassline"
        ]
      }
    ],
    "power": null,
    "flows": [
      {
        "itemId": "resource.vibes",
        "label": "Recruitment spends Vibes when the cave gate is open.",
        "direction": "input",
        "cadence": "on_start",
        "relatedIds": [
          "resource.vibes"
        ]
      }
    ],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "flora.reeds",
    "entityKind": "flora",
    "persistence": {
      "scope": "content",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [],
    "blockers": [],
    "accessRules": [],
    "power": null,
    "flows": [],
    "modelRefs": [],
    "notes": [
      "Static content tag for river-adjacent vegetation."
    ]
  },
  {
    "id": "flora.scrub",
    "entityKind": "flora",
    "persistence": {
      "scope": "content",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [],
    "blockers": [],
    "accessRules": [],
    "power": null,
    "flows": [],
    "modelRefs": [],
    "notes": [
      "Static content tag for scrub harvestables and atmosphere."
    ]
  },
  {
    "id": "structure.crystal_circle",
    "entityKind": "structure",
    "persistence": {
      "scope": "content",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [],
    "blockers": [],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "The Crystal Circle is fixed to the Base Core in the current prototype.",
        "relatedIds": [
          "tile.base_core"
        ]
      }
    ],
    "power": null,
    "flows": [],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "structure.base",
    "entityKind": "structure",
    "persistence": {
      "scope": "content",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [],
    "blockers": [],
    "accessRules": [
      {
        "kind": "base_only",
        "label": "The Base is the root structure of the current prototype.",
        "relatedIds": [
          "tile.base_core"
        ]
      }
    ],
    "power": null,
    "flows": [],
    "modelRefs": [],
    "notes": []
  },
  {
    "id": "structure.cave",
    "entityKind": "structure",
    "persistence": {
      "scope": "content",
      "tuningAffinity": "untuned",
      "resetsOnTuning": false
    },
    "unlocks": [],
    "blockers": [
      {
        "kind": "reach_locked",
        "label": "The cave matters once bubble reach is high enough.",
        "relatedIds": [
          "tile.survivor_cave"
        ]
      }
    ],
    "accessRules": [],
    "power": null,
    "flows": [],
    "modelRefs": [],
    "notes": []
  }
]
