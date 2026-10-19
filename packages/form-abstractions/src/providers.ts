// The app's own translator, e.g. a bridge to vue-i18n: a message key and its
// parameters in words, in `locale`. Returns undefined for a key it doesn't
// know, so Octarine's catalogs are asked next.
export interface TranslationProvider {
  t(key: string, params: Record<string, unknown> | undefined, locale: string): string | undefined
}

// A list's items are arbitrary objects — this package has no opinion on
// their shape. Mapping them to whatever a control needs (e.g. {label,
// value} for a select) is the field component's job, not the provider's.
export interface ListProvider {
  getList(name: string): Promise<unknown[]> | unknown[]
}
