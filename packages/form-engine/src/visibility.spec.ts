import { describe, expect, it } from 'vitest'

import { FormEngine } from './FormEngine'
import type { FormDefinition } from './types'

// A field the user can't see can't be fixed, so its rules must not block the form.
describe('validation of hidden fields', () => {
  const contact: FormDefinition = {
    components: [
      { type: 'checkbox', path: 'wantsCall' },
      { type: 'text', path: 'phone', hide: 'wantsCall !== true' },
    ],
    validations: { phone: [{ type: 'required' }] },
  }

  it('skips the rules of a hidden field', () => {
    const engine = new FormEngine(contact)
    expect(engine.isHidden('phone')).toBe(true)
    expect(engine.validateModel()).toBe(true)
    expect(engine.validatePath('phone').valid).toBe(true)
  })

  it('applies them again once the field is shown', () => {
    const engine = new FormEngine(contact)
    engine.setValue('wantsCall', true)
    expect(engine.isHidden('phone')).toBe(false)
    expect(engine.validateModel()).toBe(false)
    expect(engine.getValidationResult('phone')?.valid).toBe(false)
  })

  it('drops an error once its field is hidden, without validating again', () => {
    const engine = new FormEngine(contact, { wantsCall: true })
    engine.validateModel()
    expect(engine.getValidationResult('phone')?.valid).toBe(false)

    engine.setValue('wantsCall', false)
    expect(engine.getValidationResult('phone')).toEqual({ valid: true })
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
      validations: { vatNumber: [{ type: 'required' }] },
    })
    expect(engine.validateModel()).toBe(true)
    engine.setValue('company', true)
    expect(engine.validateModel()).toBe(false)
  })

  it('treats a value inside a field (address.street) like the field itself', () => {
    const engine = new FormEngine({
      components: [
        { type: 'checkbox', path: 'abroad' },
        { type: 'address', path: 'address', hide: 'abroad' },
      ],
      validations: { 'address.street': [{ type: 'required' }] },
    })
    engine.setValue('abroad', true)
    expect(engine.validateModel()).toBe(true)
  })

  it('keeps validating paths that no field renders', () => {
    const engine = new FormEngine({
      components: [],
      validations: { termsAccepted: [{ type: 'required' }] },
    })
    expect(engine.isHidden('termsAccepted')).toBe(false)
    expect(engine.validateModel()).toBe(false)
  })

  it('validates a path while any field that shows it is visible', () => {
    const engine = new FormEngine({
      components: [
        { type: 'text', path: 'email', hide: true },
        { type: 'text', path: 'email' },
      ],
      validations: { email: [{ type: 'required' }] },
    })
    expect(engine.isHidden('email')).toBe(false)
    expect(engine.validateModel()).toBe(false)
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
      const engine = new FormEngine(orders, structuredClone(model))
      expect(engine.isHidden('items.0.reason')).toBe(true)
      expect(engine.isHidden('items.1.reason')).toBe(false)
      expect(engine.validateModel()).toBe(false)
      expect(engine.getValidationResult('items.0.reason')).toEqual({ valid: true })
      expect(engine.getValidationResult('items.1.reason')?.valid).toBe(false)
    })

    it('hides every row when the repeat itself is hidden', () => {
      const engine = new FormEngine(orders, { ...structuredClone(model), hasOrders: false })
      expect(engine.isHidden('items.1.reason')).toBe(true)
      expect(engine.validateModel()).toBe(true)
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
          groups: [
            { open: false, members: [{}] },
            { open: true, members: [{}] },
          ],
        },
      )
      expect(engine.isHidden('groups.0.members.0.name')).toBe(true)
      expect(engine.isHidden('groups.1.members.0.name')).toBe(false)
    })
  })
})
