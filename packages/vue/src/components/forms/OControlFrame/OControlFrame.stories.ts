import type { Meta, StoryObj } from '@storybook/vue3-vite'
import OField from '../OField/OField.vue'
import OControlFrame from './OControlFrame.vue'

/**
 * The box around a control: border, background, radius, focus ring and
 * adornments. `OInput` uses it; use it for your own controls by marking the
 * native element with `data-control`.
 */
const meta = {
  title: 'Forms/ControlFrame',
  component: OControlFrame,
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  args: { size: 'md', invalid: false, disabled: false, readonly: false },
  render: (args) => ({
    components: { OControlFrame, OField },
    setup: () => ({ args }),
    template: `
      <OField id="quantity" label="Quantity" class="max-w-sm">
        <template #default>
          <OControlFrame v-bind="args">
            <input
              id="quantity"
              data-control
              type="number"
              value="3"
              class="min-w-0 flex-1 self-stretch bg-transparent focus-visible:outline-none"
              :disabled="args.disabled"
              :readonly="args.readonly"
            />
            <template #trailing><span class="text-fg-muted">pcs</span></template>
          </OControlFrame>
        </template>
      </OField>
    `,
  }),
} satisfies Meta<typeof OControlFrame>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Invalid: Story = { args: { invalid: true } }
export const Disabled: Story = { args: { disabled: true } }
export const ReadOnly: Story = { args: { readonly: true } }
