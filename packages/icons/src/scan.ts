import { defaultIconVariant, iconKey, iconVariants, isCustomIcon, type IconVariant } from './types.js'

/** What can be found: set icons with the variants they exist in, and custom icons. */
export interface IconCatalog {
  set: ReadonlyMap<string, readonly IconVariant[]>
  custom: ReadonlySet<string>
}

const stringLiteral = /(["'`])([a-z0-9][a-z0-9:-]*)\1/g

/**
 * Finds the icons a source file refers to, the way Tailwind finds classes: every
 * quoted string that is exactly an icon name counts (`name="trash"`,
 * `icon: { name: 'trash' }`), so names must be written out in full.
 *
 * A file's variant strings (`"solid"`, `'mini'`) are paired with its icon names,
 * and the default variant is always included. A name and variant that only meet
 * across files (a prop passed down) belong in the plugin's `safelist`.
 */
export function scanSource(code: string, catalog: IconCatalog): Set<string> {
  const strings = new Set<string>()
  for (const [, , value] of code.matchAll(stringLiteral)) strings.add(value!)

  const variants = new Set<IconVariant>([
    defaultIconVariant,
    ...iconVariants.filter((v) => strings.has(v)),
  ])
  const keys = new Set<string>()
  for (const value of strings) {
    if (isCustomIcon(value)) {
      if (catalog.custom.has(value)) keys.add(value)
      continue
    }
    for (const variant of catalog.set.get(value) ?? []) {
      if (variants.has(variant)) keys.add(iconKey(value, variant))
    }
  }
  return keys
}

/**
 * Resolves safelist entries: `trash` (every variant), `trash/solid` or
 * `octarine:mark`. Returns the keys and the entries that match no icon.
 */
export function resolveSafelist(entries: readonly string[], catalog: IconCatalog) {
  const keys = new Set<string>()
  const unknown: string[] = []
  for (const entry of entries) {
    const [name, variant] = entry.split('/') as [string, IconVariant | undefined]
    const available = isCustomIcon(name)
      ? catalog.custom.has(name)
        ? [undefined]
        : []
      : (catalog.set.get(name) ?? []).filter((v) => !variant || v === variant)
    if (!available.length) unknown.push(entry)
    for (const v of available) keys.add(iconKey(name, v))
  }
  return { keys, unknown }
}
