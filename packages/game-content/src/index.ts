// @aedventure/game-content — engine-neutral content authoring pipeline.
//
// Content (items, perks, quests, dialogue, encounter tables, and any other
// catalog) is authored as typed data, validated by a generic checker, and can be
// emitted to other build targets (e.g. generated Rust consts). Domain-neutral and
// renderer-agnostic: the engine gets a content vocabulary without app specifics;
// objects reference content by id.

export interface ContentEntry {
  readonly id: string
}

export interface ContentCatalog<T extends ContentEntry> {
  readonly kind: string
  readonly entries: readonly T[]
}

export interface ContentCatalogValidation {
  readonly valid: boolean
  readonly errors: readonly string[]
}

/** Validate a catalog: non-empty kind, present + unique ids, and (optionally)
 * that every `referenceField` value resolves against a known id set. */
export function validateContentCatalog<T extends ContentEntry>(
  catalog: ContentCatalog<T>,
  options: {
    readonly knownIds?: ReadonlySet<string>
    readonly references?: ReadonlyArray<{ readonly field: keyof T; readonly into: ReadonlySet<string> }>
  } = {},
): ContentCatalogValidation {
  const errors: string[] = []
  if (catalog.kind.trim() === "") errors.push("Catalog kind must not be empty.")
  const seen = new Set<string>()
  catalog.entries.forEach((entry, index) => {
    if (typeof entry.id !== "string" || entry.id.trim() === "") {
      errors.push(`${catalog.kind} entry ${index} has an empty id.`)
      return
    }
    if (seen.has(entry.id)) errors.push(`${catalog.kind}: duplicate id "${entry.id}".`)
    seen.add(entry.id)
    if (options.knownIds && !options.knownIds.has(entry.id)) {
      errors.push(`${catalog.kind}: id "${entry.id}" is not in the allowed id set.`)
    }
    for (const ref of options.references ?? []) {
      const value = entry[ref.field]
      if (typeof value === "string" && value !== "" && !ref.into.has(value)) {
        errors.push(`${catalog.kind} "${entry.id}": ${String(ref.field)} "${value}" does not resolve.`)
      }
    }
  })
  return { valid: errors.length === 0, errors }
}

// --- Neutral content vocabulary --------------------------------------------
// Minimal schemas for the named content kinds; apps extend/profile as needed.

/** What consuming one of an item does. `kind` is defined by the consuming sim
 * (e.g. "restore_survival"); `amount` is its magnitude. */
export interface ItemEffect {
  readonly kind: string
  readonly amount: number
}

export interface Item extends ContentEntry {
  readonly label: string
  readonly stackable?: boolean
  readonly maxStack?: number
  readonly useEffect?: ItemEffect
  readonly tags?: readonly string[]
}

/** A single perk effect: multiply a named stat. The set of valid stats is defined
 * by the consuming sim; magnitudes and stat assignment are authored data. */
export interface PerkEffect {
  readonly stat: string
  readonly multiplier: number
}

export interface Perk extends ContentEntry {
  readonly label: string
  readonly description?: string
  readonly requires?: readonly string[]
  readonly effects?: readonly PerkEffect[]
  readonly tags?: readonly string[]
}

export interface QuestStep {
  readonly id: string
  readonly label: string
  readonly detail?: string
}

export interface Quest extends ContentEntry {
  readonly label: string
  readonly steps: readonly QuestStep[]
}

export interface DialogueChoice {
  readonly id: string
  readonly label: string
  readonly response?: string
  readonly next?: string
}

export interface DialogueNode extends ContentEntry {
  readonly speaker?: string
  readonly body: string
  readonly choices?: readonly DialogueChoice[]
}

export interface EncounterChance {
  readonly creatureId: string
  readonly weight: number
  readonly min?: number
  readonly max?: number
}

export interface EncounterTable extends ContentEntry {
  readonly label?: string
  readonly entries: readonly EncounterChance[]
}

/** Pick a weighted entry for a `roll` in [0,1). Deterministic; pass any roll
 * source (a seeded value, or evenly-spaced indices for fixed placements). */
export function rollEncounter(
  table: EncounterTable,
  roll: number,
): EncounterChance | undefined {
  const total = table.entries.reduce((sum, e) => sum + Math.max(0, e.weight), 0)
  if (total <= 0) return undefined
  let remaining = Math.min(1, Math.max(0, roll)) * total
  for (const entry of table.entries) {
    remaining -= Math.max(0, entry.weight)
    if (remaining < 0) return entry
  }
  return table.entries[table.entries.length - 1]
}

/** Deterministically resolve `count` spawns from a table by spreading evenly
 * across the weight distribution (no RNG) — for fixed spawn slots. */
export function resolveEncounterSpawns(
  table: EncounterTable,
  count: number,
): EncounterChance[] {
  const spawns: EncounterChance[] = []
  for (let i = 0; i < count; i += 1) {
    const pick = rollEncounter(table, count <= 1 ? 0 : (i + 0.5) / count)
    if (pick) spawns.push(pick)
  }
  return spawns
}

// --- Loot tables ------------------------------------------------------------
// The item-side twin of encounter tables: a weighted set of possible item
// drops, each with a quantity range.

export interface LootChance {
  readonly itemId: string
  readonly weight: number
  readonly min?: number
  readonly max?: number
}

export interface LootTable extends ContentEntry {
  readonly label?: string
  readonly entries: readonly LootChance[]
}

/** Pick a weighted loot entry for a `roll` in [0,1). Deterministic. */
export function rollLoot(table: LootTable, roll: number): LootChance | undefined {
  const total = table.entries.reduce((sum, e) => sum + Math.max(0, e.weight), 0)
  if (total <= 0) return undefined
  let remaining = Math.min(1, Math.max(0, roll)) * total
  for (const entry of table.entries) {
    remaining -= Math.max(0, entry.weight)
    if (remaining < 0) return entry
  }
  return table.entries[table.entries.length - 1]
}

/** Resolve a single drop: pick an entry with `rollPick`, then a quantity in the
 * entry's `[min,max]` with `rollQty` (both in [0,1)). Deterministic. */
export function lootDrop(
  table: LootTable,
  rollPick: number,
  rollQty: number,
): { itemId: string; qty: number } | undefined {
  const chance = rollLoot(table, rollPick)
  if (!chance) return undefined
  const min = Math.max(1, Math.floor(chance.min ?? 1))
  const max = Math.max(min, Math.floor(chance.max ?? min))
  const span = max - min + 1
  const qty = min + Math.min(span - 1, Math.floor(Math.min(1, Math.max(0, rollQty)) * span))
  return { itemId: chance.itemId, qty }
}

/** Stable hash of a string to a value in [0,1). Lets callers derive a fixed
 * "roll" from an identity (e.g. a location key) without any RNG. */
export function hashUnit(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967296
}

// --- Rust-literal emitter ---------------------------------------------------
// Emits a catalog as a generated Rust `const` array literal. Output is compact;
// run rustfmt afterwards for canonical formatting. The build step that uses this
// is what couples the (neutral) pipeline to a specific runtime.

export type RustFieldKind =
  | "string"
  | "idConst"
  | "f64"
  | "i64"
  | "u64"
  | "bool"
  | "enum"
  | "option"
  | "ref"
  | "enumArray"
  | "idConstArray"
  | "array"
  | "taggedEnum"
  | "struct"

/** A Rust enum variant emitted from a tagged-union object (`tagField` selects it). */
export interface RustVariantSpec {
  readonly variant: string
  /** Positional tuple args, e.g. `Variant(a, b)`. */
  readonly tuple?: readonly RustFieldSpec[]
  /** Named struct fields, e.g. `Variant { a, b }`. */
  readonly fields?: readonly RustFieldSpec[]
}

export interface RustFieldSpec {
  /** Rust field name (snake_case). */
  readonly name: string
  /** Source key on the data object; defaults to the camelCase of `name`. */
  readonly from?: string
  readonly kind: RustFieldKind
  /** Required when `kind` is "enum": the Rust enum type name. */
  readonly rustEnum?: string
  /** Required when `kind` is "option": the inner value's kind (null -> None). */
  readonly inner?: RustFieldKind
  /** Required when `kind` is "ref" or "array": how to emit the nested value. */
  readonly element?: RustFieldSpec
  /** For "idConst": prefix prepended to the derived const name (e.g. "FLAG_"). */
  readonly prefix?: string
  /** For "taggedEnum": the discriminant key on the object (defaults to "kind"). */
  readonly tagField?: string
  /** For "taggedEnum": tag value -> Rust variant. */
  readonly variants?: Readonly<Record<string, RustVariantSpec>>
  /** For "struct": the Rust struct type name. */
  readonly structType?: string
  /** For "struct": the struct's fields. */
  readonly fields?: readonly RustFieldSpec[]
}

export interface RustConstSpec {
  readonly constName: string
  readonly rustType: string
  readonly visibility?: string
  readonly fields: readonly RustFieldSpec[]
  readonly preamble?: string
  readonly header?: string
}

/** The id-const naming convention: "thing.some_name" -> "THING_SOME_NAME". */
export function idConstName(id: string): string {
  return id.toUpperCase().replace(/[.]/g, "_")
}

function camelCase(snake: string): string {
  return snake.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

function pascalCase(value: string): string {
  return value
    .split(/[_\s.]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("")
}

function rustF64(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : String(value)
}

function rustFieldValue(spec: RustFieldSpec, raw: unknown): string {
  switch (spec.kind) {
    case "string":
      return JSON.stringify(String(raw))
    case "idConst":
      return `${spec.prefix ?? ""}${idConstName(String(raw))}`
    case "f64":
      return rustF64(Number(raw))
    case "i64":
    case "u64":
      return String(Math.trunc(Number(raw)))
    case "bool":
      return raw ? "true" : "false"
    case "enum":
      return `${spec.rustEnum}::${pascalCase(String(raw))}`
    case "option":
      return raw === null || raw === undefined
        ? "None"
        : `Some(${rustFieldValue({ ...spec, kind: spec.inner ?? "string" }, raw)})`
    case "ref": {
      const element = spec.element
      if (!element) throw new Error(`ref field "${spec.name}" needs an element spec`)
      return `&${rustFieldValue(element, raw)}`
    }
    case "enumArray": {
      const values = Array.isArray(raw) ? raw : []
      return `&[${values.map((v) => `${spec.rustEnum}::${pascalCase(String(v))}`).join(", ")}]`
    }
    case "idConstArray": {
      const values = Array.isArray(raw) ? raw : []
      return `&[${values.map((v) => `${spec.prefix ?? ""}${idConstName(String(v))}`).join(", ")}]`
    }
    case "array": {
      const values = Array.isArray(raw) ? raw : []
      const element = spec.element
      if (!element) throw new Error(`array field "${spec.name}" needs an element spec`)
      return `&[${values.map((v) => rustFieldValue(element, v)).join(", ")}]`
    }
    case "taggedEnum": {
      const obj = (raw ?? {}) as Record<string, unknown>
      const tag = String(obj[spec.tagField ?? "kind"])
      const variant = spec.variants?.[tag]
      if (!variant) throw new Error(`taggedEnum "${spec.rustEnum}" has no variant for tag "${tag}"`)
      const field = (f: RustFieldSpec) => rustFieldValue(f, obj[f.from ?? camelCase(f.name)])
      if (variant.tuple) {
        return `${spec.rustEnum}::${variant.variant}(${variant.tuple.map(field).join(", ")})`
      }
      if (variant.fields) {
        return `${spec.rustEnum}::${variant.variant} { ${variant.fields
          .map((f) => `${f.name}: ${field(f)}`)
          .join(", ")} }`
      }
      return `${spec.rustEnum}::${variant.variant}`
    }
    case "struct": {
      const obj = (raw ?? {}) as Record<string, unknown>
      const fields = spec.fields ?? []
      return `${spec.structType} { ${fields
        .map((f) => `${f.name}: ${rustFieldValue(f, obj[f.from ?? camelCase(f.name)])}`)
        .join(", ")} }`
    }
  }
}

export function toRustConst(
  spec: RustConstSpec,
  entries: readonly Record<string, unknown>[],
): string {
  const lines: string[] = []
  if (spec.header) lines.push(spec.header, "")
  if (spec.preamble) lines.push(spec.preamble, "")
  const visibility = spec.visibility ? `${spec.visibility} ` : ""
  lines.push(`${visibility}const ${spec.constName}: &[${spec.rustType}] = &[`)
  for (const entry of entries) {
    const fields = spec.fields
      .map((field) => `${field.name}: ${rustFieldValue(field, entry[field.from ?? camelCase(field.name)])}`)
      .join(", ")
    lines.push(`${spec.rustType} { ${fields} },`)
  }
  lines.push("];", "")
  return lines.join("\n")
}

/**
 * Emit a single `const NAME: Type = Type { ... };` from one object (not an
 * array) — for catalogs that are a single deep struct (e.g. a balance table).
 */
export function toRustStatic(spec: RustConstSpec, value: Record<string, unknown>): string {
  const lines: string[] = []
  if (spec.header) lines.push(spec.header, "")
  if (spec.preamble) lines.push(spec.preamble, "")
  const visibility = spec.visibility ? `${spec.visibility} ` : ""
  const struct = rustFieldValue(
    { name: spec.constName, kind: "struct", structType: spec.rustType, fields: spec.fields },
    value,
  )
  lines.push(`${visibility}const ${spec.constName}: ${spec.rustType} = ${struct};`, "")
  return lines.join("\n")
}
