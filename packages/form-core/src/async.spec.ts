import type { FormDefinition, ValidatorRegistry } from '@octarine/form-abstractions'
import { describe, expect, it } from 'vitest'

import { delegateToServer } from './delegate'
import { createLocalSubmissionValidator, validateSubmission } from './validateSubmission'
import { settle, ValidationService } from './ValidationService'

const later = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 1))

describe('async validators', () => {
  const validators: ValidatorRegistry = {
    taken: async ({ value }) => later({ valid: value !== 'ada', key: 'taken' }),
  }

  it('make the result pending, and say which rule is waiting', () => {
    const service = new ValidationService(validators)
    const result = service.validate([{ type: 'taken' }], 'ada', 'name')
    expect(result).toMatchObject({ valid: false, pending: true, rule: 'taken' })
  })

  it('settle into the failure, or into the rules after them', async () => {
    const service = new ValidationService(validators)
    const rules = [{ type: 'taken' }, { type: 'minLength', value: 5 }]
    await expect(settle(service.validate(rules, 'ada', 'name'))).resolves.toEqual({
      valid: false,
      rule: 'taken',
      key: 'taken',
    })
    await expect(settle(service.validate(rules, 'bob', 'name'))).resolves.toMatchObject({
      rule: 'minLength',
    })
    await expect(settle(service.validate(rules, 'grace', 'name'))).resolves.toEqual({
      valid: true,
    })
  })

  it("fail closed when the check can't run", async () => {
    const service = new ValidationService({
      offline: async () => Promise.reject(new Error('offline')),
      broken: () => {
        throw new Error('bug')
      },
    })
    await expect(settle(service.validate([{ type: 'offline' }], 'x', 'a'))).resolves.toMatchObject({
      key: 'validation.unavailable',
    })
    expect(service.validate([{ type: 'broken' }], 'x', 'a')).toMatchObject({
      key: 'validation.unavailable',
    })
  })

  it('are waited for by validateSubmission', async () => {
    const definition: FormDefinition = {
      components: [],
      validations: { name: [{ type: 'taken' }] },
    }
    await expect(validateSubmission(definition, { name: 'ada' }, { validators })).resolves.toEqual({
      valid: false,
      errors: [{ path: 'name', rule: 'taken', key: 'taken' }],
    })
  })
})

describe('delegateToServer', () => {
  // The server's own rules, with the real validator.
  const server = createLocalSubmissionValidator({
    validators: {
      uniqueEmail: ({ value }) => ({ valid: value !== 'taken@example.com', key: 'emailTaken' }),
    },
  })
  const definition: FormDefinition = {
    components: [],
    validations: {
      email: [{ type: 'uniqueEmail' }],
      backup: [{ type: 'uniqueEmail' }],
    },
  }

  it('asks the server and takes its answer for this path and rule', async () => {
    const client = { uniqueEmail: delegateToServer(server) }
    const result = await validateSubmission(
      definition,
      { email: 'taken@example.com', backup: 'free@example.com' },
      { validators: client },
    )
    expect(result.errors).toEqual([{ path: 'email', rule: 'uniqueEmail', key: 'emailTaken' }])
  })
})
