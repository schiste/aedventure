# Canon decision matrix

> Working document for the canon-cleaning session. This is not canon and must not be used as a lore article.
>
> Sources compared: `LORE_REVISION_v2.md`, `the-truth.md`, `timeline.md`, `data/canon.json`, `data/events.json`, `data/claims.json` and `data/entities/survival_groups.json`.

## Confirmed anchors

| Topic | Current reading | Evidence | Status |
|---|---|---|---|
| Day 0 | 14 October 2034 | `data/canon.json`, `the-truth.md` | Confirmed |
| Year 1 AS | 15 October 2034 | `data/canon.json` | Confirmed |
| Present | 311 AS = 2345 CE | `data/canon.json`, `the-truth.md` | Confirmed |
| Initial survival | The first survivors are underground: caves, bunkers, mines and metro systems | `LORE_REVISION_v2.md`, `the-truth.md` | Confirmed |
| Filter protection | Rock and depth protect from the satellite effect; ordinary surface sound does not | `the-truth.md`, `LORE_REVISION_v2.md` | Confirmed |
| Hush-2 protection | Continuous sound suppresses or delays the biological threat | `the-truth.md`, `data/claims.json` | Reported/canon boundary to preserve |
| Crystal origin | Crystals are an emergent consequence of Filter standing-wave nodes, not part of Operation Lullaby | `the-truth.md`, `LORE_REVISION_v2.md` | Confirmed |
| Crystal growth | Growth is progressive rather than instantaneous | `the-truth.md`, `LORE_REVISION_v2.md` | Confirmed in principle |
| Resilients | A mutation gives extended surface tolerance, not full immunity | `the-truth.md`, `LORE_REVISION_v2.md` | Confirmed in principle |
| Current population | Approximately two million humans | `the-truth.md`, `LORE_REVISION_v2.md` | Canonical working figure |

## Decisions required before rewriting

| ID | Question | Conflicting readings | Recommended working resolution | Status |
|---|---|---|---|---|
| D-01 | Can a normal human survive on the surface after the early centuries? | `Surface = death` versus Sacrifice Cities and later surface settlements | Surface remains lethal outside a functioning Crystal bubble. Early survival is exclusively underground. Later local surface life requires a Crystal and is rare. | Decided |
| D-02 | What replaced the Sacrifice Cities concept? | `LORE_REVISION_v2.md` describes stable surface expansion through sound infrastructure, which conflicts with the Filter rule | Replace the name and concept with **Surface Recovery Expeditions**: each community defines its own lightweight protocol, with regional traditions spreading between settlements. Standard survival windows remain 4 hours for ordinary humans and 24 hours for Resilients, but a local leader may exceptionally authorize exceeding the window when the expected value justifies the risk. Noise may help keep Hush-2 dormant, but never protects against the Filter. Expeditions may discover Crystals, enabling limited late surface recolonization. | Decided |
| D-03 | When do Crystals become materially present? | `the-truth.md` places a first discovery around 2041 CE, while the revision describes microscopic formations from Day 1 and viable Crystals much later | Crystals become materially present around 200 AS. Earlier formations are unknown or not observable. The 2041 event is removed from the structured chronology. | Decided |
| D-04 | What does `surface = death` mean? | Absolute slogan versus later Crystal bubbles | Use the precise rule: unprotected surface is lethal; a functioning Crystal creates a bounded exception, not a general recolonization of the surface | Decided |
| D-05 | How should sound and depth be separated? | Some passages make sound appear to protect from both Filter and Hush-2 | Depth protects from the Filter. Continuous sound protects against Hush-2. Neither mechanism replaces the other | Decided |
| D-06 | Are the population distributions canonical? | Revision gives underground, Sacrifice City and Crystal settlement percentages that depend on D-02 | Keep approximately two million humans in 311 AS. Do not assign a canonical distribution between underground communities and Crystal bubbles yet. | Decided, distribution pending |
| D-07 | What is the status of the three Crystal Wars? | Revision describes them as developed history, while some surrounding material remains proposal-like | Keep them as reported history until their sources and affected timeline pages are rewritten | Recommended |
| D-08 | What is the status of the two survival groups? | Structured records mark both groups as `draft` | Keep both as `draft` until their sources, populations and founding events are fully documented | Confirmed by data |
| D-09 | When can a Crystal sustain a surface bubble? | Earlier pages imply usable Crystals before the approved chronology | Use 290 AS as a working date only. The canonical bound remains after 250 AS until the first viable bubble is documented. | Working date, not canon |
| D-10 | How are expedition teams composed? | A generic Resilient-led model would erase regional cultures and constraints | Communities may use ordinary humans, Resilients or mixed teams according to their population, beliefs, history and local rules. No role is universal. | Decided |
| D-11 | How are discovered Crystals validated and governed? | A standard scientific validation process would be implausible for communities isolated for centuries | There is no universal process. Communities document, test, protect, worship, hide, trade or fight over Crystals according to their own knowledge and political traditions. A Crystal's status is local and may be misunderstood by outsiders. | Decided |
## Immediate rewrite consequences

After D-01 to D-04 are decided:

1. Rewrite `the-truth.md` as the concise authority page.
2. Rewrite `timeline.md` so its dates and surface history follow that authority.
3. Rewrite the five quiet-century files from the approved chronology.
4. Move the historical decision log out of the reader path or label it explicitly as superseded history.
5. Recalculate the population distribution and update the structured data only where the decision requires it.
6. Re-run `npm run lore:check` and the Quartz build.

## Rules for this cleanup

- This matrix records uncertainty. It does not resolve it silently.
- No page is deleted because it disagrees with the revision log.
- A replaced rule remains documented as historical context until its references are migrated.
- A missing source creates a work item, not an invented citation.
- The first rewrite pass changes authority pages only. Factions, characters and archives come afterwards.
