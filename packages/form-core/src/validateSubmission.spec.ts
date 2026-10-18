import type { FormDefinition } from '@octarine/form-abstractions'
import { describe, expect, it } from 'vitest'

import { createLocalSubmissionValidator, validateSubmission } from './validateSubmission'

const definition: FormDefinition = {
  components: [
    { type: 'text', path: 'name' },
    { type: 'checkbox', path: 'callMe' },
    { type: 'text', path: 'phone', hide: '!callMe' },
    { type: 'repeat', path: 'items', components: [{ type: 'text', path: 'quantity' }] },
  ],
  validations: {
    name: [{ type: 'required' }, { type: 'minLength', value: 3 }],
    phone: [{ type: 'required', condition: 'callMe === true', message: 'Phone.Required' }],
    'items.*.quantity': [{ type: 'numeric' }],
  },
}

describe('validateSubmission', () => {
  it('passes a model that meets every rule', () => {
    expect(validateSubmission(definition, { name: 'Ann', items: [{ quantity: '2' }] })).toEqual({
      valid: true,
      errors: [],
    })
  })

  it('reports each failed rule as a key with parameters, not text', () => {
    const result = validateSubmission(definition, { name: 'An' })
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual([
      {
        path: 'name',
        rule: 'minLength',
        key: 'formRenderer.validation.minLength',
        params: { min: 3 },
      },
    ])
  })

  it("passes the rule's own message on, for the edge to localise", () => {
    const { errors } = validateSubmission(definition, { name: 'Ann', callMe: true })
    expect(errors).toEqual([
      {
        path: 'phone',
        rule: 'required',
        key: 'formRenderer.validation.required',
        message: 'Phone.Required',
      },
    ])
  })

  it('expands rows against the submitted model', () => {
    const { errors } = validateSubmission(definition, {
      name: 'Ann',
      items: [{ quantity: '1' }, { quantity: 'two' }, { quantity: 'x' }],
    })
    expect(errors.map((error) => error.path)).toEqual(['items.1.quantity', 'items.2.quantity'])
  })

  it('validates hidden fields like any other', () => {
    const hidden: FormDefinition = {
      components: [{ type: 'text', path: 'code', hide: true }],
      validations: { code: [{ type: 'required' }] },
    }
    expect(validateSubmission(hidden, {}).valid).toBe(false)
  })

  it('uses the validators and env it is given', () => {
    const custom: FormDefinition = {
      components: [],
      validations: {
        code: [{ type: 'even' }],
        note: [{ type: 'required', condition: "env.language === 'nl'" }],
      },
    }
    const result = validateSubmission(
      custom,
      { code: 3 },
      {
        validators: {
          even: ({ value }) =>
            Number(value) % 2 === 0 ? { valid: true } : { valid: false, key: 'even' },
        },
        env: { language: 'nl' },
      },
    )
    expect(result.errors.map(({ path, key }) => ({ path, key }))).toEqual([
      { path: 'code', key: 'even' },
      { path: 'note', key: 'formRenderer.validation.required' },
    ])
  })

  it('works behind the SubmissionValidator interface', async () => {
    const validator = createLocalSubmissionValidator()
    await expect(validator.validate(definition, {})).resolves.toMatchObject({
      valid: false,
      errors: [{ path: 'name', rule: 'required' }],
    })
  })
})

describe('validateSubmission and missing keys', () => {
  it('reads a field the model leaves out as undefined, as the browser does', () => {
    // Without `callMe` in the model, `callMe === true` must be false, not an
    // unknown name that keeps the rule active.
    expect(validateSubmission(definition, { name: 'Ann' }).valid).toBe(true)
  })

  it("doesn't change the model it is given", () => {
    const model = { name: 'Ann' }
    validateSubmission(definition, model)
    expect(model).toEqual({ name: 'Ann' })
  })
})

describe('validateSubmission options', () => {
  it('adds functions to age() instead of replacing it', () => {
    const withFunctions: FormDefinition = {
      components: [],
      validations: {
        note: [{ type: 'required', condition: 'isLong(code) && age(born) >= 18' }],
      },
    }
    const result = validateSubmission(
      withFunctions,
      { code: 'abcdef', born: '1990-01-01' },
      { functions: { isLong: (value) => String(value).length > 5 } },
    )
    expect(result.errors.map((error) => error.path)).toEqual(['note'])
  })

  it('declares the row fields of a repeat type the form names', () => {
    // `callMe` exists only inside the rows of a custom repeat type: without
    // repeatTypes it would be an unknown name, keeping the rule active.
    const custom: FormDefinition = {
      components: [
        {
          type: 'travellers',
          path: 'people',
          components: [
            { type: 'checkbox', path: 'callMe' },
            { type: 'text', path: 'phone' },
          ],
        },
      ],
      validations: { 'people.*.phone': [{ type: 'required', condition: 'callMe === true' }] },
    }
    const model = { people: [{}] }
    expect(validateSubmission(custom, model).valid).toBe(false)
    expect(validateSubmission(custom, model, { repeatTypes: ['travellers'] }).valid).toBe(true)
  })
})
