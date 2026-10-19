// Every text Octarine writes, and the formatter for it. The texts are in
// `locales/<language>.json`; English is included here, other languages are
// imported by the app (`@octarine/i18n/locales/nl.json`).
export { formatMessage, isPluralMessage, placeholders } from './format'
export {
  builtInCatalogs,
  catalogFor,
  fallbackLanguage,
  findMessage,
  languageChain,
  mergeCatalogs,
  translate,
} from './translate'
export type { TranslateOptions } from './translate'
export type {
  Catalog,
  Catalogs,
  Message,
  MessageParams,
  MessageSource,
  PluralCategory,
  PluralMessage,
  Translate,
} from './types'
