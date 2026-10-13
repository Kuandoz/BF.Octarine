<script setup lang="ts">
import {
  OBadge,
  OButton,
  OCard,
  OField,
  OHeading,
  OInput,
  OStack,
  OText,
  useTheme,
} from '@octarine/vue'
import { computed, ref } from 'vue'

const { resolved, toggle } = useTheme()

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
    <OStack direction="horizontal" justify="between" align="center">
      <OStack :gap="1">
        <OText variant="overline" tone="primary">Octarine</OText>
        <OHeading :level="1">Playground</OHeading>
      </OStack>
      <OButton variant="outline" intent="neutral" @click="toggle">
        {{ resolved === 'dark' ? 'Light' : 'Dark' }} mode
      </OButton>
    </OStack>

    <OText variant="body-lg" tone="muted">
      This app consumes the built <code>@octarine/vue</code> and <code>@octarine/tailwind</code>
      packages exactly like an external project would.
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
        <OHeading :level="2" :size="3">Join the newsletter</OHeading>
      </template>
      <OField label="Email address" hint="One email a month, no spam." :error="emailError" required>
        <OInput v-model="email" type="email" placeholder="you@example.com" />
      </OField>
      <template #footer>
        <OButton variant="ghost" intent="neutral" @click="email = ''">Clear</OButton>
        <OButton type="submit" :loading="saving">Subscribe</OButton>
      </template>
    </OCard>
  </main>
</template>
