# Touraine Region

> **The heart of the Loire Valley — and the last refuge of humanity.**
>
> **Related:** [studio_echo.md](studio_echo.md) | [les_grottes_de_la_bresme.md](les_grottes_de_la_bresme.md) | [tours_ruins.md](tours_ruins.md)

---

## Overview

**Touraine** is a historic region of central France, centered on the city of Tours. Before The Silence, it was known for:

- Loire Valley chateaux (Amboise, Chenonceau, Villandry)
- Wine production (Vouvray, Chinon, Bourgueil)
- **Troglodyte heritage** — cave dwellings carved into tuffeau limestone
- Garden of France — mild climate, fertile soil

After The Silence, it became one of the few places where humans survived the initial weeks — thanks to Henri Marchand's preparations and his ancestral knowledge of the caves.

---

## Geography

### The Gatine Tourangelle

The **Gatine Tourangelle** is a forested plateau north of the Loire river, characterized by:

- Rolling farmland and mixed forest
- Small rural communes (500-2,000 people pre-Silence)
- The Bresme river valley cutting through limestone
- Scattered farms, many abandoned even before The Silence

**Key Communes:**

| Commune | Pre-Silence Pop. | Current Status | Notes |
|---------|------------------|----------------|-------|
| Pernay | ~1,100 | Abandoned/Ruins | Hero Base location |
| Saint-Etienne-de-Chigny | ~1,650 | Survivors Cave entrance | Troglodyte heritage |
| Luynes | ~5,500 | Silent Zone | Medieval castle ruins |
| Tours | ~136,000 | Dead City | Regional capital |

### The Bresme River

A small river (~25km long) that flows from Sonzay through Pernay and Saint-Etienne-de-Chigny before joining the Loire. The valley it carved through the limestone created the conditions for:

- Tuffeau quarries (stone for building chateaux)
- Cave systems (wine cellars, mushroom farms)
- **Les Grottes de la Bresme** (Survivors Cave)

---

## Tuffeau Limestone

**Tuffeau** is the soft, cream-colored limestone that defines Loire Valley architecture. Properties:

- **Soft when quarried** — easy to carve with hand tools
- **Hardens with air exposure** — becomes durable over time
- **Porous** — maintains constant temperature and humidity underground
- **Sound-dampening** — critical for post-Silence survival

The same stone used to build Chambord and Chenonceau also created the cave systems that saved humanity.

---

## Troglodyte Heritage

People have lived in Loire Valley caves for over 1,000 years. Types of troglodyte structures:

| Type | French Name | Original Use | Post-Silence Use |
|------|-------------|--------------|------------------|
| Wine caves | Caves viticoles | Wine storage | Food storage |
| Mushroom farms | Champignonnieres | Mushroom cultivation | Agriculture |
| Dwelling caves | Demeures | Homes | Shelter |
| Quarry caves | Carrieres | Stone extraction | Expansion |

Henri Marchand's grandparents lived in a traditional troglodyte dwelling in Saint-Etienne-de-Chigny. He spent summers there as a child, learning the cave systems that would later save The Unplugged.

---

## Climate

| Season | Temperature | Precipitation | Survival Notes |
|--------|-------------|---------------|----------------|
| Spring | 8-18C | Moderate | Flooding risk in caves |
| Summer | 15-26C | Low | Surface foraging possible |
| Autumn | 8-18C | Moderate | Harvest critical |
| Winter | 2-8C | Moderate | Cave temp stable ~12C |

The caves maintain a **constant 12C year-round** — critical for survival when surface structures are too dangerous.

---

## Post-Silence Status

### Safe Zones

- **Les Grottes de la Bresme** — Survivors Cave, main settlement
- **Deep forest pockets** — Temporary shelter during expeditions
- **Underground river sections** — Water source

### Danger Zones

- **Tours** — Dead city, high threat density
- **Loire river valley** — Open, exposed, dangerous
- **Major roads** — Attract threats
- **Any urban area** — Collapsed structures, trapped threats

### Contested/Unknown

- **Isolated farms** — May contain resources or threats
- **Wine caves (not connected to main system)** — Potential expansion, unknown status
- **Chateau ruins** — High-value loot, high risk

---

## Hex Grid Mapping

> **Cross-reference:** [../README.md](../README.md) (world scale) | [../../legacy/add/mechanics/specifications.md](../../../legacy/add/mechanics/specifications.md) section 2.1

The game hex grid is anchored to real Touraine geography. Each hex = 4 km center-to-center. The Base (Studio Echo) sits at hex **(0, 0)**.

### Canon Hex Assignments

| Hex (q, r) | Distance | Canon Location | Tile ID | Terrain |
|------------|----------|----------------|---------|---------|
| **(0, 0)** | 0 | Studio Echo (Hero Base) | `tile.base_core` | Plains |
| **(6, 0)** | 6 | Les Grottes de la Bresme (Survivor Cave) | `tile.survivor_cave` | Plains |
| Rings 1-2 | 1-2 | Pernay surrounds (farmland, scrub, forest) | Various | Plains, Scrub |
| Ring 3 | 3 | Recruitment gate threshold | — | Mixed |
| Rings 4-5 | 4-5 | Gatine Tourangelle plateau (forest, scrub, ridges) | Various | Scrub, Ridge |
| Ring 6 | 6 | Grid edge; cave system, frontier | `tile.survivor_cave` at (6,0) | Plains |

### Key Distances (with Hex Equivalents)

| Route | Real Distance | Hex Tiles | Travel Time (plains) | Risk Level |
|-------|--------------|-----------|---------------------|------------|
| Studio Echo → Grottes | 22 km | 6 tiles | 6s (6 in-world hours) | Medium |
| Grottes → Tours outskirts | 12 km | 3 tiles | 3s | High |
| Studio Echo → Tours | 20 km | 5 tiles | 5s | Very High |
| Grottes → Vouvray caves | 15 km | 4 tiles | 4s | Medium |

---

## Real-World Geographic Data (OSM Source)

The following data is extracted from OpenStreetMap for the Touraine region. It serves as the canonical real-world reference for game map generation and lore grounding.

> **Source:** `tours_region.db` generated by `osm_to_hex.py` (v4) from OSM data, hex size = 4,000 m.

### Communes (Villages)

| Commune | Pre-Silence Pop. | Real Coordinates | Game Status | Notes |
|---------|------------------|-----------------|-------------|-------|
| **Pernay** | ~1,100 | ~47.40°N, 0.65°E | Hero Base commune (ruins) | Studio Echo is here |
| **Saint-Etienne-de-Chigny** | ~1,650 | ~47.38°N, 0.42°E | Survivors Cave entrance | Troglodyte heritage |
| **Neuvy-le-Roi** | 1,065 | ~47.60°N, 0.59°E | Abandoned | Primary roads, forest, ponds |
| **Beaumont-la-Ronce** | 1,765 | ~47.58°N, 0.70°E | Abandoned | Wetlands, primary roads intersection |
| **Cerelles** | 1,242 | ~47.50°N, 0.67°E | Abandoned | Heavy forest, motorway, reservoir |
| **Nouzilly** | 1,237 | ~47.54°N, 0.78°E | Abandoned / Cave territory | **25 cave entrances**, 2 springs, canals |
| **Chemille-sur-Deme** | 714 | ~47.55°N, 0.55°E | Abandoned | Meadows, forest |
| **La Ferriere** | 318 | ~47.52°N, 0.55°E | Abandoned | Vineyard, forest |
| **Saint-Laurent-en-Gatines** | 896 | ~47.55°N, 0.80°E | Abandoned | Forest-heavy, secondary roads |
| **Rouziers-de-Touraine** | 1,348 | ~47.47°N, 0.65°E | Abandoned | Near Tours approach |
| **Luynes** | ~5,500 | ~47.38°N, 0.55°E | Silent Zone | Medieval castle ruins |
| **Tours** | ~136,000 | 47.39°N, 0.69°E | Dead City | Regional capital |

### Cave Systems & Underground Features

The tuffeau limestone creates dense cave networks across the region. These are critical for lore (survival shelters, expansion targets, encounter locations).

| Feature | Location | OSM Type | Count / Notes |
|---------|----------|----------|---------------|
| **Nouzilly cave cluster** | Nouzilly commune | `natural:cave_entrance` | **25 entrances** — densest cluster in region |
| **Nouzilly springs** | Nouzilly commune | `natural:spring` | 2 springs — fresh water source |
| **Les Caves de la Babiniere** | Nouzilly commune | Named locality | Cave settlement near main cluster |
| **Les Caves de la Gaspiere** | Cerelles commune | Named locality | Cave settlement |
| **Les Caves de Valarault** | Beaumont-la-Ronce | Named hamlet | Cave dwelling hamlet |
| **La Cave** | Beaumont-la-Ronce | Isolated dwelling | Single cave home |
| **Les Carrieres** | Beaumont-la-Ronce | Named hamlet | Quarry / limestone extraction site |
| **Le Caveau** | Cerelles commune | Isolated dwelling | Small cave |
| **Fontaine** | Cerelles commune | `natural:spring` | Named spring |
| **Neuvy-le-Roi cave** | Neuvy-le-Roi | `natural:cave_entrance` | 1 entrance |

**Lore significance:** The real-world density of cave entrances around Nouzilly (25 in a single 4 km hex) validates the game's premise that tuffeau limestone in this region creates extensive underground networks suitable for post-Silence survival.

### Historic & Archaeological Sites

| Name | Location | Type | Lore Potential |
|------|----------|------|----------------|
| **Chateau de Fontenailles** | Neuvy-le-Roi | Castle | Expedition target, loot, lore |
| **Chateau de la Cantiniere** | Beaumont-la-Ronce | Castle | Expedition target |
| **Menhir de Montifray** | Neuvy-le-Roi | Archaeological (prehistoric) | Ancient resonance site? |
| **La Pierre a Vinaigre** | Nouzilly | Archaeological | Near cave cluster — pre-human significance |
| **Croix Saint-Andre** | Nouzilly | Wayside cross | Navigation landmark |
| **8 Calvaires** | Various communes | Wayside crosses | Navigation landmarks |
| **Monuments aux morts** | Various | War memorials | Pre-Silence history |
| **Memorial 1914-1918** | Saint-Laurent-en-Gatines | War memorial | Historical layer |

### Named Roads

| Type | Name | Lore Potential |
|------|------|----------------|
| Motorway | **Autoroute du Pique-Prune** | Dangerous corridor, abandoned vehicles |
| Primary | Route de Neuille-Pont-Pierre | Regional route, exposed |
| Primary | Avenue Gustave Moussu | Town approach |
| Primary | Avenue de Grand Maison | Named approach road |
| Secondary | Route de Chemille-sur-Deme | Inter-commune route |
| Secondary | Route de Tours | Direct Tours approach (danger zone) |
| Secondary | Route de la Foret | Forest route (cover) |
| Secondary | Rue de la Choisille | River-following route |

### Waterways

The Bresme river and its tributaries are the primary water features. Key waterways from OSM data:

- **Bresme river** — Main valley route, ~25 km, connects Sonzay → Pernay → Saint-Etienne-de-Chigny → Loire
- **Multiple streams** — Tributary network throughout the Gatine Tourangelle
- **Canals** — Artificial waterways near Nouzilly (irrigation/mill heritage)
- **Ponds** — Numerous across all hexes (natural and man-made)

### POI Summary (950 total from OSM)

| Category | Count | Key Types |
|----------|-------|-----------|
| **Places** | 891 | 10 villages, 97 hamlets, 434 isolated dwellings, 350 localities |
| **Natural** | 29 | 26 cave entrances, 3 springs |
| **Historic** | 23 | 2 castles, 2 archaeological sites, memorials, crosses |
| **Amenity** | 7 | Schools (all abandoned post-Silence) |

---

## Lore Significance

### Why Henri Chose This Place

Henri Marchand didn't choose the Touraine region randomly. His grandparents — **Georges and Madeleine Marchand** — were born and raised in Saint-Etienne-de-Chigny. They lived in a traditional troglodyte house carved into the tuffeau cliffs above the Bresme valley.

Henri spent every summer of his childhood there (1985-1998), exploring the caves with his grandfather. When @QuietDad_FR (Marc Delacroix) suggested The Unplugged needed a "real" shelter — not just a basement — Henri immediately thought of his grandparents' caves.

The old Marchand property had been sold after Madeleine's death in 2019, but Henri knew every tunnel, every chamber, every secret passage. He knew which caves connected. He knew where the water flowed. He knew how deep you could go.

He just didn't know why he'd need that knowledge.

---

*Last updated: 2026-03-15*

<!-- lore:index:start -->

## In this section

- [Les Grottes De La Bresme](les_grottes_de_la_bresme.md)
- [Studio Echo](studio_echo.md)

_Generated from the lore tree: 2 page(s), 0 subsection(s)._
<!-- lore:index:end -->
