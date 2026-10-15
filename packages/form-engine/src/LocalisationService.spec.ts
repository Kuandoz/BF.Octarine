import { describe, expect, it } from 'vitest'

import { LocalisationService } from './LocalisationService'
import type { FormLocalisations } from './types'

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

  it("falls back to the translation provider when the key isn't in the table", () => {
    const service = new LocalisationService(localisations, 'nl', {
      t: (key) => `translated:${key}`,
    })
    expect(service.resolve('NotInTable')).toBe('translated:NotInTable')
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
