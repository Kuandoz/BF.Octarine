import type { Meta, StoryObj } from '@storybook/vue3-vite'
import OStack from './OStack.vue'

const meta = {
  title: 'Foundations/Stack',
  component: OStack,
  args: { direction: 'horizontal', gap: 4, wrap: false },
  argTypes: {
    direction: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
    gap: { control: 'select', options: [0, 1, 2, 3, 4, 6, 8, 12] },
    align: {
      control: 'select',
      options: [undefined, 'start', 'center', 'end', 'stretch', 'baseline'],
    },
    justify: { control: 'select', options: [undefined, 'start', 'center', 'end', 'between'] },
  },
  render: (args) => ({
    components: { OStack },
    setup: () => ({ args }),
    template: `
      <OStack v-bind="args">
        <div v-for="n in 4" :key="n" class="rounded-md bg-primary-subtle px-4 py-3 text-primary-subtle-fg">
          Item {{ n }}
        </div>
      </OStack>
    `,
  }),
} satisfies Meta<typeof OStack>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = {}
export const Vertical: Story = { args: { direction: 'vertical' } }
