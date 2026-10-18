<script setup lang="ts">
import {
  FormComponent,
  type FieldDefinition,
  useField,
} from '../../../../../packages/form-engine/src'
import { OFieldset } from '../../../../../packages/vue/src'

// A group of fields under a legend. It has no control of its own, so errors on
// its path link to its first field.
const props = defineProps<{ field: FieldDefinition }>()
const { label, hint, error } = useField(() => props.field, { target: false })
</script>

<template>
  <OFieldset :legend="label" :hint="hint" :error="error">
    <FormComponent :components="field.components ?? []" />
  </OFieldset>
</template>
