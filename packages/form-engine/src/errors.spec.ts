import { describe, expect, it } from 'vitest'

import { FormEngine } from './FormEngine'
import type { FormDefinition } from './types'

// Errors appear once the user has left a field or tried to submit, not while
// they are still typing the first characters.
describe('when errors are shown', () => {
  const definition: FormDefinition = {
    components: [
      { type: 'text', path: 'email' },
      { type: 'text', path: 'name' },
      { type: 'checkbox', path: 'wantsCall' },
      { type: 'text', path: 'phone', hide: '!wantsCall' },
    ],
    validations: {
      email: [{ type: 'required' }, { type: 'email' }],
      name: [{ type: 'required' }],
      // Asked for only while shown: the form pairs hide with a condition.
      phone: [{ type: 'required', condition: 'wantsCall === true' }],
    },
  }

  it('validates while typing but keeps the error to itself', () => {
    const engine = new FormEngine(definition)
    engine.setValue('email', 'a')
    expect(engine.getValidationResult('email')?.valid).toBe(false)
    expect(engine.getError('email')).toBeUndefined()
  })

  it('shows the error once the field is left', () => {
    const engine = new FormEngine(definition)
    engine.setValue('email', 'a')
    engine.touch('email')
    expect(engine.isTouched('email')).toBe(true)
    expect(engine.getError('email')).toBe('Enter a valid email address.')
  })

  it('validates a field that is left without typing', () => {
    const engine = new FormEngine(definition)
    engine.touch('name')
    expect(engine.getError('name')).toBe('This field is required.')
  })

  it('updates a shown error as the value changes, and clears it once fixed', () => {
    const engine = new FormEngine(definition)
    engine.touch('email')
    expect(engine.getError('email')).toBe('This field is required.')
    engine.setValue('email', 'ada@')
    expect(engine.getError('email')).toBe('Enter a valid email address.')
    engine.setValue('email', 'ada@example.com')
    expect(engine.getError('email')).toBeUndefined()
  })

  it('shows every error after a submit attempt', () => {
    const engine = new FormEngine(definition)
    expect(engine.submit()).toBe(false)
    expect(engine.submitted).toBe(true)
    expect(engine.getError('email')).toBe('This field is required.')
    expect(engine.getError('name')).toBe('This field is required.')
  })

  it('submits when every required value is there', () => {
    const engine = new FormEngine(definition, { email: 'ada@example.com', name: 'Ada' })
    expect(engine.submit()).toBe(true)
  })

  it('has no error for a field the form only asks for while it is shown', () => {
    const engine = new FormEngine(definition)
    engine.submit()
    expect(engine.getError('phone')).toBeUndefined()

    engine.setValue('wantsCall', true)
    expect(engine.submit()).toBe(false)
    expect(engine.getError('phone')).toBe('This field is required.')
  })

  it('has text for an error whose validator gave none', () => {
    const engine = new FormEngine(
      {
        components: [{ type: 'text', path: 'code' }],
        validations: { code: [{ type: 'silent' }] },
      },
      {},
      { silent: () => ({ valid: false }) },
    )
    engine.touch('code')
    expect(engine.getError('code')).toBe("This value isn't valid.")
  })
})

describe('getErrors', () => {
  const definition: FormDefinition = {
    components: [
      { type: 'text', path: 'name' },
      {
        type: 'repeat',
        path: 'items',
        components: [{ type: 'text', path: 'title' }],
      },
      { type: 'text', path: 'email' },
    ],
    validations: {
      email: [{ type: 'required' }],
      'items.*.title': [{ type: 'required' }],
      name: [{ type: 'required' }],
      terms: [{ type: 'required' }],
    },
  }
  const model = () => ({ items: Array.from({ length: 11 }, () => ({})) })

  it('lists nothing before errors are shown', () => {
    const engine = new FormEngine(definition, model())
    engine.validateModel()
    expect(engine.getErrors()).toEqual([])
  })

  it('lists shown errors in the order the fields appear, rows in order, unrendered paths last', () => {
    const engine = new FormEngine(definition, model())
    engine.submit()
    const paths = engine.getErrors().map((error) => error.path)
    expect(paths).toEqual([
      'name',
      ...Array.from({ length: 11 }, (_, i) => `items.${i}.title`),
      'email',
      'terms',
    ])
    expect(engine.getErrors()[0]).toEqual({ path: 'name', message: 'This field is required.' })
  })

  it('lists only touched fields before a submit', () => {
    const engine = new FormEngine(definition, model())
    engine.touch('email')
    expect(engine.getErrors()).toEqual([{ path: 'email', message: 'This field is required.' }])
  })

  it('forgets the errors of a removed row', () => {
    const engine = new FormEngine(definition, { items: [{}, {}] })
    engine.submit()
    engine.removeRepeatItem('items', 1)
    expect(engine.getErrors().map((error) => error.path)).not.toContain('items.1.title')
    expect(engine.getErrors().map((error) => error.path)).toContain('items.0.title')
  })
})
