import { nextTick, reactive } from 'vue'

import { describe, expect, it } from 'vitest'

import { FormEngine } from '../FormEngine'
import type { FieldDefinition, FormDefinition } from '../types'
import { withFormEngine } from './testHelpers'
import { useResolvedList } from './useResolvedList'

const definition: FormDefinition = {
  components: [],
  lists: { statuses: [{ id: 'open' }, { id: 'closed' }] },
}

describe('useResolvedList', () => {
  it('uses an inline array as-is, synchronously', () => {
    const engine = new FormEngine(definition)
    const field: FieldDefinition = { type: 'select', options: [{ label: 'A', value: 'a' }] }
    const list = withFormEngine(engine, () => useResolvedList(field))
    expect(list.value).toEqual([{ label: 'A', value: 'a' }])
  })

  it('starts empty and resolves a form-local list by name', async () => {
    const engine = new FormEngine(definition)
    const field: FieldDefinition = { type: 'select', options: 'statuses' }
    const list = withFormEngine(engine, () => useResolvedList(field))

    expect(list.value).toEqual([])
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(list.value).toEqual([{ id: 'open' }, { id: 'closed' }])
  })

  it("resolves a provider-backed list once the provider's promise settles", async () => {
    const engine = new FormEngine(definition, {
      lists: {
        getList: async (name) => Promise.resolve([{ name }]),
      },
    })
    const field: FieldDefinition = { type: 'select', options: 'remoteList' }
    const list = withFormEngine(engine, () => useResolvedList(field))

    expect(list.value).toEqual([])
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(list.value).toEqual([{ name: 'remoteList' }])
  })

  it('returns an empty array when the field has no options at all', () => {
    const engine = new FormEngine(definition)
    const field: FieldDefinition = { type: 'select' }
    const list = withFormEngine(engine, () => useResolvedList(field))
    expect(list.value).toEqual([])
  })
})

describe('a list that arrives later', () => {
  it('reaches the control when the definition is filled in after setup', async () => {
    // What the legacy bridge does: it resolves a named list through the host
    // app's store and writes the result onto the reactive definition. Read
    // once at setup, that update never arrives and a select renders empty.
    const field = reactive<FieldDefinition>({ type: 'select', options: [] })
    const engine = new FormEngine(definition)
    const list = withFormEngine(engine, () => useResolvedList(field))

    expect(list.value).toEqual([])

    field.options = [{ label: 'Brugge', value: '31005' }]
    await nextTick()

    expect(list.value).toEqual([{ label: 'Brugge', value: '31005' }])
  })
})
