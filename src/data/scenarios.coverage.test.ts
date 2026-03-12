import { describe, expect, it } from 'vitest'
import { scenarios } from './scenarios'

describe('scenario coverage', () => {
  it('至少提供 6 个可演练场景并覆盖关键领域', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(6)
    const ids = new Set(scenarios.map((item) => item.id))

    expect(ids.has('search-reco-hot-shard')).toBe(true)
    expect(ids.has('multi-region-dr')).toBe(true)
    expect(ids.has('release-governance-canary')).toBe(true)
    expect(ids.has('cost-optimization-sla')).toBe(true)
  })
})

