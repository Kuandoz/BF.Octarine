import { computed, inject, ref, type ComputedRef, type InjectionKey, type Plugin } from 'vue'
import { builtInMessages, fallbackLanguage, type Messages } from '../i18n/messages'

/** Extra languages, or changes to built-in ones, by language tag (`es`, `nl-BE`). */
export type MessageOverrides = Readonly<Record<string, Partial<Messages>>>

export const messagesKey: InjectionKey<MessageOverrides> = Symbol('octarine-messages')

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
 * Adds languages or changes Octarine's own text. Missing keys fall back to the
 * built-in language, then to English:
 *
 *   app.use(createMessages({ es: { optional: '(opcional)', … }, nl: { clear: 'Leegmaken' } }))
 */
export function createMessages(overrides: MessageOverrides): Plugin {
  return {
    install(app) {
      app.provide(messagesKey, overrides)
    },
  }
}

const warned = new Set<string>()

function lookup<T>(record: Readonly<Record<string, T>>, tag: string): T | undefined {
  const key = Object.keys(record).find((k) => k.toLowerCase() === tag)
  return key === undefined ? undefined : record[key]
}

/** Messages for a language tag: `nl-BE` uses `nl-BE`, then `nl`, then English. */
export function resolveMessages(language: string, overrides: MessageOverrides = {}): Messages {
  const tag = language.toLowerCase()
  const base = tag.split('-')[0]!
  const builtIn = builtInMessages[base]
  const custom = { ...lookup(overrides, base), ...lookup(overrides, tag) }
  if (!builtIn && !Object.keys(custom).length && !warned.has(base)) {
    warned.add(base)
    console.warn(
      `[Octarine] no messages for language "${language}"; using English. Add them with createMessages().`,
    )
  }
  return { ...builtInMessages[fallbackLanguage]!, ...builtIn, ...custom }
}

/** The language of the enclosing `OForm` (its `lang`), else `<html lang>`. */
export function useLanguage(): ComputedRef<string> {
  observeDocumentLanguage()
  const form = inject(languageKey, null)
  return computed(() => form?.value || documentLanguage.value || fallbackLanguage)
}

/** Octarine's own text in the current language. */
export function useMessages(): ComputedRef<Messages> {
  const language = useLanguage()
  const overrides = inject(messagesKey, {})
  return computed(() => resolveMessages(language.value, overrides))
}
