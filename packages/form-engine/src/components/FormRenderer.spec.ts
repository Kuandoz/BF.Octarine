// @vitest-environment jsdom
import { defineComponent, h, isProxy, nextTick, ref, shallowRef, toRaw } from 'vue'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import FormRenderer from './FormRenderer.vue'
import FormRows from './FormRows.vue'

import { useField } from '../composables/useField'
import { defineField } from '../fields'
import type { FormEngine } from '../FormEngine'
import { createForms, useForm } from '../forms'
import type { FieldDefinition, FormDefinition, FormError } from '../types'

const TextField = defineComponent({
  props: { field: { type: Object, required: true } },
  setup(props) {
    const { id, path, value, label, onBlur } = useField<string>(
      () => props.field as FieldDefinition,
    )
    return () =>
      h('div', { 'data-path': path.value }, [
        h('label', { for: id }, label.value),
        h('input', {
          id,
          value: value.value ?? '',
          onInput: (event: Event) => (value.value = (event.target as HTMLInputElement).value),
          onBlur,
        }),
      ])
  },
})
const RepeatField = defineComponent({
  props: { field: { type: Object, required: true } },
  setup: (props) => () => h(FormRows, { field: props.field as FieldDefinition }),
})
const forms = createForms({
  fields: [
    defineField({ type: 'text', component: TextField }),
    defineField({ type: 'repeat', component: RepeatField, rows: true }),
  ],
})

// Mounts with the forms installed, as an app would.
const mountWithForms = ((component: unknown, options: Record<string, unknown> = {}) =>
  mount(component as never, { ...options, global: { plugins: [forms] } })) as typeof mount

const definition = (): FormDefinition => ({
  components: [
    { type: 'text', path: 'name', label: 'name' },
    { type: 'repeat', path: 'items', components: [{ type: 'text', path: 'title' }] },
  ],
  validations: { name: [{ type: 'required' }] },
  localisations: { default: 'en', en: { name: 'Name' }, nl: { name: 'Naam' } },
})

function engineOf(wrapper: ReturnType<typeof mount>): FormEngine {
  return toRaw((wrapper.findComponent(FormRenderer).vm as unknown as { engine: FormEngine }).engine)
}

describe('FormRenderer', () => {
  it('renders a form that leaves validation to the engine', async () => {
    const wrapper = mountWithForms(FormRenderer, { props: { definition: definition() } })
    const form = wrapper.get('form')
    expect(form.attributes('novalidate')).toBeDefined()
    expect(form.find('[data-path="name"] input').exists()).toBe(true)
  })

  it('passes attributes like a name to the form', async () => {
    const wrapper = mountWithForms(FormRenderer, {
      props: { definition: definition() },
      attrs: { 'aria-label': 'Contact', class: 'my-form' },
    })
    expect(wrapper.get('form').attributes('aria-label')).toBe('Contact')
    expect(wrapper.get('form').classes()).toContain('my-form')
  })

  it('emits invalid with the errors in screen order when a rule fails', async () => {
    const wrapper = mountWithForms(FormRenderer, {
      props: { definition: definition() },
      attachTo: document.body,
    })
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    const [errors] = wrapper.emitted<[FormError[]]>('invalid')![0]!
    const input = wrapper.get('[data-path="name"] input')
    expect(errors).toEqual([
      {
        path: 'name',
        message: 'This field is required.',
        label: 'Name',
        target: input.attributes('id'),
      },
    ])
    wrapper.unmount()
  })

  it('emits submit with a plain copy of the values once every rule passes', async () => {
    const wrapper = mountWithForms(FormRenderer, {
      props: { definition: definition(), model: { items: [{ title: 'a' }] } },
    })
    engineOf(wrapper).addRepeatItem('items', { title: 'b' })
    await wrapper.get('[data-path="name"] input').setValue('Ada')
    await wrapper.get('form').trigger('submit')

    const [model] = wrapper.emitted<[Record<string, unknown>]>('submit')![0]!
    expect(model).toEqual({ name: 'Ada', items: [{ title: 'a' }, { title: 'b' }] })
    expect(isProxy(model)).toBe(false)
    expect(isProxy((model.items as unknown[])[0])).toBe(false)
    ;(model.items as Array<{ title: string }>)[0]!.title = 'changed'
    expect(engineOf(wrapper).getValue('items.0.title')).toBe('a')
  })

  it('exposes submit, for a button outside the form', async () => {
    const wrapper = mountWithForms(FormRenderer, { props: { definition: definition() } })
    const renderer = wrapper.vm as unknown as { submit(): Promise<boolean> }
    expect(await renderer.submit()).toBe(false)
    expect(wrapper.emitted('invalid')).toHaveLength(1)
  })

  it('renders slots above and below the fields, with the engine', async () => {
    const wrapper = mountWithForms(FormRenderer, {
      props: { definition: definition() },
      slots: {
        before: ({ engine }: { engine: FormEngine }) =>
          h('p', { class: 'before' }, String(engine.submitted)),
        default: () => h('button', { type: 'submit' }, 'Send'),
      },
    })
    const children = [...wrapper.get('form').element.children]
    expect(children[0]!.className).toBe('before')
    expect(children.at(-1)!.tagName).toBe('BUTTON')
  })

  it('switches language without losing what was filled in', async () => {
    const locale = ref('en')
    const wrapper = mountWithForms(() =>
      h(FormRenderer, { definition: definition(), locale: locale.value }),
    )
    await wrapper.get('[data-path="name"] input').setValue('Ada')
    await wrapper.get('[data-path="name"] input').trigger('blur')
    const engine = engineOf(wrapper)

    locale.value = 'nl'
    await nextTick()

    expect(wrapper.get('[data-path="name"] label').text()).toBe('Naam')
    expect(engineOf(wrapper)).toBe(engine)
    expect(engine.getValue('name')).toBe('Ada')
    expect(engine.isTouched('name')).toBe(true)
  })

  it('takes a changed definition, keeping what was filled in', async () => {
    const current = ref(definition())
    const wrapper = mountWithForms(() => h(FormRenderer, { definition: current.value }))
    await wrapper.get('[data-path="name"] input').setValue('Ada')

    current.value = {
      ...definition(),
      components: [...definition().components, { type: 'text', path: 'email', label: 'Email' }],
    }
    await nextTick()

    expect(wrapper.find('[data-path="email"]').exists()).toBe(true)
    expect(engineOf(wrapper).getValue('name')).toBe('Ada')
    expect((wrapper.get('[data-path="name"] input').element as HTMLInputElement).value).toBe('Ada')
    expect(engineOf(wrapper).getFieldId('email')).toBe(
      wrapper.get('[data-path="email"] input').attributes('id'),
    )
  })

  it('follows edits made inside the definition', async () => {
    const current = ref(definition())
    const wrapper = mountWithForms(() => h(FormRenderer, { definition: current.value }))
    current.value.components[0]!.hide = true
    await nextTick()
    expect(wrapper.find('[data-path="name"]').exists()).toBe(false)
    expect(engineOf(wrapper).isHidden('name')).toBe(true)
  })

  it('starts over with a new model', async () => {
    const model = ref<Record<string, unknown>>({ name: 'Ada' })
    const wrapper = mountWithForms(() =>
      h(FormRenderer, { definition: definition(), model: model.value }),
    )
    await wrapper.get('[data-path="name"] input').trigger('blur')

    model.value = { name: 'Grace' }
    await nextTick()

    expect(engineOf(wrapper).getValue('name')).toBe('Grace')
    expect(engineOf(wrapper).isTouched('name')).toBe(false)
  })

  it('keeps its state when a parent passes an equal definition or model again', async () => {
    const count = ref(0)
    const wrapper = mountWithForms(() =>
      h('div', [
        h('span', count.value),
        h(FormRenderer, { definition: definition(), model: { items: [] } }),
      ]),
    )
    await wrapper.get('[data-path="name"] input').setValue('Ada')
    const engine = engineOf(wrapper)

    count.value++
    await nextTick()

    expect(engineOf(wrapper)).toBe(engine)
    expect(engine.getValue('name')).toBe('Ada')
  })

  it('uses an engine it is given, and a new one when that changes', async () => {
    const first = forms.createEngine(definition(), { model: { name: 'Ada' } })
    const engine = shallowRef(first)
    const wrapper = mountWithForms(() => h(FormRenderer, { form: engine.value }))
    expect(engineOf(wrapper)).toBe(first)

    const second = forms.createEngine(definition(), { model: { name: 'Grace' } })
    engine.value = second
    await nextTick()

    expect(engineOf(wrapper)).toBe(second)
    expect((wrapper.get('[data-path="name"] input').element as HTMLInputElement).value).toBe(
      'Grace',
    )
    expect(first.getFieldId('name')).toBeUndefined()
    expect(second.getFieldId('name')).toBeDefined()
  })

  it('renders a form from useForm, with the installed field types', async () => {
    let form: Readonly<{ value: FormEngine }> | undefined
    const App = defineComponent({
      setup() {
        const own = useForm(definition(), { model: { name: 'Ada' } })
        form = own
        return () => h(FormRenderer, { form: own.value })
      },
    })
    const wrapper = mountWithForms(App)
    expect((wrapper.get('[data-path="name"] input').element as HTMLInputElement).value).toBe('Ada')
    expect(engineOf(wrapper)).toBe(toRaw(form!.value))
  })

  it('needs a form or a definition', async () => {
    expect(() => mountWithForms(FormRenderer)).toThrow('needs a "form" or a "definition"')
  })
})
