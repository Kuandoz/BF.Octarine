import { computed, type ComputedRef, type WritableComputedRef } from 'vue'

import { resolveFieldPath } from '../pathAccessors'
import type { FieldDefinition } from '../types'
import { useFormEngine } from './useFormEngine'
import { useRepeatContext } from './useRepeatContext'

// Our own schema-structural keys — never meaningful as a prop on whatever
// control renders this field, so never included in `attrs`. `labelBadge` is
// drawn by the field beside its label, not handed to the control.
const META_KEYS: ReadonlySet<string> = new Set(['type', 'path', 'components', 'hide', 'labelBadge'])

export interface FieldModel<T> {
  // Already resolved against the ambient RepeatContext (if any) — e.g.
  // "items.2.quantity" for a field nested inside a `repeat`, not just
  // "quantity". Use this rather than `field.path` for anything path-keyed
  // (isConstant, getValidationResult, ...).
  path: ComputedRef<string>
  value: WritableComputedRef<T | undefined>
  // Every other property on `field` (e.g. maxLength, pattern, icon, ...),
  // meant to be spread onto the underlying control via `v-bind="attrs"` —
  // put it *before* your own explicit bindings in the template so anything
  // you actually process (label, disabled, ...) still wins; Vue merges
  // v-bind objects with individual bindings in template order.
  attrs: ComputedRef<Record<string, unknown>>
}

export function useFieldModel<T = unknown>(field: FieldDefinition): FieldModel<T> {
  const formEngine = useFormEngine()
  const repeatContext = useRepeatContext()
  const path = computed(() => resolveFieldPath(field.path, repeatContext))

  const value = computed<T | undefined>({
    get: () => formEngine.getValue(path.value) as T | undefined,
    set: (newValue) => formEngine.setValue(path.value, newValue),
  })

  const attrs = computed(() => {
    const result: Record<string, unknown> = {}
    for (const [key, attrValue] of Object.entries(field)) {
      if (!META_KEYS.has(key)) result[key] = attrValue
    }
    return result
  })

  return { path, value, attrs }
}
