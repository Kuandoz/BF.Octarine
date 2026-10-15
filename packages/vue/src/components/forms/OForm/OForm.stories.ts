import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import OButton from '../../actions/OButton/OButton.vue'
import OField from '../OField/OField.vue'
import OInput from '../OInput/OInput.vue'
import OForm from './OForm.vue'

/**
 * A `<form>` that decides how its fields are marked and which language
 * Octarine's own text uses (its `lang`, else `<html lang>`, set by the
 * **Language** toolbar here). With `*` markers it explains the star, but only
 * when a field shows one.
 */
const meta = {
  title: 'Forms/Form',
  component: OForm,
  argTypes: {
    markers: { control: 'inline-radio', options: ['required', 'optional', 'both'] },
    lang: { control: 'select', options: [undefined, 'en', 'nl', 'fr', 'de'] },
  },
  args: { markers: 'required' },
  render: (args) => ({
    components: { OButton, OField, OForm, OInput },
    setup: () => ({ args, name: ref(''), email: ref(''), site: ref('') }),
    template: `
      <OForm v-bind="args" class="max-w-sm" @submit.prevent>
        <OField label="Name" required>
          <OInput v-model="name" autocomplete="name" />
        </OField>
        <OField label="Email" hint="For the invoice." required>
          <OInput v-model="email" type="email" autocomplete="email" />
        </OField>
        <OField label="Website">
          <OInput v-model="site" type="url" prefix="https://" />
        </OField>
        <OButton type="submit" class="self-start">Save</OButton>
      </OForm>
    `,
  }),
} satisfies Meta<typeof OForm>

export default meta
type Story = StoryObj<typeof meta>

export const RequiredMarkers: Story = {}
export const OptionalMarkers: Story = { args: { markers: 'optional' } }
export const BothMarkers: Story = { args: { markers: 'both' } }

/** A form in another language than the page: `<OForm lang="fr">`. */
export const OwnLanguage: Story = {
  args: { markers: 'both', lang: 'fr' },
  render: (args) => ({
    components: { OButton, OField, OForm, OInput },
    setup: () => ({ args, name: ref(''), bio: ref('') }),
    template: `
      <OForm v-bind="args" class="max-w-sm" @submit.prevent>
        <OField label="Nom" required>
          <OInput v-model="name" autocomplete="name" />
        </OField>
        <OField label="Biographie" :max-length="40" error="La biographie est trop longue.">
          <OInput v-model="bio" clearable />
        </OField>
        <OButton type="submit" class="self-start">Enregistrer</OButton>
      </OForm>
    `,
  }),
}
