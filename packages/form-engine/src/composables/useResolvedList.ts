import { type Ref, ref, watchEffect } from 'vue'

import type { FieldDefinition } from '../types'
import { useFormEngine } from './useFormEngine'

/**
 * Resolves `field.options` into a reactive list: an inline array is used
 * as-is, a string is treated as a list name and resolved through
 * `formEngine.getList(name)` — which may be a form-local list (synchronous)
 * or provider-backed (potentially a network round trip). Either way, the
 * list starts empty and updates once resolved, so callers render a loading
 * state for free rather than assuming options are available immediately.
 *
 * `field.options` is read inside an effect rather than once at setup. A host
 * that fills the options in later — the legacy bridge resolves a named list
 * through the app's store and writes the result onto the definition — would
 * otherwise hand every control an empty list for good, and a select would
 * render with no options and no error.
 */
export function useResolvedList(field: FieldDefinition): Ref<unknown[]> {
  const formEngine = useFormEngine()
  const list = ref<unknown[]>([])

  watchEffect((onCleanup) => {
    const options = field.options

    if (Array.isArray(options)) {
      list.value = options as unknown[]
      return
    }
    if (typeof options !== 'string') {
      list.value = []
      return
    }

    // The answer can arrive after the field has moved on to another list, so
    // a stale one is dropped rather than shown.
    let current = true
    onCleanup(() => {
      current = false
    })

    void formEngine.getList(options).then((resolved) => {
      if (current) list.value = resolved
    })
  })

  return list
}
