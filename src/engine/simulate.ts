import type { Edge } from '@xyflow/react'
import type { ActiveEvent, PlaygroundNode, SimulationSnapshot } from '../types'
import { computeAutoscalePlan } from './autoscale'
import { resolveEventEffects } from './events'
import { computeDomainMetrics, computeLifecycle, computeResources } from './models'
import { applyCircuitBreaker, applyFailover, applyRateLimiter } from './policies'

function nodeColor(utilization: number) {
  if (utilization >= 1.2) {
    return { border: '#b91c1c', background: '#fee2e2' }
  }
  if (utilization >= 0.85) {
    return { border: '#b45309', background: '#fef3c7' }
  }
  return { border: '#15803d', background: '#dcfce7' }
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

export function simulateTick(
  nodes: PlaygroundNode[],
  edges: Edge[],
  sourceNodeId: string,
  fixedQps: number,
  activeEvents: ActiveEvent[] = [],
): { nextNodes: PlaygroundNode[]; snapshot: SimulationSnapshot } {
  const globalEffects = resolveEventEffects(activeEvents, 'service')
  const appliedQps = fixedQps * globalEffects.qpsMultiplier
  const qpsMap = new Map<string, number>()
  const outgoingMap = new Map<string, string[]>()

  for (const edge of edges) {
    if (!outgoingMap.has(edge.source)) {
      outgoingMap.set(edge.source, [])
    }
    outgoingMap.get(edge.source)!.push(edge.target)
  }

  const queue: Array<{ id: string; qps: number }> = [{ id: sourceNodeId, qps: appliedQps }]
  const visitCount = new Map<string, number>()

  while (queue.length > 0) {
    const current = queue.shift()!
    const visited = (visitCount.get(current.id) ?? 0) + 1
    visitCount.set(current.id, visited)
    if (visited > nodes.length * 2) {
      continue
    }
    qpsMap.set(current.id, (qpsMap.get(current.id) ?? 0) + current.qps)
    const targets = outgoingMap.get(current.id) ?? []
    if (targets.length === 0) {
      continue
    }
    const splitQps = current.qps / targets.length
    for (const target of targets) {
      queue.push({ id: target, qps: splitQps })
    }
  }

  const nextNodes = nodes.map((node) => {
    const effects = resolveEventEffects(activeEvents, node.data.kind)
    const nodeQps = qpsMap.get(node.id) ?? 0
    const preScaleCapacity = Math.max(1, node.data.capacity * effects.capacityMultiplier)
    const preScaleUtilization = preScaleCapacity > 0 ? nodeQps / preScaleCapacity : 0
    const preScaleResources = computeResources(
      nodeQps,
      preScaleUtilization,
      node.data.baseLatencyMs + effects.latencyDeltaMs,
      node.data.kind,
    )
    const autoscale = computeAutoscalePlan(
      node.data.kind,
      preScaleUtilization,
      preScaleResources.queueDepth,
      Math.max(1, node.data.replicas),
    )
    const effectiveCapacity = Math.max(1, preScaleCapacity * autoscale.replicas * autoscale.warmupFactor)
    const utilization = effectiveCapacity > 0 ? nodeQps / effectiveCapacity : 0
    const lifecycle = computeLifecycle(utilization, node.data.baseLatencyMs + effects.latencyDeltaMs, node.data.kind)
    const rateLimit = applyRateLimiter(node.data.kind, utilization, nodeQps)
    const circuit = applyCircuitBreaker(node.data.kind, utilization, lifecycle.timeoutRate, lifecycle.failureRate)
    const failover = applyFailover(node.data.kind, circuit.circuitOpen, circuit.degradedRate)
    const servedQps = rateLimit.allowedQps * (1 - circuit.degradedRate / 100)
    const servedUtilization = effectiveCapacity > 0 ? servedQps / effectiveCapacity : 0
    const servedLifecycle = computeLifecycle(
      servedUtilization,
      node.data.baseLatencyMs + effects.latencyDeltaMs + circuit.retryBackoffMs / 200,
      node.data.kind,
    )
    const resources = computeResources(
      servedQps,
      servedUtilization,
      node.data.baseLatencyMs + effects.latencyDeltaMs,
      node.data.kind,
    )
    const domainMetrics = computeDomainMetrics(
      node.data.kind,
      servedUtilization,
      resources.queueDepth,
      node.data.baseLatencyMs + effects.latencyDeltaMs,
      servedQps,
    )
    const status: PlaygroundNode['data']['status'] =
      servedUtilization >= 1.2 ? 'critical' : servedUtilization >= 0.85 ? 'warning' : 'healthy'
    const color = nodeColor(servedUtilization)
    return {
      ...node,
      data: {
        ...node.data,
        qps: round(servedQps),
        utilization: round(servedUtilization, 3),
        status,
        retriesPerMin: round(servedLifecycle.retriesPerMin),
        timeoutRate: round(servedLifecycle.timeoutRate, 2),
        failureRate: round(servedLifecycle.failureRate, 2),
        successRate: round(servedLifecycle.successRate, 2),
        cpu: round(resources.cpu, 2),
        memory: round(resources.memory, 2),
        bandwidthMbps: round(resources.bandwidthMbps, 1),
        iops: round(resources.iops, 1),
        queueDepth: round(resources.queueDepth, 1),
        poolUtilization: round(resources.poolUtilization, 2),
        cacheHitRate: round(domainMetrics.cacheHitRate, 2),
        evictionRisk: round(domainMetrics.evictionRisk, 2),
        replicaLagMs: round(domainMetrics.replicaLagMs, 2),
        consistencyWindowMs: round(domainMetrics.consistencyWindowMs, 2),
        backlog: round(domainMetrics.backlog, 1),
        rebalanceRisk: round(domainMetrics.rebalanceRisk, 2),
        indexingLagMs: round(domainMetrics.indexingLagMs, 2),
        shardLoad: round(domainMetrics.shardLoad, 2),
        replicas: autoscale.replicas,
        throttledRate: round(rateLimit.throttledRate, 2),
        degradedRate: round(circuit.degradedRate, 2),
        retryBackoffMs: round(circuit.retryBackoffMs, 0),
        failoverRate: round(failover.failoverRate, 2),
        circuitOpen: circuit.circuitOpen,
      },
      style: {
        border: `2px solid ${color.border}`,
        background: color.background,
        borderRadius: 12,
        padding: 8,
        minWidth: 170,
      },
    }
  })

  const utilizations = nextNodes.map((node) => node.data.utilization)
  const maxUtilization = utilizations.length ? Math.max(...utilizations) : 0
  const avgUtilization =
    utilizations.length > 0
      ? utilizations.reduce((sum, value) => sum + value, 0) / utilizations.length
      : 0
  const overloadedNodes = nextNodes.filter((node) => node.data.utilization > 1)
  const latencyPenalty = activeEvents.reduce((sum, event) => sum + event.latencyDeltaMs, 0)
  const avgBackoff =
    nextNodes.length > 0 ? nextNodes.reduce((sum, node) => sum + node.data.retryBackoffMs, 0) / nextNodes.length : 0
  const p95LatencyMs = round(55 + avgUtilization * 90 + maxUtilization * 80 + latencyPenalty + avgBackoff * 0.14)
  const p99LatencyMs = round(p95LatencyMs * 1.22 + overloadedNodes.length * 8)
  const errorRateRaw =
    nextNodes.length > 0
      ? nextNodes.reduce((sum, node) => sum + node.data.failureRate / 100, 0) / nextNodes.length
      : 0
  const errorRate = Math.min(0.42, Math.max(0, errorRateRaw))
  const availability = Math.max(0.95, 1 - errorRate * 1.6)
  const timeoutNodes = nextNodes.filter((node) => node.data.timeoutRate > 12)
  const bottlenecks = [...new Set(
    [...overloadedNodes, ...timeoutNodes]
      .sort((a, b) => b.data.utilization + b.data.timeoutRate / 100 - (a.data.utilization + a.data.timeoutRate / 100))
      .slice(0, 3)
      .map(
        (node) =>
          `${node.data.label} 利用率 ${round(node.data.utilization * 100, 1)}%，超时率 ${round(node.data.timeoutRate, 1)}%，队列 ${round(node.data.queueDepth, 0)}`,
      ),
  )]

  return {
    nextNodes,
    snapshot: {
      metrics: {
        qps: round(appliedQps),
        p95LatencyMs,
        p99LatencyMs,
        errorRate: round(errorRate * 100, 2),
        availability: round(availability * 100, 2),
      },
      bottlenecks,
      appliedQps: round(appliedQps),
    },
  }
}
