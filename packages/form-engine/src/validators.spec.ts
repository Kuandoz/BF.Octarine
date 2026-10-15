import { describe, expect, it } from 'vitest'

import type { ValidationRule } from './types'
import {
  createValidatorContext,
  getGlobalValidatorRegistry,
  isEmpty,
  registerValidator,
  registerValidators,
  skipWhenEmpty,
} from './validators'

const registry = getGlobalValidatorRegistry()

function run(
  type: string,
  value: unknown,
  rule: Partial<ValidationRule> = {},
  scope: Record<string, unknown> = {},
) {
  const context = createValidatorContext(value, { type, ...rule }, 'field', (key) => key, scope)
  return registry[type]!(context)
}

describe('createValidatorContext', () => {
  it('derives isEmpty from the given value rather than requiring it be set', () => {
    const context = createValidatorContext('hello', { type: 'custom' }, 'someField', (key) => key)
    expect(context.isEmpty).toBe(false)
  })

  it('re-derives isEmpty if value is empty', () => {
    const context = createValidatorContext('', { type: 'custom' }, 'someField', (key) => key)
    expect(context.isEmpty).toBe(true)
  })

  it('carries the resolved model path being validated', () => {
    const context = createValidatorContext(
      'hello',
      { type: 'custom' },
      'items.2.quantity',
      (key) => key,
    )
    expect(context.path).toBe('items.2.quantity')
  })
})

describe('skipWhenEmpty', () => {
  const wrapped = skipWhenEmpty(() => ({ valid: false, message: 'should not be reached' }))

  it('treats an empty value as valid without calling the wrapped validator', () => {
    const context = createValidatorContext('', { type: 'custom' }, 'someField', (key) => key)
    expect(wrapped(context)).toEqual({ valid: true })
  })

  it('calls the wrapped validator when the value is not empty', () => {
    const context = createValidatorContext('x', { type: 'custom' }, 'someField', (key) => key)
    expect(wrapped(context)).toEqual({ valid: false, message: 'should not be reached' })
  })
})

describe('isEmpty', () => {
  it.each([
    [undefined, true],
    [null, true],
    ['', true],
    ['hello', false],
    [0, false],
    [[], true],
    [['a'], false],
    [false, false],
    [true, false],
    [new Date('invalid'), true],
    [new Date('2024-01-01'), false],
  ])('isEmpty(%o) is %s', (value, expected) => {
    expect(isEmpty(value)).toBe(expected)
  })
})

describe('global validator registry', () => {
  it('ships a built-in required validator', () => {
    expect(getGlobalValidatorRegistry().required).toBeTypeOf('function')
  })

  it('registerValidator adds a single validator', () => {
    registerValidator('alwaysValid', () => ({ valid: true }))
    expect(getGlobalValidatorRegistry().alwaysValid).toBeTypeOf('function')
  })

  it('registerValidators adds a batch of validators', () => {
    registerValidators({
      alwaysInvalid: () => ({ valid: false, message: 'nope' }),
    })
    const context = createValidatorContext(
      undefined,
      { type: 'alwaysInvalid' },
      'someField',
      (key) => key,
    )
    expect(getGlobalValidatorRegistry().alwaysInvalid!(context)).toEqual({
      valid: false,
      message: 'nope',
    })
  })
})

describe('email', () => {
  it.each([
    ['a@b.com', true],
    ['not-an-email', false],
    ['', true], // skipWhenEmpty
  ])('email(%o) -> valid=%s', (value, valid) => {
    expect(run('email', value).valid).toBe(valid)
  })
})

describe('phone', () => {
  it.each([
    ['+32 456 78 90 12', true],
    ['0456 78 90 12', true],
    ['abc', false],
  ])('phone(%o) -> valid=%s', (value, valid) => {
    expect(run('phone', value).valid).toBe(valid)
  })
})

describe('numeric / decimal', () => {
  it('numeric accepts digits only', () => {
    expect(run('numeric', '12345').valid).toBe(true)
    expect(run('numeric', '12.5').valid).toBe(false)
    expect(run('numeric', '12a').valid).toBe(false)
  })

  it('decimal accepts an optional single decimal point', () => {
    expect(run('decimal', '12').valid).toBe(true)
    expect(run('decimal', '12.5').valid).toBe(true)
    expect(run('decimal', '12.5.6').valid).toBe(false)
  })
})

describe('bool', () => {
  it('only accepts actual booleans', () => {
    expect(run('bool', true).valid).toBe(true)
    expect(run('bool', false).valid).toBe(true)
    expect(run('bool', 'true').valid).toBe(false)
  })
})

describe('insz', () => {
  it('validates the mod-97 checksum for both centuries', () => {
    expect(run('insz', '85073003328').valid).toBe(true) // 19xx
    expect(run('insz', '00000100393').valid).toBe(true) // 20xx
    expect(run('insz', '85073003329').valid).toBe(false)
    expect(run('insz', '123').valid).toBe(false)
  })
})

describe('iban', () => {
  it('validates the ISO 7064 mod-97 checksum', () => {
    expect(run('iban', 'BE68539007547034').valid).toBe(true)
    expect(run('iban', 'BE68539007547035').valid).toBe(false)
    expect(run('iban', 'not-an-iban').valid).toBe(false)
  })

  it('is whitespace/case tolerant', () => {
    expect(run('iban', 'be68 5390 0754 7034').valid).toBe(true)
  })
})

describe('oneOf', () => {
  it('passes only values present in rule.values', () => {
    expect(run('oneOf', 'b', { values: ['a', 'b', 'c'] }).valid).toBe(true)
    expect(run('oneOf', 'z', { values: ['a', 'b', 'c'] }).valid).toBe(false)
  })
})

describe('flags', () => {
  it('requires every item (single or array) to be an allowed value', () => {
    expect(run('flags', ['a', 'b'], { values: ['a', 'b', 'c'] }).valid).toBe(true)
    expect(run('flags', ['a', 'z'], { values: ['a', 'b', 'c'] }).valid).toBe(false)
    expect(run('flags', 'A', { values: ['a'], ignoreCase: true }).valid).toBe(true)
  })
})

describe('compare', () => {
  it('compares against another path in scope', () => {
    const scope = { until: 10 }
    expect(run('compare', 5, { path: 'until', op: 'lt' }, scope).valid).toBe(true)
    expect(run('compare', 15, { path: 'until', op: 'lt' }, scope).valid).toBe(false)
  })

  it('compares against a literal rule.value when no path is given', () => {
    expect(run('compare', 'x', { value: 'x', op: 'eq' }).valid).toBe(true)
    expect(run('compare', 'x', { value: 'y', op: 'eq' }).valid).toBe(false)
  })
})

describe('date / datetime', () => {
  it('enforces min/max, including magic strings', () => {
    expect(run('date', '2024-06-01', { max: 'today' }).valid).toBe(true)
    const future = new Date()
    future.setFullYear(future.getFullYear() + 10)
    expect(run('date', future.toISOString(), { max: 'today' }).valid).toBe(false)
  })

  it('rejects an unparseable value', () => {
    expect(run('date', 'not-a-date').valid).toBe(false)
  })
})
