import { defaultTheme, themes, type ThemeName } from '@octarine/tokens'
import { onScopeDispose, ref, watchEffect } from 'vue'

const STORAGE_KEY = 'octarine-theme'
const theme = ref<ThemeName>(defaultTheme.name as ThemeName)
let initialized = false

function init() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && stored in themes) theme.value = stored as ThemeName
  } catch {
    // Storage can be unavailable (private mode, sandboxed iframes).
  }
}

/** Adds the theme's web-font stylesheet to <head> once. */
function loadFonts(name: ThemeName) {
  const href = themes[name].fonts.href
  if (!href || document.querySelector(`link[data-octarine-fonts="${name}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.octarineFonts = name
  document.head.append(link)
}

/**
 * Theme switching. Sets `data-theme` on <html>; the theme's CSS must be loaded
 * (`@import '@octarine/tokens/themes/all.css'`, or a single theme's file).
 * Combine with `useColorMode()` for light/dark.
 */
export function useTheme(options: { loadFonts?: boolean } = {}) {
  init()

  const stop = watchEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.theme = theme.value
    if (options.loadFonts !== false) loadFonts(theme.value)
    try {
      localStorage.setItem(STORAGE_KEY, theme.value)
    } catch {
      // Ignore: the preference just won't persist.
    }
  })
  onScopeDispose(stop)

  return { theme, themes }
}
