import type { Message, MessageParams, PluralCategory, PluralMessage } from './types'

const PLURAL_CATEGORIES: readonly string[] = ['zero', 'one', 'two', 'few', 'many', 'other']

// `{name}` or `{name:type}`, but not the `{{key}}` a form uses to refer to
// another of its texts.
const PLACEHOLDER = /(?<!\{)\{(\w+)(?::(\w+))?\}(?!\})/g

// `2026-10-19`: a calendar day, read in local time so it isn't shifted a day
// by the time zone.
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/

/** Whether `value` is a plural message rather than a table of texts. */
export function isPluralMessage(value: unknown): value is PluralMessage {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const entries = Object.entries(value)
  return (
    typeof (value as { other?: unknown }).other === 'string' &&
    entries.every(([key, text]) =>
      key === 'plural'
        ? typeof text === 'string'
        : PLURAL_CATEGORIES.includes(key) && typeof text === 'string',
    )
  )
}

/** The placeholders a message uses, for checking translations. */
export function placeholders(message: Message): string[] {
  const texts = typeof message === 'string' ? [message] : pluralTexts(message)
  const names = new Set<string>()
  for (const text of texts) for (const match of text.matchAll(PLACEHOLDER)) names.add(match[0])
  return [...names].sort()
}

function pluralTexts(message: PluralMessage): string[] {
  return Object.entries(message)
    .filter(([key]) => key !== 'plural')
    .map(([, text]) => text as string)
}

/**
 * Fills in a message in `language`: picks the plural form, then replaces
 * each `{name}` with its parameter. Numbers are formatted for the language;
 * `{name:date}` and `{name:datetime}` format a date (a `Date`, or a string
 * like `2026-10-19`), `{name:number}` a number given as text. A parameter
 * that is missing leaves its placeholder as it is.
 */
export function formatMessage(
  message: Message,
  params: MessageParams | undefined,
  language: string,
): string {
  const locale = intlLocale(language)
  const text = typeof message === 'string' ? message : pickPlural(message, params, locale)
  if (!params) return text
  return text.replace(PLACEHOLDER, (placeholder, name: string, type: string | undefined) =>
    name in params ? formatValue(params[name], type, locale) : placeholder,
  )
}

function pickPlural(
  message: PluralMessage,
  params: MessageParams | undefined,
  locale: string | undefined,
): string {
  const name =
    message.plural ?? Object.keys(params ?? {}).find((key) => typeof params![key] === 'number')
  const count = name === undefined ? NaN : Number(params?.[name])
  if (Number.isNaN(count)) return message.other
  const category = new Intl.PluralRules(locale).select(count) as PluralCategory
  return message[category] ?? message.other
}

function formatValue(value: unknown, type: string | undefined, locale: string | undefined): string {
  if (type === 'date' || type === 'datetime') {
    const date = toDate(value)
    if (!date) return String(value)
    return new Intl.DateTimeFormat(
      locale,
      type === 'date' ? { dateStyle: 'long' } : { dateStyle: 'long', timeStyle: 'short' },
    ).format(date)
  }
  if (
    typeof value === 'number' ||
    (type === 'number' && value !== '' && !Number.isNaN(Number(value)))
  ) {
    return new Intl.NumberFormat(locale).format(Number(value))
  }
  return String(value)
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const day = typeof value === 'string' ? DAY.exec(value) : null
  const date = day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

// A tag Intl accepts, or undefined for its own default.
function intlLocale(language: string): string | undefined {
  try {
    return Intl.getCanonicalLocales(language)[0]
  } catch {
    return undefined
  }
}
