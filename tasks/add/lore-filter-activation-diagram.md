# Lore filter activation diagram

## Player outcome

Lore readers can follow how the satellite cascade created the Filter and how the resulting silence activated Hush-2.

## Authoritative layer

- Owning layer/path: Canon in `lore/the-truth.md` and `lore/timeline_events.md`; page presentation in `lore/filter-flow.md` and `lore/.vitepress/theme/FilterFlow.vue`.
- Authoritative state or rule: The lore files define the event sequence and its biological consequence.
- Browser/domain/renderer consumers: The VitePress lore site renders a reader-facing sequence; the game runtime does not consume it.
- Why this boundary is correct: This explains established world canon and does not change gameplay state or authored game content.

## Affected content IDs

- IDs: none; no stable gameplay IDs are added or changed.
- Families: Filter mechanism, satellite cascade, Hush-2 canon.
- Legacy references consulted: none.

## Acceptance scenarios

1. Given the documented satellite cascade, when a reader opens `/filter-flow`, then the page presents the damage, compensation, harmonic interference, dampening field, and Filter activation in order.
2. Given the canonical timeline, when the page is built, then its dates and Hush-2 consequence agree with `lore/the-truth.md` and `lore/timeline_events.md`.

## Focused verification

- First command: `npm run lore:check`
- Additional command(s): `npm run lore:site:build`; `npm run agent:verify`
- Browser/screenshot/state evidence, if presentation changes: VitePress production build confirms the route and Vue component compile; no in-game screenshot applies.

## Acceptance evidence (required before completion)

- Scenario/replay artifact: none; this is lore presentation and has no gameplay scenario.
- Focused command/result artifact: Focused runner result: `artifacts/agent-verification/20260929194418711-focused-78566/result.json` (passed). The site build produced `lore/.vitepress/dist/filter-flow.html`.
- Player-facing evidence (if applicable): No in-game surface is changed; the reader-facing lore route compiled to `lore/.vitepress/dist/filter-flow.html`.
- Remaining risk or explicit reason: No browser screenshot was captured. VitePress emitted a non-blocking large-chunk advisory; the production route rendered successfully.

## Likely follow-up

If the Filter becomes structured claim data, link the diagram stages to those claims. Keep the prose canon in the existing lore files.

## Scope guard

- Extends the existing lore site; it does not add another ADD app.
- Keeps gameplay mutation in Rust and adds no gameplay mutation.
- Adds no stable gameplay content IDs.
- Adds one presentation component for its current page and no speculative shared infrastructure.
- Does not make legacy/reference material a live dependency.
