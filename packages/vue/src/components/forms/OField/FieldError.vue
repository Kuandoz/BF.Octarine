<script setup lang="ts">
import { exclamationCircle } from '@octarine/icons/heroicons/mini'
import OIcon from '../../foundations/OIcon/OIcon.vue'
import { useMessages } from '../../../composables/useMessages'

// Shared by OField and OFieldset.
defineProps<{ id: string; message: string }>()

const t = useMessages()
</script>

<template>
  <!-- The labelled icon makes it "Error: …" for screen readers, and more than red. -->
  <p :id="id" class="flex items-start gap-1.5 text-body-sm text-danger">
    <OIcon :icon="exclamationCircle" size="sm" :label="t('error.label')" class="mt-0.5" />
    <span>{{ message }}</span>
  </p>
</template>
