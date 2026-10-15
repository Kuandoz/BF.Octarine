import { defineIcon } from '@octarine/icons'
import { trash as trashOutline } from '@octarine/icons/heroicons/outline'
import { trash as trashSolid } from '@octarine/icons/heroicons/solid'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createIcons } from '../../../composables/useIcons'
import OIcon from './OIcon.vue'

const icons = createIcons({ 'trash/outline': trashOutline, 'trash/solid': trashSolid })

const logo = defineIcon({
  name: 'test:logo',
  viewBox: '0 0 10 10',
  multicolor: true,
  ids: true,
  nodes: [
    ['defs', {}, [['linearGradient', { id: 'g' }, [['stop', { 'stop-color': '#7938ea' }]]]]],
    ['path', { d: 'M0 0h10v10z', fill: 'url(#g)' }],
    ['use', { href: '#g' }],
  ],
})

afterEach(() => vi.restoreAllMocks())

describe('OIcon', () => {
  it('is decorative by default: hidden from assistive tech and not focusable', () => {
    const wrapper = mount(OIcon, { props: { icon: trashOutline } })
    expect(wrapper.element.tagName).toBe('svg')
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.attributes('focusable')).toBe('false')
    expect(wrapper.attributes('role')).toBeUndefined()
  })

  it('becomes an image with an accessible name when labelled', () => {
    const wrapper = mount(OIcon, { props: { icon: trashOutline, label: 'Delete' } })
    expect(wrapper.attributes('role')).toBe('img')
    expect(wrapper.attributes('aria-label')).toBe('Delete')
    expect(wrapper.attributes('aria-hidden')).toBeUndefined()
  })

  it('resolves names and variants from the registry', () => {
    const outline = mount(OIcon, { props: { name: 'trash' }, global: { plugins: [icons] } })
    const solid = mount(OIcon, {
      props: { name: 'trash', variant: 'solid' },
      global: { plugins: [icons] },
    })
    expect(outline.attributes('stroke')).toBe('currentColor')
    expect(solid.attributes('fill')).toBe('currentColor')
    expect(solid.find('path').attributes('d')).toBe(trashSolid.nodes[0]![1].d)
  })

  it('applies intent, size and the disabled look as classes', () => {
    const wrapper = mount(OIcon, {
      props: { icon: trashOutline, intent: 'danger', size: 'lg', disabled: true },
    })
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['icon', 'text-danger', 'icon-lg', 'icon-disabled']),
    )
  })

  it('uses the warning text color, which meets contrast', () => {
    const wrapper = mount(OIcon, { props: { icon: trashOutline, intent: 'warning' } })
    expect(wrapper.classes()).toContain('text-warning-subtle-fg')
  })

  it('lets consumer classes override the size', () => {
    const wrapper = mount(OIcon, {
      props: { icon: trashOutline, size: 'sm' },
      attrs: { class: 'icon-lg' },
    })
    expect(wrapper.classes()).toContain('icon-lg')
    expect(wrapper.classes()).not.toContain('icon-sm')
  })

  it('keeps the colors of multi-color icons and gives each instance its own ids', () => {
    const wrapper = mount({
      components: { OIcon },
      setup: () => ({ logo }),
      template: '<div><OIcon :icon="logo" intent="danger" /><OIcon :icon="logo" /></div>',
    })
    const [first, second] = wrapper.findAll('svg')
    expect(first!.classes()).not.toContain('text-danger')

    const firstId = first!.find('linearGradient').attributes('id')!
    const secondId = second!.find('linearGradient').attributes('id')!
    expect(firstId).not.toBe(secondId)
    expect(first!.find('path').attributes('fill')).toBe(`url(#${firstId})`)
    expect(first!.find('use').attributes('href')).toBe(`#${firstId}`)
    expect(first!.find('stop').attributes('stop-color')).toBe('#7938ea')
  })

  it('warns about and shows a placeholder for an unregistered name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(OIcon, { props: { name: 'nope' }, global: { plugins: [icons] } })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"nope/outline" is not registered'))
    expect(wrapper.attributes('stroke-dasharray')).toBe('3 2')
  })
})
