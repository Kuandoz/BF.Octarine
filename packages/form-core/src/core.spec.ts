import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const sourceDir = import.meta.dirname
const sources = readdirSync(sourceDir).filter(
  (file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'),
)
const read = (file: string) => readFileSync(join(sourceDir, file), 'utf8')

// form-core runs on the server too, so it may not reach for Vue or the
// browser. (These specs run in Node, so the code itself runs there as well.)
describe('@octarine/form-core', () => {
  it('has sources to check', () => {
    expect(sources).toContain('index.ts')
  })

  it.each(sources)('%s imports no Vue', (file) => {
    expect(read(file)).not.toMatch(/from '(vue|@vue\/[^']*)'/)
  })

  it.each(sources)('%s uses no browser globals', (file) => {
    expect(read(file)).not.toMatch(/\b(window|document|navigator|localStorage)\./)
  })

  it('depends only on the abstractions and the expression parser', () => {
    const pkg = JSON.parse(read('../package.json'))
    expect(Object.keys(pkg.dependencies)).toEqual(['@octarine/form-abstractions', 'subscript'])
    expect(pkg.peerDependencies ?? {}).toEqual({})
  })
})
