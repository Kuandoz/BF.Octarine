<script setup lang="ts">
import { computed } from 'vue'
import { useClasses } from '../../../composables/useClasses'
import { cva, type VariantProps } from '../../../utils/variants'

const heading = cva('text-fg text-balance', {
  variants: {
    size: {
      display: 'text-display',
      '1': 'text-heading-1',
      '2': 'text-heading-2',
      '3': 'text-heading-3',
      '4': 'text-heading-4',
    },
  },
})

type HeadingSize = NonNullable<VariantProps<typeof heading>['size']>

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Semantic level: renders <h1>–<h6>. */
    level?: 1 | 2 | 3 | 4 | 5 | 6
    /** Visual size; defaults to match the level so semantics and looks can diverge. */
    size?: 'display' | 1 | 2 | 3 | 4
  }>(),
  { level: 2, size: undefined },
)

const tag = computed(() => `h${props.level}`)
const { classes, attrs } = useClasses(() =>
  heading({ size: String(props.size ?? Math.min(props.level, 4)) as HeadingSize }),
)
</script>

<template>
  <component :is="tag" v-bind="attrs" :class="classes"><slot /></component>
</template>
