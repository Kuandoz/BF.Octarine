import type { IconDefinition, IconNode } from './types.js'

/**
 * Converts SVG source into an {@link IconDefinition}. Meant for build time (the
 * set build and the Vite plugin), but has no Node or DOM dependency.
 *
 * Only an allowlist of shape, paint and gradient elements and attributes
 * survives: scripts, event handlers, `style`, text, external references and
 * anything else unknown are dropped, so the result is safe to render.
 */
export interface SvgToIconOptions {
  name: string
  /**
   * `auto` (default) keeps the colors of icons that use gradients or several
   * colors (logos) and turns a single color into `currentColor`. `mono` always
   * uses `currentColor`; `multicolor` never does.
   */
  color?: 'auto' | 'mono' | 'multicolor'
  /** Removes this `stroke-width`, so the theme's `--oct-icon-stroke-width` applies. */
  themeStroke?: string
}

const elements = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'rect',
  'defs',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'mask',
  'use',
])

const attributes = new Set([
  'd',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'fx',
  'fy',
  'fr',
  'width',
  'height',
  'points',
  'pathLength',
  'transform',
  'transform-origin',
  'viewBox',
  'preserveAspectRatio',
  'id',
  'href',
  'fill',
  'fill-rule',
  'fill-opacity',
  'clip-rule',
  'clip-path',
  'mask',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'opacity',
  'vector-effect',
  'paint-order',
  'shape-rendering',
  'offset',
  'stop-color',
  'stop-opacity',
  'gradientUnits',
  'gradientTransform',
  'spreadMethod',
  'clipPathUnits',
  'maskUnits',
  'maskContentUnits',
])

/** Root attributes that make sense on the rendered `<svg>`. */
const rootAttributes = new Set([
  'fill',
  'fill-rule',
  'clip-rule',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
])

const colorAttributes = ['fill', 'stroke', 'stop-color']
const keepColors = new Set(['none', 'currentcolor', 'transparent', 'inherit'])
const hoistable = ['fill', 'stroke', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'clip-rule']

const tagPattern =
  /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<[?!][^>]*>|<(\/?)([A-Za-z][\w:.-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g
const attrPattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g

type Element = { tag: string; attrs: Record<string, string>; children: Element[] }

function safeValue(name: string, value: string): boolean {
  if (/[<>]|javascript:|expression\s*\(/i.test(value)) return false
  if (name === 'href') return value.startsWith('#')
  // Only local references: url(#gradient), never url(https://…).
  return [...value.matchAll(/url\(\s*(['"]?)([^)'"]*)\1\s*\)/gi)].every(([, , target]) =>
    target!.startsWith('#'),
  )
}

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const [, rawName, dq, sq, bare] of source.matchAll(attrPattern)) {
    const name = rawName === 'xlink:href' ? 'href' : rawName!
    const value = (dq ?? sq ?? bare ?? '').trim()
    if (attributes.has(name) && safeValue(name, value)) attrs[name] = value
  }
  return attrs
}

/** Parses markup into a tree, dropping disallowed elements with their content. */
function parse(source: string): Element[] {
  const root: Element = { tag: '#root', attrs: {}, children: [] }
  const stack: (Element & { dropped: boolean })[] = [{ ...root, dropped: false }]

  for (const [, closing, tag, attrSource, selfClosing] of source.matchAll(tagPattern)) {
    if (!tag) continue // comment, CDATA, <?xml?>, <!DOCTYPE>
    if (closing) {
      let index = stack.length - 1
      while (index > 0 && stack[index]!.tag !== tag) index--
      if (index > 0) stack.length = index
      continue
    }
    const parent = stack.at(-1)!
    const dropped = parent.dropped || !elements.has(tag)
    const el = { tag, attrs: dropped ? {} : parseAttrs(attrSource ?? ''), children: [] }
    if (!dropped) parent.children.push(el)
    if (!selfClosing) stack.push({ ...el, dropped })
  }
  return stack[0]!.children
}

function walk(nodes: Element[], visit: (el: Element) => void) {
  for (const el of nodes) {
    visit(el)
    walk(el.children, visit)
  }
}

const toNode = (el: Element): IconNode =>
  el.children.length ? [el.tag, el.attrs, el.children.map(toNode)] : [el.tag, el.attrs]

export function svgToIcon(source: string, options: SvgToIconOptions): IconDefinition {
  const svg = parse(source).find((el) => el.tag === 'svg')
  if (!svg) throw new Error(`${options.name}: no <svg> element found`)

  const { viewBox, width, height } = svg.attrs
  const box = viewBox ?? (width && height ? `0 0 ${parseFloat(width)} ${parseFloat(height)}` : '')
  if (!box) throw new Error(`${options.name}: the <svg> needs a viewBox or width and height`)

  const attrs = Object.fromEntries(
    Object.entries(svg.attrs).filter(([name]) => rootAttributes.has(name)),
  )
  const children = svg.children
  const descendants: Element[] = []
  walk(children, (el) => descendants.push(el))
  const all = [svg, ...descendants]

  const colors = new Set<string>()
  let gradients = false
  for (const el of all) {
    for (const name of colorAttributes) {
      const value = el.attrs[name]?.toLowerCase()
      if (!value || keepColors.has(value)) continue
      if (value.startsWith('url(')) gradients = true
      else colors.add(value)
    }
  }

  const mode = options.color ?? 'auto'
  const multicolor = mode === 'multicolor' || (mode === 'auto' && (gradients || colors.size > 1))

  for (const el of all) {
    if (!multicolor) {
      for (const name of colorAttributes) {
        const value = el.attrs[name]
        if (value && !keepColors.has(value.toLowerCase()) && !value.startsWith('url('))
          el.attrs[name] = 'currentColor'
      }
    }
    if (options.themeStroke && el.attrs['stroke-width'] === options.themeStroke) {
      delete el.attrs['stroke-width']
    }
  }

  // Move paint attributes every top-level child shares onto the root.
  for (const name of hoistable) {
    const value = children[0]?.attrs[name]
    if (value === undefined || name in attrs) continue
    if (children.every((el) => el.attrs[name] === value)) {
      attrs[name] = value
      for (const el of children) delete el.attrs[name]
    }
  }

  // An unpainted monochrome icon would render black: paint it with the text color.
  if (!multicolor && !('fill' in attrs) && !all.some((el) => 'fill' in el.attrs)) {
    attrs.fill = 'currentColor'
  }

  const ids = descendants.some((el) => 'id' in el.attrs)

  return {
    name: options.name,
    viewBox: box,
    ...(Object.keys(attrs).length ? { attrs } : {}),
    nodes: children.map(toNode),
    ...(multicolor ? { multicolor: true } : {}),
    ...(ids ? { ids: true } : {}),
  }
}

/** Converts an Iconify icon body (the markup inside `<svg>`). */
export function iconifyToIcon(
  body: string,
  size: { width: number; height: number },
  options: SvgToIconOptions,
): IconDefinition {
  return svgToIcon(`<svg viewBox="0 0 ${size.width} ${size.height}">${body}</svg>`, options)
}
