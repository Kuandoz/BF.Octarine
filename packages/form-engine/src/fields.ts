import type { Component } from 'vue'

import type { JsonSchema } from './types'

/** A field type: what a form's `type: '...'` renders, and what it accepts. */
export interface FieldType {
  type: string
  // Gets the field's definition as its `field` prop; see useField.
  component: Component
  // The field's `components` are the fields of each row, at `<path>.<index>`
  // (a list with Add/Remove). The rules are then expanded per row.
  rows?: boolean
  // The field's own properties (`maxLength`, `options`, …) as the
  // properties of an object schema, for editors and the definition schema.
  schema?: JsonSchema
}

/**
 * Declares a field type for `createForms({ fields })`.
 *
 * ```ts
 * defineField({ type: 'text', component: TextField, schema: { properties: { maxLength: { type: 'integer' } } } })
 * defineField({ type: 'travellers', component: TravellersField, rows: true })
 * ```
 */
export function defineField(definition: FieldType): FieldType {
  return definition
}
