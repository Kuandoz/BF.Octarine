import type { ConditionValue, FieldDefinition } from './types'

/** A `hide` condition, and how many repeat rows deep it is evaluated (0: the whole model). */
export interface HideCondition {
  condition: ConditionValue
  depth: number
}

/**
 * For every path a field renders, the hide conditions on the way to it: its
 * own and its containers'. One list per field, because several fields can
 * render the same path; the path is hidden only when all of them are.
 *
 * Keys use `*` for repeated rows, like the validations dictionary
 * (`items.*.reason`).
 */
export function collectHideConditions(
  components: FieldDefinition[],
): Map<string, HideCondition[][]> {
  const conditions = new Map<string, HideCondition[][]>()

  const walk = (
    fields: FieldDefinition[],
    prefix: string,
    depth: number,
    inherited: HideCondition[],
  ) => {
    for (const field of fields) {
      const chain =
        field.hide === undefined ? inherited : [...inherited, { condition: field.hide, depth }]
      const children = field.components ?? []

      if (!field.path) {
        walk(children, prefix, depth, chain)
        continue
      }

      const key = prefix ? `${prefix}.${field.path}` : field.path
      conditions.set(key, [...(conditions.get(key) ?? []), chain])

      // A repeat's children are relative to its rows; other containers'
      // children have their own full paths.
      if (field.type === 'repeat') walk(children, `${key}.*`, depth + 1, chain)
      else walk(children, prefix, depth, chain)
    }
  }

  walk(components, '', 0, [])
  return conditions
}

/**
 * The hide conditions for a path, or those of the closest field that contains
 * it: `address.street` belongs to an `address` field.
 */
export function findHideConditions(
  conditions: Map<string, HideCondition[][]>,
  wildcardPath: string,
): HideCondition[][] | undefined {
  const segments = wildcardPath.split('.')
  for (let length = segments.length; length > 0; length--) {
    const found = conditions.get(segments.slice(0, length).join('.'))
    if (found) return found
  }
  return undefined
}
