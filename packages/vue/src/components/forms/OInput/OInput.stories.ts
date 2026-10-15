import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import OButton from '../../actions/OButton/OButton.vue'
import OField from '../OField/OField.vue'
import OInput from './OInput.vue'

/**
 * A native `<input>` in an `OControlFrame`. Prefix and suffix text is read out
 * with the input; the clear button is a real, labelled button.
 */
const meta = {
  title: 'Forms/Input',
  component: OInput,
  args: { size: 'md', invalid: false, disabled: false, readonly: false },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  render: (args) => ({
    components: { OField, OInput },
    setup: () => ({ args, value: ref('') }),
    template: `
      <OField label="Name" class="max-w-sm">
        <OInput v-bind="args" v-model="value" placeholder="Ada Lovelace" />
      </OField>
    `,
  }),
} satisfies Meta<typeof OInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Invalid: Story = { args: { invalid: true } }
export const Disabled: Story = { args: { disabled: true } }

export const ReadOnly: Story = {
  args: { readonly: true },
  render: (args) => ({
    components: { OField, OInput },
    setup: () => ({ args, value: ref('ACC-2041') }),
    template: `
      <OField label="Account number" class="max-w-sm">
        <OInput v-bind="args" v-model="value" />
      </OField>
    `,
  }),
}

export const Adornments: Story = {
  render: () => ({
    components: { OField, OInput },
    setup: () => ({ amount: ref('1250'), site: ref('octarine.dev'), search: ref('buttons') }),
    template: `
      <div class="flex max-w-sm flex-col gap-6">
        <OField label="Amount">
          <OInput v-model="amount" prefix="€" suffix="per month" inputmode="decimal" />
        </OField>
        <OField label="Website" markers="optional">
          <OInput v-model="site" icon="globe-alt" prefix="https://" type="url" />
        </OField>
        <OField label="Search">
          <OInput v-model="search" icon="magnifying-glass" type="search" clearable />
        </OField>
      </div>
    `,
  }),
}

export const Loading: Story = {
  render: () => ({
    components: { OField, OInput },
    setup: () => ({ value: ref('octarine') }),
    template: `
      <OField label="Username" hint="Checking whether it is free…" class="max-w-sm">
        <OInput v-model="value" loading />
      </OField>
    `,
  }),
}

export const Sizes: Story = {
  render: () => ({
    components: { OField, OInput },
    setup: () => ({ sm: ref('Small'), md: ref('Medium'), lg: ref('Large') }),
    template: `
      <div class="flex max-w-sm flex-col gap-6">
        <OField label="Small"><OInput size="sm" v-model="sm" icon="magnifying-glass" clearable /></OField>
        <OField label="Medium"><OInput size="md" v-model="md" icon="magnifying-glass" clearable /></OField>
        <OField label="Large"><OInput size="lg" v-model="lg" icon="magnifying-glass" clearable /></OField>
      </div>
    `,
  }),
}

/** Your own action in the `#trailing` slot: a real button with a name and a pressed state. */
export const TrailingAction: Story = {
  render: () => ({
    components: { OButton, OField, OInput },
    setup: () => ({ value: ref('correct horse'), shown: ref(false) }),
    template: `
      <OField label="Password" class="max-w-sm">
        <OInput v-model="value" :type="shown ? 'text' : 'password'" autocomplete="new-password">
          <template #trailing>
            <OButton
              variant="ghost"
              intent="neutral"
              size="sm"
              class="-me-2"
              :icon="shown ? 'eye-slash' : 'eye'"
              aria-label="Show password"
              :aria-pressed="shown"
              @click="shown = !shown"
            />
          </template>
        </OInput>
      </OField>
    `,
  }),
}
