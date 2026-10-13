<script setup lang="ts">
import { useClasses } from '../../../composables/useClasses'
import { cva, type VariantProps } from '../../../utils/variants'

// Class names are spelled out in full so Tailwind can find them when scanning.
const stack = cva('flex', {
  variants: {
    direction: {
      vertical: 'flex-col',
      horizontal: 'flex-row',
    },
    gap: {
      '0': 'gap-0',
      '1': 'gap-1',
      '2': 'gap-2',
      '3': 'gap-3',
      '4': 'gap-4',
      '6': 'gap-6',
      '8': 'gap-8',
      '12': 'gap-12',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    },
    wrap: {
      true: 'flex-wrap',
    },
  },
})

type StackVariants = VariantProps<typeof stack>
type Gap = NonNullable<StackVariants['gap']>

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    as?: string
    direction?: NonNullable<StackVariants['direction']>
    gap?: 0 | 1 | 2 | 3 | 4 | 6 | 8 | 12
    align?: NonNullable<StackVariants['align']>
    justify?: NonNullable<StackVariants['justify']>
    wrap?: boolean
  }>(),
  { as: 'div', direction: 'vertical', gap: 4, align: undefined, justify: undefined, wrap: false },
)

const { classes, attrs } = useClasses(() => stack({ ...props, gap: String(props.gap) as Gap }))
</script>

<template>
  <component :is="as" v-bind="attrs" :class="classes"><slot /></component>
</template>
