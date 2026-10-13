<script setup lang="ts">
import { useClasses } from '../../../composables/useClasses'
import { cva, type VariantProps } from '../../../utils/variants'

const spinner = cva(
  'inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent',
  {
    variants: {
      size: {
        sm: 'size-3.5',
        md: 'size-4',
        lg: 'size-6',
      },
    },
  },
)

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    size?: NonNullable<VariantProps<typeof spinner>['size']>
    /** Accessible label; pass an empty string when the spinner is decorative. */
    label?: string
  }>(),
  { size: 'md', label: 'Loading' },
)

const { classes, attrs } = useClasses(() => spinner(props))
</script>

<template>
  <span
    v-bind="attrs"
    :class="classes"
    :role="label ? 'status' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
  />
</template>
