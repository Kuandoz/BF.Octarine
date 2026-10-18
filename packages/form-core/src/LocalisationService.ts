import type {
  FormLocalisations,
  LocalisationTable,
  TranslationProvider,
} from '@octarine/form-abstractions'

import { defaultTranslationProvider } from './messages'
import { getProperty } from './pathAccessors'

// Matches {{Key}} / {{Nested.Key}} — deliberately not the `|format` pipe
// syntax the legacy `_forms` system supports; that's model-value
// interpolation and formatting, both out of scope for now.
const MUSTACHE_PATTERN = /\{\{\s*([_a-zA-Z][.\w]*)\s*\}\}/g
const MAX_MUSTACHE_DEPTH = 5

export class LocalisationService {
  private localisations: FormLocalisations
  private _locale: string
  private translationProvider: TranslationProvider

  constructor(
    localisations: FormLocalisations = {},
    locale?: string,
    translationProvider: TranslationProvider = defaultTranslationProvider,
  ) {
    this.localisations = localisations
    this._locale = this.pickLocale(locale)
    this.translationProvider = translationProvider
  }

  get locale(): string {
    return this._locale
  }

  // `undefined` goes back to the form's default locale.
  setLocale(locale: string | undefined): void {
    this._locale = this.pickLocale(locale)
  }

  private pickLocale(locale: string | undefined): string {
    const defaultLocale =
      typeof this.localisations.default === 'string' ? this.localisations.default : undefined
    return locale ?? defaultLocale ?? ''
  }

  // Resolves `key` against the current locale's table (a dotted path, e.g.
  // "Button.Label", walking into nested objects the same way form-model
  // paths do), then resolves any {{other.key}} cross-references within the
  // resolved string against that same table. Falls back to the translation
  // provider, then to `key` itself, if nothing matches — so an unresolved
  // key is never worse than showing the literal text an author wrote.
  resolve(key: string): string {
    const table = this.localisations[this._locale]
    if (table && typeof table === 'object') {
      const resolved = getProperty(table, key)
      if (typeof resolved === 'string') {
        return this.resolveMustaches(resolved, table, 0)
      }
    }
    return this.translationProvider.t(key)
  }

  private resolveMustaches(value: string, table: LocalisationTable, depth: number): string {
    if (depth >= MAX_MUSTACHE_DEPTH) return value
    return value.replace(MUSTACHE_PATTERN, (match, refKey: string) => {
      const referenced = getProperty(table, refKey)
      return typeof referenced === 'string'
        ? this.resolveMustaches(referenced, table, depth + 1)
        : match
    })
  }
}
