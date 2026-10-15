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

/**
 * `icon` / `iconEnd` take a name, an imported icon or a full set of `OIcon`
 * props. Icon-only buttons need an `aria-label`.
 */
export const WithIcons: Story = {
  render: () => ({
    components: { OButton },
    template: `
      <div class="flex flex-wrap items-center gap-3">
        <OButton icon="plus">New project</OButton>
        <OButton variant="outline" intent="danger" :icon="{ name: 'trash', variant: 'mini' }">Delete</OButton>
        <OButton variant="soft" icon-end="arrow-right">Continue</OButton>
        <OButton variant="ghost" intent="neutral" icon="cog-6-tooth" aria-label="Settings" />
        <OButton size="sm" variant="outline" intent="neutral" icon="x-mark" aria-label="Close" />
        <OButton disabled icon="paper-airplane">Send</OButton>
      </div>
    `,
  }),
}
