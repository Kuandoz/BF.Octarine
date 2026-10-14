import { describe, expect, it } from 'vitest'
import { contrastRatio, resolveColor } from './contrast.js'
import { flattenSemantic } from './css.js'
import { intents, semanticColors } from './semantic/colors.js'

/** WCAG 2.2 AA minimums. */
const TEXT = 4.5 // 1.4.3 normal text
const NON_TEXT = 3 // 1.4.11 UI component boundaries, focus indicators

const backgrounds = ['canvas', 'surface', 'surface-raised']

const pairs: [fg: string, bg: string, min: number][] = [
  ...['fg', 'fg-muted', 'fg-subtle'].flatMap((fg) =>
    backgrounds.map((bg): [string, string, number] => [fg, bg, TEXT]),
  ),
  ...backgrounds.map((bg): [string, string, number] => ['border-strong', bg, NON_TEXT]),
  ...backgrounds.map((bg): [string, string, number] => ['ring', bg, NON_TEXT]),
  ...intents.flatMap((intent): [string, string, number][] => [
    [`${intent}-fg`, intent, TEXT],
    [`${intent}-fg`, `${intent}-hover`, TEXT],
    [`${intent}-subtle-fg`, `${intent}-subtle`, TEXT],
    // Outline variants use the solid color as a border on the surface.
    [intent, 'surface', NON_TEXT],
  ]),
  // Intent colors used as text (outline/ghost buttons, OText tones). `warning` is
  // never used as text; components use `warning-subtle-fg` instead.
  ...intents
    .filter((intent) => intent !== 'warning')
    .map((intent): [string, string, number] => [intent, 'surface', TEXT]),
]

describe.each(Object.entries(semanticColors))('%s theme meets WCAG 2.2 AA contrast', (_, theme) => {
  const colors = new Map(flattenSemantic(theme).map(([name, ref]) => [name, resolveColor(ref)]))
  const get = (name: string) => colors.get(name) ?? expect.unreachable(`unknown token ${name}`)

  it.each(pairs)('%s on %s ≥ %d:1', (fg, bg, min) => {
    expect(contrastRatio(get(fg), get(bg))).toBeGreaterThanOrEqual(min)
  })
})
