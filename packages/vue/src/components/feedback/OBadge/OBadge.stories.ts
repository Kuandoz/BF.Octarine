import type { Meta, StoryObj } from '@storybook/vue3-vite'
import OBadge from './OBadge.vue'

const intents = ['primary', 'neutral', 'danger', 'warning', 'success', 'info'] as const

const meta = {
  title: 'Feedback/Badge',
  component: OBadge,
  args: { variant: 'soft', intent: 'neutral', size: 'md' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['solid', 'soft', 'outline'] },
    intent: { control: 'select', options: intents },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
  },
  render: (args) => ({
    components: { OBadge },
    setup: () => ({ args }),
    template: '<OBadge v-bind="args">Badge</OBadge>',
  }),
} satisfies Meta<typeof OBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Matrix: Story = {
  render: () => ({
    components: { OBadge },
    setup: () => ({ intents, variants: ['solid', 'soft', 'outline'] }),
    template: `
      <div class="flex flex-col gap-3">
        <div v-for="variant in variants" :key="variant" class="flex gap-2">
          <OBadge v-for="intent in intents" :key="intent" :variant="variant" :intent="intent">
            {{ intent }}
          </OBadge>
        </div>
      </div>
    `,
  }),
}
