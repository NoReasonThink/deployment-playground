import type { NodeKind, PlaygroundNodeData } from '../types'

export interface PaletteItem {
  kind: NodeKind
  label: string
  group: '网络' | '应用' | '缓存与数据' | '异步' | '治理与可观测'
  defaultCapacity: number
  defaultLatency: number
}

export const paletteItems: PaletteItem[] = [
  { kind: 'cdn', label: 'CDN', group: '网络', defaultCapacity: 9000, defaultLatency: 8 },
  {
    kind: 'load-balancer',
    label: 'Load Balancer',
    group: '网络',
    defaultCapacity: 7000,
    defaultLatency: 12,
  },
  {
    kind: 'api-gateway',
    label: 'API Gateway',
    group: '网络',
    defaultCapacity: 5000,
    defaultLatency: 16,
  },
  { kind: 'waf', label: 'WAF', group: '网络', defaultCapacity: 6500, defaultLatency: 10 },
  { kind: 'rate-limiter', label: 'Rate Limiter', group: '治理与可观测', defaultCapacity: 7000, defaultLatency: 9 },
  {
    kind: 'circuit-breaker',
    label: 'Circuit Breaker',
    group: '治理与可观测',
    defaultCapacity: 7000,
    defaultLatency: 11,
  },
  { kind: 'service-mesh', label: 'Service Mesh', group: '治理与可观测', defaultCapacity: 6500, defaultLatency: 14 },
  {
    kind: 'observability',
    label: 'Observability',
    group: '治理与可观测',
    defaultCapacity: 20000,
    defaultLatency: 4,
  },
  { kind: 'tracing', label: 'Tracing', group: '治理与可观测', defaultCapacity: 18000, defaultLatency: 5 },
  { kind: 'iam', label: 'IAM', group: '治理与可观测', defaultCapacity: 12000, defaultLatency: 7 },
  { kind: 'web', label: 'Web Service', group: '应用', defaultCapacity: 3600, defaultLatency: 22 },
  { kind: 'service', label: 'Microservice', group: '应用', defaultCapacity: 3000, defaultLatency: 28 },
  { kind: 'redis', label: 'Redis', group: '缓存与数据', defaultCapacity: 8500, defaultLatency: 6 },
  { kind: 'object-storage', label: 'Object Storage', group: '缓存与数据', defaultCapacity: 9500, defaultLatency: 20 },
  { kind: 'mq', label: 'Kafka MQ', group: '异步', defaultCapacity: 12000, defaultLatency: 18 },
  { kind: 'database', label: 'Database', group: '缓存与数据', defaultCapacity: 1800, defaultLatency: 40 },
  {
    kind: 'search',
    label: 'Elasticsearch',
    group: '缓存与数据',
    defaultCapacity: 2400,
    defaultLatency: 32,
  },
]

export function buildNodeData(kind: PaletteItem['kind']): PlaygroundNodeData {
  const item = paletteItems.find((entry) => entry.kind === kind) ?? paletteItems[0]
  return {
    label: item.label,
    kind: item.kind,
    capacity: item.defaultCapacity,
    baseLatencyMs: item.defaultLatency,
    zone: 'az-a',
    qps: 0,
    utilization: 0,
    status: 'healthy',
    retriesPerMin: 0,
    timeoutRate: 0,
    failureRate: 0,
    successRate: 100,
    cpu: 0,
    memory: 0,
    bandwidthMbps: 0,
    iops: 0,
    queueDepth: 0,
    poolUtilization: 0,
    cacheHitRate: 0,
    evictionRisk: 0,
    replicaLagMs: 0,
    consistencyWindowMs: 0,
    backlog: 0,
    rebalanceRisk: 0,
    indexingLagMs: 0,
    shardLoad: 0,
    replicas: 1,
    throttledRate: 0,
    degradedRate: 0,
    retryBackoffMs: 0,
    failoverRate: 0,
    circuitOpen: false,
  }
}
