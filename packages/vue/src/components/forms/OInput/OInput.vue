<script setup lang="ts">
import { useClasses } from '../../../composables/useClasses'
import { useFormField } from '../../../composables/useFormField'
import { cva, type VariantProps } from '../../../utils/variants'

const input = cva(
  [
    'transition-standard theme-border w-full rounded-input bg-surface px-(--oct-input-px) text-fg',
    'placeholder:text-fg-subtle',
    'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring',
    // Dashed as well as dimmed, so "disabled" doesn't rely on color alone.
    'disabled:cursor-not-allowed disabled:border-dashed disabled:bg-surface-sunken disabled:text-fg-muted',
  ],
  {
    variants: {
      size: {
        sm: 'min-h-(--oct-control-height-sm) text-body-sm',
        md: 'min-h-(--oct-control-height-md) text-body',
        lg: 'min-h-(--oct-control-height-lg) text-body-lg',
      },
      invalid: {
        true: 'border-danger focus-visible:outline-danger',
        false: 'border-border-strong',
      },
    },
  },
)

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    size?: NonNullable<VariantProps<typeof input>['size']>
    type?: string
    id?: string
    // `undefined` defaults let a wrapping OField supply these.
    invalid?: boolean
    disabled?: boolean
  }>(),
  { size: 'md', type: 'text', id: undefined, invalid: undefined, disabled: undefined },
)

const model = defineModel<string | number>()

const field = useFormField({
  id: () => props.id,
  invalid: () => props.invalid,
  disabled: () => props.disabled,
})

const { classes, attrs } = useClasses(() =>
  input({ size: props.size, invalid: field.invalid.value }),
)
</script>

<template>
  <input
    v-bind="attrs"
    :id="field.id.value"
    v-model="model"
    :type="type"
    :class="classes"
    :disabled="field.disabled.value"
    :required="field.required.value || undefined"
    :aria-invalid="field.invalid.value || undefined"
    :aria-describedby="field.describedBy.value"
  />
</template>
