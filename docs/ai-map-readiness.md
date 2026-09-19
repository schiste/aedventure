# AI-Generated Map Readiness

> Scope note: this document covers AI-generated maps for the customer
> virtual-office/platform lane and shared renderer contracts. It is not an ADD
> gameplay roadmap or a requirement to build a second ADD app.

Phase 11 keeps AI-generated rooms safe by separating the map pipeline into
three explicit contracts.

## 1. Renderer-Agnostic MDI

AI prompts compile into `MapDefinitionInterface`, which is an alias of the
semantic map definition. It contains room dimensions, style, semantic wall
placements, semantic furniture IDs, and semantic zones. It does not reference
Phaser, GIDs, texture coordinates, sprites, or pixel positions.

## 2. Compiler Output

The asset registry compiler translates MDI into:

- render layers: floor, walls, objects
- collision layers: movement-blocked matrix and blocked tile list
- zones: semantic interactive regions

This keeps the generated map explainable and lets non-Phaser consumers inspect
the same compiled result.

## 3. Renderer Preflight

Before Phaser mutates the scene, the browser renderer validates:

- render layer dimensions
- referenced GIDs
- visual footprint bounds for each placed object/wall
- collision layer dimensions
- zone bounds

If preflight fails, the renderer reports the rejected map fingerprint and errors
without clearing the current map. This is the safety gate for future LLM output.

## Preview Fidelity

Generated-room preview state stores a render fingerprint before application.
After the map is applied, the renderer reports its own preflight fingerprint.
The preview and rendered room are considered matching only when those
fingerprints are identical.
