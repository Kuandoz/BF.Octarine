import { inject, type InjectionKey, provide } from 'vue'

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

// Fallback English text for this package's own keys, used when no real i18n
// integration has been wired up via `provideFormRendererServices`/the
// `FormEngine` constructor. A host app replaces this by providing its own
// `TranslationProvider` (e.g. bridging to vue-i18n) — see the README.
const DEFAULT_MESSAGES: Record<string, string> = {
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

export interface FormRendererServiceOverrides {
  translationProvider?: TranslationProvider
  popupService?: PopupService
  listProvider?: ListProvider
}

export function provideFormRendererServices(overrides: FormRendererServiceOverrides = {}): void {
  provide(TRANSLATION_PROVIDER_KEY, overrides.translationProvider ?? defaultTranslationProvider)
  provide(POPUP_SERVICE_KEY, overrides.popupService ?? defaultPopupService)
  provide(LIST_PROVIDER_KEY, overrides.listProvider ?? defaultListProvider)
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
