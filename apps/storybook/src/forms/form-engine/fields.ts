import de from '@octarine/i18n/locales/de.json'
import fr from '@octarine/i18n/locales/fr.json'
import nl from '@octarine/i18n/locales/nl.json'
import { createForms, defineField } from '../../../../../packages/form-engine/src'
import CheckboxField from './CheckboxField.vue'
import GroupField from './GroupField.vue'
import RepeatField from './RepeatField.vue'
import TextField from './TextField.vue'

/**
 * The forms setup the stories use: Octarine-styled field types, by `type`, and
 * the languages of the toolbar for the error messages.
 */
export const forms = createForms({
  fields: [
    defineField({ type: 'text', component: TextField }),
    defineField({ type: 'checkbox', component: CheckboxField }),
    defineField({ type: 'group', component: GroupField }),
    defineField({ type: 'repeat', component: RepeatField, rows: true }),
  ],
  messages: { nl, fr, de },
})
