import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build, type Rollup } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
// The plugin reads the built icon sets, so test the build (`pnpm build` runs first).
import { octarineIcons } from '../dist/vite.js'

let root: string

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'octarine-icons-'))
  mkdirSync(join(root, 'src/icons'), { recursive: true })
  writeFileSync(
    join(root, 'src/main.js'),
    `import icons from 'virtual:octarine-icons'
     // <OIcon name="trash" variant="solid" /> <OIcon name="app:invoice" />
     export default icons`,
  )
  writeFileSync(
    join(root, 'src/icons/invoice.svg'),
    '<svg viewBox="0 0 24 24"><path fill="#000" d="M4 4h16v16H4z"/></svg>',
  )
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

async function bundle(options: Parameters<typeof octarineIcons>[0]) {
  const result = (await build({
    root,
    logLevel: 'silent',
    plugins: [octarineIcons({ custom: { app: 'src/icons' }, ...options })],
    build: {
      write: false,
      minify: false,
      lib: { entry: 'src/main.js', formats: ['es'], fileName: 'main' },
    },
  })) as Rollup.RollupOutput[]
  return result[0]!.output[0].code
}

describe('octarineIcons', () => {
  it('bundles only the icons the source uses', async () => {
    const code = await bundle({})
    expect(code).toContain('"trash/outline"')
    expect(code).toContain('"trash/solid"')
    expect(code).toContain('"app:invoice"')
    expect(code).not.toContain('"trash/mini"')
    expect(code).not.toContain('academic-cap')
    expect(code).not.toContain('octarine:mark')
  })

  it('adds safelisted icons', async () => {
    const code = await bundle({ safelist: ['octarine:mark', 'user/mini'] })
    expect(code).toContain('"octarine:mark"')
    expect(code).toContain('"user/mini"')
  })

  it('writes a declaration file with every available name', () => {
    const dts = readFileSync(join(root, 'src/octarine-icons.d.ts'), 'utf8')
    expect(dts).toContain('interface IconNameRegister')
    expect(dts).toContain("| 'academic-cap'")
    expect(dts).toContain("| 'app:invoice'")
    expect(dts).toContain("| 'octarine:mark'")
  })
})
