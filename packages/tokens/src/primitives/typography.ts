/**
 * Raw type scale, shared by every theme. Themes define their own fonts and text
 * styles (`../themes`); these back the plain `text-sm`, `font-bold`, … utilities.
 */

/** Modular type scale (~1.2 ratio), in rem. */
export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
  '6xl': '3.75rem',
} as const

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const

export const lineHeight = {
  none: '1',
  tight: '1.2',
  snug: '1.35',
  normal: '1.5',
  relaxed: '1.65',
} as const

export const letterSpacing = {
  tighter: '-0.03em',
  tight: '-0.015em',
  normal: '0em',
  wide: '0.04em',
} as const
