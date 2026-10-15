export type FieldWidth = 'full' | 'half' | 'third'

// A row container using `gap-4` (1rem) — kept in sync with FormComponent's
// template class so a field's flex-basis
// actually adds up to 100% per row. flex-wrap does the actual row-packing —
// a fixed, non-growing/non-shrinking basis per field is all that's needed
// for the browser's own line-breaking to reproduce it, no bucketing required.
export function widthBasis(width: FieldWidth | undefined): string {
  if (width === 'half') return 'calc(50% - 0.5rem)'
  if (width === 'third') return 'calc(33.3333% - 0.6667rem)'
  return '100%'
}
