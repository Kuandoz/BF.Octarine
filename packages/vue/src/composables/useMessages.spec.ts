import nl from '@octarine/i18n/locales/nl.json'
import { describe, expect, it, vi } from 'vitest'

import { translateMessage } from './useMessages'

describe('translateMessage', () => {
  it('uses the imported language, for a regional tag too', () => {
    expect(translateMessage('field.optional', undefined, 'nl-BE', { nl })).toBe('(optioneel)')
  })

  it('prefers the exact tag, then the language, then English', () => {
    const catalogs = {
      nl: { ...nl, 'input.clear': 'Leegmaken', 'field.optional': '(niet verplicht)' },
      'nl-BE': { 'input.clear': 'Leegmaken (BE)' },
    }
    expect(translateMessage('input.clear', undefined, 'nl-BE', catalogs)).toBe('Leegmaken (BE)')
    expect(translateMessage('field.optional', undefined, 'nl-BE', catalogs)).toBe(
      '(niet verplicht)',
    )
    expect(translateMessage('error.label', undefined, 'nl-BE', catalogs)).toBe('Fout:')
    expect(translateMessage('error.label', undefined, 'en', catalogs)).toBe('Error:')
  })

  it('falls back to English and warns once for a language that was not imported', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(translateMessage('field.optional', undefined, 'ja')).toBe('(optional)')
    translateMessage('field.optional', undefined, 'ja-JP')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('@octarine/i18n/locales/ja.json')
    warn.mockRestore()
  })

  it('pluralizes counters', () => {
    expect(translateMessage('counter.charactersLeft', { count: 1 }, 'en')).toBe('1 character left')
    expect(translateMessage('counter.charactersOver', { count: 3 }, 'nl', { nl })).toBe(
      '3 tekens te veel',
    )
  })
})
