<script setup lang="ts">
import { iconKey, type IconDefinition, type IconNode } from '@octarine/icons'
import { computed, h, inject, useId, type FunctionalComponent } from 'vue'
import { useClasses } from '../../../composables/useClasses'
import { iconLayerKey, iconsKey } from '../../../composables/useIcons'
import { iconClasses, missingIcon, transformAttribute, warnMissing, type OIconProps } from './icon'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<OIconProps>(), { variant: 'outline', disabled: false })

const registry = inject(iconsKey, {})
const layer = inject(iconLayerKey, false)

const definition = computed((): IconDefinition => {
  if (props.icon) return props.icon
  const key = props.name ? iconKey(props.name, props.variant) : ''
  const found = registry[key]
  if (found) return found
  warnMissing(props.name ? key : undefined)
  return missingIcon
})

// Ids (gradients, masks) are made unique per instance, so icons never share them.
const uid = useId()
const scope = computed(() => (definition.value.ids ? `oi${uid.replace(/[^\w-]/g, '')}` : undefined))

function scoped(attrs: Record<string, string>, prefix: string) {
  return Object.fromEntries(
    Object.entries(attrs).map(([name, value]) => [
      name,
      name === 'id'
        ? `${prefix}-${value}`
        : name === 'href'
          ? value.replace(/^#/, `#${prefix}-`)
          : value.replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`),
    ]),
  )
}

const renderNodes = (nodes: IconNode[], prefix?: string): ReturnType<typeof h>[] =>
  nodes.map(([tag, attrs, children]) =>
    h(tag, prefix ? scoped(attrs, prefix) : attrs, children && renderNodes(children, prefix)),
  )

const Nodes: FunctionalComponent<{ nodes: IconNode[]; prefix?: string }> = (p) =>
  renderNodes(p.nodes, p.prefix)

const { classes, attrs } = useClasses(() =>
  iconClasses({
    layer,
    intent: definition.value.multicolor ? undefined : props.intent,
    size: layer ? undefined : props.size,
    disabled: props.disabled,
  }),
)

const a11y = computed(() =>
  layer
    ? {}
    : props.label
      ? { role: 'img', 'aria-label': props.label }
      : { 'aria-hidden': 'true' as const },
)
</script>

<template>
  <g v-if="layer" :transform="transformAttribute(transform)">
    <svg
      v-bind="{ ...definition.attrs, ...attrs }"
      :class="classes"
      :viewBox="definition.viewBox"
      width="24"
      height="24"
    >
      <Nodes :nodes="definition.nodes" :prefix="scope" />
    </svg>
  </g>
  <svg
    v-else
    xmlns="http://www.w3.org/2000/svg"
    v-bind="{ ...definition.attrs, ...a11y, ...attrs }"
    :class="classes"
    :viewBox="definition.viewBox"
    width="1em"
    height="1em"
    focusable="false"
  >
    <Nodes :nodes="definition.nodes" :prefix="scope" />
  </svg>
</template>
