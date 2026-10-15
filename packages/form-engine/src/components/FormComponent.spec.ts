// @vitest-environment jsdom
import { defineComponent, h } from 'vue'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import FormComponent from './FormComponent.vue'

import { FORM_ENGINE_KEY } from '../composables/useFormEngine'
import { FormEngine } from '../FormEngine'
import { registerComponent } from '../registry'
import type { FieldDefinition } from '../types'

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
