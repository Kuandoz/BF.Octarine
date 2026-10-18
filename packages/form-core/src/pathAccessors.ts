import type { FieldDefinition, RepeatContext } from '@octarine/form-abstractions'

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

export interface PathContext {
  // `path` with every array-index segment (one that sits under an actual
  // array in the live model) replaced by `*` — the key validations are
  // declared under, e.g. "items.2.quantity" -> "items.*.quantity".
  wildcardPath: string
  // The innermost repeat row `path` sits in, if any.
  repeatContext?: RepeatContext
  // Every repeat row `path` sits in, outermost first.
  repeatContexts: RepeatContext[]
}

// Given a fully-resolved path (e.g. "items.2.quantity"), walks its segments
// against the live model to figure out which numeric segments are actually
// array indices (as opposed to, say, a literal object key that happens to
// be a digit string) — a segment counts only if the model value at its
// prefix is a real array. Building this from the model rather than from
// `definition.components` is what lets validation stay fully independent
// of the rendering schema.
export function resolvePathContext(model: Record<string, unknown>, path: string): PathContext {
  const repeatContexts: RepeatContext[] = []
  let prefix = ''
  const wildcardSegments = path.split('.').map((segment) => {
    const isArrayIndex = /^\d+$/.test(segment) && Array.isArray(getProperty(model, prefix))
    if (isArrayIndex) repeatContexts.push({ arrayPath: prefix, arrayIndex: Number(segment) })
    prefix = prefix ? `${prefix}.${segment}` : segment
    return isArrayIndex ? '*' : segment
  })
  return {
    wildcardPath: wildcardSegments.join('.'),
    repeatContext: repeatContexts.at(-1),
    repeatContexts,
  }
}

// The inverse of resolvePathContext: given a validations-dictionary key
// (with `*` for repeated segments), enumerates every concrete path it
// currently applies to by walking the live model — a `*` with no array at
// that position simply expands to nothing (that row/branch doesn't exist
// yet).
export function expandWildcardPath(
  model: Record<string, unknown>,
  wildcardKey: string,
): Array<{ path: string; repeatContext?: RepeatContext }> {
  const keySegments = wildcardKey.split('.')
  const results: Array<{ path: string; repeatContext?: RepeatContext }> = []

  const walk = (index: number, currentPath: string, repeatContext: RepeatContext | undefined) => {
    if (index === keySegments.length) {
      results.push({ path: currentPath, repeatContext })
      return
    }
    const segment = keySegments[index]!
    if (segment === '*') {
      const items = getProperty(model, currentPath)
      if (!Array.isArray(items)) return
      items.forEach((_, arrayIndex) => {
        walk(index + 1, `${currentPath}.${arrayIndex}`, { arrayPath: currentPath, arrayIndex })
      })
    } else {
      walk(index + 1, currentPath ? `${currentPath}.${segment}` : segment, repeatContext)
    }
  }
  walk(0, '', undefined)

  return results
}

// What an unqualified name means inside a row: that row's own fields. The
// whole model outside one.
export function getScope(
  model: Record<string, unknown>,
  repeatContext?: RepeatContext,
): Record<string, unknown> {
  if (!repeatContext) return model
  const row = getProperty(model, `${repeatContext.arrayPath}.${repeatContext.arrayIndex}`)
  return row !== null && typeof row === 'object' ? (row as Record<string, unknown>) : {}
}
