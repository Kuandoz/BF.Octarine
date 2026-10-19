import nl from '@octarine/i18n/locales/nl.json'
import { computed } from 'vue'

import { describe, expect, it } from 'vitest'

import { FormEngine } from './FormEngine'
import { createForms } from './forms'
import type { FormDefinition } from './types'

const definition: FormDefinition = {
  components: [
    { type: 'text', path: 'name', label: 'name' },
    { type: 'text', path: 'postcode', label: 'postcode' },
    {
      type: 'repeat',
      path: 'guests',
      components: [
        { type: 'number', path: 'years' },
        { type: 'text', path: 'guestName' },
      ],
    },
  ],
  validations: {
    name: [{ type: 'required' }],
    postcode: [{ type: 'maxLength', value: 4, message: 'postcodeTooLong' }],
    'guests.*.guestName': [
      { type: 'required', message: { childName: 'years < 12', adultName: true } },
    ],
  },
  localisations: {
    default: 'en',
    en: {
      name: 'Name',
      postcode: 'Postcode',
      postcodeTooLong: { one: 'At most {max} digit.', other: 'At most {max} digits.' },
      childName: "Please enter the child's name.",
      adultName: "Please enter the guest's name.",
    },
    nl: {
      name: 'Naam',
      postcodeTooLong: 'Maximaal {max} cijfers.',
      childName: 'Gelieve de naam van het kind in te vullen.',
      adultName: 'Gelieve de naam van de gast in te vullen.',
    },
  },
}

const model = { postcode: '12345', guests: [{ years: 8 }, { years: 40 }] }

describe('localisation', () => {
  it('puts errors into the current language and follows setLocale', () => {
    const engine = new FormEngine(definition, { model, messages: { nl } })
    engine.submit()
    const error = computed(() => engine.getError('name'))
    expect(error.value).toBe('Please fill in this field.')
    engine.setLocale('nl-BE')
    expect(error.value).toBe('Gelieve dit veld in te vullen.')
    expect(engine.localise('name')).toBe('Naam')
    // Not in the Dutch table: the form's default language.
    expect(engine.localise('postcode')).toBe('Postcode')
  })

  it("fills a rule's own message with the rule's parameters", () => {
    const engine = new FormEngine(definition, { model })
    engine.submit()
    expect(engine.getError('postcode')).toBe('At most 4 digits.')
    engine.setLocale('nl')
    expect(engine.getError('postcode')).toBe('Maximaal 4 cijfers.')
  })

  it("chooses a rule's message by condition, in the error's row", () => {
    const engine = new FormEngine(definition, { model, locale: 'nl' })
    engine.submit()
    expect(engine.getError('guests.0.guestName')).toBe('Gelieve de naam van het kind in te vullen.')
    expect(engine.getError('guests.1.guestName')).toBe('Gelieve de naam van de gast in te vullen.')
    engine.setValue('guests.1.years', 10)
    expect(engine.getError('guests.1.guestName')).toBe('Gelieve de naam van het kind in te vullen.')
  })

  it("never lets the form's table reword a validator's message", () => {
    const rewording: FormDefinition = {
      ...definition,
      localisations: { default: 'en', en: { validation: { required: 'Not used' } } },
    }
    const engine = new FormEngine(rewording, { model })
    engine.submit()
    expect(engine.getError('name')).toBe('Please fill in this field.')
  })

  it('combines the app and per-form messages per language', () => {
    const forms = createForms({ messages: { nl } })
    const engine = forms.createEngine(definition, {
      model,
      locale: 'nl',
      messages: { nl: { 'validation.required': 'Vul in.' } },
    })
    engine.submit()
    expect(engine.getError('name')).toBe('Vul in.')
    engine.setValue('postcode', 'abcdefgh')
    // The app's Dutch is still there for every other key.
    expect(engine.getError('postcode')).toBe('Maximaal 4 cijfers.')
  })
})
