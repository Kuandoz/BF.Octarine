import type {
  CompiledExpression,
  ConditionValue,
  ExpressionFunction,
  ExpressionLanguage,
} from '@octarine/form-abstractions'

import { jsLanguage } from './jsLanguage'
import { warnOnce } from './warn'

export interface ExpressionContext {
  scope: Record<string, unknown>
  // Used only for `{ expression, root: true }` conditions — evaluate against
  // this instead of `scope` (e.g. the whole model instead of a repeated
  // item's own fields). Falls back to `scope` if not given.
  rootScope?: Record<string, unknown>
  env?: Record<string, unknown>
}

function calculateAge(birthDate: unknown): number | undefined {
  const date = birthDate instanceof Date ? birthDate : new Date(String(birthDate))
  if (Number.isNaN(date.getTime())) return undefined

  const now = new Date()
  let years = now.getFullYear() - date.getFullYear()
  const monthDiff = now.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) years--
  return years
}

// The functions every expression can call, whatever its language.
export const defaultExpressionFunctions: Record<string, ExpressionFunction> = {
  age: calculateAge,
}

// Resolves a ConditionValue to a boolean through an ExpressionLanguage. The
// language only parses and evaluates; scope, functions, fallbacks and caching
// are handled here, the same for every language.
export class ExpressionService {
  readonly language: ExpressionLanguage
  private functions: Record<string, ExpressionFunction>
  // Compiled once per unique expression string and reused, so a condition
  // isn't parsed again on every reactive re-evaluation.
  private compiled = new Map<string, CompiledExpression>()

  constructor(
    language: ExpressionLanguage = jsLanguage,
    functions: Record<string, ExpressionFunction> = defaultExpressionFunctions,
  ) {
    this.language = language
    this.functions = functions
  }

  resolve(
    condition: ConditionValue | undefined,
    context: ExpressionContext,
    defaultResult = false,
  ): boolean {
    if (condition === undefined) return defaultResult
    if (typeof condition === 'boolean') return condition

    if (typeof condition === 'string') {
      return this.evaluate(condition, context.scope, context.env, defaultResult)
    }

    const scope = condition.root ? (context.rootScope ?? context.scope) : context.scope
    return this.evaluate(
      condition.expression,
      scope,
      context.env,
      condition.defaultValue ?? defaultResult,
    )
  }

  // Compiles `source` (or returns the cached result). Throws an
  // ExpressionError for an expression the language can't parse.
  compile(source: string): CompiledExpression {
    let compiled = this.compiled.get(source)
    if (!compiled) {
      compiled = this.language.compile(source)
      this.compiled.set(source, compiled)
    }
    return compiled
  }

  private evaluate(
    expression: string,
    scope: Record<string, unknown>,
    env: Record<string, unknown> | undefined,
    defaultResult: boolean,
  ): boolean {
    try {
      const result = this.compile(expression).evaluate({
        scope,
        env: { ...env },
        functions: this.functions,
      })
      return !!result
    } catch (error) {
      warnOnce(`[form-engine] Failed to evaluate expression "${expression}"`, error)
      return defaultResult
    }
  }
}
