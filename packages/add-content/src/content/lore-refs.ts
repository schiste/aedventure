// Authored content -> lore canon links. See docs/lore-engine-content-bricks.md.
//
// This is the one edge between the lore brick and the content brick, and it
// points in one direction only: content cites lore. Lore never cites content;
// the navigation back from a lore page is generated, not authored.
//
// These links are authoring metadata. They are deliberately *not* part of any
// content definition and are never code-generated into Rust, because the
// engine must be able to run without knowing that lore exists.
//
// A reference is a repository-relative path to a lore page, optionally with a
// `#anchor` naming a heading inside it. `npm run lore:refs:check` fails on a
// path or anchor that does not resolve, and reports both sides of the gap:
// content with no canon behind it, and canon the game cannot yet show.

export interface LoreRef {
  /** A stable content ID, as `npm run content:explain -- <id>` resolves it. */
  readonly contentId: string
  /** Repository-relative lore page, optionally `path.md#heading-anchor`. */
  readonly loreRef: string
  /** Why this link is true, when the mapping is not obvious from the names. */
  readonly note?: string
}

/**
 * Content families where an unlinked ID is worth reporting.
 *
 * Deliberately narrow. A resource, creature, structure, tile, station, item,
 * area or story beat is a thing the world has an opinion about, so a missing
 * link is a real gap. A UI element, flag or entity schema is machinery, and
 * demanding canon for it would only manufacture busywork.
 */
export const LORE_LINKED_FAMILIES: readonly string[] = [
  "area",
  "narrative_entity",
  "creature",
  "dungeon",
  "item",
  "resource",
  "station",
  "story_beat",
  "structure",
  "tile",
]

export const LORE_REFS: readonly LoreRef[] = [
  {
    contentId: "entity.sleepless",
    loreRef: "lore/factions/sleepless_in_decibels/README.md",
    note: "The Telegram group the faction descends from.",
  },
  {
    contentId: "entity.sleepless.sounding_five",
    loreRef: "lore/factions/sleepless_in_decibels/telegram_archives/channels/sounding_five/README.md",
    note: "The private channel that became the inner crew.",
  },
  {
    contentId: "entity.vell",
    loreRef: "lore/characters/sleepless_members/david_chen_tiredintoulouse.md",
  },
  {
    contentId: "entity.joren",
    loreRef: "lore/characters/sleepless_members/kaylee_lindquist_the_raver.md",
  },
  {
    contentId: "entity.decibella",
    loreRef: "lore/factions/sleepless_in_decibels/telegram_archives/private/naptimeinja_x_decibella/README.md",
    note: "Her voice is archived in the private channels; no standalone page yet.",
  },
  {
    contentId: "entity.cribrocker",
    loreRef: "lore/factions/sleepless_in_decibels/telegram_archives/private/cribrocker_x_decibella/README.md",
    note: "As above: the archives are the canon source for this handle.",
  },
  {
    contentId: "entity.naptimeninja",
    loreRef: "lore/factions/sleepless_in_decibels/telegram_archives/private/naptimeinja_x_cribrocker/README.md",
    note: "As above.",
  },
  {
    contentId: "structure.base",
    loreRef: "lore/locations/touraine/studio_echo.md",
    note: "Studio Echo is the Hero's Base settlement.",
  },
  {
    contentId: "tile.base_core",
    loreRef: "lore/locations/touraine/studio_echo.md#quick-reference",
  },
  {
    contentId: "structure.crystal_circle",
    loreRef: "lore/locations/touraine/studio_echo.md#the-crystal",
    note: "The crystal formation the Base is built around.",
  },
  {
    contentId: "structure.cave",
    loreRef: "lore/locations/touraine/les_grottes_de_la_bresme.md",
    note: "Les Grottes de la Bresme is the Survivors Cave.",
  },
  {
    contentId: "tile.survivor_cave",
    loreRef: "lore/locations/touraine/les_grottes_de_la_bresme.md#game-reference-data",
  },
]

export function loreRefForContentId(contentId: string): LoreRef | undefined {
  return LORE_REFS.find((entry) => entry.contentId === contentId)
}
