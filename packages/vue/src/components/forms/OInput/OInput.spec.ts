import { mount } from '@vue/test-utils'
import { envelope } from '@octarine/icons/heroicons/outline'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import OInput from './OInput.vue'

const vModel = (initial: string) => {
  const wrapper = mount(OInput, {
    attachTo: document.body,
    props: {
      modelValue: initial,
      'onUpdate:modelValue': (v: string | number | undefined) =>
        wrapper.setProps({ modelValue: v }),
    },
  })
  return wrapper
}

describe('OInput', () => {
  it('supports v-model', async () => {
    const wrapper = vModel('a')
    await wrapper.get('input').setValue('hello')
    expect(wrapper.props('modelValue')).toBe('hello')
  })

  it('puts class on the frame and other attributes on the input', () => {
    const wrapper = mount(OInput, { attrs: { class: 'max-w-sm', placeholder: 'Name' } })
    expect(wrapper.classes()).toContain('max-w-sm')
    expect(wrapper.get('input').attributes('placeholder')).toBe('Name')
    expect(wrapper.get('input').classes()).not.toContain('max-w-sm')
  })

  it('describes the input with its prefix and suffix', () => {
    const wrapper = mount(OInput, { props: { prefix: '€', suffix: 'per month' } })
    const ids = wrapper.get('input').attributes('aria-describedby')!.split(' ')
    expect(ids.map((id) => wrapper.get(`[id="${id}"]`).text())).toEqual(['€', 'per month'])
  })

  it('renders a decorative leading icon', () => {
    const wrapper = mount(OInput, { props: { icon: envelope } })
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true')
  })

  it('clears with a labelled button and returns focus to the input', async () => {
    const wrapper = vModel('octarine')
    await wrapper.setProps({ clearable: true })
    const button = wrapper.get('button')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-label')).toBe('Clear')

    await button.trigger('click')
    expect(wrapper.props('modelValue')).toBe('')
    expect(document.activeElement).toBe(wrapper.get('input').element)
    expect(wrapper.find('button').exists()).toBe(false)
    wrapper.unmount()
  })

  it('has no clear button when empty, disabled or read-only', () => {
    expect(
      mount(OInput, { props: { clearable: true } })
        .find('button')
        .exists(),
    ).toBe(false)
    const disabled = mount(OInput, { props: { clearable: true, disabled: true, modelValue: 'x' } })
    expect(disabled.find('button').exists()).toBe(false)
    const readonly = mount(OInput, { props: { clearable: true, readonly: true, modelValue: 'x' } })
    expect(readonly.find('button').exists()).toBe(false)
  })

  it('announces loading with a status', () => {
    const wrapper = mount(OInput, { props: { loading: true } })
    const status = wrapper.get('[role="status"]')
    expect(status.attributes('aria-label')).toBe('Loading')
  })

  it('stays focusable when read-only', () => {
    const input = mount(OInput, { props: { readonly: true } }).get('input')
    expect(input.attributes('readonly')).toBeDefined()
    expect(input.attributes('disabled')).toBeUndefined()
  })

  it('marks itself invalid', () => {
    const wrapper = mount(OInput, { props: { invalid: true } })
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
    expect(wrapper.classes()).toContain('border-danger')
  })

  it('focuses the input when the frame around it is clicked', async () => {
    const wrapper = mount(OInput, { attachTo: document.body, props: { prefix: 'https://' } })
    await wrapper.get('span').trigger('click')
    expect(document.activeElement).toBe(wrapper.get('input').element)
    wrapper.unmount()
  })

  it('renders extra content in the leading and trailing slots', () => {
    const wrapper = mount(OInput, {
      slots: {
        leading: () => h('span', 'lead'),
        trailing: () => h('button', { type: 'button' }, 'Show'),
      },
    })
    expect(wrapper.text()).toContain('lead')
    expect(wrapper.get('button').text()).toBe('Show')
  })
})
