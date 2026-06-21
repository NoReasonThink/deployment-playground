import { describe, expect, it } from 'vitest'
import { paletteItems } from '../data/catalog'
import { componentIconMeta } from './componentIconMeta'

describe('componentIconMeta', () => {
  it('covers every palette component kind', () => {
    const missing = paletteItems
      .map((item) => item.kind)
      .filter((kind) => !componentIconMeta[kind])

    expect(missing).toEqual([])
  })

  it('provides accessible labels for each component icon', () => {
    for (const item of paletteItems) {
      expect(componentIconMeta[item.kind].label).toBe(item.label)
    }
  })
})
