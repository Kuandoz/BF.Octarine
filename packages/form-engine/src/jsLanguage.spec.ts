import { describe, expect, it } from 'vitest'

import { type EvaluationContext, ExpressionError } from './expressions'
import { jsLanguage } from './jsLanguage'

function run(
  source: string,
  scope: Record<string, unknown> = {},
  extra: Partial<EvaluationContext> = {},
) {
  return jsLanguage.compile(source).evaluate({ scope, env: {}, functions: {}, ...extra })
}

describe('jsLanguage', () => {
  it('compares and combines field values', () => {
    const scope = { mode: 'phone', count: 3, agreed: false }
    expect(run("mode === 'phone' && count > 2", scope)).toBe(true)
    expect(run('mode !== "phone" || !agreed', scope)).toBe(true)
    expect(run('(count >= 3 || agreed) && mode == "phone"', scope)).toBe(true)
    expect(run('count % 2 === 1 ? "odd" : "even"', scope)).toBe('odd')
    expect(run('count * 2 + 1 - 4 / 2', scope)).toBe(5)
    expect(run('-count < 0', scope)).toBe(true)
    expect(run('typeof mode', scope)).toBe('string')
  })

  it('reads literals', () => {
    expect(run('true')).toBe(true)
    expect(run('null')).toBe(null)
    expect(run('undefined')).toBe(undefined)
    expect(run('\'single\' + "double"')).toBe('singledouble')
    expect(run('[1, 2]')).toEqual([1, 2])
  })

  it('compares loosely with == so input text matches a number', () => {
    expect(run('age == 18', { age: '18' })).toBe(true)
    expect(run('age === 18', { age: '18' })).toBe(false)
  })

  it('reads nested fields, indexes and length', () => {
    const scope = { contact: { mode: 'mail' }, items: [{ name: 'a' }, { name: 'b' }], code: 'ab' }
    expect(run('contact.mode', scope)).toBe('mail')
    expect(run('items[1].name', scope)).toBe('b')
    expect(run('items.length', scope)).toBe(2)
    expect(run('code.length', scope)).toBe(2)
  })

  it('gives undefined for a property of a missing value instead of throwing', () => {
    expect(run('contact.address.city', { contact: {} })).toBe(undefined)
    expect(run('contact.address.city === undefined', { contact: undefined })).toBe(true)
    expect(run('items[3].name', { items: [] })).toBe(undefined)
    expect(run('a ?? "fallback"', { a: null })).toBe('fallback')
    expect(run('flags?.show !== true', { flags: undefined })).toBe(true)
  })

  it('fails on a name that is not a field, so a typo is reported', () => {
    expect(() => run('cotnact.mode', { contact: {} })).toThrow(ExpressionError)
    expect(() => run('cotnact.mode', { contact: {} })).toThrow('"cotnact" is not a field')
  })

  it('calls the functions it is given', () => {
    const functions = { age: (date: unknown) => (date === '2000-01-01' ? 26 : 0) }
    expect(run('age(birthDate) >= 18', { birthDate: '2000-01-01' }, { functions })).toBe(true)
    expect(() => run('nope(1)')).toThrow('"nope" is not a function')
  })

  it('reads env', () => {
    expect(run("env.language === 'nl'", {}, { env: { language: 'nl' } })).toBe(true)
  })

  it('calls a few string and array methods', () => {
    const scope = { name: ' Ada ', tags: ['x', 'y'] }
    expect(run("name.trim().startsWith('A')", scope)).toBe(true)
    expect(run("name.toLowerCase().includes('ada')", scope)).toBe(true)
    expect(run("tags.includes('y') && tags.indexOf('x') === 0", scope)).toBe(true)
    expect(run("tags.join('-')", scope)).toBe('x-y')
    expect(run('missing?.trim()', { missing: undefined })).toBe(undefined)
  })

  describe('stays inside its scope', () => {
    it('does not reach constructors or prototypes', () => {
      expect(run('name.constructor', { name: 'x' })).toBe(undefined)
      expect(run('contact.constructor', { contact: {} })).toBe(undefined)
      expect(run('contact.__proto__', { contact: {} })).toBe(undefined)
      expect(run("contact['constructor']", { contact: {} })).toBe(undefined)
      expect(() => run("name.constructor.constructor('return process')()", { name: 'x' })).toThrow(
        ExpressionError,
      )
    })

    it('does not see globals', () => {
      expect(() => run('globalThis')).toThrow(ExpressionError)
      expect(() => run('process.env')).toThrow(ExpressionError)
      expect(() => run('window')).toThrow(ExpressionError)
    })

    it('does not read class instances, only plain data', () => {
      expect(run('when.getTime', { when: new Date() })).toBe(undefined)
    })

    it('does not call functions or methods that are not allowed', () => {
      const scope = { callback: () => 'called', name: 'x', tags: [] }
      expect(() => run('callback()', scope)).toThrow('"callback" is not a function')
      expect(() => run("name.replace('x', 'y')", scope)).toThrow("can't be called here")
      expect(() => run('tags.push(1)', scope)).toThrow("can't be called here")
    })

    it('does not assign or define functions', () => {
      const scope = { a: 1 }
      expect(() => jsLanguage.compile('a = 2')).toThrow(ExpressionError)
      expect(() => jsLanguage.compile('a++')).toThrow(ExpressionError)
      expect(() => jsLanguage.compile('x => x')).toThrow(ExpressionError)
      expect(() => jsLanguage.compile('{ a: 1 }')).toThrow(ExpressionError)
      expect(scope.a).toBe(1)
    })
  })

  it('reports where a syntax error is', () => {
    let caught: unknown
    try {
      jsLanguage.compile("mode === 'phone' &&")
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(ExpressionError)
    expect((caught as ExpressionError).position).toBeGreaterThan(0)
    expect(() => jsLanguage.compile('')).toThrow('The expression is empty')
  })

  it('lists the model paths an expression reads', () => {
    const dependencies = (source: string) => jsLanguage.compile(source).dependencies
    expect(dependencies("contact.mode === 'phone' && agreed")).toEqual(['contact.mode', 'agreed'])
    expect(dependencies('age(birthDate) >= 18')).toEqual(['birthDate'])
    expect(dependencies("items[index].name === 'x'")).toEqual(['index', 'items.*.name'])
    expect(dependencies('items[0].name')).toEqual(['items.0.name'])
    expect(dependencies('items.length > 0')).toEqual(['items'])
    expect(dependencies("tags.includes('a')")).toEqual(['tags'])
    expect(dependencies("env.language === 'nl'")).toEqual([])
  })
})
