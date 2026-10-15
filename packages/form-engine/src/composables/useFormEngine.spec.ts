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

    it('scopes resolveCondition to the current row without the caller passing a RepeatContext', () => {
      const engine = new FormEngine(definition, { items: [{ type: 'x' }, { type: 'y' }] })
      const repeatContext = { arrayPath: 'items', arrayIndex: 0 }

      const resolved = withFormEngineAndRepeatContext(engine, repeatContext, () => {
        const scopedEngine = useFormEngine()
        return scopedEngine.resolveCondition("type === 'x'")
      })
      expect(resolved).toBe(true)

      const resolvedForOtherRow = withFormEngineAndRepeatContext(
        engine,
        { arrayPath: 'items', arrayIndex: 1 },
        () => useFormEngine().resolveCondition("type === 'x'"),
      )
      expect(resolvedForOtherRow).toBe(false)
    })

    it("scopes localise's switch/case branches to the current row the same way", () => {
      const engine = new FormEngine(
        {
          ...definition,
          localisations: { default: 'nl', nl: { Yes: 'Ja', No: 'Nee' } },
        },
        { items: [{ type: 'x' }] },
      )
      const repeatContext = { arrayPath: 'items', arrayIndex: 0 }

      const label = withFormEngineAndRepeatContext(engine, repeatContext, () =>
        useFormEngine().localise({ Yes: "type === 'x'", No: 'true' }),
      )
      expect(label).toBe('Ja')
    })

    it("still isn't fooled by an explicit repeatContext argument at the call site — the ambient one wins", () => {
      const engine = new FormEngine(definition, { items: [{ type: 'x' }] })
      const repeatContext = { arrayPath: 'items', arrayIndex: 0 }

      const resolved = withFormEngineAndRepeatContext(engine, repeatContext, () =>
        // A caller passing an explicit (wrong) RepeatContext can't override the
        // wrapper — it always uses the ambient one for the third argument.
        useFormEngine().resolveCondition("type === 'x'", false, {
          arrayPath: 'items',
          arrayIndex: 99,
        }),
      )
      expect(resolved).toBe(true)
    })

    it('passes every other method/property straight through to the real engine', () => {
      const engine = new FormEngine(definition, { items: [{ type: 'x' }] })
      const repeatContext = { arrayPath: 'items', arrayIndex: 0 }

      const scopedEngine = withFormEngineAndRepeatContext(engine, repeatContext, () =>
        useFormEngine(),
      )
      expect(scopedEngine.getValue('items.0.type')).toBe('x')
      expect(scopedEngine.model).toBe(engine.model)

      scopedEngine.setValue('items.0.type', 'y')
      expect(engine.getValue('items.0.type')).toBe('y')
    })
  })
})
