import { inject, type InjectionKey } from 'vue'

import type { FormEngine } from '../FormEngine'
import { useRepeatContext } from './useRepeatContext'

export const FORM_ENGINE_KEY: InjectionKey<FormEngine> = Symbol('octarine-form:engine')

// The single gate onto the ambient FormEngine — every composable and field
// component reaches it through here rather than injecting directly, so this
// is the only place that needs to change if the injection mechanism ever does.
//
// Inside a `repeat` field, the returned engine is transparently wrapped so
// `resolveCondition`/`localise` calls are automatically scoped to the current
// row — callers never pass a RepeatContext themselves (easy to forget, and
// only FormEngine's own class-level API needs it, for direct/test use and its
// own internal recursion). Every other method/property passes through
// unchanged.
export function useFormEngine(): FormEngine {
  const engine = inject(FORM_ENGINE_KEY)
  if (!engine) {
    throw new Error('[form-engine] useFormEngine() must be called within a FormRenderer.')
  }

  const repeatContext = useRepeatContext()
  if (!repeatContext) return engine

  return new Proxy(engine, {
    get(target, prop) {
      if (prop === 'resolveCondition') {
        return (condition: Parameters<FormEngine['resolveCondition']>[0], defaultResult = false) =>
          target.resolveCondition(condition, defaultResult, repeatContext)
      }
      if (prop === 'localise') {
        return (key: Parameters<FormEngine['localise']>[0]) => target.localise(key, repeatContext)
      }
      // Bind the receiver to the real instance (not this Proxy) so getters
      // like `model` and any method reading `this.<field>` internally never
      // re-enter the Proxy's own trap.
      const value = Reflect.get(target, prop, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}
