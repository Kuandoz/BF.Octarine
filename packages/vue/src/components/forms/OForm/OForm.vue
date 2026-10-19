<script setup lang="ts">
import { computed, inject, provide, ref } from 'vue'
import { useClasses } from '../../../composables/useClasses'
import { provideForm, type RequiredMarkers } from '../../../composables/useFormField'
import {
  languageKey,
  messagesFor,
  messagesKey,
  useLanguage,
} from '../../../composables/useMessages'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** How fields show whether they must be filled in. Fields can override it. */
    markers?: RequiredMarkers
    /** The form's language, when it differs from the page; Octarine's own text follows it. */
    lang?: string
  }>(),
  { markers: 'required', lang: undefined },
)

const outer = useLanguage()
const language = computed(() => props.lang || outer.value)
provide(languageKey, language)
// inject() only sees the parent's provides, so resolve the form's own language here.
const t = messagesFor(() => language.value, inject(messagesKey, {}))

const requiredCount = ref(0)
provideForm({
  markers: computed(() => props.markers),
  registerRequired: () => {
    requiredCount.value++
    return () => requiredCount.value--
  },
})

const { classes, attrs } = useClasses(() => 'flex flex-col gap-6')
</script>

<template>
  <form v-bind="attrs" :class="classes" :lang="lang">
    <!-- Explains the star, only when a field shows one. -->
    <p v-if="requiredCount > 0" class="text-body-sm text-fg-muted">{{ t('form.requiredNote') }}</p>
    <slot />
  </form>
</template>
