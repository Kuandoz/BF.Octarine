import type { Meta, StoryObj } from '@storybook/vue3-vite'
import OHeading from '../OHeading/OHeading.vue'
import OText from './OText.vue'

const meta = {
  title: 'Foundations/Text',
  component: OText,
  args: { variant: 'body', tone: 'default', truncate: false },
  argTypes: {
    variant: {
      control: 'select',
      options: ['body-lg', 'body', 'body-sm', 'label', 'caption', 'overline', 'code'],
    },
    tone: {
      control: 'select',
      options: ['default', 'muted', 'subtle', 'primary', 'danger', 'warning', 'success'],
    },
  },
  render: (args) => ({
    components: { OText },
    setup: () => ({ args }),
    template: '<OText v-bind="args">The quick brown fox jumps over the lazy dog.</OText>',
  }),
} satisfies Meta<typeof OText>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Headings: Story = {
  render: () => ({
    components: { OHeading },
    template: `
      <div class="flex flex-col gap-4">
        <OHeading :level="1" size="display">Display</OHeading>
        <OHeading :level="1">Heading 1</OHeading>
        <OHeading :level="2">Heading 2</OHeading>
        <OHeading :level="3">Heading 3</OHeading>
        <OHeading :level="4">Heading 4</OHeading>
      </div>
    `,
  }),
}
