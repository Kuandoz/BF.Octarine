import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OHeading from './OHeading.vue'

describe('OHeading', () => {
  it('matches size to level by default', () => {
    const wrapper = mount(OHeading, { props: { level: 3 } })
    expect(wrapper.element.tagName).toBe('H3')
    expect(wrapper.classes()).toContain('text-heading-3')
  })

  it('caps the default size at heading-4 for deep levels', () => {
    const wrapper = mount(OHeading, { props: { level: 6 } })
    expect(wrapper.classes()).toContain('text-heading-4')
  })

  it('decouples visual size from semantic level', () => {
    const wrapper = mount(OHeading, { props: { level: 1, size: 'display' } })
    expect(wrapper.element.tagName).toBe('H1')
    expect(wrapper.classes()).toContain('text-display')
    expect(wrapper.classes()).not.toContain('text-heading-1')
  })

  it('keeps text style and color classes when merging', () => {
    const wrapper = mount(OHeading, { attrs: { class: 'text-primary' } })
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['text-heading-2', 'text-primary']))
  })
})
