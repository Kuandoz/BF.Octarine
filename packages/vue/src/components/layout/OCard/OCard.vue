<script setup lang="ts">
import { useClasses } from '../../../composables/useClasses'
import { cva, type VariantProps } from '../../../utils/variants'

const card = cva('flex flex-col rounded-xl bg-surface text-fg', {
  variants: {
    variant: {
      outlined: 'border border-border',
      elevated: 'bg-surface-raised shadow-md',
      sunken: 'bg-surface-sunken',
    },
    padding: {
      none: '',
      sm: 'gap-3 p-4',
      md: 'gap-4 p-6',
      lg: 'gap-6 p-8',
    },
  },
})

type CardVariants = VariantProps<typeof card>

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    as?: string
    variant?: NonNullable<CardVariants['variant']>
    padding?: NonNullable<CardVariants['padding']>
  }>(),
  { as: 'div', variant: 'outlined', padding: 'md' },
)

defineSlots<{
  default?: () => unknown
  header?: () => unknown
  footer?: () => unknown
}>()

const { classes, attrs } = useClasses(() => card(props))
</script>

<template>
  <component :is="as" v-bind="attrs" :class="classes">
    <header v-if="$slots.header"><slot name="header" /></header>
    <slot />
    <footer v-if="$slots.footer" class="mt-auto flex items-center justify-end gap-2">
      <slot name="footer" />
    </footer>
  </component>
</template>
