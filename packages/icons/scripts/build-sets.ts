/**
 * Builds the icon modules the components and the Vite plugin import:
 *
 *   dist/heroicons/{outline,solid,mini,micro}.js  one named export per icon
 *   dist/heroicons/manifest.json                  names, variants and exports
 *   dist/octarine.js + octarine.json              Octarine's own icons (octarine:*)
 *
 * Icons are plain objects in ES modules marked side-effect free, so a bundler
 * keeps only the ones that are imported.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, resolve } from 'node:path'
import type { CustomManifest, SetManifest } from '../src/manifest.js'
import { iconifyToIcon, svgToIcon } from '../src/svg.js'
import { iconVariants, type IconDefinition, type IconVariant } from '../src/types.js'
import { heroicons, type IconSetSource } from './sets/heroicons.js'

const root = resolve(import.meta.dirname, '..')
const dist = resolve(root, 'dist')
const require = createRequire(import.meta.url)

const reserved = new Set(['delete', 'default', 'export', 'import', 'in', 'new', 'function', 'class'])

/** `arrow-left` → `arrowLeft`, made a valid identifier. */
function exportName(name: string): string {
  const id = name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())
  return /^[0-9]/.test(id) || reserved.has(id) ? `${id}Icon` : id
}

function writeModule(
  file: string,
  header: string,
  typesFrom: string,
  icons: [exportName: string, icon: IconDefinition][],
) {
  mkdirSync(dirname(file), { recursive: true })
  const js = icons.map(([name, icon]) => `export const ${name} = ${JSON.stringify(icon)}`)
  const dts = icons.map(([name]) => `export declare const ${name}: IconDefinition`)
  writeFileSync(`${file}.js`, `${header}\n${js.join('\n')}\n`)
  writeFileSync(
    `${file}.d.ts`,
    `import type { IconDefinition } from '${typesFrom}'\n\n${dts.join('\n')}\n`,
  )
}

function buildSet(source: IconSetSource) {
  const data = require(source.json) as {
    icons: Record<string, { body: string; width?: number; height?: number }>
    width?: number
    height?: number
  }
  const info = require(source.json.replace(/icons\.json$/, 'info.json')) as {
    name: string
    version: string
    author: { name: string; url: string }
    license: { title: string; url: string }
  }
  const notice = `${info.name} ${info.version} by ${info.author.name} (${info.author.url}), ${info.license.title} license: ${info.license.url}`

  const byVariant = new Map<IconVariant, [string, IconDefinition][]>()
  const icons: SetManifest['icons'] = {}

  for (const [vendorName, icon] of Object.entries(data.icons)) {
    const mapped = source.map(vendorName)
    if (!mapped) continue
    const size = { width: icon.width ?? data.width ?? 24, height: icon.height ?? data.height ?? 24 }
    const definition = iconifyToIcon(icon.body, size, {
      name: mapped.name,
      color: 'mono',
      themeStroke: source.themeStroke?.[mapped.variant],
    })
    const entry = (icons[mapped.name] ??= { export: exportName(mapped.name), variants: [] })
    entry.variants.push(mapped.variant)
    if (!byVariant.has(mapped.variant)) byVariant.set(mapped.variant, [])
    byVariant.get(mapped.variant)!.push([entry.export, definition])
  }

  const modules: SetManifest['modules'] = {}
  for (const variant of iconVariants) {
    const list = byVariant.get(variant)
    if (!list) continue
    list.sort(([a], [b]) => a.localeCompare(b))
    writeModule(resolve(dist, source.id, variant), `// ${notice}`, '../index.js', list)
    modules[variant] = `./${variant}.js`
  }
  for (const entry of Object.values(icons)) {
    entry.variants.sort((a, b) => iconVariants.indexOf(a) - iconVariants.indexOf(b))
  }

  const sorted = Object.fromEntries(Object.entries(icons).sort(([a], [b]) => a.localeCompare(b)))
  const manifest: SetManifest = { set: source.id, notice, modules, icons: sorted }
  writeFileSync(resolve(dist, source.id, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  writeFileSync(resolve(dist, source.id, 'NOTICE.md'), `Icons from ${notice}\n`)
  console.log(`✓ ${source.id}: ${Object.keys(icons).length} icons`)
}

/** Octarine's own icons: `svg/*.svg`, plus the brand mark from `assets/brand`. */
function buildCustom(prefix: string) {
  const files: Record<string, string> = {
    mark: resolve(root, '../../assets/brand/octarine-mark.svg'),
  }
  const svgDir = resolve(root, 'svg')
  if (existsSync(svgDir)) {
    for (const file of readdirSync(svgDir).filter((f) => f.endsWith('.svg'))) {
      files[basename(file, '.svg')] = resolve(svgDir, file)
    }
  }

  const list = Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, file]): [string, IconDefinition] => [
      exportName(name),
      svgToIcon(readFileSync(file, 'utf8'), { name: `${prefix}:${name}` }),
    ])
  writeModule(resolve(dist, prefix), `// Octarine icons (${prefix}:*)`, './index.js', list)

  const manifest: CustomManifest = {
    prefix,
    module: `./${prefix}.js`,
    icons: Object.fromEntries(list.map(([exp, icon]) => [icon.name, exp])),
  }
  writeFileSync(resolve(dist, `${prefix}.json`), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`✓ ${prefix}: ${list.length} icons`)
}

buildSet(heroicons)
buildCustom('octarine')
