import { check, user } from '@octarine/icons/heroicons/solid'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OIcon from '../OIcon/OIcon.vue'
import OIconLayers from './OIconLayers.vue'

const render = (props: Record<string, unknown> = {}) =>
  mount({
    components: { OIcon, OIconLayers },
    setup: () => ({ user, check, props }),
    template: `
      <OIconLayers v-bind="props">
        <OIcon :icon="user" />
        <OIcon :icon="check" intent="success" label="ignored" :transform="{ scale: 0.5, x: 6, y: 6 }" />
      </OIconLayers>`,
  })

describe('OIconLayers', () => {
  it('renders one icon with a nested svg per layer', () => {
    const root = render().find('svg')
    expect(root.classes()).toContain('icon')
    expect(root.attributes('viewBox')).toBe('0 0 24 24')
    expect(root.findAll('g > svg')).toHaveLength(2)
  })

  it('places layers with their transform, around the center', () => {
    const layers = render().findAll('g')
    expect(layers[0]!.attributes('transform')).toBeUndefined()
    expect(layers[1]!.attributes('transform')).toBe(
      'translate(18 18) rotate(0) scale(0.5 0.5) translate(-12 -12)',
    )
    expect(layers[1]!.find('svg').classes()).toContain('text-success')
  })

  it('is labelled as a whole; layers carry no roles of their own', () => {
    const root = render({ label: 'User verified' }).find('svg')
    expect(root.attributes('role')).toBe('img')
    expect(root.attributes('aria-label')).toBe('User verified')
    expect(root.find('[role]').exists()).toBe(false)
    expect(root.find('[aria-label]').exists()).toBe(false)
  })

  it('is decorative without a label', () => {
    expect(render().find('svg').attributes('aria-hidden')).toBe('true')
  })
})
