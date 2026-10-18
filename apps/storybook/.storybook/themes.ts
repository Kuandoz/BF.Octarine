import { create } from 'storybook/theming'

export type Mode = 'light' | 'dark'

const brand = {
  brandTitle: 'Octarine',
  brandTarget: '_self',
}

/** Storybook's own UI (sidebar, toolbar), following the toolbar's mode. */
export const managerThemes = {
  light: create({ base: 'light', ...brand, brandImage: './brand/octarine-logo-light.svg' }),
  dark: create({ base: 'dark', ...brand, brandImage: './brand/octarine-logo-dark.svg' }),
} satisfies Record<Mode, ReturnType<typeof create>>

/** The docs pages; the story previews on them use Octarine's canvas (styles.css). */
export const docsThemes = {
  light: create({ base: 'light' }),
  dark: create({ base: 'dark' }),
} satisfies Record<Mode, ReturnType<typeof create>>
