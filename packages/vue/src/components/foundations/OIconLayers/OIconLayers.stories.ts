import type { Meta, StoryObj } from '@storybook/vue3-vite'
import OIcon from '../OIcon/OIcon.vue'
import OIconLayers from './OIconLayers.vue'

/**
 * Combines icons into one. Each `OIcon` child is a layer in a 24-unit square,
 * placed with `transform` (`scale`, `x`, `y`, `rotate`, `flipX`, `flipY`).
 */
const meta = {
  title: 'Foundations/IconLayers',
  component: OIconLayers,
  args: { size: 'lg', label: 'User verified' },
  render: (args) => ({
    components: { OIcon, OIconLayers },
    setup: () => ({ args }),
    template: `
      <OIconLayers v-bind="args" class="text-fg">
        <OIcon name="user-circle" />
        <OIcon name="check-badge" variant="solid" intent="success" :transform="{ scale: 0.5, x: 6, y: 6 }" />
      </OIconLayers>
    `,
  }),
} satisfies Meta<typeof OIconLayers>

export default meta
type Story = StoryObj<typeof meta>

export const Badge: Story = {}

export const Examples: Story = {
  render: () => ({
    components: { OIcon, OIconLayers },
    template: `
      <div class="flex items-center gap-8 text-fg">
        <OIconLayers size="lg" label="Notifications off">
          <OIcon name="bell" />
          <OIcon name="no-symbol" intent="danger" />
        </OIconLayers>
        <OIconLayers size="lg" label="New message">
          <OIcon name="envelope" />
          <OIcon name="plus-circle" variant="solid" intent="primary" :transform="{ scale: 0.5, x: 7, y: -7 }" />
        </OIconLayers>
        <OIconLayers size="lg" label="Undo">
          <OIcon name="arrow-uturn-right" :transform="{ flipX: true }" />
        </OIconLayers>
        <OIconLayers size="lg" disabled label="User verified (disabled)">
          <OIcon name="user-circle" />
          <OIcon name="check-badge" variant="solid" intent="success" :transform="{ scale: 0.5, x: 6, y: 6 }" />
        </OIconLayers>
      </div>
    `,
  }),
}
