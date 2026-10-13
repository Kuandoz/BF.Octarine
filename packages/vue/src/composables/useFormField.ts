import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue'

export type FormFieldContext = {
  id: ComputedRef<string>
  describedBy: ComputedRef<string | undefined>
  invalid: ComputedRef<boolean>
  required: ComputedRef<boolean>
  disabled: ComputedRef<boolean>
}

const key: InjectionKey<FormFieldContext> = Symbol('octarine-form-field')

export function provideFormField(context: FormFieldContext) {
  provide(key, context)
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
  const field = inject(key, null)
  return {
    id: computed(() => own.id?.() ?? field?.id.value),
    describedBy: computed(() => field?.describedBy.value),
    invalid: computed(() => own.invalid?.() ?? field?.invalid.value ?? false),
    required: computed(() => field?.required.value ?? false),
    disabled: computed(() => own.disabled?.() ?? field?.disabled.value ?? false),
  }
}
