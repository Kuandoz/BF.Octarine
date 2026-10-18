import { isProxy, reactive } from 'vue'

import { describe, expect, it } from 'vitest'

import { clonePlain, mergeDeep } from './mergeDeep'

describe('mergeDeep', () => {
  it('merges nested plain objects key by key', () => {
    const target = { a: { b: 1, c: 2 } }
    mergeDeep(target, { a: { c: 3, d: 4 } })
    expect(target).toEqual({ a: { b: 1, c: 3, d: 4 } })
  })

  it('adds new top-level keys', () => {
    const target: Record<string, unknown> = { a: 1 }
    mergeDeep(target, { b: 2 })
    expect(target).toEqual({ a: 1, b: 2 })
  })

  it('replaces arrays wholesale rather than concatenating', () => {
    const target = { list: [1, 2, 3] }
    mergeDeep(target, { list: [4, 5] })
    expect(target.list).toEqual([4, 5])
  })

  it('does not share object references with the source after merging', () => {
    const source = { nested: { value: 1 } }
    const target: Record<string, unknown> = {}
    mergeDeep(target, source)

    ;(target.nested as { value: number }).value = 2
    expect(source.nested.value).toBe(1)
  })

  it('returns the mutated target', () => {
    const target: Record<string, unknown> = {}
    expect(mergeDeep(target, { a: 1 })).toBe(target)
  })

  // structuredClone throws a DataCloneError on a Proxy — including a plain
  // hand-rolled one, in Node as much as a real browser. This matters because
  // FormBuilder's own `definition` is a Vue `reactive()` object, so any
  // array-valued `defaults`/`constants` reaching here is Proxy-wrapped;
  // toRaw() unwraps *Vue's own* reactive proxies specifically (an arbitrary
  // Proxy wouldn't be recognized) before cloning.
  it('clones an array value reached through a Vue reactive() proxy, without sharing its reference', () => {
    const rawItems = [{ name: 'Ada' }]
    const source = reactive({ items: rawItems })
    const target: Record<string, unknown> = {}

    mergeDeep(target, source)

    expect(target).toEqual({ items: [{ name: 'Ada' }] })
    ;(target.items as unknown[]).push({ name: 'Grace' })
    expect(rawItems).toHaveLength(1)
  })
})

describe('clonePlain', () => {
  it('copies deeply and leaves no reactive proxies behind', () => {
    const model = reactive({ items: [{ name: 'a' }] as Array<{ name: string }>, when: new Date(0) })
    model.items = [...model.items, { name: 'b' }]
    const copy = clonePlain(model)

    expect(copy).toEqual({ items: [{ name: 'a' }, { name: 'b' }], when: new Date(0) })
    expect(isProxy(copy)).toBe(false)
    expect(isProxy(copy.items[0])).toBe(false)
    copy.items[0]!.name = 'changed'
    expect(model.items[0]!.name).toBe('a')
  })
})
