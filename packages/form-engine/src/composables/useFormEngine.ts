import { inject, type InjectionKey } from 'vue'

import type { FormEngine } from '../FormEngine'

export const FORM_ENGINE_KEY: InjectionKey<FormEngine> = Symbol('octarine-form:engine')

// The engine of the form this component is in. It isn't scoped to a row: a
// field inside a repeat passes its row (useRepeatContext()) to the calls that
// take one, like resolveCondition and localise. useField does that already.
export function useFormEngine(): FormEngine {
  const engine = inject(FORM_ENGINE_KEY)
  if (!engine) {
    throw new Error('[form-engine] useFormEngine() must be called within a FormRenderer.')
  }
  return engine
}
