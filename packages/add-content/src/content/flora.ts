import type { FloraDef } from "@aedventure/add-protocol"

// Authored content: the flora catalog (source of truth). codegen -> Rust `const FLORA`.
export const FLORA: readonly FloraDef[] = [
  { id: "flora.reeds", schemaId: "flora.reeds", label: "Reeds", kind: "reeds", tags: ["water_source", "easy_propagation"] },
  { id: "flora.scrub", schemaId: "flora.scrub", label: "Scrub", kind: "scrub", tags: ["brush", "harvestable"] },
]
