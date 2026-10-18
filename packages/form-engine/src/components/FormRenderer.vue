<script setup lang="ts">
import { computed, defineComponent, type PropType, provide, shallowRef, watch } from 'vue'

import FormComponent from './FormComponent.vue'

import { FORM_ENGINE_KEY } from '../composables/useFormEngine'
import type { FormEngine } from '../FormEngine'
import { useForm } from '../forms'
import { clonePlain } from '../mergeDeep'
import type { FormDefinition, FormError } from '../types'

// Renders a form: either one from useForm (`:form`), or one it makes itself
// from `definition`, `model` and `locale` with the app's Forms setup.
const props = defineProps<{
  form?: FormEngine
  definition?: FormDefinition
  model?: Record<string, unknown>
  locale?: string
}>()

const emit = defineEmits<{
  // The form was sent and every rule passed. A copy of the values.
  submit: [model: Record<string, unknown>]
  // The form was sent but some rules failed; the errors in screen order.
  invalid: [errors: FormError[]]
}>()

defineSlots<{
  // Above the fields, e.g. for an error summary.
  before?(props: { engine: FormEngine }): unknown
  // Below the fields, e.g. for the submit button.
  default?(props: { engine: FormEngine }): unknown
}>()

if (!props.form && !props.definition) {
  throw new Error('[form-engine] FormRenderer needs a "form" or a "definition".')
}

// Only made when there is no `form`; a `form` can't be swapped for a
// definition later.
const own = props.form
  ? undefined
  : useForm(() => props.definition!, {
      model: () => props.model,
      locale: () => props.locale,
    })
const engine = computed(() => props.form ?? own!.value)

// The fields are mounted again for a new engine, so they pick it up.
const generation = shallowRef(0)
watch(engine, () => generation.value++)

// Gives the fields below it their engine. Keyed by `generation`, so a new
// engine mounts them again instead of leaving them on the old one.
const EngineScope = defineComponent({
  props: { engine: { type: Object as PropType<FormEngine>, required: true } },
  setup(scopeProps, { slots }) {
    provide(FORM_ENGINE_KEY, scopeProps.engine)
    return () => slots.default?.()
  },
})

function submit(): boolean {
  const current = engine.value
  const valid = current.submit()
  if (valid) emit('submit', clonePlain(current.model))
  else emit('invalid', current.getErrors())
  return valid
}

defineExpose({ engine, submit })
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <EngineScope :key="generation" :engine="engine">
      <slot name="before" :engine="engine" />
      <FormComponent :components="engine.definition.components" />
      <slot :engine="engine" />
    </EngineScope>
  </form>
</template>
