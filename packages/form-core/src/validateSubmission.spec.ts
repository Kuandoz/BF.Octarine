import type { FormDefinition } from '@octarine/form-abstractions'
import { describe, expect, it } from 'vitest'

import {
  createLocalSubmissionValidator,
  translateErrors,
  validateSubmission,
} from './validateSubmission'

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
  it('passes a model that meets every rule', async () => {
    expect(
      await validateSubmission(definition, { name: 'Ann', items: [{ quantity: '2' }] }),
    ).toEqual({
      valid: true,
      errors: [],
    })
  })

  it('reports each failed rule as a key with parameters, not text', async () => {
    const result = await validateSubmission(definition, { name: 'An' })
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual([
      {
        path: 'name',
        rule: 'minLength',
        key: 'validation.minLength',
        params: { min: 3 },
      },
    ])
  })

  it("passes the rule's own message on, for the edge to localise", async () => {
    const { errors } = await validateSubmission(definition, { name: 'Ann', callMe: true })
    expect(errors).toEqual([
      {
        path: 'phone',
        rule: 'required',
        key: 'validation.required',
        message: 'Phone.Required',
      },
    ])
  })

  it('expands rows against the submitted model', async () => {
    const { errors } = await validateSubmission(definition, {
      name: 'Ann',
      items: [{ quantity: '1' }, { quantity: 'two' }, { quantity: 'x' }],
    })
    expect(errors.map((error) => error.path)).toEqual(['items.1.quantity', 'items.2.quantity'])
  })

  it('validates hidden fields like any other', async () => {
    const hidden: FormDefinition = {
      components: [{ type: 'text', path: 'code', hide: true }],
      validations: { code: [{ type: 'required' }] },
    }
    expect((await validateSubmission(hidden, {})).valid).toBe(false)
  })

  it('uses the validators and env it is given', async () => {
    const custom: FormDefinition = {
      components: [],
      validations: {
        code: [{ type: 'even' }],
        note: [{ type: 'required', condition: "env.language === 'nl'" }],
      },
    }
    const result = await validateSubmission(
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
      { path: 'note', key: 'validation.required' },
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
  it('reads a field the model leaves out as undefined, as the browser does', async () => {
    // Without `callMe` in the model, `callMe === true` must be false, not an
    // unknown name that keeps the rule active.
    expect((await validateSubmission(definition, { name: 'Ann' })).valid).toBe(true)
  })

  it("doesn't change the model it is given", async () => {
    const model = { name: 'Ann' }
    await validateSubmission(definition, model)
    expect(model).toEqual({ name: 'Ann' })
  })
})

describe('validateSubmission options', () => {
  it('adds functions to age() instead of replacing it', async () => {
    const withFunctions: FormDefinition = {
      components: [],
      validations: {
        note: [{ type: 'required', condition: 'isLong(code) && age(born) >= 18' }],
      },
    }
    const result = await validateSubmission(
      withFunctions,
      { code: 'abcdef', born: '1990-01-01' },
      { functions: { isLong: (value) => String(value).length > 5 } },
    )
    expect(result.errors.map((error) => error.path)).toEqual(['note'])
  })

  it('declares the row fields of a repeat type the form names', async () => {
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
    expect((await validateSubmission(custom, model)).valid).toBe(false)
    expect((await validateSubmission(custom, model, { repeatTypes: ['travellers'] })).valid).toBe(
      true,
    )
  })

  it('chooses a message by condition against the submitted row', async () => {
    const guests: FormDefinition = {
      components: [
        {
          type: 'repeat',
          path: 'guests',
          components: [
            { type: 'number', path: 'years' },
            { type: 'text', path: 'name' },
          ],
        },
      ],
      validations: {
        'guests.*.name': [
          { type: 'required', message: { childName: 'years < 12', guestName: true } },
        ],
      },
    }
    const result = await validateSubmission(guests, { guests: [{ years: 8 }, { years: 40 }] })
    expect(result.errors.map((error) => error.message)).toEqual(['childName', 'guestName'])
  })
})

describe('translateErrors', () => {
  const form: FormDefinition = {
    components: [
      { type: 'text', path: 'name' },
      { type: 'text', path: 'postcode' },
    ],
    validations: {
      name: [{ type: 'required' }],
      postcode: [{ type: 'maxLength', value: 4, message: 'postcodeTooLong' }],
    },
    localisations: {
      default: 'nl',
      nl: { postcodeTooLong: 'Maximaal {max} cijfers.' },
    },
  }
  const nl = { nl: { 'validation.required': 'Gelieve dit veld in te vullen.' } }

  it("puts the errors into words, a rule's own message from the form", async () => {
    const { errors } = await validateSubmission(form, { postcode: '12345' })
    expect(translateErrors(errors, form, 'nl-BE', { messages: nl })).toEqual([
      expect.objectContaining({ path: 'name', text: 'Gelieve dit veld in te vullen.' }),
      expect.objectContaining({ path: 'postcode', text: 'Maximaal 4 cijfers.' }),
    ])
  })

  it("ends with Octarine's English", async () => {
    const { errors } = await validateSubmission(form, {})
    expect(translateErrors(errors, form, 'es')[0]!.text).toBe('Please fill in this field.')
  })
})
