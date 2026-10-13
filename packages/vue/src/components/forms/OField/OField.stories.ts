import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import OInput from '../OInput/OInput.vue'
import OField from './OField.vue'

const meta = {
  title: 'Forms/Field',
  component: OField,
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
        <OInput v-model="value" type="email" placeholder="you@example.com" />
      </OField>
    `,
  }),
} satisfies Meta<typeof OField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Required: Story = { args: { required: true } }
export const WithError: Story = { args: { error: 'Please enter a valid email address.' } }
export const Disabled: Story = { args: { disabled: true } }
