/**
 * Named text styles. Every theme defines all of them; components and the
 * `text-heading-1`, `text-body`, … utilities use these instead of combining
 * size, weight and leading by hand.
 */
export const textStyleNames = [
  'display',
  'heading-1',
  'heading-2',
  'heading-3',
  'heading-4',
  'body-lg',
  'body',
  'body-sm',
  'label',
  'caption',
  'overline',
  'code',
] as const

export type TextStyleName = (typeof textStyleNames)[number]

export type TextStyle = {
  family: 'sans' | 'display' | 'mono'
  /** rem */
  size: string
  /** CSS line-height: a length (rem) or a unitless multiplier. */
  lineHeight: string
  weight: number
  letterSpacing: string
  uppercase?: boolean
}
