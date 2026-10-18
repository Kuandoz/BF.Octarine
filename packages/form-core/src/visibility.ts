import type { ConditionValue, FieldDefinition } from '@octarine/form-abstractions'

/** A `hide`, `disabled` or `readonly` condition, and how many repeat rows deep it is evaluated (0: the whole model). */
export interface FieldCondition {
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
): Map<string, FieldCondition[][]> {
  return collectConditions(components, ['hide'])
}

/**
 * Like collectHideConditions, for what keeps a person from changing a value:
 * `disabled` and `readonly`, on the field or a container (a disabled
 * fieldset disables what is inside it).
 */
export function collectLockConditions(
  components: FieldDefinition[],
): Map<string, FieldCondition[][]> {
  return collectConditions(components, ['disabled', 'readonly'])
}

function collectConditions(
  components: FieldDefinition[],
  keys: ReadonlyArray<'hide' | 'disabled' | 'readonly'>,
): Map<string, FieldCondition[][]> {
  const conditions = new Map<string, FieldCondition[][]>()
  walkFields(components, keys, (key, field, depth, chain) => {
    conditions.set(key, [...(conditions.get(key) ?? []), chain])
  })
  return conditions
}

/**
 * The first field that renders each path, in screen order, keyed like
 * collectHideConditions. For what is said about a path, like its label.
 */
export function collectFields(components: FieldDefinition[]): Map<string, FieldDefinition> {
  const fields = new Map<string, FieldDefinition>()
  walkFields(components, [], (key, field) => {
    if (!fields.has(key)) fields.set(key, field)
  })
  return fields
}

/**
 * The entry for a path, or that of the closest field that contains it:
 * `address.street` belongs to an `address` field.
 */
export function findClosest<T>(entries: Map<string, T>, wildcardPath: string): T | undefined {
  const segments = wildcardPath.split('.')
  for (let length = segments.length; length > 0; length--) {
    const found = entries.get(segments.slice(0, length).join('.'))
    if (found !== undefined) return found
  }
  return undefined
}

// Visits every field that has a path, in screen order, with its full
// wildcard path, its repeat depth and the conditions (`keys`) on the way to
// it.
function walkFields(
  components: FieldDefinition[],
  keys: ReadonlyArray<'hide' | 'disabled' | 'readonly'>,
  visit: (key: string, field: FieldDefinition, depth: number, chain: FieldCondition[]) => void,
): void {
  const walk = (
    fields: FieldDefinition[],
    prefix: string,
    depth: number,
    inherited: FieldCondition[],
  ) => {
    for (const field of fields) {
      const chain = [...inherited]
      for (const key of keys) {
        const condition = field[key]
        if (condition !== undefined) chain.push({ condition, depth })
      }
      const children = field.components ?? []

      if (!field.path) {
        walk(children, prefix, depth, chain)
        continue
      }

      const key = prefix ? `${prefix}.${field.path}` : field.path
      visit(key, field, depth, chain)

      // A repeat's children are relative to its rows; other containers'
      // children have their own full paths.
      if (field.type === 'repeat') walk(children, `${key}.*`, depth + 1, chain)
      else walk(children, prefix, depth, chain)
    }
  }
  walk(components, '', 0, [])
}
