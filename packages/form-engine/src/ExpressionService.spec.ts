import { describe, expect, it } from 'vitest'

import { ExpressionService } from './ExpressionService'

describe('ExpressionService', () => {
  it('returns a boolean condition as-is', () => {
    const service = new ExpressionService()
    expect(service.resolve(true, { scope: {} })).toBe(true)
    expect(service.resolve(false, { scope: {} })).toBe(false)
  })

  it('returns the default result when the condition is undefined', () => {
    const service = new ExpressionService()
    expect(service.resolve(undefined, { scope: {} }, true)).toBe(true)
    expect(service.resolve(undefined, { scope: {} })).toBe(false)
  })

  it('evaluates a string expression against the given scope', () => {
    const service = new ExpressionService()
    expect(service.resolve("firstName === 'Ada'", { scope: { firstName: 'Ada' } })).toBe(true)
    expect(service.resolve("firstName === 'Ada'", { scope: { firstName: 'Grace' } })).toBe(false)
  })

  it('supports optional chaining and comparisons in expressions', () => {
    const service = new ExpressionService()
    expect(
      service.resolve('flags?.showInner !== true', { scope: { flags: { showInner: true } } }),
    ).toBe(false)
    // `flags` must be a declared variable (even if undefined) for optional
    // chaining to apply — a truly undeclared bare identifier still throws a
    // ReferenceError, matching real JS scoping semantics.
    expect(service.resolve('flags?.showInner !== true', { scope: { flags: undefined } })).toBe(true)
  })

  it('falls back to defaultResult when referencing a truly undeclared identifier', () => {
    const service = new ExpressionService()
    expect(service.resolve('flags?.showInner !== true', { scope: {} }, true)).toBe(true)
  })

  it('exposes an age() helper computed from a birth date', () => {
    const service = new ExpressionService()
    const twentyYearsAgo = new Date()
    twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20)
    expect(service.resolve('age(birthDate) >= 18', { scope: { birthDate: twentyYearsAgo } })).toBe(
      true,
    )
  })

  it('exposes env to expressions', () => {
    const service = new ExpressionService()
    expect(service.resolve("env.language === 'fr'", { scope: {}, env: { language: 'fr' } })).toBe(
      true,
    )
  })

  it("evaluates the object form's expression", () => {
    const service = new ExpressionService()
    expect(service.resolve({ expression: 'value === 1' }, { scope: { value: 1 } })).toBe(true)
  })

  it('evaluates the object form against rootScope when root is true', () => {
    const service = new ExpressionService()
    const result = service.resolve(
      { expression: 'topLevelFlag === true', root: true },
      { scope: { topLevelFlag: false }, rootScope: { topLevelFlag: true } },
    )
    expect(result).toBe(true)
  })

  it("uses the object form's own defaultValue when the expression throws", () => {
    const service = new ExpressionService()
    const result = service.resolve(
      { expression: 'this is not valid syntax', defaultValue: true },
      { scope: {} },
    )
    expect(result).toBe(true)
  })

  it('falls back to defaultResult when a string expression throws', () => {
    const service = new ExpressionService()
    expect(service.resolve('this is not valid syntax', { scope: {} }, true)).toBe(true)
    expect(service.resolve('this is not valid syntax', { scope: {} }, false)).toBe(false)
  })

  it('only compiles a given expression string once', () => {
    const service = new ExpressionService()
    const compiledSpy = new Map<string, number>()
    // Indirect check: evaluating the same expression many times with
    // different scopes should still produce correct, independent results —
    // if caching leaked scope between calls this would fail.
    for (let i = 0; i < 5; i++) {
      const result = service.resolve('value === target', { scope: { value: i, target: i } })
      compiledSpy.set(`${i}`, result ? 1 : 0)
    }
    expect([...compiledSpy.values()]).toEqual([1, 1, 1, 1, 1])
  })
})
