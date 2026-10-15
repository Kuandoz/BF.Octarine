import { describe, expect, it } from 'vitest'
import { resolveSafelist, scanSource, type IconCatalog } from './scan.js'

const catalog: IconCatalog = {
  set: new Map([
    ['trash', ['outline', 'solid', 'mini', 'micro']],
    ['arrow-small-up', ['outline', 'solid', 'mini']],
    ['user', ['outline', 'solid', 'mini', 'micro']],
  ]),
  custom: new Set(['octarine:mark']),
}

describe('scanSource', () => {
  it('finds names in templates and scripts, with the default variant', () => {
    const keys = scanSource(
      `<OIcon name="trash" />
       <script>const icon = { name: 'octarine:mark' }; const user = 'user-name'</script>`,
      catalog,
    )
    expect([...keys].sort()).toEqual(['octarine:mark', 'trash/outline'])
  })

  it("pairs names with the file's variant strings, if the icon has them", () => {
    const keys = scanSource(
      `<OIcon name="trash" variant="solid" /><OIcon name="arrow-small-up" variant="micro" />`,
      catalog,
    )
    expect([...keys].sort()).toEqual([
      'arrow-small-up/outline',
      'arrow-small-up/solid',
      'trash/micro',
      'trash/outline',
      'trash/solid',
    ])
  })

  it('ignores unknown names and partial matches', () => {
    expect(scanSource(`'trashcan' "app:nope" \`user \``, catalog).size).toBe(0)
  })
})

describe('resolveSafelist', () => {
  it('expands names, keeps variants and reports unknown entries', () => {
    const { keys, unknown } = resolveSafelist(
      ['trash', 'user/mini', 'octarine:mark', 'nope', 'arrow-small-up/micro'],
      catalog,
    )
    expect([...keys].sort()).toEqual([
      'octarine:mark',
      'trash/micro',
      'trash/mini',
      'trash/outline',
      'trash/solid',
      'user/mini',
    ])
    expect(unknown).toEqual(['nope', 'arrow-small-up/micro'])
  })
})
