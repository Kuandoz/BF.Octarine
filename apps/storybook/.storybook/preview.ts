import { setup, type Decorator, type Preview } from '@storybook/vue3-vite'
import { defaultTheme, themes } from '@octarine/tokens'
import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events'
import { addons } from 'storybook/preview-api'
import { createIcons } from '../../../packages/vue/src'
import icons from 'virtual:octarine-icons'
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
function apply(theme: string, mode: string, language = 'en') {
  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.mode = mode
  root.lang = language
  loadFonts(theme)
}

const withTheme: Decorator = (story, context) => {
  apply(
    context.globals.theme ?? defaultTheme.name,
    context.globals.mode ?? 'light',
    context.globals.language,
  )
  return story()
}

apply(defaultTheme.name, 'light')

// Docs-only pages (MDX without stories) never run decorators, so follow the
// toolbar directly as well.
const followGlobals = ({ globals }: { globals: Record<string, string | undefined> }) =>
  apply(globals.theme ?? defaultTheme.name, globals.mode ?? 'light', globals.language)
const channel = addons.getChannel()
channel.on(SET_GLOBALS, followGlobals)
channel.on(GLOBALS_UPDATED, followGlobals)

// Icons the stories use, found by the octarine-icons Vite plugin.
setup((app) => {
  app.use(createIcons(icons))
})

const preview: Preview = {
  // Every component gets a docs page with its props, from its doc comments.
  tags: ['autodocs'],
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
    language: {
      description: 'Language of the text Octarine adds (<html lang>)',
      toolbar: {
        title: 'Language',
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'nl', title: 'Nederlands' },
          { value: 'fr', title: 'Français' },
          { value: 'de', title: 'Deutsch' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: defaultTheme.name, mode: 'light', language: 'en' },
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
    controls: { expanded: true },
    options: {
      storySort: {
        order: [
          'Introduction',
          'Packages',
          [
            'Tokens',
            'Tailwind',
            'Icons',
            'Vue components',
            'Form abstractions',
            'Form core',
            'Form engine',
          ],
          'Foundations',
          'Actions',
          'Forms',
          'Feedback',
          'Layout',
        ],
      },
    },
  },
}

export default preview
