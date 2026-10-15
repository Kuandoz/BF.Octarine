import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import OInput from '../OInput/OInput.vue'
import OField from './OField.vue'

/**
 * Label, hint, control, error and counter, wired together. The hint sits above
 * the control; an error is shown below it, as well as the hint. Octarine's own
 * text ("(optional)", "Error:", the counter) follows the **Language** toolbar.
 */
const meta = {
  title: 'Forms/Field',
  component: OField,
  argTypes: {
    markers: { control: 'inline-radio', options: [undefined, 'required', 'optional', 'both'] },
  },
  args: {
    label: 'Email address',
    hint: 'We will never share your email.',
    required: false,
    disabled: false,
  },
  render: (args) => ({
    components: { OField, OInput },
    setup: () => ({ args, value: ref('') }),
    template: `
      <OField v-bind="args" class="max-w-sm">
        <OInput v-model="value" type="email" autocomplete="email" />
      </OField>
    `,
  }),
} satisfies Meta<typeof OField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Required: Story = { args: { required: true } }
export const Optional: Story = { args: { markers: 'optional' } }
export const WithError: Story = { args: { error: 'Enter an email address like name@example.com.' } }
export const Disabled: Story = { args: { disabled: true } }

export const WithLabelAction: Story = {
  args: { label: 'Password', hint: undefined },
  render: (args) => ({
    components: { OField, OInput },
    setup: () => ({ args, value: ref('') }),
    template: `
      <OField v-bind="args" class="max-w-sm">
        <template #label-action>
          <a href="#reset" class="focus-ring rounded-control text-body-sm text-primary underline">Forgot password?</a>
        </template>
        <OInput v-model="value" type="password" autocomplete="current-password" />
      </OField>
    `,
  }),
}

/** The count is visual; screen readers hear the limit, and a polite update near it. */
export const WithCounter: Story = {
  args: { label: 'Bio', hint: 'Shown on your public profile.', maxLength: 60 },
  render: (args) => ({
    components: { OField, OInput },
    setup: () => ({ args, value: ref('Builds design systems and drinks coffee.') }),
    template: `
      <OField v-bind="args" class="max-w-sm">
        <OInput v-model="value" />
      </OField>
    `,
  }),
}
