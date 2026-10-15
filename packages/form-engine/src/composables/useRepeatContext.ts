import { inject, type InjectionKey } from 'vue'

import type { RepeatContext } from '../types'

export const REPEAT_CONTEXT_KEY: InjectionKey<RepeatContext> = Symbol(
  'octarine-form:repeat-context',
)

// undefined outside any `repeat` field — the top-level, non-repeated case.
export function useRepeatContext(): RepeatContext | undefined {
  return inject(REPEAT_CONTEXT_KEY, undefined)
}
