import type { IconVariant } from './types.js'

/**
 * Describes a built icon set (`dist/<set>/manifest.json`). The Vite plugin reads
 * it to know which names exist and which module exports each icon. Any icon set
 * built into this shape works without changes to the plugin or components.
 */
export interface SetManifest {
  set: string
  notice: string
  /** Module per variant, relative to the manifest. */
  modules: Partial<Record<IconVariant, string>>
  /** Octarine name → export name and the variants it exists in. */
  icons: Record<string, { export: string; variants: IconVariant[] }>
}

/** Describes a built custom set (`dist/<prefix>.json`), e.g. Octarine's own icons. */
export interface CustomManifest {
  prefix: string
  /** Module, relative to the manifest. */
  module: string
  /** Icon name (`octarine:mark`) → export name. */
  icons: Record<string, string>
}
