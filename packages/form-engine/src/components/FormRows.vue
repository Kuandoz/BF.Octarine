<script setup lang="ts">
import { computed } from 'vue'

import { resolveFieldPath } from '@octarine/form-core'

import FormComponent from './FormComponent.vue'
import FormRow from './FormRow.vue'

import { useFormEngine } from '../composables/useFormEngine'
import { useRepeatContext } from '../composables/useRepeatContext'
import type { FieldDefinition } from '../types'

// Renders the rows of a repeat field, each with its own row scope, so a
// repeat component only adds what it looks like and the Add/Remove buttons.
// Without a slot, each row renders the field's `components`; with one, the
// slot renders a row and gets what it needs for that.
const props = defineProps<{ field: FieldDefinition }>()

defineSlots<{
  default?(row: {
    index: number
    // The row's own path, e.g. "items.2".
    path: string
    components: FieldDefinition[]
    remove: () => void
  }): unknown
}>()

const engine = useFormEngine()
const outer = useRepeatContext()
const arrayPath = computed(() => resolveFieldPath(props.field.path, outer))
const count = computed(() => {
  const items = engine.getValue(arrayPath.value)
  return Array.isArray(items) ? items.length : 0
})
const components = computed(() => props.field.components ?? [])
</script>

<template>
  <FormRow v-for="(_, index) in count" :key="index" :array-path="arrayPath" :array-index="index">
    <slot
      :index="index"
      :path="`${arrayPath}.${index}`"
      :components="components"
      :remove="() => engine.removeRepeatItem(arrayPath, index)"
    >
      <FormComponent :components="components" />
    </slot>
  </FormRow>
</template>
