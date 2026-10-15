import type { Palette } from './primitives/colors.js'
import type { SemanticColorName, SemanticColors } from './semantic/colors.js'
import type { TextStyle, TextStyleName } from './semantic/typography.js'

export const radiusNames = ['none', 'sm', 'md', 'lg', 'xl', '2xl', 'full'] as const
export const shadowNames = ['xs', 'sm', 'md', 'lg', 'xl'] as const
export const controlSizes = ['sm', 'md', 'lg'] as const

export type RadiusName = (typeof radiusNames)[number]
export type ShadowName = (typeof shadowNames)[number]
export type ControlSize = (typeof controlSizes)[number]

/** Everything that changes between light and dark. */
export type ThemeMode = {
  colors: SemanticColors
  shadow: Record<ShadowName, string>
}

/**
 * Per-theme component decisions: density, corner shapes and border treatment.
 * Colors refer to semantic names, so they follow light/dark automatically.
 */
export type ComponentTokens = {
  controlHeight: Record<ControlSize, string>
  controlPaddingX: Record<ControlSize, string>
  inputPaddingX: string
  /** Gap between a field's label, hint, control and messages. */
  fieldGap: string
  /** Padding of a `padding="md"` card. */
  cardPadding: string
  borderWidth: string
  radius: Record<'control' | 'input' | 'card' | 'badge', RadiusName>
  buttonTransform: 'none' | 'uppercase'
  buttonShadow: ShadowName | 'none'
  buttonSolidBorder: SemanticColorName | 'transparent'
  badgeTransform: 'none' | 'uppercase'
  badgeTracking: string
  cardBorder: SemanticColorName
  cardElevatedBorder: SemanticColorName | 'transparent'
  cardElevatedShadow: ShadowName
  /** Icon sizes for `size="sm|md|lg"`; an icon without a size follows the font size (1em). */
  iconSize: Record<ControlSize, string>
  /** Stroke width of outline icons, in 24-unit icon space (Heroicons draws at 1.5). */
  iconStrokeWidth: string
  /** Opacity of a disabled-looking icon (on top of a grayscale filter). */
  iconDisabledOpacity: string
}

/**
 * A complete, pluggable visual style. Every theme fills exactly the same token
 * names, so components work unchanged under any of them; the build emits one
 * CSS file per theme, activated with `data-theme="<name>"`.
 */
export type Theme = {
  name: string
  label: string
  description: string
  fonts: {
    sans: string
    display: string
    mono: string
    /** Stylesheet that loads the fonts (Google Fonts). Apps add it themselves. */
    href?: string
  }
  palette: Palette
  light: ThemeMode
  dark: ThemeMode
  textStyles: Record<TextStyleName, TextStyle>
  radius: Record<RadiusName, string>
  motion: {
    duration: Record<'fast' | 'normal' | 'slow', string>
    easing: Record<'standard' | 'enter' | 'exit', string>
  }
  components: ComponentTokens
}
