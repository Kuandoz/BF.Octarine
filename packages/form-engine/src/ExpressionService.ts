import { Sandbox } from '@nyariv/sandboxjs'

import type { ConditionValue } from './types'
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

type CompiledExpression = (scope: Record<string, unknown>) => { run(): unknown }

export class ExpressionService {
  // Compiled once per unique expression string and reused — the legacy
  // `_forms` system recompiled the same expression on every single
  // reactive re-evaluation, which this fixes.
  private compiled = new Map<string, CompiledExpression>()

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

  private evaluate(
    expression: string,
    scope: Record<string, unknown>,
    env: Record<string, unknown> | undefined,
    defaultResult: boolean,
  ): boolean {
    try {
      let compiled = this.compiled.get(expression)
      if (!compiled) {
        // `compile` + an explicit `return` (matching the legacy `_forms`
        // system) rather than `compileExpression` — the latter doesn't
        // correctly resolve scope in the installed sandboxjs version
        // (confirmed directly: it silently returns `undefined`).
        compiled = new Sandbox().compile<unknown>(`return ${expression}`)
        this.compiled.set(expression, compiled)
      }

      const execScope = { ...scope, env: { ...env }, age: calculateAge }
      return !!compiled(execScope).run()
    } catch (error) {
      warnOnce(`[form-engine] Failed to evaluate expression "${expression}"`, error)
      return defaultResult
    }
  }
}
