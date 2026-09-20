import type { StructureDef } from "@aedventure/add-protocol"

// Authored content: the structure catalog (source of truth). codegen -> Rust `const STRUCTURES`.
export const STRUCTURES: readonly StructureDef[] = [
  { id: "structure.crystal_circle", schemaId: "structure.crystal_circle", label: "Crystal Circle", kind: "crystal_circle", tags: ["base", "sanctuary", "construction_anchor"] },
  { id: "structure.base", schemaId: "structure.base", label: "Base", kind: "base", tags: ["base", "sanctuary", "construction_anchor"] },
  { id: "structure.cave", schemaId: "structure.cave", label: "Cave", kind: "cave", tags: ["landmark", "recruitment_source"] },
]
