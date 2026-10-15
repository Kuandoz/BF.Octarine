import { describe, expect, it } from 'vitest'

import { fieldWidth } from './layout'

describe('fieldWidth', () => {
  it('reads layout.width', () => {
    expect(fieldWidth({ type: 'text', layout: { width: 'half' } })).toBe('half')
    expect(fieldWidth({ type: 'text', layout: { width: 'third' } })).toBe('third')
  })

  it('is full width without a layout or with an unknown width', () => {
    expect(fieldWidth({ type: 'text' })).toBe('full')
    expect(fieldWidth({ type: 'text', layout: { width: 'quarter' } })).toBe('full')
  })
})
