import type { StationDef } from "@aedventure/add-protocol"

// Authored content: the station catalog (source of truth). codegen -> Rust `const STATIONS`.
export const STATIONS: readonly StationDef[] = [
  { id: "station.crystal_circle", schemaId: "station.crystal_circle", label: "Crystal Circle", category: "crystal", chorusUpkeepPerSecond: 0.0, manualPower: false, startsRequested: true, requirements: [], uiOrder: 10 },
  { id: "station.fire_pit", schemaId: "station.fire_pit", label: "Fire Pit", category: "social", chorusUpkeepPerSecond: 0.0, manualPower: false, startsRequested: true, requirements: [{ kind: "flag_set", flag_id: "base.fire_pit_built" }], uiOrder: 20 },
  { id: "station.resonance_chamber", schemaId: "station.resonance_chamber", label: "Resonance Chamber", category: "power", chorusUpkeepPerSecond: 0.12, manualPower: true, startsRequested: true, requirements: [{ kind: "flag_set", flag_id: "base.resonance_chamber_built" }], uiOrder: 30 },
  { id: "station.mix_console", schemaId: "station.mix_console", label: "Mix Console", category: "tuning", chorusUpkeepPerSecond: 0.16, manualPower: true, startsRequested: true, requirements: [{ kind: "flag_set", flag_id: "base.mix_console_built" }], uiOrder: 40 },
  { id: "station.workshop", schemaId: "station.workshop", label: "Workshop", category: "crafting", chorusUpkeepPerSecond: 0.1, manualPower: true, startsRequested: true, requirements: [{ kind: "flag_set", flag_id: "base.workshop_built" }], uiOrder: 50 },
  { id: "station.research_booth", schemaId: "station.research_booth", label: "Research Booth", category: "research", chorusUpkeepPerSecond: 0.14, manualPower: true, startsRequested: true, requirements: [{ kind: "flag_set", flag_id: "base.research_booth_built" }], uiOrder: 60 },
]
