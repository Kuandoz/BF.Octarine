import type { FieldDefinition } from './types'

export const fieldWidths = ['full', 'half', 'third'] as const
export type FieldWidth = (typeof fieldWidths)[number]

/**
 * The width a field asks for with `layout: { width }`. Anything else is full
 * width. `layout.css` turns it into grid columns, and only once the form is
 * wide enough: on a narrow screen every field takes the full width.
 */
export function fieldWidth(field: FieldDefinition): FieldWidth {
  const width = (field.layout as { width?: unknown } | undefined)?.width
  return fieldWidths.includes(width as FieldWidth) ? (width as FieldWidth) : 'full'
}
