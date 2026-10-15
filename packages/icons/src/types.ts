/**
 * Icon styles. Heroicons draws `outline` (24px, stroked), `solid` (24px),
 * `mini` (20px, solid) and `micro` (16px, solid). Another icon set maps its own
 * styles onto these names, so templates never change when the set does.
 */
export const iconVariants = ['outline', 'solid', 'mini', 'micro'] as const
export type IconVariant = (typeof iconVariants)[number]

export const defaultIconVariant: IconVariant = 'outline'

/** An SVG element as plain data: tag, attributes and children. */
export type IconNode = [tag: string, attrs: Record<string, string>, children?: IconNode[]]

/**
 * An icon as data. It is rendered by a framework layer (e.g. `OIcon`), never by
 * parsing a string at runtime, so it is safe for SSR and needs no `innerHTML`.
 */
export interface IconDefinition {
  /** Octarine name, e.g. `trash` or `octarine:mark`. */
  name: string
  viewBox: string
  /** Attributes for the root `<svg>` (other than `viewBox`). */
  attrs?: Record<string, string>
  nodes: IconNode[]
  /** Keeps its own colors, so an intent color does not apply. */
  multicolor?: boolean
  /** Uses `id`s (gradients, masks), which are made unique per rendered instance. */
  ids?: boolean
}

/** Icons by key: `name/variant` for set icons, `prefix:name` for custom icons. */
export type IconRegistry = Readonly<Record<string, IconDefinition>>

/**
 * Augmented by the declaration file the Vite plugin generates, so `name` only
 * accepts icons that exist:
 *
 *   declare module '@octarine/icons' {
 *     interface IconNameRegister { name: 'trash' | 'octarine:mark' | … }
 *   }
 */
export interface IconNameRegister {}

export type IconName = IconNameRegister extends { name: infer N extends string } ? N : string

/** Custom icons are namespaced (`octarine:mark`) and have a single variant. */
export const isCustomIcon = (name: string) => name.includes(':')

/** The registry key for an icon: `trash/solid`, or `octarine:mark` for custom icons. */
export function iconKey(name: string, variant: IconVariant = defaultIconVariant): string {
  return isCustomIcon(name) ? name : `${name}/${variant}`
}

/** Identity helper that type-checks a hand-written icon. */
export function defineIcon(icon: IconDefinition): IconDefinition {
  return icon
}
