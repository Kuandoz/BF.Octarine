import type { Meta, StoryObj } from '@storybook/vue3-vite'
import OButton from '../../actions/OButton/OButton.vue'
import OHeading from '../../foundations/OHeading/OHeading.vue'
import OText from '../../foundations/OText/OText.vue'
import OCard from './OCard.vue'

const meta = {
  title: 'Layout/Card',
  component: OCard,
  args: { variant: 'outlined', padding: 'md' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['outlined', 'elevated', 'sunken'] },
    padding: { control: 'inline-radio', options: ['none', 'sm', 'md', 'lg'] },
  },
  render: (args) => ({
    components: { OCard, OHeading, OText, OButton },
    setup: () => ({ args }),
    template: `
      <OCard v-bind="args" class="max-w-md">
        <template #header>
          <OHeading :level="3">Project Octarine</OHeading>
        </template>
        <OText tone="muted">
          Cards group related content and actions. They sit on the surface color and adapt
          automatically to dark mode.
        </OText>
        <template #footer>
          <OButton variant="ghost" intent="neutral">Cancel</OButton>
          <OButton>Continue</OButton>
        </template>
      </OCard>
    `,
  }),
} satisfies Meta<typeof OCard>

export default meta
type Story = StoryObj<typeof meta>

export const Outlined: Story = {}
export const Elevated: Story = { args: { variant: 'elevated' } }
export const Sunken: Story = { args: { variant: 'sunken' } }
