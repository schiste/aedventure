# Aedventure Import Note

This directory is historical source material imported from the ADD repository
for the planned `apps/add-rpg` migration. Do not develop the live ADD app in
`legacy/add/`; extract runtime, domain, renderer, and UI pieces into the target
`aedventure` workspace packages described in `docs/add-migration-plan.md`.

Migration note: the ADD Rust runtime crates were moved into the aedventure root
workspace under `crates/add-core`, `crates/add-web-bindings`, and
`crates/add-web-worker`.

# Advanced Drummers and Dungeons (AD&D)

Design and product documents for **Advanced Drummers and Dungeons (AD&D)**.

Current implementation direction:

- **Rust** authoritative simulation core
- **Web-first** playable prototype for iteration and balancing
- **Mobile portability by design** for later iOS/Android packaging
- **No visual engine runtime in the repository at the moment**

- Overview: `documentation/general.md`
- Constitution: `constitution.md`
- Development timeline: `documentation/development-timeline.md`
- Technical architecture: `documentation/technical-architecture.md`
- Frontend architecture: `documentation/frontend-architecture.md`
- Game data model: `documentation/game-data-model.md`
- Idle economy: `documentation/idle-economy.md`
- First playable version: `documentation/first-playable-version.md`
- First playable assessment: `documentation/first-playable-assessment.md`
- First session balance: `documentation/first-session-balance.md`
- Phase 0 simulation spec: `documentation/phase-0-simulation-spec.md`
- Phase 0 exit checklist: `documentation/phase-0-exit-checklist.md`
- Object types taxonomy: `documentation/object-types.md`
- Object templates (JSON): `documentation/object-templates.json`
- Scaling models (JSON): `documentation/scaling-models.json`
- Glossary: `documentation/glossary.md`
- Save/Load: `documentation/save-load.md`
- Mechanics spec: `mechanics/specifications.md`
- Lore bible: `lore/lore.md`
- Internal canon: `lore/the-truth.md`
- Timeline: `lore/timeline.md`
