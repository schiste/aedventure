/**
 * Version contract for authored ADD content.
 *
 * `catalogVersion` is the save-facing identity of the authored catalog. Bump
 * it when an authored change needs save reconciliation; the content pipeline
 * mirrors it into Rust and the pre-boot checks reject drift.
 */
export const ADD_CONTENT_VERSION = {
  contentSchemaVersion: 1,
  catalogVersion: 1,
  saveSchemaVersion: 15,
} as const

export type AddContentVersion = typeof ADD_CONTENT_VERSION
