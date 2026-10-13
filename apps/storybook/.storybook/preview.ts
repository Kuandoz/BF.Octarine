import type { Decorator, Preview } from '@storybook/vue3-vite'
import './styles.css'

/** Mirrors useTheme(): the semantic tokens swap on <html data-theme>. */
const withTheme: Decorator = (story, context) => {
  document.documentElement.dataset.theme = context.globals.theme ?? 'light'
  return story()
}

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
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
