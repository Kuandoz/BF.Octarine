<script setup lang="ts">
import { computed, useId } from 'vue'
import { provideFormField } from '../../../composables/useFormField'

const props = withDefaults(
  defineProps<{
    label: string
    /** Help text shown below the control. Replaced by `error` when present. */
    hint?: string
    /** Error message; also marks the control as invalid. */
    error?: string
    required?: boolean
    disabled?: boolean
    /** Overrides the generated control id. */
    id?: string
  }>(),
  { hint: undefined, error: undefined, required: false, disabled: false, id: undefined },
)

const generatedId = useId()
const id = computed(() => props.id ?? generatedId)
const messageId = computed(() => `${id.value}-message`)
const message = computed(() => props.error ?? props.hint)

provideFormField({
  id,
  describedBy: computed(() => (message.value ? messageId.value : undefined)),
  invalid: computed(() => !!props.error),
  required: computed(() => props.required),
  disabled: computed(() => props.disabled),
})
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-label text-fg" :class="{ 'opacity-50': disabled }">
      {{ label }}<span v-if="required" class="text-danger" aria-hidden="true"> *</span>
    </label>
    <slot />
    <p
      v-if="message"
      :id="messageId"
      class="text-caption"
      :class="error ? 'text-danger' : 'text-fg-muted'"
    >
      {{ message }}
    </p>
  </div>
</template>
