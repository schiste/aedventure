# ADD Task Brief: Restore headroom in the ADD asset-size budget

## Player outcome

Players can receive the current ADD build through the normal publishing path,
while the asset check continues to catch meaningful bundle growth.

## Authoritative layer

- Owning layer/path: `performance/add-budgets.json` and `scripts/add-rpg-size-report.cjs`.
- Authoritative state or rule: `add-performance-budgets-v1.size.totalNonAudioAssetBytes` caps emitted non-audio browser assets; encoded audio has its own budget.
- Browser/domain/renderer consumers: `scripts/add-rpg-size-report.cjs --strict`, called by `scripts/verify-add-stack.sh`.
- Why this boundary is correct: This is build-output policy; it does not change ADD runtime behavior or authored game content.

## Affected content IDs

- IDs: `add-performance-budgets-v1`, `totalNonAudioAssetBytes`.
- Families: ADD performance budgets, emitted browser assets.
- Legacy references consulted: None.

## Acceptance scenarios

1. Given the current production bundle measured at 4,002,726 bytes, when the strict size report runs, then it passes under the 4,205,000-byte ceiling and reports the other metrics unchanged.
2. Given future non-audio output above 4,205,000 bytes, when the strict size report runs, then it fails the budget check.

## Focused verification

- First command: `npm run qa:add-rpg:size:built`.
- Additional command(s): None; this command measures the existing production build output.
- Browser/screenshot/state evidence, if presentation changes: None; no runtime or visual asset changed.

## Acceptance evidence

- Scenario/replay artifact: None; this changes build policy only.
- Focused command/result artifact: Pending `npm run qa:add-rpg:size:built`.
- Player-facing evidence (if applicable): None; rendered game assets are unchanged.
- Remaining risk or explicit reason: The limit now has about 5% headroom over the measured baseline; continued growth still needs monitoring and may require asset optimization.

## Likely follow-up

Review emitted asset growth at each size-budget change and optimize the largest assets before they approach the updated ceiling.

## Scope guard

- This changes ADD build verification policy only; runtime behavior and authored game content remain unchanged.
- Gameplay mutation remains in Rust; no gameplay mutation changed.
- No shared infrastructure was added.
- Legacy/reference material was not made a live runtime dependency.
