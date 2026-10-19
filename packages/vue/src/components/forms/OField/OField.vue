<script setup lang="ts">
import { computed, onScopeDispose, ref, useId, watch } from 'vue'
import { useClasses } from '../../../composables/useClasses'
import {
  injectFormField,
  provideFormField,
  useRequiredMarker,
  type RequiredMarkers,
} from '../../../composables/useFormField'
import { useMessages } from '../../../composables/useMessages'
import FieldError from './FieldError.vue'
import FieldMarker from './FieldMarker.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label: string
    /** Help text, shown above the control so it's read before typing. */
    hint?: string
    /** Error message, shown below the control as well as the hint; marks the control invalid. */
    error?: string
    required?: boolean
    disabled?: boolean
    /** Overrides the generated control id. */
    id?: string
    /** Overrides the enclosing OForm's markers. */
    markers?: RequiredMarkers
    /** Shows a character counter. The control is not cut off, so pasted text can be fixed. */
    maxLength?: number
  }>(),
  {
    hint: undefined,
    error: undefined,
    required: false,
    disabled: false,
    id: undefined,
    markers: undefined,
    maxLength: undefined,
  },
)

defineSlots<{
  default(): unknown
  /** A link or toggletip next to the label, e.g. "Forgot password?". */
  'label-action'?(): unknown
}>()

const t = useMessages()
const group = injectFormField()

const generatedId = useId()
const id = computed(() => props.id ?? generatedId)
const hintId = computed(() => `${id.value}-hint`)
const errorId = computed(() => `${id.value}-error`)
const counterId = computed(() => `${id.value}-counter`)

const marker = useRequiredMarker({ required: () => props.required, markers: () => props.markers })
const disabled = computed(() => props.disabled || (group?.disabled.value ?? false))

// Counter: the visible "12 / 60" is hidden from screen readers, which hear the
// limit once (described by) and a polite update only when it gets close.
const length = ref(0)
const remaining = computed(() => (props.maxLength ?? 0) - length.value)
const counterText = computed(() =>
  remaining.value < 0
    ? t.value('counter.charactersOver', { count: -remaining.value })
    : `${length.value} / ${props.maxLength}`,
)
const announcement = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
watch([remaining, t], () => {
  clearTimeout(timer)
  if (props.maxLength === undefined) return
  const near = remaining.value <= Math.max(5, Math.ceil(props.maxLength * 0.2))
  timer = setTimeout(() => {
    announcement.value = !near
      ? ''
      : remaining.value < 0
        ? t.value('counter.charactersOver', { count: -remaining.value })
        : t.value('counter.charactersLeft', { count: remaining.value })
  }, 750)
})
onScopeDispose(() => clearTimeout(timer))

provideFormField({
  id,
  describedBy: computed(
    () =>
      [
        props.hint && hintId.value,
        props.error && errorId.value,
        props.maxLength !== undefined && counterId.value,
      ]
        .filter(Boolean)
        .join(' ') || undefined,
  ),
  invalid: computed(() => !!props.error || (group?.invalid.value ?? false)),
  required: computed(() => props.required),
  disabled,
  setLength: (n) => (length.value = n),
})

const { classes, attrs } = useClasses(() => 'flex flex-col gap-(--oct-field-gap)')
</script>

<template>
  <div v-bind="attrs" :class="classes">
    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <label :for="id" class="text-label text-fg" :class="{ 'opacity-50': disabled }">
        {{ label }}<FieldMarker :star="marker.star.value" :optional="marker.optional.value" />
      </label>
      <slot name="label-action" />
    </div>
    <p v-if="hint" :id="hintId" class="text-body-sm text-fg-muted">{{ hint }}</p>
    <slot />
    <div
      v-if="error || maxLength !== undefined"
      class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1"
    >
      <FieldError v-if="error" :id="errorId" :message="error" />
      <template v-if="maxLength !== undefined">
        <p :id="counterId" class="sr-only">{{ t('counter.maxLength', { max: maxLength }) }}</p>
        <p
          aria-hidden="true"
          class="ms-auto text-body-sm tabular-nums"
          :class="remaining < 0 ? 'text-danger' : 'text-fg-muted'"
        >
          {{ counterText }}
        </p>
        <p class="sr-only" aria-live="polite">{{ announcement }}</p>
      </template>
    </div>
  </div>
</template>
