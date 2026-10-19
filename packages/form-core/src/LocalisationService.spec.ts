import { describe, expect, it, vi } from 'vitest'

import { LocalisationService } from './LocalisationService'
import type { FormLocalisations } from '@octarine/form-abstractions'

const localisations: FormLocalisations = {
  default: 'nl',
  nl: {
    Button: {
      Label: 'Bewaar',
      Description: 'Klik op {{Button.Label}} om te bewaren',
    },
  },
  fr: {
    Button: {
      Label: 'Enregistrer',
    },
  },
}

describe('LocalisationService', () => {
  it('resolves a nested key against the default locale', () => {
    const service = new LocalisationService(localisations)
    expect(service.resolve('Button.Label')).toBe('Bewaar')
  })

  it('resolves against an explicit locale override', () => {
    const service = new LocalisationService(localisations, 'fr')
    expect(service.resolve('Button.Label')).toBe('Enregistrer')
  })

  it('resolves a self-referential mustache against the same table', () => {
    const service = new LocalisationService(localisations)
    expect(service.resolve('Button.Description')).toBe('Klik op Bewaar om te bewaren')
  })

  it('leaves an unresolvable mustache reference as literal text', () => {
    const service = new LocalisationService({
      default: 'nl',
      nl: { Greeting: 'Hello {{Missing.Key}}' },
    })
    expect(service.resolve('Greeting')).toBe('Hello {{Missing.Key}}')
  })

  it("falls back to the app's messages, then its translate, when the key isn't in the table", () => {
    const service = new LocalisationService(localisations, 'nl', {
      messages: { nl: { 'app.title': 'Titel' } },
      translate: (key, _params, locale) => (key === 'NotInTable' ? `${locale}:${key}` : undefined),
    })
    expect(service.resolve('app.title')).toBe('Titel')
    expect(service.resolve('NotInTable')).toBe('nl:NotInTable')
  })

  it('walks the language chain: region, language, the form default', () => {
    expect(new LocalisationService(localisations, 'fr-BE').resolve('Button.Label')).toBe(
      'Enregistrer',
    )
    // French has no description; the form's default language has.
    expect(new LocalisationService(localisations, 'fr').resolve('Button.Description')).toBe(
      'Klik op Bewaar om te bewaren',
    )
  })

  it('fills in parameters and plural forms in form texts and literal text', () => {
    const service = new LocalisationService(
      {
        default: 'nl',
        nl: {
          tooLong: 'Maximaal {max} cijfers.',
          left: { one: 'Nog {count} plaats', other: 'Nog {count} plaatsen' },
        },
      },
      'nl',
    )
    expect(service.resolve('tooLong', { max: 4 })).toBe('Maximaal 4 cijfers.')
    expect(service.resolve('left', { count: 1 })).toBe('Nog 1 plaats')
    expect(service.resolve('left', { count: 3 })).toBe('Nog 3 plaatsen')
    expect(service.resolve('At most {max}.', { max: 1000 })).toBe('At most 1.000.')
  })

  it("puts a validator's key into words without asking the form's tables", () => {
    const service = new LocalisationService(
      { default: 'nl', nl: { validation: { required: 'Not this one' } } },
      'nl',
      { messages: { nl: { 'validation.required': 'Gelieve dit veld in te vullen.' } } },
    )
    expect(service.message('validation.required')).toBe('Gelieve dit veld in te vullen.')
    expect(service.resolve('validation.required')).toBe('Not this one')
  })

  it('ends with English, and shows an unknown key as it is', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const service = new LocalisationService({}, 'es')
    expect(service.message('validation.maxLength', { max: 1 })).toBe(
      'Please enter no more than 1 character.',
    )
    expect(service.message('app.unknownKey')).toBe('app.unknownKey')
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('falls back to the raw key when there is no matching locale table at all', () => {
    const service = new LocalisationService()
    expect(service.resolve('SomeLabel')).toBe('SomeLabel')
  })

  it('does not infinitely recurse on a circular mustache reference', () => {
    const service = new LocalisationService({
      default: 'nl',
      nl: { A: '{{B}}', B: '{{A}}' },
    })
    expect(() => service.resolve('A')).not.toThrow()
  })
})
