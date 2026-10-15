import { textStyleNames } from '@octarine/tokens'
import { cx } from 'class-variance-authority'
import { extendTailwindMerge } from 'tailwind-merge'

export { cva, type VariantProps } from 'class-variance-authority'

/**
 * tailwind-merge only knows Tailwind's default scale; teach it our text styles so
 * `text-heading-1` is treated as a font size (not a color) and merges correctly,
 * plus the component radius and shadow names (`rounded-control`, `shadow-card`).
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [...textStyleNames],
      radius: ['control', 'input', 'card', 'badge'],
      shadow: ['control', 'card'],
    },
  },
})

/** Joins class values and resolves Tailwind conflicts (last one wins). */
export function cn(...inputs: Parameters<typeof cx>): string {
  return twMerge(cx(...inputs))
}
