import { describe, expect, it } from 'vitest'

import { FormEngine } from './FormEngine'
import type { FormDefinition } from './types'

const definition: FormDefinition = {
  components: [
    { type: 'text', path: 'firstName', label: 'First name' },
    { type: 'text', path: 'lastName', label: 'Last name' },
    {
      type: 'section',
      label: 'Address',
      components: [{ type: 'text', path: 'address.street', label: 'Street' }],
    },
  ],
  validations: {
    firstName: [{ type: 'required' }],
    'address.street': [{ type: 'required' }],
  },
}

describe('FormEngine', () => {
  it('reads and writes values by path', () => {
    const engine = new FormEngine(definition)
    expect(engine.getValue('firstName')).toBeUndefined()

    engine.setValue('firstName', 'Ada')
    expect(engine.getValue('firstName')).toBe('Ada')
  })

  it('reads and writes nested paths', () => {
    const engine = new FormEngine(definition)
    engine.setValue('address.street', 'Main St')
    expect(engine.getValue('address.street')).toBe('Main St')
    expect(engine.model.address).toEqual({ street: 'Main St' })
  })

  it('removes values by path', () => {
    const engine = new FormEngine(definition)
    engine.setValue('firstName', 'Ada')
    engine.removeValue('firstName')
    expect(engine.getValue('firstName')).toBeUndefined()
  })

  it('seeds the model from an initial value', () => {
    const engine = new FormEngine(definition, { model: { firstName: 'Grace' } })
    expect(engine.getValue('firstName')).toBe('Grace')
  })

  it('tracks dirty paths after a write', () => {
    const engine = new FormEngine(definition)
    expect(engine.isDirty('firstName')).toBe(false)
    engine.setValue('firstName', 'Ada')
    expect(engine.isDirty('firstName')).toBe(true)
  })

  it('fails validation for an empty required field', () => {
    const engine = new FormEngine(definition)
    expect(engine.validateModel()).toBe(false)
    expect(engine.getValidationResult('firstName')?.valid).toBe(false)
    // No validation rule is declared for "lastName" at all — undefined means
    // "nothing to validate here", not "checked and passed".
    expect(engine.getValidationResult('lastName')).toBeUndefined()
  })

  it('validates nested required fields', () => {
    const engine = new FormEngine(definition)
    engine.validateModel()
    expect(engine.getValidationResult('address.street')?.valid).toBe(false)
  })

  it('passes validation once required fields are filled in', () => {
    const engine = new FormEngine(definition)
    engine.setValue('firstName', 'Ada')
    engine.setValue('address.street', 'Main St')
    expect(engine.validateModel()).toBe(true)
  })

  it('validates a path with no corresponding rendered field at all', () => {
    // Validation is a model concern — a rule doesn't need a field behind it.
    const crossField: FormDefinition = {
      components: [
        { type: 'text', path: 'startDate' },
        { type: 'text', path: 'endDate' },
      ],
      validations: {
        endDate: [{ type: 'required' }],
      },
    }
    const engine = new FormEngine(crossField, { model: { startDate: '2024-01-01' } })
    expect(engine.validateModel()).toBe(false)
    expect(engine.getValidationResult('endDate')?.valid).toBe(false)
  })

  it("lets a per-rule message override the validator's default", () => {
    const withMessage: FormDefinition = {
      components: [{ type: 'text', path: 'nickname' }],
      validations: {
        nickname: [{ type: 'required', message: 'Give yourself a nickname.' }],
      },
    }
    const engine = new FormEngine(withMessage)
    engine.submit()
    expect(engine.getError('nickname')).toBe('Give yourself a nickname.')
  })

  it('supports registering a custom validator per-instance', () => {
    const withCustomRule: FormDefinition = {
      components: [{ type: 'text', path: 'code' }],
      validations: { code: [{ type: 'evenLength' }] },
    }
    const engine = new FormEngine(withCustomRule, {
      validators: {
        evenLength: ({ value, isEmpty }) => {
          if (isEmpty) return { valid: true }
          const length = typeof value === 'string' ? value.length : 0
          return length % 2 === 0 ? { valid: true } : { valid: false, key: 'evenLength' }
        },
      },
    })

    engine.setValue('code', 'abc')
    expect(engine.getValidationResult('code')?.valid).toBe(false)

    engine.setValue('code', 'abcd')
    expect(engine.getValidationResult('code')?.valid).toBe(true)
  })

  it('stops at the first failing rule when a path has multiple rules', () => {
    const withMultipleRules: FormDefinition = {
      components: [{ type: 'text', path: 'code' }],
      validations: { code: [{ type: 'required' }, { type: 'evenLength' }] },
    }
    const engine = new FormEngine(withMultipleRules, {
      validators: {
        evenLength: () => ({ valid: false, key: 'evenLength' }),
      },
    })

    engine.validateModel()
    expect(engine.getValidationResult('code')).toMatchObject({ rule: 'required' })
  })

  it('skips an unregistered rule type instead of throwing', () => {
    const withUnknownRule: FormDefinition = {
      components: [{ type: 'text', path: 'code' }],
      validations: { code: [{ type: 'doesNotExist' }] },
    }
    const engine = new FormEngine(withUnknownRule)
    expect(() => engine.validateModel()).not.toThrow()
    expect(engine.getValidationResult('code')?.valid).toBe(true)
  })

  it("puts the built-in required message into Octarine's English by default", () => {
    const engine = new FormEngine(definition)
    engine.submit()
    expect(engine.getError('firstName')).toBe('Please fill in this field.')
  })

  it("localizes validator messages with the app's translate", () => {
    const engine = new FormEngine(definition, {
      translate: (key) => (key === 'validation.required' ? 'Dit veld is verplicht.' : undefined),
    })
    engine.submit()
    expect(engine.getError('firstName')).toBe('Dit veld is verplicht.')
  })

  it('keeps results as keys and only puts them into words for getError', () => {
    const withLength: FormDefinition = {
      components: [{ type: 'text', path: 'code' }],
      validations: { code: [{ type: 'minLength', value: 3 }] },
    }
    const engine = new FormEngine(withLength, {
      model: { code: 'ab' },
      translate: (key, params) => `${key}:${JSON.stringify(params)}`,
    })
    engine.submit()
    expect(engine.getValidationResult('code')).toEqual({
      valid: false,
      rule: 'minLength',
      key: 'validation.minLength',
      params: { min: 3 },
    })
    expect(engine.getError('code')).toBe('validation.minLength:{"min":3}')
  })

  it("localises a rule's own message through the form's localisations", () => {
    const localised: FormDefinition = {
      components: [{ type: 'text', path: 'nickname' }],
      validations: { nickname: [{ type: 'required', message: 'Nickname.Required' }] },
      localisations: {
        default: 'en',
        en: { Nickname: { Required: 'Give yourself a nickname.' } },
        nl: { Nickname: { Required: 'Kies een bijnaam.' } },
      },
    }
    const engine = new FormEngine(localised, { locale: 'nl' })
    engine.submit()
    expect(engine.getError('nickname')).toBe('Kies een bijnaam.')
    engine.setLocale('en')
    expect(engine.getError('nickname')).toBe('Give yourself a nickname.')
  })

  it('reports whether a path is required', () => {
    const engine = new FormEngine(definition)
    expect(engine.isRequired('firstName')).toBe(true)
    expect(engine.isRequired('lastName')).toBe(false)
  })

  it("localises a field label using the form's own localisations", () => {
    const withLocalisations: FormDefinition = {
      components: [{ type: 'text', path: 'firstName', label: 'Person.FirstName' }],
      localisations: {
        default: 'nl',
        nl: { Person: { FirstName: 'Voornaam' } },
      },
    }
    const engine = new FormEngine(withLocalisations)
    expect(engine.localise('Person.FirstName')).toBe('Voornaam')
  })

  it("respects an explicit locale override over the form's default", () => {
    const withLocalisations: FormDefinition = {
      components: [],
      localisations: {
        default: 'nl',
        nl: { Greeting: 'Hallo' },
        fr: { Greeting: 'Bonjour' },
      },
    }
    const engine = new FormEngine(withLocalisations, { locale: 'fr' })
    expect(engine.localise('Greeting')).toBe('Bonjour')
  })

  it('shows the raw key as-is when a form has no localisations at all', () => {
    const engine = new FormEngine(definition)
    expect(engine.localise('SomeUnknownLabel')).toBe('SomeUnknownLabel')
  })

  it('resolves a switch/case label object to the first branch whose condition is true', () => {
    const withLocalisations: FormDefinition = {
      components: [],
      localisations: {
        default: 'nl',
        nl: { Concerned: { InszChild: 'Kind', Insz: 'Persoon' } },
      },
    }
    const engine = new FormEngine(withLocalisations, { model: { relationType: 'MijnKind' } })
    const label = {
      'Concerned.InszChild': "relationType === 'MijnKind'",
      'Concerned.Insz': "relationType !== 'MijnKind'",
    }
    expect(engine.localise(label)).toBe('Kind')

    engine.setValue('relationType', 'Other')
    expect(engine.localise(label)).toBe('Persoon')
  })

  it('falls back to a trailing literal-true branch, matching the legacy else-branch convention', () => {
    const withLocalisations: FormDefinition = {
      components: [],
      localisations: { default: 'nl', nl: { Buttons: { Resend: 'Opnieuw versturen' } } },
    }
    const engine = new FormEngine(withLocalisations, { model: { isReminder: false } })
    const label = { 'Buttons.Send': 'isReminder', 'Buttons.Resend': true }
    expect(engine.localise(label)).toBe('Opnieuw versturen')
  })

  it('resolves to an empty string when no branch of a label object matches', () => {
    const engine = new FormEngine(definition, { model: { relationType: 'Neither' } })
    const label = {
      'Concerned.InszChild': "relationType === 'MijnKind'",
      'Concerned.Insz': "relationType === 'SomethingElse'",
    }
    expect(engine.localise(label)).toBe('')
  })

  it('resolves a form-local list by name', async () => {
    const withLists: FormDefinition = {
      components: [],
      lists: { countries: [{ code: 'BE' }, { code: 'NL' }] },
    }
    const engine = new FormEngine(withLists)
    expect(await engine.getList('countries')).toEqual([{ code: 'BE' }, { code: 'NL' }])
  })

  it("falls back to an injected list provider for names not in the form's own lists", async () => {
    const engine = new FormEngine(definition, {
      lists: {
        getList: (name) => [{ name, fromProvider: true }],
      },
    })
    expect(await engine.getList('remoteList')).toEqual([{ name: 'remoteList', fromProvider: true }])
  })

  it('seeds an empty model from defaults', () => {
    const withDefaults: FormDefinition = {
      components: [],
      defaults: { firstName: 'Ada', address: { city: 'Ghent' } },
    }
    const engine = new FormEngine(withDefaults)
    expect(engine.model).toEqual({ firstName: 'Ada', address: { city: 'Ghent' } })
  })

  it('does not apply defaults when an initial model was given', () => {
    const withDefaults: FormDefinition = {
      components: [],
      defaults: { firstName: 'Ada' },
    }
    const engine = new FormEngine(withDefaults, { model: { lastName: 'Lovelace' } })
    expect(engine.model).toEqual({ lastName: 'Lovelace' })
  })

  it('seeds the model from constants regardless of whether an initial model was given', () => {
    const withConstants: FormDefinition = {
      components: [],
      constants: { requestType: 'renewal' },
    }
    const withoutModel = new FormEngine(withConstants)
    const withModel = new FormEngine(withConstants, { model: { firstName: 'Ada' } })

    expect(withoutModel.getValue('requestType')).toBe('renewal')
    expect(withModel.getValue('requestType')).toBe('renewal')
    expect(withModel.getValue('firstName')).toBe('Ada')
  })

  it('lets a real initial model value override both defaults and constants', () => {
    const withBoth: FormDefinition = {
      components: [],
      defaults: { firstName: 'Ada' },
      constants: { requestType: 'renewal' },
    }
    const engine = new FormEngine(withBoth, { model: { firstName: 'Grace', requestType: 'new' } })
    expect(engine.getValue('firstName')).toBe('Grace')
    expect(engine.getValue('requestType')).toBe('new')
  })

  it('does not mutate definition.defaults/constants when the model is later changed', () => {
    const withBoth: FormDefinition = {
      components: [],
      defaults: { address: { city: 'Ghent' } },
      constants: { requestType: 'renewal' },
    }
    const engine = new FormEngine(withBoth)
    engine.setValue('address.city', 'Antwerp')
    engine.setValue('requestType', 'changed')

    expect(withBoth.defaults?.address).toEqual({ city: 'Ghent' })
    expect(withBoth.constants?.requestType).toBe('renewal')
  })

  it('reports whether a path is backed by a constant', () => {
    const withConstants: FormDefinition = {
      components: [],
      constants: { requestType: 'renewal' },
    }
    const engine = new FormEngine(withConstants)
    expect(engine.isConstant('requestType')).toBe(true)
    expect(engine.isConstant('firstName')).toBe(false)
  })

  it('restores the default value when a field with a default is removed', () => {
    const withDefaults: FormDefinition = {
      components: [],
      defaults: { firstName: 'Ada' },
    }
    const engine = new FormEngine(withDefaults)
    engine.setValue('firstName', 'Grace')
    engine.removeValue('firstName')
    expect(engine.getValue('firstName')).toBe('Ada')
  })

  it('removes a field with no configured default entirely', () => {
    const engine = new FormEngine(definition)
    engine.setValue('firstName', 'Ada')
    engine.removeValue('firstName')
    expect(engine.getValue('firstName')).toBeUndefined()
  })

  it('resolves a boolean condition directly', () => {
    const engine = new FormEngine(definition)
    expect(engine.resolveCondition(true)).toBe(true)
    expect(engine.resolveCondition(false)).toBe(false)
  })

  it('resolves a string expression condition against the model', () => {
    const engine = new FormEngine(definition)
    engine.setValue('firstName', 'Ada')
    expect(engine.resolveCondition("firstName === 'Ada'")).toBe(true)
    expect(engine.resolveCondition("firstName === 'Grace'")).toBe(false)
  })

  it("lets a condition reference another declared field before it's ever been set", () => {
    const withUnsetReference: FormDefinition = {
      components: [
        { type: 'checkbox', path: 'subscribe', label: 'Subscribe' },
        { type: 'text', path: 'email', label: 'Email', hide: 'subscribe !== true' },
      ],
    }
    const engine = new FormEngine(withUnsetReference)
    // `subscribe` has never been set, but it's a declared field — this
    // should evaluate normally (true, since undefined !== true), not throw
    // and fall back to the "not hidden" default.
    expect(engine.resolveCondition({ expression: 'subscribe !== true' })).toBe(true)

    engine.setValue('subscribe', true)
    expect(engine.resolveCondition('subscribe !== true')).toBe(false)
  })

  it('defaults to false for hide/disabled/readonly conditions when undefined', () => {
    const engine = new FormEngine(definition)
    expect(engine.resolveCondition(undefined)).toBe(false)
  })

  it('passes the current locale to expressions via env.language', () => {
    const withLocale = new FormEngine(definition, { locale: 'fr' })
    expect(withLocale.resolveCondition("env.language === 'fr'")).toBe(true)
    expect(withLocale.resolveCondition("env.language === 'nl'")).toBe(false)
  })

  it('gates a validation rule on its own condition', () => {
    const withConditionalRule: FormDefinition = {
      components: [{ type: 'text', path: 'otherMunicipality' }],
      validations: {
        otherMunicipality: [
          { type: 'required', condition: "redactionPlace === 'OtherMunicipality'" },
        ],
      },
    }
    const engine = new FormEngine(withConditionalRule)

    engine.setValue('redactionPlace', 'SameMunicipality')
    expect(engine.validatePath('otherMunicipality').valid).toBe(true)

    engine.setValue('redactionPlace', 'OtherMunicipality')
    expect(engine.validatePath('otherMunicipality').valid).toBe(false)
  })

  it('keeps a validation rule active if its condition expression throws', () => {
    const withBrokenCondition: FormDefinition = {
      components: [{ type: 'text', path: 'code' }],
      validations: { code: [{ type: 'required', condition: 'this is not valid syntax' }] },
    }
    const engine = new FormEngine(withBrokenCondition)
    expect(engine.validatePath('code').valid).toBe(false)
  })

  describe('repeat fields', () => {
    const withRepeat: FormDefinition = {
      components: [
        {
          type: 'repeat',
          path: 'items',
          components: [
            { type: 'text', path: 'type' },
            { type: 'text', path: 'label' },
            { type: 'text', path: 'quantity', hide: "type !== 'x'" },
          ],
        },
      ],
      validations: {
        'items.*.quantity': [{ type: 'required', condition: "type === 'x'" }],
      },
    }

    it("reads and writes a repeated row's fields by their fully-resolved path", () => {
      const engine = new FormEngine(withRepeat, { model: { items: [{ label: 'Widget' }] } })
      expect(engine.getValue('items.0.label')).toBe('Widget')

      engine.setValue('items.0.quantity', 5)
      expect(engine.getValue('items.0.quantity')).toBe(5)
    })

    it('resolves an unqualified condition inside a row against that row, not the whole model', () => {
      const engine = new FormEngine(withRepeat, {
        model: {
          items: [{ type: 'x' }, { type: 'y' }],
          type: 'unrelated-root-field',
        },
      })
      // Row 0's own `type` is "x" -> quantity shown; row 1's is "y" -> hidden.
      // A root-scoped bug (legacy's confirmed inconsistency) would instead
      // see the unrelated root-level `type` field for both rows.
      expect(
        engine.resolveCondition("type !== 'x'", false, { arrayPath: 'items', arrayIndex: 0 }),
      ).toBe(false)
      expect(
        engine.resolveCondition("type !== 'x'", false, { arrayPath: 'items', arrayIndex: 1 }),
      ).toBe(true)
    })

    it('reaches the whole model from inside a row via the root: true escape hatch', () => {
      const engine = new FormEngine(withRepeat, { model: { items: [{}], formType: 'special' } })
      const rootCondition = { expression: "formType === 'special'", root: true }
      expect(
        engine.resolveCondition(rootCondition, false, { arrayPath: 'items', arrayIndex: 0 }),
      ).toBe(true)
    })

    it("declares each existing row's fields at construction, so an unqualified reference to an unset sibling doesn't throw", () => {
      const engine = new FormEngine(withRepeat, { model: { items: [{ label: 'Widget' }] } })
      // `type` was never set on this row, but it's declared -> "undefined !== 'x'" is true, not a thrown ReferenceError falling back to false.
      expect(
        engine.resolveCondition("type !== 'x'", false, { arrayPath: 'items', arrayIndex: 0 }),
      ).toBe(true)
    })

    it("validates every row via validateModel, keyed by each row's resolved path", () => {
      const engine = new FormEngine(withRepeat, {
        model: {
          items: [{ type: 'x', quantity: undefined }, { type: 'y' }],
        },
      })
      const valid = engine.validateModel()
      expect(valid).toBe(false)
      expect(engine.getValidationResult('items.0.quantity')?.valid).toBe(false) // required, type is 'x'
      expect(engine.getValidationResult('items.1.quantity')?.valid).toBe(true) // condition not met for type 'y'
    })

    it("gates a row's own validation rule against that row's fields via validatePath", () => {
      const engine = new FormEngine(withRepeat, { model: { items: [{ type: 'x' }] } })
      expect(engine.validatePath('items.0.quantity').valid).toBe(false)

      engine.setValue('items.0.quantity', 3)
      expect(engine.validatePath('items.0.quantity').valid).toBe(true)
    })

    it('reports isRequired for a resolved path inside a repeat, via the wildcard entry', () => {
      const engine = new FormEngine(withRepeat, { model: { items: [{ type: 'x' }] } })
      expect(engine.isRequired('items.0.quantity')).toBe(true)
      expect(engine.isRequired('items.0.label')).toBe(false)
    })

    it('supports repeats nested inside repeats, resolving the innermost row', () => {
      const nested: FormDefinition = {
        components: [
          {
            type: 'repeat',
            path: 'parents',
            components: [
              {
                type: 'repeat',
                path: 'children',
                components: [{ type: 'text', path: 'name', hide: 'isMinor !== true' }],
              },
            ],
          },
        ],
      }
      const engine = new FormEngine(nested, {
        model: {
          parents: [{ children: [{ isMinor: true }, { isMinor: false }] }],
        },
      })
      expect(engine.getValue('parents.0.children.0.name')).toBeUndefined()
      engine.setValue('parents.0.children.0.name', 'Kid')
      expect(engine.getValue('parents.0.children.0.name')).toBe('Kid')

      expect(
        engine.resolveCondition('isMinor !== true', false, {
          arrayPath: 'parents.0.children',
          arrayIndex: 0,
        }),
      ).toBe(false)
      expect(
        engine.resolveCondition('isMinor !== true', false, {
          arrayPath: 'parents.0.children',
          arrayIndex: 1,
        }),
      ).toBe(true)
    })

    it("validates a nested repeat's rows via a double-wildcard validations key", () => {
      const nested: FormDefinition = {
        components: [
          {
            type: 'repeat',
            path: 'parents',
            components: [
              {
                type: 'repeat',
                path: 'children',
                components: [{ type: 'text', path: 'name' }],
              },
            ],
          },
        ],
        validations: {
          'parents.*.children.*.name': [{ type: 'required' }],
        },
      }
      const engine = new FormEngine(nested, {
        model: {
          parents: [{ children: [{}, { name: 'Kid' }] }, { children: [{}] }],
        },
      })
      const valid = engine.validateModel()
      expect(valid).toBe(false)
      expect(engine.getValidationResult('parents.0.children.0.name')?.valid).toBe(false)
      expect(engine.getValidationResult('parents.0.children.1.name')?.valid).toBe(true)
      expect(engine.getValidationResult('parents.1.children.0.name')?.valid).toBe(false)
    })

    it('appends a row via addRepeatItem and re-validates the whole model', () => {
      const engine = new FormEngine(withRepeat, { model: { items: [] } })
      engine.addRepeatItem('items', { type: 'x' })
      expect(engine.getValue('items')).toEqual([{ type: 'x' }])
      expect(engine.getValidationResult('items.0.quantity')?.valid).toBe(false)
    })

    it("removes a row via removeRepeatItem, shifting later rows' indices", () => {
      const engine = new FormEngine(withRepeat, {
        model: {
          items: [
            { type: 'x', quantity: 1 },
            { type: 'x', quantity: 2 },
          ],
        },
      })
      engine.removeRepeatItem('items', 0)
      expect(engine.getValue('items')).toEqual([{ type: 'x', quantity: 2 }])
      expect(engine.getValidationResult('items.0.quantity')?.valid).toBe(true)
    })
  })
})
