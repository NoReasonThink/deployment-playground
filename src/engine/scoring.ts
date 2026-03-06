import type { ActiveEvent, PlaygroundNode, ScenarioScoreWeights, SimulationMetrics } from '../types'

export interface ScoreBreakdown {
  performance: number
  stability: number
  cost: number
  recoverability: number
  security: number
}

export interface ScoreCard {
  total: number
  star: 1 | 2 | 3 | 4 | 5
  grade: 'D' | 'C' | 'B' | 'A' | 'S'
  breakdown: ScoreBreakdown
  estimatedCost: number
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function round(value: number, precision = 1) {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

function estimateCost(nodes: PlaygroundNode[]) {
  if (nodes.length === 0) {
    return 0
  }
  const total = nodes.reduce((sum, node) => {
    const replicas = Math.max(1, node.data.replicas)
    const cpuCost = node.data.cpu * 0.09
    const memCost = node.data.memory * 0.07
    const bwCost = node.data.bandwidthMbps * 0.005
    const queueCost = Math.max(0, node.data.queueDepth - 20) * 0.02
    return sum + (cpuCost + memCost + bwCost + queueCost) * replicas
  }, 0)
  return round(total, 2)
}

function toStar(total: number): 1 | 2 | 3 | 4 | 5 {
  if (total >= 90) {
    return 5
  }
  if (total >= 80) {
    return 4
  }
  if (total >= 68) {
    return 3
  }
  if (total >= 55) {
    return 2
  }
  return 1
}

function toGrade(total: number): 'D' | 'C' | 'B' | 'A' | 'S' {
  if (total >= 90) {
    return 'S'
  }
  if (total >= 80) {
    return 'A'
  }
  if (total >= 68) {
    return 'B'
  }
  if (total >= 55) {
    return 'C'
  }
  return 'D'
}

export function computeScoreCard(
  nodes: PlaygroundNode[],
  metrics: SimulationMetrics,
  activeEvents: ActiveEvent[],
  weights: ScenarioScoreWeights,
): ScoreCard {
  const weightSum =
    weights.performance + weights.stability + weights.cost + weights.recoverability + weights.security
  const normalized =
    weightSum > 0
      ? {
          performance: weights.performance / weightSum,
          stability: weights.stability / weightSum,
          cost: weights.cost / weightSum,
          recoverability: weights.recoverability / weightSum,
          security: weights.security / weightSum,
        }
      : {
          performance: 0.3,
          stability: 0.27,
          cost: 0.16,
          recoverability: 0.15,
          security: 0.12,
        }
  const estimatedCost = estimateCost(nodes)
  const avgUtilization =
    nodes.length > 0 ? nodes.reduce((sum, node) => sum + node.data.utilization, 0) / nodes.length : 0
  const openCircuits = nodes.filter((node) => node.data.circuitOpen).length
  const avgFailover = nodes.length > 0 ? nodes.reduce((sum, node) => sum + node.data.failoverRate, 0) / nodes.length : 0
  const hasSecurityMesh = nodes.some((node) => node.data.kind === 'waf' || node.data.kind === 'iam')
  const securityEvents = activeEvents.filter((event) => event.category === 'security').length

  const performance = clamp(
    100
      - Math.max(0, metrics.p95LatencyMs - 90) * 0.24
      - Math.max(0, metrics.p99LatencyMs - 160) * 0.17
      - Math.abs(metrics.qps) / 16000,
  )
  const stability = clamp(
    100
      - metrics.errorRate * 3.8
      - Math.max(0, 99.95 - metrics.availability) * 12
      - Math.max(0, avgUtilization - 0.85) * 60
      - openCircuits * 4,
  )
  const cost = clamp(
    100 - estimatedCost * 0.18 - Math.max(0, avgUtilization - 1) * 28,
  )
  const recoverability = clamp(
    100
      - openCircuits * 9
      - avgFailover * 0.65
      - activeEvents.length * 1.6
      + Math.min(10, nodes.filter((node) => node.data.replicas > 1).length * 1.1),
  )
  const security = clamp(
    100
      - securityEvents * 8
      - metrics.errorRate * 1.4
      + (hasSecurityMesh ? 8 : -8),
  )

  const total = round(
    performance * normalized.performance +
      stability * normalized.stability +
      cost * normalized.cost +
      recoverability * normalized.recoverability +
      security * normalized.security,
  )
  return {
    total,
    star: toStar(total),
    grade: toGrade(total),
    breakdown: {
      performance: round(performance),
      stability: round(stability),
      cost: round(cost),
      recoverability: round(recoverability),
      security: round(security),
    },
    estimatedCost,
  }
}
