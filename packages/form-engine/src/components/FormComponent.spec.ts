// @vitest-environment jsdom
import { defineComponent, h, nextTick } from 'vue'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import FormComponent from './FormComponent.vue'
import FormRows from './FormRows.vue'

import { FORM_ENGINE_KEY } from '../composables/useFormEngine'
import { FormEngine } from '../FormEngine'
import { registerComponent } from '../registry'
import type { FieldDefinition, FormDefinition } from '../types'

const StubField = defineComponent({
  props: ['field'],
  setup(props: { field: FieldDefinition }) {
    return () => h('div', { class: 'stub-field' }, props.field.path)
  },
})

registerComponent('stub', StubField)

function mountWithEngine(engine: FormEngine, components: FieldDefinition[]) {
  return mount(FormComponent, {
    props: { components },
    global: { provide: { [FORM_ENGINE_KEY as symbol]: engine } },
  })
}

describe('FormComponent hide conditions', () => {
  it('renders a field with no hide condition', () => {
    const engine = new FormEngine({ components: [] })
    const wrapper = mountWithEngine(engine, [{ type: 'stub', path: 'a' }])
    expect(wrapper.findAll('.stub-field')).toHaveLength(1)
  })

  it('hides a field whose hide is a boolean true', () => {
    const engine = new FormEngine({ components: [] })
    const wrapper = mountWithEngine(engine, [{ type: 'stub', path: 'a', hide: true }])
    expect(wrapper.findAll('.stub-field')).toHaveLength(0)
  })

  it('hides a field based on a string expression evaluated against the model', () => {
    const engine = new FormEngine({ components: [] })
    engine.setValue('showField', false)

    const wrapper = mountWithEngine(engine, [
      { type: 'stub', path: 'a', hide: 'showField !== true' },
    ])
    expect(wrapper.findAll('.stub-field')).toHaveLength(0)

    engine.setValue('showField', true)
    return wrapper.vm.$nextTick().then(() => {
      expect(wrapper.findAll('.stub-field')).toHaveLength(1)
    })
  })
})

describe('FormComponent inline', () => {
  it('renders the fields without the wrapping stack', () => {
    const engine = new FormEngine({ components: [] })
    const wrapper = mount(
      {
        render: () =>
          h('div', { class: 'host' }, [
            h(FormComponent, {
              components: [
                { type: 'stub', path: 'a' },
                { type: 'stub', path: 'b', hide: true },
                { type: 'stub', path: 'c' },
              ],
              inline: true,
            }),
          ]),
      },
      { global: { provide: { [FORM_ENGINE_KEY as symbol]: engine } } },
    )
    const children = wrapper.get('.host').element.children
    expect([...children].map((child) => child.className)).toEqual(['stub-field', 'stub-field'])
  })
})

describe('FormComponent grid', () => {
  it('marks each field with the width it asks for', () => {
    const engine = new FormEngine({ components: [] })
    const wrapper = mountWithEngine(engine, [
      { type: 'stub', path: 'a' },
      { type: 'stub', path: 'b', layout: { width: 'half' } },
      { type: 'stub', path: 'c', layout: { width: 'third' } },
    ])
    expect(wrapper.attributes('data-form-grid')).toBeDefined()
    const items = wrapper.findAll('[data-form-item]')
    expect(items.map((item) => item.attributes('data-width'))).toEqual(['full', 'half', 'third'])
  })

  it('uses no styling classes of its own', () => {
    const engine = new FormEngine({ components: [] })
    const wrapper = mountWithEngine(engine, [{ type: 'stub', path: 'a' }])
    expect(wrapper.attributes('class')).toBeUndefined()
    expect(wrapper.get('[data-form-item]').attributes('class')).toBeUndefined()
  })
})

describe('FormComponent and isHidden', () => {
  // A container renders its children through FormComponent; a repeat its rows.
  const Group = defineComponent({
    props: ['field'],
    setup: (props: { field: FieldDefinition }) => () =>
      h('div', { class: 'group' }, [
        h(FormComponent, { components: props.field.components ?? [] }),
      ]),
  })
  const Rows = defineComponent({
    props: ['field'],
    setup: (props: { field: FieldDefinition }) => () => h(FormRows, { field: props.field }),
  })
  registerComponent('agree-group', Group)
  registerComponent('repeat', Rows)

  it('agree on every path, through containers, rows and both scopes', async () => {
    const definition: FormDefinition = {
      components: [
        { type: 'stub', path: 'mode' },
        {
          type: 'agree-group',
          hide: "mode === 'none'",
          components: [
            { type: 'stub', path: 'contact.phone', hide: "mode !== 'phone'" },
            { type: 'stub', path: 'contact.email', hide: "mode !== 'email'" },
          ],
        },
        {
          type: 'repeat',
          path: 'items',
          components: [
            { type: 'stub', path: 'kind' },
            { type: 'stub', path: 'reason', hide: "kind !== 'other'" },
            { type: 'stub', path: 'note', hide: { expression: "mode === 'phone'", root: true } },
          ],
        },
      ],
    }
    const engine = new FormEngine(definition, {
      mode: 'phone',
      items: [{ kind: 'other' }, { kind: 'x' }],
    })
    const wrapper = mountWithEngine(engine, definition.components)
    const paths = [
      'mode',
      'contact.phone',
      'contact.email',
      ...[0, 1].flatMap((row) => ['kind', 'reason', 'note'].map((key) => `items.${row}.${key}`)),
    ]
    const check = () => {
      const rendered = new Set(wrapper.findAll('.stub-field').map((field) => field.text()))
      const resolved = (path: string) =>
        path.startsWith('items.') ? path.split('.').slice(2).join('.') : path
      for (const path of paths) {
        const shown = [...rendered].includes(resolved(path))
        // Rows render the row-relative path; tell rows apart by count instead.
        if (!path.startsWith('items.')) expect(shown, path).toBe(!engine.isHidden(path))
      }
      const rowFields = wrapper.findAll('.stub-field').map((field) => field.text())
      const expectedRowFields = paths
        .filter((path) => path.startsWith('items.') && !engine.isHidden(path))
        .map(resolved)
      expect(rowFields.filter((text) => ['kind', 'reason', 'note'].includes(text))).toEqual(
        expectedRowFields,
      )
    }

    check()
    engine.setValue('mode', 'email')
    await nextTick()
    check()
    engine.setValue('mode', 'none')
    engine.setValue('items.1.kind', 'other')
    await nextTick()
    check()
  })
})
