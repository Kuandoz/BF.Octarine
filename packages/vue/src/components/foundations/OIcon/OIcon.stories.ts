import type { Meta, StoryObj } from '@storybook/vue3-vite'
import OIcon from './OIcon.vue'
import { iconIntents, iconSizes } from './icon'

/**
 * Icons are found by name in the registry the `octarine-icons` Vite plugin
 * builds from the names in the source, so write names out in full.
 */
const meta = {
  title: 'Foundations/Icon',
  component: OIcon,
  argTypes: {
    variant: { control: 'inline-radio', options: ['outline', 'solid', 'mini', 'micro'] },
    intent: { control: 'select', options: [undefined, ...iconIntents] },
    size: { control: 'inline-radio', options: [undefined, ...iconSizes] },
  },
  args: { name: 'trash', variant: 'solid', intent: 'danger', size: 'lg', disabled: false },
} satisfies Meta<typeof OIcon>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Variants: Story = {
  render: () => ({
    components: { OIcon },
    template: `
      <div class="flex items-center gap-6 text-fg">
        <span class="flex flex-col items-center gap-2 text-caption"><OIcon name="trash" size="lg" />outline</span>
        <span class="flex flex-col items-center gap-2 text-caption"><OIcon name="trash" variant="solid" size="lg" />solid</span>
        <span class="flex flex-col items-center gap-2 text-caption"><OIcon name="trash" variant="mini" size="md" />mini</span>
        <span class="flex flex-col items-center gap-2 text-caption"><OIcon name="trash" variant="micro" size="sm" />micro</span>
      </div>
    `,
  }),
}

export const Intents: Story = {
  render: () => ({
    components: { OIcon },
    setup: () => ({ intents: iconIntents }),
    template: `
      <div class="flex flex-wrap items-center gap-6">
        <span v-for="intent in intents" :key="intent" class="flex items-center gap-2 text-body text-fg">
          <OIcon name="check-circle" variant="solid" :intent="intent" size="lg" />{{ intent }}
        </span>
      </div>
    `,
  }),
}

/** Without a size an icon is 1em, so it follows the text it sits in. */
export const Sizes: Story = {
  render: () => ({
    components: { OIcon },
    template: `
      <div class="flex flex-col gap-4 text-fg">
        <div class="flex items-center gap-4">
          <OIcon name="bell" size="sm" /><OIcon name="bell" size="md" /><OIcon name="bell" size="lg" />
        </div>
        <p class="text-body">Inline <OIcon name="bell" /> follows the body text.</p>
        <p class="text-heading-2">Inline <OIcon name="bell" /> follows a heading.</p>
      </div>
    `,
  }),
}

/** Grayscale plus opacity, so it also works on multi-color icons. */
export const Disabled: Story = {
  render: () => ({
    components: { OIcon },
    template: `
      <div class="flex items-center gap-6 text-fg">
        <OIcon name="trash" variant="solid" intent="danger" size="lg" />
        <OIcon name="trash" variant="solid" intent="danger" size="lg" disabled />
        <OIcon name="octarine:mark" size="lg" />
        <OIcon name="octarine:mark" size="lg" disabled />
      </div>
    `,
  }),
}

/** Octarine's own icons (`octarine:*`) keep their colors. */
export const Custom: Story = {
  args: { name: 'octarine:mark', intent: undefined, size: 'lg', label: 'Octarine' },
}

/** An icon that carries meaning gets a label; decorative ones stay hidden. */
export const Labelled: Story = {
  render: () => ({
    components: { OIcon },
    template: `
      <p class="flex items-center gap-2 text-body text-fg">
        <OIcon name="exclamation-triangle" variant="mini" intent="warning" size="md" label="Warning:" />
        Your session expires in 5 minutes.
      </p>
    `,
  }),
}
