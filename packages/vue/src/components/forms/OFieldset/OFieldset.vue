<script setup lang="ts">
import { computed, useId } from 'vue'
import { useClasses } from '../../../composables/useClasses'
import {
  provideFormField,
  useRequiredMarker,
  type RequiredMarkers,
} from '../../../composables/useFormField'
import FieldError from '../OField/FieldError.vue'
import FieldMarker from '../OField/FieldMarker.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Names the group, like a label names a field. */
    legend: string
    hint?: string
    error?: string
    /** Marks the group; validating it (e.g. one option chosen) is up to the app. */
    required?: boolean
    disabled?: boolean
    markers?: RequiredMarkers
  }>(),
  { hint: undefined, error: undefined, required: false, disabled: false, markers: undefined },
)

const id = useId()
const hintId = `${id}-hint`
const errorId = `${id}-error`

const marker = useRequiredMarker({ required: () => props.required, markers: () => props.markers })

// The group describes itself; each control inside keeps its own id and label,
// and inherits invalid and disabled. `required` stays off the controls: a
// required checkbox group doesn't mean every box must be checked.
provideFormField({
  id: computed(() => undefined),
  describedBy: computed(() => undefined),
  invalid: computed(() => !!props.error),
  required: computed(() => false),
  disabled: computed(() => props.disabled),
})

const { classes, attrs } = useClasses(() => 'min-w-0')
</script>

<template>
  <fieldset
    v-bind="attrs"
    :class="classes"
    :disabled="disabled"
    :aria-describedby="[hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined"
  >
    <legend class="mb-(--oct-field-gap) text-label text-fg" :class="{ 'opacity-50': disabled }">
      {{ legend
      }}<FieldMarker :star="marker.star.value" :optional="marker.optional.value" announce />
    </legend>
    <div class="flex flex-col gap-(--oct-field-gap)">
      <p v-if="hint" :id="hintId" class="text-body-sm text-fg-muted">{{ hint }}</p>
      <slot />
      <FieldError v-if="error" :id="errorId" :message="error" />
    </div>
  </fieldset>
</template>
