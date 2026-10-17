import { inject, type InjectionKey, provide } from 'vue'

import type { ExpressionLanguage } from './expressions'
import { sandboxjsLanguage } from './sandboxjsLanguage'

export interface TranslationProvider {
  t(key: string, params?: Record<string, unknown>): string
}

export interface PopupService {
  confirm(message: string): Promise<boolean>
  alert(message: string): Promise<void>
}

// A list's items are arbitrary objects — this package has no opinion on
// their shape. Mapping them to whatever a control needs (e.g. {label,
// value} for a select) is the field component's job, not the provider's.
export interface ListProvider {
  getList(name: string): Promise<unknown[]> | unknown[]
}

export const TRANSLATION_PROVIDER_KEY: InjectionKey<TranslationProvider> = Symbol(
  'octarine-form:translation-provider',
)
export const POPUP_SERVICE_KEY: InjectionKey<PopupService> = Symbol('octarine-form:popup-service')
export const LIST_PROVIDER_KEY: InjectionKey<ListProvider> = Symbol('octarine-form:list-provider')
export const EXPRESSION_LANGUAGES_KEY: InjectionKey<readonly ExpressionLanguage[]> = Symbol(
  'octarine-form:expression-languages',
)

// Fallback English text for this package's own keys, used when no real i18n
// integration has been wired up via `provideFormRendererServices`/the
// `FormEngine` constructor. A host app replaces this by providing its own
// `TranslationProvider` (e.g. bridging to vue-i18n) — see the README.
const DEFAULT_MESSAGES: Record<string, string> = {
  'formRenderer.validation.invalid': "This value isn't valid.",
  'formRenderer.validation.required': 'This field is required.',
  'formRenderer.validation.minLength': 'Must be at least {min} characters.',
  'formRenderer.validation.maxLength': 'Must be at most {max} characters.',
  'formRenderer.validation.pattern': "This value doesn't match the expected format.",
  'formRenderer.validation.email': 'Enter a valid email address.',
  'formRenderer.validation.phone': 'Enter a valid phone number.',
  'formRenderer.validation.numeric': 'Digits only.',
  'formRenderer.validation.decimal': 'Enter a valid number.',
  'formRenderer.validation.bool': 'This value must be true or false.',
  'formRenderer.validation.insz': 'Enter a valid national register number.',
  'formRenderer.validation.iban': 'Enter a valid IBAN.',
  'formRenderer.validation.oneOf': "This value isn't one of the allowed options.",
  'formRenderer.validation.flags': "One or more values aren't allowed.",
  'formRenderer.validation.compare': "This value doesn't satisfy the required comparison.",
  'formRenderer.validation.date': 'Enter a valid date within the allowed range.',
  'formRenderer.validation.datetime': 'Enter a valid date/time within the allowed range.',
}

function interpolate(message: string, params?: Record<string, unknown>): string {
  if (!params) return message
  return Object.entries(params).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    message,
  )
}

export const defaultTranslationProvider: TranslationProvider = {
  t: (key, params) => interpolate(DEFAULT_MESSAGES[key] ?? key, params),
}

export const defaultPopupService: PopupService = {
  confirm: async () => true,
  alert: async () => {},
}

// No-op default: form-local `lists` still work with no provider at all;
// only *named, provider-backed* lists need a host app to supply one.
export const defaultListProvider: ListProvider = {
  getList: () => [],
}

// The languages a form can name in `definition.expressions`. 'js' is always
// one of them.
export const defaultExpressionLanguages: readonly ExpressionLanguage[] = [sandboxjsLanguage]

export interface FormRendererServiceOverrides {
  translationProvider?: TranslationProvider
  popupService?: PopupService
  listProvider?: ListProvider
  // Added to the built-in 'js' language; one with the same name replaces it.
  expressionLanguages?: readonly ExpressionLanguage[]
}

// The built-in languages plus `extra`, where an extra one with the same name
// wins.
export function withExpressionLanguages(
  extra: readonly ExpressionLanguage[] = [],
): readonly ExpressionLanguage[] {
  const names = new Set(extra.map((language) => language.name))
  return [...extra, ...defaultExpressionLanguages.filter((language) => !names.has(language.name))]
}

export function provideFormRendererServices(overrides: FormRendererServiceOverrides = {}): void {
  provide(TRANSLATION_PROVIDER_KEY, overrides.translationProvider ?? defaultTranslationProvider)
  provide(POPUP_SERVICE_KEY, overrides.popupService ?? defaultPopupService)
  provide(LIST_PROVIDER_KEY, overrides.listProvider ?? defaultListProvider)
  provide(EXPRESSION_LANGUAGES_KEY, withExpressionLanguages(overrides.expressionLanguages))
}

export function useTranslation(): TranslationProvider {
  return inject(TRANSLATION_PROVIDER_KEY, defaultTranslationProvider)
}

export function usePopupService(): PopupService {
  return inject(POPUP_SERVICE_KEY, defaultPopupService)
}

export function useListProvider(): ListProvider {
  return inject(LIST_PROVIDER_KEY, defaultListProvider)
}

export function useExpressionLanguages(): readonly ExpressionLanguage[] {
  return inject(EXPRESSION_LANGUAGES_KEY, defaultExpressionLanguages)
}
