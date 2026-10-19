import { describe, expect, it, vi } from 'vitest'

import de from '../locales/de.json' with { type: 'json' }
import fr from '../locales/fr.json' with { type: 'json' }
import nl from '../locales/nl.json' with { type: 'json' }
import { formatMessage, isPluralMessage } from './format'
import { builtInCatalogs, languageChain, mergeCatalogs, translate } from './translate'

const catalogs = { ...builtInCatalogs, nl, fr, de }

describe('languageChain', () => {
  it('goes from the region to the language, the default and English', () => {
    expect(languageChain('nl-BE')).toEqual(['nl-be', 'nl', 'en'])
    expect(languageChain('fr-CA', 'nl')).toEqual(['fr-ca', 'fr', 'nl', 'en'])
    expect(languageChain('en', 'en')).toEqual(['en'])
    expect(languageChain('')).toEqual(['en'])
  })
})

describe('formatMessage', () => {
  it('fills in parameters and leaves unknown ones', () => {
    expect(formatMessage('Hello {name}, {missing}', { name: 'Ada' }, 'en')).toBe(
      'Hello Ada, {missing}',
    )
  })

  it("doesn't touch a form's {{references}}", () => {
    expect(formatMessage('{{other}} and {name}', { other: 'x', name: 'y' }, 'en')).toBe(
      '{{other}} and y',
    )
  })

  it('formats numbers for the language', () => {
    expect(formatMessage('{n}', { n: 1000 }, 'nl')).toBe('1.000')
    expect(formatMessage('{n}', { n: 1000 }, 'en')).toBe('1,000')
    expect(formatMessage('{n:number}', { n: '2500' }, 'de')).toBe('2.500')
  })

  it('formats dates as the calendar day they name', () => {
    expect(formatMessage('{d:date}', { d: '2026-10-19' }, 'en')).toBe('October 19, 2026')
    expect(formatMessage('{d:date}', { d: '2026-10-19' }, 'nl')).toBe('19 oktober 2026')
    expect(formatMessage('{d:date}', { d: 'not a date' }, 'nl')).toBe('not a date')
  })

  it('picks the plural form with the language rules', () => {
    const message = { one: '{n} teken', other: '{n} tekens' }
    expect(formatMessage(message, { n: 1 }, 'nl')).toBe('1 teken')
    expect(formatMessage(message, { n: 0 }, 'nl')).toBe('0 tekens')
    // French counts 0 as singular.
    expect(formatMessage(fr['counter.charactersLeft'], { count: 0 }, 'fr')).toBe(
      '0 caractère restant',
    )
    expect(formatMessage(message, undefined, 'nl')).toBe('{n} tekens')
  })

  it('uses the parameter `plural` names', () => {
    const message = { plural: 'b', one: 'one', other: 'other' }
    expect(formatMessage(message, { a: 1, b: 5 }, 'en')).toBe('other')
  })

  it('survives a language tag Intl rejects', () => {
    expect(formatMessage('{n}', { n: 5 }, 'not a tag!')).toBe('5')
  })
})

describe('isPluralMessage', () => {
  it('tells plural messages from tables of texts', () => {
    expect(isPluralMessage({ one: 'a', other: 'b' })).toBe(true)
    expect(isPluralMessage({ plural: 'n', other: 'b' })).toBe(true)
    expect(isPluralMessage({ one: 'a' })).toBe(false)
    expect(isPluralMessage({ other: 'b', street: 'Street' })).toBe(false)
    expect(isPluralMessage('text')).toBe(false)
  })
})

describe('translate', () => {
  it('follows the language chain in each source', () => {
    expect(translate([catalogs], 'validation.required', undefined, 'nl-BE')).toBe(
      'Gelieve dit veld in te vullen.',
    )
    expect(translate([catalogs], 'validation.required', undefined, 'es')).toBe(
      'Please fill in this field.',
    )
    expect(
      translate([catalogs], 'validation.required', undefined, 'es', { defaultLanguage: 'de' }),
    ).toBe('Bitte füllen Sie dieses Feld aus.')
  })

  it('asks the sources in order, a function with the requested locale', () => {
    const app = { nl: { 'validation.required': 'Vul in.' } }
    const library = vi.fn((key: string) => (key === 'app.taken' ? 'Taken' : undefined))
    const sources = [app, library, catalogs]
    expect(translate(sources, 'validation.required', undefined, 'nl-BE')).toBe('Vul in.')
    expect(translate(sources, 'app.taken', { a: 1 }, 'nl-BE')).toBe('Taken')
    expect(library).toHaveBeenCalledWith('app.taken', { a: 1 }, 'nl-BE')
    expect(translate(sources, 'validation.email', undefined, 'nl')).toContain('e-mailadres')
    expect(translate(sources, 'nobody.knows', undefined, 'nl')).toBeUndefined()
  })

  it('formats in the language the message was found in', () => {
    expect(translate([catalogs], 'validation.dateMin', { min: '2026-10-20' }, 'de')).toBe(
      'Bitte geben Sie ein Datum ab dem 20. Oktober 2026 ein.',
    )
    expect(translate([catalogs], 'validation.maxLength', { max: 1 }, 'nl')).toBe(
      'Gelieve maximaal 1 teken in te vullen.',
    )
  })

  it('combines catalogs per language with mergeCatalogs', () => {
    const merged = mergeCatalogs({ nl: { a: 'A', b: 'B' } }, undefined, {
      NL: { b: 'B2' },
      fr: { a: 'Afr' },
    })
    expect(merged).toEqual({ nl: { a: 'A', b: 'B2' }, fr: { a: 'Afr' } })
  })

  it('matches language tags whatever their case', () => {
    expect(translate([{ 'nl-BE': { k: 'BE' } }], 'k', undefined, 'NL-be')).toBe('BE')
  })
})
