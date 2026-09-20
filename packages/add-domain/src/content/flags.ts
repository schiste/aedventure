import type { FlagDef } from "@aedventure/add-protocol"

// Authored content: the flag catalog (source of truth). `id` is the raw flag key
// (the Rust id-const is FLAG_<UPPER_SNAKE> of it). codegen -> Rust `const FLAGS`.
export const FLAGS: readonly FlagDef[] = [
  { id: "base.studio_restore_unlocked", label: "Studio Repair Unlocked", group: "base" },
  { id: "base.studio_restored", label: "Studio Restored", group: "base" },
  { id: "base.fire_pit_built", label: "Fire Pit Built", group: "base" },
  { id: "base.resonance_chamber_built", label: "Resonance Chamber Built", group: "base" },
  { id: "base.mix_console_built", label: "Mix Console Built", group: "base" },
  { id: "base.workshop_built", label: "Workshop Built", group: "base" },
  { id: "base.research_booth_built", label: "Research Booth Built", group: "base" },
  { id: "base.tutorial_investigated", label: "Base Investigated", group: "tutorial" },
  { id: "base.tutorial_explored", label: "Base Explored", group: "tutorial" },
  { id: "base.water_collection_unlocked", label: "Water Collection Unlocked", group: "base" },
  { id: "crystal.removing_moss_unlocked", label: "Removing Moss Unlocked", group: "crystal" },
  { id: "crystal.removing_moss_completed", label: "Removing Moss Completed", group: "crystal" },
  { id: "hero.outside_bubble", label: "Hero Outside Bubble", group: "hero" },
  { id: "hero.forced_return_active", label: "Forced Return Active", group: "hero" },
  { id: "hero.recovering_at_studio", label: "Recovering At Studio", group: "hero" },
]
