import en from '../locales/en.json' with { type: 'json' }

import { formatMessage } from './format'
import type { Catalog, Catalogs, Message, MessageParams, MessageSource } from './types'

/** The language every lookup ends with. */
export const fallbackLanguage = 'en'

/** English, always included. Other languages are imported by the app. */
export const builtInCatalogs: Catalogs = { en: en as Catalog }

/**
 * The languages to try for `locale`, most specific first: `nl-BE` → `nl` →
 * `defaultLanguage` (a form's default) → English. Lower case, no repeats.
 */
export function languageChain(locale: string, defaultLanguage?: string): string[] {
  const chain: string[] = []
  const add = (tag: string | undefined) => {
    if (!tag) return
    const lower = tag.toLowerCase()
    const parts = lower.split('-')
    for (let length = parts.length; length > 0; length--) {
      const candidate = parts.slice(0, length).join('-')
      if (!chain.includes(candidate)) chain.push(candidate)
    }
  }
  add(locale)
  add(defaultLanguage)
  add(fallbackLanguage)
  return chain
}

/** The catalog for a language tag, whatever its case. */
export function catalogFor(catalogs: Catalogs, tag: string): Catalog | undefined {
  if (catalogs[tag]) return catalogs[tag]
  const key = Object.keys(catalogs).find((candidate) => candidate.toLowerCase() === tag)
  return key === undefined ? undefined : catalogs[key]
}

/** The first message for `key` along `chain`, with the language it is in. */
export function findMessage(
  catalogs: Catalogs,
  key: string,
  chain: readonly string[],
): { message: Message; language: string } | undefined {
  for (const language of chain) {
    const message = catalogFor(catalogs, language)?.[key]
    if (message !== undefined) return { message, language }
  }
  return undefined
}

/** Catalogs combined per language; a later one wins for a key both have. */
export function mergeCatalogs(...sources: ReadonlyArray<Catalogs | undefined>): Catalogs {
  const merged: Record<string, Record<string, Message>> = {}
  for (const catalogs of sources) {
    for (const [tag, catalog] of Object.entries(catalogs ?? {})) {
      const lower = tag.toLowerCase()
      merged[lower] = { ...merged[lower], ...catalog }
    }
  }
  return merged
}

export interface TranslateOptions {
  /** Tried after the requested language, before English (a form's default). */
  defaultLanguage?: string
}

/**
 * Text for `key` from the first source that has it: each catalog source is
 * tried along the language chain, each function with the requested locale.
 * Returns `undefined` when no source knows the key.
 */
export function translate(
  sources: readonly MessageSource[],
  key: string,
  params: MessageParams | undefined,
  locale: string,
  options: TranslateOptions = {},
): string | undefined {
  const chain = languageChain(locale, options.defaultLanguage)
  for (const source of sources) {
    if (typeof source === 'function') {
      const text = source(key, params, locale)
      if (text !== undefined) return text
      continue
    }
    const found = findMessage(source, key, chain)
    if (found) return formatMessage(found.message, params, found.language)
  }
  return undefined
}
