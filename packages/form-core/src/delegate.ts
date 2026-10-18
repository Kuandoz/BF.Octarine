import type { SubmissionValidator, Validator } from '@octarine/form-abstractions'

/**
 * A validator that leaves its rule to the server, for a rule that needs data
 * only the server has (is this email address taken?). Register it on the
 * client under the rule's type; the server registers the real validator
 * under the same type, so there is still one implementation.
 *
 * ```ts
 * // client
 * createForms({ validators: { ...rules.validators, uniqueEmail: delegateToServer(remote) } })
 * ```
 *
 * It asks `validator` to check the whole model and picks out the answer for
 * this path and rule.
 */
export function delegateToServer(validator: SubmissionValidator): Validator {
  return async ({ path, rule, model, definition, env }) => {
    const { errors } = await validator.validate(definition, model, { env })
    const error = errors.find(
      (candidate) => candidate.path === path && candidate.rule === rule.type,
    )
    return error ? { valid: false, key: error.key, params: error.params } : { valid: true }
  }
}
