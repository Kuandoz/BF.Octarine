import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import OErrorSummary from './OErrorSummary.vue'

const errors = [{ message: 'Enter your name', target: 'name' }, { message: 'Accept the terms' }]

describe('OErrorSummary', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('lang')
  })

  it('is a region named by its heading', () => {
    const wrapper = mount(OErrorSummary, { props: { errors } })
    const heading = wrapper.get('h2')
    expect(heading.text()).toBe('There is a problem')
    expect(wrapper.attributes('role')).toBe('region')
    expect(wrapper.attributes('aria-labelledby')).toBe(heading.attributes('id'))
  })

  it('links each error to its control, and lists the rest as text', () => {
    const wrapper = mount(OErrorSummary, { props: { errors } })
    const items = wrapper.findAll('li')
    expect(items[0]!.get('a').attributes('href')).toBe('#name')
    expect(items[0]!.text()).toBe('Enter your name')
    expect(items[1]!.find('a').exists()).toBe(false)
    expect(items[1]!.text()).toBe('Accept the terms')
  })

  it('takes focus when it appears', () => {
    const wrapper = mount(OErrorSummary, { props: { errors }, attachTo: document.body })
    expect(document.activeElement).toBe(wrapper.element)
    expect(wrapper.attributes('tabindex')).toBe('-1')
  })

  it('leaves focus alone without autofocus', () => {
    const wrapper = mount(OErrorSummary, {
      props: { errors, autofocus: false },
      attachTo: document.body,
    })
    expect(document.activeElement).not.toBe(wrapper.element)
  })

  it('moves focus to the control and shows its label', async () => {
    document.body.innerHTML = '<label for="name">Name</label><input id="name" />'
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    const wrapper = mount(OErrorSummary, { props: { errors }, attachTo: document.body })

    await wrapper.get('a').trigger('click')
    expect(document.activeElement).toBe(document.getElementById('name'))
    expect(scroll.mock.contexts[0]).toBe(document.querySelector('label'))
  })

  it('writes its heading in the page language, or uses its own title', async () => {
    document.documentElement.lang = 'nl'
    await new Promise((resolve) => setTimeout(resolve)) // the lang observer is async
    expect(mount(OErrorSummary, { props: { errors } }).get('h2').text()).toBe('Er is een probleem')
    const titled = mount(OErrorSummary, { props: { errors, title: 'Check the form' } })
    expect(titled.get('h2').text()).toBe('Check the form')
  })
})
