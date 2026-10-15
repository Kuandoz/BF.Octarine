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
      phone: [{ type: 'required' }],
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

  it('submits when everything visible is valid', () => {
    const engine = new FormEngine(definition, { email: 'ada@example.com', name: 'Ada' })
    expect(engine.submit()).toBe(true)
  })

  it('never shows the error of a hidden field', () => {
    const engine = new FormEngine(definition)
    engine.submit()
    expect(engine.getError('phone')).toBeUndefined()
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
