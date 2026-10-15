import type { IconVariant } from '../../src/types.js'

/**
 * Builds an icon set from an Iconify JSON package. To switch or add a set, add a
 * source like this one: it maps the vendor's names onto Octarine names and
 * variants, so templates keep working.
 */
export interface IconSetSource {
  id: string
  /** Package path of the Iconify JSON. */
  json: string
  /** Maps a vendor icon name to an Octarine name and variant; `null` skips it. */
  map(name: string): { name: string; variant: IconVariant } | null
  /** Stroke width per variant that becomes the theme's `--oct-icon-stroke-width`. */
  themeStroke?: Partial<Record<IconVariant, string>>
}

const suffixes: [suffix: string, variant: IconVariant][] = [
  ['-16-solid', 'micro'],
  ['-20-solid', 'mini'],
  ['-solid', 'solid'],
]

export const heroicons: IconSetSource = {
  id: 'heroicons',
  json: '@iconify-json/heroicons/icons.json',
  map(name) {
    for (const [suffix, variant] of suffixes) {
      if (name.endsWith(suffix)) return { name: name.slice(0, -suffix.length), variant }
    }
    return { name, variant: 'outline' }
  },
  themeStroke: { outline: '1.5' },
}
