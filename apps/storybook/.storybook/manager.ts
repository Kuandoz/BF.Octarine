import { addons } from 'storybook/manager-api'
import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events'
import { managerThemes } from './themes'

// Start in the system's mode, before the preview reports the toolbar's.
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
addons.setConfig({ theme: systemDark ? managerThemes.dark : managerThemes.light })

// The sidebar and toolbar follow the Mode in the toolbar, like the stories.
addons.register('octarine/mode', (api) => {
  const follow = ({ globals }: { globals?: Record<string, unknown> }) => {
    const dark = (globals ?? api.getGlobals())?.mode === 'dark'
    api.setOptions({ theme: dark ? managerThemes.dark : managerThemes.light })
  }
  api.on(SET_GLOBALS, follow)
  api.on(GLOBALS_UPDATED, follow)
})
