import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import OInput from '../OInput/OInput.vue'
import OField from './OField.vue'

describe('OField + OInput', () => {
  it('wires label, id and description to the input', () => {
    const wrapper = mount(OField, {
      props: { label: 'Email', hint: 'We never share it.' },
      slots: { default: () => h(OInput) },
    })
    const input = wrapper.get('input')
    const label = wrapper.get('label')
    const hint = wrapper.get('p')

    expect(input.attributes('id')).toBeTruthy()
    expect(label.attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('aria-describedby')).toBe(hint.attributes('id'))
  })

  it('marks the input invalid and shows the error instead of the hint', () => {
    const wrapper = mount(OField, {
      props: { label: 'Email', hint: 'Hint', error: 'Required' },
      slots: { default: () => h(OInput) },
    })
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('p').text()).toBe('Required')
  })

  it('lets the input override field state', () => {
    const wrapper = mount(OField, {
      props: { label: 'Name', disabled: true },
      slots: { default: () => h(OInput, { disabled: false }) },
    })
    expect(wrapper.get('input').attributes('disabled')).toBeUndefined()
  })
})

describe('OInput', () => {
  it('supports v-model', async () => {
    const wrapper = mount(OInput, {
      props: {
        modelValue: 'a',
        'onUpdate:modelValue': (v: string | number | undefined) =>
          wrapper.setProps({ modelValue: v }),
      },
    })
    await wrapper.get('input').setValue('hello')
    expect(wrapper.props('modelValue')).toBe('hello')
  })
})
