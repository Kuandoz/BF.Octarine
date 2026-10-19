<script setup lang="ts">
import { useMessages } from '../../../composables/useMessages'

// Shared by OField and OFieldset: sits inside the <label> or <legend>.
defineProps<{
  star: boolean
  optional: boolean
  /** Say "required" to screen readers too: a group has no `required` attribute. */
  announce?: boolean
}>()

const t = useMessages()
</script>

<template>
  <!-- A control's `required` announces it; the star itself is visual only.
       Spaces are in the expressions: the template compiler trims them from text. -->
  <template v-if="star">
    <span class="text-danger" aria-hidden="true">{{ ' *' }}</span>
    <span v-if="announce" class="sr-only">{{ ` ${t('field.required')}` }}</span>
  </template>
  <span v-else-if="optional" class="font-normal text-fg-muted">{{
    ` ${t('field.optional')}`
  }}</span>
</template>
