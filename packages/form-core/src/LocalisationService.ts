import type {
  FormLocalisations,
  LocalisationTable,
  TranslationProvider,
} from '@octarine/form-abstractions'
import {
  builtInCatalogs,
  catalogFor,
  formatMessage,
  isPluralMessage,
  languageChain,
  translate,
  type Catalogs,
  type MessageParams,
  type MessageSource,
} from '@octarine/i18n'

import { getProperty } from './pathAccessors'
import { warnOnce } from './warn'

// Matches {{Key}} / {{Nested.Key}} — deliberately not the `|format` pipe
// syntax the legacy `_forms` system supports; that's model-value
// interpolation and formatting, both out of scope for now.
const MUSTACHE_PATTERN = /\{\{\s*([_a-zA-Z][.\w]*)\s*\}\}/g
const MAX_MUSTACHE_DEPTH = 5

export interface LocalisationOptions {
  // The app's catalogs, by language: languages besides English
  // (`@octarine/i18n/locales/nl.json`), changed words, and the keys of its
  // own validators.
  messages?: Catalogs
  // The app's own translator, asked after `messages`.
  translate?: TranslationProvider['t']
}

// Puts a form's keys into words in its current language. Every lookup walks
// the language chain (`nl-BE` → `nl` → the form's default → English) in each
// source: the form's `localisations`, the app's `messages`, the app's
// `translate`, then Octarine's own English.
export class LocalisationService {
  private localisations: FormLocalisations
  private defaultLanguage: string | undefined
  private _locale: string
  private appSources: MessageSource[]

  constructor(
    localisations: FormLocalisations = {},
    locale?: string,
    options: LocalisationOptions = {},
  ) {
    this.localisations = localisations
    this.defaultLanguage =
      typeof localisations.default === 'string' ? localisations.default : undefined
    this._locale = this.pickLocale(locale)
    const { messages, translate: appTranslate } = options
    this.appSources = [
      ...(messages ? [messages] : []),
      ...(appTranslate ? [appTranslate] : []),
      builtInCatalogs,
    ] satisfies MessageSource[]
  }

  get locale(): string {
    return this._locale
  }

  // `undefined` goes back to the form's default locale.
  setLocale(locale: string | undefined): void {
    this._locale = this.pickLocale(locale)
  }

  private pickLocale(locale: string | undefined): string {
    return locale ?? this.defaultLanguage ?? ''
  }

  // A form's text: a label, a hint, a rule's own message. Looked up in the
  // form's tables first (a dotted path, e.g. "Button.Label", walking into
  // nested objects the way model paths do; {{other.key}} refers to another
  // text of the same table), then the app's. A key nobody knows is shown as
  // it is, with its parameters filled in: an author may write literal text.
  resolve(key: string, params?: MessageParams): string {
    for (const language of languageChain(this._locale, this.defaultLanguage)) {
      const table = this.tableFor(language)
      if (!table) continue
      const found = getProperty(table, key)
      if (typeof found === 'string') {
        return formatMessage(this.resolveMustaches(found, table, 0), params, language)
      }
      if (isPluralMessage(found)) {
        return this.resolveMustaches(formatMessage(found, params, language), table, 0)
      }
    }
    return this.fromApp(key, params) ?? formatMessage(key, params, this._locale)
  }

  // A validator's message key. The form's tables are not asked: a form
  // changes a message by giving its rule a `message`, so one form never
  // rewords every error by accident. A key nobody knows is shown as it is,
  // with a warning.
  message(key: string, params?: MessageParams): string {
    const text = this.fromApp(key, params)
    if (text !== undefined) return text
    warnOnce(`[form-core] No text for the message key "${key}" in any language.`)
    return key
  }

  private fromApp(key: string, params: MessageParams | undefined): string | undefined {
    return translate(this.appSources, key, params, this._locale, {
      defaultLanguage: this.defaultLanguage,
    })
  }

  private tableFor(language: string): LocalisationTable | undefined {
    const { default: _default, ...tables } = this.localisations
    const table = catalogFor(tables as Catalogs, language)
    return table && typeof table === 'object' ? (table as LocalisationTable) : undefined
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
