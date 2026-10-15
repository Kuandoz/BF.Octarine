import type { FieldDefinition, RepeatContext } from './types'

const PATH_SEGMENT = /[^.[\]]+/g

function segments(path: string): string[] {
  return path.match(PATH_SEGMENT) ?? []
}

// The first path segment — e.g. "address.street" -> "address". Used to make
// sure a field's path exists as a real (if `undefined`) key on the model, so
// expressions referencing it are "declared but undefined" rather than a
// ReferenceError for a completely undeclared identifier.
export function getTopLevelKey(path: string): string | undefined {
  return segments(path)[0]
}

export function getProperty(source: Record<string, unknown>, path: string): unknown {
  let current: unknown = source
  for (const segment of segments(path)) {
    if (current == null) return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export function setProperty(target: Record<string, unknown>, path: string, value: unknown): void {
  const segs = segments(path)
  if (segs.length === 0) return

  let current = target as Record<string, unknown>
  for (let i = 0; i < segs.length - 1; i++) {
    const segment = segs[i]!
    const nextIsIndex = /^\d+$/.test(segs[i + 1]!)
    if (current[segment] == null || typeof current[segment] !== 'object') {
      current[segment] = nextIsIndex ? [] : {}
    }
    current = current[segment] as Record<string, unknown>
  }
  current[segs[segs.length - 1]!] = value
}

export function removeProperty(target: Record<string, unknown>, path: string): void {
  const segs = segments(path)
  if (segs.length === 0) return

  let current: unknown = target
  for (let i = 0; i < segs.length - 1; i++) {
    current = (current as Record<string, unknown>)?.[segs[i]!]
    if (current == null) return
  }
  delete (current as Record<string, unknown>)[segs[segs.length - 1]!]
}

// A field's own path is relative to whatever row it's nested in — this folds
// in the ambient RepeatContext (already fully resolved, so nested repeats
// just work) to get the path FormEngine.getValue/setValue actually operate
// on, e.g. resolveFieldPath("quantity", {arrayPath: "items", arrayIndex: 2})
// -> "items.2.quantity". With no context, the field's own path is returned
// as-is — the top-level, non-repeated case.
export function resolveFieldPath(fieldPath: string | undefined, context?: RepeatContext): string {
  if (!context) return fieldPath ?? ''
  const rowPath = `${context.arrayPath}.${context.arrayIndex}`
  return fieldPath ? `${rowPath}.${fieldPath}` : rowPath
}

// Ensures every declared field's top-level path segment exists as a real (if
// `undefined`) key on `target` — see getTopLevelKey's own comment for why.
// For a `repeat` field, also declares each of ITS existing items' own
// top-level keys (recursively, so nested repeats-within-repeats work too) —
// a freshly-added row is the caller's responsibility (see FormEngine.
// addRepeatItem), this only covers items already present in `target`.
export function declareFieldKeys(fields: FieldDefinition[], target: Record<string, unknown>): void {
  for (const field of fields) {
    if (!field.path) {
      if (field.components) declareFieldKeys(field.components, target)
      continue
    }

    const key = getTopLevelKey(field.path)
    if (key !== undefined && !(key in target)) target[key] = undefined

    if (field.type === 'repeat') {
      const items = getProperty(target, field.path)
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item !== null && typeof item === 'object') {
            declareFieldKeys(field.components ?? [], item as Record<string, unknown>)
          }
        }
      }
      continue
    }

    if (field.components) declareFieldKeys(field.components, target)
  }
}
