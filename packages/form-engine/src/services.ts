import { inject, type InjectionKey, provide } from 'vue'

import {
  defaultListProvider,
  defaultTranslationProvider,
  jsLanguage,
  withExpressionLanguages,
} from '@octarine/form-core'

import type { ExpressionLanguage, ListProvider, TranslationProvider } from './types'

export interface PopupService {
  confirm(message: string): Promise<boolean>
  alert(message: string): Promise<void>
}

export const TRANSLATION_PROVIDER_KEY: InjectionKey<TranslationProvider> = Symbol(
  'octarine-form:translation-provider',
)
export const POPUP_SERVICE_KEY: InjectionKey<PopupService> = Symbol('octarine-form:popup-service')
export const LIST_PROVIDER_KEY: InjectionKey<ListProvider> = Symbol('octarine-form:list-provider')
export const EXPRESSION_LANGUAGES_KEY: InjectionKey<readonly ExpressionLanguage[]> = Symbol(
  'octarine-form:expression-languages',
)

export const defaultPopupService: PopupService = {
  confirm: async () => true,
  alert: async () => {},
}

// The languages a form can name in `definition.expressions`. 'js' is always
// one of them.
export const defaultExpressionLanguages: readonly ExpressionLanguage[] = [jsLanguage]

export interface FormRendererServiceOverrides {
  translationProvider?: TranslationProvider
  popupService?: PopupService
  listProvider?: ListProvider
  // Added to the built-in 'js' language; one with the same name replaces it.
  expressionLanguages?: readonly ExpressionLanguage[]
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
