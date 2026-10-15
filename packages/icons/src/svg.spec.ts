import { describe, expect, it } from 'vitest'
import { iconifyToIcon, svgToIcon } from './svg.js'

describe('svgToIcon', () => {
  it('drops scripts, event handlers, styles, text and external references', () => {
    const icon = svgToIcon(
      `<?xml version="1.0"?><!-- comment -->
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onload="alert(1)" style="color:red">
        <script>alert(1)</script>
        <style>path { fill: red }</style>
        <title>Secret</title>
        <foreignObject><div>html</div></foreignObject>
        <a href="https://example.com"><path d="M1 1" /></a>
        <use href="https://example.com/sprite.svg#x" />
        <image href="data:image/png;base64,AAAA" />
        <path d="M0 0h24v24H0z" onclick="steal()" fill="url(https://example.com/x)" class="x" />
      </svg>`,
      { name: 'test' },
    )
    const markup = JSON.stringify(icon)
    for (const forbidden of ['alert', 'script', 'style', 'Secret', 'html', 'example.com', 'onclick', 'class', 'image']) {
      expect(markup).not.toContain(forbidden)
    }
    expect(icon.nodes).toEqual([['use', {}], ['path', { d: 'M0 0h24v24H0z' }]])
  })

  it('turns a single color into currentColor', () => {
    const icon = svgToIcon('<svg width="16" height="16"><path fill="#111521" d="M0 0"/></svg>', {
      name: 'dot',
    })
    expect(icon.viewBox).toBe('0 0 16 16')
    expect(icon.attrs).toEqual({ fill: 'currentColor' })
    expect(icon.multicolor).toBeUndefined()
  })

  it('paints an unpainted icon with currentColor', () => {
    const icon = svgToIcon('<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="4"/></svg>', {
      name: 'dot',
    })
    expect(icon.attrs).toEqual({ fill: 'currentColor' })
  })

  it('keeps the colors of gradient or multi-color icons and flags their ids', () => {
    const icon = svgToIcon(
      `<svg viewBox="0 0 10 10">
        <defs><linearGradient id="g"><stop offset="0" stop-color="#18f5fc"/></linearGradient></defs>
        <path stroke="url(#g)" d="M0 0"/><path fill="#7938ea" d="M1 1"/>
      </svg>`,
      { name: 'logo' },
    )
    expect(icon.multicolor).toBe(true)
    expect(icon.ids).toBe(true)
    expect(JSON.stringify(icon)).toContain('#7938ea')
  })

  it('hoists shared paint to the root and removes the theme stroke width', () => {
    const icon = iconifyToIcon(
      '<path fill="none" stroke="currentColor" stroke-width="1.5" d="M1 1"/><path fill="none" stroke="currentColor" stroke-width="1.5" d="M2 2"/>',
      { width: 24, height: 24 },
      { name: 'lines', themeStroke: '1.5' },
    )
    expect(icon.attrs).toEqual({ fill: 'none', stroke: 'currentColor' })
    expect(icon.nodes).toEqual([
      ['path', { d: 'M1 1' }],
      ['path', { d: 'M2 2' }],
    ])
  })

  it('requires an svg with a size', () => {
    expect(() => svgToIcon('<path d="M0 0"/>', { name: 'x' })).toThrow(/no <svg>/)
    expect(() => svgToIcon('<svg><path d="M0 0"/></svg>', { name: 'x' })).toThrow(/viewBox/)
  })
})
