import { describe, expect, it } from 'vitest'

import { FormEngine } from './FormEngine'
import type { FormDefinition } from './types'

// A value the person can't change is still validated, but its error isn't
// shown and doesn't stop the submit: they couldn't fix it. The server checks
// it anyway.
const definition = (): FormDefinition => ({
  components: [
    { type: 'checkbox', path: 'locked' },
    { type: 'text', path: 'name' },
    { type: 'text', path: 'reference', disabled: true },
    { type: 'text', path: 'code', readonly: 'locked === true' },
    {
      type: 'fieldset',
      path: 'address',
      disabled: 'locked === true',
      components: [{ type: 'text', path: 'address.city' }],
    },
    {
      type: 'repeat',
      path: 'items',
      components: [
        { type: 'checkbox', path: 'done' },
        { type: 'text', path: 'note', readonly: 'done === true' },
      ],
    },
    { type: 'text', path: 'country' },
  ],
  validations: {
    name: [{ type: 'required' }],
    reference: [{ type: 'required' }],
    code: [{ type: 'required' }],
    'address.city': [{ type: 'required' }],
    'items.*.note': [{ type: 'required' }],
    country: [{ type: 'oneOf', values: ['BE', 'NL'] }],
  },
  constants: { country: 'FR' },
})

describe('fields the person cannot change', () => {
  it('still validates them', async () => {
    const engine = new FormEngine(definition(), { model: { locked: true } })
    engine.validateModel()
    expect(engine.getValidationResult('reference')).toMatchObject({ valid: false })
    expect(engine.getValidationResult('code')).toMatchObject({ valid: false })
    expect(engine.getValidationResult('country')).toMatchObject({ valid: false })
  })

  it('shows no error for a disabled, read-only or constant value', async () => {
    const engine = new FormEngine(definition(), { model: { locked: true, name: 'Ann' } })
    engine.submit()
    expect(engine.getError('reference')).toBeUndefined()
    expect(engine.getError('code')).toBeUndefined()
    expect(engine.getError('country')).toBeUndefined()
    expect(engine.getErrors()).toEqual([])
  })

  it('follows a container that is disabled', async () => {
    const engine = new FormEngine(definition(), { model: { locked: true } })
    engine.submit()
    expect(engine.isLocked('address.city')).toBe(true)
    expect(engine.getError('address.city')).toBeUndefined()

    engine.setValue('locked', false)
    expect(engine.isLocked('address.city')).toBe(false)
    expect(engine.getError('address.city')).toBe('Please fill in this field.')
  })

  it('evaluates a condition in its row', async () => {
    const engine = new FormEngine(definition(), {
      model: {
        items: [{ done: true }, { done: false }],
      },
    })
    engine.submit()
    expect(engine.getError('items.0.note')).toBeUndefined()
    expect(engine.getError('items.1.note')).toBe('Please fill in this field.')
  })

  it("doesn't let those errors stop the submit", async () => {
    const engine = new FormEngine(definition(), { model: { locked: true, name: 'Ann' } })
    expect(await engine.submit()).toBe(true)
  })

  it('still stops the submit for an error the person can fix', async () => {
    const engine = new FormEngine(definition(), { model: { locked: true } })
    expect(await engine.submit()).toBe(false)
    expect(engine.getErrors().map((error) => error.path)).toEqual(['name'])
  })
})
