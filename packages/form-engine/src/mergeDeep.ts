import { toRaw } from 'vue'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Recursively merges `source` into `target` in place. Plain objects merge
// key by key; arrays and any other value from `source` simply replace
// whatever was in `target` — no array-concatenation mode, unlike the legacy
// `_forms` system's optional `mergeArrayHandlingReplace` setting.
export function mergeDeep(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value)) {
      const existing = isPlainObject(target[key]) ? (target[key] as Record<string, unknown>) : {}
      target[key] = mergeDeep(existing, value)
    } else if (value !== null && typeof value === 'object') {
      // Structured-clone arrays/dates/etc. so the model never shares a
      // reference with `source` (e.g. definition.constants/defaults) —
      // mutating one must never mutate the other. `source` is very often a
      // Vue-reactive object (e.g. FormBuilder's own `definition`) —
      // structuredClone throws on a Proxy in a real browser (it silently
      // works in Node, which is why this only ever surfaced there), so the
      // raw value is what actually gets cloned.
      target[key] = structuredClone(toRaw(value))
    } else {
      target[key] = value
    }
  }
  return target
}

// A deep copy with no Vue proxies left in it, at any depth: a row added
// with `[...items, item]` holds the proxies of the rows before it. For
// handing the model to an app, or to a new engine.
export function clonePlain<T>(value: T): T {
  const raw = toRaw(value)
  if (Array.isArray(raw)) return raw.map(clonePlain) as T
  if (raw === null || typeof raw !== 'object') return raw
  if (Object.getPrototypeOf(raw) !== Object.prototype && Object.getPrototypeOf(raw) !== null) {
    return structuredClone(raw)
  }
  const copy: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(raw)) copy[key] = clonePlain(item)
  return copy as T
}
