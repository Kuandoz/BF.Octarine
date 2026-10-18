import { describe, expect, it } from 'vitest'

import type { ValidationRule } from '@octarine/form-abstractions'
import { ValidationService } from './ValidationService'

describe('ValidationService', () => {
  it('is valid when there are no rules', () => {
    const service = new ValidationService()
    expect(service.validate(undefined, 'anything', 'someField')).toEqual({ valid: true })
  })

  it('names the failed rule and its message key', () => {
    const service = new ValidationService()
    const rules: ValidationRule[] = [{ type: 'required' }]
    expect(service.validate(rules, '', 'someField')).toEqual({
      valid: false,
      rule: 'required',
      key: 'formRenderer.validation.required',
    })
    expect(service.validate(rules, 'x', 'someField')).toEqual({ valid: true })
  })

  it('passes the parameters of the message on', () => {
    const service = new ValidationService()
    const rules: ValidationRule[] = [{ type: 'minLength', value: 3 }]
    expect(service.validate(rules, 'ab', 'someField')).toEqual({
      valid: false,
      rule: 'minLength',
      key: 'formRenderer.validation.minLength',
      params: { min: 3 },
    })
  })

  it('uses a per-instance validator override', () => {
    const service = new ValidationService({
      even: ({ value }) =>
        (value as number) % 2 === 0 ? { valid: true } : { valid: false, key: 'even' },
    })
    const rules: ValidationRule[] = [{ type: 'even' }]
    expect(service.validate(rules, 3, 'someField')).toEqual({
      valid: false,
      rule: 'even',
      key: 'even',
    })
    expect(service.validate(rules, 4, 'someField').valid).toBe(true)
  })

  it('falls back to the generic key for a validator that names none', () => {
    const service = new ValidationService({
      broken: () => ({ valid: false }),
    })
    expect(service.validate([{ type: 'broken' }], 1, 'someField')).toMatchObject({
      key: 'formRenderer.validation.invalid',
    })
  })

  it("keeps a rule's own message next to the key", () => {
    const service = new ValidationService()
    const rules: ValidationRule[] = [{ type: 'required', message: 'Fill this in.' }]
    expect(service.validate(rules, '', 'someField')).toMatchObject({
      key: 'formRenderer.validation.required',
      message: 'Fill this in.',
    })
  })
})
