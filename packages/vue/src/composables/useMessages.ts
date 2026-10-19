import {
  builtInCatalogs,
  catalogFor,
  fallbackLanguage,
  languageChain,
  translate,
  type Catalogs,
  type MessageParams,
} from '@octarine/i18n'
import type en from '@octarine/i18n/locales/en.json'
import { computed, inject, ref, type ComputedRef, type InjectionKey, type Plugin } from 'vue'

/** A key of the texts Octarine writes, e.g. `field.optional`. */
export type MessageKey = keyof typeof en

/** Octarine's text for a key, in the current language. */
export type MessageFunction = (key: MessageKey, params?: MessageParams) => string

export const messagesKey: InjectionKey<Catalogs> = Symbol('octarine-messages')

/** Provided by `OForm` when it has a `lang`. */
export const languageKey: InjectionKey<ComputedRef<string>> = Symbol('octarine-language')

/** `<html lang>`, kept in sync when an app switches languages. */
const documentLanguage = ref('')
let observing = false

function observeDocumentLanguage() {
  if (observing || typeof document === 'undefined') return
  observing = true
  const root = document.documentElement
  documentLanguage.value = root.lang
  new MutationObserver(() => (documentLanguage.value = root.lang)).observe(root, {
    attributes: true,
    attributeFilter: ['lang'],
  })
}

/**
 * The languages Octarine writes in, besides English, from `@octarine/i18n`,
 * or changes to its words. A catalog only needs the keys it changes; the rest
 * come from the next language in line (`nl-BE` → `nl` → English):
 *
 *   import nl from '@octarine/i18n/locales/nl.json'
 *   app.use(createMessages({ nl, 'nl-BE': { 'input.clear': 'Leegmaken' } }))
 */
export function createMessages(catalogs: Catalogs): Plugin {
  return {
    install(app) {
      app.provide(messagesKey, catalogs)
    },
  }
}

const warned = new Set<string>()

/** Octarine's text for `key` in `language`, from `catalogs` and then English. */
export function translateMessage(
  key: MessageKey,
  params: MessageParams | undefined,
  language: string,
  catalogs: Catalogs = {},
): string {
  warnMissingLanguage(language, catalogs)
  return translate([catalogs, builtInCatalogs], key, params, language) ?? key
}

function warnMissingLanguage(language: string, catalogs: Catalogs) {
  const base = language.toLowerCase().split('-')[0]!
  if (!base || base === fallbackLanguage || warned.has(base)) return
  const known = languageChain(language)
    .filter((tag) => tag !== fallbackLanguage)
    .some((tag) => catalogFor(catalogs, tag))
  if (known) return
  warned.add(base)
  console.warn(
    `[Octarine] no messages for language "${language}"; using English. Add them with createMessages(), e.g. from @octarine/i18n/locales/${base}.json.`,
  )
}

/** A message function for a language, reading the app's catalogs. */
export function messagesFor(
  language: () => string,
  catalogs: Catalogs,
): ComputedRef<MessageFunction> {
  return computed(() => {
    const current = language()
    return (key, params) => translateMessage(key, params, current, catalogs)
  })
}

/** The language of the enclosing `OForm` (its `lang`), else `<html lang>`. */
export function useLanguage(): ComputedRef<string> {
  observeDocumentLanguage()
  const form = inject(languageKey, null)
  return computed(() => form?.value || documentLanguage.value || fallbackLanguage)
}

/** Octarine's own text in the current language: `t.value('field.optional')`. */
export function useMessages(): ComputedRef<MessageFunction> {
  const language = useLanguage()
  return messagesFor(() => language.value, inject(messagesKey, {}))
}
