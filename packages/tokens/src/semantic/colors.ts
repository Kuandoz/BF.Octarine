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

export type Intent = {
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
  /** Decorative dividers only; exempt from contrast rules. */
  border: ColorRef
  /** Boundaries that identify a control (inputs, outline buttons): ≥ 3:1 (WCAG 1.4.11). */
  'border-strong': ColorRef
  ring: ColorRef
  primary: Intent
  neutral: Intent
  danger: Intent
  warning: Intent
  success: Intent
  info: Intent
}

/** A flattened semantic color name: `surface`, `primary`, `primary-hover`, … */
export type SemanticColorName = Exclude<keyof SemanticColors, IntentName> | IntentColorName

export const intents = ['primary', 'neutral', 'danger', 'warning', 'success', 'info'] as const
export type IntentName = (typeof intents)[number]
type IntentColorName = IntentName | `${IntentName}-${Exclude<keyof Intent, 'DEFAULT'>}`
