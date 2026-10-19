import type { FormDefinition, LocalisableString, ValidationRule } from './definition'

// Errors are message keys with parameters, not text: the server can
// translate them, or hand them back for the client to translate. Text is
// made at the edge, where the language is known.

// What a validator returns. When it fails, `key` names the message
// ("validation.minLength", or the generic "isn't valid" one when
// left out) and `params` fills it in (`{ min: 3 }`). `{ valid: value !== '' }`
// is a whole validator result.
export interface ValidatorResult {
  valid: boolean
  key?: string
  params?: Record<string, unknown>
}

export interface ValidatorContext {
  value: unknown
  rule: ValidationRule
  // The resolved model path being validated (e.g. "items.2.quantity") — not
  // a FieldDefinition. Validation is a model concern; nothing here should
  // need to know about whatever component (if any) rendered this path.
  path: string
  /** Whether `value` counts as empty (null, '', [], {}). Most rules should pass when this is true — that's what `required` is for. */
  isEmpty: boolean
  // What an unqualified path in a cross-field rule (e.g. `compare`'s
  // `rule.path`) resolves against — the current row's own fields inside a
  // `repeat`, otherwise the whole model.
  scope: Record<string, unknown>
  // The whole model, the form and `env`: for a rule that needs more than
  // its own value, like one that asks the server (see delegateToServer).
  model: Record<string, unknown>
  definition: FormDefinition
  env: Record<string, unknown>
}

// A JSON Schema, as plain data. The schema for form definitions (step 5 in
// HANDOFF.md) is put together from the ones fields and validators declare.
export type JsonSchema = { [keyword: string]: unknown }

export interface Validator {
  // A promise for a rule that has to wait, like one the server checks. The
  // engine shows the path as pending until it settles.
  (context: ValidatorContext): ValidatorResult | Promise<ValidatorResult>
  // The rule's own parameters (`value`, `values`, …) as the properties of
  // an object schema, e.g. `{ properties: { value: { type: 'number' } } }`.
  readonly schema?: JsonSchema
}

export type ValidatorRegistry = Record<string, Validator>

// The outcome of a path's rules: the first one that failed, if any, or the
// one still being checked.
export type ValidationResult = { valid: true } | ValidationFailure | ValidationPending

// A rule is still being checked (its validator returned a promise). Counts as
// not valid until it settles, so nothing is sent before the answer is in.
export interface ValidationPending {
  valid: false
  pending: true
  rule: string
  // The outcome once every rule of the path ran; never pending itself.
  settled: Promise<ValidationResult>
}

export interface ValidationFailure {
  valid: false
  pending?: undefined
  // The rule's `type`, e.g. 'required'.
  rule: string
  key: string
  params?: Record<string, unknown>
  // The rule's own `message`, when the form gives one: a key of the form's
  // texts (or of the app's), literal text, or a choice of keys by condition,
  // as labels have. It wins over `key`, and gets `params` too.
  message?: LocalisableString
}
