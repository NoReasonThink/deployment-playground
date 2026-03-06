import { describe, expect, it } from 'vitest'
import { computeAutoscalePlan } from './autoscale'

describe('computeAutoscalePlan', () => {
  it('在高负载下按步进扩容并给出预热系数', () => {
    const plan = computeAutoscalePlan('service', 1.35, 1200, 1)

    expect(plan.replicas).toBe(2)
    expect(plan.warmupFactor).toBeLessThan(1)
  })

  it('在低负载下逐步缩容且不低于 1 副本', () => {
    const plan = computeAutoscalePlan('web', 0.18, 10, 3)

    expect(plan.replicas).toBe(2)
    expect(plan.warmupFactor).toBe(1)
  })

  it('非可扩缩容节点使用固定副本与无预热衰减', () => {
    const plan = computeAutoscalePlan('database', 2, 8000, 4)

    expect(plan.replicas).toBe(1)
    expect(plan.warmupFactor).toBe(1)
  })
})

