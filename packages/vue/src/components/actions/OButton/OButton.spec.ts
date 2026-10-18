import { trash } from '@octarine/icons/heroicons/outline'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
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

  it.each([
    ['solid', 'primary', 'active:bg-primary-hover'],
    ['soft', 'danger', 'active:bg-danger-subtle/70'],
    ['outline', 'neutral', 'active:bg-surface-sunken'],
    ['ghost', 'primary', 'active:bg-primary-subtle'],
  ] as const)(
    'shows a %s %s button being pressed, also without hover',
    (variant, intent, pressed) => {
      const wrapper = mount(OButton, { props: { variant, intent } })
      expect(wrapper.classes()).toEqual(
        expect.arrayContaining([pressed, 'active:[transform:var(--oct-button-pressed-transform)]']),
      )
    },
  )

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

describe('OButton icons', () => {
  it('renders leading and trailing icons, sized to the button and hidden from assistive tech', () => {
    const wrapper = mount(OButton, {
      props: { icon: trash, iconEnd: { icon: trash, size: 'lg' }, size: 'sm' },
      slots: { default: 'Delete' },
    })
    const [leading, trailing] = wrapper.findAll('svg')
    expect(leading!.classes()).toContain('icon-sm')
    expect(trailing!.classes()).toContain('icon-lg')
    expect(leading!.attributes('aria-hidden')).toBe('true')
    expect(wrapper.text()).toBe('Delete')
    expect(wrapper.classes()).not.toContain('px-0')
  })

  it('is square when icon-only and keeps its accessible name', () => {
    const wrapper = mount(OButton, { props: { icon: trash }, attrs: { 'aria-label': 'Delete' } })
    expect(wrapper.classes()).toContain('px-0')
    expect(wrapper.attributes('aria-label')).toBe('Delete')
  })

  it('warns when an icon-only button has no accessible name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(OButton, { props: { icon: trash } })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('needs an aria-label'))
    warn.mockRestore()
  })

  it('shows the spinner instead of the leading icon while loading', () => {
    const wrapper = mount(OButton, {
      props: { icon: trash, loading: true },
      slots: { default: 'Save' },
    })
    expect(wrapper.find('svg').exists()).toBe(false)
  })
})
