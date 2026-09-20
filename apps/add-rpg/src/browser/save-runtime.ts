import type { SimulationSnapshot } from "@aedventure/add-runtime-client"

export type AddSaveSource = "autosave" | "manual" | "import" | "offline_catchup" | "reset"

export interface AddBrowserSaveRecord {
  readonly schema: "aedventure.add-rpg.save.v1"
  readonly payload: string
  readonly savedAtMs: number
  readonly clockSeconds: number
  readonly snapshotSchemaVersion: number
  readonly source: AddSaveSource
}

export const ADD_AUTOSAVE_STORAGE_KEY = "aedventure.add-rpg.autosave.v1"
export const MAX_OFFLINE_CATCHUP_SECONDS = 8 * 60 * 60

export function createSaveRecord(
  payload: string,
  snapshot: SimulationSnapshot | null,
  source: AddSaveSource,
  nowMs = Date.now(),
): AddBrowserSaveRecord {
  return {
    schema: "aedventure.add-rpg.save.v1",
    payload,
    savedAtMs: nowMs,
    clockSeconds: Math.round((snapshot?.clockSeconds ?? 0) * 100) / 100,
    snapshotSchemaVersion: snapshot?.schemaVersion ?? 0,
    source,
  }
}

export function readAutosave(
  storage: Pick<Storage, "getItem"> = window.localStorage,
): AddBrowserSaveRecord | null {
  const raw = storage.getItem(ADD_AUTOSAVE_STORAGE_KEY)
  if (!raw) return null

  try {
    return normalizeSaveRecord(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeAutosave(
  record: AddBrowserSaveRecord,
  storage: Pick<Storage, "setItem"> = window.localStorage,
): void {
  storage.setItem(ADD_AUTOSAVE_STORAGE_KEY, JSON.stringify(record))
}

export function clearAutosave(
  storage: Pick<Storage, "removeItem"> = window.localStorage,
): void {
  storage.removeItem(ADD_AUTOSAVE_STORAGE_KEY)
}

export function offlineCatchupSecondsFor(
  record: AddBrowserSaveRecord,
  nowMs = Date.now(),
): number {
  const elapsedSeconds = Math.floor((nowMs - record.savedAtMs) / 1000)
  return clamp(elapsedSeconds, 0, MAX_OFFLINE_CATCHUP_SECONDS)
}

export function formatSaveTimestamp(record: AddBrowserSaveRecord | null): string {
  if (!record) return "No autosave"
  return new Date(record.savedAtMs).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

function normalizeSaveRecord(value: unknown): AddBrowserSaveRecord | null {
  if (!value || typeof value !== "object") return null
  const record = value as Partial<AddBrowserSaveRecord>
  if (record.schema !== "aedventure.add-rpg.save.v1") return null
  if (typeof record.payload !== "string" || record.payload.trim().length === 0) return null
  if (typeof record.savedAtMs !== "number") return null
  if (typeof record.clockSeconds !== "number") return null
  if (typeof record.snapshotSchemaVersion !== "number") return null
  if (!isSaveSource(record.source)) return null
  return {
    schema: record.schema,
    payload: record.payload,
    savedAtMs: record.savedAtMs,
    clockSeconds: record.clockSeconds,
    snapshotSchemaVersion: record.snapshotSchemaVersion,
    source: record.source,
  }
}

function isSaveSource(value: unknown): value is AddSaveSource {
  return (
    value === "autosave" ||
    value === "manual" ||
    value === "import" ||
    value === "offline_catchup" ||
    value === "reset"
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
