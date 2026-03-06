import { describe, expect, it } from 'vitest'
import { buildNodeData } from '../data/catalog'
import type { ActiveEvent, PlaygroundNode, ScenarioScoreWeights, SimulationMetrics } from '../types'
import { computeScoreCard } from './scoring'

function makeNode(id: string, kind: PlaygroundNode['data']['kind'], patch: Partial<PlaygroundNode['data']> = {}): PlaygroundNode {
  return {
    id,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      ...buildNodeData(kind),
      ...patch,
    },
  }
}

const baseMetrics: SimulationMetrics = {
  qps: 2800,
  p95LatencyMs: 72,
  p99LatencyMs: 120,
  errorRate: 0.25,
  availability: 99.98,
}

const defaultWeights: ScenarioScoreWeights = {
  performance: 0.32,
  stability: 0.28,
  cost: 0.16,
  recoverability: 0.14,
  security: 0.1,
}

describe('computeScoreCard', () => {
  it('在健康拓扑下给出较高评分', () => {
    const nodes = [
      makeNode('waf-1', 'waf', { utilization: 0.56, cpu: 30, memory: 38, bandwidthMbps: 180, replicas: 2 }),
      makeNode('web-1', 'web', { utilization: 0.62, cpu: 42, memory: 46, bandwidthMbps: 240, replicas: 2 }),
      makeNode('db-1', 'database', { utilization: 0.58, cpu: 48, memory: 52, bandwidthMbps: 160, replicas: 2 }),
    ]
    const result = computeScoreCard(nodes, baseMetrics, [], defaultWeights)

    expect(result.total).toBeGreaterThan(75)
    expect(result.grade === 'A' || result.grade === 'S' || result.grade === 'B').toBe(true)
    expect(result.star).toBeGreaterThanOrEqual(3)
    expect(result.estimatedCost).toBeGreaterThan(0)
  })

  it('在高错误率与安全事件下拉低稳定性与安全性', () => {
    const nodes = [
      makeNode('svc-1', 'service', { utilization: 0.97, cpu: 94, memory: 90, circuitOpen: true, failoverRate: 32 }),
      makeNode('db-1', 'database', { utilization: 0.96, cpu: 92, memory: 89, replicas: 1 }),
    ]
    const metrics: SimulationMetrics = {
      qps: 5200,
      p95LatencyMs: 260,
      p99LatencyMs: 480,
      errorRate: 7.5,
      availability: 98.7,
    }
    const events: ActiveEvent[] = [
      {
        id: 'sec-1',
        name: '鉴权故障',
        category: 'security',
        description: 'auth issue',
        qpsMultiplier: 1,
        capacityMultiplier: 0.8,
        latencyDeltaMs: 30,
        durationTicks: 5,
        instanceId: 'sec-1-1',
        remainingTicks: 3,
        startedAt: 1,
      },
      {
        id: 'sec-2',
        name: 'WAF 误杀',
        category: 'security',
        description: 'waf false positive',
        qpsMultiplier: 1,
        capacityMultiplier: 0.85,
        latencyDeltaMs: 20,
        durationTicks: 4,
        instanceId: 'sec-2-1',
        remainingTicks: 2,
        startedAt: 1,
      },
    ]
    const result = computeScoreCard(nodes, metrics, events, defaultWeights)

    expect(result.total).toBeLessThan(60)
    expect(result.breakdown.stability).toBeLessThan(70)
    expect(result.breakdown.security).toBeLessThan(70)
    expect(result.grade === 'C' || result.grade === 'D').toBe(true)
  })

  it('当权重和为 0 时使用默认权重而非报错', () => {
    const nodes = [makeNode('web-1', 'web', { utilization: 0.4, cpu: 28, memory: 32, bandwidthMbps: 110 })]
    const weights: ScenarioScoreWeights = {
      performance: 0,
      stability: 0,
      cost: 0,
      recoverability: 0,
      security: 0,
    }

    const result = computeScoreCard(nodes, baseMetrics, [], weights)

    expect(result.total).toBeGreaterThan(0)
    expect(result.total).toBeLessThanOrEqual(100)
    expect(result.star).toBeGreaterThanOrEqual(1)
    expect(result.star).toBeLessThanOrEqual(5)
  })
})
