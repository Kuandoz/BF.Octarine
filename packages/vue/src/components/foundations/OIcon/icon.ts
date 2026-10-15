import type { IconDefinition, IconName, IconVariant } from '@octarine/icons'
import { cva } from '../../../utils/variants'

export const iconIntents = ['primary', 'neutral', 'danger', 'warning', 'success', 'info'] as const
export type IconIntent = (typeof iconIntents)[number]

export const iconSizes = ['sm', 'md', 'lg'] as const
export type IconSize = (typeof iconSizes)[number]

/** Placement inside `OIconLayers`, in its 24-unit space, around the center. */
export interface IconTransform {
  /** 1 is full size. */
  scale?: number
  /** Offset in 24-unit layer space. */
  x?: number
  y?: number
  /** Degrees, clockwise. */
  rotate?: number
  flipX?: boolean
  flipY?: boolean
}

export interface OIconProps {
  /** Icon name from the registry: `trash`, `octarine:mark`, … */
  name?: IconName
  /** An imported icon, used instead of `name` (no registry needed). */
  icon?: IconDefinition
  /** Default: `outline`. Custom icons have a single variant and ignore this. */
  variant?: IconVariant
  /** Colors the icon; without it the icon uses the text color. Multi-color icons ignore it. */
  intent?: IconIntent
  /** Default: 1em, so the icon follows the font size. */
  size?: IconSize
  /** Disabled look. The parent control must convey the disabled state itself. */
  disabled?: boolean
  /** Accessible name. Without it the icon is decorative and hidden from assistive tech. */
  label?: string
  /** Only inside `OIconLayers`. */
  transform?: IconTransform
}

/**
 * An icon handed to another component (`<OButton icon="trash">`): a name, an
 * imported icon, or a full set of `OIcon` props.
 */
export type IconProp = IconName | IconDefinition | OIconProps

export function normalizeIcon(icon: IconProp | undefined): OIconProps | undefined {
  if (!icon) return undefined
  if (typeof icon === 'string') return { name: icon }
  if ('nodes' in icon) return { icon }
  return icon
}

export function transformAttribute(t: IconTransform | undefined): string | undefined {
  if (!t) return undefined
  const scale = t.scale ?? 1
  const sx = scale * (t.flipX ? -1 : 1)
  const sy = scale * (t.flipY ? -1 : 1)
  return `translate(${12 + (t.x ?? 0)} ${12 + (t.y ?? 0)}) rotate(${t.rotate ?? 0}) scale(${sx} ${sy}) translate(-12 -12)`
}

/** Shown (dashed square) when a name isn't registered, so the gap is visible. */
export const missingIcon: IconDefinition = {
  name: 'missing',
  viewBox: '0 0 24 24',
  attrs: { fill: 'none', stroke: 'currentColor', 'stroke-dasharray': '3 2' },
  nodes: [['rect', { x: '3.5', y: '3.5', width: '17', height: '17', rx: '2' }]],
}

const warned = new Set<string>()

/** Warns once per missing key (or once for an icon without `name` or `icon`). */
export function warnMissing(key: string | undefined) {
  if (warned.has(key ?? '')) return
  warned.add(key ?? '')
  console.warn(
    key
      ? `[OIcon] "${key}" is not registered. Write the name out in full so the octarine-icons Vite plugin finds it, or add it to its safelist.`
      : '[OIcon] needs a `name` or an `icon`.',
  )
}

/** Shared by `OIcon` and `OIconLayers`. */
export const iconClasses = cva('', {
  variants: {
    layer: {
      false: 'icon',
      true: '',
    },
    intent: {
      primary: 'text-primary',
      neutral: 'text-neutral',
      danger: 'text-danger',
      // `warning` can't reach 3:1 on light surfaces; its text color can.
      warning: 'text-warning-subtle-fg',
      success: 'text-success',
      info: 'text-info',
    },
    size: {
      sm: 'icon-sm',
      md: 'icon-md',
      lg: 'icon-lg',
    },
    disabled: {
      true: 'icon-disabled',
    },
  },
})
