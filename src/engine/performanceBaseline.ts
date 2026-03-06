import type { Edge } from '@xyflow/react'
import { buildNodeData } from '../data/catalog'
import type { ActiveEvent, NodeKind, PlaygroundNode } from '../types'
import { simulateTick } from './simulate'

export interface PerformanceBaselineOptions {
  nodeCount: number
  edgeFanout: number
  eventCount: number
  ticks: number
  fixedQps: number
}

export interface PerformanceBaselineResult {
  nodeCount: number
  edgeCount: number
  eventCount: number
  ticks: number
  totalMs: number
  avgTickMs: number
  p95TickMs: number
  throughputTicksPerSecond: number
  estimatedFps: number
}

const baselineKinds: NodeKind[] = [
  'cdn',
  'load-balancer',
  'api-gateway',
  'service',
  'web',
  'redis',
  'mq',
  'database',
  'search',
  'waf',
  'rate-limiter',
  'service-mesh',
  'circuit-breaker',
]

function round(value: number, precision = 2) {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

function buildSyntheticTopology(nodeCount: number, edgeFanout: number) {
  const nodes: PlaygroundNode[] = Array.from({ length: nodeCount }, (_, index) => {
    const kind = baselineKinds[index % baselineKinds.length]
    return {
      id: `bench-node-${index}`,
      type: 'default',
      position: { x: (index % 24) * 80, y: Math.floor(index / 24) * 55 },
      data: {
        ...buildNodeData(kind),
        capacity: 2400 + ((index * 91) % 2200),
        baseLatencyMs: 8 + ((index * 7) % 42),
        replicas: 1 + (index % 3),
      },
    }
  })
  const edges: Edge[] = []
  for (let i = 0; i < nodeCount; i += 1) {
    for (let j = 1; j <= edgeFanout; j += 1) {
      const target = i + j
      if (target >= nodeCount) {
        break
      }
      edges.push({
        id: `bench-edge-${i}-${target}`,
        source: `bench-node-${i}`,
        target: `bench-node-${target}`,
      })
    }
  }
  return { nodes, edges }
}

function buildSyntheticEvents(eventCount: number): ActiveEvent[] {
  const categories: ActiveEvent['category'][] = [
    'traffic',
    'network',
    'middleware',
    'application',
    'security',
    'operations',
  ]
  return Array.from({ length: eventCount }, (_, index) => {
    const targetKind = baselineKinds[index % baselineKinds.length]
    return {
      id: `bench-event-${index}`,
      name: `bench-event-${index}`,
      category: categories[index % categories.length],
      description: `bench-${index}`,
      qpsMultiplier: index % 4 === 0 ? 1.03 : 1,
      capacityMultiplier: 0.92 + (index % 5) * 0.015,
      latencyDeltaMs: 6 + (index % 7) * 4,
      durationTicks: 12,
      targetKinds: index % 2 === 0 ? [targetKind] : undefined,
      instanceId: `bench-event-instance-${index}`,
      remainingTicks: 12,
      startedAt: index,
    }
  })
}

export function runPerformanceBaseline(options: PerformanceBaselineOptions): PerformanceBaselineResult {
  const safeNodeCount = Math.max(10, options.nodeCount)
  const safeFanout = Math.max(1, options.edgeFanout)
  const safeTickCount = Math.max(1, options.ticks)
  const safeEvents = Math.max(0, options.eventCount)
  let { nodes, edges } = buildSyntheticTopology(safeNodeCount, safeFanout)
  const events = buildSyntheticEvents(safeEvents)
  const sourceNodeId = nodes[0]?.id ?? 'bench-node-0'
  const durations: number[] = []
  const started = performance.now()
  for (let tick = 0; tick < safeTickCount; tick += 1) {
    const qps = options.fixedQps * (1 + ((tick % 8) - 3) * 0.03)
    const tickStarted = performance.now()
    const simulation = simulateTick(nodes, edges, sourceNodeId, qps, events)
    const tickEnded = performance.now()
    nodes = simulation.nextNodes
    edges = edges.map((edge) => edge)
    durations.push(tickEnded - tickStarted)
  }
  const ended = performance.now()
  const totalMs = ended - started
  const sortedDurations = [...durations].sort((a, b) => a - b)
  const p95Index = Math.max(0, Math.min(sortedDurations.length - 1, Math.ceil(sortedDurations.length * 0.95) - 1))
  const avgTickMs = safeTickCount > 0 ? totalMs / safeTickCount : 0
  const throughput = totalMs > 0 ? (safeTickCount * 1000) / totalMs : 0
  const fps = avgTickMs > 0 ? 1000 / avgTickMs : 0
  return {
    nodeCount: safeNodeCount,
    edgeCount: edges.length,
    eventCount: safeEvents,
    ticks: safeTickCount,
    totalMs: round(totalMs),
    avgTickMs: round(avgTickMs),
    p95TickMs: round(sortedDurations[p95Index] ?? 0),
    throughputTicksPerSecond: round(throughput),
    estimatedFps: round(fps),
  }
}

