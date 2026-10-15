import { describe, expect, it } from 'vitest'

import { widthBasis } from './layout'

describe('widthBasis', () => {
  it('returns a flex-basis calc string that leaves room for the row gap', () => {
    expect(widthBasis(undefined)).toBe('100%')
    expect(widthBasis('half')).toBe('calc(50% - 0.5rem)')
    expect(widthBasis('third')).toBe('calc(33.3333% - 0.6667rem)')
  })
})
