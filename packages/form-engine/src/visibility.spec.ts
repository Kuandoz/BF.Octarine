import { describe, expect, it } from 'vitest'

import { FormEngine } from './FormEngine'
import type { FormDefinition } from './types'

// A hidden field is validated like any other, so a value can't slip through
// by hiding its field (a tampered submission, or a value set behind the
// scenes). A form that asks for a value only while its field is shown says so
// with a rule condition; hide and required stay independent.
describe('validation of hidden fields', () => {
  const contact: FormDefinition = {
    components: [
      { type: 'checkbox', path: 'wantsCall' },
      { type: 'text', path: 'phone', hide: 'wantsCall !== true' },
    ],
    validations: { phone: [{ type: 'required' }, { type: 'phone' }] },
  }

  it('applies the rules of a hidden field', () => {
    const engine = new FormEngine(contact)
    expect(engine.isHidden('phone')).toBe(true)
    expect(engine.validateModel()).toBe(false)
    expect(engine.getValidationResult('phone')?.valid).toBe(false)
  })

  it('rejects an invalid value in a hidden field', () => {
    const engine = new FormEngine(contact, { model: { wantsCall: false, phone: 'not a number' } })
    expect(engine.validateModel()).toBe(false)
  })

  it('keeps an error when its field is hidden', () => {
    const engine = new FormEngine(contact, { model: { wantsCall: true } })
    engine.validateModel()
    engine.setValue('wantsCall', false)
    expect(engine.getValidationResult('phone')?.valid).toBe(false)
  })

  it('asks for a value only while shown when the rule has a matching condition', () => {
    const engine = new FormEngine({
      ...contact,
      validations: {
        phone: [{ type: 'required', condition: 'wantsCall === true' }, { type: 'phone' }],
      },
    })
    expect(engine.validateModel()).toBe(true)
    engine.setValue('wantsCall', true)
    expect(engine.validateModel()).toBe(false)
  })
})

describe('isHidden', () => {
  it("follows a field's own hide", () => {
    const engine = new FormEngine({
      components: [
        { type: 'checkbox', path: 'wantsCall' },
        { type: 'text', path: 'phone', hide: 'wantsCall !== true' },
      ],
    })
    expect(engine.isHidden('phone')).toBe(true)
    engine.setValue('wantsCall', true)
    expect(engine.isHidden('phone')).toBe(false)
  })

  it('hides every field inside a hidden container', () => {
    const engine = new FormEngine({
      components: [
        { type: 'checkbox', path: 'company' },
        {
          type: 'section',
          hide: '!company',
          components: [{ type: 'text', path: 'vatNumber' }],
        },
      ],
    })
    expect(engine.isHidden('vatNumber')).toBe(true)
    engine.setValue('company', true)
    expect(engine.isHidden('vatNumber')).toBe(false)
  })

  it('treats a value inside a field (address.street) like the field itself', () => {
    const engine = new FormEngine({
      components: [
        { type: 'checkbox', path: 'abroad' },
        { type: 'address', path: 'address', hide: 'abroad' },
      ],
    })
    engine.setValue('abroad', true)
    expect(engine.isHidden('address.street')).toBe(true)
  })

  it('is false for a path that no field renders', () => {
    const engine = new FormEngine({ components: [] })
    expect(engine.isHidden('termsAccepted')).toBe(false)
  })

  it('is false while any field that shows the path is visible', () => {
    const engine = new FormEngine({
      components: [
        { type: 'text', path: 'email', hide: true },
        { type: 'text', path: 'email' },
      ],
    })
    expect(engine.isHidden('email')).toBe(false)
  })

  describe('in repeated rows', () => {
    const orders: FormDefinition = {
      components: [
        { type: 'checkbox', path: 'hasOrders' },
        {
          type: 'repeat',
          path: 'items',
          hide: '!hasOrders',
          components: [
            { type: 'text', path: 'kind' },
            { type: 'text', path: 'reason', hide: "kind !== 'other'" },
          ],
        },
      ],
      validations: { 'items.*.reason': [{ type: 'required' }] },
    }
    const model = {
      hasOrders: true,
      items: [{ kind: 'book' }, { kind: 'other' }],
    }

    it("evaluates a row's hide against that row", () => {
      const engine = new FormEngine(orders, { model: structuredClone(model) })
      expect(engine.isHidden('items.0.reason')).toBe(true)
      expect(engine.isHidden('items.1.reason')).toBe(false)
    })

    it('hides every row when the repeat itself is hidden', () => {
      const engine = new FormEngine(orders, {
        model: { ...structuredClone(model), hasOrders: false },
      })
      expect(engine.isHidden('items.1.reason')).toBe(true)
    })

    it('evaluates an outer row condition inside a nested repeat', () => {
      const engine = new FormEngine(
        {
          components: [
            {
              type: 'repeat',
              path: 'groups',
              components: [
                { type: 'checkbox', path: 'open' },
                {
                  type: 'repeat',
                  path: 'members',
                  hide: '!open',
                  components: [{ type: 'text', path: 'name' }],
                },
              ],
            },
          ],
          validations: { 'groups.*.members.*.name': [{ type: 'required' }] },
        },
        {
          model: {
            groups: [
              { open: false, members: [{}] },
              { open: true, members: [{}] },
            ],
          },
        },
      )
      expect(engine.isHidden('groups.0.members.0.name')).toBe(true)
      expect(engine.isHidden('groups.1.members.0.name')).toBe(false)
    })
  })
})
