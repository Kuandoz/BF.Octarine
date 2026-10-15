/**
 * Color primitives shared by every theme. Each theme supplies its own values for
 * these palettes (see `../themes`); only pure white and black are global.
 *
 * Values are OKLCH so scales stay perceptually even across hues.
 */
export const baseColors = {
  white: 'oklch(100% 0 0)',
  black: 'oklch(0% 0 0)',
} as const

export const paletteNames = ['brand', 'neutral', 'red', 'amber', 'green', 'blue'] as const
export const colorScales = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

export type ColorPalette = (typeof paletteNames)[number]
export type ColorScale = (typeof colorScales)[number]

/** One full set of primitive scales: `palette.brand[500]`. */
export type Palette = Record<ColorPalette, Record<ColorScale, string>>
