import type { App, Plugin } from 'vue'
import * as components from './components'

/**
 * Optional global registration: `app.use(Octarine)`. Prefer named imports for
 * tree-shaking; this is a convenience for prototypes.
 */
export const Octarine: Plugin = {
  install(app: App) {
    for (const [name, component] of Object.entries(components)) {
      app.component(name, component)
    }
  },
}
