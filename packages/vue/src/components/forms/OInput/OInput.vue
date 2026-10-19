<script setup lang="ts">
import { exclamationCircle, lockClosed, xMark } from '@octarine/icons/heroicons/mini'
import { computed, onMounted, ref, useAttrs, useId, watch } from 'vue'
import OSpinner from '../../feedback/OSpinner/OSpinner.vue'
import OIcon from '../../foundations/OIcon/OIcon.vue'
import { normalizeIcon, type IconProp } from '../../foundations/OIcon/icon'
import OControlFrame, { type ControlFrameSize } from '../OControlFrame/OControlFrame.vue'
import { useFormField } from '../../../composables/useFormField'
import { useMessages } from '../../../composables/useMessages'

// `class` goes to the frame, every other attribute to the <input>.
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    size?: ControlFrameSize
    type?: string
    id?: string
    // `undefined` defaults let a wrapping OField supply these.
    invalid?: boolean
    disabled?: boolean
    readonly?: boolean
    /** A decorative icon before the value. */
    icon?: IconProp
    /** Text before the value, e.g. `€` or `https://`; read out with the input. */
    prefix?: string
    /** Text after the value, e.g. `kg`; read out with the input. */
    suffix?: string
    /** Adds a button that empties the input. */
    clearable?: boolean
    /** Shows a spinner, announced as loading. */
    loading?: boolean
  }>(),
  {
    size: 'md',
    type: 'text',
    id: undefined,
    invalid: undefined,
    disabled: undefined,
    readonly: false,
    icon: undefined,
    prefix: undefined,
    suffix: undefined,
    clearable: false,
    loading: false,
  },
)

const model = defineModel<string | number>()

defineSlots<{
  /** Extra content before the value, after the icon and prefix. */
  leading?(): unknown
  /** Extra content after the value, e.g. a show-password button. */
  trailing?(): unknown
}>()

const attrs = useAttrs()
const inputAttrs = computed(() => {
  const { class: _, ...rest } = attrs
  return rest
})

const t = useMessages()
const field = useFormField({
  id: () => props.id,
  invalid: () => props.invalid,
  disabled: () => props.disabled,
})

const ownId = useId()
const prefixId = `${ownId}-prefix`
const suffixId = `${ownId}-suffix`
const describedBy = computed(
  () =>
    [props.prefix && prefixId, props.suffix && suffixId, field.describedBy.value]
      .filter(Boolean)
      .join(' ') || undefined,
)

const iconSize = { sm: 'sm', md: 'md', lg: 'md' } as const

// After mount: during the field's render, the update would be lost.
const length = computed(() => String(model.value ?? '').length)
onMounted(() => field.setLength(length.value))
watch(length, field.setLength)

const input = ref<HTMLInputElement>()
const canClear = computed(
  () => props.clearable && !field.disabled.value && !props.readonly && length.value > 0,
)

function clear() {
  model.value = ''
  input.value?.focus()
}
</script>

<template>
  <OControlFrame
    :class="attrs.class"
    :size="size"
    :invalid="field.invalid.value"
    :disabled="field.disabled.value"
    :readonly="readonly"
  >
    <template v-if="icon || prefix || $slots.leading" #leading>
      <OIcon
        v-if="icon"
        :size="iconSize[size]"
        class="text-fg-muted"
        v-bind="normalizeIcon(icon)"
      />
      <span v-if="prefix" :id="prefixId" class="shrink-0 text-fg-muted">{{ prefix }}</span>
      <slot name="leading" />
    </template>
    <input
      v-bind="inputAttrs"
      :id="field.id.value"
      ref="input"
      v-model="model"
      data-control
      :type="type"
      class="min-w-0 flex-1 self-stretch bg-transparent placeholder:text-fg-subtle focus-visible:outline-none disabled:cursor-not-allowed"
      :disabled="field.disabled.value"
      :readonly="readonly || undefined"
      :required="field.required.value || undefined"
      :aria-invalid="field.invalid.value || undefined"
      :aria-describedby="describedBy"
    />
    <template
      v-if="suffix || loading || field.invalid.value || readonly || clearable || $slots.trailing"
      #trailing
    >
      <span v-if="suffix" :id="suffixId" class="shrink-0 text-fg-muted">{{ suffix }}</span>
      <OSpinner v-if="loading" size="sm" :label="t('status.loading')" class="text-fg-muted" />
      <OIcon v-else-if="field.invalid.value" :icon="exclamationCircle" intent="danger" size="sm" />
      <OIcon v-else-if="readonly" :icon="lockClosed" size="sm" class="text-fg-muted" />
      <button
        v-if="canClear"
        type="button"
        :aria-label="t('input.clear')"
        class="focus-ring transition-standard -me-1 flex size-6 shrink-0 items-center justify-center rounded-control text-fg-muted hover:bg-surface-sunken hover:text-fg"
        @click="clear"
      >
        <OIcon :icon="xMark" size="sm" />
      </button>
      <slot name="trailing" />
    </template>
  </OControlFrame>
</template>
