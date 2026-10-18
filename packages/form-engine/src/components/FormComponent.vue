<script setup lang="ts">
import { computed, inject } from 'vue'

import { useFormEngine } from '../composables/useFormEngine'
import { useRepeatContext } from '../composables/useRepeatContext'
import { fieldWidth } from '../layout'
import { getGlobalRegistry, REGISTRY_KEY } from '../registry'
import type { FieldDefinition } from '../types'
import { warnOnce } from '../warn'

const props = defineProps<{
  components: FieldDefinition[]
  /**
   * Renders the fields straight into the parent, without the grid below: for
   * a container that lays its children out itself (a flex row, a labelled
   * row). The grid gives every field its own cell, which would put each one
   * on a line of its own whatever the container asked for.
   */
  inline?: boolean
}>()

const registry = inject(REGISTRY_KEY, getGlobalRegistry())
const formEngine = useFormEngine()
const repeatContext = useRepeatContext()

// The same check isHidden makes, so what is on screen and what the engine
// reports as hidden can't disagree.
const visibleComponents = computed(() =>
  props.components.filter((field) => !formEngine.isFieldHidden(field, repeatContext)),
)

function resolve(type: string) {
  const component = registry[type]
  if (!component) warnOnce(`[form-engine] No component registered for type "${type}"`)
  return component
}

// A field opts into sharing a row with its neighbours via `field.layout`
// (half/third width, default full). The markup only says so; layout.css
// places the cells, and stacks them all when the form is narrow.
</script>

<template>
  <template v-if="inline">
    <template v-for="(field, index) in visibleComponents" :key="field.path ?? index">
      <component :is="resolve(field.type)" v-if="resolve(field.type)" :field="field" />
    </template>
  </template>
  <div v-else data-form-grid>
    <div
      v-for="(field, index) in visibleComponents"
      :key="field.path ?? index"
      data-form-item
      :data-width="fieldWidth(field)"
    >
      <component :is="resolve(field.type)" v-if="resolve(field.type)" :field="field" />
    </div>
  </div>
</template>
