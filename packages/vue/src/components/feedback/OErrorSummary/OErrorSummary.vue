<script setup lang="ts">
import { exclamationCircle } from '@octarine/icons/heroicons/mini'
import { onMounted, ref, useId } from 'vue'
import OHeading from '../../foundations/OHeading/OHeading.vue'
import OIcon from '../../foundations/OIcon/OIcon.vue'
import { useClasses } from '../../../composables/useClasses'
import { useMessages } from '../../../composables/useMessages'

export interface ErrorSummaryItem {
  message: string
  /** Id of the control to jump to; without one, the message is plain text. */
  target?: string
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    errors: ErrorSummaryItem[]
    /** Replaces the translated "There is a problem". */
    title?: string
    headingLevel?: 2 | 3 | 4
    /**
     * Takes focus when it appears, so keyboard and screen-reader users land on
     * it after a failed submit. Re-key it on every attempt to focus it again.
     */
    autofocus?: boolean
  }>(),
  { title: undefined, headingLevel: 2, autofocus: true },
)

const t = useMessages()
const headingId = useId()
const root = ref<HTMLElement>()

/** Brings the field's label into view and puts focus on the control. */
function goTo(target: string) {
  const control = document.getElementById(target)
  if (!control) return
  const label = document.querySelector(`label[for="${CSS.escape(target)}"]`)
  ;(label ?? control).scrollIntoView({ block: 'center' })
  control.focus({ preventScroll: true })
}

function focus() {
  root.value?.focus()
}

onMounted(() => {
  if (props.autofocus) focus()
})

defineExpose({ focus })

const { classes, attrs } = useClasses(
  () =>
    'theme-border block rounded-card border-danger bg-surface p-(--oct-card-padding) focus-ring',
)
</script>

<template>
  <div
    ref="root"
    v-bind="attrs"
    :class="classes"
    tabindex="-1"
    role="region"
    :aria-labelledby="headingId"
  >
    <OHeading :id="headingId" :level="headingLevel" :size="4" class="flex items-center gap-2">
      <OIcon :icon="exclamationCircle" intent="danger" size="md" />
      {{ title ?? t.errorSummary }}
    </OHeading>
    <ul class="mt-3 flex list-disc flex-col gap-1.5 ps-12 text-body text-danger">
      <li v-for="(error, index) in errors" :key="error.target ?? index">
        <a
          v-if="error.target"
          :href="`#${error.target}`"
          class="focus-ring rounded-sm underline underline-offset-2"
          @click.prevent="goTo(error.target)"
        >
          {{ error.message }}
        </a>
        <template v-else>{{ error.message }}</template>
      </li>
    </ul>
  </div>
</template>
