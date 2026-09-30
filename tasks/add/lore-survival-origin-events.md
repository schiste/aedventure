# ADD Task Brief: Reconcile survival-group origin events

## Player outcome

Lore readers can follow the Day 0 origins and reported sound-continuity
observations of the Ardèche and Mponeng survivor groups through source-linked
records. Conflicting or incomplete timing stays marked as draft rather than
being promoted to canon.

## Authoritative layer

- Owning layer/path: `lore/data/events.json`, `lore/data/claims.json`, `lore/data/relations.json`, `lore/data/entities/survival_groups.json`, `lore/data/sources.json`, and `tools/lore_check.py`.
- Authoritative state or rule: Structured lore event IDs, dates, status, and provenance; editorial prose remains in the cited Markdown pages.
- Browser/domain/renderer consumers: The local lore site and lore validation tools; no gameplay runtime consumer.
- Why this boundary is correct: These are world-history facts and provenance records, not ADD simulation rules or authored gameplay content.

## Affected content IDs

- IDs: `event.the-silence`, `event.activation-alpha`, `event.ardeche-arrival`, `event.mponeng-first-night`, `event.first-underground-stabilization`, `event.first-crystal`, `claim.sound-continuity-protects`, `claim.sound-protection`, `survival-group.ardeche-unplugged`, `survival-group.mponeng-mine`, `group.ardeche-unplugged`, `group.mponeng-deep`, `source.mponeng-chronicle`.
- Families: Events, claims, relations, sources, survival-group origins.
- Legacy references consulted: `event.activation-protocol-alpha` is replaced by the existing `event.activation-alpha`; `source.the-truth` is replaced by the existing `source.truth`.

## Acceptance scenarios

1. Given the survival-group origin references, when their event IDs are read from structured data, then each referenced event exists in `events.json`.
2. Given conflicting Ardèche arrival times and an incomplete Mponeng first-night account, when the origin events are recorded, then they retain day-level dates, draft status, and notes that describe the unresolved evidence.
3. Given the early population chronology and the later global stabilization estimate, when the early stabilization period is recorded, then it remains a broad draft range and is distinguished from the later estimate.
4. Given the reported cross-group sound observation, when the structured claim and relations are read, then both groups link to a reported claim that retains the source limits and unknown threshold.
5. Given a survival-group event or observation reference, when `npm run lore:check` runs, then references to missing event or claim IDs are reported as errors.

## Focused verification

- First command: `npm run lore:check`.
- Additional command(s): None; `lore:check` now verifies survival-group event references.
- Browser/screenshot/state evidence, if presentation changes: None; this changes structured lore only.

## Acceptance evidence

- Scenario/replay artifact: None; no gameplay scenario applies to lore records.
- Focused command/result artifact: `npm run lore:check` passed with 2,098 Markdown links checked, 0 broken links, 23 structured records, and 0 structured conflicts.
- Player-facing evidence: None; no rendered layout or game presentation changed.
- Remaining risk or explicit reason: The Ardèche time and exact Mponeng first-night chronology remain unresolved and are explicitly marked as draft.

## Likely follow-up

Reconcile the conflicting arrival timestamps against the primary lore sources and promote only the facts that the evidence supports.

## Scope guard

- This is a lore-only task; it does not add or change an ADD feature in `apps/add-rpg`.
- Gameplay mutation remains in Rust; no gameplay mutation changed.
- No shared infrastructure was added.
- Legacy lore prose was consulted as source material only and was not made a live runtime dependency.
