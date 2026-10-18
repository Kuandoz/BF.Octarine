// @vitest-environment jsdom
import { defineComponent, h, nextTick } from 'vue'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import FormRows from './FormRows.vue'

import { useField } from '../composables/useField'
import { FORM_ENGINE_KEY } from '../composables/useFormEngine'
import { FormEngine } from '../FormEngine'
import { REGISTRY_KEY } from '../registry'
import type { FieldDefinition, FormDefinition } from '../types'

const TextField = defineComponent({
  props: { field: { type: Object, required: true } },
  setup(props) {
    const { path, value } = useField<string>(() => props.field as FieldDefinition)
    return () => h('input', { 'data-path': path.value, value: value.value ?? '' })
  },
})

// A repeat field built on FormRows; `rowSlot` uses the row slot instead of the default.
const Repeat = defineComponent({
  props: { field: { type: Object, required: true }, rowSlot: Boolean },
  setup(props) {
    return () =>
      h(
        FormRows,
        { field: props.field as FieldDefinition },
        props.rowSlot
          ? {
              default: (row: { index: number; path: string; remove: () => void }) =>
                h('div', { class: 'row', 'data-row': row.path }, [
                  h('button', { class: 'remove', onClick: row.remove }, `Remove ${row.index + 1}`),
                ]),
            }
          : undefined,
      )
  },
})

const definition: FormDefinition = {
  components: [
    {
      type: 'repeat',
      path: 'people',
      components: [
        { type: 'text', path: 'name' },
        {
          type: 'repeat',
          path: 'phones',
          components: [{ type: 'text', path: 'number' }],
        },
      ],
    },
  ],
}

function mountRows(engine: FormEngine, rowSlot = false) {
  return mount(Repeat, {
    props: { field: definition.components[0]!, rowSlot },
    global: {
      provide: {
        [FORM_ENGINE_KEY as symbol]: engine,
        [REGISTRY_KEY as symbol]: { text: TextField, repeat: Repeat },
      },
    },
  })
}

describe('FormRows', () => {
  it("renders each row's fields scoped to that row, also in nested repeats", () => {
    const engine = new FormEngine(definition, {
      people: [{ name: 'Ada', phones: [{ number: '1' }, { number: '2' }] }, { name: 'Bob' }],
    })
    const wrapper = mountRows(engine)
    expect(wrapper.findAll('input').map((input) => input.attributes('data-path'))).toEqual([
      'people.0.name',
      'people.0.phones.0.number',
      'people.0.phones.1.number',
      'people.1.name',
    ])
    expect((wrapper.get('[data-path="people.1.name"]').element as HTMLInputElement).value).toBe(
      'Bob',
    )
  })

  it('follows rows being added and removed', async () => {
    const engine = new FormEngine(definition, { people: [{ name: 'Ada' }] })
    const wrapper = mountRows(engine)
    engine.addRepeatItem('people', { name: 'Bob' })
    await nextTick()
    expect(wrapper.findAll('[data-path$=".name"]')).toHaveLength(2)
    engine.removeRepeatItem('people', 0)
    await nextTick()
    const names = wrapper.findAll('[data-path$=".name"]')
    expect(names.map((input) => (input.element as HTMLInputElement).value)).toEqual(['Bob'])
  })

  it('renders nothing without an array', () => {
    const engine = new FormEngine(definition)
    expect(mountRows(engine).findAll('input')).toHaveLength(0)
  })

  it('gives a row slot its index, path and a remove function', async () => {
    const engine = new FormEngine(definition, { people: [{ name: 'Ada' }, { name: 'Bob' }] })
    const wrapper = mountRows(engine, true)
    expect(wrapper.findAll('.row').map((row) => row.attributes('data-row'))).toEqual([
      'people.0',
      'people.1',
    ])
    await wrapper.findAll('.remove')[0]!.trigger('click')
    expect(engine.getValue('people')).toEqual([{ name: 'Bob' }])
  })
})
