import { describe, expect, it } from 'vitest'
import { applyCircuitBreaker, applyFailover, applyRateLimiter } from './policies'

describe('policy executors', () => {
  it('限流策略在高负载下削减流量', () => {
    const result = applyRateLimiter('rate-limiter', 1.2, 12000)

    expect(result.throttledRate).toBeGreaterThan(0)
    expect(result.allowedQps).toBeLessThan(12000)
  })

  it('熔断策略在高压下开启熔断并增加退避', () => {
    const result = applyCircuitBreaker('circuit-breaker', 1.4, 25, 12)

    expect(result.circuitOpen).toBe(true)
    expect(result.degradedRate).toBeGreaterThan(0)
    expect(result.retryBackoffMs).toBeGreaterThan(200)
  })

  it('故障转移策略在熔断时提高切流比例', () => {
    const failover = applyFailover('load-balancer', true, 60)
    const calm = applyFailover('load-balancer', false, 8)

    expect(failover.failoverRate).toBeGreaterThan(calm.failoverRate)
    expect(failover.failoverRate).toBeGreaterThan(0)
  })
})

