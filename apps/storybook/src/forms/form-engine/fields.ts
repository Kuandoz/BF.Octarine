import { createForms, defineField } from '../../../../../packages/form-engine/src'
import CheckboxField from './CheckboxField.vue'
import GroupField from './GroupField.vue'
import RepeatField from './RepeatField.vue'
import TextField from './TextField.vue'

/** The forms setup the stories use: Octarine-styled field types, by `type`. */
export const forms = createForms({
  fields: [
    defineField({ type: 'text', component: TextField }),
    defineField({ type: 'checkbox', component: CheckboxField }),
    defineField({ type: 'group', component: GroupField }),
    defineField({ type: 'repeat', component: RepeatField, rows: true }),
  ],
})
