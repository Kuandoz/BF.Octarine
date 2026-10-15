import { describe, expect, it } from 'vitest'

import type { ValidationRule } from './types'
import { ValidationService } from './ValidationService'

describe('ValidationService', () => {
  it('is valid when there are no rules', () => {
    const service = new ValidationService()
    expect(service.validate(undefined, 'anything', 'someField')).toEqual({ valid: true })
  })

  it('fails the built-in required rule for an empty value', () => {
    const service = new ValidationService()
    const rules: ValidationRule[] = [{ type: 'required' }]
    expect(service.validate(rules, '', 'someField')).toEqual({
      valid: false,
      message: 'This field is required.',
    })
    expect(service.validate(rules, 'x', 'someField')).toEqual({ valid: true })
  })

  it('uses a per-instance validator override', () => {
    const service = new ValidationService({
      even: ({ value }) => ((value as number) % 2 === 0 ? { valid: true } : { valid: false }),
    })
    const rules: ValidationRule[] = [{ type: 'even' }]
    expect(service.validate(rules, 3, 'someField').valid).toBe(false)
    expect(service.validate(rules, 4, 'someField').valid).toBe(true)
  })

  it('resolves messages through the given translation provider', () => {
    const service = new ValidationService(undefined, {
      t: (key) => (key === 'formRenderer.validation.required' ? 'Verplicht veld.' : key),
    })
    const rules: ValidationRule[] = [{ type: 'required' }]
    expect(service.validate(rules, '', 'someField').message).toBe('Verplicht veld.')
  })

  it("lets a rule's own message override the validator's default", () => {
    const service = new ValidationService()
    const rules: ValidationRule[] = [{ type: 'required', message: 'Fill this in.' }]
    expect(service.validate(rules, '', 'someField').message).toBe('Fill this in.')
  })
})
