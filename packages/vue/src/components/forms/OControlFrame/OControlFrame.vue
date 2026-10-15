<script setup lang="ts">
import { useClasses } from '../../../composables/useClasses'
import { cva, type VariantProps } from '../../../utils/variants'

const frame = cva(
  [
    'transition-standard theme-border flex w-full items-center gap-2 rounded-input bg-surface px-(--oct-input-px) text-fg',
    // The ring follows the native control; buttons inside have their own.
    'has-[[data-control]:focus-visible]:outline-2 has-[[data-control]:focus-visible]:outline-offset-0',
  ],
  {
    variants: {
      size: {
        sm: 'min-h-(--oct-control-height-sm) text-body-sm',
        md: 'min-h-(--oct-control-height-md) text-body',
        lg: 'min-h-(--oct-control-height-lg) text-body-lg',
      },
      invalid: {
        true: 'border-danger has-[[data-control]:focus-visible]:outline-danger',
        false: 'border-border-strong has-[[data-control]:focus-visible]:outline-ring',
      },
      // Grayed out like a disabled OButton; the field's label dims with it.
      disabled: {
        true: 'cursor-not-allowed bg-surface-sunken opacity-50',
      },
      // Sunken but not dimmed: the value is still there to read and copy.
      readonly: {
        true: 'bg-surface-sunken',
      },
    },
  },
)

export type ControlFrameSize = NonNullable<VariantProps<typeof frame>['size']>

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    size?: ControlFrameSize
    invalid?: boolean
    disabled?: boolean
    readonly?: boolean
  }>(),
  { size: 'md', invalid: false, disabled: false, readonly: false },
)

defineSlots<{
  /** The native control; mark it with `data-control`. */
  default(): unknown
  /** Icons or prefix text before the control. */
  leading?(): unknown
  /** Suffix text, status icons and buttons after the control. */
  trailing?(): unknown
}>()

/** A click on the padding, an icon or prefix text focuses the control. */
function focusControl(event: MouseEvent) {
  const target = event.target as Element
  if (target.closest('[data-control], button, a, input, select, textarea')) return
  ;(event.currentTarget as Element).querySelector<HTMLElement>('[data-control]')?.focus()
}

// The root also gets `aria-disabled`: prefix and suffix text are part of the
// disabled control, so they share its contrast exemption.
const { classes, attrs } = useClasses(() => frame(props))
</script>

<template>
  <div v-bind="attrs" :class="classes" :aria-disabled="disabled || undefined" @click="focusControl">
    <slot name="leading" />
    <slot />
    <slot name="trailing" />
  </div>
</template>
