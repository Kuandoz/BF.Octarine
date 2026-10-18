import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  onScopeDispose,
  toValue,
  useId,
  watch,
  type WritableComputedRef,
} from 'vue'

import { resolveFieldPath } from '../pathAccessors'
import type { FieldDefinition } from '../types'
import { useFormEngine } from './useFormEngine'
import { useRepeatContext } from './useRepeatContext'

// Properties the engine reads itself. They are never passed on in `attrs`:
// `disabled: "locked === true"` is a condition, not an HTML attribute, and
// `label` or `layout` on an input would only be noise.
const ENGINE_KEYS: ReadonlySet<string> = new Set([
  'type',
  'path',
  'components',
  'label',
  'hint',
  'layout',
  'labelBadge',
  'hide',
  'disabled',
  'readonly',
])

export interface UseFieldOptions {
  /**
   * Whether the component puts `id` on a control an error summary can jump
   * to (default true). A group that only frames its children, like a
   * fieldset, passes false; errors on its path then link to its first
   * control.
   */
  target?: boolean
}

export interface Field<T> {
  // Unique on the page, also with two forms that capture the same path. Put
  // it on the control (`<input :id>`, or OField's `id`).
  id: string
  // Resolved against the row the field is in: "items.2.quantity", not
  // "quantity".
  path: ComputedRef<string>
  value: WritableComputedRef<T | undefined>
  label: ComputedRef<string>
  hint: ComputedRef<string | undefined>
  // Follows required-if conditions, exactly as validation does.
  required: ComputedRef<boolean>
  // True for a `disabled` condition that holds, and for a constant.
  disabled: ComputedRef<boolean>
  readonly: ComputedRef<boolean>
  // The error to show now: after the field was left, or after a submit.
  error: ComputedRef<string | undefined>
  // Call when the user leaves the field, so its error starts to show.
  onBlur: () => void
  // The field's own settings for its control (`maxLength`, `options`, ...):
  // every property the engine doesn't read itself.
  attrs: ComputedRef<Record<string, unknown>>
}

/**
 * Everything a field component needs from the engine, for the field it
 * renders. Pass the `field` prop as a getter (`() => props.field`) so a
 * changed definition, like an edit in a builder, shows up right away.
 */
export function useField<T = unknown>(
  field: MaybeRefOrGetter<FieldDefinition>,
  options: UseFieldOptions = {},
): Field<T> {
  const engine = useFormEngine()
  const repeatContext = useRepeatContext()
  const id = useId()
  const definition = computed(() => toValue(field))
  const path = computed(() => resolveFieldPath(definition.value.path, repeatContext))

  if (options.target !== false) {
    let unregister: (() => void) | undefined
    watch(
      path,
      (current) => {
        unregister?.()
        unregister = current ? engine.registerField(current, id) : undefined
      },
      { immediate: true },
    )
    onScopeDispose(() => unregister?.())
  }

  const value = computed<T | undefined>({
    get: () => engine.getValue(path.value) as T | undefined,
    set: (newValue) => engine.setValue(path.value, newValue),
  })
  const label = computed(() =>
    definition.value.label === undefined ? '' : engine.localise(definition.value.label),
  )
  const hint = computed(() =>
    definition.value.hint === undefined ? undefined : engine.localise(definition.value.hint),
  )
  const required = computed(() => engine.isRequired(path.value))
  const disabled = computed(
    () =>
      engine.resolveCondition(definition.value.disabled, false) || engine.isConstant(path.value),
  )
  const readonly = computed(() => engine.resolveCondition(definition.value.readonly, false))
  const error = computed(() => engine.getError(path.value))
  const attrs = computed(() => {
    const result: Record<string, unknown> = {}
    for (const [key, attrValue] of Object.entries(definition.value)) {
      if (!ENGINE_KEYS.has(key)) result[key] = attrValue
    }
    return result
  })

  return {
    id,
    path,
    value,
    label,
    hint,
    required,
    disabled,
    readonly,
    error,
    onBlur: () => engine.touch(path.value),
    attrs,
  }
}
