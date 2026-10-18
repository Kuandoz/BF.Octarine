import type {
  ValidationResult,
  ValidationRule,
  ValidatorRegistry,
} from '@octarine/form-abstractions'

import { ExpressionService } from './ExpressionService'
import { INVALID_KEY } from './messages'
import { builtInValidators, createValidatorContext } from './validators'
import { warnOnce } from './warn'

// Runs the rules of one path. The result names the first rule that failed
// by message key; turning it into text is up to whoever shows it.
export class ValidationService {
  private validators: ValidatorRegistry
  private expressionService: ExpressionService

  constructor(
    validators?: ValidatorRegistry,
    expressionService: ExpressionService = new ExpressionService(),
  ) {
    this.validators = { ...builtInValidators, ...validators }
    this.expressionService = expressionService
  }

  // `scope` is what an unqualified `condition` expression sees — the current
  // row's own fields when validating something inside a `repeat`, otherwise
  // the whole model. `rootScope` (defaults to `scope`) backs a `root: true`
  // condition's escape hatch back to the whole model.
  validate(
    rules: ValidationRule[] | undefined,
    value: unknown,
    path: string,
    scope: Record<string, unknown> = {},
    rootScope: Record<string, unknown> = scope,
    env: Record<string, unknown> = {},
  ): ValidationResult {
    for (const rule of rules ?? []) {
      if (!this.isActive(rule, scope, rootScope, env)) continue

      const validator = this.validators[rule.type]
      if (!validator) {
        warnOnce(`[form-engine] No validator registered for type "${rule.type}"`)
        continue
      }

      const result = validator(createValidatorContext(value, rule, path, scope))
      if (result.valid) continue
      return {
        valid: false,
        rule: rule.type,
        key: result.key ?? INVALID_KEY,
        ...(result.params && { params: result.params }),
        ...(rule.message !== undefined && { message: rule.message }),
      }
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
}
