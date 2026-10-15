import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { themes } from '@octarine/tokens'
import {
  OBadge,
  OButton,
  OCard,
  OField,
  OHeading,
  OInput,
  OStack,
  OText,
} from '../../../../packages/vue/src'

/**
 * Every theme side by side, each in its own `data-theme` subtree. The toolbar's
 * Mode switch applies to all of them.
 */
const meta = {
  title: 'Foundations/Themes',
  parameters: { layout: 'fullscreen' },
  render: () => ({
    components: { OBadge, OButton, OCard, OField, OHeading, OInput, OStack, OText },
    setup() {
      for (const theme of Object.values(themes)) {
        if (
          !theme.fonts.href ||
          document.querySelector(`link[data-octarine-fonts="${theme.name}"]`)
        )
          continue
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = theme.fonts.href
        link.dataset.octarineFonts = theme.name
        document.head.append(link)
      }
      return { themes: Object.values(themes) }
    },
    template: `
      <div class="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
        <section
          v-for="theme in themes"
          :key="theme.name"
          :data-theme="theme.name"
          :aria-labelledby="'theme-' + theme.name"
          class="flex flex-col gap-5 bg-canvas p-6 text-fg"
        >
          <OStack :gap="1">
            <OText variant="overline" tone="primary"><code>data-theme="{{ theme.name }}"</code></OText>
            <OHeading :id="'theme-' + theme.name" :level="2" :size="3">{{ theme.label }}</OHeading>
            <OText variant="body-sm" tone="muted">{{ theme.description }}</OText>
          </OStack>
          <OStack direction="horizontal" :gap="2" wrap>
            <OButton>Save</OButton>
            <OButton variant="outline" intent="neutral">Cancel</OButton>
            <OButton variant="ghost" intent="danger">Delete</OButton>
          </OStack>
          <OStack direction="horizontal" :gap="2" wrap>
            <OBadge intent="primary">New</OBadge>
            <OBadge intent="success" variant="solid">Live</OBadge>
            <OBadge intent="warning">Draft</OBadge>
            <OBadge intent="info" variant="outline">Beta</OBadge>
          </OStack>
          <OCard variant="elevated">
            <template #header><OHeading :level="3" :size="4">Invite your team</OHeading></template>
            <OField :label="'Email (' + theme.label + ')'" hint="We send one invitation.">
              <OInput type="email" placeholder="you@example.com" />
            </OField>
            <template #footer><OButton size="sm">Send invite</OButton></template>
          </OCard>
        </section>
      </div>
    `,
  }),
} satisfies Meta

export default meta

export const Compare: StoryObj<typeof meta> = {}
