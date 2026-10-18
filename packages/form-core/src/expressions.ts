import type { ExpressionLanguage } from '@octarine/form-abstractions'

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
