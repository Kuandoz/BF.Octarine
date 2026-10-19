import { describe, expect, it } from 'vitest'

import type { ValidationRule, ValidatorResult } from '@octarine/form-abstractions'
import {
  createValidatorContext,
  builtInValidators,
  defineValidator,
  isEmpty,
  skipWhenEmpty,
} from './validators'

const registry = builtInValidators

function run(
  type: string,
  value: unknown,
  rule: Partial<ValidationRule> = {},
  scope: Record<string, unknown> = {},
) {
  const context = createValidatorContext(value, { type, ...rule }, 'field', scope)
  // The built-in validators are synchronous.
  return registry[type]!(context) as ValidatorResult
}

describe('createValidatorContext', () => {
  it('derives isEmpty from the given value rather than requiring it be set', () => {
    const context = createValidatorContext('hello', { type: 'custom' }, 'someField')
    expect(context.isEmpty).toBe(false)
  })

  it('re-derives isEmpty if value is empty', () => {
    const context = createValidatorContext('', { type: 'custom' }, 'someField')
    expect(context.isEmpty).toBe(true)
  })

  it('carries the resolved model path being validated', () => {
    const context = createValidatorContext('hello', { type: 'custom' }, 'items.2.quantity')
    expect(context.path).toBe('items.2.quantity')
  })
})

describe('skipWhenEmpty', () => {
  const wrapped = skipWhenEmpty(() => ({ valid: false, key: 'unreachable' }))

  it('treats an empty value as valid without calling the wrapped validator', () => {
    const context = createValidatorContext('', { type: 'custom' }, 'someField')
    expect(wrapped(context)).toEqual({ valid: true })
  })

  it('calls the wrapped validator when the value is not empty', () => {
    const context = createValidatorContext('x', { type: 'custom' }, 'someField')
    expect(wrapped(context)).toEqual({ valid: false, key: 'unreachable' })
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

describe('built-in validators', () => {
  it('include required', () => {
    expect(builtInValidators.required).toBeTypeOf('function')
  })

  it("can't be changed from outside: a form adds its own with the validators option", () => {
    expect(Object.isFrozen(builtInValidators)).toBe(true)
  })

  it('say which parameters their rule takes', () => {
    expect(builtInValidators.minLength!.schema).toEqual({
      properties: { value: { type: 'integer', minimum: 0 } },
      required: ['value'],
    })
    expect(builtInValidators.required!.schema).toBeUndefined()
  })
})

describe('defineValidator', () => {
  it('gives a validator its parameter schema', () => {
    const even = defineValidator({
      schema: { properties: { strict: { type: 'boolean' } } },
      validate: ({ value }) => ({ valid: Number(value) % 2 === 0 }),
    })
    expect(even.schema).toEqual({ properties: { strict: { type: 'boolean' } } })
    expect(even(createValidatorContext(3, { type: 'even' }, 'n'))).toEqual({ valid: false })
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

  it('says why a date failed, with the bounds as calendar days', () => {
    const bounds = { min: '2026-01-01', max: '2026-12-31' }
    expect(run('date', 'not-a-date', bounds)).toEqual({ valid: false, key: 'validation.date' })
    expect(run('date', '2025-06-01', { min: '2026-01-01' })).toEqual({
      valid: false,
      key: 'validation.dateMin',
      params: { min: '2026-01-01' },
    })
    expect(run('date', '2027-06-01', { max: '2026-12-31' })).toMatchObject({
      key: 'validation.dateMax',
      params: { max: '2026-12-31' },
    })
    // With both bounds, the whole range, whichever side was missed.
    expect(run('date', '2025-06-01', bounds)).toMatchObject({
      key: 'validation.dateRange',
      params: { min: '2026-01-01', max: '2026-12-31' },
    })
  })

  it('resolves a relative bound to the day it names', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const day = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
    expect(run('date', '2020-01-01', { min: 'today+1' })).toMatchObject({ params: { min: day } })
  })

  it('gives a datetime bound as a moment', () => {
    const result = run('datetime', '2020-01-01T10:00:00Z', { min: '2026-01-01T09:30:00Z' })
    expect(result).toMatchObject({
      key: 'validation.datetimeMin',
      params: { min: '2026-01-01T09:30:00.000Z' },
    })
  })
})
