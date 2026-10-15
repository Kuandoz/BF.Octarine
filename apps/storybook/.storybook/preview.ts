import type { Decorator, Preview } from '@storybook/vue3-vite'
import { defaultTheme, themes } from '@octarine/tokens'
import './styles.css'

/** Adds a theme's web-font stylesheet to <head> once (mirrors useTheme()). */
function loadFonts(name: string) {
  const href = themes[name as keyof typeof themes]?.fonts.href
  if (!href || document.querySelector(`link[data-octarine-fonts="${name}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.octarineFonts = name
  document.head.append(link)
}

/** Mirrors useTheme() / useColorMode(): tokens swap on <html data-theme data-mode>. */
function apply(theme: string, mode: string) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.mode = mode
  root.lang = 'en'
  loadFonts(theme)
}

const withTheme: Decorator = (story, context) => {
  apply(context.globals.theme ?? defaultTheme.name, context.globals.mode ?? 'light')
  return story()
}

apply(defaultTheme.name, 'light')

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Visual theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: Object.values(themes).map((t) => ({ value: t.name, title: t.label })),
        dynamicTitle: true,
      },
    },
    mode: {
      description: 'Light or dark mode',
      toolbar: {
        title: 'Mode',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: defaultTheme.name, mode: 'light' },
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
    controls: { expanded: true },
    options: {
      storySort: { order: ['Foundations', 'Actions', 'Forms', 'Feedback', 'Layout'] },
    },
  },
}

export default preview
