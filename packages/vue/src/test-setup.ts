import de from '@octarine/i18n/locales/de.json'
import fr from '@octarine/i18n/locales/fr.json'
import nl from '@octarine/i18n/locales/nl.json'
import { config } from '@vue/test-utils'

import { createMessages } from './composables/useMessages'

// Every spec mounts with the languages an app would import, as Storybook does.
config.global.plugins = [createMessages({ nl, fr, de })]
