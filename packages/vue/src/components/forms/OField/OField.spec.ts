import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import OInput from '../OInput/OInput.vue'
import OField from './OField.vue'

const describedBy = (el: { attributes: (name: string) => string | undefined }) =>
  (el.attributes('aria-describedby') ?? '').split(' ').filter(Boolean)

describe('OField', () => {
  afterEach(() => vi.useRealTimers())

  it('wires label, id and hint to the input', () => {
    const wrapper = mount(OField, {
      props: { label: 'Email', hint: 'We never share it.' },
      slots: { default: () => h(OInput) },
    })
    const input = wrapper.get('input')
    const hint = wrapper.get('p')

    expect(input.attributes('id')).toBeTruthy()
    expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'))
    expect(describedBy(input)).toEqual([hint.attributes('id')])
  })

  it('shows the hint above the control and the error below it, both described', () => {
    const wrapper = mount(OField, {
      props: { label: 'Email', hint: 'Work address', error: 'Enter an email address.' },
      slots: { default: () => h(OInput) },
    })
    const input = wrapper.get('input')
    const html = wrapper.html()
    const hint = wrapper.get(`[id="${describedBy(input)[0]}"]`)
    const error = wrapper.get(`[id="${describedBy(input)[1]}"]`)

    expect(input.attributes('aria-invalid')).toBe('true')
    expect(hint.text()).toBe('Work address')
    expect(error.text()).toContain('Enter an email address.')
    expect(html.indexOf('Work address')).toBeLessThan(html.indexOf('<input'))
    expect(html.indexOf('<input')).toBeLessThan(html.indexOf('Enter an email'))
  })

  it('labels the error icon, so the message is more than red text', () => {
    const wrapper = mount(OField, {
      props: { label: 'Email', error: 'Required' },
      slots: { default: () => h(OInput) },
    })
    const icon = wrapper.get('p svg')
    expect(icon.attributes('role')).toBe('img')
    expect(icon.attributes('aria-label')).toBe('Error:')
  })

  it('marks required fields with a hidden star and sets required on the control', () => {
    const wrapper = mount(OField, {
      props: { label: 'Name', required: true },
      slots: { default: () => h(OInput) },
    })
    const star = wrapper.get('label span')
    expect(star.text()).toBe('*')
    expect(star.attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('input').attributes('required')).toBeDefined()
  })

  it('marks optional fields in the label when markers include optional', () => {
    const optional = mount(OField, {
      props: { label: 'Website', markers: 'optional' },
      slots: { default: () => h(OInput) },
    })
    expect(optional.get('label').text()).toBe('Website (optional)')

    const required = mount(OField, {
      props: { label: 'Website' },
      slots: { default: () => h(OInput) },
    })
    expect(required.get('label').text()).toBe('Website')
  })

  it('renders a label action next to the label', () => {
    const wrapper = mount(OField, {
      props: { label: 'Password' },
      slots: {
        default: () => h(OInput),
        'label-action': () => h('a', { href: '#reset' }, 'Forgot password?'),
      },
    })
    expect(wrapper.get('a').text()).toBe('Forgot password?')
  })

  it('lets the input override field state', () => {
    const wrapper = mount(OField, {
      props: { label: 'Name', disabled: true },
      slots: { default: () => h(OInput, { disabled: false }) },
    })
    expect(wrapper.get('input').attributes('disabled')).toBeUndefined()
  })

  describe('counter', () => {
    const mountCounter = (value: string) =>
      mount(OField, {
        props: { label: 'Bio', maxLength: 10 },
        slots: { default: () => h(OInput, { modelValue: value }) },
      })

    it('describes the limit and shows the count visually only', async () => {
      const wrapper = mountCounter('hello')
      await nextTick()
      const ids = describedBy(wrapper.get('input'))
      expect(wrapper.get(`[id="${ids[0]}"]`).text()).toBe('You can enter up to 10 characters.')
      const visible = wrapper.get('[aria-hidden="true"].tabular-nums')
      expect(visible.text()).toBe('5 / 10')
    })

    it('says how many characters are over the limit', async () => {
      const wrapper = mountCounter('hello world!')
      await nextTick()
      expect(wrapper.get('.tabular-nums').text()).toBe('2 characters too many')
    })

    it('announces politely, only near the limit and after typing pauses', async () => {
      vi.useFakeTimers()
      const wrapper = mount(OField, {
        props: { label: 'Bio', maxLength: 10 },
        slots: { default: () => h(OInput, { modelValue: '' }) },
      })
      const live = wrapper.get('[aria-live="polite"]')

      await wrapper.get('input').setValue('ab')
      vi.advanceTimersByTime(1000)
      await nextTick()
      expect(live.text()).toBe('')

      await wrapper.get('input').setValue('abcdefgh')
      expect(live.text()).toBe('')
      vi.advanceTimersByTime(1000)
      await nextTick()
      expect(live.text()).toBe('2 characters left')
    })
  })
})
