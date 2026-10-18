import type { FormDefinition } from './definition'
import type { ValidationFailure } from './validation'

// One rule that failed, for a submitted model.
export interface SubmissionError extends Omit<ValidationFailure, 'valid' | 'pending'> {
  // The resolved path, e.g. "items.2.quantity".
  path: string
}

export interface SubmissionResult {
  valid: boolean
  // In the order of `definition.validations`, rows in row order.
  errors: SubmissionError[]
}

export interface SubmissionOptions {
  // Facts about where the form runs, available to expressions as `env`
  // (e.g. `{ language: 'nl' }`).
  env?: Record<string, unknown>
}

/**
 * Checks a whole submission against its form. form-core has one that runs
 * in-process; a remote one asks the form service. The client and the server
 * talk to this interface, so where the work runs can change without
 * changing the forms.
 *
 * A remote implementation must not trust a definition that comes with the
 * request: the server checks against its own copy.
 */
export interface SubmissionValidator {
  validate(
    definition: FormDefinition,
    model: Record<string, unknown>,
    options?: SubmissionOptions,
  ): Promise<SubmissionResult>
}
