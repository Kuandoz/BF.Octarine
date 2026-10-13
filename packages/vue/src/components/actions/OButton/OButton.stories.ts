import type { Meta, StoryObj } from '@storybook/vue3-vite'
import OButton from './OButton.vue'

const meta = {
  title: 'Actions/Button',
  component: OButton,
  argTypes: {
    variant: { control: 'inline-radio', options: ['solid', 'soft', 'outline', 'ghost'] },
    intent: { control: 'inline-radio', options: ['primary', 'neutral', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  render: (args) => ({
    components: { OButton },
    setup: () => ({ args }),
    template: '<OButton v-bind="args">Button</OButton>',
  }),
} satisfies Meta<typeof OButton>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Matrix: Story = {
  render: () => ({
    components: { OButton },
    setup: () => ({
      variants: ['solid', 'soft', 'outline', 'ghost'] as const,
      intents: ['primary', 'neutral', 'danger'] as const,
    }),
    template: `
      <div class="grid grid-cols-3 gap-4 w-fit">
        <template v-for="variant in variants" :key="variant">
          <OButton v-for="intent in intents" :key="intent" :variant="variant" :intent="intent">
            {{ variant }} / {{ intent }}
          </OButton>
        </template>
      </div>
    `,
  }),
}

export const Sizes: Story = {
  render: () => ({
    components: { OButton },
    template: `
      <div class="flex items-center gap-3">
        <OButton size="sm">Small</OButton>
        <OButton size="md">Medium</OButton>
        <OButton size="lg">Large</OButton>
      </div>
    `,
  }),
}

export const Loading: Story = { args: { loading: true } }
export const Disabled: Story = { args: { disabled: true } }
