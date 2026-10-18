<script setup lang="ts">
import { defineComponent, type PropType, provide, shallowRef, watch } from 'vue'

import FormComponent from './FormComponent.vue'

import { FORM_ENGINE_KEY } from '../composables/useFormEngine'
import { FormEngine } from '../FormEngine'
import { clonePlain } from '../mergeDeep'
import { type ComponentRegistry, getGlobalRegistry, REGISTRY_KEY } from '../registry'
import { useExpressionLanguages, useListProvider, useTranslation } from '../services'
import type { FormDefinition, FormError } from '../types'
import type { ValidatorRegistry } from '../types'

const props = defineProps<{
  definition?: FormDefinition
  formEngine?: FormEngine
  model?: Record<string, unknown>
  components?: ComponentRegistry
  validators?: ValidatorRegistry
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

const translation = useTranslation()
const listProvider = useListProvider()
const expressionLanguages = useExpressionLanguages()

function createEngine(model: Record<string, unknown> | undefined): FormEngine {
  if (!props.definition) {
    throw new Error(
      '[form-engine] FormRenderer requires either a "form-engine" or a "definition" prop.',
    )
  }
  return new FormEngine(
    props.definition,
    model,
    props.validators,
    translation,
    props.locale,
    listProvider,
    expressionLanguages,
  )
}

// A plain copy of the values, so what an app gets doesn't change under it.
function snapshot(engine: FormEngine): Record<string, unknown> {
  return clonePlain(engine.model)
}

const engine = shallowRef(props.formEngine ?? createEngine(props.model))
// The fields are mounted again for a new engine, so they pick it up.
const generation = shallowRef(0)

function switchTo(next: FormEngine) {
  engine.value = next
  generation.value++
}

watch(
  () => props.formEngine,
  (next) => {
    if (next) switchTo(next)
  },
)
// Both are compared by content: a template that builds them inline
// (`:model="{}"`) passes a new object on every render, and that must not
// throw away what was filled in.
const contentOf = (value: unknown) => JSON.stringify(value ?? null)
let lastDefinition = contentOf(props.definition)
let lastModel = contentOf(props.model)

// A changed definition, as in a builder's preview, keeps what was filled in.
watch(
  () => props.definition,
  (definition) => {
    const content = contentOf(definition)
    if (content === lastDefinition) return
    lastDefinition = content
    if (!props.formEngine) switchTo(createEngine(snapshot(engine.value)))
  },
  { deep: true },
)
// A new model starts over with those values.
watch(
  () => props.model,
  (model) => {
    const content = contentOf(model)
    if (content === lastModel) return
    lastModel = content
    if (!props.formEngine) switchTo(createEngine(model))
  },
  { deep: true },
)
watch(
  () => props.locale,
  (locale) => engine.value.setLocale(locale),
)

if (props.components) {
  provide(REGISTRY_KEY, { ...getGlobalRegistry(), ...props.components })
}

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
  const valid = engine.value.submit()
  if (valid) emit('submit', snapshot(engine.value))
  else emit('invalid', engine.value.getErrors())
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
