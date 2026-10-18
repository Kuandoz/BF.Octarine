import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const sourceDir = join(import.meta.dirname, '.')
const sources = readdirSync(sourceDir).filter(
  (file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'),
)

// Anything that is left after the types are erased would be runtime code.
function runtimeCodeOf(file: string): string {
  const { outputText } = ts.transpileModule(readFileSync(join(sourceDir, file), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
      removeComments: true,
    },
    fileName: file,
  })
  return outputText.replace('export {};', '').trim()
}

describe('@octarine/form-abstractions', () => {
  it('has sources to check', () => {
    expect(sources).toContain('index.ts')
  })

  it.each(sources)('%s has no runtime code', (file) => {
    expect(runtimeCodeOf(file)).toBe('')
  })

  it('depends on nothing at runtime', () => {
    const pkg = JSON.parse(readFileSync(join(sourceDir, '../package.json'), 'utf8'))
    expect(pkg.dependencies ?? {}).toEqual({})
    expect(pkg.peerDependencies ?? {}).toEqual({})
  })
})
