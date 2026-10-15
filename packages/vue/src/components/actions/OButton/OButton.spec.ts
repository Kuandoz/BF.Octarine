import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OButton from './OButton.vue'

describe('OButton', () => {
  it('renders a type="button" by default so it never submits forms by accident', () => {
    const wrapper = mount(OButton, { slots: { default: 'Save' } })
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.text()).toBe('Save')
  })

  it('applies the classes for variant × intent', () => {
    const wrapper = mount(OButton, { props: { variant: 'outline', intent: 'danger' } })
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['border-danger', 'text-danger']))
    expect(wrapper.classes()).not.toContain('bg-primary')
  })

  it('lets consumer classes override conflicting defaults', () => {
    const wrapper = mount(OButton, { attrs: { class: 'rounded-full' } })
    expect(wrapper.classes()).toContain('rounded-full')
    expect(wrapper.classes()).not.toContain('rounded-control')
  })

  it('is disabled and busy while loading', () => {
    const wrapper = mount(OButton, {
      props: { loading: true },
      slots: { leading: '<i class="icon" />' },
    })
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.find('.icon').exists()).toBe(false)
  })
})
