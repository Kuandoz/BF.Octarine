import { addons } from 'storybook/manager-api'
import { create } from 'storybook/theming'

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Octarine',
    brandImage: './brand/octarine-logo-light.svg',
    brandTarget: '_self',
  }),
})
