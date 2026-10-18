import { computed } from 'vue'

import { describe, expect, it } from 'vitest'

import { FormEngine } from './FormEngine'
import type { FormDefinition } from './types'

const definition: FormDefinition = {
  components: [
    { type: 'text', path: 'name' },
    { type: 'text', path: 'address.city' },
    { type: 'repeat', path: 'items', components: [{ type: 'text', path: 'title' }] },
  ],
  validations: { name: [{ type: 'required' }] },
  defaults: { address: { city: 'Ghent' } },
}

describe('dirty state', () => {
  it('starts clean, also with defaults and declared fields', () => {
    const engine = new FormEngine(definition)
    expect(engine.dirty).toBe(false)
    expect(engine.isDirty('name')).toBe(false)
  })

  it('follows a change, for the path and the form', () => {
    const engine = new FormEngine(definition)
    engine.setValue('name', 'Ada')
    expect(engine.isDirty('name')).toBe(true)
    expect(engine.isDirty('address.city')).toBe(false)
    expect(engine.dirty).toBe(true)
  })

  it("isn't dirty after a value is changed back", () => {
    const engine = new FormEngine(definition, { model: { name: 'Ada' } })
    engine.setValue('name', 'Grace')
    engine.setValue('name', 'Ada')
    expect(engine.dirty).toBe(false)
  })

  it('treats a cleared value like one that was never filled in', () => {
    const engine = new FormEngine(definition)
    engine.setValue('name', 'Ada')
    engine.setValue('name', '')
    expect(engine.dirty).toBe(false)
  })

  it('counts added and removed rows', () => {
    const engine = new FormEngine(definition)
    engine.addRepeatItem('items', { title: 'a' })
    expect(engine.isDirty('items')).toBe(true)
    engine.removeRepeatItem('items', 0)
    expect(engine.dirty).toBe(false)
  })

  it('is reactive', () => {
    const engine = new FormEngine(definition)
    const dirty = computed(() => engine.dirty)
    expect(dirty.value).toBe(false)
    engine.setValue('address.city', 'Bruges')
    expect(dirty.value).toBe(true)
    engine.markPristine()
    expect(dirty.value).toBe(false)
  })
})

describe('markPristine', () => {
  it('makes the current values the ones to compare with and to reset to', () => {
    const engine = new FormEngine(definition)
    engine.setValue('name', 'Ada')
    engine.markPristine()
    expect(engine.dirty).toBe(false)

    engine.setValue('name', 'Grace')
    engine.reset()
    expect(engine.getValue('name')).toBe('Ada')
  })

  it('takes a copy, so later changes still count', () => {
    const engine = new FormEngine(definition)
    engine.addRepeatItem('items', { title: 'a' })
    engine.markPristine()
    engine.setValue('items.0.title', 'b')
    expect(engine.isDirty('items.0.title')).toBe(true)
  })
})

describe('reset', () => {
  it('goes back to the values the form started with', () => {
    const engine = new FormEngine(definition, { model: { name: 'Ada', items: [{ title: 'a' }] } })
    engine.setValue('name', 'Grace')
    engine.setValue('address.city', 'Bruges')
    engine.addRepeatItem('items', { title: 'b' })
    engine.reset()
    expect(engine.getValue('name')).toBe('Ada')
    expect(engine.getValue('items')).toEqual([{ title: 'a' }])
    expect(engine.dirty).toBe(false)
  })

  it('removes values that were added since', () => {
    const engine = new FormEngine(definition)
    engine.setValue('extra', 'x')
    engine.reset()
    expect('extra' in engine.model).toBe(false)
  })

  it('hides errors again until the next blur or submit', () => {
    const engine = new FormEngine(definition)
    engine.touch('name')
    engine.submit()
    expect(engine.getError('name')).toBe('This field is required.')
    engine.reset()
    expect(engine.submitted).toBe(false)
    expect(engine.isTouched('name')).toBe(false)
    expect(engine.getError('name')).toBeUndefined()
    // The rules still ran.
    expect(engine.getValidationResult('name')).toMatchObject({ valid: false })
  })
})
