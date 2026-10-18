import { DocsContainer, type DocsContainerProps } from '@storybook/addon-docs/blocks'
import { createElement, type PropsWithChildren, useEffect, useState } from 'react'
import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events'
import { addons } from 'storybook/preview-api'
import { docsThemes, type Mode } from './themes'

const currentMode = (): Mode =>
  document.documentElement.dataset.mode === 'dark' ? 'dark' : 'light'

/**
 * The docs page in the toolbar's mode. Storybook's own docs styling (text,
 * tables, code blocks) is fixed to one theme otherwise, so dark mode turned
 * Octarine's text light on a white page.
 */
export function ThemedDocsContainer(props: PropsWithChildren<DocsContainerProps>) {
  const [mode, setMode] = useState(currentMode)

  useEffect(() => {
    const channel = addons.getChannel()
    const follow = ({ globals }: { globals: Record<string, unknown> }) =>
      setMode(globals.mode === 'dark' ? 'dark' : 'light')
    channel.on(SET_GLOBALS, follow)
    channel.on(GLOBALS_UPDATED, follow)
    return () => {
      channel.off(SET_GLOBALS, follow)
      channel.off(GLOBALS_UPDATED, follow)
    }
  }, [])

  return createElement(DocsContainer, { ...props, theme: docsThemes[mode] })
}
