import { getProperty } from './pathAccessors'
import type { TranslationProvider } from './services'
import type { ValidationResult, ValidationRule } from './types'

export interface ValidatorContext {
  value: unknown
  rule: ValidationRule
  // The resolved model path being validated (e.g. "items.2.quantity") — not
  // a FieldDefinition. Validation is a model concern; nothing here should
  // need to know about whatever component (if any) rendered this path.
  path: string
  translate: TranslationProvider['t']
  /** Whether `value` counts as empty (see `isEmpty`). Most rules should pass when this is true — that's what `required` is for. */
  isEmpty: boolean
  // What an unqualified path in a cross-field rule (e.g. `compare`'s
  // `rule.path`) resolves against — the current row's own fields inside a
  // `repeat`, otherwise the whole model. Defaults to `{}` for validators
  // constructed without one (most tests, most single-field validators).
  scope: Record<string, unknown>
}

export type Validator = (context: ValidatorContext) => ValidationResult

export type ValidatorRegistry = Record<string, Validator>

export function isEmpty(value: unknown): boolean {
  // 1. Null or undefined are always considered empty
  if (value === undefined || value === null) return true
  // 2. Check if an array has no items
  if (Array.isArray(value)) return value.length === 0
  // 3. Booleans and numbers cannot be empty (even false or 0)
  if (typeof value === 'boolean' || typeof value === 'number') return false
  // 4. A date is considered empty if it is invalid (Invalid Date)
  if (value instanceof Date) return Number.isNaN(value.getTime())
  // 5. Check for empty strings, removing whitespace
  if (typeof value === 'string') return value.trim() === ''
  // 6. Support for Map and Set collections
  if (value instanceof Map || value instanceof Set) return value.size === 0
  // 7. Check if a plain object has no keys (e.g., {})
  if (typeof value === 'object') {
    return Object.keys(value as object).length === 0
  }

  // Fallback for unknown types (like Functions or Symbols)
  return false
}

// Derives `isEmpty` from `value` via a getter rather than a plain field, so it
// can never be constructed with a stale/incorrect value.
export function createValidatorContext(
  value: unknown,
  rule: ValidationRule,
  path: string,
  translate: TranslationProvider['t'],
  scope: Record<string, unknown> = {},
): ValidatorContext {
  return {
    value,
    rule,
    path,
    translate,
    scope,
    get isEmpty() {
      return isEmpty(value)
    },
  }
}

// Opt-in helper for validators that shouldn't run against an empty value —
// that's what the `required` rule is for. Mirrors the legacy `_forms`
// system's `executeValidation` wrapper.
export function skipWhenEmpty(validator: Validator): Validator {
  return (context) => (context.isEmpty ? { valid: true } : validator(context))
}

// A rule's numeric/pattern threshold — the builder's properties panel writes
// it as `rule.value` regardless of type (minLength/maxLength/pattern all
// share one input), so the validators read it from there too.
function lengthOf(value: unknown): number {
  if (typeof value === 'string') return value.length
  if (Array.isArray(value)) return value.length
  return 0
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+(]?[\d\s().-]{7,}$/
const NUMERIC_PATTERN = /^\d+$/
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/

// Belgian national register number (rijksregisternummer/INSZ) checksum — the
// last 2 of its 11 digits are `97 - (first 9 digits mod 97)`, computed twice
// (as-is, and with a "2" prefixed) since a 2-digit birth year alone can't
// tell a 19xx from a 20xx birth date; either interpretation being valid is
// how every legacy implementation of this check works.
function inszChecksum(prefix: string, nineDigits: string): number {
  const remainder = Number(prefix + nineDigits) % 97
  return remainder === 0 ? 97 : 97 - remainder
}

function isValidInsz(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 11) return false
  const nineDigits = digits.slice(0, 9)
  const check = Number(digits.slice(9, 11))
  return inszChecksum('', nineDigits) === check || inszChecksum('2', nineDigits) === check
}

// IBAN mod-97 check (ISO 7064): move the first 4 characters to the end,
// convert each letter to its position-based two-digit number (A=10…Z=35),
// and the whole thing mod 97 must be 1. The number is far too large for a
// JS number, so the modulo is taken incrementally, digit by digit.
function iso7064Mod97(numeric: string): number {
  let remainder = 0
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder
}

function isValidIban(value: string): boolean {
  const raw = value.replace(/\s+/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(raw)) return false
  const rearranged = raw.slice(4) + raw.slice(0, 4)
  const numeric = rearranged.replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55))
  return iso7064Mod97(numeric) === 1
}

// `today`/`now`/`endofday`, each with an optional `+N`/`-N` day offset — the
// same magic strings the legacy `_forms` system's date/datetime validators
// accept for `min`/`max`, alongside a literal date string/Date.
const MAGIC_DATE_PATTERN = /^(today|now|endofday)([+-]\d+)?$/i

function resolveDateBound(input: unknown): Date | undefined {
  if (input == null) return undefined
  if (input instanceof Date) return input
  const text = String(input).trim()
  const match = MAGIC_DATE_PATTERN.exec(text)
  if (match) {
    const base = new Date()
    const keyword = match[1]!.toLowerCase()
    if (keyword === 'today') base.setHours(0, 0, 0, 0)
    else if (keyword === 'endofday') base.setHours(23, 59, 59, 999)
    if (match[2]) base.setDate(base.getDate() + Number(match[2]))
    return base
  }
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function validateDateRange(context: ValidatorContext, messageKey: string): ValidationResult {
  const { value, rule, translate } = context
  const date = resolveDateBound(value)
  if (!date) return { valid: false, message: translate(messageKey) }
  const min = resolveDateBound(rule.min)
  const max = resolveDateBound(rule.max)
  if (min && date.getTime() < min.getTime()) return { valid: false, message: translate(messageKey) }
  if (max && date.getTime() > max.getTime()) return { valid: false, message: translate(messageKey) }
  return { valid: true }
}

function compareValues(value: unknown, other: unknown, op: string): boolean {
  switch (op) {
    case 'eq':
      return value === other
    case 'ne':
      return value !== other
    case 'gt':
      return (value as never) > (other as never)
    case 'ge':
      return (value as never) >= (other as never)
    case 'lt':
      return (value as never) < (other as never)
    case 'le':
      return (value as never) <= (other as never)
    default:
      return false
  }
}

const globalValidators: ValidatorRegistry = {
  required: ({ isEmpty: empty, translate }) =>
    empty
      ? { valid: false, message: translate('formRenderer.validation.required') }
      : { valid: true },
  minLength: skipWhenEmpty(({ value, rule, translate }) => {
    const min = Number(rule.value)
    return lengthOf(value) >= min
      ? { valid: true }
      : { valid: false, message: translate('formRenderer.validation.minLength', { min }) }
  }),
  maxLength: skipWhenEmpty(({ value, rule, translate }) => {
    const max = Number(rule.value)
    return lengthOf(value) <= max
      ? { valid: true }
      : { valid: false, message: translate('formRenderer.validation.maxLength', { max }) }
  }),
  pattern: skipWhenEmpty(({ value, rule, translate }) => {
    const isValid = new RegExp(String(rule.value)).test(String(value))
    return isValid
      ? { valid: true }
      : { valid: false, message: translate('formRenderer.validation.pattern') }
  }),
  email: skipWhenEmpty(({ value, translate }) =>
    EMAIL_PATTERN.test(String(value))
      ? { valid: true }
      : { valid: false, message: translate('formRenderer.validation.email') },
  ),
  phone: skipWhenEmpty(({ value, translate }) =>
    PHONE_PATTERN.test(String(value).trim())
      ? { valid: true }
      : { valid: false, message: translate('formRenderer.validation.phone') },
  ),
  numeric: skipWhenEmpty(({ value, translate }) =>
    NUMERIC_PATTERN.test(String(value))
      ? { valid: true }
      : { valid: false, message: translate('formRenderer.validation.numeric') },
  ),
  decimal: skipWhenEmpty(({ value, translate }) =>
    DECIMAL_PATTERN.test(String(value))
      ? { valid: true }
      : { valid: false, message: translate('formRenderer.validation.decimal') },
  ),
  bool: skipWhenEmpty(({ value, translate }) =>
    typeof value === 'boolean'
      ? { valid: true }
      : { valid: false, message: translate('formRenderer.validation.bool') },
  ),
  insz: skipWhenEmpty(({ value, translate }) =>
    isValidInsz(String(value))
      ? { valid: true }
      : { valid: false, message: translate('formRenderer.validation.insz') },
  ),
  iban: skipWhenEmpty(({ value, translate }) =>
    isValidIban(String(value))
      ? { valid: true }
      : { valid: false, message: translate('formRenderer.validation.iban') },
  ),
  oneOf: skipWhenEmpty(({ value, rule, translate }) => {
    const allowed = Array.isArray(rule.values) ? rule.values : []
    return allowed.includes(value)
      ? { valid: true }
      : { valid: false, message: translate('formRenderer.validation.oneOf') }
  }),
  // A single value or an array of values, every one of which must appear in
  // `rule.values` — the array case is what distinguishes this from `oneOf`
  // (e.g. a set of checkboxes that must all come from an allowed set).
  flags: skipWhenEmpty(({ value, rule, translate }) => {
    const ignoreCase = !!rule.ignoreCase
    const normalize = (item: unknown) => (ignoreCase ? String(item).toLowerCase() : String(item))
    const allowed = (Array.isArray(rule.values) ? rule.values : []).map(normalize)
    const items = Array.isArray(value) ? value : [value]
    return items.every((item) => allowed.includes(normalize(item)))
      ? { valid: true }
      : { valid: false, message: translate('formRenderer.validation.flags') }
  }),
  // Cross-field comparison: against another path's live value (`rule.path`,
  // resolved in the current row's scope) if given, else a literal
  // `rule.value`. `op` is one of eq/ne/gt/ge/lt/le.
  compare: skipWhenEmpty(({ value, rule, scope, translate }) => {
    const other = rule.path !== undefined ? getProperty(scope, String(rule.path)) : rule.value
    const isValid = compareValues(value, other, String(rule.op ?? 'eq'))
    return isValid
      ? { valid: true }
      : { valid: false, message: translate('formRenderer.validation.compare') }
  }),
  date: skipWhenEmpty((context) => validateDateRange(context, 'formRenderer.validation.date')),
  datetime: skipWhenEmpty((context) =>
    validateDateRange(context, 'formRenderer.validation.datetime'),
  ),
}

export function registerValidator(type: string, validator: Validator): void {
  globalValidators[type] = validator
}

export function registerValidators(validators: ValidatorRegistry): void {
  Object.assign(globalValidators, validators)
}

export function getGlobalValidatorRegistry(): ValidatorRegistry {
  return globalValidators
}
