// The engine evaluates conditions (`hide`, `disabled`, `readonly`, a rule's
// `condition`, a label branch) through an ExpressionLanguage, so the language
// can be swapped: JS-style by default, FEEL or anything else as an add-on.
// A form says which one it is written in with `definition.expressions`.
//
// A language only parses and evaluates. Everything around it stays in the
// engine and is the same for every language: which scope an expression sees
// (the row inside a repeat, `root: true` for the whole model), the functions
// it can call, what happens when it fails (a broken `hide` leaves the field
// visible, a broken rule condition keeps the rule), and caching compiled
// expressions by source.

export type ExpressionFunction = (...args: unknown[]) => unknown

export interface EvaluationContext {
  // The fields an unqualified name refers to: the model, or the current row.
  scope: Record<string, unknown>
  // Facts about where the form runs, e.g. `{ language: 'nl' }`. Available as
  // `env` in the JS language.
  env: Record<string, unknown>
  // Functions an expression can call, like `age(birthDate)`.
  functions: Record<string, ExpressionFunction>
}

export interface CompiledExpression {
  evaluate(context: EvaluationContext): unknown
  // The model paths the expression reads ("contact.mode"), when the language
  // can tell. For editors and the builder, not for evaluation.
  readonly dependencies?: readonly string[]
}

export interface ExpressionLanguage {
  // What a form names in `definition.expressions`, e.g. 'js' or 'feel'.
  readonly name: string
  // Throws an ExpressionError for an expression it can't parse.
  compile(source: string): CompiledExpression
}

export class ExpressionError extends Error {
  constructor(
    message: string,
    // Offset in the source where the problem is, when known.
    readonly position?: number,
  ) {
    super(message)
    this.name = 'ExpressionError'
  }
}

/**
 * The language a form is written in: the one named by `name`, or 'js'.
 * A form that names a language nobody registered fails right away; otherwise
 * every condition would quietly fall back to its default.
 */
export function findExpressionLanguage(
  languages: readonly ExpressionLanguage[],
  name = 'js',
): ExpressionLanguage {
  const language = languages.find((candidate) => candidate.name === name)
  if (!language) {
    const known = languages.map((candidate) => `"${candidate.name}"`).join(', ')
    throw new Error(
      `[form-engine] The form uses expression language "${name}", but only ${known || 'none'} ${
        languages.length === 1 ? 'is' : 'are'
      } registered.`,
    )
  }
  return language
}
