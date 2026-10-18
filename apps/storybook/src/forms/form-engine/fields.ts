import type { ComponentRegistry } from '../../../../../packages/form-engine/src'
import CheckboxField from './CheckboxField.vue'
import GroupField from './GroupField.vue'
import RepeatField from './RepeatField.vue'
import TextField from './TextField.vue'

/** The field components the stories register, by `type`. */
export const fields: ComponentRegistry = {
  text: TextField,
  checkbox: CheckboxField,
  group: GroupField,
  repeat: RepeatField,
}
