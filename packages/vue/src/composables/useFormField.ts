import { computed, inject, provide, watch, type ComputedRef, type InjectionKey } from 'vue'

export type FormFieldContext = {
  /** Undefined in a group (`OFieldset`): each control has its own id there. */
  id: ComputedRef<string | undefined>
  describedBy: ComputedRef<string | undefined>
  invalid: ComputedRef<boolean>
  required: ComputedRef<boolean>
  disabled: ComputedRef<boolean>
  /** Controls report their value's length, so the field can show a counter. */
  setLength?: (length: number) => void
}

const key: InjectionKey<FormFieldContext> = Symbol('octarine-form-field')

export function provideFormField(context: FormFieldContext) {
  provide(key, context)
}

/** The enclosing field or group, if any. */
export function injectFormField(): FormFieldContext | null {
  return inject(key, null)
}

/**
 * Lets a control (OInput, …) pick up id, aria wiring and state from a wrapping
 * OField, while its own props still take precedence.
 */
export function useFormField(own: {
  id?: () => string | undefined
  invalid?: () => boolean | undefined
  disabled?: () => boolean | undefined
}) {
  const field = injectFormField()
  return {
    id: computed(() => own.id?.() ?? field?.id.value),
    describedBy: computed(() => field?.describedBy.value),
    invalid: computed(() => own.invalid?.() ?? field?.invalid.value ?? false),
    required: computed(() => field?.required.value ?? false),
    disabled: computed(() => own.disabled?.() ?? field?.disabled.value ?? false),
    setLength: (length: number) => field?.setLength?.(length),
  }
}

/**
 * How fields show whether they must be filled in: `*` on required fields,
 * `(optional)` on optional ones, or both.
 */
export const requiredMarkers = ['required', 'optional', 'both'] as const
export type RequiredMarkers = (typeof requiredMarkers)[number]

export type FormContext = {
  markers: ComputedRef<RequiredMarkers>
  /** A required field registers itself, so the form knows to explain `*`. */
  registerRequired: () => () => void
}

const formKey: InjectionKey<FormContext> = Symbol('octarine-form')

export function provideForm(context: FormContext) {
  provide(formKey, context)
}

export function injectForm(): FormContext | null {
  return inject(formKey, null)
}

/**
 * Which marker a field or group shows next to its label. The mode comes from the
 * field, then the enclosing `OForm`, and defaults to `required`.
 */
export function useRequiredMarker(own: {
  required: () => boolean
  markers: () => RequiredMarkers | undefined
}) {
  const form = injectForm()
  const mode = computed(() => own.markers() ?? form?.markers.value ?? 'required')
  const star = computed(() => own.required() && mode.value !== 'optional')
  const optional = computed(() => !own.required() && mode.value !== 'required')

  // A watch callback, unlike watchEffect, doesn't track what registering reads.
  watch(
    star,
    (shown, _, onCleanup) => {
      if (form && shown) onCleanup(form.registerRequired())
    },
    { immediate: true },
  )

  return { star, optional }
}
