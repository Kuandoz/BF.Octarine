<script setup lang="ts">
import { nextTick, ref } from 'vue'
import {
  FormComponent,
  FormRows,
  type FieldDefinition,
  useField,
  useFormEngine,
} from '../../../../../packages/form-engine/src'
import { OButton, OCard, OFieldset, OHeading } from '../../../../../packages/vue/src'

// A list of rows with Add and Remove. The Add button carries the field's id, so
// an error on the list itself (too few rows) links to it.
const props = defineProps<{ field: FieldDefinition }>()
const engine = useFormEngine()
const { id, path, label, hint, error, value } = useField<unknown[]>(() => props.field)
const itemLabel = () => (props.field.itemLabel as string | undefined) ?? 'Item'
const list = ref<HTMLElement>()

async function add() {
  engine.addRepeatItem(path.value)
  await nextTick()
  // Put focus in the new row, so keyboard users can go on typing.
  list.value
    ?.querySelector<HTMLElement>(':scope > :last-child :is(input, select, textarea)')
    ?.focus()
}

async function remove(index: number, removeRow: () => void) {
  removeRow()
  await nextTick()
  // Focus would otherwise be lost with the removed button.
  const rows = list.value?.querySelectorAll<HTMLElement>(':scope > *') ?? []
  const next = rows[Math.min(index, rows.length - 1)]
  ;(
    next?.querySelector<HTMLElement>(':is(input, select, textarea)') ?? document.getElementById(id)
  )?.focus()
}
</script>

<template>
  <OFieldset :legend="label" :hint="hint" :error="error">
    <div ref="list" class="flex flex-col gap-4">
      <FormRows v-slot="{ index, components, remove: removeRow }" :field="field">
        <OCard class="flex flex-col gap-4">
          <OHeading :level="3" :size="4">{{ itemLabel() }} {{ index + 1 }}</OHeading>
          <FormComponent :components="components" />
          <OButton
            class="self-start"
            variant="ghost"
            intent="danger"
            icon="trash"
            @click="remove(index, removeRow)"
          >
            Remove {{ itemLabel().toLowerCase() }} {{ index + 1 }}
          </OButton>
        </OCard>
      </FormRows>
    </div>
    <OButton
      :id="id"
      class="mt-4 self-start"
      variant="outline"
      icon="plus"
      :aria-describedby="value?.length ? undefined : `${id}-empty`"
      @click="add"
    >
      Add {{ itemLabel().toLowerCase() }}
    </OButton>
    <p v-if="!value?.length" :id="`${id}-empty`" class="mt-2 text-body-sm text-fg-muted">
      No {{ itemLabel().toLowerCase() }}s yet.
    </p>
  </OFieldset>
</template>
