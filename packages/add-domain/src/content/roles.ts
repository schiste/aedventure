import type { RoleDef } from "@aedventure/add-protocol"

// Authored content: the role catalog (source of truth). `content:build` codegens
// the Rust `const ROLES` from this module.
export const ROLES: readonly RoleDef[] = [
  { id: "role.crystal_bassline", schemaId: "role.crystal_bassline", label: "Crystal: Bassline", slotPool: "crystal_circle", heroAllowed: true, crewAllowed: true, maxCrewSlots: null, uiSection: "crystal", uiOrder: 10 },
  { id: "role.crystal_chorus", schemaId: "role.crystal_chorus", label: "Crystal: Chorus", slotPool: "crystal_circle", heroAllowed: true, crewAllowed: true, maxCrewSlots: null, uiSection: "crystal", uiOrder: 20 },
  { id: "role.crystal_harmonics", schemaId: "role.crystal_harmonics", label: "Crystal: Harmonics", slotPool: "crystal_circle", heroAllowed: true, crewAllowed: true, maxCrewSlots: null, uiSection: "crystal", uiOrder: 30 },
  { id: "role.construction", schemaId: "role.construction", label: "Construction", slotPool: "base", heroAllowed: true, crewAllowed: true, maxCrewSlots: null, uiSection: "construction", uiOrder: 40 },
  { id: "role.fire_pit", schemaId: "role.fire_pit", label: "Fire Pit: Vibes", slotPool: "fire_pit", heroAllowed: true, crewAllowed: true, maxCrewSlots: 2, uiSection: "base", uiOrder: 30 },
  { id: "role.scavenge", schemaId: "role.scavenge", label: "Base: Scavenge", slotPool: "base", heroAllowed: true, crewAllowed: true, maxCrewSlots: null, uiSection: "base", uiOrder: 40 },
  { id: "role.water", schemaId: "role.water", label: "Base: Water", slotPool: "base", heroAllowed: true, crewAllowed: true, maxCrewSlots: null, uiSection: "base", uiOrder: 50 },
]
