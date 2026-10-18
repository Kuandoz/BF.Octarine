import { createApp } from 'vue'

import { describe, expect, it } from 'vitest'

import { FormEngine } from '../FormEngine'
import { withFormEngine, withFormEngineAndRepeatContext } from './testHelpers'
import { useFormEngine } from './useFormEngine'

describe('useFormEngine', () => {
  it('returns the engine provided by an ancestor FormRenderer', () => {
    const engine = new FormEngine({ components: [] })
    const resolved = withFormEngine(engine, () => useFormEngine())
    expect(resolved).toBe(engine)
  })

  it('throws when called outside a FormRenderer', () => {
    const app = createApp({})
    expect(() => app.runWithContext(() => useFormEngine())).toThrow(
      'useFormEngine() must be called within a FormRenderer.',
    )
  })

  describe('inside a repeat field', () => {
    const definition = {
      components: [{ type: 'repeat', path: 'items', components: [{ type: 'text', path: 'type' }] }],
    }

    it('returns the engine itself, not one scoped to the row', () => {
      const engine = new FormEngine(definition, { model: { items: [{ type: 'x' }] } })
      const resolved = withFormEngineAndRepeatContext(
        engine,
        { arrayPath: 'items', arrayIndex: 0 },
        () => useFormEngine(),
      )
      expect(resolved).toBe(engine)
    })

    it('scopes a condition to the row it is given', () => {
      const engine = new FormEngine(definition, {
        model: { items: [{ type: 'x' }, { type: 'y' }] },
      })
      const condition = "type === 'x'"
      expect(engine.resolveCondition(condition, false, { arrayPath: 'items', arrayIndex: 0 })).toBe(
        true,
      )
      expect(engine.resolveCondition(condition, false, { arrayPath: 'items', arrayIndex: 1 })).toBe(
        false,
      )
    })
  })
})
