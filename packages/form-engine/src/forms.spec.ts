// @vitest-environment jsdom
import { defineComponent, h } from 'vue'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import FormRenderer from './components/FormRenderer.vue'
import FormRows from './components/FormRows.vue'
import { useField } from './composables/useField'
import { defineField } from './fields'
import { createForms, useForm, useForms } from './forms'
import type { FieldDefinition, FormDefinition } from './types'

const TextField = defineComponent({
  props: { field: { type: Object, required: true } },
  setup(props) {
    const { path, value, label } = useField<string>(() => props.field as FieldDefinition)
    return () =>
      h('label', { 'data-path': path.value }, [label.value, h('input', { value: value.value })])
  },
})
const textField = defineField({
  type: 'text',
  component: TextField,
  schema: { properties: { maxLength: { type: 'integer' } } },
})

describe('createForms', () => {
  it('gives every form its field types, validators and functions', async () => {
    const forms = createForms({
      fields: [textField],
      validators: { even: ({ value }) => ({ valid: Number(value) % 2 === 0, key: 'even' }) },
      functions: { double: (value) => Number(value) * 2 },
      translate: (key) => `t:${key}`,
    })
    const engine = forms.createEngine(
      {
        components: [{ type: 'text', path: 'n' }],
        validations: { n: [{ type: 'even' }] },
      },
      { model: { n: 3 } },
    )
    expect(engine.getFieldType('text')).toBe(textField)
    expect(await engine.submit()).toBe(false)
    expect(engine.getError('n')).toBe('t:even')
    expect(engine.resolveCondition('double(n) === 6')).toBe(true)
    // age() stays available next to the app's own functions.
    expect(engine.resolveCondition("age('2000-01-01') > 18")).toBe(true)
  })

  it("adds a form's own validators to the app's", async () => {
    const forms = createForms({
      validators: { a: () => ({ valid: false, key: 'a' }) },
    })
    const engine = forms.createEngine(
      { components: [], validations: { x: [{ type: 'a' }], y: [{ type: 'b' }] } },
      { validators: { b: () => ({ valid: false, key: 'b' }) } },
    )
    engine.validateModel()
    expect(engine.getValidationResult('x')).toMatchObject({ key: 'a' })
    expect(engine.getValidationResult('y')).toMatchObject({ key: 'b' })
  })

  it("doesn't share anything between two setups", async () => {
    const one = createForms({ fields: [textField] })
    const other = createForms()
    expect(one.createEngine({ components: [] }).getFieldType('text')).toBe(textField)
    expect(other.createEngine({ components: [] }).getFieldType('text')).toBeUndefined()
  })

  it('is what useForms returns below app.use(forms)', async () => {
    const forms = createForms()
    let found: unknown
    mount(
      defineComponent({
        setup() {
          found = useForms()
          return () => null
        },
      }),
      { global: { plugins: [forms] } },
    )
    expect(found).toBe(forms)
  })
})

describe('defineField', () => {
  it('declares a field type with rows', async () => {
    const Travellers = defineComponent({
      props: { field: { type: Object, required: true } },
      setup: (props) => () => h('div', [h(FormRows, { field: props.field as FieldDefinition })]),
    })
    const forms = createForms({
      fields: [textField, defineField({ type: 'travellers', component: Travellers, rows: true })],
    })
    const definition: FormDefinition = {
      components: [
        {
          type: 'travellers',
          path: 'people',
          label: 'People',
          components: [{ type: 'text', path: 'name', label: 'Name' }],
        },
      ],
      validations: { 'people.*.name': [{ type: 'required' }] },
    }
    const wrapper = mount(FormRenderer, {
      props: { definition, model: { people: [{ name: 'Ada' }, {}] } },
      global: { plugins: [forms] },
    })
    expect(wrapper.findAll('[data-path]').map((field) => field.attributes('data-path'))).toEqual([
      'people.0.name',
      'people.1.name',
    ])
    const engine = (
      wrapper.vm as unknown as { engine: { submit(): boolean; getErrors(): unknown } }
    ).engine
    expect(await engine.submit()).toBe(false)
    // The row's field gives the error its label, as for a built-in repeat.
    expect(engine.getErrors()).toMatchObject([{ path: 'people.1.name', label: 'Name' }])
  })
})

describe('useForm', () => {
  it('works without an installed setup, with only the built-in rules', async () => {
    let errors: unknown
    mount(
      defineComponent({
        setup() {
          const form = useForm({ components: [], validations: { x: [{ type: 'required' }] } })
          form.value.submit()
          errors = form.value.getErrors()
          return () => null
        },
      }),
    )
    expect(errors).toMatchObject([{ path: 'x', message: 'Please fill in this field.' }])
  })
})
