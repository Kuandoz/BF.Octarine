import { describe, expect, it } from 'vitest'

import { FormEngine } from './FormEngine'
import type { FormDefinition } from './types'

// What a field marks as required must match what validation will demand.
describe('isRequired', () => {
  const definition: FormDefinition = {
    components: [
      { type: 'text', path: 'name' },
      { type: 'checkbox', path: 'company' },
      { type: 'text', path: 'vatNumber' },
      { type: 'text', path: 'nickname' },
    ],
    validations: {
      name: [{ type: 'required' }],
      vatNumber: [{ type: 'required', condition: 'company === true' }],
      nickname: [{ type: 'maxLength', value: 20 }],
    },
  }

  it('is true for an unconditional required rule', async () => {
    expect(new FormEngine(definition).isRequired('name')).toBe(true)
  })

  it('is false without a required rule', async () => {
    const engine = new FormEngine(definition)
    expect(engine.isRequired('nickname')).toBe(false)
    expect(engine.isRequired('unknown')).toBe(false)
  })

  it("follows a required rule's condition", async () => {
    const engine = new FormEngine(definition)
    expect(engine.isRequired('vatNumber')).toBe(false)
    engine.setValue('company', true)
    expect(engine.isRequired('vatNumber')).toBe(true)
  })

  it('stays required when the condition throws, like validation does', async () => {
    const engine = new FormEngine({
      components: [],
      validations: { code: [{ type: 'required', condition: 'missing.deeply.nested' }] },
    })
    expect(engine.isRequired('code')).toBe(true)
    expect(engine.validateModel()).toBe(false)
  })

  it("evaluates a row's condition against that row", async () => {
    const engine = new FormEngine(
      {
        components: [
          {
            type: 'repeat',
            path: 'items',
            components: [
              { type: 'text', path: 'kind' },
              { type: 'text', path: 'reason' },
            ],
          },
        ],
        validations: { 'items.*.reason': [{ type: 'required', condition: "kind === 'other'" }] },
      },
      { model: { items: [{ kind: 'book' }, { kind: 'other' }] } },
    )
    expect(engine.isRequired('items.0.reason')).toBe(false)
    expect(engine.isRequired('items.1.reason')).toBe(true)
  })
})

// A rule's condition sees the same `env` as hide/disabled/readonly.
describe('rule conditions and env', () => {
  const definition = (): FormDefinition => ({
    components: [{ type: 'text', path: 'vatNumber', hide: "env.language !== 'fr'" }],
    validations: {
      vatNumber: [{ type: 'required', condition: "env.language === 'fr'" }],
    },
  })

  it('is required and validated when the condition on env holds', async () => {
    const engine = new FormEngine(definition(), { model: {}, locale: 'fr' })
    expect(engine.isHidden('vatNumber')).toBe(false)
    expect(engine.isRequired('vatNumber')).toBe(true)
    expect(await engine.submit()).toBe(false)
  })

  it('is not required when it does not', async () => {
    const engine = new FormEngine(definition(), { model: {}, locale: 'nl' })
    expect(engine.isRequired('vatNumber')).toBe(false)
  })
})
