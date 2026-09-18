# Lore Progress Report Generator

> **Purpose:** Instructions for AI agents to generate a lore completion status report.
>
> **Usage:** Ask an AI agent to "run the instructions in progress_report.md" or "generate a lore progress report"

---

## Instructions for AI Agent

When asked to generate a progress report, follow these steps:

### Step 1: Scan the Lore Directory

Use file search tools to inventory:
```
lore/
├── characters/          # Character sheets
├── creatures/           # Monster/creature profiles
├── factions/            # Faction documentation
├── locations/           # Location profiles
├── worldbuilding/       # Items, companies, music, etc.
├── timeline.md          # Pre-Silence timeline
├── timeline_quiet_centuries_*.md  # Post-Silence timelines
├── the-truth.md         # Core world bible
├── thesaurus.md         # Terminology
└── Lore_todo.md         # Current backlog
```

### Step 2: Evaluate Each Category

For each category below, check the specified files and criteria:

---

## Categories to Evaluate

### 1. WORLD BIBLE (Core Rules)
**Target:** Complete, consistent world rules
**Check files:**
- `the-truth.md` — Core physics, virus mechanics, Crystal rules
- `thesaurus.md` — Terminology definitions

**Criteria:**
- [ ] Filter mechanics explained
- [ ] Virus (Hush-2) mechanics explained
- [ ] Crystal mechanics explained
- [ ] Resilient mutation explained
- [ ] Underground vs surface survival rules clear
- [ ] Population model defined

**Score:** Count checked items / 6 = percentage

---

### 2. TIMELINE (Historical Record)
**Target:** 300 years documented
**Check files:**
- `timeline.md` — Pre-Silence (2026-2034)
- `timeline_quiet_centuries_1-25.md` — Years 1-25 AS
- `timeline_quiet_centuries_26-75.md` — Years 26-75 AS
- `timeline_quiet_centuries_76-150.md` — Years 76-150 AS
- `timeline_quiet_centuries_151-225.md` — Years 151-225 AS
- `timeline_quiet_centuries_226-300.md` — Years 226-300 AS

**Criteria:**
- [ ] Pre-Silence timeline exists and has detail
- [ ] Years 1-25 documented
- [ ] Years 26-75 documented
- [ ] Years 76-150 documented
- [ ] Years 151-225 documented
- [ ] Years 226-300 documented
- [ ] Major events named and dated
- [ ] Key figures identified per era

**Score:** Count checked items / 8 = percentage

---

### 3. FACTIONS (6 total)
**Target:** 6 factions with full profiles
**Check directory:** `factions/`

**Required factions:**
1. The Unplugged (survivors)
2. The Choir of Resonance (religious)
3. The Acoustic Engineers (builders)
4. The Silent Watchers (guardians)
5. The Nomads (traders)
6. The Reclaimers (archeologists)

**Per-faction criteria:**
- [ ] Faction ID card exists
- [ ] Beliefs/philosophy documented
- [ ] Leadership structure defined
- [ ] Key characters named
- [ ] Relationship to other factions noted

**Score:** (Factions with 3+ criteria met) / 6 = percentage

---

### 4. LOCATIONS
**Target:** 10+ detailed location profiles
**Check directory:** `locations/`

**Minimum required:**
- [ ] Hero Base (Studio Echo)
- [ ] Survivor settlement (Les Grottes de la Bresme)
- [ ] Regional overview (Touraine)

**Bonus locations (count how many exist):**
- Tours ruins
- Other survivor settlements
- Crystal locations
- Sacrifice Cities
- Trade routes
- Danger zones

**Score:** (Required locations + bonus count) / 10 = percentage

---

### 5. CHARACTERS
**Target:** 20+ named NPCs with sheets
**Check directory:** `characters/`

**Count character files that have:**
- Name and identity section
- Backstory or history
- Personality traits
- Role in the world

**Key characters to check:**
- [ ] Henri Marchand (Unplugged founder)
- [ ] Marc Delacroix (@NapTimeNinja)
- [ ] The Sounding Five members
- [ ] Kaylee Jo Lindquist (The Raver)

**Score:** Character count / 20 = percentage (cap at 100%)

---

### 6. CREATURES & THREATS
**Target:** 10+ creature profiles
**Check directory:** `creatures/`

**Criteria:**
- [ ] At least one creature type documented
- [ ] Creature taxonomy exists
- [ ] Behavioral patterns noted
- [ ] Threat levels defined
- [ ] Origins explained

**Score:** Creature count / 10 = percentage

---

### 7. CULTURAL LORE
**Target:** Rich cultural detail
**Check files:** Faction files, location files, `worldbuilding/`

**Criteria:**
- [ ] Slang/expressions documented
- [ ] Rituals or traditions described
- [ ] Music/entertainment culture
- [ ] Economic system outlined
- [ ] Daily life details
- [ ] Family structures

**Score:** Count checked items / 6 = percentage

---

### 8. ITEMS & ARTIFACTS
**Target:** 20+ item descriptions
**Check directory:** `worldbuilding/`

**Criteria:**
- [ ] Pre-Silence relics documented
- [ ] Crystal-related items
- [ ] Faction-specific gear
- [ ] Legendary artifacts named
- [ ] Consumables/resources

**Score:** Count checked items / 5 = percentage

---

### 9. QUESTS & NARRATIVES
**Target:** Main quest + 10 side quests outlined
**Check files:** Look for quest hooks in location/character files

**Criteria:**
- [ ] Main story arc outlined
- [ ] Hero origin defined
- [ ] At least 5 quest hooks identified
- [ ] Faction quest lines sketched
- [ ] Discovery/exploration quests

**Score:** Count checked items / 5 = percentage

---

### 10. TELEGRAM ARCHIVES
**Target:** Content depth in archive files
**Check directory:** `factions/sleepless_in_decibels/telegram_archives/`

**Criteria:**
- [ ] Directory structure exists
- [ ] Channel folders populated
- [ ] Monthly files have content (not just placeholders)
- [ ] Character voices distinct
- [ ] Story arc visible across months

**Score:** Count checked items / 5 = percentage

---

## Step 3: Generate the Report

Output format:

```markdown
# Lore Progress Report
**Generated:** [DATE]
**Total Files Scanned:** [COUNT]

## Summary

| Category | Score | Status |
|----------|-------|--------|
| World Bible | XX% | [EMOJI] |
| Timeline | XX% | [EMOJI] |
| Factions | XX% | [EMOJI] |
| Locations | XX% | [EMOJI] |
| Characters | XX% | [EMOJI] |
| Creatures | XX% | [EMOJI] |
| Cultural Lore | XX% | [EMOJI] |
| Items & Artifacts | XX% | [EMOJI] |
| Quests | XX% | [EMOJI] |
| Telegram Archives | XX% | [EMOJI] |

**Overall Completion:** XX%

## Status Key
- ✅ Complete (90-100%)
- 🟢 Strong (70-89%)
- 🟡 In Progress (40-69%)
- 🟠 Started (10-39%)
- 🔴 Not Started (0-9%)

## Detailed Findings

### Strengths
[List categories at 70%+ with specific highlights]

### Gaps
[List categories below 40% with specific missing items]

### Recommended Next Steps
[Top 3 priorities based on gaps and dependencies]

## Recent Changes
[If Lore_todo.md has "Recently Completed" section, summarize it]

## Files Reviewed
[List key files checked during evaluation]
```

---

## Notes for AI Agent

1. **Be conservative in scoring** — If unsure whether something counts, don't count it
2. **Check file content, not just existence** — A file with only headers doesn't count as complete
3. **Cross-reference** — Characters mentioned in timelines should have character sheets
4. **Note inconsistencies** — If you find conflicting information, flag it in the report
5. **Read Lore_todo.md first** — It contains the most current status and priorities

---

## Quick Commands

- **Full report:** "Generate a lore progress report"
- **Single category:** "Check the status of [CATEGORY]"
- **Gap analysis:** "What lore is missing?"
- **Priority check:** "What should I work on next in lore?"

---

*Progress report template v1 — December 17, 2025*
