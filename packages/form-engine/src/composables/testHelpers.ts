import { createApp } from 'vue'

import type { FormEngine } from '../FormEngine'
import type { RepeatContext } from '../types'
import { FORM_ENGINE_KEY } from './useFormEngine'
import { REPEAT_CONTEXT_KEY } from './useRepeatContext'

// Composables that call `useFormEngine()` need an active component context for
// `inject` to resolve — `runWithContext` provides one without mounting a real
// component. Test-only; not part of the package's public API/exports.
export function withFormEngine<T>(engine: FormEngine, fn: () => T): T {
  const app = createApp({})
  app.provide(FORM_ENGINE_KEY, engine)
  return app.runWithContext(fn)
}

export function withFormEngineAndRepeatContext<T>(
  engine: FormEngine,
  repeatContext: RepeatContext,
  fn: () => T,
): T {
  const app = createApp({})
  app.provide(FORM_ENGINE_KEY, engine)
  app.provide(REPEAT_CONTEXT_KEY, repeatContext)
  return app.runWithContext(fn)
}
