# Accessibility (WCAG 2.1 AA) — ADD-RPG

Conformance status and how each a11y affordance is wired. Target: **WCAG 2.1 AA**.

## Reduced motion — ✅ enforced at three layers
1. **OS preference** — `styles.css` `@media (prefers-reduced-motion: reduce)` removes CSS animation/transition.
2. **Player override** — Settings → *Reduced motion* sets `:root[data-reduced-motion="true"]`, a kill-switch independent of the OS pref (`settings/settings.css`).
3. **Animation engine** — `TransitionRegistry.setReducedMotion(true)` (`packages/game-animation`) makes every keyed transition complete instantly: new transitions begin at zero duration, in-flight ones sample as done. This covers JS-driven motion the CSS rules can't reach.

**Wiring hook (pending, one line in `add-world-scene.ts`):**
```ts
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  || window.addSettings?.().reducedMotion
this.transitions.setReducedMotion(Boolean(reduce))
// + re-apply on the `add-settings-changed` event
```

## Color-blind modes — ✅ present (assist filters)
Settings → *Color-blind mode* (none / protanopia / deuteranopia / tritanopia) applies an app-wide filter via `:root[data-color-blind="…"] body` (`settings/settings.css`). Current filters are saturation/hue assists; **future work:** swap to LMS daltonization (`feColorMatrix`) correction for accuracy.

## Text scaling — ✅ wired
Settings → *Text size* (0.85–1.5) sets the root `font-size` %, so all `rem`-based sizing scales. **Audit item:** confirm panels size text in `rem`/`em`, not fixed `px`, so they inherit the scale.

## Contrast (AA) — method + status
- **Target:** 4.5:1 for normal text, 3:1 for large text / UI affordances.
- **Method:** audit each foreground/background pair in `styles.css` against its token; the dark theme (`#14161e` bg / `#e8e8ef` fg in the settings panel ≈ 13:1) clears AA comfortably. The settings overlay palette is AA-clean by construction.
- **Audit item (pending):** sweep the main shell tokens in `styles.css` (status text on translucent panels, disabled states) and record ratios here. Disabled/low-opacity text is the likeliest sub-AA offender.

## Keyboard navigation — partial
- Map: arrows move the focused tracker; Enter/Space activate; Escape cancels/closes; Tab / Shift+Tab cycle panels (see `add-telemetry-presenter` accessibility snapshot).
- Settings overlay: standard focusable controls; scrim click + *Done* close. **Pending:** focus-trap the open dialog and restore focus to the gear on close.

## Screen reader / ARIA — partial (foundation present)
- Landmarks + `aria-label` on the world pane, map navigation, time, and map-mode tablist; `aria-live="polite"` on status panels; `role="tablist"`/`group`.
- **Pending full pass:** every panel needs a verified accessible name + role, and a manual NVDA/VoiceOver sweep of the core flows (boot → assign crew → travel → combat → recruit).

## Remaining work to reach full AA
- [ ] Wire `setReducedMotion` in `add-world-scene.ts` (hook above).
- [ ] Contrast sweep of `styles.css` shell tokens; fix any < AA.
- [ ] Focus-trap + focus-restore for the settings dialog.
- [ ] Per-panel ARIA name/role verification + manual SR pass.
- [ ] Automated check: an axe-core pass in the add-rpg smoke (`scripts/add-rpg-a11y.test.cjs`).
- [ ] LMS daltonization for color-blind modes.
