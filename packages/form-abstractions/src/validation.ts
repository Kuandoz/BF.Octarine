import type { ValidationRule } from './definition'

// Errors are message keys with parameters, not text: the server can
// translate them, or hand them back for the client to translate. Text is
// made at the edge, where the language is known.

// What a validator returns. When it fails, `key` names the message
// ("formRenderer.validation.minLength", or the generic "isn't valid" one when
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
}

export type Validator = (context: ValidatorContext) => ValidatorResult

export type ValidatorRegistry = Record<string, Validator>

// The outcome of a path's rules: the first one that failed, if any.
export type ValidationResult = { valid: true } | ValidationFailure

export interface ValidationFailure {
  valid: false
  // The rule's `type`, e.g. 'required'.
  rule: string
  key: string
  params?: Record<string, unknown>
  // The rule's own `message`, when the form gives one: a localisation key of
  // the form, or literal text. It wins over `key`.
  message?: string
}
