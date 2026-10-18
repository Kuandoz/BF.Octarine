<script setup lang="ts">
import { provide, reactive } from 'vue'

import { REPEAT_CONTEXT_KEY } from '../composables/useRepeatContext'
import type { RepeatContext } from '../types'

// One row of a repeat: everything inside sees this row as its scope. Not
// exported; FormRows renders it.
const props = defineProps<{ arrayPath: string; arrayIndex: number }>()

// Getters, so a row that moves keeps pointing at the right place.
const context: RepeatContext = reactive({
  get arrayPath() {
    return props.arrayPath
  },
  get arrayIndex() {
    return props.arrayIndex
  },
})
provide(REPEAT_CONTEXT_KEY, context)
</script>

<template>
  <slot />
</template>
