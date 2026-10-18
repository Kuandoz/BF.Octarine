import type {
  FormDefinition,
  ValidationResult,
  ValidationRule,
  ValidatorRegistry,
  ValidatorResult,
} from '@octarine/form-abstractions'

import { ExpressionService } from './ExpressionService'
import { INVALID_KEY, UNAVAILABLE_KEY } from './messages'
import { builtInValidators, createValidatorContext } from './validators'
import { warnOnce } from './warn'

const isPromise = (value: unknown): value is Promise<ValidatorResult> =>
  typeof (value as Promise<unknown> | null)?.then === 'function'

// A result that is still pending, once it has settled.
export async function settle(result: ValidationResult): Promise<ValidationResult> {
  return result.valid === false && result.pending ? settle(await result.settled) : result
}

// Runs the rules of one path. The result names the first rule that failed
// by message key; turning it into text is up to whoever shows it.
export class ValidationService {
  private validators: ValidatorRegistry
  private expressionService: ExpressionService
  private definition: FormDefinition

  constructor(
    validators?: ValidatorRegistry,
    expressionService: ExpressionService = new ExpressionService(),
    definition: FormDefinition = { components: [] },
  ) {
    this.validators = { ...builtInValidators, ...validators }
    this.expressionService = expressionService
    this.definition = definition
  }

  // `scope` is what an unqualified `condition` expression sees — the current
  // row's own fields when validating something inside a `repeat`, otherwise
  // the whole model. `rootScope` (defaults to `scope`) backs a `root: true`
  // condition's escape hatch back to the whole model.
  //
  // Rules run in order and stop at the first failure. A validator that
  // returns a promise makes the result pending; the rules after it run once
  // it settles.
  validate(
    rules: ValidationRule[] | undefined,
    value: unknown,
    path: string,
    scope: Record<string, unknown> = {},
    rootScope: Record<string, unknown> = scope,
    env: Record<string, unknown> = {},
  ): ValidationResult {
    const all = rules ?? []
    for (const [index, rule] of all.entries()) {
      if (!this.isActive(rule, scope, rootScope, env)) continue

      const validator = this.validators[rule.type]
      if (!validator) {
        warnOnce(`[form-engine] No validator registered for type "${rule.type}"`)
        continue
      }

      const context = createValidatorContext(value, rule, path, scope, {
        model: rootScope,
        definition: this.definition,
        env,
      })
      let result: ValidatorResult | Promise<ValidatorResult>
      try {
        result = validator(context)
      } catch (error) {
        warnOnce(`[form-engine] The "${rule.type}" validator threw`, error)
        result = { valid: false, key: UNAVAILABLE_KEY }
      }

      if (isPromise(result)) {
        const rest = all.slice(index + 1)
        const settled = result.then(
          (outcome) =>
            outcome.valid
              ? settle(this.validate(rest, value, path, scope, rootScope, env))
              : this.failure(rule, outcome),
          (error: unknown) => {
            warnOnce(`[form-engine] The "${rule.type}" validator failed`, error)
            return this.failure(rule, { valid: false, key: UNAVAILABLE_KEY })
          },
        )
        return { valid: false, pending: true, rule: rule.type, settled }
      }
      if (!result.valid) return this.failure(rule, result)
    }
    return { valid: true }
  }

  // A rule's own `condition` gates whether it runs at all (the
  // requiredIf/forbiddenIf use case). Unlike hide/disabled/readonly, this
  // defaults toward the rule staying *active* if the expression throws —
  // better to over-validate than silently let bad data through because of a
  // broken condition.
  isActive(
    rule: ValidationRule,
    scope: Record<string, unknown> = {},
    rootScope: Record<string, unknown> = scope,
    env: Record<string, unknown> = {},
  ): boolean {
    if (rule.condition === undefined) return true
    return this.expressionService.resolve(rule.condition, { scope, rootScope, env }, true)
  }

  private failure(rule: ValidationRule, result: ValidatorResult): ValidationResult {
    return {
      valid: false,
      rule: rule.type,
      key: result.key ?? INVALID_KEY,
      ...(result.params && { params: result.params }),
      ...(rule.message !== undefined && { message: rule.message }),
    }
  }
}
