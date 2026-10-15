import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import OField from '../OField/OField.vue'
import OInput from '../OInput/OInput.vue'
import OFieldset from './OFieldset.vue'

const parts = () => [
  h(OField, { label: 'Day' }, () => h(OInput)),
  h(OField, { label: 'Month' }, () => h(OInput)),
]

describe('OFieldset', () => {
  it('names the group with a legend and describes it with hint and error', () => {
    const wrapper = mount(OFieldset, {
      props: { legend: 'Date of birth', hint: 'For example 27 3', error: 'Enter a real date.' },
      slots: { default: parts },
    })
    const fieldset = wrapper.get('fieldset')
    const ids = fieldset.attributes('aria-describedby')!.split(' ')

    expect(wrapper.get('legend').text()).toBe('Date of birth')
    expect(wrapper.get(`[id="${ids[0]}"]`).text()).toBe('For example 27 3')
    expect(wrapper.get(`[id="${ids[1]}"]`).text()).toContain('Enter a real date.')
  })

  it('keeps each control labelled and marks them invalid', () => {
    const wrapper = mount(OFieldset, {
      props: { legend: 'Date of birth', error: 'Enter a real date.' },
      slots: { default: parts },
    })
    const inputs = wrapper.findAll('input')
    const labels = wrapper.findAll('label')
    expect(inputs.map((i) => i.attributes('aria-invalid'))).toEqual(['true', 'true'])
    expect(labels.map((l) => l.attributes('for'))).toEqual(inputs.map((i) => i.attributes('id')))
    expect(new Set(inputs.map((i) => i.attributes('id'))).size).toBe(2)
  })

  it('disables the whole group', () => {
    const wrapper = mount(OFieldset, {
      props: { legend: 'Date of birth', disabled: true },
      slots: { default: parts },
    })
    expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('input').every((i) => i.attributes('disabled') !== undefined)).toBe(true)
  })

  it('says "required" to screen readers, without making every control required', () => {
    const wrapper = mount(OFieldset, {
      props: { legend: 'Delivery', required: true },
      slots: { default: parts },
    })
    expect(wrapper.get('legend .sr-only').text()).toBe('(required)')
    expect(wrapper.findAll('input').some((i) => i.attributes('required') !== undefined)).toBe(false)
  })
})
