import type { ResourceDef } from "@aedventure/add-protocol"

// Authored content: the resource catalog. This TS module is the single source of
// truth; `npm run content:build` codegens the Rust `const RESOURCES` from it.
// Keep purely declarative (no logic) so it stays portable across targets.
export const RESOURCES: readonly ResourceDef[] = [
  { id: "resource.bassline", schemaId: "resource.bassline", label: "Bassline", category: "band", baseCap: 90, capBehavior: "overflow_lost", startsAt: 0 },
  { id: "resource.chorus", schemaId: "resource.chorus", label: "Chorus", category: "band", baseCap: 60, capBehavior: "overflow_lost", startsAt: 0 },
  { id: "resource.harmonics", schemaId: "resource.harmonics", label: "Harmonics", category: "band", baseCap: 40, capBehavior: "overflow_lost", startsAt: 0 },
  { id: "resource.stone", schemaId: "resource.stone", label: "Stone", category: "material", baseCap: 1000, capBehavior: "blocked_at_cap", startsAt: 0 },
  { id: "resource.water", schemaId: "resource.water", label: "Water", category: "material", baseCap: 5, capBehavior: "blocked_at_cap", startsAt: 0 },
  { id: "resource.vibes", schemaId: "resource.vibes", label: "Vibes", category: "run_scoped_pool", baseCap: 100, capBehavior: "overflow_lost", startsAt: 0 },
]
