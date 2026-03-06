import type { NodeKind } from '../types'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function computeLifecycle(utilization: number, baseLatencyMs: number, kind: NodeKind) {
  const retryWeight =
    kind === 'service' || kind === 'web' || kind === 'api-gateway' || kind === 'database' ? 1 : 0.7
  const retriesPerMin = clamp((utilization ** 1.5) * retryWeight * 24, 0, 420)
  const timeoutRate = clamp((utilization - 0.82) * 24 + baseLatencyMs / 90, 0, 78)
  const failureRate = clamp(timeoutRate * 0.55 + retriesPerMin / 16, 0, 92)
  const successRate = clamp(100 - failureRate, 8, 100)
  return {
    retriesPerMin,
    timeoutRate,
    failureRate,
    successRate,
  }
}

export function computeResources(
  nodeQps: number,
  utilization: number,
  baseLatencyMs: number,
  kind: NodeKind,
) {
  const cpu = clamp(utilization * 82 + baseLatencyMs * 0.18, 1, 100)
  const memory = clamp(20 + utilization * 58 + baseLatencyMs * 0.12, 8, 100)
  const bandwidthMbps = clamp(nodeQps * 0.032, 0, 100000)
  const iopsFactor = kind === 'database' || kind === 'search' ? 0.25 : kind === 'redis' ? 0.18 : 0.08
  const iops = clamp(nodeQps * iopsFactor, 0, 150000)
  const queueDepth = clamp(Math.max(0, utilization - 0.9) * 140 + nodeQps / 95, 0, 9000)
  const poolUtilization = clamp(utilization * 100 + baseLatencyMs * 0.2, 0, 100)
  return {
    cpu,
    memory,
    bandwidthMbps,
    iops,
    queueDepth,
    poolUtilization,
  }
}

export function computeDomainMetrics(
  kind: NodeKind,
  utilization: number,
  queueDepth: number,
  baseLatencyMs: number,
  nodeQps: number,
) {
  const cacheHitRate =
    kind === 'redis' || kind === 'object-storage' ? clamp(99 - utilization * 18 - baseLatencyMs * 0.12, 45, 99.9) : 0
  const evictionRisk = kind === 'redis' ? clamp((utilization - 0.75) * 130, 0, 100) : 0
  const replicaLagMs = kind === 'database' ? clamp(utilization * 95 + queueDepth * 0.5, 0, 1500) : 0
  const consistencyWindowMs = kind === 'database' ? clamp(replicaLagMs * 0.65, 0, 1200) : 0
  const backlog = kind === 'mq' ? clamp(queueDepth * 3.4 + nodeQps * 0.22, 0, 150000) : 0
  const rebalanceRisk = kind === 'mq' ? clamp((utilization - 0.8) * 120, 0, 100) : 0
  const indexingLagMs = kind === 'search' ? clamp(utilization * 160 + queueDepth * 0.85, 0, 3000) : 0
  const shardLoad = kind === 'search' ? clamp(utilization * 100 + queueDepth * 0.06, 0, 100) : 0
  return {
    cacheHitRate,
    evictionRisk,
    replicaLagMs,
    consistencyWindowMs,
    backlog,
    rebalanceRisk,
    indexingLagMs,
    shardLoad,
  }
}
