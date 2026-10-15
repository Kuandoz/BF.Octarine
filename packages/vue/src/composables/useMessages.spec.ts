import { describe, expect, it, vi } from 'vitest'
import { builtInMessages } from '../i18n/messages'
import { resolveMessages } from './useMessages'

describe('resolveMessages', () => {
  it('ships English, Dutch, French and German with the same keys', () => {
    const keys = Object.keys(builtInMessages.en!).sort()
    expect(Object.keys(builtInMessages).sort()).toEqual(['de', 'en', 'fr', 'nl'])
    for (const messages of Object.values(builtInMessages)) {
      expect(Object.keys(messages).sort()).toEqual(keys)
    }
  })

  it('matches a regional tag to its language', () => {
    expect(resolveMessages('nl-BE').optional).toBe('(optioneel)')
    expect(resolveMessages('FR-ca').optional).toBe('(facultatif)')
  })

  it('prefers overrides for the exact tag, then the language', () => {
    const messages = resolveMessages('nl-BE', {
      nl: { clear: 'Leegmaken', optional: '(niet verplicht)' },
      'nl-be': { clear: 'Leegmaken (BE)' },
    })
    expect(messages.clear).toBe('Leegmaken (BE)')
    expect(messages.optional).toBe('(niet verplicht)')
    expect(messages.error).toBe('Fout:')
  })

  it('falls back to English and warns once for an unknown language', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveMessages('ja').optional).toBe('(optional)')
    resolveMessages('ja-JP')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('pluralizes counters', () => {
    expect(builtInMessages.en!.charactersLeft(1)).toBe('1 character left')
    expect(builtInMessages.nl!.charactersOver(3)).toBe('3 tekens te veel')
    expect(builtInMessages.fr!.charactersLeft(2)).toBe('2 caractères restants')
    expect(builtInMessages.de!.charactersLeft(4)).toBe('Noch 4 Zeichen')
  })
})
