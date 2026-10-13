import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import OInput from './OInput.vue'

const meta = {
  title: 'Forms/Input',
  component: OInput,
  args: { size: 'md', invalid: false, disabled: false },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  render: (args) => ({
    components: { OInput },
    setup: () => ({ args, value: ref('') }),
    template:
      '<OInput v-bind="args" v-model="value" placeholder="Type something…" class="max-w-sm" />',
  }),
} satisfies Meta<typeof OInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Invalid: Story = { args: { invalid: true } }
export const Disabled: Story = { args: { disabled: true } }
