import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { IconDefinition, IconVariant } from '@octarine/icons'
import * as micro from '@octarine/icons/heroicons/micro'
import * as mini from '@octarine/icons/heroicons/mini'
import * as outline from '@octarine/icons/heroicons/outline'
import * as solid from '@octarine/icons/heroicons/solid'
import * as octarine from '@octarine/icons/octarine'
import { computed, ref } from 'vue'
import { OField, OIcon, OInput } from '../../../../packages/vue/src'

const sets: Record<IconVariant, Record<string, IconDefinition>> = { outline, solid, mini, micro }
const sizes: Record<IconVariant, 'sm' | 'md' | 'lg'> = {
  outline: 'lg',
  solid: 'lg',
  mini: 'md',
  micro: 'sm',
}

/**
 * Every available icon. The gallery imports whole sets; apps use names, and the
 * `octarine-icons` Vite plugin bundles only the ones they use.
 */
const meta = {
  title: 'Foundations/Icons',
  parameters: { layout: 'padded' },
  render: () => ({
    components: { OField, OIcon, OInput },
    setup() {
      const query = ref('')
      const variant = ref<IconVariant>('outline')
      const custom = Object.values(octarine)
      const icons = computed(() =>
        Object.values(sets[variant.value])
          .filter((icon) => icon.name.includes(query.value.trim().toLowerCase()))
          .sort((a, b) => a.name.localeCompare(b.name)),
      )
      return { query, variant, variants: Object.keys(sets), icons, custom, sizes }
    },
    template: `
      <div class="flex flex-col gap-6 text-fg">
        <div class="flex flex-wrap items-end gap-4">
          <OField label="Search icons" class="min-w-64">
            <OInput v-model="query" type="search" placeholder="trash, arrow, user…" />
          </OField>
          <OField id="icon-variant" label="Variant">
            <select
              id="icon-variant"
              v-model="variant"
              class="theme-border min-h-(--oct-control-height-md) rounded-input border-border-strong bg-surface px-(--oct-input-px) text-body text-fg"
            >
              <option v-for="v in variants" :key="v" :value="v">{{ v }}</option>
            </select>
          </OField>
        </div>
        <p class="text-body-sm text-fg-muted" role="status">{{ icons.length }} icons</p>
        <ul class="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2">
          <li
            v-for="icon in [...custom, ...icons]"
            :key="icon.name"
            class="flex flex-col items-center gap-2 rounded-card bg-surface p-3 text-center"
          >
            <OIcon :icon="icon" :size="sizes[variant]" />
            <code class="text-caption break-all text-fg-muted">{{ icon.name }}</code>
          </li>
        </ul>
      </div>
    `,
  }),
} satisfies Meta

export default meta

export const Gallery: StoryObj<typeof meta> = {}
