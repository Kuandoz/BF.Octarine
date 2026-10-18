<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  type FormDefinition,
  type FormEngine,
  FormRenderer,
} from '../../../../../packages/form-engine/src'
import '../../../../../packages/form-engine/layout.css'
import {
  OButton,
  OErrorSummary,
  OHeading,
  useLanguage,
  useMessages,
} from '../../../../../packages/vue/src'
import { fields } from './fields'

// A FormRenderer set up the way an app would: Octarine's field components, the
// required note, an error summary after a failed submit, and a Send button.
const props = defineProps<{
  definition: FormDefinition
  model?: Record<string, unknown>
  locale?: string
  /** Names the form for assistive technology. */
  label: string
}>()

const t = useMessages()
// Without a locale, the form follows the page language (<html lang>).
const language = useLanguage()
const formLocale = computed(() => props.locale ?? language.value.split('-')[0])
const attempts = ref(0)
const sent = ref<Record<string, unknown>>()

// An entry without a link (a hidden field) needs the label to make sense.
function summaryOf(engine: FormEngine) {
  return engine.getErrors().map((error) => ({
    message: error.label ? `${error.label}: ${error.message}` : error.message,
    target: error.target,
  }))
}

const hasRequired = computed(() =>
  Object.values(props.definition.validations ?? {}).some((rules) =>
    rules.some((rule) => rule.type === 'required'),
  ),
)

function onInvalid() {
  sent.value = undefined
  // A new key mounts the summary again, so it takes focus on every attempt.
  attempts.value++
}
</script>

<template>
  <div class="flex max-w-2xl flex-col gap-6">
    <FormRenderer
      :definition="definition"
      :model="model"
      :locale="formLocale"
      :components="fields"
      :aria-label="label"
      class="flex flex-col gap-6"
      @invalid="onInvalid"
      @submit="(model) => (sent = model)"
    >
      <template #before="{ engine }">
        <OErrorSummary
          v-if="engine.submitted && engine.getErrors().length"
          :key="attempts"
          :errors="summaryOf(engine)"
        />
        <p v-if="hasRequired" class="text-body-sm text-fg-muted">{{ t.requiredNote }}</p>
      </template>
      <OButton type="submit" class="self-start" icon="paper-airplane">Send</OButton>
    </FormRenderer>

    <div role="status">
      <template v-if="sent">
        <OHeading :level="2" :size="4">Sent</OHeading>
        <pre class="mt-2 overflow-x-auto rounded-card bg-surface-sunken p-4 text-code text-fg">{{
          JSON.stringify(sent, null, 2)
        }}</pre>
      </template>
    </div>
  </div>
</template>
