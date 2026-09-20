import type { ProcessingRecipeDef } from "@aedventure/add-protocol"

// Authored content: processing recipes (source of truth). codegen -> Rust `const PROCESSING_RECIPES`.
const fixed = (seconds: number) => ({ kind: "fixed" as const, seconds })

export const PROCESSING_RECIPES: readonly ProcessingRecipeDef[] = [
  {
    id: "recipe.resonance_field_calibration", schemaId: "recipe.resonance_field_calibration", label: "Field Calibration", stationId: "station.resonance_chamber",
    cost: { kind: "upfront_bundle", costs: [{ item_id: "resource.stone", amount: 80 }, { item_id: "resource.water", amount: 1 }] },
    duration: fixed(10),
    requirements: [{ kind: "flag_set", flag_id: "base.resonance_chamber_built" }],
    effects: [{ kind: "increment_processing_track", track: "resonance_calibration", amount: 1 }],
    maxLevel: 5, uiOrder: 10,
  },
  {
    id: "recipe.mix_signal_balancing", schemaId: "recipe.mix_signal_balancing", label: "Signal Balancing", stationId: "station.mix_console",
    cost: { kind: "upfront_bundle", costs: [{ item_id: "resource.stone", amount: 120 }, { item_id: "resource.water", amount: 2 }] },
    duration: fixed(12),
    requirements: [{ kind: "flag_set", flag_id: "base.mix_console_built" }],
    effects: [{ kind: "increment_processing_track", track: "mix_calibration", amount: 1 }],
    maxLevel: 5, uiOrder: 20,
  },
  {
    id: "recipe.workshop_builder_tools", schemaId: "recipe.workshop_builder_tools", label: "Builder Tools", stationId: "station.workshop",
    cost: { kind: "upfront_bundle", costs: [{ item_id: "resource.stone", amount: 100 }, { item_id: "resource.water", amount: 2 }] },
    duration: fixed(14),
    requirements: [{ kind: "flag_set", flag_id: "base.workshop_built" }],
    effects: [{ kind: "increment_processing_track", track: "workshop_tooling", amount: 1 }],
    maxLevel: 5, uiOrder: 30,
  },
  {
    id: "recipe.workshop_water_condensers", schemaId: "recipe.workshop_water_condensers", label: "Water Condensers", stationId: "station.workshop",
    cost: { kind: "upfront_bundle", costs: [{ item_id: "resource.stone", amount: 70 }, { item_id: "resource.water", amount: 2 }] },
    duration: fixed(12),
    requirements: [{ kind: "flag_set", flag_id: "base.workshop_built" }],
    effects: [{ kind: "increment_processing_track", track: "workshop_water_condensers", amount: 1 }],
    maxLevel: 5, uiOrder: 40,
  },
  {
    id: "recipe.research_chorus_routing", schemaId: "recipe.research_chorus_routing", label: "Chorus Routing", stationId: "station.research_booth",
    cost: { kind: "upfront_bundle", costs: [{ item_id: "resource.stone", amount: 140 }, { item_id: "resource.water", amount: 1 }] },
    duration: fixed(16),
    requirements: [{ kind: "flag_set", flag_id: "base.research_booth_built" }],
    effects: [{ kind: "increment_processing_track", track: "research_chorus_routing", amount: 1 }],
    maxLevel: 5, uiOrder: 50,
  },
  {
    id: "recipe.research_harmonic_study", schemaId: "recipe.research_harmonic_study", label: "Harmonic Study", stationId: "station.research_booth",
    cost: { kind: "upfront_bundle", costs: [{ item_id: "resource.stone", amount: 180 }, { item_id: "resource.water", amount: 2 }] },
    duration: fixed(18),
    requirements: [{ kind: "flag_set", flag_id: "base.research_booth_built" }],
    effects: [{ kind: "increment_processing_track", track: "research_harmonic_study", amount: 1 }],
    maxLevel: 5, uiOrder: 60,
  },
]
