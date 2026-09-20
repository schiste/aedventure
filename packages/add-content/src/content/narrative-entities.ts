// Authored content: the narrative entity graph. codegen -> Rust `NARRATIVE_ENTITIES`.
//
// Who exists and who they belong to. The engine owns how far a group's view of
// the Hero reaches into its members (see crates/add-core/src/narrative/graph.rs);
// this file owns only the shape of the graph.
//
// `kind` is structure, not values: it sets inheritance and shared blame. Every
// entity that stands for a lore subject is linked in content/lore-refs.ts, so
// `npm run lore:refs:check` can report canon the game cannot yet show.

export type NarrativeGroupKind =
  | "individual"
  | "family"
  | "belief_group"
  | "crew"
  | "survival_faction"
  | "loose_association"

export interface NarrativeEntityDef {
  readonly id: string
  readonly label: string
  readonly kind: NarrativeGroupKind
  /** The group this entity belongs to, or null at the top of the graph. */
  readonly parent: string | null
  /** Standing in the group; raises the latitude a deviant is given. */
  readonly rank: number
  /** How far this individual's own view leaks up into their group, 0 to 1. */
  readonly influence: number
}

export const NARRATIVE_ENTITIES: readonly NarrativeEntityDef[] = [
  {
    id: "entity.sleepless",
    label: "Sleepless in Decibels",
    kind: "survival_faction",
    parent: null,
    rank: 0,
    influence: 0,
  },
  {
    id: "entity.sleepless.sounding_five",
    label: "The Sounding Five",
    kind: "crew",
    parent: "entity.sleepless",
    rank: 3,
    influence: 0.6,
  },
  {
    id: "entity.vell",
    label: "David Chen",
    kind: "individual",
    parent: "entity.sleepless.sounding_five",
    rank: 3,
    influence: 0.7,
  },
  {
    id: "entity.joren",
    label: "Kaylee Lindquist",
    kind: "individual",
    parent: "entity.sleepless.sounding_five",
    rank: 1,
    influence: 0.3,
  },
]

export function narrativeEntityById(id: string): NarrativeEntityDef | undefined {
  return NARRATIVE_ENTITIES.find((entity) => entity.id === id)
}
