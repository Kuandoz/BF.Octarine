import type {
  ConditionValue,
  ExpressionFunction,
  ExpressionLanguage,
  FormDefinition,
  LocalisableString,
  RepeatContext,
  ValidationResult,
  ValidatorRegistry,
} from '@octarine/form-abstractions'

import { defaultExpressionFunctions, ExpressionService } from './ExpressionService'
import { findExpressionLanguage } from './expressions'
import { jsLanguage } from './jsLanguage'
import { expandWildcardPath, getProperty, getScope, resolvePathContext } from './pathAccessors'
import { ValidationService } from './ValidationService'
import { warnOnce } from './warn'

export interface FormValidatorOptions {
  // Added to the built-in validators; one with the same name replaces it.
  validators?: ValidatorRegistry
  // Languages a form can name in `definition.expressions`, besides 'js'.
  expressionLanguages?: readonly ExpressionLanguage[]
  // Functions expressions can call, besides `age()`; one with the same name
  // replaces it.
  functions?: Record<string, ExpressionFunction>
  // Field types whose `components` are the fields of each row. Default:
  // `['repeat']`.
  repeatTypes?: readonly string[]
}

// The built-in 'js' language plus `extra`, where an extra one with the same
// name wins.
export function withExpressionLanguages(
  extra: readonly ExpressionLanguage[] = [],
): readonly ExpressionLanguage[] {
  const names = new Set(extra.map((language) => language.name))
  return names.has(jsLanguage.name) ? extra : [...extra, jsLanguage]
}

type Model = Record<string, unknown>
type Env = Record<string, unknown>

/**
 * A form's rules, run against a model. Holds no state of its own: every
 * call reads the model it is given, so the same checks run in the browser
 * (where the engine calls them inside computeds, over a reactive model) and
 * on the server.
 *
 * `definition.validations` is the only source of rules, expanded against the
 * model's actual shape. Validation is a model concern: a hidden field is
 * validated like any other, so a value can't slip through by hiding its
 * field.
 */
export class FormValidator {
  readonly definition: FormDefinition
  readonly expressions: ExpressionService
  private validation: ValidationService

  constructor(definition: FormDefinition, options: FormValidatorOptions = {}) {
    this.definition = definition
    this.expressions = new ExpressionService(
      findExpressionLanguage(
        withExpressionLanguages(options.expressionLanguages),
        definition.expressions,
      ),
      { ...defaultExpressionFunctions, ...options.functions },
    )
    this.validation = new ValidationService(options.validators, this.expressions, definition)
  }

  // For hide/disabled/readonly — defaults toward *not* hiding/disabling a
  // field if the expression throws, so a broken condition fails open
  // (visible/enabled) rather than silently locking a field away. Inside a
  // repeated row, a plain string/`{expression}` condition evaluates against
  // *that row*, with `root: true` as the escape hatch back to the whole model.
  resolveCondition(
    model: Model,
    condition: ConditionValue | undefined,
    defaultResult = false,
    repeatContext?: RepeatContext,
    env: Env = {},
  ): boolean {
    return this.expressions.resolve(
      condition,
      { scope: getScope(model, repeatContext), rootScope: model, env },
      defaultResult,
    )
  }

  // The key a LocalisableString stands for: a string is one already; an
  // object is a switch over keys, each gated by a condition, and the first
  // that holds wins, in object-key order. There's no dedicated "default"
  // key; a last entry with the condition `true` is the else-branch. No
  // branch holding gives undefined.
  chooseText(
    model: Model,
    text: LocalisableString,
    repeatContext?: RepeatContext,
    env: Env = {},
  ): string | undefined {
    if (typeof text === 'string') return text
    for (const [key, condition] of Object.entries(text)) {
      if (this.resolveCondition(model, condition, false, repeatContext, env)) return key
    }
    warnOnce('[form-core] No branch matched in a localisable object', text)
    return undefined
  }

  validatePath(model: Model, path: string, env: Env = {}): ValidationResult {
    const { wildcardPath, repeatContext } = resolvePathContext(model, path)
    return this.run(model, wildcardPath, path, repeatContext, env)
  }

  // Every path a rule applies to in this model, with its result, in the
  // order of `definition.validations`, rows in row order. A result can be
  // pending when a validator is async; see settle().
  validateAll(model: Model, env: Env = {}): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>()
    for (const wildcardKey of Object.keys(this.definition.validations ?? {})) {
      for (const { path, repeatContext } of expandWildcardPath(model, wildcardKey)) {
        results.set(path, this.run(model, wildcardKey, path, repeatContext, env))
      }
    }
    return results
  }

  // Whether `path` has rules of its own (`items.2.name` looks up `items.*.name`).
  hasRules(model: Model, path: string): boolean {
    return !!this.definition.validations?.[resolvePathContext(model, path).wildcardPath]
  }

  // Whether validation will demand a value at `path` right now: it has a
  // `required` rule whose `condition` (if any) holds, evaluated the way
  // validation evaluates it. Fields use this for their required marker, so
  // the marker never promises more, or less, than validation checks.
  isRequired(model: Model, path: string, env: Env = {}): boolean {
    const { wildcardPath, repeatContext } = resolvePathContext(model, path)
    const scope = getScope(model, repeatContext)
    return (this.definition.validations?.[wildcardPath] ?? []).some(
      (rule) => rule.type === 'required' && this.validation.isActive(rule, scope, model, env),
    )
  }

  private run(
    model: Model,
    wildcardKey: string,
    path: string,
    repeatContext: RepeatContext | undefined,
    env: Env,
  ): ValidationResult {
    return this.validation.validate(
      this.definition.validations?.[wildcardKey],
      getProperty(model, path),
      path,
      getScope(model, repeatContext),
      model,
      env,
    )
  }
}
