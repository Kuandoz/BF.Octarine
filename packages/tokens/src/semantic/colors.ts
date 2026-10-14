import type { ColorPalette, ColorScale } from '../primitives/colors.js'

/**
 * A reference to a primitive color, e.g. `ref('brand', 600)` or `ref('white')`.
 * Semantic tokens only ever point at primitives — never at raw values — so a
 * palette change flows through the whole system.
 */
export type ColorRef =
  { palette: ColorPalette; scale: ColorScale } | { palette: 'white' | 'black'; scale?: undefined }

export function ref(palette: 'white' | 'black'): ColorRef
export function ref(palette: ColorPalette, scale: ColorScale): ColorRef
export function ref(palette: ColorPalette | 'white' | 'black', scale?: ColorScale): ColorRef {
  return { palette, scale } as ColorRef
}

type Intent = {
  /** Solid fill (buttons, badges). */
  DEFAULT: ColorRef
  hover: ColorRef
  /** Text/icon color on top of the solid fill. */
  fg: ColorRef
  /** Low-emphasis tinted background (alerts, soft badges). */
  subtle: ColorRef
  /** Text color on top of `subtle`. */
  'subtle-fg': ColorRef
}

export type SemanticColors = {
  canvas: ColorRef
  surface: ColorRef
  'surface-raised': ColorRef
  'surface-sunken': ColorRef
  fg: ColorRef
  'fg-muted': ColorRef
  'fg-subtle': ColorRef
  'fg-inverse': ColorRef
  border: ColorRef
  'border-strong': ColorRef
  ring: ColorRef
  primary: Intent
  neutral: Intent
  danger: Intent
  warning: Intent
  success: Intent
  info: Intent
}

export const intents = ['primary', 'neutral', 'danger', 'warning', 'success', 'info'] as const
export type IntentName = (typeof intents)[number]

const intentLight = (palette: ColorPalette, solid: ColorScale = 600): Intent => ({
  DEFAULT: ref(palette, solid),
  hover: ref(palette, (solid + 100) as ColorScale),
  fg: ref('white'),
  subtle: ref(palette, 100),
  'subtle-fg': ref(palette, 800),
})

const intentDark = (palette: ColorPalette, solid: ColorScale = 500): Intent => ({
  DEFAULT: ref(palette, solid),
  hover: ref(palette, (solid - 100) as ColorScale),
  fg: ref(palette, 950),
  subtle: ref(palette, 950),
  'subtle-fg': ref(palette, 200),
})

export const light: SemanticColors = {
  canvas: ref('neutral', 50),
  surface: ref('white'),
  'surface-raised': ref('white'),
  'surface-sunken': ref('neutral', 100),
  fg: ref('neutral', 900),
  'fg-muted': ref('neutral', 600),
  'fg-subtle': ref('neutral', 500),
  'fg-inverse': ref('white'),
  // Decorative dividers only; exempt from contrast rules.
  border: ref('neutral', 200),
  // Boundaries that identify a control (inputs, outline buttons): ≥ 3:1 (WCAG 1.4.11).
  'border-strong': ref('neutral', 500),
  ring: ref('brand', 500),
  primary: intentLight('brand'),
  neutral: { ...intentLight('neutral', 800), subtle: ref('neutral', 100) },
  danger: intentLight('red'),
  // amber-500 is under 3:1 on white, so the fill uses 600; hover lightens to keep amber-950 text legible.
  warning: { ...intentLight('amber', 600), hover: ref('amber', 500), fg: ref('amber', 950) },
  success: intentLight('green', 700),
  info: intentLight('blue'),
}

export const dark: SemanticColors = {
  canvas: ref('neutral', 950),
  surface: ref('neutral', 900),
  'surface-raised': ref('neutral', 800),
  'surface-sunken': ref('black'),
  fg: ref('neutral', 50),
  'fg-muted': ref('neutral', 300),
  'fg-subtle': ref('neutral', 400),
  'fg-inverse': ref('neutral', 950),
  border: ref('neutral', 800),
  'border-strong': ref('neutral', 500),
  ring: ref('brand', 400),
  primary: intentDark('brand', 400),
  neutral: { ...intentDark('neutral', 200), subtle: ref('neutral', 800) },
  danger: intentDark('red', 400),
  warning: intentDark('amber', 400),
  success: intentDark('green'),
  info: intentDark('blue', 400),
}

export const semanticColors = { light, dark } as const
