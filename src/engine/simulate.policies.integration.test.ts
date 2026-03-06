import { describe, expect, it } from 'vitest'
import { buildNodeData } from '../data/catalog'
import type { PlaygroundNode } from '../types'
import { simulateTick } from './simulate'

function createNode(id: string, kind: PlaygroundNode['data']['kind'], capacity: number): PlaygroundNode {
  return {
    id,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      ...buildNodeData(kind),
      label: id,
      capacity,
      replicas: 1,
    },
  }
}

describe('simulateTick with autoscale and policies', () => {
  it('在高压链路下触发扩容、限流与熔断退避', () => {
    const nodes: PlaygroundNode[] = [
      createNode('lb-1', 'load-balancer', 900),
      createNode('rl-1', 'rate-limiter', 700),
      createNode('cb-1', 'circuit-breaker', 650),
    ]
    const edges = [
      { id: 'e-1', source: 'lb-1', target: 'rl-1' },
      { id: 'e-2', source: 'rl-1', target: 'cb-1' },
    ]

    const result = simulateTick(nodes, edges, 'lb-1', 20000, [])
    const lb = result.nextNodes.find((node) => node.id === 'lb-1')!
    const limiter = result.nextNodes.find((node) => node.id === 'rl-1')!
    const breaker = result.nextNodes.find((node) => node.id === 'cb-1')!

    expect(lb.data.replicas).toBeGreaterThan(1)
    expect(limiter.data.throttledRate).toBeGreaterThan(0)
    expect(breaker.data.degradedRate).toBeGreaterThan(0)
    expect(breaker.data.retryBackoffMs).toBeGreaterThan(0)
  })
})

