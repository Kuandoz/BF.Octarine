<script setup lang="ts">
import { computed, provide } from 'vue'

import FormComponent from './FormComponent.vue'

import { FORM_ENGINE_KEY } from '../composables/useFormEngine'
import { FormEngine } from '../FormEngine'
import { type ComponentRegistry, getGlobalRegistry, REGISTRY_KEY } from '../registry'
import { useListProvider, useTranslation } from '../services'
import type { FormDefinition } from '../types'
import type { ValidatorRegistry } from '../validators'

const props = defineProps<{
  definition?: FormDefinition
  formEngine?: FormEngine
  model?: Record<string, unknown>
  components?: ComponentRegistry
  validators?: ValidatorRegistry
  locale?: string
}>()

const translation = useTranslation()
const listProvider = useListProvider()

const engine = computed(() => {
  if (props.formEngine) return props.formEngine
  if (!props.definition) {
    throw new Error(
      '[form-engine] FormRenderer requires either a "form-engine" or a "definition" prop.',
    )
  }
  return new FormEngine(
    props.definition,
    props.model,
    props.validators,
    translation,
    props.locale,
    listProvider,
  )
})

if (props.components) {
  provide(REGISTRY_KEY, { ...getGlobalRegistry(), ...props.components })
}

// `engine.value` rather than the computed ref itself — field components read
// a plain `FormEngine` synchronously via `useFormEngine()`, and this package
// never swaps a live FormRenderer's `definition`/`model` props at runtime, so
// there's no case where reactivity to an *instance* swap would matter.
provide(FORM_ENGINE_KEY, engine.value)

defineExpose({ engine })
</script>

<template>
  <FormComponent :components="engine.definition.components" />
</template>
