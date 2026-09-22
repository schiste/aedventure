// Presentation formatters: how a number or a string is shown to a player.
//
// These lived in the app's single render file, which meant the rules for
// shortening a sentence or naming a duration could not be checked without
// building the game and opening a browser. They are pure functions of their
// arguments and belong with the components that use them.

/** Integers stay whole; anything else gets one decimal. */
export function formatResource(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

export function formatSignedResource(value: number): string {
  return `${value >= 0 ? "+" : "-"}${formatResource(Math.abs(value))}`
}

export function formatSignedResourceDelta(value: number): string {
  return `${formatSignedResource(value)} gained`
}

export function formatSignedNumber(value: number): string {
  if (value === 0) return "0"
  return value > 0 ? `+${value}` : `${value}`
}

/** A rate, or "steady" when it is too small for the player to act on. */
export function signedRateCopy(value: number): string {
  if (Math.abs(value) < 0.001) return "steady"
  return `${value > 0 ? "+" : ""}${formatResource(value)}/s`
}

/**
 * Coarsening on purpose: seconds while that is actionable, then minutes, then
 * hours. A player deciding whether to wait does not need "3841s".
 */
export function formatEconomyDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "blocked"
  if (seconds <= 0) return "now"
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
}

/** `null` means nothing is draining or filling, which is "stable", not zero. */
export function formatResourceTime(seconds: number | null): string {
  return seconds === null ? "stable" : formatEconomyDuration(seconds)
}

export function titleCase(value: string): string {
  return value.length === 0 ? value : `${value[0].toUpperCase()}${value.slice(1)}`
}

export function normalizeUiCopy(copy: string | null | undefined): string {
  return (copy ?? "").replace(/\s+/g, " ").trim()
}

export function firstSentence(copy: string): string {
  const match = /^(.+?[.!?])\s+/.exec(copy)
  return match?.[1] ?? copy
}

/**
 * Shorten authored copy to something that fits, preferring a natural break.
 *
 * The order matters and is the whole design: a whole first sentence reads best,
 * then a clause boundary, and only failing both does it cut mid-phrase. The
 * length floors (18, 16, 32) exist so the result is never a fragment so short
 * it says less than nothing.
 */
export function leadUiCopy(copy: string | null | undefined, maxLength = 84): string {
  const normalized = normalizeUiCopy(copy)
  if (normalized.length <= maxLength) return normalized

  const sentence = firstSentence(normalized)
  if (sentence.length >= 18 && sentence.length <= maxLength) return sentence

  const breakpoints = ["; ", " - ", " — ", " · "]
  for (const breakpoint of breakpoints) {
    const index = normalized.indexOf(breakpoint)
    if (index > 16 && index <= maxLength) return normalized.slice(0, index)
  }

  const slice = normalized.slice(0, maxLength - 3)
  const lastSpace = slice.lastIndexOf(" ")
  return `${slice.slice(0, lastSpace > 32 ? lastSpace : slice.length).trimEnd()}...`
}

/** Does the full copy say enough more than the shortened form to be worth opening? */
export function shouldRevealCopyDetail(
  fullCopy: string | null | undefined,
  visibleCopy: string,
): boolean {
  const full = normalizeUiCopy(fullCopy)
  const visible = normalizeUiCopy(visibleCopy)
  return full.length > visible.length + 8 && full !== visible
}
