import { describe, expect, it } from 'vitest'

import { FormEngine } from './FormEngine'
import type { FormDefinition } from './types'
import type { ValidatorContext } from './types'

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

  it('validates while typing but keeps the error to itself', async () => {
    const engine = new FormEngine(definition)
    engine.setValue('email', 'a')
    expect(engine.getValidationResult('email')?.valid).toBe(false)
    expect(engine.getError('email')).toBeUndefined()
  })

  it('shows the error once the field is left', async () => {
    const engine = new FormEngine(definition)
    engine.setValue('email', 'a')
    engine.touch('email')
    expect(engine.isTouched('email')).toBe(true)
    expect(engine.getError('email')).toBe(
      'Please enter a valid email address, like name@example.com.',
    )
  })

  it('validates a field that is left without typing', async () => {
    const engine = new FormEngine(definition)
    engine.touch('name')
    expect(engine.getError('name')).toBe('Please fill in this field.')
  })

  it('updates a shown error as the value changes, and clears it once fixed', async () => {
    const engine = new FormEngine(definition)
    engine.touch('email')
    expect(engine.getError('email')).toBe('Please fill in this field.')
    engine.setValue('email', 'ada@')
    expect(engine.getError('email')).toBe(
      'Please enter a valid email address, like name@example.com.',
    )
    engine.setValue('email', 'ada@example.com')
    expect(engine.getError('email')).toBeUndefined()
  })

  it('shows every error after a submit attempt', async () => {
    const engine = new FormEngine(definition)
    expect(await engine.submit()).toBe(false)
    expect(engine.submitted).toBe(true)
    expect(engine.getError('email')).toBe('Please fill in this field.')
    expect(engine.getError('name')).toBe('Please fill in this field.')
  })

  it('submits when every required value is there', async () => {
    const engine = new FormEngine(definition, { model: { email: 'ada@example.com', name: 'Ada' } })
    expect(await engine.submit()).toBe(true)
  })

  it('has no error for a field the form only asks for while it is shown', async () => {
    const engine = new FormEngine(definition)
    engine.submit()
    expect(engine.getError('phone')).toBeUndefined()

    engine.setValue('wantsCall', true)
    expect(await engine.submit()).toBe(false)
    expect(engine.getError('phone')).toBe('Please fill in this field.')
  })

  it('has text for an error whose validator gave none', async () => {
    const engine = new FormEngine(
      {
        components: [{ type: 'text', path: 'code' }],
        validations: { code: [{ type: 'silent' }] },
      },
      { model: {}, validators: { silent: () => ({ valid: false }) } },
    )
    engine.touch('code')
    expect(engine.getError('code')).toBe("This value isn't valid. Please check it.")
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

  it('lists nothing before errors are shown', async () => {
    const engine = new FormEngine(definition, { model: model() })
    engine.validateModel()
    expect(engine.getErrors()).toEqual([])
  })

  it('lists shown errors in the order the fields appear, rows in order, unrendered paths last', async () => {
    const engine = new FormEngine(definition, { model: model() })
    engine.submit()
    const paths = engine.getErrors().map((error) => error.path)
    expect(paths).toEqual([
      'name',
      ...Array.from({ length: 11 }, (_, i) => `items.${i}.title`),
      'email',
      'terms',
    ])
    expect(engine.getErrors()[0]).toEqual({
      path: 'name',
      message: 'Please fill in this field.',
      label: '',
    })
  })

  it('lists only touched fields before a submit', async () => {
    const engine = new FormEngine(definition, { model: model() })
    engine.touch('email')
    expect(engine.getErrors()).toEqual([
      { path: 'email', message: 'Please fill in this field.', label: '' },
    ])
  })

  it('forgets the errors of a removed row', async () => {
    const engine = new FormEngine(definition, { model: { items: [{}, {}] } })
    engine.submit()
    engine.removeRepeatItem('items', 1)
    expect(engine.getErrors().map((error) => error.path)).not.toContain('items.1.title')
    expect(engine.getErrors().map((error) => error.path)).toContain('items.0.title')
  })
})

describe('what an error says about its field', () => {
  const definition: FormDefinition = {
    components: [
      { type: 'text', path: 'name', label: 'name' },
      { type: 'checkbox', path: 'wantsCall', label: 'Call me' },
      { type: 'text', path: 'phone', label: 'phone', hide: '!wantsCall' },
      {
        type: 'fieldset',
        path: 'address',
        label: 'Address',
        components: [
          { type: 'text', path: 'address.street', label: 'Street' },
          { type: 'text', path: 'address.city', label: 'City' },
        ],
      },
      {
        type: 'repeat',
        path: 'items',
        label: 'Items',
        components: [{ type: 'text', path: 'title', label: 'Title' }],
      },
    ],
    validations: {
      name: [{ type: 'required' }],
      phone: [{ type: 'pattern', value: '^\d+$' }],
      address: [
        {
          type: 'street-or-city',
          message: 'Fill in a street or a city.',
        },
      ],
      'items.*.title': [{ type: 'required' }],
    },
    localisations: { default: 'en', en: { name: 'Name', phone: 'Phone' }, nl: { name: 'Naam' } },
  }
  const validators = {
    'street-or-city': ({ value }: ValidatorContext) => {
      const address = (value ?? {}) as { street?: string; city?: string }
      return { valid: Boolean(address.street || address.city) }
    },
  }

  it('gives the localised label of the field, and of the group for a nested path', async () => {
    const engine = new FormEngine(definition, { model: { items: [{}] }, validators: validators })
    expect(engine.getLabel('name')).toBe('Name')
    expect(engine.getLabel('address')).toBe('Address')
    expect(engine.getLabel('address.zip')).toBe('Address')
    expect(engine.getLabel('items.0.title')).toBe('Title')
    expect(engine.getLabel('somewhere')).toBe('')

    engine.setLocale('nl')
    expect(engine.getLabel('name')).toBe('Naam')
  })

  it('says what a hidden field is about, without a target to jump to', async () => {
    const engine = new FormEngine(definition, { model: { phone: 'abc' }, validators: validators })
    engine.submit()
    expect(engine.isHidden('phone')).toBe(true)
    expect(engine.getErrors().find((error) => error.path === 'phone')).toEqual({
      path: 'phone',
      message: 'Please enter this in the expected format.',
      label: 'Phone',
    })
  })

  it('targets the mounted control of a path, the first one when there are more', async () => {
    const engine = new FormEngine(definition)
    const unregisterFirst = engine.registerField('name', 'first')
    engine.registerField('name', 'second')
    expect(engine.getFieldId('name')).toBe('first')
    unregisterFirst()
    expect(engine.getFieldId('name')).toBe('second')
  })

  it('targets the first control on screen inside a group without its own', async () => {
    const engine = new FormEngine(definition, { model: {}, validators: validators })
    engine.registerField('address.city', 'city')
    engine.registerField('address.street', 'street')
    engine.submit()
    expect(engine.getErrors().find((error) => error.path === 'address')).toEqual({
      path: 'address',
      message: 'Fill in a street or a city.',
      label: 'Address',
      target: 'street',
    })
  })

  it("targets a group's own control when it registered one, like a repeat's Add button", async () => {
    const engine = new FormEngine(definition, { model: { items: [{}] } })
    engine.registerField('items.0.title', 'title')
    engine.registerField('items', 'add')
    expect(engine.getFieldId('items')).toBe('add')
    expect(engine.getFieldId('items.0')).toBe('title')
  })

  it('updates the error of a group when a value inside it changes', async () => {
    const engine = new FormEngine(definition, { model: {}, validators: validators })
    engine.submit()
    expect(engine.getError('address')).toBe('Fill in a street or a city.')
    engine.setValue('address.city', 'Gent')
    expect(engine.getError('address')).toBeUndefined()
  })
})

describe('rules that depend on other fields', () => {
  const definition: FormDefinition = {
    components: [
      { type: 'checkbox', path: 'wantsCall' },
      { type: 'text', path: 'phone', hide: 'wantsCall !== true' },
      { type: 'text', path: 'start' },
      { type: 'text', path: 'end' },
    ],
    validations: {
      phone: [{ type: 'required', condition: 'wantsCall === true' }],
      end: [{ type: 'required', condition: 'start !== undefined && start !== ""' }],
    },
  }

  it('update when the value they depend on changes, after a submit', async () => {
    const engine = new FormEngine(definition)
    expect(await engine.submit()).toBe(true)
    engine.setValue('wantsCall', true)
    expect(engine.getErrors().map((error) => error.path)).toEqual(['phone'])
    engine.setValue('wantsCall', false)
    expect(engine.getErrors()).toEqual([])
  })

  it("stay quiet for a field that wasn't left yet, before a submit", async () => {
    const engine = new FormEngine(definition)
    engine.setValue('start', '2026-01-01')
    expect(engine.getValidationResult('end')?.valid).toBe(false)
    expect(engine.getError('end')).toBeUndefined()
  })
})
