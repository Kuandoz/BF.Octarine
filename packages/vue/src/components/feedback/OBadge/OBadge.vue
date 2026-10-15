<script setup lang="ts">
import { useClasses } from '../../../composables/useClasses'
import { cva, type VariantProps } from '../../../utils/variants'

const badge = cva(
  [
    'theme-border inline-flex items-center gap-1 rounded-badge border-transparent whitespace-nowrap',
    'font-semibold tracking-(--oct-badge-tracking) [text-transform:var(--oct-badge-transform)]',
  ],
  {
    variants: {
      variant: {
        solid: '',
        soft: '',
        outline: 'bg-surface',
      },
      intent: {
        primary: '',
        neutral: '',
        danger: '',
        warning: '',
        success: '',
        info: '',
      },
      size: {
        sm: 'px-2 py-0.5 text-caption',
        md: 'px-2.5 py-0.5 text-body-sm',
      },
    },
    compoundVariants: [
      { variant: 'solid', intent: 'primary', class: 'bg-primary text-primary-fg' },
      { variant: 'solid', intent: 'neutral', class: 'bg-neutral text-neutral-fg' },
      { variant: 'solid', intent: 'danger', class: 'bg-danger text-danger-fg' },
      { variant: 'solid', intent: 'warning', class: 'bg-warning text-warning-fg' },
      { variant: 'solid', intent: 'success', class: 'bg-success text-success-fg' },
      { variant: 'solid', intent: 'info', class: 'bg-info text-info-fg' },

      { variant: 'soft', intent: 'primary', class: 'bg-primary-subtle text-primary-subtle-fg' },
      { variant: 'soft', intent: 'neutral', class: 'bg-neutral-subtle text-neutral-subtle-fg' },
      { variant: 'soft', intent: 'danger', class: 'bg-danger-subtle text-danger-subtle-fg' },
      { variant: 'soft', intent: 'warning', class: 'bg-warning-subtle text-warning-subtle-fg' },
      { variant: 'soft', intent: 'success', class: 'bg-success-subtle text-success-subtle-fg' },
      { variant: 'soft', intent: 'info', class: 'bg-info-subtle text-info-subtle-fg' },

      { variant: 'outline', intent: 'primary', class: 'border-primary text-primary-subtle-fg' },
      { variant: 'outline', intent: 'neutral', class: 'border-border-strong text-fg-muted' },
      { variant: 'outline', intent: 'danger', class: 'border-danger text-danger-subtle-fg' },
      { variant: 'outline', intent: 'warning', class: 'border-warning text-warning-subtle-fg' },
      { variant: 'outline', intent: 'success', class: 'border-success text-success-subtle-fg' },
      { variant: 'outline', intent: 'info', class: 'border-info text-info-subtle-fg' },
    ],
  },
)

type BadgeVariants = VariantProps<typeof badge>

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    variant?: NonNullable<BadgeVariants['variant']>
    intent?: NonNullable<BadgeVariants['intent']>
    size?: NonNullable<BadgeVariants['size']>
  }>(),
  { variant: 'soft', intent: 'neutral', size: 'md' },
)

const { classes, attrs } = useClasses(() => badge(props))
</script>

<template>
  <span v-bind="attrs" :class="classes"><slot /></span>
</template>
