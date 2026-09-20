# ADD — Direction créative et système d'interface

## Version adaptée pour Aedventure

**Version :** 1.0 — adaptation du brief fourni le 20 septembre 2026  
**Produit :** `ADD` / `ADD RPG` dans l'application ; `Aedventure` est le nom du dépôt et de la plateforme, pas un lieu du monde.  
**Langue de travail :** ce document est en français ; l'interface actuelle possède une baseline anglaise.  
**Format :** jeu idle/RPG de survie et d'exploration, centré sur une carte, avec gestion de base et intérieurs explorables.  
**Direction retenue :** terrain sombre et lisible, refuge acoustique, minéralité du tuffeau, signal chaud, interface en couches légères.  
**Priorités :** comprendre la situation, voir le monde, prendre une décision utile, puis laisser le temps et les systèmes produire leurs conséquences.

> Le monde est mort quand il s'est tu. Un ancien studio recommence à résonner.

Ce document conserve les bonnes intuitions du brief « Scraps & Survivors » — chaleur humaine, objets réparés, retenue, composants réutilisables et espoir concret — mais les rattache au jeu réel. Il ne faut plus employer « Scraps & Survivors » comme nom de produit, ni transposer au jeu une colonie générique en surface.

La direction s'appuie sur les sources canoniques du dépôt : [le README du jeu](../README.md), [le guide de ton](../lore/tone_guide.md), [le thésaurus](../lore/thesaurus.md), [Studio Echo](../lore/locations/touraine/studio_echo.md) et [Les Grottes de la Bresme](../lore/locations/touraine/les_grottes_de_la_bresme.md). Les règles de jeu restent dans le runtime Rust et les contenus validés ; ce document ne crée pas de mécanique.

Les chiffres, textes et états montrés ici sont soit des données déjà visibles dans l'application, soit des exemples de composition. Ils ne remplacent ni l'équilibrage, ni les contrats de contenu, ni les scénarios déterministes.

## Sommaire

1. Cadre produit et vocabulaire
2. Univers, géographie et limites canoniques
3. Langage visuel
4. Palette, typographie et identité
5. Composition des écrans
6. Composants d'interface
7. Catalogue des assets et des scènes
8. Catalogue des icônes et des signaux
9. Textures et matières
10. Animation, audio et retours d'interaction
11. Spécifications techniques et maintenabilité
12. Direction rédactionnelle et microtextes
13. Prompts réutilisables
14. Production initiale et contrôle qualité
15. Décisions encore ouvertes

---

## 1. Cadre produit et vocabulaire

### 1.1. Nom et périmètre

| Terme | Usage dans ce document | À ne pas faire |
| --- | --- | --- |
| `ADD` | Nom de travail actuel du jeu | Le remplacer par un titre inventé |
| `ADD RPG` | Nom employé par l'application web actuelle | Le traiter comme un univers ou une faction |
| `Aedventure` | Nom du dépôt, de la plateforme et des packages | L'utiliser comme nom d'une colonie |
| Studio Echo | Base du Hero, ancien studio d'enregistrement à Pernay | Le transformer en camp générique |
| Les Grottes de la Bresme | Survivor Cave, settlement souterrain à Saint-Étienne-de-Chigny | Le réduire à une simple grotte décorative |
| The Silence / The Deadly Silent | Catastrophe et menace de silence | En faire une ambiance paisible |
| The Filter | Réseau de satellites et champ d'annulation du son aérien | Le représenter automatiquement par une parabole au sol |
| Crystal | Anomalie résonante qui peut soutenir une bulle locale | En faire une magie lumineuse ou un minerai de fantasy |
| Bubble | Zone protégée autour d'un Crystal | La confondre avec une jauge abstraite sans géographie |
| Hero / Resilient | Personnage jouable et mutation de tolérance au silence | Le présenter comme un élu invulnérable |

Le titre définitif peut encore évoluer. Tant qu'il n'est pas validé, la marque et les composants doivent rester séparés : le logo, le nom du jeu et les identifiants de contenu ne doivent pas être peints dans les illustrations.

### 1.2. Ce que le joueur fait réellement

Le jeu actuel est une boucle d'exploration, de gestion et de progression idle :

1. traverser l'overworld hexagonal avec le Hero ;
2. atteindre et remettre en état Studio Echo ;
3. faire grandir la Bubble à partir du Crystal Circle ;
4. affecter le Hero et le crew aux rôles de Crystal, de construction, d'eau et de Vibes ;
5. construire les stations de la Base et surveiller leurs coûts d'entretien ;
6. relier la Base à la Survivor Cave et recruter ;
7. explorer des zones et des intérieurs, envoyer des expéditions et rapporter des indices ;
8. laisser la Base produire hors ligne, puis revenir lire ce qui a changé.

La promesse n'est pas « accumuler une population dans un décor de ruines ». C'est maintenir une infrastructure sonore fragile, ouvrir quelques kilomètres de monde habitable et décider ce qui mérite du temps, du personnel et des ressources.

### 1.3. Intention émotionnelle

Le joueur doit ressentir :

- la satisfaction précise d'une réparation qui agrandit réellement une zone sûre ;
- la tension d'une sortie hors Bubble avec un temps de survie limité ;
- la familiarité étrange d'un vieux studio, de ses câbles, de ses cloisons acoustiques et de ses murs de pierre ;
- l'importance d'une personne assignée au bon poste ;
- la curiosité devant les traces de l'avant et les endroits que le monde n'a pas encore expliqués ;
- un humour sec et humain dans les moments où personne n'est immédiatement en danger.

L'espoir est local et mesurable : une case de carte révélée, une station alimentée, un recruit qui arrive, une porte qui s'ouvre. La catastrophe ne devient jamais une expérience de camping confortable.

### 1.4. Piliers visuels

| Pilier | Traduction visible | Limite |
| --- | --- | --- |
| Carte avant le décor | Monde plein écran, brume, Bubble, Hero, repères et panneaux contextuels | Ne pas cacher la carte derrière un dashboard opaque |
| Le son comme infrastructure | Crystal, anneaux de résonance, bandes Bassline/Chorus/Harmonics, stations audio | Ne pas transformer chaque valeur en onde animée |
| Refuge réemployé | Tuffeau, bois, isolation, outils, ancien matériel de studio, réparations lisibles | Pas de bric-à-brac apocalyptique uniforme |
| Menace spatiale | Monde extérieur vaste, brume, limites de visibilité, hors-bulle dangereux | Pas de gore ou de danger clignotant partout |
| Communauté en construction | Hero, crew, rôles, Fire Pit, bunks, gestes de travail | Pas de portraits obligatoires ni de foule décorative |
| Mystère retenu | Documents, portes, caves, fragments et signaux ambigus | Ne pas expliquer The Silence dans chaque panneau |
| Clarté opérationnelle | Un objectif, un blocage, une action primaire, un résultat | Ne pas sacrifier la lisibilité à une texture ou à une métaphore |

### 1.5. Mots-clés et exclusions

**Mots-clés :** résonant, tuffeau, studio abandonné, cave habitée, réparé, analogique, cartographique, profond, fragile, collectif, ironique, persistant, lisible.

**À éviter :** désert post-apocalyptique générique, esthétique militaire, néon cyberpunk, fantasy cristalline, bunker high-tech, interface papier beige, fausse console terminal, gore, zombies, héros musclé, « morale » générique, jauges de nourriture inventées, antenne parabolique posée au milieu du monde comme emblème.

---

## 2. Univers, géographie et limites canoniques

### 2.1. Faits visuels de référence

| Élément | Référence à utiliser |
| --- | --- |
| Époque | Année 311 AS, environ 2345 CE |
| Région | Touraine, vallée de la Loire, France |
| Base | Studio Echo, ancienne ferme et studio d'enregistrement près de Pernay |
| Coordonnée de la Base | Hex `(0, 0)`, origine de l'overworld |
| Survivor Cave | Les Grottes de la Bresme, près de Saint-Étienne-de-Chigny, hex `(6, 0)` |
| Échelle | Un hexagone représente environ 4 km ; l'overworld prototype compte 6 anneaux |
| Géologie | Tuffeau, falaises et réseaux de caves liés à la Bresme |
| Base de départ | Hero seul, avec Dweller Bane dans l'espace de Studio Echo selon l'état du jeu |
| Menace | Hors zone protégée, le silence active Hush-2 ; une personne ordinaire ne tient qu'environ quatre heures |
| Hero | Resilient : tolérance étendue, environ vingt-quatre heures ; ce n'est pas une immunité |

### 2.2. Les règles du monde qui changent l'image

**The Silence / The Deadly Silent.** Le silence n'est pas une atmosphère contemplative. Il est une menace biologique et environnementale. Une image peut être calme, mais elle ne doit pas suggérer que l'absence de son est un confort ou une solution.

**The Filter.** Le réseau de satellites a fini par supprimer presque toute propagation sonore aérienne. Les satellites peuvent être évoqués comme une cause lointaine, des archives techniques ou une présence au ciel très discrète. Ils ne sont pas un décor obligatoire et ne doivent pas être remplacés par une parabole au sol.

**Les Crystals.** Les Crystals sont des anomalies minérales résonantes apparues après The Silence. Ils créent une Bubble locale lorsque l'énergie acoustique les alimente. Ils ne sont pas la technologie des Sounding Five et ne doivent pas être dessinés comme des gemmes magiques.

**La Bubble.** C'est à la fois une protection géographique, une limite de progression et une relation visible entre le Crystal, la Base et les cases atteignables. La frontière doit être lisible sur la carte, mais pas traitée comme une clôture lumineuse de science-fiction.

**Le son.** Les tambours, la voix, les appareils réparés et les stations de résonance ont une place dans le monde. Le jeu peut donc montrer des sources de son contrôlées. Il ne faut simplement pas ajouter une flamme, une radio, un ventilateur, du vent ou une ambiance sonore active dans une scène où leur fonctionnement n'est pas établi.

**La surface.** Une communauté ordinaire ne campe pas librement sur la surface. Les scènes extérieures doivent se dérouler dans une Bubble, pendant une sortie d'un Resilient ou dans un lieu dont la protection est explicitement visible.

### 2.3. Géographie de la première tranche

| Lieu | Rôle de jeu | Traduction visuelle |
| --- | --- | --- |
| Studio Echo | Base, Crystal site, premières stations et premier donjon | Ferme de pierre, ancien barn/studio, câbles, cloisons acoustiques, cave effondrée |
| Studio Grounds | Zone hexagonale proche de la Base | Parcelle rurale, bâtiments, chemin, tuffeau, végétation contrôlée, traces d'activité |
| Les Grottes de la Bresme | Source de recrutement et futur intérieur souterrain | Entrées troglodytes, falaises claires, caves, eau, culture de champignons, refuges profonds |
| Tours / dead city | Horizon ou objectif futur à haut risque | Skyline lointaine et désaturée, jamais un panorama héroïque omniprésent |
| Cases de l'overworld | Exploration, ressources, faune et obstacles | Plains, river shallows, scrub, ridge, mountain wall ; silhouettes cohérentes et peu détaillées |

### 2.4. Les quatre modes de carte actuels

Les libellés visibles restent simples. Les identifiants techniques ne sont pas affichés au joueur.

| Libellé | ID technique | Topologie | Question à laquelle il répond |
| --- | --- | --- | --- |
| World | `overworld_hex` | Hexagones | Où aller, quelle case révéler, quelle route est sûre ? |
| Studio | `area_hex` | Hexagones | Que contient la zone autour de Studio Echo ? |
| Cave | `dungeon_square` | Cases carrées | Que voit le Hero dans un intérieur, quelle porte ou sortie reste à comprendre ? |
| Base | `base_square` | Cases carrées | Où se trouvent le Crystal Circle, le Workshop et l'entrée du Studio ? |

Le sélecteur de modes est un seul contrôle segmenté. Il ne devient pas une navigation latérale permanente, et il ne doit pas ressembler à quatre produits différents.

### 2.5. Silhouettes narratives

- **Studio Echo :** ancien lieu conçu pour enregistrer et contrôler le son, devenu l'origine d'une nouvelle communauté.
- **Le Crystal Circle :** ancrage de la Bubble et centre de la boucle Bassline/Chorus/Harmonics.
- **La Base :** une suite d'espaces réparables, pas une forteresse déjà terminée.
- **La Survivor Cave :** profondeur, transmission, champignons, eau et mémoire des Unplugged.
- **Le Hero :** une personne utile parce qu'elle résiste plus longtemps au silence, pas parce qu'une prophétie l'a choisie.
- **Le Dweller Bane et les créatures :** une faune adaptée, identifiable et ponctuelle ; pas une horde décorative.

### 2.6. Garde-fous narratifs

Ne pas ajouter sans validation : factions nouvelles, technologies qui arrêtent The Silence, satellites clairement pilotables, magie, armées dominantes, villes de surface ordinaires, immunité du Hero, origine différente des Crystals, ressources non présentes dans le catalogue, ou noms de lieux inventés dans des assets.

Les détails encore ouverts restent visibles comme tels. Une illustration ne doit pas décider seule de la portée du Filter, de la nature d'un Crystal ou de l'avenir du réseau.

---

## 3. Langage visuel

### 3.1. Direction générale

Le monde est peint et texturé ; l'interface est nette et cartographique. La carte doit pouvoir rester intéressante sans illustration plein écran : la personnalité vient de la palette, des silhouettes, de la profondeur de champ, du fog, des repères et de la façon dont la lumière chaude d'une Bubble découpe un terrain sombre.

Le rendu cible est une illustration éditoriale stylisée, avec des masses simples, des contours modérés et des traces d'usure choisies. Il peut être painterly sans devenir photoréaliste. Le code actuel utilise des formes procédurales et des marqueurs lisibles : les futurs assets doivent compléter cette grammaire, pas la recouvrir d'une seconde esthétique.

### 3.2. Le contraste fondateur

Le contraste mémorable d'ADD n'est pas « beige contre rouille ». C'est **un territoire froid et peu lisible qui devient praticable autour d'un signal vivant** :

- champ profond vert-noir et terrain désaturé ;
- Bubble, Crystal et actions avec des accents aqua ou ambre ;
- surfaces de lecture en papier chaud, mais seulement dans les textes et panneaux ;
- pierre claire, bois sombre, métal de studio et câbles comme matières de refuge ;
- brume et occlusion qui signalent l'inconnu plutôt qu'un simple dégradé décoratif.

### 3.3. Formes et topologie

Les hexagones de l'overworld doivent rester lisibles comme une carte, même lorsque le terrain est illustré. Les cases carrées des intérieurs doivent lire comme des pièces, des couloirs, des murs et des portes ; elles ne doivent pas imiter artificiellement un terrain hexagonal.

Les silhouettes de structures sont plus importantes que les micro-détails : Crystal, cave mouth, Studio, workbench, door, Hero, creature et resource markers doivent être reconnaissables à petite taille.

Les panneaux HTML peuvent être rectangulaires et précis. L'irrégularité appartient à la pierre, au bois, aux câbles et aux archives, pas aux alignements ni aux zones cliquables.

### 3.4. Lumière

Le fond du monde est sombre et verdâtre, avec une lumière ambiante faible. Les sources associées à une activité sûre — Crystal, Bubble, station alimentée, destination sélectionnée — peuvent tirer vers l'aqua ou l'ambre. La lumière chaude ne doit pas promettre la sécurité hors Bubble.

Éviter : coucher de soleil héroïque permanent, halos autour de chaque bouton, ciel bleu de carte touristique, glow cyan uniforme, contre-plongée de héros et contraste si fort que les cases ou les textes disparaissent.

### 3.5. Matières

| Matière | Usage | Traitement |
| --- | --- | --- |
| Tuffeau / calcaire | Falaises, caves, murs du studio, donjons | Clair mais poreux, arêtes cassées, pas de marbre fantasy |
| Bois ancien | Charpente, workbench, crates, mobilier | Veines larges, réparations ponctuelles, mat |
| Toile et isolation | Auvents, cloisons, couvertures et anciennes salles d'enregistrement | Trame légère, tension crédible, pas de vent automatique |
| Métal de studio | Console, supports, poignées, outils, portes | Peinture sombre, petites éraflures, cuivre ou rouille limitée |
| Verre et plastique | Lampes, panneaux, instruments récupérés | Reflets simples, jamais une interface lumineuse intégrée |
| Papier et vinyle | Cartes, fiches de session, pochettes, archives | Support narratif, texte ajouté séparément |
| Végétation de Touraine | Haies, ronces, herbes, bord de rivière | Désaturée et localisée, pas de jungle générique |

Une zone d'interface n'emploie qu'une matière dominante. Le panneau ne doit pas être simultanément feuille, toile, bois, métal et vitre.

### 3.6. Signature d'identité

La signature ADD est la combinaison de cinq motifs :

1. un monde cartographié et partiellement caché ;
2. un signal résonant aqua ou ambre ;
3. un refuge de pierre/tuffeau et de matériel d'enregistrement ;
4. un personnage ou un crew visible à une échelle humaine ;
5. un espace vide qui laisse The Silence peser sur l'image.

Un asset n'a pas besoin de contenir les cinq motifs. La carte, le Crystal et Studio Echo les réunissent progressivement. Une petite icône n'en reprend qu'un ou deux.

---

## 4. Palette, typographie et identité

### 4.1. Palette de référence du produit

Ces valeurs sont alignées avec les tokens présents dans `apps/add-rpg/src/browser/styles.css`. Elles remplacent la palette beige/bleu pétrole du brief d'origine.

| Token | Hex | Rôle |
| --- | --- | --- |
| `ink` | `#101917` | Fond profond, texte sombre sur surfaces claires |
| `field` | `#182622` | Terrain et champ principal |
| `field-2` | `#263B34` | Terrain secondaire, surfaces de carte |
| `paper` | `#F7EED2` | Texte clair, repères lumineux, surfaces de lecture ponctuelles |
| `paper-soft` | `#E4D8B7` | Texte secondaire et détails doux |
| `accent` | `#E6A84E` | Action principale, objectif, progression, sélection forte |
| `aqua` | `#5FD1D8` | Crystal, découverte, focus de carte, information active |
| `mode-base` | `#86D37B` | Base et états de production sains |
| `mode-base-warm` | `#F0B95D` | Transition/attention dans le mode Base |
| `mode-dungeon` | `#AAB8C4` | Intérieurs, murs, surfaces de Cave |
| `mode-dungeon-strong` | `#D6E1EA` | Contraste fort dans les intérieurs |
| `mode-return` | `#FFD37F` | Retour, récupération, résultat à consulter |
| `danger` | `#C8654B` | Blocage critique, brownout, risque réel |

### 4.2. Règles d'utilisation

- Le monde et l'interface commencent dans le champ sombre ; `paper` n'est pas un fond plein écran par défaut.
- `accent` attire l'attention sur une décision ou un objectif. Il ne signifie pas automatiquement danger.
- `aqua` signifie signal, découverte, Crystal ou relation avec la carte. Il ne doit pas devenir une lueur décorative permanente.
- `mode-base`, `mode-dungeon` et `mode-return` distinguent des contextes. Ils complètent les libellés, ils ne les remplacent pas.
- `danger` doit être rare, local et explicite : « Brownout active », « Movement blocked », « Hero is exposed ».
- Ne jamais distinguer disponible, insuffisant, verrouillé ou dangereux par la seule couleur.
- Vérifier le contraste réel avec les transparences, le blur et les textures, pas seulement les hexadécimaux.

### 4.3. Typographie

L'interface actuelle fonctionne avec une pile sans-serif système :

```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", sans-serif;
```

La conserver comme baseline fonctionnelle. Elle tient mieux les nombres, les libellés traduits, les panneaux d'état et les écrans mobiles qu'une police décorative.

Une seconde famille peut être testée plus tard pour le logo, les chapitres narratifs ou une grande accroche, mais elle ne doit pas être chargée pour chaque bouton. Ne pas reconduire automatiquement Bebas Neue, Inter et Source Sans Pro en même temps : le brief source les mélangeait sans besoin produit.

| Rôle | Traitement |
| --- | --- |
| Titre de mode ou de panneau | Sentence case, poids fort, largeur courte |
| Texte opérationnel | Sans-serif système, 0.9–1rem, interligne confortable |
| Micro-label de statut | Petite taille, contraste élevé, casse normale ; capitales seulement si elles codent un statut compact |
| Chiffres de ressources | Chiffres tabulaires, alignement stable |
| Texte narratif | Même famille, longueur courte, une légère variation de poids suffit |
| Identifiants techniques | Masqués à l'utilisateur ; réservés aux outils Admin/Dev |

Viser moins de 75 caractères par ligne dans les panneaux de lecture. Un bouton dit ce qui va arriver : « Assign the Hero », « Build Fire Pit », « Return to World », pas une formule d'ambiance.

### 4.4. Échelle et géométrie

Conserver un rythme d'espacement de 4/8/12/16/24/32 px. Les panneaux actuels utilisent des rayons modestes autour de 8 px ; ne pas passer à des cartes fortement arrondies de type SaaS.

Les bordures sont fines et translucides. Les ombres séparent un panneau flottant de la carte ; elles ne donnent pas à chaque ligne le poids d'une carte indépendante. Le focus clavier est toujours plus visible qu'une bordure de repos.

### 4.5. Marque

Le mot-symbole `ADD` peut être court, dense et lisible sur le champ sombre. Une ligne ambre ou un petit repère aqua peut l'accompagner. L'effet usé est réservé au logo ou à un asset de présentation. Aucun compteur, coût, nom de ressource ou action n'est rasterisé dans le logo.

---

## 5. Composition des écrans

### 5.1. Écran de référence : carte et décision

La carte est la surface primaire. Les panneaux flottent au-dessus et se retirent dès qu'ils empêchent de lire le monde.

```text
┌──────────────────────────────────────────────────────────────────┐
│ World · Studio · Cave · Base   status   resources  time  speed  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────┐                 map / fog / Bubble    │
│   │ OBJECTIVE             │          ○ Hero       ◇ Crystal       │
│   │ Reach Studio Echo     │       hex terrain   selected route    │
│   │ 2 steps remaining     │                                     │
│   │ [Collapse]            │                                     │
│   └──────────────────────┘                    +  -              │
│                                                                  │
│                                     ┌──────────────────────────┐ │
│                                     │ SELECTED TILE / CONTEXT  │ │
│                                     │ situation                 │ │
│                                     │ action + cost + result    │ │
│                                     └──────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

Sur petit écran, le panneau d'objectif se compacte et le contexte devient une bottom sheet. La carte reste visible derrière. Il n'y a pas de barre latérale papier, de second menu permanent ni de panorama obligatoire au-dessus de chaque page.

### 5.2. Hiérarchie des couches

| Couche | Contenu | Règle |
| --- | --- | --- |
| Primaire | Phaser world/map : terrain, Hero, créatures, landmarks, fog, Bubble | Toujours lisible et ciblable |
| Secondaire | Objective tracker, discovery panel, Base management, dungeon context | Répond à la décision actuelle ; peut se réduire |
| Tertiaire | Map modes, status, ressources, temps, zoom, menu | Compact, stable, non décoratif |
| Transitoire | Travel confirmation, offline return, story choice, settings | Focus géré, fermeture explicite, pas d'empilement opaque |
| Outils | Admin et Dev | Visuellement séparés, jamais confondus avec le parcours joueur |

### 5.3. Ce que le joueur doit voir

À chaque état, l'interface doit permettre de répondre rapidement à quatre questions :

1. Où est le Hero et que connaît-il du terrain ?
2. Quelle menace, limite ou évolution est active ?
3. Quelle action est possible maintenant ?
4. Qu'est-ce qui changera si j'attends, si je dépense ou si je pars ?

Un panneau qui ne répond à aucune de ces questions devient un détail pliable, un tooltip ou un élément d'outil.

### 5.4. Écrans et contextes

| Contexte | Composition | Accent |
| --- | --- | --- |
| World | Overworld hex, Hero, fog, Bubble reach, terrain sélectionné, route | Aqua pour découverte, ambre pour action |
| Studio | Zone locale, repères proches, entrée de Base et accès au dungeon | Vert de Base + aqua du Crystal |
| Base | Panneau de gestion, actions, rates, tabs Crystal/Build/Power/Crew/Social/Expeditions/Resonance/Processing | Vert et ambre, danger rouge seulement pour brownout/pression |
| Cave | Dungeon square, visibilité locale, murs, sorties et objectif | Gris bleu minéral, faible lumière, repères ambre aux portes |
| Travel | Confirmation de trajet, exposition, destination et coût de temps | Ambre, danger seulement si le risque est réel |
| Offline return | Résultat regroupé, travaux terminés, gains, recrues, blocages et prochaine décision | Jaune pâle de retour ; aucun feu d'artifice |
| Settings | Fenêtre flottante claire et structurée, son, rythme, sauvegarde, confort | Stable, accessible, indépendante de l'ambiance |

### 5.5. Overworld hexagonal

La carte n'est pas une illustration d'arrière-plan. Les cases portent une information : terrain, blocage, ressource, destination, visibilité, action ou limite de Bubble.

- Les cases visibles sont distinguées des cases cachées sans ajouter un bruit de grain animé.
- La Bubble est une relation de portée, pas un cercle magique posé au-dessus du monde.
- Les chemins et previews de déplacement sont temporaires, fins et lisibles.
- Les landmarks ont une silhouette stable : Base/Crystal, Survivor Cave, entrée, eau, ressource, créature.
- Un tile sélectionné est identifiable au premier regard et possède toujours un résumé textuel accessible.

### 5.6. Base et gestion idle

La Base n'est pas une page de tableau de bord indépendante du monde. Le passage en mode Base doit conserver un lien perceptible avec Studio Echo, puis ouvrir le panneau de gestion comme une vue opérationnelle.

La lecture recommandée est : état de la Base → bottleneck → action recommandée → rate watch → conséquence à court terme. Les lignes de ressources, de crew et de stations restent comparables ; un grand dessin ne doit pas déplacer les coûts et les durées.

### 5.7. Mobile et tailles réduites

- Réduire d'abord le texte secondaire du topbar, pas la cible tactile.
- Passer les ressources en libellés courts, mais conserver une info-bulle et un nom accessible complet.
- Transformer le contexte en feuille basse ; ne pas empiler trois panneaux au centre.
- Garder les boutons d'action principaux à environ 44 px de haut.
- Masquer le décor avant de masquer la raison d'un blocage.
- Tester les noms longs de lieux, les valeurs de ressources et les traductions avant de fixer une largeur.

---

## 6. Composants d'interface

Les composants sont des éléments DOM et des projections de données. Ils ne doivent pas être livrés comme des images aplaties contenant du texte ou des contrôles.

### 6.1. Catalogue de composants

| ID | Composant | Anatomie | Règle |
| --- | --- | --- | --- |
| C01 | Map stage | Canvas Phaser plein écran, terrain, entités, fog, Bubble, overlays d'interaction | Surface primaire, jamais masquée par une illustration de couverture |
| C02 | Map mode switcher | Tabs `World`, `Studio`, `Cave`, `Base` | Un seul sélecteur ; libellés stables, ids techniques invisibles |
| C03 | Status topbar | Statut courant, ressources prioritaires, horloge, vitesse, menu | Même emplacement dans chaque mode |
| C04 | Resource chip | Nom court, valeur, capacité si utile, tooltip source/sink/blocker | Utilise Bassline, Chorus, Harmonics, Stone, Water, Vibes ; jamais Food/Morale par défaut |
| C05 | World time chip | Jour/heure/contexte, phase de lumière et progression de déplacement | Le temps visible ne doit pas ressembler à une simple date décorative |
| C06 | Objective tracker | Objectif courant, étapes, progression, collapse/drag accessible | Une seule priorité joueur ; pas une liste de quêtes concurrentes |
| C07 | Discovery panel | Tuile sélectionnée, terrain, exposition, actions et destination | Reste compact ; l'action de carte est prioritaire |
| C08 | Base management panel | Titre, action de contexte, bottleneck, rate watch, tabs, cards | Reflète l'état Rust ; ne recalcule aucune règle dans le DOM |
| C09 | Base tab | Label de section, méta (`Ready`, `Blocked`, métrique) et état actif | Sections actuelles : Crystal, Build, Power, Crew, Social, Expeditions, Resonance, Processing |
| C10 | Current action surface | Verbe, coût, effet, durée, prérequis, état | Une action primaire par contexte, raison lisible en cas de blocage |
| C11 | Base metric row | Label, valeur, détail, severity textuelle | Sert aux rates, bunks, upkeep, crew, reports et tuning |
| C12 | Dungeon context panel | Objectif, étape, sorties, blockers, métriques de carte locale | Gris bleu minéral ; aucune navigation permanente supplémentaire |
| C13 | Tile affordance | Marqueur de mouvement, eau, récolte, entrée, porte, destination | Doit correspondre à une interaction réelle |
| C14 | Primary action | Bouton plein ambre ou accent contextuel, verbe précis | « Build », « Assign », « Travel », « Enter », « Return » |
| C15 | Secondary/ghost action | Bouton discret, retour, détail, annulation ou alternative | Ne doit pas voler l'attention à l'action primaire |
| C16 | Travel dialog | Origine, destination, temps, exposition, risque, confirmation | Aucun danger caché derrière un bouton générique |
| C17 | Offline return | Résumé du temps, gains, travaux, recrues, bubble, brownouts, blocages | Regroupe les changements ; propose la prochaine lecture utile |
| C18 | Story moment | Kicker, texte court, options et conséquences éventuelles | Le choix est natif et sélectionnable ; illustration facultative |
| C19 | Settings window | Son, rythme, autosave, confort, langue, reduced motion | Le joueur peut couper musique/effets sans perdre l'information |
| C20 | System state | Loading, error, empty, success, blocked et recovery action | Explique l'état et la récupération ; pas de message vague |

### 6.2. États partagés

Chaque action pertinente documente : normal, hover, focus clavier, pressed/active, disabled, waiting, blocked, insufficient, complete et error.

Une action désactivée explique la cause dans le même panneau. Exemples :

- `Needs 30 Stone.`
- `Build the Fire Pit and reach the cave.`
- `Hero is not assigned.`
- `Chorus cannot cover all requested stations.`
- `Movement blocked.`

Les couleurs, icônes et intensités de lumière complètent le texte. La disparition d'un bouton ou son opacité basse ne peut pas être l'unique explication.

### 6.3. Données visibles et données décoratives

Les nombres de ressources, coûts, durées, états de crew, progression de Bubble, exposition et résultats de retour viennent de snapshots/selectors. Un texte narratif ne doit pas cacher une conséquence mécanique.

Les images peuvent montrer une console, une cave ou une tasse. Elles ne doivent pas contenir le nombre de Stone, le nom d'un bâtiment, le bouton « Build » ou une valeur de Bassline.

### 6.4. Exemple de ligne d'action adaptée

```text
Crystal Circle
Keep the signal growing.
Bassline 18 / 90       Reach 2 / 3
Assign the Hero       Current role: none
```

Les valeurs de cet exemple sont de composition. Dans le jeu, les valeurs et les états sont fournis par le runtime. La ligne doit pouvoir passer de `available` à `blocked`, `in progress` ou `complete` sans changer de composant.

---

## 7. Catalogue des assets et des scènes

Les assets sont des illustrations ou formes de monde indépendantes de l'interface. Ils n'embarquent pas de texte nécessaire au jeu. Les identifiants A01–A18 sont des briefs de production, pas des IDs déjà enregistrés dans le code.

### A01. Overworld de Touraine

**Usage :** référence de terrain et de profondeur pour `World`.  
**Format :** vue ou atlas de cellules hexagonales, avec recadrages possibles.

**Description :** paysage rural de Touraine après The Silence : parcelles ouvertes, haies, rivière peu profonde, lignes de tuffeau, collines et fragments d'infrastructure. Studio Echo reste un repère local, pas un château héroïque. Les distances et cases restent lisibles.

**À éviter :** désert sans géographie, carte européenne générique, villes partout, satellites visibles comme décor principal, texte ou coordonnées dans l'image.

### A02. Studio Echo — landmark de Base

**Usage :** repère de `Studio`, `Base` et première arrivée.  
**Format :** silhouette compacte, vues 3/4 et variante de proximité.

**Description :** ancienne ferme en pierre et ancien studio d'enregistrement : murs épais, barn/Studio A, charpente, panneaux acoustiques et passages vers la cave. La structure est abîmée mais réparable. La lumière de la Bubble donne un contour praticable sans rendre le bâtiment neuf.

**À éviter :** bunker militaire, cabane de survie anonyme, immeuble moderne, forteresse achevée, texte de logo généré.

### A03. Crystal et Crystal Circle

**Usage :** cœur de la Base, signal, ressource et progression de Bubble.  
**Format :** objet/structure vertical, silhouette lisible à petite taille.

**Description :** formation minérale imposante prise dans le tuffeau, entourée d'une structure de maintien et de quelques points de contact acoustiques. La lumière aqua ou ambre est localisée à la résonance, pas à toute la scène. Le Crystal reste minéral et imparfait.

**À éviter :** gemme de RPG taillée, rayon laser, halo magique, texte gravé, effet de lumière permanent qui efface les limites.

### A04. Studio Grounds

**Usage :** zone `Studio`, transitions de carte et activité de proximité.  
**Format :** 4:3 ou bande de terrain modulable.

**Description :** chemins autour de la ferme, bâtiment annexe, well house, equipment shed, végétation contrôlée, débris et accès à la cave. Chaque élément indique une fonction possible sans transformer la cour en décor rempli.

### A05. Entrée de cave et Les Grottes de la Bresme

**Usage :** landmark `Survivor Cave`, objectif de recrutement, intérieur futur.  
**Format :** icône, vignette et scène 4:3.

**Description :** falaise ou mur de tuffeau, ouverture sombre, traces de passage, eau ou végétation de Bresme, éléments troglodytes et signes d'habitation. La profondeur doit être plus importante que l'ampleur de la scène.

**À éviter :** grotte de fantasy avec stalactites partout, entrée de donjon générique, camp de tentes en surface, foule.

### A06. Intérieur de Studio Echo

**Usage :** `Base`, story moment, transition vers le dungeon.  
**Format :** 16:9 ou 4:3 avec zone calme pour du texte séparé.

**Description :** control room, mixing room, live room, booth ou couloir de ferme. Console incomplète, câbles, cloisons acoustiques, ancien matériel, pierre et bois. Un seul sujet principal par image.

**À éviter :** studio futuriste, écran rempli de chiffres, décor de décharge, table couverte de vingt objets.

### A07. Base square — pièces et workbench

**Usage :** représentation des lieux du mode `Base`.  
**Format :** modules carrés compatibles avec des cases de 34 px et recadrages.

**Description :** sol stabilisé, murs, entrée, Crystal Core, workbench et station en construction. Le motif de la pièce doit rester lisible quand la carte se réduit.

### A08. Cave square — murs, portes et sorties

**Usage :** mode `Cave`, dungeon et futures salles.  
**Format :** tiles ou modules carrés.

**Description :** murs de tuffeau, sols irréguliers mais compatibles avec une grille, portes, couloirs, chambres et profondeur locale. Une porte ou une sortie doit être détectable sans texte peint.

### A09. Tours et Silent Zone

**Usage :** skyline distante, destination future, récit de l'avant.  
**Format :** bandeau large ou silhouette désaturée.

**Description :** fragments de ville, bâtiments ouverts, végétation et brume froide. La ville est un rappel de ce qui est inaccessible, non le centre visuel de chaque écran.

**À éviter :** explosions, flammes, ville en ruine spectaculaire, monuments identifiables sans décision narrative.

### A10. Matériel de studio récupéré

**Usage :** objets de scène et supports des stations.  
**Famille :** console, câble, micro, pied, haut-parleur, casque, bobine, outil.

**Règle :** chaque objet porte un signe d'usage crédible. Les instruments et appareils ne sont pas tous allumés. Les inscriptions et marques restent vierges ou ajoutées séparément.

### A11. Fire Pit et Vibes

**Usage :** station sociale, progression du crew et scènes de repos.  
**Description :** espace de réunion protégé, foyer simple si le canon et le mode l'autorisent, instruments de percussion, sièges disparates et objets entretenus.

Le Fire Pit représente le lien et la capacité à accueillir. Il ne devient pas une jauge de morale dessinée comme un cœur géant.

### A12. Resonance Chamber et Mix Console

**Usage :** stations de Power, Resonance et Harmonics.  
**Description :** pièces techniques qui transforment ou stabilisent le signal : surfaces de contrôle, supports, câbles, minéraux, mesures simples. La complexité se lit par fonction, pas par des écrans futuristes.

### A13. Water, Stone et ressources matérielles

**Usage :** marqueurs, objets de récolte, détails de construction.  
**Description :** eau de rivière ou de puits, pierre/tuffeau, caisses, outils et petits stocks. Les formes sont distinctes à 16–24 px.

**À éviter :** monnaie, nourriture, lingots précieux ou caisses de loot fluorescentes tant que ces concepts ne sont pas dans le catalogue du jeu.

### A14. Hero / Resilient

**Usage :** personnage principal sur la carte et dans les intérieurs.  
**Description :** silhouette humaine ordinaire, vêtement de terrain, sac ou outil, posture lisible. Le Hero peut être isolé sans être solitaire dans le ton : la Base et le crew doivent rester perceptibles.

**À éviter :** armure, pose de héros, mutation monstrueuse, aura de personnage choisi, visage détaillé à 24 px.

### A15. Crew et Survivor Cave

**Usage :** silhouettes de recrutement, affectation et scènes communautaires.  
**Description :** petits groupes divers, vêtements réparés, attitudes de travail, de discussion ou d'écoute. Une silhouette peut être reconnue par son rôle sans uniforme obligatoire.

### A16. Faune et Dweller Bane

**Usage :** première créature, points d'intérêt, encounters futurs.  
**Description :** créatures compactes, spécifiques à un lieu, avec un comportement lisible. Dweller Bane est une présence de Studio Echo et un rappel de la vie qui a occupé les lieux pendant l'abandon.

**À éviter :** horde, gore, créature de fantasy interchangeable, effets de combat non implémentés.

### A17. Archives, cartes et traces de l'avant

**Usage :** story moments, journal, clues, objets de lore.  
**Description :** fiche de session, pochette de vinyle, manuel technique, carte de Touraine, document humide, étiquette ou fragment de conversation. Le support peut être marqué ; le texte jouable reste du DOM.

### A18. Accents de signal

**Usage :** repères SVG/CSS pour Bubble, Crystal, sélection, route et progression.  
**Description :** anneau, ligne ambre, halo aqua limité, marque de destination, trace de route et contour de case.

**Règle :** deux ou trois formes réutilisables suffisent. Ne pas créer un effet différent pour chaque ressource ou chaque station.

---

## 8. Catalogue des icônes et des signaux

### 8.1. Système

Utiliser des icônes vectorielles simples, pleines ou à découpes larges, sur une grille logique de 24 × 24. Elles doivent rester lisibles à 16, 20 et 24 px. La couleur vient de `currentColor` ou d'un token de contexte ; la forme ne change pas selon l'état.

La famille doit être plus proche d'un atlas de terrain et de signal que d'un jeu d'icônes SaaS. Pas de mélange entre traits filaires ultra-fins et silhouettes lourdes.

### 8.2. Fonctions à couvrir

| ID | Fonction | Forme recommandée |
| --- | --- | --- |
| I01 | Hero / Resilient | Silhouette de personne avec petit marqueur de tolérance |
| I02 | Crew / survivor | Deux ou trois silhouettes de même famille que I01 |
| I03 | Bassline | Trois lignes basses ou arc large, forme stable et compacte |
| I04 | Chorus | Groupe d'arcs ou bandes liées, distinct de Bassline |
| I05 | Harmonics | Ligne centrale et deux surtons plus fins ; éviter la confusion avec des éclats |
| I06 | Stone | Bloc/tuffeau avec une face et une fracture simple |
| I07 | Water | Goutte ou onde courte ; forme distincte de Chorus |
| I08 | Vibes | Petit cercle de relation ou étincelle contrôlée, pas un cœur de morale |
| I09 | Crystal Circle | Crystal vertical dans un anneau ou une base |
| I10 | Studio Echo / Base | Ferme ou pièce de studio compacte, ouverture visible |
| I11 | Survivor Cave | Entrée sombre dans une masse de tuffeau |
| I12 | World | Rose des directions ou hexagone avec repère central |
| I13 | Studio area | Hexagone local avec petite marque de bâtiment |
| I14 | Cave / dungeon | Porte ou carré de pièce avec seuil |
| I15 | Explore | Boussole ou œil géométrique ; pas de télescope fantasy |
| I16 | Build | Poutre et marteau ou deux volumes assemblés |
| I17 | Research | Carnet, fiche ou instrument de mesure ; pas de fiole par défaut |
| I18 | Repair | Clé plate simple, mâchoire identifiable |
| I19 | Duration | Horloge sans chiffres fins |
| I20 | Exposure / danger | Triangle ou contour de silence avec libellé obligatoire |
| I21 | Travel / route | Flèche ou chemin entre deux points |
| I22 | Selected / active | Coche ou anneau de sélection, pas une étoile décorative |
| I23 | Settings | Engrenage simple à peu de dents |
| I24 | Fog / hidden | Masque ou fragment de carte voilé ; jamais une icône de nuage joyeux |

### 8.3. Règles de distinction

- Bassline, Chorus et Harmonics doivent rester distincts avant la couleur.
- Water ne doit pas ressembler à un signal ou à une flamme.
- Vibes désigne un carburant social actuel, pas une valeur d'humeur générique.
- Crystal, Bubble et The Filter ont des formes différentes : l'un est un lieu/minéral, l'autre une zone, le dernier une cause globale.
- Le même cœur ne doit pas représenter Vibes, santé, moral et validation.
- Une icône de ressource indique un concept présent dans le catalogue ; elle ne doit pas préfigurer une mécanique.

### 8.4. Livrables

Pour chaque icône : SVG valide, nom sémantique stable, aperçu de famille, test 16/20/24 px, état `currentColor`, description alternative si informative et indication de son usage décoratif ou interactif.

---

## 9. Textures et matières

### T01. Champ de carte

Fond `field`/`field-2` avec variation légère de valeur. Le motif sert à donner de la profondeur aux cases et au monde, pas à simuler un papier peint.

### T02. Pierre de tuffeau

Grain clair et poreux, arêtes douces, petites marques de taille. Utiliser sur murs, caves et landmarks ; ne pas appliquer une photo de roche à chaque panneau.

### T03. Bois et atelier

Veines larges, brun profond, une fixation ou une réparation visible. La texture peut exister dans l'illustration, jamais derrière chaque ligne de gestion.

### T04. Toile et isolation acoustique

Trame chaude, contraste faible, plis rares et crédibles. Aucun flottement automatique. Les cloisons peuvent suggérer l'ancien studio sans transformer l'écran en tente.

### T05. Métal et console

Peinture sombre, bords usés, cuivre ou rouille ponctuelle. Les boutons HTML restent des boutons ; ils ne deviennent pas des plaques photoréalistes.

### T06. Brume et fog

Voile statique ou transition courte pour les cellules cachées et les limites de visibilité. Le fog doit communiquer l'incertitude de la carte, pas fournir un filtre plein écran permanent.

### T07. Papier et archives

Réservé aux notes, documents et éléments narratifs. Fond chaud très léger, texte natif, pas d'écriture générée dans l'image.

**Règle générale :** une texture renforce une information ou une matière. Si elle réduit le contraste, le ratio de l'image, la performance ou la lecture d'une case, elle est trop présente.

---

## 10. Animation, audio et retours d'interaction

### 10.1. Principe

L'interface doit rester compréhensible sans mouvement et sans audio. ADD peut néanmoins utiliser le son comme couche de feedback importante, car le monde fait du son une infrastructure de survie. L'audio accompagne une information ; il ne la remplace jamais.

### 10.2. Mouvements autorisés

| Situation | Traitement |
| --- | --- |
| Sélection d'une case | Contour ou pulse bref, sans boucle permanente |
| Révélation de fog | Transition courte vers un état lisible ; aucune brume qui danse en continu |
| Déplacement du Hero | Mouvement spatial sobre, progression et arrivée clairement annoncées |
| Ouverture d'un panneau | Fondu ou translation de quelques pixels, 160–220 ms |
| Passage en Base | Transition de contexte unique ; le joueur comprend ce qui s'ouvre |
| Fin de construction/expédition | Changement de statut, texte et accentuation unique |
| Offline return | Résumé séquencé seulement si cela aide à comprendre les changements |
| Progression de ressource | Mise à jour de valeur ou de barre ; pas de compteur qui clignote |

Respecter `prefers-reduced-motion` et le réglage Reduced motion de l'application. En mode réduit, présenter directement les états finaux.

### 10.3. Audio fonctionnel

Les catégories de feedback peuvent être :

- changement de mode World/Studio/Cave/Base ;
- sélection et révélation d'une tuile ;
- départ, exposition et arrivée du Hero ;
- Crystal/Bubble qui atteint un seuil ;
- station construite ou brownout ;
- arrivée d'un recruit et retour hors ligne ;
- moment narratif ou choix important.

Le mix doit rester calme et court. Les paramètres actuels distinguent master, music et effects, avec mute global. Un silence audio du navigateur ne doit pas être confondu avec The Silence du monde.

### 10.4. Ce qui reste désactivé par défaut

Parallaxe permanente, particules de poussière en boucle, vent visible partout, flamme qui tremble comme animation de fond, scanline, bruit plein écran, globe 3D, signal qui clignote à chaque seconde, son obligatoire pour comprendre un état, et célébration de type feu d'artifice à chaque gain idle.

Une animation future doit répondre à une conséquence de jeu, respecter un budget de rendu et rester désactivable.

---

## 11. Spécifications techniques et maintenabilité

### 11.1. Architecture à respecter

| Responsabilité | Emplacement actuel | Règle de présentation |
| --- | --- | --- |
| Simulation, temps, progression, saves, offline | `crates/add-core/` | La UI présente le résultat, elle ne recalcule pas les règles |
| Binding browser | `crates/add-web-bindings/` | Contrat WASM stable et typed |
| Contenu, labels, catalogues, selectors | `packages/add-domain/` | Les assets et libellés suivent les IDs de contenu |
| Worker et runtime bridge | `apps/add-rpg/src/workers/`, `add-runtime-bridge.ts` | Les actions passent par les commandes autorisées |
| Interface DOM/Solid | `apps/add-rpg/src/browser/main.ts` et styles/settings | Texte natif, états accessibles, réutilisation des composants |
| Carte Phaser | `apps/add-rpg/src/browser/add-phaser/` | Présentation de la carte ; aucune règle de gameplay cachée |

Un brief d'illustration ne doit pas demander un nouveau moteur, une seconde source de vérité ou une carte aplatie qui contourne le runtime.

### 11.2. Jetons CSS de départ

Conserver les noms existants quand ils couvrent le besoin :

```css
:root {
  --ink: #101917;
  --field: #182622;
  --field-2: #263b34;
  --paper: #f7eed2;
  --paper-soft: #e4d8b7;
  --accent: #e6a84e;
  --aqua: #5fd1d8;
  --mode-base: #86d37b;
  --mode-base-warm: #f0b95d;
  --mode-dungeon: #aab8c4;
  --mode-dungeon-strong: #d6e1ea;
  --mode-return: #ffd37f;
  --danger: #c8654b;
  --radius-ui: 8px;
  --space-panel: 10px;
  --motion-fast: 140ms ease;
  --motion-panel: 190ms cubic-bezier(0.2, 0.9, 0.25, 1);
}
```

Les nouvelles surfaces doivent d'abord réutiliser ces tokens. Ajouter une couleur parce qu'un asset l'utilise n'est pas suffisant pour créer un nouveau rôle sémantique.

### 11.3. Contrats de données visibles

Les IDs actuels à respecter dans les briefs et les maquettes incluent :

```text
Resources: Bassline, Chorus, Harmonics, Stone, Water, Vibes
Roles: Crystal: Bassline, Crystal: Chorus, Crystal: Harmonics,
       Construction, Fire Pit: Vibes, Base: Scavenge, Base: Water
Stations: Crystal Circle, Fire Pit, Resonance Chamber, Mix Console,
          Workshop, Research Booth
Modes: World, Studio, Cave, Base
Landmarks: Studio Echo, Survivor Cave, Crystal, doors, workbench
```

Les noms affichés peuvent être localisés. Les identifiants techniques restent stables et ne sont pas utilisés comme copy créatif.

### 11.4. Séparer asset, contenu et logique

Une carte de Base référence une illustration ou un token de terrain ; elle ne contient pas ses chiffres. Les coûts, effets, durées, états `available/blocked/in progress/complete`, textes et traductions viennent de données structurées.

Les assets peuvent prévoir une zone calme pour un texte ajouté en DOM, mais ne doivent pas incorporer une phrase essentielle. Les exports gardent leur ratio, leur provenance, leur brief et leur statut de validation séparés.

### 11.5. Performance et idle

- Ne pas exiger une boucle de rendu pour une interface immobile.
- Mettre à jour la carte et les panneaux quand l'état utile change.
- Une horloge ou un compteur visible peut demander une mise à jour à la seconde ; les labels statiques ne le doivent pas.
- Au retour offline, regrouper les conséquences et laisser le joueur choisir la prochaine action.
- Fixer dimensions et ratios d'images pour éviter les layout shifts.
- Préférer SVG pour les icônes simples et des exports optimisés pour les scènes.
- Différer les images hors écran si elles ne servent pas la première décision.

Les budgets doivent être mesurés après intégration dans l'application et sur les cibles réelles. Un grand panorama n'est pas une obligation de direction et ne doit pas consommer le budget de la carte.

### 11.6. Accessibilité et localisation

Conserver texte sélectionnable, ordre de lecture logique, navigation clavier, focus visible, cibles tactiles confortables et libellés longs.

Les panneaux flottants doivent gérer leur focus et leur fermeture. Les dialogues de voyage, retour offline et paramètres ne doivent pas laisser le clavier derrière eux.

La carte Phaser fournit des affordances visuelles ; le DOM fournit le résumé et les actions. Une tuile cachée, un blocage, une destination et un coût doivent être annoncés en texte.

Tester les chaînes anglaises actuelles et des traductions plus longues. Ne pas enfermer les noms Studio Echo, Les Grottes de la Bresme, les ressources ou les raisons de blocage dans une image.

### 11.7. Règles de maintenance

- Une nouvelle ressource réutilise C04 et une icône de la famille I.
- Une nouvelle station réutilise les lignes C10/C11 et une section Base existante si sa structure convient.
- Un nouvel événement réutilise C17 ou C18 avant de demander une illustration.
- Un nouveau landmark doit avoir une silhouette et un résumé textuel accessibles.
- Une nouvelle section ne crée pas sa propre palette.
- Les outils Admin/Dev restent identifiables comme outils ; ils ne définissent pas le parcours joueur.
- Ne pas créer une seconde architecture `art-direction/` ou une nouvelle registry locale sans intégration avec les conventions du dépôt.

---

## 12. Direction rédactionnelle et microtextes

### 12.1. Voix

La voix suit le guide de ton : humour noir, espoir pragmatique, phrases courtes, détails concrets et mystère par fragments.

Le texte de jeu doit dire ce qui se passe avant de faire une jolie phrase. La poésie appartient aux notes, aux événements et aux archives. Un bouton, un coût, un blocage et une conséquence restent directs.

| Registre | Exemple adapté |
| --- | --- |
| Situation | `Base strained.` |
| Action | `Assign the Hero.` |
| Condition | `Needs 30 Stone.` |
| Conséquence | `Reach: 2 / 3.` |
| Système | `Brownout active.` |
| Retour | `The base lived for 12 minutes.` |
| Ambiance | `The old booth still has a door that closes properly.` |
| Incertitude | `The notes mention Delacroix. They do not explain why.` |

Les exemples restent des copy de référence. Les valeurs et les conditions réelles viennent du runtime.

### 12.2. Vocabulaire à stabiliser

Employer les mêmes noms partout :

- `Studio Echo`, pas « l'abri », « la ferme » ou « le camp » comme nom principal ;
- `Base`, `Crystal Circle`, `Bubble`, `Survivor Cave`, `The Silence`, `The Filter` ;
- `Hero`, `crew`, `recruit`, `Resilient` selon le contexte ;
- `Bassline`, `Chorus`, `Harmonics`, `Stone`, `Water`, `Vibes` ;
- `Build`, `Power`, `Crew`, `Social`, `Expeditions`, `Resonance`, `Processing` pour les sections actuelles.

Une métaphore peut enrichir une note. Elle ne doit pas renommer une ressource ou une action dans un autre panneau.

### 12.3. Formules utiles

Les formulations suivantes prolongent le ton du jeu sans créer de canon :

- `Keep the signal growing.`
- `The base is small. The reach is not.`
- `No emergency. Still work to do.`
- `The cave is close enough to matter. Not close enough to ignore.`
- `The old studio was built to control sound. Now sound keeps it alive.`
- `A brownout is not a mood. It is a power problem.`
- `Someone repaired this once. We can try again.`

À ne pas utiliser comme promesse centrale : « le silence est apaisant », « un nouveau départ tranquille », « personne ne nous entend », ou toute formule qui rend The Silence désirable.

### 12.4. Longueurs de travail

| Contenu | Cible |
| --- | --- |
| Bouton | 2–5 mots |
| Statut | 1–3 mots, détail à côté |
| Tooltip de ressource | 1–3 phrases concrètes |
| Résumé de tuile | 1 phrase + action |
| Note narrative | 1–3 phrases |
| Événement | 60–120 mots, conséquences séparées |
| Tutorial | 1 phrase par geste, 2 maximum si nécessaire |

Ne pas tronquer une condition essentielle pour maintenir un panneau « propre ». Si le texte est long, changer la composition ou fournir un détail pliable.

---

## 13. Prompts réutilisables

### P01. Contexte commun pour un asset ou une maquette

```text
Projet : ADD, jeu idle/RPG de survie et d'exploration du dépôt Aedventure.

Époque et lieu : année 311 AS, Touraine et vallée de la Loire, France.
Le point de départ est Studio Echo, ancienne ferme et ancien studio
d'enregistrement près de Pernay. La carte de jeu est un overworld hexagonal
; les zones Studio et les intérieurs utilisent des cartes locales. Les Grottes
de la Bresme sont la Survivor Cave et une destination de recrutement.

Canon : The Silence est une catastrophe où The Filter supprime presque le son
aérien et où Hush-2 devient mortel en l'absence de vibrations. Hors Bubble,
une personne ordinaire ne survit qu'environ quatre heures. Le Hero est un
Resilient avec une tolérance étendue, pas une immunité. Les Crystals sont des
anomalies minérales qui peuvent soutenir une Bubble quand elles reçoivent une
énergie acoustique. Ils ne sont pas de la magie et ne sont pas la technologie
des Sounding Five.

Intention : carte lisible, refuge réparé, minéralité du tuffeau, matériel de
studio analogique, humour sec, espoir local et menace réelle. Le son est une
infrastructure, pas un motif décoratif à animer en boucle.

Palette : ink #101917, field #182622, field-2 #263B34, paper #F7EED2,
accent #E6A84E, aqua #5FD1D8, mode-base #86D37B, mode-dungeon #AAB8C4,
danger #C8654B.

Contraintes : aucun texte fonctionnel dans l'image, aucune nouvelle règle de
canon, aucune ressource inventée, aucune seconde navigation, pas de néons,
gore, militarisme, fantasy cristalline, désert générique ou héroïsme publicitaire.
```

### P02. Brief d'un landmark

```text
Applique le contexte ADD.

Landmark : [Studio Echo / Crystal Circle / Survivor Cave / porte / workbench].
Mode : [World / Studio / Cave / Base].
Topologie : [hex / square].
Usage : [repère de carte / transition / détail sélectionné / narration].
Silhouette obligatoire : [trois éléments maximum].
Zone calme pour surimpression : [oui/non].
Éléments exclus : [liste].

Produis un asset isolé et réutilisable, sans texte, chiffre, bouton, logo,
compteur ou filigrane. La forme doit rester lisible à petite taille et ne pas
définir une mécanique absente du contenu actuel.
```

### P03. Référence visuelle de Studio Echo

```text
Créer une scène de référence pour Studio Echo dans ADD.

Une ancienne ferme de Touraine abrite un studio d'enregistrement abandonné.
Montrer des murs de tuffeau, une charpente en bois, une ancienne salle de
prise de son, quelques câbles et une console ou un haut-parleur récupéré.
Un accès vers une cave peut apparaître, mais la scène reste à hauteur humaine.
Le Crystal est perceptible par une lumière aqua/ambre localisée ou par un
dispositif acoustique, sans rayon magique.

Le lieu est endommagé mais réparable. Il ne ressemble ni à un bunker, ni à un
camp de vacances, ni à une décharge. Palette sombre et chaude : #101917,
#182622, #263B34, #F7EED2, #E6A84E, #5FD1D8, pierre claire et bois brun.

Aucun texte, nom, chiffre, bouton, UI ou logo dans l'image. Garder des zones
calmes pour le texte DOM. Ne pas ajouter de vent, d'onde visible, de satellite,
de héros en pose triomphale, d'arme ou de foule.
```

### P04. Concevoir un écran d'interface

```text
Concevoir le contexte [World / Studio / Cave / Base] d'ADD.

Surface primaire : carte Phaser visible et interactive.
Données exactes : [snapshot ou fixture].
Question principale du joueur : [où aller / quoi construire / que lire].
Composants autorisés : [IDs C].
Actions réelles : [commandes disponibles].
États à montrer : [available / blocked / in progress / complete / error].

Utiliser un champ sombre, des panneaux translucides légers, l'accent ambre
pour la décision, l'aqua pour le signal/découverte et le gris bleu pour les
intérieurs. Le joueur doit voir la situation, le changement important, la
raison d'un blocage et l'action suivante. Le texte reste natif et sélectionnable.

Ne pas inventer de ressource ou de panneau pour remplir un espace vide. Ne pas
ajouter une barre latérale papier, une seconde navigation ou un panorama qui
cache la carte.
```

### P05. Implémenter un composant

```text
Implémente [composant/contexte] dans l'application ADD existante.

Avant de coder, inspecte les composants, selectors, tokens CSS et contrats de
commande déjà présents. Rust reste l'autorité pour l'état, le temps, les coûts,
les effets, les saves et l'offline catch-up. Solid rend le texte et les
contrôles ; Phaser rend la carte et sa présentation.

Réutilise le composant existant si seule la donnée, l'illustration ou le libellé
change. Traite les états réellement pertinents, explique les blocages, conserve
le focus clavier, les cibles tactiles, les libellés longs et prefers-reduced-motion.

Ne crée pas de seconde source de vérité, de canvas décoratif, de texte dans une
image, de boucle d'animation permanente ou de nouveau système de design.
```

### P06. Écrire du copy joueur

```text
Rédige des textes anglais de jeu pour ADD, avec une version de travail française
si demandée.

Ton : humain, concret, légèrement ironique dans les temps sûrs, sérieux devant
la menace. Canon validé : Studio Echo, The Silence, The Filter, Crystals,
Bubble, Resilient, Survivor Cave et ressources Bassline/Chorus/Harmonics/
Stone/Water/Vibes.

Données mécaniques exactes : [coller les données].
Informations ouvertes : [coller les incertitudes].
Type : [bouton / statut / bâtiment / événement / résultat / tooltip].

Sépare action, condition, coût, effet et ambiance. N'invente ni faction,
explication scientifique, immunité, ressource, destination ou conséquence.
Ne présente jamais The Silence comme une forme de paix désirable.
```

### P07. Contrôler un rendu

```text
Évalue ce rendu par rapport à la direction ADD.

Vérifie : lisibilité de la carte, distinction hex/square, hiérarchie map/action/
status, cohérence Touraine/tuffeau/studio, présence mesurée du Crystal,
fonction des accents aqua/ambre/rouge, absence de ressources inventées,
contraste, focus, labels longs, réduction des mouvements et coût de production.

Repère notamment : décor générique, camp en surface hors Bubble, satellite ou
parabole devenu emblème, Crystal magique, nourriture/morale ajoutée, texte dans
une image, panneau qui cache la carte, action sans raison de blocage, animation
continue ou second système de design.

Retourne : conforme ; corrections nécessaires ; décisions à valider. Pour chaque
correction, donne une action concrète.
```

---

## 14. Production initiale et contrôle qualité

### 14.1. Coupe verticale recommandée

Commencer par une séquence entièrement jouable et visible dans l'application existante :

| Étape | Contenu visuel et UI |
| --- | --- |
| 1 | World map : Hero, fog, terrain, Bubble, topbar et objective tracker |
| 2 | Arrivée à Studio Echo : transition, landmark, premier contexte de Base |
| 3 | Base : Crystal Circle, ressources et affectation du Hero |
| 4 | Build : Restore Studio ou Fire Pit, coût, durée, état en cours |
| 5 | Reach : Bubble reach vers Les Grottes de la Bresme et action de recrutement |
| 6 | Idle/offline : retour regroupé avec gains, travail, blocage et prochaine décision |
| 7 | Cave/Studio dungeon : grille square, visibilité, murs, portes et retour |

Le lot initial n'a pas besoin d'une galerie de vingt illustrations. Il doit prouver que la direction fonctionne quand un joueur lit, clique, attend, revient et déplace le Hero.

### 14.2. Assets à produire en premier

1. terrain/markers cohérents pour l'overworld ;
2. silhouette Studio Echo/Base ;
3. Crystal/Crystal Circle et Bubble signal ;
4. entrée des Grottes de la Bresme ;
5. quatre ou cinq icônes de ressources et rôles ;
6. murs/portes du premier intérieur ;
7. Hero et Dweller Bane ;
8. un fragment d'archive de Studio Echo pour tester story moment et journal.

Une grande illustration de splash screen est secondaire. Elle ne doit pas décider seule de l'interface.

### 14.3. Validation artistique

- [ ] Le document et les assets disent `ADD`, `Studio Echo`, `Survivor Cave`, `Crystal` et `Bubble` de façon cohérente.
- [ ] L'environnement évoque Touraine, le tuffeau, les caves et un ancien studio ; il ne ressemble pas à un wasteland générique.
- [ ] Le Crystal est minéral et local ; sa lumière n'efface pas la géographie.
- [ ] The Silence reste une menace, pas une esthétique cosy.
- [ ] Une scène de surface rend visible sa protection ou son risque.
- [ ] Les silhouettes Hero, crew, Base, cave et portes restent identifiables en miniature.
- [ ] Aucun texte fonctionnel ou chiffre essentiel n'est intégré dans une illustration.
- [ ] Les assets réemploient la même matière, direction de lumière et famille d'accents.

### 14.4. Validation d'interface

- [ ] La carte est la surface primaire et reste lisible sous les panneaux.
- [ ] Les modes World, Studio, Cave et Base sont compréhensibles sans ID technique.
- [ ] L'objectif, le bottleneck, l'action et la conséquence sont visibles sans chercher dans trois menus.
- [ ] Bassline, Chorus, Harmonics, Stone, Water et Vibes sont utilisés à la place de Food, Materials et Morale génériques.
- [ ] Les coûts, durées, conditions et effets sont séparés et localisables.
- [ ] Une action bloquée donne sa raison en texte.
- [ ] Les états ne dépendent pas seulement de la couleur ou du mouvement.
- [ ] Le mode mobile conserve la carte, l'action et le focus clavier.
- [ ] Les dialogues de voyage, retour offline et paramètres gèrent correctement le focus.
- [ ] Reduced motion, mute, clavier, zoom de texte et labels longs ont été testés.

### 14.5. Validation technique

- [ ] Les règles restent dans Rust/WASM ; la UI ne simule pas un autre état.
- [ ] Les selectors et contrats existants alimentent les nouveaux panneaux.
- [ ] Une nouvelle station ou ressource réutilise les composants actuels.
- [ ] La carte Phaser n'introduit pas de gameplay caché.
- [ ] Les assets possèdent un brief, un ratio, une provenance et un statut de validation.
- [ ] Aucun rendu permanent n'est requis pour un état immobile.
- [ ] Les poids d'assets et le coût du premier affichage sont mesurés dans l'application.
- [ ] Les vérifications ciblées ADD UI sont lancées après un changement de composant ou de style.

### 14.6. Contrôle anti-dérive

Avant d'accepter un nouvel écran, comparer sa proposition à cette liste :

| Question | Si la réponse est non |
| --- | --- |
| La carte ou le lieu reste-t-il le sujet principal ? | Réduire le panneau ou retirer le décor |
| L'action réelle est-elle identifiable ? | Revoir la hiérarchie et le copy |
| La menace de The Silence est-elle cohérente ? | Corriger l'environnement ou marquer l'incertitude |
| Le composant réutilise-t-il les tokens et états actuels ? | Revenir au système existant |
| L'asset ajoute-t-il une information utile ? | Le rendre optionnel ou le supprimer |
| Le résultat est-il jouable sans audio ni animation ? | Ajouter le texte/état manquant |

---

## 15. Décisions encore ouvertes

Ces points sont explicitement laissés ouverts par le canon ou par le produit. Ils ne doivent pas être tranchés par une image générée.

### Produit et marque

- Le titre final est-il `ADD`, `ADD RPG` ou une marque distincte ?
- Le mot-symbole et la typographie d'affichage nécessitent-ils une famille dédiée ?
- L'interface reste-t-elle principalement en anglais ou reçoit-elle une localisation française prioritaire ?

### Art et production

- Quel degré d'illustration remplace les formes procédurales actuelles dans Phaser ?
- Les assets de terrain sont-ils des tiles, des cartes peintes, un atlas ou un mélange contrôlé ?
- Quelle représentation définitive donne-t-on au Crystal de Studio Echo ?
- Quel pipeline et quelle registry d'assets ADD sont validés dans le dépôt ?

### Univers et contenu

- Les détails visibles de The Filter et des satellites restent-ils abstraits ou deviennent-ils un fil narratif plus tard ?
- Quels écrans d'expédition, de recherche et de Resonance entrent dans la prochaine coupe verticale ?
- Quelles destinations et créatures sont suffisamment canonisées pour recevoir un asset dédié ?

Ces questions empêchent de figer une production trop large. Elles n'empêchent pas de construire l'interface actuelle autour de la carte, de Studio Echo, de la Bubble, du Crystal, de la Base, de la Survivor Cave et des états déjà exposés par le runtime.

---

## Résumé de référence

> ADD est un jeu de survie acoustique et d'exploration cartographique : un Hero Resilient réveille Studio Echo, nourrit un Crystal, agrandit une Bubble et essaie de relier une communauté souterraine à une Base encore incomplète. L'interface doit laisser la carte respirer, rendre chaque décision concrète et garder The Silence menaçant. Le ton vient d'un studio de Touraine réparé par des gens ordinaires, pas d'un décor post-apocalyptique générique.
