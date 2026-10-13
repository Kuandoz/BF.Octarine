<script setup lang="ts">
import { useClasses } from '../../../composables/useClasses'
import { cva, type VariantProps } from '../../../utils/variants'

const text = cva('', {
  variants: {
    variant: {
      'body-lg': 'text-body-lg',
      body: 'text-body',
      'body-sm': 'text-body-sm',
      label: 'text-label',
      caption: 'text-caption',
      overline: 'text-overline uppercase',
      code: 'text-code font-mono',
    },
    tone: {
      default: 'text-fg',
      muted: 'text-fg-muted',
      subtle: 'text-fg-subtle',
      primary: 'text-primary',
      danger: 'text-danger',
      warning: 'text-warning-subtle-fg',
      success: 'text-success',
      inherit: '',
    },
    truncate: {
      true: 'truncate',
    },
  },
})

type TextVariants = VariantProps<typeof text>

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    as?: string
    variant?: NonNullable<TextVariants['variant']>
    tone?: NonNullable<TextVariants['tone']>
    truncate?: boolean
  }>(),
  { as: 'p', variant: 'body', tone: 'default', truncate: false },
)

const { classes, attrs } = useClasses(() => text(props))
</script>

<template>
  <component :is="as" v-bind="attrs" :class="classes"><slot /></component>
</template>
