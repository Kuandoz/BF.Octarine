import type { IconRegistry } from '@octarine/icons'
import type { InjectionKey, Plugin } from 'vue'

export const iconsKey: InjectionKey<IconRegistry> = Symbol('octarine-icons')

/** Set by `OIconLayers` so its `OIcon` children render as layers. */
export const iconLayerKey: InjectionKey<true> = Symbol('octarine-icon-layer')

/**
 * Makes icons available to `<OIcon name="…">`. Pass the registry the Vite plugin
 * generates from the icons your source uses:
 *
 *   import icons from 'virtual:octarine-icons'
 *   app.use(createIcons(icons))
 */
export function createIcons(icons: IconRegistry): Plugin {
  return {
    install(app) {
      app.provide(iconsKey, icons)
    },
  }
}
