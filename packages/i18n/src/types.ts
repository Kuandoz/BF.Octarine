export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'

/**
 * A message whose words depend on a number: the form is picked with
 * `Intl.PluralRules` for the language. `plural` names the parameter that
 * decides; without it, the first parameter that is a number does.
 *
 *   { "one": "{count} character left", "other": "{count} characters left" }
 */
export type PluralMessage = { plural?: string; other: string } & {
  [category in Exclude<PluralCategory, 'other'>]?: string
}

/** The text of one key: plain, or a choice of plural forms. */
export type Message = string | PluralMessage

/** Every text of one language, by flat key (`validation.required`). */
export type Catalog = Readonly<Record<string, Message>>

/** Catalogs by language tag (`en`, `nl`, `nl-BE`). */
export type Catalogs = Readonly<Record<string, Catalog>>

export type MessageParams = Readonly<Record<string, unknown>>

/**
 * A translator of the app's own, e.g. one bridging to vue-i18n. It returns
 * `undefined` for a key it doesn't know, so the next source is asked.
 */
export type Translate = (
  key: string,
  params: MessageParams | undefined,
  locale: string,
) => string | undefined

/** Where a text can come from: catalogs, or a function. */
export type MessageSource = Catalogs | Translate
