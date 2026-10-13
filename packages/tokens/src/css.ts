import type { ColorRef, SemanticColors } from './semantic/colors.js'

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
