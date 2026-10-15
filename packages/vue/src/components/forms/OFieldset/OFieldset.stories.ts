import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import OField from '../OField/OField.vue'
import OInput from '../OInput/OInput.vue'
import OFieldset from './OFieldset.vue'

/**
 * Groups controls that share one question, with a `<legend>` instead of a
 * label: inputs split into parts, radio buttons, checkboxes. Each control keeps
 * its own label; invalid and disabled apply to all of them.
 */
const meta = {
  title: 'Forms/Fieldset',
  component: OFieldset,
  args: {
    legend: 'Date of birth',
    hint: 'For example, 27 3 1990',
    required: false,
    disabled: false,
  },
  render: (args) => ({
    components: { OField, OFieldset, OInput },
    setup: () => ({ args, day: ref(''), month: ref(''), year: ref('') }),
    template: `
      <OFieldset v-bind="args">
        <div class="flex flex-wrap gap-4">
          <OField label="Day" class="w-20">
            <OInput v-model="day" inputmode="numeric" autocomplete="bday-day" />
          </OField>
          <OField label="Month" class="w-20">
            <OInput v-model="month" inputmode="numeric" autocomplete="bday-month" />
          </OField>
          <OField label="Year" class="w-28">
            <OInput v-model="year" inputmode="numeric" autocomplete="bday-year" />
          </OField>
        </div>
      </OFieldset>
    `,
  }),
} satisfies Meta<typeof OFieldset>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Required: Story = { args: { required: true } }
export const WithError: Story = { args: { error: 'Date of birth must be a real date.' } }
export const Disabled: Story = { args: { disabled: true } }
