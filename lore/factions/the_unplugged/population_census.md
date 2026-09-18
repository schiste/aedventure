# The Unplugged Population Census (Year 300 AS)

> **Status:** In design
>
> **Related:** [faction_id_card.md](faction_id_card.md) | [major_families.md](major_families.md) | [crew-system.md](../../../legacy/add/documentation/crew-system.md)

---

## Overview

This document defines the statistical model for generating the full Unplugged population (~2,000 people, ~149 families). The model uses weighted distributions to procedurally generate individuals while maintaining lore consistency.

**Design Goals:**
- Generate coherent, lore-consistent characters procedurally
- Support both random crew generation and authored story characters
- Every generated character feels like they belong to this world
- Statistics reflect 300 years of underground cave society evolution

---

## 1) Population Demographics

### 1.1 Total Population
- **Year 300 AS:** ~2,000 people
- **Families:** ~149 (average ~13.4 per family, dynasty consolidation)
- **Original families:** 102 (Year 1 AS)

### 1.2 Age Distribution

Cave society with controlled growth, high child survival, moderate lifespan.

| Age Range | % of Pop | Count | Notes |
|-----------|----------|-------|-------|
| 0-7 (Children) | 12% | ~240 | Pre-Selection Day |
| 8-15 (Apprentices) | 10% | ~200 | Post-Selection, in training |
| 16-25 (Young Adults) | 18% | ~360 | Coming of Age to established |
| 26-40 (Adults) | 25% | ~500 | Prime working years |
| 41-55 (Middle Age) | 20% | ~400 | Experienced, often leaders |
| 56-70 (Elders) | 12% | ~240 | Respected, advisory roles |
| 71+ (Venerable) | 3% | ~60 | Rare, celebrated |

**Recruitable Pool:** Ages 16-55 most likely (~1,260 people theoretically available)

### 1.3 Gender Distribution
- **50/50 split** (cave society has no survival pressure favoring either)
- Names and roles are not gender-locked

---

## 2) Family Distribution

### 2.1 Family Size Categories

After 300 years of underground dynasties with limited space and controlled growth, families have consolidated. The original 102 families merged, branched, and absorbed smaller lines. Many "families" are now extended clans spanning 10-12 generations.

| Category | % of Families | Members | Family Count | Total People |
|----------|---------------|---------|--------------|--------------|
| Small (recent splits, dying lines) | 15% | 5-10 | ~22 | ~165 |
| Medium | 30% | 11-20 | ~45 | ~700 |
| Large | 35% | 21-40 | ~52 | ~1,560 |
| Dynasty (founding families) | 20% | 41-80 | ~30 | ~1,575 |

**Total:** ~149 family names, ~2,000 people
**Average family size:** ~13.4 members

**Notes:**
- Original 102 families consolidated to ~80 lines through marriage and mergers
- ~70 new family names emerged (splits, adopted names, compound names)
- Founding families tend toward Dynasty size (300 years of prestige = more marriages)
- Small families are often recent branches or lines with poor survival/fertility

### 2.2 Major Family Population (Named Families)

These families have established lore and specific population weights.

| Family | % of Pop | ~Count | Type | Notes |
|--------|----------|--------|------|-------|
| **Lindquist** | 2% | ~40 | Emerged | The odd family, high Resilient rate |
| **Delacroix** | 4% | ~80 | Founding | Political dynasty |
| **Marchand** | 3% | ~60 | Founding | Secret keepers |
| **Moreau** | 3% | ~60 | Founding | Military discipline |
| **Vidal** | 3.5% | ~70 | Founding | Farmers |
| **Lefebvre** | 3% | ~60 | Founding | Diggers/miners |
| **Rousseau** | 2.5% | ~50 | Founding | Healers |
| **Brenner** | 2% | ~40 | Founding | Engineers |
| **Duval** | 2% | ~40 | Founding | Animal handlers |
| **Perez** | 2% | ~40 | Emerged | Midwives |
| **Girard** | 1.5% | ~30 | Emerged | Cartographers |
| **Martinet** | 2% | ~40 | Emerged | Investigators/historians |
| **Beaumont** | 2.5% | ~50 | Emerged | Teachers |
| **Ferrand** | 2% | ~40 | Emerged | Builders |
| **Bouche** | 1.5% | ~30 | Emerged | Emergency sound |
| **Other Named** | 15% | ~300 | Various | Minor families with names |
| **Unnamed/Minor** | 48.5% | ~970 | Generated | Procedurally named families |

**Total Named Family Members:** ~1,030 (51.5%)
**Generated Family Members:** ~970 (48.5%)

---

## 3) Physical Traits

### 3.1 Height Distribution

300 years underground with limited nutrition, vitamin D deficiency, and cramped spaces has significantly reduced average height. The Unplugged are notably shorter than pre-Silence populations.

| Category | Male Range | Female Range | % of Pop |
|----------|------------|--------------|----------|
| Very Short | 145-155cm | 140-150cm | 20% |
| Short | 155-163cm | 150-158cm | 35% |
| Average | 163-170cm | 158-165cm | 30% |
| Tall | 170-178cm | 165-172cm | 12% |
| Very Tall | 178-185cm | 172-180cm | 3% |

**Population Averages:**
- Male average: ~161cm (vs ~175cm pre-Silence French)
- Female average: ~156cm (vs ~163cm pre-Silence French)

**Family Modifiers:**
- Lindquist: +5% Tall (Scandinavian heritage, somewhat preserved)
- Lefebvre: +3% Tall (digger selection favors stockier builds)
- Bouche: -3% height (lung capacity prioritized over height)
- Vidal: +2% Average (farmers eat better)

**Cave Dweller Adaptations:**
- Shorter limbs, more compact builds (thermal efficiency)
- Larger eyes relative to face (low light adaptation)
- Paler skin (no sun exposure)
- Denser bones in some families (climbing/tunnel work)

### 3.2 Build Distribution

| Build | % of Pop | Notes |
|-------|----------|-------|
| Slight | 15% | Light frame, quick |
| Lean | 30% | Wiry, efficient |
| Average | 30% | Balanced |
| Sturdy | 18% | Solid, strong |
| Heavyset | 7% | Rare in cave diet |

**Profession Modifiers:**
- Digger: +20% Sturdy
- Guard: +15% Sturdy
- Farmer: +10% Lean
- Teacher: +10% Slight/Average

### 3.3 Hair Color

300 years of French cave population with some outside genetics (Lindquist Scandinavian, Brenner German).

| Color | % of Pop | Notes |
|-------|----------|-------|
| Black | 15% | |
| Dark Brown | 35% | Most common |
| Medium Brown | 25% | |
| Light Brown | 12% | |
| Auburn/Red | 5% | |
| Blonde | 6% | Higher in Lindquist, Brenner |
| Grey/White | 2% | Age-related, any base |

**Family Modifiers:**
- Lindquist: +15% Blonde, +5% Light Brown
- Brenner: +10% Blonde
- Delacroix: +5% Black (Mediterranean heritage)

### 3.4 Eye Color

300 years of limited gene pool has homogenized eye color significantly. Brown dominates as the dominant allele has spread through the population.

| Color | % of Pop | Notes |
|-------|----------|-------|
| Brown | 65% | Dominant gene, majority population |
| Dark Brown | 15% | Near-black, common |
| Hazel | 10% | Brown-green mix, declining |
| Green | 5% | Recessive, rare |
| Blue | 4% | Recessive, concentrated in specific families |
| Grey | 1% | Very rare |

**Family Modifiers:**
- Lindquist: +15% Blue (Scandinavian genetics, preserved through isolation)
- Brenner: +10% Blue (German heritage)
- Most other families: 80%+ brown-eyed

**Genetic Note:**
Blue and green eyes are considered "exotic" in Year 300 AS. A blue-eyed person draws attention. Some families specifically seek blue-eyed marriage partners to preserve the trait - particularly Lindquists, who view it as connection to their Scandinavian heritage.

### 3.5 Skin Tone

300 years underground = very limited sun exposure. Population is notably pale regardless of heritage.

| Tone | % of Pop | Description |
|------|----------|-------------|
| Very Pale | 40% | Cave-dweller standard |
| Pale | 35% | Slight warmth |
| Fair | 15% | Some melanin heritage visible |
| Medium | 8% | Darker heritage, still paled |
| Warm | 2% | Recent surface exposure (Lindquists) |

**Modifiers:**
- Lindquist surface exposure: +15% Warm/Medium
- Anyone with multiple expeditions: shift toward Warm

### 3.6 Distinguishing Features

Roll 0-3 distinguishing features per person.

| Feature | % Chance | Notes |
|---------|----------|-------|
| Scars (work) | 15% | Diggers, builders, guards |
| Scars (surface) | 5% | Expedition survivors |
| Freckles | 12% | |
| Birthmark | 8% | |
| Missing finger(s) | 3% | Accidents, Echo Scars |
| Tattoo (surface mark) | 8% | One per expedition survived |
| Calloused hands | 25% | Manual workers |
| Musician's calluses | 10% | Drummers especially |
| Stooped posture | 5% | Tunnel work |
| Unusual eye | 2% | Heterochromia, etc. |

---

## 4) Creed Distribution

### 4.1 Overall Creed Population

| Creed | % of Pop | ~Count | Description |
|-------|----------|--------|-------------|
| **Piafism** | 28% | ~560 | Emotional intensity |
| **Brassensisme** | 22% | ~440 | Philosophy and wit |
| **Trenétisme** | 20% | ~400 | Optimism |
| **Brelisme** | 18% | ~360 | Passion and poetry |
| **Lectromusic** | 2% | ~40 | Lindquist cult (≈100% of Lindquists) |
| **Skeptic/None** | 10% | ~200 | "It's just music" |

### 4.2 Creed by Family

| Family | Primary Creed | % Adherent | Secondary | Notes |
|--------|---------------|------------|-----------|-------|
| Marchand | Brassensisme | 70% | Piafism 20% | Georges loved Brassens |
| Delacroix | Piafism | 65% | Brelisme 25% | Emotional, intense |
| Moreau | Trenétisme | 60% | Brassensisme 25% | Optimism through discipline |
| Vidal | Brassensisme | 55% | Trenétisme 30% | Philosophical farmers |
| Lefebvre | Brelisme | 60% | Piafism 25% | Passionate about work |
| Rousseau | Piafism | 65% | Brelisme 20% | Healers feel deeply |
| Brenner | Skeptic | 40% | Brassensisme 35% | Engineers don't pick sides |
| Duval | Trenétisme | 55% | Piafism 30% | Country optimism |
| Perez | Piafism | 60% | Trenétisme 25% | Inherited from Rousseau |
| Girard | Brelisme | 55% | Brassensisme 30% | Intensity in documentation |
| Martinet | Trenétisme | 50% | Brassensisme 35% | Discipline requires optimism |
| Beaumont | Brassensisme | 60% | Various 40% | Teachers favor philosophy |
| Ferrand | Brelisme | 55% | Trenétisme 30% | Builders with passion |
| Bouche | Trenétisme | 65% | Piafism 25% | Sound requires hope |
| Lindquist | Lectromusic | 95% | Skeptic 5% | The cult |

### 4.3 Creed Intensity

| Intensity | % of Creed Members | Description |
|-----------|-------------------|-------------|
| Devout | 20% | Defines their identity |
| Practicing | 40% | Regular observance |
| Casual | 25% | Cultural identification |
| Nominal | 10% | Family tradition only |
| Non-believer | 5% | "It's just noise" / Secretly hostile |

### 4.4 The Sounding Five Descendants (Hidden Non-Believers)

A specific subgroup carries a secret hatred of music passed down through generations. The descendants of the Sounding Five - the original conspiracy that caused The Silence - have never forgotten. They don't know the full truth of what their ancestors did, but they inherited:

- **A bone-deep resentment of music** ("Music destroyed everything")
- **Suppressed guilt they can't explain** (genetic memory of crime)
- **Hostility toward vinyl creeds** (seeing worship as obscene)

**Population:** ~150 people (~7.5% of population)
**Distribution:** Concentrated in 5-8 family lines (names obscured over time)
**Creed:** Officially Skeptic (60%) or Nominal in other creeds (40%)
**Politics:** Tend toward Earthbound (25%) or Traditionalist (35%)

**Behavior:**
- Never volunteer for sound-related duties
- Avoid the Vinyl Guardian's presence
- Express discomfort during Mandatory Arts (excuses, minimal participation)
- Marry within their hidden community when possible
- Pass down the resentment without explaining why

**Story Hook:** Some of these descendants may have fragments of forbidden knowledge - partial truths about what really happened. A player who recruits one may trigger special events.

**Trait Connection:** The "Knows Too Much" legendary trait may appear in Sounding Five descendants who pieced together the family secret.

---

## 5) Political Alignment Distribution

### 5.1 Overall Political Landscape

| Faction | % of Pop | ~Count | Core Position |
|---------|----------|--------|---------------|
| **Traditionalist** | 25% | ~500 | No change |
| **Digger** | 20% | ~400 | Expand caves |
| **Democrat** | 15% | ~300 | More equality |
| **Opener** | 12% | ~240 | Share knowledge |
| **Earthbound** | 8% | ~160 | No surface return |
| **Neutral/Apolitical** | 20% | ~400 | Case-by-case |

### 5.2 Politics by Family

| Family | Primary | % | Secondary | Notes |
|--------|---------|---|-----------|-------|
| Marchand | Neutral | 60% | Opener 25% | Officially neutral |
| Delacroix | Traditionalist | 70% | Neutral 20% | Protect legacy |
| Moreau | Digger | 55% | Traditionalist 30% | Systematic expansion |
| Vidal | Democrat | 60% | Opener 25% | Resources should be shared |
| Lefebvre | Digger | 75% | Neutral 15% | Obviously |
| Rousseau | Opener | 55% | Democrat 30% | Knowledge should be shared |
| Brenner | Opener | 50% | Neutral 35% | Technology is for everyone |
| Duval | Traditionalist | 60% | Neutral 30% | Old ways work |
| Perez | Democrat | 55% | Opener 30% | Every child matters |
| Girard | Opener | 60% | Neutral 30% | Knowledge is power |
| Martinet | Traditionalist | 55% | Neutral 35% | Rules exist for reasons |
| Beaumont | Neutral | 50% | Various 50% | Teachers hold diverse views |
| Ferrand | Digger | 65% | Neutral 25% | More building = more space |
| Bouche | Traditionalist | 55% | Neutral 35% | Don't change what works |
| Lindquist | Neutral | 80% | Opener 15% | Outside the system |

### 5.3 Studio Echo Stance

Special alignment relevant to gameplay:

| Stance | % of Pop | Description |
|--------|----------|-------------|
| **Strong Supporter** | 8% | Will volunteer to go |
| **Supporter** | 22% | Thinks it's a good idea |
| **Cautiously Hopeful** | 30% | Wait and see |
| **Skeptical** | 25% | Doubts it will work |
| **Opposed** | 12% | Thinks it's dangerous |
| **Strongly Opposed** | 3% | Earthbound hardliners |

**Family Modifiers:**
- Lindquist: 90% Strong Supporter
- Delacroix: +15% Skeptical/Opposed
- Lefebvre: +10% Supporter (new territory!)
- Earthbound members: 80% Opposed/Strongly Opposed

---

## 6) Profession Distribution

### 6.1 Overall Profession Breakdown

Based on cave society needs:

| Profession | % of Working Pop | ~Count | Primary Family |
|------------|------------------|--------|----------------|
| **Farmer** | 18% | ~270 | Vidal |
| **Digger** | 12% | ~180 | Lefebvre |
| **Builder** | 8% | ~120 | Ferrand |
| **Guard** | 6% | ~90 | Moreau |
| **Healer** | 5% | ~75 | Rousseau |
| **Midwife** | 3% | ~45 | Perez |
| **Teacher** | 4% | ~60 | Beaumont |
| **Engineer** | 4% | ~60 | Brenner |
| **Drummer** | 8% | ~120 | Various (Bouche leads) |
| **Cartographer** | 2% | ~30 | Girard |
| **Investigator** | 2% | ~30 | Martinet |
| **Cook** | 6% | ~90 | Various |
| **Craftsperson** | 8% | ~120 | Various |
| **Animal Handler** | 3% | ~45 | Duval |
| **Vinyl Guardian/Disciple** | 1% | ~15 | Bouche |
| **Council/Admin** | 2% | ~30 | Various |
| **Other/Specialist** | 8% | ~120 | Various |

*Working population ≈ 1,500 (ages 16-70)*

### 6.2 Profession by Family Affinity

| Family | Profession Bonus | Effect |
|--------|------------------|--------|
| Vidal | Farmer | 60% of family in farming |
| Lefebvre | Digger | 55% of family in digging |
| Ferrand | Builder | 50% of family in building |
| Moreau | Guard | 45% of family in guard duty |
| Rousseau | Healer | 50% of family in healing |
| Perez | Midwife | 55% of family in midwifery |
| Beaumont | Teacher | 50% of family in teaching |
| Brenner | Engineer | 55% of family in engineering |
| Girard | Cartographer | 60% of family in mapping |
| Martinet | Investigator | 50% of family in investigation |
| Duval | Animal Handler | 50% of family in animals |
| Bouche | Drummer/Sound | 70% of family in sound work |
| Lindquist | Various | No strong profession (outcasts pick up diverse skills) |

---

## 7) Trait Distribution

### 7.1 Trait Rarity (per slot)

Each person has 3 trait slots: Positive, Negative, Mixed.

| Rarity | % Chance per Slot |
|--------|-------------------|
| Common | 60% |
| Uncommon | 25% |
| Rare | 12% |
| Legendary | 3% |

### 7.2 Family Trait Weights

Certain traits are more likely to appear in certain families:

| Family | Weighted Traits | Weight Modifier |
|--------|-----------------|-----------------|
| Lindquist | Surface Addiction, Kaylee's Dreams, Lectromusic Zealot, Outlived the Odds | +30% |
| Bouche | Emergency Essential, Beatbox Backup, Jérôme's Throat | +40% |
| Martinet | The Lecturer, Yellow Ribbon Survivor | +35% |
| Lefebvre | Lefebvre Nose, Tunnel Fighter | +35% |
| Delacroix | Authentic Delacroix Guilt, Delacroix Grudge | +30% |
| Marchand | Marchand Patience, Knows About the Drive | +30% |
| Beaumont | Confidently Incorrect, The Beaumont Version | +40% |
| Moreau | Guard Training, Cool Head | +30% |
| Rousseau | Professionally Mourned, Death Doula | +30% |

### 7.3 Creed Trait Weights

| Creed | Weighted Traits | Weight Modifier |
|-------|-----------------|-----------------|
| Piafism | Devout Piafiste | +40% |
| Brassensisme | Devout Brassensiste | +40% |
| Trenétisme | Devout Trenétiste, Mandatory Arts Enthusiast | +40% |
| Brelisme | Devout Breliste | +40% |
| Lectromusic | Lectromusic Zealot, Surface Addiction | +50% |
| Skeptic | Rémi's Courage | +20% |

---

## 8) Name Generation

### 8.1 First Names Pool

**Traditional French (55% of population):**

*Male:*
Jean, Pierre, Marc, Henri, Louis, François, Claude, André, Michel, Bernard, Jacques, Philippe, Alain, Étienne, Sylvain, Rémi, Lucien, Guillaume, Olivier, Thierry, Yves, Gilles, Sébastien, Nicolas, Mathieu, Antoine, Paul, Thomas, Vincent, Laurent, Christophe, Julien, Maxime, Romain, Damien, Cédric, Fabien, Jérôme, Pascal, Benoît, Grégoire, Arnaud, Bertrand, Xavier, Raphaël, Adrien, Florian, Quentin, Hugo, Léo, Théo, Lucas, Nathan, Enzo, Louis, Gabriel, Arthur, Jules, Adam, Noé, Liam, Éthan, Samuel, Alexis, Clément, Valentin, Dylan, Kylian, Timéo, Maël, Noah, Tom, Evan, Sacha, Lorenzo, Mattéo, Nolan, Axel, Oscar, Martin, Simon, Victor, Émile, Gaston, Fernand, Marcel, René, Roger, Gérard, Maurice, Albert, Léon, Joseph, Édouard, Raymond, Georges, Camille, Dominique, Stéphane

*Female:*
Marie, Jeanne, Claire, Sophie, Marguerite, Céleste, Amélie, Chloé, Isabelle, Catherine, Anne, Élise, Camille, Léa, Emma, Lucie, Manon, Julie, Pauline, Charlotte, Adèle, Victoire, Delphine, Sandrine, Nathalie, Valérie, Céline, Aurélie, Élodie, Laetitia, Mélanie, Stéphanie, Virginie, Caroline, Mathilde, Alice, Louise, Jade, Zoé, Inès, Lola, Chloé, Sarah, Léonie, Juliette, Margot, Clara, Romane, Apolline, Anaïs, Lena, Eva, Nina, Lina, Mila, Ambre, Lou, Agathe, Clémence, Jeanne, Joséphine, Victoire, Héloïse, Constance, Éléonore, Gabrielle, Madeleine, Suzanne, Henriette, Germaine, Simone, Yvonne, Denise, Marcelle, Renée, Colette, Gisèle, Odette, Bernadette, Monique, Françoise, Jacqueline, Michèle, Christine, Brigitte, Sylvie, Patricia, Dominique

**North African Heritage (15% of population):**

*Male:*
Mohamed, Ahmed, Karim, Youssef, Omar, Hassan, Malik, Mehdi, Rachid, Samir, Nabil, Farid, Tarek, Nordine, Jamel, Sofiane, Bilal, Adil, Hakim, Djamel, Mounir, Riad, Amine, Walid, Sami, Fayçal, Nassim, Redouane, Younès, Idriss, Mourad, Aziz, Saïd, Brahim, Khaled, Hamid

*Female:*
Fatima, Amina, Nadia, Samira, Leila, Yasmina, Soraya, Djamila, Malika, Naïma, Rachida, Aicha, Zohra, Khadija, Farida, Sabrina, Karima, Latifa, Houria, Soumaya, Inès, Lina, Yasmine, Rania, Sara, Nour, Imane, Meriem

**Sub-Saharan African Heritage (8% of population):**

*Male:*
Mamadou, Moussa, Ibrahima, Ousmane, Amadou, Sékou, Boubacar, Demba, Lamine, Modou, Abdoulaye, Cheikh, Aliou, Souleymane, Oumar, Bakary, Daouda, Tidiane

*Female:*
Fatou, Aminata, Mariama, Aïssatou, Coumba, Bintou, Awa, Khady, Ndèye, Rama, Oumou, Djeneba, Kadiatou, Salimata, Rokhaya

**Portuguese/Spanish Heritage (5% of population):**

*Male:*
António, José, Manuel, João, Carlos, Fernando, Pedro, Miguel, Paulo, Rui, Tiago, Diogo, Rafael, Luis, Diego, Alejandro, Pablo, Javier, Sergio

*Female:*
Maria, Ana, Sofia, Inês, Catarina, Marta, Beatriz, Teresa, Luísa, Carmen, Elena, Isabel, Lucia, Alba, Paula, Andrea

**Germanic Influence (Brenner and related, 3%):**

*Male:*
Klaus, Hans, Fritz, Otto, Dieter, Wolfgang, Heinrich, Friedrich, Karl, Ernst, Günter, Werner, Rolf, Uwe, Jörg, Stefan, Markus, Tobias, Florian

*Female:*
Ingrid, Heidi, Greta, Liesel, Helga, Ursula, Monika, Petra, Sabine, Anja, Katrin, Stefanie, Birgit, Renate

**Scandinavian Influence (Lindquist, 2%):**

*Male:*
Erik, Sven, Bjorn, Lars, Olaf, Magnus, Anders, Nils, Leif, Gunnar, Ragnar, Axel, Oskar, Viktor, Emil, Karl, Johan, Henrik, Frederik

*Female:*
Kaylee (founder name, sacred), Astrid, Freya, Sigrid, Ingrid, Helga, Greta, Solveig, Birgit, Liv, Maja, Saga, Freja, Elin, Linnea, Klara, Hedda, Tove

**Asian Heritage (3% of population):**

*Male:*
Wei, Chen, Huang, Lin, Zhang, Wang, Li, Yang, Liu, Tran, Nguyen, Pham, Vinh, Minh, Duc, Hiroshi, Kenji, Takeshi, Yuki, Kei

*Female:*
Mei, Xiu, Ling, Yan, Hui, Mai, Linh, Thuy, Lan, Kim, Yuki, Sakura, Hana, Aiko, Emi, Mika

**Eastern European Heritage (4% of population):**

*Male:*
Piotr, Stanisław, Wojciech, Krzysztof, Andrzej, Tomasz, Marek, Janusz, Pavel, Ivan, Dmitri, Nikolai, Sergei, Viktor, Alexei, Boris, Miroslav, Stefan, Dragos

*Female:*
Katarzyna, Agnieszka, Małgorzata, Anna, Ewa, Zofia, Natalia, Olga, Svetlana, Irina, Tatiana, Marina, Elena, Alina, Cristina, Ioana

**Cave-Era Invented Names (5%):**
Names created post-Silence, now traditional:
Echo, Silence, Crystal, Harmony, Rhythm, Vinyl, Stone, Deep, Caverne, Écho, Cristal, Profond, Lumière, Souffle, Résonance, Vibration, Béatrice (beat-rice, pun name)

### 8.2 Nicknames (Ententernickname)

The Unplugged nickname tradition evolved directly from the original Telegram handles (@UndergroundDad, @SporeMom, etc.). Over 300 years, this became the defining naming convention - everyone has an @ handle, even though there's no more internet.

**FORMAT:** All nicknames use @ prefix, written as **@Handle**

**RULES:**
- Given at birth or shortly after by parents
- Used more than legal names in daily conversation
- Written on all official documents after legal name
- The worse the pun, the higher the prestige
- Parents compete for the most groan-worthy handles
- Multi-generational puns are especially valued

**Lindquist Exception:** @FirstName only (per lore - Kaylee never had a handle, tradition stuck)

#### Category 1: Terrible Name Puns (40%)

French name-based puns that sound like common words when spoken aloud:

| Handle | Based On | Sounds Like | Meaning |
|--------|----------|-------------|---------|
| **@JeanBon** | Jean + Bon | Jambon | Ham |
| **@PaulOchon** | Paul + Ochon | Polochon | Pillow |
| **@TerryToire** | Terry + Toire | Territoire | Territory |
| **@AlainTerieur** | Alain + Térieur | À l'intérieur | Inside (very apt!) |
| **@AlexTerieur** | Alex + Térieur | À l'extérieur | Outside (ironic) |
| **@MarcAssin** | Marc + Assin | Marcassin | Wild boar piglet |
| **@SarahCroche** | Sarah + Croche | S'accroche | Holds on |
| **@JacquesAdit** | Jacques + Adit | Jacadi | Simon says |
| **@SamDimanche** | Sam + Dimanche | Samedi-Dimanche | Weekend |
| **@GillesEtte** | Gilles + Ette | Gilet | Vest |
| **@AnneEsthesie** | Anne + Esthésie | Anesthésie | Anesthesia |
| **@AndyCote** | Andy + Côté | Un des côtés | One side |
| **@OttoMobile** | Otto + Mobile | Automobile | Car (historical) |
| **@PatIsserie** | Pat + Isserie | Pâtisserie | Bakery |
| **@RemiNiscence** | Rémi + Niscence | Réminiscence | Memory |
| **@LeonPardonnable** | Léon + Pardonnable | L'impardonnable | Unforgivable |
| **@BarryTone** | Barry + Tone | Baryton | Baritone |
| **@EdithOrial** | Édith + Orial | Éditorial | Editorial |
| **@RayNaissance** | Ray + Naissance | Renaissance | Rebirth |
| **@DougMatique** | Doug + Matique | Dogmatique | Dogmatic |
| **@CamilleOnette** | Camille + Onette | Camionnette | Van |
| **@ClairVoyant** | Claire + Voyant | Clairvoyant | Psychic |
| **@LucArne** | Luc + Arne | Lucarne | Skylight |
| **@MariTurne** | Marie + Turne | Maritime | Maritime |
| **@PierreFeu** | Pierre + Feu | Pierre à feu | Flint |
| **@RoseHippy** | Rose + Hippy | Rose hip | Rosehip |
| **@SylvainCu** | Sylvain + Cu | Sylvain cuit | Well done |
| **@YvesScalade** | Yves + Scalade | Et s'escalade | And climbs |
| **@HenriCover** | Henri + Cover | En recovery | Recovering |
| **@ClaudFondue** | Claude + Fondue | Claque fondue | Slap fondue |

#### Category 2: Profession/Role Mashups (25%)

Combining a name with their family profession or role:

| Handle | Construction | Meaning |
|--------|--------------|---------|
| **@DiggerDad** | Classic format | Lefebvre tradition |
| **@FarmMom** | Classic format | Vidal tradition |
| **@DrumBoy** | Classic format | Bouche tradition |
| **@HealerGirl** | Classic format | Rousseau tradition |
| **@SporeKid** | Mushroom + Kid | Farmer child |
| **@TunnelRat** | Literal | Small digger |
| **@CrystalTender** | Job + Tender | Works with Crystal |
| **@MapMaker** | Literal | Girard tradition |
| **@InkFingers** | Feature + Body | Writer/cartographer |
| **@StoneBreaker** | Material + Action | Digger |
| **@MossWatcher** | Plant + Role | Maintenance |
| **@BeatKeeper** | Sound + Role | Drummer |
| **@SilenceBreaker** | Concept + Role | Sound producer |
| **@VinylDisciple** | Sacred + Role | Sound religious |

#### Category 3: Absurd Personality/Behavior (20%)

Given based on baby behavior, then stuck forever:

| Handle | Meaning | Origin |
|--------|---------|--------|
| **@ScreamMachine** | Loud baby | Never stopped crying |
| **@SnoreLord** | Snoring | Snored as infant |
| **@WiggleWorm** | Movement | Couldn't sit still |
| **@DroolPool** | Drooling | Very drooly baby |
| **@PotatoBaby** | Shape | Round infant |
| **@BaldEagle** | Hairless | Bald until age 3 |
| **@BuzzyBee** | Energy | Always moving |
| **@IronicSilence** | Ironic | Extremely loud person |
| **@TinyTornado** | Destruction | Destructive toddler |
| **@GrumpyGuts** | Mood | Permanent frown |
| **@SmileTooMuch** | Creepy | Concerning constant smile |
| **@DeepSleeper** | Sleep | Slept through everything |
| **@NeverShutUp** | Talking | Endless chatter |
| **@MysteryKid** | Unknown | Origin forgotten |
| **@ThreeDaysLate** | Birth | Born late |
| **@MidnightBaby** | Birth time | Born at midnight |
| **@SurprisePackage** | Unplanned | Surprise pregnancy |
| **@SecondServing** | Twin | Second twin |
| **@QuietMouse** | Volume | Very quiet |
| **@LoudCloud** | Volume | Very loud |
| **@ChaosChild** | Behavior | Unpredictable |
| **@PeacefulOne** | Behavior | Unusually calm |

#### Category 4: Physical Feature Handles (10%)

| Handle | Feature | Notes |
|--------|---------|-------|
| **@BigEyes** | Eyes | Large eyes (common underground) |
| **@TinyNose** | Nose | Small nose |
| **@RedTop** | Hair | Red hair (rare) |
| **@CurlyQ** | Hair | Curly hair |
| **@LongArms** | Body | Long limbs |
| **@FrecklesFace** | Skin | Freckles |
| **@BlueEyes** | Eyes | Blue eyes (very rare!) |
| **@ShadowHair** | Hair | Very dark hair |
| **@PaleGhost** | Skin | Extremely pale |
| **@TallOne** | Height | Notably tall (rare) |
| **@ShortStack** | Height | Very short |

#### Category 5: Birth Event Handles (5%)

| Handle | Event | Notes |
|--------|-------|-------|
| **@MushroomBaby** | Harvest birth | Born during harvest |
| **@StormChild** | Power event | Born during fluctuation |
| **@FifthSilence** | Crisis | Born during Year 278 event |
| **@TuningDay** | Tuning | Born during a Tuning |
| **@MiracleBirth** | Difficult | Survived difficult birth |
| **@QuickArrival** | Fast | Very fast delivery |
| **@FestivalKid** | Holiday | Born during celebration |
| **@BlackoutBaby** | Brownout | Born during power loss |

#### Famous Historical Handles (Referenced in Lore)

These handles from the founding generation are legendary:

| Handle | Person | Status |
|--------|--------|--------|
| **@UndergroundDad** | Henri Marchand | Founder, deceased |
| **@NapTimeNinja** | Marc Delacroix | Second Dadi, deceased |
| **@QuietDad_FR** | Marc Delacroix (secret) | Never discovered |
| **@SporeMom** | Dr. Claudine Vidal | Founder, deceased |
| **@DrumCircleDad** | Jean-Pierre Moreau | Founder, deceased |
| **@CaveMapper** | The Lefebvre founder | First name lost |
| **@NurseMidnight** | The Rousseau founder | First name lost |
| **@GeneratorGuy** | The Brenner founder | German engineer |
| **@VetDad** | The Duval founder | Veterinarian |
| **@TheRaver** | Kaylee Jo Lindquist | Founder (no @, tradition) |
| **@BeatboxJerome** | Jérôme Bouche | Fifth Silence hero |

#### Handle Generation Rules

```
PUNS (40%):
- Take first name
- Add suffix that creates French word when spoken
- Examples: Jean + Bon = Jambon, Claire + Voyant = Clairvoyant

PROFESSION (25%):
- Family profession + family role word
- Can use English or French
- Examples: @DiggerDad, @SporeKid, @HealerGirl

PERSONALITY (20%):
- Observation from infancy
- Often ironic or exaggerated
- Examples: @ScreamMachine, @QuietMouse

PHYSICAL (10%):
- Notable physical feature
- Often something rare/distinctive
- Examples: @BlueEyes, @TallOne

BIRTH EVENT (5%):
- Significant event during birth
- Historical reference
- Examples: @FifthSilence, @BlackoutBaby
```

### 8.3 Family Name Sources

**Founding Families (from lore):**
Marchand, Delacroix, Moreau, Vidal, Lefebvre, Rousseau, Brenner, Duval, Perez, Girard, Martinet, Beaumont, Ferrand, Bouche, Lindquist

**French Occupational Names:**
Boulanger, Charpentier, Forgeron, Meunier, Tisserand, Mercier, Barbier, Boucher, Fournier, Cordier, Sellier, Potier, Carrier, Couturier, Faure, Lefevre, Lemaire, Berger, Marin, Chevalier

**French Geographic Names:**
Dupont, Dumont, Fontaine, Dubois, Rivière, Dupré, Laforêt, Duval, Delarue, Deschamps, Delacroix, Desjardins, Beaumont, Belmont, Montagne, Vallée, Lacroix, Laplace

**French Descriptive Names:**
Petit, Grand, Blanc, Roux, Leblanc, Legrand, Leroux, Lenoir, Lejeune, Morel, Moreau, Brun, Lebrun, Gros, Court, Long

**North African Names:**
Benali, Benmohamed, Bouaziz, Cherif, Haddad, Hamadi, Kaci, Khelifi, Mansouri, Mesbah, Rahmani, Saadi, Toumi, Yahi, Zidane, Bouchaib, Benzahra, Lakhdari, Belkacem, Mokrani

**Sub-Saharan African Names:**
Diallo, Diop, Ndiaye, Sow, Ba, Fall, Camara, Traoré, Koné, Coulibaly, Sylla, Barry, Cissé, Touré, Keita, Dembélé, Sangaré

**Portuguese Names:**
Da Silva, Dos Santos, Ferreira, Pereira, Almeida, Costa, Oliveira, Rodrigues, Martins, Sousa, Fernandes, Goncalves, Ribeiro, Mendes

**Eastern European Names:**
Kowalski, Nowak, Wiśniewski, Wójcik, Kowalczyk, Kamiński, Lewandowski, Zieliński, Popov, Ivanov, Petrov, Volkov, Sokolov, Morozov

**Compound/Noble Style Names (rare, prestigious):**
Saint-Martin, Saint-Pierre, De la Fontaine, De la Croix, Du Bois, De Beaumont, Le Marchand, La Ferrand

---

## 9) Generation Algorithm

### 9.1 Individual Generation Steps

```
1. DETERMINE FAMILY
   - Roll against family distribution (Section 2.2)
   - If minor family, generate or pull from minor family pool

2. DETERMINE DEMOGRAPHICS
   - Age: Roll against age distribution (2.1)
   - Gender: 50/50

3. GENERATE PHYSICAL TRAITS
   - Height: Roll base + family modifier (3.1)
   - Build: Roll base + profession modifier (3.2)
   - Hair: Roll base + family modifier (3.3)
   - Eyes: Roll base + family modifier (3.4)
   - Skin: Roll base + surface exposure modifier (3.5)
   - Features: Roll 0-3 distinguishing features (3.6)

4. DETERMINE BELIEFS
   - Creed: Roll against family creed distribution (4.2)
   - Creed intensity: Roll against intensity distribution (4.3)
   - Politics: Roll against family politics distribution (5.2)
   - Studio Echo stance: Roll with modifiers (5.3)

5. DETERMINE PROFESSION
   - If age >= 8: Roll profession with family affinity (6.1, 6.2)
   - If age < 8: No profession yet

6. GENERATE NAME
   - First name: Roll from appropriate pool (8.1)
   - Nickname: Generate based on category roll (8.2)
   - Family name: From family assignment

7. GENERATE TRAITS (if recruitable)
   - Positive: Roll rarity, then trait from available pool
   - Negative: Roll rarity, then trait from available pool
   - Mixed: Roll rarity, then trait from available pool
   - Apply family/creed weights
   - Check opposition rules

8. GENERATE RELATIONSHIPS (optional depth)
   - Parents (if not orphan)
   - Siblings (based on family size)
   - Spouse (if age-appropriate, ~60% of 25+ are married)
   - Children (if married and age-appropriate)

9. APPLY STORY FLAGS (for special characters)
   - Recruitable: Yes/No
   - Story role: None/Minor/Major/Key
   - Unlock condition: None/Story/Quest/Achievement
```

### 9.2 Batch Generation

For full census:
1. Generate all ~149 family units first
2. Assign members to families based on family size distribution
3. Generate individuals within family context
4. Build relationship graphs
5. Flag ~100-200 for "notable" status (named in story)
6. Flag ~50-100 for "recruitable with conditions"

---

## 10) Authored Characters (Story Layer)

These characters are hand-written, not generated. They override procedural generation.

### 10.1 Key Story Characters

*To be authored separately - these have fixed traits, relationships, and story roles.*

**Examples of needed authored characters:**
- The current Dadi (Sylvain Marchand) - already in lore
- The Hero's immediate family (Lindquist)
- Key political figures from each major family
- The Vinyl Guardian (current)
- Notable Martinets (investigators)
- Jérôme "Beatbox" Bouche's descendants
- Old Sweep Maurice (if still alive?)
- First recruits (true believers)

### 10.2 Special Recruit Pool

Characters who can only be recruited under specific conditions:

| Character Type | Unlock Condition | Example |
|----------------|------------------|---------|
| Political Delegate | Reach certain reputation | Delacroix sends observer |
| Specialist | Complete related quest | Master engineer |
| Reluctant Hero | Prove Studio Echo viable | Earthbound convert |
| Family Black Sheep | Secret discovered | Marchand with drive knowledge |
| Prodigy | Random rare event | Young genius |

---

## 11) Implementation Notes

### 11.1 Data Structure (Draft)

```json
{
  "id": "unplugged_001234",
  "generation_seed": 12345,
  "authored": false,

  "identity": {
    "first_name": "Margot",
    "nickname": "@Margot",
    "family": "lindquist",
    "birth_year": 276,
    "age": 24,
    "gender": "female"
  },

  "physical": {
    "height_cm": 168,
    "build": "lean",
    "hair_color": "light_brown",
    "eye_color": "blue",
    "skin_tone": "pale",
    "features": ["freckles", "surface_mark_x1"]
  },

  "beliefs": {
    "creed": "lectromusic",
    "creed_intensity": "devout",
    "politics": "neutral",
    "studio_echo_stance": "strong_supporter"
  },

  "profession": "drummer",

  "traits": {
    "positive": {"id": "outlived_the_odds", "revealed": false},
    "negative": {"id": "surface_addiction", "revealed": true},
    "mixed": {"id": "kaylees_dreams", "revealed": false}
  },

  "relationships": {
    "parents": ["unplugged_000892", "unplugged_000893"],
    "siblings": ["unplugged_001235"],
    "spouse": null,
    "children": []
  },

  "flags": {
    "recruitable": true,
    "recruit_condition": null,
    "story_role": "minor",
    "first_appearance": "early_recruit_pool"
  }
}
```

### 11.2 Census Statistics Validation

After generation, validate:
- Family size distribution matches targets
- Age distribution matches targets
- Creed distribution matches targets (overall and per-family)
- Politics distribution matches targets
- Profession distribution matches targets
- Trait rarity distribution is correct
- No impossible trait combinations exist

---

## 12) Open Questions

- [ ] How many authored characters do we need for story?
- [ ] What's the minimum data needed for non-recruitable NPCs?
- [ ] Should relationships affect recruitment (e.g., "won't come if sibling was sent back")?
- [ ] How to handle character aging across Tunings (time passes)?
- [ ] Should some traits be generational (passed parent to child)?

---

*Population Census — v0.1 (December 17, 2025)*
