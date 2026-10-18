// Turns a message key and its parameters into text, in the current language.
export interface TranslationProvider {
  t(key: string, params?: Record<string, unknown>): string
}

// A list's items are arbitrary objects — this package has no opinion on
// their shape. Mapping them to whatever a control needs (e.g. {label,
// value} for a select) is the field component's job, not the provider's.
export interface ListProvider {
  getList(name: string): Promise<unknown[]> | unknown[]
}
