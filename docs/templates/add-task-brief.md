# ADD Task Brief

Use this template for a gameplay, content, tooling, or engine task in the ADD
lane. A brief is ready for implementation only when each section has a concrete
answer or explicitly says `none`.

## Player outcome

What should the player be able to do, understand, or feel after this change?

## Authoritative layer

- Owning layer/path:
- Authoritative state or rule:
- Browser/domain/renderer consumers:
- Why this boundary is correct:

Use the [ADD Capability Map](../add-capability-map.md) to choose the layer.

## Affected content IDs

List every existing or new stable ID touched by the task. Include content
families even when no new ID is added.

- IDs:
- Families:
- Legacy references consulted:

## Acceptance scenarios

Write observable scenarios, preferably as deterministic commands and expected
state or player-facing outcomes.

1. Given ... when ... then ...
2. Given ... when ... then ...

## Focused verification

- First command:
- Additional command(s):
- Browser/screenshot/state evidence, if presentation changes:

## Likely follow-up

What remains intentionally out of scope, and what future task should pick it
up?

## Scope guard

Confirm that the task:

- extends the existing `apps/add-rpg` game when it is an ADD feature;
- keeps gameplay mutation in Rust and content authoring in the declared layer;
- does not add speculative shared infrastructure without a current consumer;
- does not turn legacy/reference material into a live dependency.
