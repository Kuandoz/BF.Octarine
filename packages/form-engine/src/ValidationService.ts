import { ExpressionService } from './ExpressionService'
import { defaultTranslationProvider, type TranslationProvider } from './services'
import type { ValidationResult, ValidationRule } from './types'
import { warnOnce } from './warn'
import {
  createValidatorContext,
  getGlobalValidatorRegistry,
  type ValidatorRegistry,
} from './validators'

export class ValidationService {
  private validators: ValidatorRegistry
  private translationProvider: TranslationProvider
  private expressionService: ExpressionService

  constructor(
    validators?: ValidatorRegistry,
    translationProvider: TranslationProvider = defaultTranslationProvider,
    expressionService: ExpressionService = new ExpressionService(),
  ) {
    this.validators = validators
      ? { ...getGlobalValidatorRegistry(), ...validators }
      : getGlobalValidatorRegistry()
    this.translationProvider = translationProvider
    this.expressionService = expressionService
  }

  // `scope` is what an unqualified `condition` expression sees — the current
  // row's own fields when validating something inside a `repeat`, otherwise
  // the whole model. `rootScope` (defaults to `scope`) backs a `root: true`
  // condition's escape hatch back to the whole model. `rules` comes from
  // FormEngine's own validations dictionary lookup — this service has no
  // opinion on where they came from, only on running them.
  validate(
    rules: ValidationRule[] | undefined,
    value: unknown,
    path: string,
    scope: Record<string, unknown> = {},
    rootScope: Record<string, unknown> = scope,
  ): ValidationResult {
    for (const rule of rules ?? []) {
      // A rule's own `condition` gates whether it runs at all (the
      // requiredIf/forbiddenIf use case). Unlike hide/disabled/readonly,
      // this defaults toward the rule staying *active* if the expression
      // throws — better to over-validate than silently let bad data through
      // because of a broken condition.
      if (rule.condition !== undefined) {
        const conditionMet = this.expressionService.resolve(
          rule.condition,
          { scope, rootScope },
          true,
        )
        if (!conditionMet) continue
      }

      const validator = this.validators[rule.type]
      if (!validator) {
        warnOnce(`[form-engine] No validator registered for type "${rule.type}"`)
        continue
      }

      const context = createValidatorContext(value, rule, path, this.translationProvider.t, scope)
      const result = validator(context)
      if (!result.valid) return { ...result, message: rule.message ?? result.message }
    }
    return { valid: true }
  }
}
