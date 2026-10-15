import { createApp } from 'vue'

import { describe, expect, it } from 'vitest'

import { REPEAT_CONTEXT_KEY, useRepeatContext } from './useRepeatContext'

function withRepeatContext<T>(context: { arrayPath: string; arrayIndex: number }, fn: () => T): T {
  const app = createApp({})
  app.provide(REPEAT_CONTEXT_KEY, context)
  return app.runWithContext(fn)
}

describe('useRepeatContext', () => {
  it('returns undefined at the top level, outside any repeat field', () => {
    const app = createApp({})
    expect(app.runWithContext(() => useRepeatContext())).toBeUndefined()
  })

  it('returns the context provided by an ancestor repeat item', () => {
    const context = { arrayPath: 'items', arrayIndex: 2 }
    expect(withRepeatContext(context, () => useRepeatContext())).toEqual(context)
  })
})
