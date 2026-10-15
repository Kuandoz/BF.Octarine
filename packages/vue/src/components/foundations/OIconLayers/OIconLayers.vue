<script setup lang="ts">
import { computed, provide } from 'vue'
import { useClasses } from '../../../composables/useClasses'
import { iconLayerKey } from '../../../composables/useIcons'
import { iconClasses, type IconIntent, type IconSize } from '../OIcon/icon'

/**
 * Stacks `OIcon`s into one icon, e.g. a user with a status badge. Each child is a
 * layer in a 24-unit square, placed with its `transform` prop; the last one is
 * drawn on top.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Color for layers without their own intent. */
    intent?: IconIntent
    size?: IconSize
    disabled?: boolean
    /** Accessible name for the combined icon; without it the icon is decorative. */
    label?: string
  }>(),
  { disabled: false },
)

defineSlots<{ default?: () => unknown }>()

provide(iconLayerKey, true)

const { classes, attrs } = useClasses(() => iconClasses({ ...props, layer: false }))

const a11y = computed(() =>
  props.label ? { role: 'img', 'aria-label': props.label } : { 'aria-hidden': 'true' as const },
)
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    v-bind="{ ...a11y, ...attrs }"
    :class="classes"
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    focusable="false"
  >
    <slot />
  </svg>
</template>
