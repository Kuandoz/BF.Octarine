import { computed, useAttrs } from 'vue'
import { cn } from '../utils/variants'

/**
 * Merges a component's own classes with the `class` passed by the consumer, so
 * `<OButton class="rounded-full">` replaces `rounded-md` instead of fighting it.
 *
 * Use together with `defineOptions({ inheritAttrs: false })` and bind the
 * returned `attrs` (everything except `class`) to the root element.
 */
export function useClasses(own: () => string) {
  const allAttrs = useAttrs()
  const classes = computed(() => cn(own(), allAttrs.class as Parameters<typeof cn>[0]))
  const attrs = computed(() => {
    const { class: _, ...rest } = allAttrs
    return rest
  })
  return { classes, attrs }
}
