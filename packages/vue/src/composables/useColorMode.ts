import { computed, onScopeDispose, ref, watchEffect } from 'vue'

export type ColorModePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'octarine-mode'
const preference = ref<ColorModePreference>('system')
const systemDark = ref(false)
let initialized = false

function init() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') preference.value = stored
  } catch {
    // Storage can be unavailable (private mode, sandboxed iframes).
  }
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  systemDark.value = media.matches
  media.addEventListener('change', (e) => (systemDark.value = e.matches))
}

/**
 * Light/dark switching. Sets `data-mode` on <html>, which swaps the semantic
 * color tokens of whichever theme is active; components never need `dark:` classes.
 */
export function useColorMode() {
  init()

  const resolved = computed<'light' | 'dark'>(() =>
    preference.value === 'system' ? (systemDark.value ? 'dark' : 'light') : preference.value,
  )

  const stop = watchEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.mode = resolved.value
    try {
      localStorage.setItem(STORAGE_KEY, preference.value)
    } catch {
      // Ignore: the preference just won't persist.
    }
  })
  onScopeDispose(stop)

  return {
    preference,
    resolved,
    toggle: () => (preference.value = resolved.value === 'dark' ? 'light' : 'dark'),
  }
}
