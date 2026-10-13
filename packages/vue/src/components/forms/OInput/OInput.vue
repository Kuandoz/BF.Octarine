<script setup lang="ts">
import { useClasses } from '../../../composables/useClasses'
import { useFormField } from '../../../composables/useFormField'
import { cva, type VariantProps } from '../../../utils/variants'

const input = cva(
  [
    'transition-standard w-full rounded-md border bg-surface text-fg shadow-xs',
    'placeholder:text-fg-subtle',
    'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring',
    'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60',
  ],
  {
    variants: {
      size: {
        sm: 'h-8 px-2.5 text-body-sm',
        md: 'h-10 px-3 text-body',
        lg: 'h-12 px-4 text-body-lg',
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
