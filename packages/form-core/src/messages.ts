import type { ListProvider, TranslationProvider } from '@octarine/form-abstractions'

// The key of a failed rule whose validator named none.
export const INVALID_KEY = 'formRenderer.validation.invalid'

// Fallback English text for the built-in validators' keys, used when the app
// provides no TranslationProvider of its own (e.g. one bridging to
// vue-i18n).
const DEFAULT_MESSAGES: Record<string, string> = {
  [INVALID_KEY]: "This value isn't valid.",
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

// Replaces `{name}` with `params.name`.
export function interpolate(message: string, params?: Record<string, unknown>): string {
  if (!params) return message
  return Object.entries(params).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    message,
  )
}

export const defaultTranslationProvider: TranslationProvider = {
  t: (key, params) => interpolate(DEFAULT_MESSAGES[key] ?? key, params),
}

// No-op default: form-local `lists` still work with no provider at all;
// only *named, provider-backed* lists need a host app to supply one.
export const defaultListProvider: ListProvider = {
  getList: () => [],
}
