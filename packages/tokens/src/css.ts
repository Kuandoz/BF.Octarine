import { colorScales, paletteNames } from './primitives/colors.js'
import type { ColorRef, SemanticColors } from './semantic/colors.js'
import type { Theme, ThemeMode } from './theme.js'

/** Prefix for every CSS custom property emitted by the token build. */
export const prefix = 'oct'

export const cssVar = (name: string) => `--${prefix}-${name}`

export function colorRefVar(ref: ColorRef): string {
  return ref.scale === undefined
    ? `var(${cssVar(`color-${ref.palette}`)})`
    : `var(${cssVar(`color-${ref.palette}-${ref.scale}`)})`
}

/** Flattens semantic colors into `[name, ref]` pairs, e.g. `['primary-hover', …]`. */
export function flattenSemantic(colors: SemanticColors): [string, ColorRef][] {
  return Object.entries(colors).flatMap(([name, value]) =>
    'palette' in value
      ? [[name, value as ColorRef]]
      : Object.entries(value as Record<string, ColorRef>).map(
          ([variant, ref]) =>
            [variant === 'DEFAULT' ? name : `${name}-${variant}`, ref] as [string, ColorRef],
        ),
  )
}

const decl = (name: string, value: string) => `  ${cssVar(name)}: ${value};`
const ref = (name: string) => `var(${cssVar(name)})`
const color = (name: string) => (name === 'transparent' ? name : ref(`color-${name}`))

/** Declarations that don't change between light and dark. */
function themeDecls(theme: Theme): string[] {
  const c = theme.components
  return [
    ...paletteNames.flatMap((p) =>
      colorScales.map((s) => decl(`color-${p}-${s}`, theme.palette[p][s])),
    ),
    decl('font-sans', theme.fonts.sans),
    decl('font-display', theme.fonts.display),
    decl('font-mono', theme.fonts.mono),
    ...Object.entries(theme.textStyles).flatMap(([name, s]) => [
      decl(`text-${name}-family`, ref(`font-${s.family}`)),
      decl(`text-${name}-size`, s.size),
      decl(`text-${name}-leading`, s.lineHeight),
      decl(`text-${name}-weight`, String(s.weight)),
      decl(`text-${name}-tracking`, s.letterSpacing),
      decl(`text-${name}-transform`, s.uppercase ? 'uppercase' : 'none'),
    ]),
    ...Object.entries(theme.radius).map(([k, v]) => decl(`radius-${k}`, v)),
    ...Object.entries(theme.motion.duration).map(([k, v]) => decl(`duration-${k}`, v)),
    ...Object.entries(theme.motion.easing).map(([k, v]) => decl(`ease-${k}`, v)),
    ...Object.entries(c.controlHeight).map(([k, v]) => decl(`control-height-${k}`, v)),
    ...Object.entries(c.controlPaddingX).map(([k, v]) => decl(`control-px-${k}`, v)),
    decl('input-px', c.inputPaddingX),
    decl('field-gap', c.fieldGap),
    decl('card-padding', c.cardPadding),
    decl('border-width', c.borderWidth),
    ...Object.entries(c.radius).map(([k, v]) => decl(`radius-${k}`, ref(`radius-${v}`))),
    decl('button-transform', c.buttonTransform),
    decl('button-pressed-transform', c.buttonPressedTransform),
    decl('badge-transform', c.badgeTransform),
    decl('badge-tracking', c.badgeTracking),
    ...Object.entries(c.iconSize).map(([k, v]) => decl(`icon-size-${k}`, v)),
    decl('icon-stroke-width', c.iconStrokeWidth),
    decl('icon-disabled-opacity', c.iconDisabledOpacity),
  ]
}

/**
 * Declarations that change with the mode. Component tokens that point at colors
 * or shadows live here too: a custom property's `var()` resolves where it is
 * declared, so they must be re-declared wherever the colors change.
 */
function modeDecls(theme: Theme, mode: ThemeMode, scheme: 'light' | 'dark'): string[] {
  const c = theme.components
  return [
    `  color-scheme: ${scheme};`,
    ...flattenSemantic(mode.colors).map(([name, r]) => decl(`color-${name}`, colorRefVar(r))),
    ...Object.entries(mode.shadow).map(([k, v]) => decl(`shadow-${k}`, v)),
    decl('button-shadow', c.buttonShadow === 'none' ? 'none' : ref(`shadow-${c.buttonShadow}`)),
    decl('button-solid-border', color(c.buttonSolidBorder)),
    decl('card-border', color(c.cardBorder)),
    decl('card-elevated-border', color(c.cardElevatedBorder)),
    decl('card-elevated-shadow', ref(`shadow-${c.cardElevatedShadow}`)),
  ]
}

const rule = (selectors: string[], body: string[]) =>
  `${selectors.join(',\n')} {\n${body.join('\n')}\n}\n`

const darkMode = [`[data-mode='dark']`, '.dark']

/**
 * Emits one theme as CSS. A theme applies to `[data-theme='<name>']` (and to
 * `:root` for the default theme); dark mode is `[data-mode='dark']` or `.dark`,
 * on the same element, an ancestor or a descendant.
 */
export function themeToCss(theme: Theme, { isDefault = false } = {}): string {
  const scope = `[data-theme='${theme.name}']`
  const base = isDefault ? [':root', scope] : [scope]
  const dark = [
    ...(isDefault ? darkMode : []),
    ...darkMode.flatMap((d) => [`${scope}${d}`, `${scope} ${d}`, `${d} ${scope}`]),
  ]

  return [
    `/* ${theme.label}: ${theme.description} */`,
    rule(base, [...themeDecls(theme), ...modeDecls(theme, theme.light, 'light')]),
    rule(dark, modeDecls(theme, theme.dark, 'dark')),
  ].join('\n')
}
