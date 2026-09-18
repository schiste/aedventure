# Les Grottes de la Bresme

> **The Survivors Cave — Where humanity endured The Silence.**
>
> **Location:** Saint-Etienne-de-Chigny, Indre-et-Loire, France
>
> **Related:** [studio_echo.md](studio_echo.md) | [saint_etienne_de_chigny.md](saint_etienne_de_chigny.md) | [../README.md](../README.md)

---

## Game Reference Data

> **Cross-references:** [../README.md](../README.md) (world scale & hex mapping) | [../../../legacy/add/mechanics/specifications.md](../../../legacy/add/mechanics/specifications.md) section 3.4.1 | `crates/core/src/state.rs` | `crates/core/src/game_data.rs`

```
LOCATION: Les Grottes de la Bresme (Survivors Cave)
GAME_ID: tile.survivor_cave
HEX: (6, 0) — 6 tiles / 24 km due east of Base
TILE_FEATURE: SurvivorCave
TERRAIN: Plains (cave entrances in tuffeau cliffs along river valley)

REAL_WORLD:
  Commune: Saint-Etienne-de-Chigny, Indre-et-Loire, France
  Coordinates: ~47.38°N, 0.42°E
  Geology: Tuffeau limestone, Bresme river valley cliffs

RECRUITMENT_MECHANICS:
  Cave Distance: 6 tiles (SURVIVOR_CAVE_Q=6, SURVIVOR_CAVE_R=0)
  Recruitment Range: 3 tiles (RECRUITMENT_RANGE_TILES=3)
  Gate Opens When: bubble reach >= 3 (cave_distance - reach <= range)
  Normal Human Survival: 4 in-world hours (4s real) outside bubble
  Coherence: 6 tiles - 3 tile range = reach 3 needed
             3 tiles * 1 hour/tile = 3 hour walk < 4 hour lethal window
  Recruit Travel: 6s normal, 1s instant (from pre-positioned stock)
  Prerequisites: Studio restored + Fire Pit built + reach >= 3

STORY_BEATS:
  - story.beat.reach_survivor_cave (bubble reaches cave proximity)
  - story.beat.first_recruit (first crew member recruited)
  - story.beat.await_survivor_arrival (recruit in transit)

RELATED_UI:
  - ui.map.cave_gate (map marker showing recruitment gate)
  - ui.action.recruit (recruitment action button)
  - ui.status.base_recruits (recruit status display)
```

---

## Overview

**Les Grottes de la Bresme** (The Bresme Caves) is a network of natural and man-made caves carved into the tuffeau limestone cliffs along the Bresme river valley. Before The Silence, parts of the system were:

- Active wine cellars (Caves de la Bresme winery)
- Abandoned mushroom farms (champignonnieres)
- Historic troglodyte dwellings (some still inhabited)
- Forgotten quarry tunnels (medieval stone extraction)

After The Silence, it became the **Survivors Cave** — the main settlement for The Unplugged and their descendants.

---

## Pre-Silence History

### Natural Formation

The Bresme river carved through the Gatine Tourangelle plateau over millions of years, exposing soft tuffeau limestone cliffs. The limestone's properties — soft enough to carve, hard enough to last — made it ideal for:

- Stone quarrying (chateau construction)
- Wine storage (constant 12C temperature)
- Human habitation (comfortable year-round)

### Human Modification (Medieval - 2034)

| Period | Activity | Legacy |
|--------|----------|--------|
| 12th-15th c. | Quarrying for chateau construction | Deep tunnels, large chambers |
| 16th-18th c. | Wine cellar development | Climate-controlled storage |
| 19th c. | Mushroom farming expansion | Agricultural infrastructure |
| 20th c. | Partial abandonment | Forgotten passages |
| 2010s | Tourism, artisan winemaking | Maintained access |

### The Marchand Connection

**Georges and Madeleine Marchand** were born in Saint-Etienne-de-Chigny in the 1930s. They lived in a traditional troglodyte house — *"La Demeure aux Tilleuls"* — carved into the cliff above the Bresme.

Their grandson **Henri Marchand** spent every summer there from 1985-1998. Georges taught him:

- Which caves connected to which
- Where underground water flowed
- How to navigate in darkness
- Which tunnels were stable, which were not
- The old quarrymen's marks that showed safe passages
- That May 1968 was "the death of civilization" (Georges was *very* clear on this point)

When Madeleine died in 2019, the family sold the property. But Henri kept his grandfather's hand-drawn maps. He kept the memories of endless summer explorations.

He also inherited **The Collection**.

He kept the key to humanity's survival.

---

### The Marchand Vinyl Collection

Among the supplies Henri transported to the caves was a wooden crate his father had been trying to throw away for thirty years: **Georges and Madeleine's vinyl collection**.

**The Rules (according to Georges, 1932-2015):**

> "Real music ended in May 1968. After that? Noise. Chaos. The students ruined everything."

Georges and Madeleine's collection contains **347 vinyl records**, all French music released before May 1968. Not a single record after. Georges was philosophically committed to this position. Madeleine thought he was being ridiculous but loved him anyway.

**The Collection Includes:**

| Artist | Notable Albums | Georges's Opinion |
|--------|----------------|-------------------|
| **Edith Piaf** | *La Vie en Rose*, *Non, je ne regrette rien* | "The voice of France herself" |
| **Charles Trenet** | *La Mer*, *Douce France* | "A poet. A true poet." |
| **Jacques Brel** | *Ne me quitte pas*, *Amsterdam* | "Belgian, but we forgive him" |
| **Georges Brassens** | *Les Copains d'abord*, *Chanson pour l'Auvergnat* | "The only Georges who matters" |
| **Yves Montand** | *Les Feuilles mortes*, *A Paris* | "Before he became political" |
| **Gilbert Becaud** | *Et maintenant*, *Nathalie* | "Acceptable" |
| **Juliette Greco** | *Sous le ciel de Paris* | "Madeleine's favorite" (eye roll) |
| **Tino Rossi** | *Petit Papa Noel*, various | "For Christmas ONLY" |
| **Maurice Chevalier** | *Valentine*, *Louise* | "My mother loved him" |
| **Charles Aznavour** | Early works only | "Good until '65, then he got weird" |
| **Serge Gainsbourg** | Pre-1968 only | "Before he lost his mind" |
| **Francoise Hardy** | *Tous les garcons et les filles* | "The only acceptable modern woman" |
| **Johnny Hallyday** | Early yé-yé period | "American nonsense, but Madeleine insisted" |

**What's Conspicuously Missing:**

- Anything after May 1968
- Any rock music (except early Johnny, under protest)
- Any English-language music
- Any music Georges deemed "too loud" (ironic, given circumstances)

**The Post-Silence Situation:**

The Marchand Collection is now the **only recorded music** in Les Grottes de la Bresme.

This means:
- Community gatherings feature exclusively pre-1968 French chanson
- Children born after The Silence think *La Mer* is "the fast one"
- Edith Piaf's *Non, je ne regrette rien* has become an unofficial anthem (the irony is lost on no one)
- There is an ongoing theological debate about whether Johnny Hallyday counts as "real music"
- Someone scratched *Petit Papa Noel* and there was nearly a schism
- The record player is maintained with religious devotion
- Georges Brassens's *Les Copains d'abord* ("Friends First") is played at every funeral

**The Great Vinyl Debate of Year 4 AS:**

A surface expedition recovered a crate of records from a collapsed house. Contents: 1970s French disco, prog rock, and — worst of all — *an entire collection of Claude Francois*.

The community voted 34-28 to destroy them.

Marc Delacroix abstained. He still feels guilty about it.

**Current Status:**

| Item | Condition | Notes |
|------|-----------|-------|
| Vinyl records | 312 playable (35 damaged) | Treat like sacred relics |
| Record player | Functional | Hand-cranked backup ready |
| Spare needles | 7 remaining | CRITICAL RESOURCE |
| Speakers | 1 functional | Second one for parts |

**Ongoing Missions:**

- "Operation Aiguille" — Any expedition that finds record player needles is considered a success regardless of other outcomes
- Standing bounty: One week's extra rations for a working needle
- Rumored needle cache in Tours music shop (high-risk, high-reward)

**The Children's Situation:**

Kids born in the caves know every word to *La Vie en Rose* but have never heard anything written after their grandparents were born. They think:

- Charles Trenet is "upbeat modern music"
- Jacques Brel is "intense experimental stuff"
- Johnny Hallyday is "controversial alternative"

They have no idea.

---

## The Unplugged Preparations (2031-2034)

When The Unplugged began serious preparations in late 2031, Henri proposed the Bresme caves. His arguments:

1. **Depth** — Some tunnels reached 50+ meters underground
2. **Stability** — Centuries-old quarry work proved structural integrity
3. **Climate** — Constant 12C, no heating/cooling needed
4. **Water** — Underground streams provided fresh water
5. **Secrecy** — Remote location, multiple entrances
6. **Expansion** — Soft limestone allowed further excavation

### Key Preparations

| Year | Action | Led By | Result |
|------|--------|--------|--------|
| 2032 | Initial survey | Henri | Mapped 4km of accessible tunnels |
| 2032 | Water source identification | Henri | Located 3 underground springs |
| 2032 | Supply caching | @QuietDad_FR funds | 6 months food stored |
| 2033 | Emergency shelter build-out | Group effort | Sleeping for 50 |
| 2033 | Ventilation assessment | Engineer member | Natural airflow mapped |
| 2034 | Final preparations | Henri + core group | Full evacuation ready |

### @QuietDad_FR's Contributions

Marc Delacroix, secretly @QuietDad_FR, funneled approximately €15,000 into The Unplugged's preparations. His suggestions — always framed as "paranoid prepper talk" — included:

- "Go deeper than you think you need" (50m minimum)
- "Store drums and noisemakers" (acoustic defense)
- "Multiple exits, always" (escape routes)
- "Water matters more than food" (underground springs)

Henri never understood why Marc was so specific. He followed the advice anyway.

---

## Cave System Layout

### Depth Zones

| Zone | Depth | Original Use | Current Use |
|------|-------|--------------|-------------|
| Surface (0-10m) | Entrance, light wells | Tourism, access | Lookout, airlock |
| Shallow (10-25m) | Wine cellars, dwellings | Storage, secondary shelter | Workshop, storage |
| Mid (25-40m) | Mushroom farms | Agriculture | Agriculture, living |
| Deep (40-60m) | Old quarries | Emergency refuge | Primary residence |
| Abyss (60m+) | Unexplored | Unknown | Expansion potential |

### Key Chambers

| Chamber | Depth | Capacity | Function | Name Origin |
|---------|-------|----------|----------|-------------|
| **The Entrance Hall** | 5m | 20 | Security checkpoint | Self-explanatory |
| **The Wine Cathedral** | 15m | 100 | Community gathering | Vaulted ceiling; 2,000 empty bottles |
| **La Salle Piaf** | 20m | 40 | Music/recreation room | Where the record player lives |
| **The Mushroom Garden** | 30m | — | Food production | Smells exactly like you'd expect |
| **The Spring Chamber** | 35m | — | Water source | Acoustics make everything sound holy |
| **The Sanctuary** | 45m | 80 | Primary residence | Henri named it; it stuck |
| **The Deep Refuge** | 55m | 30 | Emergency shelter | "The Panic Room" (unofficial) |
| **The Echo Room** | 25m | — | **FORBIDDEN** | See below |
| **Le Petit Conservatoire** | 40m | 15 | Instrument storage/practice | Named after TV show Madeleine loved |

### The Echo Room (Why We Don't Go There)

At 25 meters depth, a natural acoustic anomaly creates a chamber where sound behaves... wrong. A whisper becomes a shout. A footstep becomes thunder. The geometry of the limestone creates standing waves that amplify and distort.

Before The Silence, it was a curiosity — Georges used to take young Henri there to demonstrate "what happens when you don't respect the caves."

After The Silence, it's **forbidden territory**.

The Echo Room is marked with the quarrymen's danger symbol and three newer additions:
- A painted skull (Year 1 AS)
- The words "NE PAS ENTRER" in red (Year 2 AS)
- A cartoon of someone's head exploding (Year 3 AS, artist unknown, surprisingly effective)

**The Incident:**

In Year 2 AS, a teenager named Thomas snuck into The Echo Room to impress a girl. He clapped his hands once.

The amplified sound attracted *something* from a connected surface passage.

Thomas survived. The girl survived. Two rescue party members did not.

No one has entered The Echo Room since.

The girl married someone else.

### La Salle Piaf (The Music Room)

Named after Edith Piaf, this chamber houses:
- The sacred record player
- The Marchand Collection (climate-controlled alcove)
- A hand-painted mural of Georges and Madeleine (artistic quality: enthusiastic)
- Seating for 40 (mismatched chairs salvaged over years)
- **The Needle Cabinet** — locked, guarded, inventoried weekly

**Schedule:**
- Sunday evenings: Community listening (rotating selection committee)
- Weddings: *La Vie en Rose* (mandatory)
- Funerals: *Les Copains d'abord* (tradition)
- Birthdays: Requester's choice (within The Collection)
- Christmas: *Petit Papa Noel* — unless you're the one who scratched it, then you're banned

**The Sound Rules:**

Music in La Salle Piaf is allowed because:
1. It's deep enough (20m) that surface transmission is negligible
2. The chamber has natural sound dampening
3. It's good for morale
4. Georges Brassens would have wanted it that way

Volume is strictly controlled. There is a painted line on the wall. If the needle moves past the line, the Vinyl Guardian (elected position, taken very seriously) stops the music.

No one argues with the Vinyl Guardian.

### The Sanctuary (Primary Living Area)

At 45 meters depth, The Sanctuary is the heart of the Survivors Cave:

- Constant 12C temperature
- Natural ventilation through connected tunnels
- Underground spring 50m away
- Multiple exit routes
- Sound transmission negligible from surface
- Carved alcoves for family units
- Central gathering space

---

## The Silence and Evacuation

### September 15, 2034

Marc Delacroix drove to Lyon and revealed himself as @QuietDad_FR to Henri. He asked to join The Unplugged with his family, saying only: "Something's coming. Soon."

Henri's response: "The drums. The cave depth. That was you."

Henri never asked why Marc knew.

### October 1-13, 2034

The Unplugged began quiet evacuation:
- 47 adults, 31 children made it to the caves
- Final supplies transported
- Surface entrances concealed
- Communication equipment stored (useless after)

### October 14, 2034 — The Silence

At 3:47 AM local time, Hush activated globally.

Inside the Bresme caves, 50+ meters underground, the survivors heard nothing. They felt nothing. They waited.

Above them, the world ended.

---

## Post-Silence Status

### Year 1 AS (After Silence)

- 78 survivors in initial group
- Henri Marchand died (heart condition, Month 3)
- Marc Delacroix assumed leadership
- First surface expeditions (catastrophic losses)
- Discovered acoustic defense potential of drums

### Year 3 AS

- Population stabilized at ~60
- Studio Echo discovered and secured
- Trade route established with other survivor pockets
- Expansion of agricultural caverns begun

### Year 10 AS (Current Era)

- Population: ~120
- Multiple satellite shelters connected
- Sustainable agriculture established
- New generation born entirely underground
- Marc Delacroix elderly, passing knowledge to successors

---

## Resources

### Natural Resources

| Resource | Location | Status |
|----------|----------|--------|
| Fresh water | Spring Chamber | Abundant |
| Limestone | Throughout | Unlimited |
| Clay | Deep tunnels | Moderate |
| Fungi/mushrooms | Mushroom Garden | Cultivated |

### Stored Resources (from preparations)

| Category | Pre-Silence Amount | Current Status |
|----------|-------------------|----------------|
| Preserved food | 6 months supply | Depleted/replaced |
| Medical supplies | Basic kit | Critical shortage |
| Tools | Comprehensive | Wearing out |
| Seeds | Varied | Growing successfully |
| Drums/noisemakers | 15 instruments | Essential defense |

### Salvaged Resources (from expeditions)

*Variable — depends on successful expeditions to surface*

---

## Dangers

### Internal Threats

| Threat | Description | Mitigation |
|--------|-------------|------------|
| Cave-in | Unstable sections exist | Marked and avoided |
| Flooding | Seasonal water level rise | Drainage channels |
| Bad air | CO2 buildup in dead-ends | Ventilation mapping |
| Isolation madness | Psychological stress | Community rituals |

### External Threats

| Threat | Description | Mitigation |
|--------|-------------|------------|
| Surface incursion | Threats following sound | Acoustic discipline |
| Entrance discovery | Exposed access points | Concealment, traps |
| Resource depletion | Can't grow everything underground | Surface expeditions |

---

## Cultural Significance

### The Founding Myth

To later generations, Les Grottes de la Bresme is sacred ground. The story of Henri Marchand's grandparents — how their troglodyte heritage saved humanity — is taught to every child.

The fact that Henri's knowledge came from summer vacations, not mystical destiny, doesn't diminish its power. Sometimes survival is built on small things: a grandfather's patience, a child's curiosity, maps drawn on scrap paper.

And a very stubborn opinion about May 1968.

### The Marchand Shrine

A small alcove near The Sanctuary holds:
- Georges Marchand's hand-drawn cave maps
- Madeleine Marchand's rosary
- Henri Marchand's compass
- A photo of La Demeure aux Tilleuls (the family troglodyte house)
- A framed vinyl sleeve of Georges Brassens's *Les Copains d'abord* (added Year 2 AS)
- A hand-written note in Georges's handwriting: *"Mai 68 = la fin"* (found in the vinyl crate)

Survivors leave small offerings. They thank the ancestors.

Some offerings are ironic (a broken CD, a USB drive). The elders pretend not to notice.

### Cave Traditions & Rituals

**Weekly:**
- Sunday listening sessions in La Salle Piaf
- Vinyl selection committee meets Saturdays (surprisingly contentious)

**Annual:**
- *La Fete de la Mer* (July) — Community celebration featuring Charles Trenet's *La Mer* played at maximum allowed volume. Children believe this is "the wildest music gets."
- *Memorial Day* (October 14) — Silence observed. No music. No speaking above whispers. Remembrance of what was lost and who saved them.
- *Georges's Birthday* (October 22, posthumous) — Traditional playing of *Les Copains d'abord* followed by communal wine from the remaining cellar bottles.

**Life Events:**
- **Births:** *Douce France* (Charles Trenet) — "Sweet France, dear country of my childhood"
- **Coming of Age (16):** Choose any song from The Collection; it becomes "your song"
- **Weddings:** *La Vie en Rose* (mandatory, no exceptions, don't even ask)
- **Funerals:** *Les Copains d'abord* — "Friends first, it's the rule we made / Long before anyone taught us about it"

### Cave Slang & Expressions

The isolation has created unique expressions:

| Expression | Meaning | Origin |
|------------|---------|--------|
| "Going full Piaf" | Emotional outburst | Edith Piaf's dramatic style |
| "That's very Johnny" | Something controversial/divisive | The eternal Johnny Hallyday debate |
| "Pre-68" | Something authentic/good | Georges's worldview, inherited |
| "Post-68" | Something suspicious/bad | Georges's worldview, inherited |
| "Don't Echo Room it" | Don't make unnecessary noise | The Incident |
| "Needle status?" | Are resources critical? | The needle shortage |
| "Brel moment" | Intense emotional conversation | Jacques Brel's intensity |
| "Trenet it" | Stay optimistic despite everything | Charles Trenet's sunny disposition |

**Overheard in the caves:**

> "He's being very post-68 about this."
>
> "Don't Brel at me, I just asked a question."
>
> "This whole plan sounds like an Echo Room situation."
>
> "We're at needle status on medical supplies."

### The Johnny Question

The community remains **philosophically divided** on Johnny Hallyday.

**Pro-Johnny faction argues:**
- Madeleine liked him, and she was a Marchand too
- Early yé-yé period is technically pre-68
- The children deserve to know rock existed

**Anti-Johnny faction argues:**
- Georges tolerated him at best
- It's American-influenced music
- Slippery slope to "accepting" Claude Francois

The debate has never been formally resolved. Both factions coexist uneasily.

There is a rumor that someone has hidden a post-68 Johnny record somewhere in the caves. It has never been found. The search continues.

### The Vinyl Guardian

The Vinyl Guardian is not a librarian. The Vinyl Guardian is the person responsible for ensuring that **music never stops**.

Music plays continuously through 7 speaker locations in the caves. The Guardian coordinates The Disciples — a team of 12-16 trained operators who handle broadcasting. Sound keeps the virus dormant. Music keeps people sane. The Guardian keeps both running.

**Selection:** Candidates must create a **mix tape** — a curated selection from The Collection, performed live with commentary. The community votes for their favorite.

**Sacred Duties:**
1. The sound never stops (primary duty — if music stops, people die)
2. Needle management (7 remaining; each change is a ritual)
3. The Collection inventory (weekly)
4. Scheduling disputes (who gets Brel at dinner?)
5. The Tino Rossi Protocols (December only)
6. Emergency response (if all fails, summon The Bouches)

**The Bouches:**
The emergency backup. When technology fails, the Bouche family — beatboxers trained from age 5 — provides continuous vocal rhythm until systems are restored. Five times in 300 years, the music has stopped. The Bouches saved the community during the worst: The Great Panic of Year 278 AS, when Jérôme Bouche beatboxed for 58 minutes straight.

*See [vinyl_guardian.md](../../factions/the_unplugged/vinyl_guardian.md) for full Guardian details and The Five Silences.*

---

## Connection to Hero Base

See [studio_echo.md](studio_echo.md) for details on the Hero Base and travel routes between locations.

### The Recruitment Corridor

The 6-tile path from Studio Echo (0, 0) to Les Grottes (6, 0) is the game's primary early progression axis. The player must:

1. **Generate Bassline** at the Crystal Circle to fuel bubble expansion
2. **Expand the bubble** eastward along the Bresme Path (river valley terrain = low impedance)
3. **Reach ring 3** — the bubble now covers half the distance to the cave
4. **Recruitment gate opens** — survivors can cross the remaining 3 tiles (3 in-world hours) within the 4-hour lethal window
5. **Spend Vibes** to recruit from the cave population

If the bubble **shrinks** (brownout, Bassline depletion), the recruitment gate closes and any in-transit recruits are lost. This creates tension between expansion ambition and power stability.

### Real-World Cave Density

The OSM data validates the density of cave systems in this region. The nearby commune of **Nouzilly** (hex area east of the Bresme valley) contains **25 mapped cave entrances** and **2 natural springs** in a single 4 km hex — confirming that tuffeau limestone here creates exactly the kind of extensive underground network that the lore describes.

Named cave sites in the surrounding area:
- **Les Caves de la Babiniere** (Nouzilly) — cave settlement
- **Les Caves de la Gaspiere** (Cerelles) — cave locality
- **Les Caves de Valarault** (Beaumont-la-Ronce) — cave hamlet
- **Les Carrieres** (Beaumont-la-Ronce) — quarry site (tuffeau extraction)
- **La Pierre a Vinaigre** (Nouzilly) — archaeological site near cave cluster

See [../README.md](../README.md) and [README.md (regional)](README.md) for the full OSM geographic dataset.

---

*Last updated: 2026-03-15*
