import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import OControlFrame from './OControlFrame.vue'

describe('OControlFrame', () => {
  it('focuses its control when its padding or adornments are clicked', async () => {
    const wrapper = mount(OControlFrame, {
      attachTo: document.body,
      slots: {
        leading: () => h('span', 'kg'),
        default: () => h('input', { 'data-control': '' }),
      },
    })
    await wrapper.get('span').trigger('click')
    expect(document.activeElement).toBe(wrapper.get('input').element)
    wrapper.unmount()
  })

  it('leaves buttons inside alone', async () => {
    const wrapper = mount(OControlFrame, {
      attachTo: document.body,
      slots: {
        default: () => h('input', { 'data-control': '' }),
        trailing: () => h('button', { type: 'button' }, 'Show'),
      },
    })
    await wrapper.get('button').trigger('click')
    expect(document.activeElement).not.toBe(wrapper.get('input').element)
    wrapper.unmount()
  })

  it('shows invalid, disabled and read-only states', () => {
    expect(mount(OControlFrame, { props: { invalid: true } }).classes()).toContain('border-danger')
    expect(mount(OControlFrame, { props: { disabled: true } }).classes()).toContain('opacity-50')
    const readonly = mount(OControlFrame, { props: { readonly: true } }).classes()
    expect(readonly).toContain('bg-surface-sunken')
    expect(readonly).not.toContain('opacity-50')
  })
})
