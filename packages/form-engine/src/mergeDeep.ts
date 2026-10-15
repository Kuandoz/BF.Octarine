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
