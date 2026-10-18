import type {
  FormDefinition,
  SubmissionError,
  SubmissionOptions,
  SubmissionResult,
  SubmissionValidator,
} from '@octarine/form-abstractions'

import { FormValidator, type FormValidatorOptions } from './FormValidator'
import { declareFieldKeys } from './pathAccessors'
import { settle } from './ValidationService'

export interface ValidateSubmissionOptions extends FormValidatorOptions, SubmissionOptions {}

/**
 * Runs every rule of `definition` against a submitted model, the same rules
 * the form runs while it is filled in. For the server, which must check
 * again whatever it receives. Errors are message keys with parameters, so
 * they can be translated where they are shown. Async validators are waited
 * for.
 */
export async function validateSubmission(
  definition: FormDefinition,
  model: Record<string, unknown>,
  options: ValidateSubmissionOptions = {},
): Promise<SubmissionResult> {
  // Every field the form defines is a known name to expressions, as it is in
  // the browser: a key the client left out reads as undefined instead of
  // failing the condition (which would keep a required-if active).
  const declared = copyPlain(model) as Record<string, unknown>
  declareFieldKeys(definition.components, declared, options.repeatTypes)
  const results = new FormValidator(definition, options).validateAll(declared, options.env)
  const errors: SubmissionError[] = []
  for (const [path, pending] of results) {
    const result = await settle(pending)
    if (result.valid || result.pending) continue
    const { valid: _valid, pending: _pending, ...failure } = result
    errors.push({ path, ...failure })
  }
  return { valid: errors.length === 0, errors }
}

// A deep copy of plain data. structuredClone would throw on the reactive
// proxies a browser model is made of.
function copyPlain(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(copyPlain)
  if (value instanceof Date) return new Date(value)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copyPlain(item)]))
  }
  return value
}

// A SubmissionValidator that runs in this process.
export function createLocalSubmissionValidator(
  options: FormValidatorOptions = {},
): SubmissionValidator {
  return {
    validate: (definition, model, submission = {}) =>
      validateSubmission(definition, model, { ...options, ...submission }),
  }
}
