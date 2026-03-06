import type { Edge, Node } from '@xyflow/react'

export type NodeKind =
  | 'cdn'
  | 'load-balancer'
  | 'api-gateway'
  | 'waf'
  | 'rate-limiter'
  | 'circuit-breaker'
  | 'service-mesh'
  | 'observability'
  | 'tracing'
  | 'iam'
  | 'object-storage'
  | 'web'
  | 'service'
  | 'redis'
  | 'mq'
  | 'database'
  | 'search'

export type ScenarioId =
  | 'starter-ha-web'
  | 'ecommerce-flash-sale'
  | 'search-reco-hot-shard'
  | 'multi-region-dr'
  | 'release-governance-canary'
  | 'financial-compliance-ha'
  | 'cost-optimization-sla'

export interface ScenarioGoal {
  id: string
  label: string
  metric: 'qps' | 'p95LatencyMs' | 'p99LatencyMs' | 'errorRate' | 'availability' | 'estimatedCost' | 'totalScore' | 'star'
  operator: 'lte' | 'gte'
  target: number
  weight: number
}

export interface ScenarioConstraints {
  maxNodes: number
  maxEdges: number
  maxBudget: number
  requiredKinds: NodeKind[]
}

export interface ScenarioScoreWeights {
  performance: number
  stability: number
  cost: number
  recoverability: number
  security: number
}

export interface ScenarioPassCriteria {
  minScore: number
  minStars: number
  maxErrorRate: number
  minAvailability: number
}

export interface ScenarioUnlockRule {
  prerequisiteScenarioIds: ScenarioId[]
  minStars: number
}

export interface ScenarioProgressEntry {
  bestScore: number
  bestStars: number
  passed: boolean
  lastReport: string
  lastTick: number
}

export type ScenarioProgress = Partial<Record<ScenarioId, ScenarioProgressEntry>>

export interface PlaygroundNodeData extends Record<string, unknown> {
  label: string
  kind: NodeKind
  capacity: number
  baseLatencyMs: number
  zone: string
  qps: number
  utilization: number
  status: 'healthy' | 'warning' | 'critical'
  retriesPerMin: number
  timeoutRate: number
  failureRate: number
  successRate: number
  cpu: number
  memory: number
  bandwidthMbps: number
  iops: number
  queueDepth: number
  poolUtilization: number
  cacheHitRate: number
  evictionRisk: number
  replicaLagMs: number
  consistencyWindowMs: number
  backlog: number
  rebalanceRisk: number
  indexingLagMs: number
  shardLoad: number
  replicas: number
  throttledRate: number
  degradedRate: number
  retryBackoffMs: number
  failoverRate: number
  circuitOpen: boolean
}

export type PlaygroundNode = Node<PlaygroundNodeData>
export type PlaygroundEdge = Edge

export interface ScenarioDefinition {
  id: ScenarioId
  name: string
  description: string
  fixedQps: number
  sourceNodeId: string
  goals: ScenarioGoal[]
  constraints: ScenarioConstraints
  scoreWeights: ScenarioScoreWeights
  passCriteria: ScenarioPassCriteria
  unlockRule: ScenarioUnlockRule
  nodes: PlaygroundNode[]
  edges: PlaygroundEdge[]
}

export interface TopologyTemplate {
  id: string
  name: string
  description: string
  fixedQps: number
  sourceNodeId: string
  nodes: PlaygroundNode[]
  edges: PlaygroundEdge[]
}

export type EventCategory =
  | 'traffic'
  | 'network'
  | 'middleware'
  | 'application'
  | 'security'
  | 'operations'

export interface EventTemplate {
  id: string
  name: string
  category: EventCategory
  description: string
  qpsMultiplier: number
  capacityMultiplier: number
  latencyDeltaMs: number
  durationTicks: number
  targetKinds?: NodeKind[]
}

export type OrchestrationMode = 'serial' | 'parallel'

export interface EventOrchestrationPlan {
  id: string
  name: string
  mode: OrchestrationMode
  eventIds: string[]
  probability: number
  startTick: number
  endTick: number
}

export interface ActiveEvent extends EventTemplate {
  instanceId: string
  remainingTicks: number
  startedAt: number
}

export type TrafficPattern = 'constant' | 'sine' | 'step' | 'pulse'

export interface SchedulerState {
  tick: number
  speed: 1 | 2 | 4
  running: boolean
}

export interface SimulationMetrics {
  qps: number
  p95LatencyMs: number
  p99LatencyMs: number
  errorRate: number
  availability: number
}

export interface SimulationSnapshot {
  metrics: SimulationMetrics
  bottlenecks: string[]
  appliedQps: number
}

export interface SnapshotResult {
  tick: number
  metrics: SimulationMetrics
  bottlenecks: string[]
  totalScore: number
  stars: number
  grade: 'D' | 'C' | 'B' | 'A' | 'S'
  estimatedCost: number
  reportSummary: string
}

export interface ArchitectureSnapshot {
  id: string
  name: string
  createdAt: number
  scenarioId: ScenarioId
  fixedQps: number
  trafficPattern: TrafficPattern
  nodes: PlaygroundNode[]
  edges: PlaygroundEdge[]
  result: SnapshotResult
}
