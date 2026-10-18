import type {
  FormDefinition,
  SubmissionError,
  SubmissionOptions,
  SubmissionResult,
  SubmissionValidator,
} from '@octarine/form-abstractions'

import { FormValidator, type FormValidatorOptions } from './FormValidator'
import { declareFieldKeys } from './pathAccessors'

export interface ValidateSubmissionOptions extends FormValidatorOptions, SubmissionOptions {}

/**
 * Runs every rule of `definition` against a submitted model, the same rules
 * the form runs while it is filled in. For the server, which must check
 * again whatever it receives. Errors are message keys with parameters, so
 * they can be translated where they are shown.
 */
export function validateSubmission(
  definition: FormDefinition,
  model: Record<string, unknown>,
  options: ValidateSubmissionOptions = {},
): SubmissionResult {
  // Every field the form defines is a known name to expressions, as it is in
  // the browser: a key the client left out reads as undefined instead of
  // failing the condition (which would keep a required-if active).
  const declared = structuredClone(model)
  declareFieldKeys(definition.components, declared)
  const results = new FormValidator(definition, options).validateAll(declared, options.env)
  const errors: SubmissionError[] = []
  for (const [path, result] of results) {
    if (result.valid) continue
    const { valid: _valid, ...failure } = result
    errors.push({ path, ...failure })
  }
  return { valid: errors.length === 0, errors }
}

// A SubmissionValidator that runs in this process.
export function createLocalSubmissionValidator(
  options: FormValidatorOptions = {},
): SubmissionValidator {
  return {
    validate: async (definition, model, submission = {}) =>
      validateSubmission(definition, model, { ...options, ...submission }),
  }
}
