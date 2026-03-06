import type { NodeKind } from '../types'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

const scalableKinds: NodeKind[] = [
  'web',
  'service',
  'api-gateway',
  'load-balancer',
  'service-mesh',
  'rate-limiter',
  'circuit-breaker',
]

export function computeAutoscalePlan(kind: NodeKind, utilization: number, queueDepth: number, currentReplicas: number) {
  if (!scalableKinds.includes(kind)) {
    return {
      replicas: 1,
      warmupFactor: 1,
    }
  }
  const desired = clamp(Math.ceil(utilization * 1.6 + queueDepth / 1200), 1, 8)
  const replicas = clamp(currentReplicas + Math.sign(desired - currentReplicas), 1, 8)
  const warmupFactor = desired > currentReplicas ? 0.88 : 1
  return {
    replicas,
    warmupFactor,
  }
}

