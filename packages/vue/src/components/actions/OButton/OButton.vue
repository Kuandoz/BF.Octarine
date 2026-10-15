<script setup lang="ts">
import { computed, useAttrs, useSlots } from 'vue'
import OSpinner from '../../feedback/OSpinner/OSpinner.vue'
import OIcon from '../../foundations/OIcon/OIcon.vue'
import { normalizeIcon, type IconProp, type IconSize } from '../../foundations/OIcon/icon'
import { useClasses } from '../../../composables/useClasses'
import { cva, type VariantProps } from '../../../utils/variants'

const button = cva(
  [
    'focus-ring transition-standard inline-flex items-center justify-center gap-2',
    'theme-border rounded-control border-transparent text-label whitespace-nowrap select-none',
    '[text-transform:var(--oct-button-transform)]',
    'disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none',
  ],
  {
    variants: {
      variant: {
        solid: 'border-(--oct-button-solid-border) shadow-control',
        soft: '',
        outline: 'bg-transparent',
        ghost: 'bg-transparent',
      },
      intent: {
        primary: '',
        neutral: '',
        danger: '',
      },
      size: {
        sm: 'min-h-(--oct-control-height-sm) min-w-(--oct-control-height-sm) px-(--oct-control-px-sm)',
        md: 'min-h-(--oct-control-height-md) min-w-(--oct-control-height-md) px-(--oct-control-px-md)',
        lg: 'min-h-(--oct-control-height-lg) min-w-(--oct-control-height-lg) px-(--oct-control-px-lg)',
      },
      block: {
        true: 'w-full',
      },
      /** Square: the min width equals the height. */
      iconOnly: {
        true: 'px-0',
      },
    },
    compoundVariants: [
      {
        variant: 'solid',
        intent: 'primary',
        class: 'bg-primary text-primary-fg hover:bg-primary-hover',
      },
      {
        variant: 'solid',
        intent: 'neutral',
        class: 'bg-neutral text-neutral-fg hover:bg-neutral-hover',
      },
      {
        variant: 'solid',
        intent: 'danger',
        class: 'bg-danger text-danger-fg hover:bg-danger-hover',
      },

      {
        variant: 'soft',
        intent: 'primary',
        class: 'bg-primary-subtle text-primary-subtle-fg hover:bg-primary-subtle/70',
      },
      {
        variant: 'soft',
        intent: 'neutral',
        class: 'bg-neutral-subtle text-neutral-subtle-fg hover:bg-neutral-subtle/70',
      },
      {
        variant: 'soft',
        intent: 'danger',
        class: 'bg-danger-subtle text-danger-subtle-fg hover:bg-danger-subtle/70',
      },

      {
        variant: 'outline',
        intent: 'primary',
        class: 'border-primary text-primary hover:bg-primary-subtle',
      },
      {
        variant: 'outline',
        intent: 'neutral',
        class: 'border-border-strong text-fg hover:bg-surface-sunken',
      },
      {
        variant: 'outline',
        intent: 'danger',
        class: 'border-danger text-danger hover:bg-danger-subtle',
      },

      { variant: 'ghost', intent: 'primary', class: 'text-primary hover:bg-primary-subtle' },
      { variant: 'ghost', intent: 'neutral', class: 'text-fg hover:bg-surface-sunken' },
      { variant: 'ghost', intent: 'danger', class: 'text-danger hover:bg-danger-subtle' },
    ],
  },
)

type ButtonVariants = VariantProps<typeof button>

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    variant?: NonNullable<ButtonVariants['variant']>
    intent?: NonNullable<ButtonVariants['intent']>
    size?: NonNullable<ButtonVariants['size']>
    type?: 'button' | 'submit' | 'reset'
    block?: boolean
    disabled?: boolean
    /** Shows a spinner in place of the leading icon and blocks interaction. */
    loading?: boolean
    /**
     * Leading icon: a name, an imported icon or `OIcon` props. Without a label the
     * button is icon-only and needs an `aria-label`.
     */
    icon?: IconProp
    /** Trailing icon. */
    iconEnd?: IconProp
  }>(),
  {
    variant: 'solid',
    intent: 'primary',
    size: 'md',
    type: 'button',
    block: false,
    disabled: false,
    loading: false,
  },
)

defineSlots<{
  default?: () => unknown
  leading?: () => unknown
  trailing?: () => unknown
}>()

const slots = useSlots()
const iconOnly = computed(() => Boolean(props.icon) && !slots.default)

const iconSize: Record<NonNullable<ButtonVariants['size']>, IconSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
}
// The button sets the size; the icon's own props win. Icons follow the button's
// text color and disabled styling, so `disabled` isn't passed on.
const withSize = (icon: IconProp | undefined) => {
  const normalized = normalizeIcon(icon)
  return normalized && { size: iconSize[props.size], ...normalized }
}
const leadingIcon = computed(() => withSize(props.icon))
const trailingIcon = computed(() => withSize(props.iconEnd))

const allAttrs = useAttrs()
if (iconOnly.value && !allAttrs['aria-label'] && !allAttrs['aria-labelledby']) {
  console.warn('[OButton] an icon-only button needs an aria-label (WCAG 4.1.2).')
}

const { classes, attrs } = useClasses(() => button({ ...props, iconOnly: iconOnly.value }))
</script>

<template>
  <button
    :type="type"
    v-bind="attrs"
    :class="classes"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <OSpinner v-if="loading" size="sm" label="" />
    <slot v-else name="leading">
      <OIcon v-if="leadingIcon" v-bind="leadingIcon" />
    </slot>
    <slot />
    <slot name="trailing">
      <OIcon v-if="trailingIcon" v-bind="trailingIcon" />
    </slot>
  </button>
</template>
