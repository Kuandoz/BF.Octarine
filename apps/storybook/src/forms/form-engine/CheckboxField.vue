<script setup lang="ts">
import { type FieldDefinition, useField } from '../../../../../packages/form-engine/src'

// A single checkbox. @octarine/vue has no checkbox yet, so this is a native one
// with the label beside it; the whole label is the 24px target.
const props = defineProps<{ field: FieldDefinition }>()
const { id, value, label, disabled, onBlur } = useField<boolean>(() => props.field)
</script>

<template>
  <label :for="id" class="flex min-h-6 w-fit items-center gap-2 text-body text-fg">
    <input
      :id="id"
      type="checkbox"
      class="focus-ring size-5 accent-primary"
      :checked="value === true"
      :disabled="disabled"
      @change="value = ($event.target as HTMLInputElement).checked"
      @blur="onBlur"
    />
    {{ label }}
  </label>
</template>
