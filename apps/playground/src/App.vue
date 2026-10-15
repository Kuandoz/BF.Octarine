<script setup lang="ts">
import {
  OBadge,
  OButton,
  OCard,
  OField,
  OHeading,
  OIcon,
  OInput,
  OStack,
  OText,
  useColorMode,
  useTheme,
} from '@octarine/vue'
import { computed, ref } from 'vue'

const { theme, themes } = useTheme()
const { resolved, toggle } = useColorMode()

const email = ref('')
const submitted = ref(false)
const saving = ref(false)
const emailError = computed(() =>
  submitted.value && !email.value.includes('@') ? 'Enter a valid email address.' : undefined,
)

async function submit() {
  submitted.value = true
  if (emailError.value) return
  saving.value = true
  await new Promise((resolve) => setTimeout(resolve, 1200))
  saving.value = false
}
</script>

<template>
  <main class="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12">
    <OStack direction="horizontal" justify="between" align="center" wrap>
      <OStack :gap="2">
        <img
          :src="resolved === 'dark' ? '/octarine-logo-dark.svg' : '/octarine-logo-light.svg'"
          alt="Octarine by Bytes Fantastic"
          class="h-12 w-auto self-start"
        />
        <OHeading :level="1">Playground</OHeading>
      </OStack>
      <OStack direction="horizontal" :gap="2" align="end" wrap>
        <OField id="theme-select" label="Theme">
          <select
            id="theme-select"
            v-model="theme"
            class="theme-border min-h-(--oct-control-height-md) rounded-input border-border-strong bg-surface px-(--oct-input-px) text-body text-fg"
          >
            <option v-for="t in themes" :key="t.name" :value="t.name">{{ t.label }}</option>
          </select>
        </OField>
        <OButton
          variant="outline"
          intent="neutral"
          :icon="resolved === 'dark' ? 'sun' : 'moon'"
          @click="toggle"
        >
          {{ resolved === 'dark' ? 'Light' : 'Dark' }} mode
        </OButton>
      </OStack>
    </OStack>

    <OText variant="body-lg" tone="muted">
      This app consumes the built <code>@octarine/vue</code> and
      <code>@octarine/tailwind</code> packages exactly like an external project would.
      {{ themes[theme].description }}
    </OText>

    <OStack direction="horizontal" :gap="2" wrap>
      <OBadge intent="primary">Primary</OBadge>
      <OBadge intent="success">Success</OBadge>
      <OBadge intent="warning">Warning</OBadge>
      <OBadge intent="danger">Danger</OBadge>
      <OBadge intent="info" variant="outline">Info</OBadge>
    </OStack>

    <OCard as="form" variant="elevated" novalidate @submit.prevent="submit">
      <template #header>
        <OHeading :level="2" :size="3" class="flex items-center gap-2">
          <OIcon name="envelope" variant="solid" intent="primary" />
          Join the newsletter
        </OHeading>
      </template>
      <OField label="Email address" hint="One email a month, no spam." :error="emailError" required>
        <OInput v-model="email" type="email" placeholder="you@example.com" />
      </OField>
      <template #footer>
        <OButton variant="ghost" intent="neutral" icon="x-mark" @click="email = ''">Clear</OButton>
        <OButton type="submit" :loading="saving" icon-end="paper-airplane">Subscribe</OButton>
      </template>
    </OCard>
  </main>
</template>
