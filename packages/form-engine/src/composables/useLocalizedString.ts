import { computed, type ComputedRef } from 'vue'

import type { LocalisableString } from '../types'
import { useFormEngine } from './useFormEngine'
import { useRepeatContext } from './useRepeatContext'

// Takes a getter, not a plain value — `field.label` (or whatever) needs to be
// *read inside* the returned computed for Vue to track it as a dependency.
// A plain value is evaluated once, at the call site, before this even runs;
// a getter re-reads the current value on every recompute, so editing
// `field.label` on an already-mounted component (e.g. a WYSIWYG builder's
// properties panel) is reflected live, not just on the next full re-render.
export function useLocalizedString(key: () => LocalisableString | undefined): ComputedRef<string> {
  const formEngine = useFormEngine()
  const repeatContext = useRepeatContext()
  return computed(() => {
    const resolvedKey = key()
    return resolvedKey !== undefined ? formEngine.localise(resolvedKey, repeatContext) : ''
  })
}
