import { colors } from './primitives/colors.js'
import type { ColorRef } from './semantic/colors.js'

/** Resolves a semantic color reference to its primitive OKLCH value. */
export function resolveColor(ref: ColorRef): string {
  return ref.scale === undefined ? colors[ref.palette] : colors[ref.palette][ref.scale]
}

/** WCAG relative luminance of an `oklch(L% C H)` color, via OKLab → linear sRGB. */
export function relativeLuminance(oklch: string): number {
  const match = oklch.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)/)
  if (!match) throw new Error(`Unsupported color: ${oklch}`)
  const L = Number(match[1]) / 100
  const C = Number(match[2])
  const h = (Number(match[3]) * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3

  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const r = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)
  const g = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)
  const bl = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl
}

/** WCAG 2.x contrast ratio between two colors (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ]
  return (hi + 0.05) / (lo + 0.05)
}
