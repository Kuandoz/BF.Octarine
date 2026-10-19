// @vitest-environment jsdom
import { defineComponent, h, nextTick, reactive } from 'vue'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { FormEngine } from '../FormEngine'
import type { FieldDefinition, FormDefinition } from '../types'
import { type Field, useField, type UseFieldOptions } from './useField'
import { FORM_ENGINE_KEY } from './useFormEngine'
import { REPEAT_CONTEXT_KEY } from './useRepeatContext'

// Mounts a component that calls useField, and hands back what it returned.
function setup(
  engine: FormEngine,
  field: FieldDefinition | (() => FieldDefinition),
  { options, provide = {} }: { options?: UseFieldOptions; provide?: Record<symbol, unknown> } = {},
) {
  let result!: Field<unknown>
  const Probe = defineComponent({
    setup() {
      result = useField(field, options)
      return () => h('input', { id: result.id })
    },
  })
  const wrapper = mount(Probe, {
    global: { provide: { [FORM_ENGINE_KEY as symbol]: engine, ...provide } },
  })
  return { wrapper, field: result }
}

const definition: FormDefinition = {
  components: [{ type: 'text', path: 'firstName', label: 'firstName' }],
  validations: { firstName: [{ type: 'required', condition: 'mustName === true' }] },
  constants: { country: 'BE' },
  localisations: { default: 'en', en: { firstName: 'First name', hint: 'As on your id' } },
}

describe('useField', () => {
  it('reads and writes the value at its path', () => {
    const engine = new FormEngine(definition, { model: { firstName: 'Ada' } })
    const { field } = setup(engine, { type: 'text', path: 'firstName' })
    expect(field.path.value).toBe('firstName')
    expect(field.value.value).toBe('Ada')
    field.value.value = 'Grace'
    expect(engine.getValue('firstName')).toBe('Grace')
  })

  it('resolves its path against the row it is in', () => {
    const engine = new FormEngine(definition, { model: { items: [{}, { title: 'b' }] } })
    const { field } = setup(
      engine,
      { type: 'text', path: 'title' },
      { provide: { [REPEAT_CONTEXT_KEY as symbol]: { arrayPath: 'items', arrayIndex: 1 } } },
    )
    expect(field.path.value).toBe('items.1.title')
    expect(field.value.value).toBe('b')
  })

  it('localises the label and the hint', () => {
    const engine = new FormEngine(definition)
    const { field } = setup(engine, {
      type: 'text',
      path: 'firstName',
      label: 'firstName',
      hint: 'hint',
    })
    expect(field.label.value).toBe('First name')
    expect(field.hint.value).toBe('As on your id')
    const bare = setup(engine, { type: 'text', path: 'other' }).field
    expect(bare.label.value).toBe('')
    expect(bare.hint.value).toBeUndefined()
  })

  it('follows required-if conditions', () => {
    const engine = new FormEngine(definition, { model: { mustName: false } })
    const { field } = setup(engine, { type: 'text', path: 'firstName' })
    expect(field.required.value).toBe(false)
    engine.setValue('mustName', true)
    expect(field.required.value).toBe(true)
  })

  it('evaluates disabled and readonly as conditions, and disables a constant', () => {
    const engine = new FormEngine(definition, { model: { locked: false } })
    const conditional = setup(engine, {
      type: 'text',
      path: 'firstName',
      disabled: 'locked === true',
      readonly: 'locked === true',
    }).field
    expect(conditional.disabled.value).toBe(false)
    expect(conditional.readonly.value).toBe(false)
    engine.setValue('locked', true)
    expect(conditional.disabled.value).toBe(true)
    expect(conditional.readonly.value).toBe(true)

    expect(setup(engine, { type: 'text', path: 'country' }).field.disabled.value).toBe(true)
  })

  it('shows its error once left', () => {
    const engine = new FormEngine(definition, { model: { mustName: true } })
    const { field } = setup(engine, { type: 'text', path: 'firstName' })
    expect(field.error.value).toBeUndefined()
    field.onBlur()
    expect(engine.isTouched('firstName')).toBe(true)
    expect(field.error.value).toBe('Please fill in this field.')
  })

  it("passes on only the field's own settings in attrs", () => {
    const engine = new FormEngine(definition)
    const { field } = setup(engine, {
      type: 'text',
      path: 'firstName',
      label: 'firstName',
      hint: 'hint',
      layout: { width: 'half' },
      labelBadge: 'new',
      hide: false,
      disabled: 'locked === true',
      readonly: false,
      components: [],
      maxLength: 10,
      options: ['a', 'b'],
    })
    expect(field.attrs.value).toEqual({ maxLength: 10, options: ['a', 'b'] })
  })

  it('follows changes to the field it is given as a getter', async () => {
    const engine = new FormEngine(definition)
    const live = reactive<FieldDefinition>({ type: 'text', path: 'firstName', label: 'Old' })
    const { field } = setup(engine, () => live)
    live.label = 'New'
    live.maxLength = 5
    await nextTick()
    expect(field.label.value).toBe('New')
    expect(field.attrs.value).toEqual({ maxLength: 5 })
  })

  describe('id', () => {
    it('is unique per mounted field and registered with the engine', async () => {
      const engine = new FormEngine(definition)
      const ids: string[] = []
      const Probe = defineComponent({
        setup() {
          const { id } = useField({ type: 'text', path: 'firstName' })
          ids.push(id)
          return () => h('input', { id })
        },
      })
      const show = reactive({ first: true, second: true })
      const wrapper = mount(
        () => [
          show.first ? h(Probe, { key: 'a' }) : null,
          show.second ? h(Probe, { key: 'b' }) : null,
        ],
        { global: { provide: { [FORM_ENGINE_KEY as symbol]: engine } } },
      )
      const [first, second] = ids
      expect(first).toBeTruthy()
      expect(first).not.toBe(second)
      expect(wrapper.findAll('input').map((input) => input.attributes('id'))).toEqual(ids)
      expect(engine.getFieldId('firstName')).toBe(first)

      show.first = false
      await nextTick()
      expect(engine.getFieldId('firstName')).toBe(second)
      show.second = false
      await nextTick()
      expect(engine.getFieldId('firstName')).toBeUndefined()
    })

    it('unregisters one id at a time, also when two apps hand out the same id', () => {
      const engine = new FormEngine(definition)
      const a = setup(engine, { type: 'text', path: 'firstName' })
      const b = setup(engine, { type: 'text', path: 'firstName' })
      a.wrapper.unmount()
      expect(engine.getFieldId('firstName')).toBe(b.field.id)
    })

    it('moves with its path', async () => {
      const engine = new FormEngine(definition)
      const live = reactive<FieldDefinition>({ type: 'text', path: 'firstName' })
      const { field } = setup(engine, () => live)
      live.path = 'lastName'
      await nextTick()
      expect(engine.getFieldId('firstName')).toBeUndefined()
      expect(engine.getFieldId('lastName')).toBe(field.id)
    })

    it('is not registered for a group that has no control of its own', () => {
      const engine = new FormEngine(definition)
      setup(engine, { type: 'fieldset', path: 'address' }, { options: { target: false } })
      expect(engine.getFieldId('address')).toBeUndefined()
    })
  })
})
