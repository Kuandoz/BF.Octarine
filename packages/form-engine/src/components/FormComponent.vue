<script setup lang="ts">
import { computed, inject } from 'vue'

import { useFormEngine } from '../composables/useFormEngine'
import { type FieldWidth, widthBasis } from '../layout'
import { getGlobalRegistry, REGISTRY_KEY } from '../registry'
import type { FieldDefinition } from '../types'
import { warnOnce } from '../warn'

const props = defineProps<{
  components: FieldDefinition[]
  /**
   * Renders the fields straight into the parent, without the stack below: for
   * a container that lays its children out itself (a flex row, a labelled
   * row). The stack gives every field a full-width basis, which would put each
   * one on a line of its own whatever the container asked for.
   */
  inline?: boolean
}>()

const registry = inject(REGISTRY_KEY, getGlobalRegistry())
const formEngine = useFormEngine()

const visibleComponents = computed(() =>
  props.components.filter((field) => !formEngine.resolveCondition(field.hide, false)),
)

function resolve(type: string) {
  const component = registry[type]
  if (!component) warnOnce(`[form-engine] No component registered for type "${type}"`)
  return component
}

// A field opts into sharing a row with its neighbours via `field.layout`
// (half/third width, default full) — flex-wrap does the actual row-packing
// from each field's fixed flex-basis, no row-bucketing needed.
function basis(field: FieldDefinition): string {
  return widthBasis((field.layout as { width?: FieldWidth } | undefined)?.width)
}
</script>

<template>
  <template v-if="inline">
    <template v-for="(field, index) in visibleComponents" :key="field.path ?? index">
      <component :is="resolve(field.type)" v-if="resolve(field.type)" :field="field" />
    </template>
  </template>
  <div v-else class="flex flex-wrap items-start gap-4">
    <div
      v-for="(field, index) in visibleComponents"
      :key="field.path ?? index"
      class="min-w-0"
      :style="{ flex: `0 0 ${basis(field)}` }"
    >
      <component :is="resolve(field.type)" v-if="resolve(field.type)" :field="field" />
    </div>
  </div>
</template>
