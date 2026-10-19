// @vitest-environment jsdom
import { defineComponent, h } from 'vue'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import FormRenderer from './FormRenderer.vue'
import FormRows from './FormRows.vue'

import { useField } from '../composables/useField'
import type { FormEngine } from '../FormEngine'
import { defineField, type FieldType } from '../fields'
import { createForms, useForm } from '../forms'
import type { FieldDefinition, FormDefinition, ValidatorRegistry } from '../types'

// Two forms on one page that capture the same paths (two people, a billing
// and a shipping address) must not share anything: model, errors, touched
// state, conditions, language, registered components or validators. Each
// test mounts both forms in one app, so anything kept at module level or
// keyed by path alone shows up here.

const TextField = defineComponent({
  props: { field: { type: Object, required: true } },
  setup(props) {
    const { id, path, value, label, required, error, onBlur } = useField<string>(
      () => props.field as FieldDefinition,
    )
    return () =>
      h('div', { class: 'text-field', 'data-path': path.value }, [
        h('label', { class: 'label', for: id }, label.value),
        required.value ? h('span', { class: 'required' }, '*') : null,
        h('input', {
          id,
          value: value.value ?? '',
          onInput: (event: Event) => (value.value = (event.target as HTMLInputElement).value),
          onBlur,
        }),
        error.value ? h('p', { class: 'error' }, error.value) : null,
      ])
  },
})

const RepeatField = defineComponent({
  props: { field: { type: Object, required: true } },
  setup: (props) => () =>
    h('div', { class: 'repeat' }, [h(FormRows, { field: props.field as FieldDefinition })]),
})

const forms = createForms({
  fields: [
    defineField({ type: 'text', component: TextField }),
    defineField({ type: 'repeat', component: RepeatField, rows: true }),
  ],
})

const personForm = (): FormDefinition => ({
  components: [
    { type: 'text', path: 'person.name', label: 'Name' },
    { type: 'text', path: 'person.email', label: 'Email' },
  ],
  validations: { 'person.name': [{ type: 'required' }] },
})

interface FormProps {
  definition: FormDefinition
  model?: Record<string, unknown>
  locale?: string
  // Field types and validators for this form only, on top of the app's.
  fields?: Record<string, FieldType>
  validators?: ValidatorRegistry
}

function mountTwo(a: FormProps, b: FormProps = a) {
  const wrapper = mount(
    defineComponent({
      setup() {
        const formA = useForm(a.definition, a)
        const formB = useForm(b.definition, b)
        return () => [
          h('section', { id: 'a' }, [h(FormRenderer, { form: formA.value, ref: 'a' })]),
          h('section', { id: 'b' }, [h(FormRenderer, { form: formB.value, ref: 'b' })]),
        ]
      },
    }),
    { attachTo: document.body, global: { plugins: [forms] } },
  )
  const engineOf = (ref: 'a' | 'b') => (wrapper.vm.$refs[ref] as { engine: FormEngine }).engine
  return {
    wrapper,
    a: { engine: engineOf('a'), el: wrapper.find('#a') },
    b: { engine: engineOf('b'), el: wrapper.find('#b') },
  }
}

describe('two forms on one page', () => {
  it('give each form its own engine', async () => {
    const { wrapper, a, b } = mountTwo({ definition: personForm() })
    expect(a.engine).not.toBe(b.engine)
    wrapper.unmount()
  })

  it('keep the values of the same path apart', async () => {
    const { wrapper, a, b } = mountTwo({ definition: personForm() })

    await a.el.find('[data-path="person.name"] input').setValue('Ada')

    expect(a.engine.getValue('person.name')).toBe('Ada')
    expect(b.engine.getValue('person.name')).toBeUndefined()
    expect((b.el.find('[data-path="person.name"] input').element as HTMLInputElement).value).toBe(
      '',
    )
    wrapper.unmount()
  })

  it('copy a model object that both forms were given, so neither writes into the other', async () => {
    const shared = { person: { name: 'Ada' } }
    const { wrapper, a, b } = mountTwo({ definition: personForm(), model: shared })

    await a.el.find('[data-path="person.name"] input').setValue('Grace')

    expect(a.engine.getValue('person.name')).toBe('Grace')
    expect(b.engine.getValue('person.name')).toBe('Ada')
    expect(shared.person.name).toBe('Ada')
    wrapper.unmount()
  })

  it('show an error only in the form whose field was left', async () => {
    const { wrapper, a, b } = mountTwo({ definition: personForm() })

    await a.el.find('[data-path="person.name"] input').trigger('blur')

    expect(a.engine.isTouched('person.name')).toBe(true)
    expect(b.engine.isTouched('person.name')).toBe(false)
    expect(a.el.findAll('.error')).toHaveLength(1)
    expect(b.el.findAll('.error')).toHaveLength(0)
    wrapper.unmount()
  })

  it('submit one form without showing errors in the other', async () => {
    const { wrapper, a, b } = mountTwo({ definition: personForm() })

    expect(await a.engine.submit()).toBe(false)
    await wrapper.vm.$nextTick()

    expect(a.engine.getErrors()).toHaveLength(1)
    expect(b.engine.submitted).toBe(false)
    expect(b.engine.getErrors()).toHaveLength(0)
    expect(b.el.findAll('.error')).toHaveLength(0)
    wrapper.unmount()
  })

  it('validate each form against its own values', async () => {
    const { wrapper, a, b } = mountTwo({ definition: personForm() })

    await a.el.find('[data-path="person.name"] input').setValue('Ada')

    expect(await a.engine.submit()).toBe(true)
    expect(await b.engine.submit()).toBe(false)
    wrapper.unmount()
  })

  it('evaluate hide and required-if conditions against their own model', async () => {
    const definition = (): FormDefinition => ({
      components: [
        { type: 'text', path: 'contact.mode', label: 'Mode' },
        { type: 'text', path: 'contact.phone', label: 'Phone', hide: "contact.mode !== 'phone'" },
        { type: 'text', path: 'contact.note', label: 'Note' },
      ],
      validations: {
        'contact.phone': [{ type: 'required', condition: "contact.mode === 'phone'" }],
        'contact.note': [{ type: 'required', condition: "contact.mode === 'mail'" }],
      },
    })
    const { wrapper, a, b } = mountTwo(
      { definition: definition(), model: { contact: { mode: 'phone' } } },
      { definition: definition(), model: { contact: { mode: 'mail' } } },
    )

    expect(a.el.find('[data-path="contact.phone"]').exists()).toBe(true)
    expect(b.el.find('[data-path="contact.phone"]').exists()).toBe(false)
    expect(a.engine.isHidden('contact.phone')).toBe(false)
    expect(b.engine.isHidden('contact.phone')).toBe(true)

    expect(a.el.find('[data-path="contact.note"] .required').exists()).toBe(false)
    expect(b.el.find('[data-path="contact.note"] .required').exists()).toBe(true)

    expect(await a.engine.submit()).toBe(false) // phone is shown and empty
    expect(await b.engine.submit()).toBe(false) // note is required, phone is not asked for
    expect(a.engine.getErrors().map((e) => e.path)).toEqual(['contact.phone'])
    expect(b.engine.getErrors().map((e) => e.path)).toEqual(['contact.note'])
    wrapper.unmount()
  })

  it('keep rows of a repeat with the same path apart', async () => {
    const definition = (): FormDefinition => ({
      components: [
        {
          type: 'repeat',
          path: 'people',
          components: [
            { type: 'text', path: 'name', label: 'Name' },
            { type: 'text', path: 'email', label: 'Email', hide: 'name !== "Ada"' },
          ],
        },
      ],
      validations: { 'people.*.name': [{ type: 'required' }] },
    })
    const { wrapper, a, b } = mountTwo(
      { definition: definition(), model: { people: [{ name: 'Ada' }, { name: '' }] } },
      { definition: definition(), model: { people: [{ name: 'Bob' }] } },
    )

    expect(a.el.findAll('[data-path$=".name"]')).toHaveLength(2)
    expect(b.el.findAll('[data-path$=".name"]')).toHaveLength(1)
    expect(a.el.find('[data-path="people.0.email"]').exists()).toBe(true)
    expect(b.el.find('[data-path="people.0.email"]').exists()).toBe(false)

    a.engine.removeRepeatItem('people', 0)
    await wrapper.vm.$nextTick()

    expect(a.engine.getValue('people')).toEqual([{ name: '', email: undefined }])
    expect(b.engine.getValue('people.0.name')).toBe('Bob')
    expect(b.el.findAll('[data-path$=".name"]')).toHaveLength(1)
    wrapper.unmount()
  })

  it('localise each form in its own language', async () => {
    const definition = (): FormDefinition => ({
      components: [{ type: 'text', path: 'person.name', label: 'name' }],
      localisations: { default: 'en', en: { name: 'Name' }, nl: { name: 'Naam' } },
    })
    const { wrapper, a, b } = mountTwo(
      { definition: definition(), locale: 'nl' },
      { definition: definition(), locale: 'en' },
    )

    expect(a.el.find('.label').text()).toBe('Naam')
    expect(b.el.find('.label').text()).toBe('Name')
    wrapper.unmount()
  })

  it('use field types passed to one form only in that form', async () => {
    const Fancy = defineComponent({
      props: ['field'],
      setup: () => () => h('div', { class: 'fancy' }),
    })
    const definition = (): FormDefinition => ({
      components: [{ type: 'fancy', path: 'person.name' }],
    })
    const { wrapper, a, b } = mountTwo(
      { definition: definition(), fields: { fancy: { type: 'fancy', component: Fancy } } },
      { definition: definition() },
    )

    expect(a.el.find('.fancy').exists()).toBe(true)
    expect(b.el.find('.fancy').exists()).toBe(false)
    wrapper.unmount()
  })

  it('use validators passed to one form only in that form', async () => {
    const definition = (): FormDefinition => ({
      components: [{ type: 'text', path: 'person.name' }],
      validations: { 'person.name': [{ type: 'neverValid' }] },
    })
    const { wrapper, a, b } = mountTwo(
      {
        definition: definition(),
        validators: { neverValid: () => ({ valid: false }) },
      },
      { definition: definition() },
    )

    expect(await a.engine.submit()).toBe(false)
    expect(a.engine.getErrors()).toMatchObject([
      { path: 'person.name', message: "This value isn't valid. Please check it." },
    ])
    // An unknown rule type is skipped, so the other form stays valid.
    expect(await b.engine.submit()).toBe(true)
    wrapper.unmount()
  })

  it('give fields with the same path different ids', async () => {
    const { wrapper, a, b } = mountTwo({ definition: personForm() })

    const idA = a.el.get('[data-path="person.name"] input').attributes('id')
    const idB = b.el.get('[data-path="person.name"] input').attributes('id')
    expect(idA).toBeTruthy()
    expect(idA).not.toBe(idB)
    expect(a.el.get('[data-path="person.name"] label').attributes('for')).toBe(idA)
    expect(document.querySelectorAll(`[id="${idA}"]`)).toHaveLength(1)
    wrapper.unmount()
  })

  it("link each form's error summary to that form's own field", async () => {
    const { wrapper, a, b } = mountTwo({ definition: personForm() })

    a.engine.submit()
    b.engine.submit()

    const targetA = a.engine.getErrors()[0]!.target
    const targetB = b.engine.getErrors()[0]!.target
    expect(targetA).toBe(a.el.get('[data-path="person.name"] input').attributes('id'))
    expect(targetB).toBe(b.el.get('[data-path="person.name"] input').attributes('id'))
    expect(targetA).not.toBe(targetB)
    wrapper.unmount()
  })
})
