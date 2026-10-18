import { describe, expect, it } from 'vitest'

import { declareFieldKeys, resolveFieldPath } from './pathAccessors'
import type { FieldDefinition } from '@octarine/form-abstractions'

describe('resolveFieldPath', () => {
  it("returns the field's own path unchanged with no repeat context", () => {
    expect(resolveFieldPath('firstName')).toBe('firstName')
    expect(resolveFieldPath(undefined)).toBe('')
  })

  it("prefixes the field's path with the repeat row's path", () => {
    expect(resolveFieldPath('quantity', { arrayPath: 'items', arrayIndex: 2 })).toBe(
      'items.2.quantity',
    )
  })

  it("resolves to just the row's own path when the field has no path of its own", () => {
    expect(resolveFieldPath(undefined, { arrayPath: 'items', arrayIndex: 2 })).toBe('items.2')
  })

  it("folds a nested repeat's already-resolved arrayPath in, for repeats within repeats", () => {
    const innerContext = { arrayPath: 'parents.0.children', arrayIndex: 1 }
    expect(resolveFieldPath('name', innerContext)).toBe('parents.0.children.1.name')
  })
})

describe('declareFieldKeys', () => {
  it("declares a repeat field's own top-level key but not its components' paths", () => {
    const fields: FieldDefinition[] = [
      { type: 'repeat', path: 'items', components: [{ type: 'text', path: 'quantity' }] },
    ]
    const model: Record<string, unknown> = {}
    declareFieldKeys(fields, model)
    expect(model).toEqual({ items: undefined })
  })

  it("declares each existing item's own top-level keys, recursively", () => {
    const fields: FieldDefinition[] = [
      { type: 'repeat', path: 'items', components: [{ type: 'text', path: 'quantity' }] },
    ]
    const model: Record<string, unknown> = { items: [{ label: 'Widget' }] }
    declareFieldKeys(fields, model)
    expect(model.items).toEqual([{ label: 'Widget', quantity: undefined }])
  })

  it("declares nested repeat items' keys recursively for repeats within repeats", () => {
    const fields: FieldDefinition[] = [
      {
        type: 'repeat',
        path: 'parents',
        components: [
          {
            type: 'repeat',
            path: 'children',
            components: [{ type: 'text', path: 'name' }],
          },
        ],
      },
    ]
    const model: Record<string, unknown> = { parents: [{ children: [{}] }] }
    declareFieldKeys(fields, model)
    expect(model).toEqual({ parents: [{ children: [{ name: undefined }] }] })
  })

  it("does not declare keys for a not-yet-added item (that's the caller's job)", () => {
    const fields: FieldDefinition[] = [
      { type: 'repeat', path: 'items', components: [{ type: 'text', path: 'quantity' }] },
    ]
    const model: Record<string, unknown> = {}
    declareFieldKeys(fields, model)
    expect(model.items).toBeUndefined()
  })
})
