import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { createMessages } from '../../../composables/useMessages'
import OField from '../OField/OField.vue'
import OInput from '../OInput/OInput.vue'
import OForm from './OForm.vue'

const field = (label: string, props: Record<string, unknown> = {}) =>
  h(OField, { label, ...props }, () => h(OInput))

describe('OForm', () => {
  afterEach(() => document.documentElement.removeAttribute('lang'))

  it('explains the star only when a field shows one', async () => {
    const wrapper = mount(OForm, { slots: { default: () => [field('Website')] } })
    expect(wrapper.text()).not.toContain('Fields marked * are required.')

    const required = mount(OForm, {
      slots: { default: () => [field('Name', { required: true }), field('Website')] },
    })
    await nextTick()
    expect(required.get('p').text()).toBe('Fields marked * are required.')
  })

  it('marks optional fields instead with markers="optional"', async () => {
    const wrapper = mount(OForm, {
      props: { markers: 'optional' },
      slots: { default: () => [field('Name', { required: true }), field('Website')] },
    })
    await nextTick()
    const labels = wrapper.findAll('label').map((l) => l.text())
    expect(labels).toEqual(['Name', 'Website (optional)'])
    expect(wrapper.text()).not.toContain('are required')
  })

  it('marks both with markers="both"', async () => {
    const wrapper = mount(OForm, {
      props: { markers: 'both' },
      slots: { default: () => [field('Name', { required: true }), field('Website')] },
    })
    await nextTick()
    expect(wrapper.findAll('label').map((l) => l.text())).toEqual(['Name *', 'Website (optional)'])
    expect(wrapper.get('p').text()).toBe('Fields marked * are required.')
  })

  it('writes its text in the language of <html lang>', async () => {
    document.documentElement.lang = 'nl-BE'
    const wrapper = mount(OForm, {
      props: { markers: 'both' },
      slots: { default: () => [field('Naam', { required: true }), field('Website')] },
    })
    await nextTick()
    expect(wrapper.get('p').text()).toBe('Velden met * zijn verplicht.')
    expect(wrapper.findAll('label')[1]!.text()).toBe('Website (optioneel)')
  })

  it('follows <html lang> when the app switches language', async () => {
    document.documentElement.lang = 'en'
    const wrapper = mount(OForm, {
      props: { markers: 'optional' },
      slots: { default: () => [field('Website')] },
    })
    expect(wrapper.get('label').text()).toBe('Website (optional)')
    document.documentElement.lang = 'de'
    await new Promise((resolve) => setTimeout(resolve))
    await nextTick()
    expect(wrapper.get('label').text()).toBe('Website (optional)')
    document.documentElement.lang = 'fr'
    await new Promise((resolve) => setTimeout(resolve))
    await nextTick()
    expect(wrapper.get('label').text()).toBe('Website (facultatif)')
  })

  it('uses its own lang over the page language', async () => {
    document.documentElement.lang = 'en'
    const wrapper = mount(OForm, {
      props: { lang: 'fr', markers: 'both' },
      slots: { default: () => [field('Nom', { required: true }), field('Site web')] },
    })
    await nextTick()
    expect(wrapper.attributes('lang')).toBe('fr')
    expect(wrapper.get('p').text()).toBe('Les champs marqués d’un * sont obligatoires.')
    expect(wrapper.findAll('label')[1]!.text()).toBe('Site web (facultatif)')
  })

  it('takes added languages and overrides from createMessages', async () => {
    const wrapper = mount(OForm, {
      props: { lang: 'es', markers: 'optional' },
      slots: { default: () => [field('Sitio web')] },
      global: { plugins: [createMessages({ es: { optional: '(opcional)' } })] },
    })
    expect(wrapper.get('label').text()).toBe('Sitio web (opcional)')
  })
})
