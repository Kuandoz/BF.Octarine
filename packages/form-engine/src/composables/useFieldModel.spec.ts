import { describe, expect, it } from 'vitest'

import { FormEngine } from '../FormEngine'
import type { FormDefinition } from '../types'
import { withFormEngine } from './testHelpers'
import { useFieldModel } from './useFieldModel'

const definition: FormDefinition = {
  components: [{ type: 'text', path: 'firstName', label: 'First name' }],
}

describe('useFieldModel', () => {
  it("exposes the field's path", () => {
    const engine = new FormEngine(definition)
    const { path } = withFormEngine(engine, () => useFieldModel(definition.components[0]!))
    expect(path.value).toBe('firstName')
  })

  it('reads the current value from the engine', () => {
    const engine = new FormEngine(definition, { firstName: 'Ada' })
    const { value } = withFormEngine(engine, () => useFieldModel<string>(definition.components[0]!))
    expect(value.value).toBe('Ada')
  })

  it('writes back to the engine through the model', () => {
    const engine = new FormEngine(definition)
    const { value } = withFormEngine(engine, () => useFieldModel<string>(definition.components[0]!))
    value.value = 'Grace'
    expect(engine.getValue('firstName')).toBe('Grace')
  })

  it('falls back to an empty path when the field has none', () => {
    const engine = new FormEngine(definition)
    const { path } = withFormEngine(engine, () => useFieldModel({ type: 'section' }))
    expect(path.value).toBe('')
  })

  it('exposes non-meta field properties via attrs, for v-bind passthrough', () => {
    const engine = new FormEngine(definition)
    const field = {
      type: 'text',
      path: 'firstName',
      label: 'First name',
      maxLength: 10,
      icon: 'user',
    }
    const { attrs } = withFormEngine(engine, () => useFieldModel(field))
    expect(attrs.value).toEqual({ label: 'First name', maxLength: 10, icon: 'user' })
  })

  it('strips our own schema-structural keys from attrs', () => {
    const engine = new FormEngine(definition)
    const field = {
      type: 'section',
      path: 'address',
      hide: false,
      components: [{ type: 'text' }],
      description: 'A description',
    }
    const { attrs } = withFormEngine(engine, () => useFieldModel(field))
    expect(attrs.value).toEqual({ description: 'A description' })
  })
})
