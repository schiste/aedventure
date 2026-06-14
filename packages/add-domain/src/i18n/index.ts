// Tiny i18n runtime: a keyed message catalog with interpolation, CLDR plural
// rules, navigator-based detection, a locale switch, and a generated
// pseudo-locale. Strings live as keys; `t(key)` resolves against the active
// locale, falling back to the baseline, and marking missing keys so they're
// caught (no silent prose).

export type Messages = Readonly<Record<string, string>>
export type TVars = Readonly<Record<string, string | number>>

/** Generated pseudo-locale: accents the baseline so every translated string is
 *  visibly transformed (hardcoded/untranslated strings stand out). */
export const PSEUDO_LOCALE = "en-XA"

const catalogs = new Map<string, Messages>()
const listeners = new Set<() => void>()
let activeLocale = "en"
const FALLBACK = "en"

function notify(): void {
  for (const listener of listeners) listener()
}

export function registerLocale(locale: string, messages: Messages): void {
  catalogs.set(locale, { ...catalogs.get(locale), ...messages })
  notify()
}

export function availableLocales(): string[] {
  const locales = new Set(catalogs.keys())
  locales.add(PSEUDO_LOCALE)
  return [...locales]
}

export function getLocale(): string {
  return activeLocale
}

export function setLocale(locale: string): void {
  if (locale === activeLocale) return
  activeLocale = locale
  notify()
}

/** Subscribe to locale/catalog changes; returns an unsubscribe fn. */
export function onLocaleChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Best available locale for a list of preferred tags (navigator.languages). */
export function detectLocale(
  available: readonly string[],
  preferred: readonly string[] = typeof navigator !== "undefined"
    ? (navigator.languages ?? [navigator.language])
    : [],
  fallback = FALLBACK,
): string {
  for (const tag of preferred) {
    const lower = tag.toLowerCase()
    const exact = available.find((locale) => locale.toLowerCase() === lower)
    if (exact) return exact
    const base = lower.split("-")[0]
    const partial = available.find((locale) => locale.toLowerCase().split("-")[0] === base)
    if (partial) return partial
  }
  return available.includes(fallback) ? fallback : (available[0] ?? fallback)
}

function lookup(key: string): string | undefined {
  const source = activeLocale === PSEUDO_LOCALE ? FALLBACK : activeLocale
  return catalogs.get(source)?.[key] ?? catalogs.get(FALLBACK)?.[key]
}

export function hasKey(key: string): boolean {
  return lookup(key) !== undefined
}

function interpolate(message: string, vars?: TVars): string {
  if (!vars) return message
  return message.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  )
}

export function t(key: string, vars?: TVars): string {
  const raw = lookup(key)
  if (raw === undefined) return `⟦${key}⟧` // marked missing — surfaced by tests/QA
  // For the pseudo-locale, accent the template first, then fill placeholders, so
  // dynamic values (names, counts) stay readable inside the transformed string.
  const template = activeLocale === PSEUDO_LOCALE ? pseudoTransform(raw) : raw
  return interpolate(template, vars)
}

/** Plural-aware lookup: resolves `key.<cldr-category>` (one/other/…), then
 *  `key.other`, then `key`. `count` is auto-passed as a var. */
export function tPlural(key: string, count: number, vars?: TVars): string {
  const ruleLocale = activeLocale === PSEUDO_LOCALE ? FALLBACK : activeLocale
  let category = "other"
  try {
    category = new Intl.PluralRules(ruleLocale).select(count)
  } catch {
    // Intl unavailable — default to "other".
  }
  const candidate = [`${key}.${category}`, `${key}.other`, key].find(
    (candidateKey) => lookup(candidateKey) !== undefined,
  )
  return t(candidate ?? `${key}.other`, { count, ...vars })
}

const ACCENTS: Readonly<Record<string, string>> = {
  a: "á", e: "é", i: "í", o: "ó", u: "ú", n: "ñ", c: "ç", s: "š", y: "ý",
  A: "Á", E: "É", I: "Í", O: "Ó", U: "Ú", N: "Ñ", C: "Ç", S: "Š",
}

/** Accent ASCII letters and bracket the string, leaving {placeholders} intact. */
export function pseudoTransform(text: string): string {
  const accented = text.replace(/\{[^}]+\}|[A-Za-z]/g, (token) =>
    token.length > 1 ? token : (ACCENTS[token] ?? token),
  )
  return `⟦${accented}⟧`
}
