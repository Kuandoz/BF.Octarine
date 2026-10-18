<script setup lang="ts">
import { computed } from 'vue'
import { type FieldDefinition, useField } from '../../../../../packages/form-engine/src'
import { OField, OInput } from '../../../../../packages/vue/src'

// A text field: OField draws label, hint and error; OInput the control.
const props = defineProps<{ field: FieldDefinition }>()
const { id, value, label, hint, required, disabled, readonly, error, onBlur, attrs } =
  useField<string>(() => props.field)

const inputType = computed(() => (attrs.value.inputType as string | undefined) ?? 'text')
const autocomplete = computed(() => attrs.value.autocomplete as string | undefined)
const maxLength = computed(() => attrs.value.maxLength as number | undefined)
</script>

<template>
  <OField
    :id="id"
    :label="label"
    :hint="hint"
    :error="error"
    :required="required"
    :disabled="disabled"
    :max-length="maxLength"
  >
    <OInput
      v-model="value"
      :type="inputType"
      :autocomplete="autocomplete"
      :readonly="readonly"
      @blur="onBlur"
    />
  </OField>
</template>
