import { effectScope, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { useColorMode } from './useColorMode'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  it('sets data-theme on <html> and loads the theme fonts once', async () => {
    const scope = effectScope()
    const { theme } = scope.run(() => useTheme())!
    expect(document.documentElement.dataset.theme).toBe('octarine')

    theme.value = 'prism'
    await nextTick()
    theme.value = 'octarine'
    await nextTick()
    theme.value = 'prism'
    await nextTick()
    expect(document.documentElement.dataset.theme).toBe('prism')
    expect(document.querySelectorAll('link[data-octarine-fonts="prism"]')).toHaveLength(1)
    scope.stop()
  })
})

describe('useColorMode', () => {
  it('sets data-mode on <html> and toggles between light and dark', async () => {
    window.matchMedia ??= (() => ({ matches: false, addEventListener() {} })) as never
    const scope = effectScope()
    const { preference, resolved, toggle } = scope.run(() => useColorMode())!

    preference.value = 'light'
    await nextTick()
    expect(document.documentElement.dataset.mode).toBe('light')

    toggle()
    await nextTick()
    expect(resolved.value).toBe('dark')
    expect(document.documentElement.dataset.mode).toBe('dark')
    scope.stop()
  })
})
