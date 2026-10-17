import { Sandbox } from '@nyariv/sandboxjs'

import { type ExpressionLanguage, ExpressionError } from './expressions'

// `compile` + an explicit `return` rather than `compileExpression`, which
// doesn't resolve scope in the installed sandboxjs version (it silently
// returns `undefined`).
export const sandboxjsLanguage: ExpressionLanguage = {
  name: 'js',
  compile(source) {
    let run: (scope: Record<string, unknown>) => { run(): unknown }
    try {
      run = new Sandbox().compile<unknown>(`return ${source}`)
    } catch (error) {
      throw new ExpressionError(error instanceof Error ? error.message : String(error))
    }
    return {
      evaluate: ({ scope, env, functions }) => run({ ...scope, ...functions, env }).run(),
    }
  },
}
